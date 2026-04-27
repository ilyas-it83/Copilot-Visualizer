"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode5 = __toESM(require("vscode"));

// src/services/logDiscovery.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var vscode = __toESM(require("vscode"));
var LogDiscoveryService = class {
  constructor() {
    this.sessions = [];
  }
  /** Primary entry point: discover all sessions across all sources */
  async discoverSessions() {
    const discovered = [];
    const config = vscode.workspace.getConfiguration("copilotVisualizer");
    const customCliPaths = config.get("logPaths.cli", []);
    const customChatPaths = config.get("logPaths.chat", []);
    const cliPaths = customCliPaths.length > 0 ? customCliPaths : [this.getCliSessionPath()];
    for (const basePath of cliPaths) {
      const cliFiles = await this.discoverCliSessions(basePath);
      discovered.push(...cliFiles);
    }
    const chatPaths = customChatPaths.length > 0 ? customChatPaths : [this.getChatStoragePath()];
    for (const basePath of chatPaths) {
      if (basePath) {
        const chatFiles = await this.discoverChatSessions(basePath);
        discovered.push(...chatFiles);
      }
    }
    const inlineFiles = await this.discoverInlineLogs();
    discovered.push(...inlineFiles);
    this.sessions = discovered.map((file) => this.toSession(file)).sort((a, b) => b.startTime - a.startTime);
    return this.sessions;
  }
  /** Get cached sessions without re-scanning */
  getCachedSessions() {
    return this.sessions;
  }
  // === CLI Sessions ===
  getCliSessionPath() {
    const home = os.homedir();
    return path.join(home, ".copilot", "session-state");
  }
  async discoverCliSessions(basePath) {
    const results = [];
    if (!this.directoryExists(basePath)) {
      return results;
    }
    try {
      const entries = await fs.promises.readdir(basePath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const sessionDir = path.join(basePath, entry.name);
        const eventsFile = path.join(sessionDir, "events.jsonl");
        const conversationFile = path.join(sessionDir, "conversation.json");
        let logFile = null;
        if (this.fileExists(eventsFile)) {
          logFile = eventsFile;
        } else if (this.fileExists(conversationFile)) {
          logFile = conversationFile;
        }
        if (logFile) {
          const stat = await fs.promises.stat(logFile);
          results.push({
            path: logFile,
            source: "cli",
            sessionId: entry.name,
            modifiedTime: stat.mtimeMs
          });
        }
      }
    } catch (err) {
      console.warn(`[LogDiscovery] Failed to scan CLI sessions at ${basePath}:`, err);
    }
    return results;
  }
  // === Chat Sessions ===
  getChatStoragePath() {
    const home = os.homedir();
    const platform2 = os.platform();
    switch (platform2) {
      case "darwin":
        return path.join(home, "Library", "Application Support", "Code", "User", "globalStorage", "github.copilot-chat");
      case "linux":
        return path.join(home, ".config", "Code", "User", "globalStorage", "github.copilot-chat");
      case "win32":
        return path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "Code", "User", "globalStorage", "github.copilot-chat");
      default:
        return null;
    }
  }
  async discoverChatSessions(basePath) {
    const results = [];
    if (!this.directoryExists(basePath)) {
      return results;
    }
    try {
      const metadataPath = path.join(basePath, "copilotCli", "copilotcli.session.metadata.json");
      if (this.fileExists(metadataPath)) {
        const stat = await fs.promises.stat(metadataPath);
        results.push({
          path: metadataPath,
          source: "chat",
          sessionId: `chat-metadata-${stat.mtimeMs}`,
          modifiedTime: stat.mtimeMs
        });
      }
      const conversationsDir = path.join(basePath, "conversations");
      if (this.directoryExists(conversationsDir)) {
        const files = await fs.promises.readdir(conversationsDir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            const filePath = path.join(conversationsDir, file);
            const stat = await fs.promises.stat(filePath);
            results.push({
              path: filePath,
              source: "chat",
              sessionId: path.basename(file, ".json"),
              modifiedTime: stat.mtimeMs
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
  async discoverInlineLogs() {
    const results = [];
    const home = os.homedir();
    const platform2 = os.platform();
    let logsBase;
    switch (platform2) {
      case "darwin":
        logsBase = path.join(home, "Library", "Application Support", "Code", "logs");
        break;
      case "linux":
        logsBase = path.join(home, ".config", "Code", "logs");
        break;
      case "win32":
        logsBase = path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "Code", "logs");
        break;
      default:
        return results;
    }
    if (!this.directoryExists(logsBase)) {
      return results;
    }
    try {
      const logDirs = await fs.promises.readdir(logsBase, { withFileTypes: true });
      const sortedDirs = logDirs.filter((d) => d.isDirectory()).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 5);
      for (const dir of sortedDirs) {
        const windowDirs = await this.findCopilotLogFiles(path.join(logsBase, dir.name));
        results.push(...windowDirs);
      }
    } catch (err) {
      console.warn(`[LogDiscovery] Failed to scan inline logs at ${logsBase}:`, err);
    }
    return results;
  }
  async findCopilotLogFiles(logDir) {
    const results = [];
    try {
      const entries = await fs.promises.readdir(logDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const exthostDir = path.join(logDir, entry.name, "exthost");
        if (!this.directoryExists(exthostDir)) {
          continue;
        }
        const copilotDir = path.join(exthostDir, "GitHub.copilot-chat");
        if (this.directoryExists(copilotDir)) {
          const files = await fs.promises.readdir(copilotDir);
          for (const file of files) {
            if (file.endsWith(".log")) {
              const filePath = path.join(copilotDir, file);
              const stat = await fs.promises.stat(filePath);
              results.push({
                path: filePath,
                source: "inline",
                sessionId: `inline-${entry.name}-${path.basename(file, ".log")}`,
                modifiedTime: stat.mtimeMs
              });
            }
          }
        }
      }
    } catch {
    }
    return results;
  }
  // === Helpers ===
  toSession(file) {
    return {
      id: file.sessionId,
      name: this.formatSessionName(file),
      source: file.source,
      startTime: file.modifiedTime,
      endTime: void 0,
      eventCount: 0,
      // Populated after parsing
      agents: [],
      logPath: file.path
    };
  }
  formatSessionName(file) {
    const date = new Date(file.modifiedTime);
    const timeStr = date.toLocaleString(void 0, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    switch (file.source) {
      case "cli":
        return `CLI Session \u2014 ${timeStr}`;
      case "chat":
        return `Chat \u2014 ${timeStr}`;
      case "inline":
        return `Inline \u2014 ${timeStr}`;
    }
  }
  directoryExists(dirPath) {
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }
  fileExists(filePath) {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }
};

// src/services/eventStore.ts
var vscode2 = __toESM(require("vscode"));
var EventStore = class {
  constructor() {
    this.events = [];
    const config = vscode2.workspace.getConfiguration("copilotVisualizer");
    this.maxEvents = config.get("maxEvents", 5e3);
  }
  /** Replace all events (used when loading a new session) */
  loadEvents(events) {
    this.events = events.slice(0, this.maxEvents);
    this.sortByTimestamp();
  }
  /** Append events (used for incremental loading) */
  addEvents(newEvents) {
    this.events.push(...newEvents);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }
    this.sortByTimestamp();
  }
  /** Get all events */
  getEvents() {
    return this.events;
  }
  /** Get events by agent ID */
  getEventsByAgent(agentId) {
    return this.events.filter((e) => e.agentId === agentId);
  }
  /** Get events by type */
  getEventsByType(type) {
    return this.events.filter((e) => e.type === type);
  }
  /** Get events within a time range (inclusive) */
  getTimelineRange(startMs, endMs) {
    return this.events.filter((e) => e.timestamp >= startMs && e.timestamp <= endMs);
  }
  /** Get a single event by ID */
  getEventById(id) {
    return this.events.find((e) => e.id === id);
  }
  /** Get unique agent IDs present in the store */
  getAgentIds() {
    const ids = new Set(this.events.map((e) => e.agentId));
    return Array.from(ids);
  }
  /** Get the time range of all events */
  getTimeRange() {
    if (this.events.length === 0) {
      return null;
    }
    return {
      start: this.events[0].timestamp,
      end: this.events[this.events.length - 1].timestamp
    };
  }
  /** Get total event count */
  get count() {
    return this.events.length;
  }
  /** Clear the store */
  clear() {
    this.events = [];
  }
  sortByTimestamp() {
    this.events.sort((a, b) => a.timestamp - b.timestamp);
  }
};

// src/services/messageBridge.ts
var vscode3 = __toESM(require("vscode"));
var DEFAULT_CHUNK_SIZE = 200;
var MessageBridge = class {
  constructor() {
    this.webview = null;
    this.handlers = [];
    this.disposables = [];
  }
  /** Attach to a webview instance */
  attach(webview) {
    this.detach();
    this.webview = webview;
    const listener = webview.onDidReceiveMessage(
      (message) => {
        this.handlers.forEach((handler) => handler(message));
      }
    );
    this.disposables.push(listener);
  }
  /** Detach from current webview */
  detach() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.webview = null;
  }
  /** Register a handler for incoming webview messages */
  onMessage(handler) {
    this.handlers.push(handler);
    return new vscode3.Disposable(() => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) {
        this.handlers.splice(idx, 1);
      }
    });
  }
  /** Send a message to the webview */
  postMessage(message) {
    if (this.webview) {
      this.webview.postMessage(message);
    }
  }
  /** Send a session to the webview */
  sendSession(session) {
    this.postMessage({ type: "load-session", session });
  }
  /** Send session list to webview */
  sendSessionList(sessions) {
    this.postMessage({ type: "session-list", sessions });
  }
  /**
   * Send events in batches to avoid overwhelming the webview.
   * Chunks of DEFAULT_CHUNK_SIZE events sent with microtask spacing.
   */
  async sendEventsInChunks(events, chunkSize = DEFAULT_CHUNK_SIZE) {
    const totalChunks = Math.ceil(events.length / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      const chunk = events.slice(i * chunkSize, (i + 1) * chunkSize);
      const message = {
        type: "events-chunk",
        events: chunk,
        chunkIndex: i,
        totalChunks
      };
      this.postMessage(message);
      if (i < totalChunks - 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }
  /** Send playback control command */
  sendPlaybackControl(action, value) {
    this.postMessage({ type: "playback-control", action, value });
  }
  /** Send event details */
  sendEventDetails(event) {
    this.postMessage({ type: "event-details", event });
  }
  dispose() {
    this.detach();
    this.handlers = [];
  }
};

// src/providers/officeViewProvider.ts
var vscode4 = __toESM(require("vscode"));

// src/parsers/cliParser.ts
var fs2 = __toESM(require("fs"));

// src/parsers/utils.ts
var counter = 0;
function v4Fallback() {
  counter++;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${time}-${random}-${counter}`;
}

// src/parsers/cliParser.ts
var CliParser = class {
  constructor() {
    this.source = "cli";
  }
  /** Parse an events.jsonl file into normalized CopilotEvent[] */
  async parse(filePath, sessionId) {
    const events = [];
    try {
      const content = await fs2.promises.readFile(filePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim().length > 0);
      for (const line of lines) {
        try {
          const raw = JSON.parse(line);
          const parsed = this.normalizeEvent(raw, sessionId);
          if (parsed) {
            events.push(parsed);
          }
        } catch {
          continue;
        }
      }
    } catch (err) {
      console.warn(`[CliParser] Failed to read ${filePath}:`, err);
    }
    return events;
  }
  /** Parse a conversation.json file (fallback format) */
  async parseConversation(filePath, sessionId) {
    const events = [];
    try {
      const content = await fs2.promises.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      if (Array.isArray(data.turns)) {
        for (const turn of data.turns) {
          events.push(...this.parseTurn(turn, sessionId));
        }
      } else if (data.conversation && Array.isArray(data.conversation)) {
        for (const turn of data.conversation) {
          events.push(...this.parseTurn(turn, sessionId));
        }
      }
    } catch (err) {
      console.warn(`[CliParser] Failed to parse conversation at ${filePath}:`, err);
    }
    return events;
  }
  normalizeEvent(raw, sessionId) {
    const eventType = raw.type || raw.event || "";
    const timestamp = this.extractTimestamp(raw);
    const agentId = raw.agent_id || raw.agentId || "cli-agent";
    const base = {
      id: v4Fallback(),
      sessionId,
      agentId,
      source: this.source,
      timestamp,
      metadata: raw
    };
    switch (eventType) {
      case "session.start":
      case "session_start":
        return {
          ...base,
          type: "session_start",
          sessionName: raw.name || void 0
        };
      case "session.end":
      case "session_end":
        return {
          ...base,
          type: "session_end",
          reason: raw.reason || void 0
        };
      case "hook.start":
      case "tool_call":
      case "tool.start":
        return {
          ...base,
          type: "tool_call",
          toolName: raw.tool || raw.hook || raw.name || "unknown",
          arguments: raw.arguments || raw.input || {},
          success: void 0
        };
      case "hook.end":
      case "tool_result":
      case "tool.end":
        return {
          ...base,
          type: "tool_result",
          toolName: raw.tool || raw.hook || raw.name || "unknown",
          result: String(raw.output || raw.result || ""),
          success: raw.success !== false && raw.error === void 0,
          duration: typeof raw.duration === "number" ? raw.duration : void 0
        };
      case "message":
      case "chat_message":
      case "assistant_message":
      case "user_message":
        return {
          ...base,
          type: "chat_message",
          role: this.inferRole(eventType, raw),
          content: raw.content || raw.message || "",
          tokenCount: raw.token_count,
          model: raw.model
        };
      case "thinking":
      case "agent_thinking":
        return {
          ...base,
          type: "agent_thinking",
          thought: raw.thought || raw.content || void 0
        };
      default:
        if (timestamp > 0) {
          return {
            ...base,
            type: "chat_message",
            role: "system",
            content: `[${eventType}] ${JSON.stringify(raw).slice(0, 200)}`
          };
        }
        return null;
    }
  }
  parseTurn(turn, sessionId) {
    const events = [];
    const timestamp = this.extractTimestamp(turn);
    const agentId = "cli-agent";
    if (turn.user_message || turn.userMessage) {
      events.push({
        id: v4Fallback(),
        type: "chat_message",
        timestamp,
        sessionId,
        agentId,
        source: this.source,
        role: "user",
        content: String(turn.user_message || turn.userMessage || "")
      });
    }
    if (turn.assistant_response || turn.assistantResponse) {
      events.push({
        id: v4Fallback(),
        type: "chat_message",
        timestamp: timestamp + 1,
        // Slightly after user message
        sessionId,
        agentId,
        source: this.source,
        role: "assistant",
        content: String(turn.assistant_response || turn.assistantResponse || "")
      });
    }
    return events;
  }
  extractTimestamp(raw) {
    if (typeof raw.timestamp === "number") {
      return raw.timestamp;
    }
    if (typeof raw.timestamp === "string") {
      return new Date(raw.timestamp).getTime() || Date.now();
    }
    if (typeof raw.time === "number") {
      return raw.time;
    }
    if (typeof raw.time === "string") {
      return new Date(raw.time).getTime() || Date.now();
    }
    if (typeof raw.created_at === "string") {
      return new Date(raw.created_at).getTime() || Date.now();
    }
    return Date.now();
  }
  inferRole(eventType, raw) {
    if (raw.role === "user" || eventType === "user_message") {
      return "user";
    }
    if (raw.role === "assistant" || eventType === "assistant_message") {
      return "assistant";
    }
    if (raw.role === "system") {
      return "system";
    }
    return "assistant";
  }
};

// src/parsers/chatParser.ts
var fs3 = __toESM(require("fs"));
var ChatParser = class {
  constructor() {
    this.source = "chat";
  }
  /** Parse a chat conversation JSON file */
  async parse(filePath, sessionId) {
    const events = [];
    try {
      const content = await fs3.promises.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        for (const entry of data) {
          events.push(...this.parseConversationEntry(entry, sessionId));
        }
      } else if (data.conversations && Array.isArray(data.conversations)) {
        for (const conv of data.conversations) {
          events.push(...this.parseConversationEntry(conv, sessionId));
        }
      } else if (data.turns || data.messages) {
        events.push(...this.parseConversationEntry(data, sessionId));
      } else if (data.sessions && Array.isArray(data.sessions)) {
        for (const session of data.sessions) {
          events.push(...this.parseSessionMetadata(session, sessionId));
        }
      } else {
        events.push(...this.parseConversationEntry(data, sessionId));
      }
    } catch (err) {
      console.warn(`[ChatParser] Failed to parse ${filePath}:`, err);
    }
    return events;
  }
  parseConversationEntry(entry, sessionId) {
    const events = [];
    const agentId = "chat-agent";
    const turns = entry.turns || entry.messages || entry.history || [];
    if (!Array.isArray(turns)) {
      return events;
    }
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const timestamp = this.extractTimestamp(turn, i);
      const role = this.extractRole(turn);
      const content = turn.content || turn.text || turn.message || "";
      if (content) {
        events.push({
          id: v4Fallback(),
          type: "chat_message",
          timestamp,
          sessionId,
          agentId,
          source: this.source,
          role,
          content: String(content),
          tokenCount: turn.tokenCount,
          model: turn.model,
          metadata: turn
        });
      }
      const toolCalls = turn.toolCalls || turn.tool_calls || turn.function_calls || [];
      if (Array.isArray(toolCalls)) {
        for (const tc of toolCalls) {
          events.push({
            id: v4Fallback(),
            type: "tool_call",
            timestamp: timestamp + 1,
            sessionId,
            agentId,
            source: this.source,
            toolName: tc.name || tc.function || tc.tool || "unknown",
            arguments: tc.arguments || tc.input || tc.parameters || {},
            result: tc.result,
            success: tc.error === void 0,
            metadata: tc
          });
        }
      }
    }
    return events;
  }
  parseSessionMetadata(session, sessionId) {
    const events = [];
    const timestamp = this.extractTimestamp(session, 0);
    events.push({
      id: v4Fallback(),
      type: "session_start",
      timestamp,
      sessionId,
      agentId: "chat-agent",
      source: this.source,
      sessionName: session.name || session.title || session.id,
      metadata: session
    });
    return events;
  }
  extractTimestamp(obj, index) {
    if (typeof obj.timestamp === "number") {
      return obj.timestamp;
    }
    if (typeof obj.timestamp === "string") {
      return new Date(obj.timestamp).getTime() || Date.now();
    }
    if (typeof obj.createdAt === "number") {
      return obj.createdAt;
    }
    if (typeof obj.createdAt === "string") {
      return new Date(obj.createdAt).getTime() || Date.now();
    }
    if (typeof obj.date === "string") {
      return new Date(obj.date).getTime() || Date.now();
    }
    return Date.now() - 1e3 * (100 - index);
  }
  extractRole(turn) {
    const role = turn.role || turn.author || turn.sender || "";
    if (role === "user" || role === "human") {
      return "user";
    }
    if (role === "system") {
      return "system";
    }
    return "assistant";
  }
};

// src/parsers/inlineParser.ts
var fs4 = __toESM(require("fs"));
var InlineParser = class {
  constructor() {
    this.source = "inline";
  }
  /** Parse a Copilot extension log file for inline completion events */
  async parse(filePath, sessionId) {
    const events = [];
    try {
      const content = await fs4.promises.readFile(filePath, "utf-8");
      const lines = content.split("\n");
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
  parseLine(line, sessionId, lineNum) {
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }
    const timestampMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?)\s*/);
    const timestamp = timestampMatch ? new Date(timestampMatch[1]).getTime() : Date.now() - (1e5 - lineNum * 100);
    if (this.isCompletionRequest(trimmed)) {
      return this.parseCompletionEntry(trimmed, sessionId, timestamp);
    }
    const jsonStart = trimmed.indexOf("{");
    if (jsonStart >= 0) {
      try {
        const jsonStr = trimmed.slice(jsonStart);
        const data = JSON.parse(jsonStr);
        if (this.looksLikeCompletion(data)) {
          return this.fromJsonData(data, sessionId, timestamp);
        }
      } catch {
      }
    }
    return null;
  }
  isCompletionRequest(line) {
    const indicators = [
      "completion",
      "inline suggest",
      "InlineCompletionProvider",
      "getCompletions",
      "ghostText",
      "copilot/completion"
    ];
    const lower = line.toLowerCase();
    return indicators.some((ind) => lower.includes(ind.toLowerCase()));
  }
  parseCompletionEntry(line, sessionId, timestamp) {
    const agentId = "inline-agent";
    const accepted = line.toLowerCase().includes("accepted") || line.toLowerCase().includes("shown");
    const language = this.extractLanguage(line);
    return {
      id: v4Fallback(),
      type: "completion",
      timestamp,
      sessionId,
      agentId,
      source: this.source,
      prompt: "",
      // Not available in most log formats
      completionText: this.extractSnippet(line),
      language: language || "unknown",
      accepted,
      metadata: { raw: line.slice(0, 500) }
    };
  }
  fromJsonData(data, sessionId, timestamp) {
    return {
      id: v4Fallback(),
      type: "completion",
      timestamp: data.timestamp || timestamp,
      sessionId,
      agentId: "inline-agent",
      source: this.source,
      prompt: data.prompt || data.prefix || "",
      completionText: data.completion || data.text || data.insertText || "",
      language: data.language || data.languageId || "unknown",
      accepted: Boolean(data.accepted ?? data.shown ?? true),
      model: data.model,
      metadata: data
    };
  }
  looksLikeCompletion(data) {
    return Boolean(
      data.completion || data.insertText || data.text || data.completionText || data.choices || data.type && String(data.type).includes("completion")
    );
  }
  extractLanguage(line) {
    const langMatch = line.match(/language[=:]\s*["']?(\w+)["']?/i);
    return langMatch ? langMatch[1] : null;
  }
  extractSnippet(line) {
    const textMatch = line.match(/text[=:]\s*["'](.+?)["']/);
    if (textMatch) {
      return textMatch[1];
    }
    return line.slice(0, 100);
  }
};

// src/parsers/index.ts
var cliParser = new CliParser();
var chatParser = new ChatParser();
var inlineParser = new InlineParser();
async function parseSession(session) {
  switch (session.source) {
    case "cli":
      return parseCliSession(session);
    case "chat":
      return chatParser.parse(session.logPath, session.id);
    case "inline":
      return inlineParser.parse(session.logPath, session.id);
    default:
      console.warn(`[ParserRegistry] Unknown source: ${session.source}`);
      return [];
  }
}
async function parseCliSession(session) {
  if (session.logPath.endsWith(".jsonl")) {
    return cliParser.parse(session.logPath, session.id);
  } else {
    return cliParser.parseConversation(session.logPath, session.id);
  }
}

// src/providers/officeViewProvider.ts
var OfficeViewProvider = class _OfficeViewProvider {
  static {
    this.viewType = "copilot-visualizer.officeView";
  }
  constructor(extensionUri, messageBridge, eventStore, logDiscovery) {
    this.extensionUri = extensionUri;
    this.messageBridge = messageBridge;
    this.eventStore = eventStore;
    this.logDiscovery = logDiscovery;
  }
  /** Open (or reveal) the office panel */
  openPanel() {
    if (this.panel) {
      this.panel.reveal(vscode4.ViewColumn.One);
      return;
    }
    this.panel = vscode4.window.createWebviewPanel(
      _OfficeViewProvider.viewType,
      "Copilot Office",
      vscode4.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode4.Uri.joinPath(this.extensionUri, "dist"),
          vscode4.Uri.joinPath(this.extensionUri, "media")
        ]
      }
    );
    this.panel.webview.html = this.getWebviewContent(this.panel.webview);
    this.messageBridge.attach(this.panel.webview);
    this.registerMessageHandlers();
    this.panel.onDidDispose(() => {
      this.messageBridge.detach();
      this.panel = void 0;
    });
    this.panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        const sessions = this.logDiscovery.getCachedSessions();
        if (sessions.length > 0) {
          this.messageBridge.sendSessionList(sessions);
        }
      }
    });
  }
  /** Dispose the panel */
  dispose() {
    this.panel?.dispose();
  }
  registerMessageHandlers() {
    this.messageBridge.onMessage(async (message) => {
      switch (message.type) {
        case "request-session-list": {
          const sessions = await this.logDiscovery.discoverSessions();
          this.messageBridge.sendSessionList(sessions);
          break;
        }
        case "session-selected": {
          const sessions = this.logDiscovery.getCachedSessions();
          const session = sessions.find((s) => s.id === message.sessionId);
          if (!session) {
            return;
          }
          const events = await parseSession(session);
          this.eventStore.loadEvents(events);
          session.eventCount = events.length;
          this.messageBridge.sendSession(session);
          await this.messageBridge.sendEventsInChunks(events);
          break;
        }
        case "request-event-details": {
          const event = this.eventStore.getEventById(message.eventId);
          if (event) {
            this.messageBridge.sendEventDetails(event);
          }
          break;
        }
        case "playback-state": {
          this.messageBridge.sendPlaybackControl(message.action, message.value);
          break;
        }
      }
    });
  }
  getWebviewContent(webview) {
    const nonce = getNonce();
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`
    ].join("; ");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Copilot Office</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #1e1e2e;
      color: #cdd6f4;
      font-family: var(--vscode-font-family);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .loading {
      text-align: center;
    }
    .loading h2 {
      font-weight: 300;
      margin-bottom: 8px;
    }
    .loading p {
      opacity: 0.7;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="loading">
    <h2>\u{1F3E2} Copilot Office</h2>
    <p>Waiting for webview bundle...</p>
    <p style="font-size: 11px; margin-top: 16px; opacity: 0.5;">
      The visualization canvas will load here once the webview is built.
    </p>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    // Message listener \u2014 Jim's webview code will replace this
    window.addEventListener('message', event => {
      const message = event.data;
      console.log('[Webview] Received:', message.type);
    });
    // Request session list on load
    vscode.postMessage({ type: 'request-session-list' });
  </script>
</body>
</html>`;
  }
};
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// src/extension.ts
var officeViewProvider;
var statusBarItem;
function activate(context) {
  console.log("[Copilot Visualizer] Activating...");
  const logDiscovery = new LogDiscoveryService();
  const eventStore = new EventStore();
  const messageBridge = new MessageBridge();
  officeViewProvider = new OfficeViewProvider(
    context.extensionUri,
    messageBridge,
    eventStore,
    logDiscovery
  );
  const openOfficeCmd = vscode5.commands.registerCommand(
    "copilot-visualizer.openOffice",
    () => {
      officeViewProvider.openPanel();
    }
  );
  const selectSessionCmd = vscode5.commands.registerCommand(
    "copilot-visualizer.selectSession",
    async () => {
      const sessions = await logDiscovery.discoverSessions();
      if (sessions.length === 0) {
        vscode5.window.showInformationMessage("No Copilot sessions found.");
        return;
      }
      const items = sessions.map((s) => ({
        label: s.name,
        description: `${s.source} \u2014 ${s.logPath}`,
        detail: s.eventCount > 0 ? `${s.eventCount} events` : void 0,
        sessionId: s.id
      }));
      const selected = await vscode5.window.showQuickPick(items, {
        placeHolder: "Select a Copilot session to visualize"
      });
      if (selected) {
        const session = sessions.find((s) => s.id === selected.sessionId);
        if (session) {
          const events = await parseSession(session);
          eventStore.loadEvents(events);
          session.eventCount = events.length;
          officeViewProvider.openPanel();
          messageBridge.sendSession(session);
          await messageBridge.sendEventsInChunks(events);
          updateStatusBar(session.name, events.length);
        }
      }
    }
  );
  const refreshLogsCmd = vscode5.commands.registerCommand(
    "copilot-visualizer.refreshLogs",
    async () => {
      const sessions = await logDiscovery.discoverSessions();
      vscode5.window.showInformationMessage(
        `Found ${sessions.length} Copilot session(s).`
      );
      messageBridge.sendSessionList(sessions);
    }
  );
  statusBarItem = vscode5.window.createStatusBarItem(vscode5.StatusBarAlignment.Right, 100);
  statusBarItem.command = "copilot-visualizer.openOffice";
  statusBarItem.text = "$(play) Copilot Office";
  statusBarItem.tooltip = "Open Copilot Visualizer";
  statusBarItem.show();
  context.subscriptions.push(
    openOfficeCmd,
    selectSessionCmd,
    refreshLogsCmd,
    statusBarItem,
    { dispose: () => messageBridge.dispose() },
    { dispose: () => officeViewProvider.dispose() }
  );
  logDiscovery.discoverSessions().then((sessions) => {
    if (sessions.length > 0) {
      updateStatusBar(void 0, void 0, sessions.length);
    }
  });
  console.log("[Copilot Visualizer] Activated successfully.");
}
function deactivate() {
  console.log("[Copilot Visualizer] Deactivated.");
}
function updateStatusBar(sessionName, eventCount, totalSessions) {
  if (sessionName && eventCount !== void 0) {
    statusBarItem.text = `$(play) ${sessionName} (${eventCount} events)`;
  } else if (totalSessions !== void 0) {
    statusBarItem.text = `$(play) Copilot Office (${totalSessions} sessions)`;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
