const MAX_ENTRIES = 80;

/**
 * Scrolling activity log — shows recent events as text at the bottom.
 */
export class ActivityLog {
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  /** Add an entry to the log */
  add(text: string, color?: string): void {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-text" style="${color ? `color:${color}` : ''}">${this.escapeHtml(text)}</span>`;
    this.el.appendChild(entry);

    // Trim old entries
    while (this.el.children.length > MAX_ENTRIES) {
      this.el.removeChild(this.el.firstChild!);
    }

    // Auto-scroll
    this.el.scrollTop = this.el.scrollHeight;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
