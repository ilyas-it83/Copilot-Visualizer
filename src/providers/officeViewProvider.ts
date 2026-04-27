/**
 * Office View Provider
 * Manages the webview panel that hosts the office visualization.
 * Handles lifecycle, CSP, and wiring up the message bridge.
 */

import * as vscode from 'vscode';
import { MessageBridge } from '../services/messageBridge';
import { EventStore } from '../services/eventStore';
import { LogDiscoveryService } from '../services/logDiscovery';
import { parseSession } from '../parsers';
import { WebviewToExtensionMessage } from '../types/messages';

export class OfficeViewProvider {
  public static readonly viewType = 'copilot-visualizer.officeView';

  private panel: vscode.WebviewPanel | undefined;
  private readonly messageBridge: MessageBridge;
  private readonly eventStore: EventStore;
  private readonly logDiscovery: LogDiscoveryService;
  private readonly extensionUri: vscode.Uri;

  constructor(
    extensionUri: vscode.Uri,
    messageBridge: MessageBridge,
    eventStore: EventStore,
    logDiscovery: LogDiscoveryService,
  ) {
    this.extensionUri = extensionUri;
    this.messageBridge = messageBridge;
    this.eventStore = eventStore;
    this.logDiscovery = logDiscovery;
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
      if (e.webviewPanel.visible) {
        // Re-send current state when panel becomes visible again
        const sessions = this.logDiscovery.getCachedSessions();
        if (sessions.length > 0) {
          this.messageBridge.sendSessionList(sessions);
        }
      }
    });
  }

  /** Dispose the panel */
  dispose(): void {
    this.panel?.dispose();
  }

  private registerMessageHandlers(): void {
    this.messageBridge.onMessage(async (message: WebviewToExtensionMessage) => {
      switch (message.type) {
        case 'request-session-list': {
          const sessions = await this.logDiscovery.discoverSessions();
          this.messageBridge.sendSessionList(sessions);
          break;
        }

        case 'session-selected': {
          const sessions = this.logDiscovery.getCachedSessions();
          const session = sessions.find(s => s.id === message.sessionId);
          if (!session) { return; }

          // Parse the session
          const events = await parseSession(session);
          this.eventStore.loadEvents(events);

          // Update session metadata
          session.eventCount = events.length;

          // Send to webview
          this.messageBridge.sendSession(session);
          await this.messageBridge.sendEventsInChunks(events);
          break;
        }

        case 'request-event-details': {
          const event = this.eventStore.getEventById(message.eventId);
          if (event) {
            this.messageBridge.sendEventDetails(event);
          }
          break;
        }

        case 'playback-state': {
          // Forward playback control back to webview (for sync between multiple views)
          this.messageBridge.sendPlaybackControl(message.action, message.value);
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
      --timeline-height: 52px;
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
    #canvas-container { flex: 1; position: relative; overflow: hidden; }
    #office-canvas { display: block; width: 100%; height: 100%; }
    #session-picker { position: absolute; top: 8px; left: 8px; z-index: 10; }
    #event-inspector { position: absolute; top: 8px; right: 8px; width: 280px; max-height: calc(100vh - 80px); z-index: 20; overflow-y: auto; }
    #event-inspector.hidden { display: none; }
    #timeline-bar { height: var(--timeline-height); border-top: 1px solid var(--border); background: var(--bg-secondary); }
    .session-picker { display: flex; align-items: center; gap: 8px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; }
    .picker-label { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
    .picker-select { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; font-size: 12px; max-width: 300px; cursor: pointer; }
    .timeline { display: flex; align-items: center; height: 100%; padding: 0 12px; gap: 8px; }
    .timeline-btn { background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; width: 30px; height: 30px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
    .timeline-btn:hover { background: var(--accent-blue); border-color: var(--accent-blue); }
    .speed-btn { width: auto; padding: 0 8px; font-size: 11px; font-weight: 600; }
    .timeline-scrubber-container { flex: 1; position: relative; height: 20px; display: flex; align-items: center; }
    .event-markers { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }
    .event-marker { position: absolute; width: 4px; height: 4px; border-radius: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0.7; }
    .timeline-scrubber { width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: var(--bg-tertiary); border-radius: 2px; outline: none; cursor: pointer; }
    .timeline-scrubber::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--accent-blue); cursor: pointer; }
    .timeline-time { font-size: 11px; color: var(--text-secondary); font-family: monospace; white-space: nowrap; min-width: 90px; text-align: right; }
    .inspector { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .inspector-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border); }
    .inspector-header h3 { font-size: 13px; font-weight: 600; }
    .inspector-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 3px; }
    .inspector-body { padding: 12px 14px; }
    .inspector-field { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
    .inspector-field label { color: var(--text-secondary); font-weight: 500; }
  </style>
</head>
<body>
  <div id="app">
    <div id="canvas-container">
      <canvas id="office-canvas"></canvas>
      <div id="session-picker"></div>
      <div id="event-inspector" class="hidden"></div>
    </div>
    <div id="timeline-bar"></div>
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
