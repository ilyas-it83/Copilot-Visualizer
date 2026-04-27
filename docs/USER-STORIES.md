# Copilot Visualizer — User Stories

> Organized by epic. Each story follows: As a [role], I want [action], so that [benefit].

---

## Epic 1: Log Discovery & Parsing

### US-1.1: Auto-detect Copilot CLI logs

As a developer, I want the extension to automatically find my Copilot CLI session logs, so that I don't have to manually locate or configure log paths.

**Acceptance Criteria:**
- [ ] Extension scans `~/.copilot/session-state/` on activation
- [ ] Handles macOS, Linux, and Windows paths correctly
- [ ] Displays found sessions sorted by most recent first
- [ ] Shows session count in status notification

### US-1.2: Auto-detect Copilot Chat logs

As a developer, I want the extension to find my Copilot Chat conversation history, so that I can visualize chat interactions alongside CLI activity.

**Acceptance Criteria:**
- [ ] Extension scans the VS Code globalStorage path for `github.copilot-chat`
- [ ] Handles platform-specific paths (macOS, Linux, Windows)
- [ ] Parses conversation structure into chat message events
- [ ] Gracefully handles missing chat extension (shows "Chat logs not found")

### US-1.3: Handle missing or empty log directories

As a developer who just installed Copilot, I want a helpful message when no logs are found, so that I understand what to do next.

**Acceptance Criteria:**
- [ ] Shows informational message: "No Copilot logs found. Use Copilot CLI or Chat to generate activity."
- [ ] Provides link to Copilot CLI documentation
- [ ] Does not throw errors or show empty broken UI
- [ ] Re-checks on manual refresh command

### US-1.4: Handle corrupted or malformed log files

As a developer, I want the parser to skip corrupted log entries without crashing, so that partial data is still visualized.

**Acceptance Criteria:**
- [ ] Malformed JSON lines are skipped with a warning
- [ ] Partial sessions still display (events before corruption)
- [ ] Warning indicator shows "X events skipped due to parse errors"
- [ ] No unhandled exceptions from parsing

### US-1.5: Parse large sessions efficiently

As a developer with long CLI sessions (1000+ events), I want logs to parse quickly, so that I'm not waiting to see the visualization.

**Acceptance Criteria:**
- [ ] 1000 events parse in under 2 seconds
- [ ] 5000 events parse in under 5 seconds
- [ ] Progress indicator shown during parsing
- [ ] Events load incrementally (first events appear before all are parsed)

### US-1.6: Custom log path configuration

As a developer with a non-standard setup, I want to configure custom log paths, so that the extension works with my directory structure.

**Acceptance Criteria:**
- [ ] Settings allow adding custom CLI log paths
- [ ] Settings allow adding custom Chat log paths
- [ ] Custom paths are validated on save (shows error if directory doesn't exist)
- [ ] Custom paths are used in addition to auto-detected paths

---

## Epic 2: Office Scene

### US-2.1: View the office environment

As a developer, I want to see a 2D office scene with desks, computers, and work areas, so that the visualization has a coherent visual metaphor.

**Acceptance Criteria:**
- [ ] Office scene renders in webview panel with desks, terminal station, file cabinet, meeting table
- [ ] Scene is visually clear and readable at default zoom
- [ ] Office layout accommodates up to 6 agent workstations
- [ ] Scene renders at 60fps on standard hardware

### US-2.2: Zoom and pan the office

As a developer viewing a complex session, I want to zoom in/out and pan around the office, so that I can focus on specific agents or see the full picture.

**Acceptance Criteria:**
- [ ] Mouse wheel zooms in/out (with limits)
- [ ] Click-and-drag pans the view
- [ ] "Fit to screen" button resets zoom/pan
- [ ] Zoom level persists during session viewing

### US-2.3: Office locations map to Copilot actions

As a developer, I want different office areas to represent different Copilot activities, so that the visualization is intuitive.

**Acceptance Criteria:**
- [ ] Terminal area → bash/shell tool calls
- [ ] File cabinet → file read operations
- [ ] Desk/computer → code editing, completions
- [ ] Meeting table → multi-agent conversations, handoffs
- [ ] Search station → grep, glob, code search operations
- [ ] Whiteboard → planning, thinking events

---

## Epic 3: Agent Visualization

### US-3.1: See agents as distinct characters

As a developer, I want each Copilot agent/session to appear as a unique character, so that I can distinguish between different agents.

**Acceptance Criteria:**
- [ ] Each agent has a distinct sprite/color
- [ ] Agent name label displays below character
- [ ] CLI agents, Chat agents, and Inline agents have visually different character types
- [ ] Up to 6 agents can appear simultaneously without visual overlap

### US-3.2: Watch agents perform actions

As a developer, I want to see agents walk to locations and perform animations, so that I can understand what tool or action they're executing.

**Acceptance Criteria:**
- [ ] Agents smoothly walk between office locations (no teleporting)
- [ ] Typing animation plays when agent writes code or makes edits
- [ ] Reading animation plays when agent reads files
- [ ] Searching animation plays when agent uses grep/glob
- [ ] Animations are smooth and frame-rate independent

### US-3.3: See speech bubbles for conversations

As a developer, I want to see speech/thought bubbles over agents, so that I can read their messages and thoughts.

**Acceptance Criteria:**
- [ ] Chat messages show as speech bubbles (user messages in one style, assistant in another)
- [ ] Thought bubbles appear during "thinking" events
- [ ] Tool call descriptions show briefly during execution
- [ ] Bubbles auto-dismiss after a readable duration
- [ ] Long messages are truncated with "..." (full text in inspector)

### US-3.4: Agent idle states

As a developer, I want agents to have idle animations when not actively working, so that the scene feels alive.

**Acceptance Criteria:**
- [ ] Idle agents sit at their desks with subtle animation (breathing, blinking)
- [ ] Agents return to their desk after completing an action
- [ ] No agents freeze in T-pose or disappear between events

---

## Epic 4: Timeline & Playback

### US-4.1: Play through a session timeline

As a developer, I want to press play and watch events unfold chronologically, so that I can see the full session narrative.

**Acceptance Criteria:**
- [ ] Play button starts chronological playback from current position
- [ ] Events trigger corresponding agent animations
- [ ] Playback respects real-time gaps (compressed — not waiting 30 seconds between events)
- [ ] Pause button freezes all animations and timeline

### US-4.2: Control playback speed

As a developer, I want to speed up or slow down playback, so that I can skim long sessions or study complex moments.

**Acceptance Criteria:**
- [ ] Speed options: 0.5x, 1x, 2x, 4x
- [ ] Speed change applies immediately without restart
- [ ] Current speed is visually indicated
- [ ] Default speed is configurable in settings

### US-4.3: Scrub the timeline

As a developer, I want to drag a scrubber to jump to any point in the session, so that I can quickly navigate to events of interest.

**Acceptance Criteria:**
- [ ] Timeline bar shows full session duration
- [ ] Dragging scrubber instantly updates agent positions and scene state
- [ ] Colored markers on timeline indicate event types
- [ ] Current position is clearly indicated

### US-4.4: Jump between events

As a developer, I want next/previous buttons to jump to the next event, so that I can step through events one at a time.

**Acceptance Criteria:**
- [ ] "Next" button advances to next event and plays its animation
- [ ] "Previous" button moves back to prior event
- [ ] Current event is highlighted in timeline
- [ ] Keyboard shortcuts (left/right arrows) work for navigation

---

## Epic 5: Event Inspection

### US-5.1: Click an agent to see current state

As a developer, I want to click on an agent character to see their current status and recent activity, so that I can understand what they're doing.

**Acceptance Criteria:**
- [ ] Clicking agent opens inspector panel
- [ ] Shows agent name, type, and current action
- [ ] Shows last 5 events for that agent
- [ ] Highlights the agent visually when selected

### US-5.2: Inspect a specific event's details

As a developer, I want to click on a timeline event to see its full payload, so that I can debug or understand exactly what happened.

**Acceptance Criteria:**
- [ ] Clicking a timeline marker opens event detail view
- [ ] Shows event type, timestamp, and duration
- [ ] For tool calls: shows tool name, input arguments, and output
- [ ] For chat messages: shows full message content
- [ ] Raw JSON payload available in collapsible section

### US-5.3: Navigate to source log file

As a developer, I want to click through to the source log file from any event, so that I can examine the raw data.

**Acceptance Criteria:**
- [ ] "Open Source" link on each event in inspector
- [ ] Opens the log file in VS Code editor
- [ ] Positions cursor at the relevant line/section if possible
- [ ] Works for all log sources (CLI, Chat, Inline)

### US-5.4: Filter events by type

As a developer, I want to filter the timeline to show only specific event types, so that I can focus on what matters.

**Acceptance Criteria:**
- [ ] Filter controls for: tool calls, chat messages, completions, errors
- [ ] Filters can be combined (e.g., tool calls AND errors)
- [ ] Filtered-out events are dimmed on timeline (not removed)
- [ ] Agent animations skip filtered events during playback

---

## Epic 6: Extension UX

### US-6.1: Open visualizer from command palette

As a developer, I want to open the visualizer from the VS Code command palette, so that I can access it the standard VS Code way.

**Acceptance Criteria:**
- [ ] Command "Copilot Visualizer: Open Office" appears in palette
- [ ] Opens the webview panel in an editor group
- [ ] If already open, focuses the existing panel (no duplicates)
- [ ] Works with keyboard shortcut (configurable)

### US-6.2: Status bar integration

As a developer, I want a status bar item showing Copilot Visualizer state, so that I have quick access without opening command palette.

**Acceptance Criteria:**
- [ ] Status bar icon appears when extension is active
- [ ] Shows number of available sessions as badge/tooltip
- [ ] Click opens the office view (or session picker if multiple)
- [ ] Updates when new sessions are detected

### US-6.3: Session picker

As a developer with multiple Copilot sessions, I want to pick which session to visualize, so that I can review specific interactions.

**Acceptance Criteria:**
- [ ] QuickPick dropdown with session list
- [ ] Sessions show: name/summary, timestamp, event count, source type
- [ ] Sorted by most recent first
- [ ] Search/filter within the list
- [ ] Selecting a session loads it into the office view

### US-6.4: Refresh logs manually

As a developer, I want to manually trigger a log refresh, so that newly created sessions appear without restarting VS Code.

**Acceptance Criteria:**
- [ ] "Copilot Visualizer: Refresh Logs" command available
- [ ] Refresh button visible in the webview panel toolbar
- [ ] Shows "Scanning..." indicator during refresh
- [ ] New sessions appear in session picker after refresh

### US-6.5: Handle webview lifecycle

As a developer, I want the visualizer to restore correctly when I switch tabs and come back, so that I don't lose my position.

**Acceptance Criteria:**
- [ ] Webview retains state when hidden (retainContextWhenHidden)
- [ ] If webview is disposed and reopened, restores last session and timeline position
- [ ] No memory leaks from repeated open/close cycles
- [ ] Serialization works for workspace state persistence
