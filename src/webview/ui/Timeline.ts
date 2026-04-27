import { CopilotEvent } from '../types';
import { AnimationController } from '../animation/AnimationController';

/**
 * Timeline playback control bar — rendered as HTML overlay.
 */
export class Timeline {
  private events: CopilotEvent[] = [];
  private playBtn!: HTMLButtonElement;
  private speedBtn!: HTMLButtonElement;
  private scrubber!: HTMLInputElement;
  private timeDisplay!: HTMLSpanElement;
  private eventMarkers!: HTMLDivElement;

  private speeds = [0.5, 1, 2, 4];
  private currentSpeedIndex = 1;

  constructor(private container: HTMLElement, private controller: AnimationController) {
    this.buildUI();
    this.bindController();
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div class="timeline">
        <button class="timeline-btn" id="btn-prev" title="Previous event">⏮</button>
        <button class="timeline-btn" id="btn-play" title="Play/Pause">▶</button>
        <button class="timeline-btn" id="btn-next" title="Next event">⏭</button>
        <button class="timeline-btn speed-btn" id="btn-speed" title="Playback speed">1x</button>
        <div class="timeline-scrubber-container">
          <div class="event-markers" id="event-markers"></div>
          <input type="range" class="timeline-scrubber" id="scrubber" min="0" max="1000" value="0" />
        </div>
        <span class="timeline-time" id="time-display">0:00 / 0:00</span>
      </div>
    `;

    this.playBtn = this.container.querySelector('#btn-play')!;
    this.speedBtn = this.container.querySelector('#btn-speed')!;
    this.scrubber = this.container.querySelector('#scrubber')!;
    this.timeDisplay = this.container.querySelector('#time-display')!;
    this.eventMarkers = this.container.querySelector('#event-markers')!;

    const prevBtn = this.container.querySelector('#btn-prev')!;
    const nextBtn = this.container.querySelector('#btn-next')!;

    this.playBtn.addEventListener('click', () => this.controller.togglePlayPause());
    this.speedBtn.addEventListener('click', () => this.cycleSpeed());
    prevBtn.addEventListener('click', () => this.controller.prevEvent());
    nextBtn.addEventListener('click', () => this.controller.nextEvent());

    this.scrubber.addEventListener('input', () => {
      const progress = parseInt(this.scrubber.value) / 1000;
      this.controller.seekToProgress(progress);
    });
  }

  private bindController(): void {
    this.controller.onPlayStateChange = (playing) => {
      this.playBtn.textContent = playing ? '⏸' : '▶';
    };

    this.controller.onTimeUpdate = (current, total) => {
      this.timeDisplay.textContent = `${this.formatTime(current)} / ${this.formatTime(total)}`;
      if (total > 0) {
        this.scrubber.value = String(Math.round((current / total) * 1000));
      }
    };
  }

  setEvents(events: CopilotEvent[]): void {
    this.events = events;
    this.renderMarkers();
  }

  appendEvents(events: CopilotEvent[]): void {
    this.events.push(...events);
    this.renderMarkers();
  }

  private renderMarkers(): void {
    this.eventMarkers.innerHTML = '';
    if (this.events.length < 2) return;

    const totalDuration = this.events[this.events.length - 1].timestamp - this.events[0].timestamp;
    if (totalDuration <= 0) return;

    for (const event of this.events) {
      const progress = (event.timestamp - this.events[0].timestamp) / totalDuration;
      const marker = document.createElement('div');
      marker.className = `event-marker marker-${event.type}`;
      marker.style.left = `${progress * 100}%`;
      marker.title = `${event.type} (${event.agentId})`;
      this.eventMarkers.appendChild(marker);
    }
  }

  private cycleSpeed(): void {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speeds.length;
    const speed = this.speeds[this.currentSpeedIndex];
    this.controller.setSpeed(speed);
    this.speedBtn.textContent = `${speed}x`;
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
