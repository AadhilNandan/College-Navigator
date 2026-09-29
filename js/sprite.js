/**
 * Pure functions for Character Sprite Mathematics and Geometry.
 * No DOM access. Exported for tests and rendering.
 */

export const SPRITE_HEIGHT_METRES = 1.7;
export const WALK_FPS = 8;
export const PIXELS_PER_METRE_FOLLOW = 56;

/**
 * Calculates scale factor 's' in metres per source pixel.
 * @param {number} standingHeight
 * @returns {number}
 */
export function metresPerSourcePixel(standingHeight) {
  return SPRITE_HEIGHT_METRES / standingHeight;
}

/**
 * Computes walk atlas frame coordinates based on direction and elapsed seconds.
 * @param {Object} meta
 * @param {string} direction
 * @param {number} elapsedSeconds
 * @returns {{atlas: string, row: number, col: number}}
 */
export function walkFrame(meta, direction, elapsedSeconds) {
  if (!meta || !meta.directionOrder) {
    throw new Error("Invalid metadata: missing directionOrder");
  }
  const row = meta.directionOrder.indexOf(direction);
  if (row === -1) {
    throw new Error(`Unknown direction: ${direction}`);
  }
  const framesPerDirection = meta.framesPerDirection || meta.columns || 4;
  const col = Math.floor(elapsedSeconds * WALK_FPS) % framesPerDirection;
  return {
    atlas: "walk",
    row,
    col
  };
}

/**
 * Computes idle atlas frame coordinates based on direction.
 * @param {Object} meta
 * @param {string} direction
 * @returns {{atlas: string, row: number, col: number}}
 */
export function idleFrame(meta, direction) {
  if (!meta || !meta.directionOrder) {
    throw new Error("Invalid metadata: missing directionOrder");
  }
  const col = meta.directionOrder.indexOf(direction);
  if (col === -1) {
    throw new Error(`Unknown direction: ${direction}`);
  }
  return {
    atlas: "idle",
    row: 0,
    col
  };
}

/**
 * Computes source bounding rectangle in sprite sheet pixel space.
 * @param {Object} meta
 * @param {number} col
 * @param {number} row
 * @returns {{x: number, y: number, w: number, h: number}}
 */
export function sourceRect(meta, col, row) {
  return {
    x: col * meta.cellWidth,
    y: row * meta.cellHeight,
    w: meta.cellWidth,
    h: meta.cellHeight
  };
}

/**
 * Computes top-left coordinate and dimensions in map units (metres) for the sprite.
 * @param {Object} meta
 * @param {number} feetX
 * @param {number} feetY
 * @param {number} s
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function placement(meta, feetX, feetY, s) {
  return {
    x: feetX - meta.pivotX * s,
    y: feetY - (meta.anchorY + 1) * s,
    width: meta.cellWidth * s,
    height: meta.cellHeight * s
  };
}
