/**
 * Office View Provider
 * Manages the webview panel that hosts the office visualization.
 * Real-time mode: streams live events to webview as they arrive.
 */

import * as vscode from 'vscode';
import { MessageBridge } from '../services/messageBridge';
import { EventStore } from '../services/eventStore';
import { FileWatcher, AgentIdentity } from '../services/fileWatcher';
import { CopilotEvent } from '../types/events';
import { WebviewToExtensionMessage } from '../types/messages';

export class OfficeViewProvider {
  public static readonly viewType = 'copilot-visualizer.officeView';

  private panel: vscode.WebviewPanel | undefined;
  private readonly messageBridge: MessageBridge;
  private readonly eventStore: EventStore;
  private readonly fileWatcher: FileWatcher;
  private readonly extensionUri: vscode.Uri;
  private eventBuffer: CopilotEvent[] = [];
  private agentBuffer: AgentIdentity[] = [];
  private monitoring = false;
  private statusInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    extensionUri: vscode.Uri,
    messageBridge: MessageBridge,
    eventStore: EventStore,
    fileWatcher: FileWatcher,
  ) {
    this.extensionUri = extensionUri;
    this.messageBridge = messageBridge;
    this.eventStore = eventStore;
    this.fileWatcher = fileWatcher;

    // Wire up FileWatcher events — buffer if webview not open
    this.fileWatcher.on('event', (event: CopilotEvent) => {
      this.eventStore.addEvents([event]);
      if (this.messageBridge.isAttached) {
        this.messageBridge.sendLiveEvent(event);
      } else {
        this.eventBuffer.push(event);
      }
    });

    this.fileWatcher.on('agent', (agent: AgentIdentity) => {
      if (this.messageBridge.isAttached) {
        this.messageBridge.sendAgentAppeared({
          id: agent.id,
          name: agent.name,
          source: agent.source,
          color: agent.color,
        });
      } else {
        this.agentBuffer.push(agent);
      }
    });
  }

  /** Start real-time monitoring */
  startMonitoring(): void {
    if (this.monitoring) { return; }
    this.monitoring = true;
    this.fileWatcher.start();

    // Periodic status updates to webview
    this.statusInterval = setInterval(() => {
      if (this.messageBridge.isAttached) {
        this.messageBridge.sendStatusUpdate({
          agentCount: this.fileWatcher.getKnownAgents().length,
          eventCount: this.eventStore.count,
          monitoring: this.monitoring,
        });
      }
    }, 2000);

    console.log('[OfficeViewProvider] Monitoring started.');
  }

  /** Stop real-time monitoring */
  stopMonitoring(): void {
    if (!this.monitoring) { return; }
    this.monitoring = false;
    this.fileWatcher.stop();

    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    if (this.messageBridge.isAttached) {
      this.messageBridge.sendStatusUpdate({
        agentCount: this.fileWatcher.getKnownAgents().length,
        eventCount: this.eventStore.count,
        monitoring: false,
      });
    }

    console.log('[OfficeViewProvider] Monitoring stopped.');
  }

  /** Open (or reveal) the office panel */
  openPanel(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      OfficeViewProvider.viewType,
      'Copilot Office',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'dist'),
          vscode.Uri.joinPath(this.extensionUri, 'media'),
        ],
      }
    );

    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    // Wire up message bridge
    this.messageBridge.attach(this.panel.webview);
    this.registerMessageHandlers();

    this.panel.onDidDispose(() => {
      this.messageBridge.detach();
      this.panel = undefined;
    });

    this.panel.onDidChangeViewState(e => {
      if (e.webviewPanel.visible && this.messageBridge.isAttached) {
        // Send current status when panel becomes visible
        this.messageBridge.sendStatusUpdate({
          agentCount: this.fileWatcher.getKnownAgents().length,
          eventCount: this.eventStore.count,
          monitoring: this.monitoring,
        });
      }
    });
  }

  /** Dispose the panel */
  dispose(): void {
    this.stopMonitoring();
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    this.panel?.dispose();
  }

  /** Flush buffered events/agents to webview when it becomes ready */
  private flushBuffers(): void {
    // Send buffered agents first so webview knows the colors
    for (const agent of this.agentBuffer) {
      this.messageBridge.sendAgentAppeared({
        id: agent.id,
        name: agent.name,
        source: agent.source,
        color: agent.color,
      });
    }
    this.agentBuffer = [];

    // Then flush buffered events
    for (const event of this.eventBuffer) {
      this.messageBridge.sendLiveEvent(event);
    }
    this.eventBuffer = [];

    // Send current status
    this.messageBridge.sendStatusUpdate({
      agentCount: this.fileWatcher.getKnownAgents().length,
      eventCount: this.eventStore.count,
      monitoring: this.monitoring,
    });
  }

  private registerMessageHandlers(): void {
    this.messageBridge.onMessage((message: WebviewToExtensionMessage) => {
      switch (message.type) {
        case 'webview-ready': {
          this.flushBuffers();
          break;
        }

        case 'request-event-details': {
          const event = this.eventStore.getEventById(message.eventId);
          if (event) {
            this.messageBridge.sendEventDetails(event);
          }
          break;
        }

        case 'monitoring-control': {
          if (message.action === 'start') {
            this.startMonitoring();
          } else {
            this.stopMonitoring();
          }
          break;
        }
      }
    });
  }

  private getWebviewContent(webview: vscode.Webview): string {
    const nonce = getNonce();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );

    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Copilot Office</title>
  <style>
    :root {
      --bg-primary: #1e1e1e;
      --bg-secondary: #252526;
      --bg-tertiary: #2d2d30;
      --text-primary: #cccccc;
      --text-secondary: #999999;
      --accent-blue: #4285f4;
      --border: #3e3e42;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      overflow: hidden;
      height: 100vh;
    }
    #app { display: flex; flex-direction: column; height: 100vh; }
    #status-bar {
      height: 28px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-size: 11px;
      color: var(--text-secondary);
      gap: 16px;
      flex-shrink: 0;
    }
    #canvas-container { flex: 1; position: relative; overflow: hidden; }
    #office-canvas { display: block; width: 100%; height: 100%; }
    #activity-log {
      height: 130px;
      overflow-y: auto;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      padding: 8px 12px;
      font-family: 'Cascadia Code', 'Fira Code', 'Menlo', monospace;
      font-size: 11px;
      flex-shrink: 0;
    }
    #activity-log::-webkit-scrollbar { width: 4px; }
    #activity-log::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    .log-entry { padding: 1px 0; line-height: 1.5; opacity: 0; animation: fadeInLog 0.3s forwards; }
    .log-time { color: var(--text-secondary); }
    .log-text { color: var(--text-primary); }
    @keyframes fadeInLog { to { opacity: 1; } }
  </style>
</head>
<body>
  <div id="app">
    <div id="status-bar">🔴 Waiting...</div>
    <div id="canvas-container">
      <canvas id="office-canvas"></canvas>
    </div>
    <div id="activity-log"></div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
