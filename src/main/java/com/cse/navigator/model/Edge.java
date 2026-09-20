package com.cse.navigator.model;

import java.util.Objects;

/** A walkable stretch of corridor between two nodes, with its length in metres. */
public final class Edge {

    private final Node from;
    private final Node to;
    private final double distance;

    public Edge(Node from, Node to, double distance) {
        this.from = Objects.requireNonNull(from, "from");
        this.to = Objects.requireNonNull(to, "to");
        if (distance <= 0) {
            throw new IllegalArgumentException(
                    "Edge " + from.getId() + " - " + to.getId() + " has a non-positive length");
        }
        this.distance = distance;
    }

    public Node getFrom() { return from; }

    public Node getTo() { return to; }

    public double getDistance() { return distance; }

    /** The same stretch walked the other way, used to store both directions. */
    public Edge reversed() { return new Edge(to, from, distance); }

    @Override
    public String toString() {
        return from.getId() + " -> " + to.getId() + " (" + distance + " m)";
    }
}
