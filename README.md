# CSE Block Navigator — Java / OOP graph core

Jyothi Engineering College, CSE (WAB) block, Level 1.

This is the navigation core only: the room and corridor model, the graph, and
Dijkstra's shortest path. There is no front end here. The browser map is a
separate piece of work that reads the **same three JSON files** in `data/`, so
both sides always agree on the building.

---

## Running it

Open the folder in IntelliJ IDEA (**File → Open**, pick the folder with
`pom.xml`). IntelliJ imports it as a Maven project. JDK 17 or newer.

```bash
mvn test          # runs all unit tests
mvn package       # builds target/cse-block-navigator.jar

java -jar target/cse-block-navigator.jar check
java -jar target/cse-block-navigator.jar rooms
java -jar target/cse-block-navigator.jar route WAB203 WAB213
java -jar target/cse-block-navigator.jar from  ENTRANCE WAB213
java -jar target/cse-block-navigator.jar json  ENTRANCE WAB213
java -jar target/cse-block-navigator.jar       # demo, then an interactive prompt
```

Run it from the project root, or from anywhere inside it. `DataFiles` walks up
the folder tree looking for `data/nodes.json`, so IntelliJ's default working
directory is fine.

Sample output:

```
Start at Connection to Next Block.
Walk about 32 m along the corridor.
Turn right.
Walk about 41 m along the corridor.
Turn right.
Walk about 18 m along the corridor.
Turn left.
Walk about 1 m along the corridor.
You have arrived at WAB 213 - Data Structures Laboratory / System Laboratory (Door). Total 92 m, about 2 min walk.
```

JSON parsing is handled using Google **Gson 2.13.0**. JUnit 5 is used for testing.

---

## Running the web app

Build the project with Maven or run the class directly from IntelliJ IDEA:

```bash
mvn package
java -cp "target/classes;target/dependency/*" com.cse.navigator.web.WebServer
```

Or run `com.cse.navigator.web.WebServer` directly in IntelliJ IDEA.

Then open your browser at:
```
http://localhost:8000
```

---

## Layout

```
data/                        shared with the web front end
  nodes.json                 48 nodes
  edges.json                 48 corridor stretches
  rooms.json                 18 rooms

src/main/java/com/cse/navigator/
  model/     Node (abstract) -> Junction, DoorNode, FireExit, BoundaryNode
             Edge, Room, RoomCategory, Route
  graph/     Graph (adjacency list), Dijkstra (binary heap)
  data/      Json, NodeData/EdgeData/RoomData/DoorData, NodeFactory,
             GraphLoader, DataFiles
  service/   Navigator (the façade the UI talks to), DirectionBuilder
  app/       Main (console front end)

src/test/java/                unit test suite
```

### How the layers sit

- **model** knows nothing about files or algorithms. `Node` is abstract; each
  subclass answers `getType()`, `getDisplayName()` and `isRoutable()` for
  itself, so the router never asks "what kind of node is this?".
- **graph** knows nothing about rooms or JSON. It holds nodes and weighted
  edges and finds shortest paths.
- **data** is the only layer that touches the disk. Deserializes JSON via Gson into
  DTO records and passes them to `NodeFactory` and `GraphLoader`.
- **service** joins rooms to the graph: it manages default room doors (e.g. primary entrance D2 for WAB 203)
  and turns paths into walking instructions.

### Rooms and Doors

A route ends at a **door**, never inside a room. `Room` owns one or more
`DoorNode`s. WAB 203 (CSE Seminar Hall) has three doors (`W203_D1`, `W203_D2`, `W203_D3`).
`W203_D2` is the primary default entrance, while `W203_D1` and `W203_D3` remain available
as explicit choices.

### Non-routable nodes

`isRoutable()` is false for the three fire exits (`FE_L`, `FE_1`, `FE_B`) and for
WAB 217's door (`W217_DOOR`), which is the locked storage room. Dijkstra never
walks *through* such a node, but it can still route *to* a fire exit if explicitly
requested as an emergency egress destination.

### Cost

Adjacency list plus a binary heap: **O(E log V)**. With 48 nodes and 48 edges,
routing is instantaneous and uses an honest binary heap implementation.

---

## The data files

`nodes.json`

| field | meaning |
|---|---|
| `id` | unique, e.g. `W213_DOOR`, `J213`, `TR` |
| `type` | `JUNCTION`, `ROOM_DOOR`, `FIRE_EXIT`, `BOUNDARY` |
| `x`, `y` | metres. Drawing coordinates only. Origin is `ENTRANCE` at `(0, 0)`. |
| `floor` | 1 throughout |
| `room` | `ROOM_DOOR` only: which room the door belongs to |
| `routable` | optional, defaults to true |

`edges.json` — `from`, `to`, `distance` in metres. Every stretch is written
once and stored in both directions.

`rooms.json` — `id`, `code`, `name`, `category`, `doors` (each with `node`,
`label` and optionally `primary`), plus optional `searchable`, `locked`,
`status`.

### Shape of the graph

48 nodes, 48 edges. A connected graph with 48 nodes needs 47 edges to be a
tree, so **exactly one loop** exists: the ring corridor around the central open void.

From the entrance to WAB 213 on the bottom wall, the right hand side of the
ring is shorter (91.9 m) than the left hand side (101.7 m), so the router
selects the right side under normal conditions.

---

## For the web side

`Route.toJson()` gives the browser map exactly what it needs to render and animate:

```json
{"found":true,"distance":91.90,"seconds":71,
 "path":[{"id":"ENTRANCE","x":0.00,"y":0.00}, ...]}
```

See [graph-notes.md](file:///c:/Users/Aadhil/College%20Navigator/graph-notes.md) for full engineering assumptions and architectural notes.
