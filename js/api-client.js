/**
 * API Client for communicating with the backend Java WebServer.
 * Endpoints: /api/rooms, /api/search, /api/route.
 */

export async function fetchRooms() {
  const res = await fetch("/api/rooms");
  if (!res.ok) {
    throw new Error(`Failed to fetch rooms: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export async function searchRooms(query) {
  if (!query || !query.trim()) {
    return [];
  }
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`Failed to search rooms: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchRoute(roomId, doorId = null) {
  if (!roomId) {
    throw new Error("roomId is required");
  }
  let url = `/api/route?to=${encodeURIComponent(roomId)}`;
  if (doorId) {
    url += `&door=${encodeURIComponent(doorId)}`;
  }

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Route request failed: ${res.status}`);
  }
  return data;
}
