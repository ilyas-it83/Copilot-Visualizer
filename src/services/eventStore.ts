/**
 * Event Store
 * In-memory store for the active session's normalized events.
 * Provides filtering, querying, and capping.
 */

import * as vscode from 'vscode';
import { CopilotEvent, EventType } from '../types/events';

export class EventStore {
  private events: CopilotEvent[] = [];
  private maxEvents: number;

  constructor() {
    const config = vscode.workspace.getConfiguration('copilotVisualizer');
    this.maxEvents = config.get<number>('maxEvents', 5000);
  }

  /** Replace all events (used when loading a new session) */
  loadEvents(events: CopilotEvent[]): void {
    this.events = events.slice(0, this.maxEvents);
    this.sortByTimestamp();
  }

  /** Append events (used for incremental loading) */
  addEvents(newEvents: CopilotEvent[]): void {
    this.events.push(...newEvents);

    // Cap at max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }

    this.sortByTimestamp();
  }

  /** Get all events */
  getEvents(): CopilotEvent[] {
    return this.events;
  }

  /** Get events by agent ID */
  getEventsByAgent(agentId: string): CopilotEvent[] {
    return this.events.filter(e => e.agentId === agentId);
  }

  /** Get events by type */
  getEventsByType(type: EventType): CopilotEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /** Get events within a time range (inclusive) */
  getTimelineRange(startMs: number, endMs: number): CopilotEvent[] {
    return this.events.filter(e => e.timestamp >= startMs && e.timestamp <= endMs);
  }

  /** Get a single event by ID */
  getEventById(id: string): CopilotEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  /** Get unique agent IDs present in the store */
  getAgentIds(): string[] {
    const ids = new Set(this.events.map(e => e.agentId));
    return Array.from(ids);
  }

  /** Get the time range of all events */
  getTimeRange(): { start: number; end: number } | null {
    if (this.events.length === 0) { return null; }
    return {
      start: this.events[0].timestamp,
      end: this.events[this.events.length - 1].timestamp,
    };
  }

  /** Get total event count */
  get count(): number {
    return this.events.length;
  }

  /** Clear the store */
  clear(): void {
    this.events = [];
  }

  private sortByTimestamp(): void {
    this.events.sort((a, b) => a.timestamp - b.timestamp);
  }
}
