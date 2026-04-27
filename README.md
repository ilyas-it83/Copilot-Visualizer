# 🏢 Copilot Visualizer

> **Turn invisible AI work into a living office scene.**

A VS Code extension that reads GitHub Copilot logs in real-time and visualizes agent actions as animated characters working in a 2D virtual office. Watch your AI assistants code at desks, search file cabinets, run terminals, sketch on whiteboards, and take coffee breaks — all rendered on a Canvas 2D scene at 60 fps.

![VS Code 1.85+](https://img.shields.io/badge/VS%20Code-1.85%2B-blue)
![License MIT](https://img.shields.io/badge/license-MIT-green)
![Version 0.1.0](https://img.shields.io/badge/version-0.1.0-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Features](#features)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
- [How It Works](#how-it-works)
  - [Event Pipeline](#event-pipeline)
  - [Log Sources](#log-sources)
  - [Event-to-Animation Mapping](#event-to-animation-mapping)
  - [Agent Lifecycle](#agent-lifecycle)
- [Office Layout](#office-layout)
- [Configuration](#configuration)
- [Architecture](#architecture)
  - [Project Structure](#project-structure)
  - [Key Components](#key-components)
  - [Tech Stack](#tech-stack)
- [Contributing](#contributing)
  - [Development Setup](#development-setup)
  - [Build Commands](#build-commands)
  - [Code Style](#code-style)
  - [Testing](#testing)
  - [Pull Request Guidelines](#pull-request-guidelines)
  - [Areas for Contribution](#areas-for-contribution)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why This Exists

GitHub Copilot does an enormous amount of invisible work — completing code inline, holding multi-turn chat conversations, running CLI agents that invoke tools, read files, search codebases, and execute shell commands. Developers have **zero visibility** into what Copilot actually did, how agents interacted, or what tools were invoked.

Copilot Visualizer transforms those raw logs into a **living, animated office scene** inside VS Code. Each Copilot session becomes a virtual character — walking to desks, typing code, reading files from cabinets, searching at workstations, and collaborating at meeting tables. The invisible becomes visible, educational, and delightful.

**Use cases:**

| Who | Why |
|-----|-----|
| **Power Users** | Understand what Copilot did behind the scenes |
| **Debuggers** | Trace unexpected results through the tool-call chain |
| **Educators** | Demonstrate how AI coding assistants decompose problems |
| **The Curious** | Peek behind the curtain of AI-assisted development |

---

## Features

### Real-Time Monitoring
- 🔴 **Live streaming** — events appear as Copilot works, no replay delay
- 📡 **Auto-discovery** — watches `~/.copilot/session-state/` for new sessions
- ⚡ **Rate-limited queue** — smooth animations even under heavy event load

### Animated Office Scene
- 🏢 **1000×600 2D canvas** — desks, terminal, search station, file cabinet, whiteboard
- 🚶 **BFS pathfinding** — agents walk realistic paths between office locations
- 🎨 **Distinct agents** — unique body shapes, hair styles, and colors per session

### Walled Rooms
- ☕ **Pantry** — coffee machine and water cooler behind partition walls
- 🛋️ **Lounge** — meeting table (centered) and sofa for relaxation
- 🚻 **WC** — washroom with occupancy indicator

### Idle Life System
When agents aren't processing Copilot events, they live their office lives:
- ☕ Grab coffee or 💧 water in the pantry
- 🗣️ Gather at the meeting table for quick syncs
- 📝 Sketch ideas on the whiteboard
- 📂 Browse the file cabinet
- 😌 Relax on the lounge sofa
- 📱 Scroll their phones at the desk
- 💤 Fall asleep with animated snoring Z's

### Speech Bubbles
- 💬 **Large, readable bubbles** — 18px bold monospace with drop shadows
- 🔄 **Smart positioning** — flips below agent when near the top of the canvas
- 🎭 **Context-aware text** — shows tool names, file paths, and idle activity messages

---

## Screenshots

> *Open the extension with `Copilot Visualizer: Open Office` and start using Copilot to see it in action.*

---

## Getting Started

### Prerequisites

- **VS Code** 1.85 or later
- **Node.js** 18 or later (for building from source)
- **GitHub Copilot** (CLI, Chat, or Inline) — the extension reads Copilot's log files

### Installation

#### Option A: From VSIX (Recommended)

```bash
# Clone the repository
git clone https://github.com/<your-username>/Copilot-Visualizer.git
cd Copilot-Visualizer

# Install dependencies
npm install

# Build both bundles
npm run build

# Package as VSIX
npx vsce package --no-dependencies --allow-missing-repository

# Install in VS Code
code --install-extension copilot-visualizer-0.1.0.vsix
```

#### Option B: Development Mode

```bash
# Build extension and webview bundles
npx esbuild src/extension.ts --bundle --outfile=dist/extension.js \
  --platform=node --format=cjs --external:vscode --target=node18

npx esbuild src/webview/main.ts --bundle --outfile=dist/webview.js \
  --platform=browser --format=iife --target=es2020

# Hot-deploy to your local extensions folder
cp dist/extension.js dist/webview.js \
  ~/.vscode/extensions/copilot-visualizer.copilot-visualizer-0.1.0/dist/
```

Then run **Developer: Reload Window** in VS Code to pick up changes.

### Quick Start

1. Open the **Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run **`Copilot Visualizer: Open Office`**
3. Start using GitHub Copilot in any way — CLI commands, Chat conversations, or inline completions
4. Watch agents appear in the office and respond to Copilot's actions in real-time

---

## How It Works

### Event Pipeline

```
┌─────────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────┐
│ Copilot Logs    │───▶│ FileWatcher  │───▶│ MessageBridge │───▶│ Webview  │
│ (JSONL files)   │    │ (fs.watch +  │    │ (postMessage) │    │ (Canvas) │
│                 │    │  byte offset)│    │               │    │          │
└─────────────────┘    └──────────────┘    └───────────────┘    └──────────┘
                                                                      │
                                                                      ▼
                                                               ┌──────────────┐
                                                               │EventAnimator │
                                                               │ → Agent      │
                                                               │ → Animation  │
                                                               │ → Canvas 2D  │
                                                               └──────────────┘
```

1. **FileWatcher** monitors `~/.copilot/session-state/` using `fs.watch` with byte-offset tracking per file — only reads new content appended since last check
2. Raw events are **normalized** from Copilot's internal format (e.g., `tool.execution_start` → `tool_call`) and the nested `data` property is unwrapped
3. **MessageBridge** streams normalized events to the webview via VS Code's `postMessage` API
4. **LiveEventQueue** rate-limits incoming events to prevent animation pile-up
5. **EventAnimator** maps each event type to an agent action and office location
6. **Canvas 2D** renders the full scene at 60 fps across a 1000×600 logical coordinate space

### Log Sources

| Source | Location (macOS) | Format |
|--------|-----------------|--------|
| **CLI** | `~/.copilot/session-state/<sessionId>/events.jsonl` | JSONL — one JSON object per line |
| **Chat** | `~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/` | Structured JSON logs |
| **Inline** | `~/Library/Application Support/Code/logs/<timestamp>/window*/exthost/GitHub.copilot-chat/` | Extension host logs |

#### Raw Event Format (CLI)

```json
{
  "type": "tool.execution_start",
  "data": {
    "toolName": "bash",
    "arguments": { "command": "npm test" }
  },
  "id": "evt_abc123",
  "timestamp": "2026-04-27T15:30:00.000Z",
  "parentId": "turn_xyz"
}
```

The normalizer unwraps the `data` property and maps `tool.execution_start` → `tool_call`, `tool.execution_end` → `tool_result`.

### Event-to-Animation Mapping

| Tool / Event | Office Location | Agent Action | Speech Bubble |
|-------------|-----------------|--------------|---------------|
| `bash` / `shell` | 🖥️ Terminal | Typing animation | `$ command...` |
| `read` / `view` / `cat` | 📂 File Cabinet | Reading pose | `📄 filepath...` |
| `edit` / `create` / `write` | 💻 Desk | Typing animation | `✏️ editing...` |
| `grep` / `glob` / `search` | 🔍 Search Station | Searching animation | `🔍 query...` |
| Chat message | 💬 Whiteboard | Speech bubble | Message content |
| Agent thinking | 🤔 Desk | Thought cloud | Animated dots |
| Tool result | 💻 Desk | Return to desk | Result summary |
| Session start/end | 🚪 Door | Walk in/out | Welcome/goodbye |

### Agent Lifecycle

1. **Spawn** — a new Copilot session is detected → an agent is created with a unique color, body shape, hair style, and assigned desk
2. **Active work** — events arrive → agent walks to the relevant location, performs the action, shows a speech bubble
3. **Idle roaming** — no events for 8–15 seconds → agent picks a random activity (coffee, whiteboard, meeting, etc.) and walks there
4. **Interrupt** — new Copilot event arrives during idle → agent drops the activity, returns to work immediately
5. **Break banner** — when ALL agents are idle, a pulsing "No Active Work — Agents on Break" banner appears

---

## Office Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│                        🏢 Copilot Office                             │
│                                                                      │
│  [Desk 1] [Desk 2] [Desk 3]   [Desk 4] [Desk 5] [Desk 6]          │
│                                                                      │
│  ┌──────────┐ ┌────────┐              ┌────────┐ ┌──────────┐       │
│  │ Terminal  │ │ Search │              │ Files  │ │Whiteboard│       │
│  └──────────┘ └────────┘              └────────┘ └──────────┘       │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│ ┌──────────────┐           ┌─────────────────────┐ ┌──────────────┐│
│ │ ☕ Pantry     │           │ 🛋️ Lounge            │ │ 🚻 WC        ││
│ │              │           │                     │ │              ││
│ │ ☕ Coffee  💧│           │   ┌───────────────┐ │ │   🚪 Door    ││
│ │    Water     │           │   │ Meeting Table │ │ │              ││
│ │              │           │   └───────────────┘ │ │              ││
│ │      🚪      │           │   🛋️ Lounge Sofa    │ │              ││
│ └──────────────┘           │        🚪           │ └──────────────┘│
│                            └─────────────────────┘                  │
│                         [🚪 Main Door]                               │
└──────────────────────────────────────────────────────────────────────┘
```

- **Top zone (y: 50–200):** 6 desks with nameplates
- **Middle zone (y: 220–350):** Terminal, Search Station (left); File Cabinet, Whiteboard (right)
- **Bottom zone (y: 390–600):** Three walled rooms with doorways
  - **Pantry** (x: 0–270) — coffee machine + water cooler
  - **Lounge** (x: 560–830) — centered meeting table + sofa
  - **WC** (x: 830–1000) — washroom with occupancy dot

---

## Configuration

All settings are under **Copilot Visualizer** in VS Code Settings (`Cmd+,`):

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `copilotVisualizer.logPaths.cli` | `string[]` | Auto-detect | Override CLI log directory paths |
| `copilotVisualizer.logPaths.chat` | `string[]` | Auto-detect | Override Chat log directory paths |
| `copilotVisualizer.animation.speed` | `number` | `1.0` | Playback speed multiplier |
| `copilotVisualizer.animation.quality` | `string` | `"high"` | Render quality: `low` / `medium` / `high` |
| `copilotVisualizer.maxEvents` | `number` | `5000` | Maximum events held in memory |

---

## Architecture

### Project Structure

```
Copilot-Visualizer/
├── src/
│   ├── extension.ts                  # VS Code extension entry point
│   ├── providers/
│   │   └── officeViewProvider.ts      # Webview panel lifecycle & HTML generation
│   ├── services/
│   │   ├── fileWatcher.ts             # Real-time log monitoring (fs.watch + byte offsets)
│   │   ├── messageBridge.ts           # Extension ↔ Webview postMessage bridge
│   │   └── eventStore.ts              # In-memory event storage
│   ├── parsers/
│   │   ├── cliParser.ts               # CLI JSONL log parser
│   │   └── chatParser.ts              # Chat log parser
│   ├── types/
│   │   ├── events.ts                  # Backend event types
│   │   └── messages.ts                # Extension ↔ Webview message protocol
│   ├── test/
│   │   ├── parsers/                   # Parser unit tests
│   │   ├── services/                  # Service unit tests
│   │   └── integration/               # End-to-end pipeline tests
│   └── webview/
│       ├── main.ts                    # Webview entry point (Canvas init + render loop)
│       ├── MessageHandler.ts          # Inbound message routing
│       ├── types.ts                   # Webview-local type definitions
│       ├── agents/
│       │   ├── Agent.ts               # Agent entity — movement, status, idle roaming
│       │   ├── AgentRenderer.ts       # Canvas 2D agent sprites (body, hair, badges)
│       │   └── SpeechBubble.ts        # Speech bubble lifecycle (fade in/out, colors)
│       ├── animation/
│       │   └── EventAnimator.ts       # Maps CopilotEvent → agent animations
│       ├── scene/
│       │   ├── OfficeLayout.ts        # Office geometry, waypoints, BFS pathfinding
│       │   ├── OfficeScene.ts         # Main render loop, furniture, walls, banners
│       │   └── Renderer.ts            # Canvas 2D abstraction (shapes, text, bubbles)
│       └── ui/
│           ├── LiveEventQueue.ts      # Rate-limited event queue
│           ├── ActivityLog.ts         # Scrolling event log panel
│           └── StatusBar.ts           # Monitoring status display
├── dist/                              # Built bundles (extension.js + webview.js)
├── docs/
│   ├── PRD.md                         # Product Requirements Document
│   └── USER-STORIES.md               # User stories
├── package.json                       # Extension manifest & scripts
├── tsconfig.json                      # TypeScript configuration
├── vitest.config.ts                   # Test runner configuration
└── esbuild.config.js                  # Bundle configuration
```

### Key Components

| Component | Responsibility |
|-----------|---------------|
| **FileWatcher** | Watches `~/.copilot/session-state/` for new/modified JSONL files. Uses `fs.watch` with byte-offset tracking so it only reads newly appended data. Emits normalized `CopilotEvent` objects. |
| **MessageBridge** | Manages the `postMessage` channel between the Node.js extension host and the browser-based webview. Handles serialization and reconnection. |
| **OfficeScene** | Owns the 60 fps render loop. Draws the office background, furniture, partition walls, room labels, and the "No Work" banner. Coordinates agents and interaction lines. |
| **Agent** | Entity representing one Copilot session. Manages position, movement along BFS paths, status transitions, idle roaming timer, and speech bubble state. |
| **AgentRenderer** | Draws each agent as a pixel-art character with distinct body shape, hair style, color badge, status indicator emoji, and animated snoring Z's when sleeping. |
| **EventAnimator** | The brain of the visualization. Receives a `CopilotEvent`, determines which agent it belongs to, picks the target office location, triggers movement and speech bubbles. |
| **OfficeLayout** | Static data: 1000×600 coordinate space, location rectangles, waypoint graph, and `findPath()` BFS pathfinding between any two waypoints. |
| **Renderer** | Low-level Canvas 2D wrapper. Provides `drawSpeechBubble()` with smart vertical flipping, `drawRoundedRect()`, text wrapping, and camera transforms. |
| **SpeechBubble** | Lifecycle object for a speech bubble: fade-in (0.3 s), hold, fade-out (0.5 s). Text truncation at 60 characters. Typed colors (speech=white, tool=blue, thought=grey). |

### Tech Stack

| Technology | Purpose |
|-----------|---------|
| **TypeScript 5.3** | Full type safety across both Node.js and browser bundles |
| **Canvas 2D API** | Hardware-accelerated rendering at 60 fps |
| **esbuild** | Sub-second bundling for both `node` (extension) and `browser` (webview) targets |
| **VS Code Webview API** | Secure sandboxed rendering with Content Security Policy and nonce |
| **BFS Pathfinding** | Waypoint graph for realistic agent navigation between office locations |
| **Vitest** | Unit and integration testing |
| **vsce** | VS Code extension packaging |

---

## Contributing

Contributions are welcome! Whether it's fixing a bug, adding a new idle animation, supporting a new log source, or improving the office layout — we'd love the help.

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/Copilot-Visualizer.git
cd Copilot-Visualizer

# 2. Install dependencies
npm install

# 3. Build both bundles
npm run build

# 4. Open in VS Code
code .

# 5. Press F5 to launch the Extension Development Host
#    (or use the build + hot-deploy workflow below)
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build (extension + webview) |
| `npm run compile` | Development build |
| `npm run watch` | Watch mode with auto-rebuild |
| `npm test` | Run all tests with Vitest |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint with ESLint |

#### Manual Build (for hot-deploy)

```bash
# Extension bundle (Node.js)
npx esbuild src/extension.ts --bundle --outfile=dist/extension.js \
  --platform=node --format=cjs --external:vscode --target=node18

# Webview bundle (Browser)
npx esbuild src/webview/main.ts --bundle --outfile=dist/webview.js \
  --platform=browser --format=iife --target=es2020

# Hot-deploy without reinstalling the VSIX
cp dist/extension.js dist/webview.js \
  ~/.vscode/extensions/copilot-visualizer.copilot-visualizer-0.1.0/dist/

# Then run "Developer: Reload Window" in VS Code
```

#### Package as VSIX

```bash
npx vsce package --no-dependencies --allow-missing-repository
```

### Code Style

- **TypeScript strict mode** — `strict: true` in `tsconfig.json`
- **No `any`** where avoidable — prefer explicit types or `unknown`
- **Comments** — only where the code isn't self-explanatory; avoid noise
- **Naming** — `camelCase` for variables/functions, `PascalCase` for classes/types
- **Canvas drawing** — always `ctx.save()` / `ctx.restore()` around state changes
- **File organization** — group by domain (`agents/`, `scene/`, `animation/`, `ui/`), not by file type

### Testing

Tests live in `src/test/` and mirror the source structure:

```
src/test/
├── parsers/
│   ├── cliParser.test.ts      # CLI JSONL parsing
│   └── chatParser.test.ts     # Chat log parsing
├── services/
│   ├── eventStore.test.ts     # Event storage
│   └── logDiscovery.test.ts   # Log file discovery
└── integration/
    └── pipeline.test.ts       # End-to-end event pipeline
```

Run tests:

```bash
npm test                    # Single run
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

When contributing, please:

1. **Add tests** for any new parser, service, or animation logic
2. **Don't break existing tests** — run `npm test` before opening a PR
3. **Test visually** — open the office scene and verify animations look correct

### Pull Request Guidelines

1. **Fork** the repository and create a feature branch from `main`
2. **Keep PRs focused** — one feature or fix per PR
3. **Describe what changed and why** in the PR description
4. **Include screenshots or screen recordings** for visual changes
5. **Run `npm test` and `npm run lint`** before submitting
6. **Build the VSIX** and verify it installs cleanly

#### Commit Message Format

```
<type>: <short summary>

<optional body with details>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Areas for Contribution

Here are high-impact areas where contributions are especially welcome:

#### 🟢 Good First Issues
- Add new idle animations (yoga, stretching, doodling)
- Improve furniture sprites (higher fidelity desk, monitor, chair drawings)
- Add sound effects (optional, muted by default)
- Support Windows/Linux log paths (currently macOS-focused)

#### 🟡 Medium Complexity
- **New log sources** — parse VS Code Inline Copilot logs, JetBrains Copilot logs
- **Agent interaction lines** — draw animated lines between agents when they hand off work
- **Minimap** — a small overview of the office in the corner
- **Dark/light theme** — adapt office colors to VS Code theme
- **Event timeline** — scrubber to replay past events

#### 🔴 Advanced
- **MCP tool visualization** — show Model Context Protocol tool invocations
- **Skill usage display** — visualize agent skills as toolbelts or badges
- **Multi-agent collaboration** — show agents gathering at the whiteboard for complex tasks
- **3D/isometric view** — upgrade from top-down 2D to isometric perspective
- **Performance profiling** — optimize for 100+ concurrent agents

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"No actions" in the office** | Make sure Copilot CLI is running — events come from `~/.copilot/session-state/`. Try a Copilot command and watch for new JSONL files. |
| **Agents don't appear** | Run **Developer: Reload Window** after installing or deploying. VS Code caches webview content aggressively. |
| **Bubbles cut off at the top** | This is fixed in the latest build — bubbles flip below the agent when near the canvas top. Rebuild and redeploy. |
| **Extension doesn't activate** | Open the Command Palette and run `Copilot Visualizer: Open Office`. Check the Output panel for errors (select "Copilot Visualizer" from the dropdown). |
| **High CPU usage** | Lower `copilotVisualizer.animation.quality` to `"medium"` or `"low"`. Reduce `maxEvents` if memory is a concern. |
| **Walls not visible** | Ensure you're running the latest build. Run the build commands and redeploy, then reload VS Code. |

---

## Roadmap

- [ ] **Cross-platform log paths** — auto-detect on Windows and Linux
- [ ] **Marketplace publishing** — publish to the VS Code Marketplace
- [ ] **MCP tool visualization** — show external tool integrations
- [ ] **Agent skill badges** — visualize capabilities per agent
- [ ] **Event replay timeline** — scrub through past sessions
- [ ] **Theming** — match VS Code light/dark themes
- [ ] **Export** — save office scene as GIF or video
- [ ] **Accessibility** — screen reader descriptions for agent actions

---

## License

MIT — see [LICENSE](LICENSE) for details.
