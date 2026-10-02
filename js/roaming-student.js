/**
 * College Navigator — Roaming Student NPC (Phase 8)
 *
 * Implements an autonomous roaming student that:
 * - Spawns on valid corridor space at node H3 (0, 18.0).
 * - Naturally traverses the corridor graph using existing Dijkstra shortest path.
 * - Displays 4-direction walk animations while traversing corridors.
 * - Pauses at destinations in idle state for 2.0–3.5s before choosing another destination.
 * - Fully integrated into depth-sorted rendering without hard player collision.
 */

import { Graph } from "./graph.js";
import { findRoute } from "./dijkstra.js";
import { AppState } from "./state.js";

export const RoamingStudent = (function() {
  const CONFIG = {
    id: "roaming-student",
    type: "student",
    name: "Student NPC",
    speed: 2.2, // Authoritative 2.2 m/s requirement
    spawnNode: "H3",
    spawnX: 0.0,
    spawnY: 18.0,
    spriteScale: 1.7 / 256, // 0.006640625 m/px (authoritative 1.70m human standing height)
    cellWidth: 144,
    cellHeight: 260,
    pivotX: 72,
    anchorY: 257,
    pauseDurationMin: 2.0, // seconds
    pauseDurationMax: 3.5, // seconds
    walkFps: 8
  };

  const DIR_ROW_MAP = {
    front: 0,
    back: 1,
    left: 2,
    right: 3
  };

  const DIR_COL_MAP = {
    front: 0,
    back: 1,
    left: 2,
    right: 3
  };

  // Safe corridor waypoints for natural student roaming
  const ROAMING_WAYPOINTS = [
    "H1", "H2", "H3", "H4", "H5", "R_TOP", "TR", "J208", "TL", "J218"
  ];

  // State variables
  let currentPos = { x: CONFIG.spawnX, y: CONFIG.spawnY };
  let currentDirection = "front"; // "front" | "back" | "left" | "right"
  let state = "idle";             // "idle" | "walking" | "paused"
  let currentNodeId = CONFIG.spawnNode;
  let destinationNodeId = null;
  let lastDestinationId = null;

  let route = [];       // Array of { id, x, y }
  let routeIndex = 0;   // Index in route currently moving towards

  let pauseTimer = 1.0; // Start with brief 1s pause before initial walk
  let walkAnimFrame = 0;
  let walkAnimTimer = 0;

  let graph = null;
  let nodeMap = new Map();

  // Asset images
  let idleImage = null;
  let walkImage = null;
  let shadowImage = null;

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`[RoamingStudent] Could not load image: ${src}`);
        resolve(null);
      };
      img.src = src;
    });
  }

  /**
   * Initializes the Roaming Student NPC with graph data.
   * @param {Array<Object>} nodes - nodes from nodes.json
   * @param {Array<Object>} edges - edges from edges.json
   */
  function init(nodes, edges) {
    if (!nodes || !edges) {
      console.warn("[RoamingStudent] init called without nodes or edges");
      return;
    }

    // Build internal graph for Dijkstra pathfinding
    graph = new Graph();
    nodeMap = new Map();

    for (const n of nodes) {
      graph.addNode(n);
      nodeMap.set(n.id, n);
    }
    for (const e of edges) {
      graph.addUndirectedEdge(e.from, e.to, e.distance);
    }

    // Reset position to authoritative spawn
    currentPos = { x: CONFIG.spawnX, y: CONFIG.spawnY };
    currentNodeId = CONFIG.spawnNode;
    currentDirection = "front";
    state = "idle";
    route = [];
    routeIndex = 0;
    destinationNodeId = null;
    lastDestinationId = null;
    pauseTimer = 1.0;
    walkAnimFrame = 0;
    walkAnimTimer = 0;

    // Asynchronously preload assets
    loadImage("assets/optimised/character/student_npc_idle.png").then(img => { idleImage = img; });
    loadImage("assets/optimised/character/student_npc_walk.png").then(img => { walkImage = img; });
    loadImage("assets/optimised/character/character_shadow.png").then(img => { shadowImage = img; });

    console.log(`[RoamingStudent] Initialized at spawn node ${CONFIG.spawnNode} (${CONFIG.spawnX}, ${CONFIG.spawnY})`);
  }

  /**
   * Chooses the next destination node from candidate waypoints.
   * Avoids immediately reselecting the current node or the previous destination.
   * @param {string} [specificTarget] - Optional forced target for testing
   * @returns {boolean} True if a valid route was found and set
   */
  function chooseNextDestination(specificTarget = null) {
    if (!graph || nodeMap.size === 0) return false;

    let targetId = specificTarget;

    if (!targetId) {
      const candidates = ROAMING_WAYPOINTS.filter(id => id !== currentNodeId && id !== lastDestinationId);
      if (candidates.length === 0) {
        // Fallback to any waypoint other than current
        const fallback = ROAMING_WAYPOINTS.filter(id => id !== currentNodeId);
        targetId = fallback[Math.floor(Math.random() * fallback.length)] || "H1";
      } else {
        targetId = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    if (!nodeMap.has(targetId)) {
      console.warn(`[RoamingStudent] Unknown target node: ${targetId}`);
      return false;
    }

    // Calculate shortest route using existing Dijkstra algorithm
    const result = findRoute(graph, currentNodeId, targetId);
    if (!result.found || result.nodeIds.length < 2) {
      console.warn(`[RoamingStudent] No valid route from ${currentNodeId} to ${targetId}`);
      return false;
    }

    // Map node IDs to coordinate objects
    route = result.nodeIds.map(id => {
      const n = nodeMap.get(id);
      return { id: n.id, x: n.x, y: n.y };
    });

    destinationNodeId = targetId;
    lastDestinationId = targetId;
    routeIndex = 1; // Start moving towards index 1 (index 0 is current node)
    state = "walking";
    walkAnimFrame = 0;
    walkAnimTimer = 0;

    return true;
  }

  /**
   * Updates directional facing with a deadband to avoid rapid jitter.
   */
  function updateDirection(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const deadband = 0.05;

    if (absX < deadband && absY < deadband) return;

    if (absX > absY + 0.1) {
      currentDirection = dx > 0 ? "right" : "left";
    } else if (absY > absX + 0.1) {
      // dy > 0 means moving south/downwards on screen -> front
      currentDirection = dy > 0 ? "front" : "back";
    } else {
      if (absX >= absY) {
        currentDirection = dx > 0 ? "right" : "left";
      } else {
        currentDirection = dy > 0 ? "front" : "back";
      }
    }
  }

  /**
   * Main per-frame update loop.
   * @param {number} rawDt - delta time in seconds
   */
  function update(rawDt) {
    // Only update during active map screen
    if (AppState.screen !== "map") return;

    // Clamp delta time to avoid large jumps if frame drops
    const dt = Math.min(Math.max(rawDt || 0.016, 0.001), 0.1);

    if (state === "walking") {
      if (route.length === 0 || routeIndex >= route.length) {
        // Destination reached or empty route
        state = "paused";
        pauseTimer = CONFIG.pauseDurationMin + Math.random() * (CONFIG.pauseDurationMax - CONFIG.pauseDurationMin);
        walkAnimFrame = 0;
        return;
      }

      const target = route[routeIndex];
      const dx = target.x - currentPos.x;
      const dy = target.y - currentPos.y;
      const dist = Math.hypot(dx, dy);

      updateDirection(dx, dy);

      // Walk cycle animation (8 FPS)
      walkAnimTimer += dt;
      if (walkAnimTimer >= (1 / CONFIG.walkFps)) {
        walkAnimFrame = (walkAnimFrame + 1) % 4;
        walkAnimTimer = 0;
      }

      const step = CONFIG.speed * dt;
      if (dist <= step || dist < 0.02) {
        // Snap to waypoint
        currentPos.x = target.x;
        currentPos.y = target.y;
        currentNodeId = target.id;
        routeIndex++;

        if (routeIndex >= route.length) {
          // Final destination reached
          state = "paused";
          pauseTimer = CONFIG.pauseDurationMin + Math.random() * (CONFIG.pauseDurationMax - CONFIG.pauseDurationMin);
          walkAnimFrame = 0;
        }
      } else {
        currentPos.x += (dx / dist) * step;
        currentPos.y += (dy / dist) * step;
      }
    } else if (state === "paused" || state === "idle") {
      pauseTimer -= dt;
      if (pauseTimer <= 0) {
        chooseNextDestination();
      }
    }
  }

  /**
   * Renders the Roaming Student (shadow + directional sprite).
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} zoom - camera zoom
   */
  function draw(ctx, zoom) {
    // 1. Draw Drop Shadow
    if (shadowImage) {
      const sw = shadowImage.width * CONFIG.spriteScale;
      const sh = shadowImage.height * CONFIG.spriteScale;
      ctx.drawImage(
        shadowImage,
        currentPos.x - sw / 2,
        currentPos.y - sh / 2,
        sw,
        sh
      );
    }

    // 2. Draw Character Sprite
    if (state === "walking" && walkImage) {
      const row = DIR_ROW_MAP[currentDirection] ?? 0;
      const col = walkAnimFrame % 4;

      const sx = col * CONFIG.cellWidth;
      const sy = row * CONFIG.cellHeight;
      const sw = CONFIG.cellWidth;
      const sh = CONFIG.cellHeight;

      const renderW = sw * CONFIG.spriteScale;
      const renderH = sh * CONFIG.spriteScale;

      const drawX = currentPos.x - (CONFIG.pivotX * CONFIG.spriteScale);
      const drawY = currentPos.y - ((CONFIG.anchorY + 1) * CONFIG.spriteScale);

      ctx.drawImage(walkImage, sx, sy, sw, sh, drawX, drawY, renderW, renderH);
    } else if (idleImage) {
      const col = DIR_COL_MAP[currentDirection] ?? 0;
      const sx = col * CONFIG.cellWidth;
      const sy = 0;
      const sw = CONFIG.cellWidth;
      const sh = CONFIG.cellHeight;

      const renderW = sw * CONFIG.spriteScale;
      const renderH = sh * CONFIG.spriteScale;

      const drawX = currentPos.x - (CONFIG.pivotX * CONFIG.spriteScale);
      const drawY = currentPos.y - ((CONFIG.anchorY + 1) * CONFIG.spriteScale);

      ctx.drawImage(idleImage, sx, sy, sw, sh, drawX, drawY, renderW, renderH);
    }
  }

  return {
    id: CONFIG.id,
    type: CONFIG.type,
    name: CONFIG.name,
    CONFIG,
    init,
    update,
    draw,
    chooseNextDestination,
    setDestination: (targetId) => chooseNextDestination(targetId),
    getX: () => currentPos.x,
    getY: () => currentPos.y,
    get direction() { return currentDirection; },
    get state() { return state; },
    getState: () => ({
      id: CONFIG.id,
      type: CONFIG.type,
      name: CONFIG.name,
      x: currentPos.x,
      y: currentPos.y,
      state,
      direction: currentDirection,
      currentNode: currentNodeId,
      destination: destinationNodeId,
      routeIndex,
      routeLength: route.length,
      speed: CONFIG.speed
    })
  };
})();
