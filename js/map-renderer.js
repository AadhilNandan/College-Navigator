/**
 * Inline SVG Map Renderer for CSE Block Navigator.
 * Renders nodes and edges with topological accuracy directly from data.
 * Units are metres; x = east, y = south (SVG coordinate space).
 */

function getDoorLabelLayout(n) {
  if (n.y > 74.0 && n.x < 10.0) {
    // Bottom-corridor doors (e.g. W213_DOOR at (5.0, 74.3)) label below
    return { x: n.x, y: n.y + 1.4, anchor: "middle" };
  } else if (n.x < 0) {
    // Left-wall doors label to the left
    return { x: n.x - 0.8, y: n.y + 0.25, anchor: "end" };
  } else {
    // Right-wall doors label to the right
    return { x: n.x + 0.8, y: n.y + 0.25, anchor: "start" };
  }
}

function getFireExitLabelLayout(n) {
  if (n.id === "FE_B") {
    // Bottom-right fire exit (11.2, 74.6) is adjacent to W212_DOOR (12.5, 73.9) on its right.
    // Label on the side away from neighbouring door labels (to the left).
    return { x: n.x - 0.8, y: n.y + 0.25, anchor: "end" };
  } else if (n.x < 0) {
    return { x: n.x - 0.8, y: n.y + 0.25, anchor: "end" };
  } else {
    return { x: n.x + 0.8, y: n.y + 0.25, anchor: "start" };
  }
}

export function renderMap(container, nodes, edges, rooms, onDoorClick) {
  container.innerHTML = "";

  const nodesMap = new Map();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    nodesMap.set(n.id, n);
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }

  // Margin in metres for outer room labels and fire exits (widened to prevent clipping)
  const marginX = 12.0;
  const marginY = 5.0;
  const vbX = minX - marginX;
  const vbY = minY - marginY;
  const vbW = maxX - minX + marginX * 2;
  const vbH = maxY - minY + marginY * 2;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
  svg.setAttribute("class", "campus-map-svg");
  svg.setAttribute("id", "campus-svg-map");

  // 1. Background layer
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", vbX);
  bg.setAttribute("y", vbY);
  bg.setAttribute("width", vbW);
  bg.setAttribute("height", vbH);
  bg.setAttribute("fill", "var(--ivory)");
  svg.appendChild(bg);

  // Central void representation (indicative courtyard area inside the ring)
  const voidRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  voidRect.setAttribute("x", "-9.5");
  voidRect.setAttribute("y", "34.5");
  voidRect.setAttribute("width", "19.0");
  voidRect.setAttribute("height", "36.5");
  voidRect.setAttribute("fill", "var(--cream)");
  voidRect.setAttribute("stroke", "var(--gold)");
  voidRect.setAttribute("stroke-width", "0.2");
  voidRect.setAttribute("rx", "1");
  svg.appendChild(voidRect);

  const voidText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  voidText.setAttribute("x", "0");
  voidText.setAttribute("y", "52.5");
  voidText.setAttribute("text-anchor", "middle");
  voidText.setAttribute("fill", "var(--navy)");
  voidText.setAttribute("font-size", "1.1");
  voidText.setAttribute("opacity", "0.5");
  voidText.textContent = "OPEN VOID";
  svg.appendChild(voidText);

  // 2. Edges Layer (Corridor tracks)
  const edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edgesGroup.setAttribute("class", "layer-edges");

  for (const edge of edges) {
    const fromNode = nodesMap.get(edge.from);
    const toNode = nodesMap.get(edge.to);
    if (!fromNode || !toNode) continue;

    // Corridor base line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", fromNode.x);
    line.setAttribute("y1", fromNode.y);
    line.setAttribute("x2", toNode.x);
    line.setAttribute("y2", toNode.y);
    line.setAttribute("stroke", "var(--cream)");
    line.setAttribute("stroke-width", "1.2");
    line.setAttribute("stroke-linecap", "round");
    edgesGroup.appendChild(line);

    // Corridor center trace
    const centerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    centerLine.setAttribute("x1", fromNode.x);
    centerLine.setAttribute("y1", fromNode.y);
    centerLine.setAttribute("x2", toNode.x);
    centerLine.setAttribute("y2", toNode.y);
    centerLine.setAttribute("stroke", "var(--navy)");
    centerLine.setAttribute("stroke-width", "0.15");
    centerLine.setAttribute("stroke-dasharray", "0.5 0.5");
    edgesGroup.appendChild(centerLine);
  }
  svg.appendChild(edgesGroup);

  // 3. Route Layer (Overlaid path drawn by route-renderer)
  const routeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  routeGroup.setAttribute("id", "route-layer");
  svg.appendChild(routeGroup);

  // 4. Junctions Layer
  const junctionsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  junctionsGroup.setAttribute("class", "layer-junctions");
  for (const n of nodes) {
    if (n.type === "JUNCTION") {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", n.x);
      dot.setAttribute("cy", n.y);
      dot.setAttribute("r", "0.25");
      dot.setAttribute("fill", "var(--navy)");
      dot.setAttribute("opacity", "0.4");
      junctionsGroup.appendChild(dot);
    }
  }
  svg.appendChild(junctionsGroup);

  // 5. Doors Layer
  const doorsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  doorsGroup.setAttribute("class", "layer-doors");

  for (const n of nodes) {
    if (n.type !== "ROOM_DOOR") continue;

    const room = rooms.find((r) => r.doors && r.doors.some((d) => d.node === n.id));
    const roomCode = room ? room.code : n.room || "";
    const isLocked = n.routable === false || (room && room.locked);

    const doorG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    doorG.setAttribute("class", isLocked ? "door-node locked" : "door-node");
    doorG.setAttribute("id", `map-door-${n.id}`);
    doorG.setAttribute("data-node-id", n.id);
    if (room) doorG.setAttribute("data-room-id", room.id);

    if (isLocked) {
      // Locked door: grey square with SVG padlock
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", n.x - 0.5);
      rect.setAttribute("y", n.y - 0.5);
      rect.setAttribute("width", "1.0");
      rect.setAttribute("height", "1.0");
      rect.setAttribute("fill", "#888888");
      rect.setAttribute("stroke", "#555555");
      rect.setAttribute("stroke-width", "0.1");
      doorG.appendChild(rect);

      // Padlock shackle & body
      const shackle = document.createElementNS("http://www.w3.org/2000/svg", "path");
      shackle.setAttribute(
        "d",
        `M ${n.x - 0.2} ${n.y - 0.1} A 0.2 0.2 0 0 1 ${n.x + 0.2} ${n.y - 0.1}`
      );
      shackle.setAttribute("fill", "none");
      shackle.setAttribute("stroke", "#ffffff");
      shackle.setAttribute("stroke-width", "0.08");
      doorG.appendChild(shackle);

      const lockBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      lockBody.setAttribute("x", n.x - 0.25);
      lockBody.setAttribute("y", n.y - 0.1);
      lockBody.setAttribute("width", "0.5");
      lockBody.setAttribute("height", "0.4");
      lockBody.setAttribute("fill", "#ffffff");
      doorG.appendChild(lockBody);

      // Label
      const doorLayout = getDoorLabelLayout(n);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", doorLayout.x);
      label.setAttribute("y", doorLayout.y);
      label.setAttribute("text-anchor", doorLayout.anchor);
      label.setAttribute("fill", "#666666");
      label.setAttribute("font-size", "0.75");
      label.textContent = `${roomCode} (Locked)`;
      doorG.appendChild(label);
    } else {
      // Normal door: square button
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", n.x - 0.5);
      rect.setAttribute("y", n.y - 0.5);
      rect.setAttribute("width", "1.0");
      rect.setAttribute("height", "1.0");
      rect.setAttribute("fill", "var(--navy)");
      rect.setAttribute("stroke", "var(--gold)");
      rect.setAttribute("stroke-width", "0.15");
      rect.setAttribute("rx", "0.15");
      doorG.appendChild(rect);

      // Room code label
      const doorLayout = getDoorLabelLayout(n);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", doorLayout.x);
      label.setAttribute("y", doorLayout.y);
      label.setAttribute("text-anchor", doorLayout.anchor);
      label.setAttribute("fill", "var(--navy)");
      label.setAttribute("font-size", "0.85");
      label.setAttribute("font-weight", "600");
      label.textContent = roomCode;
      doorG.appendChild(label);

      if (typeof onDoorClick === "function" && room) {
        doorG.style.cursor = "pointer";
        doorG.addEventListener("click", () => onDoorClick(room.id, n.id));
      }
    }

    doorsGroup.appendChild(doorG);
  }
  svg.appendChild(doorsGroup);

  // 6. Fire Exits Layer (Leaf nodes, non-selectable)
  const fireExitsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  fireExitsGroup.setAttribute("class", "layer-fire-exits");

  for (const n of nodes) {
    if (n.type !== "FIRE_EXIT") continue;

    const feG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    feG.setAttribute("class", "fire-exit-node");

    const diamond = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    diamond.setAttribute("x", n.x - 0.45);
    diamond.setAttribute("y", n.y - 0.45);
    diamond.setAttribute("width", "0.9");
    diamond.setAttribute("height", "0.9");
    diamond.setAttribute("fill", "var(--brick)");
    diamond.setAttribute("transform", `rotate(45 ${n.x} ${n.y})`);
    feG.appendChild(diamond);

    const feLayout = getFireExitLabelLayout(n);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", feLayout.x);
    label.setAttribute("y", feLayout.y);
    label.setAttribute("text-anchor", feLayout.anchor);
    label.setAttribute("fill", "var(--brick)");
    label.setAttribute("font-size", "0.75");
    label.setAttribute("font-weight", "600");
    label.textContent = "Fire exit";
    feG.appendChild(label);

    fireExitsGroup.appendChild(feG);
  }
  svg.appendChild(fireExitsGroup);

  // 7. Entrance Node (You are here)
  const entranceNode = nodesMap.get("ENTRANCE");
  if (entranceNode) {
    const entranceG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    entranceG.setAttribute("class", "entrance-marker");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", entranceNode.x);
    circle.setAttribute("cy", entranceNode.y);
    circle.setAttribute("r", "0.65");
    circle.setAttribute("fill", "var(--green)");
    circle.setAttribute("stroke", "var(--ivory)");
    circle.setAttribute("stroke-width", "0.2");
    entranceG.appendChild(circle);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", entranceNode.x);
    label.setAttribute("y", entranceNode.y - 1.0);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "var(--green)");
    label.setAttribute("font-size", "0.9");
    label.setAttribute("font-weight", "700");
    label.textContent = "You are here";
    entranceG.appendChild(label);

    svg.appendChild(entranceG);
  }

  container.appendChild(svg);
  return { svg, nodesMap };
}
