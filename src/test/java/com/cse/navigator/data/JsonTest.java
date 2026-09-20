package com.cse.navigator.data;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.google.gson.JsonSyntaxException;
import org.junit.jupiter.api.Test;

class JsonTest {

    @Test
    void deserializesNodeDataArray() {
        String json = "[{\"id\":\"H0\",\"type\":\"JUNCTION\",\"floor\":1,\"x\":0.0,\"y\":1.1}]";
        NodeData[] nodes = Json.gson().fromJson(json, NodeData[].class);
        assertEquals(1, nodes.length);
        assertEquals("H0", nodes[0].id());
        assertEquals("JUNCTION", nodes[0].type());
        assertEquals(0.0, nodes[0].x(), 0.001);
        assertEquals(1.1, nodes[0].y(), 0.001);
    }

    @Test
    void deserializesEdgeDataArray() {
        String json = "[{\"from\":\"H0\",\"to\":\"H1\",\"distance\":3.3}]";
        EdgeData[] edges = Json.gson().fromJson(json, EdgeData[].class);
        assertEquals(1, edges.length);
        assertEquals("H0", edges[0].from());
        assertEquals("H1", edges[0].to());
        assertEquals(3.3, edges[0].distance(), 0.001);
    }

    @Test
    void deserializesRoomDataWithDoors() {
        String json = "[{\"id\":\"WAB202\",\"code\":\"WAB 202\",\"name\":\"Room\",\"category\":\"FACULTY\",\"doors\":[{\"node\":\"W202_DOOR\",\"primary\":true}]}]";
        RoomData[] rooms = Json.gson().fromJson(json, RoomData[].class);
        assertEquals(1, rooms.length);
        assertEquals("WAB202", rooms[0].id());
        assertNotNull(rooms[0].doors());
        assertEquals(1, rooms[0].doors().size());
        assertEquals("W202_DOOR", rooms[0].doors().get(0).node());
    }

    @Test
    void rejectsMalformedJson() {
        assertThrows(JsonSyntaxException.class, () -> Json.gson().fromJson("[{\"id\":}]", NodeData[].class));
    }
}
