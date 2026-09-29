/**
 * College Navigator - Navigation Service
 * Phase 8: Application Shell & Screen Architecture
 *
 * Coordinates:
 * - Dynamic origin calculation (player world pos -> nearest graph node)
 * - Authoritative Destination Model & multi-door resolution
 * - Navigation State Machine:
 *     IDLE -> DESTINATION_SELECTED -> ROUTE_CALCULATING -> NAVIGATING -> ARRIVED (or ROUTE_ERROR)
 * - Integration with Java API (/api/route)
 * - World-space arrival detection (1.5m threshold)
 */

import { AppState, updateNavigation, setMapMode } from "./state.js";
import { API_BASE } from "./api-config.js";
import { ScreenManager, SCREENS, OVERLAYS } from "./screen-manager.js";
import { MovementSystem } from "./movement.js";

export const ARRIVAL_RADIUS_METRES = 1.5;

/**
 * Resolves the nearest accessible graph junction or door node to a given world coordinate.
 * @param {{ x: number, y: number }} pos
 * @param {Array<Object>} nodes
 * @returns {string} Node ID
 */
export function getNearestGraphNode(pos, nodes) {
  if (!nodes || nodes.length === 0) return "ENTRANCE";
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return "ENTRANCE";

  // Filter walkable nodes: JUNCTION, BOUNDARY, ROOM_DOOR
  const candidates = nodes.filter(n =>
    n.type === "JUNCTION" || n.type === "BOUNDARY" || n.type === "ROOM_DOOR" || n.id === "ENTRANCE"
  );

  let nearestNodeId = "ENTRANCE";
  let minDistance = Infinity;

  for (const node of candidates) {
    const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
    if (dist < minDistance) {
      minDistance = dist;
      nearestNodeId = node.id;
    }
  }

  return nearestNodeId;
}

/**
 * Creates an authoritative Destination object.
 * @param {Object} room - Room object from rooms.json
 * @param {string} [specificDoorId] - Optional specific door node ID
 * @param {Map<string, Object>} [nodeMap] - Graph nodes map
 * @returns {Object} Destination model
 */
export function createDestination(room, specificDoorId = null, nodeMap = null) {
  if (!room) return null;

  let doorId = specificDoorId;
  let doorLabel = null;

  if (!doorId) {
    if (room.id === "WAB203") {
      doorId = "W203_D2"; // Authoritative primary entrance for WAB 203
      doorLabel = "Door 2 (Center)";
    } else if (room.doors && room.doors.length > 0) {
      const primary = room.doors.find(d => d.primary) || room.doors[0];
      doorId = primary.node || primary.id;
      doorLabel = primary.label || doorId;
    }
  } else if (room.doors) {
    const matchedDoor = room.doors.find(d => (d.node || d.id) === doorId);
    if (matchedDoor) doorLabel = matchedDoor.label || doorId;
  }

  const doorNode = nodeMap && doorId ? nodeMap.get(doorId) : null;

  return {
    roomId: room.id,
    roomCode: room.code,
    name: room.name,
    category: room.category,
    doorId: doorId,
    nodeId: doorId,
    doorLabel: doorLabel || doorId,
    node: doorNode,
    allDoors: room.doors || []
  };
}

export const NavigationService = (function() {
  let allNodes = [];
  let nodeMap = new Map();
  let allRooms = [];
  let roomsMap = new Map();

  let selectedOrigin = {
    id: "CURRENT_POS",
    label: "Current Location",
    nodeId: null
  };

  function init(nodes, rooms) {
    allNodes = nodes;
    nodeMap = new Map(nodes.map(n => [n.id, n]));
    allRooms = rooms;
    roomsMap = new Map(rooms.map(r => [r.id, r]));
  }

  /**
   * Sets the authoritative origin point for routing.
   * @param {string} originId - 'CURRENT_POS', 'ENTRANCE', or room ID (e.g. 'WAB203')
   * @returns {Object} Origin model
   */
  function setOrigin(originId) {
    if (!originId || originId === "CURRENT_POS") {
      selectedOrigin = { id: "CURRENT_POS", label: "Current Location", nodeId: null };
    } else if (originId === "ENTRANCE") {
      selectedOrigin = { id: "ENTRANCE", label: "Main Entrance (Level 1)", nodeId: "ENTRANCE" };
    } else {
      const room = roomsMap.get(originId);
      if (room) {
        let doorId = "ENTRANCE";
        if (room.id === "WAB203") {
          doorId = "W203_D2";
        } else if (room.doors && room.doors.length > 0) {
          const primary = room.doors.find(d => d.primary) || room.doors[0];
          doorId = primary.node || primary.id;
        }
        selectedOrigin = {
          id: room.id,
          label: `${room.code} — ${room.name}`,
          nodeId: doorId,
          room
        };
      } else {
        selectedOrigin = { id: originId, label: originId, nodeId: originId };
      }
    }

    updateNavigation({ origin: selectedOrigin });
    return selectedOrigin;
  }

  function getOrigin() {
    return selectedOrigin;
  }

  /**
   * Selects a destination without immediately starting navigation.
   * @param {string} roomId
   * @param {string} [specificDoorId]
   * @returns {Object|null} Destination object
   */
  function selectDestination(roomId, specificDoorId = null) {
    const room = roomsMap.get(roomId);
    if (!room) {
      console.error(`[NavigationService] Room not found: ${roomId}`);
      return null;
    }

    const destination = createDestination(room, specificDoorId, nodeMap);
    updateNavigation({
      status: "destination_selected",
      destination,
      errorMessage: null
    });

    return destination;
  }

  /**
   * Calculates route from chosen origin or player position to the destination via Java API.
   * @param {Object|string} [optionsOrTarget] - Can be destination object, or options { mode, targetDestination, originId }
   * @returns {Promise<boolean>} Success indicator
   */
  async function calculateAndStartRoute(optionsOrTarget = null) {
    let targetDestination = null;
    let navMode = "manual";
    let customOriginId = null;

    if (optionsOrTarget && typeof optionsOrTarget === "object" && ("mode" in optionsOrTarget || "originId" in optionsOrTarget || "navMode" in optionsOrTarget)) {
      targetDestination = optionsOrTarget.targetDestination || null;
      navMode = optionsOrTarget.mode || optionsOrTarget.navMode || "manual";
      customOriginId = optionsOrTarget.originId || null;
    } else if (optionsOrTarget) {
      targetDestination = optionsOrTarget;
    }

    const dest = targetDestination || AppState.navigation.destination;
    if (!dest || !dest.doorId) {
      console.error("[NavigationService] Cannot calculate route: No destination set.");
      updateNavigation({ status: "route_error", errorMessage: "No destination selected" });
      return false;
    }

    if (customOriginId) {
      setOrigin(customOriginId);
    }

    // Dynamic origin resolution from chosen origin or player's current world position
    let fromNodeId;
    if (selectedOrigin && selectedOrigin.id !== "CURRENT_POS" && selectedOrigin.nodeId) {
      fromNodeId = selectedOrigin.nodeId;
    } else {
      const playerPos = MovementSystem.getPlayerPos();
      fromNodeId = getNearestGraphNode(playerPos, allNodes);
    }

    updateNavigation({
      status: "route_calculating",
      destination: dest,
      fromNodeId,
      navMode,
      errorMessage: null
    });

    try {
      // Call authoritative Java API: GET /api/route?from=<FROM_NODE>&to=<DEST_DOOR>
      const response = await fetch(`${API_BASE}/api/route?from=${encodeURIComponent(fromNodeId)}&to=${encodeURIComponent(dest.doorId)}`);
      if (!response.ok) {
        throw new Error(`Routing request failed with HTTP ${response.status}`);
      }

      const routeData = await response.json();

      if (!routeData.found || !routeData.path || routeData.path.length === 0) {
        throw new Error(routeData.error || "No walkable path found to destination");
      }

      // Success: Activate navigation mode
      const activeDestNode = routeData.path[routeData.path.length - 1];

      // If user selected a custom origin (not current location), place character at that start node
      if (selectedOrigin && selectedOrigin.id !== "CURRENT_POS" && routeData.path.length > 0) {
        MovementSystem.setPlayerPos(routeData.path[0].x, routeData.path[0].y);
      }

      updateNavigation({
        status: "navigating",
        route: routeData,
        activeDestination: activeDestNode,
        navMode,
        errorMessage: null
      });

      setMapMode("navigation");
      ScreenManager.navigateTo(SCREENS.MAP);

      if (navMode === "simulate") {
        MovementSystem.startSimulation(routeData.path, () => {
          triggerArrival();
        });
      } else {
        MovementSystem.stopSimulation();
      }

      return true;
    } catch (err) {
      console.error("[NavigationService] Route calculation error:", err);
      updateNavigation({
        status: "route_error",
        route: null,
        activeDestination: null,
        errorMessage: err.message || "Failed to calculate route"
      });
      return false;
    }
  }

  /**
   * Switches runtime navigation mode between 'simulate' and 'manual'.
   * @param {'simulate' | 'manual'} mode
   */
  function setNavMode(mode) {
    if (mode === "simulate") {
      if (AppState.navigation && AppState.navigation.route && AppState.navigation.route.path) {
        updateNavigation({ navMode: "simulate" });
        MovementSystem.startSimulation(AppState.navigation.route.path, () => {
          triggerArrival();
        });
      }
    } else {
      updateNavigation({ navMode: "manual" });
      MovementSystem.stopSimulation();
    }
  }

  /**
   * Checks player distance to active destination and triggers arrival if within threshold.
   * @param {{ x: number, y: number }} playerPos
   */
  function checkArrival(playerPos) {
    if (AppState.navigation.status !== "navigating" || !AppState.navigation.activeDestination) {
      return;
    }

    // When simulating, simulation loop handles arrival directly
    if (MovementSystem.isSimulating && MovementSystem.isSimulating()) {
      return;
    }

    const target = AppState.navigation.activeDestination;
    const distance = Math.hypot(playerPos.x - target.x, playerPos.y - target.y);

    if (distance <= ARRIVAL_RADIUS_METRES) {
      triggerArrival();
    }
  }

  /**
   * Triggers arrival sequence and opens arrival modal overlay.
   */
  function triggerArrival() {
    MovementSystem.stopSimulation();

    const dest = AppState.navigation.destination;
    const roomCode = dest ? dest.roomCode : "DESTINATION";
    const roomName = dest ? dest.name : "Destination Reached";

    // Lock movement physics input
    MovementSystem.setInputEnabled(false);

    // Update navigation state to arrived
    updateNavigation({
      status: "arrived",
      route: null, // Clear highlighted route from canvas
      activeDestination: null
    });

    // Open arrival overlay
    ScreenManager.openOverlay(OVERLAYS.ARRIVAL, { roomCode, roomName });
  }

  /**
   * Called when user dismisses arrival modal.
   */
  function dismissArrival() {
    MovementSystem.stopSimulation();
    ScreenManager.closeOverlay();
    MovementSystem.setInputEnabled(true);
    setMapMode("normal");
    updateNavigation({
      status: "idle",
      destination: null,
      route: null,
      activeDestination: null,
      errorMessage: null
    });
  }

  /**
   * Cancels active navigation and restores normal map mode.
   */
  function cancelNavigation() {
    MovementSystem.stopSimulation();
    updateNavigation({
      status: "idle",
      destination: null,
      route: null,
      activeDestination: null,
      errorMessage: null
    });
    setMapMode("normal");
  }

  return {
    init,
    setOrigin,
    getOrigin,
    setNavMode,
    selectDestination,
    calculateAndStartRoute,
    checkArrival,
    triggerArrival,
    dismissArrival,
    cancelNavigation,
    getRooms: () => allRooms,
    getRoom: (id) => roomsMap.get(id),
    getNode: (id) => nodeMap.get(id)
  };
})();
