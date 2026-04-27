import { VsCodeApi, InboundMessage, AgentInfo, CopilotEvent } from './types';
import { OfficeScene } from './scene/OfficeScene';
import { LiveEventQueue } from './ui/LiveEventQueue';
import { ActivityLog } from './ui/ActivityLog';
import { StatusBar } from './ui/StatusBar';

/** Fixed team roster — only these agents appear in the visualization */
const TEAM_ROSTER = [
  { id: 'michael', name: 'Michael', source: 'cli' as const, color: '#4285f4' },
  { id: 'dwight', name: 'Dwight', source: 'cli' as const, color: '#34a853' },
  { id: 'jim', name: 'Jim', source: 'cli' as const, color: '#fbbc05' },
  { id: 'pam', name: 'Pam', source: 'cli' as const, color: '#ea4335' },
  { id: 'scribe', name: 'Scribe', source: 'cli' as const, color: '#ab47bc' },
  { id: 'ralph', name: 'Ralph', source: 'cli' as const, color: '#00acc1' },
];

const MAX_AGENTS = 10;

/**
 * Handles real-time messages from extension host.
 * No playback — events stream in live and are animated immediately.
 * Routes all events to the predefined team roster via round-robin.
 */
export class MessageHandler {
  private roundRobinIndex = 0;
  private agentMapping: Map<string, string> = new Map(); // external agentId → roster agentId
  private materializedAgents: Set<string> = new Set(); // roster agents currently in the scene

  constructor(
    private vscode: VsCodeApi,
    private scene: OfficeScene,
    private liveEventQueue: LiveEventQueue,
    private activityLog: ActivityLog,
    private statusBar: StatusBar
  ) {
    window.addEventListener('message', (e) => this.handleMessage(e.data));
    // Do NOT pre-create agents — canvas starts empty until real events arrive
  }

  /** Materialize a roster agent on-demand when work is assigned to them */
  private materializeAgent(rosterId: string): void {
    if (this.materializedAgents.has(rosterId)) return;
    const member = TEAM_ROSTER.find(m => m.id === rosterId);
    if (!member) return;
    const index = this.materializedAgents.size;
    this.scene.addAgent(member.id, member.source, index, member.name);
    this.materializedAgents.add(rosterId);
    this.activityLog.add(`${member.name} entered the office`, member.color);
  }

  /** Map an incoming agentId to a roster member via round-robin */
  private resolveRosterAgent(externalAgentId: string): string {
    // If the external ID directly matches a roster member, use it
    const lower = externalAgentId.toLowerCase();
    for (const member of TEAM_ROSTER) {
      if (lower.includes(member.id)) {
        return member.id;
      }
    }

    // Check if we already mapped this external agent
    if (this.agentMapping.has(externalAgentId)) {
      return this.agentMapping.get(externalAgentId)!;
    }

    // Round-robin assign to a roster member
    const assigned = TEAM_ROSTER[this.roundRobinIndex % TEAM_ROSTER.length].id;
    this.roundRobinIndex++;
    this.agentMapping.set(externalAgentId, assigned);
    return assigned;
  }

  private handleMessage(message: InboundMessage): void {
    switch (message.type) {
      case 'live-event': {
        const event = message.event;
        // Route to a roster agent instead of creating a new one
        const rosterAgentId = this.resolveRosterAgent(event.agentId);
        // Materialize the agent only when real work arrives
        this.materializeAgent(rosterAgentId);
        const routedEvent: CopilotEvent = { ...event, agentId: rosterAgentId };
        this.liveEventQueue.push(routedEvent);
        this.scene.notifyEventReceived();
        break;
      }

      case 'agent-appeared': {
        // Ignore — roster is pre-initialized; don't create new agents
        // Hard cap safety net
        if (this.scene.getAllAgents().length >= MAX_AGENTS) break;
        const info: AgentInfo = message.agent;
        const lower = info.id.toLowerCase();
        const isRosterMember = TEAM_ROSTER.some(m => lower.includes(m.id));
        if (isRosterMember && !this.scene.getAgent(info.id)) {
          this.scene.addAgent(info.id, info.source, this.scene.getAllAgents().length, info.name);
        }
        break;
      }

      case 'status-update': {
        const visibleCount = this.scene.getAllAgents().length;
        this.statusBar.update({ ...message.stats, agentCount: visibleCount });
        break;
      }
    }
  }
}
