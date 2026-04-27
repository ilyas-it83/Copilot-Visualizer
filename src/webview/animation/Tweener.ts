/**
 * Easing and interpolation utilities for smooth animations.
 */

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
} as const;

export interface Tween {
  id: string;
  startValue: number;
  endValue: number;
  duration: number;
  elapsed: number;
  easing: EasingFn;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export class Tweener {
  private tweens: Map<string, Tween> = new Map();
  private nextId = 0;

  /**
   * Create a new tween animation.
   */
  animate(
    from: number,
    to: number,
    duration: number,
    onUpdate: (value: number) => void,
    options?: { easing?: EasingFn; onComplete?: () => void; id?: string }
  ): string {
    const id = options?.id ?? `tween-${this.nextId++}`;
    this.tweens.set(id, {
      id,
      startValue: from,
      endValue: to,
      duration,
      elapsed: 0,
      easing: options?.easing ?? Easing.easeInOut,
      onUpdate,
      onComplete: options?.onComplete,
    });
    return id;
  }

  /**
   * Cancel a running tween.
   */
  cancel(id: string): void {
    this.tweens.delete(id);
  }

  /**
   * Cancel all running tweens.
   */
  cancelAll(): void {
    this.tweens.clear();
  }

  /**
   * Update all active tweens. Call once per frame.
   */
  update(dt: number): void {
    const completed: string[] = [];

    for (const [id, tween] of this.tweens) {
      tween.elapsed += dt;
      const progress = Math.min(tween.elapsed / tween.duration, 1);
      const easedProgress = tween.easing(progress);
      const value = tween.startValue + (tween.endValue - tween.startValue) * easedProgress;

      tween.onUpdate(value);

      if (progress >= 1) {
        completed.push(id);
      }
    }

    for (const id of completed) {
      const tween = this.tweens.get(id);
      this.tweens.delete(id);
      tween?.onComplete?.();
    }
  }

  get activeCount(): number {
    return this.tweens.size;
  }
}

// Utility: lerp between two points
export function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number
): { x: number; y: number } {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
