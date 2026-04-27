/**
 * File Watcher Service
 * Monitors Copilot log files in real-time using fs.watch.
 * Tracks byte offsets per file, only reads new content.
 * Emits parsed CopilotEvents as they appear.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { CopilotEvent, LogSource } from '../types/events';
import { v4Fallback as generateId } from '../parsers/utils';

/** Agent color palette — deterministic mapping from agentId hash */
const AGENT_COLORS = [
  '#4285f4', // blue
  '#34a853', // green
  '#fbbc05', // yellow
  '#ea4335', // red
  '#ab47bc', // purple
  '#00acc1', // cyan
  '#ff7043', // orange
  '#8d6e63', // brown
  '#5c6bc0', // indigo
  '#26a69a', // teal
];

export interface AgentIdentity {
  id: string;
  name: string;
  source: string;
  color: string;
}

interface WatchedFile {
  filePath: string;
  source: LogSource;
  sessionId: string;
  byteOffset: number;
  watcher: fs.FSWatcher | null;
}

/**
 * FileWatcher monitors Copilot log directories and emits events in real-time.
 *
 * Events emitted:
 * - 'event' (CopilotEvent) — a new parsed event from a log file
 * - 'agent' (AgentIdentity) — a previously-unseen agent ID was encountered
 * - 'error' (Error) — a non-fatal watcher error
 */
export class FileWatcher extends EventEmitter {
  private watchedFiles: Map<string, WatchedFile> = new Map();
  private directoryWatchers: Map<string, fs.FSWatcher> = new Map();
  private knownAgents: Map<string, AgentIdentity> = new Map();
  private running = false;
  private scanInterval: ReturnType<typeof setInterval> | null = null;

  /** Start monitoring all known Copilot log locations */
  start(): void {
    if (this.running) { return; }
    this.running = true;

    console.log('[FileWatcher] Starting real-time monitoring...');

    // Watch CLI session-state directory
    const cliPath = this.getCliSessionPath();
    this.watchDirectory(cliPath, 'cli');

    // Watch chat storage path
    const chatPath = this.getChatStoragePath();
    if (chatPath) {
      this.watchDirectory(chatPath, 'chat');
    }

    // Periodic scan for newly-created directories (covers race conditions)
    this.scanInterval = setInterval(() => this.rescanDirectories(), 5000);

    // Initial scan to pick up existing files
    this.rescanDirectories();
  }

  /** Stop all watchers and clean up */
  stop(): void {
    if (!this.running) { return; }
    this.running = false;

    console.log('[FileWatcher] Stopping monitoring.');

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    for (const watched of this.watchedFiles.values()) {
      if (watched.watcher) {
        watched.watcher.close();
        watched.watcher = null;
      }
    }
    this.watchedFiles.clear();

    for (const watcher of this.directoryWatchers.values()) {
      watcher.close();
    }
    this.directoryWatchers.clear();
  }

  /** Get all known agents */
  getKnownAgents(): AgentIdentity[] {
    return Array.from(this.knownAgents.values());
  }

  /** Get monitoring stats */
  get isRunning(): boolean {
    return this.running;
  }

  get watchedFileCount(): number {
    return this.watchedFiles.size;
  }

  dispose(): void {
    this.stop();
    this.removeAllListeners();
  }

  // === Directory watching ===

  private watchDirectory(dirPath: string, source: LogSource): void {
    if (this.directoryWatchers.has(dirPath)) { return; }

    if (!this.directoryExists(dirPath)) {
      // Directory doesn't exist yet — try to watch its parent
      const parentDir = path.dirname(dirPath);
      if (this.directoryExists(parentDir)) {
        this.watchForDirectoryCreation(parentDir, dirPath, source);
      }
      return;
    }

    try {
      const watcher = fs.watch(dirPath, { persistent: false }, (eventType, filename) => {
        if (!this.running) { return; }
        if (eventType === 'rename' && filename) {
          // A new file/directory appeared — schedule a rescan
          setTimeout(() => this.scanDirectory(dirPath, source), 100);
        }
      });

      watcher.on('error', (err) => {
        console.warn(`[FileWatcher] Directory watcher error on ${dirPath}:`, err.message);
        this.emit('error', err);
      });

      this.directoryWatchers.set(dirPath, watcher);
      console.log(`[FileWatcher] Watching directory: ${dirPath}`);

      // Scan existing contents
      this.scanDirectory(dirPath, source);
    } catch (err) {
      console.warn(`[FileWatcher] Failed to watch directory ${dirPath}:`, err);
    }
  }

  private watchForDirectoryCreation(parentDir: string, targetDir: string, source: LogSource): void {
    const key = `parent:${parentDir}`;
    if (this.directoryWatchers.has(key)) { return; }

    try {
      const watcher = fs.watch(parentDir, { persistent: false }, (eventType, filename) => {
        if (!this.running) { return; }
        if (this.directoryExists(targetDir)) {
          // Target directory now exists — start watching it
          watcher.close();
          this.directoryWatchers.delete(key);
          this.watchDirectory(targetDir, source);
        }
      });

      watcher.on('error', () => { /* parent dir may be transient */ });
      this.directoryWatchers.set(key, watcher);
    } catch {
      // Parent dir not watchable — rely on periodic rescan
    }
  }

  private async scanDirectory(dirPath: string, source: LogSource): Promise<void> {
    if (!this.running) { return; }

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && source === 'cli') {
          // CLI session directories — look for events.jsonl inside
          const eventsFile = path.join(fullPath, 'events.jsonl');
          if (this.fileExists(eventsFile)) {
            this.watchFile(eventsFile, source, entry.name);
          }

          // Also watch the subdirectory for new events.jsonl creation
          this.watchSubdirectoryForFiles(fullPath, source, entry.name);
        } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          this.watchFile(fullPath, source, path.basename(entry.name, '.jsonl'));
        } else if (entry.isFile() && entry.name.endsWith('.json') && source === 'chat') {
          this.watchFile(fullPath, source, path.basename(entry.name, '.json'));
        }
      }
    } catch (err) {
      // Directory may have been removed — non-fatal
    }
  }

  private watchSubdirectoryForFiles(dirPath: string, source: LogSource, sessionId: string): void {
    const key = `subdir:${dirPath}`;
    if (this.directoryWatchers.has(key)) { return; }

    try {
      const watcher = fs.watch(dirPath, { persistent: false }, (eventType, filename) => {
        if (!this.running) { return; }
        if (filename === 'events.jsonl') {
          const eventsFile = path.join(dirPath, 'events.jsonl');
          if (this.fileExists(eventsFile)) {
            this.watchFile(eventsFile, source, sessionId);
          }
        }
      });

      watcher.on('error', () => { /* subdirectory may be transient */ });
      this.directoryWatchers.set(key, watcher);
    } catch {
      // Non-fatal
    }
  }

  // === File watching ===

  private watchFile(filePath: string, source: LogSource, sessionId: string): void {
    if (this.watchedFiles.has(filePath)) { return; }

    const watched: WatchedFile = {
      filePath,
      source,
      sessionId,
      byteOffset: 0,
      watcher: null,
    };

    // Read existing content from the start to catch up
    this.readNewContent(watched);

    try {
      const watcher = fs.watch(filePath, { persistent: false }, (eventType) => {
        if (!this.running) { return; }
        if (eventType === 'change') {
          this.readNewContent(watched);
        }
      });

      watcher.on('error', (err) => {
        console.warn(`[FileWatcher] File watcher error on ${filePath}:`, err.message);
        // File may have been deleted/rotated — remove tracking
        this.unwatchFile(filePath);
      });

      watched.watcher = watcher;
    } catch (err) {
      console.warn(`[FileWatcher] Failed to watch file ${filePath}:`, err);
    }

    this.watchedFiles.set(filePath, watched);
    console.log(`[FileWatcher] Watching file: ${filePath} (offset: ${watched.byteOffset})`);
  }

  private unwatchFile(filePath: string): void {
    const watched = this.watchedFiles.get(filePath);
    if (watched) {
      if (watched.watcher) {
        watched.watcher.close();
      }
      this.watchedFiles.delete(filePath);
    }
  }

  /** Read only new bytes appended since last read, parse lines, emit events */
  private readNewContent(watched: WatchedFile): void {
    try {
      const stat = fs.statSync(watched.filePath);
      const fileSize = stat.size;

      // Handle file truncation/rotation
      if (fileSize < watched.byteOffset) {
        console.log(`[FileWatcher] File truncated, resetting: ${watched.filePath}`);
        watched.byteOffset = 0;
      }

      if (fileSize === watched.byteOffset) {
        return; // No new content
      }

      // Read only the new bytes
      const fd = fs.openSync(watched.filePath, 'r');
      const bytesToRead = fileSize - watched.byteOffset;
      const buffer = Buffer.alloc(bytesToRead);

      fs.readSync(fd, buffer, 0, bytesToRead, watched.byteOffset);
      fs.closeSync(fd);

      watched.byteOffset = fileSize;

      // Parse the new content into lines
      const newContent = buffer.toString('utf-8');
      const lines = newContent.split('\n').filter(line => line.trim().length > 0);

      for (const line of lines) {
        this.parseLine(line, watched);
      }
    } catch (err) {
      // File may have been deleted between check and read — non-fatal
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.unwatchFile(watched.filePath);
      }
    }
  }

  // === Event parsing ===

  private parseLine(line: string, watched: WatchedFile): void {
    try {
      const raw = JSON.parse(line) as Record<string, unknown>;
      const event = this.normalizeEvent(raw, watched);
      if (event) {
        this.trackAgent(event);
        this.emit('event', event);
      }
    } catch {
      // Malformed JSON line — skip silently
    }
  }

  private normalizeEvent(raw: Record<string, unknown>, watched: WatchedFile): CopilotEvent | null {
    const eventType = (raw.type as string) || (raw.event as string) || '';
    const timestamp = this.extractTimestamp(raw);
    const agentId = this.extractAgentId(raw, watched);

    // Unwrap the nested `data` object used by Copilot CLI events.jsonl format
    const data = (raw.data as Record<string, unknown>) || {};
    const input = (data.input as Record<string, unknown>) || {};
    const args = (data.arguments as Record<string, unknown>) || {};

    // Resolve tool name from various locations in the event structure
    const resolvedToolName =
      (data.toolName as string) ||
      (input.toolName as string) ||
      (raw.tool as string) ||
      (raw.hook as string) ||
      (raw.name as string) ||
      '';

    // Build enriched metadata so downstream consumers (EventAnimator) can find tool info
    const metadata: Record<string, unknown> = {
      ...raw,
      toolName: resolvedToolName,
      tool: resolvedToolName,
      command: args.command || (input.toolArgs as Record<string, unknown>)?.command,
      path: args.path || (input.toolArgs as Record<string, unknown>)?.path,
      data,
    };

    const base = {
      id: generateId(),
      sessionId: watched.sessionId,
      agentId,
      source: watched.source,
      timestamp,
      metadata,
    };

    switch (eventType) {
      case 'session.start':
      case 'session_start':
        return { ...base, type: 'session_start', sessionName: (raw.name as string) || undefined };

      case 'session.end':
      case 'session_end':
        return { ...base, type: 'session_end', reason: (raw.reason as string) || undefined };

      case 'tool.execution_start':
      case 'hook.start':
      case 'tool_call':
      case 'tool.start':
        return {
          ...base,
          type: 'tool_call',
          toolName: resolvedToolName || (data.hookType as string) || 'unknown',
          arguments: Object.keys(args).length > 0 ? args : (input.toolArgs as Record<string, unknown>) || {},
          success: undefined,
        };

      case 'tool.execution_end':
      case 'hook.end':
      case 'tool_result':
      case 'tool.end': {
        const toolResult = (data.result as Record<string, unknown>) || (input.toolResult as Record<string, unknown>) || {};
        return {
          ...base,
          type: 'tool_result',
          toolName: resolvedToolName || (data.hookType as string) || 'unknown',
          result: String(toolResult.textResultForLlm || data.output || raw.output || raw.result || ''),
          success: (toolResult.resultType === 'success') || (raw.success !== false && raw.error === undefined),
          duration: typeof raw.duration === 'number' ? raw.duration : typeof data.duration === 'number' ? data.duration : undefined,
        };
      }

      case 'message':
      case 'chat_message':
      case 'assistant_message':
      case 'user_message':
        return {
          ...base,
          type: 'chat_message',
          role: this.inferRole(eventType, raw),
          content: (raw.content as string) || (raw.message as string) || '',
          tokenCount: raw.token_count as number | undefined,
          model: raw.model as string | undefined,
        };

      case 'thinking':
      case 'agent_thinking':
        return {
          ...base,
          type: 'agent_thinking',
          thought: (raw.thought as string) || (raw.content as string) || undefined,
        };

      default:
        // Unknown event type — still emit it with whatever we can extract
        if (timestamp > 0) {
          return {
            ...base,
            type: 'chat_message',
            role: 'system' as const,
            content: `[${eventType}] ${JSON.stringify(raw).slice(0, 200)}`,
          };
        }
        return null;
    }
  }

  // === Agent identity extraction ===

  private extractAgentId(raw: Record<string, unknown>, watched: WatchedFile): string {
    // Check for explicit agent identifiers in event data
    if (typeof raw.agent_id === 'string' && raw.agent_id) { return raw.agent_id; }
    if (typeof raw.agentId === 'string' && raw.agentId) { return raw.agentId; }
    if (typeof raw.agent_name === 'string' && raw.agent_name) { return raw.agent_name; }

    // Check for Squad agent names in metadata
    if (typeof raw.agent === 'string' && raw.agent) { return raw.agent; }

    // Copilot CLI events don't have explicit agent IDs.
    // Use a stable, friendly ID per session so all events in a session map to one agent.
    switch (watched.source) {
      case 'cli': return `copilot-cli-${watched.sessionId.slice(0, 8)}`;
      case 'chat': return 'chat-agent';
      case 'inline': return 'inline-agent';
      default: return 'unknown-agent';
    }
  }

  private trackAgent(event: CopilotEvent): void {
    if (this.knownAgents.has(event.agentId)) { return; }

    const agent: AgentIdentity = {
      id: event.agentId,
      name: this.deriveAgentName(event.agentId, event.source),
      source: event.source,
      color: this.assignColor(event.agentId),
    };

    this.knownAgents.set(event.agentId, agent);
    this.emit('agent', agent);
  }

  private deriveAgentName(agentId: string, source: LogSource): string {
    // Known Squad agent names pass through as-is
    const knownNames = ['dwight', 'jim', 'pam', 'michael', 'angela', 'oscar', 'kevin'];
    const lowerAgentId = agentId.toLowerCase();
    for (const name of knownNames) {
      if (lowerAgentId.includes(name)) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }

    // Source-based friendly names
    if (agentId.startsWith('copilot-cli-')) { return 'Copilot CLI'; }
    if (agentId.startsWith('cli-')) { return 'CLI Agent'; }
    if (agentId === 'chat-agent') { return 'Chat Agent'; }
    if (agentId === 'inline-agent') { return 'Inline Agent'; }

    // Use the raw agentId as the name, cleaned up
    return agentId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private assignColor(agentId: string): string {
    // Deterministic hash-based color assignment
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = ((hash << 5) - hash) + agentId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit int
    }
    return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
  }

  // === Utilities ===

  private extractTimestamp(raw: Record<string, unknown>): number {
    if (typeof raw.timestamp === 'number') { return raw.timestamp; }
    if (typeof raw.timestamp === 'string') { return new Date(raw.timestamp).getTime() || Date.now(); }
    if (typeof raw.time === 'number') { return raw.time; }
    if (typeof raw.time === 'string') { return new Date(raw.time).getTime() || Date.now(); }
    if (typeof raw.created_at === 'string') { return new Date(raw.created_at).getTime() || Date.now(); }
    return Date.now();
  }

  private inferRole(eventType: string, raw: Record<string, unknown>): 'user' | 'assistant' | 'system' {
    if (raw.role === 'user' || eventType === 'user_message') { return 'user'; }
    if (raw.role === 'assistant' || eventType === 'assistant_message') { return 'assistant'; }
    if (raw.role === 'system') { return 'system'; }
    return 'assistant';
  }

  private rescanDirectories(): void {
    if (!this.running) { return; }

    const cliPath = this.getCliSessionPath();
    if (this.directoryExists(cliPath) && !this.directoryWatchers.has(cliPath)) {
      this.watchDirectory(cliPath, 'cli');
    } else if (this.directoryWatchers.has(cliPath)) {
      this.scanDirectory(cliPath, 'cli');
    }

    const chatPath = this.getChatStoragePath();
    if (chatPath && this.directoryExists(chatPath) && !this.directoryWatchers.has(chatPath)) {
      this.watchDirectory(chatPath, 'chat');
    }
  }

  private getCliSessionPath(): string {
    return path.join(os.homedir(), '.copilot', 'session-state');
  }

  private getChatStoragePath(): string | null {
    const home = os.homedir();
    const platform = os.platform();

    switch (platform) {
      case 'darwin':
        return path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'github.copilot-chat');
      case 'linux':
        return path.join(home, '.config', 'Code', 'User', 'globalStorage', 'github.copilot-chat');
      case 'win32':
        return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Code', 'User', 'globalStorage', 'github.copilot-chat');
      default:
        return null;
    }
  }

  private directoryExists(dirPath: string): boolean {
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  private fileExists(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }
}
