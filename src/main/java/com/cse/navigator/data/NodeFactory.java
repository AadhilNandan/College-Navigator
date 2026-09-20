package com.cse.navigator.data;

import com.cse.navigator.model.*;

/** The one place that turns the "type" field into a concrete {@link Node} subclass. */
public final class NodeFactory {

    private NodeFactory() {}

    public static Node create(NodeData d) {
        if (d.id() == null || d.id().isBlank()) {
            throw new IllegalArgumentException("A node has no id");
        }
        if (d.type() == null) {
            throw new IllegalArgumentException("Node " + d.id() + " has no type");
        }
        int floor = d.floor() == null ? 1 : d.floor();
        return switch (d.type()) {
            case "JUNCTION" -> new Junction(d.id(), floor, d.x(), d.y());
            case "ROOM_DOOR" -> {
                if (d.room() == null || d.room().isBlank()) {
                    throw new IllegalArgumentException("Door node " + d.id() + " has no room");
                }
                boolean routable = d.routable() == null || d.routable();
                yield new DoorNode(d.id(), floor, d.x(), d.y(), d.room(), routable);
            }
            case "FIRE_EXIT" -> new FireExit(d.id(), floor, d.x(), d.y(), d.name());
            case "BOUNDARY" -> new BoundaryNode(d.id(), floor, d.x(), d.y(), d.name());
            default -> throw new IllegalArgumentException(
                    "Unknown node type '" + d.type() + "' for node " + d.id());
        };
    }
}
