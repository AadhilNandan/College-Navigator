package com.cse.navigator.model;

import java.util.Objects;

/**
 * A single point in the building that a route can pass through:
 * a corridor junction, a room door, a fire exit or a block boundary.
 *
 * Nodes are identified by their id alone, so a node can be looked up,
 * put in a set or used as a map key without carrying its geometry around.
 */
public abstract class Node {

    private final String id;
    private final int floor;
    private final double x;
    private final double y;

    protected Node(String id, int floor, double x, double y) {
        this.id = Objects.requireNonNull(id, "id");
        if (id.isBlank()) {
            throw new IllegalArgumentException("A node id cannot be blank");
        }
        this.floor = floor;
        this.x = x;
        this.y = y;
    }

    public String getId() { return id; }

    public int getFloor() { return floor; }

    /** Metres east of the top-left corner of the ring corridor. */
    public double getX() { return x; }

    /** Metres south of the top wall of the ring corridor. Negative inside the entry hall. */
    public double getY() { return y; }

    /** Human readable label. Subclasses override where they have something better to say. */
    public abstract String getDisplayName();

    /** Short machine label, matching the "type" field in nodes.json. */
    public abstract String getType();

    /**
     * Whether a route is allowed to pass through this node.
     * Fire exits and the door of the locked store room are not routable.
     */
    public boolean isRoutable() { return true; }

    public double straightLineDistanceTo(Node other) {
        double dx = x - other.x;
        double dy = y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Node other)) return false;
        return id.equals(other.id);
    }

    @Override
    public final int hashCode() { return id.hashCode(); }

    @Override
    public String toString() { return getType() + "(" + id + ")"; }
}
