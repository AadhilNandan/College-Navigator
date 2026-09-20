/**
 * Main Application Entry Point for CSE Block Navigator.
 * Loads floor map data, verifies Java API connectivity, and initializes display UI.
 * Graph search and shortest-path routing are performed by the backend Java engine.
 */

import { loadGraphData } from "./js/data-loader.js";
import { renderMap } from "./js/map-renderer.js";
import { setupUI } from "./js/ui.js";
import { fetchRooms } from "./js/api-client.js";

async function initApp() {
  const loadingIndicator = document.getElementById("loading-state");
  const errorBanner = document.getElementById("error-banner");
  const appContainer = document.getElementById("app-main");
  const mapContainer = document.getElementById("map-container");

  try {
    // 1. Verify Java API connectivity by fetching searchable rooms
    let apiRooms;
    try {
      apiRooms = await fetchRooms();
    } catch (apiErr) {
      console.error("API connection failed:", apiErr);
      if (loadingIndicator) loadingIndicator.style.display = "none";
      if (errorBanner) {
        errorBanner.style.display = "block";
        errorBanner.textContent = "Start the Java server (WebServer) and open http://localhost:8000";
      }
      return;
    }

    // 2. Load graph data for SVG map rendering
    const { nodes, edges, rooms } = await loadGraphData("data/");

    // 3. Render Inline SVG Map
    let uiController = null;
    const { svg, nodesMap } = renderMap(mapContainer, nodes, edges, rooms, (roomId, doorId) => {
      if (uiController) {
        uiController.selectRoom(roomId, doorId);
      }
    });

    // 4. Setup and wire UI interactions with Java API backing
    uiController = setupUI({
      rooms: apiRooms && apiRooms.length > 0 ? apiRooms : rooms,
      svg,
      nodesMap,
      mapContainer
    });

    // 5. Hide loading state and display app
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
    if (appContainer) {
      appContainer.style.display = "flex";
    }
  } catch (err) {
    console.error("Failed to initialize CSE Block Navigator:", err);
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
    if (errorBanner) {
      errorBanner.style.display = "block";
      errorBanner.textContent = `Error loading campus data: ${err.message}. Please verify the server is running and try again.`;
    }
  }
}

// Initialize on DOM load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
