package com.cse.navigator.model;

/**
 * Where this block hands over to the rest of the campus. It is a normal walkable
 * node, and it is the default "You are here" for a student walking in.
 */
public class BoundaryNode extends Node {

    private final String name;

    public BoundaryNode(String id, int floor, double x, double y, String name) {
        super(id, floor, x, y);
        this.name = (name == null || name.isBlank()) ? "Block Boundary" : name;
    }

    @Override
    public String getDisplayName() { return name; }

    @Override
    public String getType() { return "BOUNDARY"; }
}
