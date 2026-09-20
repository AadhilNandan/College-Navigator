package com.cse.navigator.graph;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.cse.navigator.TestData;
import com.cse.navigator.data.GraphLoader;
import com.cse.navigator.model.Node;
import com.cse.navigator.model.Route;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DijkstraTest {

    private Graph graph;
    private Dijkstra dijkstra;

    @BeforeEach
    void load() {
        graph = GraphLoader.loadGraph(TestData.nodes(), TestData.edges());
        dijkstra = new Dijkstra(graph);
    }

    @Test
    void aRouteToItselfIsEmptyAndFree() {
        Route route = dijkstra.findRoute("ENTRANCE", "ENTRANCE");
        assertTrue(route.isFound());
        assertEquals(1, route.getNodes().size());
        assertEquals(0.0, route.getTotalDistance(), 0.0001);
    }

    @Test
    void theRouteIsContinuousAndAddsUp() {
        Route route = dijkstra.findRoute("ENTRANCE", "W213_DOOR");
        assertTrue(route.isFound());
        assertEquals(route.getNodes().size() - 1, route.getEdges().size());
        double total = 0;
        for (int i = 0; i < route.getEdges().size(); i++) {
            assertEquals(route.getNodes().get(i), route.getEdges().get(i).getFrom());
            assertEquals(route.getNodes().get(i + 1), route.getEdges().get(i).getTo());
            total += route.getEdges().get(i).getDistance();
        }
        assertEquals(total, route.getTotalDistance(), 0.0001);
        assertEquals(91.9, route.getTotalDistance(), 0.01);
    }

    @Test
    void walkingIsTheSameLengthInEitherDirection() {
        assertEquals(dijkstra.distanceBetween("W202_DOOR", "W212_DOOR"),
                dijkstra.distanceBetween("W212_DOOR", "W202_DOOR"), 0.0001);
    }

    @Test
    void theRingIsTakenTheShorterWayRound() {
        List<String> path = dijkstra.findRoute("ENTRANCE", "W213_DOOR").getNodeIds();
        assertTrue(path.contains("TR"), "expected the right hand side of the ring");
        assertFalse(path.contains("TL"), "the left hand side is the longer way round");
    }

    @Test
    void blockingTheRightArmSendsTheRouteRoundTheOtherWay() {
        double before = dijkstra.distanceBetween("ENTRANCE", "W213_DOOR");
        assertEquals(91.9, before, 0.01);
        assertTrue(graph.removeUndirectedEdge("R_TOP", "TR"));

        Route after = dijkstra.findRoute("ENTRANCE", "W213_DOOR");
        assertTrue(after.isFound());
        assertTrue(after.getNodeIds().contains("TL"));
        assertEquals(101.7, after.getTotalDistance(), 0.01);
    }

    @Test
    void blockingBothArmsCutsTheRingOff() {
        graph.removeUndirectedEdge("R_TOP", "TR");
        graph.removeUndirectedEdge("R_TOP", "TL");
        assertFalse(dijkstra.findRoute("ENTRANCE", "W213_DOOR").isFound());
    }

    @Test
    void noNormalRouteWalksThroughAFireExitOrTheLockedStore() {
        for (Node destination : graph.getNodes()) {
            if (!destination.isRoutable()) continue;
            Route route = dijkstra.findRoute("ENTRANCE", destination.getId());
            assertTrue(route.isFound(), "unreachable: " + destination.getId());
            for (Node node : route.getNodes()) {
                assertTrue(node.isRoutable(),
                        "route to " + destination.getId() + " passes " + node.getId());
            }
        }
    }

    @Test
    void aFireExitCanStillBeAskedForOnPurpose() {
        Route route = dijkstra.findRoute("ENTRANCE", "FE_1");
        assertTrue(route.isFound());
        assertEquals("FE_1", route.getDestination().getId());
    }

    @Test
    void theNearestOfSeveralDoorsWins() {
        List<String> hallDoors = List.of("W203_D1", "W203_D2", "W203_D3");
        Route fromEntrance = dijkstra.findRoute(List.of("ENTRANCE"), hallDoors);
        assertEquals("W203_D1", fromEntrance.getDestination().getId());

        Route fromRing = dijkstra.findRoute(List.of("W214_DOOR"), hallDoors);
        assertEquals("W203_D3", fromRing.getDestination().getId());

        for (String door : hallDoors) {
            assertTrue(fromEntrance.getTotalDistance()
                    <= dijkstra.distanceBetween("ENTRANCE", door) + 0.0001);
        }
    }
}
