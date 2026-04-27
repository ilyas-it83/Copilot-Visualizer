import { Agent } from './Agent';
import { Renderer } from '../scene/Renderer';

const AGENT_WIDTH = 24;
const AGENT_HEIGHT = 36;

/**
 * Draws agents on the canvas as simple pixel-art style characters.
 * No image assets — all drawn with Canvas 2D primitives.
 */
export class AgentRenderer {
  constructor(private renderer: Renderer) {}

  draw(agent: Agent): void {
    const ctx = this.renderer.context;
    const { x, y } = agent.position;

    ctx.save();
    ctx.globalAlpha = 1;

    this.drawBody(ctx, agent, x, y);
    this.drawFeatures(ctx, agent, x, y);
    this.drawStatusIndicator(ctx, agent, x, y);
    this.drawNameTag(ctx, agent, x, y);

    // Speech bubble
    if (agent.speechBubble && agent.speechBubble.opacity > 0) {
      ctx.globalAlpha = agent.speechBubble.opacity;
      this.renderer.drawSpeechBubble(
        x,
        y - AGENT_HEIGHT / 2 - 5,
        agent.speechBubble.text,
        agent.speechBubble.bgColor,
        agent.speechBubble.textColor
      );
    }

    ctx.restore();
  }

  private drawBody(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const hw = AGENT_WIDTH / 2;
    const hh = AGENT_HEIGHT / 2;

    // Walking bob
    let yOffset = 0;
    if (agent.status === 'walking') {
      yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
    }

    // Head (circle)
    ctx.fillStyle = '#ffd5b4'; // skin tone
    ctx.beginPath();
    ctx.arc(x, y - hh + 8 + yOffset, 9, 0, Math.PI * 2);
    ctx.fill();

    // Body (rounded rect)
    ctx.fillStyle = agent.color;
    const bodyTop = y - hh + 18 + yOffset;
    ctx.beginPath();
    ctx.moveTo(x - hw / 2 + 3, bodyTop);
    ctx.lineTo(x + hw / 2 - 3, bodyTop);
    ctx.quadraticCurveTo(x + hw / 2, bodyTop, x + hw / 2, bodyTop + 3);
    ctx.lineTo(x + hw / 2, y + hh - 8 + yOffset);
    ctx.quadraticCurveTo(x + hw / 2, y + hh - 5 + yOffset, x + hw / 2 - 3, y + hh - 5 + yOffset);
    ctx.lineTo(x - hw / 2 + 3, y + hh - 5 + yOffset);
    ctx.quadraticCurveTo(x - hw / 2, y + hh - 5 + yOffset, x - hw / 2, y + hh - 8 + yOffset);
    ctx.lineTo(x - hw / 2, bodyTop + 3);
    ctx.quadraticCurveTo(x - hw / 2, bodyTop, x - hw / 2 + 3, bodyTop);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#333';
    if (agent.status === 'walking') {
      const legOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 3;
      ctx.fillRect(x - 4 + legOffset, y + hh - 5 + yOffset, 4, 8);
      ctx.fillRect(x - legOffset, y + hh - 5 + yOffset, 4, 8);
    } else {
      ctx.fillRect(x - 5, y + hh - 5, 4, 6);
      ctx.fillRect(x + 1, y + hh - 5, 4, 6);
    }
  }

  private drawFeatures(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const hh = AGENT_HEIGHT / 2;
    let yOffset = 0;
    if (agent.status === 'walking') {
      yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
    }

    const headY = y - hh + 8 + yOffset;

    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 4, headY - 2, 3, 3);
    ctx.fillRect(x + 1, headY - 2, 3, 3);

    // Typing hands animation
    if (agent.status === 'typing') {
      const handOffset = agent.getTypingFrame() * 2 - 2;
      ctx.fillStyle = '#ffd5b4';
      ctx.fillRect(x - 8 + handOffset, y + 2, 4, 4);
      ctx.fillRect(x + 4 - handOffset, y + 2, 4, 4);
    }
  }

  private drawStatusIndicator(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const indicatorY = y - AGENT_HEIGHT / 2 - 4;

    switch (agent.status) {
      case 'thinking': {
        // Animated dots above head
        const dots = agent.getThinkingDots();
        ctx.fillStyle = '#888';
        for (let i = 0; i < dots; i++) {
          ctx.beginPath();
          ctx.arc(x - 6 + i * 6, indicatorY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'searching': {
        // Small magnifying glass icon
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, indicatorY, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 3, indicatorY + 3);
        ctx.lineTo(x + 6, indicatorY + 6);
        ctx.stroke();
        break;
      }
      case 'reading': {
        // Small book icon
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
    }
  }

  private drawNameTag(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number): void {
    const tagY = y + AGENT_HEIGHT / 2 + 10;
    const name = agent.displayName;

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
