/**
 * Agent state types for office visualization.
 */

export type AgentType = 'cli_agent' | 'chat_agent' | 'inline_agent';

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
  | 'whiteboard';

export interface AgentState {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  position: { x: number; y: number };
  currentAction?: string;
  assignedDesk: number;
}
