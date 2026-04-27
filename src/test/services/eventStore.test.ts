import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for the EventStore service.
 * Expected import: import { EventStore } from '../../services/eventStore';
 * 
 * The EventStore is an in-memory store that holds normalized events
 * and provides query/filter APIs (PRD §5 Architecture).
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

// Stub EventStore — replace with real import
class EventStore {
  private events: CopilotEvent[] = [];
  private maxEvents: number;

  constructor(maxEvents = 5000) {
    this.maxEvents = maxEvents;
  }

  addEvents(newEvents: CopilotEvent[]): void {
    this.events.push(...newEvents);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
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

  getStats(): { total: number; byType: Record<string, number>; byAgent: Record<string, number> } {
    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    for (const e of this.events) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byAgent[e.agentId] = (byAgent[e.agentId] || 0) + 1;
    }
    return { total: this.events.length, byType, byAgent };
  }

  clear(): void {
    this.events = [];
  }
}

// Helper to create test events
function createEvent(overrides: Partial<CopilotEvent> = {}): CopilotEvent {
  return {
    id: `event-${Math.random().toString(36).slice(2)}`,
    type: 'tool_call',
    timestamp: Date.now(),
    sessionId: 'test-session',
    agentId: 'agent-1',
    source: 'cli',
    ...overrides,
  };
}

describe('EventStore', () => {
  let store: EventStore;

  beforeEach(() => {
    store = new EventStore();
  });

  describe('addEvents and retrieve', () => {
    it('should store events and retrieve them', () => {
      const events = [createEvent(), createEvent()];
      store.addEvents(events);
      expect(store.getAll()).toHaveLength(2);
    });

    it('should accumulate events across multiple addEvents calls', () => {
      store.addEvents([createEvent()]);
      store.addEvents([createEvent(), createEvent()]);
      expect(store.getAll()).toHaveLength(3);
    });

    it('should return copies, not references to internal state', () => {
      const events = [createEvent()];
      store.addEvents(events);
      const retrieved = store.getAll();
      retrieved.push(createEvent());
      expect(store.getAll()).toHaveLength(1);
    });
  });

  describe('getEventsByAgent', () => {
    it('should filter events by agent ID', () => {
      store.addEvents([
        createEvent({ agentId: 'agent-1' }),
        createEvent({ agentId: 'agent-2' }),
        createEvent({ agentId: 'agent-1' }),
      ]);

      const agent1Events = store.getEventsByAgent('agent-1');
      expect(agent1Events).toHaveLength(2);
      expect(agent1Events.every(e => e.agentId === 'agent-1')).toBe(true);
    });

    it('should return empty array for unknown agent', () => {
      store.addEvents([createEvent({ agentId: 'agent-1' })]);
      expect(store.getEventsByAgent('nonexistent')).toEqual([]);
    });
  });

  describe('getEventsByType', () => {
    it('should filter events by type', () => {
      store.addEvents([
        createEvent({ type: 'tool_call' }),
        createEvent({ type: 'chat_message' }),
        createEvent({ type: 'tool_call' }),
      ]);

      const toolCalls = store.getEventsByType('tool_call');
      expect(toolCalls).toHaveLength(2);
    });

    it('should return empty array for type with no events', () => {
      store.addEvents([createEvent({ type: 'tool_call' })]);
      expect(store.getEventsByType('completion')).toEqual([]);
    });
  });

  describe('getTimelineRange', () => {
    it('should return events within time range', () => {
      store.addEvents([
        createEvent({ timestamp: 1000 }),
        createEvent({ timestamp: 2000 }),
        createEvent({ timestamp: 3000 }),
        createEvent({ timestamp: 4000 }),
      ]);

      const range = store.getTimelineRange(1500, 3500);
      expect(range).toHaveLength(2);
      expect(range[0].timestamp).toBe(2000);
      expect(range[1].timestamp).toBe(3000);
    });

    it('should include boundary events', () => {
      store.addEvents([
        createEvent({ timestamp: 1000 }),
        createEvent({ timestamp: 2000 }),
      ]);

      const range = store.getTimelineRange(1000, 2000);
      expect(range).toHaveLength(2);
    });

    it('should return empty for range with no events', () => {
      store.addEvents([createEvent({ timestamp: 1000 })]);
      expect(store.getTimelineRange(2000, 3000)).toEqual([]);
    });
  });

  describe('Max events cap', () => {
    it('should cap at max events (default 5000)', () => {
      const events = Array.from({ length: 6000 }, (_, i) =>
        createEvent({ id: `e-${i}`, timestamp: i })
      );
      store.addEvents(events);
      expect(store.getEventCount()).toBeLessThanOrEqual(5000);
    });

    it('should respect custom max events', () => {
      const smallStore = new EventStore(100);
      const events = Array.from({ length: 200 }, (_, i) =>
        createEvent({ id: `e-${i}`, timestamp: i })
      );
      smallStore.addEvents(events);
      expect(smallStore.getEventCount()).toBeLessThanOrEqual(100);
    });

    it('should keep most recent events when capping', () => {
      const smallStore = new EventStore(3);
      smallStore.addEvents([
        createEvent({ id: 'old-1', timestamp: 1 }),
        createEvent({ id: 'old-2', timestamp: 2 }),
        createEvent({ id: 'new-1', timestamp: 3 }),
        createEvent({ id: 'new-2', timestamp: 4 }),
        createEvent({ id: 'new-3', timestamp: 5 }),
      ]);

      const events = smallStore.getAll();
      expect(events).toHaveLength(3);
      expect(events[0].id).toBe('new-1');
    });
  });

  describe('Event count and stats', () => {
    it('should return correct event count', () => {
      store.addEvents([createEvent(), createEvent()]);
      expect(store.getEventCount()).toBe(2);
    });

    it('should return stats grouped by type and agent', () => {
      store.addEvents([
        createEvent({ type: 'tool_call', agentId: 'a1' }),
        createEvent({ type: 'tool_call', agentId: 'a2' }),
        createEvent({ type: 'chat_message', agentId: 'a1' }),
      ]);

      const stats = store.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byType['tool_call']).toBe(2);
      expect(stats.byType['chat_message']).toBe(1);
      expect(stats.byAgent['a1']).toBe(2);
      expect(stats.byAgent['a2']).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all events', () => {
      store.addEvents([createEvent(), createEvent()]);
      store.clear();
      expect(store.getAll()).toEqual([]);
      expect(store.getEventCount()).toBe(0);
    });
  });
});
