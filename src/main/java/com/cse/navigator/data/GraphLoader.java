package com.cse.navigator.data;

import com.cse.navigator.graph.Graph;
import com.cse.navigator.model.*;
import com.google.gson.Gson;
import com.google.gson.JsonParseException;

import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * Reads the three JSON files into a {@link Graph} and a map of {@link Room}s using Gson.
 *
 * The loader is strict on purpose. A typo in the data is the most likely way
 * this project breaks, so every problem is thrown straight away with the id of
 * whatever caused it, instead of quietly producing a graph with a hole in it.
 */
public final class GraphLoader {

    private static final Gson GSON = Json.gson();

    private GraphLoader() {}

    /** Loads the graph from the shared data folder found by {@link DataFiles}. */
    public static Graph loadGraph() {
        return loadGraph(DataFiles.nodes(), DataFiles.edges());
    }

    public static Graph loadGraph(Path nodesFile, Path edgesFile) {
        Graph graph = new Graph();
        NodeData[] nodes = loadArray(nodesFile, NodeData[].class);
        for (NodeData nodeData : nodes) {
            graph.addNode(NodeFactory.create(nodeData));
        }

        EdgeData[] edges = loadArray(edgesFile, EdgeData[].class);
        for (EdgeData edge : edges) {
            if (edge.from() == null || edge.to() == null) {
                throw new IllegalArgumentException("Edge has missing endpoints");
            }
            if (!graph.hasNode(edge.from()) || !graph.hasNode(edge.to())) {
                throw new IllegalArgumentException(
                        "Edge " + edge.from() + " - " + edge.to() + " names a node that does not exist");
            }
            graph.addUndirectedEdge(edge.from(), edge.to(), edge.distance());
        }
        return graph;
    }

    public static Map<String, Room> loadRooms(Graph graph) {
        return loadRooms(DataFiles.rooms(), graph);
    }

    /** Rooms are loaded after the graph, because every room points at door nodes. */
    public static Map<String, Room> loadRooms(Path roomsFile, Graph graph) {
        Map<String, Room> rooms = new LinkedHashMap<>();
        Set<String> claimedDoors = new HashSet<>();

        RoomData[] roomDataArray = loadArray(roomsFile, RoomData[].class);
        for (RoomData data : roomDataArray) {
            Room room = buildRoom(data, graph);
            if (rooms.put(room.getId(), room) != null) {
                throw new IllegalArgumentException("Duplicate room id: " + room.getId());
            }
            for (DoorNode door : room.getDoors()) {
                if (!claimedDoors.add(door.getId())) {
                    throw new IllegalArgumentException(
                            "Door " + door.getId() + " is listed in more than one room");
                }
                if (!door.getRoomId().equals(room.getId())) {
                    throw new IllegalArgumentException("Door " + door.getId() + " belongs to "
                            + door.getRoomId() + " but is listed under " + room.getId());
                }
            }
        }
        for (Node node : graph.getNodes()) {
            if (node instanceof DoorNode door && !claimedDoors.contains(door.getId())) {
                throw new IllegalArgumentException(
                        "Door node " + door.getId() + " is not listed in any room");
            }
        }
        return rooms;
    }

    private static Room buildRoom(RoomData data, Graph graph) {
        if (data.id() == null || data.id().isBlank()) {
            throw new IllegalArgumentException("A room has no id");
        }
        if (data.doors() == null || data.doors().isEmpty()) {
            throw new IllegalArgumentException("Room " + data.id() + " lists no doors");
        }
        List<DoorNode> doors = new ArrayList<>();
        Map<String, String> labels = new HashMap<>();
        DoorNode primary = null;

        for (DoorData dd : data.doors()) {
            if (dd.node() == null || dd.node().isBlank()) {
                throw new IllegalArgumentException("Room " + data.id() + " has a door without node id");
            }
            Node node = graph.getNode(dd.node());
            if (!(node instanceof DoorNode door)) {
                throw new IllegalArgumentException(
                        "Room " + data.id() + ": node " + dd.node() + " is not a door");
            }
            doors.add(door);
            if (dd.label() != null) labels.put(door.getId(), dd.label());
            if (Boolean.TRUE.equals(dd.primary())) {
                if (primary != null) {
                    throw new IllegalArgumentException(
                            "Room " + data.id() + " has more than one primary door");
                }
                primary = door;
            }
        }
        if (primary == null) {
            throw new IllegalArgumentException("Room " + data.id() + " has no primary door");
        }

        RoomCategory category;
        try {
            category = RoomCategory.valueOf(data.category());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException(
                    "Room " + data.id() + ": unknown category '" + data.category() + "'");
        }
        boolean searchable = data.searchable() == null || data.searchable();
        boolean locked = Boolean.TRUE.equals(data.locked());

        return new Room(data.id(), data.code(), data.name(), category,
                doors, primary, labels, searchable, locked, data.status());
    }

    private static <T> T[] loadArray(Path file, Class<T[]> arrayClass) {
        try (Reader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            T[] array = GSON.fromJson(reader, arrayClass);
            if (array == null || array.length == 0) {
                throw new IllegalArgumentException("No rows in " + file);
            }
            return array;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + file, e);
        } catch (JsonParseException | IllegalArgumentException e) {
            throw new IllegalArgumentException(file.getFileName() + ": " + e.getMessage(), e);
        }
    }
}
