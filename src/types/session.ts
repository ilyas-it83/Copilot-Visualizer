/**
 * Session metadata types.
 */

import { LogSource } from './events';
import { AgentState } from './agents';

export interface CopilotSession {
  id: string;
  name: string;
  source: LogSource;
  startTime: number;
  endTime?: number;
  eventCount: number;
  agents: AgentState[];
  logPath: string;
}
