package com.cse.navigator.model;

import java.util.Objects;

/**
 * The door of a room. A route always ends at a door, never inside a room,
 * which is why doors are nodes and rooms are not.
 */
public class DoorNode extends Node {

    private final String roomId;
    private final boolean routable;

    public DoorNode(String id, int floor, double x, double y, String roomId, boolean routable) {
        super(id, floor, x, y);
        this.roomId = Objects.requireNonNull(roomId, "roomId");
        this.routable = routable;
    }

    public String getRoomId() { return roomId; }

    @Override
    public boolean isRoutable() { return routable; }

    @Override
    public String getDisplayName() { return "Door of " + roomId; }

    @Override
    public String getType() { return "ROOM_DOOR"; }
}
