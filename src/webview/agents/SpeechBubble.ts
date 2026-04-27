export type BubbleType = 'speech' | 'tool' | 'thought';

export class SpeechBubble {
  public text: string;
  public type: BubbleType;
  public opacity = 0;

  private duration: number;
  private elapsed = 0;
  private fadeInTime = 0.3;
  private fadeOutTime = 0.5;

  constructor(text: string, type: BubbleType, duration: number) {
    this.text = text.length > 60 ? text.substring(0, 57) + '...' : text;
    this.type = type;
    this.duration = duration / 1000; // Convert to seconds
  }

  get bgColor(): string {
    switch (this.type) {
      case 'speech': return '#ffffff';
      case 'tool': return '#e3f2fd';
      case 'thought': return '#f5f5f5';
    }
  }

  get textColor(): string {
    switch (this.type) {
      case 'speech': return '#333333';
      case 'tool': return '#1565c0';
      case 'thought': return '#666666';
    }
  }

  update(dt: number): void {
    this.elapsed += dt;

    if (this.elapsed < this.fadeInTime) {
      this.opacity = this.elapsed / this.fadeInTime;
    } else if (this.elapsed > this.duration - this.fadeOutTime) {
      this.opacity = Math.max(0, (this.duration - this.elapsed) / this.fadeOutTime);
    } else {
      this.opacity = 1;
    }
  }

  isExpired(): boolean {
    return this.elapsed >= this.duration;
  }
}
