/**
 * Chat Log Parser
 * Parses Copilot Chat conversation files from VS Code globalStorage.
 */

import * as fs from 'fs';
import { CopilotEvent, LogSource, ChatMessage, ToolCall, SessionStart } from '../types/events';
import { v4Fallback as generateId } from './utils';

export class ChatParser {
  readonly source: LogSource = 'chat';

  /** Parse a chat conversation JSON file */
  async parse(filePath: string, sessionId: string): Promise<CopilotEvent[]> {
    const events: CopilotEvent[] = [];

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Handle different known structures
      if (Array.isArray(data)) {
        // Array of conversation entries
        for (const entry of data) {
          events.push(...this.parseConversationEntry(entry, sessionId));
        }
      } else if (data.conversations && Array.isArray(data.conversations)) {
        for (const conv of data.conversations) {
          events.push(...this.parseConversationEntry(conv, sessionId));
        }
      } else if (data.turns || data.messages) {
        events.push(...this.parseConversationEntry(data, sessionId));
      } else if (data.sessions && Array.isArray(data.sessions)) {
        // Metadata file with session list
        for (const session of data.sessions) {
          events.push(...this.parseSessionMetadata(session, sessionId));
        }
      } else {
        // Try treating as a single conversation entry
        events.push(...this.parseConversationEntry(data, sessionId));
      }
    } catch (err) {
      console.warn(`[ChatParser] Failed to parse ${filePath}:`, err);
    }

    return events;
  }

  private parseConversationEntry(entry: Record<string, unknown>, sessionId: string): CopilotEvent[] {
    const events: CopilotEvent[] = [];
    const agentId = 'chat-agent';

    const turns = (entry.turns || entry.messages || entry.history || []) as Record<string, unknown>[];
    if (!Array.isArray(turns)) { return events; }

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const timestamp = this.extractTimestamp(turn, i);

      // Main message
      const role = this.extractRole(turn);
      const content = (turn.content || turn.text || turn.message || '') as string;

      if (content) {
        events.push({
          id: generateId(),
          type: 'chat_message',
          timestamp,
          sessionId,
          agentId,
          source: this.source,
          role,
          content: String(content),
          tokenCount: turn.tokenCount as number | undefined,
          model: turn.model as string | undefined,
          metadata: turn,
        } as ChatMessage);
      }

      // Extract tool calls from turn
      const toolCalls = (turn.toolCalls || turn.tool_calls || turn.function_calls || []) as Record<string, unknown>[];
      if (Array.isArray(toolCalls)) {
        for (const tc of toolCalls) {
          events.push({
            id: generateId(),
            type: 'tool_call',
            timestamp: timestamp + 1,
            sessionId,
            agentId,
            source: this.source,
            toolName: (tc.name || tc.function || tc.tool || 'unknown') as string,
            arguments: (tc.arguments || tc.input || tc.parameters || {}) as Record<string, unknown>,
            result: tc.result as string | undefined,
            success: tc.error === undefined,
            metadata: tc,
          } as ToolCall);
        }
      }
    }

    return events;
  }

  private parseSessionMetadata(session: Record<string, unknown>, sessionId: string): CopilotEvent[] {
    const events: CopilotEvent[] = [];
    const timestamp = this.extractTimestamp(session, 0);

    events.push({
      id: generateId(),
      type: 'session_start',
      timestamp,
      sessionId,
      agentId: 'chat-agent',
      source: this.source,
      sessionName: (session.name || session.title || session.id) as string | undefined,
      metadata: session,
    } as SessionStart);

    return events;
  }

  private extractTimestamp(obj: Record<string, unknown>, index: number): number {
    if (typeof obj.timestamp === 'number') { return obj.timestamp; }
    if (typeof obj.timestamp === 'string') { return new Date(obj.timestamp).getTime() || Date.now(); }
    if (typeof obj.createdAt === 'number') { return obj.createdAt; }
    if (typeof obj.createdAt === 'string') { return new Date(obj.createdAt).getTime() || Date.now(); }
    if (typeof obj.date === 'string') { return new Date(obj.date).getTime() || Date.now(); }
    // Fallback: use index as offset from now
    return Date.now() - (1000 * (100 - index));
  }

  private extractRole(turn: Record<string, unknown>): 'user' | 'assistant' | 'system' {
    const role = turn.role || turn.author || turn.sender || '';
    if (role === 'user' || role === 'human') { return 'user'; }
    if (role === 'system') { return 'system'; }
    return 'assistant';
  }
}
