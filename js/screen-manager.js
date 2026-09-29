/**
 * College Navigator - Screen Router & Overlay Manager
 * Phase 8: Application Shell & Screen Architecture
 *
 * Implements standard screen lifecycle:
 *   enter(data) -> render() -> activate() -> deactivate() -> exit()
 * Manages screen routing, history stack, single overlay management,
 * and bottom navigation synchronization.
 */

import { AppState, setScreen, setOverlay, subscribe } from "./state.js";

export const SCREENS = {
  WELCOME: "welcome",
  CHARACTER_SELECT: "character_select",
  MAP: "map",
  SEARCH: "search",
  MENU: "menu",
  SETTINGS: "settings",
  HOW_TO_NAVIGATE: "how_to_navigate",
  ABOUT: "about"
};

export const OVERLAYS = {
  ARRIVAL: "arrival"
};

export const ScreenManager = (function() {
  const screens = new Map();
  const screenHistory = [];
  let currentActiveScreen = null;
  let overlayHandlers = new Map();

  /**
   * Registers a screen component with full lifecycle support.
   * @param {string} id - Unique screen identifier (from SCREENS)
   * @param {Object} definition
   * @param {HTMLElement} definition.element - Container DOM element
   * @param {Function} [definition.enter] - Called before showing
   * @param {Function} [definition.render] - Called to populate content
   * @param {Function} [definition.activate] - Called to bind listeners
   * @param {Function} [definition.deactivate] - Called to unbind/mute listeners
   * @param {Function} [definition.exit] - Called when leaving
   */
  function registerScreen(id, definition) {
    screens.set(id, {
      id,
      element: definition.element || null,
      enter: definition.enter || (() => {}),
      render: definition.render || (() => {}),
      activate: definition.activate || (() => {}),
      deactivate: definition.deactivate || (() => {}),
      exit: definition.exit || (() => {})
    });
  }

  /**
   * Registers an overlay handler.
   * @param {string} id - Overlay identifier (from OVERLAYS)
   * @param {Object} handler
   * @param {HTMLElement} handler.element - Overlay modal container
   * @param {Function} [handler.show]
   * @param {Function} [handler.hide]
   */
  function registerOverlay(id, handler) {
    overlayHandlers.set(id, handler);
  }

  /**
   * Navigates to a target screen.
   * @param {string} targetScreenId
   * @param {Object} [data]
   * @param {boolean} [isBack=false]
   */
  function navigateTo(targetScreenId, data = null, isBack = false) {
    const targetScreen = screens.get(targetScreenId);
    if (!targetScreen) {
      console.error(`[ScreenManager] Screen "${targetScreenId}" is not registered.`);
      return;
    }

    if (currentActiveScreen === targetScreen && !data) {
      return; // Already on this screen
    }

    // 1. Deactivate & exit currently active screen
    if (currentActiveScreen) {
      try {
        currentActiveScreen.deactivate();
        currentActiveScreen.exit();
      } catch (err) {
        console.error(`[ScreenManager] Error exiting screen "${currentActiveScreen.id}":`, err);
      }
      if (currentActiveScreen.element) {
        currentActiveScreen.element.classList.remove("active");
        currentActiveScreen.element.style.display = "none";
      }

      if (!isBack && currentActiveScreen.id !== targetScreenId) {
        // Only push to history if not navigating back and not navigating to self
        screenHistory.push(currentActiveScreen.id);
      }
    }

    // 2. Enter, render & activate target screen
    currentActiveScreen = targetScreen;
    setScreen(targetScreenId);

    if (targetScreen.element) {
      targetScreen.element.style.display = "";
      targetScreen.element.classList.add("active");
    }

    try {
      targetScreen.enter(data);
      targetScreen.render();
      targetScreen.activate();
    } catch (err) {
      console.error(`[ScreenManager] Error activating screen "${targetScreenId}":`, err);
    }

    syncBottomNav(targetScreenId, AppState.mapMode);
  }

  /**
   * Navigates back to the previous screen in history.
   * @returns {boolean} True if back navigation was performed
   */
  function goBack() {
    if (AppState.activeOverlay) {
      closeOverlay();
      return true;
    }

    if (screenHistory.length === 0) {
      // Fallback: If on any non-map screen, return to MAP
      if (AppState.screen !== SCREENS.MAP && AppState.screen !== SCREENS.WELCOME) {
        navigateTo(SCREENS.MAP, null, true);
        return true;
      }
      return false;
    }

    const previousScreenId = screenHistory.pop();
    navigateTo(previousScreenId, null, true);
    return true;
  }

  /**
   * Opens an overlay over the current screen without tearing down the screen.
   * @param {string} overlayId
   * @param {Object} [data]
   */
  function openOverlay(overlayId, data = null) {
    const handler = overlayHandlers.get(overlayId);
    if (!handler) {
      console.error(`[ScreenManager] Overlay "${overlayId}" is not registered.`);
      return;
    }

    setOverlay(overlayId);
    if (handler.element) {
      handler.element.style.display = "flex";
      handler.element.classList.add("active");
    }
    if (handler.show) {
      handler.show(data);
    }
  }

  /**
   * Closes the active overlay.
   */
  function closeOverlay() {
    const currentOverlayId = AppState.activeOverlay;
    if (!currentOverlayId) return;

    const handler = overlayHandlers.get(currentOverlayId);
    if (handler) {
      if (handler.hide) {
        handler.hide();
      }
      if (handler.element) {
        handler.element.style.display = "none";
        handler.element.classList.remove("active");
      }
    }

    setOverlay(null);
  }

  /**
   * Synchronizes the bottom navigation bar active states.
   * @param {string} screenId
   * @param {string} mapMode
   */
  function syncBottomNav(screenId, mapMode) {
    if (typeof document === "undefined") return;
    const bottomNav = document.getElementById("app-bottom-nav");
    if (!bottomNav) return;

    // Bottom nav is hidden on focused full-screen interfaces (Welcome, Character Select, Menu)
    const isFullscreen = screenId === SCREENS.WELCOME || screenId === SCREENS.CHARACTER_SELECT || screenId === SCREENS.MENU;
    bottomNav.style.display = isFullscreen ? "none" : "flex";

    // Header is hidden on full-screen interfaces, SEARCH, SETTINGS, HOW_TO_NAVIGATE & ABOUT
    // (those screens provide their own back-button-only navigation treatment)
    const appHeader = document.querySelector(".app-header");
    if (appHeader) {
      const hideHeader = isFullscreen
        || screenId === SCREENS.SEARCH
        || screenId === SCREENS.SETTINGS
        || screenId === SCREENS.HOW_TO_NAVIGATE
        || screenId === SCREENS.ABOUT;
      appHeader.style.display = hideHeader ? "none" : "flex";
    }

    const navButtons = bottomNav.querySelectorAll(".nav-tab-btn");
    navButtons.forEach(btn => {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    });

    let activeTabId = null;
    if (screenId === SCREENS.MAP) {
      activeTabId = "nav-tab-map";
    } else if (screenId === SCREENS.SEARCH) {
      activeTabId = "nav-tab-search";
    } else if (screenId === SCREENS.CHARACTER_SELECT) {
      activeTabId = "nav-tab-character";
    } else if (screenId === SCREENS.SETTINGS) {
      activeTabId = "nav-tab-settings";
    } else if (screenId === SCREENS.HOW_TO_NAVIGATE) {
      activeTabId = "nav-tab-navigate";
    } else if (screenId === SCREENS.ABOUT || screenId === SCREENS.MENU) {
      activeTabId = "nav-tab-menu";
    }

    if (activeTabId) {
      const activeBtn = document.getElementById(activeTabId);
      if (activeBtn) {
        activeBtn.classList.add("active");
        activeBtn.setAttribute("aria-selected", "true");
      }
    }
  }

  // Subscribe to mapMode changes to keep bottom nav in sync
  subscribe("mapMode", (newMode) => {
    syncBottomNav(AppState.screen, newMode);
  });

  return {
    registerScreen,
    registerOverlay,
    hasScreen: (id) => screens.has(id),
    navigateTo,
    goBack,
    openOverlay,
    closeOverlay,
    syncBottomNav,
    getCurrentScreen: () => currentActiveScreen ? currentActiveScreen.id : null,
    getHistory: () => [...screenHistory],
    SCREENS,
    OVERLAYS
  };
})();
