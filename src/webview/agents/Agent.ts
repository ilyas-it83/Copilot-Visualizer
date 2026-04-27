import { Point, AgentStatus, LogSource, OfficeLocation } from '../types';
import { findPath, locationToWaypoint } from '../scene/OfficeLayout';
import { SpeechBubble } from './SpeechBubble';

const WALK_SPEED = 120; // pixels per second

// Distinct color palettes per agent index (beyond source color)
const AGENT_COLORS: string[] = [
  '#4285f4', '#34a853', '#f4a026', '#ea4335',
  '#9c27b0', '#00bcd4', '#ff5722', '#607d8b',
];

// Role badge mapping
const SOURCE_BADGES: Record<LogSource, string> = {
  cli: '🔧',
  chat: '💬',
  inline: '⌨️',
};

// Friendly names based on source
const SOURCE_NAMES: Record<LogSource, string> = {
  cli: 'CLI Agent',
  chat: 'Chat Agent',
  inline: 'Inline Agent',
};

export class Agent {
  public id: string;
  public source: LogSource;
  public position: Point;
  public status: AgentStatus = 'idle';
  public deskIndex: number;
  public speechBubble: SpeechBubble | null = null;
  public currentLocation: string; // waypoint id
  public visible = true;

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
  // Idle animation state
  private idleTimer = 0;
  private idleBob = 0;
  private idleLookDirection = 0; // -1 left, 0 center, 1 right
  private idleLookTimer = 0;
  // Monitor code lines animation
  private codeLineCount = 0;
  private codeLineTimer = 0;
  // Search sweep animation
  private searchSweepAngle = 0;

  constructor(id: string, source: LogSource, startPos: Point, deskIndex: number, customName?: string) {
    this.id = id;
    this.source = source;
    this.position = { ...startPos };
    this.deskIndex = deskIndex;
    this.currentLocation = `desk-${deskIndex + 1}`;
    if (customName) {
      this._customName = customName;
    }
  }

  private _customName?: string;

  get color(): string {
    // Use distinct color per desk index for visual variety
    return AGENT_COLORS[this.deskIndex % AGENT_COLORS.length];
  }

  get secondaryColor(): string {
    // Slightly darker variant for body details
    const base = this.color;
    return base + 'cc';
  }

  get roleBadge(): string {
    return SOURCE_BADGES[this.source];
  }

  get displayName(): string {
    // Use custom name if provided by extension host
    if (this._customName) return this._customName;

    const id = this.id;

    // If ID contains recognizable names, use them
    if (id.includes('squad') || id.includes('Squad')) {
      const parts = id.split(/[-_./]/);
      const name = parts.find(p => p.length > 2 && !p.match(/^[a-f0-9]+$/i));
      if (name) return name.charAt(0).toUpperCase() + name.slice(1);
    }

    // Source-based default name + index for disambiguation
    const baseName = SOURCE_NAMES[this.source];
    if (this.deskIndex > 0) {
      return `${baseName} ${this.deskIndex + 1}`;
    }
    return baseName;
  }

  get shortName(): string {
    const name = this.displayName;
    return name.length > 14 ? name.substring(0, 12) + '…' : name;
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

    // Idle animation: subtle bob and look-around
    if (this.status === 'idle') {
      this.idleTimer += dt;
      this.idleBob = Math.sin(this.idleTimer * 1.5) * 0.8;
      this.idleLookTimer += dt;
      if (this.idleLookTimer > 3 + Math.random() * 2) {
        this.idleLookDirection = Math.floor(Math.random() * 3) - 1;
        this.idleLookTimer = 0;
      }
    } else {
      this.idleBob = 0;
      this.idleLookDirection = 0;
    }

    // Code lines animation (when typing)
    if (this.status === 'typing') {
      this.codeLineTimer += dt;
      if (this.codeLineTimer > 0.3) {
        this.codeLineCount = (this.codeLineCount + 1) % 6;
        this.codeLineTimer = 0;
      }
    } else {
      this.codeLineCount = 0;
    }

    // Search sweep animation
    if (this.status === 'searching') {
      this.searchSweepAngle += dt * 3;
    } else {
      this.searchSweepAngle = 0;
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

  getIdleBob(): number {
    return this.idleBob;
  }

  getIdleLookDirection(): number {
    return this.idleLookDirection;
  }

  getCodeLineCount(): number {
    return this.codeLineCount;
  }

  getSearchSweepAngle(): number {
    return this.searchSweepAngle;
  }
}
