import { VsCodeApi, InboundMessage, CopilotEvent } from './types';
import { OfficeScene } from './scene/OfficeScene';
import { AnimationController } from './animation/AnimationController';
import { Timeline } from './ui/Timeline';
import { EventInspector } from './ui/EventInspector';
import { SessionPicker } from './ui/SessionPicker';

export class MessageHandler {
  constructor(
    private vscode: VsCodeApi,
    private scene: OfficeScene,
    private animationController: AnimationController,
    private timeline: Timeline,
    private eventInspector: EventInspector,
    private sessionPicker: SessionPicker
  ) {
    window.addEventListener('message', (e) => this.handleMessage(e.data));
  }

  private handleMessage(message: InboundMessage): void {
    switch (message.type) {
      case 'load-session':
        this.handleLoadSession(message.events);
        break;
      case 'events-chunk':
        this.handleEventsChunk(message.events);
        break;
      case 'playback-control':
        this.handlePlaybackControl(message.action, message.value);
        break;
      case 'session-list':
        this.sessionPicker.setSessions(message.sessions);
        break;
    }
  }

  private handleLoadSession(events: CopilotEvent[]): void {
    this.animationController.reset();
    this.animationController.loadEvents(events);
    this.timeline.setEvents(events);
    this.scene.resetAgents();

    // Create agents from unique agentIds in events
    const agentIds = [...new Set(events.map((e) => e.agentId))];
    agentIds.forEach((id, index) => {
      const source = events.find((e) => e.agentId === id)?.source ?? 'cli';
      this.scene.addAgent(id, source, index);
    });
  }

  private handleEventsChunk(events: CopilotEvent[]): void {
    this.animationController.loadEvents(events);
    this.timeline.appendEvents(events);
  }

  private handlePlaybackControl(action: string, value?: number): void {
    switch (action) {
      case 'play':
        this.animationController.play();
        break;
      case 'pause':
        this.animationController.pause();
        break;
      case 'speed':
        if (value !== undefined) {
          this.animationController.setSpeed(value);
        }
        break;
    }
  }
}
