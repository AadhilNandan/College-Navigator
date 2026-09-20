package com.cse.navigator.web;

import static org.junit.jupiter.api.Assertions.*;

import com.cse.navigator.TestData;
import com.cse.navigator.service.Navigator;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.*;

class WebServerTest {

    private ApiService apiService;
    private Navigator navigator;

    @BeforeEach
    void setUp() {
        navigator = Navigator.load(TestData.nodes(), TestData.edges(), TestData.rooms());
        apiService = new ApiService(navigator);
    }

    @Test
    void everyRoutableRoomFromEntranceCheckedWithinTolerance() {
        Map<String, Double> expectedDistances = new LinkedHashMap<>();
        expectedDistances.put("WAB202", 27.5);
        expectedDistances.put("WAB203", 12.8);
        expectedDistances.put("WAB204", 2.6);
        expectedDistances.put("WAB205", 2.6);
        expectedDistances.put("WAB206", 12.8);
        expectedDistances.put("WAB207", 23.0);
        expectedDistances.put("WAB208", 45.3);
        expectedDistances.put("WAB209", 51.3);
        expectedDistances.put("WAB210", 58.1);
        expectedDistances.put("WAB211", 68.3);
        expectedDistances.put("WAB212", 85.6);
        expectedDistances.put("WAB213", 91.9);
        expectedDistances.put("WAB214", 82.3);
        expectedDistances.put("WAB215", 75.4);
        expectedDistances.put("WAB216A", 73.2);
        expectedDistances.put("WAB216", 55.3);
        expectedDistances.put("WAB218", 45.2);

        for (Map.Entry<String, Double> entry : expectedDistances.entrySet()) {
            String roomId = entry.getKey();
            double expectedDistance = entry.getValue();

            String jsonStr = apiService.route(roomId, null);
            JsonObject json = JsonParser.parseString(jsonStr).getAsJsonObject();

            assertTrue(json.get("found").getAsBoolean(), "Route should be found for " + roomId);
            assertEquals(roomId, json.get("roomId").getAsString());
            assertEquals(expectedDistance, json.get("distance").getAsDouble(), 0.01,
                    "Distance for " + roomId + " should match expected");
            assertTrue(json.getAsJsonArray("nodeIds").size() > 0);
            assertTrue(json.getAsJsonArray("path").size() > 0);
            assertFalse(json.has("seconds"), "Response must not contain time estimate");
        }
    }

    @Test
    void wab203DoorRouting() {
        // Default door is D2 (12.8 m)
        JsonObject d2Default = JsonParser.parseString(apiService.route("WAB203", null)).getAsJsonObject();
        assertTrue(d2Default.get("found").getAsBoolean());
        assertEquals("W203_D2", d2Default.get("doorId").getAsString());
        assertEquals(12.8, d2Default.get("distance").getAsDouble(), 0.01);

        // Door D1 is 5.9 m
        JsonObject d1Route = JsonParser.parseString(apiService.route("WAB203", "W203_D1")).getAsJsonObject();
        assertTrue(d1Route.get("found").getAsBoolean());
        assertEquals("W203_D1", d1Route.get("doorId").getAsString());
        assertEquals(5.9, d1Route.get("distance").getAsDouble(), 0.01);

        // Door D3 is 19.5 m
        JsonObject d3Route = JsonParser.parseString(apiService.route("WAB203", "W203_D3")).getAsJsonObject();
        assertTrue(d3Route.get("found").getAsBoolean());
        assertEquals("W203_D3", d3Route.get("doorId").getAsString());
        assertEquals(19.5, d3Route.get("distance").getAsDouble(), 0.01);
    }

    @Test
    void wab217AndUnknownRoomBothReturnError() {
        // WAB 217 error
        String res217 = apiService.route("WAB217", null);
        JsonObject json217 = JsonParser.parseString(res217).getAsJsonObject();
        assertTrue(json217.has("error"), "Routing to WAB217 must return error object");
        assertEquals("WAB 217 - Storage Room cannot be routed to (Usually closed)",
                json217.get("error").getAsString());

        // Unknown room error
        String resUnknown = apiService.route("WAB999", null);
        JsonObject jsonUnknown = JsonParser.parseString(resUnknown).getAsJsonObject();
        assertTrue(jsonUnknown.has("error"), "Routing to unknown room must return error object");
        assertEquals("There is no room with id WAB999", jsonUnknown.get("error").getAsString());

        // rooms() does not contain WAB217
        String roomsJsonStr = apiService.rooms();
        assertFalse(roomsJsonStr.contains("WAB217"), "rooms() must not contain WAB217");
        assertFalse(roomsJsonStr.contains("WAB 217"), "rooms() must not contain WAB 217");
    }

    @Test
    void searchRulesMatchSpecification() {
        // "wab206", "WAB 206", "s3b" -> WAB206
        for (String q : List.of("wab206", "WAB 206", "s3b")) {
            JsonArray arr = JsonParser.parseString(apiService.search(q)).getAsJsonArray();
            assertTrue(arr.size() > 0, "Query '" + q + "' should return at least one result");
            assertEquals("WAB206", arr.get(0).getAsJsonObject().get("id").getAsString(),
                    "First result for '" + q + "' should be WAB206");
        }

        // "library" -> WAB209
        JsonArray libArr = JsonParser.parseString(apiService.search("library")).getAsJsonArray();
        assertEquals(1, libArr.size());
        assertEquals("WAB209", libArr.get(0).getAsJsonObject().get("id").getAsString());

        // "lab" -> only LABORATORY rooms
        JsonArray labArr = JsonParser.parseString(apiService.search("lab")).getAsJsonArray();
        assertTrue(labArr.size() > 0);
        for (JsonElement el : labArr) {
            assertEquals("LABORATORY", el.getAsJsonObject().get("category").getAsString());
        }

        // "faculty" -> 202, 214, 215
        JsonArray facultyArr = JsonParser.parseString(apiService.search("faculty")).getAsJsonArray();
        List<String> facultyIds = new ArrayList<>();
        for (JsonElement el : facultyArr) {
            facultyIds.add(el.getAsJsonObject().get("id").getAsString());
        }
        assertEquals(List.of("WAB202", "WAB214", "WAB215"), facultyIds);

        // "217", "storage", "" -> nothing
        assertEquals(0, JsonParser.parseString(apiService.search("217")).getAsJsonArray().size());
        assertEquals(0, JsonParser.parseString(apiService.search("storage")).getAsJsonArray().size());
        assertEquals(0, JsonParser.parseString(apiService.search("")).getAsJsonArray().size());
    }

    @Test
    void noRoutePathContainsFireExitNode() {
        Set<String> fireExitIds = Set.of("FE_L", "FE_1", "FE_B");
        JsonArray rooms = JsonParser.parseString(apiService.rooms()).getAsJsonArray();

        for (JsonElement rEl : rooms) {
            String roomId = rEl.getAsJsonObject().get("id").getAsString();
            String routeJson = apiService.route(roomId, null);
            JsonObject route = JsonParser.parseString(routeJson).getAsJsonObject();

            if (route.has("nodeIds")) {
                JsonArray nodeIds = route.getAsJsonArray("nodeIds");
                for (JsonElement nid : nodeIds) {
                    assertFalse(fireExitIds.contains(nid.getAsString()),
                            "Route to " + roomId + " must not contain fire exit " + nid.getAsString());
                }
            }
        }
    }

    @Test
    void staticFilesRejectionAndAcceptanceRules() {
        // Rejects directory traversal
        assertTrue(StaticFiles.resolvePath("../pom.xml").isEmpty());
        assertTrue(StaticFiles.resolvePath("/data/../pom.xml").isEmpty());
        assertTrue(StaticFiles.resolvePath("/data/%2e%2e/pom.xml").isEmpty());
        assertTrue(StaticFiles.resolvePath("..").isEmpty());

        // Rejects forbidden files and directories
        assertTrue(StaticFiles.resolvePath("/src/main/java/com/cse/navigator/app/Main.java").isEmpty());
        assertTrue(StaticFiles.resolvePath("src/main/resources").isEmpty());
        assertTrue(StaticFiles.resolvePath("/pom.xml").isEmpty());
        assertTrue(StaticFiles.resolvePath("/.git/config").isEmpty());

        // Accepts allowed frontend paths
        Optional<Path> indexOpt = StaticFiles.resolvePath("/index.html");
        assertTrue(indexOpt.isPresent(), "/index.html should be resolved");
        assertTrue(indexOpt.get().endsWith("index.html"));

        Optional<Path> roomsOpt = StaticFiles.resolvePath("/data/rooms.json");
        assertTrue(roomsOpt.isPresent(), "/data/rooms.json should be resolved");
        assertTrue(roomsOpt.get().endsWith("rooms.json"));
    }

    @Test
    void segmentDirectionsFromRealData() {
        com.cse.navigator.model.Node entrance = navigator.getGraph().getNode("ENTRANCE");
        com.cse.navigator.model.Node h0 = navigator.getGraph().getNode("H0");
        com.cse.navigator.model.Node w204 = navigator.getGraph().getNode("W204_DOOR");
        com.cse.navigator.model.Node w205 = navigator.getGraph().getNode("W205_DOOR");
        com.cse.navigator.model.Node rTop = navigator.getGraph().getNode("R_TOP");
        com.cse.navigator.model.Node tl = navigator.getGraph().getNode("TL");
        com.cse.navigator.model.Node tr = navigator.getGraph().getNode("TR");
        com.cse.navigator.model.Node j218 = navigator.getGraph().getNode("J218");
        com.cse.navigator.model.Node bl = navigator.getGraph().getNode("BL");
        com.cse.navigator.model.Node j213 = navigator.getGraph().getNode("J213");
        com.cse.navigator.model.Node w213 = navigator.getGraph().getNode("W213_DOOR");
        com.cse.navigator.model.Node j214 = navigator.getGraph().getNode("J214");
        com.cse.navigator.model.Node w214 = navigator.getGraph().getNode("W214_DOOR");

        assertEquals(com.cse.navigator.model.Direction.FRONT, com.cse.navigator.model.Direction.between(entrance, h0));
        assertEquals("front", com.cse.navigator.model.Direction.between(entrance, h0).getJsonLabel());

        assertEquals(com.cse.navigator.model.Direction.LEFT, com.cse.navigator.model.Direction.between(h0, w204));
        assertEquals("left", com.cse.navigator.model.Direction.between(h0, w204).getJsonLabel());

        assertEquals(com.cse.navigator.model.Direction.RIGHT, com.cse.navigator.model.Direction.between(h0, w205));
        assertEquals("right", com.cse.navigator.model.Direction.between(h0, w205).getJsonLabel());

        assertEquals(com.cse.navigator.model.Direction.LEFT, com.cse.navigator.model.Direction.between(rTop, tl));
        assertEquals("left", com.cse.navigator.model.Direction.between(rTop, tl).getJsonLabel());

        assertEquals(com.cse.navigator.model.Direction.RIGHT, com.cse.navigator.model.Direction.between(rTop, tr));
        assertEquals("right", com.cse.navigator.model.Direction.between(rTop, tr).getJsonLabel());

        assertEquals(com.cse.navigator.model.Direction.FRONT, com.cse.navigator.model.Direction.between(tl, j218));
        assertEquals("front", com.cse.navigator.model.Direction.between(tl, j218).getJsonLabel());

        assertEquals(com.cse.navigator.model.Direction.RIGHT, com.cse.navigator.model.Direction.between(bl, j213));
        assertEquals("right", com.cse.navigator.model.Direction.between(bl, j213).getJsonLabel());

        assertEquals(com.cse.navigator.model.Direction.FRONT, com.cse.navigator.model.Direction.between(j213, w213));
        assertEquals("front", com.cse.navigator.model.Direction.between(j213, w213).getJsonLabel());

        assertEquals(com.cse.navigator.model.Direction.LEFT, com.cse.navigator.model.Direction.between(j214, w214));
        assertEquals("left", com.cse.navigator.model.Direction.between(j214, w214).getJsonLabel());
    }

    @Test
    void everyRoutableRoomHasValidDirectionsArrayMatchingNodeCount() {
        JsonArray rooms = JsonParser.parseString(apiService.rooms()).getAsJsonArray();
        for (JsonElement rEl : rooms) {
            String roomId = rEl.getAsJsonObject().get("id").getAsString();
            String routeJson = apiService.route(roomId, null);
            JsonObject route = JsonParser.parseString(routeJson).getAsJsonObject();

            assertTrue(route.has("nodeIds"), "Room " + roomId + " must have nodeIds");
            assertTrue(route.has("directions"), "Room " + roomId + " must have directions");

            JsonArray nodeIds = route.getAsJsonArray("nodeIds");
            JsonArray directions = route.getAsJsonArray("directions");

            assertEquals(nodeIds.size() - 1, directions.size(),
                    "Room " + roomId + " directions.size() must equal nodeIds.size() - 1");

            for (int i = 0; i < directions.size(); i++) {
                JsonElement dirEl = directions.get(i);
                assertNotNull(dirEl, "Direction entry must not be null");
                assertFalse(dirEl.isJsonNull(), "Direction entry must not be JSON null");
                String dirStr = dirEl.getAsString();
                assertTrue(Set.of("front", "back", "left", "right").contains(dirStr),
                        "Direction must be front/back/left/right, got: " + dirStr);
            }
        }
    }
}
