import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'path';

/**
 * Tests for the Log Discovery service.
 * Expected import: import { LogDiscoveryService } from '../../services/logDiscovery';
 * 
 * The Log Discovery service scans filesystem for known Copilot log paths,
 * indexes available sessions, and watches for new files (PRD §3.1, §7).
 */

interface DiscoveredSession {
  id: string;
  path: string;
  source: 'cli' | 'chat' | 'inline';
  lastModified: number;
  name?: string;
}

interface FileSystem {
  exists(path: string): Promise<boolean>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ mtime: number; isDirectory: boolean }>;
}

// Stub LogDiscoveryService — matches expected API
class LogDiscoveryService {
  private fs: FileSystem;
  private platform: string;

  constructor(fs: FileSystem, platform = process.platform) {
    this.fs = fs;
    this.platform = platform;
  }

  async discoverSessions(): Promise<DiscoveredSession[]> {
    const sessions: DiscoveredSession[] = [];
    const cliPath = this.getCliPath();

    if (await this.fs.exists(cliPath)) {
      const dirs = await this.fs.readdir(cliPath);
      for (const dir of dirs) {
        const fullPath = join(cliPath, dir);
        const stat = await this.fs.stat(fullPath);
        if (stat.isDirectory) {
          sessions.push({
            id: dir,
            path: fullPath,
            source: 'cli',
            lastModified: stat.mtime,
          });
        }
      }
    }

    // Sort by recency (most recent first)
    sessions.sort((a, b) => b.lastModified - a.lastModified);
    return sessions;
  }

  getCliPath(): string {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (this.platform === 'win32') {
      return join(home, '.copilot', 'session-state');
    }
    return join(home, '.copilot', 'session-state');
  }

  getChatPath(): string {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (this.platform === 'darwin') {
      return join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'github.copilot-chat');
    } else if (this.platform === 'win32') {
      return join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'github.copilot-chat');
    }
    return join(home, '.config', 'Code', 'User', 'globalStorage', 'github.copilot-chat');
  }
}

describe('LogDiscoveryService', () => {
  let mockFs: FileSystem;
  let service: LogDiscoveryService;

  beforeEach(() => {
    mockFs = {
      exists: vi.fn().mockResolvedValue(true),
      readdir: vi.fn().mockResolvedValue([]),
      stat: vi.fn().mockResolvedValue({ mtime: Date.now(), isDirectory: true }),
    };
    service = new LogDiscoveryService(mockFs, 'darwin');
  });

  describe('discoverSessions', () => {
    it('should return discovered sessions as an array', async () => {
      const sessions = await service.discoverSessions();
      expect(sessions).toBeInstanceOf(Array);
    });

    it('should scan CLI session directory', async () => {
      (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['session-abc', 'session-def']);
      (mockFs.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ mtime: 1000, isDirectory: true });

      const sessions = await service.discoverSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0].source).toBe('cli');
    });

    it('should include session path and ID', async () => {
      (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['abc-123']);
      (mockFs.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ mtime: 1000, isDirectory: true });

      const sessions = await service.discoverSessions();
      expect(sessions[0].id).toBe('abc-123');
      expect(sessions[0].path).toContain('abc-123');
    });

    it('should sort sessions by recency (most recent first)', async () => {
      (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['old', 'new', 'mid']);
      (mockFs.stat as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ mtime: 1000, isDirectory: true })
        .mockResolvedValueOnce({ mtime: 3000, isDirectory: true })
        .mockResolvedValueOnce({ mtime: 2000, isDirectory: true });

      const sessions = await service.discoverSessions();
      expect(sessions[0].id).toBe('new');
      expect(sessions[1].id).toBe('mid');
      expect(sessions[2].id).toBe('old');
    });

    it('should handle missing directories gracefully', async () => {
      (mockFs.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const sessions = await service.discoverSessions();
      expect(sessions).toEqual([]);
    });

    it('should only include directories, not files', async () => {
      (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['session-dir', 'readme.txt']);
      (mockFs.stat as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ mtime: 1000, isDirectory: true })
        .mockResolvedValueOnce({ mtime: 1000, isDirectory: false });

      const sessions = await service.discoverSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('session-dir');
    });
  });

  describe('Cross-platform path resolution', () => {
    it('should resolve macOS CLI path correctly', () => {
      const darwinService = new LogDiscoveryService(mockFs, 'darwin');
      const path = darwinService.getCliPath();
      expect(path).toContain('.copilot');
      expect(path).toContain('session-state');
    });

    it('should resolve Linux CLI path correctly', () => {
      const linuxService = new LogDiscoveryService(mockFs, 'linux');
      const path = linuxService.getCliPath();
      expect(path).toContain('.copilot');
      expect(path).toContain('session-state');
    });

    it('should resolve Windows CLI path correctly', () => {
      const winService = new LogDiscoveryService(mockFs, 'win32');
      const path = winService.getCliPath();
      expect(path).toContain('.copilot');
      expect(path).toContain('session-state');
    });

    it('should resolve macOS Chat path correctly', () => {
      const darwinService = new LogDiscoveryService(mockFs, 'darwin');
      const path = darwinService.getChatPath();
      expect(path).toContain('Library');
      expect(path).toContain('github.copilot-chat');
    });

    it('should resolve Linux Chat path correctly', () => {
      const linuxService = new LogDiscoveryService(mockFs, 'linux');
      const path = linuxService.getChatPath();
      expect(path).toContain('.config');
      expect(path).toContain('github.copilot-chat');
    });
  });
});
