/**
 * Graph data structure for CSE Block Navigator.
 * Stores nodes by ID and maintains an undirected adjacency list with edge distances.
 */
export class Graph {
  constructor() {
    /** @type {Map<string, Object>} */
    this.nodesById = new Map();
    /** @type {Map<string, Array<{ from: string, to: string, distance: number }>>} */
    this.adjacency = new Map();
    this.edgeCount = 0;
  }

  /**
   * Adds a node to the graph.
   * A node is routable unless explicitly marked with "routable": false.
   * Coordinates x and y are preserved strictly for visualization/drawing.
   *
   * @param {Object} node
   */
  addNode(node) {
    if (!node || typeof node.id !== "string") {
      throw new Error("Node must have a valid string id");
    }
    if (this.nodesById.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }

    const nodeRecord = {
      ...node,
      routable: node.routable !== false
    };

    this.nodesById.set(node.id, nodeRecord);
    this.adjacency.set(node.id, []);
  }

  /**
   * Checks if a node id exists in the graph.
   * @param {string} id
   * @returns {boolean}
   */
  hasNode(id) {
    return this.nodesById.has(id);
  }

  /**
   * Returns the node object for a given id.
   * @param {string} id
   * @returns {Object}
   */
  getNode(id) {
    const node = this.nodesById.get(id);
    if (!node) {
      throw new Error(`Unknown node id: ${id}`);
    }
    return node;
  }

  /**
   * Returns an array of all nodes in the graph.
   * @returns {Array<Object>}
   */
  getNodes() {
    return Array.from(this.nodesById.values());
  }

  /**
   * Adds an undirected edge between fromId and toId with distance weight.
   * @param {string} fromId
   * @param {string} toId
   * @param {number} distance
   */
  addUndirectedEdge(fromId, toId, distance) {
    if (fromId === toId) {
      throw new Error(`Edge cannot connect a node to itself: ${fromId}`);
    }
    if (!this.hasNode(fromId)) {
      throw new Error(`Unknown from node id: ${fromId}`);
    }
    if (!this.hasNode(toId)) {
      throw new Error(`Unknown to node id: ${toId}`);
    }
    if (typeof distance !== "number" || isNaN(distance) || distance <= 0) {
      throw new Error(`Edge distance must be a positive number: ${distance}`);
    }

    const forwardEdges = this.adjacency.get(fromId);
    if (forwardEdges.some((e) => e.to === toId)) {
      throw new Error(`Duplicate edge: ${fromId} - ${toId}`);
    }

    forwardEdges.push({ from: fromId, to: toId, distance });
    this.adjacency.get(toId).push({ from: toId, to: fromId, distance });
    this.edgeCount++;
  }

  /**
   * Returns the list of outgoing edges from a given node.
   * @param {string} nodeId
   * @returns {Array<{ from: string, to: string, distance: number }>}
   */
  getEdgesFrom(nodeId) {
    return this.adjacency.get(nodeId) || [];
  }

  /**
   * Removes an undirected edge between two nodes.
   * @param {string} fromId
   * @param {string} toId
   * @returns {boolean} true if edge was found and removed
   */
  removeUndirectedEdge(fromId, toId) {
    if (!this.hasNode(fromId) || !this.hasNode(toId)) return false;

    const fromList = this.adjacency.get(fromId);
    const toList = this.adjacency.get(toId);

    const fromIdx = fromList.findIndex((e) => e.to === toId);
    const toIdx = toList.findIndex((e) => e.to === fromId);

    if (fromIdx !== -1 && toIdx !== -1) {
      fromList.splice(fromIdx, 1);
      toList.splice(toIdx, 1);
      this.edgeCount--;
      return true;
    }
    return false;
  }

  /**
   * Populates graph from nodes and edges arrays.
   * @param {Array<Object>} nodes
   * @param {Array<Object>} edges
   * @returns {Graph}
   */
  static fromData(nodes, edges) {
    const graph = new Graph();
    for (const node of nodes) {
      graph.addNode(node);
    }
    for (const edge of edges) {
      graph.addUndirectedEdge(edge.from, edge.to, edge.distance);
    }
    return graph;
  }
}
