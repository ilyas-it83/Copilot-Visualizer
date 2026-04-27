# Squad Decisions

## Active Decisions

### Architecture Decision: Copilot Visualizer Core Architecture

**Decision by:** Michael (Lead/Architect)  
**Date:** 2026-04-27  
**Status:** Approved

#### 1. Canvas 2D for rendering (not DOM/SVG)

**Choice:** Use HTML5 Canvas 2D API for the office scene.  
**Rationale:** Multiple animated sprites (agents walking, typing, speech bubbles) require consistent 60fps. DOM manipulation and SVG become performance bottlenecks with many simultaneous animations. Canvas gives us direct control over the render loop.  
**Trade-off:** Lose built-in accessibility and DOM event handling. Mitigate with custom hit-testing and ARIA labels on canvas container.

#### 2. Extension Host owns all state

**Choice:** All log parsing, event storage, and session state lives in the extension host. Webview is a pure renderer.  
**Rationale:** VS Code webviews can be destroyed at any time (tab switches, reloads). Keeping state in the extension host means we never lose data. Webview reconstruction is cheap — just re-send current state.  
**Implication:** Must serialize all scene state as JSON for postMessage. Keep payloads minimal.

#### 3. Unified event model across log sources

**Choice:** All log sources (CLI, Chat, Inline) are parsed into a single `CopilotEvent` interface.  
**Rationale:** The visualization layer shouldn't know or care where an event came from. Normalization at the parsing layer means the scene engine has one API to work with.  
**Trade-off:** Some source-specific nuance is lost. Mitigate by preserving raw payload in `metadata` field.

#### 4. Session-based architecture (not real-time in v1)

**Choice:** v1 visualizes completed sessions. No live streaming.  
**Rationale:** Real-time file watching, incremental parsing, and streaming animations add significant complexity. The core value (understanding what Copilot did) is served just as well by post-hoc visualization. Live streaming is a v2 feature.

#### 5. In-memory event store (no database)

**Choice:** Store events in a typed array in the extension host process.  
**Rationale:** Copilot sessions are bounded — even long ones are typically <10K events (<5MB). An in-memory store with a configurable cap (default 5000) is simpler and faster than SQLite or any persistence layer.  
**Limit:** Cap at 5000 events by default, configurable via settings.

#### 6. Platform-specific path resolution

**Choice:** Use `os.platform()` to resolve log paths, with user-configurable overrides.  
**Rationale:** Copilot stores logs in different OS-specific locations. Hard-coding all known paths and detecting the platform is the most reliable approach for v1. User settings provide escape hatch for non-standard setups.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
