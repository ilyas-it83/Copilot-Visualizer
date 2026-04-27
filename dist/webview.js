"use strict";
(() => {
  // src/webview/scene/OfficeLayout.ts
  var OFFICE_WIDTH = 800;
  var OFFICE_HEIGHT = 500;
  var LOCATIONS = [
    { id: "desk", position: { x: 120, y: 150 }, size: { x: 100, y: 130, width: 80, height: 50 }, label: "Desk 1" },
    { id: "desk", position: { x: 250, y: 150 }, size: { x: 230, y: 130, width: 80, height: 50 }, label: "Desk 2" },
    { id: "desk", position: { x: 380, y: 150 }, size: { x: 360, y: 130, width: 80, height: 50 }, label: "Desk 3" },
    { id: "desk", position: { x: 510, y: 150 }, size: { x: 490, y: 130, width: 80, height: 50 }, label: "Desk 4" },
    { id: "terminal", position: { x: 680, y: 100 }, size: { x: 650, y: 80, width: 100, height: 70 }, label: "Terminal" },
    { id: "file_cabinet", position: { x: 680, y: 250 }, size: { x: 660, y: 230, width: 80, height: 60 }, label: "Files" },
    { id: "meeting_table", position: { x: 350, y: 370 }, size: { x: 300, y: 340, width: 140, height: 100 }, label: "Meeting" },
    { id: "search_station", position: { x: 120, y: 370 }, size: { x: 90, y: 350, width: 90, height: 60 }, label: "Search" },
    { id: "whiteboard", position: { x: 550, y: 370 }, size: { x: 530, y: 350, width: 100, height: 80 }, label: "Whiteboard" },
    { id: "coffee_machine", position: { x: 50, y: 250 }, size: { x: 30, y: 230, width: 60, height: 50 }, label: "Coffee" },
    { id: "door", position: { x: 400, y: 480 }, size: { x: 370, y: 460, width: 60, height: 40 }, label: "Door" }
  ];
  function getDeskLocations() {
    return LOCATIONS.filter((l) => l.id === "desk");
  }
  var WAYPOINTS = [
    { id: "hall-center", position: { x: 400, y: 280 }, connections: ["hall-left", "hall-right", "meeting", "desks-center"] },
    { id: "hall-left", position: { x: 150, y: 280 }, connections: ["hall-center", "search", "coffee", "desk-1", "desk-2"] },
    { id: "hall-right", position: { x: 650, y: 280 }, connections: ["hall-center", "terminal", "files", "whiteboard", "desk-3", "desk-4"] },
    { id: "desks-center", position: { x: 400, y: 180 }, connections: ["hall-center", "desk-2", "desk-3"] },
    { id: "desk-1", position: { x: 120, y: 190 }, connections: ["hall-left"] },
    { id: "desk-2", position: { x: 250, y: 190 }, connections: ["hall-left", "desks-center"] },
    { id: "desk-3", position: { x: 380, y: 190 }, connections: ["desks-center", "hall-right"] },
    { id: "desk-4", position: { x: 510, y: 190 }, connections: ["hall-right"] },
    { id: "terminal", position: { x: 680, y: 140 }, connections: ["hall-right"] },
    { id: "files", position: { x: 680, y: 260 }, connections: ["hall-right"] },
    { id: "meeting", position: { x: 370, y: 370 }, connections: ["hall-center"] },
    { id: "search", position: { x: 130, y: 370 }, connections: ["hall-left"] },
    { id: "whiteboard", position: { x: 570, y: 370 }, connections: ["hall-right"] },
    { id: "coffee", position: { x: 60, y: 260 }, connections: ["hall-left"] },
    { id: "door", position: { x: 400, y: 470 }, connections: ["hall-center"] }
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
    moveTo(location, locationIndex = 0, onArrival) {
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
      if (this.status === "idle") {
        this.idleTimer += dt;
        this.idleBob = Math.sin(this.idleTimer * 1.5) * 0.8;
        this.idleLookTimer += dt;
        if (this.idleLookTimer > 3 + Math.random() * 2) {
          this.idleLookDirection = Math.floor(Math.random() * 3) - 1;
          this.idleLookTimer = 0;
        }
      } else {
        this.idleBob = 0;
        this.idleLookDirection = 0;
      }
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
  var AgentRenderer = class {
    constructor(renderer) {
      this.renderer = renderer;
    }
    draw(agent) {
      if (!agent.visible)
        return;
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
      if (agent.speechBubble && agent.speechBubble.opacity > 0) {
        ctx.globalAlpha = agent.speechBubble.opacity;
        this.renderer.drawSpeechBubble(
          x,
          y - AGENT_HEIGHT / 2 - 5 + idleBob,
          agent.speechBubble.text,
          agent.speechBubble.bgColor,
          agent.speechBubble.textColor
        );
      }
      ctx.restore();
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
      const hw = AGENT_WIDTH / 2;
      const hh = AGENT_HEIGHT / 2;
      let yOffset = 0;
      if (agent.status === "walking") {
        yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
      }
      ctx.fillStyle = "#ffd5b4";
      ctx.beginPath();
      ctx.arc(x, y - hh + 8 + yOffset, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = agent.color;
      const bodyTop = y - hh + 18 + yOffset;
      ctx.beginPath();
      ctx.moveTo(x - hw / 2 + 3, bodyTop);
      ctx.lineTo(x + hw / 2 - 3, bodyTop);
      ctx.quadraticCurveTo(x + hw / 2, bodyTop, x + hw / 2, bodyTop + 3);
      ctx.lineTo(x + hw / 2, y + hh - 8 + yOffset);
      ctx.quadraticCurveTo(x + hw / 2, y + hh - 5 + yOffset, x + hw / 2 - 3, y + hh - 5 + yOffset);
      ctx.lineTo(x - hw / 2 + 3, y + hh - 5 + yOffset);
      ctx.quadraticCurveTo(x - hw / 2, y + hh - 5 + yOffset, x - hw / 2, y + hh - 8 + yOffset);
      ctx.lineTo(x - hw / 2, bodyTop + 3);
      ctx.quadraticCurveTo(x - hw / 2, bodyTop, x - hw / 2 + 3, bodyTop);
      ctx.fill();
      ctx.fillStyle = "#333";
      if (agent.status === "walking") {
        const legOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 3;
        ctx.fillRect(x - 4 + legOffset, y + hh - 5 + yOffset, 4, 8);
        ctx.fillRect(x - legOffset, y + hh - 5 + yOffset, 4, 8);
      } else {
        ctx.fillRect(x - 5, y + hh - 5, 4, 6);
        ctx.fillRect(x + 1, y + hh - 5, 4, 6);
      }
    }
    drawHair(ctx, agent, x, y) {
      const hh = AGENT_HEIGHT / 2;
      let yOffset = 0;
      if (agent.status === "walking") {
        yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
      }
      const headY = y - hh + 8 + yOffset;
      const hairDef = HAIR_STYLES[agent.deskIndex % HAIR_STYLES.length];
      ctx.fillStyle = hairDef.color;
      switch (hairDef.style) {
        case "short":
          ctx.beginPath();
          ctx.arc(x, headY - 3, 9, Math.PI, 0);
          ctx.fill();
          break;
        case "spiky":
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * 4 - 2, headY - 5);
            ctx.lineTo(x + i * 4, headY - 11);
            ctx.lineTo(x + i * 4 + 2, headY - 5);
            ctx.fill();
          }
          break;
        case "long":
          ctx.beginPath();
          ctx.arc(x, headY - 2, 10, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(x - 10, headY - 2, 4, 10);
          ctx.fillRect(x + 6, headY - 2, 4, 10);
          break;
        case "bald":
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.beginPath();
          ctx.arc(x - 3, headY - 5, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "mohawk":
          ctx.fillRect(x - 2, headY - 14, 4, 10);
          break;
        case "curly":
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(x - 6 + i * 3, headY - 6, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case "ponytail":
          ctx.beginPath();
          ctx.arc(x, headY - 3, 9, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(x + 6, headY - 2, 3, 12);
          break;
        case "flat":
          ctx.fillRect(x - 9, headY - 7, 18, 4);
          break;
      }
    }
    drawFeatures(ctx, agent, x, y) {
      const hh = AGENT_HEIGHT / 2;
      let yOffset = 0;
      if (agent.status === "walking") {
        yOffset = Math.sin(agent.getWalkFrame() * Math.PI / 2) * 2;
      }
      const headY = y - hh + 8 + yOffset;
      const lookDir = agent.getIdleLookDirection();
      ctx.fillStyle = "#333";
      ctx.fillRect(x - 4 + lookDir, headY - 2, 3, 3);
      ctx.fillRect(x + 1 + lookDir, headY - 2, 3, 3);
      if (agent.status === "typing") {
        const handOffset = agent.getTypingFrame() * 2 - 2;
        ctx.fillStyle = "#ffd5b4";
        ctx.fillRect(x - 8 + handOffset, y + 2, 4, 4);
        ctx.fillRect(x + 4 - handOffset, y + 2, 4, 4);
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
      }
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
    // Speech bubble with pointer
    drawSpeechBubble(x, y, text, bgColor, textColor) {
      const padding = 8;
      this.ctx.font = "11px monospace";
      const lines = this.wrapText(text, 150);
      const lineHeight = 14;
      const w = Math.min(170, Math.max(...lines.map((l) => this.ctx.measureText(l).width)) + padding * 2);
      const h = lines.length * lineHeight + padding * 2;
      const bx = x - w / 2;
      const by = y - h - 10;
      this.drawRoundedRect(bx, by, w, h, 6, bgColor, "#555");
      this.ctx.fillStyle = bgColor;
      this.ctx.beginPath();
      this.ctx.moveTo(x - 5, by + h);
      this.ctx.lineTo(x + 5, by + h);
      this.ctx.lineTo(x, by + h + 8);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.fillStyle = textColor;
      this.ctx.textAlign = "left";
      lines.forEach((line, i) => {
        this.ctx.fillText(line, bx + padding, by + padding + (i + 1) * lineHeight - 2);
      });
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
      return lines.length > 3 ? [...lines.slice(0, 3), "..."] : lines;
    }
  };

  // src/webview/scene/OfficeScene.ts
  var OfficeScene = class {
    constructor(canvas) {
      this.agents = /* @__PURE__ */ new Map();
      this.running = false;
      this.lastTime = 0;
      this.interactionLines = [];
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
      const desks = getDeskLocations();
      const deskIndex = index % desks.length;
      const desk = desks[deskIndex];
      const agent = new Agent(id, source, desk.position, deskIndex, customName);
      agent.position = { x: 400, y: 470 };
      agent.currentLocation = "door";
      agent.showSpeechBubble("\u{1F44B} Hello!", "speech", 2e3);
      agent.moveTo("desk", deskIndex, () => {
        agent.setStatus("idle");
      });
      this.agents.set(id, agent);
      this.renderer.invalidateBackground();
    }
    getAllAgents() {
      return Array.from(this.agents.values());
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
          ctx.fillStyle = "#fff";
          ctx.fillRect(size.x + size.width / 2 - 8, size.y + size.height - 20, 16, 14);
          ctx.strokeStyle = "#ccc";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(size.x + size.width / 2 - 3, size.y + size.height - 22);
          ctx.quadraticCurveTo(size.x + size.width / 2, size.y + size.height - 30, size.x + size.width / 2 + 3, size.y + size.height - 35);
          ctx.stroke();
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
      ctx.fillStyle = "#666";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, size.x + size.width / 2, size.y + size.height + 14);
    }
  };

  // src/webview/MessageHandler.ts
  var MessageHandler = class {
    constructor(vscode, scene, liveEventQueue, activityLog, statusBar) {
      this.vscode = vscode;
      this.scene = scene;
      this.liveEventQueue = liveEventQueue;
      this.activityLog = activityLog;
      this.statusBar = statusBar;
      window.addEventListener("message", (e) => this.handleMessage(e.data));
    }
    handleMessage(message) {
      switch (message.type) {
        case "live-event": {
          const event = message.event;
          if (!this.scene.getAgent(event.agentId)) {
            this.scene.addAgent(event.agentId, event.source, this.scene.getAllAgents().length);
            const agent = this.scene.getAgent(event.agentId);
            this.activityLog.add(`${agent.displayName} entered the office`, agent.color);
          }
          this.liveEventQueue.push(event);
          break;
        }
        case "agent-appeared": {
          const info = message.agent;
          if (!this.scene.getAgent(info.id)) {
            this.scene.addAgent(info.id, info.source, this.scene.getAllAgents().length, info.name);
            const agent = this.scene.getAgent(info.id);
            this.activityLog.add(`${agent.displayName} entered the office`, agent.color);
          }
          break;
        }
        case "status-update": {
          this.statusBar.update(message.stats);
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
      this.activityLog.add(`${agent.displayName} returned to desk`, agent.color);
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
        agent.showSpeechBubble("\u2713 complete", "tool", 1500);
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
      agent.position = { x: 400, y: 470 };
      agent.currentLocation = "door";
      agent.showSpeechBubble("\u{1F44B} Hello!", "speech", 2e3);
      agent.moveTo("desk", agent.deskIndex, () => {
        agent.setStatus("idle");
      });
      this.activityLog.add(`${agent.displayName} joined the session`, agent.color);
      return 2500;
    }
    animateSessionEnd(agent, _event) {
      agent.showSpeechBubble("\u{1F44B} Done!", "speech", 1500);
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
