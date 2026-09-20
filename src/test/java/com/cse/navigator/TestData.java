package com.cse.navigator;

import com.cse.navigator.data.DataFiles;

import java.nio.file.Path;

/** Where the tests find the shared data files, wherever the tests are run from. */
public final class TestData {

    private TestData() {}

    public static Path nodes() { return folder().resolve(DataFiles.NODES); }

    public static Path edges() { return folder().resolve(DataFiles.EDGES); }

    public static Path rooms() { return folder().resolve(DataFiles.ROOMS); }

    private static Path folder() { return DataFiles.folder(); }
}
