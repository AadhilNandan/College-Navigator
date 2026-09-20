package com.cse.navigator.service;

import com.cse.navigator.model.*;

import java.util.*;

/**
 * Turns a {@link Route} into the short walking instructions a student reads
 * under the map. Straight stretches are merged, so the list says "walk 24 m"
 * once instead of naming every corridor point along the way.
 */
public class DirectionBuilder {

    /** Below this angle the corridor counts as straight ahead. */
    private static final double STRAIGHT_DEGREES = 20;

    /** Above this angle the student has doubled back. */
    private static final double REVERSE_DEGREES = 135;

    private final Map<String, Room> rooms;

    public DirectionBuilder(Map<String, Room> rooms) {
        this.rooms = Objects.requireNonNull(rooms, "rooms");
    }

    public List<String> describe(Route route) {
        if (!route.isFound()) {
            return List.of("There is no walkable route between those two points.");
        }
        List<String> steps = new ArrayList<>();
        steps.add("Start at " + label(route.getStart()) + ".");

        List<Edge> edges = route.getEdges();
        double run = 0;
        double[] previous = null;

        for (Edge edge : edges) {
            double[] heading = headingOf(edge);
            if (previous != null) {
                double turn = turnAngle(previous, heading);
                if (Math.abs(turn) >= STRAIGHT_DEGREES) {
                    steps.add(walk(run));
                    steps.add(turnInstruction(turn));
                    run = 0;
                }
            }
            run += edge.getDistance();
            previous = heading;
        }
        if (run > 0) steps.add(walk(run));

        steps.add("You have arrived at " + label(route.getDestination()) + ". Total "
                + Math.round(route.getTotalDistance()) + " m, about "
                + Math.max(1, route.estimatedSeconds() / 60 + 1) + " min walk.");
        return steps;
    }

    private String walk(double metres) {
        return "Walk about " + Math.max(1, Math.round(metres)) + " m along the corridor.";
    }

    private String turnInstruction(double turn) {
        if (Math.abs(turn) >= REVERSE_DEGREES) return "Turn around.";
        return turn > 0 ? "Turn right." : "Turn left.";
    }

    /** Unit vector of the walking direction, with x east and y south. */
    private double[] headingOf(Edge edge) {
        double dx = edge.getTo().getX() - edge.getFrom().getX();
        double dy = edge.getTo().getY() - edge.getFrom().getY();
        double length = Math.hypot(dx, dy);
        return length == 0 ? new double[] {0, 0} : new double[] {dx / length, dy / length};
    }

    /**
     * Signed angle in degrees between two headings. Positive is a right turn,
     * because y grows southwards on the map.
     */
    private double turnAngle(double[] a, double[] b) {
        double cross = a[0] * b[1] - a[1] * b[0];
        double dot = a[0] * b[0] + a[1] * b[1];
        return Math.toDegrees(Math.atan2(cross, dot));
    }

    private String label(Node node) {
        if (node instanceof DoorNode door) {
            Room room = rooms.get(door.getRoomId());
            if (room != null) {
                return room.getFullLabel() + " (" + room.getDoorLabel(door.getId()) + ")";
            }
        }
        return node.getDisplayName();
    }
}
