package com.cse.navigator.model;

/** Used for grouping and colouring in the search list. */
public enum RoomCategory {

    FACULTY("Faculty"),
    SEMINAR_HALL("Seminar Hall"),
    STAFFROOM("Staffroom"),
    CLASSROOM("Classroom"),
    FACILITY("Facility"),
    LIBRARY("Library"),
    LABORATORY("Laboratory"),
    STORAGE("Storage");

    private final String label;

    RoomCategory(String label) { this.label = label; }

    public String getLabel() { return label; }
}
