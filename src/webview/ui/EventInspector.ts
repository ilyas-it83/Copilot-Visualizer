import { CopilotEvent } from '../types';

/**
 * Side panel showing details of a selected event.
 */
export class EventInspector {
  private visible = false;

  constructor(private container: HTMLElement) {
    this.container.innerHTML = `
      <div class="inspector">
        <div class="inspector-header">
          <h3>Event Details</h3>
          <button class="inspector-close" id="inspector-close">✕</button>
        </div>
        <div class="inspector-body" id="inspector-body"></div>
      </div>
    `;

    this.container.querySelector('#inspector-close')!.addEventListener('click', () => this.hide());
  }

  show(event: CopilotEvent): void {
    this.visible = true;
    this.container.classList.remove('hidden');

    const body = this.container.querySelector('#inspector-body')!;
    body.innerHTML = `
      <div class="inspector-field">
        <label>Type</label>
        <span class="event-type-badge type-${event.type}">${event.type}</span>
      </div>
      <div class="inspector-field">
        <label>Agent</label>
        <span>${event.agentId}</span>
      </div>
      <div class="inspector-field">
        <label>Source</label>
        <span class="source-badge source-${event.source}">${event.source}</span>
      </div>
      <div class="inspector-field">
        <label>Timestamp</label>
        <span>${new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>
      ${event.duration ? `
      <div class="inspector-field">
        <label>Duration</label>
        <span>${event.duration}ms</span>
      </div>` : ''}
      ${event.metadata ? `
      <details class="inspector-json">
        <summary>Raw Data</summary>
        <pre>${JSON.stringify(event.metadata, null, 2)}</pre>
      </details>` : ''}
    `;
  }

  hide(): void {
    this.visible = false;
    this.container.classList.add('hidden');
  }

  isVisible(): boolean {
    return this.visible;
  }
}
