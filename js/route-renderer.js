/**
 * Route Renderer for CSE Block Navigator.
 * Draws SVG route polyline in JEC orange and destination marker on top of the map.
 */

export function clearRoute(svg) {
  const routeLayer = svg.querySelector("#route-layer");
  if (routeLayer) {
    routeLayer.innerHTML = "";
  }
}

/**
 * Draws the shortest path polyline and destination marker.
 *
 * @param {SVGSVGElement} svg
 * @param {{ nodeIds: string[], nodes: Array<{id: string, x: number, y: number}>, distance: number }} route
 * @param {Map<string, Object>} nodesMap
 * @param {Object} room
 */
export function drawRoute(svg, route, nodesMap, room) {
  clearRoute(svg);

  if (!route || !route.nodes || route.nodes.length === 0) {
    return;
  }

  const routeLayer = svg.querySelector("#route-layer");
  if (!routeLayer) return;

  // Build points string for polyline: "x1,y1 x2,y2 ..."
  const pointsStr = route.nodes.map((n) => `${n.x},${n.y}`).join(" ");

  // Polyline corridor path
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", pointsStr);
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "var(--orange)");
  polyline.setAttribute("stroke-width", "0.65");
  polyline.setAttribute("stroke-linecap", "round");
  polyline.setAttribute("stroke-linejoin", "round");
  polyline.setAttribute("id", "active-route-polyline");
  routeLayer.appendChild(polyline);

  // Path vertex dots along the route (optional subtle markers)
  for (let i = 1; i < route.nodes.length - 1; i++) {
    const pt = route.nodes[i];
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", pt.x);
    dot.setAttribute("cy", pt.y);
    dot.setAttribute("r", "0.22");
    dot.setAttribute("fill", "var(--orange)");
    routeLayer.appendChild(dot);
  }

  // Destination Marker on the final door node
  const destNode = route.nodes[route.nodes.length - 1];
  if (destNode) {
    const destGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    destGroup.setAttribute("class", "destination-marker");
    destGroup.setAttribute("id", "dest-marker");

    // Outer accent ring
    const outerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    outerRing.setAttribute("cx", destNode.x);
    outerRing.setAttribute("cy", destNode.y);
    outerRing.setAttribute("r", "0.9");
    outerRing.setAttribute("fill", "none");
    outerRing.setAttribute("stroke", "var(--orange)");
    outerRing.setAttribute("stroke-width", "0.25");
    destGroup.appendChild(outerRing);

    // Inner filled circle
    const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    innerCircle.setAttribute("cx", destNode.x);
    innerCircle.setAttribute("cy", destNode.y);
    innerCircle.setAttribute("r", "0.5");
    innerCircle.setAttribute("fill", "var(--orange)");
    destGroup.appendChild(innerCircle);

    // Center dot in ivory
    const centerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    centerDot.setAttribute("cx", destNode.x);
    centerDot.setAttribute("cy", destNode.y);
    centerDot.setAttribute("r", "0.2");
    centerDot.setAttribute("fill", "var(--ivory)");
    destGroup.appendChild(centerDot);

    routeLayer.appendChild(destGroup);
  }
}
