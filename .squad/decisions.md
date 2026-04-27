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

### Decision: Extension Build Tooling & Architecture

**Author:** Dwight (Core Dev)  
**Date:** 2026-04-27  
**Status:** Implemented

#### Context
Extension host side needed a bundler, module format, and overall build strategy.

#### Decisions
1. **esbuild over webpack** — 3ms builds, zero config, produces 35KB bundle. No webpack complexity needed.
2. **CommonJS module format** — Required by VS Code extension host. tsconfig targets ES2020 but outputs CJS.
3. **No UUID dependency** — Counter+timestamp ID generator avoids native module issues, keeps bundle lean.
4. **Stateless webview pattern** — All session state in extension host (EventStore). Webview destroyed/recreated without data loss via typed postMessage bridge.
5. **Parser tolerance** — All parsers use try/catch at line level, skip malformed data. Future Copilot versions won't crash.

#### Impact
- Jim's webview must use `MessageBridge` types from `src/types/messages.ts`
- Webview HTML shell (`officeViewProvider.ts`) has CSP and nonce; Jim's scripts load through that mechanism

### Decision: Webview Architecture — No Image Assets, Waypoint Pathfinding

**Author:** Jim (Frontend Dev)  
**Date:** 2026-04-27  
**Status:** Implemented

#### Context
Webview renders animated office with agents. Options: sprite sheets, SVGs, or Canvas 2D primitives.

#### Decisions
1. **Pure Canvas 2D drawing** — Agents are colored rectangles with features drawn on (head circle, body rect, legs). No external image assets.
2. **Waypoint-based pathfinding** — BFS over ~15 waypoints. A* overkill for office scale.
3. **Offscreen canvas caching** — Static office background pre-rendered to offscreen canvas, redrawn only on resize/zoom.
4. **HTML overlay for UI controls** — Timeline bar, session picker, event inspector are DOM elements overlaid on canvas. CSS styling, accessibility, easy input handling without canvas hit-testing.

#### Impact
- Dwight's extension host only postMessages events to webview—no shared rendering state.
- Adding furniture = add case to `OfficeScene.drawFurniture()` + waypoint.
- Agent appearance determined by `LogSource` color (CLI=blue, Chat=green, Inline=orange).

### Decision: Test Framework — Vitest with Stub-First Pattern

**Author:** Pam (Tester)  
**Date:** 2026-04-27  
**Status:** Implemented

#### Context
Source code built in parallel by Dwight/Jim. Tests needed before source existed.

#### Decisions
1. **vitest framework** — Fast, TS-native, no compile step needed.
2. **Inline stub implementations** — Tests include stubs matching PRD §6 interfaces.
3. **Stub swap strategy** — Once real source lands, replace stubs with `import { X } from '../../module'`. Test assertions unchanged.

#### Rationale
- Tests define expected API contract (TDD).
- All 82 tests pass, validating test logic itself.
- When Dwight's code lands, tests become real contract validators immediately.

#### Impact
- `package.json` has `vitest` and `@vitest/coverage-v8` in devDependencies.
- `vitest.config.ts` at project root.
- Test scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
