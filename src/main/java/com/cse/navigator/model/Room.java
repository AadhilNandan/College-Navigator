package com.cse.navigator.model;

import java.util.*;

/**
 * A destination a student can search for. A room is not part of the graph itself:
 * it owns one or more {@link DoorNode}s, and those are what the router walks to.
 */
public class Room {

    private final String id;
    private final String code;
    private final String name;
    private final RoomCategory category;
    private final List<DoorNode> doors;
    private final DoorNode primaryDoor;
    private final Map<String, String> doorLabels;
    private final boolean searchable;
    private final boolean locked;
    private final String status;

    public Room(String id, String code, String name, RoomCategory category,
                List<DoorNode> doors, DoorNode primaryDoor, Map<String, String> doorLabels,
                boolean searchable, boolean locked, String status) {
        this.id = Objects.requireNonNull(id, "id");
        this.code = Objects.requireNonNull(code, "code");
        this.name = Objects.requireNonNull(name, "name");
        this.category = Objects.requireNonNull(category, "category");
        this.doors = List.copyOf(Objects.requireNonNull(doors, "doors"));
        this.primaryDoor = Objects.requireNonNull(primaryDoor, "primaryDoor");
        if (this.doors.isEmpty()) {
            throw new IllegalArgumentException("Room " + id + " has no doors");
        }
        if (!this.doors.contains(primaryDoor)) {
            throw new IllegalArgumentException(
                    "Room " + id + ": the primary door is not one of its doors");
        }
        this.doorLabels = Map.copyOf(doorLabels == null ? Map.of() : doorLabels);
        this.searchable = searchable;
        this.locked = locked;
        this.status = status;
    }

    public String getId() { return id; }

    /** As printed on the door, e.g. "WAB 206". */
    public String getCode() { return code; }

    public String getName() { return name; }

    public RoomCategory getCategory() { return category; }

    public List<DoorNode> getDoors() { return doors; }

    /** The door used when nothing better is known, e.g. for the map pin. */
    public DoorNode getPrimaryDoor() { return primaryDoor; }

    /** The doors a route is actually allowed to use. Empty for a locked room. */
    public List<DoorNode> getRoutableDoors() {
        List<DoorNode> open = new ArrayList<>();
        for (DoorNode door : doors) {
            if (door.isRoutable()) open.add(door);
        }
        return open;
    }

    public String getDoorLabel(String doorId) {
        return doorLabels.getOrDefault(doorId, "Door");
    }

    public boolean isSearchable() { return searchable; }

    public boolean isLocked() { return locked; }

    /** Free text such as "Usually closed", or null. */
    public String getStatus() { return status; }

    public String getFullLabel() { return code + " - " + name; }

    /** Loose match used by the search box: code, name or category, case insensitive. */
    public boolean matches(String query) {
        if (query == null || query.isBlank()) return true;
        String q = query.trim().toLowerCase(Locale.ROOT);
        String flat = code.toLowerCase(Locale.ROOT).replace(" ", "");
        return flat.contains(q.replace(" ", ""))
                || name.toLowerCase(Locale.ROOT).contains(q)
                || category.getLabel().toLowerCase(Locale.ROOT).contains(q);
    }

    @Override
    public String toString() { return getFullLabel(); }
}
