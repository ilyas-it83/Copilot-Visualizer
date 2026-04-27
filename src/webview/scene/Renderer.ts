import { Rect } from '../types';

/**
 * Low-level Canvas 2D rendering utilities with layer management.
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private bgDirty = true;

  // Viewport/camera
  public offsetX = 0;
  public offsetY = 0;
  public scale = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  get context(): CanvasRenderingContext2D {
    return this.ctx;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.bgDirty = true;
  }

  invalidateBackground(): void {
    this.bgDirty = true;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Transform world coordinates to screen coordinates
  applyCamera(): void {
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
  }

  restoreCamera(): void {
    this.ctx.restore();
  }

  // Draw background to offscreen canvas (cached)
  drawBackground(drawFn: (ctx: CanvasRenderingContext2D) => void): void {
    if (this.bgDirty) {
      this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      this.offscreenCtx.save();
      this.offscreenCtx.translate(this.offsetX, this.offsetY);
      this.offscreenCtx.scale(this.scale, this.scale);
      drawFn(this.offscreenCtx);
      this.offscreenCtx.restore();
      this.bgDirty = false;
    }
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  // Basic shape utilities
  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  strokeRect(x: number, y: number, w: number, h: number, color: string, lineWidth = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, w, h);
  }

  fillCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawText(
    text: string,
    x: number,
    y: number,
    color: string,
    font = '12px monospace',
    align: CanvasTextAlign = 'center'
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, x, y);
  }

  drawRoundedRect(x: number, y: number, w: number, h: number, radius: number, fill: string, stroke?: string): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + w - radius, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.ctx.lineTo(x + w, y + h - radius);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.ctx.lineTo(x + radius, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fillStyle = fill;
    this.ctx.fill();
    if (stroke) {
      this.ctx.strokeStyle = stroke;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  // Speech bubble with pointer
  drawSpeechBubble(x: number, y: number, text: string, bgColor: string, textColor: string): void {
    const padding = 8;
    this.ctx.font = '11px monospace';
    const lines = this.wrapText(text, 150);
    const lineHeight = 14;
    const w = Math.min(170, Math.max(...lines.map((l) => this.ctx.measureText(l).width)) + padding * 2);
    const h = lines.length * lineHeight + padding * 2;

    const bx = x - w / 2;
    const by = y - h - 10;

    // Bubble body
    this.drawRoundedRect(bx, by, w, h, 6, bgColor, '#555');

    // Pointer triangle
    this.ctx.fillStyle = bgColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, by + h);
    this.ctx.lineTo(x + 5, by + h);
    this.ctx.lineTo(x, by + h + 8);
    this.ctx.closePath();
    this.ctx.fill();

    // Text
    this.ctx.fillStyle = textColor;
    this.ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      this.ctx.fillText(line, bx + padding, by + padding + (i + 1) * lineHeight - 2);
    });
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (this.ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 3 ? [...lines.slice(0, 3), '...'] : lines;
  }
}
