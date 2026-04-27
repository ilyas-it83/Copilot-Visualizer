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

    // Jim will provide the actual webview JS/CSS — this is the shell
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
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #1e1e2e;
      color: #cdd6f4;
      font-family: var(--vscode-font-family);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .loading {
      text-align: center;
    }
    .loading h2 {
      font-weight: 300;
      margin-bottom: 8px;
    }
    .loading p {
      opacity: 0.7;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="loading">
    <h2>🏢 Copilot Office</h2>
    <p>Waiting for webview bundle...</p>
    <p style="font-size: 11px; margin-top: 16px; opacity: 0.5;">
      The visualization canvas will load here once the webview is built.
    </p>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    // Message listener — Jim's webview code will replace this
    window.addEventListener('message', event => {
      const message = event.data;
      console.log('[Webview] Received:', message.type);
    });
    // Request session list on load
    vscode.postMessage({ type: 'request-session-list' });
  </script>
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
