import { Agent } from './Agent';
import { Renderer } from '../scene/Renderer';

const AGENT_WIDTH = 24;
const AGENT_HEIGHT = 36;

// Distinct hair styles per desk index
const HAIR_STYLES: Array<{ color: string; style: 'short' | 'spiky' | 'long' | 'bald' | 'mohawk' | 'curly' | 'ponytail' | 'flat' }> = [
  { color: '#3a2a1a', style: 'short' },
  { color: '#1a1a2a', style: 'spiky' },
  { color: '#8b4513', style: 'long' },
  { color: '#666', style: 'bald' },
  { color: '#d4a017', style: 'mohawk' },
  { color: '#2a1a0a', style: 'curly' },
  { color: '#4a2a1a', style: 'ponytail' },
  { color: '#1a3a2a', style: 'flat' },
];

// Distinct body shapes per desk index for stronger visual differentiation
const BODY_SHAPES: Array<{ type: 'slim' | 'stocky' | 'tall' | 'short' | 'average' | 'broad'; widthMul: number; heightMul: number }> = [
  { type: 'average', widthMul: 1.0, heightMul: 1.0 },
  { type: 'tall', widthMul: 0.85, heightMul: 1.15 },
  { type: 'stocky', widthMul: 1.25, heightMul: 0.9 },
  { type: 'slim', widthMul: 0.75, heightMul: 1.05 },
  { type: 'broad', widthMul: 1.3, heightMul: 1.0 },
  { type: 'short', widthMul: 1.0, heightMul: 0.8 },
  { type: 'average', widthMul: 1.1, heightMul: 0.95 },
  { type: 'tall', widthMul: 0.9, heightMul: 1.1 },
];

/**
 * Draws agents on the canvas as distinct pixel-art style characters.
 * Each agent has unique color, hair, body shape, badge, and desk nameplate.
 */
export class AgentRenderer {
  constructor(private renderer: Renderer) {}

  draw(agent: Agent): void {
    if (!agent.visible) return;

    // Don't draw agent when they're in the washroom (they're "inside")
    if (agent.status === 'in_washroom') {
      this.drawWashroomIndicator(this.renderer.context, agent);
      return;
    }

    const ctx = this.renderer.context;
    const { x, y } = agent.position;

    ctx.save();
    ctx.globalAlpha = 1;

    const idleBob = agent.getIdleBob();
    this.drawBody(ctx, agent, x, y + idleBob);
    this.drawHair(ctx, agent, x, y + idleBob);
    this.drawFeatures(ctx, agent, x, y + idleBob);
    this.drawRoleBadge(ctx, agent, x, y + idleBob);
    this.drawStatusIndicator(ctx, agent, x, y + idleBob);
    this.drawNameTag(ctx, agent, x, y + idleBob);

    // Code lines on monitor when typing
    if (agent.status === 'typing') {
      this.drawCodeLines(ctx, agent, x, y + idleBob);
    }

    // Search sweep effect
    if (agent.status === 'searching') {
      this.drawSearchSweep(ctx, agent, x, y + idleBob);
    }

    // Thought cloud (enhanced)
    if (agent.status === 'thinking') {
      this.drawThoughtCloud(ctx, agent, x, y + idleBob);
    }

    // Speech bubble — draw AFTER restore so it's not clipped by transforms
    ctx.restore();

    if (agent.speechBubble && agent.speechBubble.opacity > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.85, agent.speechBubble.opacity);
      this.renderer.drawSpeechBubble(
        agent.position.x,
        agent.position.y - AGENT_HEIGHT / 2 - 10,
        agent.speechBubble.text,
        agent.speechBubble.bgColor,
        agent.speechBubble.textColor
      );
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    return;
  }

  /** Draw desk nameplate at the agent's assigned desk */
  drawDeskNameplate(ctx: CanvasRenderingContext2D, agent: Agent, deskX: number, deskY: number): void {
    const name = agent.shortName;
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(name).width;

    // Nameplate background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(deskX - tw / 2 - 4, deskY - 2, tw + 8, 12);
    ctx.fillStyle = agent.color;
    ctx.fillRect(deskX - tw / 2 - 4, deskY - 2, 3, 12);

    // Name text
    ctx.fillStyle = '#fff';
    ctx.fillText(name, deskX, deskY + 7);
  }

  private drawBody(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const bodyShape = BODY_SHAPES[agent.deskIndex % BODY_SHAPES.length];
    const hw = (AGENT_WIDTH / 2) * bodyShape.widthMul;
    const hh = (AGENT_HEIGHT / 2) * bodyShape.heightMul;

    // Walking bob
    let yOffset = 0;
    if (agent.status === 'walking') {
      yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
    }

    // Relaxing pose (slightly reclined on couch)
    const recline = agent.status === 'relaxing' ? 3 : 0;

    // Head (circle)
    ctx.fillStyle = '#ffd5b4'; // skin tone
    ctx.beginPath();
    ctx.arc(x + recline, y - hh + 8 + yOffset, 9, 0, Math.PI * 2);
    ctx.fill();

    // Body (rounded rect) - using agent's distinct color
    ctx.fillStyle = agent.color;
    const bodyTop = y - hh + 18 + yOffset;
    ctx.beginPath();
    ctx.moveTo(x - hw / 2 + 3 + recline, bodyTop);
    ctx.lineTo(x + hw / 2 - 3 + recline, bodyTop);
    ctx.quadraticCurveTo(x + hw / 2 + recline, bodyTop, x + hw / 2 + recline, bodyTop + 3);
    ctx.lineTo(x + hw / 2 + recline, y + hh - 8 + yOffset);
    ctx.quadraticCurveTo(x + hw / 2 + recline, y + hh - 5 + yOffset, x + hw / 2 - 3 + recline, y + hh - 5 + yOffset);
    ctx.lineTo(x - hw / 2 + 3 + recline, y + hh - 5 + yOffset);
    ctx.quadraticCurveTo(x - hw / 2 + recline, y + hh - 5 + yOffset, x - hw / 2 + recline, y + hh - 8 + yOffset);
    ctx.lineTo(x - hw / 2 + recline, bodyTop + 3);
    ctx.quadraticCurveTo(x - hw / 2 + recline, bodyTop, x - hw / 2 + 3 + recline, bodyTop);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#333';
    if (agent.status === 'walking') {
      const legOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 3;
      ctx.fillRect(x - 4 + legOffset, y + hh - 5 + yOffset, 4, 8);
      ctx.fillRect(x - legOffset, y + hh - 5 + yOffset, 4, 8);
    } else if (agent.status === 'relaxing') {
      // Legs stretched out
      ctx.fillRect(x - 3 + recline, y + hh - 5, 4, 5);
      ctx.fillRect(x + 3 + recline, y + hh - 5, 4, 5);
    } else {
      ctx.fillRect(x - 5, y + hh - 5, 4, 6);
      ctx.fillRect(x + 1, y + hh - 5, 4, 6);
    }
  }

  private drawHair(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const bodyShape = BODY_SHAPES[agent.deskIndex % BODY_SHAPES.length];
    const hh = (AGENT_HEIGHT / 2) * bodyShape.heightMul;
    let yOffset = 0;
    if (agent.status === 'walking') {
      yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
    }
    const recline = agent.status === 'relaxing' ? 3 : 0;
    const headY = y - hh + 8 + yOffset;
    const hairDef = HAIR_STYLES[agent.deskIndex % HAIR_STYLES.length];

    ctx.fillStyle = hairDef.color;
    switch (hairDef.style) {
      case 'short':
        ctx.beginPath();
        ctx.arc(x + recline, headY - 3, 9, Math.PI, 0);
        ctx.fill();
        break;
      case 'spiky':
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 4 - 2 + recline, headY - 5);
          ctx.lineTo(x + i * 4 + recline, headY - 11);
          ctx.lineTo(x + i * 4 + 2 + recline, headY - 5);
          ctx.fill();
        }
        break;
      case 'long':
        ctx.beginPath();
        ctx.arc(x + recline, headY - 2, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x - 10 + recline, headY - 2, 4, 10);
        ctx.fillRect(x + 6 + recline, headY - 2, 4, 10);
        break;
      case 'bald':
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(x - 3 + recline, headY - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'mohawk':
        ctx.fillRect(x - 2 + recline, headY - 14, 4, 10);
        break;
      case 'curly':
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(x - 6 + i * 3 + recline, headY - 6, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'ponytail':
        ctx.beginPath();
        ctx.arc(x + recline, headY - 3, 9, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x + 6 + recline, headY - 2, 3, 12);
        break;
      case 'flat':
        ctx.fillRect(x - 9 + recline, headY - 7, 18, 4);
        break;
    }
  }

  private drawFeatures(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const bodyShape = BODY_SHAPES[agent.deskIndex % BODY_SHAPES.length];
    const hh = (AGENT_HEIGHT / 2) * bodyShape.heightMul;
    let yOffset = 0;
    if (agent.status === 'walking') {
      yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
    }
    const recline = agent.status === 'relaxing' ? 3 : 0;

    const headY = y - hh + 8 + yOffset;
    const lookDir = agent.getIdleLookDirection();

    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 4 + lookDir + recline, headY - 2, 3, 3);
    ctx.fillRect(x + 1 + lookDir + recline, headY - 2, 3, 3);

    // Typing hands animation
    if (agent.status === 'typing') {
      const handOffset = agent.getTypingFrame() * 2 - 2;
      ctx.fillStyle = '#ffd5b4';
      ctx.fillRect(x - 8 + handOffset, y + 2, 4, 4);
      ctx.fillRect(x + 4 - handOffset, y + 2, 4, 4);
    }

    // Drinking coffee — hand holding cup
    if (agent.status === 'drinking_coffee') {
      ctx.fillStyle = '#ffd5b4';
      ctx.fillRect(x + 8, y - 2, 4, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 12, y - 4, 6, 8);
    }

    // Drinking water — hand holding glass
    if (agent.status === 'drinking_water') {
      ctx.fillStyle = '#ffd5b4';
      ctx.fillRect(x + 8, y - 2, 4, 4);
      ctx.fillStyle = '#b3e5fc';
      ctx.fillRect(x + 12, y - 3, 5, 7);
    }

    // Watching phone — hand holding phone
    if (agent.status === 'watching_phone') {
      ctx.fillStyle = '#ffd5b4';
      ctx.fillRect(x + 6, y, 4, 4);
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 10, y - 2, 7, 12);
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(x + 11, y - 1, 5, 9);
    }

    // Sleeping — closed eyes (lines instead of squares)
    if (agent.status === 'sleeping') {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 5 + lookDir, headY - 1);
      ctx.lineTo(x - 1 + lookDir, headY - 1);
      ctx.moveTo(x + 1 + lookDir, headY - 1);
      ctx.lineTo(x + 5 + lookDir, headY - 1);
      ctx.stroke();
    }
  }

  private drawRoleBadge(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const badgeY = y - AGENT_HEIGHT / 2 - 16;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(agent.roleBadge, x, badgeY);
  }

  private drawStatusIndicator(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const indicatorY = y - AGENT_HEIGHT / 2 - 4;

    switch (agent.status) {
      case 'reading': {
        ctx.fillStyle = '#795548';
        ctx.fillRect(x - 5, indicatorY - 3, 10, 7);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, indicatorY - 3);
        ctx.lineTo(x, indicatorY + 4);
        ctx.stroke();
        break;
      }
      case 'drinking_coffee': {
        // ☕ icon above head
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☕', x, indicatorY - 2);
        break;
      }
      case 'drinking_water': {
        // 💧 icon above head
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💧', x, indicatorY - 2);
        break;
      }
      case 'relaxing': {
        // 😌 icon above head
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('😌', x, indicatorY - 2);
        break;
      }
      case 'watching_phone': {
        // 📱 icon above head
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📱', x, indicatorY - 2);
        break;
      }
      case 'sleeping': {
        // 💤 Zzz floating animation
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        const zzzOffset = Math.sin(Date.now() / 600) * 3;
        ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 400) * 0.3;
        ctx.fillText('💤', x + 8, indicatorY - 6 + zzzOffset);
        // Snoring Z letters
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#666';
        const z1 = Math.sin(Date.now() / 500) * 4;
        const z2 = Math.sin(Date.now() / 700 + 1) * 5;
        ctx.fillText('z', x + 14, indicatorY - 14 + z1);
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('z', x + 20, indicatorY - 20 + z2);
        ctx.globalAlpha = 1;
        break;
      }
      case 'in_meeting': {
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🗣️', x, indicatorY - 2);
        break;
      }
      case 'at_whiteboard': {
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📝', x, indicatorY - 2);
        break;
      }
      case 'browsing_files': {
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📂', x, indicatorY - 2);
        break;
      }
    }
  }

  /** Draw indicator at washroom door when agent is inside */
  private drawWashroomIndicator(ctx: CanvasRenderingContext2D, agent: Agent): void {
    // Draw a small colored dot near the washroom to indicate occupancy
    const washroomX = 890;
    const washroomY = 420;

    ctx.save();
    ctx.fillStyle = agent.color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(washroomX, washroomY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Tiny name
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.9;
    ctx.fillText(agent.shortName, washroomX, washroomY + 12);
    ctx.restore();
  }

  private drawThoughtCloud(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const cloudY = y - AGENT_HEIGHT / 2 - 30;
    const dots = agent.getThinkingDots();

    ctx.fillStyle = 'rgba(245,245,245,0.95)';
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, cloudY, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x - 6, cloudY + 16, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 3, cloudY + 22, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#666';
    for (let i = 0; i < 3; i++) {
      const dotAlpha = i < dots ? 1 : 0.2;
      ctx.globalAlpha = dotAlpha;
      ctx.beginPath();
      ctx.arc(x - 8 + i * 8, cloudY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawCodeLines(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const lineCount = agent.getCodeLineCount();
    const startX = x + 16;
    const startY = y - 20;

    ctx.globalAlpha = 0.8;
    for (let i = 0; i < lineCount; i++) {
      const lineWidth = 10 + (i * 7) % 15;
      ctx.fillStyle = i % 2 === 0 ? '#4ec9b0' : '#9cdcfe';
      ctx.fillRect(startX, startY + i * 5, lineWidth, 2.5);
    }
    ctx.globalAlpha = 1;
  }

  private drawSearchSweep(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const angle = agent.getSearchSweepAngle();
    const sweepX = x + Math.cos(angle) * 15;
    const sweepY = y - 10 + Math.sin(angle) * 10;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(sweepX, sweepY, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sweepX + 4, sweepY + 4);
    ctx.lineTo(sweepX + 8, sweepY + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawNameTag(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const tagY = y + AGENT_HEIGHT / 2 + 10;
    const name = agent.shortName;

    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const textWidth = ctx.measureText(name).width;

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const padding = 3;
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - padding, tagY - 8, textWidth + padding * 2, 12, 3);
    ctx.fill();

    // Text
    ctx.fillStyle = '#fff';
    ctx.fillText(name, x, tagY);
  }
}
