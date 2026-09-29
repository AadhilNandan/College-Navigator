/**
 * Main Application Entry Point for CSE Block Navigator.
 * Phase 8: Application Shell & Screen Architecture
 *
 * Coordinates:
 * - Central AppState & ScreenManager lifecycle
 * - Persistent Map Runtime (HTML5 Canvas, MapRenderer, MovementSystem, Camera, gameLoop)
 * - NavigationService (Dijkstra via Java API, dynamic source resolution, arrival detection)
 * - Tap-to-navigate on door nodes
 * - Clean UI / gameplay separation
 */

import { loadGraphData } from "./js/data-loader.js";
import { MapRenderer, renderCanvasMap, renderMinimap } from "./js/map-renderer.js";
import { setupUI } from "./js/ui.js";
import { fetchRooms } from "./js/api-client.js";
import { MovementSystem } from "./js/movement.js";
import { AppState, setCharacter, setMapMode, MAP_SCENES, setMapScene } from "./js/state.js";
import { ScreenManager, SCREENS } from "./js/screen-manager.js";
import { NavigationService } from "./js/navigation-service.js";


async function initApp() {
  const loadingIndicator = document.getElementById("loading-state");
  const errorBanner = document.getElementById("error-banner");
  const appViewport = document.getElementById("app-viewport");
  const mapContainer = document.getElementById("map-container");
  const canvas = document.getElementById("game-canvas");
  const minimapCanvas = document.getElementById("minimap-canvas");
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext("2d") : null;
  const minimapDestLegend = document.getElementById("minimap-dest-legend");

  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Physical Android Startup Telemetry (Section 8)
  const T0 = (typeof window !== "undefined" && window.__T0) ? window.__T0 : (performance.timing ? performance.timing.navigationStart : performance.now());
  const T1 = performance.now();
  let T2 = 0;
  let T3 = 0;
  let T4 = 0;
  let T5 = 0;
  let T6 = 0;
  let T7 = 0;
  let T8 = 0;
  let t_canvas_start = 0;
  let t_canvas_end = 0;

  try {
    // 1 & 2. Load rooms and authoritative graph data in parallel while recording T2 & T3
    const [apiRooms, graphData] = await Promise.all([
      fetchRooms().catch(apiErr => {
        console.warn("API connection notice (will use static fallback if offline):", apiErr);
        return null;
      }).then(res => {
        T2 = performance.now();
        return res;
      }),
      loadGraphData("data/").then(res => {
        T3 = performance.now();
        return res;
      })
    ]);
    const { nodes, edges, rooms } = graphData;
    const activeRooms = apiRooms && apiRooms.length > 0 ? apiRooms : rooms;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // 3. Initialize Persistent Subsystems

    T4 = performance.now();
    await MapRenderer.init();
    T5 = performance.now();

    t_canvas_start = performance.now();
    MapRenderer.buildStaticWorldCache(nodes, edges, nodeMap, activeRooms);
    MapRenderer.buildStaticMinimapCache(nodes, edges);
    t_canvas_end = performance.now();

    await MovementSystem.init(nodes, edges, AppState.character || "boy");
    NavigationService.init(nodes, activeRooms);
    T6 = performance.now();

    // 4. Mobile Exploration Camera (Presentation-Only, Viewport-Preserving)
    const camera = {
      x: 0,
      y: 0,
      zoom: 18, // Comfortable exploration zoom — player and nearby rooms clearly visible
      isAutoFollowing: true
    };
    window.camera = camera;

    // Canonical Close Exploration Camera Scale (Requirement 1 & 2)
    const CLOSE_EXPLORATION_ZOOM = 27; // Canonical close exploration scale (~27 px/m)
    const OVERVIEW_ZOOM = 12;          // Auxiliary campus overview scale
    let explorationZoom = CLOSE_EXPLORATION_ZOOM;
    let targetZoom = CLOSE_EXPLORATION_ZOOM;
    let isOverviewMode = false;
    camera.zoom = CLOSE_EXPLORATION_ZOOM;

    // Directional Look-Ahead variables (Requirement 5)
    let currentLookAheadX = 0;
    let currentLookAheadY = 0;

    // Derive zone transition y from authoritative R_TOP node (top of south wing ring corridor)
    const rTopNode = nodes.find(n => n.id === 'R_TOP');
    const ZONE_SOUTH_Y = rTopNode ? rTopNode.y : 32.2; // Use graph data; fallback only if data is missing
    const TRANSITION_START_Y = ZONE_SOUTH_Y - 3.2; // ~29.0m (approaching R_TOP balcony)
    const TRANSITION_END_Y = ZONE_SOUTH_Y + 2.0;   // ~34.2m (entering south ring corridor)
    const BASE_EXPLORATION_ZOOM = 18;

    // Explicit Transition Finite State Machine (Requirement 16.1 - 16.5)
    const TRANSITION_FSM = {
      NORMAL: 'NORMAL',
      APPROACHING: 'APPROACHING',
      READY: 'READY',
      PLAYING: 'PLAYING',
      COMPLETE: 'COMPLETE'
    };

    let currentTransitionState = TRANSITION_FSM.NORMAL;
    let transitionDirection = 'SOUTH';
    let lastCrossedDirection = null; // 'SOUTH' | 'NORTH' | null (prevents jitter retriggering)
    let transitionStartTime = 0;
    const TRANSITION_DURATION = 1400; // ms (smooth 1.4s presentation duration)

    // Hysteresis spatial thresholds: resetRadius > triggerRadius (Requirement 16.5)
    const RESET_NORTH_Y = ZONE_SOUTH_Y - 3.5; // ~28.7m
    const RESET_SOUTH_Y = ZONE_SOUTH_Y + 3.5; // ~35.7m

    // Compatibility object for existing tests
    const transitionState = {
      get active() { return currentTransitionState === TRANSITION_FSM.PLAYING; },
      set active(v) { if (!v) currentTransitionState = TRANSITION_FSM.COMPLETE; },
      startTime: 0,
      duration: TRANSITION_DURATION,
      direction: 'SOUTH'
    };

    function startAuditoriumTransition(direction = 'SOUTH') {
      if (currentTransitionState === TRANSITION_FSM.PLAYING) return;
      currentTransitionState = TRANSITION_FSM.PLAYING;
      transitionStartTime = performance.now();
      transitionDirection = direction;
      transitionState.startTime = transitionStartTime;
      transitionState.direction = direction;
      setMapScene(MAP_SCENES.TRANSITION);

      // Requirement 16.10 OPTION A (preferred): Allow player to continue walking normally
      // MovementSystem.setInputEnabled is invoked to guarantee input remains enabled
      MovementSystem.setInputEnabled(true);
      camera.isAutoFollowing = true;
    }

    function completeAuditoriumTransition() {
      try {
        const targetScene = transitionDirection === 'SOUTH' ? MAP_SCENES.SOUTH : MAP_SCENES.NORTH;
        setMapScene(targetScene);
        lastCrossedDirection = transitionDirection;
        currentTransitionState = TRANSITION_FSM.COMPLETE;
      } finally {
        camera.isAutoFollowing = true;
        MovementSystem.setInputEnabled(true);
      }
    }

    function setOverviewMode(enable) {
      isOverviewMode = !!enable;
      if (isOverviewMode) {
        camera.isAutoFollowing = false;
        targetZoom = OVERVIEW_ZOOM;
        camera.zoom = OVERVIEW_ZOOM;
      } else {
        targetZoom = explorationZoom;
        camera.zoom = explorationZoom;
        camera.isAutoFollowing = true;
        recenterCamera();
      }
      const btnCam = document.getElementById("btn-camera-toggle");
      if (btnCam) {
        if (isOverviewMode) {
          btnCam.classList.remove("active");
          btnCam.setAttribute("aria-pressed", "false");
        } else {
          btnCam.classList.add("active");
          btnCam.setAttribute("aria-pressed", "true");
        }
      }
    }

    function toggleOverviewMode() {
      setOverviewMode(!isOverviewMode);
    }

    let currentDprOverride = null; // null | 1.0 | 1.5 | 2.0
    let isCameraInstant = true;    // Phase 5 Diagnostic default: instant camera follow

    function resizeCanvas() {
      if (!mapContainer || !canvas) return;
      const isMobile = (typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) ||
                       (typeof window !== "undefined" && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
      // Cap DPR: 1.5 on mobile devices (prevents 3x/4x GPU fill-rate throttling on high-DPI phones), 2.0 on desktop
      const maxDpr = isMobile ? 1.5 : 2.0;
      const systemDpr = Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, maxDpr);
      const dpr = currentDprOverride !== null ? currentDprOverride : systemDpr;
      const rect = mapContainer.getBoundingClientRect();
      const cssW = rect.width || mapContainer.clientWidth || 390;
      const cssH = rect.height || mapContainer.clientHeight || 844;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      camera.viewportWidth = cssW;
      camera.viewportHeight = cssH;


    }
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", resizeCanvas);
    resizeCanvas();



    function recenterCamera() {
      // Immediate snap to player in CSS coordinates
      camera.isAutoFollowing = true;
      isOverviewMode = false;
      targetZoom = explorationZoom;
      const playerPos = MovementSystem.getPlayerPos();
      const dpr = (canvas && canvas.width && canvas.style.width) ? (canvas.width / parseFloat(canvas.style.width)) : 1;
      const cssW = camera.viewportWidth || (canvas.width / dpr);
      const cssH = camera.viewportHeight || (canvas.height / dpr);
      camera.x = cssW / 2 - playerPos.x * camera.zoom;
      camera.y = cssH / 2 - playerPos.y * camera.zoom;
      currentLookAheadX = 0;
      currentLookAheadY = 0;

      const btnCam = document.getElementById("btn-camera-toggle");
      if (btnCam) {
        btnCam.classList.add("active");
        btnCam.setAttribute("aria-pressed", "true");
      }
    }
    recenterCamera();
    T7 = performance.now();

    function setExplorationZoom(newZoom) {
      explorationZoom = Math.max(8, Math.min(40, newZoom));
      targetZoom = explorationZoom;
      camera.zoom = explorationZoom;
    }

    // 5. Setup UI & Screen Manager
    const uiController = setupUI({
      rooms: activeRooms,
      nodesMap: nodeMap,
      camera,
      recenterCamera,
      setOverviewMode,
      toggleOverviewMode,
      isOverviewMode: () => isOverviewMode,
      setExplorationZoom,
      resizeCanvas
    });

    // 6. Manual Camera Panning & Tap-To-Navigate on Map Canvas
    let isPointerDown = false;
    let startPointer = { x: 0, y: 0 };
    let lastPointer = { x: 0, y: 0 };
    let hasDragged = false;

    canvas.addEventListener("pointerdown", (e) => {
      if (transitionState.active) {
        completeAuditoriumTransition();
        return;
      }
      isPointerDown = true;
      startPointer = { x: e.clientX, y: e.clientY };
      lastPointer = { x: e.clientX, y: e.clientY };
      hasDragged = false;
      canvas.setPointerCapture(e.pointerId);
    });

    window.addEventListener("keydown", (e) => {
      if (transitionState.active && (e.key === "Escape" || e.key === " " || e.key.startsWith("Arrow"))) {
        completeAuditoriumTransition();
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!isPointerDown) return;
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      lastPointer = { x: e.clientX, y: e.clientY };

      if (Math.hypot(e.clientX - startPointer.x, e.clientY - startPointer.y) > 6) {
        hasDragged = true;
        camera.isAutoFollowing = false;
        camera.x += dx;
        camera.y += dy;
      }
    });

    function endPointer(e) {
      if (!isPointerDown) return;
      isPointerDown = false;

      // If user tapped without dragging, check for door selection
      if (!hasDragged) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const worldX = (clickX - camera.x) / camera.zoom;
        const worldY = (clickY - camera.y) / camera.zoom;

        const hitDoor = nodes.find(n => n.type === "ROOM_DOOR" && Math.hypot(n.x - worldX, n.y - worldY) <= 1.2);
        if (hitDoor) {
          const room = activeRooms.find(r => r.doors && r.doors.some(d => d.node === hitDoor.id));
          if (room && !room.locked) {
            NavigationService.selectDestination(room.id, hitDoor.id);
            NavigationService.calculateAndStartRoute();
          }
        }
      }
    }

    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);

    // Wheel Zoom — consistent [8, 40] range matching HUD buttons
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = 1 - e.deltaY * 0.001;
      camera.zoom = Math.max(8, Math.min(40, camera.zoom * zoomFactor));
    }, { passive: false });

    const virtualJoystick = document.getElementById("virtual-joystick");
    const joystickBase = document.getElementById("joystick-base");
    const joystickKnob = document.getElementById("joystick-knob");
    let isJoystickActive = false;
    let joystickCenter = { x: 0, y: 0 };
    const maxJoystickRadius = 30; // px

    // Mutable input state consumed by the authoritative RAF loop (Phase 4)
    const touchInputState = {
      active: false,
      rawDx: 0,
      rawDy: 0,
      touchTimestamp: 0
    };

    function updateJoystickCenter() {
      const target = joystickBase || virtualJoystick;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    if (joystickBase && joystickKnob) {
      updateJoystickCenter();
      window.addEventListener("resize", updateJoystickCenter);

      let activeTouchId = null;
      let activePointerId = null;

      function handleJoystickStart(clientX, clientY) {
        if (MovementSystem.isSimulating && MovementSystem.isSimulating()) {
          MovementSystem.stopSimulation();
          if (NavigationService.setNavMode) NavigationService.setNavMode("manual");
        }
        isJoystickActive = true;
        if (virtualJoystick) virtualJoystick.classList.add("active");
        updateJoystickCenter();
        touchInputState.active = true;
        touchInputState.rawDx = clientX - joystickCenter.x;
        touchInputState.rawDy = clientY - joystickCenter.y;
        touchInputState.touchTimestamp = performance.now();
      }

      function handleJoystickMove(clientX, clientY) {
        if (!isJoystickActive) return;
        touchInputState.rawDx = clientX - joystickCenter.x;
        touchInputState.rawDy = clientY - joystickCenter.y;
        touchInputState.touchTimestamp = performance.now();
      }

      function handleJoystickEnd() {
        if (!isJoystickActive) return;
        isJoystickActive = false;
        activeTouchId = null;
        activePointerId = null;
        if (virtualJoystick) virtualJoystick.classList.remove("active");
        touchInputState.active = false;
        touchInputState.rawDx = 0;
        touchInputState.rawDy = 0;
        touchInputState.touchTimestamp = performance.now();
      }

      // Pointer event listeners (desktop & pointer-first Android)
      function startJoystickPointer(e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        activePointerId = e.pointerId;
        try { (e.currentTarget || joystickBase).setPointerCapture(e.pointerId); } catch (err) {}
        handleJoystickStart(e.clientX, e.clientY);
      }

      function updateJoystickPointer(e) {
        if (!isJoystickActive) return;
        if (activePointerId !== null && e.pointerId !== activePointerId) return;
        handleJoystickMove(e.clientX, e.clientY);
      }

      function endJoystickPointer(e) {
        if (!isJoystickActive) return;
        if (activePointerId !== null && e.pointerId !== activePointerId) return;
        try { (e.currentTarget || joystickBase).releasePointerCapture(e.pointerId); } catch (err) {}
        handleJoystickEnd();
      }

      // Native Touch event listeners (guarantees rock-solid physical Android response)
      function startJoystickTouch(e) {
        if (e.changedTouches && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          activeTouchId = t.identifier;
          handleJoystickStart(t.clientX, t.clientY);
        }
      }

      function updateJoystickTouch(e) {
        if (!isJoystickActive) return;
        if (e.touches && e.touches.length > 0) {
          let touch = null;
          if (activeTouchId !== null) {
            for (let i = 0; i < e.touches.length; i++) {
              if (e.touches[i].identifier === activeTouchId) {
                touch = e.touches[i];
                break;
              }
            }
          }
          if (!touch) touch = e.touches[0];
          handleJoystickMove(touch.clientX, touch.clientY);
        }
      }

      function endJoystickTouch(e) {
        if (activeTouchId !== null && e.changedTouches) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouchId) {
              handleJoystickEnd();
              return;
            }
          }
        } else {
          handleJoystickEnd();
        }
      }

      const joystickTargets = [joystickBase, virtualJoystick].filter(Boolean);
      joystickTargets.forEach(el => {
        const diagEvents = ["pointerdown", "pointerup", "touchstart", "touchend"];
        diagEvents.forEach(t => {
          el.addEventListener(t, (e) => {
            const clientX = e.clientX !== undefined ? Math.round(e.clientX) : (e.touches && e.touches[0] ? Math.round(e.touches[0].clientX) : null);
            const clientY = e.clientY !== undefined ? Math.round(e.clientY) : (e.touches && e.touches[0] ? Math.round(e.touches[0].clientY) : null);
            const entry = {
              id: el.id || "joystick",
              type: e.type,
              clientX,
              clientY,
              defaultPrevented: e.defaultPrevented,
              target: e.target ? (e.target.id || e.target.tagName) : null,
              currentTarget: e.currentTarget ? (e.currentTarget.id || e.currentTarget.tagName) : null
            };
            if (typeof window !== "undefined" && window.__touchLog) window.__touchLog.push(entry);
            console.log(`[TOUCH] ${entry.id} ${entry.type} (${clientX}, ${clientY}) defPrev:${entry.defaultPrevented} target:${entry.target}`);
          }, { passive: true, capture: true });
        });

        el.addEventListener("pointerdown", startJoystickPointer);
        el.addEventListener("pointermove", updateJoystickPointer);
        el.addEventListener("pointerup", endJoystickPointer);
        el.addEventListener("pointercancel", endJoystickPointer);

        el.addEventListener("touchstart", startJoystickTouch, { passive: true });
        el.addEventListener("touchmove", updateJoystickTouch, { passive: true });
        el.addEventListener("touchend", endJoystickTouch, { passive: true });
        el.addEventListener("touchcancel", endJoystickTouch, { passive: true });
      });

      // Window-level listeners ensure smooth dragging even if finger slides outside the joystick element
      window.addEventListener("pointermove", updateJoystickPointer);
      window.addEventListener("pointerup", endJoystickPointer);
      window.addEventListener("pointercancel", endJoystickPointer);
      window.addEventListener("touchmove", updateJoystickTouch, { passive: true });
      window.addEventListener("touchend", endJoystickTouch, { passive: true });
      window.addEventListener("touchcancel", endJoystickTouch, { passive: true });
    }

    // Auto-re-engage camera following whenever player initiates movement
    MovementSystem.onPlayerMove(() => {
      camera.isAutoFollowing = true;
    });

    // Minimap Hide / Show Toggle System (Phase 25 Mobile Ergonomics)
    const minimapToggleBtn = document.getElementById("btn-minimap-toggle");
    const minimapContainer = document.getElementById("minimap-container");
    const minimapToggleText = document.getElementById("minimap-toggle-text");

    function updateMinimapState(isHidden) {
      if (!minimapContainer) return;
      if (isHidden) {
        minimapContainer.classList.add("is-minimized");
        if (minimapToggleText) minimapToggleText.textContent = "MAP";
        if (minimapToggleBtn) minimapToggleBtn.setAttribute("aria-label", "Show Minimap");
        try { sessionStorage.setItem("minimap_hidden", "true"); } catch (e) {}
      } else {
        minimapContainer.classList.remove("is-minimized");
        if (minimapToggleText) minimapToggleText.textContent = "HIDE";
        if (minimapToggleBtn) minimapToggleBtn.setAttribute("aria-label", "Hide Minimap");
        try { sessionStorage.setItem("minimap_hidden", "false"); } catch (e) {}
      }
    }

    if (minimapToggleBtn && minimapContainer) {
      minimapToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = !minimapContainer.classList.contains("is-minimized");
        updateMinimapState(isHidden);
      });

      try {
        if (sessionStorage.getItem("minimap_hidden") === "true") {
          updateMinimapState(true);
        }
      } catch (e) {}
    }

    // 7. Hide Loading State & Enter Initial Screen
    if (loadingIndicator) loadingIndicator.style.display = "none";
    if (appViewport) appViewport.style.display = "flex";
    resizeCanvas();

    // Start on WELCOME screen
    ScreenManager.navigateTo(SCREENS.WELCOME);
    T8 = performance.now();

    // Calculate network, image decode, JS, and canvas times
    const resourceEntries = (typeof performance !== "undefined" && performance.getEntriesByType) ? performance.getEntriesByType("resource") : [];
    let totalNetworkTime = 0;
    let maxNetworkDuration = 0;
    resourceEntries.forEach(entry => {
      const netDuration = entry.responseEnd - entry.startTime;
      if (netDuration > 0) totalNetworkTime += netDuration;
      if (entry.duration > maxNetworkDuration) maxNetworkDuration = entry.duration;
    });

    const canvasTime = t_canvas_end - t_canvas_start;
    const assetsTime = T5 - T4;
    const totalStartup = T8 - T0;
    const jsCpuTime = Math.max(0, totalStartup - assetsTime);

    const timingSummary = {
      T0_PageLoad: T0,
      T1_AppInit: T1,
      T2_RoomsLoaded: T2,
      T3_GraphLoaded: T3,
      T4_AssetsLoadStart: T4,
      T5_AssetsComplete: T5,
      T6_RendererInit: T6,
      T7_MapInit: T7,
      T8_HomeInteractive: T8,
      delta_T1_T0: (T1 - T0).toFixed(1),
      delta_T2_T1: (T2 - T1).toFixed(1),
      delta_T3_T2: (T3 - T2).toFixed(1),
      delta_T5_T4: (T5 - T4).toFixed(1),
      delta_T6_T5: (T6 - T5).toFixed(1),
      delta_T7_T6: (T7 - T6).toFixed(1),
      delta_T8_T0: (T8 - T0).toFixed(1),
      networkTimeEst: totalNetworkTime.toFixed(1),
      maxNetworkDuration: maxNetworkDuration.toFixed(1),
      assetsDuration: assetsTime.toFixed(1),
      canvasRenderTime: canvasTime.toFixed(1),
      jsCpuTimeEst: jsCpuTime.toFixed(1)
    };
    window.__startupTiming = timingSummary;

    console.log(`========================================================================
[STARTUP] PHYSICAL DEVICE LAUNCH BREAKDOWN:
  T1 - T0 (Page Load to App Init)   : ${timingSummary.delta_T1_T0} ms
  T2 - T1 (Rooms API Fetch)         : ${timingSummary.delta_T2_T1} ms
  T3 - T2 (Graph JSON Parse)        : ${timingSummary.delta_T3_T2} ms
  T5 - T4 (77 Image Assets Fetch)   : ${timingSummary.delta_T5_T4} ms
  T6 - T5 (Subsystems & Caches)     : ${timingSummary.delta_T6_T5} ms
  T7 - T6 (Camera & Map Geometry)   : ${timingSummary.delta_T7_T6} ms
  T8 - T0 (TOTAL TO INTERACTIVE)    : ${timingSummary.delta_T8_T0} ms
------------------------------------------------------------------------
SUBSYSTEM BREAKDOWN:
  - NETWORK TIME (Sum across assets): ${timingSummary.networkTimeEst} ms
  - ASSET PIPELINE TIME (T5 - T4)   : ${timingSummary.assetsDuration} ms
  - CANVAS / CACHE TIME             : ${timingSummary.canvasRenderTime} ms
  - JAVASCRIPT CPU TIME             : ${timingSummary.jsCpuTimeEst} ms
========================================================================`);

    // 8. Continuous Authoritative Production Game Loop (Phase 2 Canonical Loop)
    let lastTime = performance.now();
    let lastMinimapTime = 0;
    let lastMinimapX = -999;
    let lastMinimapY = -999;
    let lastMinimapScene = null;

    // Zone label elements — updated each frame from player position vs R_TOP y threshold
    const mapZoneTitle = document.getElementById('map-zone-title');
    const mapZoneText = document.getElementById('map-zone-text');

    function gameLoop(currentTime) {
      try {
        const frameStart = performance.now();
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

      // ==========================================
      // STEP 1. INPUT PHASE
      // ==========================================
      const t_input_start = performance.now();


      if (touchInputState.active) {
        const dx = touchInputState.rawDx;
        const dy = touchInputState.rawDy;
        const dist = Math.hypot(dx, dy);

        let clampedDx = dx;
        let clampedDy = dy;
        if (dist > maxJoystickRadius) {
          clampedDx = (dx / dist) * maxJoystickRadius;
          clampedDy = (dy / dist) * maxJoystickRadius;
        }

        if (joystickKnob) {
          joystickKnob.style.transform = `translate(${clampedDx}px, ${clampedDy}px)`;
        }

        const deadzone = 0.15;
        const normDist = Math.min(1.0, dist / maxJoystickRadius);
        if (normDist < deadzone) {
          MovementSystem.setVirtualDirection(0, 0);
        } else {
          const normX = clampedDx / maxJoystickRadius;
          const normY = clampedDy / maxJoystickRadius;
          MovementSystem.setVirtualDirection(normX, normY);
          camera.isAutoFollowing = true;
        }
      } else {
        MovementSystem.setVirtualDirection(0, 0);
        if (joystickKnob) {
          joystickKnob.style.transform = "translate(0px, 0px)";
        }
      }
      const t_input_end = performance.now();


      // ==========================================
      // STEP 2. UPDATE PHASE (Physics, FSM, Route Check)
      // ==========================================
      const t_update_start = performance.now();
      MovementSystem.update(deltaTime);
      const playerPos = MovementSystem.getPlayerPos();
      NavigationService.checkArrival(playerPos);

      // State-driven one-shot transition with hysteresis (Requirement 16.1 - 16.5)
      const y = playerPos.y;
      if (y < RESET_NORTH_Y) {
        if (lastCrossedDirection === 'NORTH' || lastCrossedDirection === 'SOUTH') {
          lastCrossedDirection = null;
        }
      } else if (y > RESET_SOUTH_Y) {
        if (lastCrossedDirection === 'SOUTH' || lastCrossedDirection === 'NORTH') {
          lastCrossedDirection = null;
        }
      }

      if (currentTransitionState === TRANSITION_FSM.PLAYING) {
        const elapsed = currentTime - transitionStartTime;
        if (elapsed >= TRANSITION_DURATION) {
          completeAuditoriumTransition();
        }
      } else {
        if (AppState.mapScene === MAP_SCENES.NORTH) {
          if (y >= ZONE_SOUTH_Y && lastCrossedDirection !== 'SOUTH') {
            startAuditoriumTransition('SOUTH');
          } else if (y >= ZONE_SOUTH_Y - 0.5 && y < ZONE_SOUTH_Y) {
            currentTransitionState = TRANSITION_FSM.READY;
          } else if (y >= TRANSITION_START_Y && y < ZONE_SOUTH_Y - 0.5) {
            currentTransitionState = TRANSITION_FSM.APPROACHING;
          } else {
            currentTransitionState = TRANSITION_FSM.NORMAL;
          }
        } else if (AppState.mapScene === MAP_SCENES.SOUTH) {
          if (y <= ZONE_SOUTH_Y && lastCrossedDirection !== 'SOUTH') {
            startAuditoriumTransition('NORTH');
          } else if (y > ZONE_SOUTH_Y && y <= ZONE_SOUTH_Y + 0.5) {
            currentTransitionState = TRANSITION_FSM.READY;
          } else if (y > ZONE_SOUTH_Y + 0.5 && y <= TRANSITION_END_Y) {
            currentTransitionState = TRANSITION_FSM.APPROACHING;
          } else {
            currentTransitionState = TRANSITION_FSM.NORMAL;
          }
        } else if (AppState.mapScene === MAP_SCENES.TRANSITION) {
          if (currentTransitionState !== TRANSITION_FSM.PLAYING) {
            completeAuditoriumTransition();
          }
        }
      }

      window.__transitionDebug = {
        transitionState: currentTransitionState,
        transitionTrigger: (currentTransitionState === TRANSITION_FSM.READY),
        transitionReset: (y < RESET_NORTH_Y || y > RESET_SOUTH_Y),
        transitionActive: (currentTransitionState === TRANSITION_FSM.PLAYING)
      };

      const t_update_end = performance.now();
      const updateDuration = t_update_end - t_update_start;


      // ==========================================
      // STEP 3. CAMERA PHASE
      // ==========================================
      const t_cam_start = performance.now();
      const dpr = (canvas && canvas.width && canvas.style.width) ? (canvas.width / parseFloat(canvas.style.width)) : 1;
      const cssW = camera.viewportWidth || (canvas.width / dpr);
      const cssH = camera.viewportHeight || (canvas.height / dpr);

      if (isOverviewMode) {
        camera.zoom += (OVERVIEW_ZOOM - camera.zoom) * 0.15;
        const targetCamX = cssW / 2 - 0 * camera.zoom;
        const targetCamY = cssH / 2 - 37.0 * camera.zoom;
        camera.x += (targetCamX - camera.x) * 0.15;
        camera.y += (targetCamY - camera.y) * 0.15;
      } else if (camera.isAutoFollowing) {
        let desiredZoom = explorationZoom;
        if (AppState.navigation && AppState.navigation.route && AppState.navigation.route.found) {
          desiredZoom = Math.max(24, Math.min(explorationZoom, 27));
        }

        if (isCameraInstant) {
          // Phase 5 Diagnostic Instant Mode: zero deadzone, zero lag
          camera.zoom = desiredZoom;
          const centerX = cssW / 2;
          const centerY = cssH / 2;
          const clampedWorldX = Math.max(-14.0, Math.min(14.0, playerPos.x));
          const clampedWorldY = Math.max(-2.0, Math.min(78.0, playerPos.y));
          camera.x = centerX - clampedWorldX * camera.zoom;
          camera.y = centerY - clampedWorldY * camera.zoom;
        } else {
          // Responsive Smooth Follow (tight 10px deadzone, snappy alpha)
          camera.zoom += (desiredZoom - camera.zoom) * 0.15;
          let targetLookX = 0;
          let targetLookY = 0;
          const animState = MovementSystem.getAnimationState();
          if (animState && animState.state === 'walking') {
            const dir = animState.direction;
            if (dir === 'up' || dir === 'back') targetLookY = -1.2;
            else if (dir === 'down' || dir === 'front') targetLookY = 1.2;
            else if (dir === 'left') targetLookX = -1.2;
            else if (dir === 'right') targetLookX = 1.2;
          }
          currentLookAheadX += (targetLookX - currentLookAheadX) * 0.1;
          currentLookAheadY += (targetLookY - currentLookAheadY) * 0.1;

          const targetWorldX = playerPos.x + currentLookAheadX;
          const targetWorldY = playerPos.y + currentLookAheadY;

          const screenX = targetWorldX * camera.zoom + camera.x;
          const screenY = targetWorldY * camera.zoom + camera.y;
          const centerX = cssW / 2;
          const centerY = cssH / 2;
          const diffX = screenX - centerX;
          const diffY = screenY - centerY;

          const deadZone = 10;
          const alpha = 0.25;

          if (Math.abs(diffX) > deadZone) {
            const excessX = diffX > 0 ? diffX - deadZone : diffX + deadZone;
            camera.x -= excessX * alpha;
          }
          if (Math.abs(diffY) > deadZone) {
            const excessY = diffY > 0 ? diffY - deadZone : diffY + deadZone;
            camera.y -= excessY * alpha;
          }

          const currentCenterWorldX = (centerX - camera.x) / camera.zoom;
          const currentCenterWorldY = (centerY - camera.y) / camera.zoom;
          const clampedWorldX = Math.max(-14.0, Math.min(14.0, currentCenterWorldX));
          const clampedWorldY = Math.max(-2.0, Math.min(78.0, currentCenterWorldY));
          camera.x = centerX - clampedWorldX * camera.zoom;
          camera.y = centerY - clampedWorldY * camera.zoom;
        }
      }
      const t_cam_end = performance.now();


      // ==========================================
      // STEP 4. ANIMATION PHASE
      // ==========================================
      const t_anim_start = performance.now();
      // Animation cycle stepped in MovementSystem.update
      const t_anim_end = performance.now();


      // ==========================================
      // STEP 5. RENDER PHASE (World, Minimap, DOM UI)
      // ==========================================
      const t_world_start = performance.now();
      renderCanvasMap(ctx, canvas, camera, {
        nodes,
        edges,
        nodeMap,
        rooms: activeRooms,
        currentRoute: AppState.navigation.route,
        activeDestination: AppState.navigation.activeDestination,
        isDebug: MovementSystem.isDebug(),
        cameraZoom: camera.zoom,
        mapScene: AppState.mapScene,
        drawPlayer: MovementSystem.drawPlayer,
        drawDebug: MovementSystem.drawDebug,
        playerPos
      });
      const t_world_end = performance.now();


      // Minimap Rendering (Cached + Throttled)
      const t_minimap_start = performance.now();
      const isMinimapHidden = minimapContainer && minimapContainer.classList.contains("is-minimized");
      if (minimapCtx && minimapCanvas && !isMinimapHidden) {
        camera.mainWidth = cssW;
        camera.mainHeight = cssH;
        renderMinimap(minimapCtx, minimapCanvas, camera, {
          nodes,
          edges,
          rooms: activeRooms,
          currentRoute: AppState.navigation.route,
          playerPos,
          mapScene: AppState.mapScene
        });
      }
      const t_minimap_end = performance.now();


      // DOM UI Zone Presentation
      const t_dom_start = performance.now();
      if (mapZoneText) {
        if (mapZoneTitle) mapZoneTitle.textContent = "CSE BLOCK • LEVEL 1";
        if (AppState.mapScene === MAP_SCENES.TRANSITION || (playerPos.y >= TRANSITION_START_Y && playerPos.y <= TRANSITION_END_Y)) {
          mapZoneText.textContent = "BALCONY OVERLOOK • R_TOP";
        } else if (AppState.mapScene === MAP_SCENES.SOUTH || playerPos.y > TRANSITION_END_Y) {
          mapZoneText.textContent = "SOUTH BLOCK • WAB 208–218 + 213";
        } else {
          mapZoneText.textContent = "NORTH BLOCK • WAB 202–207";
        }
      }
      if (minimapDestLegend) {
        const hasDest = !!(AppState.navigation.route && AppState.navigation.route.found);
        minimapDestLegend.style.display = hasDest ? "inline-flex" : "none";
      }
      const t_dom_end = performance.now();


      const frameEnd = performance.now();
      const totalFrameJS = frameEnd - frameStart;


      } catch (err) {
        console.error("[gameLoop exception]", err);
        window.__gameLoopError = String(err && err.stack ? err.stack : err);
      } finally {
        requestAnimationFrame(gameLoop);
      }
    }

    requestAnimationFrame(gameLoop);

    // Development & Test Bridge
    if (typeof window !== "undefined") {
      window.AppState = AppState;
      window.ScreenManager = ScreenManager;
      window.NavigationService = NavigationService;
      window.MovementSystem = MovementSystem;
      window.__navigator = {
        AppState,
        ScreenManager,
        NavigationService,
        MovementSystem,
        camera,
        mapScene: AppState.mapScene,
        getMapScene: () => AppState.mapScene,
        setMapScene,
        startTransition: () => startAuditoriumTransition('SOUTH'),
        completeTransition: completeAuditoriumTransition,
        getRoute: () => AppState.navigation.route,
        getDestination: () => AppState.navigation.activeDestination,
        getNavState: () => AppState.navigation.status,
        recenterCamera,
        setOverviewMode,
        toggleOverviewMode,
        isOverviewMode: () => isOverviewMode,
        getTransitionState: () => currentTransitionState,
        selectRoom: (roomId, doorId) => uiController.selectRoom(roomId, doorId),
        // Jump directly to map screen (for test harness / debug)
        jumpToMap: () => {
          ScreenManager.navigateTo(SCREENS.MAP);
        }
      };
    }
  } catch (err) {
    console.error("Failed to initialize CSE Block Navigator:", err);
    if (loadingIndicator) loadingIndicator.style.display = "none";
    if (errorBanner) {
      errorBanner.style.display = "block";
      errorBanner.textContent = `Error loading campus data: ${err.message}.`;
    }
  }
}

// Initialize on DOM load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
