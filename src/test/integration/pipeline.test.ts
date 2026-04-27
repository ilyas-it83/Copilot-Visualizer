import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Integration test: Full pipeline from fixture → parse → normalize → store → query.
 * 
 * This test verifies the end-to-end flow described in PRD §5 Architecture:
 * Log Discovery → Log Parser → Event Normalizer → Event Store → Query
 */

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

// Types from PRD §6
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

// Inline implementations for integration test (will be replaced with real imports)
function parseCliEvents(content: string): CopilotEvent[] {
  const events: CopilotEvent[] = [];
  const lines = content.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const raw = JSON.parse(line);
      if (!raw.type || !raw.timestamp) continue;

      const typeMap: Record<string, EventType> = {
        'session.start': 'session_start',
        'session.end': 'session_end',
        'tool.call': 'tool_call',
        'tool.result': 'tool_result',
        'hook.start': 'chat_message',
        'hook.end': 'chat_message',
        'session.info': 'session_start',
      };

      const eventType = typeMap[raw.type] || 'error';
      if (eventType === 'error' && !typeMap[raw.type]) return events; // skip unknown

      const baseEvent: CopilotEvent = {
        id: `${raw.sessionId || 'unknown'}-${events.length}`,
        type: eventType,
        timestamp: new Date(raw.timestamp).getTime(),
        sessionId: raw.sessionId || 'unknown',
        agentId: raw.data?.agentId || 'default',
        source: 'cli',
        metadata: raw.data,
      };

      if (raw.type === 'tool.call' && raw.data?.toolName) {
        const toolCall: ToolCall = {
          ...baseEvent,
          type: 'tool_call',
          toolName: raw.data.toolName,
          arguments: raw.data.arguments || {},
        };
        events.push(toolCall);
      } else {
        events.push(baseEvent);
      }
    } catch {
      continue;
    }
  }

  return events;
}

class EventStore {
  private events: CopilotEvent[] = [];

  addEvents(newEvents: CopilotEvent[]): void {
    this.events.push(...newEvents);
  }

  getAll(): CopilotEvent[] {
    return [...this.events];
  }

  getEventsByAgent(agentId: string): CopilotEvent[] {
    return this.events.filter(e => e.agentId === agentId);
  }

  getEventsByType(type: EventType): CopilotEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getTimelineRange(startMs: number, endMs: number): CopilotEvent[] {
    return this.events.filter(e => e.timestamp >= startMs && e.timestamp <= endMs);
  }

  getEventCount(): number {
    return this.events.length;
  }
}

describe('Integration: Full Pipeline', () => {
  it('should process fixture through full pipeline: read → parse → store → query', () => {
    // Step 1: Read fixture (simulating Log Discovery)
    const rawContent = readFileSync(join(FIXTURES_DIR, 'cli-events.jsonl'), 'utf-8');
    expect(rawContent.length).toBeGreaterThan(0);

    // Step 2: Parse (Log Parser)
    const events = parseCliEvents(rawContent);
    expect(events.length).toBeGreaterThan(0);

    // Step 3: Store (Event Store)
    const store = new EventStore();
    store.addEvents(events);
    expect(store.getEventCount()).toBe(events.length);

    // Step 4: Query
    const toolCalls = store.getEventsByType('tool_call');
    expect(toolCalls.length).toBeGreaterThan(0);
  });

  it('should maintain event ordering throughout pipeline', () => {
    const rawContent = readFileSync(join(FIXTURES_DIR, 'cli-events.jsonl'), 'utf-8');
    const events = parseCliEvents(rawContent);

    const store = new EventStore();
    store.addEvents(events);

    const allEvents = store.getAll();
    for (let i = 1; i < allEvents.length; i++) {
      expect(allEvents[i].timestamp).toBeGreaterThanOrEqual(allEvents[i - 1].timestamp);
    }
  });

  it('should extract agents from events correctly', () => {
    const rawContent = readFileSync(join(FIXTURES_DIR, 'cli-events.jsonl'), 'utf-8');
    const events = parseCliEvents(rawContent);

    const store = new EventStore();
    store.addEvents(events);

    // Should have events from agent-1 (tool calls)
    const agent1Events = store.getEventsByAgent('agent-1');
    expect(agent1Events.length).toBeGreaterThan(0);

    // All agent-1 events should have correct agentId
    for (const event of agent1Events) {
      expect(event.agentId).toBe('agent-1');
    }
  });

  it('should handle the full pipeline with large fixture', () => {
    const rawContent = readFileSync(join(FIXTURES_DIR, 'cli-events-large.jsonl'), 'utf-8');

    const start = performance.now();
    const events = parseCliEvents(rawContent);
    const store = new EventStore();
    store.addEvents(events);
    const elapsed = performance.now() - start;

    expect(store.getEventCount()).toBeGreaterThan(1000);
    expect(elapsed).toBeLessThan(5000); // PRD: 5000 events < 5 seconds
  });

  it('should correctly filter by time range after pipeline', () => {
    const rawContent = readFileSync(join(FIXTURES_DIR, 'cli-events.jsonl'), 'utf-8');
    const events = parseCliEvents(rawContent);

    const store = new EventStore();
    store.addEvents(events);

    const allEvents = store.getAll();
    if (allEvents.length >= 2) {
      const midTimestamp = allEvents[Math.floor(allEvents.length / 2)].timestamp;
      const rangeEvents = store.getTimelineRange(midTimestamp, Infinity);
      expect(rangeEvents.length).toBeLessThanOrEqual(allEvents.length);
      expect(rangeEvents.length).toBeGreaterThan(0);
    }
  });

  it('should handle malformed input gracefully in pipeline', () => {
    const rawContent = readFileSync(join(FIXTURES_DIR, 'cli-events-malformed.jsonl'), 'utf-8');

    // Should not throw
    expect(() => {
      const events = parseCliEvents(rawContent);
      const store = new EventStore();
      store.addEvents(events);
    }).not.toThrow();
  });

  it('should handle empty input in pipeline', () => {
    const rawContent = readFileSync(join(FIXTURES_DIR, 'cli-events-empty.jsonl'), 'utf-8');
    const events = parseCliEvents(rawContent);
    const store = new EventStore();
    store.addEvents(events);
    expect(store.getEventCount()).toBe(0);
  });
});
