import { CopilotEvent } from '../types';
import { Agent } from '../agents/Agent';
import { OfficeScene } from '../scene/OfficeScene';

/**
 * Maps CopilotEvent types to animation sequences that play on agents.
 */
export class EventAnimator {
  constructor(private scene: OfficeScene) {}

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
    const toolName = (event.metadata?.tool as string) ?? '';

    if (toolName.includes('bash') || toolName.includes('shell')) {
      // Walk to terminal, type
      agent.moveTo('terminal', 0, () => {
        agent.setStatus('typing');
        agent.showSpeechBubble(`$ ${this.truncate(toolName, 30)}`, 'tool', 2500);
      });
      return 3000;
    }

    if (toolName.includes('read') || toolName.includes('view') || toolName.includes('cat')) {
      // Walk to file cabinet, read
      agent.moveTo('file_cabinet', 0, () => {
        agent.setStatus('reading');
        const fileName = (event.metadata?.path as string) ?? 'file';
        agent.showSpeechBubble(`📄 ${this.truncate(fileName, 25)}`, 'tool', 2000);
      });
      return 2500;
    }

    if (toolName.includes('edit') || toolName.includes('create') || toolName.includes('write')) {
      // Go to desk, type rapidly
      agent.moveTo('desk', agent.deskIndex, () => {
        agent.setStatus('typing');
        agent.showSpeechBubble(`✏️ editing...`, 'tool', 2000);
      });
      return 2500;
    }

    if (toolName.includes('grep') || toolName.includes('glob') || toolName.includes('search') || toolName.includes('find')) {
      // Walk to search station
      agent.moveTo('search_station', 0, () => {
        agent.setStatus('searching');
        agent.showSpeechBubble(`🔍 ${this.truncate(toolName, 25)}`, 'tool', 2000);
      });
      return 2500;
    }

    // Default: stay at desk and show tool bubble
    agent.moveTo('desk', agent.deskIndex, () => {
      agent.setStatus('typing');
      agent.showSpeechBubble(`🔧 ${this.truncate(toolName, 30)}`, 'tool', 2000);
    });
    return 2000;
  }

  private animateToolResult(agent: Agent, _event: CopilotEvent): number {
    // Agent finishes and returns to idle
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
      // User message: bubble appears from the side
      agent.showSpeechBubble(content, 'speech', 3000);
      agent.setStatus('idle');
    } else {
      // Assistant message: agent talks
      agent.setStatus('talking');
      agent.showSpeechBubble(content, 'speech', 3500);
      setTimeout(() => agent.setStatus('idle'), 3000);
    }
    return 3000;
  }

  private animateCompletion(agent: Agent, _event: CopilotEvent): number {
    agent.moveTo('desk', agent.deskIndex, () => {
      agent.setStatus('typing');
      agent.showSpeechBubble('✓ complete', 'tool', 1500);
      setTimeout(() => agent.setStatus('idle'), 1500);
    });
    return 2000;
  }

  private animateThinking(agent: Agent, _event: CopilotEvent): number {
    agent.setStatus('thinking');
    agent.showSpeechBubble('...', 'thought', 2000);
    return 2000;
  }

  private animateHandoff(agent: Agent, event: CopilotEvent): number {
    const targetId = (event.metadata?.targetAgent as string) ?? '';
    const targetAgent = this.scene.getAgent(targetId);

    // Both agents walk to meeting table
    agent.moveTo('meeting_table', 0, () => {
      agent.setStatus('talking');
      agent.showSpeechBubble(`→ ${this.truncate(targetId, 15)}`, 'speech', 2000);
    });

    if (targetAgent) {
      targetAgent.moveTo('meeting_table', 0, () => {
        targetAgent.setStatus('talking');
      });
      setTimeout(() => {
        targetAgent.setStatus('idle');
        targetAgent.moveTo('desk', targetAgent.deskIndex);
      }, 2500);
    }

    setTimeout(() => {
      agent.setStatus('idle');
      agent.moveTo('desk', agent.deskIndex);
    }, 2500);

    return 3000;
  }

  private animateSessionStart(agent: Agent, _event: CopilotEvent): number {
    // Agent enters through the door
    agent.position = { x: 400, y: 470 };
    agent.currentLocation = 'door';
    agent.showSpeechBubble('👋 Hello!', 'speech', 2000);
    agent.moveTo('desk', agent.deskIndex, () => {
      agent.setStatus('idle');
    });
    return 2500;
  }

  private animateSessionEnd(agent: Agent, _event: CopilotEvent): number {
    agent.showSpeechBubble('👋 Done!', 'speech', 1500);
    agent.moveTo('door', 0, () => {
      agent.setStatus('idle');
    });
    return 2000;
  }

  private animateError(agent: Agent, event: CopilotEvent): number {
    const msg = (event.metadata?.message as string) ?? 'Error';
    agent.showSpeechBubble(`❌ ${this.truncate(msg, 30)}`, 'speech', 3000);
    agent.setStatus('idle');
    return 2000;
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? text.substring(0, max - 1) + '…' : text;
  }
}
