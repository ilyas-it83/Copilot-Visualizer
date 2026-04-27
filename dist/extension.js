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
var vscode4 = __toESM(require("vscode"));

// src/services/eventStore.ts
var vscode = __toESM(require("vscode"));
var EventStore = class {
  constructor() {
    this.events = [];
    const config = vscode.workspace.getConfiguration("copilotVisualizer");
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
var vscode2 = __toESM(require("vscode"));
var MessageBridge = class {
  constructor() {
    this.webview = null;
    this.handlers = [];
    this.disposables = [];
  }
  /** Whether a webview is currently attached and ready to receive messages */
  get isAttached() {
    return this.webview !== null;
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
    return new vscode2.Disposable(() => {
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
  /** Stream a live event to the webview */
  sendLiveEvent(event) {
    this.postMessage({ type: "live-event", event });
  }
  /** Notify webview that a new agent has appeared */
  sendAgentAppeared(agent) {
    this.postMessage({ type: "agent-appeared", agent });
  }
  /** Send monitoring status update to webview */
  sendStatusUpdate(stats) {
    this.postMessage({ type: "status-update", stats });
  }
  /** Send event details (on request from webview) */
  sendEventDetails(event) {
    this.postMessage({ type: "event-details", event });
  }
  dispose() {
    this.detach();
    this.handlers = [];
  }
};

// src/services/fileWatcher.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var import_events = require("events");

// src/parsers/utils.ts
var counter = 0;
function v4Fallback() {
  counter++;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${time}-${random}-${counter}`;
}

// src/services/fileWatcher.ts
var AGENT_COLORS = [
  "#4285f4",
  // blue
  "#34a853",
  // green
  "#fbbc05",
  // yellow
  "#ea4335",
  // red
  "#ab47bc",
  // purple
  "#00acc1",
  // cyan
  "#ff7043",
  // orange
  "#8d6e63",
  // brown
  "#5c6bc0",
  // indigo
  "#26a69a"
  // teal
];
var FileWatcher = class extends import_events.EventEmitter {
  constructor() {
    super(...arguments);
    this.watchedFiles = /* @__PURE__ */ new Map();
    this.directoryWatchers = /* @__PURE__ */ new Map();
    this.knownAgents = /* @__PURE__ */ new Map();
    this.running = false;
    this.scanInterval = null;
  }
  /** Start monitoring all known Copilot log locations */
  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    console.log("[FileWatcher] Starting real-time monitoring...");
    const cliPath = this.getCliSessionPath();
    this.watchDirectory(cliPath, "cli");
    const chatPath = this.getChatStoragePath();
    if (chatPath) {
      this.watchDirectory(chatPath, "chat");
    }
    this.scanInterval = setInterval(() => this.rescanDirectories(), 5e3);
    this.rescanDirectories();
  }
  /** Stop all watchers and clean up */
  stop() {
    if (!this.running) {
      return;
    }
    this.running = false;
    console.log("[FileWatcher] Stopping monitoring.");
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
  getKnownAgents() {
    return Array.from(this.knownAgents.values());
  }
  /** Get monitoring stats */
  get isRunning() {
    return this.running;
  }
  get watchedFileCount() {
    return this.watchedFiles.size;
  }
  dispose() {
    this.stop();
    this.removeAllListeners();
  }
  // === Directory watching ===
  watchDirectory(dirPath, source) {
    if (this.directoryWatchers.has(dirPath)) {
      return;
    }
    if (!this.directoryExists(dirPath)) {
      const parentDir = path.dirname(dirPath);
      if (this.directoryExists(parentDir)) {
        this.watchForDirectoryCreation(parentDir, dirPath, source);
      }
      return;
    }
    try {
      const watcher = fs.watch(dirPath, { persistent: false }, (eventType, filename) => {
        if (!this.running) {
          return;
        }
        if (eventType === "rename" && filename) {
          setTimeout(() => this.scanDirectory(dirPath, source), 100);
        }
      });
      watcher.on("error", (err) => {
        console.warn(`[FileWatcher] Directory watcher error on ${dirPath}:`, err.message);
        this.emit("error", err);
      });
      this.directoryWatchers.set(dirPath, watcher);
      console.log(`[FileWatcher] Watching directory: ${dirPath}`);
      this.scanDirectory(dirPath, source);
    } catch (err) {
      console.warn(`[FileWatcher] Failed to watch directory ${dirPath}:`, err);
    }
  }
  watchForDirectoryCreation(parentDir, targetDir, source) {
    const key = `parent:${parentDir}`;
    if (this.directoryWatchers.has(key)) {
      return;
    }
    try {
      const watcher = fs.watch(parentDir, { persistent: false }, (eventType, filename) => {
        if (!this.running) {
          return;
        }
        if (this.directoryExists(targetDir)) {
          watcher.close();
          this.directoryWatchers.delete(key);
          this.watchDirectory(targetDir, source);
        }
      });
      watcher.on("error", () => {
      });
      this.directoryWatchers.set(key, watcher);
    } catch {
    }
  }
  async scanDirectory(dirPath, source) {
    if (!this.running) {
      return;
    }
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory() && source === "cli") {
          const eventsFile = path.join(fullPath, "events.jsonl");
          if (this.fileExists(eventsFile)) {
            this.watchFile(eventsFile, source, entry.name);
          }
          this.watchSubdirectoryForFiles(fullPath, source, entry.name);
        } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          this.watchFile(fullPath, source, path.basename(entry.name, ".jsonl"));
        } else if (entry.isFile() && entry.name.endsWith(".json") && source === "chat") {
          this.watchFile(fullPath, source, path.basename(entry.name, ".json"));
        }
      }
    } catch (err) {
    }
  }
  watchSubdirectoryForFiles(dirPath, source, sessionId) {
    const key = `subdir:${dirPath}`;
    if (this.directoryWatchers.has(key)) {
      return;
    }
    try {
      const watcher = fs.watch(dirPath, { persistent: false }, (eventType, filename) => {
        if (!this.running) {
          return;
        }
        if (filename === "events.jsonl") {
          const eventsFile = path.join(dirPath, "events.jsonl");
          if (this.fileExists(eventsFile)) {
            this.watchFile(eventsFile, source, sessionId);
          }
        }
      });
      watcher.on("error", () => {
      });
      this.directoryWatchers.set(key, watcher);
    } catch {
    }
  }
  // === File watching ===
  watchFile(filePath, source, sessionId) {
    if (this.watchedFiles.has(filePath)) {
      return;
    }
    const watched = {
      filePath,
      source,
      sessionId,
      byteOffset: 0,
      watcher: null
    };
    this.readNewContent(watched);
    try {
      const watcher = fs.watch(filePath, { persistent: false }, (eventType) => {
        if (!this.running) {
          return;
        }
        if (eventType === "change") {
          this.readNewContent(watched);
        }
      });
      watcher.on("error", (err) => {
        console.warn(`[FileWatcher] File watcher error on ${filePath}:`, err.message);
        this.unwatchFile(filePath);
      });
      watched.watcher = watcher;
    } catch (err) {
      console.warn(`[FileWatcher] Failed to watch file ${filePath}:`, err);
    }
    this.watchedFiles.set(filePath, watched);
    console.log(`[FileWatcher] Watching file: ${filePath} (offset: ${watched.byteOffset})`);
  }
  unwatchFile(filePath) {
    const watched = this.watchedFiles.get(filePath);
    if (watched) {
      if (watched.watcher) {
        watched.watcher.close();
      }
      this.watchedFiles.delete(filePath);
    }
  }
  /** Read only new bytes appended since last read, parse lines, emit events */
  readNewContent(watched) {
    try {
      const stat = fs.statSync(watched.filePath);
      const fileSize = stat.size;
      if (fileSize < watched.byteOffset) {
        console.log(`[FileWatcher] File truncated, resetting: ${watched.filePath}`);
        watched.byteOffset = 0;
      }
      if (fileSize === watched.byteOffset) {
        return;
      }
      const fd = fs.openSync(watched.filePath, "r");
      const bytesToRead = fileSize - watched.byteOffset;
      const buffer = Buffer.alloc(bytesToRead);
      fs.readSync(fd, buffer, 0, bytesToRead, watched.byteOffset);
      fs.closeSync(fd);
      watched.byteOffset = fileSize;
      const newContent = buffer.toString("utf-8");
      const lines = newContent.split("\n").filter((line) => line.trim().length > 0);
      for (const line of lines) {
        this.parseLine(line, watched);
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        this.unwatchFile(watched.filePath);
      }
    }
  }
  // === Event parsing ===
  parseLine(line, watched) {
    try {
      const raw = JSON.parse(line);
      const event = this.normalizeEvent(raw, watched);
      if (event) {
        this.trackAgent(event);
        this.emit("event", event);
      }
    } catch {
    }
  }
  normalizeEvent(raw, watched) {
    const eventType = raw.type || raw.event || "";
    const timestamp = this.extractTimestamp(raw);
    const agentId = this.extractAgentId(raw, watched);
    const data = raw.data || {};
    const input = data.input || {};
    const args = data.arguments || {};
    const resolvedToolName = data.toolName || input.toolName || raw.tool || raw.hook || raw.name || "";
    const metadata = {
      ...raw,
      toolName: resolvedToolName,
      tool: resolvedToolName,
      command: args.command || input.toolArgs?.command,
      path: args.path || input.toolArgs?.path,
      data
    };
    const base = {
      id: v4Fallback(),
      sessionId: watched.sessionId,
      agentId,
      source: watched.source,
      timestamp,
      metadata
    };
    switch (eventType) {
      case "session.start":
      case "session_start":
        return { ...base, type: "session_start", sessionName: raw.name || void 0 };
      case "session.end":
      case "session_end":
        return { ...base, type: "session_end", reason: raw.reason || void 0 };
      case "tool.execution_start":
      case "hook.start":
      case "tool_call":
      case "tool.start":
        return {
          ...base,
          type: "tool_call",
          toolName: resolvedToolName || data.hookType || "unknown",
          arguments: Object.keys(args).length > 0 ? args : input.toolArgs || {},
          success: void 0
        };
      case "tool.execution_end":
      case "hook.end":
      case "tool_result":
      case "tool.end": {
        const toolResult = data.result || input.toolResult || {};
        return {
          ...base,
          type: "tool_result",
          toolName: resolvedToolName || data.hookType || "unknown",
          result: String(toolResult.textResultForLlm || data.output || raw.output || raw.result || ""),
          success: toolResult.resultType === "success" || raw.success !== false && raw.error === void 0,
          duration: typeof raw.duration === "number" ? raw.duration : typeof data.duration === "number" ? data.duration : void 0
        };
      }
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
  // === Agent identity extraction ===
  extractAgentId(raw, watched) {
    if (typeof raw.agent_id === "string" && raw.agent_id) {
      return raw.agent_id;
    }
    if (typeof raw.agentId === "string" && raw.agentId) {
      return raw.agentId;
    }
    if (typeof raw.agent_name === "string" && raw.agent_name) {
      return raw.agent_name;
    }
    if (typeof raw.agent === "string" && raw.agent) {
      return raw.agent;
    }
    switch (watched.source) {
      case "cli":
        return `copilot-cli-${watched.sessionId.slice(0, 8)}`;
      case "chat":
        return "chat-agent";
      case "inline":
        return "inline-agent";
      default:
        return "unknown-agent";
    }
  }
  trackAgent(event) {
    if (this.knownAgents.has(event.agentId)) {
      return;
    }
    const agent = {
      id: event.agentId,
      name: this.deriveAgentName(event.agentId, event.source),
      source: event.source,
      color: this.assignColor(event.agentId)
    };
    this.knownAgents.set(event.agentId, agent);
    this.emit("agent", agent);
  }
  deriveAgentName(agentId, source) {
    const knownNames = ["dwight", "jim", "pam", "michael", "angela", "oscar", "kevin"];
    const lowerAgentId = agentId.toLowerCase();
    for (const name of knownNames) {
      if (lowerAgentId.includes(name)) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    if (agentId.startsWith("copilot-cli-")) {
      return "Copilot CLI";
    }
    if (agentId.startsWith("cli-")) {
      return "CLI Agent";
    }
    if (agentId === "chat-agent") {
      return "Chat Agent";
    }
    if (agentId === "inline-agent") {
      return "Inline Agent";
    }
    return agentId.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  assignColor(agentId) {
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = (hash << 5) - hash + agentId.charCodeAt(i);
      hash = hash & hash;
    }
    return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
  }
  // === Utilities ===
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
  rescanDirectories() {
    if (!this.running) {
      return;
    }
    const cliPath = this.getCliSessionPath();
    if (this.directoryExists(cliPath) && !this.directoryWatchers.has(cliPath)) {
      this.watchDirectory(cliPath, "cli");
    } else if (this.directoryWatchers.has(cliPath)) {
      this.scanDirectory(cliPath, "cli");
    }
    const chatPath = this.getChatStoragePath();
    if (chatPath && this.directoryExists(chatPath) && !this.directoryWatchers.has(chatPath)) {
      this.watchDirectory(chatPath, "chat");
    }
  }
  getCliSessionPath() {
    return path.join(os.homedir(), ".copilot", "session-state");
  }
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

// src/providers/officeViewProvider.ts
var vscode3 = __toESM(require("vscode"));
var OfficeViewProvider = class _OfficeViewProvider {
  constructor(extensionUri, messageBridge, eventStore, fileWatcher2) {
    this.eventBuffer = [];
    this.agentBuffer = [];
    this.monitoring = false;
    this.statusInterval = null;
    this.extensionUri = extensionUri;
    this.messageBridge = messageBridge;
    this.eventStore = eventStore;
    this.fileWatcher = fileWatcher2;
    this.fileWatcher.on("event", (event) => {
      this.eventStore.addEvents([event]);
      if (this.messageBridge.isAttached) {
        this.messageBridge.sendLiveEvent(event);
      } else {
        this.eventBuffer.push(event);
      }
    });
    this.fileWatcher.on("agent", (agent) => {
      if (this.messageBridge.isAttached) {
        this.messageBridge.sendAgentAppeared({
          id: agent.id,
          name: agent.name,
          source: agent.source,
          color: agent.color
        });
      } else {
        this.agentBuffer.push(agent);
      }
    });
  }
  static {
    this.viewType = "copilot-visualizer.officeView";
  }
  /** Start real-time monitoring */
  startMonitoring() {
    if (this.monitoring) {
      return;
    }
    this.monitoring = true;
    this.fileWatcher.start();
    this.statusInterval = setInterval(() => {
      if (this.messageBridge.isAttached) {
        this.messageBridge.sendStatusUpdate({
          agentCount: this.fileWatcher.getKnownAgents().length,
          eventCount: this.eventStore.count,
          monitoring: this.monitoring
        });
      }
    }, 2e3);
    console.log("[OfficeViewProvider] Monitoring started.");
  }
  /** Stop real-time monitoring */
  stopMonitoring() {
    if (!this.monitoring) {
      return;
    }
    this.monitoring = false;
    this.fileWatcher.stop();
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    if (this.messageBridge.isAttached) {
      this.messageBridge.sendStatusUpdate({
        agentCount: this.fileWatcher.getKnownAgents().length,
        eventCount: this.eventStore.count,
        monitoring: false
      });
    }
    console.log("[OfficeViewProvider] Monitoring stopped.");
  }
  /** Open (or reveal) the office panel */
  openPanel() {
    if (this.panel) {
      this.panel.reveal(vscode3.ViewColumn.One);
      return;
    }
    this.panel = vscode3.window.createWebviewPanel(
      _OfficeViewProvider.viewType,
      "Copilot Office",
      vscode3.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode3.Uri.joinPath(this.extensionUri, "dist"),
          vscode3.Uri.joinPath(this.extensionUri, "media")
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
      if (e.webviewPanel.visible && this.messageBridge.isAttached) {
        this.messageBridge.sendStatusUpdate({
          agentCount: this.fileWatcher.getKnownAgents().length,
          eventCount: this.eventStore.count,
          monitoring: this.monitoring
        });
      }
    });
  }
  /** Dispose the panel */
  dispose() {
    this.stopMonitoring();
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    this.panel?.dispose();
  }
  /** Flush buffered events/agents to webview when it becomes ready */
  flushBuffers() {
    for (const agent of this.agentBuffer) {
      this.messageBridge.sendAgentAppeared({
        id: agent.id,
        name: agent.name,
        source: agent.source,
        color: agent.color
      });
    }
    this.agentBuffer = [];
    for (const event of this.eventBuffer) {
      this.messageBridge.sendLiveEvent(event);
    }
    this.eventBuffer = [];
    this.messageBridge.sendStatusUpdate({
      agentCount: this.fileWatcher.getKnownAgents().length,
      eventCount: this.eventStore.count,
      monitoring: this.monitoring
    });
  }
  registerMessageHandlers() {
    this.messageBridge.onMessage((message) => {
      switch (message.type) {
        case "webview-ready": {
          this.flushBuffers();
          break;
        }
        case "request-event-details": {
          const event = this.eventStore.getEventById(message.eventId);
          if (event) {
            this.messageBridge.sendEventDetails(event);
          }
          break;
        }
        case "monitoring-control": {
          if (message.action === "start") {
            this.startMonitoring();
          } else {
            this.stopMonitoring();
          }
          break;
        }
      }
    });
  }
  getWebviewContent(webview) {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode3.Uri.joinPath(this.extensionUri, "dist", "webview.js")
    );
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
    :root {
      --bg-primary: #1e1e1e;
      --bg-secondary: #252526;
      --bg-tertiary: #2d2d30;
      --text-primary: #cccccc;
      --text-secondary: #999999;
      --accent-blue: #4285f4;
      --border: #3e3e42;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      overflow: hidden;
      height: 100vh;
    }
    #app { display: flex; flex-direction: column; height: 100vh; }
    #status-bar {
      height: 28px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-size: 11px;
      color: var(--text-secondary);
      gap: 16px;
      flex-shrink: 0;
    }
    #canvas-container { flex: 1; position: relative; overflow: hidden; }
    #office-canvas { display: block; width: 100%; height: 100%; }
    #activity-log {
      height: 130px;
      overflow-y: auto;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      padding: 8px 12px;
      font-family: 'Cascadia Code', 'Fira Code', 'Menlo', monospace;
      font-size: 11px;
      flex-shrink: 0;
    }
    #activity-log::-webkit-scrollbar { width: 4px; }
    #activity-log::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    .log-entry { padding: 1px 0; line-height: 1.5; opacity: 0; animation: fadeInLog 0.3s forwards; }
    .log-time { color: var(--text-secondary); }
    .log-text { color: var(--text-primary); }
    @keyframes fadeInLog { to { opacity: 1; } }
  </style>
</head>
<body>
  <div id="app">
    <div id="status-bar">\u{1F534} Waiting...</div>
    <div id="canvas-container">
      <canvas id="office-canvas"></canvas>
    </div>
    <div id="activity-log"></div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
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
var fileWatcher;
var statusBarItem;
function activate(context) {
  console.log("[Copilot Visualizer] Activating (real-time mode)...");
  const eventStore = new EventStore();
  const messageBridge = new MessageBridge();
  fileWatcher = new FileWatcher();
  officeViewProvider = new OfficeViewProvider(
    context.extensionUri,
    messageBridge,
    eventStore,
    fileWatcher
  );
  const openOfficeCmd = vscode4.commands.registerCommand(
    "copilot-visualizer.openOffice",
    () => {
      officeViewProvider.openPanel();
    }
  );
  const toggleMonitoringCmd = vscode4.commands.registerCommand(
    "copilot-visualizer.toggleMonitoring",
    () => {
      if (fileWatcher.isRunning) {
        officeViewProvider.stopMonitoring();
        updateStatusBar(false, eventStore.count);
        vscode4.window.showInformationMessage("Copilot monitoring paused.");
      } else {
        officeViewProvider.startMonitoring();
        updateStatusBar(true, eventStore.count);
        vscode4.window.showInformationMessage("Copilot monitoring resumed.");
      }
    }
  );
  statusBarItem = vscode4.window.createStatusBarItem(vscode4.StatusBarAlignment.Right, 100);
  statusBarItem.command = "copilot-visualizer.openOffice";
  statusBarItem.text = "$(eye) Copilot Live";
  statusBarItem.tooltip = "Open Copilot Visualizer (real-time monitoring)";
  statusBarItem.show();
  context.subscriptions.push(
    openOfficeCmd,
    toggleMonitoringCmd,
    statusBarItem,
    { dispose: () => messageBridge.dispose() },
    { dispose: () => officeViewProvider.dispose() },
    { dispose: () => fileWatcher.dispose() }
  );
  officeViewProvider.startMonitoring();
  const statusUpdateInterval = setInterval(() => {
    if (fileWatcher.isRunning) {
      updateStatusBar(true, eventStore.count);
    }
  }, 3e3);
  context.subscriptions.push({ dispose: () => clearInterval(statusUpdateInterval) });
  console.log("[Copilot Visualizer] Activated \u2014 real-time monitoring started.");
}
function deactivate() {
  if (fileWatcher) {
    fileWatcher.dispose();
  }
  console.log("[Copilot Visualizer] Deactivated.");
}
function updateStatusBar(monitoring, eventCount) {
  if (monitoring) {
    const countStr = eventCount > 0 ? ` (${eventCount})` : "";
    statusBarItem.text = `$(eye) Copilot Live${countStr}`;
    statusBarItem.tooltip = `Monitoring Copilot \u2014 ${eventCount} events captured`;
  } else {
    statusBarItem.text = "$(eye-closed) Copilot Paused";
    statusBarItem.tooltip = "Copilot monitoring paused \u2014 click to open";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
