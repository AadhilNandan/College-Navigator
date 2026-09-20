package com.cse.navigator.app;

import com.cse.navigator.model.Room;
import com.cse.navigator.model.Route;
import com.cse.navigator.service.Navigator;

import java.util.List;
import java.util.Scanner;

/**
 * A console front end for the navigation core, used for the demo and for
 * checking routes by hand while the web map is being built.
 *
 * Usage:
 *   (no arguments)              a short demo, then an interactive prompt
 *   rooms                       every room that can be searched for
 *   route WAB203 WAB213         shortest route between two rooms
 *   from ENTRANCE WAB213        shortest route from a node to a room
 *   json ENTRANCE WAB213        the same route as JSON for the web map
 *   check                       graph statistics
 */
public final class Main {

    public static void main(String[] args) {
        Navigator navigator;
        try {
            navigator = Navigator.load();
        } catch (RuntimeException e) {
            System.err.println("Could not load the map data: " + e.getMessage());
            return;
        }

        String command = args.length == 0 ? "demo" : args[0].toLowerCase();
        try {
            switch (command) {
                case "rooms" -> printRooms(navigator);
                case "check" -> printCheck(navigator);
                case "route" -> {
                    require(args, 3);
                    printRoute(navigator, navigator.routeBetweenRooms(args[1], args[2]));
                }
                case "from" -> {
                    require(args, 3);
                    printRoute(navigator, navigator.routeFromNode(args[1], args[2]));
                }
                case "json" -> {
                    require(args, 3);
                    System.out.println(navigator.routeFromNode(args[1], args[2]).toJson());
                }
                default -> {
                    printCheck(navigator);
                    demo(navigator);
                    interactive(navigator);
                }
            }
        } catch (IllegalArgumentException | IllegalStateException e) {
            System.err.println(e.getMessage());
        }
    }

    private static void demo(Navigator navigator) {
        System.out.println();
        System.out.println("Example: entrance to the Network Lab");
        printRoute(navigator, navigator.routeTo("WAB213"));
    }

    private static void interactive(Navigator navigator) {
        Scanner scanner = new Scanner(System.in);
        System.out.println();
        System.out.println("Type a room code to route to it from the entrance, or 'quit'.");
        while (true) {
            System.out.print("> ");
            if (!scanner.hasNextLine()) return;
            String line = scanner.nextLine().trim();
            if (line.isEmpty()) continue;
            if (line.equalsIgnoreCase("quit") || line.equalsIgnoreCase("exit")) return;

            List<Room> matches = navigator.search(line);
            if (matches.isEmpty()) {
                System.out.println("Nothing matches \"" + line + "\".");
                continue;
            }
            if (matches.size() > 1) {
                System.out.println("Did you mean:");
                for (Room room : matches) {
                    System.out.println("  " + room.getId() + "  " + room.getFullLabel());
                }
                continue;
            }
            printRoute(navigator, navigator.routeTo(matches.get(0).getId()));
        }
    }

    private static void printRooms(Navigator navigator) {
        for (Room room : navigator.getAllRooms()) {
            String flag = room.isLocked() ? "  [locked]" : "";
            System.out.printf("%-8s %-10s %-28s %s%s%n", room.getId(), room.getCode(),
                    room.getName(), room.getCategory().getLabel(), flag);
        }
    }

    private static void printCheck(Navigator navigator) {
        System.out.println("CSE Block Navigator - Jyothi Engineering College");
        System.out.println(navigator.getGraph()
                + ", " + navigator.getAllRooms().size() + " rooms, "
                + Math.round(navigator.getGraph().totalEdgeLength()) + " m of corridor");
    }

    private static void printRoute(Navigator navigator, Route route) {
        if (!route.isFound()) {
            System.out.println("No route found.");
            return;
        }
        for (String step : navigator.directionsFor(route)) {
            System.out.println("  " + step);
        }
        System.out.println("  path: " + String.join(" -> ", route.getNodeIds()));
    }

    private static void require(String[] args, int count) {
        if (args.length < count) {
            throw new IllegalArgumentException("That command needs " + (count - 1) + " arguments");
        }
    }

    private Main() {}
}
