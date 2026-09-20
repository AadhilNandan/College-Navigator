/**
 * Player Movement Engine for CSE Block Navigator.
 * Animates a placeholder player marker along the route using API directions.
 */

export const ANIMATION_METRES_PER_SECOND = 16;

/**
 * Builds segment descriptors from path coordinates and API directions.
 * Directions are taken directly from the API (NOT computed in JS).
 * lengthInSvgUnits is calculated for animation pacing only.
 *
 * @param {Array<{id: string, x: number, y: number}>} path
 * @param {string[]} directions
 * @returns {Array<{from: Object, to: Object, direction: string, lengthInSvgUnits: number}>}
 */
export function buildSegments(path, directions) {
  if (!path || path.length < 2) return [];

  const segments = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const direction = directions && directions[i] ? directions[i] : "front";
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthInSvgUnits = Math.sqrt(dx * dx + dy * dy);

    segments.push({
      from,
      to,
      direction,
      lengthInSvgUnits
    });
  }
  return segments;
}

let activeAnimFrameId = null;

export function cancelPlayerAnimation(svg) {
  if (activeAnimFrameId !== null) {
    cancelAnimationFrame(activeAnimFrameId);
    activeAnimFrameId = null;
  }
  if (svg) {
    const existing = svg.querySelector("#player-marker");
    if (existing) existing.remove();
  }
}

function getPointerPoints(direction) {
  switch (direction) {
    case "back": // North, -y
      return "0,-0.65 -0.22,-0.15 0.22,-0.15";
    case "left": // West, -x
      return "-0.65,0 -0.15,-0.22 -0.15,0.22";
    case "right": // East, +x
      return "0.65,0 0.15,-0.22 0.15,0.22";
    case "front": // South, +y
    default:
      return "0,0.65 -0.22,0.15 0.22,0.15";
  }
}

function createPlayerMarker(svg) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("id", "player-marker");
  g.setAttribute("class", "player-marker");

  // Navy circle body
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "0");
  circle.setAttribute("cy", "0");
  circle.setAttribute("r", "0.5");
  circle.setAttribute("fill", "var(--navy)");
  circle.setAttribute("stroke", "var(--gold)");
  circle.setAttribute("stroke-width", "0.15");
  g.appendChild(circle);

  // Direction pointer triangle
  const pointer = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  pointer.setAttribute("id", "player-pointer");
  pointer.setAttribute("points", getPointerPoints("front"));
  pointer.setAttribute("fill", "var(--gold)");
  g.appendChild(pointer);

  svg.appendChild(g);
  return { g, pointer };
}

function scrollMapToPoint(mapContainer, svg, y) {
  if (!mapContainer || !svg) return;
  const vb = svg.viewBox.baseVal;
  if (!vb || vb.height <= 0) return;

  const pctY = (y - vb.y) / vb.height;
  const targetScroll = pctY * mapContainer.scrollHeight - mapContainer.clientHeight / 2;
  mapContainer.scrollTop = targetScroll;
}

/**
 * Starts animating the player marker from ENTRANCE along the path.
 */
export function startPlayerAnimation({
  svg,
  path,
  directions,
  mapContainer,
  onArrival,
  skipAnimation = false
}) {
  cancelPlayerAnimation(svg);

  if (!path || path.length === 0) return;

  const { g: markerG, pointer } = createPlayerMarker(svg);
  const segments = buildSegments(path, directions);

  const finalNode = path[path.length - 1];
  const initialDirection = directions && directions[0] ? directions[0] : "front";

  const prefersReduced =
    skipAnimation ||
    (typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  if (prefersReduced || segments.length === 0) {
    // Jump straight to arrival
    const finalDir =
      directions && directions.length > 0 ? directions[directions.length - 1] : initialDirection;
    markerG.setAttribute("transform", `translate(${finalNode.x}, ${finalNode.y})`);
    pointer.setAttribute("points", getPointerPoints(finalDir));
    markerG.classList.add("idle");
    scrollMapToPoint(mapContainer, svg, finalNode.y);
    if (typeof onArrival === "function") {
      onArrival();
    }
    return;
  }

  let currentSegmentIndex = 0;
  let segmentStartTime = performance.now();

  function step(timestamp) {
    const seg = segments[currentSegmentIndex];
    if (!seg) {
      // Reached destination
      markerG.classList.add("idle");
      scrollMapToPoint(mapContainer, svg, finalNode.y);
      if (typeof onArrival === "function") {
        onArrival();
      }
      activeAnimFrameId = null;
      return;
    }

    const elapsedSec = (timestamp - segmentStartTime) / 1000;
    const durationSec = seg.lengthInSvgUnits / ANIMATION_METRES_PER_SECOND;
    const progress = durationSec <= 0 ? 1 : Math.min(elapsedSec / durationSec, 1);

    const curX = seg.from.x + progress * (seg.to.x - seg.from.x);
    const curY = seg.from.y + progress * (seg.to.y - seg.from.y);

    markerG.setAttribute("transform", `translate(${curX}, ${curY})`);
    pointer.setAttribute("points", getPointerPoints(seg.direction));
    scrollMapToPoint(mapContainer, svg, curY);

    if (progress >= 1) {
      currentSegmentIndex++;
      segmentStartTime = timestamp;
    }

    activeAnimFrameId = requestAnimationFrame(step);
  }

  // Set initial position at start node
  markerG.setAttribute("transform", `translate(${path[0].x}, ${path[0].y})`);
  pointer.setAttribute("points", getPointerPoints(initialDirection));
  scrollMapToPoint(mapContainer, svg, path[0].y);

  activeAnimFrameId = requestAnimationFrame(step);
}
