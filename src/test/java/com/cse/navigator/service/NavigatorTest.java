package com.cse.navigator.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.cse.navigator.TestData;
import com.cse.navigator.model.Room;
import com.cse.navigator.model.Route;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class NavigatorTest {

    private Navigator navigator;

    @BeforeEach
    void load() {
        navigator = Navigator.load(TestData.nodes(), TestData.edges(), TestData.rooms());
    }

    @Test
    void everyOpenRoomCanBeReachedFromTheEntrance() {
        for (Room room : navigator.getAllRooms()) {
            if (room.isLocked()) continue;
            Route route = navigator.routeTo(room.getId());
            assertTrue(route.isFound(), "no route to " + room.getCode());
            assertTrue(route.getTotalDistance() > 0);
        }
    }

    @Test
    void theLockedStoreRoomIsNotOfferedAndCannotBeRoutedTo() {
        List<Room> results = navigator.search("217");
        assertTrue(results.isEmpty());
        assertThrows(IllegalArgumentException.class, () -> navigator.routeTo("WAB217"));
    }

    @Test
    void searchFindsRoomsByCodeAndByWhatTheyAre() {
        assertEquals(3, navigator.search("laboratory").size());
        assertEquals("WAB213", navigator.search("system").get(0).getId());
        assertEquals("WAB203", navigator.search("WAB 203").get(0).getId());
        assertTrue(navigator.search("canteen").isEmpty());
    }

    @Test
    void seminarHallDefaultsToPrimaryDoorD2AndAllowsExplicitDoors() {
        Route defaultRoute = navigator.routeTo("WAB203");
        assertTrue(defaultRoute.isFound());
        assertEquals("W203_D2", defaultRoute.getDestination().getId());
        assertEquals(12.8, defaultRoute.getTotalDistance(), 0.01);

        Route d1Route = navigator.routeToDoor("ENTRANCE", "WAB203", "W203_D1");
        assertTrue(d1Route.isFound());
        assertEquals("W203_D1", d1Route.getDestination().getId());
        assertEquals(5.9, d1Route.getTotalDistance(), 0.01);
    }

    @Test
    void roomToRoomUsesTheNearestPairOfDoors() {
        Route route = navigator.routeBetweenRooms("WAB214", "WAB203");
        assertTrue(route.isFound());
        assertEquals("W214_DOOR", route.getStart().getId());
        assertEquals("W203_D3", route.getDestination().getId());
    }

    @Test
    void directionsStartAndEndWhereTheRouteDoes() {
        Route route = navigator.routeTo("WAB213");
        List<String> steps = navigator.directionsFor(route);
        assertTrue(steps.size() >= 3);
        assertTrue(steps.get(0).startsWith("Start at"));
        assertTrue(steps.get(steps.size() - 1).contains("WAB 213"));
        for (String step : steps) {
            assertFalse(step.isBlank());
        }
    }

    @Test
    void theRouteCanBeHandedToTheWebMapAsJson() {
        String json = navigator.routeTo("WAB213").toJson();
        assertTrue(json.startsWith("{\"found\":true"));
        assertTrue(json.contains("\"path\""));
        assertTrue(json.contains("W213_DOOR"));
        assertFalse(Route.notFound().toJson().contains("true"));
    }

    @Test
    void anUnknownRoomIsReportedClearly() {
        assertThrows(IllegalArgumentException.class, () -> navigator.routeTo("WAB999"));
    }
}
