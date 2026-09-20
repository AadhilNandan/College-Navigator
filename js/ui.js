/**
 * UI Controller for CSE Block Navigator.
 * Manages search input, autocomplete list, room selection, door chips,
 * and animated player movement along the route.
 * Powered by the Java WebServer API.
 */

import { drawRoute, clearRoute } from "./route-renderer.js";
import { searchRooms, fetchRoute } from "./api-client.js";
import { startPlayerAnimation, cancelPlayerAnimation } from "./movement.js";

export function setupUI({ rooms, svg, nodesMap, mapContainer }) {
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const routeCard = document.getElementById("route-card");
  const routeTitle = document.getElementById("route-title");
  const routeCategory = document.getElementById("route-category");
  const routeDistance = document.getElementById("route-distance");
  const routeStatus = document.getElementById("route-status");
  const btnReplay = document.getElementById("btn-replay");
  const btnSkip = document.getElementById("btn-skip");
  const doorChipsContainer = document.getElementById("door-chips-container");
  const routeDetails = document.getElementById("route-details");
  const routeNodeList = document.getElementById("route-node-list");

  const roomsMap = new Map(rooms.map((r) => [r.id, r]));
  let currentRoomId = null;
  let currentDoorId = null;
  let currentRouteContext = null;

  let searchTimeout = null;

  async function handleSearch() {
    const query = searchInput.value;
    if (!query || !query.trim()) {
      searchResults.innerHTML = "";
      searchResults.style.display = "none";
      return;
    }

    try {
      const results = await searchRooms(query);
      searchResults.innerHTML = "";

      if (results.length === 0) {
        searchResults.style.display = "none";
        return;
      }

      searchResults.style.display = "flex";

      for (const room of results) {
        if (!roomsMap.has(room.id)) {
          roomsMap.set(room.id, room);
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "search-result-item";
        btn.setAttribute("data-room-id", room.id);

        btn.innerHTML = `
          <div class="result-main">
            <span class="result-code">${room.code}</span>
            <span class="result-name">${room.name}</span>
          </div>
          <span class="result-category">${room.category}</span>
        `;

        btn.addEventListener("click", () => {
          searchInput.value = room.code;
          searchResults.style.display = "none";
          selectRoom(room.id);
        });

        searchResults.appendChild(btn);
      }
    } catch (err) {
      console.error("Search error:", err);
    }
  }

  // Close search results on external click
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 150);
  });
  searchInput.addEventListener("focus", handleSearch);

  // Wire Replay button
  if (btnReplay) {
    btnReplay.addEventListener("click", () => {
      if (!currentRouteContext) return;
      runAnimation(false);
    });
  }

  // Wire Skip button
  if (btnSkip) {
    btnSkip.addEventListener("click", () => {
      if (!currentRouteContext) return;
      runAnimation(true);
    });
  }

  function runAnimation(skip = false) {
    if (!currentRouteContext) return;
    const { routeData } = currentRouteContext;

    // Reset arrival status during walk
    routeStatus.textContent = "";

    startPlayerAnimation({
      svg,
      path: routeData.path,
      directions: routeData.directions,
      mapContainer,
      skipAnimation: skip,
      onArrival: () => {
        // Arrival text appears only when the walk finishes
        routeStatus.textContent = `You have arrived at ${routeData.roomCode}`;
      }
    });
  }

  /**
   * Selects a room, fetches route from Java API, updates UI & SVG route,
   * and walks the player from ENTRANCE to the destination door.
   *
   * @param {string} roomId
   * @param {string} [specificDoorNodeId]
   */
  async function selectRoom(roomId, specificDoorNodeId = null) {
    // 1. Cleanly cancel any ongoing animation and clear old player marker
    cancelPlayerAnimation(svg);

    const room = roomsMap.get(roomId);
    currentRoomId = roomId;

    let doorToRoute = specificDoorNodeId;
    if (!doorToRoute) {
      if (room && room.id === "WAB203") {
        doorToRoute = "W203_D2";
      }
    }
    currentDoorId = doorToRoute;

    try {
      // Clear status text while route is being prepared/walked
      routeStatus.textContent = "";

      // Fetch route from Java API
      const routeData = await fetchRoute(roomId, doorToRoute);
      if (!routeData.found) {
        console.error("Route not found:", routeData);
        return;
      }

      currentRouteContext = { routeData, room };

      // 2. Draw SVG route polyline and destination marker
      const routeObj = {
        distance: routeData.distance,
        nodeIds: routeData.nodeIds,
        nodes: routeData.path
      };
      drawRoute(svg, routeObj, nodesMap, room);

      // 3. Update UI Card details
      routeCard.style.display = "block";
      routeTitle.textContent = `${routeData.roomCode} — ${routeData.roomName}`;
      routeCategory.textContent = routeData.category;
      routeDistance.textContent = `about ${routeData.distance.toFixed(1)} m`;

      if (routeData.doorId) {
        currentDoorId = routeData.doorId;
      }

      // 4. Render Door Chips (WAB203 or multi-door rooms)
      doorChipsContainer.innerHTML = "";
      if (room && room.doors && room.doors.length > 1) {
        const chipGroup = document.createElement("div");
        chipGroup.className = "door-chips-group";

        const chipLabel = document.createElement("span");
        chipLabel.className = "chips-label";
        chipLabel.textContent = "Select Entrance:";
        chipGroup.appendChild(chipLabel);

        const chipsList = document.createElement("div");
        chipsList.className = "chips-list";

        for (const door of room.doors) {
          const doorNodeId = door.node || door.id;
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = `door-chip ${doorNodeId === currentDoorId ? "active" : ""}`;
          chip.textContent = door.label || doorNodeId;

          chip.addEventListener("click", () => {
            selectRoom(room.id, doorNodeId);
          });

          chipsList.appendChild(chip);
        }
        chipGroup.appendChild(chipsList);
        doorChipsContainer.appendChild(chipGroup);
      }

      // 5. Update Collapsible Route Details
      routeNodeList.innerHTML = "";
      routeData.nodeIds.forEach((id, index) => {
        const span = document.createElement("span");
        span.className = "node-id-badge";
        span.textContent = id;
        routeNodeList.appendChild(span);

        if (index < routeData.nodeIds.length - 1) {
          const arrow = document.createElement("span");
          arrow.className = "node-arrow";
          arrow.textContent = "→";
          routeNodeList.appendChild(arrow);
        }
      });

      // 6. Start player movement from ENTRANCE
      runAnimation(false);
    } catch (err) {
      console.error("Failed to load route from API:", err);
      routeStatus.textContent = `Error: ${err.message}`;
    }
  }

  return {
    selectRoom
  };
}
