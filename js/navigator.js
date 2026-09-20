/**
 * Navigator facade for CSE Block Navigator.
 * Mirrors the Java service layer for room searches and shortest-route navigation.
 */

import { findRoute } from "./dijkstra.js";

export class Navigator {
  static DEFAULT_START = "ENTRANCE";

  /**
   * @param {import("./graph.js").Graph} graph
   * @param {Array<Object>} roomsData
   */
  constructor(graph, roomsData) {
    this.graph = graph;
    /** @type {Map<string, Object>} */
    this.rooms = new Map();

    for (const r of roomsData) {
      const primaryDoor = r.doors.find((d) => d.primary) || r.doors[0];
      const roomObj = {
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category,
        doors: r.doors,
        primaryDoor,
        searchable: r.searchable !== false,
        locked: Boolean(r.locked),
        status: r.status || null,
        getFullLabel() {
          return `${this.code} - ${this.name}`;
        },
        getRoutableDoors(g) {
          return this.doors.filter((d) => {
            const node = g.getNode(d.node);
            return node && node.routable !== false;
          });
        }
      };
      this.rooms.set(r.id, roomObj);
    }
  }

  /**
   * Returns all room objects.
   * @returns {Array<Object>}
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Retrieves a room by its id.
   * Throws if room id is not found.
   * @param {string} roomId
   * @returns {Object}
   */
  getRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`There is no room with id ${roomId}`);
    }
    return room;
  }

  /**
   * Searches rooms matching query by code, name, category, or door labels.
   * Case-insensitive and ignores spaces and hyphens.
   *
   * @param {string} query
   * @returns {Array<Object>}
   */
  search(query) {
    if (!query || !query.trim()) return [];

    const normalize = (s) => (s ? String(s).toLowerCase().replace(/[\s-]+/g, "") : "");
    const qNorm = normalize(query);
    if (!qNorm) return [];

    const found = [];
    for (const room of this.rooms.values()) {
      if (!room.searchable) continue;

      const codeNorm = normalize(room.code);
      const nameNorm = normalize(room.name);
      const categoryNorm = normalize(room.category);
      const doorLabelsNorm = room.doors
        ? room.doors.map((d) => normalize(d.label)).filter(Boolean)
        : [];

      const matches =
        codeNorm.includes(qNorm) ||
        nameNorm.includes(qNorm) ||
        categoryNorm.includes(qNorm) ||
        doorLabelsNorm.some((lbl) => lbl.includes(qNorm));

      if (matches) {
        found.push(room);
      }
    }

    found.sort((a, b) => a.code.localeCompare(b.code));
    return found;
  }

  /**
   * Routes from DEFAULT_START to room's primary door.
   * @param {string} roomId
   * @returns {{ found: boolean, distance: number, nodeIds: Array<string>, nodes: Array<Object> }}
   */
  routeTo(roomId) {
    return this.routeFromNode(Navigator.DEFAULT_START, roomId);
  }

  /**
   * Routes from a specified start node to the room's primary door.
   * @param {string} startNodeId
   * @param {string} roomId
   * @returns {{ found: boolean, distance: number, nodeIds: Array<string>, nodes: Array<Object> }}
   */
  routeFromNode(startNodeId, roomId) {
    const destination = this.getRoom(roomId);
    const routableDoors = destination.getRoutableDoors(this.graph);

    if (destination.locked || routableDoors.length === 0) {
      const statusSuffix = destination.status ? ` (${destination.status})` : "";
      throw new Error(`${destination.getFullLabel()} cannot be routed to${statusSuffix}`);
    }

    const targetDoor = destination.primaryDoor;
    const result = findRoute(this.graph, startNodeId, targetDoor.node);
    return this._wrapRoute(result);
  }

  /**
   * Routes from a start node to an explicit door of a room.
   * @param {string} startNodeId
   * @param {string} roomId
   * @param {string} doorNodeId
   * @returns {{ found: boolean, distance: number, nodeIds: Array<string>, nodes: Array<Object> }}
   */
  routeToDoor(startNodeId, roomId, doorNodeId) {
    const destination = this.getRoom(roomId);
    const routableDoors = destination.getRoutableDoors(this.graph);

    if (destination.locked || routableDoors.length === 0) {
      const statusSuffix = destination.status ? ` (${destination.status})` : "";
      throw new Error(`${destination.getFullLabel()} cannot be routed to${statusSuffix}`);
    }

    const hasDoor = routableDoors.some((d) => d.node === doorNodeId);
    if (!hasDoor) {
      throw new Error(`Room ${roomId} has no open door with id ${doorNodeId}`);
    }

    const result = findRoute(this.graph, startNodeId, doorNodeId);
    return this._wrapRoute(result);
  }

  /**
   * Routes to whichever door of a room is closest.
   * @param {string} startNodeId
   * @param {string} roomId
   * @returns {{ found: boolean, distance: number, nodeIds: Array<string>, nodes: Array<Object> }}
   */
  routeToNearestDoor(startNodeId, roomId) {
    const destination = this.getRoom(roomId);
    const routableDoors = destination.getRoutableDoors(this.graph);

    if (destination.locked || routableDoors.length === 0) {
      const statusSuffix = destination.status ? ` (${destination.status})` : "";
      throw new Error(`${destination.getFullLabel()} cannot be routed to${statusSuffix}`);
    }

    const targetIds = routableDoors.map((d) => d.node);
    const result = findRoute(this.graph, startNodeId, targetIds);
    return this._wrapRoute(result);
  }

  /**
   * Routes door-to-door between two rooms using the closest pair of doors.
   * @param {string} fromRoomId
   * @param {string} toRoomId
   * @returns {{ found: boolean, distance: number, nodeIds: Array<string>, nodes: Array<Object> }}
   */
  routeBetweenRooms(fromRoomId, toRoomId) {
    const from = this.getRoom(fromRoomId);
    const to = this.getRoom(toRoomId);

    const fromDoors = from.getRoutableDoors(this.graph);
    const toDoors = to.getRoutableDoors(this.graph);

    if (from.locked || fromDoors.length === 0) {
      const statusSuffix = from.status ? ` (${from.status})` : "";
      throw new Error(`${from.getFullLabel()} cannot be routed to${statusSuffix}`);
    }
    if (to.locked || toDoors.length === 0) {
      const statusSuffix = to.status ? ` (${to.status})` : "";
      throw new Error(`${to.getFullLabel()} cannot be routed to${statusSuffix}`);
    }

    const startIds = fromDoors.map((d) => d.node);
    const targetIds = toDoors.map((d) => d.node);

    const result = findRoute(this.graph, startIds, targetIds);
    return this._wrapRoute(result);
  }

  /**
   * Enriches route result with full node metadata (id, type, x, y).
   * @private
   */
  _wrapRoute(result) {
    if (!result.found) {
      return {
        found: false,
        distance: Infinity,
        nodeIds: [],
        nodes: []
      };
    }

    const nodes = result.nodeIds.map((id) => {
      const n = this.graph.getNode(id);
      return {
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        routable: n.routable
      };
    });

    return {
      found: true,
      distance: result.distance,
      nodeIds: result.nodeIds,
      nodes
    };
  }
}
