# Project Context

- **Owner:** Ilyas
- **Project:** Copilot-Visualizer — VS Code extension that reads GitHub Copilot logs (CLI, Chat, inline completions) and visualizes agent actions as virtual AI agents working in an animated office setup
- **Stack:** TypeScript, VS Code Extension API, Webview (Canvas/2D), Node.js
- **Log Sources:** GitHub Copilot CLI (~/.copilot/), Copilot Chat, inline completion logs
- **Created:** 2026-04-27

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

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

