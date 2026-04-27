/**
 * CLI Log Parser
 * Parses events.jsonl files from ~/.copilot/session-state/<session>/events.jsonl
 * Format: One JSON object per line (JSONL), with event types like session.start, hook.start, hook.end
 */

import * as fs from 'fs';
import { CopilotEvent, LogSource, ToolCall, ToolResult, ChatMessage, SessionStart, SessionEnd, AgentThinking } from '../types/events';
import { v4Fallback as generateId } from './utils';

export class CliParser {
  readonly source: LogSource = 'cli';

  /** Parse an events.jsonl file into normalized CopilotEvent[] */
  async parse(filePath: string, sessionId: string): Promise<CopilotEvent[]> {
    const events: CopilotEvent[] = [];

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);

      for (const line of lines) {
        try {
          const raw = JSON.parse(line);
          const parsed = this.normalizeEvent(raw, sessionId);
          if (parsed) {
            events.push(parsed);
          }
        } catch {
          // Skip malformed lines — be tolerant of format changes
          continue;
        }
      }
    } catch (err) {
      console.warn(`[CliParser] Failed to read ${filePath}:`, err);
    }

    return events;
  }

  /** Parse a conversation.json file (fallback format) */
  async parseConversation(filePath: string, sessionId: string): Promise<CopilotEvent[]> {
    const events: CopilotEvent[] = [];

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (Array.isArray(data.turns)) {
        for (const turn of data.turns) {
          events.push(...this.parseTurn(turn, sessionId));
        }
      } else if (data.conversation && Array.isArray(data.conversation)) {
        for (const turn of data.conversation) {
          events.push(...this.parseTurn(turn, sessionId));
        }
      }
    } catch (err) {
      console.warn(`[CliParser] Failed to parse conversation at ${filePath}:`, err);
    }

    return events;
  }

  private normalizeEvent(raw: Record<string, unknown>, sessionId: string): CopilotEvent | null {
    const eventType = raw.type as string || raw.event as string || '';
    const timestamp = this.extractTimestamp(raw);
    const agentId = (raw.agent_id as string) || (raw.agentId as string) || 'cli-agent';

    const base = {
      id: generateId(),
      sessionId,
      agentId,
      source: this.source as LogSource,
      timestamp,
      metadata: raw,
    };

    switch (eventType) {
      case 'session.start':
      case 'session_start':
        return {
          ...base,
          type: 'session_start',
          sessionName: (raw.name as string) || undefined,
        } as SessionStart;

      case 'session.end':
      case 'session_end':
        return {
          ...base,
          type: 'session_end',
          reason: (raw.reason as string) || undefined,
        } as SessionEnd;

      case 'hook.start':
      case 'tool_call':
      case 'tool.start':
        return {
          ...base,
          type: 'tool_call',
          toolName: (raw.tool as string) || (raw.hook as string) || (raw.name as string) || 'unknown',
          arguments: (raw.arguments as Record<string, unknown>) || (raw.input as Record<string, unknown>) || {},
          success: undefined,
        } as ToolCall;

      case 'hook.end':
      case 'tool_result':
      case 'tool.end':
        return {
          ...base,
          type: 'tool_result',
          toolName: (raw.tool as string) || (raw.hook as string) || (raw.name as string) || 'unknown',
          result: String(raw.output || raw.result || ''),
          success: raw.success !== false && raw.error === undefined,
          duration: typeof raw.duration === 'number' ? raw.duration : undefined,
        } as ToolResult;

      case 'message':
      case 'chat_message':
      case 'assistant_message':
      case 'user_message':
        return {
          ...base,
          type: 'chat_message',
          role: this.inferRole(eventType, raw),
          content: (raw.content as string) || (raw.message as string) || '',
          tokenCount: raw.token_count as number | undefined,
          model: raw.model as string | undefined,
        } as ChatMessage;

      case 'thinking':
      case 'agent_thinking':
        return {
          ...base,
          type: 'agent_thinking',
          thought: (raw.thought as string) || (raw.content as string) || undefined,
        } as AgentThinking;

      default:
        // Unknown event type — still store it as generic metadata
        if (timestamp > 0) {
          return {
            ...base,
            type: 'chat_message',
            role: 'system' as const,
            content: `[${eventType}] ${JSON.stringify(raw).slice(0, 200)}`,
          } as ChatMessage;
        }
        return null;
    }
  }

  private parseTurn(turn: Record<string, unknown>, sessionId: string): CopilotEvent[] {
    const events: CopilotEvent[] = [];
    const timestamp = this.extractTimestamp(turn);
    const agentId = 'cli-agent';

    // User message
    if (turn.user_message || turn.userMessage) {
      events.push({
        id: generateId(),
        type: 'chat_message',
        timestamp,
        sessionId,
        agentId,
        source: this.source,
        role: 'user',
        content: String(turn.user_message || turn.userMessage || ''),
      } as ChatMessage);
    }

    // Assistant response
    if (turn.assistant_response || turn.assistantResponse) {
      events.push({
        id: generateId(),
        type: 'chat_message',
        timestamp: timestamp + 1, // Slightly after user message
        sessionId,
        agentId,
        source: this.source,
        role: 'assistant',
        content: String(turn.assistant_response || turn.assistantResponse || ''),
      } as ChatMessage);
    }

    return events;
  }

  private extractTimestamp(raw: Record<string, unknown>): number {
    if (typeof raw.timestamp === 'number') { return raw.timestamp; }
    if (typeof raw.timestamp === 'string') { return new Date(raw.timestamp).getTime() || Date.now(); }
    if (typeof raw.time === 'number') { return raw.time; }
    if (typeof raw.time === 'string') { return new Date(raw.time).getTime() || Date.now(); }
    if (typeof raw.created_at === 'string') { return new Date(raw.created_at).getTime() || Date.now(); }
    return Date.now();
  }

  private inferRole(eventType: string, raw: Record<string, unknown>): 'user' | 'assistant' | 'system' {
    if (raw.role === 'user' || eventType === 'user_message') { return 'user'; }
    if (raw.role === 'assistant' || eventType === 'assistant_message') { return 'assistant'; }
    if (raw.role === 'system') { return 'system'; }
    return 'assistant';
  }
}
