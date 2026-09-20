# CSE Block Navigator — Workspace Rules

## 1. HARD SCOPE — ALWAYS ON

This project is **CSE BLOCK NAVIGATOR**, a mobile-first 16-bit pixel-art navigation game for the **Jyothi Engineering College CSE Block, Level 1**. It is also a Java OOP academic project: Java provides the graph/navigation engine, HTML/CSS/JS/SVG provides the browser frontend.

**Current scope: WAB 202–218 on Level 1 only.**

Never expand the navigation scope, redesign the graph, invent rooms/distances, or add unrelated features unless the user explicitly authorizes it.

### NEVER

- Never modify the authoritative graph structure or room data without explicit approval.
- Never hardcode navigation routes.
- Never bake routes into images.
- Never bake room numbers/names into map artwork.
- Never bake player/destination markers into the map background.
- Never route through fire exits as normal intermediates.
- Never make WAB217 a selectable/routable destination.
- Never treat the central Level 1 void/open-to-below area as another navigable floor.
- Never invent stairs, lifts, rooms, connections, or measurements.
- Never replace the real JEC architectural identity with generic campus artwork.
- Never generate new images/artwork unless the user explicitly asks for a specific missing/replacement asset.
- Never redesign or modify approved original assets without explicit approval.
- Never silently change the technology stack or rebuild the project from scratch.
- Never delete or move original asset files without explicit approval.

---

## 2. SOURCE OF TRUTH

Authoritative navigation data:

- `data/nodes.json`
- `data/edges.json`
- `data/rooms.json`

Rules:

- `edge.distance` is authoritative for Dijkstra/shortest-path calculations.
- Node coordinates are for visualization/drawing only.
- Do not infer distances from screen/SVG coordinates.
- Do not create a competing graph dataset.
- If frontend data needs transformation, derive it from the authoritative JSON files at load time.
- Distances are approximate (from floor-plan dimensions, not surveyed). Label them as approximate wherever they are shown to users.

Important behavior:

- Entry is the default starting position ("You are here").
- WAB203 has D1/D2/D3; D2 is the default primary door.
- WAB217 is locked, usually closed, non-searchable, and non-routable.
- Fire exits are visual/leaf nodes, not normal route intermediates.
- Current graph has no stairs/lift navigation.

---

## 3. TECH STACK

- Engine: Java 17, Maven, Gson, JUnit 5.
- Frontend: plain HTML/CSS/JS with SVG. No framework unless the user approves one.
- Frontend layout: `index.html`, `style.css`, `app.js`, `js/` modules (data-loader, graph, dijkstra, navigator, map-renderer, route-renderer, ui), `data/`, `map/level-1.svg`, `assets/`.

---

## 4. ASSETS

Use only assets listed in `ASSET_INDEX.md`. `assets-manifest.json` is the source of truth for asset paths.

Do not generate replacement art merely because an existing asset is imperfect.

**Derived files are allowed when the user approves them** (sliced sprite frames, resized/compressed WebP copies). They go in a separate folder (e.g. `assets-optimised/`). Original files are never modified, and the game loads the derived copies.

Room doors come from a category lookup. Do not invent a new door asset:

| Category           | Door asset                |
| ------------------ | ------------------------- |
| FACULTY, STAFFROOM | `staffroom_door.png`      |
| CLASSROOM          | `room_door_closed.png`    |
| LABORATORY         | `lab_door.png`            |
| SEMINAR_HALL       | `seminar_door.png`        |
| LIBRARY            | `library_door.png`        |
| FACILITY           | `washroom_door.png`       |
| STORAGE            | `storage_door_locked.png` |

Dynamic elements must stay dynamic:

- room labels and names → HTML/SVG
- routes → SVG
- route arrows → SVG/CSS
- player position → DOM/SVG
- destination marker → DOM/SVG
- UI cards/buttons → HTML/CSS where practical

The character shadow is layered separately beneath the character.
Preserve the established JEC pixel-art palette and visual language.
Use the existing boy/girl character sheets as the only character designs.

---

## 5. HOW TO WORK

Before a significant change:

1. Inspect the relevant existing files.
2. Identify dependencies and existing behavior.
3. State a short plan.
4. For a large architectural or visual change, wait for approval.

For small fixes, make the smallest reasonable change and test it.

- One focused change at a time. Run the relevant check, verify, then continue.
- If information is ambiguous or missing, **ask instead of guessing**.
- Do not "improve" unspecified behavior or add features.
- Do not leave scratch or temporary files in the project folder. Put throwaway scripts outside the project or delete them when done.

---

## 6. ARCHITECTURE

```text
JSON DATA → GRAPH → DIJKSTRA → ORDERED NODE PATH
        → DYNAMIC SVG ROUTE → PIXEL-ART CHARACTER → ARRIVAL STATE
```

The Java engine and the browser frontend must use the same graph data and assumptions. The frontend calculates and renders the route from the graph. No room-to-room path is ever hardcoded.

---

## 7. DEFINITION OF DONE

A navigation change is not complete until the relevant behavior is verified.

- JS Dijkstra matches the Java engine.
- Reference distances from Entry: WAB206 = 12.8 m, WAB218 = 45.2 m, WAB213 = 91.9 m.
- WAB217 cannot be selected as a destination.
- Fire exits never appear as normal route intermediates.
- WAB203 defaults to D2.
- Room labels are data-driven.
- Routes are generated as SVG, never baked into an image.
- Layout works at the 9:19.5 mobile portrait ratio.
- Approved original assets are intact.

If a check cannot be run, say so clearly. Never claim it passed.

---

## 8. CHANGE CONTROL

Get explicit approval before changing any of these:

- `nodes.json`, `edges.json`, `rooms.json`
- graph topology, room identities, room distances
- approved original assets
- technology stack
- navigation rules
- Level 1 scope

If a request conflicts with these rules, surface the conflict and ask. **Never silently override a source-of-truth file to make a feature work.**
