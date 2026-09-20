package com.cse.navigator.data;

/** One row of edges.json: a corridor stretch and its length in metres. */
public record EdgeData(String from, String to, double distance) {}
