/**
 * Message types for extension ↔ webview communication.
 */

import { CopilotEvent } from './events';
import { CopilotSession } from './session';

// === Extension → Webview Messages ===

export interface LoadSessionMessage {
  type: 'load-session';
  session: CopilotSession;
}

export interface EventsChunkMessage {
  type: 'events-chunk';
  events: CopilotEvent[];
  chunkIndex: number;
  totalChunks: number;
}

export interface PlaybackControlMessage {
  type: 'playback-control';
  action: 'play' | 'pause' | 'seek' | 'speed';
  value?: number; // timestamp for seek, multiplier for speed
}

export interface SessionListMessage {
  type: 'session-list';
  sessions: CopilotSession[];
}

export interface EventDetailsMessage {
  type: 'event-details';
  event: CopilotEvent;
}

export type ExtensionToWebviewMessage =
  | LoadSessionMessage
  | EventsChunkMessage
  | PlaybackControlMessage
  | SessionListMessage
  | EventDetailsMessage;

// === Webview → Extension Messages ===

export interface RequestSessionListMessage {
  type: 'request-session-list';
}

export interface RequestEventDetailsMessage {
  type: 'request-event-details';
  eventId: string;
}

export interface SessionSelectedMessage {
  type: 'session-selected';
  sessionId: string;
}

export interface PlaybackStateMessage {
  type: 'playback-state';
  action: 'play' | 'pause' | 'seek' | 'speed';
  value?: number;
}

export type WebviewToExtensionMessage =
  | RequestSessionListMessage
  | RequestEventDetailsMessage
  | SessionSelectedMessage
  | PlaybackStateMessage;
