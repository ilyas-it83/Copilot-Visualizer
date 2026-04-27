import { LogSource, InteractionLine } from '../types';
import { Agent } from '../agents/Agent';
import { AgentRenderer } from '../agents/AgentRenderer';
import { Renderer } from './Renderer';
import { LOCATIONS, OFFICE_WIDTH, OFFICE_HEIGHT, getDeskLocations } from './OfficeLayout';

/**
 * Main scene manager — owns the render loop and coordinates drawing layers.
 * Pure renderer: no playback state, no UI overlays (those are DOM elements).
 */
export class OfficeScene {
  private renderer: Renderer;
  private agentRenderer: AgentRenderer;
  private agents: Map<string, Agent> = new Map();
  private running = false;
  private lastTime = 0;
  private interactionLines: InteractionLine[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.agentRenderer = new AgentRenderer(this.renderer);
    this.fitToCanvas();
  }

  private fitToCanvas(): void {
    const sx = this.renderer.width / OFFICE_WIDTH;
    const sy = this.renderer.height / OFFICE_HEIGHT;
    this.renderer.scale = Math.min(sx, sy, 1.5);
    this.renderer.offsetX = (this.renderer.width - OFFICE_WIDTH * this.renderer.scale) / 2;
    this.renderer.offsetY = (this.renderer.height - OFFICE_HEIGHT * this.renderer.scale) / 2;
    this.renderer.invalidateBackground();
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
    this.fitToCanvas();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  addAgent(id: string, source: LogSource, index: number, customName?: string): void {
    if (this.agents.has(id)) return;
    const desks = getDeskLocations();
    const deskIndex = index % desks.length;
    const desk = desks[deskIndex];
    const agent = new Agent(id, source, desk.position, deskIndex, customName);

    // Entrance animation: start at door, walk to desk
    agent.position = { x: 400, y: 470 };
    agent.currentLocation = 'door';
    agent.showSpeechBubble('👋 Hello!', 'speech', 2000);
    agent.moveTo('desk', deskIndex, () => {
      agent.setStatus('idle');
    });

    this.agents.set(id, agent);
    this.renderer.invalidateBackground();
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /** Add an interaction line between two agents */
  addInteractionLine(fromId: string, toId: string, color: string = '#4285f4', duration: number = 2): void {
    this.interactionLines.push({
      fromAgent: fromId,
      toAgent: toId,
      progress: 0,
      duration,
      elapsed: 0,
      color,
    });
  }

  private loop = (time: number): void => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    for (const agent of this.agents.values()) {
      agent.update(dt);
    }

    // Update interaction lines
    this.interactionLines = this.interactionLines.filter(line => {
      line.elapsed += dt;
      line.progress = Math.min(line.elapsed / line.duration, 1);
      return line.progress < 1;
    });
  }

  private render(): void {
    this.renderer.clear();

    // Layer 1: Background (cached)
    this.renderer.drawBackground((ctx) => this.drawOfficeBackground(ctx));

    // Layer 2: Agents + interaction lines
    this.renderer.applyCamera();
    this.drawInteractionLines();
    for (const agent of this.agents.values()) {
      this.agentRenderer.draw(agent);
    }
    this.renderer.restoreCamera();
  }

  private drawInteractionLines(): void {
    const ctx = this.renderer.context;

    for (const line of this.interactionLines) {
      const fromAgent = this.agents.get(line.fromAgent);
      const toAgent = this.agents.get(line.toAgent);
      if (!fromAgent || !toAgent) continue;

      const from = fromAgent.position;
      const to = toAgent.position;

      ctx.save();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1 - line.progress * 0.5;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -line.elapsed * 30;

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 30;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y - 18);
      ctx.quadraticCurveTo(midX, midY - 20, to.x, to.y - 18);
      ctx.stroke();

      // Moving dot along the arc
      const t = (line.elapsed * 2) % 1;
      const dotX = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
      const dotY = (1 - t) * (1 - t) * (from.y - 18) + 2 * (1 - t) * t * (midY - 20) + t * t * (to.y - 18);

      ctx.setLineDash([]);
      ctx.fillStyle = line.color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawOfficeBackground(ctx: CanvasRenderingContext2D): void {
    // Floor
    ctx.fillStyle = '#f0ebe3';
    ctx.fillRect(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT);

    // Grid lines (subtle)
    ctx.strokeStyle = '#e0dbd3';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < OFFICE_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, OFFICE_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < OFFICE_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(OFFICE_WIDTH, y);
      ctx.stroke();
    }

    // Draw office furniture
    for (const loc of LOCATIONS) {
      this.drawFurniture(ctx, loc);
    }

    // Draw desk nameplates for assigned agents
    const desks = getDeskLocations();
    for (const agent of this.agents.values()) {
      const desk = desks[agent.deskIndex];
      if (desk) {
        this.agentRenderer.drawDeskNameplate(
          ctx, agent,
          desk.size.x + desk.size.width / 2,
          desk.size.y - 4
        );
      }
    }
  }

  private drawFurniture(ctx: CanvasRenderingContext2D, loc: typeof LOCATIONS[0]): void {
    const { size, label, id } = loc;

    switch (id) {
      case 'desk':
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        ctx.strokeStyle = '#6b4e0a';
        ctx.lineWidth = 1;
        ctx.strokeRect(size.x, size.y, size.width, size.height);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(size.x + size.width / 2 - 15, size.y + 5, 30, 22);
        ctx.fillStyle = '#1a73e8';
        ctx.fillRect(size.x + size.width / 2 - 13, size.y + 7, 26, 18);
        break;

      case 'terminal':
        ctx.fillStyle = '#333';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(size.x + 5, size.y + 5, size.width - 10, size.height - 20);
        ctx.fillStyle = '#111';
        ctx.fillRect(size.x + 7, size.y + 7, size.width - 14, size.height - 24);
        ctx.fillStyle = '#0f0';
        ctx.font = '8px monospace';
        ctx.fillText('$ _', size.x + 12, size.y + 20);
        break;

      case 'file_cabinet':
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = '#555';
          ctx.strokeRect(size.x + 3, size.y + 3 + i * 18, size.width - 6, 16);
          ctx.fillStyle = '#aaa';
          ctx.fillRect(size.x + size.width / 2 - 5, size.y + 9 + i * 18, 10, 4);
        }
        break;

      case 'meeting_table':
        ctx.fillStyle = '#a0522d';
        ctx.beginPath();
        ctx.ellipse(size.x + size.width / 2, size.y + size.height / 2, size.width / 2, size.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6b3410';
        ctx.lineWidth = 2;
        ctx.stroke();
        const chairs = [
          { x: size.x + size.width / 2, y: size.y - 10 },
          { x: size.x + size.width / 2, y: size.y + size.height + 10 },
          { x: size.x - 10, y: size.y + size.height / 2 },
          { x: size.x + size.width + 10, y: size.y + size.height / 2 },
        ];
        ctx.fillStyle = '#555';
        chairs.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill(); });
        break;

      case 'search_station':
        ctx.fillStyle = '#4a4a6a';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(size.x + size.width / 2 - 5, size.y + size.height / 2 - 5, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size.x + size.width / 2 + 4, size.y + size.height / 2 + 4);
        ctx.lineTo(size.x + size.width / 2 + 14, size.y + size.height / 2 + 14);
        ctx.stroke();
        break;

      case 'whiteboard':
        ctx.fillStyle = '#fff';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.strokeRect(size.x, size.y, size.width, size.height);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(size.x + 10, size.y + 15 + i * 16);
          ctx.lineTo(size.x + size.width - 10 - ((i * 17) % 30), size.y + 15 + i * 16);
          ctx.stroke();
        }
        break;

      case 'coffee_machine':
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(size.x + size.width / 2 - 8, size.y + size.height - 20, 16, 14);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size.x + size.width / 2 - 3, size.y + size.height - 22);
        ctx.quadraticCurveTo(size.x + size.width / 2, size.y + size.height - 30, size.x + size.width / 2 + 3, size.y + size.height - 35);
        ctx.stroke();
        break;

      case 'door':
        ctx.fillStyle = '#654321';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        ctx.fillStyle = '#daa520';
        ctx.beginPath();
        ctx.arc(size.x + size.width - 10, size.y + size.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    // Label
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, size.x + size.width / 2, size.y + size.height + 14);
  }
}
