"use strict";
(() => {
  // src/webview/scene/OfficeLayout.ts
  var OFFICE_WIDTH = 1e3;
  var OFFICE_HEIGHT = 600;
  var LOCATIONS = [
    // Top zone (y: 50-200): 6 desks spread wide
    { id: "desk", position: { x: 80, y: 120 }, size: { x: 55, y: 95, width: 80, height: 50 }, label: "Desk 1" },
    { id: "desk", position: { x: 220, y: 120 }, size: { x: 195, y: 95, width: 80, height: 50 }, label: "Desk 2" },
    { id: "desk", position: { x: 360, y: 120 }, size: { x: 335, y: 95, width: 80, height: 50 }, label: "Desk 3" },
    { id: "desk", position: { x: 540, y: 120 }, size: { x: 515, y: 95, width: 80, height: 50 }, label: "Desk 4" },
    { id: "desk", position: { x: 680, y: 120 }, size: { x: 655, y: 95, width: 80, height: 50 }, label: "Desk 5" },
    { id: "desk", position: { x: 820, y: 120 }, size: { x: 795, y: 95, width: 80, height: 50 }, label: "Desk 6" },
    // Middle-left zone (y: 220-350): Terminal, Search
    { id: "terminal", position: { x: 100, y: 280 }, size: { x: 65, y: 250, width: 100, height: 70 }, label: "Terminal" },
    { id: "search_station", position: { x: 260, y: 280 }, size: { x: 230, y: 255, width: 90, height: 60 }, label: "Search" },
    // Middle-right zone (y: 220-350): File cabinet, Whiteboard
    { id: "file_cabinet", position: { x: 780, y: 270 }, size: { x: 755, y: 245, width: 80, height: 60 }, label: "Files" },
    { id: "whiteboard", position: { x: 900, y: 260 }, size: { x: 880, y: 240, width: 90, height: 80 }, label: "Whiteboard" },
    // Bottom-left (y: 400-530): Coffee booth, Water cooler — inside Pantry
    { id: "coffee_machine", position: { x: 80, y: 470 }, size: { x: 50, y: 440, width: 70, height: 55 }, label: "Coffee" },
    { id: "water_cooler", position: { x: 200, y: 470 }, size: { x: 180, y: 445, width: 50, height: 55 }, label: "Water" },
    // Bottom-center (y: 400-530): Meeting table centered in Meeting Room
    { id: "meeting_table", position: { x: 480, y: 470 }, size: { x: 410, y: 430, width: 180, height: 100 }, label: "Meeting" },
    // Bottom-right (y: 400-530): Washroom
    { id: "washroom", position: { x: 880, y: 470 }, size: { x: 855, y: 445, width: 70, height: 60 }, label: "WC" },
    // Bottom edge: Door/entrance
    { id: "door", position: { x: 500, y: 575 }, size: { x: 470, y: 555, width: 60, height: 40 }, label: "Door" }
  ];
  function getDeskLocations() {
    return LOCATIONS.filter((l) => l.id === "desk");
  }
  var WAYPOINTS = [
    // Main corridors
    { id: "corridor-top", position: { x: 500, y: 200 }, connections: ["corridor-left", "corridor-right", "corridor-center", "desk-3", "desk-4"] },
    { id: "corridor-left", position: { x: 180, y: 280 }, connections: ["corridor-top", "corridor-center", "corridor-bottom-left", "desk-1", "desk-2", "terminal", "search"] },
    { id: "corridor-right", position: { x: 820, y: 280 }, connections: ["corridor-top", "corridor-center", "corridor-bottom-right", "desk-5", "desk-6", "files", "whiteboard"] },
    { id: "corridor-center", position: { x: 500, y: 360 }, connections: ["corridor-top", "corridor-left", "corridor-right", "corridor-bottom-left", "corridor-bottom-center", "corridor-bottom-right"] },
    // Bottom corridors
    { id: "corridor-bottom-left", position: { x: 180, y: 450 }, connections: ["corridor-left", "corridor-center", "coffee", "water_cooler"] },
    { id: "corridor-bottom-center", position: { x: 500, y: 450 }, connections: ["corridor-center", "corridor-bottom-left", "corridor-bottom-right", "meeting", "door"] },
    { id: "corridor-bottom-right", position: { x: 880, y: 450 }, connections: ["corridor-right", "corridor-center", "corridor-bottom-center", "washroom"] },
    // Desk waypoints
    { id: "desk-1", position: { x: 80, y: 170 }, connections: ["corridor-left"] },
    { id: "desk-2", position: { x: 220, y: 170 }, connections: ["corridor-left"] },
    { id: "desk-3", position: { x: 360, y: 170 }, connections: ["corridor-top"] },
    { id: "desk-4", position: { x: 540, y: 170 }, connections: ["corridor-top"] },
    { id: "desk-5", position: { x: 680, y: 170 }, connections: ["corridor-right"] },
    { id: "desk-6", position: { x: 820, y: 170 }, connections: ["corridor-right"] },
    // Location waypoints
    { id: "terminal", position: { x: 100, y: 310 }, connections: ["corridor-left"] },
    { id: "search", position: { x: 260, y: 310 }, connections: ["corridor-left"] },
    { id: "files", position: { x: 780, y: 300 }, connections: ["corridor-right"] },
    { id: "whiteboard", position: { x: 900, y: 290 }, connections: ["corridor-right"] },
    { id: "coffee", position: { x: 80, y: 470 }, connections: ["corridor-bottom-left"] },
    { id: "water_cooler", position: { x: 200, y: 470 }, connections: ["corridor-bottom-left"] },
    { id: "meeting", position: { x: 500, y: 490 }, connections: ["corridor-bottom-center"] },
    { id: "washroom", position: { x: 880, y: 490 }, connections: ["corridor-bottom-right"] },
    { id: "door", position: { x: 500, y: 565 }, connections: ["corridor-bottom-center"] }
  ];
  function findPath(fromId, toId) {
    if (fromId === toId)
      return [];
    const visited = /* @__PURE__ */ new Set();
    const queue = [{ id: fromId, path: [fromId] }];
    visited.add(fromId);
    while (queue.length > 0) {
      const current = queue.shift();
      const waypoint = WAYPOINTS.find((w) => w.id === current.id);
      if (!waypoint)
        continue;
      for (const neighbor of waypoint.connections) {
        if (neighbor === toId) {
          const fullPath = [...current.path, toId];
          return fullPath.map((id) => {
            const wp = WAYPOINTS.find((w) => w.id === id);
            return wp.position;
          });
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
    const from = WAYPOINTS.find((w) => w.id === fromId);
    const to = WAYPOINTS.find((w) => w.id === toId);
    if (from && to)
      return [from.position, to.position];
    return [];
  }
  function locationToWaypoint(location, index = 0) {
    switch (location) {
      case "desk":
        return `desk-${index + 1}`;
      case "terminal":
        return "terminal";
      case "file_cabinet":
        return "files";
      case "meeting_table":
        return "meeting";
      case "search_station":
        return "search";
      case "whiteboard":
        return "whiteboard";
      case "coffee_machine":
        return "coffee";
      case "water_cooler":
        return "water_cooler";
      case "washroom":
        return "washroom";
      case "door":
        return "door";
    }
  }

  // src/webview/agents/SpeechBubble.ts
  var SpeechBubble = class {
    constructor(text, type, duration) {
      this.opacity = 0;
      this.elapsed = 0;
      this.fadeInTime = 0.3;
      this.fadeOutTime = 0.5;
      this.text = text.length > 60 ? text.substring(0, 57) + "..." : text;
      this.type = type;
      this.duration = duration / 1e3;
    }
    get bgColor() {
      switch (this.type) {
        case "speech":
          return "#ffffff";
        case "tool":
          return "#e3f2fd";
        case "thought":
          return "#f5f5f5";
      }
    }
    get textColor() {
      switch (this.type) {
        case "speech":
          return "#333333";
        case "tool":
          return "#1565c0";
        case "thought":
          return "#666666";
      }
    }
    update(dt) {
      this.elapsed += dt;
      if (this.elapsed < this.fadeInTime) {
        this.opacity = this.elapsed / this.fadeInTime;
      } else if (this.elapsed > this.duration - this.fadeOutTime) {
        this.opacity = Math.max(0, (this.duration - this.elapsed) / this.fadeOutTime);
      } else {
        this.opacity = 1;
      }
    }
    isExpired() {
      return this.elapsed >= this.duration;
    }
  };

  // src/webview/agents/Agent.ts
  var WALK_SPEED = 120;
  var AGENT_COLORS = [
    "#4285f4",
    "#34a853",
    "#f4a026",
    "#ea4335",
    "#9c27b0",
    "#00bcd4",
    "#ff5722",
    "#607d8b"
  ];
  var SOURCE_BADGES = {
    cli: "\u{1F527}",
    chat: "\u{1F4AC}",
    inline: "\u2328\uFE0F"
  };
  var SOURCE_NAMES = {
    cli: "CLI Agent",
    chat: "Chat Agent",
    inline: "Inline Agent"
  };
  var IDLE_ACTIVITIES = [
    { location: "coffee_machine", status: "drinking_coffee", minDuration: 4, maxDuration: 6, bubble: "\u2615 Coffee break..." },
    { location: "water_cooler", status: "drinking_water", minDuration: 3, maxDuration: 5, bubble: "\u{1F4A7} Staying hydrated" },
    { location: "washroom", status: "in_washroom", minDuration: 5, maxDuration: 8 },
    { location: "meeting_table", status: "in_meeting", minDuration: 6, maxDuration: 12, bubble: "\u{1F5E3}\uFE0F Quick sync..." },
    { location: "whiteboard", status: "at_whiteboard", minDuration: 5, maxDuration: 10, bubble: "\u{1F4DD} Sketching ideas..." },
    { location: "file_cabinet", status: "browsing_files", minDuration: 4, maxDuration: 7, bubble: "\u{1F4C2} Looking up docs..." },
    { location: "desk", status: "watching_phone", minDuration: 5, maxDuration: 12, bubble: "\u{1F4F1} Scrolling..." },
    { location: "desk", status: "sleeping", minDuration: 8, maxDuration: 15, bubble: "\u{1F4A4} Zzzzz..." }
  ];
  var Agent = class {
    constructor(id, source, startPos, deskIndex, customName) {
      this.status = "idle";
      this.speechBubble = null;
      // waypoint id
      this.visible = true;
      this.path = [];
      this.pathIndex = 0;
      this.targetPosition = null;
      this.onArrival = null;
      // Idle roaming state
      this.idleRoamTimer = 0;
      // random 8-15s per agent
      this.isRoaming = false;
      this.roamActivityTimer = 0;
      this.roamActivityDuration = 0;
      // Animation state
      this.walkFrame = 0;
      this.walkTimer = 0;
      this.typingFrame = 0;
      this.typingTimer = 0;
      this.thinkingDots = 0;
      this.thinkingTimer = 0;
      // Idle animation state
      this.idleTimer = 0;
      this.idleBob = 0;
      this.idleLookDirection = 0;
      // -1 left, 0 center, 1 right
      this.idleLookTimer = 0;
      // Monitor code lines animation
      this.codeLineCount = 0;
      this.codeLineTimer = 0;
      // Search sweep animation
      this.searchSweepAngle = 0;
      this.id = id;
      this.source = source;
      this.position = { ...startPos };
      this.deskIndex = deskIndex;
      this.currentLocation = `desk-${deskIndex + 1}`;
      this.idleRoamDelay = 8 + Math.random() * 7;
      if (customName) {
        this._customName = customName;
      }
    }
    get color() {
      return AGENT_COLORS[this.deskIndex % AGENT_COLORS.length];
    }
    get secondaryColor() {
      const base = this.color;
      return base + "cc";
    }
    get roleBadge() {
      return SOURCE_BADGES[this.source];
    }
    get displayName() {
      if (this._customName)
        return this._customName;
      const id = this.id;
      if (id.includes("squad") || id.includes("Squad")) {
        const parts = id.split(/[-_./]/);
        const name = parts.find((p) => p.length > 2 && !p.match(/^[a-f0-9]+$/i));
        if (name)
          return name.charAt(0).toUpperCase() + name.slice(1);
      }
      const baseName = SOURCE_NAMES[this.source];
      if (this.deskIndex > 0) {
        return `${baseName} ${this.deskIndex + 1}`;
      }
      return baseName;
    }
    get shortName() {
      const name = this.displayName;
      return name.length > 14 ? name.substring(0, 12) + "\u2026" : name;
    }
    moveTo(location, locationIndex = 0, onArrival, isIdleRoam) {
      if (!isIdleRoam) {
        this.interruptIdleRoam();
      }
      const targetWaypoint = locationToWaypoint(location, locationIndex);
      const pathPoints = findPath(this.currentLocation, targetWaypoint);
      if (pathPoints.length === 0) {
        this.currentLocation = targetWaypoint;
        onArrival?.();
        return;
      }
      this.path = pathPoints;
      this.pathIndex = 0;
      this.targetPosition = this.path[0];
      this.status = "walking";
      this.onArrival = () => {
        this.currentLocation = targetWaypoint;
        onArrival?.();
      };
    }
    /** Interrupt any idle roaming — called when real Copilot events arrive */
    interruptIdleRoam() {
      if (this.isRoaming) {
        this.isRoaming = false;
        this.roamActivityTimer = 0;
        this.roamActivityDuration = 0;
        if (this.status === "walking" || this.status === "drinking_coffee" || this.status === "drinking_water" || this.status === "in_washroom" || this.status === "in_meeting" || this.status === "at_whiteboard" || this.status === "browsing_files" || this.status === "watching_phone" || this.status === "sleeping") {
          this.path = [];
          this.pathIndex = 0;
          this.targetPosition = null;
          this.onArrival = null;
          this.status = "idle";
        }
      }
      this.idleRoamTimer = 0;
    }
    setStatus(status) {
      this.status = status;
    }
    showSpeechBubble(text, type = "speech", duration = 3e3) {
      this.speechBubble = new SpeechBubble(text, type, duration);
    }
    hideSpeechBubble() {
      this.speechBubble = null;
    }
    update(dt) {
      if (this.status === "walking" && this.targetPosition) {
        this.updateMovement(dt);
      }
      this.updateIdleRoaming(dt);
      this.walkTimer += dt;
      if (this.walkTimer > 0.2) {
        this.walkFrame = (this.walkFrame + 1) % 4;
        this.walkTimer = 0;
      }
      this.typingTimer += dt;
      if (this.typingTimer > 0.1) {
        this.typingFrame = (this.typingFrame + 1) % 3;
        this.typingTimer = 0;
      }
      this.thinkingTimer += dt;
      if (this.thinkingTimer > 0.5) {
        this.thinkingDots = (this.thinkingDots + 1) % 4;
        this.thinkingTimer = 0;
      }
      if (this.status === "idle" && !this.isRoaming) {
        this.idleTimer += dt;
        this.idleBob = Math.sin(this.idleTimer * 1.5) * 0.5;
      } else {
        this.idleBob = 0;
      }
      this.idleLookDirection = 0;
      if (this.status === "typing") {
        this.codeLineTimer += dt;
        if (this.codeLineTimer > 0.3) {
          this.codeLineCount = (this.codeLineCount + 1) % 6;
          this.codeLineTimer = 0;
        }
      } else {
        this.codeLineCount = 0;
      }
      if (this.status === "searching") {
        this.searchSweepAngle += dt * 3;
      } else {
        this.searchSweepAngle = 0;
      }
      if (this.speechBubble) {
        this.speechBubble.update(dt);
        if (this.speechBubble.isExpired()) {
          this.speechBubble = null;
        }
      }
    }
    updateIdleRoaming(dt) {
      if (this.status === "idle" && !this.isRoaming) {
        this.idleRoamTimer += dt;
        if (this.idleRoamTimer >= this.idleRoamDelay) {
          this.idleRoamTimer = 0;
          this.triggerIdleActivity();
        }
      }
      if (this.isRoaming && this.status !== "walking" && this.status !== "idle") {
        this.roamActivityTimer += dt;
        if (this.roamActivityTimer >= this.roamActivityDuration) {
          this.roamActivityTimer = 0;
          this.roamActivityDuration = 0;
          this.moveTo("desk", this.deskIndex, () => {
            this.isRoaming = false;
            this.status = "idle";
            this.idleRoamDelay = 8 + Math.random() * 7;
          }, true);
        }
      }
    }
    triggerIdleActivity() {
      if (Math.random() < 0.2) {
        this.idleRoamDelay = 8 + Math.random() * 7;
        return;
      }
      const activity = IDLE_ACTIVITIES[Math.floor(Math.random() * IDLE_ACTIVITIES.length)];
      const duration = activity.minDuration + Math.random() * (activity.maxDuration - activity.minDuration);
      this.isRoaming = true;
      this.roamActivityDuration = duration;
      if (activity.location === "desk") {
        this.status = activity.status;
        if (activity.bubble) {
          this.showSpeechBubble(activity.bubble, "speech", duration * 1e3 * 0.6);
        }
        return;
      }
      const bubbleText = activity.bubble;
      this.moveTo(activity.location, 0, () => {
        this.status = activity.status;
        if (bubbleText) {
          this.showSpeechBubble(bubbleText, "speech", duration * 1e3 * 0.6);
        }
      }, true);
    }
    updateMovement(dt) {
      if (!this.targetPosition)
        return;
      const dx = this.targetPosition.x - this.position.x;
      const dy = this.targetPosition.y - this.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 3) {
        this.position = { ...this.targetPosition };
        this.pathIndex++;
        if (this.pathIndex >= this.path.length) {
          this.targetPosition = null;
          this.path = [];
          this.status = "idle";
          this.onArrival?.();
          this.onArrival = null;
        } else {
          this.targetPosition = this.path[this.pathIndex];
        }
      } else {
        const speed = WALK_SPEED * dt;
        const ratio = Math.min(speed / dist, 1);
        this.position.x += dx * ratio;
        this.position.y += dy * ratio;
      }
    }
    getWalkFrame() {
      return this.walkFrame;
    }
    getTypingFrame() {
      return this.typingFrame;
    }
    getThinkingDots() {
      return this.thinkingDots;
    }
    getIdleBob() {
      return this.idleBob;
    }
    getIdleLookDirection() {
      return this.idleLookDirection;
    }
    getCodeLineCount() {
      return this.codeLineCount;
    }
    getSearchSweepAngle() {
      return this.searchSweepAngle;
    }
    getIsRoaming() {
      return this.isRoaming;
    }
  };

  // src/webview/agents/AgentRenderer.ts
  var AGENT_WIDTH = 24;
  var AGENT_HEIGHT = 36;
  var HAIR_STYLES = [
    { color: "#3a2a1a", style: "short" },
    { color: "#1a1a2a", style: "spiky" },
    { color: "#8b4513", style: "long" },
    { color: "#666", style: "bald" },
    { color: "#d4a017", style: "mohawk" },
    { color: "#2a1a0a", style: "curly" },
    { color: "#4a2a1a", style: "ponytail" },
    { color: "#1a3a2a", style: "flat" }
  ];
  var BODY_SHAPES = [
    { type: "average", widthMul: 1, heightMul: 1 },
    { type: "tall", widthMul: 0.85, heightMul: 1.15 },
    { type: "stocky", widthMul: 1.25, heightMul: 0.9 },
    { type: "slim", widthMul: 0.75, heightMul: 1.05 },
    { type: "broad", widthMul: 1.3, heightMul: 1 },
    { type: "short", widthMul: 1, heightMul: 0.8 },
    { type: "average", widthMul: 1.1, heightMul: 0.95 },
    { type: "tall", widthMul: 0.9, heightMul: 1.1 }
  ];
  var AgentRenderer = class {
    constructor(renderer) {
      this.renderer = renderer;
    }
    draw(agent) {
      if (!agent.visible)
        return;
      if (agent.status === "in_washroom") {
        this.drawWashroomIndicator(this.renderer.context, agent);
        return;
      }
      const ctx = this.renderer.context;
      const { x, y } = agent.position;
      ctx.save();
      ctx.globalAlpha = 1;
      const idleBob = agent.getIdleBob();
      this.drawBody(ctx, agent, x, y + idleBob);
      this.drawHair(ctx, agent, x, y + idleBob);
      this.drawFeatures(ctx, agent, x, y + idleBob);
      this.drawRoleBadge(ctx, agent, x, y + idleBob);
      this.drawStatusIndicator(ctx, agent, x, y + idleBob);
      this.drawNameTag(ctx, agent, x, y + idleBob);
      if (agent.status === "typing") {
        this.drawCodeLines(ctx, agent, x, y + idleBob);
      }
      if (agent.status === "searching") {
        this.drawSearchSweep(ctx, agent, x, y + idleBob);
      }
      if (agent.status === "thinking") {
        this.drawThoughtCloud(ctx, agent, x, y + idleBob);
      }
      ctx.restore();
      if (agent.speechBubble && agent.speechBubble.opacity > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.85, agent.speechBubble.opacity);
        this.renderer.drawSpeechBubble(
          agent.position.x,
          agent.position.y - AGENT_HEIGHT / 2 - 10,
          agent.speechBubble.text,
          agent.speechBubble.bgColor,
          agent.speechBubble.textColor
        );
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      return;
    }
    /** Draw desk nameplate at the agent's assigned desk */
    drawDeskNameplate(ctx, agent, deskX, deskY) {
      const name = agent.shortName;
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      const tw = ctx.measureText(name).width;
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(deskX - tw / 2 - 4, deskY - 2, tw + 8, 12);
      ctx.fillStyle = agent.color;
      ctx.fillRect(deskX - tw / 2 - 4, deskY - 2, 3, 12);
      ctx.fillStyle = "#fff";
      ctx.fillText(name, deskX, deskY + 7);
    }
    drawBody(ctx, agent, x, y) {
      const bodyShape = BODY_SHAPES[agent.deskIndex % BODY_SHAPES.length];
      const hw = AGENT_WIDTH / 2 * bodyShape.widthMul;
      const hh = AGENT_HEIGHT / 2 * bodyShape.heightMul;
      let yOffset = 0;
      if (agent.status === "walking") {
        yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
      }
      const recline = agent.status === "relaxing" ? 3 : 0;
      ctx.fillStyle = "#ffd5b4";
      ctx.beginPath();
      ctx.arc(x + recline, y - hh + 8 + yOffset, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = agent.color;
      const bodyTop = y - hh + 18 + yOffset;
      ctx.beginPath();
      ctx.moveTo(x - hw / 2 + 3 + recline, bodyTop);
      ctx.lineTo(x + hw / 2 - 3 + recline, bodyTop);
      ctx.quadraticCurveTo(x + hw / 2 + recline, bodyTop, x + hw / 2 + recline, bodyTop + 3);
      ctx.lineTo(x + hw / 2 + recline, y + hh - 8 + yOffset);
      ctx.quadraticCurveTo(x + hw / 2 + recline, y + hh - 5 + yOffset, x + hw / 2 - 3 + recline, y + hh - 5 + yOffset);
      ctx.lineTo(x - hw / 2 + 3 + recline, y + hh - 5 + yOffset);
      ctx.quadraticCurveTo(x - hw / 2 + recline, y + hh - 5 + yOffset, x - hw / 2 + recline, y + hh - 8 + yOffset);
      ctx.lineTo(x - hw / 2 + recline, bodyTop + 3);
      ctx.quadraticCurveTo(x - hw / 2 + recline, bodyTop, x - hw / 2 + 3 + recline, bodyTop);
      ctx.fill();
      ctx.fillStyle = "#333";
      if (agent.status === "walking") {
        const legOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 3;
        ctx.fillRect(x - 4 + legOffset, y + hh - 5 + yOffset, 4, 8);
        ctx.fillRect(x - legOffset, y + hh - 5 + yOffset, 4, 8);
      } else if (agent.status === "relaxing") {
        ctx.fillRect(x - 3 + recline, y + hh - 5, 4, 5);
        ctx.fillRect(x + 3 + recline, y + hh - 5, 4, 5);
      } else {
        ctx.fillRect(x - 5, y + hh - 5, 4, 6);
        ctx.fillRect(x + 1, y + hh - 5, 4, 6);
      }
    }
    drawHair(ctx, agent, x, y) {
      const bodyShape = BODY_SHAPES[agent.deskIndex % BODY_SHAPES.length];
      const hh = AGENT_HEIGHT / 2 * bodyShape.heightMul;
      let yOffset = 0;
      if (agent.status === "walking") {
        yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
      }
      const recline = agent.status === "relaxing" ? 3 : 0;
      const headY = y - hh + 8 + yOffset;
      const hairDef = HAIR_STYLES[agent.deskIndex % HAIR_STYLES.length];
      ctx.fillStyle = hairDef.color;
      switch (hairDef.style) {
        case "short":
          ctx.beginPath();
          ctx.arc(x + recline, headY - 3, 9, Math.PI, 0);
          ctx.fill();
          break;
        case "spiky":
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * 4 - 2 + recline, headY - 5);
            ctx.lineTo(x + i * 4 + recline, headY - 11);
            ctx.lineTo(x + i * 4 + 2 + recline, headY - 5);
            ctx.fill();
          }
          break;
        case "long":
          ctx.beginPath();
          ctx.arc(x + recline, headY - 2, 10, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(x - 10 + recline, headY - 2, 4, 10);
          ctx.fillRect(x + 6 + recline, headY - 2, 4, 10);
          break;
        case "bald":
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.beginPath();
          ctx.arc(x - 3 + recline, headY - 5, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "mohawk":
          ctx.fillRect(x - 2 + recline, headY - 14, 4, 10);
          break;
        case "curly":
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(x - 6 + i * 3 + recline, headY - 6, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case "ponytail":
          ctx.beginPath();
          ctx.arc(x + recline, headY - 3, 9, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(x + 6 + recline, headY - 2, 3, 12);
          break;
        case "flat":
          ctx.fillRect(x - 9 + recline, headY - 7, 18, 4);
          break;
      }
    }
    drawFeatures(ctx, agent, x, y) {
      const bodyShape = BODY_SHAPES[agent.deskIndex % BODY_SHAPES.length];
      const hh = AGENT_HEIGHT / 2 * bodyShape.heightMul;
      let yOffset = 0;
      if (agent.status === "walking") {
        yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
      }
      const recline = agent.status === "relaxing" ? 3 : 0;
      const headY = y - hh + 8 + yOffset;
      const lookDir = agent.getIdleLookDirection();
      ctx.fillStyle = "#333";
      ctx.fillRect(x - 4 + lookDir + recline, headY - 2, 3, 3);
      ctx.fillRect(x + 1 + lookDir + recline, headY - 2, 3, 3);
      if (agent.status === "typing") {
        const handOffset = agent.getTypingFrame() * 2 - 2;
        ctx.fillStyle = "#ffd5b4";
        ctx.fillRect(x - 8 + handOffset, y + 2, 4, 4);
        ctx.fillRect(x + 4 - handOffset, y + 2, 4, 4);
      }
      if (agent.status === "drinking_coffee") {
        ctx.fillStyle = "#ffd5b4";
        ctx.fillRect(x + 8, y - 2, 4, 4);
        ctx.fillStyle = "#fff";
        ctx.fillRect(x + 12, y - 4, 6, 8);
      }
      if (agent.status === "drinking_water") {
        ctx.fillStyle = "#ffd5b4";
        ctx.fillRect(x + 8, y - 2, 4, 4);
        ctx.fillStyle = "#b3e5fc";
        ctx.fillRect(x + 12, y - 3, 5, 7);
      }
      if (agent.status === "watching_phone") {
        ctx.fillStyle = "#ffd5b4";
        ctx.fillRect(x + 6, y, 4, 4);
        ctx.fillStyle = "#333";
        ctx.fillRect(x + 10, y - 2, 7, 12);
        ctx.fillStyle = "#4fc3f7";
        ctx.fillRect(x + 11, y - 1, 5, 9);
      }
      if (agent.status === "sleeping") {
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 5 + lookDir, headY - 1);
        ctx.lineTo(x - 1 + lookDir, headY - 1);
        ctx.moveTo(x + 1 + lookDir, headY - 1);
        ctx.lineTo(x + 5 + lookDir, headY - 1);
        ctx.stroke();
      }
    }
    drawRoleBadge(ctx, agent, x, y) {
      const badgeY = y - AGENT_HEIGHT / 2 - 16;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(agent.roleBadge, x, badgeY);
    }
    drawStatusIndicator(ctx, agent, x, y) {
      const indicatorY = y - AGENT_HEIGHT / 2 - 4;
      switch (agent.status) {
        case "reading": {
          ctx.fillStyle = "#795548";
          ctx.fillRect(x - 5, indicatorY - 3, 10, 7);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, indicatorY - 3);
          ctx.lineTo(x, indicatorY + 4);
          ctx.stroke();
          break;
        }
        case "drinking_coffee": {
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u2615", x, indicatorY - 2);
          break;
        }
        case "drinking_water": {
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u{1F4A7}", x, indicatorY - 2);
          break;
        }
        case "relaxing": {
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u{1F60C}", x, indicatorY - 2);
          break;
        }
        case "watching_phone": {
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u{1F4F1}", x, indicatorY - 2);
          break;
        }
        case "sleeping": {
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          const zzzOffset = Math.sin(Date.now() / 600) * 3;
          ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 400) * 0.3;
          ctx.fillText("\u{1F4A4}", x + 8, indicatorY - 6 + zzzOffset);
          ctx.font = "bold 10px sans-serif";
          ctx.fillStyle = "#666";
          const z1 = Math.sin(Date.now() / 500) * 4;
          const z2 = Math.sin(Date.now() / 700 + 1) * 5;
          ctx.fillText("z", x + 14, indicatorY - 14 + z1);
          ctx.font = "bold 8px sans-serif";
          ctx.fillText("z", x + 20, indicatorY - 20 + z2);
          ctx.globalAlpha = 1;
          break;
        }
        case "in_meeting": {
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u{1F5E3}\uFE0F", x, indicatorY - 2);
          break;
        }
        case "at_whiteboard": {
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u{1F4DD}", x, indicatorY - 2);
          break;
        }
        case "browsing_files": {
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u{1F4C2}", x, indicatorY - 2);
          break;
        }
      }
    }
    /** Draw indicator at washroom door when agent is inside */
    drawWashroomIndicator(ctx, agent) {
      const washroomX = 890;
      const washroomY = 420;
      ctx.save();
      ctx.fillStyle = agent.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(washroomX, washroomY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "7px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.9;
      ctx.fillText(agent.shortName, washroomX, washroomY + 12);
      ctx.restore();
    }
    drawThoughtCloud(ctx, agent, x, y) {
      const cloudY = y - AGENT_HEIGHT / 2 - 30;
      const dots = agent.getThinkingDots();
      ctx.fillStyle = "rgba(245,245,245,0.95)";
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, cloudY, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 6, cloudY + 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 3, cloudY + 22, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#666";
      for (let i = 0; i < 3; i++) {
        const dotAlpha = i < dots ? 1 : 0.2;
        ctx.globalAlpha = dotAlpha;
        ctx.beginPath();
        ctx.arc(x - 8 + i * 8, cloudY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    drawCodeLines(ctx, agent, x, y) {
      const lineCount = agent.getCodeLineCount();
      const startX = x + 16;
      const startY = y - 20;
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < lineCount; i++) {
        const lineWidth = 10 + i * 7 % 15;
        ctx.fillStyle = i % 2 === 0 ? "#4ec9b0" : "#9cdcfe";
        ctx.fillRect(startX, startY + i * 5, lineWidth, 2.5);
      }
      ctx.globalAlpha = 1;
    }
    drawSearchSweep(ctx, agent, x, y) {
      const angle = agent.getSearchSweepAngle();
      const sweepX = x + Math.cos(angle) * 15;
      const sweepY = y - 10 + Math.sin(angle) * 10;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(sweepX, sweepY, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sweepX + 4, sweepY + 4);
      ctx.lineTo(sweepX + 8, sweepY + 8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawNameTag(ctx, agent, x, y) {
      const tagY = y + AGENT_HEIGHT / 2 + 10;
      const name = agent.shortName;
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      const textWidth = ctx.measureText(name).width;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      const padding = 3;
      ctx.beginPath();
      ctx.roundRect(x - textWidth / 2 - padding, tagY - 8, textWidth + padding * 2, 12, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(name, x, tagY);
    }
  };

  // src/webview/scene/Renderer.ts
  var Renderer = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.bgDirty = true;
      // Viewport/camera
      this.offsetX = 0;
      this.offsetY = 0;
      this.scale = 1;
      this.ctx = canvas.getContext("2d");
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    }
    get context() {
      return this.ctx;
    }
    get width() {
      return this.canvas.width;
    }
    get height() {
      return this.canvas.height;
    }
    resize(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      this.bgDirty = true;
    }
    invalidateBackground() {
      this.bgDirty = true;
    }
    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    // Transform world coordinates to screen coordinates
    applyCamera() {
      this.ctx.save();
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);
    }
    restoreCamera() {
      this.ctx.restore();
    }
    // Draw background to offscreen canvas (cached)
    drawBackground(drawFn) {
      if (this.bgDirty) {
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        this.offscreenCtx.save();
        this.offscreenCtx.translate(this.offsetX, this.offsetY);
        this.offscreenCtx.scale(this.scale, this.scale);
        drawFn(this.offscreenCtx);
        this.offscreenCtx.restore();
        this.bgDirty = false;
      }
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
    // Basic shape utilities
    fillRect(x, y, w, h, color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, w, h);
    }
    strokeRect(x, y, w, h, color, lineWidth = 1) {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeRect(x, y, w, h);
    }
    fillCircle(x, y, radius, color) {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    drawText(text, x, y, color, font = "12px monospace", align = "center") {
      this.ctx.fillStyle = color;
      this.ctx.font = font;
      this.ctx.textAlign = align;
      this.ctx.fillText(text, x, y);
    }
    drawRoundedRect(x, y, w, h, radius, fill, stroke) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + w - radius, y);
      this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      this.ctx.lineTo(x + w, y + h - radius);
      this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      this.ctx.lineTo(x + radius, y + h);
      this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();
      this.ctx.fillStyle = fill;
      this.ctx.fill();
      if (stroke) {
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
    // Speech bubble with pointer — large and readable, clamped to canvas
    drawSpeechBubble(x, y, text, bgColor, textColor) {
      const padding = 16;
      this.ctx.font = "bold 18px monospace";
      const lines = this.wrapText(text, 300);
      const lineHeight = 24;
      const w = Math.min(340, Math.max(...lines.map((l) => this.ctx.measureText(l).width)) + padding * 2);
      const h = lines.length * lineHeight + padding * 2;
      let bx = x - w / 2;
      let by = y - h - 20;
      let pointerAbove = false;
      if (bx < 4)
        bx = 4;
      if (bx + w > this.width - 4)
        bx = this.width - w - 4;
      if (by < 4) {
        by = y + 30;
        pointerAbove = true;
      }
      this.ctx.save();
      this.ctx.shadowColor = "rgba(0,0,0,0.25)";
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
      this.drawRoundedRect(bx, by, w, h, 10, bgColor, "#444");
      this.ctx.restore();
      this.ctx.strokeStyle = "#444";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.roundRectPath(bx, by, w, h, 10);
      this.ctx.stroke();
      const px = Math.max(bx + 14, Math.min(x, bx + w - 14));
      this.ctx.fillStyle = bgColor;
      this.ctx.beginPath();
      if (pointerAbove) {
        this.ctx.moveTo(px - 10, by);
        this.ctx.lineTo(px + 10, by);
        this.ctx.lineTo(px, by - 14);
      } else {
        this.ctx.moveTo(px - 10, by + h);
        this.ctx.lineTo(px + 10, by + h);
        this.ctx.lineTo(px, by + h + 14);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.strokeStyle = "#444";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      if (pointerAbove) {
        this.ctx.moveTo(px - 10, by);
        this.ctx.lineTo(px, by - 14);
        this.ctx.lineTo(px + 10, by);
      } else {
        this.ctx.moveTo(px - 10, by + h);
        this.ctx.lineTo(px, by + h + 14);
        this.ctx.lineTo(px + 10, by + h);
      }
      this.ctx.stroke();
      this.ctx.fillStyle = textColor;
      this.ctx.font = "bold 18px monospace";
      this.ctx.textAlign = "left";
      lines.forEach((line, i) => {
        this.ctx.fillText(line, bx + padding, by + padding + (i + 1) * lineHeight - 4);
      });
    }
    roundRectPath(x, y, w, h, r) {
      this.ctx.moveTo(x + r, y);
      this.ctx.lineTo(x + w - r, y);
      this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      this.ctx.lineTo(x + w, y + h - r);
      this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.ctx.lineTo(x + r, y + h);
      this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      this.ctx.lineTo(x, y + r);
      this.ctx.quadraticCurveTo(x, y, x + r, y);
      this.ctx.closePath();
    }
    wrapText(text, maxWidth) {
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (this.ctx.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine)
        lines.push(currentLine);
      return lines.length > 5 ? [...lines.slice(0, 5), "..."] : lines;
    }
  };

  // src/webview/scene/OfficeScene.ts
  var OfficeScene = class {
    constructor(canvas) {
      this.agents = /* @__PURE__ */ new Map();
      this.running = false;
      this.lastTime = 0;
      this.interactionLines = [];
      this.lastEventTime = 0;
      // tracks when last real Copilot event arrived
      this.noWorkBannerPulse = 0;
      this.loop = (time) => {
        if (!this.running)
          return;
        const dt = Math.min((time - this.lastTime) / 1e3, 0.05);
        this.lastTime = time;
        this.update(dt);
        this.render();
        requestAnimationFrame(this.loop);
      };
      this.renderer = new Renderer(canvas);
      this.agentRenderer = new AgentRenderer(this.renderer);
      this.fitToCanvas();
    }
    fitToCanvas() {
      const sx = this.renderer.width / OFFICE_WIDTH;
      const sy = this.renderer.height / OFFICE_HEIGHT;
      this.renderer.scale = Math.min(sx, sy, 1.5);
      this.renderer.offsetX = (this.renderer.width - OFFICE_WIDTH * this.renderer.scale) / 2;
      this.renderer.offsetY = (this.renderer.height - OFFICE_HEIGHT * this.renderer.scale) / 2;
      this.renderer.invalidateBackground();
    }
    resize(width, height) {
      this.renderer.resize(width, height);
      this.fitToCanvas();
    }
    start() {
      if (this.running)
        return;
      this.running = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
    stop() {
      this.running = false;
    }
    getAgent(id) {
      return this.agents.get(id);
    }
    addAgent(id, source, index, customName) {
      if (this.agents.has(id))
        return;
      if (this.agents.size >= 10)
        return;
      const desks = getDeskLocations();
      const deskIndex = index % desks.length;
      const desk = desks[deskIndex];
      const agent = new Agent(id, source, desk.position, deskIndex, customName);
      agent.currentLocation = `desk-${deskIndex + 1}`;
      agent.setStatus("idle");
      this.agents.set(id, agent);
      this.renderer.invalidateBackground();
    }
    getAllAgents() {
      return Array.from(this.agents.values());
    }
    /** Called when a real Copilot event is processed */
    notifyEventReceived() {
      this.lastEventTime = performance.now();
    }
    /** Check if any agent is doing real work (not idle/roaming) */
    isAnyAgentWorking() {
      const idleStatuses = /* @__PURE__ */ new Set([
        "idle",
        "walking",
        "drinking_coffee",
        "drinking_water",
        "in_washroom",
        "in_meeting",
        "at_whiteboard",
        "browsing_files",
        "watching_phone",
        "sleeping"
      ]);
      for (const agent of this.agents.values()) {
        if (!idleStatuses.has(agent.status))
          return true;
      }
      return false;
    }
    /** Add an interaction line between two agents */
    addInteractionLine(fromId, toId, color = "#4285f4", duration = 2) {
      this.interactionLines.push({
        fromAgent: fromId,
        toAgent: toId,
        progress: 0,
        duration,
        elapsed: 0,
        color
      });
    }
    update(dt) {
      for (const agent of this.agents.values()) {
        agent.update(dt);
      }
      this.interactionLines = this.interactionLines.filter((line) => {
        line.elapsed += dt;
        line.progress = Math.min(line.elapsed / line.duration, 1);
        return line.progress < 1;
      });
      this.noWorkBannerPulse += dt;
    }
    render() {
      this.renderer.clear();
      this.renderer.drawBackground((ctx) => this.drawOfficeBackground(ctx));
      this.renderer.applyCamera();
      this.drawInteractionLines();
      for (const agent of this.agents.values()) {
        this.agentRenderer.draw(agent);
      }
      this.renderer.restoreCamera();
      if (this.agents.size > 0 && !this.isAnyAgentWorking()) {
        this.drawNoWorkBanner();
      }
    }
    drawInteractionLines() {
      const ctx = this.renderer.context;
      for (const line of this.interactionLines) {
        const fromAgent = this.agents.get(line.fromAgent);
        const toAgent = this.agents.get(line.toAgent);
        if (!fromAgent || !toAgent)
          continue;
        const from = fromAgent.position;
        const to = toAgent.position;
        ctx.save();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1 - line.progress * 0.5;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -line.elapsed * 30;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 - 30;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y - 18);
        ctx.quadraticCurveTo(midX, midY - 20, to.x, to.y - 18);
        ctx.stroke();
        const t = line.elapsed * 2 % 1;
        const dotX = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
        const dotY = (1 - t) * (1 - t) * (from.y - 18) + 2 * (1 - t) * t * (midY - 20) + t * t * (to.y - 18);
        ctx.setLineDash([]);
        ctx.fillStyle = line.color;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    drawOfficeBackground(ctx) {
      ctx.fillStyle = "#f0ebe3";
      ctx.fillRect(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT);
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#5a4e3e";
      ctx.fillText("\u{1F3E2} Copilot Office", OFFICE_WIDTH / 2, 38);
      ctx.textAlign = "left";
      ctx.strokeStyle = "#e0dbd3";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < OFFICE_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, OFFICE_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < OFFICE_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(OFFICE_WIDTH, y);
        ctx.stroke();
      }
      this.drawPartitionWalls(ctx);
      for (const loc of LOCATIONS) {
        this.drawFurniture(ctx, loc);
      }
      const desks = getDeskLocations();
      for (const agent of this.agents.values()) {
        const desk = desks[agent.deskIndex];
        if (desk) {
          this.agentRenderer.drawDeskNameplate(
            ctx,
            agent,
            desk.size.x + desk.size.width / 2,
            desk.size.y - 4
          );
        }
      }
    }
    drawPartitionWalls(ctx) {
      const wallColor = "#8d7b68";
      const wallDark = "#6b5d4f";
      const wallWidth = 6;
      const doorGap = 40;
      const drawWall = (x1, y1, x2, y2) => {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.strokeStyle = wallColor;
        ctx.lineWidth = wallWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = "#a89580";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1 - wallWidth / 2 + 1);
        ctx.lineTo(x2, y2 - wallWidth / 2 + 1);
        ctx.stroke();
      };
      const drawDoorway = (x, y, isVertical) => {
        ctx.fillStyle = "#d4c5a9";
        if (isVertical) {
          ctx.fillRect(x - wallWidth / 2 - 1, y - doorGap / 2, wallWidth + 2, doorGap);
        } else {
          ctx.fillRect(x - doorGap / 2, y - wallWidth / 2 - 1, doorGap, wallWidth + 2);
        }
        ctx.fillStyle = wallDark;
        if (isVertical) {
          ctx.fillRect(x - wallWidth / 2, y - doorGap / 2 - 2, wallWidth, 4);
          ctx.fillRect(x - wallWidth / 2, y + doorGap / 2 - 2, wallWidth, 4);
        } else {
          ctx.fillRect(x - doorGap / 2 - 2, y - wallWidth / 2, 4, wallWidth);
          ctx.fillRect(x + doorGap / 2 - 2, y - wallWidth / 2, 4, wallWidth);
        }
      };
      const drawRoomLabel = (text, x, y) => {
        ctx.save();
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(90, 78, 62, 0.6)";
        ctx.fillText(text, x, y);
        ctx.restore();
      };
      ctx.fillStyle = "rgba(255, 243, 224, 0.5)";
      ctx.fillRect(0, 390, 270, 210);
      ctx.fillStyle = "rgba(232, 245, 233, 0.4)";
      ctx.fillRect(270, 390, 490, 210);
      ctx.fillStyle = "rgba(224, 247, 250, 0.5)";
      ctx.fillRect(760, 390, 240, 210);
      drawWall(0, 390, 100, 390);
      drawWall(100 + doorGap, 390, 270, 390);
      drawDoorway(100 + doorGap / 2, 390, false);
      drawWall(270, 390, 270, OFFICE_HEIGHT);
      drawRoomLabel("\u2615 Pantry", 135, 408);
      drawWall(270, 390, 480, 390);
      drawWall(480 + doorGap, 390, 760, 390);
      drawDoorway(480 + doorGap / 2, 390, false);
      drawWall(760, 390, 760, OFFICE_HEIGHT);
      drawRoomLabel("\u{1F5E3}\uFE0F Meeting Room", 515, 408);
      drawWall(760, 390, 850, 390);
      drawWall(850 + doorGap, 390, OFFICE_WIDTH, 390);
      drawDoorway(850 + doorGap / 2, 390, false);
      drawRoomLabel("\u{1F6BB} WC", 880, 408);
    }
    drawFurniture(ctx, loc) {
      const { size, label, id } = loc;
      switch (id) {
        case "desk":
          ctx.fillStyle = "#8b6914";
          ctx.fillRect(size.x, size.y, size.width, size.height);
          ctx.strokeStyle = "#6b4e0a";
          ctx.lineWidth = 1;
          ctx.strokeRect(size.x, size.y, size.width, size.height);
          ctx.fillStyle = "#2a2a2a";
          ctx.fillRect(size.x + size.width / 2 - 15, size.y + 5, 30, 22);
          ctx.fillStyle = "#1a73e8";
          ctx.fillRect(size.x + size.width / 2 - 13, size.y + 7, 26, 18);
          break;
        case "terminal":
          ctx.fillStyle = "#333";
          ctx.fillRect(size.x, size.y, size.width, size.height);
          ctx.fillStyle = "#0f0";
          ctx.fillRect(size.x + 5, size.y + 5, size.width - 10, size.height - 20);
          ctx.fillStyle = "#111";
          ctx.fillRect(size.x + 7, size.y + 7, size.width - 14, size.height - 24);
          ctx.fillStyle = "#0f0";
          ctx.font = "8px monospace";
          ctx.fillText("$ _", size.x + 12, size.y + 20);
          break;
        case "file_cabinet":
          ctx.fillStyle = "#7a7a7a";
          ctx.fillRect(size.x, size.y, size.width, size.height);
          for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = "#555";
            ctx.strokeRect(size.x + 3, size.y + 3 + i * 18, size.width - 6, 16);
            ctx.fillStyle = "#aaa";
            ctx.fillRect(size.x + size.width / 2 - 5, size.y + 9 + i * 18, 10, 4);
          }
          break;
        case "meeting_table":
          ctx.fillStyle = "#a0522d";
          ctx.beginPath();
          ctx.ellipse(size.x + size.width / 2, size.y + size.height / 2, size.width / 2, size.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#6b3410";
          ctx.lineWidth = 2;
          ctx.stroke();
          const chairs = [
            { x: size.x + size.width / 2, y: size.y - 10 },
            { x: size.x + size.width / 2, y: size.y + size.height + 10 },
            { x: size.x - 10, y: size.y + size.height / 2 },
            { x: size.x + size.width + 10, y: size.y + size.height / 2 }
          ];
          ctx.fillStyle = "#555";
          chairs.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        case "search_station":
          ctx.fillStyle = "#4a4a6a";
          ctx.fillRect(size.x, size.y, size.width, size.height);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(size.x + size.width / 2 - 5, size.y + size.height / 2 - 5, 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(size.x + size.width / 2 + 4, size.y + size.height / 2 + 4);
          ctx.lineTo(size.x + size.width / 2 + 14, size.y + size.height / 2 + 14);
          ctx.stroke();
          break;
        case "whiteboard":
          ctx.fillStyle = "#fff";
          ctx.fillRect(size.x, size.y, size.width, size.height);
          ctx.strokeStyle = "#999";
          ctx.lineWidth = 2;
          ctx.strokeRect(size.x, size.y, size.width, size.height);
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(size.x + 10, size.y + 15 + i * 16);
            ctx.lineTo(size.x + size.width - 10 - i * 17 % 30, size.y + 15 + i * 16);
            ctx.stroke();
          }
          break;
        case "coffee_machine":
          ctx.fillStyle = "#4a3520";
          ctx.fillRect(size.x, size.y, size.width, size.height);
          ctx.fillStyle = "#6b4c30";
          ctx.fillRect(size.x + 2, size.y + 2, size.width - 4, 12);
          ctx.fillStyle = "#fff";
          ctx.fillRect(size.x + size.width / 2 - 8, size.y + size.height - 22, 16, 14);
          ctx.strokeStyle = "#ccc";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(size.x + size.width / 2 - 3, size.y + size.height - 24);
          ctx.quadraticCurveTo(size.x + size.width / 2, size.y + size.height - 32, size.x + size.width / 2 + 3, size.y + size.height - 37);
          ctx.stroke();
          ctx.fillStyle = "#333";
          ctx.beginPath();
          ctx.arc(size.x + size.width / 2, size.y + size.height + 12, 7, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "water_cooler":
          ctx.fillStyle = "#e0e0e0";
          ctx.fillRect(size.x + 10, size.y + 25, size.width - 20, size.height - 25);
          ctx.fillStyle = "#4fc3f7";
          ctx.beginPath();
          ctx.moveTo(size.x + 15, size.y + 5);
          ctx.lineTo(size.x + size.width - 15, size.y + 5);
          ctx.lineTo(size.x + size.width - 12, size.y + 28);
          ctx.lineTo(size.x + 12, size.y + 28);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#0288d1";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = "#4fc3f7";
          ctx.fillRect(size.x + size.width / 2 - 5, size.y + 28, 10, 6);
          ctx.fillStyle = "#999";
          ctx.fillRect(size.x + size.width / 2 - 2, size.y + 36, 4, 8);
          break;
        case "washroom":
          ctx.fillStyle = "#8d6e63";
          ctx.fillRect(size.x, size.y, size.width, size.height);
          ctx.strokeStyle = "#5d4037";
          ctx.lineWidth = 2;
          ctx.strokeRect(size.x, size.y, size.width, size.height);
          ctx.fillStyle = "#daa520";
          ctx.beginPath();
          ctx.arc(size.x + size.width - 12, size.y + size.height / 2, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u{1F6BB}", size.x + size.width / 2, size.y + size.height / 2 + 4);
          break;
        case "door":
          ctx.fillStyle = "#654321";
          ctx.fillRect(size.x, size.y, size.width, size.height);
          ctx.fillStyle = "#daa520";
          ctx.beginPath();
          ctx.arc(size.x + size.width - 10, size.y + size.height / 2, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      const roomItems = ["washroom", "coffee_machine", "water_cooler", "meeting_table"];
      if (!roomItems.includes(id)) {
        ctx.fillStyle = "#555";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, size.x + size.width / 2, size.y + size.height + 20);
      }
    }
    drawNoWorkBanner() {
      const ctx = this.renderer.context;
      const w = this.renderer.width;
      ctx.save();
      const bannerH = 36;
      const bannerY = this.renderer.height - bannerH - 8;
      const pulse = 0.7 + Math.sin(this.noWorkBannerPulse * 2) * 0.15;
      ctx.fillStyle = `rgba(45, 45, 55, ${pulse * 0.85})`;
      const bannerW = 320;
      const bannerX = (w - bannerW) / 2;
      const radius = 18;
      ctx.beginPath();
      ctx.moveTo(bannerX + radius, bannerY);
      ctx.lineTo(bannerX + bannerW - radius, bannerY);
      ctx.quadraticCurveTo(bannerX + bannerW, bannerY, bannerX + bannerW, bannerY + radius);
      ctx.lineTo(bannerX + bannerW, bannerY + bannerH - radius);
      ctx.quadraticCurveTo(bannerX + bannerW, bannerY + bannerH, bannerX + bannerW - radius, bannerY + bannerH);
      ctx.lineTo(bannerX + radius, bannerY + bannerH);
      ctx.quadraticCurveTo(bannerX, bannerY + bannerH, bannerX, bannerY + bannerH - radius);
      ctx.lineTo(bannerX, bannerY + radius);
      ctx.quadraticCurveTo(bannerX, bannerY, bannerX + radius, bannerY);
      ctx.fill();
      ctx.strokeStyle = `rgba(100, 180, 255, ${pulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u{1F319}", bannerX + 28, bannerY + 24);
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = `rgba(200, 210, 230, ${pulse})`;
      ctx.fillText("No Active Work \u2014 Agents on Break", w / 2 + 8, bannerY + 23);
      ctx.restore();
    }
  };

  // src/webview/MessageHandler.ts
  var TEAM_ROSTER = [
    { id: "michael", name: "Michael", source: "cli", color: "#4285f4" },
    { id: "dwight", name: "Dwight", source: "cli", color: "#34a853" },
    { id: "jim", name: "Jim", source: "cli", color: "#fbbc05" },
    { id: "pam", name: "Pam", source: "cli", color: "#ea4335" },
    { id: "scribe", name: "Scribe", source: "cli", color: "#ab47bc" },
    { id: "ralph", name: "Ralph", source: "cli", color: "#00acc1" }
  ];
  var MAX_AGENTS = 10;
  var MessageHandler = class {
    // roster agents currently in the scene
    constructor(vscode, scene, liveEventQueue, activityLog, statusBar) {
      this.vscode = vscode;
      this.scene = scene;
      this.liveEventQueue = liveEventQueue;
      this.activityLog = activityLog;
      this.statusBar = statusBar;
      this.roundRobinIndex = 0;
      this.agentMapping = /* @__PURE__ */ new Map();
      // external agentId → roster agentId
      this.materializedAgents = /* @__PURE__ */ new Set();
      window.addEventListener("message", (e) => this.handleMessage(e.data));
    }
    /** Materialize a roster agent on-demand when work is assigned to them */
    materializeAgent(rosterId) {
      if (this.materializedAgents.has(rosterId))
        return;
      const member = TEAM_ROSTER.find((m) => m.id === rosterId);
      if (!member)
        return;
      const index = this.materializedAgents.size;
      this.scene.addAgent(member.id, member.source, index, member.name);
      this.materializedAgents.add(rosterId);
      this.activityLog.add(`${member.name} entered the office`, member.color);
    }
    /** Map an incoming agentId to a roster member via round-robin */
    resolveRosterAgent(externalAgentId) {
      const lower = externalAgentId.toLowerCase();
      for (const member of TEAM_ROSTER) {
        if (lower.includes(member.id)) {
          return member.id;
        }
      }
      if (this.agentMapping.has(externalAgentId)) {
        return this.agentMapping.get(externalAgentId);
      }
      const assigned = TEAM_ROSTER[this.roundRobinIndex % TEAM_ROSTER.length].id;
      this.roundRobinIndex++;
      this.agentMapping.set(externalAgentId, assigned);
      return assigned;
    }
    handleMessage(message) {
      switch (message.type) {
        case "live-event": {
          const event = message.event;
          const rosterAgentId = this.resolveRosterAgent(event.agentId);
          this.materializeAgent(rosterAgentId);
          const routedEvent = { ...event, agentId: rosterAgentId };
          this.liveEventQueue.push(routedEvent);
          this.scene.notifyEventReceived();
          break;
        }
        case "agent-appeared": {
          if (this.scene.getAllAgents().length >= MAX_AGENTS)
            break;
          const info = message.agent;
          const lower = info.id.toLowerCase();
          const isRosterMember = TEAM_ROSTER.some((m) => lower.includes(m.id));
          if (isRosterMember && !this.scene.getAgent(info.id)) {
            this.scene.addAgent(info.id, info.source, this.scene.getAllAgents().length, info.name);
          }
          break;
        }
        case "status-update": {
          const visibleCount = this.scene.getAllAgents().length;
          this.statusBar.update({ ...message.stats, agentCount: visibleCount });
          break;
        }
      }
    }
  };

  // src/webview/animation/EventAnimator.ts
  var EventAnimator = class {
    constructor(scene, activityLog) {
      this.scene = scene;
      this.activityLog = activityLog;
    }
    /**
     * Animate an event on the appropriate agent.
     * Returns estimated animation duration in ms.
     */
    animateEvent(event) {
      const agent = this.scene.getAgent(event.agentId);
      if (!agent)
        return 0;
      switch (event.type) {
        case "tool_call":
          return this.animateToolCall(agent, event);
        case "tool_result":
          return this.animateToolResult(agent, event);
        case "chat_message":
          return this.animateChatMessage(agent, event);
        case "completion":
          return this.animateCompletion(agent, event);
        case "agent_thinking":
          return this.animateThinking(agent, event);
        case "agent_handoff":
          return this.animateHandoff(agent, event);
        case "session_start":
          return this.animateSessionStart(agent, event);
        case "session_end":
          return this.animateSessionEnd(agent, event);
        case "error":
          return this.animateError(agent, event);
        default:
          return 500;
      }
    }
    animateToolCall(agent, event) {
      const toolName = event.toolName || event.metadata?.toolName || event.metadata?.tool || event.metadata?.data?.toolName || "";
      if (toolName.includes("bash") || toolName.includes("shell")) {
        agent.moveTo("terminal", 0, () => {
          agent.setStatus("typing");
          agent.showSpeechBubble(`$ ${this.truncate(toolName, 30)}`, "tool", 2500);
        });
        this.activityLog.add(`${agent.displayName} walked to terminal`, agent.color);
        setTimeout(() => {
          const cmd = event.metadata?.command || event.metadata?.data?.arguments?.command || toolName;
          this.activityLog.add(`${agent.displayName}: $ ${this.truncate(cmd, 40)}`, agent.color);
        }, 1e3);
        return 3e3;
      }
      if (toolName.includes("read") || toolName.includes("view") || toolName.includes("cat")) {
        agent.moveTo("file_cabinet", 0, () => {
          agent.setStatus("reading");
          const filePath = event.metadata?.path || event.metadata?.data?.arguments?.path || "file";
          agent.showSpeechBubble(`\u{1F4C4} ${this.truncate(filePath, 25)}`, "tool", 2e3);
        });
        this.activityLog.add(
          `${agent.displayName} reading ${this.truncate(event.metadata?.path || event.metadata?.data?.arguments?.path || "file", 30)}`,
          agent.color
        );
        return 2500;
      }
      if (toolName.includes("edit") || toolName.includes("create") || toolName.includes("write")) {
        agent.moveTo("desk", agent.deskIndex, () => {
          agent.setStatus("typing");
          agent.showSpeechBubble(`\u270F\uFE0F editing...`, "tool", 2e3);
        });
        this.activityLog.add(`${agent.displayName} editing code`, agent.color);
        return 2500;
      }
      if (toolName.includes("grep") || toolName.includes("glob") || toolName.includes("search") || toolName.includes("find")) {
        agent.moveTo("search_station", 0, () => {
          agent.setStatus("searching");
          agent.showSpeechBubble(`\u{1F50D} ${this.truncate(toolName, 25)}`, "tool", 2e3);
        });
        this.activityLog.add(`${agent.displayName} searching: ${this.truncate(toolName, 30)}`, agent.color);
        return 2500;
      }
      agent.moveTo("desk", agent.deskIndex, () => {
        agent.setStatus("typing");
        agent.showSpeechBubble(`\u{1F527} ${this.truncate(toolName, 30)}`, "tool", 2e3);
      });
      this.activityLog.add(`${agent.displayName} using tool: ${this.truncate(toolName, 25)}`, agent.color);
      return 2e3;
    }
    animateToolResult(agent, _event) {
      setTimeout(() => {
        agent.setStatus("idle");
        agent.moveTo("desk", agent.deskIndex);
      }, 500);
      return 1e3;
    }
    animateChatMessage(agent, event) {
      const content = event.metadata?.content ?? "...";
      const isUser = event.metadata?.role === "user";
      if (isUser) {
        agent.showSpeechBubble(content, "speech", 3e3);
        agent.setStatus("idle");
        this.activityLog.add(`User \u2192 ${agent.displayName}: "${this.truncate(content, 35)}"`, "#aaa");
      } else {
        agent.setStatus("talking");
        agent.showSpeechBubble(content, "speech", 3500);
        setTimeout(() => agent.setStatus("idle"), 3e3);
        this.activityLog.add(`${agent.displayName}: "${this.truncate(content, 35)}"`, agent.color);
      }
      return 3e3;
    }
    animateCompletion(agent, _event) {
      agent.moveTo("desk", agent.deskIndex, () => {
        agent.setStatus("typing");
        setTimeout(() => agent.setStatus("idle"), 1500);
      });
      this.activityLog.add(`${agent.displayName} completed task`, agent.color);
      return 2e3;
    }
    animateThinking(agent, _event) {
      agent.setStatus("thinking");
      agent.showSpeechBubble("...", "thought", 2e3);
      this.activityLog.add(`${agent.displayName} is thinking...`, agent.color);
      return 2e3;
    }
    animateHandoff(agent, event) {
      const targetId = event.metadata?.targetAgent ?? "";
      const targetAgent = this.scene.getAgent(targetId);
      agent.moveTo("meeting_table", 0, () => {
        agent.setStatus("talking");
        const content = event.metadata?.content ?? `\u2192 ${this.truncate(targetId, 15)}`;
        agent.showSpeechBubble(this.truncate(content, 40), "speech", 2500);
      });
      if (targetAgent) {
        targetAgent.moveTo("meeting_table", 0, () => {
          targetAgent.setStatus("talking");
          targetAgent.showSpeechBubble("\u{1F442} Listening...", "speech", 2e3);
        });
        this.scene.addInteractionLine(agent.id, targetId, agent.color, 2.5);
        setTimeout(() => {
          targetAgent.setStatus("idle");
          targetAgent.moveTo("desk", targetAgent.deskIndex);
        }, 2500);
        this.activityLog.add(`${agent.displayName} \u2192 ${targetAgent.displayName}: handoff`, agent.color);
      } else {
        this.activityLog.add(`${agent.displayName} handing off to ${this.truncate(targetId, 15)}`, agent.color);
      }
      setTimeout(() => {
        agent.setStatus("idle");
        agent.moveTo("desk", agent.deskIndex);
      }, 2500);
      return 3e3;
    }
    animateSessionStart(agent, _event) {
      agent.setStatus("idle");
      this.activityLog.add(`${agent.displayName} joined the session`, agent.color);
      return 1e3;
    }
    animateSessionEnd(agent, _event) {
      agent.moveTo("door", 0, () => {
        agent.setStatus("idle");
      });
      this.activityLog.add(`${agent.displayName} left the office`, agent.color);
      return 2e3;
    }
    animateError(agent, event) {
      const msg = event.metadata?.message ?? "Error";
      agent.showSpeechBubble(`\u274C ${this.truncate(msg, 30)}`, "speech", 3e3);
      agent.setStatus("idle");
      this.activityLog.add(`${agent.displayName}: \u274C ${this.truncate(msg, 30)}`, "#ea4335");
      return 2e3;
    }
    truncate(text, max) {
      return text.length > max ? text.substring(0, max - 1) + "\u2026" : text;
    }
  };

  // src/webview/ui/LiveEventQueue.ts
  var LiveEventQueue = class {
    constructor(scene, activityLog) {
      this.scene = scene;
      this.activityLog = activityLog;
      this.queue = [];
      this.processing = false;
      this.eventAnimator = new EventAnimator(scene, activityLog);
    }
    /** Push a new live event to the queue */
    push(event) {
      this.queue.push(event);
      if (!this.processing) {
        this.processNext();
      }
    }
    processNext() {
      if (this.queue.length === 0) {
        this.processing = false;
        return;
      }
      this.processing = true;
      const event = this.queue.shift();
      const duration = this.eventAnimator.animateEvent(event);
      this.scene.notifyEventReceived();
      const delay = Math.min(duration * 0.6, 1500);
      setTimeout(() => this.processNext(), delay);
    }
  };

  // src/webview/ui/ActivityLog.ts
  var MAX_ENTRIES = 80;
  var ActivityLog = class {
    constructor(el) {
      this.el = el;
    }
    /** Add an entry to the log */
    add(text, color) {
      const now = /* @__PURE__ */ new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const entry = document.createElement("div");
      entry.className = "log-entry";
      entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-text" style="${color ? `color:${color}` : ""}">${this.escapeHtml(text)}</span>`;
      this.el.appendChild(entry);
      while (this.el.children.length > MAX_ENTRIES) {
        this.el.removeChild(this.el.firstChild);
      }
      this.el.scrollTop = this.el.scrollHeight;
    }
    escapeHtml(text) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  };

  // src/webview/ui/StatusBar.ts
  var StatusBar = class {
    constructor(el) {
      this.el = el;
      this.render({ agentCount: 0, eventCount: 0, monitoring: false });
    }
    update(stats) {
      this.render(stats);
    }
    render(stats) {
      const dot = stats.monitoring ? "\u{1F7E2}" : "\u{1F534}";
      const state = stats.monitoring ? "Monitoring" : "Paused";
      const agents = stats.agentCount === 1 ? "1 agent" : `${stats.agentCount} agents`;
      const events = `${stats.eventCount} events`;
      this.el.innerHTML = `<span>${dot} ${state}</span><span>${agents} active</span><span>${events}</span>`;
    }
  };

  // src/webview/main.ts
  var App = class {
    constructor() {
      this.vscode = acquireVsCodeApi();
      const canvas = document.getElementById("office-canvas");
      const logEl = document.getElementById("activity-log");
      const statusEl = document.getElementById("status-bar");
      this.scene = new OfficeScene(canvas);
      this.activityLog = new ActivityLog(logEl);
      this.statusBar = new StatusBar(statusEl);
      this.liveEventQueue = new LiveEventQueue(this.scene, this.activityLog);
      this.messageHandler = new MessageHandler(
        this.vscode,
        this.scene,
        this.liveEventQueue,
        this.activityLog,
        this.statusBar
      );
      this.resizeCanvas();
      window.addEventListener("resize", () => this.resizeCanvas());
      this.vscode.postMessage({ type: "webview-ready" });
      this.scene.start();
    }
    resizeCanvas() {
      const canvas = document.getElementById("office-canvas");
      const container = document.getElementById("canvas-container");
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      this.scene.resize(canvas.width, canvas.height);
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    new App();
  });
})();
