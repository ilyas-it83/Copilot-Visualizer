# Project Context

- **Owner:** Ilyas
- **Project:** Copilot-Visualizer — VS Code extension that reads GitHub Copilot logs (CLI, Chat, inline completions) and visualizes agent actions as virtual AI agents working in an animated office setup
- **Stack:** TypeScript, VS Code Extension API, Webview (Canvas/2D), Node.js
- **Log Sources:** GitHub Copilot CLI (~/.copilot/), Copilot Chat, inline completion logs
- **Created:** 2026-04-27

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-27 — Architecture: Extension Host State + Canvas Rendering

From Michael's architecture decisions:
- **State ownership:** Extension Host (authoritative) ↔ postMessage ↔ Webview (stateless renderer)
- **Rendering:** Canvas 2D API required for 60fps multi-sprite animation
- **Parsing layer:** Unified `CopilotEvent` interface normalizes all sources (CLI, Chat, Inline)
- **Storage:** In-memory event array (default 5K cap) — no database for bounded sessions
- **Implication for UI:** Webview is fully stateless; all complex state logic lives in extension host. Scene reconstruction on tab reload is cheap — just postMessage current state.
- **Accessibility:** Custom hit-testing and ARIA labels required on canvas container (DOM/SVG accessibility lost)

