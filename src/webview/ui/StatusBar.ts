import { StatusUpdate } from '../types';

/**
 * Top status bar showing monitoring state, agent count, event count.
 */
export class StatusBar {
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
    this.render({ agentCount: 0, eventCount: 0, monitoring: false });
  }

  update(stats: StatusUpdate): void {
    this.render(stats);
  }

  private render(stats: StatusUpdate): void {
    const dot = stats.monitoring ? '🟢' : '🔴';
    const state = stats.monitoring ? 'Monitoring' : 'Paused';
    const agents = stats.agentCount === 1 ? '1 agent' : `${stats.agentCount} agents`;
    const events = `${stats.eventCount} events`;

    this.el.innerHTML = `<span>${dot} ${state}</span><span>${agents} active</span><span>${events}</span>`;
  }
}
