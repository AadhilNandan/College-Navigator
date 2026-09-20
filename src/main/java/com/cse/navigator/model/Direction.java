package com.cse.navigator.model;

import java.util.Objects;

/**
 * Cardinal facing and movement directions for route segments.
 *
 * Values:
 * - FRONT (south, +y)
 * - BACK (north, -y)
 * - LEFT (west, -x)
 * - RIGHT (east, +x)
 */
public enum Direction {
    FRONT("front"),
    BACK("back"),
    LEFT("left"),
    RIGHT("right");

    private final String jsonLabel;

    Direction(String jsonLabel) {
        this.jsonLabel = jsonLabel;
    }

    /**
     * Returns the lowercase label used in JSON: "front", "back", "left", "right".
     */
    public String getJsonLabel() {
        return jsonLabel;
    }

    /**
     * Determines movement direction between two nodes.
     * Chooses the axis with the larger absolute difference.
     * On an exact tie (|dy| == |dx|), vertical wins (dy >= 0 -> FRONT, dy < 0 -> BACK).
     *
     * Coordinates are used only for direction and animation, never for distance.
     */
    public static Direction between(Node from, Node to) {
        Objects.requireNonNull(from, "from node cannot be null");
        Objects.requireNonNull(to, "to node cannot be null");

        double dx = to.getX() - from.getX();
        double dy = to.getY() - from.getY();

        double absDx = Math.abs(dx);
        double absDy = Math.abs(dy);

        // On an exact tie (|dy| == |dx|), vertical wins
        if (absDy >= absDx) {
            return dy >= 0 ? FRONT : BACK;
        } else {
            return dx >= 0 ? RIGHT : LEFT;
        }
    }
}
