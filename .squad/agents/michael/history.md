# Project Context

- **Owner:** Ilyas
- **Project:** Copilot-Visualizer — VS Code extension that reads GitHub Copilot logs (CLI, Chat, inline completions) and visualizes agent actions as virtual AI agents working in an animated office setup
- **Stack:** TypeScript, VS Code Extension API, Webview (Canvas/2D), Node.js
- **Log Sources:** GitHub Copilot CLI (~/.copilot/), Copilot Chat, inline completion logs
- **Created:** 2026-04-27

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-27 — PRD & Architecture Established

- **Architecture:** Extension Host (state owner) ↔ postMessage bridge ↔ Webview (Canvas 2D renderer, stateless)
- **Rendering:** Canvas 2D chosen over DOM/SVG for 60fps multi-sprite animation performance
- **Data model:** Unified `CopilotEvent` interface normalizes all log sources (CLI, Chat, Inline)
- **Storage:** In-memory event store, capped at 5000 events default — no database needed for bounded sessions
- **v1 scope:** Post-hoc session visualization only. Real-time streaming deferred to v2.
- **Key files:** `docs/PRD.md`, `docs/USER-STORIES.md`
- **Log paths:** CLI: `~/.copilot/session-state/*/`, Chat: globalStorage `github.copilot-chat/`, Inline: extension output logs
- **User stories:** 20 stories across 6 epics — Log Discovery, Office Scene, Agent Viz, Timeline, Inspection, Extension UX
- **Decision record:** `.squad/decisions/inbox/michael-prd-architecture.md`
