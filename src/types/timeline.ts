/**
 * Timeline and scene action types for playback control.
 */

import { CopilotEvent } from './events';
import { AgentState, OfficeLocation } from './agents';

export interface TimelineEntry {
  event: CopilotEvent;
  agentState: AgentState;
  sceneAction: SceneAction;
}

export type SceneAction =
  | MoveToAction
  | AnimateAction
  | SpeechBubbleAction
  | IdleAction;

export interface MoveToAction {
  type: 'move_to';
  destination: OfficeLocation;
}

export interface AnimateAction {
  type: 'animate';
  animation: string;
  duration: number;
}

export interface SpeechBubbleAction {
  type: 'speech_bubble';
  text: string;
  style: 'chat' | 'thought' | 'tool';
}

export interface IdleAction {
  type: 'idle';
}
