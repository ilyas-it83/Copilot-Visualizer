/**
 * Message Bridge
 * Bidirectional postMessage communication between extension host and webview.
 * Handles batching, type safety, and lifecycle.
 */

import * as vscode from 'vscode';
import { CopilotEvent } from '../types/events';
import { CopilotSession } from '../types/session';
import {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  EventsChunkMessage,
} from '../types/messages';

const DEFAULT_CHUNK_SIZE = 200;

export type MessageHandler = (message: WebviewToExtensionMessage) => void;

export class MessageBridge {
  private webview: vscode.Webview | null = null;
  private handlers: MessageHandler[] = [];
  private disposables: vscode.Disposable[] = [];

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

  /** Send a session to the webview */
  sendSession(session: CopilotSession): void {
    this.postMessage({ type: 'load-session', session });
  }

  /** Send session list to webview */
  sendSessionList(sessions: CopilotSession[]): void {
    this.postMessage({ type: 'session-list', sessions });
  }

  /**
   * Send events in batches to avoid overwhelming the webview.
   * Chunks of DEFAULT_CHUNK_SIZE events sent with microtask spacing.
   */
  async sendEventsInChunks(events: CopilotEvent[], chunkSize: number = DEFAULT_CHUNK_SIZE): Promise<void> {
    const totalChunks = Math.ceil(events.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = events.slice(i * chunkSize, (i + 1) * chunkSize);
      const message: EventsChunkMessage = {
        type: 'events-chunk',
        events: chunk,
        chunkIndex: i,
        totalChunks,
      };
      this.postMessage(message);

      // Yield to event loop between chunks
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  /** Send playback control command */
  sendPlaybackControl(action: 'play' | 'pause' | 'seek' | 'speed', value?: number): void {
    this.postMessage({ type: 'playback-control', action, value });
  }

  /** Send event details */
  sendEventDetails(event: CopilotEvent): void {
    this.postMessage({ type: 'event-details', event });
  }

  dispose(): void {
    this.detach();
    this.handlers = [];
  }
}
