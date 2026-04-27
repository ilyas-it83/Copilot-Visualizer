# Project Context

- **Owner:** Ilyas
- **Project:** Copilot-Visualizer — VS Code extension that reads GitHub Copilot logs (CLI, Chat, inline completions) and visualizes agent actions as virtual AI agents working in an animated office setup
- **Stack:** TypeScript, VS Code Extension API, Webview (Canvas/2D), Node.js
- **Log Sources:** GitHub Copilot CLI (~/.copilot/), Copilot Chat, inline completion logs
- **Created:** 2026-04-27

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- **2026-04-27 (session 2)**: Rich simulation overhaul — agents now have distinct appearances (8 hair styles, per-index colors, role badges 🔧💬⌨️), desk nameplates, staggered door entrance on session load with auto-play. Added: activity log panel (bottom-left DOM overlay, monospace, max 50 entries), interaction lines (animated dashed arcs with moving dots between agents during handoff), thought clouds (ellipse + connecting bubbles), code-line animations on monitor when typing, magnifying glass sweep when searching, idle bob/look-around. OfficeViewProvider HTML now includes #activity-log and #loading-overlay elements. main.ts gracefully handles missing DOM elements from the older session-picker/timeline layout. Pre-existing TS errors in fileWatcher.ts (not mine). Build output: extension.js 31KB, webview.js 61KB.

- **2026-04-27 (session 3)**: CRITICAL PIVOT to real-time monitoring. Ripped out all session playback (AnimationController, Timeline, SessionPicker, EventInspector). New architecture: extension host streams `live-event` and `agent-appeared` messages. Webview is now purely live — agents auto-appear when new activity is detected, events animate immediately via `LiveEventQueue` (rate-limited so animations don't pile up). Layout: status bar (top) → canvas (middle) → activity log (bottom). New files: `ui/LiveEventQueue.ts`, `ui/ActivityLog.ts`, `ui/StatusBar.ts`. Deleted: `animation/AnimationController.ts`, `ui/Timeline.ts`, `ui/SessionPicker.ts`, `ui/EventInspector.ts`. Agent door-entrance on first detection. Build: extension.js 30KB, webview.js 47KB.

- **2026-04-27**: Built entire webview system (14 files). All Canvas 2D, zero image assets. Structure: types.ts, MessageHandler, scene/ (OfficeScene, OfficeLayout with BFS pathfinding, Renderer with offscreen caching), agents/ (Agent state machine, AgentRenderer pixel-art characters, SpeechBubble), animation/ (AnimationController event queue, EventAnimator maps events→animations, Tweener easing utils), ui/ (Timeline HTML overlay with scrubber, EventInspector side panel, SessionPicker dropdown, styles.css dark theme). TypeScript compiles clean. Webview communicates with extension host via postMessage protocol defined in types.ts.

### 2026-04-27 — Architecture: Extension Host State + Canvas Rendering

From Michael's architecture decisions:
- **State ownership:** Extension Host (authoritative) ↔ postMessage ↔ Webview (stateless renderer)
- **Rendering:** Canvas 2D API required for 60fps multi-sprite animation
- **Parsing layer:** Unified `CopilotEvent` interface normalizes all sources (CLI, Chat, Inline)
- **Storage:** In-memory event array (default 5K cap) — no database for bounded sessions
- **Implication for UI:** Webview is fully stateless; all complex state logic lives in extension host. Scene reconstruction on tab reload is cheap — just postMessage current state.
- **Accessibility:** Custom hit-testing and ARIA labels required on canvas container (DOM/SVG accessibility lost)

### 2026-04-27 — Build Complete: Webview Ready for Integration

**Cross-team context (from Dwight, Pam):**
- Dwight's extension backend provides MessageBridge types and EventStore interface
- Pam's tests validate end-to-end event flow (CLI → Parser → EventStore → postMessage → Webview)
- All 82 tests passing; full stack = 0 TypeScript errors
- Integration point: EventAnimator consumes Dwight's CopilotEvent stream from postMessage
- Data flow: Extension Host (state authoritative) → postMessage JSON → Webview reconstruct scene

