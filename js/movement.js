/**
 * College Navigator - Movement & Collision System
 * Phase 6: Production UI Integration & Character Selection
 * 
 * Authoritative single engine for:
 * - Pure world-coordinate physics (0.4m player radius, 1.2m corridor radius)
 * - Wall sliding collision on graph corridor geometry
 * - Decoupled pure evaluatePosition()
 * - Character sprite animation (4-direction idle & walk for both Boy and Girl)
 * - Input handling with locking support
 */

import {
  SPRITE_HEIGHT_METRES,
  WALK_FPS,
  PIXELS_PER_METRE_FOLLOW,
  metresPerSourcePixel,
  walkFrame,
  idleFrame,
  sourceRect,
  placement
} from "./sprite.js";

export const MovementSystem = (function() {
    // 256px standing height scales to 1.70m human height
    const CONFIG = {
        speed: 4.5,           // Metres per second
        corridorRadius: 1.2,  // Corridor radius tolerance in metres
        debug: false,         // Default: false in production
        spriteScale: 1.7 / 256 // 0.006640625 metres per source pixel
    };

    const DIR_MAP = {
        down: "front",
        up: "back",
        left: "left",
        right: "right",
        front: "front",
        back: "back"
    };

    let currentCharacter = "boy"; // "boy" | "girl"

    const player = {
        x: 0, y: 0,
        vx: 0, vy: 0,
        activeEdge: null,
        radius: 0.4, // Physical geometry remains strictly 0.4m
        animation: {
            state: 'idle',
            direction: 'down',
            frameIndex: 0,
            frameTimer: 0,
            frameRate: 8
        }
    };

    const input = {
        up: false, down: false, left: false, right: false
    };

    const virtualInput = { x: 0, y: 0 };
    const moveListeners = new Set();
    
    let inputEnabled = true;
    let hKeyPressed = false; // Keydown lock for debug toggle

    // Route Simulation State
    const simulation = {
        active: false,
        path: [],
        targetIndex: 1,
        speed: 4.2,
        onArrival: null
    };

    function startSimulation(path, onArrival, speed = 4.2) {
        if (!path || !Array.isArray(path) || path.length === 0) return;
        simulation.active = true;
        simulation.path = path;
        simulation.speed = speed;
        simulation.onArrival = onArrival;
        simulation.targetIndex = 1;

        // Position player at first path node
        player.x = path[0].x;
        player.y = path[0].y;
        const result = evaluatePosition(player.x, player.y);
        player.activeEdge = result.nearestSegment;
        updateDiagnostics(result);

        if (path.length <= 1) {
            stopSimulation();
            if (typeof onArrival === 'function') onArrival();
            return;
        }

        const dx = path[1].x - path[0].x;
        const dy = path[1].y - path[0].y;
        if (Math.abs(dx) >= Math.abs(dy)) {
            player.animation.direction = dx > 0 ? 'right' : 'left';
        } else {
            player.animation.direction = dy > 0 ? 'down' : 'up';
        }
        player.animation.state = 'walk';
    }

    function stopSimulation() {
        simulation.active = false;
        simulation.path = [];
        simulation.targetIndex = 1;
        simulation.onArrival = null;
        player.animation.state = 'idle';
        player.animation.frameIndex = 0;
    }

    function updateSimulation(dt) {
        if (!simulation.active || !simulation.path || simulation.targetIndex >= simulation.path.length) {
            stopSimulation();
            return;
        }

        const targetNode = simulation.path[simulation.targetIndex];
        const dx = targetNode.x - player.x;
        const dy = targetNode.y - player.y;
        const dist = Math.hypot(dx, dy);
        const step = simulation.speed * dt;

        const anim = player.animation;
        anim.state = 'walk';

        for (const cb of moveListeners) {
            try { cb({ x: player.x, y: player.y }); } catch (err) {}
        }

        if (Math.abs(dx) >= Math.abs(dy)) {
            anim.direction = dx > 0 ? 'right' : 'left';
        } else {
            anim.direction = dy > 0 ? 'down' : 'up';
        }

        anim.frameTimer += dt;
        if (anim.frameTimer >= 1 / anim.frameRate) {
            anim.frameTimer = 0;
            anim.frameIndex = (anim.frameIndex + 1) % 4;
        }

        if (dist <= step || dist < 0.05) {
            player.x = targetNode.x;
            player.y = targetNode.y;
            simulation.targetIndex++;

            const result = evaluatePosition(player.x, player.y);
            player.activeEdge = result.nearestSegment;
            updateDiagnostics(result);

            if (simulation.targetIndex >= simulation.path.length) {
                const onArr = simulation.onArrival;
                stopSimulation();
                player.animation.state = 'idle';
                player.animation.frameIndex = 0;
                if (typeof onArr === 'function') {
                    onArr();
                }
            }
        } else {
            player.x += (dx / dist) * step;
            player.y += (dy / dist) * step;

            const result = evaluatePosition(player.x, player.y);
            player.activeEdge = result.nearestSegment;
            updateDiagnostics(result);
        }
    }

    function setInputEnabled(enabled) {
        inputEnabled = !!enabled;
        if (!inputEnabled) {
            input.up = false;
            input.down = false;
            input.left = false;
            input.right = false;
            virtualInput.x = 0;
            virtualInput.y = 0;
            player.vx = 0;
            player.vy = 0;
            player.animation.state = 'idle';
        }
    }

    function setVirtualDirection(x, y) {
        if (!inputEnabled) {
            virtualInput.x = 0;
            virtualInput.y = 0;
            return;
        }
        virtualInput.x = Math.max(-1, Math.min(1, x || 0));
        virtualInput.y = Math.max(-1, Math.min(1, y || 0));
    }

    const diagnostics = {
        proposedX: 0, proposedY: 0,
        nearestEdgeId: 'None', distance: 0, valid: true
    };

    let traversableSegments = [];
    let worldNodes = new Map();

    // Asset Cache
    const assets = {
        framesData: null,
        images: {
            boy_idle: null,
            boy_walk: null,
            girl_idle: null,
            girl_walk: null,
            character_shadow: null
        }
    };

    function loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn(`[MovementSystem] Non-critical asset load warning: ${src}`);
                resolve(null);
            };
            img.src = src;
        });
    }

    async function init(nodes, edges, initialCharacter = "boy") {
        if (initialCharacter === "girl" || initialCharacter === "boy") {
            currentCharacter = initialCharacter;
        }

        // 1. Load Graph Data
        worldNodes.clear();
        nodes.forEach(n => worldNodes.set(n.id, n));
        traversableSegments = edges.reduce((acc, edge) => {
            const nodeA = worldNodes.get(edge.from);
            const nodeB = worldNodes.get(edge.to);
            if (nodeA && nodeB) {
                const isLocked = (nodeA.locked || nodeB.locked) || 
                                 (nodeA.id === 'W217_DOOR' || nodeB.id === 'W217_DOOR');
                if (!isLocked) {
                    acc.push({
                        id: `${edge.from}-${edge.to}`,
                        A: { x: nodeA.x, y: nodeA.y, id: nodeA.id },
                        B: { x: nodeB.x, y: nodeB.y, id: nodeB.id },
                        rawEdge: edge
                    });
                }
            }
            return acc;
        }, []);

        const entrance = worldNodes.get("ENTRANCE");
        if (entrance) {
            player.x = entrance.x;
            player.y = entrance.y;
        }

        const initialEval = evaluatePosition(player.x, player.y);
        player.activeEdge = initialEval.nearestSegment;
        updateDiagnostics(initialEval);

        // 2. Load Visual Assets (Both Boy and Girl atlases)
        try {
            const framesRes = await fetch('assets/optimised/character/character-frames.json');
            assets.framesData = await framesRes.json();
            
            const [bIdle, bWalk, gIdle, gWalk, shadow] = await Promise.all([
                loadImage('assets/optimised/character/boy_idle.png'),
                loadImage('assets/optimised/character/boy_walk.png'),
                loadImage('assets/optimised/character/girl_idle.png'),
                loadImage('assets/optimised/character/girl_walk.png'),
                loadImage('assets/optimised/character/character_shadow.png')
            ]);
            assets.images.boy_idle = bIdle;
            assets.images.boy_walk = bWalk;
            assets.images.girl_idle = gIdle;
            assets.images.girl_walk = gWalk;
            assets.images.character_shadow = shadow;
        } catch (error) {
            console.error("Asset loading error:", error);
        }

        bindInputs();
    }

    function bindInputs() {
        window.addEventListener('keydown', e => handleKey(e.key, true));
        window.addEventListener('keyup', e => handleKey(e.key, false));
    }

    function handleKey(key, isPressed) {
        // Do not process movement keys if user is currently typing in an input or textarea
        if (typeof document !== 'undefined' && document.activeElement) {
            const tag = document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) {
                return;
            }
        }

        key = key.toLowerCase();
        
        // Debug Toggle with keydown lock (remains active even if input is locked)
        if (key === 'h') {
            if (isPressed && !hKeyPressed) {
                CONFIG.debug = !CONFIG.debug;
                hKeyPressed = true;
            } else if (!isPressed) {
                hKeyPressed = false;
            }
        }

        if (!inputEnabled) return;

        if (key === 'w' || key === 'arrowup') input.up = isPressed;
        if (key === 's' || key === 'arrowdown') input.down = isPressed;
        if (key === 'a' || key === 'arrowleft') input.left = isPressed;
        if (key === 'd' || key === 'arrowright') input.right = isPressed;
    }

    function distancePointToSegment(Px, Py, Ax, Ay, Bx, By) {
        const dx = Bx - Ax;
        const dy = By - Ay;
        const segmentLenSq = dx * dx + dy * dy;
        
        if (segmentLenSq === 0) {
            return Math.hypot(Px - Ax, Py - Ay);
        }
        
        const t = Math.max(0, Math.min(1, ((Px - Ax) * dx + (Py - Ay) * dy) / segmentLenSq));
        const projX = Ax + t * dx;
        const projY = Ay + t * dy;
        
        return Math.hypot(Px - projX, Py - projY);
    }

    // Pure evaluation function - NEVER mutates player.activeEdge (Phase 8 Spatially-Relevant Collision)
    function evaluatePosition(targetX, targetY) {
        let minDistance = Infinity;
        let nearestSegment = null;

        // Spatially-relevant corridor segment prefiltering (4.5m search radius)
        const reach = 4.5;
        let testedCount = 0;
        for (let i = 0; i < traversableSegments.length; i++) {
            const seg = traversableSegments[i];
            const minX = Math.min(seg.A.x, seg.B.x) - reach;
            const maxX = Math.max(seg.A.x, seg.B.x) + reach;
            const minY = Math.min(seg.A.y, seg.B.y) - reach;
            const maxY = Math.max(seg.A.y, seg.B.y) + reach;

            if (targetX < minX || targetX > maxX || targetY < minY || targetY > maxY) {
                continue;
            }

            testedCount++;
            const d = distancePointToSegment(targetX, targetY, seg.A.x, seg.A.y, seg.B.x, seg.B.y);
            if (d < minDistance) {
                minDistance = d;
                nearestSegment = seg;
            }
        }

        // Fallback to full test only in the rare case that no segment was within reach
        if (!nearestSegment) {
            for (let i = 0; i < traversableSegments.length; i++) {
                const seg = traversableSegments[i];
                const d = distancePointToSegment(targetX, targetY, seg.A.x, seg.A.y, seg.B.x, seg.B.y);
                if (d < minDistance) {
                    minDistance = d;
                    nearestSegment = seg;
                }
            }
        }

        const valid = (minDistance + player.radius) <= CONFIG.corridorRadius;

        return {
            valid,
            distance: minDistance,
            nearestSegment,
            proposedX: targetX,
            proposedY: targetY
        };
    }

    function update(dt) {
        if (!dt || dt <= 0) return;

        // Route simulation mode
        if (simulation.active && simulation.path && simulation.path.length > 0) {
            const hasManualInput = input.left || input.right || input.up || input.down || virtualInput.x !== 0 || virtualInput.y !== 0;
            if (hasManualInput) {
                stopSimulation();
            } else {
                updateSimulation(dt);
                return;
            }
        }

        // 1. Process Input Vector
        let dirX = 0;
        let dirY = 0;
        if (input.left) dirX -= 1;
        if (input.right) dirX += 1;
        if (input.up) dirY -= 1;
        if (input.down) dirY += 1;

        if (virtualInput.x !== 0 || virtualInput.y !== 0) {
            dirX += virtualInput.x;
            dirY += virtualInput.y;
        }

        const magnitude = Math.hypot(dirX, dirY);
        const anim = player.animation;

        // 2. Update Direction & Animation State
        if (magnitude > 0) {
            anim.state = 'walk';
            for (const cb of moveListeners) {
                try { cb({ x: player.x, y: player.y }); } catch (err) {}
            }

            // Resolve 4 directions with strict diagonal resolution
            if (Math.abs(dirX) >= Math.abs(dirY)) {
                anim.direction = dirX > 0 ? 'right' : 'left';
            } else {
                anim.direction = dirY > 0 ? 'down' : 'up';
            }

            // Advance Walk Animation Cycle
            anim.frameTimer += dt;
            if (anim.frameTimer >= 1 / anim.frameRate) {
                anim.frameTimer = 0;
                anim.frameIndex = (anim.frameIndex + 1) % 4; // 4 walk frames
            }
        } else {
            anim.state = 'idle';
            anim.frameIndex = 0;
            anim.frameTimer = 0;
        }

        // 3. Update Physics & Movement
        if (magnitude > 0) {
            dirX /= magnitude;
            dirY /= magnitude;
            
            const proposedDx = dirX * CONFIG.speed * dt;
            const proposedDy = dirY * CONFIG.speed * dt;
            const targetX = player.x + proposedDx;
            const targetY = player.y + proposedDy;
            
            let result = evaluatePosition(targetX, targetY);
            if (result.valid) {
                applyMovement(targetX, targetY, result);
            } else {
                // Wall Sliding: evaluate X-only and Y-only components
                const resultX = evaluatePosition(targetX, player.y);
                if (resultX.valid) {
                    applyMovement(targetX, player.y, resultX);
                } else {
                    const resultY = evaluatePosition(player.x, targetY);
                    if (resultY.valid) {
                        applyMovement(player.x, targetY, resultY);
                    } else {
                        updateDiagnostics(result);
                    }
                }
            }
        }
    }

    function applyMovement(x, y, result) {
        player.x = x;
        player.y = y;
        player.activeEdge = result.nearestSegment;
        updateDiagnostics(result);
    }

    function updateDiagnostics(result) {
        diagnostics.valid = result.valid;
        diagnostics.nearestEdgeId = result.nearestSegment ? result.nearestSegment.id : 'None';
        diagnostics.distance = result.distance;
    }

    // Exact Frame Lookup against authoritative character-frames.json schema
    function getFrameData(state, direction, index) {
        if (!assets.framesData || !assets.framesData.atlases) return null;
        
        const atlasKey = `${currentCharacter}_${state}`;
        const meta = assets.framesData.atlases[atlasKey];
        if (!meta) return null;

        const dirKey = DIR_MAP[direction] || 'front';
        const dirIndex = meta.directionOrder.indexOf(dirKey);
        if (dirIndex === -1) return null;

        let col = 0;
        let row = 0;

        if (state === 'idle') {
            col = dirIndex;
            row = 0;
        } else {
            row = dirIndex;
            const framesCount = meta.framesPerDirection || meta.columns || 4;
            col = index % framesCount;
        }

        return {
            fx: col * meta.cellWidth,
            fy: row * meta.cellHeight,
            fw: meta.cellWidth,
            fh: meta.cellHeight,
            pivotX: meta.pivotX,
            anchorY: meta.anchorY
        };
    }

    function drawPlayer(ctx, zoom) {
        if (!assets.framesData) return;

        // 1. Draw Shadow
        if (assets.images.character_shadow) {
            const shadow = assets.images.character_shadow;
            const sWidth = shadow.width * CONFIG.spriteScale;
            const sHeight = shadow.height * CONFIG.spriteScale;
            ctx.drawImage(
                shadow, 
                player.x - (sWidth / 2), 
                player.y - (sHeight / 2),
                sWidth, 
                sHeight
            );
        }

        // 2. Draw Character Sprite (Boy or Girl)
        const anim = player.animation;
        const imgKey = `${currentCharacter}_${anim.state}`;
        const img = assets.images[imgKey];
        const frameData = getFrameData(anim.state, anim.direction, anim.frameIndex);

        if (frameData && img) {
            const renderW = frameData.fw * CONFIG.spriteScale;
            const renderH = frameData.fh * CONFIG.spriteScale;

            // Feet anchor using pivotX and anchorY from metadata
            const drawX = player.x - (frameData.pivotX * CONFIG.spriteScale);
            const drawY = player.y - ((frameData.anchorY + 1) * CONFIG.spriteScale);

            ctx.drawImage(img, frameData.fx, frameData.fy, frameData.fw, frameData.fh, drawX, drawY, renderW, renderH);
        } else {
            // Graceful fallback: draw player dot if sprite sheet is loading
            ctx.fillStyle = currentCharacter === 'girl' ? '#E8792D' : '#00A9E0';
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawDebug(ctx, zoom) {
        if (!CONFIG.debug) return;

        // Active Edge Highlight
        if (player.activeEdge) {
            ctx.beginPath();
            ctx.moveTo(player.activeEdge.A.x, player.activeEdge.A.y);
            ctx.lineTo(player.activeEdge.B.x, player.activeEdge.B.y);
            ctx.strokeStyle = "rgba(0, 229, 255, 0.8)"; // Cyan active edge
            ctx.lineWidth = 4 / zoom;
            ctx.stroke();
        }
        
        // Corridor Radius Hitbox
        ctx.beginPath();
        ctx.arc(player.x, player.y, CONFIG.corridorRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();

        // Player Core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    return {
        init,
        update,
        drawPlayer,
        drawDebug,
        evaluatePosition,
        setCharacter: (char) => {
            if (char === "boy" || char === "girl") {
                currentCharacter = char;
            }
        },
        getCharacter: () => currentCharacter,
        toggleDebug: () => { CONFIG.debug = !CONFIG.debug; },
        setDebug: (val) => { CONFIG.debug = !!val; },
        isDebug: () => CONFIG.debug,
        getPlayerPos: () => ({ x: player.x, y: player.y }),
        setPlayerPos: (x, y) => {
            player.x = x;
            player.y = y;
            const evalResult = evaluatePosition(player.x, player.y);
            player.activeEdge = evalResult.nearestSegment;
            updateDiagnostics(evalResult);
        },
        getDiagnostics: () => ({
            ...diagnostics,
            x: player.x,
            y: player.y,
            activeEdge: player.activeEdge ? player.activeEdge.id : 'None'
        }),
        setInputEnabled,
        isInputEnabled: () => inputEnabled,
        setVirtualDirection,
        getAnimationState: () => ({
            state: player.animation.state,
            direction: player.animation.direction,
            frameIndex: player.animation.frameIndex
        }),
        onPlayerMove: (cb) => {
            moveListeners.add(cb);
            return () => moveListeners.delete(cb);
        },
        startSimulation,
        stopSimulation,
        isSimulating: () => simulation.active,
        CONFIG
    };
})();

// Backward-compatible named exports for any legacy modules
export const setCharacter = (char) => MovementSystem.setCharacter(char);
export const getCharacter = () => MovementSystem.getCharacter();
export const preloadSprites = async () => {};
export const initPlayer = async () => {};
export const startPlayerAnimation = () => {};
export const cancelPlayerAnimation = () => {};
export const setCameraMode = () => {};
export const getCameraMode = () => "follow";

if (typeof window !== "undefined") {
    window.MovementSystem = MovementSystem;
}
