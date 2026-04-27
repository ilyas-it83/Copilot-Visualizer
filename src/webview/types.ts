// Webview-local type definitions for real-time monitoring

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

export interface InteractionLine {
  fromAgent: string;
  toAgent: string;
  progress: number;
  duration: number;
  elapsed: number;
  color: string;
}

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

export interface AgentInfo {
  id: string;
  name: string;
  source: LogSource;
  color: string;
}

export interface StatusUpdate {
  agentCount: number;
  eventCount: number;
  monitoring: boolean;
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

// Messages from extension host → webview (real-time protocol)
export type InboundMessage =
  | { type: 'live-event'; event: CopilotEvent }
  | { type: 'agent-appeared'; agent: AgentInfo }
  | { type: 'status-update'; stats: StatusUpdate }
  | { type: 'event-details'; event: CopilotEvent };

// Messages from webview → extension host
export type OutboundMessage =
  | { type: 'webview-ready' }
  | { type: 'request-event-details'; eventId: string }
  | { type: 'monitoring-control'; action: 'start' | 'stop' };

// VS Code API available in webview context
export interface VsCodeApi {
  postMessage(message: OutboundMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}
