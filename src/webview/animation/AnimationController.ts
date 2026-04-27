import { CopilotEvent } from '../types';
import { OfficeScene } from '../scene/OfficeScene';
import { EventAnimator } from './EventAnimator';

/**
 * Central animation coordinator.
 * Manages the event queue, playback state, and dispatches animations.
 */
export class AnimationController {
  private events: CopilotEvent[] = [];
  private currentIndex = 0;
  private playing = false;
  private speed = 1;
  private elapsed = 0;
  private nextEventTime = 0;
  private eventAnimator: EventAnimator;
  private lastFrameTime = 0;
  private animFrameId: number | null = null;

  // Callbacks for UI updates
  public onTimeUpdate?: (current: number, total: number) => void;
  public onPlayStateChange?: (playing: boolean) => void;
  public onEventPlayed?: (event: CopilotEvent, index: number) => void;

  constructor(private scene: OfficeScene) {
    this.eventAnimator = new EventAnimator(scene);
  }

  loadEvents(events: CopilotEvent[]): void {
    this.events.push(...events);
    this.events.sort((a, b) => a.timestamp - b.timestamp);
  }

  reset(): void {
    this.events = [];
    this.currentIndex = 0;
    this.elapsed = 0;
    this.nextEventTime = 0;
    this.playing = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.lastFrameTime = performance.now();
    this.onPlayStateChange?.(true);
    this.tick();
  }

  pause(): void {
    this.playing = false;
    this.onPlayStateChange?.(false);
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  togglePlayPause(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getSpeed(): number {
    return this.speed;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  seekToIndex(index: number): void {
    this.currentIndex = Math.max(0, Math.min(index, this.events.length - 1));
    if (this.events.length > 0) {
      this.elapsed = this.events[this.currentIndex].timestamp - this.events[0].timestamp;
    }
    this.onTimeUpdate?.(this.elapsed, this.getTotalDuration());
  }

  seekToProgress(progress: number): void {
    const totalDuration = this.getTotalDuration();
    const targetTime = progress * totalDuration;
    this.elapsed = targetTime;

    // Find the appropriate event index
    const baseTime = this.events[0]?.timestamp ?? 0;
    this.currentIndex = this.events.findIndex((e) => (e.timestamp - baseTime) >= targetTime);
    if (this.currentIndex === -1) this.currentIndex = this.events.length;

    this.onTimeUpdate?.(this.elapsed, totalDuration);
  }

  nextEvent(): void {
    if (this.currentIndex < this.events.length - 1) {
      this.seekToIndex(this.currentIndex + 1);
      this.playCurrentEvent();
    }
  }

  prevEvent(): void {
    if (this.currentIndex > 0) {
      this.seekToIndex(this.currentIndex - 1);
      this.playCurrentEvent();
    }
  }

  getProgress(): number {
    const total = this.getTotalDuration();
    return total > 0 ? this.elapsed / total : 0;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getEventCount(): number {
    return this.events.length;
  }

  getEvents(): CopilotEvent[] {
    return this.events;
  }

  getTotalDuration(): number {
    if (this.events.length < 2) return 0;
    return this.events[this.events.length - 1].timestamp - this.events[0].timestamp;
  }

  private tick = (): void => {
    if (!this.playing) return;

    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.elapsed += dt * this.speed * 1000; // Convert to ms-based timeline

    // Check if we should play the next event
    while (this.currentIndex < this.events.length) {
      const event = this.events[this.currentIndex];
      const eventTime = event.timestamp - (this.events[0]?.timestamp ?? 0);

      if (eventTime <= this.elapsed) {
        this.playCurrentEvent();
        this.currentIndex++;
      } else {
        break;
      }
    }

    this.onTimeUpdate?.(this.elapsed, this.getTotalDuration());

    // Stop at end
    if (this.currentIndex >= this.events.length) {
      this.pause();
      return;
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private playCurrentEvent(): void {
    if (this.currentIndex >= this.events.length) return;
    const event = this.events[this.currentIndex];
    this.eventAnimator.animateEvent(event);
    this.onEventPlayed?.(event, this.currentIndex);
  }
}
