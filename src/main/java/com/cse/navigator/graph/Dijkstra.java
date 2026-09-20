package com.cse.navigator.graph;

import com.cse.navigator.model.Edge;
import com.cse.navigator.model.Node;
import com.cse.navigator.model.Route;

import java.util.*;

/**
 * Shortest path by walking distance, using Dijkstra's algorithm with a
 * binary heap, so the cost is O(E log V).
 *
 * Non-routable nodes, meaning fire exits and the door of the locked store room,
 * are never walked through. They are allowed only as the point the student
 * starts from or the point they explicitly asked for.
 */
public class Dijkstra {

    private final Graph graph;

    public Dijkstra(Graph graph) {
        this.graph = Objects.requireNonNull(graph, "graph");
    }

    public Route findRoute(String startId, String destinationId) {
        return findRoute(List.of(startId), List.of(destinationId));
    }

    /**
     * Shortest route from any one of the start nodes to any one of the destination
     * nodes. Rooms with several doors, such as the Seminar Hall, use this so the
     * nearest door wins.
     */
    public Route findRoute(Collection<String> startIds, Collection<String> destinationIds) {
        if (startIds.isEmpty() || destinationIds.isEmpty()) {
            return Route.notFound();
        }
        Set<Node> starts = resolve(startIds);
        Set<Node> targets = resolve(destinationIds);

        for (Node start : starts) {
            if (targets.contains(start)) {
                return Route.of(List.of(start), List.of());
            }
        }

        Map<Node, Double> best = new HashMap<>();
        Map<Node, Edge> arrivedBy = new HashMap<>();
        Set<Node> settled = new HashSet<>();
        PriorityQueue<Step> queue = new PriorityQueue<>(Comparator.comparingDouble(Step::cost));

        for (Node start : starts) {
            best.put(start, 0.0);
            queue.add(new Step(start, 0.0));
        }

        while (!queue.isEmpty()) {
            Step step = queue.poll();
            Node current = step.node();
            if (!settled.add(current)) {
                continue;                       // an older, longer copy of this node
            }
            if (targets.contains(current)) {
                return rebuild(current, arrivedBy);
            }
            for (Edge edge : graph.getEdgesFrom(current)) {
                Node next = edge.getTo();
                if (settled.contains(next)) continue;
                if (!canPassThrough(next, targets)) continue;

                double candidate = step.cost() + edge.getDistance();
                Double known = best.get(next);
                if (known == null || candidate < known) {
                    best.put(next, candidate);
                    arrivedBy.put(next, edge);
                    queue.add(new Step(next, candidate));
                }
            }
        }
        return Route.notFound();
    }

    /** The walking distance alone, or infinity when there is no route. */
    public double distanceBetween(String startId, String destinationId) {
        return findRoute(startId, destinationId).getTotalDistance();
    }

    private boolean canPassThrough(Node node, Set<Node> targets) {
        return node.isRoutable() || targets.contains(node);
    }

    private Set<Node> resolve(Collection<String> ids) {
        Set<Node> nodes = new LinkedHashSet<>();
        for (String id : ids) nodes.add(graph.getNode(id));
        return nodes;
    }

    private Route rebuild(Node destination, Map<Node, Edge> arrivedBy) {
        Deque<Node> nodes = new ArrayDeque<>();
        Deque<Edge> edges = new ArrayDeque<>();
        Node cursor = destination;
        nodes.addFirst(cursor);
        Edge edge;
        while ((edge = arrivedBy.get(cursor)) != null) {
            edges.addFirst(edge);
            cursor = edge.getFrom();
            nodes.addFirst(cursor);
        }
        return Route.of(new ArrayList<>(nodes), new ArrayList<>(edges));
    }

    /** One entry in the priority queue: a node and the best cost found for it so far. */
    private record Step(Node node, double cost) {}
}
