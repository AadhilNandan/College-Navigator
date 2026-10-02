/**
 * College Navigator - Central Audio Manager (SFX & BGM)
 * Audio / Sound Effects & Background Music Architecture
 *
 * Provides a lightweight, robust, centralized audio system:
 * - Web Audio API with HTML5 Audio fallback for low-latency SFX
 * - HTML5 Audio streaming & seamless looping for background music (BGM)
 * - Browser autoplay unlocking on first user interaction (touch/click/key)
 * - Centralized master volume: SFX (0.40) & BGM (0.15 / 15%)
 * - Independent control for Sound Effects vs Background Music
 * - Syncs seamlessly with AppState settings & localStorage persistence
 * - Zero audio restarts across screen transitions
 * - Fail-safe promise rejection handling (audio failures never break gameplay)
 */

import { AppState, updateSettings, subscribe } from "./state.js";

// Canonical BGM track (Walk Across the Quad theme)
export const BGM_PATH = "assets/Music/bg_music.mp3";

// Canonical SFX mapping to lightweight assets in assets/audio/
export const SFX_MAP = {
  // 1. UI Button Click
  "click": "assets/audio/ui-click.wav",
  "ui-click": "assets/audio/ui-click.wav",

  // 2. Character Select
  "select": "assets/audio/character-select.wav",
  "character-select": "assets/audio/character-select.wav",

  // 3. Map Enter
  "map-enter": "assets/audio/map-enter.wav",
  "enter-map": "assets/audio/map-enter.wav",

  // 4. Back Button
  "back": "assets/audio/back.wav",

  // 5. Talk / Campus Guide
  "talk": "assets/audio/talk.wav",

  // 6. Dialogue Advance
  "dialogue": "assets/audio/dialogue.wav",

  // 7. Destination Selected
  "destination-selected": "assets/audio/destination-selected.wav",
  "destination-select": "assets/audio/destination-selected.wav",

  // 8. Destination Reached
  "destination-reached": "assets/audio/destination-reached.wav",
  "destination-arrive": "assets/audio/destination-reached.wav",

  // 9. UI / Settings Toggle
  "toggle": "assets/audio/toggle.wav"
};

class CentralAudioManager {
  constructor() {
    this._volume = 0.40; // Centralized SFX default volume (0.35 - 0.50 range)
    this._muted = false; // SFX mute state
    this._musicVolume = 0.15; // Centralized BGM default volume (~15%)
    this._musicMuted = false; // BGM mute state

    this._isUnlocked = false;
    this._ctx = null;
    this._buffers = new Map();
    this._loadingPromises = new Map();
    this._initialized = false;
    this._masterGain = null;

    // BGM Audio Element (Singleton)
    this._bgmAudio = null;
    this._bgmPlaying = false;

    // Read initial mute state if AppState is available
    if (AppState && AppState.settings) {
      if (typeof AppState.settings.sound === "boolean") {
        this._muted = !AppState.settings.sound;
      }
      if (typeof AppState.settings.music === "boolean") {
        this._musicMuted = !AppState.settings.music;
      }
    }
  }

  /**
   * Initializes the audio manager, binds unlock gestures, and synchronizes with AppState.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Check AppState setting or fallback to localStorage
    if (AppState && AppState.settings) {
      if (typeof AppState.settings.sound === "boolean") {
        this._muted = !AppState.settings.sound;
      }
      if (typeof AppState.settings.music === "boolean") {
        this._musicMuted = !AppState.settings.music;
      }
    } else if (typeof window !== "undefined" && window.localStorage) {
      try {
        const raw = localStorage.getItem("collegenav_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.sound === "boolean") {
            this._muted = !parsed.sound;
          }
          if (typeof parsed.music === "boolean") {
            this._musicMuted = !parsed.music;
          }
        }
      } catch (e) {
        // Ignore storage read errors
      }
    }

    // Subscribe to state settings updates if subscribe is available
    if (typeof subscribe === "function") {
      subscribe("settings", (settings) => {
        if (!settings) return;
        if (typeof settings.sound === "boolean") {
          this._muted = !settings.sound;
          if (this._masterGain && this._ctx) {
            try {
              this._masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this._ctx.currentTime);
            } catch {
              // Ignore gain scheduling error
            }
          }
        }
        if (typeof settings.music === "boolean") {
          const targetMuted = !settings.music;
          if (this._musicMuted !== targetMuted) {
            this.setMusicMuted(targetMuted);
          }
        }
      });
    }

    // Bind browser unlock listeners on first user gesture (desktop + mobile)
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const unlockEvents = ["click", "keydown", "touchstart", "touchend", "pointerdown", "mousedown"];
      const onFirstInteraction = () => {
        this.unlock();
        unlockEvents.forEach(evt => document.removeEventListener(evt, onFirstInteraction, true));
      };
      unlockEvents.forEach(evt => document.addEventListener(evt, onFirstInteraction, { capture: true, once: true }));
    }
  }

  /**
   * Unlocks AudioContext and initializes BGM following user gesture.
   */
  unlock() {
    if (typeof window === "undefined") return;
    this._isUnlocked = true;

    if (!this._ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          this._ctx = new AudioContextClass();
          this._masterGain = this._ctx.createGain();
          this._masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this._ctx.currentTime);
          this._masterGain.connect(this._ctx.destination);
        } catch (err) {
          console.warn("[AudioManager] Failed to create AudioContext:", err);
        }
      }
    }

    if (this._ctx && this._ctx.state === "suspended") {
      this._ctx.resume().catch(() => {
        // Will resume on next user gesture in restricted environments
      });
    }

    // Start background music on first interaction if enabled
    if (!this._musicMuted) {
      this.startBgm();
    }

    // Preload SFX assets in the background
    this._preloadAll();
  }

  // ==========================================================================
  // BACKGROUND MUSIC (BGM) SUBSYSTEM
  // ==========================================================================

  /**
   * Ensures singleton HTML5 Audio element for BGM exists and is configured.
   * @private
   * @returns {HTMLAudioElement|null}
   */
  _ensureBgmAudio() {
    if (typeof Audio === "undefined") return null;
    if (!this._bgmAudio) {
      try {
        const audio = new Audio(BGM_PATH);
        audio.loop = true;
        audio.preload = "auto";
        audio.volume = this._musicMuted ? 0 : this._musicVolume;

        audio.addEventListener("playing", () => {
          this._bgmPlaying = true;
        });
        audio.addEventListener("pause", () => {
          this._bgmPlaying = false;
        });
        audio.addEventListener("ended", () => {
          // Continuous loop guarantee across all browser implementations
          if (!this._musicMuted) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
        });
        audio.addEventListener("error", (e) => {
          console.warn("[AudioManager] BGM audio element error:", e);
        });

        this._bgmAudio = audio;
      } catch (err) {
        console.warn("[AudioManager] Could not create BGM audio element:", err);
      }
    }
    return this._bgmAudio;
  }

  /**
   * Starts or resumes BGM playback.
   * Safe to call anywhere; will not restart if already playing.
   * @returns {Promise<boolean>}
   */
  async startBgm() {
    if (this._musicMuted) return false;
    const audio = this._ensureBgmAudio();
    if (!audio) return false;

    // Prevent duplicate audio instances or redundant restarts
    if (this._bgmPlaying && !audio.paused) {
      return true;
    }

    try {
      audio.volume = this._musicVolume;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        await playPromise.catch((err) => {
          // Autoplay policy: safely handle without uncaught exceptions
          console.warn("[AudioManager] BGM autoplay deferred until user interaction:", err.message || err);
          return false;
        });
      }
      this._bgmPlaying = !audio.paused;
      return this._bgmPlaying;
    } catch (err) {
      console.warn("[AudioManager] startBgm failed safely:", err);
      return false;
    }
  }

  /**
   * Pauses BGM playback without resetting playback position.
   */
  pauseBgm() {
    if (this._bgmAudio && !this._bgmAudio.paused) {
      try {
        this._bgmAudio.pause();
      } catch (err) {
        console.warn("[AudioManager] pauseBgm failed safely:", err);
      }
    }
    this._bgmPlaying = false;
  }

  /**
   * Stops BGM playback and resets track position to beginning.
   */
  stopBgm() {
    if (this._bgmAudio) {
      try {
        this._bgmAudio.pause();
        this._bgmAudio.currentTime = 0;
      } catch (err) {
        console.warn("[AudioManager] stopBgm failed safely:", err);
      }
    }
    this._bgmPlaying = false;
  }

  /**
   * Sets BGM music volume (~15% default).
   * @param {number} volume - Float between 0.0 and 1.0
   */
  setMusicVolume(volume) {
    if (typeof volume === "number" && !isNaN(volume)) {
      this._musicVolume = Math.max(0, Math.min(1, volume));
      if (this._bgmAudio && !this._musicMuted) {
        this._bgmAudio.volume = this._musicVolume;
      }
    }
  }

  /**
   * Returns current BGM volume.
   * @returns {number}
   */
  getMusicVolume() {
    return this._musicVolume;
  }

  /**
   * Sets music mute/disabled state and synchronizes with AppState and audio element.
   * @param {boolean} muted
   */
  setMusicMuted(muted) {
    this._musicMuted = Boolean(muted);

    // Keep AppState synchronized
    if (AppState && AppState.settings && AppState.settings.music !== !this._musicMuted) {
      if (typeof updateSettings === "function") {
        updateSettings({ music: !this._musicMuted });
      }
    }

    if (this._bgmAudio) {
      if (this._musicMuted) {
        this.pauseBgm();
      } else {
        this._bgmAudio.volume = this._musicVolume;
        if (this._isUnlocked) {
          this.startBgm();
        }
      }
    } else if (!this._musicMuted && this._isUnlocked) {
      this.startBgm();
    }
  }

  /**
   * Returns whether background music is currently muted/disabled.
   * @returns {boolean}
   */
  isMusicMuted() {
    return this._musicMuted;
  }

  /**
   * Returns whether background music is currently enabled.
   * @returns {boolean}
   */
  isMusicEnabled() {
    return !this._musicMuted;
  }

  /**
   * Toggles background music on/off.
   * @returns {boolean} New enabled state
   */
  toggleMusic() {
    this.setMusicMuted(!this._musicMuted);
    return !this._musicMuted;
  }

  /**
   * Returns the underlying BGM audio element for inspection and verification.
   * @returns {HTMLAudioElement|null}
   */
  getBgmAudio() {
    return this._ensureBgmAudio();
  }

  // ==========================================================================
  // SOUND EFFECTS (SFX) SUBSYSTEM
  // ==========================================================================

  /**
   * Preloads an audio buffer via Web Audio API.
   * @private
   * @param {string} url
   * @returns {Promise<AudioBuffer|null>}
   */
  async _loadBuffer(url) {
    if (this._buffers.has(url)) {
      return this._buffers.get(url);
    }
    if (this._loadingPromises.has(url)) {
      return this._loadingPromises.get(url);
    }
    if (!this._ctx || typeof fetch === "undefined") {
      return null;
    }

    const promise = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuf = await res.arrayBuffer();
        const audioBuf = await this._ctx.decodeAudioData(arrayBuf);
        this._buffers.set(url, audioBuf);
        return audioBuf;
      } catch (err) {
        console.warn(`[AudioManager] Failed to load audio buffer "${url}":`, err.message || err);
        return null;
      } finally {
        this._loadingPromises.delete(url);
      }
    })();

    this._loadingPromises.set(url, promise);
    return promise;
  }

  _preloadAll() {
    if (!this._ctx || typeof fetch === "undefined") return;
    const uniquePaths = new Set(Object.values(SFX_MAP));
    uniquePaths.forEach(path => this._loadBuffer(path));
  }

  /**
   * Plays a sound effect by its identifier.
   * Safe to call anywhere; will never throw or crash gameplay.
   * @param {string} soundId
   * @param {Object} [options]
   * @param {number} [options.volume] - Relative volume multiplier (0.0 to 1.0)
   * @returns {Promise<boolean>}
   */
  async playSfx(soundId, options = {}) {
    if (this._muted) return false;

    const path = SFX_MAP[soundId];
    if (!path) {
      console.warn(`[AudioManager] Unknown SFX requested: "${soundId}"`);
      return false;
    }

    // Ensure audio context is ready if user has interacted
    if (!this._isUnlocked && typeof window !== "undefined") {
      this.unlock();
    }

    const relVol = typeof options.volume === "number" ? Math.max(0, Math.min(1, options.volume)) : 1.0;
    const finalVolume = this._volume * relVol;

    // 1. Try Web Audio API path (low-latency predecoded buffer)
    if (this._ctx && this._ctx.state === "running") {
      try {
        let buffer = this._buffers.get(path);
        if (!buffer) {
          buffer = await this._loadBuffer(path);
        }
        if (buffer) {
          const source = this._ctx.createBufferSource();
          source.buffer = buffer;

          const gain = this._ctx.createGain();
          gain.gain.setValueAtTime(finalVolume, this._ctx.currentTime);

          source.connect(gain);
          gain.connect(this._masterGain || this._ctx.destination);
          source.start(0);
          return true;
        }
      } catch (err) {
        console.warn(`[AudioManager] Web Audio playback error for "${soundId}":`, err);
      }
    }

    // 2. Fallback to standard HTML5 Audio element
    if (typeof Audio !== "undefined") {
      try {
        const audio = new Audio(path);
        audio.volume = Math.max(0, Math.min(1, finalVolume));
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(err => {
            // Autoplay policy or media load notice: safely handle without console exception
            console.warn(`[AudioManager] HTMLAudio playback notice for "${soundId}":`, err.message || err);
          });
        }
        return true;
      } catch (err) {
        console.warn(`[AudioManager] HTMLAudio instance creation failed for "${soundId}":`, err);
      }
    }

    return false;
  }

  /**
   * Sets master SFX volume.
   * @param {number} volume - Volume between 0.0 and 1.0
   */
  setVolume(volume) {
    if (typeof volume === "number" && !isNaN(volume)) {
      this._volume = Math.max(0, Math.min(1, volume));
      if (this._masterGain && this._ctx && !this._muted) {
        try {
          this._masterGain.gain.setValueAtTime(this._volume, this._ctx.currentTime);
        } catch {
          // Ignore gain scheduling error
        }
      }
    }
  }

  /**
   * Gets current master SFX volume.
   * @returns {number}
   */
  getVolume() {
    return this._volume;
  }

  /**
   * Sets the SFX mute state.
   * @param {boolean} muted
   */
  setMuted(muted) {
    this._muted = Boolean(muted);

    // Keep AppState synchronized
    if (AppState && AppState.settings && AppState.settings.sound !== !this._muted) {
      if (typeof updateSettings === "function") {
        updateSettings({ sound: !this._muted });
      }
    }

    if (this._masterGain && this._ctx) {
      try {
        this._masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this._ctx.currentTime);
      } catch {
        // Ignore gain scheduling error
      }
    }
  }

  /**
   * Returns whether SFX audio is currently muted.
   * @returns {boolean}
   */
  isMuted() {
    return this._muted;
  }

  /**
   * Toggles the SFX mute state and returns the new muted state.
   * @returns {boolean}
   */
  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  /**
   * Returns list of supported SFX keys.
   * @returns {string[]}
   */
  getAvailableSfx() {
    return Object.keys(SFX_MAP);
  }
}

// Global Singleton Instance
export const AudioManager = new CentralAudioManager();

// Automatically self-initialize if running in browser
if (typeof window !== "undefined") {
  window.AudioManager = AudioManager;
  AudioManager.init();
}

// Convenience exports matching requested API
export const playSfx = (id, options) => AudioManager.playSfx(id, options);
export const playBgm = () => AudioManager.startBgm();
export const pauseBgm = () => AudioManager.pauseBgm();
export const stopBgm = () => AudioManager.stopBgm();
