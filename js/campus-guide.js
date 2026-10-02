/**
 * College Navigator — Campus Guide NPC (Phase 7)
 *
 * Implements the stationary Campus Guide at the main entrance foyer.
 * Handles:
 * - Sprite frame selection (front, back, left, right)
 * - Ground shadow & foot anchoring
 * - Dynamic player facing with hysteresis
 * - Proximity detection (2.0m interaction radius)
 * - Retro [E] TALK prompt
 * - Multi-step retro dialogue panel
 */

import { AppState } from "./state.js";
import { AudioManager } from "./audio-manager.js";

export const CampusGuide = (function() {
  const CONFIG = {
    id: "campus-guide",
    type: "guide",
    name: "Campus Guide",
    // Positioned at the entrance foyer junction right flank (walkable space on H0 -> W205 branch)
    x: 0.6,
    y: 1.1,
    interactionRadius: 2.0, // World metres
    attentionRadius: 4.5,   // World metres to start facing player
    spriteScale: 1.7 / 256, // 0.006640625 m/px (authoritative 1.70m standing height)
    cellWidth: 160,
    cellHeight: 260,
    pivotX: 80,
    anchorY: 257
  };

  const DIR_MAP = {
    front: 0,
    back: 1,
    left: 2,
    right: 3
  };

  const DIALOGUE_LINES = [
    "Welcome to the CSE Block!",
    "Use the map to find classrooms, labs and important locations.",
    "You can switch between Camera and Navigation modes at any time.",
    "You can also explore the building yourself. Navigation Challenges will be available soon!"
  ];

  let currentDirection = "front";
  let playerInRange = false;
  let dialogueOpen = false;
  let dialogueIndex = 0;

  let guideImage = null;
  let shadowImage = null;
  let getPlayerPosFn = null;
  let setInputEnabledFn = null;

  // DOM Elements
  let promptEl = null;
  let dialogueOverlayEl = null;
  let dialogueSpeechEl = null;
  let dialogueNextBtn = null;
  let dialogueNextLabel = null;
  let dialogueCloseBtn = null;
  let dialogueDotsContainer = null;

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`[CampusGuide] Could not load image: ${src}`);
        resolve(null);
      };
      img.src = src;
    });
  }

  function init(options = {}) {
    if (typeof options.getPlayerPos === "function") {
      getPlayerPosFn = options.getPlayerPos;
    }
    if (typeof options.setInputEnabled === "function") {
      setInputEnabledFn = options.setInputEnabled;
    }

    // Preload Guide NPC assets asynchronously without blocking UI initialization
    loadImage("assets/optimised/character/guide_idle.png").then(img => { guideImage = img; });
    loadImage("assets/optimised/character/character_shadow.png").then(img => { shadowImage = img; });

    // Cache DOM Elements
    promptEl = document.getElementById("npc-interaction-prompt");
    dialogueOverlayEl = document.getElementById("npc-dialogue-overlay");
    dialogueSpeechEl = document.getElementById("npc-dialogue-speech");
    dialogueNextBtn = document.getElementById("btn-dialogue-next");
    dialogueNextLabel = document.getElementById("dialogue-next-label");
    dialogueCloseBtn = document.getElementById("btn-dialogue-close");
    dialogueDotsContainer = document.getElementById("dialogue-page-dots");

    const promptBtn = document.getElementById("btn-npc-interact");
    if (promptBtn) {
      promptBtn.addEventListener("click", () => {
        if (playerInRange && !dialogueOpen) {
          openDialogue();
        }
      });
    }

    if (dialogueNextBtn) {
      dialogueNextBtn.addEventListener("click", advanceDialogue);
    }
    if (dialogueCloseBtn) {
      dialogueCloseBtn.addEventListener("click", closeDialogue);
    }

    // Tap on dialogue speech text also advances
    if (dialogueSpeechEl) {
      dialogueSpeechEl.addEventListener("click", advanceDialogue);
    }

    // Global Key Listener for [E], Space, Escape
    window.addEventListener("keydown", handleKeyDown);

    console.log("[CampusGuide] Initialized at world coordinates (0.6, 1.1)");
  }

  function handleKeyDown(e) {
    // Only respond when in Map screen
    if (AppState.screen !== "map") return;

    // Don't intercept if an input or textarea has focus
    const tag = document.activeElement ? document.activeElement.tagName : null;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === "e" || e.key === "E") {
      if (dialogueOpen) {
        e.preventDefault();
        advanceDialogue();
      } else if (playerInRange) {
        e.preventDefault();
        openDialogue();
      }
    } else if (e.key === "Escape" && dialogueOpen) {
      e.preventDefault();
      closeDialogue();
    } else if ((e.key === " " || e.key === "Enter") && dialogueOpen) {
      e.preventDefault();
      advanceDialogue();
    }
  }

  function update(playerPos, dt) {
    if (!playerPos || typeof playerPos.x !== "number" || typeof playerPos.y !== "number") {
      return;
    }

    // Hide if not on Map screen
    if (AppState.screen !== "map") {
      if (promptEl) promptEl.style.display = "none";
      if (dialogueOpen) closeDialogue();
      return;
    }

    const dx = playerPos.x - CONFIG.x;
    const dy = playerPos.y - CONFIG.y;
    const dist = Math.hypot(dx, dy);

    // 1. Facing Direction Logic (with 0.35m hysteresis to prevent fluttering)
    if (dist <= CONFIG.attentionRadius) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX > absY + 0.35) {
        currentDirection = dx > 0 ? "right" : "left";
      } else if (absY > absX + 0.35) {
        currentDirection = dy > 0 ? "front" : "back";
      }
    } else {
      currentDirection = "front"; // Default idle facing entrance
    }

    // 2. Proximity Detection (2.0m interaction range)
    const inRange = dist <= CONFIG.interactionRadius;
    if (inRange !== playerInRange) {
      playerInRange = inRange;
      if (promptEl) {
        promptEl.style.display = (playerInRange && !dialogueOpen) ? "flex" : "none";
      }
    }

    // Auto-close dialogue if player moves out of range
    if (!inRange && dialogueOpen) {
      closeDialogue();
    }
  }

  function draw(ctx, zoom) {
    // 1. Draw Drop Shadow
    if (shadowImage) {
      const sw = shadowImage.width * CONFIG.spriteScale;
      const sh = shadowImage.height * CONFIG.spriteScale;
      ctx.drawImage(
        shadowImage,
        CONFIG.x - sw / 2,
        CONFIG.y - sh / 2,
        sw,
        sh
      );
    }

    // 2. Draw Guide Character Sprite
    if (guideImage) {
      const col = DIR_MAP[currentDirection] ?? 0;
      const sx = col * CONFIG.cellWidth;
      const sy = 0;
      const sw = CONFIG.cellWidth;
      const sh = CONFIG.cellHeight;

      const renderW = sw * CONFIG.spriteScale;
      const renderH = sh * CONFIG.spriteScale;

      // Ground foot anchoring
      const drawX = CONFIG.x - (CONFIG.pivotX * CONFIG.spriteScale);
      const drawY = CONFIG.y - ((CONFIG.anchorY + 1) * CONFIG.spriteScale);

      ctx.drawImage(guideImage, sx, sy, sw, sh, drawX, drawY, renderW, renderH);
    }
  }

  function openDialogue() {
    dialogueOpen = true;
    dialogueIndex = 0;

    AudioManager.playSfx("talk");

    if (promptEl) promptEl.style.display = "none";
    if (dialogueOverlayEl) dialogueOverlayEl.style.display = "flex";

    // Pause player movement input
    if (typeof setInputEnabledFn === "function") {
      setInputEnabledFn(false);
    }

    renderDialogueStep();
  }

  function renderDialogueStep() {
    if (!dialogueSpeechEl) return;
    dialogueSpeechEl.textContent = DIALOGUE_LINES[dialogueIndex];

    const isLast = dialogueIndex === DIALOGUE_LINES.length - 1;
    if (dialogueNextLabel) {
      dialogueNextLabel.textContent = isLast ? "CLOSE" : "NEXT";
    }

    // Update dots indicator
    if (dialogueDotsContainer) {
      const dots = dialogueDotsContainer.querySelectorAll(".page-dot");
      dots.forEach((dot, idx) => {
        if (idx === dialogueIndex) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });
    }
  }

  function advanceDialogue() {
    if (!dialogueOpen) return;
    dialogueIndex++;
    if (dialogueIndex >= DIALOGUE_LINES.length) {
      closeDialogue();
    } else {
      AudioManager.playSfx("dialogue");
      renderDialogueStep();
    }
  }

  function closeDialogue() {
    dialogueOpen = false;
    if (dialogueOverlayEl) dialogueOverlayEl.style.display = "none";

    // Restore prompt if still in range
    if (promptEl && playerInRange && AppState.screen === "map") {
      promptEl.style.display = "flex";
    }

    // Restore player movement input
    if (typeof setInputEnabledFn === "function") {
      setInputEnabledFn(true);
    }
  }

  return {
    id: CONFIG.id,
    type: CONFIG.type,
    name: CONFIG.name,
    x: CONFIG.x,
    y: CONFIG.y,
    get direction() { return currentDirection; },
    get inRange() { return playerInRange; },
    get isDialogueOpen() { return dialogueOpen; },
    getState() {
      return {
        id: CONFIG.id,
        type: CONFIG.type,
        name: CONFIG.name,
        x: CONFIG.x,
        y: CONFIG.y,
        direction: currentDirection,
        inRange: playerInRange,
        isDialogueOpen: dialogueOpen,
        interactionRadius: CONFIG.interactionRadius
      };
    },
    getDistanceToPlayer() {
      const p = (typeof getPlayerPosFn === "function") ? getPlayerPosFn() : (AppState.playerPos || null);
      if (!p) return 999;
      return Math.hypot(p.x - CONFIG.x, p.y - CONFIG.y);
    },
    interact: openDialogue,
    init,
    update,
    draw,
    openDialogue,
    closeDialogue,
    advanceDialogue,
    CONFIG
  };
})();
