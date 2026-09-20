package com.cse.navigator.model;

/**
 * An emergency exit. It is drawn on the map but never used as part of a normal
 * walking route, so it is permanently non-routable.
 */
public class FireExit extends Node {

    private final String name;

    public FireExit(String id, int floor, double x, double y, String name) {
        super(id, floor, x, y);
        this.name = (name == null || name.isBlank()) ? "Fire Exit" : name;
    }

    @Override
    public boolean isRoutable() { return false; }

    @Override
    public String getDisplayName() { return name; }

    @Override
    public String getType() { return "FIRE_EXIT"; }
}
