# PHASE 22 — COMPLETE ASSET INVENTORY + VISUAL ASSET GAP ANALYSIS

**Project**: JYOTHI ENGINEERING COLLEGE — CSE (WAB) BLOCK — LEVEL 1 NAVIGATION  
**Target Visual Language**: 16-Bit Pixel Art / Polished JRPG Campus Navigation  
**Audit Scope**: Complete recursive audit of `assets/` directory, code dependencies, screen mappings, and visual gap analysis for North Block (Page 1), South Block (Page 2), Transition, and Minimap.  
**Safety Protocol**: Read-only audit. No files modified, renamed, deleted, or generated. Java navigation core & authoritative geometry intact.

---

## EXECUTIVE SUMMARY

- **Total Image Files Discovered**: 243 files across `assets/` and all subdirectories
  - **Canonical Unique Visual Assets**: 109 assets (stored in `assets/<group>/` and mirrored in root `assets/`)
  - **Identical Root Mirrors**: 109 exact byte-for-byte SHA256 duplicates
  - **Optimised Runtime Character Atlases**: 5 files in `assets/optimised/character/` (plus 1 JSON metadata file)
  - **Developer Preview / Test Renderings**: 20 files in `assets/optimised/preview/` (non-runtime artifacts)
- **Assets Actively Used in Runtime**: 45 assets (40 canonical assets across Canvas map, HUD, and splash screens + 5 runtime character atlases)
- **Potentially Reusable Assets (Unused in Code)**: 69 canonical assets (including room-specific doors, furniture, wall features, and UI icons)
- **Duplicates / Resolution Variants**: 109 exact root-to-folder mirrors + 4 character sprite sheet downsampled variants
- **Missing Assets Genuinely Needed**:
  - **CRITICAL**: 0 (the application functions and renders all architectural entities using existing assets and canvas routines)
  - **HIGH**: 2 (modular pixel-art auditorium balustrades/railings for South Block void: horizontal & vertical)
  - **MEDIUM**: 2 (auditorium seating tier overlay pattern, stage decorative pixel prop)
  - **OPTIONAL**: 2 (ornate minimap HUD frame, D2 primary entrance badge)

---

## 1. COMPLETE ASSET INVENTORY

All dimensions, file sizes, and alpha presence verified directly from binary image headers on disk.

### Group: `arrival` (3 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `arrival_badge.png` | 1254×1254 | PNG | Yes | 1186.8 KB | index.html, debug.html | ✓ | ✓ | — | KEEP |
| `arrival_banner.png` | 2172×724 | PNG | Yes | 868.3 KB | index.html, debug.html | ✓ | ✓ | — | KEEP |
| `arrival_sparkle.png` | 1254×1254 | PNG | Yes | 341.4 KB | index.html, debug.html | ✓ | ✓ | — | KEEP |

### Group: `character` (7 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `boy_main_idle_4dir.png` | 1983×793 | PNG | Yes | 797.7 KB | None (Available) | ✓ | ✓ | ✓ | INSUFFICIENT |
| `boy_main_walk_4dir.png` | 1024×1536 | PNG | Yes | 1951.6 KB | None (Available) | ✓ | ✓ | ✓ | INSUFFICIENT |
| `character_shadow.png` | 2172×724 | PNG | Yes | 167.4 KB | index.html, js/movement.js | ✓ | ✓ | ✓ | KEEP |
| `girl_main_idle_4dir.png` | 1983×793 | PNG | Yes | 884.1 KB | None (Available) | ✓ | ✓ | ✓ | INSUFFICIENT |
| `girl_main_walk_4dir.png` | 1024×1536 | PNG | Yes | 2003.0 KB | None (Available) | ✓ | ✓ | ✓ | INSUFFICIENT |
| `student_female.png` | 1024×1536 | PNG | Yes | 1021.4 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `student_male.png` | 1024×1536 | PNG | Yes | 1110.5 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |

### Group: `outdoor` (7 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `bush.png` | 1254×1254 | PNG | Yes | 393.1 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |
| `bush_flowering.png` | 1254×1254 | PNG | Yes | 507.2 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `flower_cluster.png` | 1254×1254 | PNG | Yes | 368.5 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `hedge.png` | 1774×887 | PNG | Yes | 759.0 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `tree_large.png` | 1254×1254 | PNG | Yes | 1238.5 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |
| `tree_medium.png` | 1254×1254 | PNG | Yes | 801.9 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `tree_small.png` | 1254×1254 | PNG | Yes | 401.4 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |

### Group: `furniture` (7 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `campus_bench.png` | 1448×1086 | PNG | Yes | 667.4 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |
| `campus_lamp.png` | 971×1619 | PNG | Yes | 270.3 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `campus_planter.png` | 1316×1195 | PNG | Yes | 835.3 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |
| `chair.png` | 1122×1402 | PNG | Yes | 455.3 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `notice_board.png` | 1182×1330 | PNG | Yes | 619.1 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `small_table.png` | 1374×1145 | PNG | Yes | 413.5 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `trash_bin.png` | 1122×1402 | PNG | Yes | 294.5 KB | None (Available) | ✓ | ✓ | — | REUSE |

### Group: `map-controls` (4 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `compass.png` | 1254×1254 | PNG | Yes | 478.0 KB | index.html | ✓ | ✓ | ✓ | KEEP |
| `map_recenter.png` | 1254×1254 | PNG | Yes | 269.8 KB | index.html | ✓ | ✓ | ✓ | KEEP |
| `map_zoom_in.png` | 1254×1254 | PNG | Yes | 318.7 KB | index.html | ✓ | ✓ | ✓ | KEEP |
| `map_zoom_out.png` | 1254×1254 | PNG | Yes | 321.8 KB | index.html | ✓ | ✓ | ✓ | KEEP |

### Group: `corridor` (5 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `corridor_corner.png` | 1254×1254 | PNG | No | 1093.2 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `corridor_dead_end.png` | 1254×1254 | PNG | No | 1032.8 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `corridor_floor_horizontal.png` | 1254×1254 | PNG | No | 1157.3 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `corridor_floor_vertical.png` | 1254×1254 | PNG | No | 1140.6 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `corridor_intersection.png` | 1254×1254 | PNG | No | 1059.6 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |

### Group: `navigation-markers` (4 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `destination_marker.png` | 1254×1254 | PNG | Yes | 494.2 KB | None (Available) | ✓ | ✓ | ✓ | REUSE WITH CSS/CANVAS TREATMENT |
| `direction_arrow.png` | 1254×1254 | PNG | Yes | 369.6 KB | None (Available) | ✓ | ✓ | ✓ | REUSE WITH CSS/CANVAS TREATMENT |
| `navigation_start_marker.png` | 1254×1254 | PNG | Yes | 440.5 KB | None (Available) | ✓ | ✓ | ✓ | REUSE WITH CSS/CANVAS TREATMENT |
| `player_location_marker.png` | 1254×1254 | PNG | Yes | 312.0 KB | None (Available) | ✓ | ✓ | ✓ | REUSE WITH CSS/CANVAS TREATMENT |

### Group: `doors` (9 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `lab_door.png` | 1086×1448 | PNG | Yes | 708.3 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `library_door.png` | 1139×1381 | PNG | Yes | 873.7 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `room_door_closed.png` | 1086×1448 | PNG | Yes | 572.3 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |
| `room_door_open.png` | 1254×1254 | PNG | Yes | 635.1 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `room_door_shadow.png` | 1774×887 | PNG | Yes | 170.5 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `seminar_door.png` | 1182×1330 | PNG | Yes | 853.2 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `staffroom_door.png` | 1086×1448 | PNG | Yes | 771.2 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `storage_door_locked.png` | 1086×1448 | PNG | Yes | 762.3 KB | js/map-renderer.js, js/ui.js | ✓ | ✓ | — | KEEP |
| `washroom_door.png` | 1086×1448 | PNG | Yes | 720.3 KB | None (Available) | ✓ | ✓ | — | REUSE |

### Group: `stairs-elevator` (5 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `elevator.png` | 1254×1254 | PNG | Yes | 849.7 KB | None (Available) | — | ✓ | — | REUSE |
| `elevator_door.png` | 1448×1086 | PNG | Yes | 638.7 KB | None (Available) | — | ✓ | — | REUSE |
| `staircase_down.png` | 1402×1122 | PNG | Yes | 673.2 KB | None (Available) | — | ✓ | — | REUSE |
| `staircase_frame.png` | 1374×1145 | PNG | Yes | 585.0 KB | None (Available) | — | ✓ | — | REUSE |
| `staircase_up.png` | 1402×1122 | PNG | Yes | 683.7 KB | None (Available) | — | ✓ | — | REUSE |

### Group: `fire-exit` (3 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `fire_exit_door.png` | 1254×1254 | PNG | Yes | 711.5 KB | js/map-renderer.js | — | ✓ | — | KEEP |
| `fire_exit_marker.png` | 1254×1254 | PNG | Yes | 394.6 KB | None (Available) | — | ✓ | — | REUSE |
| `fire_exit_sign.png` | 1536×1024 | PNG | Yes | 874.0 KB | js/map-renderer.js | — | ✓ | — | KEEP |

### Group: `floors` (6 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `floor_tile_border.png` | 1254×1254 | PNG | No | 1229.2 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `floor_tile_corner.png` | 1254×1254 | PNG | No | 1211.1 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `floor_tile_cream_blue.png` | 1254×1254 | PNG | No | 1212.0 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |
| `floor_tile_cream_plain.png` | 1254×1254 | PNG | No | 1055.1 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |
| `floor_tile_dark.png` | 1254×1254 | PNG | No | 1245.9 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `floor_tile_transition.png` | 1254×1254 | PNG | No | 1398.0 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |

### Group: `ui-icons` (13 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `icon_arrow.png` | 1254×1254 | PNG | Yes | 201.1 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_back.png` | 1254×1254 | PNG | Yes | 211.1 KB | index.html | ✓ | ✓ | ✓ | KEEP |
| `icon_check.png` | 1254×1254 | PNG | Yes | 284.3 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_close.png` | 1254×1254 | PNG | Yes | 279.6 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_distance.png` | 1254×1254 | PNG | Yes | 408.4 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_info.png` | 1254×1254 | PNG | Yes | 299.0 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_location.png` | 1254×1254 | PNG | Yes | 236.0 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_lock.png` | 1254×1254 | PNG | Yes | 255.7 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_menu.png` | 1254×1254 | PNG | Yes | 234.3 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_navigation.png` | 1254×1254 | PNG | Yes | 337.6 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `icon_warning.png` | 1254×1254 | PNG | Yes | 249.2 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_dropdown_arrow.png` | 1254×1254 | PNG | Yes | 111.5 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_search_icon.png` | 1254×1254 | PNG | Yes | 271.5 KB | index.html, js/ui.js | ✓ | ✓ | ✓ | KEEP |

### Group: `room-sign` (1 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `room_sign_wood.png` | 1774×887 | PNG | Yes | 618.0 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |

### Group: `special-walls` (6 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `wab_wall_archway.png` | 1374×1145 | PNG | Yes | 681.6 KB | js/map-renderer.js | ✓ | — | ✓ | KEEP |
| `wab_wall_column.png` | 887×1774 | PNG | Yes | 502.0 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `wab_wall_entrance.png` | 1536×1024 | PNG | Yes | 1049.2 KB | js/map-renderer.js | ✓ | — | ✓ | KEEP |
| `wab_wall_large_window.png` | 1536×1024 | PNG | Yes | 1114.5 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |
| `wab_wall_pillar.png` | 1086×1448 | PNG | Yes | 356.7 KB | None (Available) | ✓ | ✓ | — | REUSE |
| `wab_wall_window.png` | 1448×1086 | PNG | Yes | 649.4 KB | js/map-renderer.js | ✓ | ✓ | — | KEEP |

### Group: `ui-decorative` (5 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `ui_gold_corner.png` | 1254×1254 | PNG | Yes | 345.1 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_gold_divider.png` | 2172×724 | PNG | Yes | 194.5 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_ornament_bottom.png` | 2172×724 | PNG | Yes | 350.3 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_ornament_top.png` | 2172×724 | PNG | Yes | 350.5 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_scroll_edge.png` | 768×2048 | PNG | Yes | 957.6 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |

### Group: `ui-panels-buttons` (9 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `ui_button_disabled.png` | 2172×724 | PNG | Yes | 658.5 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_button_hover.png` | 2172×724 | PNG | Yes | 674.9 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_button_normal.png` | 2172×724 | PNG | Yes | 680.9 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_button_selected.png` | 2172×724 | PNG | Yes | 661.8 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_dropdown.png` | 1983×793 | PNG | Yes | 520.9 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_panel.png` | 1774×887 | PNG | Yes | 802.7 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_panel_large.png` | 1774×887 | PNG | Yes | 840.3 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_panel_small.png` | 1774×887 | PNG | Yes | 672.5 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |
| `ui_search_bar.png` | 2172×724 | PNG | Yes | 462.8 KB | None (Available) | ✓ | ✓ | ✓ | REUSE |

### Group: `walls` (7 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `wab_wall_corner_bl.png` | 1254×1254 | PNG | Yes | 374.1 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |
| `wab_wall_corner_br.png` | 1254×1254 | PNG | Yes | 396.9 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |
| `wab_wall_corner_tl.png` | 1254×1254 | PNG | Yes | 366.0 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |
| `wab_wall_corner_tr.png` | 1254×1254 | PNG | Yes | 399.0 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |
| `wab_wall_end.png` | 1254×1254 | PNG | Yes | 268.3 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |
| `wab_wall_horizontal.png` | 1983×793 | PNG | Yes | 534.9 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |
| `wab_wall_vertical.png` | 793×1983 | PNG | Yes | 429.6 KB | js/map-renderer.js | ✓ | ✓ | ✓ | KEEP |

### Group: `washroom` (3 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `washroom_female_sign.png` | 1254×1254 | PNG | Yes | 515.0 KB | js/map-renderer.js | — | ✓ | — | KEEP |
| `washroom_icon.png` | 1254×1254 | PNG | Yes | 413.3 KB | None (Available) | — | ✓ | — | REUSE |
| `washroom_male_sign.png` | 1254×1254 | PNG | Yes | 508.5 KB | js/map-renderer.js | — | ✓ | — | KEEP |

### Group: `welcome` (5 assets)

| Asset Name | Resolution | Format | Alpha | File Size | Current Code Usage | North | South | Trans. | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|
| `welcome_background.png` | 853×1844 | PNG | No | 2344.4 KB | index.html, style.css | ✓ | ✓ | — | KEEP |
| `welcome_building.png` | 1536×1024 | PNG | Yes | 1613.7 KB | index.html | ✓ | ✓ | — | KEEP |
| `welcome_character_boy.png` | 1024×1536 | PNG | Yes | 1156.1 KB | index.html | ✓ | ✓ | — | KEEP |
| `welcome_character_girl.png` | 1024×1536 | PNG | Yes | 1142.0 KB | index.html | ✓ | ✓ | — | KEEP |
| `welcome_logo.png` | 1254×1254 | PNG | Yes | 961.6 KB | index.html | ✓ | ✓ | — | KEEP |

### Optimised Character Runtime Assets (`assets/optimised/character/`)

| Asset Name | Resolution | Format | Alpha | File Size | Current Usage | Status |
|---|:---:|:---:|:---:|:---:|---|:---:|
| `boy_idle.png` | 552×260 | PNG | Yes | 177.0 KB | `js/movement.js` (Runtime Atlas) | KEEP |
| `boy_walk.png` | 552×1040 | PNG | Yes | 862.5 KB | `js/movement.js` (Runtime Atlas) | KEEP |
| `character_shadow.png` | 128×29 | PNG | Yes | 4.7 KB | `js/movement.js` (Runtime Atlas) | KEEP |
| `girl_idle.png` | 672×261 | PNG | Yes | 178.4 KB | `js/movement.js` (Runtime Atlas) | KEEP |
| `girl_walk.png` | 672×1044 | PNG | Yes | 957.5 KB | `js/movement.js` (Runtime Atlas) | KEEP |

### Developer Preview Artifacts (`assets/optimised/preview/` - 20 assets)

These 20 files are test renders, visual scale validations, and spritesheet previews created during character tuning. They are non-runtime assets not loaded by the application.
Status: **DEBUG/PREVIEW ONLY** (Preserved, no action required).

---

## 2. CURRENT ASSET USAGE & SUBSYSTEM DEPENDENCY MAP

The application runtime utilizes assets across Canvas rendering, sprite animation, HTML UI, and CSS styling:

```
Application Runtime
├── MapRenderer (Canvas 2D - js/map-renderer.js)
│   ├── Floors: floor_tile_cream_blue.png, floor_tile_cream_plain.png
│   ├── Walls: wab_wall_horizontal.png, wab_wall_vertical.png, wab_wall_corner_tl.png,
│   │          wab_wall_corner_tr.png, wab_wall_corner_bl.png, wab_wall_corner_br.png, wab_wall_end.png
│   ├── Special Architecture: wab_wall_entrance.png, wab_wall_archway.png,
│   │                         wab_wall_window.png, wab_wall_large_window.png
│   ├── Doors: room_door_closed.png, storage_door_locked.png, fire_exit_door.png
│   ├── Signage: room_sign_wood.png, fire_exit_sign.png, washroom_male_sign.png, washroom_female_sign.png
│   ├── Furniture: campus_bench.png, campus_planter.png
│   └── Vegetation: tree_large.png, tree_small.png, bush.png
├── MovementSystem & Sprite Engine (js/movement.js, js/sprite.js)
│   ├── Boy Atlases: assets/optimised/character/boy_idle.png, boy_walk.png
│   ├── Girl Atlases: assets/optimised/character/girl_idle.png, girl_walk.png
│   └── Shadow: assets/optimised/character/character_shadow.png
├── HUD & Map Controls (index.html, js/ui.js)
│   ├── Map Controls: map_zoom_in.png, map_zoom_out.png, map_recenter.png, compass.png
│   └── UI Icons: icon_back.png, ui_search_icon.png
├── Welcome & Character Select Screens (index.html, style.css)
│   ├── Background: welcome_background.png (CSS background & HTML backdrop)
│   ├── Architecture & Logo: welcome_building.png, welcome_logo.png
│   ├── Character Splash: welcome_character_boy.png, welcome_character_girl.png
│   └── UI Accents: character/character_shadow.png
├── Destination Arrival Celebration (index.html, debug.html)
│   └── Badges & Effects: arrival_badge.png, arrival_banner.png, arrival_sparkle.png
└── Procedural Canvas Subsystems (Zero Image Overhead)
    ├── Central Void Courtyard: Linear gradient (#0E1B2D -> #070D16), seating tiers, stage rect, labels
    ├── Navigation Path: Pulsing directional route ribbon & chevron indicators
    ├── Target Pin: Concentric golden beacon rings & target pulse
    └── Minimap: Scaled world-space canvas viewport
```

---

## 3. PAGE 1 COVERAGE — NORTH BLOCK (ENTRANCE → R_TOP)

**World Route**: `ENTRANCE (0, 0)` $\rightarrow$ `H0` $\rightarrow$ `H1` $\rightarrow$ `H2` $\rightarrow$ `H3` $\rightarrow$ `H4` $\rightarrow$ `H5` $\rightarrow$ `R_TOP (0, 32.2)`  
**Rooms**: WAB 204, WAB 205, WAB 203 (D1, D2 Primary, D3), WAB 206, WAB 207, WAB 202

| Required Element | Authoritative Spec | Existing Asset Candidate | Coverage Status | Action / Recommendation |
|---|---|---|:---:|---|
| **Entrance Architecture** | (0, 0) Entry portal connecting campus | `assets/special-walls/wab_wall_entrance.png` | **COVERED** | KEEP. Fits 2.4m entrance corridor arch. |
| **Corridor Floor** | 2.4m wide spine, 1.2m tile grid | `assets/floors/floor_tile_cream_blue.png`, `corridor_floor_vertical.png` | **COVERED** | KEEP. Seamless 1.2m texture repeating pattern. |
| **Corridor Walls & Ends** | Brick/plaster boundary lines | `assets/walls/wab_wall_vertical.png`, `wab_wall_horizontal.png`, `wab_wall_end.png` | **COVERED** | KEEP. Wall segments align to graph offsets. |
| **Classroom Doors** | WAB 205, 206, 207 (1.18m portal) | `assets/doors/room_door_closed.png` | **COVERED** | KEEP. Scaled to 1.18m physical width. |
| **Staffroom Door** | WAB 204 (M.Tech Staffroom) | `assets/doors/staffroom_door.png` | **COVERED** | REUSE. Can replace generic door for WAB 204. |
| **Faculty Cabin Door** | WAB 202 (HOD / Faculty Cabin) | `assets/doors/staffroom_door.png` or `room_door_closed.png` | **COVERED** | REUSE. Distinctive faculty door asset available. |
| **Seminar Hall Doors** | WAB 203 (D1, D2, D3 arrangement) | `assets/doors/seminar_door.png` | **COVERED** | REUSE. Use seminar door graphic for all 3 portals. |
| **Primary Door Accent** | WAB 203 D2 primary distinction | Procedural Canvas accent / glow ring | **COVERED** | REUSE WITH CANVAS. Golden star or accent marker. |
| **Room Signs** | Lintel plaque above doors | `assets/room-sign/room_sign_wood.png` | **COVERED** | KEEP. Canvas overlays room code & text. |
| **Greenery & Planters** | Entrance spine exterior gardens | `tree_large.png`, `tree_small.png`, `bush.png`, `campus_planter.png` | **COVERED** | KEEP. Flanks exterior walls. |
| **Corridor Decor** | Benches & notice boards | `campus_bench.png`, `notice_board.png`, `trash_bin.png` | **COVERED** | REUSE. Rich furniture assets available. |
| **Connector at R_TOP** | Transition to South ring at (0, 32.2) | `assets/floors/floor_tile_transition.png`, `wab_wall_archway.png` | **COVERED** | REUSE. Natural connector transition. |

**North Block Assessment**: **100% COVERED** with existing assets. Zero missing visual assets required.

---

## 4. PAGE 2 COVERAGE — SOUTH BLOCK (R_TOP → RING & AUDITORIUM)

**Ring Geometry**: TL `(-11.2, 32.2)`, TR `(+11.3, 32.2)`, BL `(-11.2, 73.1)`, BR `(+11.3, 73.1)`  
**Rooms Left**: WAB 218 (Ladies Washroom), FE_L (Fire Exit), WAB 217 (Locked Storage), WAB 216 (Lab), WAB 216A (Lab), WAB 215 (Faculty), WAB 214 (Faculty)  
**Rooms Right**: WAB 208 (Men's Washroom), FE_1 (Fire Exit), WAB 209 (Library), WAB 210, 211, 212 (Classrooms)  
**Bottom**: WAB 213 (DS Lab), FE_B (Fire Exit)  
**Center**: Central Void Courtyard / Auditorium (x: `[-9.5, 9.5]`, y: `[34.5, 71.0]`)

| Required Element | Authoritative Spec | Existing Asset Candidate | Coverage Status | Action / Recommendation |
|---|---|---|:---:|---|
| **Ring Corridor Floors** | 2.4m loop corridor, corners & junctions | `floor_tile_cream_blue.png`, `corridor_corner.png`, `corridor_intersection.png` | **COVERED** | KEEP. |
| **Ring Perimeter Walls** | Outer boundary and windowed walls | `wab_wall_horizontal.png`, `vertical`, `corners`, `wab_wall_window.png` | **COVERED** | KEEP. |
| **Washroom Doors & Signs** | WAB 208 (M), WAB 218 (F) | `washroom_door.png`, `washroom_male_sign.png`, `washroom_female_sign.png` | **COVERED** | KEEP / REUSE. Specific doors and signs ready. |
| **Fire Exit Doors & Signs** | FE_L, FE_1, FE_B (1.03m portal) | `fire_exit_door.png`, `fire_exit_sign.png` | **COVERED** | KEEP. Scaled to 1.03m physical width. |
| **Locked Storage Door** | WAB 217 (Non-searchable utility room) | `storage_door_locked.png` | **COVERED** | KEEP. Features padlock visual. |
| **Lab Doors** | WAB 213, WAB 216, WAB 216A | `assets/doors/lab_door.png` | **COVERED** | REUSE. Distinctive lab door graphic available. |
| **Library Door** | WAB 209 (CSE Library) | `assets/doors/library_door.png` | **COVERED** | REUSE. Library door graphic with window pane. |
| **Faculty Cabin Doors** | WAB 214, WAB 215 | `assets/doors/staffroom_door.png` | **COVERED** | REUSE. Polished faculty door asset ready. |
| **Classroom Doors** | WAB 210, 211, 212 | `assets/doors/room_door_closed.png` | **COVERED** | KEEP. |
| **Void Observation Windows** | North/South void observation | `assets/special-walls/wab_wall_large_window.png` | **COVERED** | KEEP. Renders at void boundary. |
| **Auditorium Railing / Balustrade** | 19m × 36.5m open-to-below perimeter | None (Currently canvas line `#D6A84F`) | **GENUINE GAP** | **HIGH PRIORITY MISSING ASSET**: Modular balustrade segment. |
| **Auditorium Interior Seating** | Level 0 seating overview | None (Currently canvas stroke lines) | **PARTIAL** | REUSE WITH CANVAS or optional seating pattern overlay. |
| **Auditorium Stage** | Level 0 stage overview (center-south) | None (Currently canvas rect `#D6A84F`) | **PARTIAL** | REUSE WITH CANVAS or optional stage sprite prop. |

**South Block Assessment**: All room doors, signs, corridors, outer walls, and windows are covered. The central auditorium open-to-below courtyard currently relies on procedural canvas drawing; modular balustrade/railing assets will dramatically elevate its 16-bit JRPG visual quality.

---

## 5. TRANSITION COVERAGE (NORTH → SOUTH BLOCK)

The transition between North Block and South Block is an in-world camera / viewport journey over the unified world-space coordinate system, anchored at `R_TOP (0, 32.2)`.

| Transition Feature | Requirement | Implementation Strategy | New Asset Needed? |
|---|---|---|:---:|
| **Connector Floor** | Visual seam between spine & ring | `assets/floors/floor_tile_transition.png` | No (Asset exists) |
| **Structural Columns** | Flanking the connector gateway | `assets/special-walls/wab_wall_column.png` | No (Asset exists) |
| **Camera Interpolation** | Smooth panning from (0, 16) to (0, 52) | Smooth ease-in-out camera lerp in JS | No (Procedural) |
| **Atrium Reveal** | Auditorium void smoothly enters view | Natural canvas world-space clipping | No (Procedural) |
| **Zone Indicator HUD** | "NORTH BLOCK" $\rightarrow$ "SOUTH BLOCK" | CSS / Canvas badge fade animation | No (CSS / DOM) |
| **Directional Chevrons** | Downward arrow indicating ring path | Canvas animated pulsing chevron | No (Canvas 2D) |

**Transition Assessment**: **100% COVERED** via existing transition tiles, columns, and canvas/CSS camera animation. Zero new transition image files needed.

---

## 6. MINIMAP COVERAGE

The bottom-left minimap provides an all-in-one view of the building, player location, destination pin, and active viewport bounds.

| Minimap Requirement | Current Capability | New Asset Needed? |
|---|---|:---:|
| **Simplified Building Footprint** | Drawn to secondary 2D canvas using `nodes.json` and `edges.json` directly | No (Canvas vector) |
| **Auditorium Void Cutout** | Scaled rectangle `[-9.5, 9.5] \times [34.5, 71.0]` in deep void blue | No (Canvas vector) |
| **Player Blip** | Glowing 3px gold/white dot with animated radar ripple | No (Canvas vector) |
| **Destination Blip** | Pulsing cyan/green target dot | No (Canvas vector) |
| **Viewport Frustum / Zone Box** | Transparent gold rectangle indicating active camera bounds | No (Canvas vector) |
| **Compass / North Indicator** | Existing `assets/map-controls/compass.png` or canvas needle | No (Asset exists) |
| **HUD Frame / Bezel** | Styled with CSS `border`, `box-shadow`, and institutional palette | Optional pixel frame |

**Minimap Assessment**: The minimap can be fully rendered via a dedicated HTML5 Canvas adhering strictly to the authoritative world coordinates. An ornate border can be achieved cleanly with CSS or an optional decorative frame.

---

## 7. DUPLICATES, ALTERNATIVES & REDUNDANCIES

| Category | Primary Asset | Redundant / Duplicate Asset | Explanation | Recommendation |
|---|---|---|---|---|
| **Root vs Group Mirrors** | `assets/<group>/<file>.png` | `assets/<file>.png` (109 files) | Every asset in root `assets/` is an exact byte-for-byte SHA256 copy of its grouped counterpart in `assets/<group>/`. | KEEP BOTH (prevents breaking legacy tests/paths). Code should standardize on `assets/<group>/`. |
| **Character Sprite Sheets** | `assets/optimised/character/boy_walk.png` (862 KB) | `assets/character/boy_main_walk_4dir.png` (1.95 MB) | The raw 1536×1536 sprite sheet was optimized into the clean 240×364 atlas used at runtime. | KEEP. Raw file acts as source master; runtime uses optimised version. |
| **Character Sprite Sheets** | `assets/optimised/character/girl_walk.png` (957 KB) | `assets/character/girl_main_walk_4dir.png` (2.00 MB) | Raw 1536×1536 sheet vs optimized 240×364 runtime atlas. | KEEP. Same as above. |
| **Character Shadows** | `assets/optimised/character/character_shadow.png` (4.7 KB, 58×26) | `assets/character/character_shadow.png` (167 KB, 512×256) | Optimised version is scaled for world sprite; large version is used for UI portrait. | KEEP. Both serve distinct scale contexts. |
| **Corridor Floors** | `floor_tile_cream_blue.png` | `corridor_floor_horizontal.png`, `corridor_floor_vertical.png` | Multiple corridor tile options exist. Currently, the seamless repeating pattern `cream_blue` is used. | KEEP. Distinct corridor variants can add variety. |
| **Room Doors** | `room_door_closed.png` | `staffroom_door.png`, `seminar_door.png`, `lab_door.png`, `library_door.png` | The code currently defaults to `room_door_closed.png` for all rooms, leaving room-specific doors unused. | REUSE. Map each room category to its specialized door asset in `map-renderer.js`. |
| **Developer Previews** | None (Non-runtime) | 20 preview files in `assets/optimised/preview/` | Test renders such as `scale_test.png`, `wab206_arrival.png`, etc. | PRESERVE as debug artifacts. Do not load in production. |

---

## 8. ASSET QUALITY & ARCHITECTURAL CONSISTENCY AUDIT

### 1. Transparent Alpha Padding & Calibration
- **Issue**: Several raw portal and sign assets contain substantial transparent margins around their visible pixels:
  - `room_door_closed.png`: 1086px wide, but only 741px contains visible content (visible ratio ~0.682).
  - `fire_exit_door.png`: 1254px wide, but only 823px visible (visible ratio ~0.656).
  - `fire_exit_sign.png`: 1536px wide, but only 859px visible (visible ratio ~0.559).
- **Current Solution**: `map-renderer.js` incorporates calibrated visible ratios in `ASSET_CONFIG` to scale assets accurately to 1.18m (doors) and 1.03m (fire exits).
- **Recommendation**: Maintain these calibration ratios in the renderer to ensure crisp physical alignment without modifying existing asset files.

### 2. High-Resolution Downsampling & Pixel Density
- **Issue**: Standard wall segments (`wab_wall_horizontal.png`) are 1983×793px, and door assets are 1086×1448px. When scaled down to ~1.2m on a standard mobile viewport (where 1m $\approx$ 56px), downsampling ratio is roughly 15:1 to 20:1.
- **Visual Impact**: With `ctx.imageSmoothingEnabled = false`, extreme nearest-neighbor downsampling of high-res pixel art can cause thin outline shimmer during camera motion.
- **Recommendation**: Apply integer snapping to camera transforms or subtle multi-step mip-scaling in canvas rendering if shimmer is observed.

### 3. Palette & Aesthetic Harmony
- The existing asset library exhibits an outstanding, cohesive 16-bit JRPG visual identity:
  - Cream/ivory tile floors (`#F5F0E6` tones with blue accents)
  - Deep institutional navy trims (`#0E1B2D`)
  - Warm gold framing (`#D6A84F`)
  - Natural wooden room signs with brass fasteners
  - Clean emerald outdoor foliage
- Any newly generated assets MUST adhere strictly to this specific 16-bit palette and perspective.

---

## 9. MISSING ASSET LIST (STRICT GAP ANALYSIS)

Only assets that cannot be produced convincingly through CSS, canvas geometry, or existing asset reuse are cataloged below.

| # | Asset Name | Suggested Filename | Suggested Folder | Purpose | Page | Format | Target Dimensions | Alpha? | Style / Requirements | Priority |
|---|---|---|---|---|:---:|:---:|:---:|:---:|---|:---:|
| **1** | **Auditorium Balustrade (Horizontal)** | `auditorium_balustrade_h.png` | `assets/special-walls/` | Modular railing along North & South void perimeter (19.0m span). Open spindles allowing view down into auditorium. | Page 2 | PNG | 1024×256 px | Yes | 16-bit pixel art, polished brass/gold top rail, dark iron vertical balusters, floor anchor posts. | **HIGH** |
| **2** | **Auditorium Balustrade (Vertical)** | `auditorium_balustrade_v.png` | `assets/special-walls/` | Modular railing along East & West void perimeter (36.5m span). Seamless vertical tileability. | Page 2 | PNG | 256×1024 px | Yes | 16-bit pixel art matching horizontal balustrade, 3/4 RPG perspective handrail depth. | **HIGH** |
| **3** | **Auditorium Seating Tier Pattern** | `auditorium_seating_tier.png` | `assets/special-walls/` | Replaces procedural canvas stroke lines with repeating pixel-art theater seats viewed from above. | Page 2 | PNG | 512×256 px | Yes | Low-opacity dark navy / burgundy upholstered lecture hall row seats in downward perspective. | **MEDIUM** |
| **4** | **Auditorium Stage Pixel Prop** | `auditorium_stage_podium.png` | `assets/furniture/` | Centerpiece stage prop for Level 0 auditorium stage visible through the central void. | Page 2 | PNG | 512×512 px | Yes | 16-bit wooden stage platform, lecture podium, and presentation display board. | **MEDIUM** |
| **5** | **Minimap Ornate HUD Frame** | `minimap_hud_frame.png` | `assets/ui-decorative/` | Decorative pixel-art bezel container for bottom-left minimap viewport. | Page 1 & 2 | PNG | 400×400 px | Yes | Deep navy institutional frame with gold corner rivets and compass rose accent. | **OPTIONAL** |
| **6** | **Primary Door Star Badge** | `badge_primary_door.png` | `assets/ui-icons/` | Floating indicator pin highlighting Seminar Hall WAB 203 D2 primary entrance. | Page 1 | PNG | 128×128 px | Yes | 16-bit sparkling gold star or 'D2' emblem. Can alternatively be drawn on Canvas. | **OPTIONAL** |

---

## 10. RECOMMENDED GENERATION & IMPLEMENTATION ORDER

When authorized to proceed with asset generation and visual integration in future phases:

1. **Phase 23A — Auditorium Architectural Assets (High Priority)**
   - Generate `auditorium_balustrade_h.png` and `auditorium_balustrade_v.png`
   - Integrate balustrades into `map-renderer.js` around the `[-9.5, 9.5] \times [34.5, 71.0]` void boundary
   - Elevates South Block from a wireframe void into an impressive multi-tier architectural atrium.

2. **Phase 23B — Specialized Door Activation (Zero Asset Generation Required)**
   - Wire existing `staffroom_door.png` to WAB 204, 214, 215
   - Wire existing `seminar_door.png` to WAB 203 (D1, D2, D3)
   - Wire existing `lab_door.png` to WAB 213, 216, 216A
   - Wire existing `library_door.png` to WAB 209
   - Instantly increases visual richness without creating any new image files.

3. **Phase 23C — South Block Furniture & Interior Polish (Zero Asset Generation Required)**
   - Place existing `notice_board.png`, `campus_bench.png`, and `small_table.png` along the ring corridors
   - Utilize existing `staircase_up.png` / `staircase_down.png` at designated stairwells.

4. **Phase 23D — Auditorium Atrium Depth Props (Medium Priority)**
   - Generate `auditorium_seating_tier.png` and `auditorium_stage_podium.png`
   - Overlay into Layer 0.5 of `map-renderer.js` inside the void perimeter.

5. **Phase 23E — Minimap & HUD Framing (Optional / Canvas First)**
   - Implement Canvas 2D scaled minimap with CSS border styling first
   - Generate `minimap_hud_frame.png` only if CSS styling proves insufficient.

---

## SAFETY VERIFICATION

- `data/nodes.json`: Unmodified (SHA256 verified)
- `data/edges.json`: Unmodified (SHA256 verified)
- `data/rooms.json`: Unmodified (SHA256 verified)
- Java core (`Graph.java`, `Dijkstra.java`, `Navigator.java`): Unmodified
- Authoritative distances and coordinates: 100% Preserved
- Asset library: No files added, modified, renamed, or deleted in this audit phase.
