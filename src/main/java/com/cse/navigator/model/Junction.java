package com.cse.navigator.model;

/** A corridor point: a corner, the hall/ring meeting point, or the spot in front of a door. */
public class Junction extends Node {

    public Junction(String id, int floor, double x, double y) {
        super(id, floor, x, y);
    }

    @Override
    public String getDisplayName() { return "Corridor point " + getId(); }

    @Override
    public String getType() { return "JUNCTION"; }
}
