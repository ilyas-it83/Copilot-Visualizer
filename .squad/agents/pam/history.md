# Project Context

- **Owner:** Ilyas
- **Project:** Copilot-Visualizer — VS Code extension that reads GitHub Copilot logs (CLI, Chat, inline completions) and visualizes agent actions as virtual AI agents working in an animated office setup
- **Stack:** TypeScript, VS Code Extension API, Webview (Canvas/2D), Node.js
- **Log Sources:** GitHub Copilot CLI (~/.copilot/), Copilot Chat, inline completion logs
- **Created:** 2026-04-27

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-27 — Architecture: Event Model & Log Parsing Strategy

From Michael's architecture decisions and Dwight's research:
- **Unified event model:** All sources (CLI, Chat, Inline) normalized to `CopilotEvent` interface
- **Log formats:** events.jsonl (CLI), session.db (SQLite metadata), chat JSON, inline extension logs
- **Parsing approach:** Streaming JSON Lines for CLI (single pass, low memory); structured JSON for Chat; SQLite queries for session metadata
- **Metadata preservation:** Raw payload kept in `metadata` field to preserve source-specific nuance
- **Error resilience:** Malformed entries must be skipped with warnings; partial data still visualized
- **Data volume:** Typical session 100–500 events; 5000-event cap accommodates long sessions
- **macOS paths:** ~/.copilot/session-state/*, ~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/

