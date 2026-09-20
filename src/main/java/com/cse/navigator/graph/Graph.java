package com.cse.navigator.graph;

import com.cse.navigator.model.Edge;
import com.cse.navigator.model.Node;

import java.util.*;

/**
 * The walkable network of the CSE block, held as an adjacency list.
 * Every corridor stretch is stored in both directions, because a student can
 * walk either way along it.
 */
public class Graph {

    private final Map<String, Node> nodesById = new LinkedHashMap<>();
    private final Map<Node, List<Edge>> adjacency = new HashMap<>();
    private int edgeCount = 0;

    public void addNode(Node node) {
        if (nodesById.containsKey(node.getId())) {
            throw new IllegalArgumentException("Duplicate node id: " + node.getId());
        }
        nodesById.put(node.getId(), node);
        adjacency.put(node, new ArrayList<>());
    }

    public boolean hasNode(String id) { return nodesById.containsKey(id); }

    public Node getNode(String id) {
        Node node = nodesById.get(id);
        if (node == null) {
            throw new IllegalArgumentException("Unknown node id: " + id);
        }
        return node;
    }

    public void addUndirectedEdge(String fromId, String toId, double distance) {
        if (fromId.equals(toId)) {
            throw new IllegalArgumentException("Edge cannot connect a node to itself: " + fromId);
        }
        Node from = getNode(fromId);
        Node to = getNode(toId);
        for (Edge existing : adjacency.get(from)) {
            if (existing.getTo().equals(to)) {
                throw new IllegalArgumentException("Duplicate edge: " + fromId + " - " + toId);
            }
        }
        Edge edge = new Edge(from, to, distance);
        adjacency.get(from).add(edge);
        adjacency.get(to).add(edge.reversed());
        edgeCount++;
    }

    /**
     * Removes a corridor stretch in both directions, which is how a blocked
     * corridor is simulated. Returns false if there was no such stretch.
     */
    public boolean removeUndirectedEdge(String fromId, String toId) {
        Node from = getNode(fromId);
        Node to = getNode(toId);
        boolean removed = adjacency.get(from).removeIf(e -> e.getTo().equals(to));
        adjacency.get(to).removeIf(e -> e.getTo().equals(from));
        if (removed) edgeCount--;
        return removed;
    }

    /** Everything reachable in one step from this node. Never null. */
    public List<Edge> getEdgesFrom(Node node) {
        List<Edge> edges = adjacency.get(node);
        if (edges == null) {
            throw new IllegalArgumentException("Node is not in this graph: " + node);
        }
        return Collections.unmodifiableList(edges);
    }

    public Collection<Node> getNodes() {
        return Collections.unmodifiableCollection(nodesById.values());
    }

    public int nodeCount() { return nodesById.size(); }

    public int edgeCount() { return edgeCount; }

    /** Total length of every corridor stretch, in metres. Handy as a sanity check. */
    public double totalEdgeLength() {
        double total = 0;
        for (List<Edge> list : adjacency.values()) {
            for (Edge edge : list) total += edge.getDistance();
        }
        return total / 2.0;   // each stretch is stored twice
    }

    @Override
    public String toString() {
        return "Graph(" + nodeCount() + " nodes, " + edgeCount() + " edges)";
    }
}
