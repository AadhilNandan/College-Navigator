/**
 * Binary Min-Heap Priority Queue and Dijkstra's Shortest Path Algorithm.
 * Matches the Java core implementation (O(E log V)).
 */

export class MinHeap {
  constructor() {
    /** @type {Array<{ id: string, cost: number }>} */
    this.heap = [];
  }

  get size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.isEmpty()) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (!this.isEmpty()) {
      this.heap[0] = bottom;
      this._bubbleDown(0);
    }
    return top;
  }

  _bubbleUp(index) {
    const item = this.heap[index];
    while (index > 0) {
      const parentIdx = (index - 1) >> 1;
      const parent = this.heap[parentIdx];
      if (item.cost >= parent.cost) break;
      this.heap[index] = parent;
      index = parentIdx;
    }
    this.heap[index] = item;
  }

  _bubbleDown(index) {
    const length = this.heap.length;
    const item = this.heap[index];
    const halfLength = length >> 1;

    while (index < halfLength) {
      let leftIdx = (index << 1) + 1;
      let rightIdx = leftIdx + 1;
      let bestIdx = leftIdx;
      let bestItem = this.heap[leftIdx];

      if (rightIdx < length && this.heap[rightIdx].cost < bestItem.cost) {
        bestIdx = rightIdx;
        bestItem = this.heap[rightIdx];
      }

      if (item.cost <= bestItem.cost) break;
      this.heap[index] = bestItem;
      index = bestIdx;
    }
    this.heap[index] = item;
  }
}

/**
 * Finds shortest route from startId(s) to target(s).
 *
 * Pass-through rule (Java canPassThrough):
 * A node may be traversed as an intermediate only if it is routable;
 * a non-routable node may be reached only if it is itself in the targets set.
 *
 * @param {import("./graph.js").Graph} graph
 * @param {string|Array<string>} startId
 * @param {string|Array<string>} targets
 * @returns {{ found: boolean, distance: number, nodeIds: Array<string> }}
 */
export function findRoute(graph, startId, targets) {
  const startList = Array.isArray(startId) ? startId : [startId];
  const targetList = Array.isArray(targets) ? targets : [targets];

  if (startList.length === 0 || targetList.length === 0) {
    return { found: false, distance: Infinity, nodeIds: [] };
  }

  const startSet = new Set(startList);
  const targetSet = new Set(targetList);

  // If already at destination
  for (const s of startSet) {
    if (targetSet.has(s)) {
      return { found: true, distance: 0, nodeIds: [s] };
    }
  }

  /** @type {Map<string, number>} */
  const best = new Map();
  /** @type {Map<string, { from: string, to: string, distance: number }>} */
  const arrivedBy = new Map();
  /** @type {Set<string>} */
  const settled = new Set();
  const queue = new MinHeap();

  for (const s of startSet) {
    if (!graph.hasNode(s)) continue;
    best.set(s, 0.0);
    queue.push({ id: s, cost: 0.0 });
  }

  while (!queue.isEmpty()) {
    const step = queue.pop();
    const currentId = step.id;

    if (settled.has(currentId)) {
      continue; // older, longer copy of this node
    }
    settled.add(currentId);

    if (targetSet.has(currentId)) {
      // Rebuild path backwards from currentId
      const nodeIds = [];
      let cursor = currentId;
      nodeIds.unshift(cursor);
      while (arrivedBy.has(cursor)) {
        const edge = arrivedBy.get(cursor);
        cursor = edge.from;
        nodeIds.unshift(cursor);
      }
      return {
        found: true,
        distance: step.cost,
        nodeIds
      };
    }

    const edges = graph.getEdgesFrom(currentId);
    for (const edge of edges) {
      const nextId = edge.to;
      if (settled.has(nextId)) continue;

      const nextNode = graph.getNode(nextId);
      // canPassThrough rule: node must be routable OR explicitly in targetSet
      const canPassThrough = nextNode.routable !== false || targetSet.has(nextId);
      if (!canPassThrough) continue;

      const candidateCost = step.cost + edge.distance;
      const knownCost = best.get(nextId);

      if (knownCost === undefined || candidateCost < knownCost) {
        best.set(nextId, candidateCost);
        arrivedBy.set(nextId, edge);
        queue.push({ id: nextId, cost: candidateCost });
      }
    }
  }

  return { found: false, distance: Infinity, nodeIds: [] };
}
