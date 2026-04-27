import { VsCodeApi, InboundMessage, AgentInfo } from './types';
import { OfficeScene } from './scene/OfficeScene';
import { LiveEventQueue } from './ui/LiveEventQueue';
import { ActivityLog } from './ui/ActivityLog';
import { StatusBar } from './ui/StatusBar';

/**
 * Handles real-time messages from extension host.
 * No playback — events stream in live and are animated immediately.
 */
export class MessageHandler {
  constructor(
    private vscode: VsCodeApi,
    private scene: OfficeScene,
    private liveEventQueue: LiveEventQueue,
    private activityLog: ActivityLog,
    private statusBar: StatusBar
  ) {
    window.addEventListener('message', (e) => this.handleMessage(e.data));
  }

  private handleMessage(message: InboundMessage): void {
    switch (message.type) {
      case 'live-event': {
        const event = message.event;
        // Auto-create agent if unknown
        if (!this.scene.getAgent(event.agentId)) {
          this.scene.addAgent(event.agentId, event.source, this.scene.getAllAgents().length);
          const agent = this.scene.getAgent(event.agentId)!;
          this.activityLog.add(`${agent.displayName} entered the office`, agent.color);
        }
        this.liveEventQueue.push(event);
        break;
      }

      case 'agent-appeared': {
        const info: AgentInfo = message.agent;
        if (!this.scene.getAgent(info.id)) {
          this.scene.addAgent(info.id, info.source, this.scene.getAllAgents().length, info.name);
          const agent = this.scene.getAgent(info.id)!;
          this.activityLog.add(`${agent.displayName} entered the office`, agent.color);
        }
        break;
      }

      case 'status-update': {
        this.statusBar.update(message.stats);
        break;
      }
    }
  }
}
