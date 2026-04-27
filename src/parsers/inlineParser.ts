/**
 * Inline Completion Log Parser
 * Parses VS Code extension host logs for Copilot inline completion events.
 * These logs are semi-structured text with embedded JSON.
 */

import * as fs from 'fs';
import { CopilotEvent, LogSource, Completion } from '../types/events';
import { v4Fallback as generateId } from './utils';

export class InlineParser {
  readonly source: LogSource = 'inline';

  /** Parse a Copilot extension log file for inline completion events */
  async parse(filePath: string, sessionId: string): Promise<CopilotEvent[]> {
    const events: CopilotEvent[] = [];

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parsed = this.parseLine(line, sessionId, i);
        if (parsed) {
          events.push(parsed);
        }
      }
    } catch (err) {
      console.warn(`[InlineParser] Failed to parse ${filePath}:`, err);
    }

    return events;
  }

  private parseLine(line: string, sessionId: string, lineNum: number): CopilotEvent | null {
    const trimmed = line.trim();
    if (!trimmed) { return null; }

    // Try to detect completion-related log entries
    // Common patterns: timestamps followed by log level and message
    const timestampMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?)\s*/);
    const timestamp = timestampMatch
      ? new Date(timestampMatch[1]).getTime()
      : Date.now() - (100000 - lineNum * 100);

    // Look for completion request/response patterns
    if (this.isCompletionRequest(trimmed)) {
      return this.parseCompletionEntry(trimmed, sessionId, timestamp);
    }

    // Look for JSON embedded in log lines
    const jsonStart = trimmed.indexOf('{');
    if (jsonStart >= 0) {
      try {
        const jsonStr = trimmed.slice(jsonStart);
        const data = JSON.parse(jsonStr);

        if (this.looksLikeCompletion(data)) {
          return this.fromJsonData(data, sessionId, timestamp);
        }
      } catch {
        // Not valid JSON, skip
      }
    }

    return null;
  }

  private isCompletionRequest(line: string): boolean {
    const indicators = [
      'completion',
      'inline suggest',
      'InlineCompletionProvider',
      'getCompletions',
      'ghostText',
      'copilot/completion',
    ];
    const lower = line.toLowerCase();
    return indicators.some(ind => lower.includes(ind.toLowerCase()));
  }

  private parseCompletionEntry(line: string, sessionId: string, timestamp: number): CopilotEvent | null {
    const agentId = 'inline-agent';

    // Try to extract useful info from the log line
    const accepted = line.toLowerCase().includes('accepted') || line.toLowerCase().includes('shown');
    const language = this.extractLanguage(line);

    return {
      id: generateId(),
      type: 'completion',
      timestamp,
      sessionId,
      agentId,
      source: this.source,
      prompt: '', // Not available in most log formats
      completionText: this.extractSnippet(line),
      language: language || 'unknown',
      accepted,
      metadata: { raw: line.slice(0, 500) },
    } as Completion;
  }

  private fromJsonData(data: Record<string, unknown>, sessionId: string, timestamp: number): Completion {
    return {
      id: generateId(),
      type: 'completion',
      timestamp: (data.timestamp as number) || timestamp,
      sessionId,
      agentId: 'inline-agent',
      source: this.source,
      prompt: (data.prompt as string) || (data.prefix as string) || '',
      completionText: (data.completion as string) || (data.text as string) || (data.insertText as string) || '',
      language: (data.language as string) || (data.languageId as string) || 'unknown',
      accepted: Boolean(data.accepted ?? data.shown ?? true),
      model: data.model as string | undefined,
      metadata: data,
    };
  }

  private looksLikeCompletion(data: Record<string, unknown>): boolean {
    return Boolean(
      data.completion || data.insertText || data.text ||
      data.completionText || data.choices ||
      (data.type && String(data.type).includes('completion'))
    );
  }

  private extractLanguage(line: string): string | null {
    const langMatch = line.match(/language[=:]\s*["']?(\w+)["']?/i);
    return langMatch ? langMatch[1] : null;
  }

  private extractSnippet(line: string): string {
    // Try to get the actual completion text from the log line
    const textMatch = line.match(/text[=:]\s*["'](.+?)["']/);
    if (textMatch) { return textMatch[1]; }
    return line.slice(0, 100);
  }
}
