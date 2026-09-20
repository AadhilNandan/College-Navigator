/**
 * Data Loader for CSE Block Navigator
 * Parses and validates graph data (nodes, edges, rooms).
 * Works in both browser (fetch) and runtime environments.
 */

/**
 * Validates raw JSON data and returns validated structures.
 * Throws an Error for data integrity issues.
 *
 * @param {Array|string} nodesData
 * @param {Array|string} edgesData
 * @param {Array|string} roomsData
 * @returns {{ nodes: Array, edges: Array, rooms: Array }}
 */
export function parseGraphData(nodesData, edgesData, roomsData) {
  const nodes = typeof nodesData === "string" ? JSON.parse(nodesData) : nodesData;
  const edges = typeof edgesData === "string" ? JSON.parse(edgesData) : edgesData;
  const rooms = typeof roomsData === "string" ? JSON.parse(roomsData) : roomsData;

  if (!Array.isArray(nodes)) throw new Error("nodes data must be an array");
  if (!Array.isArray(edges)) throw new Error("edges data must be an array");
  if (!Array.isArray(rooms)) throw new Error("rooms data must be an array");

  const nodeMap = new Map();

  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || !node.id.trim()) {
      throw new Error("Node missing valid id");
    }
    if (nodeMap.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    if (!edge || typeof edge.from !== "string" || typeof edge.to !== "string") {
      throw new Error("Edge missing valid from/to endpoints");
    }
    if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
      throw new Error(`Edge ${edge.from} - ${edge.to} names a node that does not exist`);
    }
    if (typeof edge.distance !== "number" || isNaN(edge.distance) || edge.distance <= 0) {
      throw new Error(`Edge ${edge.from} - ${edge.to} has non-positive or non-numeric distance: ${edge.distance}`);
    }
  }

  for (const room of rooms) {
    if (!room || typeof room.id !== "string" || !room.id.trim()) {
      throw new Error("Room missing valid id");
    }
    if (!Array.isArray(room.doors) || room.doors.length === 0) {
      throw new Error(`Room ${room.id} lists no doors`);
    }
    for (const door of room.doors) {
      if (!door || typeof door.node !== "string" || !door.node.trim()) {
        throw new Error(`Room ${room.id} has a door without a valid node id`);
      }
      if (!nodeMap.has(door.node)) {
        throw new Error(`Room ${room.id}: door node ${door.node} does not exist`);
      }
    }
  }

  return { nodes, edges, rooms };
}

/**
 * Fetches nodes.json, edges.json, and rooms.json via HTTP fetch()
 * for browser use and returns parsed graph data.
 *
 * @param {string} [baseUrl="data/"]
 * @returns {Promise<{ nodes: Array, edges: Array, rooms: Array }>}
 */
export async function loadGraphData(baseUrl = "data/") {
  const url = (file) => (baseUrl.endsWith("/") ? `${baseUrl}${file}` : `${baseUrl}/${file}`);
  const [nodesRes, edgesRes, roomsRes] = await Promise.all([
    fetch(url("nodes.json")),
    fetch(url("edges.json")),
    fetch(url("rooms.json"))
  ]);

  if (!nodesRes.ok || !edgesRes.ok || !roomsRes.ok) {
    throw new Error(
      `Failed to fetch graph data files: status ${nodesRes.status}/${edgesRes.status}/${roomsRes.status}`
    );
  }

  const [nodesJson, edgesJson, roomsJson] = await Promise.all([
    nodesRes.json(),
    edgesRes.json(),
    roomsRes.json()
  ]);

  return parseGraphData(nodesJson, edgesJson, roomsJson);
}
