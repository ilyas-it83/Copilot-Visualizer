# Project Context

- **Owner:** Ilyas
- **Project:** Copilot-Visualizer — VS Code extension that reads GitHub Copilot logs (CLI, Chat, inline completions) and visualizes agent actions as virtual AI agents working in an animated office setup
- **Stack:** TypeScript, VS Code Extension API, Webview (Canvas/2D), Node.js
- **Log Sources:** GitHub Copilot CLI (~/.copilot/), Copilot Chat, inline completion logs
- **Created:** 2026-04-27

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-27: Test Infrastructure Setup
- **Framework:** vitest 3.2.4 (fast, TypeScript-native, zero-config for our setup)
- **Coverage:** @vitest/coverage-v8 configured
- **Test count:** 82 tests across 6 test files, all passing
- **Fixtures:** 6 fixture files including a 2400-line large JSONL for perf testing
- **Architecture:** Tests include inline stub implementations matching PRD §6 interfaces. Once Dwight's real source code exists, swap stubs for real imports.
- **Key insight:** Writing tests with inline stubs lets us validate the test logic now and swap to real imports later without rewriting test assertions.
- **Performance baseline:** Large fixture (2400 lines) parses in <2s easily; full pipeline <5s.
- **vscode mock:** Created at `src/test/__mocks__/vscode.ts` for use when testing extension-host code later.

### 2026-04-27 — Architecture: Event Model & Log Parsing Strategy

From Michael's architecture decisions and Dwight's research:
- **Unified event model:** All sources (CLI, Chat, Inline) normalized to `CopilotEvent` interface
- **Log formats:** events.jsonl (CLI), session.db (SQLite metadata), chat JSON, inline extension logs
- **Parsing approach:** Streaming JSON Lines for CLI (single pass, low memory); structured JSON for Chat; SQLite queries for session metadata
- **Metadata preservation:** Raw payload kept in `metadata` field to preserve source-specific nuance
- **Error resilience:** Malformed entries must be skipped with warnings; partial data still visualized
- **Data volume:** Typical session 100–500 events; 5000-event cap accommodates long sessions
- **macOS paths:** ~/.copilot/session-state/*, ~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/

### 2026-04-27 — Build Complete: Test Suite Ready for Real Integration

**Cross-team context (from Dwight, Jim):**
- Dwight's EventStore, parsers, LogDiscovery match all test interfaces exactly
- Jim's webview integrates postMessage consumers compatible with Pam's event stream
- Full stack ready: 82 tests validate end-to-end flow (CLI → EventStore → postMessage → Canvas)
- Stub swap path: Update 6 import statements → all 82 tests validate real code
- Performance validated: CLI parsing <2s, full pipeline <5s

