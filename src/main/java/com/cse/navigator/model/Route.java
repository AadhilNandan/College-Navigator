package com.cse.navigator.model;

import java.util.*;

/**
 * The result of one search: the nodes walked through, in order, the corridor
 * stretches between them, and the total walking distance in metres.
 */
public final class Route {

    private final List<Node> nodes;
    private final List<Edge> edges;
    private final double totalDistance;

    private Route(List<Node> nodes, List<Edge> edges, double totalDistance) {
        this.nodes = List.copyOf(nodes);
        this.edges = List.copyOf(edges);
        this.totalDistance = totalDistance;
    }

    public static Route of(List<Node> nodes, List<Edge> edges) {
        if (nodes.isEmpty()) {
            throw new IllegalArgumentException("A found route must have at least one node");
        }
        if (edges.size() != nodes.size() - 1) {
            throw new IllegalArgumentException("Route has " + nodes.size()
                    + " nodes but " + edges.size() + " edges");
        }
        double total = 0;
        for (Edge edge : edges) total += edge.getDistance();
        return new Route(nodes, edges, total);
    }

    /** Returned when no walkable path exists between the two ends. */
    public static Route notFound() {
        return new Route(List.of(), List.of(), Double.POSITIVE_INFINITY);
    }

    public boolean isFound() { return !nodes.isEmpty(); }

    public List<Node> getNodes() { return nodes; }

    public List<Edge> getEdges() { return edges; }

    public double getTotalDistance() { return totalDistance; }

    public Node getStart() {
        requireFound();
        return nodes.get(0);
    }

    public Node getDestination() {
        requireFound();
        return nodes.get(nodes.size() - 1);
    }

    /** Rough walking time at a normal indoor pace of 1.3 m/s. */
    public int estimatedSeconds() {
        requireFound();
        return (int) Math.round(totalDistance / 1.3);
    }

    /** Node ids only. This is what the browser map animates along. */
    public List<String> getNodeIds() {
        List<String> ids = new ArrayList<>(nodes.size());
        for (Node node : nodes) ids.add(node.getId());
        return ids;
    }

    /** A compact JSON object, so the same route can be handed to the web front end. */
    public String toJson() {
        if (!isFound()) {
            return "{\"found\":false}";
        }
        StringBuilder sb = new StringBuilder("{\"found\":true,\"distance\":");
        sb.append(String.format(Locale.ROOT, "%.2f", totalDistance));
        sb.append(",\"seconds\":").append(estimatedSeconds()).append(",\"path\":[");
        for (int i = 0; i < nodes.size(); i++) {
            if (i > 0) sb.append(',');
            Node node = nodes.get(i);
            sb.append(String.format(Locale.ROOT,
                    "{\"id\":\"%s\",\"x\":%.2f,\"y\":%.2f}",
                    node.getId(), node.getX(), node.getY()));
        }
        return sb.append("]}").toString();
    }

    private void requireFound() {
        if (!isFound()) {
            throw new IllegalStateException("There is no route between those two points");
        }
    }

    @Override
    public String toString() {
        if (!isFound()) return "Route(not found)";
        return String.join(" -> ", getNodeIds())
                + String.format(Locale.ROOT, "  [%.2f m]", totalDistance);
    }
}
