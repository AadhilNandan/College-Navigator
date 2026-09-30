/**
 * API Configuration for College Navigator.
 *
 * LOCAL DEV:  API calls go to the same origin (relative paths like /api/rooms).
 * PRODUCTION: API calls go to the Railway backend URL.
 *
 * The API_BASE is determined automatically:
 * - If the page is served from localhost / 127.0.0.1 / 192.168.x.x → local dev (empty base).
 * - Otherwise → production, using the configured RAILWAY_BACKEND_URL.
 *
 * To set your production backend URL, update RAILWAY_BACKEND_URL below
 * after deploying the backend to Railway.
 */

// ─── Set this to your Railway backend URL after deployment ───
const RAILWAY_BACKEND_URL = "https://college-navigator-production-f5f2.up.railway.app";

function detectApiBase() {
  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname.startsWith("192.168.")
    || hostname.startsWith("10.")
    || hostname === "0.0.0.0";

  if (isLocal) {
    return "";  // Same-origin relative paths
  }

  if (RAILWAY_BACKEND_URL) {
    return RAILWAY_BACKEND_URL;
  }

  console.warn("[api-config] Production detected but RAILWAY_BACKEND_URL is not set. API calls will use relative paths.");
  return "";
}

export const API_BASE = detectApiBase();
