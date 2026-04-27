/**
 * Message Bridge
 * Bidirectional postMessage communication between extension host and webview.
 * Real-time streaming protocol — events flow to webview as they happen.
 */

import * as vscode from 'vscode';
import { CopilotEvent } from '../types/events';
import {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  AgentInfo,
  MonitoringStats,
} from '../types/messages';

export type MessageHandler = (message: WebviewToExtensionMessage) => void;

export class MessageBridge {
  private webview: vscode.Webview | null = null;
  private handlers: MessageHandler[] = [];
  private disposables: vscode.Disposable[] = [];

  /** Whether a webview is currently attached and ready to receive messages */
  get isAttached(): boolean {
    return this.webview !== null;
  }

  /** Attach to a webview instance */
  attach(webview: vscode.Webview): void {
    this.detach();
    this.webview = webview;

    const listener = webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        this.handlers.forEach(handler => handler(message));
      }
    );
    this.disposables.push(listener);
  }

  /** Detach from current webview */
  detach(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.webview = null;
  }

  /** Register a handler for incoming webview messages */
  onMessage(handler: MessageHandler): vscode.Disposable {
    this.handlers.push(handler);
    return new vscode.Disposable(() => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) { this.handlers.splice(idx, 1); }
    });
  }

  /** Send a message to the webview */
  postMessage(message: ExtensionToWebviewMessage): void {
    if (this.webview) {
      this.webview.postMessage(message);
    }
  }

  /** Stream a live event to the webview */
  sendLiveEvent(event: CopilotEvent): void {
    this.postMessage({ type: 'live-event', event });
  }

  /** Notify webview that a new agent has appeared */
  sendAgentAppeared(agent: AgentInfo): void {
    this.postMessage({ type: 'agent-appeared', agent });
  }

  /** Send monitoring status update to webview */
  sendStatusUpdate(stats: MonitoringStats): void {
    this.postMessage({ type: 'status-update', stats });
  }

  /** Send event details (on request from webview) */
  sendEventDetails(event: CopilotEvent): void {
    this.postMessage({ type: 'event-details', event });
  }

  dispose(): void {
    this.detach();
    this.handlers = [];
  }
}
