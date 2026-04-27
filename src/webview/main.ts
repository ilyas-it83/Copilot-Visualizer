import { OfficeScene } from './scene/OfficeScene';
import { MessageHandler } from './MessageHandler';
import { LiveEventQueue } from './ui/LiveEventQueue';
import { ActivityLog } from './ui/ActivityLog';
import { StatusBar } from './ui/StatusBar';
import { VsCodeApi } from './types';

class App {
  private vscode: VsCodeApi;
  private scene: OfficeScene;
  private messageHandler: MessageHandler;
  private liveEventQueue: LiveEventQueue;
  private activityLog: ActivityLog;
  private statusBar: StatusBar;

  constructor() {
    this.vscode = acquireVsCodeApi();

    const canvas = document.getElementById('office-canvas') as HTMLCanvasElement;
    const logEl = document.getElementById('activity-log')!;
    const statusEl = document.getElementById('status-bar')!;

    this.scene = new OfficeScene(canvas);
    this.activityLog = new ActivityLog(logEl);
    this.statusBar = new StatusBar(statusEl);
    this.liveEventQueue = new LiveEventQueue(this.scene, this.activityLog);

    this.messageHandler = new MessageHandler(
      this.vscode,
      this.scene,
      this.liveEventQueue,
      this.activityLog,
      this.statusBar
    );

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Signal webview is ready
    this.vscode.postMessage({ type: 'webview-ready' });

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
