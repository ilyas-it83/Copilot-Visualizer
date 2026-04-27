/**
 * Message types for extension ↔ webview communication.
 * Real-time monitoring protocol — events stream live as Copilot works.
 */

import { CopilotEvent } from './events';

// === Agent Identity ===

export interface AgentInfo {
  id: string;
  name: string;
  source: string;
  color: string;
}

export interface MonitoringStats {
  agentCount: number;
  eventCount: number;
  monitoring: boolean;
}

// === Extension → Webview Messages ===

export interface LiveEventMessage {
  type: 'live-event';
  event: CopilotEvent;
}

export interface AgentAppearedMessage {
  type: 'agent-appeared';
  agent: AgentInfo;
}

export interface StatusUpdateMessage {
  type: 'status-update';
  stats: MonitoringStats;
}

export interface EventDetailsMessage {
  type: 'event-details';
  event: CopilotEvent;
}

export type ExtensionToWebviewMessage =
  | LiveEventMessage
  | AgentAppearedMessage
  | StatusUpdateMessage
  | EventDetailsMessage;

// === Webview → Extension Messages ===

export interface RequestEventDetailsMessage {
  type: 'request-event-details';
  eventId: string;
}

export interface MonitoringControlMessage {
  type: 'monitoring-control';
  action: 'start' | 'stop';
}

export interface WebviewReadyMessage {
  type: 'webview-ready';
}

export type WebviewToExtensionMessage =
  | RequestEventDetailsMessage
  | MonitoringControlMessage
  | WebviewReadyMessage;
