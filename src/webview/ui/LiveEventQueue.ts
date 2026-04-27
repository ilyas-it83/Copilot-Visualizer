import { CopilotEvent } from '../types';
import { OfficeScene } from '../scene/OfficeScene';
import { EventAnimator } from '../animation/EventAnimator';
import { ActivityLog } from './ActivityLog';

/**
 * Queues incoming live events and processes them one at a time
 * with proper animation timing so animations don't pile up.
 */
export class LiveEventQueue {
  private queue: CopilotEvent[] = [];
  private processing = false;
  private eventAnimator: EventAnimator;

  constructor(private scene: OfficeScene, private activityLog: ActivityLog) {
    this.eventAnimator = new EventAnimator(scene, activityLog);
  }

  /** Push a new live event to the queue */
  push(event: CopilotEvent): void {
    this.queue.push(event);
    if (!this.processing) {
      this.processNext();
    }
  }

  private processNext(): void {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const event = this.queue.shift()!;

    // Animate and get estimated duration
    const duration = this.eventAnimator.animateEvent(event);
    this.scene.notifyEventReceived();

    // Wait a fraction of the animation duration before processing next
    // This prevents pile-up while keeping things flowing
    const delay = Math.min(duration * 0.6, 1500);
    setTimeout(() => this.processNext(), delay);
  }
}
