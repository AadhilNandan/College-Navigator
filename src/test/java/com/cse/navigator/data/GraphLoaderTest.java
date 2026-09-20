package com.cse.navigator.data;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.cse.navigator.TestData;
import com.cse.navigator.graph.Graph;
import com.cse.navigator.model.Node;
import com.cse.navigator.model.Room;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class GraphLoaderTest {

    private Graph graph;
    private Map<String, Room> rooms;

    @BeforeEach
    void load() {
        graph = GraphLoader.loadGraph(TestData.nodes(), TestData.edges());
        rooms = GraphLoader.loadRooms(TestData.rooms(), graph);
    }

    @Test
    void loadsTheExpectedSizes() {
        assertEquals(48, graph.nodeCount());
        assertEquals(48, graph.edgeCount());
        assertEquals(18, rooms.size());
        // one more edge than a tree would need: the ring corridor is the single loop
        assertEquals(1, graph.edgeCount() - graph.nodeCount() + 1);
    }

    @Test
    void everyNodeIsConnectedToSomething() {
        for (Node node : graph.getNodes()) {
            assertFalse(graph.getEdgesFrom(node).isEmpty(), "stranded node: " + node.getId());
        }
    }

    @Test
    void seminarHallHasThreeDoorsWithD2Primary() {
        Room hall = rooms.get("WAB203");
        assertEquals(3, hall.getDoors().size());
        assertEquals("W203_D2", hall.getPrimaryDoor().getId());
        assertEquals("D3 — Secondary Entrance", hall.getDoorLabel("W203_D3"));
    }

    @Test
    void storageRoomAndFireExitsAreNotRoutable() {
        assertFalse(graph.getNode("W217_DOOR").isRoutable());
        assertTrue(rooms.get("WAB217").isLocked());
        assertFalse(rooms.get("WAB217").isSearchable());
        for (String id : new String[] {"FE_L", "FE_1", "FE_B"}) {
            assertFalse(graph.getNode(id).isRoutable(), id + " should not be routable");
        }
        assertTrue(graph.getNode("ENTRANCE").isRoutable());
    }

    @Test
    void everyDoorNodeBelongsToExactlyOneRoom() {
        int doorsInRooms = 0;
        for (Room room : rooms.values()) doorsInRooms += room.getDoors().size();
        assertEquals(20, doorsInRooms);
    }

    @Test
    void anUnknownNodeIdIsReported() {
        assertThrows(IllegalArgumentException.class, () -> graph.getNode("WAB999"));
    }
}
