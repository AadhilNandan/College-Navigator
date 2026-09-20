package com.cse.navigator.data;

/** One row of nodes.json, mapped via Gson. */
public record NodeData(String id, String type, String name, Integer floor,
                       double x, double y, String room, Boolean routable) {}
