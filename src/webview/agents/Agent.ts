import { Point, AgentStatus, LogSource, OfficeLocation } from '../types';
import { findPath, locationToWaypoint } from '../scene/OfficeLayout';
import { SpeechBubble } from './SpeechBubble';

const WALK_SPEED = 120; // pixels per second

export class Agent {
  public id: string;
  public source: LogSource;
  public position: Point;
  public status: AgentStatus = 'idle';
  public deskIndex: number;
  public speechBubble: SpeechBubble | null = null;
  public currentLocation: string; // waypoint id

  private path: Point[] = [];
  private pathIndex = 0;
  private targetPosition: Point | null = null;
  private onArrival: (() => void) | null = null;

  // Animation state
  private walkFrame = 0;
  private walkTimer = 0;
  private typingFrame = 0;
  private typingTimer = 0;
  private thinkingDots = 0;
  private thinkingTimer = 0;

  constructor(id: string, source: LogSource, startPos: Point, deskIndex: number) {
    this.id = id;
    this.source = source;
    this.position = { ...startPos };
    this.deskIndex = deskIndex;
    this.currentLocation = `desk-${deskIndex + 1}`;
  }

  get color(): string {
    switch (this.source) {
      case 'cli': return '#4285f4'; // Blue
      case 'chat': return '#34a853'; // Green
      case 'inline': return '#f4a026'; // Orange
    }
  }

  get displayName(): string {
    // Shorten agent ID for display
    if (this.id.length > 12) {
      return this.id.substring(0, 10) + '…';
    }
    return this.id;
  }

  moveTo(location: OfficeLocation, locationIndex: number = 0, onArrival?: () => void): void {
    const targetWaypoint = locationToWaypoint(location, locationIndex);
    const pathPoints = findPath(this.currentLocation, targetWaypoint);

    if (pathPoints.length === 0) {
      this.currentLocation = targetWaypoint;
      onArrival?.();
      return;
    }

    this.path = pathPoints;
    this.pathIndex = 0;
    this.targetPosition = this.path[0];
    this.status = 'walking';
    this.onArrival = () => {
      this.currentLocation = targetWaypoint;
      onArrival?.();
    };
  }

  setStatus(status: AgentStatus): void {
    this.status = status;
  }

  showSpeechBubble(text: string, type: 'speech' | 'tool' | 'thought' = 'speech', duration: number = 3000): void {
    this.speechBubble = new SpeechBubble(text, type, duration);
  }

  hideSpeechBubble(): void {
    this.speechBubble = null;
  }

  update(dt: number): void {
    // Update movement
    if (this.status === 'walking' && this.targetPosition) {
      this.updateMovement(dt);
    }

    // Update animation counters
    this.walkTimer += dt;
    if (this.walkTimer > 0.2) {
      this.walkFrame = (this.walkFrame + 1) % 4;
      this.walkTimer = 0;
    }

    this.typingTimer += dt;
    if (this.typingTimer > 0.1) {
      this.typingFrame = (this.typingFrame + 1) % 3;
      this.typingTimer = 0;
    }

    this.thinkingTimer += dt;
    if (this.thinkingTimer > 0.5) {
      this.thinkingDots = (this.thinkingDots + 1) % 4;
      this.thinkingTimer = 0;
    }

    // Update speech bubble
    if (this.speechBubble) {
      this.speechBubble.update(dt);
      if (this.speechBubble.isExpired()) {
        this.speechBubble = null;
      }
    }
  }

  private updateMovement(dt: number): void {
    if (!this.targetPosition) return;

    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      this.position = { ...this.targetPosition };
      this.pathIndex++;

      if (this.pathIndex >= this.path.length) {
        // Arrived at destination
        this.targetPosition = null;
        this.path = [];
        this.status = 'idle';
        this.onArrival?.();
        this.onArrival = null;
      } else {
        this.targetPosition = this.path[this.pathIndex];
      }
    } else {
      const speed = WALK_SPEED * dt;
      const ratio = Math.min(speed / dist, 1);
      this.position.x += dx * ratio;
      this.position.y += dy * ratio;
    }
  }

  getWalkFrame(): number {
    return this.walkFrame;
  }

  getTypingFrame(): number {
    return this.typingFrame;
  }

  getThinkingDots(): number {
    return this.thinkingDots;
  }
}
