import { CopilotEvent } from '../types';
import { Agent } from '../agents/Agent';
import { OfficeScene } from '../scene/OfficeScene';
import { ActivityLog } from '../ui/ActivityLog';

/**
 * Maps CopilotEvent types to animation sequences that play on agents.
 * Drives activity log and interaction line visuals.
 */
export class EventAnimator {
  constructor(private scene: OfficeScene, private activityLog: ActivityLog) {}

  /**
   * Animate an event on the appropriate agent.
   * Returns estimated animation duration in ms.
   */
  animateEvent(event: CopilotEvent): number {
    const agent = this.scene.getAgent(event.agentId);
    if (!agent) return 0;

    switch (event.type) {
      case 'tool_call':
        return this.animateToolCall(agent, event);
      case 'tool_result':
        return this.animateToolResult(agent, event);
      case 'chat_message':
        return this.animateChatMessage(agent, event);
      case 'completion':
        return this.animateCompletion(agent, event);
      case 'agent_thinking':
        return this.animateThinking(agent, event);
      case 'agent_handoff':
        return this.animateHandoff(agent, event);
      case 'session_start':
        return this.animateSessionStart(agent, event);
      case 'session_end':
        return this.animateSessionEnd(agent, event);
      case 'error':
        return this.animateError(agent, event);
      default:
        return 500;
    }
  }

  private animateToolCall(agent: Agent, event: CopilotEvent): number {
    const toolName = (event as any).toolName || (event.metadata?.toolName as string) || (event.metadata?.tool as string) || (event.metadata?.data as any)?.toolName || '';

    if (toolName.includes('bash') || toolName.includes('shell')) {
      agent.moveTo('terminal', 0, () => {
        agent.setStatus('typing');
        agent.showSpeechBubble(`$ ${this.truncate(toolName, 30)}`, 'tool', 2500);
      });
      this.activityLog.add(`${agent.displayName} walked to terminal`, agent.color);
      setTimeout(() => {
        const cmd = (event.metadata?.command as string) || (event.metadata?.data as any)?.arguments?.command || toolName;
        this.activityLog.add(`${agent.displayName}: $ ${this.truncate(cmd, 40)}`, agent.color);
      }, 1000);
      return 3000;
    }

    if (toolName.includes('read') || toolName.includes('view') || toolName.includes('cat')) {
      agent.moveTo('file_cabinet', 0, () => {
        agent.setStatus('reading');
        const filePath = (event.metadata?.path as string) || (event.metadata?.data as any)?.arguments?.path || 'file';
        agent.showSpeechBubble(`📄 ${this.truncate(filePath, 25)}`, 'tool', 2000);
      });
      this.activityLog.add(
        `${agent.displayName} reading ${this.truncate((event.metadata?.path as string) || (event.metadata?.data as any)?.arguments?.path || 'file', 30)}`,
        agent.color
      );
      return 2500;
    }

    if (toolName.includes('edit') || toolName.includes('create') || toolName.includes('write')) {
      agent.moveTo('desk', agent.deskIndex, () => {
        agent.setStatus('typing');
        agent.showSpeechBubble(`✏️ editing...`, 'tool', 2000);
      });
      this.activityLog.add(`${agent.displayName} editing code`, agent.color);
      return 2500;
    }

    if (toolName.includes('grep') || toolName.includes('glob') || toolName.includes('search') || toolName.includes('find')) {
      agent.moveTo('search_station', 0, () => {
        agent.setStatus('searching');
        agent.showSpeechBubble(`🔍 ${this.truncate(toolName, 25)}`, 'tool', 2000);
      });
      this.activityLog.add(`${agent.displayName} searching: ${this.truncate(toolName, 30)}`, agent.color);
      return 2500;
    }

    // Default: stay at desk
    agent.moveTo('desk', agent.deskIndex, () => {
      agent.setStatus('typing');
      agent.showSpeechBubble(`🔧 ${this.truncate(toolName, 30)}`, 'tool', 2000);
    });
    this.activityLog.add(`${agent.displayName} using tool: ${this.truncate(toolName, 25)}`, agent.color);
    return 2000;
  }

  private animateToolResult(agent: Agent, _event: CopilotEvent): number {
    setTimeout(() => {
      agent.setStatus('idle');
      agent.moveTo('desk', agent.deskIndex);
    }, 500);
    return 1000;
  }

  private animateChatMessage(agent: Agent, event: CopilotEvent): number {
    const content = (event.metadata?.content as string) ?? '...';
    const isUser = (event.metadata?.role as string) === 'user';

    if (isUser) {
      agent.showSpeechBubble(content, 'speech', 3000);
      agent.setStatus('idle');
      this.activityLog.add(`User → ${agent.displayName}: "${this.truncate(content, 35)}"`, '#aaa');
    } else {
      agent.setStatus('talking');
      agent.showSpeechBubble(content, 'speech', 3500);
      setTimeout(() => agent.setStatus('idle'), 3000);
      this.activityLog.add(`${agent.displayName}: "${this.truncate(content, 35)}"`, agent.color);
    }
    return 3000;
  }

  private animateCompletion(agent: Agent, _event: CopilotEvent): number {
    agent.moveTo('desk', agent.deskIndex, () => {
      agent.setStatus('typing');
      setTimeout(() => agent.setStatus('idle'), 1500);
    });
    this.activityLog.add(`${agent.displayName} completed task`, agent.color);
    return 2000;
  }

  private animateThinking(agent: Agent, _event: CopilotEvent): number {
    agent.setStatus('thinking');
    agent.showSpeechBubble('...', 'thought', 2000);
    this.activityLog.add(`${agent.displayName} is thinking...`, agent.color);
    return 2000;
  }

  private animateHandoff(agent: Agent, event: CopilotEvent): number {
    const targetId = (event.metadata?.targetAgent as string) ?? '';
    const targetAgent = this.scene.getAgent(targetId);

    agent.moveTo('meeting_table', 0, () => {
      agent.setStatus('talking');
      const content = (event.metadata?.content as string) ?? `→ ${this.truncate(targetId, 15)}`;
      agent.showSpeechBubble(this.truncate(content, 40), 'speech', 2500);
    });

    if (targetAgent) {
      targetAgent.moveTo('meeting_table', 0, () => {
        targetAgent.setStatus('talking');
        targetAgent.showSpeechBubble('👂 Listening...', 'speech', 2000);
      });

      this.scene.addInteractionLine(agent.id, targetId, agent.color, 2.5);

      setTimeout(() => {
        targetAgent.setStatus('idle');
        targetAgent.moveTo('desk', targetAgent.deskIndex);
      }, 2500);

      this.activityLog.add(`${agent.displayName} → ${targetAgent.displayName}: handoff`, agent.color);
    } else {
      this.activityLog.add(`${agent.displayName} handing off to ${this.truncate(targetId, 15)}`, agent.color);
    }

    setTimeout(() => {
      agent.setStatus('idle');
      agent.moveTo('desk', agent.deskIndex);
    }, 2500);

    return 3000;
  }

  private animateSessionStart(agent: Agent, _event: CopilotEvent): number {
    agent.setStatus('idle');
    this.activityLog.add(`${agent.displayName} joined the session`, agent.color);
    return 1000;
  }

  private animateSessionEnd(agent: Agent, _event: CopilotEvent): number {
    agent.moveTo('door', 0, () => {
      agent.setStatus('idle');
    });
    this.activityLog.add(`${agent.displayName} left the office`, agent.color);
    return 2000;
  }

  private animateError(agent: Agent, event: CopilotEvent): number {
    const msg = (event.metadata?.message as string) ?? 'Error';
    agent.showSpeechBubble(`❌ ${this.truncate(msg, 30)}`, 'speech', 3000);
    agent.setStatus('idle');
    this.activityLog.add(`${agent.displayName}: ❌ ${this.truncate(msg, 30)}`, '#ea4335');
    return 2000;
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? text.substring(0, max - 1) + '…' : text;
  }
}
