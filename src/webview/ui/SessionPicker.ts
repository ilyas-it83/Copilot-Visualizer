import { SessionInfo } from '../types';

/**
 * Session selection dropdown for choosing which session to visualize.
 */
export class SessionPicker {
  private sessions: SessionInfo[] = [];
  private selectEl!: HTMLSelectElement;

  constructor(private container: HTMLElement, private onSelect: (sessionId: string) => void) {
    this.buildUI();
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div class="session-picker">
        <label class="picker-label">Session:</label>
        <select class="picker-select" id="session-select">
          <option value="">— Select a session —</option>
        </select>
      </div>
    `;

    this.selectEl = this.container.querySelector('#session-select')!;
    this.selectEl.addEventListener('change', () => {
      const value = this.selectEl.value;
      if (value) this.onSelect(value);
    });
  }

  setSessions(sessions: SessionInfo[]): void {
    this.sessions = sessions;
    this.renderOptions();
  }

  private renderOptions(): void {
    const options = this.sessions
      .map((s) => `<option value="${s.id}">${this.formatLabel(s)}</option>`)
      .join('');
    this.selectEl.innerHTML = `<option value="">— Select a session —</option>${options}`;
  }

  private formatLabel(session: SessionInfo): string {
    const sourceIcon = session.source === 'cli' ? '💻' : session.source === 'chat' ? '💬' : '⚡';
    return `${sourceIcon} ${session.name} (${session.eventCount} events) — ${session.date}`;
  }
}
