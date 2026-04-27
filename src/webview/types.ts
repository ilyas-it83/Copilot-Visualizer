// Webview-local type definitions (cannot import from extension host)

export type EventType =
  | 'tool_call'
  | 'tool_result'
  | 'chat_message'
  | 'completion'
  | 'agent_thinking'
  | 'agent_handoff'
  | 'session_start'
  | 'session_end'
  | 'error';

export type LogSource = 'cli' | 'chat' | 'inline';

export type AgentStatus =
  | 'idle'
  | 'walking'
  | 'typing'
  | 'reading'
  | 'talking'
  | 'thinking'
  | 'searching';

export type OfficeLocation =
  | 'desk'
  | 'terminal'
  | 'file_cabinet'
  | 'meeting_table'
  | 'search_station'
  | 'whiteboard'
  | 'coffee_machine'
  | 'door';

export interface CopilotEvent {
  id: string;
  type: EventType;
  timestamp: number;
  sessionId: string;
  agentId: string;
  source: LogSource;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface SessionInfo {
  id: string;
  name: string;
  source: LogSource;
  date: string;
  eventCount: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Messages from extension host → webview
export type InboundMessage =
  | { type: 'load-session'; session: SessionInfo; events: CopilotEvent[] }
  | { type: 'events-chunk'; events: CopilotEvent[] }
  | { type: 'playback-control'; action: 'play' | 'pause' | 'speed'; value?: number }
  | { type: 'session-list'; sessions: SessionInfo[] };

// Messages from webview → extension host
export type OutboundMessage =
  | { type: 'request-session-list' }
  | { type: 'request-event-details'; eventId: string }
  | { type: 'session-selected'; sessionId: string };

// VS Code API available in webview context
export interface VsCodeApi {
  postMessage(message: OutboundMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}
