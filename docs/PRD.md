# Copilot Visualizer — Product Requirements Document

> Version: 1.0 | Author: Michael (Lead/Architect) | Date: 2026-04-27

---

## 1. Vision & Problem Statement

GitHub Copilot does an enormous amount of invisible work. It completes code inline, holds multi-turn chat conversations, runs CLI agents that make tool calls, read files, search codebases, and execute commands — all without the user seeing the orchestration behind it.

**The problem:** Developers have zero visibility into what Copilot actually did, how agents interacted, what tools were invoked, or how a final result was assembled. Logs exist but are scattered, raw JSON, and uninspectable without digging through file systems.

**The solution:** Copilot Visualizer transforms those raw logs into a living, animated 2D office scene inside VS Code. Each Copilot agent becomes a virtual character — walking to desks, typing code, reading files, talking to other agents. The invisible becomes visible, educational, and delightful.

**Why it matters:**
- **Transparency** — Understand what Copilot did and why
- **Debugging** — When Copilot produces unexpected results, trace the decision path
- **Education** — See how AI agents decompose problems, use tools, and collaborate
- **Delight** — Turn mundane log data into something engaging

---

## 2. Target Users

| Segment | Description |
|---------|-------------|
| **Power Users** | Developers who use Copilot CLI, Chat, and inline completions daily and want to understand the machinery |
| **Debuggers** | Developers troubleshooting unexpected Copilot behavior — wrong completions, failed tool calls, agent loops |
| **Curious Developers** | Anyone who wants to peek behind the curtain of AI-assisted coding |
| **Educators/Presenters** | People demonstrating how AI coding assistants work under the hood |

---

## 3. Core Features (MVP)

### 3.1 Log Discovery

Automatically detect and index Copilot log sources across the system.

| Source | Platform | Path |
|--------|----------|------|
| Copilot CLI Sessions | macOS | `~/.copilot/session-state/*/` |
| Copilot CLI Sessions | Linux | `~/.copilot/session-state/*/` |
| Copilot CLI Sessions | Windows | `%USERPROFILE%\.copilot\session-state\*\` |
| Copilot Chat | macOS | `~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/` |
| Copilot Chat | Linux | `~/.config/Code/User/globalStorage/github.copilot-chat/` |
| Copilot Chat | Windows | `%APPDATA%\Code\User\globalStorage\github.copilot-chat\` |
| Inline Completions | All | VS Code output channel logs, extension host logs |

**Behavior:**
- On activation, scan all known paths
- Present a session picker (sorted by recency)
- Handle missing directories gracefully (user may not have all Copilot features)
- Watch for new sessions appearing during the VS Code session

### 3.2 Log Parsing

Parse heterogeneous log formats into a unified event stream.

**Input formats:**
- CLI sessions: JSON files with conversation turns, tool calls, agent responses
- Chat: Structured conversation history with model responses
- Inline: Completion request/response pairs

**Output:** Normalized `CopilotEvent[]` timeline (see Data Model §6)

**Requirements:**
- Tolerant of schema changes — fail gracefully on unknown fields
- Support incremental parsing (don't re-parse entire files)
- Extract metadata: timestamps, duration, token counts, model used

### 3.3 Office Visualization

A 2D animated office scene rendered in a VS Code webview panel using Canvas 2D.

**Scene elements:**
- **Office layout** — Desks, computers, meeting table, whiteboard, file cabinet, coffee machine
- **Agent characters** — Pixel-art style characters (one per distinct agent/session), with name labels
- **Workstations** — Each agent has an assigned desk
- **Meeting area** — Where multi-agent conversations happen
- **Tool zones** — File cabinet (file reads), terminal (bash), search area (grep/glob)

**Agent behaviors (mapped from events):**
| Event Type | Animation |
|------------|-----------|
| `ToolCall:bash` | Agent walks to terminal, types |
| `ToolCall:read_file` | Agent walks to file cabinet, retrieves document |
| `ToolCall:edit_file` | Agent types at desk, code appears on screen |
| `ToolCall:grep/glob` | Agent uses search station |
| `ChatMessage` | Speech bubble appears over agent |
| `Completion` | Agent types rapidly at desk, code streams on monitor |
| `AgentThinking` | Thought bubble with "..." appears |
| `AgentIdle` | Agent sits at desk, idle animation |
| `MultiAgentHandoff` | Agents meet at meeting table |

**Visual requirements:**
- Smooth sprite animations at 60fps
- Distinct character designs per agent type (CLI agent, Chat, Inline)
- Color-coded speech bubbles by event type
- Minimap showing full office when zoomed in

### 3.4 Timeline Control

A playback control bar at the bottom of the webview.

**Controls:**
- Play / Pause button
- Playback speed (0.5x, 1x, 2x, 4x)
- Timeline scrubber — drag to any point in the session
- Event markers on timeline (colored dots for different event types)
- Jump to next/previous event buttons
- Current timestamp display

**Behavior:**
- Events play in chronological order
- Animations interpolate between events
- Pausing freezes all agent animations
- Scrubbing instantly repositions agents

### 3.5 Event Inspector

Click any agent or event marker to see details.

**Inspector panel (side drawer):**
- Event type and timestamp
- Duration (for tool calls)
- Raw payload (collapsible JSON)
- For tool calls: input arguments and output/result
- For chat messages: full message content
- For completions: prompt snippet and completion text
- Link to source log file

---

## 4. Non-Goals (v1)

| Deferred | Rationale |
|----------|-----------|
| Real-time streaming | v2 — requires file watchers + incremental rendering; MVP uses completed sessions |
| Custom office themes | v2 — one default theme first |
| Multi-user viewing | Not needed for local tool |
| Cloud sync | Logs are local-only |
| Copilot Extensions/MCP visualization | v2 — scope creep |
| Audio/sound effects | Nice-to-have, not MVP |
| 3D rendering | Complexity not justified; 2D is sufficient |

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Log Discovery │  │  Log Parser  │  │Event Normalizer│ │
│  │   Service     │  │   Engine     │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            │                             │
│                   ┌────────▼────────┐                    │
│                   │  Event Store    │                    │
│                   │ (in-memory)     │                    │
│                   └────────┬────────┘                    │
│                            │                             │
│                   ┌────────▼────────┐                    │
│                   │ Message Bridge  │                    │
│                   │ (postMessage)   │                    │
│                   └────────┬────────┘                    │
└────────────────────────────┼─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│                    Webview (Canvas 2D)                     │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Scene Engine  │  │ Agent Sprites │  │  UI Controls │   │
│  │ (render loop) │  │ & Animations  │  │  (timeline)  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Log Discovery Service** | Scans filesystem for known Copilot log paths, indexes available sessions, watches for new files |
| **Log Parser Engine** | Reads raw log files, handles multiple formats (CLI JSON, Chat history, completion logs) |
| **Event Normalizer** | Transforms parsed data into unified `CopilotEvent` stream with consistent timestamps |
| **Event Store** | In-memory store of normalized events for the active session; provides query/filter APIs |
| **Message Bridge** | Serializes events and commands between extension host and webview via `postMessage` |
| **Scene Engine** | Canvas 2D render loop (requestAnimationFrame), manages scene graph, handles zoom/pan |
| **Agent Sprites** | Character rendering, pathfinding between office locations, animation state machines |
| **UI Controls** | Timeline bar, playback controls, inspector panel, session picker |

### Key Design Decisions

1. **Canvas 2D over DOM/SVG** — Performance with many animated sprites; 60fps target
2. **In-memory event store** — Sessions are bounded (typically <10K events); no need for persistence
3. **postMessage bridge** — VS Code webview security model requires this; serialize events as JSON
4. **Stateless webview** — All state lives in extension host; webview can be recreated without data loss

---

## 6. Data Model

```typescript
// === Core Event Types ===

interface CopilotEvent {
  id: string;                    // Unique event ID
  type: EventType;               // Discriminator
  timestamp: number;             // Unix ms
  sessionId: string;             // Which session this belongs to
  agentId: string;               // Which agent produced this event
  source: LogSource;             // Where this came from
  duration?: number;             // Duration in ms (for tool calls)
  metadata?: Record<string, unknown>;
}

type EventType =
  | 'tool_call'
  | 'tool_result'
  | 'chat_message'
  | 'completion'
  | 'agent_thinking'
  | 'agent_handoff'
  | 'session_start'
  | 'session_end'
  | 'error';

type LogSource = 'cli' | 'chat' | 'inline';

// === Specific Event Payloads ===

interface ToolCall extends CopilotEvent {
  type: 'tool_call';
  toolName: string;              // e.g., 'bash', 'edit', 'grep', 'view'
  arguments: Record<string, unknown>;
  result?: string;
  success?: boolean;
}

interface ChatMessage extends CopilotEvent {
  type: 'chat_message';
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  model?: string;
}

interface Completion extends CopilotEvent {
  type: 'completion';
  prompt: string;                // Truncated prompt context
  completionText: string;
  language: string;
  accepted: boolean;
  model?: string;
}

// === Agent & Scene Types ===

interface AgentState {
  id: string;
  name: string;                  // Display name
  type: 'cli_agent' | 'chat_agent' | 'inline_agent';
  status: AgentStatus;
  position: { x: number; y: number };
  currentAction?: string;
  assignedDesk: number;
}

type AgentStatus = 'idle' | 'walking' | 'typing' | 'reading' | 'talking' | 'thinking' | 'searching';

// === Timeline ===

interface TimelineEntry {
  event: CopilotEvent;
  agentState: AgentState;        // Agent state at this point
  sceneAction: SceneAction;      // What animation to trigger
}

type SceneAction =
  | { type: 'move_to'; destination: OfficeLocation }
  | { type: 'animate'; animation: string; duration: number }
  | { type: 'speech_bubble'; text: string; style: 'chat' | 'thought' | 'tool' }
  | { type: 'idle' };

type OfficeLocation = 'desk' | 'terminal' | 'file_cabinet' | 'meeting_table' | 'search_station' | 'whiteboard';

// === Session ===

interface CopilotSession {
  id: string;
  name: string;                  // Human-readable session name
  source: LogSource;
  startTime: number;
  endTime?: number;
  eventCount: number;
  agents: AgentState[];
  logPath: string;               // Path to source log file(s)
}
```

---

## 7. Log Sources — Detailed Paths

### Copilot CLI (`~/.copilot/session-state/`)

```
~/.copilot/session-state/
├── abc-123-def/
│   ├── conversation.json      # Full conversation with tool calls
│   ├── checkpoints/           # Periodic state snapshots
│   └── metadata.json          # Session metadata
├── ghi-456-jkl/
│   └── ...
```

**Key fields to extract:**
- `turns[].user_message` → ChatMessage (role: user)
- `turns[].assistant_response` → ChatMessage (role: assistant)
- Tool calls embedded in assistant responses → ToolCall events
- Timestamps from turn metadata

### Copilot Chat (VS Code globalStorage)

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/` |
| Linux | `~/.config/Code/User/globalStorage/github.copilot-chat/` |
| Windows | `%APPDATA%\Code\User\globalStorage\github.copilot-chat\` |

**Key files:**
- `conversations.json` or similar — chat history
- Individual conversation files with turns

### Inline Completions

- VS Code Output Channel: "GitHub Copilot" output panel logs
- Extension host log: `~/.vscode/extensions/github.copilot-*/` telemetry/cache

---

## 8. Extension Activation & UX

### Activation Events
- Command: `copilot-visualizer.openOffice`
- First activation loads session list; user picks a session to visualize

### Commands
| Command | Title | Description |
|---------|-------|-------------|
| `copilot-visualizer.openOffice` | Copilot Visualizer: Open Office | Opens the office visualization panel |
| `copilot-visualizer.selectSession` | Copilot Visualizer: Select Session | Opens session picker |
| `copilot-visualizer.refreshLogs` | Copilot Visualizer: Refresh Logs | Re-scan log directories |

### Status Bar
- Icon in status bar showing last session activity
- Click opens the office view

### Settings
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `copilotVisualizer.logPaths.cli` | string[] | Auto-detect | Custom CLI log paths |
| `copilotVisualizer.logPaths.chat` | string[] | Auto-detect | Custom Chat log paths |
| `copilotVisualizer.animation.speed` | number | 1.0 | Default playback speed |
| `copilotVisualizer.animation.quality` | enum | "high" | "low" / "medium" / "high" |
| `copilotVisualizer.maxEvents` | number | 5000 | Max events to load per session |

---

## 9. Performance Requirements

| Metric | Target |
|--------|--------|
| Animation frame rate | 60fps (drop to 30fps under heavy load) |
| Event loading (1000 events) | < 2 seconds |
| Event loading (5000 events) | < 5 seconds |
| Memory usage (active session) | < 100MB |
| Webview initial render | < 1 second after events loaded |
| Timeline scrubbing | Instant (< 16ms per frame) |

**Strategies:**
- Virtualize event list (only render visible events in inspector)
- Use offscreen canvas for sprite pre-rendering
- Batch postMessage calls (send event chunks, not individual events)
- Lazy-load event details (send summaries first, full payloads on demand)
- Object pooling for sprites and speech bubbles

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Extension installs (3 months) | 1,000+ |
| User rating | 4.0+ stars |
| Session visualization success rate | > 95% of valid log files parse correctly |
| Performance | No dropped frames reported in issues |
| User engagement | Average session viewing time > 30 seconds |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Copilot log format changes | Parsing breaks | Version-tolerant parser with fallback; schema detection |
| Large log files (>50MB) | OOM, slow load | Streaming parser, event limit setting, pagination |
| Canvas performance on low-end machines | Dropped frames | Quality settings, reduced animation mode |
| Log path differences across OS | Discovery fails | Platform-specific path resolution with fallbacks |
| Webview security restrictions | Can't access filesystem | All file I/O in extension host; webview receives processed data only |

---

## 12. Release Plan

| Phase | Scope | Timeline |
|-------|-------|----------|
| **v0.1 (Internal)** | CLI log parsing + basic office scene + timeline | 4 weeks |
| **v0.5 (Alpha)** | All log sources + full animations + inspector | 4 weeks |
| **v1.0 (Public)** | Polished UX, performance optimized, marketplace listing | 2 weeks |
| **v1.x** | Real-time streaming, themes, community sprites | Ongoing |
