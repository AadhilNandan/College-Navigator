package com.cse.navigator.data;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Finds the shared data folder. The three JSON files are the single source of
 * truth for both this Java core and the browser front end, so nothing here is
 * ever hard coded.
 *
 * The folder is looked for beside the working directory and then in each parent
 * folder, which means it is found whether the program is run from the project
 * root, from target/classes or from inside IntelliJ.
 */
public final class DataFiles {

    public static final String NODES = "nodes.json";
    public static final String EDGES = "edges.json";
    public static final String ROOMS = "rooms.json";

    private DataFiles() {}

    public static Path folder() {
        Path start = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        for (Path dir = start; dir != null; dir = dir.getParent()) {
            Path candidate = dir.resolve("data");
            if (Files.isRegularFile(candidate.resolve(NODES))) {
                return candidate;
            }
        }
        throw new IllegalStateException(
                "Could not find the data folder holding " + NODES
                        + ". Run the program with the project root as the working directory.");
    }

    public static Path nodes() { return folder().resolve(NODES); }

    public static Path edges() { return folder().resolve(EDGES); }

    public static Path rooms() { return folder().resolve(ROOMS); }
}
