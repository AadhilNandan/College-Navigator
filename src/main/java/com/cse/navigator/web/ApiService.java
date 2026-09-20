package com.cse.navigator.web;

import com.cse.navigator.model.Direction;
import com.cse.navigator.model.DoorNode;
import com.cse.navigator.model.Node;
import com.cse.navigator.model.Room;
import com.cse.navigator.model.Route;
import com.cse.navigator.service.Navigator;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.List;
import java.util.Objects;

/**
 * Pure business logic and JSON serialization for web requests.
 * Delegates search and routing to the Java {@link Navigator}.
 */
public class ApiService {

    private final Navigator navigator;
    private final Gson gson;

    public ApiService(Navigator navigator) {
        this.navigator = Objects.requireNonNull(navigator, "navigator");
        this.gson = new GsonBuilder().create();
    }

    /**
     * All searchable rooms (WAB 217 is excluded).
     */
    public String rooms() {
        JsonArray array = new JsonArray();
        for (Room room : navigator.getAllRooms()) {
            if (!room.isSearchable()) continue;
            array.add(roomToJson(room));
        }
        return gson.toJson(array);
    }

    /**
     * Rooms matching the given query string.
     */
    public String search(String query) {
        JsonArray array = new JsonArray();
        List<Room> found = navigator.search(query);
        for (Room room : found) {
            if (!room.isSearchable()) continue;
            array.add(roomToJson(room));
        }
        return gson.toJson(array);
    }

    /**
     * Routes from ENTRANCE to a room's primary door (when doorId is null/blank),
     * or to an explicit door.
     */
    public String route(String roomId, String doorId) {
        try {
            if (roomId == null || roomId.isBlank()) {
                return errorJson("Room ID is required");
            }

            Room room = navigator.getRoom(roomId);
            Route route = (doorId == null || doorId.isBlank())
                    ? navigator.routeTo(roomId)
                    : navigator.routeToDoor(Navigator.DEFAULT_START, roomId, doorId);

            if (!route.isFound()) {
                return errorJson("No route found to " + room.getFullLabel());
            }

            JsonObject json = JsonParser.parseString(route.toJson()).getAsJsonObject();
            // Remove time estimate per spec
            json.remove("seconds");

            json.addProperty("roomId", room.getId());
            json.addProperty("roomCode", room.getCode());
            json.addProperty("roomName", room.getName());
            json.addProperty("category", room.getCategory().name());
            json.addProperty("doorId", route.getDestination().getId());

            JsonArray nodeIds = new JsonArray();
            for (String nid : route.getNodeIds()) {
                nodeIds.add(nid);
            }
            json.add("nodeIds", nodeIds);

            JsonArray directions = new JsonArray();
            List<Node> nodes = route.getNodes();
            for (int i = 0; i < nodes.size() - 1; i++) {
                Direction dir = Direction.between(nodes.get(i), nodes.get(i + 1));
                directions.add(dir.getJsonLabel());
            }
            json.add("directions", directions);

            return gson.toJson(json);
        } catch (Exception e) {
            return errorJson(e.getMessage());
        }
    }

    private JsonObject roomToJson(Room room) {
        JsonObject obj = new JsonObject();
        obj.addProperty("id", room.getId());
        obj.addProperty("code", room.getCode());
        obj.addProperty("name", room.getName());
        obj.addProperty("category", room.getCategory().name());

        JsonArray doors = new JsonArray();
        for (DoorNode door : room.getDoors()) {
            JsonObject d = new JsonObject();
            d.addProperty("node", door.getId());
            d.addProperty("label", room.getDoorLabel(door.getId()));
            d.addProperty("primary", door.equals(room.getPrimaryDoor()));
            doors.add(d);
        }
        obj.add("doors", doors);
        return obj;
    }

    private String errorJson(String message) {
        JsonObject err = new JsonObject();
        err.addProperty("error", message == null ? "Unknown error" : message);
        return gson.toJson(err);
    }
}
