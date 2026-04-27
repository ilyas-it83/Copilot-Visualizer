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

// Idle roaming destinations with their activity status and duration ranges
const IDLE_ACTIVITIES: Array<{ location: OfficeLocation; status: AgentStatus; minDuration: number; maxDuration: number; bubble?: string }> = [
  { location: 'coffee_machine', status: 'drinking_coffee', minDuration: 4, maxDuration: 6, bubble: '☕ Coffee break...' },
  { location: 'water_cooler', status: 'drinking_water', minDuration: 3, maxDuration: 5, bubble: '💧 Staying hydrated' },
  { location: 'washroom', status: 'in_washroom', minDuration: 5, maxDuration: 8 },
  { location: 'meeting_table', status: 'in_meeting', minDuration: 6, maxDuration: 12, bubble: '🗣️ Quick sync...' },
  { location: 'whiteboard', status: 'at_whiteboard', minDuration: 5, maxDuration: 10, bubble: '📝 Sketching ideas...' },
  { location: 'file_cabinet', status: 'browsing_files', minDuration: 4, maxDuration: 7, bubble: '📂 Looking up docs...' },
  { location: 'desk', status: 'watching_phone', minDuration: 5, maxDuration: 12, bubble: '📱 Scrolling...' },
  { location: 'desk', status: 'sleeping', minDuration: 8, maxDuration: 15, bubble: '💤 Zzzzz...' },
];

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

  // Idle roaming state
  private idleRoamTimer = 0;
  private idleRoamDelay: number; // random 8-15s per agent
  private isRoaming = false;
  private roamActivityTimer = 0;
  private roamActivityDuration = 0;

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
    this.idleRoamDelay = 8 + Math.random() * 7; // 8-15 seconds
    if (customName) {
      this._customName = customName;
    }
  }

  private _customName?: string;

  get color(): string {
    return AGENT_COLORS[this.deskIndex % AGENT_COLORS.length];
  }

  get secondaryColor(): string {
    const base = this.color;
    return base + 'cc';
  }

  get roleBadge(): string {
    return SOURCE_BADGES[this.source];
  }

  get displayName(): string {
    if (this._customName) return this._customName;

    const id = this.id;

    if (id.includes('squad') || id.includes('Squad')) {
      const parts = id.split(/[-_./]/);
      const name = parts.find(p => p.length > 2 && !p.match(/^[a-f0-9]+$/i));
      if (name) return name.charAt(0).toUpperCase() + name.slice(1);
    }

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

  moveTo(location: OfficeLocation, locationIndex: number = 0, onArrival?: () => void, isIdleRoam?: boolean): void {
    // Real Copilot events interrupt idle roaming
    if (!isIdleRoam) {
      this.interruptIdleRoam();
    }

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

  /** Interrupt any idle roaming — called when real Copilot events arrive */
  interruptIdleRoam(): void {
    if (this.isRoaming) {
      this.isRoaming = false;
      this.roamActivityTimer = 0;
      this.roamActivityDuration = 0;
      // If walking to idle destination, clear path and snap back
      if (this.status === 'walking' || this.status === 'drinking_coffee' ||
          this.status === 'drinking_water' || this.status === 'in_washroom' ||
          this.status === 'in_meeting' || this.status === 'at_whiteboard' ||
          this.status === 'browsing_files' ||
          this.status === 'watching_phone' || this.status === 'sleeping') {
        this.path = [];
        this.pathIndex = 0;
        this.targetPosition = null;
        this.onArrival = null;
        this.status = 'idle';
      }
    }
    this.idleRoamTimer = 0;
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

    // Idle roaming logic
    this.updateIdleRoaming(dt);

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

    // Subtle idle bob
    if (this.status === 'idle' && !this.isRoaming) {
      this.idleTimer += dt;
      this.idleBob = Math.sin(this.idleTimer * 1.5) * 0.5;
    } else {
      this.idleBob = 0;
    }
    this.idleLookDirection = 0;

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

  private updateIdleRoaming(dt: number): void {
    // Only start roaming when truly idle (not in the middle of a real task)
    if (this.status === 'idle' && !this.isRoaming) {
      this.idleRoamTimer += dt;
      if (this.idleRoamTimer >= this.idleRoamDelay) {
        this.idleRoamTimer = 0;
        this.triggerIdleActivity();
      }
    }

    // Track time spent at idle activity location
    if (this.isRoaming && this.status !== 'walking' && this.status !== 'idle') {
      this.roamActivityTimer += dt;
      if (this.roamActivityTimer >= this.roamActivityDuration) {
        // Activity done, walk back to desk
        this.roamActivityTimer = 0;
        this.roamActivityDuration = 0;
        this.moveTo('desk', this.deskIndex, () => {
          this.isRoaming = false;
          this.status = 'idle';
          this.idleRoamDelay = 8 + Math.random() * 7; // Re-randomize
        }, true);
      }
    }
  }

  private triggerIdleActivity(): void {
    // 20% chance to stay at desk doing nothing
    if (Math.random() < 0.2) {
      this.idleRoamDelay = 8 + Math.random() * 7;
      return;
    }

    const activity = IDLE_ACTIVITIES[Math.floor(Math.random() * IDLE_ACTIVITIES.length)];
    const duration = activity.minDuration + Math.random() * (activity.maxDuration - activity.minDuration);

    this.isRoaming = true;
    this.roamActivityDuration = duration;

    // Desk-based activities: no walking needed
    if (activity.location === 'desk') {
      this.status = activity.status;
      if (activity.bubble) {
        this.showSpeechBubble(activity.bubble, 'speech', duration * 1000 * 0.6);
      }
      return;
    }

    const bubbleText = activity.bubble;
    this.moveTo(activity.location, 0, () => {
      // Arrived at activity location
      this.status = activity.status;
      if (bubbleText) {
        this.showSpeechBubble(bubbleText, 'speech', duration * 1000 * 0.6);
      }
    }, true);
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

  getIsRoaming(): boolean {
    return this.isRoaming;
  }
}
