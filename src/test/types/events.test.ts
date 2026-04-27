import { describe, it, expect } from 'vitest';

/**
 * Tests for event type definitions and type guard functions.
 * Expected import: import { isToolCall, isChatMessage, createEvent } from '../../types/events';
 * 
 * Validates that type guards and event creation helpers work correctly
 * per PRD §6 Data Model.
 */

// PRD §6 types
type EventType =
  | 'tool_call'
  | 'tool_result'
  | 'chat_message'
  | 'completion'
  | 'agent_thinking'
  | 'agent_handoff'
  | 'session_start'
  | 'session_end'
  | 'error';

type LogSource = 'cli' | 'chat' | 'inline';

interface CopilotEvent {
  id: string;
  type: EventType;
  timestamp: number;
  sessionId: string;
  agentId: string;
  source: LogSource;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface ToolCall extends CopilotEvent {
  type: 'tool_call';
  toolName: string;
  arguments: Record<string, unknown>;
  result?: string;
  success?: boolean;
}

interface ChatMessage extends CopilotEvent {
  type: 'chat_message';
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  model?: string;
}

interface Completion extends CopilotEvent {
  type: 'completion';
  prompt: string;
  completionText: string;
  language: string;
  accepted: boolean;
  model?: string;
}

// Type guards — stub implementations matching expected API
function isToolCall(event: CopilotEvent): event is ToolCall {
  return event.type === 'tool_call' && 'toolName' in event;
}

function isChatMessage(event: CopilotEvent): event is ChatMessage {
  return event.type === 'chat_message' && 'role' in event && 'content' in event;
}

function isCompletion(event: CopilotEvent): event is Completion {
  return event.type === 'completion' && 'completionText' in event;
}

function createCopilotEvent(overrides: Partial<CopilotEvent> & { type: EventType }): CopilotEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    sessionId: 'default-session',
    agentId: 'default-agent',
    source: 'cli',
    ...overrides,
  };
}

function createToolCall(toolName: string, args: Record<string, unknown>, overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    ...createCopilotEvent({ type: 'tool_call' }),
    type: 'tool_call',
    toolName,
    arguments: args,
    ...overrides,
  };
}

function createChatMessage(role: ChatMessage['role'], content: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    ...createCopilotEvent({ type: 'chat_message' }),
    type: 'chat_message',
    role,
    content,
    ...overrides,
  };
}

describe('Event Type Guards', () => {
  describe('isToolCall', () => {
    it('should return true for valid ToolCall events', () => {
      const event = createToolCall('bash', { command: 'ls' });
      expect(isToolCall(event)).toBe(true);
    });

    it('should return false for non-tool-call events', () => {
      const event = createCopilotEvent({ type: 'session_start' });
      expect(isToolCall(event)).toBe(false);
    });

    it('should return false for chat messages', () => {
      const event = createChatMessage('user', 'hello');
      expect(isToolCall(event)).toBe(false);
    });
  });

  describe('isChatMessage', () => {
    it('should return true for valid ChatMessage events', () => {
      const event = createChatMessage('user', 'Hello!');
      expect(isChatMessage(event)).toBe(true);
    });

    it('should return true for assistant messages', () => {
      const event = createChatMessage('assistant', 'Here is the answer');
      expect(isChatMessage(event)).toBe(true);
    });

    it('should return false for tool call events', () => {
      const event = createToolCall('bash', {});
      expect(isChatMessage(event)).toBe(false);
    });
  });

  describe('isCompletion', () => {
    it('should return true for valid Completion events', () => {
      const event: Completion = {
        ...createCopilotEvent({ type: 'completion' }),
        type: 'completion',
        prompt: 'function add(',
        completionText: 'a: number, b: number): number { return a + b; }',
        language: 'typescript',
        accepted: true,
      };
      expect(isCompletion(event)).toBe(true);
    });

    it('should return false for non-completion events', () => {
      const event = createCopilotEvent({ type: 'tool_call' });
      expect(isCompletion(event)).toBe(false);
    });
  });
});

describe('Event Creation Helpers', () => {
  describe('createCopilotEvent', () => {
    it('should create event with all required fields', () => {
      const event = createCopilotEvent({ type: 'session_start' });
      expect(event.id).toBeDefined();
      expect(event.type).toBe('session_start');
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.sessionId).toBeDefined();
      expect(event.agentId).toBeDefined();
      expect(event.source).toBeDefined();
    });

    it('should generate unique IDs', () => {
      const event1 = createCopilotEvent({ type: 'session_start' });
      const event2 = createCopilotEvent({ type: 'session_start' });
      expect(event1.id).not.toBe(event2.id);
    });

    it('should allow overriding all fields', () => {
      const event = createCopilotEvent({
        type: 'error',
        sessionId: 'custom-session',
        agentId: 'custom-agent',
        source: 'chat',
        timestamp: 12345,
      });
      expect(event.sessionId).toBe('custom-session');
      expect(event.agentId).toBe('custom-agent');
      expect(event.source).toBe('chat');
      expect(event.timestamp).toBe(12345);
    });
  });

  describe('createToolCall', () => {
    it('should create a valid ToolCall', () => {
      const tc = createToolCall('edit', { path: 'src/main.ts' });
      expect(tc.type).toBe('tool_call');
      expect(tc.toolName).toBe('edit');
      expect(tc.arguments.path).toBe('src/main.ts');
    });

    it('should pass type guard', () => {
      const tc = createToolCall('bash', { command: 'npm test' });
      expect(isToolCall(tc)).toBe(true);
    });
  });

  describe('createChatMessage', () => {
    it('should create a valid ChatMessage', () => {
      const msg = createChatMessage('user', 'Fix the bug');
      expect(msg.type).toBe('chat_message');
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Fix the bug');
    });

    it('should pass type guard', () => {
      const msg = createChatMessage('assistant', 'Done!');
      expect(isChatMessage(msg)).toBe(true);
    });

    it('should allow setting model', () => {
      const msg = createChatMessage('assistant', 'response', { model: 'gpt-4o' });
      expect(msg.model).toBe('gpt-4o');
    });
  });
});
