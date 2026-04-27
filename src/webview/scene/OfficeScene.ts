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
  private lastEventTime = 0; // tracks when last real Copilot event arrived
  private noWorkBannerPulse = 0;

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
    // Hard cap: never allow more than 10 agents regardless of events
    if (this.agents.size >= 10) return;
    const desks = getDeskLocations();
    const deskIndex = index % desks.length;
    const desk = desks[deskIndex];
    const agent = new Agent(id, source, desk.position, deskIndex, customName);

    // Place agent directly at desk — no entrance animation
    agent.currentLocation = `desk-${deskIndex + 1}`;
    agent.setStatus('idle');

    this.agents.set(id, agent);
    this.renderer.invalidateBackground();
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /** Called when a real Copilot event is processed */
  notifyEventReceived(): void {
    this.lastEventTime = performance.now();
  }

  /** Check if any agent is doing real work (not idle/roaming) */
  private isAnyAgentWorking(): boolean {
    const idleStatuses: Set<string> = new Set([
      'idle', 'walking', 'drinking_coffee', 'drinking_water',
      'in_washroom', 'in_meeting', 'at_whiteboard', 'browsing_files',
      'watching_phone', 'sleeping'
    ]);
    for (const agent of this.agents.values()) {
      if (!idleStatuses.has(agent.status)) return true;
    }
    return false;
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

    // Pulse animation for no-work banner
    this.noWorkBannerPulse += dt;
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

    // Layer 3: "No Active Work" banner (drawn on top, in screen space)
    if (this.agents.size > 0 && !this.isAnyAgentWorking()) {
      this.drawNoWorkBanner();
    }
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

    // Title
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5a4e3e';
    ctx.fillText('🏢 Copilot Office', OFFICE_WIDTH / 2, 38);
    ctx.textAlign = 'left';

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

    // ========== PARTITION WALLS ==========
    this.drawPartitionWalls(ctx);

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

  private drawPartitionWalls(ctx: CanvasRenderingContext2D): void {
    const wallColor = '#8d7b68';
    const wallDark = '#6b5d4f';
    const wallWidth = 6;
    const doorGap = 40;

    // Helper: draw a wall segment with 3D effect
    const drawWall = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.save();
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.strokeStyle = wallColor;
      ctx.lineWidth = wallWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
      // Top edge highlight
      ctx.strokeStyle = '#a89580';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1 - wallWidth / 2 + 1);
      ctx.lineTo(x2, y2 - wallWidth / 2 + 1);
      ctx.stroke();
    };

    // Helper: draw a doorway with frame
    const drawDoorway = (x: number, y: number, isVertical: boolean) => {
      ctx.fillStyle = '#d4c5a9';
      if (isVertical) {
        ctx.fillRect(x - wallWidth / 2 - 1, y - doorGap / 2, wallWidth + 2, doorGap);
      } else {
        ctx.fillRect(x - doorGap / 2, y - wallWidth / 2 - 1, doorGap, wallWidth + 2);
      }
      // Door frame posts
      ctx.fillStyle = wallDark;
      if (isVertical) {
        ctx.fillRect(x - wallWidth / 2, y - doorGap / 2 - 2, wallWidth, 4);
        ctx.fillRect(x - wallWidth / 2, y + doorGap / 2 - 2, wallWidth, 4);
      } else {
        ctx.fillRect(x - doorGap / 2 - 2, y - wallWidth / 2, 4, wallWidth);
        ctx.fillRect(x + doorGap / 2 - 2, y - wallWidth / 2, 4, wallWidth);
      }
    };

    // Helper: draw room label
    const drawRoomLabel = (text: string, x: number, y: number) => {
      ctx.save();
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(90, 78, 62, 0.6)';
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    // ── Room floor tints (draw before walls) ──

    // Pantry floor (bottom-left: x 0-270, y 390-600)
    ctx.fillStyle = 'rgba(255, 243, 224, 0.5)';
    ctx.fillRect(0, 390, 270, 210);

    // Meeting Room floor (bottom-center: x 270-760, y 390-600)
    ctx.fillStyle = 'rgba(232, 245, 233, 0.4)';
    ctx.fillRect(270, 390, 490, 210);

    // WC floor (bottom-right: x 760-1000, y 390-600)
    ctx.fillStyle = 'rgba(224, 247, 250, 0.5)';
    ctx.fillRect(760, 390, 240, 210);

    // ── PANTRY WALLS ── (encloses coffee + water cooler, bottom-left)
    // Top wall with doorway
    drawWall(0, 390, 100, 390);
    drawWall(100 + doorGap, 390, 270, 390);
    drawDoorway(100 + doorGap / 2, 390, false);
    // Right wall
    drawWall(270, 390, 270, OFFICE_HEIGHT);
    drawRoomLabel('☕ Pantry', 135, 408);

    // ── MEETING ROOM WALLS ── (encloses meeting table, bottom-center)
    // Top wall with doorway (centered)
    drawWall(270, 390, 480, 390);
    drawWall(480 + doorGap, 390, 760, 390);
    drawDoorway(480 + doorGap / 2, 390, false);
    // Right wall
    drawWall(760, 390, 760, OFFICE_HEIGHT);
    drawRoomLabel('🗣️ Meeting Room', 515, 408);

    // ── WC WALLS ── (encloses washroom, bottom-right)
    // Top wall with doorway
    drawWall(760, 390, 850, 390);
    drawWall(850 + doorGap, 390, OFFICE_WIDTH, 390);
    drawDoorway(850 + doorGap / 2, 390, false);
    drawRoomLabel('🚻 WC', 880, 408);

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
        // Coffee booth with counter feel
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        ctx.fillStyle = '#6b4c30';
        ctx.fillRect(size.x + 2, size.y + 2, size.width - 4, 12);
        ctx.fillStyle = '#fff';
        ctx.fillRect(size.x + size.width / 2 - 8, size.y + size.height - 22, 16, 14);
        // Steam
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size.x + size.width / 2 - 3, size.y + size.height - 24);
        ctx.quadraticCurveTo(size.x + size.width / 2, size.y + size.height - 32, size.x + size.width / 2 + 3, size.y + size.height - 37);
        ctx.stroke();
        // Stool
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(size.x + size.width / 2, size.y + size.height + 12, 7, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'water_cooler':
        // Blue water jug on a stand
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(size.x + 10, size.y + 25, size.width - 20, size.height - 25);
        // Jug (inverted bottle)
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.moveTo(size.x + 15, size.y + 5);
        ctx.lineTo(size.x + size.width - 15, size.y + 5);
        ctx.lineTo(size.x + size.width - 12, size.y + 28);
        ctx.lineTo(size.x + 12, size.y + 28);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0288d1';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Neck
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(size.x + size.width / 2 - 5, size.y + 28, 10, 6);
        // Tap
        ctx.fillStyle = '#999';
        ctx.fillRect(size.x + size.width / 2 - 2, size.y + 36, 4, 8);
        break;

      case 'washroom':
        // Door with WC icon
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(size.x, size.y, size.width, size.height);
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 2;
        ctx.strokeRect(size.x, size.y, size.width, size.height);
        // Door handle
        ctx.fillStyle = '#daa520';
        ctx.beginPath();
        ctx.arc(size.x + size.width - 12, size.y + size.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        // WC text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚻', size.x + size.width / 2, size.y + size.height / 2 + 4);
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

    // Label — skip for items inside walled rooms (they have room labels already)
    const roomItems = ['washroom', 'coffee_machine', 'water_cooler', 'meeting_table'];
    if (!roomItems.includes(id)) {
      ctx.fillStyle = '#555';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, size.x + size.width / 2, size.y + size.height + 20);
    }
  }

  private drawNoWorkBanner(): void {
    const ctx = this.renderer.context;
    const w = this.renderer.width;

    ctx.save();

    // Semi-transparent banner at bottom
    const bannerH = 36;
    const bannerY = this.renderer.height - bannerH - 8;
    const pulse = 0.7 + Math.sin(this.noWorkBannerPulse * 2) * 0.15;

    // Banner background
    ctx.fillStyle = `rgba(45, 45, 55, ${pulse * 0.85})`;
    const bannerW = 320;
    const bannerX = (w - bannerW) / 2;
    const radius = 18;
    ctx.beginPath();
    ctx.moveTo(bannerX + radius, bannerY);
    ctx.lineTo(bannerX + bannerW - radius, bannerY);
    ctx.quadraticCurveTo(bannerX + bannerW, bannerY, bannerX + bannerW, bannerY + radius);
    ctx.lineTo(bannerX + bannerW, bannerY + bannerH - radius);
    ctx.quadraticCurveTo(bannerX + bannerW, bannerY + bannerH, bannerX + bannerW - radius, bannerY + bannerH);
    ctx.lineTo(bannerX + radius, bannerY + bannerH);
    ctx.quadraticCurveTo(bannerX, bannerY + bannerH, bannerX, bannerY + bannerH - radius);
    ctx.lineTo(bannerX, bannerY + radius);
    ctx.quadraticCurveTo(bannerX, bannerY, bannerX + radius, bannerY);
    ctx.fill();

    // Border glow
    ctx.strokeStyle = `rgba(100, 180, 255, ${pulse * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Moon/sleep icon
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌙', bannerX + 28, bannerY + 24);

    // Text
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = `rgba(200, 210, 230, ${pulse})`;
    ctx.fillText('No Active Work — Agents on Break', w / 2 + 8, bannerY + 23);

    ctx.restore();
  }
}
