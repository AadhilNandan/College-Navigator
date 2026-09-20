package com.cse.navigator.data;

import java.util.List;

/** One row of rooms.json. */
public record RoomData(String id, String code, String name, String category,
                       List<DoorData> doors, Boolean searchable, Boolean locked,
                       String status) {}
