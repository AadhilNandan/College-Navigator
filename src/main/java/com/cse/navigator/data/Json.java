package com.cse.navigator.data;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

/**
 * Shared Gson instance for JSON parsing across the application.
 */
public final class Json {

    private static final Gson GSON = new GsonBuilder().create();

    private Json() {}

    public static Gson gson() {
        return GSON;
    }
}
