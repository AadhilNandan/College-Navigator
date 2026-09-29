/**
 * College Navigator - Central Application State
 * Phase 8: Application Shell & Screen Architecture
 *
 * Single authoritative source of truth for UI, screen routing,
 * map mode, character selection, navigation lifecycle, overlays, and user settings.
 */

const STORAGE_KEYS = {
  CHARACTER: "collegenav_character",
  SETTINGS: "collegenav_settings",
  TUTORIAL: "collegenav_tutorial_done"
};

function loadSettingsFromStorage() {
  const defaults = {
    sound: true,
    music: true,
    tutorialCompleted: false
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return defaults;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = raw ? JSON.parse(raw) : {};
    const tutorialDone = localStorage.getItem(STORAGE_KEYS.TUTORIAL) === "true";
    return {
      sound: typeof parsed.sound === "boolean" ? parsed.sound : defaults.sound,
      music: typeof parsed.music === "boolean" ? parsed.music : defaults.music,
      tutorialCompleted: tutorialDone || Boolean(parsed.tutorialCompleted)
    };
  } catch {
    return defaults;
  }
}

function loadCharacterFromStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return "boy";
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CHARACTER);
    return saved === "girl" ? "girl" : "boy";
  } catch {
    return "boy";
  }
}

export const MAP_SCENES = {
  NORTH: "NORTH",
  TRANSITION: "TRANSITION",
  SOUTH: "SOUTH"
};

export const AppState = {
  // Screen Routing: 'welcome' | 'character_select' | 'map' | 'search' | 'menu' | 'settings' | 'how_to_navigate' | 'about'
  screen: "welcome",
  previousScreen: null,

  // Map Mode: 'normal' | 'navigation'
  mapMode: "normal",

  // Presentation-Level Scene State: 'NORTH' | 'TRANSITION' | 'SOUTH'
  mapScene: MAP_SCENES.NORTH,

  // Character State: 'boy' | 'girl'
  character: loadCharacterFromStorage(),

  // Navigation State Machine
  // status: 'idle' | 'destination_selected' | 'route_calculating' | 'navigating' | 'arrived' | 'route_error'
  navigation: {
    status: "idle",
    destination: null, // Destination object
    origin: { id: "CURRENT_POS", label: "Current Location", nodeId: null }, // Origin selection
    navMode: "manual", // 'simulate' | 'manual'
    route: null,       // Route payload from Java backend
    activeDestination: null, // End node coordinate { id, x, y }
    fromNodeId: "ENTRANCE",  // Dynamically resolved origin node
    errorMessage: null
  },

  // Overlay System: null | 'arrival'
  activeOverlay: null,

  // User Settings (localStorage backed)
  settings: loadSettingsFromStorage()
};

// Event Subscriptions
const listeners = new Map();

/**
 * Subscribes to changes on a specific state key.
 * @param {string} key - Top-level AppState key (e.g., 'screen', 'mapMode', 'character', 'navigation', 'activeOverlay', 'settings')
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribe(key, callback) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(callback);
  return () => {
    const set = listeners.get(key);
    if (set) set.delete(callback);
  };
}

/**
 * Notifies subscribers of a state change.
 * @param {string} key
 * @param {*} value
 */
export function notify(key, value) {
  const set = listeners.get(key);
  if (set) {
    for (const cb of set) {
      try {
        cb(value, AppState);
      } catch (err) {
        console.error(`[AppState] Listener error for key "${key}":`, err);
      }
    }
  }
}

/**
 * Sets the active screen and notifies listeners.
 * @param {string} screenId
 */
export function setScreen(screenId) {
  if (AppState.screen === screenId) return;
  AppState.previousScreen = AppState.screen;
  AppState.screen = screenId;
  notify("screen", screenId);
}

/**
 * Sets the map runtime mode ('normal' | 'navigation').
 * @param {'normal' | 'navigation'} mode
 */
export function setMapMode(mode) {
  if (AppState.mapMode === mode) return;
  AppState.mapMode = mode;
  notify("mapMode", mode);
}

/**
 * Sets the presentation scene ('NORTH' | 'TRANSITION' | 'SOUTH').
 * @param {'NORTH' | 'TRANSITION' | 'SOUTH'} scene
 */
export function setMapScene(scene) {
  if (AppState.mapScene === scene) return;
  if (scene !== MAP_SCENES.NORTH && scene !== MAP_SCENES.TRANSITION && scene !== MAP_SCENES.SOUTH) return;
  AppState.mapScene = scene;
  notify("mapScene", scene);
}

/**
 * Sets the selected character and persists to localStorage.
 * @param {'boy' | 'girl'} character
 */
export function setCharacter(character) {
  if (character !== "boy" && character !== "girl") return;
  AppState.character = character;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEYS.CHARACTER, character);
    }
  } catch (err) {
    console.warn("[AppState] Failed to save character to storage:", err);
  }
  notify("character", character);
}

/**
 * Updates settings and persists to localStorage.
 * @param {Partial<typeof AppState.settings>} newSettings
 */
export function updateSettings(newSettings) {
  AppState.settings = {
    ...AppState.settings,
    ...newSettings
  };
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(AppState.settings));
      if (typeof newSettings.tutorialCompleted === "boolean") {
        localStorage.setItem(STORAGE_KEYS.TUTORIAL, String(newSettings.tutorialCompleted));
      }
    }
  } catch (err) {
    console.warn("[AppState] Failed to save settings to storage:", err);
  }
  notify("settings", AppState.settings);
}

/**
 * Updates the navigation state.
 * @param {Partial<typeof AppState.navigation>} navUpdate
 */
export function updateNavigation(navUpdate) {
  AppState.navigation = {
    ...AppState.navigation,
    ...navUpdate
  };
  notify("navigation", AppState.navigation);
}

/**
 * Sets the active overlay.
 * @param {'arrival' | null} overlayId
 */
export function setOverlay(overlayId) {
  AppState.activeOverlay = overlayId;
  notify("activeOverlay", overlayId);
}
