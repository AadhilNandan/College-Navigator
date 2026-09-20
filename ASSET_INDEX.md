# CSE Block Navigator — Asset Index

Complete index of the 109 visual assets for the JEC CSE Block Navigator 16-bit pixel-art navigation project.
Organised into group subfolders under `assets/` in **Stage 2** while retaining all original root files.

## Summary by Group

| Group | Asset Count | Subfolder | Description |
|---|:---:|---|---|
| `walls` | 7 | `assets/walls/` | Standard wall boundaries (straight segments, corners, and terminal ends) |
| `special-walls` | 6 | `assets/special-walls/` | Architectural wall features, openings, and structural columns |
| `doors` | 9 | `assets/doors/` | Room and facility door portals (generic and room-specific) |
| `room-sign` | 1 | `assets/room-sign/` | Signage boards displayed outside rooms |
| `floors` | 6 | `assets/floors/` | Modular floor surface textures and room tiles |
| `corridor` | 5 | `assets/corridor/` | Dedicated corridor hallway flooring and junction tiles |
| `fire-exit` | 3 | `assets/fire-exit/` | Emergency egress, safety markers, and fire exit doors |
| `washroom` | 3 | `assets/washroom/` | Restroom identification plaques and gender markers |
| `outdoor` | 7 | `assets/outdoor/` | Exterior foliage, landscape greenery, and campus environment |
| `furniture` | 7 | `assets/furniture/` | Campus interior props, decor, and seating furniture |
| `stairs-elevator` | 5 | `assets/stairs-elevator/` | Vertical navigation elements between floors (reserved for multi-floor) |
| `character` | 7 | `assets/character/` | Player avatar sprite sheets (idle & walk 4-directional), portraits, and drop shadow |
| `navigation-markers` | 4 | `assets/navigation-markers/` | Wayfinding pins, direction arrows, and route point markers |
| `ui-panels-buttons` | 9 | `assets/ui-panels-buttons/` | User interface panels, interactive buttons, search bar, and dropdown containers |
| `ui-icons` | 13 | `assets/ui-icons/` | Action, status, navigation control icons, and input adornments |
| `map-controls` | 4 | `assets/map-controls/` | Interactive map viewport controls (zoom, pan, orientation) |
| `ui-decorative` | 5 | `assets/ui-decorative/` | Ornamental borders, corner brackets, dividers, and framing accents |
| `welcome` | 5 | `assets/welcome/` | Landing splash screen graphics, logo, and title illustrations |
| `arrival` | 3 | `assets/arrival/` | Destination arrival celebration badges, sparkles, and banner |
| **Total** | **109** | | **19 subfolders (original files preserved in `assets/`)** |

> **Note on `route-visuals`**: The `route-visuals` category is currently empty (0 assets), so no `assets/route-visuals/` directory was created.

---

## Group: `walls` (7 assets)
**Directory**: `assets/walls/`  
*Standard wall boundaries (straight segments, corners, and terminal ends)*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `wab_wall_horizontal.png` | `assets/walls/wab_wall_horizontal.png` | 1983 x 793 | Yes | Horizontal wall segment (1983x793, thickness 793px) |
| `wab_wall_vertical.png` | `assets/walls/wab_wall_vertical.png` | 793 x 1983 | Yes | Vertical wall segment (793x1983, thickness 793px) |
| `wab_wall_corner_tl.png` | `assets/walls/wab_wall_corner_tl.png` | 1254 x 1254 | Yes | Top-left wall corner piece (1254x1254) |
| `wab_wall_corner_tr.png` | `assets/walls/wab_wall_corner_tr.png` | 1254 x 1254 | Yes | Top-right wall corner piece (1254x1254) |
| `wab_wall_corner_bl.png` | `assets/walls/wab_wall_corner_bl.png` | 1254 x 1254 | Yes | Bottom-left wall corner piece (1254x1254) |
| `wab_wall_corner_br.png` | `assets/walls/wab_wall_corner_br.png` | 1254 x 1254 | Yes | Bottom-right wall corner piece (1254x1254) |
| `wab_wall_end.png` | `assets/walls/wab_wall_end.png` | 1254 x 1254 | Yes | Wall cap / terminal end piece (1254x1254) |

## Group: `special-walls` (6 assets)
**Directory**: `assets/special-walls/`  
*Architectural wall features, openings, and structural columns*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `wab_wall_entrance.png` | `assets/special-walls/wab_wall_entrance.png` | 1536 x 1024 | Yes | Main entrance arch / portal structure |
| `wab_wall_archway.png` | `assets/special-walls/wab_wall_archway.png` | 1374 x 1145 | Yes | Interior open archway pass-through |
| `wab_wall_window.png` | `assets/special-walls/wab_wall_window.png` | 1448 x 1086 | Yes | Standard corridor window wall segment |
| `wab_wall_large_window.png` | `assets/special-walls/wab_wall_large_window.png` | 1536 x 1024 | Yes | Wide / large observation window wall segment |
| `wab_wall_pillar.png` | `assets/special-walls/wab_wall_pillar.png` | 1086 x 1448 | Yes | Short decorative pillar (1086x1448) |
| `wab_wall_column.png` | `assets/special-walls/wab_wall_column.png` | 887 x 1774 | Yes | Tall two-story structural column (887x1774) |

## Group: `doors` (9 assets)
**Directory**: `assets/doors/`  
*Room and facility door portals (generic and room-specific)*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `room_door_closed.png` | `assets/doors/room_door_closed.png` | 1086 x 1448 | Yes | Generic classroom / office closed door (1086x1448) |
| `room_door_open.png` | `assets/doors/room_door_open.png` | 1254 x 1254 | Yes | Generic open door portal (1254x1254, square aspect ratio) |
| `room_door_shadow.png` | `assets/doors/room_door_shadow.png` | 1774 x 887 | Yes | Floor cast-shadow underneath doorways (1774x887) |
| `seminar_door.png` | `assets/doors/seminar_door.png` | 1182 x 1330 | Yes | CSE Seminar Hall double door (WAB 203) |
| `lab_door.png` | `assets/doors/lab_door.png` | 1086 x 1448 | Yes | Computer Laboratory door (WAB 213, 214) |
| `washroom_door.png` | `assets/doors/washroom_door.png` | 1086 x 1448 | Yes | Restroom entrance door (WAB 208, 218) |
| `staffroom_door.png` | `assets/doors/staffroom_door.png` | 1086 x 1448 | Yes | Staffroom entrance door (WAB 204, also used for faculty rooms WAB 202, 214, 215) |
| `library_door.png` | `assets/doors/library_door.png` | 1139 x 1381 | Yes | Department Library entrance door (WAB 209) |
| `storage_door_locked.png` | `assets/doors/storage_door_locked.png` | 1086 x 1448 | Yes | Locked storage room door (WAB 217) |

## Group: `room-sign` (1 assets)
**Directory**: `assets/room-sign/`  
*Signage boards displayed outside rooms*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `room_sign_wood.png` | `assets/room-sign/room_sign_wood.png` | 1774 x 887 | Yes | Wooden hanging sign plate for room identification |

## Group: `floors` (6 assets)
**Directory**: `assets/floors/`  
*Modular floor surface textures and room tiles*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `floor_tile_border.png` | `assets/floors/floor_tile_border.png` | 1254 x 1254 | No (Opaque) | Outer edge border floor tile |
| `floor_tile_corner.png` | `assets/floors/floor_tile_corner.png` | 1254 x 1254 | No (Opaque) | Border corner floor tile |
| `floor_tile_cream_blue.png` | `assets/floors/floor_tile_cream_blue.png` | 1254 x 1254 | No (Opaque) | Cream tile with blue diamond accent insets |
| `floor_tile_cream_plain.png` | `assets/floors/floor_tile_cream_plain.png` | 1254 x 1254 | No (Opaque) | Plain cream grid floor tile |
| `floor_tile_dark.png` | `assets/floors/floor_tile_dark.png` | 1254 x 1254 | No (Opaque) | Dark contrast accent floor tile |
| `floor_tile_transition.png` | `assets/floors/floor_tile_transition.png` | 1254 x 1254 | No (Opaque) | Threshold / transition floor tile strip |

## Group: `corridor` (5 assets)
**Directory**: `assets/corridor/`  
*Dedicated corridor hallway flooring and junction tiles*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `corridor_corner.png` | `assets/corridor/corridor_corner.png` | 1254 x 1254 | No (Opaque) | Corridor 90-degree bend turn tile |
| `corridor_dead_end.png` | `assets/corridor/corridor_dead_end.png` | 1254 x 1254 | No (Opaque) | Corridor dead end terminator tile |
| `corridor_floor_horizontal.png` | `assets/corridor/corridor_floor_horizontal.png` | 1254 x 1254 | No (Opaque) | Horizontal corridor walkway runner tile |
| `corridor_floor_vertical.png` | `assets/corridor/corridor_floor_vertical.png` | 1254 x 1254 | No (Opaque) | Vertical corridor walkway runner tile |
| `corridor_intersection.png` | `assets/corridor/corridor_intersection.png` | 1254 x 1254 | No (Opaque) | Corridor 4-way cross-intersection tile |

## Group: `fire-exit` (3 assets)
**Directory**: `assets/fire-exit/`  
*Emergency egress, safety markers, and fire exit doors*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `fire_exit_door.png` | `assets/fire-exit/fire_exit_door.png` | 1254 x 1254 | Yes | Heavy red emergency fire exit exit door |
| `fire_exit_marker.png` | `assets/fire-exit/fire_exit_marker.png` | 1254 x 1254 | Yes | Floor emergency egress evacuation route marker |
| `fire_exit_sign.png` | `assets/fire-exit/fire_exit_sign.png` | 1536 x 1024 | Yes | Illuminated green overhead fire exit sign |

## Group: `washroom` (3 assets)
**Directory**: `assets/washroom/`  
*Restroom identification plaques and gender markers*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `washroom_male_sign.png` | `assets/washroom/washroom_male_sign.png` | 1254 x 1254 | Yes | Men's washroom door sign plaque (WAB 208) |
| `washroom_female_sign.png` | `assets/washroom/washroom_female_sign.png` | 1254 x 1254 | Yes | Women's washroom door sign plaque (WAB 218) |
| `washroom_icon.png` | `assets/washroom/washroom_icon.png` | 1254 x 1254 | Yes | Universal restroom icon symbol |

## Group: `outdoor` (7 assets)
**Directory**: `assets/outdoor/`  
*Exterior foliage, landscape greenery, and campus environment*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `bush.png` | `assets/outdoor/bush.png` | 1254 x 1254 | Yes | Standard green foliage bush |
| `bush_flowering.png` | `assets/outdoor/bush_flowering.png` | 1254 x 1254 | Yes | Flowering decorative shrub |
| `flower_cluster.png` | `assets/outdoor/flower_cluster.png` | 1254 x 1254 | Yes | Garden flower bed cluster patch |
| `hedge.png` | `assets/outdoor/hedge.png` | 1774 x 887 | Yes | Trimmed landscape boundary hedge barrier |
| `tree_large.png` | `assets/outdoor/tree_large.png` | 1254 x 1254 | Yes | Large campus shade tree canopy |
| `tree_medium.png` | `assets/outdoor/tree_medium.png` | 1254 x 1254 | Yes | Medium ornamental campus tree |
| `tree_small.png` | `assets/outdoor/tree_small.png` | 1254 x 1254 | Yes | Small young sapling / patio tree |

## Group: `furniture` (7 assets)
**Directory**: `assets/furniture/`  
*Campus interior props, decor, and seating furniture*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `campus_bench.png` | `assets/furniture/campus_bench.png` | 1448 x 1086 | Yes | Corridor wooden rest bench with metal frame |
| `campus_lamp.png` | `assets/furniture/campus_lamp.png` | 971 x 1619 | Yes | Standing campus floor / corridor lamp post |
| `campus_planter.png` | `assets/furniture/campus_planter.png` | 1316 x 1195 | Yes | Indoor ceramic decorative potted plant |
| `chair.png` | `assets/furniture/chair.png` | 1122 x 1402 | Yes | Individual student / office chair |
| `notice_board.png` | `assets/furniture/notice_board.png` | 1182 x 1330 | Yes | Wall-mounted department bulletin / notice board |
| `small_table.png` | `assets/furniture/small_table.png` | 1374 x 1145 | Yes | Wooden side / study table |
| `trash_bin.png` | `assets/furniture/trash_bin.png` | 1122 x 1402 | Yes | Indoor waste bin receptacle |

## Group: `stairs-elevator` (5 assets)
**Directory**: `assets/stairs-elevator/`  
*Vertical navigation elements between floors (reserved for multi-floor)*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `elevator.png` | `assets/stairs-elevator/elevator.png` | 1254 x 1254 | Yes | Full elevator exterior wall portal (1254x1254) |
| `elevator_door.png` | `assets/stairs-elevator/elevator_door.png` | 1448 x 1086 | Yes | Elevator sliding doors assembly (1448x1086) |
| `staircase_down.png` | `assets/stairs-elevator/staircase_down.png` | 1402 x 1122 | Yes | Stairwell descending steps view |
| `staircase_frame.png` | `assets/stairs-elevator/staircase_frame.png` | 1374 x 1145 | Yes | Stairwell architectural outer portal arch |
| `staircase_up.png` | `assets/stairs-elevator/staircase_up.png` | 1402 x 1122 | Yes | Stairwell ascending steps view |

## Group: `character` (7 assets)
**Directory**: `assets/character/`  
*Player avatar sprite sheets (idle & walk 4-directional), portraits, and drop shadow*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `boy_main_idle_4dir.png` | `assets/character/boy_main_idle_4dir.png` | 1983 x 793 | Yes | Boy player avatar 4-direction idle sheet (1x4 strip, 1983x793) |
| `boy_main_walk_4dir.png` | `assets/character/boy_main_walk_4dir.png` | 1024 x 1536 | Yes | Boy player avatar 4-direction walk cycle sheet (4x4 grid, 1024x1536) |
| `girl_main_idle_4dir.png` | `assets/character/girl_main_idle_4dir.png` | 1983 x 793 | Yes | Girl player avatar 4-direction idle sheet (1x4 strip, 1983x793) |
| `girl_main_walk_4dir.png` | `assets/character/girl_main_walk_4dir.png` | 1024 x 1536 | Yes | Girl player avatar 4-direction walk cycle sheet (4x4 grid, 1024x1536) |
| `character_shadow.png` | `assets/character/character_shadow.png` | 2172 x 724 | Yes | Soft drop shadow ellipse for avatar base |
| `student_male.png` | `assets/character/student_male.png` | 1024 x 1536 | Yes | Full-body male student idle standing portrait with drop shadow (1024x1536) |
| `student_female.png` | `assets/character/student_female.png` | 1024 x 1536 | Yes | Full-body female student idle standing portrait with drop shadow (1024x1536) |

## Group: `navigation-markers` (4 assets)
**Directory**: `assets/navigation-markers/`  
*Wayfinding pins, direction arrows, and route point markers*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `destination_marker.png` | `assets/navigation-markers/destination_marker.png` | 1254 x 1254 | Yes | Target destination map marker pin |
| `direction_arrow.png` | `assets/navigation-markers/direction_arrow.png` | 1254 x 1254 | Yes | Dynamic path direction guidance arrow |
| `navigation_start_marker.png` | `assets/navigation-markers/navigation_start_marker.png` | 1254 x 1254 | Yes | Starting position map marker pin |
| `player_location_marker.png` | `assets/navigation-markers/player_location_marker.png` | 1254 x 1254 | Yes | Current player position beacon marker |

## Group: `ui-panels-buttons` (9 assets)
**Directory**: `assets/ui-panels-buttons/`  
*User interface panels, interactive buttons, search bar, and dropdown containers*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `ui_button_disabled.png` | `assets/ui-panels-buttons/ui_button_disabled.png` | 2172 x 724 | Yes | Button disabled / inactive state (2172x724) |
| `ui_button_hover.png` | `assets/ui-panels-buttons/ui_button_hover.png` | 2172 x 724 | Yes | Button pointer hover state (2172x724) |
| `ui_button_normal.png` | `assets/ui-panels-buttons/ui_button_normal.png` | 2172 x 724 | Yes | Button standard idle state (2172x724) |
| `ui_button_selected.png` | `assets/ui-panels-buttons/ui_button_selected.png` | 2172 x 724 | Yes | Button active / pressed state (2172x724) |
| `ui_dropdown.png` | `assets/ui-panels-buttons/ui_dropdown.png` | 1983 x 793 | Yes | Dropdown select menu background container (1983x793) |
| `ui_panel.png` | `assets/ui-panels-buttons/ui_panel.png` | 1774 x 887 | Yes | Standard modal / dialogue UI window panel (1774x887) |
| `ui_panel_large.png` | `assets/ui-panels-buttons/ui_panel_large.png` | 1774 x 887 | Yes | Large UI window panel frame (1774x887) |
| `ui_panel_small.png` | `assets/ui-panels-buttons/ui_panel_small.png` | 1774 x 887 | Yes | Compact UI window panel frame (1774x887) |
| `ui_search_bar.png` | `assets/ui-panels-buttons/ui_search_bar.png` | 2172 x 724 | Yes | Search input text field container (2172x724) |

## Group: `ui-icons` (13 assets)
**Directory**: `assets/ui-icons/`  
*Action, status, navigation control icons, and input adornments*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `icon_arrow.png` | `assets/ui-icons/icon_arrow.png` | 1254 x 1254 | Yes | Generic navigation / directional arrow icon |
| `icon_back.png` | `assets/ui-icons/icon_back.png` | 1254 x 1254 | Yes | Return / go back arrow icon |
| `icon_check.png` | `assets/ui-icons/icon_check.png` | 1254 x 1254 | Yes | Success / confirmation checkmark icon |
| `icon_close.png` | `assets/ui-icons/icon_close.png` | 1254 x 1254 | Yes | Dismiss / close window 'X' icon |
| `icon_distance.png` | `assets/ui-icons/icon_distance.png` | 1254 x 1254 | Yes | Walking distance ruler icon |
| `icon_info.png` | `assets/ui-icons/icon_info.png` | 1254 x 1254 | Yes | Information tooltip 'i' icon |
| `icon_location.png` | `assets/ui-icons/icon_location.png` | 1254 x 1254 | Yes | Location pin symbol icon |
| `icon_lock.png` | `assets/ui-icons/icon_lock.png` | 1254 x 1254 | Yes | Locked door / restricted access padlock icon |
| `icon_menu.png` | `assets/ui-icons/icon_menu.png` | 1254 x 1254 | Yes | Main navigation hamburger menu icon |
| `icon_navigation.png` | `assets/ui-icons/icon_navigation.png` | 1254 x 1254 | Yes | Compass-style waypoint / navigation icon |
| `icon_warning.png` | `assets/ui-icons/icon_warning.png` | 1254 x 1254 | Yes | Hazard / caution exclamation triangle icon |
| `ui_search_icon.png` | `assets/ui-icons/ui_search_icon.png` | 1254 x 1254 | Yes | Magnifying glass search icon (inconsistent 'ui_' prefix) |
| `ui_dropdown_arrow.png` | `assets/ui-icons/ui_dropdown_arrow.png` | 1254 x 1254 | Yes | Dropdown indicator arrow / chevron icon |

## Group: `map-controls` (4 assets)
**Directory**: `assets/map-controls/`  
*Interactive map viewport controls (zoom, pan, orientation)*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `compass.png` | `assets/map-controls/compass.png` | 1254 x 1254 | Yes | North orientation HUD compass dial |
| `map_recenter.png` | `assets/map-controls/map_recenter.png` | 1254 x 1254 | Yes | Recenter viewport on player icon |
| `map_zoom_in.png` | `assets/map-controls/map_zoom_in.png` | 1254 x 1254 | Yes | Map zoom in (+) button control |
| `map_zoom_out.png` | `assets/map-controls/map_zoom_out.png` | 1254 x 1254 | Yes | Map zoom out (-) button control |

## Group: `ui-decorative` (5 assets)
**Directory**: `assets/ui-decorative/`  
*Ornamental borders, corner brackets, dividers, and framing accents*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `ui_gold_corner.png` | `assets/ui-decorative/ui_gold_corner.png` | 1254 x 1254 | Yes | Gold filigree corner accent piece |
| `ui_gold_divider.png` | `assets/ui-decorative/ui_gold_divider.png` | 2172 x 724 | Yes | Horizontal gold dividing bar / separator line |
| `ui_ornament_bottom.png` | `assets/ui-decorative/ui_ornament_bottom.png` | 2172 x 724 | Yes | Bottom ornamental header/footer scroll crest (facing down) |
| `ui_ornament_top.png` | `assets/ui-decorative/ui_ornament_top.png` | 2172 x 724 | Yes | Top ornamental header/footer scroll crest (facing up) |
| `ui_scroll_edge.png` | `assets/ui-decorative/ui_scroll_edge.png` | 768 x 2048 | Yes | Parchment / scroll vertical paper edge strip |

## Group: `welcome` (5 assets)
**Directory**: `assets/welcome/`  
*Landing splash screen graphics, logo, and title illustrations*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `welcome_background.png` | `assets/welcome/welcome_background.png` | 853 x 1844 | No (Opaque) | Full vertical mobile splash wallpaper (853x1844, opaque) |
| `welcome_building.png` | `assets/welcome/welcome_building.png` | 1536 x 1024 | Yes | Pixel art illustration of JEC CSE academic block exterior |
| `welcome_character_boy.png` | `assets/welcome/welcome_character_boy.png` | 1024 x 1536 | Yes | Boy student mascot thumbs-up welcome illustration (1024x1536) |
| `welcome_character_girl.png` | `assets/welcome/welcome_character_girl.png` | 1024 x 1536 | Yes | Girl student mascot peace-sign welcome illustration (1024x1536) |
| `welcome_logo.png` | `assets/welcome/welcome_logo.png` | 1254 x 1254 | Yes | College / project title logo crest emblem |

## Group: `arrival` (3 assets)
**Directory**: `assets/arrival/`  
*Destination arrival celebration badges, sparkles, and banner*

| file name | new path | size (px) | transparent? | notes |
|---|---|:---:|:---:|---|
| `arrival_badge.png` | `assets/arrival/arrival_badge.png` | 1254 x 1254 | Yes | Success arrival ribbon achievement badge |
| `arrival_banner.png` | `assets/arrival/arrival_banner.png` | 2172 x 724 | Yes | Ribbon banner header 'You Have Arrived!' |
| `arrival_sparkle.png` | `assets/arrival/arrival_sparkle.png` | 1254 x 1254 | Yes | Particle sparkle / star celebration effect |

---

## Known issues

### a. Missing files
The following expected assets are absent from `assets/`:
- **Outdoor ground tiles**: No `grass` tiles (e.g. `grass_tile.png`) or `path` tiles (e.g. `outdoor_path.png`, `cobblestone.png`) exist, despite outdoor vegetation being present.
- **Navigation arrival marker**: `arrival_marker.png` is absent from `navigation-markers` (celebration graphics exist in `arrival`, but no floor arrival pin exists).
- **Route visuals**: Group `route-visuals` has 0 assets (no trail dots, dashed path lines, or breadcrumb footprints).
- **Inner wall corners and T-junctions**: Only 4 outer corner pieces exist (`wab_wall_corner_bl`, `br`, `tl`, `tr`); no inner concave corners or T-junctions exist.
- *(Clarification: `faculty_door.png` is **not** missing; faculty cabins WAB 202, 214, 215 share `staffroom_door.png` with WAB 204).*

### b. Size and performance
- **Total storage footprint**: **81.7 MB** across 109 PNG images.
- **Disproportionate resolutions for 16-bit pixel art**:
  - Floor and corridor tiles are **1254 × 1254 px** (~1.1 MB – 1.4 MB each) instead of typical pixel-art tile sizes (16×16, 32×32, 48×48, or 64×64).
  - UI icons (`icon_*.png`, `compass.png`, `ui_search_icon.png`) are **1254 × 1254 px** (200 KB – 490 KB each).
  - UI buttons (`ui_button_*.png`) are **2172 × 724 px** (~690 KB each).
  - Walk sheets (`boy_main_walk_4dir.png`, `girl_main_walk_4dir.png`) are **1024 × 1536 px** (~2.0 MB each).
  - Loading these unscaled in a mobile browser will cause severe memory pressure, long decode latency, and canvas performance drops.

### c. Sprite sheet issues
- **Walk Sheets (`boy_main_walk_4dir.png`, `girl_main_walk_4dir.png`)**:
  - Dimensions: `1024 × 1536 px`.
  - Grid: 4 rows × 4 columns ($256 \times 384$ px per cell).
  - Row direction mapping (top to bottom): Row 0 = Front (South), Row 1 = Back (North), Row 2 = Left (West), Row 3 = Right (East).
  - **Sprite overflow / frame bleeding**: Sprites exceed the 384 px cell boundaries. For instance, shoes from Row 0 protrude into Row 1, feet from Row 1 enter Row 2, and hair from Row 3 protrudes into Row 2. Slicing with standard fixed-grid math results in visual artifacts.
- **Idle Strips (`boy_main_idle_4dir.png`, `girl_main_idle_4dir.png`)**:
  - Dimensions: `1983 × 793 px`.
  - Grid: 1 row × 4 figures.
  - Column direction mapping (left to right): Col 0 = Front, Col 1 = Back, Col 2 = Left, Col 3 = Right.
  - **Non-uniform spacing**: 1983 px is not divisible by 4 ($1983 / 4 = 495.75$). The 4 figures are not positioned on an even mathematical grid; their horizontal center points are situated at approximately $x \approx 315$, $783$, $1228$, and $1661$ px (spacings vary between 434 px and 468 px).

### d. Tile inconsistencies
- **Wall thickness vs. Corner size mismatch**:
  - `wab_wall_horizontal.png` wall thickness is `793 px` (height).
  - `wab_wall_vertical.png` wall thickness is `793 px` (width).
  - Wall corner tiles (`wab_wall_corner_*`) are `1254 × 1254 px` square.
  - Abutting a 793 px straight wall directly to a 1254 px corner leaves a `461 px` gap/step unless scaled or masked.
- **Door size mismatches**:
  - Standard closed doors (`room_door_closed.png`, `lab_door.png`, `staffroom_door.png`, `storage_door_locked.png`, `washroom_door.png`): `1086 × 1448 px` (aspect ratio 3:4).
  - Open room door (`room_door_open.png`): `1254 × 1254 px` (square aspect ratio 1:1).
  - `seminar_door.png`: `1182 × 1330 px`.
  - `library_door.png`: `1139 × 1381 px`.
  - Door shadow (`room_door_shadow.png`): `1774 × 887 px`.
- **Non-seamless floor and corridor textures**:
  - `corridor_floor_vertical.png`: Left edge does not match right edge (mean RGB delta 73.3) because tile patterns and blue/gold border dots are cut off mid-cell.
  - `floor_tile_cream_plain.png`: Opposing horizontal edges differ by 45.2 RGB; grid seams misalign across repeating tiles.

### e. Duplicates and near-duplicates
- **Elevator assets**: `elevator.png` (`1254 × 1254 px`, grey sliding doors, ornate pediment) vs. `elevator_door.png` (`1448 × 1086 px`, blue doors, compact frame).
- **Pillars and columns**: `wab_wall_pillar.png` (`1086 × 1448 px`, single-story) and `wab_wall_column.png` (`887 × 1774 px`, two-story) use the identical architectural artwork scaled/stretched differently.
- **UI Panels**: `ui_panel.png`, `ui_panel_large.png`, and `ui_panel_small.png` are all placed on the exact same `1774 × 887 px` canvas with only subtle padding variations (`ui_panel_small` has content bounding box $1641 \times 696$, nearly identical to `ui_panel`'s $1661 \times 754$).
- **Mirrored ornaments**: `ui_ornament_bottom.png` and `ui_ornament_top.png` (`2172 × 724 px`) are direct vertical mirror images of one another.
- **Student portraits vs. Welcome characters**: `student_male.png` and `student_female.png` (`1024 × 1536 px`) share character models with `welcome_character_boy.png` and `welcome_character_girl.png` but differ in posture and shadow rendering.

### f. Naming inconsistencies
- **Prefixes**: `wab_wall_*` (walls) vs. `campus_*` (bench, lamp, planter) vs. unprefixed furniture (`chair.png`, `small_table.png`, `notice_board.png`, `trash_bin.png`).
- **UI icon naming**: `ui_search_icon.png` uses `ui_*` prefix, whereas all other 11 action icons use `icon_*` (`icon_search.png` would follow the pattern).
- **Dropdown arrow**: `ui_dropdown_arrow.png` is prefixed with `ui_dropdown_*`, whereas standard directional arrows use `icon_arrow.png` or `direction_arrow.png`.
- **Size descriptors**: `small_table.png` uses prefix sizing (`small_*`), while trees use suffix sizing (`tree_large.png`, `tree_small.png`).
- **State suffixes**: Only `room_door_closed.png` and `room_door_open.png` declare states; other doors (`seminar_door.png`, `lab_door.png`) do not have closed/open qualifiers.
- **Gender terminology**: Mixed use of "boy" / "girl" (`boy_main_*`, `girl_main_*`, `welcome_character_boy`) vs. "male" / "female" (`student_male.png`, `washroom_male_sign.png`).
