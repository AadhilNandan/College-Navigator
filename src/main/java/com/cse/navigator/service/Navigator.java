package com.cse.navigator.service;

import com.cse.navigator.data.GraphLoader;
import com.cse.navigator.graph.Dijkstra;
import com.cse.navigator.graph.Graph;
import com.cse.navigator.model.*;

import java.nio.file.Path;
import java.util.*;

/**
 * The front door of the whole core. Everything the user interface needs sits
 * here: the room list, the search, and shortest route queries.
 *
 * For single-destination routing to a room, the primary door (e.g. D2 for WAB 203)
 * is used as the default, while other doors remain available for explicit routing.
 */
public class Navigator {

    /** Where a student walks in from the rest of the campus. */
    public static final String DEFAULT_START = "ENTRANCE";

    private final Graph graph;
    private final Map<String, Room> rooms;
    private final Dijkstra dijkstra;
    private final DirectionBuilder directions;

    public Navigator(Graph graph, Map<String, Room> rooms) {
        this.graph = Objects.requireNonNull(graph, "graph");
        this.rooms = Map.copyOf(Objects.requireNonNull(rooms, "rooms"));
        this.dijkstra = new Dijkstra(graph);
        this.directions = new DirectionBuilder(this.rooms);
    }

    /** Loads everything from the shared data folder. */
    public static Navigator load() {
        Graph graph = GraphLoader.loadGraph();
        return new Navigator(graph, GraphLoader.loadRooms(graph));
    }

    public static Navigator load(Path nodesFile, Path edgesFile, Path roomsFile) {
        Graph graph = GraphLoader.loadGraph(nodesFile, edgesFile);
        return new Navigator(graph, GraphLoader.loadRooms(roomsFile, graph));
    }

    public Graph getGraph() { return graph; }

    public Collection<Room> getAllRooms() { return rooms.values(); }

    public Room getRoom(String roomId) {
        Room room = rooms.get(roomId);
        if (room == null) {
            throw new IllegalArgumentException("There is no room with id " + roomId);
        }
        return room;
    }

    /** Rooms offered in the search box, best match order: code first, then name. */
    public List<Room> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String qNorm = normalizeSearch(query);
        if (qNorm.isEmpty()) {
            return List.of();
        }

        List<Room> found = new ArrayList<>();
        for (Room room : rooms.values()) {
            if (!room.isSearchable()) continue;

            String codeNorm = normalizeSearch(room.getCode());
            String nameNorm = normalizeSearch(room.getName());
            String catLabelNorm = normalizeSearch(room.getCategory().getLabel());
            String catNameNorm = normalizeSearch(room.getCategory().name());

            boolean matches = codeNorm.contains(qNorm)
                    || nameNorm.contains(qNorm)
                    || catLabelNorm.contains(qNorm)
                    || catNameNorm.contains(qNorm);

            if (!matches) {
                for (DoorNode door : room.getDoors()) {
                    String doorLabel = room.getDoorLabel(door.getId());
                    if (doorLabel != null && normalizeSearch(doorLabel).contains(qNorm)) {
                        matches = true;
                        break;
                    }
                }
            }

            if (matches) {
                found.add(room);
            }
        }
        found.sort(Comparator.comparing(Room::getCode));
        return found;
    }

    private static String normalizeSearch(String s) {
        if (s == null) return "";
        return s.toLowerCase(Locale.ROOT).replaceAll("[\\s-]+", "");
    }

    /**
     * Route from the entrance to a room's primary door (default entrance).
     * For WAB203, D2 is the primary/default door.
     */
    public Route routeTo(String roomId) {
        return routeFromNode(DEFAULT_START, roomId);
    }

    /**
     * Route to a room's primary door from a specified start node.
     */
    public Route routeFromNode(String startNodeId, String roomId) {
        Room destination = getRoom(roomId);
        if (destination.isLocked() || destination.getRoutableDoors().isEmpty()) {
            throw new IllegalArgumentException(destination.getFullLabel()
                    + " cannot be routed to"
                    + (destination.getStatus() == null ? "" : " (" + destination.getStatus() + ")"));
        }
        return dijkstra.findRoute(startNodeId, destination.getPrimaryDoor().getId());
    }

    /**
     * Route from a start node to an explicit door of a room (e.g. W203_D1, W203_D3).
     */
    public Route routeToDoor(String startNodeId, String roomId, String doorId) {
        Room destination = getRoom(roomId);
        if (destination.isLocked() || destination.getRoutableDoors().isEmpty()) {
            throw new IllegalArgumentException(destination.getFullLabel() + " cannot be routed to");
        }
        boolean hasDoor = destination.getRoutableDoors().stream().anyMatch(d -> d.getId().equals(doorId));
        if (!hasDoor) {
            throw new IllegalArgumentException("Room " + roomId + " has no open door with id " + doorId);
        }
        return dijkstra.findRoute(startNodeId, doorId);
    }

    /**
     * Shortest route to whichever door of a room is nearest.
     */
    public Route routeToNearestDoor(String startNodeId, String roomId) {
        Room destination = getRoom(roomId);
        List<String> doors = doorIdsOf(destination);
        return dijkstra.findRoute(List.of(startNodeId), doors);
    }

    /** Shortest route between two rooms, door to door. */
    public Route routeBetweenRooms(String fromRoomId, String toRoomId) {
        Room from = getRoom(fromRoomId);
        Room to = getRoom(toRoomId);
        return dijkstra.findRoute(doorIdsOf(from), doorIdsOf(to));
    }

    public List<String> directionsFor(Route route) {
        return directions.describe(route);
    }

    /**
     * The doors a route may use. A locked room keeps its doors in the data so it
     * still appears on the map, but it cannot be walked to.
     */
    private List<String> doorIdsOf(Room room) {
        List<DoorNode> open = room.getRoutableDoors();
        if (open.isEmpty()) {
            throw new IllegalArgumentException(room.getFullLabel()
                    + " cannot be routed to"
                    + (room.getStatus() == null ? "" : " (" + room.getStatus() + ")"));
        }
        List<String> ids = new ArrayList<>(open.size());
        for (DoorNode door : open) ids.add(door.getId());
        return ids;
    }
}
