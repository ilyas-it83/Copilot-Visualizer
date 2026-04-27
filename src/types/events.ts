/**
 * Core event types for the Copilot Visualizer.
 * All log sources are normalized into these types.
 */

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

export interface CopilotEvent {
  id: string;
  type: EventType;
  timestamp: number; // Unix ms
  sessionId: string;
  agentId: string;
  source: LogSource;
  duration?: number; // ms
  metadata?: Record<string, unknown>;
}

export interface ToolCall extends CopilotEvent {
  type: 'tool_call';
  toolName: string;
  arguments: Record<string, unknown>;
  result?: string;
  success?: boolean;
}

export interface ToolResult extends CopilotEvent {
  type: 'tool_result';
  toolName: string;
  result: string;
  success: boolean;
  relatedToolCallId?: string;
}

export interface ChatMessage extends CopilotEvent {
  type: 'chat_message';
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  model?: string;
}

export interface Completion extends CopilotEvent {
  type: 'completion';
  prompt: string;
  completionText: string;
  language: string;
  accepted: boolean;
  model?: string;
}

export interface AgentThinking extends CopilotEvent {
  type: 'agent_thinking';
  thought?: string;
}

export interface AgentHandoff extends CopilotEvent {
  type: 'agent_handoff';
  fromAgentId: string;
  toAgentId: string;
  reason?: string;
}

export interface SessionStart extends CopilotEvent {
  type: 'session_start';
  sessionName?: string;
}

export interface SessionEnd extends CopilotEvent {
  type: 'session_end';
  reason?: string;
}

export interface ErrorEvent extends CopilotEvent {
  type: 'error';
  errorMessage: string;
  errorCode?: string;
  stack?: string;
}

/** Type guard helpers */
export function isToolCall(event: CopilotEvent): event is ToolCall {
  return event.type === 'tool_call';
}

export function isChatMessage(event: CopilotEvent): event is ChatMessage {
  return event.type === 'chat_message';
}

export function isCompletion(event: CopilotEvent): event is Completion {
  return event.type === 'completion';
}
