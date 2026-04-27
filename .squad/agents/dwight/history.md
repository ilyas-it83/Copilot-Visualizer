# Project Context

- **Owner:** Ilyas
- **Project:** Copilot-Visualizer — VS Code extension that reads GitHub Copilot logs (CLI, Chat, inline completions) and visualizes agent actions as virtual AI agents working in an animated office setup
- **Stack:** TypeScript, VS Code Extension API, Webview (Canvas/2D), Node.js
- **Log Sources:** GitHub Copilot CLI (~/.copilot/), Copilot Chat, inline completion logs
- **Created:** 2026-04-27

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- **2026-04-27:** Scaffolded the full VS Code extension backend. Structure: `src/extension.ts` (entry), `src/types/` (5 files), `src/services/` (3 files), `src/parsers/` (5 files), `src/providers/` (1 file). Build uses esbuild (35KB bundle, 3ms). TypeScript strict mode passes with zero errors.
- CLI logs on this machine use `events.jsonl` (JSONL format) — one JSON object per line with `type` field like `session.start`, `hook.start`, `hook.end`. The CliParser handles both JSONL and conversation.json formats.
- Used a simple counter+timestamp ID generator instead of adding a uuid dependency — keeps the bundle lean and avoids native module issues in VS Code extension host.
- The webview HTML in `officeViewProvider.ts` is a placeholder shell. Jim owns `src/webview/` and will provide the Canvas 2D rendering. The shell includes CSP, nonce-based script execution, and the acquireVsCodeApi() bridge.

### 2026-04-27 — Build Complete: Extension Backend Ready

**Cross-team context (from Jim, Pam):**
- Jim's webview integrates with Dwight's MessageBridge (typed postMessage protocol)
- Pam's 82 passing tests validate EventStore, parsers, and LogDiscovery interfaces
- Full stack (host + webview + tests) = 0 TypeScript errors, all tests green
- Architecture: Stateful extension host ↔ stateless webview via postMessage
- Integration point: Jim's Canvas 2D rendering consumes events from Dwight's EventStore
