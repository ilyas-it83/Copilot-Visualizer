import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Tests for Chat conversation parser.
 * Expected import: import { parseChatConversations } from '../../parsers/chatParser';
 */

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

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

interface ChatMessage extends CopilotEvent {
  type: 'chat_message';
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  model?: string;
}

interface ChatConversation {
  id: string;
  turns: Array<{
    role: string;
    content: string;
    timestamp: string;
    model?: string;
  }>;
}

// Stub parser — replace with real import
function parseChatConversations(jsonContent: string): ChatMessage[] {
  const messages: ChatMessage[] = [];

  try {
    const data = JSON.parse(jsonContent);
    const conversations: ChatConversation[] = data.conversations || [];

    for (const conv of conversations) {
      for (const turn of conv.turns || []) {
        const message: ChatMessage = {
          id: `${conv.id}-${turn.timestamp}`,
          type: 'chat_message',
          timestamp: new Date(turn.timestamp).getTime(),
          sessionId: conv.id,
          agentId: turn.role === 'assistant' ? 'chat-agent' : 'user',
          source: 'chat',
          role: turn.role as 'user' | 'assistant' | 'system',
          content: turn.content,
          model: turn.model,
        };
        messages.push(message);
      }
    }
  } catch {
    // Return empty on parse failure
  }

  return messages;
}

describe('Chat Parser - parseChatConversations', () => {
  let validContent: string;

  beforeEach(() => {
    validContent = readFileSync(join(FIXTURES_DIR, 'chat-conversations.json'), 'utf-8');
  });

  describe('Valid conversation parsing', () => {
    it('should parse valid conversation JSON into ChatMessage events', () => {
      const messages = parseChatConversations(validContent);
      expect(messages).toBeInstanceOf(Array);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should produce ChatMessage events with correct type', () => {
      const messages = parseChatConversations(validContent);
      for (const msg of messages) {
        expect(msg.type).toBe('chat_message');
        expect(msg.source).toBe('chat');
      }
    });

    it('should preserve user and assistant roles', () => {
      const messages = parseChatConversations(validContent);
      const roles = new Set(messages.map(m => m.role));
      expect(roles.has('user')).toBe(true);
      expect(roles.has('assistant')).toBe(true);
    });

    it('should preserve message content', () => {
      const messages = parseChatConversations(validContent);
      const userMsg = messages.find(m => m.role === 'user');
      expect(userMsg).toBeDefined();
      expect(userMsg!.content.length).toBeGreaterThan(0);
    });

    it('should extract model information from assistant messages', () => {
      const messages = parseChatConversations(validContent);
      const assistantMsgs = messages.filter(m => m.role === 'assistant');
      const withModel = assistantMsgs.filter(m => m.model);
      expect(withModel.length).toBeGreaterThan(0);
    });

    it('should parse timestamps correctly', () => {
      const messages = parseChatConversations(validContent);
      for (const msg of messages) {
        expect(typeof msg.timestamp).toBe('number');
        expect(msg.timestamp).toBeGreaterThan(0);
      }
    });

    it('should use conversation ID as sessionId', () => {
      const messages = parseChatConversations(validContent);
      const sessionIds = new Set(messages.map(m => m.sessionId));
      expect(sessionIds.has('conv-001')).toBe(true);
    });

    it('should handle multiple conversations', () => {
      const messages = parseChatConversations(validContent);
      const sessionIds = new Set(messages.map(m => m.sessionId));
      expect(sessionIds.size).toBe(2);
    });
  });

  describe('Empty and edge cases', () => {
    it('should return empty array for empty conversations', () => {
      const messages = parseChatConversations('{"conversations": []}');
      expect(messages).toEqual([]);
    });

    it('should return empty array for missing conversations field', () => {
      const messages = parseChatConversations('{}');
      expect(messages).toEqual([]);
    });

    it('should handle conversation with no turns', () => {
      const content = '{"conversations": [{"id": "empty", "turns": []}]}';
      const messages = parseChatConversations(content);
      expect(messages).toEqual([]);
    });
  });

  describe('Malformed input', () => {
    it('should not crash on invalid JSON', () => {
      expect(() => parseChatConversations('not json')).not.toThrow();
    });

    it('should return empty array on invalid JSON', () => {
      const messages = parseChatConversations('not json');
      expect(messages).toEqual([]);
    });

    it('should handle missing fields in turns gracefully', () => {
      const content = JSON.stringify({
        conversations: [{
          id: 'conv-bad',
          turns: [{ role: 'user' }], // missing content and timestamp
        }],
      });
      expect(() => parseChatConversations(content)).not.toThrow();
    });
  });
});
