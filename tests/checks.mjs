/**
 * Automated Verification Checks for CSE Block Navigator JS Graph Engine.
 * Run with: node tests/checks.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { parseGraphData } from "../js/data-loader.js";
import { Graph } from "../js/graph.js";
import { Navigator } from "../js/navigator.js";

const TOLERANCE = 0.01;
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`[FAIL] ${testName}${details ? " - " + details : ""}`);
  }
}

function approxEqual(actual, expected) {
  return Math.abs(actual - expected) <= TOLERANCE;
}

// Read raw JSON files from data/
const dataDir = path.resolve("data");
const nodesRaw = JSON.parse(fs.readFileSync(path.join(dataDir, "nodes.json"), "utf-8"));
const edgesRaw = JSON.parse(fs.readFileSync(path.join(dataDir, "edges.json"), "utf-8"));
const roomsRaw = JSON.parse(fs.readFileSync(path.join(dataDir, "rooms.json"), "utf-8"));

console.log("==================================================================");
console.log("       CSE BLOCK NAVIGATOR — JS ENGINE VERIFICATION CHECKS        ");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// Check 1: Data Counts
// -----------------------------------------------------------------------------
console.log("--- 1. DATA COUNTS ---");
const { nodes, edges, rooms } = parseGraphData(nodesRaw, edgesRaw, roomsRaw);
assert(nodes.length === 48, "Node count equals 48", `Found ${nodes.length}`);
assert(edges.length === 48, "Edge count equals 48", `Found ${edges.length}`);
assert(rooms.length === 18, "Room count equals 18", `Found ${rooms.length}`);

// Initialize Graph & Navigator
const graph = Graph.fromData(nodes, edges);
const navigator = new Navigator(graph, rooms);

// -----------------------------------------------------------------------------
// Check 2: Validation Catches Problems
// -----------------------------------------------------------------------------
console.log("\n--- 2. DATA VALIDATION ERROR HANDLING ---");

// Test 2a: Duplicate node ID
let duplicateNodeCaught = false;
try {
  const badNodes = [
    { id: "N1", type: "JUNCTION", floor: 1, x: 0, y: 0 },
    { id: "N1", type: "JUNCTION", floor: 1, x: 1, y: 1 }
  ];
  parseGraphData(badNodes, [], []);
} catch (e) {
  duplicateNodeCaught = e.message.includes("Duplicate node id");
}
assert(duplicateNodeCaught, "Validation rejects duplicate node ID");

// Test 2b: Unknown edge node
let unknownEdgeNodeCaught = false;
try {
  const goodNodes = [{ id: "N1", type: "JUNCTION", floor: 1, x: 0, y: 0 }];
  const badEdges = [{ from: "N1", to: "UNKNOWN_NODE", distance: 5.0 }];
  parseGraphData(goodNodes, badEdges, []);
} catch (e) {
  unknownEdgeNodeCaught = e.message.includes("names a node that does not exist");
}
assert(unknownEdgeNodeCaught, "Validation rejects edge referencing unknown node");

// Test 2c: Non-positive or non-numeric distance
let badDistanceCaught = false;
try {
  const goodNodes = [
    { id: "N1", type: "JUNCTION", floor: 1, x: 0, y: 0 },
    { id: "N2", type: "JUNCTION", floor: 1, x: 1, y: 1 }
  ];
  const badEdges = [{ from: "N1", to: "N2", distance: -3.5 }];
  parseGraphData(goodNodes, badEdges, []);
} catch (e) {
  badDistanceCaught = e.message.includes("non-positive or non-numeric distance");
}
assert(badDistanceCaught, "Validation rejects non-positive edge distance");

// Test 2d: Room with no doors
let roomNoDoorsCaught = false;
try {
  const goodNodes = [{ id: "N1", type: "JUNCTION", floor: 1, x: 0, y: 0 }];
  const badRooms = [{ id: "R1", code: "R 1", name: "Room 1", category: "CLASSROOM", doors: [] }];
  parseGraphData(goodNodes, [], badRooms);
} catch (e) {
  roomNoDoorsCaught = e.message.includes("lists no doors");
}
assert(roomNoDoorsCaught, "Validation rejects room with no doors");

// -----------------------------------------------------------------------------
// Check 3: Java Test Parity
// -----------------------------------------------------------------------------
console.log("\n--- 3. JAVA TEST PARITY ---");

// ENTRANCE -> WAB213 = 91.9 m, path contains TR and not TL
const route213 = navigator.routeTo("WAB213");
assert(route213.found, "Route ENTRANCE -> WAB213 found");
assert(
  approxEqual(route213.distance, 91.9),
  "Distance ENTRANCE -> WAB213 equals 91.9 m",
  `Actual: ${route213.distance.toFixed(2)} m`
);
assert(route213.nodeIds.includes("TR"), "Route ENTRANCE -> WAB213 contains TR (right hand side)");
assert(!route213.nodeIds.includes("TL"), "Route ENTRANCE -> WAB213 does NOT contain TL");

// ENTRANCE -> WAB203 default door is W203_D2 = 12.8 m
const route203Default = navigator.routeTo("WAB203");
assert(route203Default.found, "Route ENTRANCE -> WAB203 found");
assert(
  route203Default.nodeIds[route203Default.nodeIds.length - 1] === "W203_D2",
  "Default door for WAB203 is primary door W203_D2"
);
assert(
  approxEqual(route203Default.distance, 12.8),
  "Distance ENTRANCE -> WAB203 (W203_D2) equals 12.8 m",
  `Actual: ${route203Default.distance.toFixed(2)} m`
);

// -----------------------------------------------------------------------------
// Check 4: Hand-computed reference routes (labeled hand-computed)
// -----------------------------------------------------------------------------
console.log("\n--- 4. REFERENCE ROUTES (HAND-COMPUTED) ---");

// WAB206 = 12.8 m
const route206 = navigator.routeTo("WAB206");
assert(
  approxEqual(route206.distance, 12.8),
  "Route ENTRANCE -> WAB206 distance = 12.8 m [hand-computed]",
  `Actual: ${route206.distance.toFixed(2)} m`
);

// WAB218 = 45.2 m
const route218 = navigator.routeTo("WAB218");
assert(
  approxEqual(route218.distance, 45.2),
  "Route ENTRANCE -> WAB218 distance = 45.2 m [hand-computed]",
  `Actual: ${route218.distance.toFixed(2)} m`
);

// WAB203 D1 = 5.9 m
const route203D1 = navigator.routeToDoor("ENTRANCE", "WAB203", "W203_D1");
assert(
  approxEqual(route203D1.distance, 5.9),
  "Route ENTRANCE -> WAB203 (door W203_D1) distance = 5.9 m [hand-computed]",
  `Actual: ${route203D1.distance.toFixed(2)} m`
);

// WAB203 D3 = 19.5 m
const route203D3 = navigator.routeToDoor("ENTRANCE", "WAB203", "W203_D3");
assert(
  approxEqual(route203D3.distance, 19.5),
  "Route ENTRANCE -> WAB203 (door W203_D3) distance = 19.5 m [hand-computed]",
  `Actual: ${route203D3.distance.toFixed(2)} m`
);

// -----------------------------------------------------------------------------
// Check 5: Non-routable & Unknown Room Handling
// -----------------------------------------------------------------------------
console.log("\n--- 5. NON-ROUTABLE & UNKNOWN ROOM HANDLING ---");

// WAB217 is non-routable and locked
let wab217RouteThrew = false;
let wab217ErrorMessage = "";
try {
  navigator.routeTo("WAB217");
} catch (e) {
  wab217RouteThrew = true;
  wab217ErrorMessage = e.message;
}
assert(wab217RouteThrew, "routeTo('WAB217') throws an Error");
assert(
  wab217ErrorMessage === "WAB 217 - Storage Room cannot be routed to (Usually closed)",
  "WAB217 error message matches Java exact format",
  `Actual: "${wab217ErrorMessage}"`
);

const searchResults217 = navigator.search("217");
assert(searchResults217.length === 0, "search('217') returns empty list (non-searchable)");

// Unknown room id throws
let unknownRoomThrew = false;
let unknownRoomErrorMessage = "";
try {
  navigator.routeTo("WAB999");
} catch (e) {
  unknownRoomThrew = true;
  unknownRoomErrorMessage = e.message;
}
assert(unknownRoomThrew, "routeTo('WAB999') throws for unknown room id");
assert(
  unknownRoomErrorMessage === "There is no room with id WAB999",
  "Unknown room error message matches Java format",
  `Actual: "${unknownRoomErrorMessage}"`
);

// -----------------------------------------------------------------------------
// Check 6: Fire Exit & Non-routable Intermediate Avoidance
// -----------------------------------------------------------------------------
console.log("\n--- 6. INTERMEDIATE NODE RESTRICTIONS ---");
const fireExitIds = new Set(["FE_L", "FE_1", "FE_B"]);
let passedIntermediateCheck = true;

for (const room of navigator.getAllRooms()) {
  if (room.locked || room.getRoutableDoors(graph).length === 0) continue;
  const r = navigator.routeTo(room.id);
  for (const node of r.nodes) {
    if (fireExitIds.has(node.id)) {
      passedIntermediateCheck = false;
      console.error(`Route to ${room.id} incorrectly passed through fire exit ${node.id}`);
    }
    if (node.routable === false && node.id !== r.nodeIds[r.nodeIds.length - 1]) {
      passedIntermediateCheck = false;
      console.error(`Route to ${room.id} incorrectly traversed non-routable node ${node.id}`);
    }
  }
}
assert(
  passedIntermediateCheck,
  "No route to any routable room traverses a FIRE_EXIT or non-routable intermediate"
);

// -----------------------------------------------------------------------------
// Check 7: Reachability of all routable rooms
// -----------------------------------------------------------------------------
console.log("\n--- 7. ROUTABLE ROOM REACHABILITY ---");
let allRoutableReachable = true;
const routableRooms = [];

for (const room of navigator.getAllRooms()) {
  if (room.locked || room.getRoutableDoors(graph).length === 0) continue;
  const r = navigator.routeTo(room.id);
  if (!r.found || r.distance <= 0) {
    allRoutableReachable = false;
  }
  routableRooms.push({
    code: room.code,
    name: room.name,
    primaryDoor: room.primaryDoor.node,
    distance: r.distance,
    path: r.nodeIds.join(" -> ")
  });
}
assert(allRoutableReachable, "Every routable room (17 rooms) is reachable from ENTRANCE");

// -----------------------------------------------------------------------------
// Check 8: Advanced Search Behaviour
// -----------------------------------------------------------------------------
console.log("\n--- 8. ADVANCED SEARCH BEHAVIOUR ---");

// search("wab206"), search("WAB 206"), search("s3b") each return WAB206
const sWab206 = navigator.search("wab206");
assert(sWab206.some((r) => r.id === "WAB206"), "search('wab206') returns WAB206");

const sWab206Space = navigator.search("WAB 206");
assert(sWab206Space.some((r) => r.id === "WAB206"), "search('WAB 206') returns WAB206");

const sS3b = navigator.search("s3b");
assert(sS3b.some((r) => r.id === "WAB206"), "search('s3b') returns WAB206");

// search("library") returns WAB209
const sLibrary = navigator.search("library");
assert(sLibrary.length === 1 && sLibrary[0].id === "WAB209", "search('library') returns WAB209");

// search("lab") returns only LABORATORY rooms
const sLab = navigator.search("lab");
const onlyLabs = sLab.length > 0 && sLab.every((r) => r.category === "LABORATORY");
assert(onlyLabs, "search('lab') returns only LABORATORY rooms", `Found: ${sLab.map((r) => r.id).join(", ")}`);

// search("faculty") returns 202, 214, 215
const sFaculty = navigator.search("faculty");
const facultyIds = sFaculty.map((r) => r.id).sort();
assert(
  JSON.stringify(facultyIds) === JSON.stringify(["WAB202", "WAB214", "WAB215"]),
  "search('faculty') returns WAB202, WAB214, WAB215",
  `Found: ${facultyIds.join(", ")}`
);

// search("217") and search("storage") return nothing
const s217 = navigator.search("217");
assert(s217.length === 0, "search('217') returns nothing");
const sStorage = navigator.search("storage");
assert(sStorage.length === 0, "search('storage') returns nothing");

// search("") returns nothing
const sEmpty = navigator.search("");
assert(sEmpty.length === 0, "search('') returns nothing (empty list)");

// -----------------------------------------------------------------------------
// Summary & Room Route Table
// -----------------------------------------------------------------------------
console.log("\n==================================================================");
console.log("                 ROUTABLE ROOMS SUMMARY TABLE                     ");
console.log("==================================================================");
console.log(
  "Room Code".padEnd(10) +
    " | " +
    "Primary Door".padEnd(14) +
    " | " +
    "Distance".padEnd(10) +
    " | " +
    "Ordered Node Path"
);
console.log("-".repeat(10) + "-+-" + "-".repeat(14) + "-+-" + "-".repeat(10) + "-+-" + "-".repeat(50));

for (const r of routableRooms) {
  console.log(
    r.code.padEnd(10) +
      " | " +
      r.primaryDoor.padEnd(14) +
      " | " +
      (r.distance.toFixed(1) + " m").padEnd(10) +
      " | " +
      r.path
  );
}

console.log("\n==================================================================");
console.log(`TOTAL CHECKS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log("==================================================================");

if (failedCount > 0) {
  process.exit(1);
}
