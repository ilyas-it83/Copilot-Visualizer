import { OfficeScene } from './scene/OfficeScene';
import { AnimationController } from './animation/AnimationController';
import { MessageHandler } from './MessageHandler';
import { Timeline } from './ui/Timeline';
import { EventInspector } from './ui/EventInspector';
import { SessionPicker } from './ui/SessionPicker';
import { VsCodeApi } from './types';

class App {
  private vscode: VsCodeApi;
  private scene: OfficeScene;
  private animationController: AnimationController;
  private messageHandler: MessageHandler;
  private timeline: Timeline;
  private eventInspector: EventInspector;
  private sessionPicker: SessionPicker;

  constructor() {
    this.vscode = acquireVsCodeApi();

    const canvas = document.getElementById('office-canvas') as HTMLCanvasElement;
    const timelineEl = document.getElementById('timeline-bar')!;
    const inspectorEl = document.getElementById('event-inspector')!;
    const pickerEl = document.getElementById('session-picker')!;

    this.scene = new OfficeScene(canvas);
    this.animationController = new AnimationController(this.scene);
    this.timeline = new Timeline(timelineEl, this.animationController);
    this.eventInspector = new EventInspector(inspectorEl);
    this.sessionPicker = new SessionPicker(pickerEl, (sessionId) => {
      this.vscode.postMessage({ type: 'session-selected', sessionId });
    });

    this.messageHandler = new MessageHandler(
      this.vscode,
      this.scene,
      this.animationController,
      this.timeline,
      this.eventInspector,
      this.sessionPicker
    );

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Request sessions on startup
    this.vscode.postMessage({ type: 'request-session-list' });

    // Start render loop
    this.scene.start();
  }

  private resizeCanvas(): void {
    const canvas = document.getElementById('office-canvas') as HTMLCanvasElement;
    const container = document.getElementById('canvas-container')!;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    this.scene.resize(canvas.width, canvas.height);
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
