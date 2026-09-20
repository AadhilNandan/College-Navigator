package com.cse.navigator.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class RoomTest {

    private static DoorNode door(String id, boolean routable) {
        return new DoorNode(id, 1, 0, 0, "WAB203", routable);
    }

    private static Room hall(DoorNode... doors) {
        List<DoorNode> list = List.of(doors);
        return new Room("WAB203", "WAB 203", "Seminar Hall", RoomCategory.SEMINAR_HALL,
                list, list.get(0), Map.of(list.get(0).getId(), "Main Door"), true, false, null);
    }

    @Test
    void searchMatchesCodeNameAndCategory() {
        Room room = hall(door("W203_D2", true));
        assertTrue(room.matches("203"));
        assertTrue(room.matches("wab203"));
        assertTrue(room.matches("WAB 203"));
        assertTrue(room.matches("seminar"));
        assertTrue(room.matches("Seminar Hall"));
        assertTrue(room.matches(""));
        assertFalse(room.matches("library"));
    }

    @Test
    void onlyOpenDoorsCanBeRoutedTo() {
        Room room = hall(door("W203_D1", true), door("W203_D2", false));
        assertEquals(2, room.getDoors().size());
        assertEquals(1, room.getRoutableDoors().size());
        assertEquals("W203_D1", room.getRoutableDoors().get(0).getId());
    }

    @Test
    void doorLabelsFallBackToSomethingReadable() {
        Room room = hall(door("W203_D1", true), door("W203_D2", true));
        assertEquals("Main Door", room.getDoorLabel("W203_D1"));
        assertEquals("Door", room.getDoorLabel("W203_D2"));
        assertEquals("WAB 203 - Seminar Hall", room.getFullLabel());
    }

    @Test
    void aPrimaryDoorHasToBeOneOfTheRoomsOwnDoors() {
        DoorNode mine = door("W203_D1", true);
        DoorNode someoneElses = door("W206_DOOR", true);
        assertThrows(IllegalArgumentException.class,
                () -> new Room("WAB203", "WAB 203", "Seminar Hall", RoomCategory.SEMINAR_HALL,
                        List.of(mine), someoneElses, Map.of(), true, false, null));
    }

    @Test
    void nodesAreEqualWhenTheirIdsMatch() {
        assertEquals(door("W203_D1", true), door("W203_D1", false));
        assertFalse(door("W203_D1", true).equals(door("W203_D2", true)));
    }
}
