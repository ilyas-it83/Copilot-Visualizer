/**
 * Log Discovery Service
 * Scans the filesystem for known Copilot log paths across all platforms.
 * Returns available sessions sorted by recency.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { CopilotSession } from '../types/session';
import { LogSource } from '../types/events';

interface DiscoveredLogFile {
  path: string;
  source: LogSource;
  sessionId: string;
  modifiedTime: number;
}

export class LogDiscoveryService {
  private sessions: CopilotSession[] = [];

  /** Primary entry point: discover all sessions across all sources */
  async discoverSessions(): Promise<CopilotSession[]> {
    const discovered: DiscoveredLogFile[] = [];

    const config = vscode.workspace.getConfiguration('copilotVisualizer');
    const customCliPaths = config.get<string[]>('logPaths.cli', []);
    const customChatPaths = config.get<string[]>('logPaths.chat', []);

    // CLI sessions
    const cliPaths = customCliPaths.length > 0
      ? customCliPaths
      : [this.getCliSessionPath()];

    for (const basePath of cliPaths) {
      const cliFiles = await this.discoverCliSessions(basePath);
      discovered.push(...cliFiles);
    }

    // Chat sessions
    const chatPaths = customChatPaths.length > 0
      ? customChatPaths
      : [this.getChatStoragePath()];

    for (const basePath of chatPaths) {
      if (basePath) {
        const chatFiles = await this.discoverChatSessions(basePath);
        discovered.push(...chatFiles);
      }
    }

    // Inline completion logs
    const inlineFiles = await this.discoverInlineLogs();
    discovered.push(...inlineFiles);

    // Convert to CopilotSession objects
    this.sessions = discovered
      .map(file => this.toSession(file))
      .sort((a, b) => b.startTime - a.startTime);

    return this.sessions;
  }

  /** Get cached sessions without re-scanning */
  getCachedSessions(): CopilotSession[] {
    return this.sessions;
  }

  // === CLI Sessions ===

  private getCliSessionPath(): string {
    const home = os.homedir();
    return path.join(home, '.copilot', 'session-state');
  }

  private async discoverCliSessions(basePath: string): Promise<DiscoveredLogFile[]> {
    const results: DiscoveredLogFile[] = [];

    if (!this.directoryExists(basePath)) {
      return results;
    }

    try {
      const entries = await fs.promises.readdir(basePath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) { continue; }

        const sessionDir = path.join(basePath, entry.name);

        // Look for events.jsonl (primary) or conversation.json (fallback)
        const eventsFile = path.join(sessionDir, 'events.jsonl');
        const conversationFile = path.join(sessionDir, 'conversation.json');

        let logFile: string | null = null;
        if (this.fileExists(eventsFile)) {
          logFile = eventsFile;
        } else if (this.fileExists(conversationFile)) {
          logFile = conversationFile;
        }

        if (logFile) {
          const stat = await fs.promises.stat(logFile);
          results.push({
            path: logFile,
            source: 'cli',
            sessionId: entry.name,
            modifiedTime: stat.mtimeMs,
          });
        }
      }
    } catch (err) {
      // Directory may not be readable — fail gracefully
      console.warn(`[LogDiscovery] Failed to scan CLI sessions at ${basePath}:`, err);
    }

    return results;
  }

  // === Chat Sessions ===

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

  private async discoverChatSessions(basePath: string): Promise<DiscoveredLogFile[]> {
    const results: DiscoveredLogFile[] = [];

    if (!this.directoryExists(basePath)) {
      return results;
    }

    try {
      // Look for copilotCli metadata
      const metadataPath = path.join(basePath, 'copilotCli', 'copilotcli.session.metadata.json');
      if (this.fileExists(metadataPath)) {
        const stat = await fs.promises.stat(metadataPath);
        results.push({
          path: metadataPath,
          source: 'chat',
          sessionId: `chat-metadata-${stat.mtimeMs}`,
          modifiedTime: stat.mtimeMs,
        });
      }

      // Look for conversations directory or files
      const conversationsDir = path.join(basePath, 'conversations');
      if (this.directoryExists(conversationsDir)) {
        const files = await fs.promises.readdir(conversationsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(conversationsDir, file);
            const stat = await fs.promises.stat(filePath);
            results.push({
              path: filePath,
              source: 'chat',
              sessionId: path.basename(file, '.json'),
              modifiedTime: stat.mtimeMs,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[LogDiscovery] Failed to scan Chat sessions at ${basePath}:`, err);
    }

    return results;
  }

  // === Inline Completion Logs ===

  private async discoverInlineLogs(): Promise<DiscoveredLogFile[]> {
    const results: DiscoveredLogFile[] = [];
    const home = os.homedir();
    const platform = os.platform();

    let logsBase: string;
    switch (platform) {
      case 'darwin':
        logsBase = path.join(home, 'Library', 'Application Support', 'Code', 'logs');
        break;
      case 'linux':
        logsBase = path.join(home, '.config', 'Code', 'logs');
        break;
      case 'win32':
        logsBase = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Code', 'logs');
        break;
      default:
        return results;
    }

    if (!this.directoryExists(logsBase)) {
      return results;
    }

    try {
      // Scan the most recent log directories for Copilot extension logs
      const logDirs = await fs.promises.readdir(logsBase, { withFileTypes: true });
      const sortedDirs = logDirs
        .filter(d => d.isDirectory())
        .sort((a, b) => b.name.localeCompare(a.name)) // Most recent first
        .slice(0, 5); // Only look at recent 5

      for (const dir of sortedDirs) {
        const windowDirs = await this.findCopilotLogFiles(path.join(logsBase, dir.name));
        results.push(...windowDirs);
      }
    } catch (err) {
      console.warn(`[LogDiscovery] Failed to scan inline logs at ${logsBase}:`, err);
    }

    return results;
  }

  private async findCopilotLogFiles(logDir: string): Promise<DiscoveredLogFile[]> {
    const results: DiscoveredLogFile[] = [];

    try {
      const entries = await fs.promises.readdir(logDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) { continue; }

        // Look for window*/exthost/GitHub.copilot-chat/ pattern
        const exthostDir = path.join(logDir, entry.name, 'exthost');
        if (!this.directoryExists(exthostDir)) { continue; }

        const copilotDir = path.join(exthostDir, 'GitHub.copilot-chat');
        if (this.directoryExists(copilotDir)) {
          const files = await fs.promises.readdir(copilotDir);
          for (const file of files) {
            if (file.endsWith('.log')) {
              const filePath = path.join(copilotDir, file);
              const stat = await fs.promises.stat(filePath);
              results.push({
                path: filePath,
                source: 'inline',
                sessionId: `inline-${entry.name}-${path.basename(file, '.log')}`,
                modifiedTime: stat.mtimeMs,
              });
            }
          }
        }
      }
    } catch {
      // Silently skip unreadable directories
    }

    return results;
  }

  // === Helpers ===

  private toSession(file: DiscoveredLogFile): CopilotSession {
    return {
      id: file.sessionId,
      name: this.formatSessionName(file),
      source: file.source,
      startTime: file.modifiedTime,
      endTime: undefined,
      eventCount: 0, // Populated after parsing
      agents: [],
      logPath: file.path,
    };
  }

  private formatSessionName(file: DiscoveredLogFile): string {
    const date = new Date(file.modifiedTime);
    const timeStr = date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    switch (file.source) {
      case 'cli':
        return `CLI Session — ${timeStr}`;
      case 'chat':
        return `Chat — ${timeStr}`;
      case 'inline':
        return `Inline — ${timeStr}`;
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
