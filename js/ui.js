/**
 * College Navigator - UI Controller
 * Phase 8: Application Shell & Screen Architecture
 *
 * Implements screen controllers and lifecycles for:
 *   WELCOME, CHARACTER_SELECT, MAP, SEARCH, MENU, SETTINGS, HOW_TO_NAVIGATE, ABOUT
 * plus ARRIVAL overlay and bottom navigation bar.
 */

import { AppState, setCharacter, updateSettings, setMapMode, subscribe } from "./state.js";
import { ScreenManager, SCREENS, OVERLAYS } from "./screen-manager.js";
import { NavigationService, isWashroomRestricted } from "./navigation-service.js";
import { MovementSystem } from "./movement.js";
import { AudioManager } from "./audio-manager.js";

export function setupUI({ rooms, nodesMap, camera, recenterCamera, setOverviewMode, toggleOverviewMode, isOverviewMode, setExplorationZoom, resizeCanvas }) {
  const roomsMap = new Map(rooms.map(r => [r.id, r]));

  // Diagnostic Touch / Pointer telemetry (Section 2 & 7)
  window.__touchLog = window.__touchLog || [];
  function instrumentTouchDiagnostic(el, id) {
    if (!el) return;
    const events = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click'];
    events.forEach(t => {
      el.addEventListener(t, (e) => {
        const clientX = e.clientX !== undefined ? Math.round(e.clientX) : (e.touches && e.touches[0] ? Math.round(e.touches[0].clientX) : null);
        const clientY = e.clientY !== undefined ? Math.round(e.clientY) : (e.touches && e.touches[0] ? Math.round(e.touches[0].clientY) : null);
        const logEntry = {
          id: id || el.id || el.tagName,
          type: e.type,
          clientX,
          clientY,
          defaultPrevented: e.defaultPrevented,
          target: e.target ? (e.target.id || e.target.tagName) : null,
          currentTarget: e.currentTarget ? (e.currentTarget.id || e.currentTarget.tagName) : null
        };
        window.__touchLog.push(logEntry);
        if (window.__touchLog.length > 200) window.__touchLog.shift();
        console.log(`[TOUCH] ${logEntry.id} ${logEntry.type} (${clientX}, ${clientY}) defPrev:${logEntry.defaultPrevented} target:${logEntry.target}`);
      }, { passive: true, capture: true });
    });
  }

  // Utility to bind immediate touch & click actions with zero latency and debounce
  function bindTapAction(el, handler) {
    if (!el) return;
    let lastTriggerTime = 0;

    function trigger(e) {
      const now = Date.now();
      // Debounce window to prevent double trigger from pointerdown + click or touchstart + pointerdown
      if (now - lastTriggerTime < 280) return;
      lastTriggerTime = now;
      handler(e);
    }

    // Pointer events (covers mouse and modern touch/pen on Android Chrome & desktop)
    el.addEventListener("pointerdown", (e) => {
      // For mouse, require primary button (0). For touch/pen, button can be 0, -1, or undefined.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      trigger(e);
    });

    // Explicit touchstart (passive fallback for Android Chrome gesture compositor)
    el.addEventListener("touchstart", (e) => {
      trigger(e);
    }, { passive: true });

    // Standard click as fallback for keyboard, accessibility, and desktop clicks
    el.addEventListener("click", (e) => {
      trigger(e);
    });
  }

  // Expose for runtime inspection & tests
  window.ScreenManager = ScreenManager;
  window.AppState = AppState;
  window.SCREENS = SCREENS;

  // --------------------------------------------------------------------------
  // SCREEN: WELCOME
  // --------------------------------------------------------------------------
  const welcomeEl = document.getElementById("screen-welcome");
  const btnWelcomeStart = document.getElementById("btn-welcome-start");
  const btnWelcomeGuide = document.getElementById("btn-welcome-guide");
  const btnWelcomeSettings = document.getElementById("btn-welcome-settings");

  ScreenManager.registerScreen(SCREENS.WELCOME, {
    element: welcomeEl,
    enter: () => {
      // Hide bottom nav during welcome onboarding
      ScreenManager.syncBottomNav(SCREENS.WELCOME, AppState.mapMode);
    },
    activate: () => {
      if (btnWelcomeStart) {
        btnWelcomeStart.onclick = () => ScreenManager.navigateTo(SCREENS.CHARACTER_SELECT);
      }
      if (btnWelcomeGuide) {
        btnWelcomeGuide.onclick = () => ScreenManager.navigateTo(SCREENS.HOW_TO_NAVIGATE);
      }
      if (btnWelcomeSettings) {
        btnWelcomeSettings.onclick = () => ScreenManager.navigateTo(SCREENS.SETTINGS);
      }
    },
    deactivate: () => {
      if (btnWelcomeStart) btnWelcomeStart.onclick = null;
      if (btnWelcomeGuide) btnWelcomeGuide.onclick = null;
      if (btnWelcomeSettings) btnWelcomeSettings.onclick = null;
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN: CHARACTER SELECTION
  // --------------------------------------------------------------------------
  const charScreenEl = document.getElementById("screen-character");
  const btnCharBoy = document.getElementById("btn-char-boy");
  const btnCharGirl = document.getElementById("btn-char-girl");
  const btnCharConfirm = document.getElementById("btn-char-confirm");

  function updateCharSelectionUI(selected) {
    if (btnCharBoy && btnCharGirl) {
      if (selected === "boy") {
        btnCharBoy.classList.add("active");
        btnCharBoy.setAttribute("aria-pressed", "true");
        btnCharGirl.classList.remove("active");
        btnCharGirl.setAttribute("aria-pressed", "false");
      } else {
        btnCharGirl.classList.add("active");
        btnCharGirl.setAttribute("aria-pressed", "true");
        btnCharBoy.classList.remove("active");
        btnCharBoy.setAttribute("aria-pressed", "false");
      }
    }
  }

  ScreenManager.registerScreen(SCREENS.CHARACTER_SELECT, {
    element: charScreenEl,
    enter: () => {
      updateCharSelectionUI(AppState.character);
    },
    activate: () => {
      const btnCharBack = document.querySelector(".character-back-btn");
      if (btnCharBack) {
        btnCharBack.onclick = () => ScreenManager.goBack();
      }
      if (btnCharBoy) {
        btnCharBoy.onclick = () => {
          AudioManager.playSfx("character-select");
          setCharacter("boy");
          MovementSystem.setCharacter("boy");
          updateCharSelectionUI("boy");
        };
      }
      if (btnCharGirl) {
        btnCharGirl.onclick = () => {
          AudioManager.playSfx("character-select");
          setCharacter("girl");
          MovementSystem.setCharacter("girl");
          updateCharSelectionUI("girl");
        };
      }
      if (btnCharConfirm) {
        btnCharConfirm.onclick = () => {
          setMapMode("normal");
          ScreenManager.navigateTo(SCREENS.MAP);
        };
      }
    },
    deactivate: () => {
      const btnCharBack = document.querySelector(".character-back-btn");
      if (btnCharBack) btnCharBack.onclick = null;
      if (btnCharBoy) btnCharBoy.onclick = null;
      if (btnCharGirl) btnCharGirl.onclick = null;
      if (btnCharConfirm) btnCharConfirm.onclick = null;
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN: MAP (Persistent Viewport Layer + Navigation Mode HUD)
  // --------------------------------------------------------------------------
  const mapScreenEl = document.getElementById("screen-map");
  const mapViewportContainer = document.getElementById("map-viewport-container");
  const navModePanel = document.getElementById("nav-mode-panel");
  const routeCard = document.getElementById("route-card");
  const routeTitle = document.getElementById("route-title");
  const routeCategory = document.getElementById("route-category");
  const routeDistance = document.getElementById("route-distance");
  const routeStatus = document.getElementById("route-status");
  const btnToggleMode = document.getElementById("btn-toggle-mode");
  const modeBtnIcon = document.getElementById("mode-btn-icon");
  const modeBtnLabel = document.getElementById("mode-btn-label");
  const btnCancelRoute = document.getElementById("btn-cancel-route");
  const btnReplay = document.getElementById("btn-replay");
  const btnSkip = document.getElementById("btn-skip");
  const doorChipsContainer = document.getElementById("door-chips-container");
  const routeNodeList = document.getElementById("route-node-list");

  const btnCameraToggle = document.getElementById("btn-camera-toggle");
  const btnZoomIn = document.getElementById("hud-zoom-in");
  const btnZoomOut = document.getElementById("hud-zoom-out");
  const btnRecenter = document.getElementById("hud-recenter");

  function renderMapNavigationPanel() {
    if (!navModePanel) return;

    if (AppState.mapMode === "navigation" && AppState.navigation.destination) {
      navModePanel.style.display = "block";
      if (mapScreenEl) mapScreenEl.classList.add("has-nav-panel");
      const routeDetailsEl = document.getElementById("route-details");
      if (routeDetailsEl) routeDetailsEl.open = false;
      const dest = AppState.navigation.destination;
      const route = AppState.navigation.route;
      const isSim = (MovementSystem.isSimulating && MovementSystem.isSimulating()) || (AppState.navigation && AppState.navigation.navMode === "simulate");

      if (routeTitle) {
        routeTitle.textContent = `${dest.roomCode} — ${dest.name || ""}`;
      }
      if (routeCategory) {
        routeCategory.textContent = dest.category || "";
      }
      if (routeDistance) {
        routeDistance.textContent = route ? `about ${route.distance.toFixed(1)} m` : "--";
      }

      // Update Mode button & status banner
      if (btnToggleMode) {
        if (isSim) {
          if (modeBtnIcon) modeBtnIcon.textContent = "🕹️";
          if (modeBtnLabel) modeBtnLabel.textContent = "Manual";
          btnToggleMode.title = "Switch to Manual Movement with Joystick";
          btnToggleMode.classList.add("mode-sim-active");
          btnToggleMode.classList.remove("mode-manual-active");
        } else {
          if (modeBtnIcon) modeBtnIcon.textContent = "🚶";
          if (modeBtnLabel) modeBtnLabel.textContent = "Simulate";
          btnToggleMode.title = "Auto-walk specified path";
          btnToggleMode.classList.add("mode-manual-active");
          btnToggleMode.classList.remove("mode-sim-active");
        }
      }

      if (routeStatus) {
        if (isSim) {
          routeStatus.innerHTML = `<span class="badge-status-sim">🚶 SIMULATING</span> <span class="status-msg">Character walking route automatically. Touch joystick to take control!</span>`;
        } else {
          routeStatus.innerHTML = `<span class="badge-status-manual">🕹️ MANUAL</span> <span class="status-msg">Path highlighted on floor. Move character using joystick!</span>`;
        }
      }

      // Multi-door chips (e.g., WAB 203)
      if (doorChipsContainer) {
        doorChipsContainer.innerHTML = "";
        const room = roomsMap.get(dest.roomId);
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
            chip.className = `door-chip ${doorNodeId === dest.doorId ? "active" : ""}`;
            chip.textContent = door.label || doorNodeId;

            chip.onclick = () => {
              NavigationService.selectDestination(room.id, doorNodeId);
              NavigationService.calculateAndStartRoute();
            };

            chipsList.appendChild(chip);
          }
          chipGroup.appendChild(chipsList);
          doorChipsContainer.appendChild(chipGroup);
        }
      }

      // Collapsible route step list
      if (routeNodeList && route && route.path) {
        routeNodeList.innerHTML = "";
        route.path.forEach((node, index) => {
          const span = document.createElement("span");
          span.className = "node-id-badge";
          span.textContent = node.id;
          routeNodeList.appendChild(span);

          if (index < route.path.length - 1) {
            const arrow = document.createElement("span");
            arrow.className = "node-arrow";
            arrow.innerHTML = `<img src="assets/ui-icons/icon_arrow.png" alt="→" class="node-arrow-icon" style="width: 10px; height: 10px; vertical-align: middle; margin: 0 4px;">`;
            routeNodeList.appendChild(arrow);
          }
        });
      }
    } else {
      navModePanel.style.display = "none";
      if (mapScreenEl) mapScreenEl.classList.remove("has-nav-panel");
    }
  }

  ScreenManager.registerScreen(SCREENS.MAP, {
    element: mapScreenEl,
    enter: () => {
      // Ensure persistent map container is visible with proper flex layout
      if (mapViewportContainer) mapViewportContainer.style.display = "flex";
      if (typeof resizeCanvas === 'function') resizeCanvas();
      if (typeof recenterCamera === 'function') recenterCamera();
      camera.isAutoFollowing = true;
      renderMapNavigationPanel();
    },
    render: () => {
      renderMapNavigationPanel();
    },
    activate: () => {
      // Camera mode toggle (Requirement 9 & 11: Overview / Exploration)
      if (btnCameraToggle) {
        bindTapAction(btnCameraToggle, () => {
          AudioManager.playSfx("toggle");
          if (typeof toggleOverviewMode === 'function') {
            toggleOverviewMode();
          } else {
            const isOverview = btnCameraToggle.classList.contains("active") && camera.zoom <= 16;
            if (!isOverview) {
              camera.zoom = 12;
              camera.isAutoFollowing = false;
              btnCameraToggle.classList.remove("active");
              btnCameraToggle.setAttribute("aria-pressed", "false");
            } else {
              camera.zoom = 27;
              camera.isAutoFollowing = true;
              btnCameraToggle.classList.add("active");
              btnCameraToggle.setAttribute("aria-pressed", "true");
              if (recenterCamera) recenterCamera();
            }
          }
        });
      }

      const btnHudOverview = document.getElementById("hud-overview");
      if (btnHudOverview) {
        instrumentTouchDiagnostic(btnHudOverview, "hud-overview");
        bindTapAction(btnHudOverview, (e) => {
          if (typeof toggleOverviewMode === 'function') {
            toggleOverviewMode();
          } else if (btnCameraToggle) {
            btnCameraToggle.click();
          }
        });
      }

      // HUD buttons (Phase 5 & Phase 13 Instant Zoom Response via zero-latency bindTapAction)
      if (btnZoomIn) {
        instrumentTouchDiagnostic(btnZoomIn, "hud-zoom-in");
        bindTapAction(btnZoomIn, (e) => {
          if (typeof setOverviewMode === 'function') setOverviewMode(false);
          const newZoom = Math.min(40, camera.zoom * 1.25);
          if (typeof setExplorationZoom === 'function') {
            setExplorationZoom(newZoom);
          } else {
            camera.zoom = newZoom;
          }
          camera.isAutoFollowing = true;
          if (recenterCamera) recenterCamera();
        });
      }
      if (btnZoomOut) {
        instrumentTouchDiagnostic(btnZoomOut, "hud-zoom-out");
        bindTapAction(btnZoomOut, (e) => {
          const newZoom = Math.max(8, camera.zoom / 1.25);
          if (typeof setExplorationZoom === 'function') {
            setExplorationZoom(newZoom);
          } else {
            camera.zoom = newZoom;
          }
          camera.isAutoFollowing = true;
          if (recenterCamera) recenterCamera();
        });
      }
      if (btnRecenter) {
        instrumentTouchDiagnostic(btnRecenter, "hud-recenter");
        bindTapAction(btnRecenter, (e) => {
          if (typeof setOverviewMode === 'function') setOverviewMode(false);
          camera.zoom = Math.max(24, Math.min(40, camera.zoom));
          camera.isAutoFollowing = true;
          if (btnCameraToggle) {
            btnCameraToggle.classList.add("active");
            btnCameraToggle.setAttribute("aria-pressed", "true");
          }
          if (recenterCamera) recenterCamera();
        });
      }

      const hudCompass = document.getElementById("hud-compass");
      if (hudCompass) {
        instrumentTouchDiagnostic(hudCompass, "hud-compass");
        bindTapAction(hudCompass, (e) => {
          camera.rotation = 0;
          camera.isAutoFollowing = true;
          if (recenterCamera) recenterCamera();
        });
      }

      if (btnCameraToggle) {
        instrumentTouchDiagnostic(btnCameraToggle, "btn-camera-toggle");
      }

      // Navigation Mode Controls
      if (btnToggleMode) {
        btnToggleMode.onclick = () => {
          AudioManager.playSfx("toggle");
          const isSim = (MovementSystem.isSimulating && MovementSystem.isSimulating()) || (AppState.navigation && AppState.navigation.navMode === "simulate");
          if (isSim) {
            NavigationService.setNavMode("manual");
          } else {
            NavigationService.setNavMode("simulate");
          }
          renderMapNavigationPanel();
        };
      }

      if (btnCancelRoute) {
        btnCancelRoute.onclick = () => {
          NavigationService.cancelNavigation();
          renderMapNavigationPanel();
        };
      }

      if (btnSkip) {
        btnSkip.onclick = () => {
          // Instantly advance character to active destination node and trigger arrival
          if (AppState.navigation.activeDestination) {
            const dest = AppState.navigation.activeDestination;
            MovementSystem.setPlayerPos(dest.x, dest.y);
            NavigationService.triggerArrival();
          }
        };
      }

      if (btnReplay) {
        btnReplay.onclick = () => {
          const currentMode = (MovementSystem.isSimulating && MovementSystem.isSimulating()) ? "simulate" : "manual";
          NavigationService.calculateAndStartRoute({ mode: currentMode });
        };
      }
    },
    deactivate: () => {
      if (btnCameraToggle) btnCameraToggle.onclick = null;
      if (btnZoomIn) btnZoomIn.onclick = null;
      if (btnZoomOut) btnZoomOut.onclick = null;
      if (btnRecenter) btnRecenter.onclick = null;
      if (btnToggleMode) btnToggleMode.onclick = null;
      if (btnCancelRoute) btnCancelRoute.onclick = null;
      if (btnSkip) btnSkip.onclick = null;
      if (btnReplay) btnReplay.onclick = null;
    }
  });

  // Subscribe to navigation / mapMode changes to re-render map panel if currently on MAP screen
  subscribe("mapMode", () => {
    if (AppState.screen === SCREENS.MAP) {
      renderMapNavigationPanel();
    }
  });
  subscribe("navigation", () => {
    if (AppState.screen === SCREENS.MAP) {
      renderMapNavigationPanel();
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN: SEARCH (Phase 13 Destination Discovery & Selection)
  // --------------------------------------------------------------------------
  const searchScreenEl = document.getElementById("screen-search");
  const searchInput = document.getElementById("search-input");
  const searchClearBtn = document.getElementById("btn-search-clear");
  const searchResults = document.getElementById("search-results");
  const searchCountLabel = document.getElementById("search-count-label");
  const searchSelectedBanner = document.getElementById("search-selected-banner");
  const bannerDestCode = document.getElementById("banner-dest-code");
  const bannerDestName = document.getElementById("banner-dest-name");
  const bannerFromLabel = document.getElementById("banner-from-label");
  const btnBannerSimulate = document.getElementById("btn-banner-simulate");
  const btnBannerViewMap = document.getElementById("btn-banner-view-map");
  const btnSearchBack = document.getElementById("btn-search-back");
  const filterChips = document.querySelectorAll(".search-filter-chips .filter-chip");
  const routeFromSelect = document.getElementById("route-from-select");
  const routeFromTrigger = document.getElementById("route-from-trigger");
  const routeFromLabel = document.getElementById("route-from-label");
  const fromSheetBackdrop = document.getElementById("from-sheet-backdrop");
  const fromBottomSheet = document.getElementById("from-bottom-sheet");
  const fromSheetCloseBtn = document.getElementById("btn-close-from-sheet");
  const fromSheetOptions = document.getElementById("from-sheet-options");
  const btnSearchSort = document.getElementById("btn-search-sort");
  const searchSortText = document.getElementById("search-sort-text");
  const btnSwapWaypoints = document.getElementById("btn-swap-waypoints");

  let activeFilter = "all";
  let searchTimeout = null;
  let currentSortOrder = "A-Z"; // "A-Z" | "Z-A"

  function updateFromTriggerLabel(originId) {
    if (!routeFromLabel) return;
    if (originId === "CURRENT_POS") {
      routeFromLabel.textContent = "📍 Current Location";
    } else if (originId === "ENTRANCE") {
      routeFromLabel.textContent = "🚪 Main Entrance (Level 1)";
    } else {
      const room = roomsMap.get(originId);
      if (room) {
        routeFromLabel.textContent = `${room.code} — ${room.name}`;
      } else {
        routeFromLabel.textContent = originId || "Select Starting Location";
      }
    }
  }

  function openFromBottomSheet() {
    if (!fromBottomSheet || !fromSheetBackdrop) return;
    populateFromSelect();
    fromSheetBackdrop.style.display = "block";
    fromBottomSheet.style.display = "flex";
    requestAnimationFrame(() => {
      fromSheetBackdrop.classList.add("active");
      fromBottomSheet.classList.add("active");
    });
  }

  function closeFromBottomSheet() {
    if (!fromBottomSheet || !fromSheetBackdrop) return;
    fromSheetBackdrop.classList.remove("active");
    fromBottomSheet.classList.remove("active");
    setTimeout(() => {
      fromSheetBackdrop.style.display = "none";
      fromBottomSheet.style.display = "none";
    }, 280);
  }

  function populateFromSelect() {
    const currentOrigin = NavigationService.getOrigin() || { id: "CURRENT_POS" };
    const currentOriginId = currentOrigin.id || "CURRENT_POS";

    // 1. Update trigger label & hidden select
    updateFromTriggerLabel(currentOriginId);
    if (routeFromSelect) {
      routeFromSelect.innerHTML = `
        <option value="CURRENT_POS">📍 Current Location</option>
        <option value="ENTRANCE">🚪 Main Entrance (Level 1)</option>
      `;
    }

    // 2. Populate Bottom Sheet Options (Requirement 6)
    if (fromSheetOptions) {
      fromSheetOptions.innerHTML = "";

      const makeOption = (optId, glyph, codeText, nameText, isSelected) => {
        const item = document.createElement("div");
        item.className = `from-option-item from-sheet-option ${isSelected ? "selected" : ""}`;
        item.dataset.value = optId;
        item.setAttribute("role", "radio");
        item.setAttribute("aria-checked", isSelected ? "true" : "false");
        item.setAttribute("tabindex", "0");
        item.innerHTML = `
          <div class="from-option-left">
            <span class="from-option-glyph">${glyph}</span>
            <div class="from-option-details">
              <span class="from-option-code">${codeText}</span>
              ${nameText ? `<span class="from-option-name">${nameText}</span>` : ""}
            </div>
          </div>
          <div class="from-radio-circle">
            <span class="from-radio-dot"></span>
          </div>
        `;
        item.onclick = (e) => {
          e.stopPropagation();
          NavigationService.setOrigin(optId);
          if (routeFromSelect) routeFromSelect.value = optId;
          updateFromTriggerLabel(optId);
          updateSelectedBanner();
          closeFromBottomSheet();
        };
        return item;
      };

      // Special starting origins
      fromSheetOptions.appendChild(makeOption("CURRENT_POS", "📍", "Current Location", "Uses your live position in CSE Block", currentOriginId === "CURRENT_POS"));
      fromSheetOptions.appendChild(makeOption("ENTRANCE", "🚪", "Main Entrance (Level 1)", "Campus entryway & security checkpoint", currentOriginId === "ENTRANCE"));

      // Categorized searchable rooms
      const validRooms = rooms.filter(r => !r.locked && r.searchable !== false && !isWashroomRestricted(r.id, AppState.character));
      const categories = [
        { id: "CLASSROOM", label: "Classrooms" },
        { id: "LABORATORY", label: "Laboratories" },
        { id: "FACULTY", label: "Faculty Offices" },
        { id: "STAFFROOM", label: "Staff Rooms" },
        { id: "SEMINAR_HALL", label: "Seminar Hall" },
        { id: "LIBRARY", label: "Library" },
        { id: "FACILITY", label: "Washrooms & Restrooms" }
      ];

      categories.forEach(cat => {
        const catRooms = validRooms.filter(r => r.category === cat.id);
        if (catRooms.length > 0) {
          // Add to hidden select for compatibility
          if (routeFromSelect) {
            const group = document.createElement("optgroup");
            group.label = cat.label;
            catRooms.forEach(room => {
              const opt = document.createElement("option");
              opt.value = room.id;
              opt.textContent = `${room.code} — ${room.name}`;
              group.appendChild(opt);
            });
            routeFromSelect.appendChild(group);
          }

          // Category header in bottom sheet
          const catHeader = document.createElement("div");
          catHeader.className = "from-category-header";
          catHeader.textContent = cat.label;
          fromSheetOptions.appendChild(catHeader);

          // Room options
          catRooms.forEach(room => {
            const isSel = currentOriginId === room.id;
            fromSheetOptions.appendChild(makeOption(room.id, "🚪", room.code, room.name, isSel));
          });
        }
      });
    }

    if (routeFromSelect) {
      routeFromSelect.value = currentOriginId;
    }
  }

  function updateSelectedBanner() {
    if (!searchSelectedBanner) return;
    const currentDest = AppState.navigation.destination;
    const currentOrigin = NavigationService.getOrigin() || { id: "CURRENT_POS", label: "Current Location" };

    if (bannerFromLabel) {
      if (currentOrigin.id === "CURRENT_POS") {
        bannerFromLabel.textContent = "📍 Current Pos";
      } else if (currentOrigin.id === "ENTRANCE") {
        bannerFromLabel.textContent = "🚪 Entrance";
      } else if (currentOrigin.room) {
        bannerFromLabel.textContent = currentOrigin.room.code;
      } else {
        bannerFromLabel.textContent = currentOrigin.label ? currentOrigin.label.split("—")[0].trim() : "Start";
      }
    }

    if (currentDest && currentDest.roomCode) {
      searchSelectedBanner.style.display = "block";
      if (bannerDestCode) bannerDestCode.textContent = currentDest.roomCode;
      if (bannerDestName) bannerDestName.textContent = currentDest.name || "";
    } else {
      searchSelectedBanner.style.display = "none";
    }
  }

  /**
   * Generates a pixel-art room thumbnail matching the reference screenshot.
   * @param {Object} room
   * @param {boolean} isLocked
   * @returns {string} HTML markup
   */
  function getRoomThumbnail(room, isLocked) {
    if (isLocked || room.id === "WAB217") {
      return `
        <div class="room-thumb-box thumb-locked" style="position: relative;">
          <img src="assets/doors/storage_door_locked.png" alt="Storage Locked" class="dest-thumb-img">
          <img src="assets/ui-icons/icon_lock.png" alt="" style="position: absolute; right: 2px; bottom: 2px; width: 14px; height: 14px;">
        </div>
      `;
    }

    switch (room.category) {
      case "FACULTY":
        return `
          <div class="room-thumb-box thumb-faculty">
            <svg viewBox="0 0 32 32" class="dest-thumb-svg" fill="none">
              <rect x="7" y="3" width="18" height="26" fill="#8B5A2B" stroke="#4A2E12" stroke-width="2"/>
              <rect x="10" y="6" width="12" height="7" fill="#3D5A40" stroke="#253827" stroke-width="1.5"/>
              <rect x="12" y="8" width="8" height="3" fill="#FFF7E8"/>
              <rect x="10" y="16" width="12" height="10" fill="#6E4420" stroke="#4A2E12" stroke-width="1.5"/>
              <circle cx="21" cy="18" r="1.5" fill="#D6A84F"/>
            </svg>
          </div>
        `;

      case "SEMINAR_HALL":
        return `
          <div class="room-thumb-box thumb-seminar">
            <svg viewBox="0 0 32 32" class="dest-thumb-svg" fill="none">
              <rect x="4" y="3" width="24" height="15" fill="#2E4A7D" stroke="#162A46" stroke-width="2"/>
              <rect x="7" y="5" width="18" height="11" fill="#6A93D4"/>
              <rect x="4" y="21" width="6" height="7" fill="#8B4513" stroke="#4A2508" stroke-width="1.5"/>
              <rect x="13" y="21" width="6" height="7" fill="#8B4513" stroke="#4A2508" stroke-width="1.5"/>
              <rect x="22" y="21" width="6" height="7" fill="#8B4513" stroke="#4A2508" stroke-width="1.5"/>
            </svg>
          </div>
        `;

      case "STAFFROOM":
        return `
          <div class="room-thumb-box thumb-staffroom">
            <svg viewBox="0 0 32 32" class="dest-thumb-svg" fill="none">
              <circle cx="9" cy="10" r="3" fill="#D49B6A"/>
              <path d="M5 19c0-3 2-4 4-4s4 1 4 4" fill="#203653"/>
              <circle cx="16" cy="8" r="3" fill="#E8B88A"/>
              <path d="M12 18c0-3 2-4 4-4s4 1 4 4" fill="#162A46"/>
              <circle cx="23" cy="10" r="3" fill="#C68958"/>
              <path d="M19 19c0-3 2-4 4-4s4 1 4 4" fill="#203653"/>
              <rect x="3" y="19" width="26" height="10" fill="#8B5A2B" stroke="#4A2E12" stroke-width="2"/>
              <line x1="3" y1="23" x2="29" y2="23" stroke="#5E3716" stroke-width="1.5"/>
            </svg>
          </div>
        `;

      case "CLASSROOM":
        return `
          <div class="room-thumb-box thumb-classroom">
            <svg viewBox="0 0 32 32" class="dest-thumb-svg" fill="none">
              <rect x="4" y="4" width="24" height="13" fill="#2B5A38" stroke="#5E3A1A" stroke-width="2"/>
              <line x1="6" y1="14" x2="16" y2="14" stroke="#FFF7E8" stroke-width="1.5"/>
              <rect x="4" y="20" width="6" height="8" fill="#A86C3E" stroke="#5E3A1A" stroke-width="1.5"/>
              <rect x="13" y="20" width="6" height="8" fill="#A86C3E" stroke="#5E3A1A" stroke-width="1.5"/>
              <rect x="22" y="20" width="6" height="8" fill="#A86C3E" stroke="#5E3A1A" stroke-width="1.5"/>
            </svg>
          </div>
        `;

      case "LABORATORY":
        return `
          <div class="room-thumb-box thumb-lab">
            <svg viewBox="0 0 32 32" class="dest-thumb-svg" fill="none">
              <rect x="3" y="6" width="16" height="13" fill="#203653" stroke="#0E1B2D" stroke-width="1.5"/>
              <rect x="5" y="8" width="12" height="9" fill="#5D8AA8"/>
              <rect x="9" y="19" width="4" height="4" fill="#3A4A5E"/>
              <rect x="6" y="23" width="10" height="2" fill="#203653"/>
              <path d="M23 10v4l-4 8a1 1 0 001 1h8a1 1 0 001-1l-4-8v-4h-2z" fill="#4B2A6B" stroke="#251238" stroke-width="1.5"/>
              <path d="M21 16l-2 5a1 1 0 001 1h6a1 1 0 001-1l-2-5h-4z" fill="#9966CC"/>
              <line x1="22" y1="9" x2="26" y2="9" stroke="#251238" stroke-width="1.5"/>
            </svg>
          </div>
        `;

      case "LIBRARY":
        return `
          <div class="room-thumb-box thumb-library">
            <svg viewBox="0 0 32 32" class="dest-thumb-svg" fill="none">
              <rect x="4" y="3" width="24" height="26" fill="#8B5A2B" stroke="#4A2E12" stroke-width="2"/>
              <line x1="4" y1="16" x2="28" y2="16" stroke="#4A2E12" stroke-width="2"/>
              <rect x="7" y="6" width="3" height="8" fill="#C23B22"/>
              <rect x="11" y="5" width="4" height="9" fill="#2A6F97"/>
              <rect x="16" y="7" width="3" height="7" fill="#D4A373"/>
              <rect x="20" y="6" width="4" height="8" fill="#52B788"/>
              <rect x="7" y="18" width="4" height="9" fill="#D4A373"/>
              <rect x="12" y="19" width="3" height="8" fill="#C23B22"/>
              <rect x="16" y="18" width="4" height="9" fill="#2A6F97"/>
              <rect x="21" y="20" width="3" height="7" fill="#E76F51"/>
            </svg>
          </div>
        `;

      case "FACILITY":
        return `
          <div class="room-thumb-box thumb-facility" style="display: flex; align-items: center; justify-content: center; background: #162A46;">
            <img src="assets/washroom/washroom_icon.png" alt="Washroom" class="dest-thumb-img" style="width: 26px; height: 26px; object-fit: contain;">
          </div>
        `;

      default:
        return `
          <div class="room-thumb-box thumb-default">
            <svg viewBox="0 0 32 32" class="dest-thumb-svg" fill="none">
              <rect x="6" y="3" width="20" height="26" fill="#8B5A2B" stroke="#4A2E12" stroke-width="2"/>
              <circle cx="20" cy="16" r="1.5" fill="#D6A84F"/>
            </svg>
          </div>
        `;
    }
  }

  function renderSearchResults(query = "") {
    if (!searchResults) return;

    const roomsData = NavigationService.getRooms() || [];
    const cleanQuery = query.trim().toLowerCase();

    // Toggle clear button
    if (searchClearBtn) {
      searchClearBtn.style.display = cleanQuery.length > 0 ? "flex" : "none";
    }

    // Filter rooms
    const filtered = roomsData.filter(room => {
      // Gender-restricted washroom check: completely excluded from search results and destination cards
      if (isWashroomRestricted(room.id, AppState.character)) {
        return false;
      }

      if (activeFilter !== "all") {
        if (activeFilter === "LABORATORY") {
          if (room.category !== "LABORATORY") return false;
        } else if (activeFilter === "CLASSROOM") {
          if (room.category !== "CLASSROOM") return false;
        } else if (activeFilter === "SEMINAR_HALL") {
          if (room.category !== "SEMINAR_HALL") return false;
        } else if (activeFilter === "LIBRARY") {
          if (room.category !== "LIBRARY") return false;
        } else if (activeFilter === "FACILITY") {
          if (room.category !== "FACILITY") return false;
        } else if (activeFilter === "STAFFROOM") {
          if (room.category !== "STAFFROOM") return false;
        } else if (activeFilter === "FACULTY") {
          if (room.category !== "FACULTY") return false;
        } else if (room.category !== activeFilter) {
          return false;
        }
      }

      // WAB 217 check: show in ALL list as restricted card, or if user searched 217 / storage
      if (room.searchable === false || room.locked) {
        if (!cleanQuery) return activeFilter === "all";
        const queryMatchesLocked = (
          (room.code && room.code.toLowerCase().includes(cleanQuery)) ||
          (room.name && room.name.toLowerCase().includes(cleanQuery)) ||
          cleanQuery === "217" ||
          cleanQuery === "storage"
        );
        return queryMatchesLocked;
      }

      if (!cleanQuery) return true;

      return (
        (room.code && room.code.toLowerCase().includes(cleanQuery)) ||
        (room.name && room.name.toLowerCase().includes(cleanQuery)) ||
        (room.id && room.id.toLowerCase().includes(cleanQuery)) ||
        (room.category && room.category.toLowerCase().includes(cleanQuery))
      );
    });

    // Update count label (N dynamically calculated from searchable rooms)
    const searchableCount = filtered.filter(r => !r.locked && r.searchable !== false).length;
    if (searchCountLabel) {
      if (cleanQuery) {
        searchCountLabel.textContent = `ALL DESTINATIONS (${searchableCount})`;
      } else if (activeFilter !== "all") {
        const catName = activeFilter === "LABORATORY" ? "LABS" : activeFilter.replace(/_/g, " ");
        searchCountLabel.textContent = `${catName} (${searchableCount})`;
      } else {
        searchCountLabel.textContent = `ALL DESTINATIONS (${searchableCount})`;
      }
    }

    // Apply A-Z / Z-A sorting (Requirement 7)
    filtered.sort((a, b) => {
      const codeA = (a.code || "").toUpperCase();
      const codeB = (b.code || "").toUpperCase();
      if (currentSortOrder === "A-Z") {
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      } else {
        return codeB.localeCompare(codeA, undefined, { numeric: true });
      }
    });

    searchResults.innerHTML = "";

    // Empty state
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "search-empty-state";
      empty.innerHTML = `
        <img src="assets/ui-icons/ui_search_icon.png" alt="" class="search-empty-icon">
        <h3 class="search-empty-title">NO DESTINATIONS FOUND</h3>
        <p class="search-empty-desc">No rooms match &ldquo;${query}&rdquo;. Try another room code, category, or keyword.</p>
        <button type="button" class="search-empty-reset-btn" id="btn-search-reset">RESET SEARCH</button>
      `;
      searchResults.appendChild(empty);

      const resetBtn = empty.querySelector("#btn-search-reset");
      if (resetBtn) {
        resetBtn.onclick = () => {
          if (searchInput) searchInput.value = "";
          activeFilter = "all";
          filterChips.forEach(c => c.classList.toggle("active", c.dataset.filter === "all"));
          renderSearchResults("");
          if (searchInput) searchInput.focus();
        };
      }
      return;
    }

    const currentDest = AppState.navigation.destination;

    filtered.forEach(room => {
      const isLocked = room.locked === true || room.searchable === false;
      const isSelected = !isLocked && currentDest && currentDest.roomId === room.id;

      const card = document.createElement("div");
      card.className = `destination-card ${isSelected ? "selected" : ""} ${isLocked ? "locked-card" : ""}`;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", isLocked ? "-1" : "0");
      card.setAttribute("data-room-id", room.id);
      card.setAttribute("data-room-code", room.code);
      card.setAttribute("aria-label", isLocked ? `${room.code} Restricted` : `Select ${room.code} ${room.name}`);

      // Category badge styling & text
      let categoryBadgeText = (room.category || "").replace(/_/g, " ");
      let badgeClass = room.category ? room.category.toLowerCase() : "general";
      if (isLocked) {
        categoryBadgeText = "RESTRICTED";
        badgeClass = "restricted";
      } else if (room.category === "LABORATORY") {
        categoryBadgeText = "LAB";
        badgeClass = "laboratory";
      }

      // Door info formatting
      let doorInfo = "";
      let subDoorInfo = "";
      if (isLocked) {
        doorInfo = "Usually closed. Not accessible.";
      } else if (room.id === "WAB203") {
        doorInfo = "Primary Entrance: Door 2 (Central Corridor)";
        subDoorInfo = "3 Entrances";
      } else if (room.doors && room.doors.length > 0) {
        const primaryDoor = room.doors.find(d => d.primary) || room.doors[0];
        doorInfo = primaryDoor.label || `Entrance: ${primaryDoor.node || primaryDoor.id}`;
      }

      // Display name
      const displayName = isLocked && room.id === "WAB217" ? "Storage (Restricted)" : room.name;

      const quickActionsHtml = isSelected ? `
        <div class="dest-card-quick-actions">
          <button type="button" class="dest-quick-btn btn-sim-quick" data-room-id="${room.id}" title="Simulate: Character walks the specified path automatically">
            <span class="quick-icon">🚶</span> SIMULATE
          </button>
          <button type="button" class="dest-quick-btn btn-man-quick" data-room-id="${room.id}" title="Manual: Move with joystick, path highlighted on floor">
            <span class="quick-icon">🕹️</span> MANUAL
          </button>
        </div>
      ` : "";

      card.innerHTML = `
        <div class="dest-card-inner">
          ${getRoomThumbnail(room, isLocked)}
          <div class="dest-card-content">
            <div class="dest-card-top-row">
              <span class="dest-code-plaque">${room.code}</span>
              <span class="dest-category-badge badge-${badgeClass}">${categoryBadgeText}</span>
            </div>
            <div class="dest-room-name">${displayName}</div>
            ${doorInfo ? `<div class="dest-room-details ${isLocked ? 'locked-details' : ''}">${doorInfo}</div>` : ''}
            ${subDoorInfo ? `<div class="dest-sub-details">${subDoorInfo}</div>` : ''}
          </div>
          <div class="dest-action-col">
            ${isLocked
              ? '<span class="dest-restricted-glyph" title="Restricted" aria-label="Restricted"><img src="assets/ui-icons/icon_lock.png" alt="Restricted" style="width: 16px; height: 16px; vertical-align: middle;"></span>'
              : '<span class="dest-chevron-glyph" aria-hidden="true"><img src="assets/ui-icons/icon_arrow.png" alt="" style="width: 12px; height: 12px; vertical-align: middle;"></span>'
            }
          </div>
        </div>
        ${quickActionsHtml}
      `;

      if (!isLocked) {
        card.onclick = (e) => {
          // If clicked the quick simulate action button
          if (e.target.closest(".btn-sim-quick")) {
            e.stopPropagation();
            NavigationService.selectDestination(room.id);
            NavigationService.calculateAndStartRoute({ mode: "simulate" });
            return;
          }
          // If clicked the quick manual action button
          if (e.target.closest(".btn-man-quick")) {
            e.stopPropagation();
            NavigationService.selectDestination(room.id);
            NavigationService.calculateAndStartRoute({ mode: "manual" });
            return;
          }

          // If already selected and tapped body again, switch to map
          if (isSelected) {
            setMapMode("normal");
            ScreenManager.navigateTo(SCREENS.MAP);
            return;
          }

          // Select destination in AppState without starting route calculation
          NavigationService.selectDestination(room.id);
          renderSearchResults(searchInput ? searchInput.value : "");
          updateSelectedBanner();
        };

        // Keyboard accessible selection
        card.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            card.click();
          }
        };
      }

      searchResults.appendChild(card);
    });

    // Control visibility of bottom restricted notice: show if WAB 217 is present
    const restrictedAlertEl = document.getElementById("search-restricted-alert");
    if (restrictedAlertEl) {
      const hasLockedInResults = filtered.some(r => r.locked || r.id === "WAB217");
      restrictedAlertEl.style.display = hasLockedInResults ? "flex" : "none";
    }

    updateSelectedBanner();
  }

  ScreenManager.registerScreen(SCREENS.SEARCH, {
    element: searchScreenEl,
    enter: () => {
      populateFromSelect();
      renderSearchResults(searchInput ? searchInput.value : "");
      updateSelectedBanner();
    },
    activate: () => {
      // Search input typing
      if (searchInput) {
        searchInput.oninput = () => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            renderSearchResults(searchInput.value);
          }, 80);
        };
        setTimeout(() => searchInput.focus(), 60);
      }

      // Clear button
      if (searchClearBtn) {
        searchClearBtn.onclick = () => {
          if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
          }
          renderSearchResults("");
        };
      }

      // Waypoint origin (From) trigger -> open mobile bottom sheet (Requirement 6)
      if (routeFromTrigger) {
        routeFromTrigger.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          openFromBottomSheet();
        };
      }

      if (fromSheetCloseBtn) {
        fromSheetCloseBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeFromBottomSheet();
        };
      }

      if (fromSheetBackdrop) {
        fromSheetBackdrop.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeFromBottomSheet();
        };
      }

      // A-Z Sort button (Requirement 7)
      if (btnSearchSort) {
        btnSearchSort.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          currentSortOrder = currentSortOrder === "A-Z" ? "Z-A" : "A-Z";
          if (searchSortText) {
            searchSortText.textContent = currentSortOrder;
          }
          btnSearchSort.setAttribute("aria-label", `Sort order: ${currentSortOrder}`);
          renderSearchResults(searchInput ? searchInput.value : "");
        };
      }

      // Waypoint origin (From) dropdown change fallback
      if (routeFromSelect) {
        routeFromSelect.onchange = () => {
          NavigationService.setOrigin(routeFromSelect.value);
          updateFromTriggerLabel(routeFromSelect.value);
          updateSelectedBanner();
        };
      }

      // Waypoint swap button
      if (btnSwapWaypoints) {
        btnSwapWaypoints.onclick = () => {
          const currentOrigin = NavigationService.getOrigin();
          const currentDest = AppState.navigation.destination;
          if (currentDest && currentDest.roomId) {
            const newFromId = currentDest.roomId;
            const newToId = (currentOrigin && currentOrigin.id !== "CURRENT_POS" && currentOrigin.id !== "ENTRANCE") ? currentOrigin.id : null;
            NavigationService.setOrigin(newFromId);
            if (routeFromSelect) routeFromSelect.value = newFromId;
            updateFromTriggerLabel(newFromId);
            if (newToId) {
              NavigationService.selectDestination(newToId);
            }
            renderSearchResults(searchInput ? searchInput.value : "");
            updateSelectedBanner();
          }
        };
      }

      // Filter chips
      filterChips.forEach(chip => {
        chip.onclick = () => {
          filterChips.forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          activeFilter = chip.dataset.filter || "all";
          renderSearchResults(searchInput ? searchInput.value : "");
        };
      });

      // Back button
      if (btnSearchBack) {
        btnSearchBack.onclick = () => {
          ScreenManager.goBack();
        };
      }

      // Floating banner: SIMULATE (auto-walks specified path)
      if (btnBannerSimulate) {
        btnBannerSimulate.onclick = () => {
          NavigationService.calculateAndStartRoute({ mode: "simulate" });
        };
      }

      // Floating banner: MANUAL MOVEMENT (path highlighted on floor, move with joystick)
      if (btnBannerViewMap) {
        btnBannerViewMap.onclick = () => {
          NavigationService.calculateAndStartRoute({ mode: "manual" });
        };
      }
    },
    deactivate: () => {
      if (searchInput) searchInput.oninput = null;
      if (searchClearBtn) searchClearBtn.onclick = null;
      if (btnSearchBack) btnSearchBack.onclick = null;
      if (btnBannerViewMap) btnBannerViewMap.onclick = null;
      if (btnBannerSimulate) btnBannerSimulate.onclick = null;
      if (btnSwapWaypoints) btnSwapWaypoints.onclick = null;
      if (routeFromSelect) routeFromSelect.onchange = null;
      filterChips.forEach(chip => { chip.onclick = null; });
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN: MENU (Phase 17 Final Visual Implementation)
  // --------------------------------------------------------------------------
  const menuScreenEl = document.getElementById("screen-menu");
  const menuBtnResume = document.getElementById("menu-btn-resume");
  const menuBtnSearch = document.getElementById("menu-btn-search");
  const menuBtnChar = document.getElementById("menu-btn-character");
  const menuBtnSettings = document.getElementById("menu-btn-settings");
  const menuBtnHelp = document.getElementById("menu-btn-help");
  const menuBtnAbout = document.getElementById("menu-btn-about");
  const btnMenuBack = document.getElementById("btn-menu-back");

  ScreenManager.registerScreen(SCREENS.MENU, {
    element: menuScreenEl,
    activate: () => {
      // 1. Resume to Map
      if (menuBtnResume) {
        menuBtnResume.onclick = () => {
          setMapMode("normal");
          ScreenManager.navigateTo(SCREENS.MAP);
        };
      }

      // 2. Destination Search
      if (menuBtnSearch) {
        menuBtnSearch.onclick = () => {
          ScreenManager.navigateTo(SCREENS.SEARCH);
        };
      }

      // 3. Character Selection
      if (menuBtnChar) {
        menuBtnChar.onclick = () => {
          ScreenManager.navigateTo(SCREENS.CHARACTER_SELECT);
        };
      }

      // 4. Settings
      if (menuBtnSettings) {
        menuBtnSettings.onclick = () => {
          ScreenManager.navigateTo(SCREENS.SETTINGS);
        };
      }

      // 5. How to Navigate
      if (menuBtnHelp) {
        menuBtnHelp.onclick = () => {
          ScreenManager.navigateTo(SCREENS.HOW_TO_NAVIGATE);
        };
      }

      // 6. About
      if (menuBtnAbout) {
        menuBtnAbout.onclick = () => {
          ScreenManager.navigateTo(SCREENS.ABOUT);
        };
      }

      // Back Action Button
      if (btnMenuBack) {
        btnMenuBack.onclick = () => {
          ScreenManager.goBack();
        };
      }
    },
    deactivate: () => {
      if (menuBtnResume) menuBtnResume.onclick = null;
      if (menuBtnSearch) menuBtnSearch.onclick = null;
      if (menuBtnChar) menuBtnChar.onclick = null;
      if (menuBtnSettings) menuBtnSettings.onclick = null;
      if (menuBtnHelp) menuBtnHelp.onclick = null;
      if (menuBtnAbout) menuBtnAbout.onclick = null;
      if (btnMenuBack) btnMenuBack.onclick = null;
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN: SETTINGS (Phase 18 Final Visual Implementation)
  // --------------------------------------------------------------------------
  const settingsScreenEl = document.getElementById("screen-settings");
  const toggleSound = document.getElementById("setting-sound-toggle");
  const toggleMusic = document.getElementById("setting-music-toggle");
  const btnSettingTutorial = document.getElementById("btn-setting-tutorial");
  const btnSettingChar = document.getElementById("btn-setting-char");
  const btnSettingAbout = document.getElementById("btn-setting-about");
  const btnSettingsBack = document.getElementById("btn-settings-back");

  function syncToggleVisual(toggleEl, isOn) {
    if (!toggleEl) return;
    toggleEl.classList.toggle("is-on", isOn);
    toggleEl.classList.toggle("is-off", !isOn);
    toggleEl.setAttribute("aria-checked", isOn ? "true" : "false");
    const textEl = toggleEl.querySelector(".toggle-state-text");
    if (textEl) {
      textEl.textContent = isOn ? "ON" : "OFF";
    }
  }

  function syncSettingsCharPreview() {
    const charThumb = document.getElementById("settings-char-thumb");
    if (!charThumb) return;
    const isGirl = AppState.character === "girl";
    if (isGirl) {
      charThumb.innerHTML = `
        <svg viewBox="0 0 32 32" class="settings-thumb-svg" fill="none">
          <circle cx="16" cy="11" r="5" fill="#E8B88A" stroke="#0E1B2D" stroke-width="1.5"/>
          <path d="M10 8c0-4 12-4 12 0v5c0 1-1 2-2 2h-8c-1 0-2-1-2-2V8z" fill="#B34B30"/>
          <path d="M9 26c0-5 3-7 7-7s7 2 7 7" fill="#E8792D" stroke="#0E1B2D" stroke-width="1.5"/>
        </svg>
      `;
    } else {
      charThumb.innerHTML = `
        <svg viewBox="0 0 32 32" class="settings-thumb-svg" fill="none">
          <circle cx="16" cy="11" r="5" fill="#E8B88A" stroke="#0E1B2D" stroke-width="1.5"/>
          <path d="M11 9c0-4 10-4 10 0" fill="#203653"/>
          <path d="M9 26c0-5 3-7 7-7s7 2 7 7" fill="#00A9E0" stroke="#0E1B2D" stroke-width="1.5"/>
        </svg>
      `;
    }
  }

  // Keep character preview in sync whenever character changes
  subscribe("character", () => {
    syncSettingsCharPreview();
  });

  ScreenManager.registerScreen(SCREENS.SETTINGS, {
    element: settingsScreenEl,
    enter: () => {
      syncToggleVisual(toggleSound, AppState.settings.sound);
      syncToggleVisual(toggleMusic, AppState.settings.music);
      syncSettingsCharPreview();
    },
    activate: () => {
      // 1. Sound toggle
      if (toggleSound) {
        toggleSound.onclick = () => {
          const next = !AppState.settings.sound;
          AudioManager.playSfx("toggle");
          AudioManager.setMuted(!next);
          updateSettings({ sound: next });
          syncToggleVisual(toggleSound, next);
        };
      }

      // 2. Music toggle
      if (toggleMusic) {
        toggleMusic.onclick = () => {
          const next = !AppState.settings.music;
          AudioManager.playSfx("toggle");
          AudioManager.setMusicMuted(!next);
          updateSettings({ music: next });
          syncToggleVisual(toggleMusic, next);
        };
      }

      // 3. View Tutorial
      if (btnSettingTutorial) {
        btnSettingTutorial.onclick = () => {
          ScreenManager.navigateTo(SCREENS.HOW_TO_NAVIGATE);
        };
      }

      // 4. Change Character
      if (btnSettingChar) {
        btnSettingChar.onclick = () => {
          ScreenManager.navigateTo(SCREENS.CHARACTER_SELECT);
        };
      }

      // 5. View About
      if (btnSettingAbout) {
        btnSettingAbout.onclick = () => {
          ScreenManager.navigateTo(SCREENS.ABOUT);
        };
      }

      // 6. Back Button
      if (btnSettingsBack) {
        btnSettingsBack.onclick = () => {
          ScreenManager.goBack();
        };
      }
    },
    deactivate: () => {
      if (toggleSound) toggleSound.onclick = null;
      if (toggleMusic) toggleMusic.onclick = null;
      if (btnSettingTutorial) btnSettingTutorial.onclick = null;
      if (btnSettingChar) btnSettingChar.onclick = null;
      if (btnSettingAbout) btnSettingAbout.onclick = null;
      if (btnSettingsBack) btnSettingsBack.onclick = null;
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN: HOW TO NAVIGATE (Phase 19 Final Visual Implementation)
  // --------------------------------------------------------------------------
  const helpScreenEl = document.getElementById("screen-help");
  const btnHowBack = document.getElementById("btn-how-back");

  ScreenManager.registerScreen(SCREENS.HOW_TO_NAVIGATE, {
    element: helpScreenEl,
    enter: () => {
      // No route operations. State fully preserved on enter.
    },
    activate: () => {
      if (btnHowBack) {
        btnHowBack.onclick = () => ScreenManager.goBack();
      }
    },
    deactivate: () => {
      if (btnHowBack) btnHowBack.onclick = null;
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN: ABOUT (Phase 20 Final Visual Implementation)
  // --------------------------------------------------------------------------
  const aboutScreenEl = document.getElementById("screen-about");
  const btnAboutBack = document.getElementById("btn-about-back");

  ScreenManager.registerScreen(SCREENS.ABOUT, {
    element: aboutScreenEl,
    enter: () => {
      // No route operations. State fully preserved on enter.
    },
    activate: () => {
      if (btnAboutBack) {
        btnAboutBack.onclick = () => ScreenManager.goBack();
      }
    },
    deactivate: () => {
      if (btnAboutBack) btnAboutBack.onclick = null;
    }
  });

  // Header Menu Button
  const headerMenuBtn = document.getElementById("header-menu-btn");
  if (headerMenuBtn) {
    headerMenuBtn.addEventListener("click", () => {
      if (AppState.screen === SCREENS.MENU) {
        ScreenManager.goBack();
      } else {
        ScreenManager.navigateTo(SCREENS.MENU);
      }
    });
  }

  // --------------------------------------------------------------------------
  // OVERLAY: ARRIVAL MODAL
  // --------------------------------------------------------------------------
  const arrivalModal = document.getElementById("arrival-modal");
  const arrivalRoomCode = document.getElementById("arrival-room-code");
  const arrivalRoomName = document.getElementById("arrival-room-name");
  const arrivalCloseBtn = document.getElementById("arrival-close-btn");

  ScreenManager.registerOverlay(OVERLAYS.ARRIVAL, {
    element: arrivalModal,
    show: (data) => {
      if (arrivalRoomCode && data) arrivalRoomCode.textContent = data.roomCode || "DESTINATION";
      if (arrivalRoomName && data) arrivalRoomName.textContent = data.roomName || "Destination Reached";
      if (arrivalCloseBtn) {
        arrivalCloseBtn.onclick = () => {
          NavigationService.dismissArrival();
        };
      }
    },
    hide: () => {
      if (arrivalCloseBtn) arrivalCloseBtn.onclick = null;
    }
  });

  // --------------------------------------------------------------------------
  // TOP HEADER & HUD CONTROLS (Phase 11)
  // --------------------------------------------------------------------------
  const headerSettingsBtn = document.getElementById("header-settings-btn");
  if (headerSettingsBtn) {
    headerSettingsBtn.onclick = () => {
      ScreenManager.navigateTo(SCREENS.SETTINGS);
    };
  }

  const hudCompass = document.getElementById("hud-compass");
  if (hudCompass) {
    hudCompass.onclick = (e) => {
      e.stopPropagation();
      camera.isAutoFollowing = true;
      if (recenterCamera) recenterCamera();
    };
  }

  // --------------------------------------------------------------------------
  // BOTTOM NAVIGATION BAR (Phase 11 6-Tab Institutional Navigation)
  // --------------------------------------------------------------------------
  const navTabMap = document.getElementById("nav-tab-map");
  const navTabSearch = document.getElementById("nav-tab-search");
  const navTabChar = document.getElementById("nav-tab-character");
  const navTabSettings = document.getElementById("nav-tab-settings");
  const navTabNavigate = document.getElementById("nav-tab-navigate");
  const navTabMenu = document.getElementById("nav-tab-menu");

  if (navTabMap) {
    instrumentTouchDiagnostic(navTabMap, "nav-tab-map");
    bindTapAction(navTabMap, () => {
      ScreenManager.navigateTo(SCREENS.MAP);
    });
  }

  if (navTabSearch) {
    instrumentTouchDiagnostic(navTabSearch, "nav-tab-search");
    bindTapAction(navTabSearch, () => {
      ScreenManager.navigateTo(SCREENS.SEARCH);
    });
  }

  if (navTabChar) {
    instrumentTouchDiagnostic(navTabChar, "nav-tab-character");
    bindTapAction(navTabChar, () => {
      ScreenManager.navigateTo(SCREENS.CHARACTER_SELECT);
    });
  }

  if (navTabSettings) {
    instrumentTouchDiagnostic(navTabSettings, "nav-tab-settings");
    bindTapAction(navTabSettings, () => {
      ScreenManager.navigateTo(SCREENS.SETTINGS);
    });
  }

  if (navTabNavigate) {
    instrumentTouchDiagnostic(navTabNavigate, "nav-tab-navigate");
    bindTapAction(navTabNavigate, () => {
      ScreenManager.navigateTo(SCREENS.HOW_TO_NAVIGATE);
    });
  }

  if (navTabMenu) {
    instrumentTouchDiagnostic(navTabMenu, "nav-tab-menu");
    bindTapAction(navTabMenu, () => {
      ScreenManager.navigateTo(SCREENS.ABOUT);
    });
  }

  // Centralized UI Button Click handler for all standard buttons
  // Excludes buttons with custom sound handlers to prevent double sounds
  if (typeof document !== "undefined") {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button, .btn, .nav-tab-btn, [role='button']");
      if (!btn) return;

      // Filter out buttons with specific dedicated sound events
      if (
        btn.classList.contains("back-btn") ||
        btn.classList.contains("info-back-btn") ||
        btn.classList.contains("character-back-btn") ||
        btn.id === "btn-settings-back" ||
        btn.id === "btn-menu-back" ||
        btn.id === "btn-search-back" ||
        btn.classList.contains("rpg-toggle") ||
        btn.classList.contains("toggle-btn") ||
        btn.id === "setting-sound-toggle" ||
        btn.id === "setting-music-toggle" ||
        btn.id === "btn-camera-toggle" ||
        btn.id === "btn-toggle-mode" ||
        btn.id === "btn-char-boy" ||
        btn.id === "btn-char-girl" ||
        btn.id === "btn-dialogue-next" ||
        btn.id === "btn-dialogue-close" ||
        btn.id === "npc-dialogue-speech" ||
        btn.id === "btn-npc-interact" ||
        btn.closest(".btn-sim-quick") ||
        btn.closest(".btn-man-quick") ||
        btn.dataset.sfx === "none"
      ) {
        return;
      }

      // Entering map via bottom tab or continue button (handled by map-enter)
      if (btn.dataset.target === "map" || btn.id === "nav-tab-map" || btn.id === "btn-char-confirm") {
        return;
      }

      AudioManager.playSfx("click");
    }, true);
  }

  // React to character changes: auto-cancel restricted navigation and refresh search results
  subscribe("character", (newChar) => {
    if (AppState.navigation && AppState.navigation.destination) {
      if (isWashroomRestricted(AppState.navigation.destination.roomId, newChar)) {
        NavigationService.cancelNavigation();
      }
    }
    if (searchResults) {
      renderSearchResults(searchInput ? searchInput.value : "");
    }
  });

  return {
    selectRoom: (roomId, doorId) => {
      NavigationService.selectDestination(roomId, doorId);
      NavigationService.calculateAndStartRoute();
    }
  };
}
