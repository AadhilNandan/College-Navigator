# CSE Block Navigator — Graph and Modeling Notes

Authoritative engineering and topological assumptions for Jyothi Engineering College, CSE (WAB) block.

---

## 1. Scope and Floor Level
- **Level 1 only**: This model strictly covers Level 1 of the CSE (WAB) block.
- **Room Scope**: Rooms span `WAB 202` through `WAB 218` (including `WAB 216A`, giving 18 rooms total).
- **Block Connection**: `ENTRANCE` (`(0, 0)`) represents the block boundary connection to the next block / rest of campus.

---

## 2. Geometry and Distances
- **Coordinates are for drawing only**: Node `x` and `y` coordinates represent physical layout positions for rendering and map animation. They are **never** used to compute routing distances.
- **Routing uses explicit edge distances**: All pathfinding and Dijkstra calculations rely strictly on the `distance` values specified in `edges.json`.
- **Hallway to Ring Connection**: The corridor stretch from `H5` to `R_TOP` is explicitly calibrated to `6.2 m`.
- **Central Void**: The central open-to-below courtyard area is non-walkable and is not part of the corridor graph.
- **Corridor Walking Line**: The ring walking line runs approximately `1.2 m` inside the corridor walls. Door connections from junctions are set to `1.2 m` on the ring and `1.5 m` in the entry hallway.

---

## 3. Junction and Ring Topology
- **Hallway Junctions**: `ENTRANCE` $\rightarrow$ `H0` $\rightarrow$ `H1` $\rightarrow$ `H2` $\rightarrow$ `H3` $\rightarrow$ `H4` $\rightarrow$ `H5` $\rightarrow$ `R_TOP`.
- **Ring Corners**:
  - `TL` (`x = -11.2`, `y = 32.2`) — Top Left
  - `TR` (`x = 11.3`, `y = 32.2`) — Top Right
  - `BL` (`x = -11.2`, `y = 73.1`) — Bottom Left
  - `BR` (`x = 11.3`, `y = 73.1`) — Bottom Right
- **Bottom Corridor & Junctions**:
  - The bottom path is strictly `BL ───── J213 ───── BR`.
  - `J213` (`x = 5.0`, `y = 73.1`) connects to `W213_DOOR` (`distance = 1.2 m`).
  - `BR` serves as the junction directly connecting to `W212_DOOR` (`distance = 1.2 m`) and `FE_B` (`distance = 1.5 m`).
  - Obsolete intermediate junction IDs (`J_FE_B`, `J_212`, `J_Hxxx`) do not exist.

---

## 4. Special Nodes and Access Rules
- **WAB 217 (Storage Room)**:
  - `searchable = false`
  - `locked = true`
  - `status = "Usually closed"`
  - `W217_DOOR` has `routable = false` and is barred from ordinary routing.
- **Fire Exits (`FE_L`, `FE_1`, `FE_B`)**:
  - Permanent emergency egress points (`type = FIRE_EXIT`).
  - `isRoutable() = false`.
  - Fire exits are never used as intermediate nodes in normal routes; they can only be targeted when explicitly queried as emergency destinations.
- **Seminar Hall (WAB 203)**:
  - Has 3 distinct doors:
    - `W203_D1` — D1 — Third Entrance
    - `W203_D2` — D2 — Primary Entrance (`primary = true`)
    - `W203_D3` — D3 — Secondary Entrance
  - Standard route queries to `WAB203` default to primary entrance `W203_D2`, with `W203_D1` and `W203_D3` available as explicit door choices.
