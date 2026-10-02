/**
 * College Navigator - Map Renderer
 * Phase 7A: Floor Scale & Grid Alignment
 */

function getDoorLabelLayout(n) {
  if (n.y > 74.0 && n.x < 10.0) {
    return { x: n.x, y: n.y + 1.4, anchor: "middle" };
  } else if (n.x < 0) {
    return { x: n.x - 0.8, y: n.y + 0.25, anchor: "end" };
  } else {
    return { x: n.x + 0.8, y: n.y + 0.25, anchor: "start" };
  }
}

function getFireExitLabelLayout(n) {
  if (n.id === "FE_B") {
    return { x: n.x - 0.8, y: n.y + 0.25, anchor: "end" };
  } else if (n.x < 0) {
    return { x: n.x - 0.8, y: n.y + 0.25, anchor: "end" };
  } else {
    return { x: n.x + 0.8, y: n.y + 0.25, anchor: "start" };
  }
}

export const MapRenderer = (function() {
    const CONFIG = {
        corridorRadius: 1.2,
        corridorWidth: 2.4, // 2 * radius
        tileWorldSize: 1.2  // 1 tile = 1.2m of physical space
    };

    const ASSET_CONFIG = {
        ROOM_DOOR_WIDTH_M: 1.18,   // Authoritative physical width of visible door portal
        FIRE_EXIT_WIDTH_M: 1.03,   // Authoritative physical width of visible fire exit portal

        // Visible content ratios calibrated from non-zero alpha inspection:
        // room_door_closed: 741px visible out of 1086px width (741 / 1086 = 0.68232)
        // fire_exit_door: 823px visible out of 1254px width (823 / 1254 = 0.65630)
        // room_sign_wood: 1689px visible out of 1774px width (1689 / 1774 = 0.95209)
        // fire_exit_sign: 859px visible out of 1536px width (859 / 1536 = 0.55924)
        ROOM_DOOR_VISIBLE_RATIO: 741 / 1086,
        FIRE_EXIT_VISIBLE_RATIO: 823 / 1254,
        ROOM_SIGN_VISIBLE_RATIO: 1689 / 1774,
        FIRE_SIGN_VISIBLE_RATIO: 859 / 1536,

        // Deterministic orientation: corridorAngle = Math.atan2(dy, dx) points radially outward into the room.
        // A rotation offset of -Math.PI / 2 (-90°) rotates the door frame flush with the corridor boundary,
        // placing the top lintel and attached sign toward the corridor side.
        ROOM_DOOR_ROTATION_OFFSET: -Math.PI / 2, 
        FIRE_EXIT_ROTATION_OFFSET: -Math.PI / 2,
        SIGN_OFFSET_M: 0.2 
    };

    const assets = {
        cream_blue: null,
        cream_plain: null,
        transition_tile: null,
        floor_border: null,
        floor_corner: null,
        floor_dark: null,
        room_door: null,
        room_door_open: null,
        room_door_shadow: null,
        fire_door: null,
        storage_door: null,
        staffroom_door: null,
        seminar_door: null,
        lab_door: null,
        library_door: null,
        washroom_door: null,
        room_sign: null,
        fire_sign: null,
        washroom_m: null,
        washroom_f: null,
        washroom_icon: null,
        fire_exit_marker: null,
        wall_h: null,
        wall_v: null,
        corner_tl: null,
        corner_tr: null,
        corner_bl: null,
        corner_br: null,
        wall_end: null,
        entrance: null,
        archway: null,
        window: null,
        large_window: null,
        column: null,
        pillar: null,
        planter: null,
        bench: null,
        lamp: null,
        notice_board: null,
        chair: null,
        small_table: null,
        trash_bin: null,
        tree_large: null,
        tree_medium: null,
        tree_small: null,
        bush: null,
        bush_flowering: null,
        flower_cluster: null,
        hedge: null,
        // Environment Grounds
        grass_tile: null,
        grass_tile_variation: null,
        grass_edge: null,
        grass_edge_corner: null,
        grass_edge_horizontal: null,
        grass_edge_vertical: null,
        pavement_tile: null,
        pavement_grass_transition: null,
        campus_curb: null,
        planter_bed: null,
        small_flower_patch: null,
        ground_decal: null,
        // Corridor Assets
        corridor_floor_horizontal: null,
        corridor_floor_vertical: null,
        corridor_corner: null,
        corridor_intersection: null,
        corridor_dead_end: null,
        // Navigation Markers
        destination_marker: null,
        direction_arrow: null,
        navigation_start_marker: null,
        player_location_marker: null,
        // UI Icons & Accents
        icon_lock: null,
        icon_distance: null,
        icon_location: null,
        icon_navigation: null,
        icon_arrow: null,
        icon_warning: null,
        icon_check: null,
        icon_close: null,
        icon_info: null,
        icon_menu: null,
        ui_dropdown_arrow: null,
        ui_gold_divider: null,
        ui_gold_corner: null,
        ui_ornament_top: null,
        ui_ornament_bottom: null,
        ui_scroll_edge: null,
        ui_panel: null,
        ui_panel_large: null,
        ui_panel_small: null,
        ui_button_normal: null,
        ui_button_hover: null,
        ui_button_selected: null,
        ui_button_disabled: null,
        ui_search_bar: null,
        ui_dropdown: null,
        // Phase 23 Auditorium Assets
        balustrade_h: null,
        balustrade_v: null,
        seating: null,
        stage: null,
        // Fire Exit Stairwell Asset
        staircase_down: null
    };

    const STAIRS_ELEVATOR_CONFIG = {
        enabled: false,
        note: "Level 1 scope contains no vertical transit nodes. Registered for future multi-floor navigation.",
        paths: {
            elevator: 'assets/stairs-elevator/elevator.png',
            elevator_door: 'assets/stairs-elevator/elevator_door.png',
            staircase_up: 'assets/stairs-elevator/staircase_up.png',
            staircase_down: 'assets/stairs-elevator/staircase_down.png',
            staircase_frame: 'assets/stairs-elevator/staircase_frame.png'
        }
    };

    let floorPattern = null;
    let grassPattern = null;
    let pavementPattern = null;
    let interBayPattern = null;
    let darkFloorPattern = null;
    let corridorHPattern = null;
    let corridorVPattern = null;

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn(`[MapRenderer] Non-critical asset load warning: ${src}`);
                resolve(null);
            };
            img.src = src;
        });
    }

    async function init() {
        try {
            const assetMap = [
                // Core Floors & Transitions
                ['cream_blue', 'assets/floors/floor_tile_cream_blue.png'],
                ['cream_plain', 'assets/floors/floor_tile_cream_plain.png'],
                ['transition_tile', 'assets/floors/floor_tile_transition.png'],
                ['floor_border', 'assets/floors/floor_tile_border.png'],
                ['floor_corner', 'assets/floors/floor_tile_corner.png'],
                ['floor_dark', 'assets/floors/floor_tile_dark.png'],

                // Doors & Portals
                ['room_door', 'assets/doors/room_door_closed.png'],
                ['room_door_open', 'assets/doors/room_door_open.png'],
                ['room_door_shadow', 'assets/doors/room_door_shadow.png'],
                ['fire_door', 'assets/fire-exit/fire_exit_door.png'],
                ['storage_door', 'assets/doors/storage_door_locked.png'],
                ['staffroom_door', 'assets/doors/staffroom_door.png'],
                ['seminar_door', 'assets/doors/seminar_door.png'],
                ['lab_door', 'assets/doors/lab_door.png'],
                ['library_door', 'assets/doors/library_door.png'],
                ['washroom_door', 'assets/doors/washroom_door.png'],

                // Signage & Markers
                ['room_sign', 'assets/room-sign/room_sign_wood.png'],
                ['fire_sign', 'assets/fire-exit/fire_exit_sign.png'],
                ['washroom_m', 'assets/washroom/washroom_male_sign.png'],
                ['washroom_f', 'assets/washroom/washroom_female_sign.png'],
                ['washroom_icon', 'assets/washroom/washroom_icon.png'],
                ['fire_exit_marker', 'assets/fire-exit/fire_exit_marker.png'],

                // Structural Walls
                ['wall_h', 'assets/walls/wab_wall_horizontal.png'],
                ['wall_v', 'assets/walls/wab_wall_vertical.png'],
                ['corner_tl', 'assets/walls/wab_wall_corner_tl.png'],
                ['corner_tr', 'assets/walls/wab_wall_corner_tr.png'],
                ['corner_bl', 'assets/walls/wab_wall_corner_bl.png'],
                ['corner_br', 'assets/walls/wab_wall_corner_br.png'],
                ['wall_end', 'assets/walls/wab_wall_end.png'],

                // Architectural Special Walls
                ['entrance', 'assets/special-walls/wab_wall_entrance.png'],
                ['archway', 'assets/special-walls/wab_wall_archway.png'],
                ['window', 'assets/special-walls/wab_wall_window.png'],
                ['large_window', 'assets/special-walls/wab_wall_large_window.png'],
                ['column', 'assets/special-walls/wab_wall_column.png'],
                ['pillar', 'assets/special-walls/wab_wall_pillar.png'],

                // Campus Furniture
                ['planter', 'assets/furniture/campus_planter.png'],
                ['bench', 'assets/furniture/campus_bench.png'],
                ['lamp', 'assets/furniture/campus_lamp.png'],
                ['notice_board', 'assets/furniture/notice_board.png'],
                ['chair', 'assets/furniture/chair.png'],
                ['small_table', 'assets/furniture/small_table.png'],
                ['trash_bin', 'assets/furniture/trash_bin.png'],

                // Outdoor Vegetation & Landscaping
                ['tree_large', 'assets/outdoor/tree_large.png'],
                ['tree_medium', 'assets/outdoor/tree_medium.png'],
                ['tree_small', 'assets/outdoor/tree_small.png'],
                ['bush', 'assets/outdoor/bush.png'],
                ['bush_flowering', 'assets/outdoor/bush_flowering.png'],
                ['flower_cluster', 'assets/outdoor/flower_cluster.png'],
                ['hedge', 'assets/outdoor/hedge.png'],

                // Environment Campus Grounds
                ['grass_tile', 'assets/environment/grass_tile.png'],
                ['grass_tile_variation', 'assets/environment/grass_tile_variation.png'],
                ['grass_edge', 'assets/environment/grass_edge.png'],
                ['grass_edge_corner', 'assets/environment/grass_edge_corner.png'],
                ['grass_edge_horizontal', 'assets/environment/grass_edge_horizontal.png'],
                ['grass_edge_vertical', 'assets/environment/grass_edge_vertical.png'],
                ['pavement_tile', 'assets/environment/pavement_tile.png'],
                ['pavement_grass_transition', 'assets/environment/pavement_grass_transition.png'],
                ['campus_curb', 'assets/environment/campus_curb.png'],
                ['planter_bed', 'assets/environment/planter_bed.png'],
                ['small_flower_patch', 'assets/environment/small_flower_patch.png'],
                ['ground_decal', 'assets/environment/ground_decal.png'],

                // Corridor Surfaces
                ['corridor_floor_horizontal', 'assets/corridor/corridor_floor_horizontal.png'],
                ['corridor_floor_vertical', 'assets/corridor/corridor_floor_vertical.png'],
                ['corridor_corner', 'assets/corridor/corridor_corner.png'],
                ['corridor_intersection', 'assets/corridor/corridor_intersection.png'],
                ['corridor_dead_end', 'assets/corridor/corridor_dead_end.png'],

                // Navigation Markers
                ['destination_marker', 'assets/navigation-markers/destination_marker.png'],
                ['direction_arrow', 'assets/navigation-markers/direction_arrow.png'],
                ['navigation_start_marker', 'assets/navigation-markers/navigation_start_marker.png'],
                ['player_location_marker', 'assets/navigation-markers/player_location_marker.png'],

                // UI Icons & Accents
                ['icon_lock', 'assets/ui-icons/icon_lock.png'],
                ['icon_distance', 'assets/ui-icons/icon_distance.png'],
                ['icon_location', 'assets/ui-icons/icon_location.png'],
                ['icon_navigation', 'assets/ui-icons/icon_navigation.png'],
                ['icon_arrow', 'assets/ui-icons/icon_arrow.png'],
                ['icon_warning', 'assets/ui-icons/icon_warning.png'],
                ['icon_check', 'assets/ui-icons/icon_check.png'],
                ['icon_close', 'assets/ui-icons/icon_close.png'],
                ['icon_info', 'assets/ui-icons/icon_info.png'],
                ['icon_menu', 'assets/ui-icons/icon_menu.png'],
                ['ui_dropdown_arrow', 'assets/ui-icons/ui_dropdown_arrow.png'],

                // UI Decorative Accents
                ['ui_gold_divider', 'assets/ui-decorative/ui_gold_divider.png'],
                ['ui_gold_corner', 'assets/ui-decorative/ui_gold_corner.png'],
                ['ui_ornament_top', 'assets/ui-decorative/ui_ornament_top.png'],
                ['ui_ornament_bottom', 'assets/ui-decorative/ui_ornament_bottom.png'],
                ['ui_scroll_edge', 'assets/ui-decorative/ui_scroll_edge.png'],

                // UI Panels & Buttons
                ['ui_panel', 'assets/ui-panels-buttons/ui_panel.png'],
                ['ui_panel_large', 'assets/ui-panels-buttons/ui_panel_large.png'],
                ['ui_panel_small', 'assets/ui-panels-buttons/ui_panel_small.png'],
                ['ui_button_normal', 'assets/ui-panels-buttons/ui_button_normal.png'],
                ['ui_button_hover', 'assets/ui-panels-buttons/ui_button_hover.png'],
                ['ui_button_selected', 'assets/ui-panels-buttons/ui_button_selected.png'],
                ['ui_button_disabled', 'assets/ui-panels-buttons/ui_button_disabled.png'],
                ['ui_search_bar', 'assets/ui-panels-buttons/ui_search_bar.png'],
                ['ui_dropdown', 'assets/ui-panels-buttons/ui_dropdown.png'],

                // Phase 23 Auditorium Assets
                ['balustrade_h', 'assets/auditorium/auditorium_balustrade_h.png'],
                ['balustrade_v', 'assets/auditorium/auditorium_balustrade_v.png'],
                ['seating', 'assets/auditorium/auditorium_seating_tier.png'],
                ['stage', 'assets/auditorium/auditorium_stage_podium.png'],
                // Fire Exit Descending Stairwell Asset
                ['staircase_down', 'assets/stairs-elevator/staircase_down.png']
            ];

            await Promise.all(assetMap.map(async ([key, url]) => {
                const img = await loadImage(url);
                assets[key] = img;
            }));

            console.log(`[MapRenderer] All Integrated Assets Loaded: Environment, Corridor, Doors, Furniture, Markers, Signage, Auditorium`);
        } catch (error) {
            console.error("[MapRenderer] Asset loading error:", error);
        }
    }

    function renderEnvironment(ctx, viewMinX = -100, viewMaxX = 100, viewMinY = -100, viewMaxY = 200) {
        if (!assets.grass_tile && !assets.pavement_tile) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // 1. OUTER CAMPUS: Continuous Grass Plane - clamped to visible viewport for high performance
        if (assets.grass_tile) {
            if (!grassPattern) {
                grassPattern = ctx.createPattern(assets.grass_tile, 'repeat');
                const gScale = 1.2 / assets.grass_tile.width;
                grassPattern.setTransform(new DOMMatrix().scale(gScale, gScale));
            }
            ctx.fillStyle = grassPattern;
            const gx1 = Math.max(-65.0, viewMinX);
            const gy1 = Math.max(-45.0, viewMinY);
            const gx2 = Math.min(65.0, viewMaxX);
            const gy2 = Math.min(125.0, viewMaxY);
            if (gx2 > gx1 && gy2 > gy1) {
                ctx.fillRect(gx1, gy1, gx2 - gx1, gy2 - gy1);
            }
        }

        // Entrance Plaza Pavement: x in [-8.5, 8.5], y in [-16.0, 0.2]
        if (assets.pavement_tile && viewMinX < 9.0 && viewMaxX > -9.0 && viewMinY < 1.0 && viewMaxY > -17.0) {
            if (!pavementPattern) {
                pavementPattern = ctx.createPattern(assets.pavement_tile, 'repeat');
                const pScale = 1.2 / assets.pavement_tile.width;
                pavementPattern.setTransform(new DOMMatrix().scale(pScale, pScale));
            }
            ctx.fillStyle = pavementPattern;
            ctx.fillRect(-8.5, -16.0, 17.0, 16.5);
        }

        // Deterministic grass tile variations (culled if off-screen)
        if (assets.grass_tile_variation) {
            const variations = [
                { x: -14.0, y: 5.0 }, { x: -16.0, y: 18.0 }, { x: 12.0, y: 8.0 }, { x: 15.0, y: 22.0 },
                { x: -23.0, y: 42.0 }, { x: -21.0, y: 60.0 }, { x: 21.0, y: 45.0 }, { x: 23.0, y: 68.0 },
                { x: -8.0, y: 86.0 }, { x: 6.0, y: 86.0 }
            ];
            variations.forEach(v => {
                if (v.x >= viewMinX - 1.5 && v.x <= viewMaxX + 1.5 && v.y >= viewMinY - 1.5 && v.y <= viewMaxY + 1.5) {
                    ctx.drawImage(assets.grass_tile_variation, v.x, v.y, 1.2, 1.2);
                }
            });
        }

        // 2. GROUND TRANSITIONS
        // Pavement-to-Grass transitions flanking the entrance plaza:
        if (assets.pavement_grass_transition) {
            // Left plaza edge: x = -8.0, y in [-14.0, 0]
            for (let y = -14.0; y < 0; y += 2.0) {
                ctx.drawImage(assets.pavement_grass_transition, -8.6, y, 1.2, 2.0);
            }
            // Right plaza edge: x = 8.0, y in [-14.0, 0]
            for (let y = -14.0; y < 0; y += 2.0) {
                ctx.drawImage(assets.pavement_grass_transition, 7.4, y, 1.2, 2.0);
            }
        }

        // Grass edge details (vertical, horizontal, corners)
        if (assets.grass_edge_vertical) {
            for (let y = 33.0; y < 82.0; y += 3.5) {
                ctx.drawImage(assets.grass_edge_vertical, -18.7, y, 0.4, 3.5);
                ctx.drawImage(assets.grass_edge_vertical, 18.3, y, 0.4, 3.5);
            }
        }
        if (assets.grass_edge_horizontal) {
            for (let x = -18.0; x < 18.0; x += 3.5) {
                ctx.drawImage(assets.grass_edge_horizontal, x, 82.4, 3.5, 0.4);
            }
        }
        if (assets.grass_edge_corner) {
            ctx.drawImage(assets.grass_edge_corner, -18.7, 82.4, 0.6, 0.6);
            ctx.drawImage(assets.grass_edge_corner, 18.1, 82.4, 0.6, 0.6);
        }
        if (assets.grass_edge) {
            for (let x = -8.0; x < 8.0; x += 2.4) {
                ctx.drawImage(assets.grass_edge, x, -14.2, 2.4, 0.5);
            }
        }

        // Campus Curbs along the plaza boundary
        if (assets.campus_curb) {
            // North edge of plaza: y = -14.0
            for (let x = -8.0; x < 8.0; x += 3.0) {
                ctx.drawImage(assets.campus_curb, x, -14.1, 3.0, 0.35);
            }
            // Flanking curbs
            ctx.save();
            ctx.translate(-8.0, -7.0);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(assets.campus_curb, -7.0, -0.18, 14.0, 0.35);
            ctx.restore();

            ctx.save();
            ctx.translate(8.0, -7.0);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(assets.campus_curb, -7.0, -0.18, 14.0, 0.35);
            ctx.restore();
        }

        // 3. GROUND DECALS
        if (assets.ground_decal) {
            // Grand compass / campus crest decal in the center of the entrance plaza
            ctx.drawImage(assets.ground_decal, -2.5, -9.0, 5.0, 5.0);
        }

        // 4. LANDSCAPING
        // Planter beds flanking plaza and along courtyard walks
        if (assets.planter_bed) {
            ctx.drawImage(assets.planter_bed, -6.5, -4.5, 2.4, 1.4);
            ctx.drawImage(assets.planter_bed, 4.1, -4.5, 2.4, 1.4);
            ctx.drawImage(assets.planter_bed, -15.0, 14.0, 2.4, 1.4);
            ctx.drawImage(assets.planter_bed, 12.6, 14.0, 2.4, 1.4);
        }

        // Wildflower patches
        if (assets.small_flower_patch) {
            const patches = [
                { x: -5.5, y: -11.5, s: 1.2 },
                { x: 4.5, y: -11.5, s: 1.2 },
                { x: -16.0, y: 8.0, s: 1.4 },
                { x: 14.0, y: 8.0, s: 1.4 },
                { x: -23.0, y: 50.0, s: 1.5 },
                { x: 22.0, y: 52.0, s: 1.5 },
                { x: -6.0, y: 85.0, s: 1.3 },
                { x: 5.0, y: 85.0, s: 1.3 }
            ];
            patches.forEach(p => {
                ctx.drawImage(assets.small_flower_patch, p.x, p.y, p.s, p.s);
            });
        }

        ctx.restore();
    }

    let foundationPattern = null;
    let foundationPavementPattern = null;

    /**
     * Dedicated Architectural Building Foundation System (Phase 25)
     * Constructs continuous architectural platforms under and between room bays:
     * - North Block: [-8.8, 7.2] x [-1.5, 31.2]
     * - North Ring Connector: [-12.8, 12.8] x [30.8, 34.5]
     * - West Wing: [-18.8, -9.5] x [30.8, 74.5]
     * - East Wing: [9.5, 18.8] x [30.8, 76.5]
     * - South Wing: [-12.8, 12.8] x [71.0, 81.5]
     * Excludes Central Void [-9.5, 9.5] x [34.5, 71.0] to preserve open-to-below auditorium.
     */
    function renderBuildingFoundation(ctx, viewMinX = -100, viewMaxX = 100, viewMinY = -100, viewMaxY = 200) {
        if (!assets.cream_plain) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Seamless repeating tiled textures for institutional foundations
        if (!foundationPattern) {
            foundationPattern = ctx.createPattern(assets.cream_plain, 'repeat');
            const fpScale = 1.2 / assets.cream_plain.width;
            foundationPattern.setTransform(new DOMMatrix().scale(fpScale, fpScale));
        }

        const tilePavement = assets.pavement_tile || assets.cream_plain;
        if (!foundationPavementPattern && tilePavement) {
            foundationPavementPattern = ctx.createPattern(tilePavement, 'repeat');
            const pvScale = 1.2 / tilePavement.width;
            foundationPavementPattern.setTransform(new DOMMatrix().scale(pvScale, pvScale));
        }

        const FOUNDATION_PLATFORMS = [
            { id: 'north_block', x: -8.8,  y: -1.5, w: 16.0, h: 32.7 },
            { id: 'connector',   x: -12.8, y: 30.8, w: 25.6, h: 3.7 },
            { id: 'west_wing',   x: -18.8, y: 30.8, w: 9.3,  h: 43.7 },
            { id: 'east_wing',   x: 9.5,   y: 30.8, w: 9.3,  h: 45.7 },
            { id: 'south_wing',  x: -12.8, y: 71.0, w: 25.6, h: 10.5 }
        ];

        // 1. Foundation Drop Shadow & Floor Platform Tiling (Culled by viewport)
        FOUNDATION_PLATFORMS.forEach(p => {
            if (p.x + p.w < viewMinX || p.x > viewMaxX || p.y + p.h < viewMinY || p.y > viewMaxY) return;
            ctx.fillStyle = "rgba(4, 7, 13, 0.45)";
            ctx.fillRect(p.x - 0.35, p.y - 0.25, p.w + 0.7, p.h + 0.55);
            ctx.fillStyle = foundationPattern;
            ctx.fillRect(p.x, p.y, p.w, p.h);
        });

        // Plaza entrance threshold transition
        if (foundationPavementPattern && viewMinX < 4.0 && viewMaxX > -4.0 && viewMinY < 1.0 && viewMaxY > -2.0) {
            ctx.fillStyle = foundationPavementPattern;
            ctx.fillRect(-3.5, -1.8, 7.0, 1.8);
        }

        // 3. Architectural Plinth Curbs where building perimeter meets campus grass
        const curbThick = 0.32;
        if (assets.campus_curb) {
            // North edge of North Block
            for (let x = -8.8; x < 7.0; x += 3.0) {
                const segW = Math.min(3.0, 7.2 - x);
                ctx.drawImage(assets.campus_curb, x, -1.5 - curbThick / 2, segW, curbThick);
            }
            // West outer edge of North Block (y: -1.5 to 30.8)
            ctx.save();
            ctx.translate(-8.8, 14.65);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(assets.campus_curb, -16.15, -curbThick / 2, 32.3, curbThick);
            ctx.restore();

            // East outer edge of North Block (y: -1.5 to 30.8)
            ctx.save();
            ctx.translate(7.2, 14.65);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(assets.campus_curb, -16.15, -curbThick / 2, 32.3, curbThick);
            ctx.restore();

            // North edge of Connector outside spine
            ctx.drawImage(assets.campus_curb, -12.8, 30.8 - curbThick / 2, 4.0, curbThick);
            ctx.drawImage(assets.campus_curb, 8.8, 30.8 - curbThick / 2, 4.0, curbThick);

            // West outer edge of West Wing (x = -18.8, y: 30.8 to 74.5)
            ctx.save();
            ctx.translate(-18.8, 52.65);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(assets.campus_curb, -21.85, -curbThick / 2, 43.7, curbThick);
            ctx.restore();

            // East outer edge of East Wing (x = 18.8, y: 30.8 to 76.5)
            ctx.save();
            ctx.translate(18.8, 53.65);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(assets.campus_curb, -22.85, -curbThick / 2, 45.7, curbThick);
            ctx.restore();

            // South outer edge of South Wing (y = 81.5, x: -12.8 to 12.8)
            for (let x = -12.8; x < 12.6; x += 3.0) {
                const segW = Math.min(3.0, 12.8 - x);
                ctx.drawImage(assets.campus_curb, x, 81.5 - curbThick / 2, segW, curbThick);
            }
        }

        // 4. Floor tile border and corner anchors
        if (assets.floor_border) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            // North Block perimeter trims
            ctx.drawImage(assets.floor_border, -8.8, -1.5, 16.0, 0.35);
            // West Wing outer trim
            ctx.save();
            ctx.translate(-18.8, 30.8);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(assets.floor_border, 0, -0.35, 43.7, 0.35);
            ctx.restore();
            // East Wing outer trim
            ctx.save();
            ctx.translate(18.8, 30.8);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(assets.floor_border, 0, 0, 45.7, 0.35);
            ctx.restore();
            ctx.restore();
        }

        ctx.restore();
    }

    function renderFloors(ctx, nodes, edges, nodeMap, viewMinX = -100, viewMaxX = 100, viewMinY = -100, viewMaxY = 200) {
        if (!assets.cream_blue || edges.length === 0) return;

        ctx.save();
        
        // Force crisp pixel-art rendering
        ctx.imageSmoothingEnabled = false;

        // 0. BETWEEN ROOM BAYS: Paved Architectural Floor Tiles (Building Foundation Plinth)
        const tileImg = assets.pavement_tile || assets.cream_plain;
        if (tileImg) {
            if (!interBayPattern) {
                interBayPattern = ctx.createPattern(tileImg, 'repeat');
                const ibScale = 1.2 / tileImg.width;
                interBayPattern.setTransform(new DOMMatrix().scale(ibScale, ibScale));
            }

            const PLINTH_ZONES = [
                { x: -9.2,  y: -1.5, w: 16.8, h: 34.0 },  // North Block base under rooms & spine
                { x: -2.5,  y: -2.5, w: 5.0,  h: 3.0 },   // Entrance canopy plinth
                { x: -12.8, y: 30.8, w: 25.6, h: 3.2 },  // North ring connector between wings
                { x: -18.8, y: 30.8, w: 9.2,  h: 43.5 }, // West wing base under rooms & west corridor
                { x: 9.6,   y: 30.8, w: 9.2,  h: 45.7 }, // East wing base under rooms & east corridor
                { x: -12.8, y: 71.5, w: 25.6, h: 10.3 }  // South wing base under WAB 213 & south corridor
            ];

            // Outer plinth subtle foundation shadow & tiles (culled by viewport)
            PLINTH_ZONES.forEach(pz => {
                if (pz.x + pz.w < viewMinX || pz.x > viewMaxX || pz.y + pz.h < viewMinY || pz.y > viewMaxY) return;
                ctx.fillStyle = "rgba(4, 7, 13, 0.40)";
                ctx.fillRect(pz.x - 0.35, pz.y - 0.25, pz.w + 0.7, pz.h + 0.55);
                ctx.fillStyle = interBayPattern;
                ctx.fillRect(pz.x, pz.y, pz.w, pz.h);
            });
        }

        // Create the global seamless repeating pattern
        if (!floorPattern) {
            floorPattern = ctx.createPattern(assets.cream_blue, 'repeat');
        }

        // Establish Authoritative World Scale:
        // We map the physical pixel width of the tile to the defined tileWorldSize (1.2m).
        // This ensures the renderer scales identically across all zoom levels.
        const scale = CONFIG.tileWorldSize / assets.cream_blue.width;
        
        const matrix = new DOMMatrix().scale(scale, scale);
        floorPattern.setTransform(matrix);

        ctx.fillStyle = floorPattern;
        ctx.strokeStyle = floorPattern;
        
        // Match the 2.4m physical collision width exactly
        ctx.lineWidth = CONFIG.corridorWidth;
        ctx.lineCap = 'butt'; 
        ctx.lineJoin = 'miter';

        // 1. Draw continuous corridors along graph edges
        ctx.beginPath();
        edges.forEach(edge => {
            const A = nodeMap.get(edge.from);
            const B = nodeMap.get(edge.to);
            if (A && B) {
                ctx.moveTo(A.x, A.y);
                ctx.lineTo(B.x, B.y);
            }
        });
        ctx.stroke();

        // 2. Fill corner junctions perfectly to seal the 90-degree and T-intersections
        ctx.beginPath();
        nodes.forEach(node => {
            // Only fill junctions and boundaries to maintain the corridor shape
            if (node.type === 'JUNCTION' || node.type === 'BOUNDARY' || node.id === 'ENTRANCE') {
                ctx.moveTo(node.x, node.y);
                ctx.arc(node.x, node.y, CONFIG.corridorRadius, 0, Math.PI * 2);
            }
        });
        ctx.fill();

        // 3. Architectural Corridor Floor Surfaces where geometry matches
        if (assets.corridor_floor_vertical || assets.corridor_floor_horizontal) {
            const cw = CONFIG.corridorWidth;
            edges.forEach(edge => {
                const A = nodeMap.get(edge.from);
                const B = nodeMap.get(edge.to);
                if (!A || !B) return;

                const isVert = Math.abs(A.x - B.x) < 0.05;
                const isHoriz = Math.abs(A.y - B.y) < 0.05;

                if (isVert && assets.corridor_floor_vertical) {
                    const cx = (A.x + B.x) / 2;
                    const minY = Math.min(A.y, B.y);
                    const maxY = Math.max(A.y, B.y);
                    for (let y = minY; y < maxY - 0.2; y += cw) {
                        const segH = Math.min(cw, maxY - y);
                        ctx.drawImage(
                            assets.corridor_floor_vertical,
                            0, 0, assets.corridor_floor_vertical.width, (segH / cw) * assets.corridor_floor_vertical.height,
                            cx - cw / 2, y, cw, segH
                        );
                    }
                } else if (isHoriz && assets.corridor_floor_horizontal) {
                    const cy = (A.y + B.y) / 2;
                    const minX = Math.min(A.x, B.x);
                    const maxX = Math.max(A.x, B.x);
                    for (let x = minX; x < maxX - 0.2; x += cw) {
                        const segW = Math.min(cw, maxX - x);
                        ctx.drawImage(
                            assets.corridor_floor_horizontal,
                            0, 0, (segW / cw) * assets.corridor_floor_horizontal.width, assets.corridor_floor_horizontal.height,
                            x, cy - cw / 2, segW, cw
                        );
                    }
                }
            });

            // 4. Corridor Intersections and Corners
            nodes.forEach(node => {
                if (node.id === 'R_TOP' && assets.corridor_intersection) {
                    ctx.drawImage(assets.corridor_intersection, node.x - cw / 2, node.y - cw / 2, cw, cw);
                } else if (node.type === 'JUNCTION' && assets.corridor_corner) {
                    // Corners at S_NW, S_NE, S_SW, S_SE
                    if (node.id === 'S_NW' || node.id === 'S_NE' || node.id === 'S_SW' || node.id === 'S_SE') {
                        ctx.save();
                        ctx.translate(node.x, node.y);
                        let angle = 0;
                        if (node.id === 'S_NW') angle = 0;
                        else if (node.id === 'S_NE') angle = Math.PI / 2;
                        else if (node.id === 'S_SE') angle = Math.PI;
                        else if (node.id === 'S_SW') angle = -Math.PI / 2;
                        ctx.rotate(angle);
                        ctx.drawImage(assets.corridor_corner, -cw / 2, -cw / 2, cw, cw);
                        ctx.restore();
                    }
                } else if (node.type === 'BOUNDARY' && assets.corridor_dead_end) {
                    ctx.drawImage(assets.corridor_dead_end, node.x - cw / 2, node.y - cw / 2, cw, cw);
                }
            });
        }

        ctx.restore();
    }

    function renderDoors(ctx, nodes, edges, nodeMap, rooms, activeDestination, viewMinX = -100, viewMaxX = 100, viewMinY = -100, viewMaxY = 200) {
        if (!assets.room_door || !assets.fire_door) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        nodes.forEach(node => {
            if (node.type === 'ROOM_DOOR' || node.type === 'FIRE_EXIT') {
                if (node.x < viewMinX - 1.5 || node.x > viewMaxX + 1.5 || node.y < viewMinY - 1.5 || node.y > viewMaxY + 1.5) {
                    return; // Viewport culled
                }
                
                // 1. Strict Topology Validation
                const connectedEdges = edges.filter(e => e.from === node.id || e.to === node.id);
                
                if (connectedEdges.length !== 1) {
                    console.warn(`[Topology Warning] Door ${node.id} has ${connectedEdges.length} connections. Expected exactly 1 leaf connection.`);
                    return; 
                }

                const edge = connectedEdges[0];
                const junctionId = edge.from === node.id ? edge.to : edge.from;
                const junction = nodeMap.get(junctionId);
                
                if (!junction) return;

                // 2. Orientation Vector (Corridor Junction -> Door Node)
                const dx = node.x - junction.x;
                const dy = node.y - junction.y;
                const baseAngle = Math.atan2(dy, dx);

                // 3. Asset Selection & Calibrated Scaling
                let doorImg = null;
                let signImg = null;
                let visibleTargetWidth = 0;
                let visibleRatio = 1;
                let signVisibleRatio = 1;
                let rotationOffset = 0;

                if (node.type === 'ROOM_DOOR') {
                    // Architectural Wall Opening & Doorway Assembly matching Institutional Reference
                    const isLocked = node.id === 'W217_DOOR' || node.room === 'WAB217';
                    const room = rooms ? rooms.find(r => r.id === node.room || (r.doors && r.doors.some(d => d.node === node.id))) : null;
                    const cat = room ? room.category : null;

                    ctx.save();
                    ctx.translate(node.x, node.y);

                    const isVerticalCorridor = Math.abs(dx) > Math.abs(dy);
                    const doorOpeningH = ASSET_CONFIG.ROOM_DOOR_WIDTH_M; // 1.18m
                    const halfH = doorOpeningH / 2; // 0.59m

                    if (isVerticalCorridor) {
                        // VERTICAL WALL OPENING (North Block WAB 202-207 & South wings)
                        // Centered on authoritative node.x, node.y.
                        const isCorridorEast = dx < 0;
                        const isNorthBlock = Math.abs(node.x) < 4.0;
                        // North Block: node.x = +/-1.49, corridor line is at +/-1.20 (0.29m away)
                        // halfW = 0.29m spans from room wall (-0.29m) to corridor wall line (+0.29m)
                        const halfW = isNorthBlock ? 0.29 : 0.22;
                        const minX = -halfW;
                        const maxX = halfW;
                        const assemblyW = 2 * halfW;
                        const corrEdgeX = isCorridorEast ? halfW : -halfW;
                        const roomEdgeX = isCorridorEast ? -halfW : halfW;

                        // 1. Wall Opening Floor (Exposes doorway recess through wall)
                        ctx.fillStyle = isLocked ? "#2A1F18" : "#3D2719";
                        ctx.fillRect(minX, -halfH, assemblyW, doorOpeningH);

                        // Contact shadow where threshold meets corridor floor
                        if (assets.room_door_shadow) {
                            ctx.drawImage(assets.room_door_shadow, minX, -halfH, assemblyW, doorOpeningH);
                        } else {
                            ctx.fillStyle = "rgba(4, 7, 13, 0.40)";
                            ctx.fillRect(corrEdgeX > 0 ? (corrEdgeX - 0.04) : corrEdgeX, -halfH, 0.04, doorOpeningH);
                        }

                        // 2. Top Architectural Lintel Return (┌───┤)
                        // Seamlessly connects the upper stone wall into the doorway opening at y = -halfH (-0.59m)
                        const lintelH = 0.08;
                        // Dark architectural outline
                        ctx.fillStyle = "#101D2F";
                        ctx.fillRect(minX, -halfH, assemblyW, lintelH);
                        // Stone lintel body matching wall (#E8DFC9)
                        ctx.fillStyle = "#E8DFC9";
                        ctx.fillRect(minX + 0.015, -halfH + 0.015, assemblyW - 0.03, lintelH - 0.03);
                        // 16-bit white stone highlight cap (matching wall cap)
                        ctx.fillStyle = "#FFFDF9";
                        ctx.fillRect(minX + 0.015, -halfH + 0.015, assemblyW - 0.03, 0.02);
                        // Stone joint detail
                        ctx.fillStyle = "#D6CABA";
                        ctx.fillRect(0, -halfH + 0.015, 0.02, lintelH - 0.03);
                        // Underside jamb recess shadow
                        ctx.fillStyle = "#160B04";
                        ctx.fillRect(minX, -halfH + lintelH - 0.015, assemblyW, 0.015);

                        // 3. Bottom Architectural Sill Return (└───┤)
                        // Seamlessly connects the lower stone wall into the doorway opening at y = +halfH (+0.59m)
                        ctx.fillStyle = "#101D2F";
                        ctx.fillRect(minX, halfH - lintelH, assemblyW, lintelH);
                        // Stone sill body matching wall
                        ctx.fillStyle = "#E8DFC9";
                        ctx.fillRect(minX + 0.015, halfH - lintelH + 0.015, assemblyW - 0.03, lintelH - 0.03);
                        // 16-bit white stone highlight
                        ctx.fillStyle = "#FFFDF9";
                        ctx.fillRect(minX + 0.015, halfH - lintelH + 0.015, assemblyW - 0.03, 0.02);
                        // Stone joint detail
                        ctx.fillStyle = "#D6CABA";
                        ctx.fillRect(0, halfH - lintelH + 0.015, 0.02, lintelH - 0.03);
                        // Top threshold shadow
                        ctx.fillStyle = "#160B04";
                        ctx.fillRect(minX, halfH - lintelH, assemblyW, 0.015);

                        // 4. Door Jamb Side Trims
                        const trimW = 0.05;
                        // Room side jamb trim
                        ctx.fillStyle = isLocked ? "#1E130D" : "#26150B";
                        ctx.fillRect(roomEdgeX > 0 ? (roomEdgeX - trimW) : roomEdgeX, -halfH + lintelH, trimW, doorOpeningH - 2 * lintelH);
                        ctx.fillStyle = "rgba(255, 200, 150, 0.15)";
                        ctx.fillRect(roomEdgeX > 0 ? (roomEdgeX - trimW) : (roomEdgeX + trimW - 0.01), -halfH + lintelH, 0.01, doorOpeningH - 2 * lintelH);

                        // Corridor side casing (visible frame towards corridor)
                        ctx.fillStyle = isLocked ? "#2C1B12" : "#3B2011";
                        ctx.fillRect(corrEdgeX > 0 ? (corrEdgeX - trimW) : corrEdgeX, -halfH + lintelH, trimW, doorOpeningH - 2 * lintelH);
                        ctx.fillStyle = "rgba(255, 215, 175, 0.25)";
                        ctx.fillRect(corrEdgeX > 0 ? corrEdgeX - 0.012 : corrEdgeX, -halfH + lintelH, 0.012, doorOpeningH - 2 * lintelH);

                        // 5. Wooden Door Leaf (Recessed inside the frame with shadow gap)
                        const leafMinX = minX + trimW + 0.015;
                        const leafMaxX = maxX - trimW - 0.015;
                        const leafW = leafMaxX - leafMinX;
                        const leafMinY = -halfH + lintelH + 0.01;
                        const leafMaxY = halfH - lintelH - 0.01;
                        const leafH = leafMaxY - leafMinY;

                        // Recessed shadow gap
                        ctx.fillStyle = "#120702";
                        ctx.fillRect(leafMinX - 0.01, leafMinY - 0.01, leafW + 0.02, leafH + 0.02);

                        const isArrived = !!(activeDestination && (activeDestination.id === node.id || activeDestination.roomId === node.room) && activeDestination.isArrived);

                        if (isArrived && assets.room_door_open) {
                            ctx.drawImage(assets.room_door_open, leafMinX, leafMinY, leafW, leafH);
                        } else {
                            // Warm rich wooden door leaf gradient
                            const woodGrad = ctx.createLinearGradient(leafMinX, leafMinY, leafMinX, leafMaxY);
                            if (isLocked) {
                                woodGrad.addColorStop(0, "#4A2D1C");
                                woodGrad.addColorStop(0.5, "#331C0F");
                                woodGrad.addColorStop(1, "#211108");
                            } else {
                                woodGrad.addColorStop(0, "#A05A2C");
                                woodGrad.addColorStop(0.3, "#87441B");
                                woodGrad.addColorStop(0.7, "#6E3514");
                                woodGrad.addColorStop(1, "#52250C");
                            }
                            ctx.fillStyle = woodGrad;
                            ctx.fillRect(leafMinX, leafMinY, leafW, leafH);

                            // Subtle wood grain lines
                            ctx.strokeStyle = "rgba(35, 15, 5, 0.20)";
                            ctx.lineWidth = 0.015;
                            for (let gx = leafMinX + 0.06; gx < leafMaxX - 0.03; gx += 0.06) {
                                ctx.beginPath();
                                ctx.moveTo(gx, leafMinY);
                                ctx.lineTo(gx, leafMaxY);
                                ctx.stroke();
                            }

                            // 6. Dual Recessed Architectural Panels
                            const panelW = leafW * 0.72;
                            const panelX = leafMinX + (leafW - panelW) / 2;

                            // Upper Panel
                            const p1Y = leafMinY + 0.05;
                            const p1H = leafH * 0.44;
                            ctx.fillStyle = "#160803";
                            ctx.fillRect(panelX, p1Y, panelW, p1H);
                            ctx.fillStyle = isLocked ? "#2D180E" : "#612C11";
                            ctx.fillRect(panelX + 0.012, p1Y + 0.012, panelW - 0.024, p1H - 0.024);
                            ctx.fillStyle = "rgba(255, 210, 160, 0.35)";
                            ctx.fillRect(panelX + 0.012, p1Y + 0.012, panelW - 0.024, 0.012);
                            ctx.fillRect(panelX + 0.012, p1Y + 0.012, 0.012, p1H - 0.024);

                            // Lower Panel
                            const p2Y = p1Y + p1H + 0.06;
                            const p2H = leafH * 0.38;
                            ctx.fillStyle = "#160803";
                            ctx.fillRect(panelX, p2Y, panelW, p2H);
                            ctx.fillStyle = isLocked ? "#28140B" : "#59270F";
                            ctx.fillRect(panelX + 0.012, p2Y + 0.012, panelW - 0.024, p2H - 0.024);
                            ctx.fillStyle = "rgba(255, 210, 160, 0.30)";
                            ctx.fillRect(panelX + 0.012, p2Y + 0.012, panelW - 0.024, 0.012);
                            ctx.fillRect(panelX + 0.012, p2Y + 0.012, 0.012, p2H - 0.024);

                            // 7. Polished Brass Lever Hardware
                        const handleX = isCorridorEast ? (leafMaxX - 0.045) : (leafMinX + 0.045);
                        const handleY = 0; // centered at node.y

                        ctx.fillStyle = "#B38222";
                        ctx.fillRect(handleX - 0.015, handleY - 0.04, 0.03, 0.08);
                        ctx.fillStyle = "#FFDF73";
                        ctx.fillRect(handleX - 0.01, handleY - 0.035, 0.02, 0.025);

                        const leverDir = isCorridorEast ? -1 : 1;
                        ctx.fillStyle = "#FFD56B";
                        ctx.fillRect(handleX, handleY - 0.01, leverDir * 0.06, 0.02);
                        ctx.fillStyle = "#FFFCE6";
                        ctx.fillRect(handleX, handleY - 0.01, leverDir * 0.06, 0.007);
                    }

                        // 8. Indicators for WAB 203 & WAB 217
                        if (node.id === 'W203_D1' || node.id === 'W203_D2' || node.id === 'W203_D3') {
                            const doorLabel = node.id === 'W203_D1' ? 'D1' : node.id === 'W203_D2' ? 'D2' : 'D3';
                            const tagW = 0.30, tagH = 0.14;
                            const tagX = (minX + maxX) / 2 - tagW / 2;
                            const tagY = -halfH - tagH - 0.03;

                            ctx.fillStyle = "rgba(10, 16, 26, 0.95)";
                            ctx.fillRect(tagX, tagY, tagW, tagH);
                            ctx.strokeStyle = (node.id === 'W203_D2') ? "#FFD56B" : "rgba(214, 168, 79, 0.7)";
                            ctx.lineWidth = 0.02;
                            ctx.strokeRect(tagX, tagY, tagW, tagH);

                            ctx.fillStyle = (node.id === 'W203_D2') ? "#FFD56B" : "#EAE1CF";
                            ctx.font = "bold 0.09px 'Press Start 2P', monospace";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText(doorLabel, tagX + tagW / 2, tagY + tagH / 2);
                        }

                        if (node.id === 'W203_D2') {
                            // Subtle gold outline around door frame
                            ctx.save();
                            ctx.strokeStyle = "rgba(255, 213, 107, 0.6)";
                            ctx.lineWidth = 0.03;
                            ctx.strokeRect(minX, -halfH, assemblyW, doorOpeningH);
                            ctx.restore();

                            // Subordinate PRIMARY badge below door
                            const primW = 0.64, primH = 0.15;
                            const primX = (minX + maxX) / 2 - primW / 2;
                            const primY = halfH + 0.04;
                            ctx.fillStyle = "rgba(10, 16, 26, 0.95)";
                            ctx.fillRect(primX, primY, primW, primH);
                            ctx.strokeStyle = "#FFB52E";
                            ctx.lineWidth = 0.02;
                            ctx.strokeRect(primX, primY, primW, primH);

                            ctx.fillStyle = "#FFD56B";
                            ctx.font = "bold 0.08px 'Press Start 2P', monospace";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText("PRIMARY", primX + primW / 2, primY + primH / 2);
                        }

                        if (isLocked) {
                            const lockW = 0.56, lockH = 0.15;
                            const lockX = (minX + maxX) / 2 - lockW / 2;
                            const lockY = halfH + 0.04;
                            ctx.fillStyle = "rgba(26, 12, 12, 0.92)";
                            ctx.fillRect(lockX, lockY, lockW, lockH);
                            ctx.strokeStyle = "#E53E3E";
                            ctx.lineWidth = 0.02;
                            ctx.strokeRect(lockX, lockY, lockW, lockH);

                            ctx.fillStyle = "#FEB2B2";
                            ctx.font = "bold 0.075px 'Press Start 2P', monospace";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText("LOCKED", lockX + lockW / 2, lockY + lockH / 2);
                        }
                    } else {
                        // HORIZONTAL WALL OPENING (WAB 213 in South Block)
                        const doorOpeningW = ASSET_CONFIG.ROOM_DOOR_WIDTH_M; // 1.18m
                        const halfW = doorOpeningW / 2; // 0.59m

                        // Spanning across horizontal wall opening (y = -0.22 to +0.22 relative to node)
                        const halfHAssembly = 0.22;
                        const minY = -halfHAssembly;
                        const maxY = halfHAssembly;
                        const assemblyH = 2 * halfHAssembly;

                        // Threshold floor
                        ctx.fillStyle = "#3D2719";
                        ctx.fillRect(-halfW, minY, doorOpeningW, assemblyH);

                        // Contact shadow along corridor edge
                        if (assets.room_door_shadow) {
                            ctx.drawImage(assets.room_door_shadow, -halfW, minY, doorOpeningW, assemblyH);
                        } else {
                            ctx.fillStyle = "rgba(4, 7, 13, 0.40)";
                            ctx.fillRect(-halfW, minY, doorOpeningW, 0.04);
                        }

                        // Left & Right Stone Returns (matching horizontal wall)
                        const lintelW = 0.08;
                        // Left Stone Return
                        ctx.fillStyle = "#101D2F";
                        ctx.fillRect(-halfW, minY, lintelW, assemblyH);
                        ctx.fillStyle = "#E8DFC9";
                        ctx.fillRect(-halfW + 0.015, minY + 0.015, lintelW - 0.03, assemblyH - 0.03);
                        ctx.fillStyle = "#FFFDF9";
                        ctx.fillRect(-halfW + 0.015, minY + 0.015, lintelW - 0.03, 0.02);

                        // Right Stone Return
                        ctx.fillStyle = "#101D2F";
                        ctx.fillRect(halfW - lintelW, minY, lintelW, assemblyH);
                        ctx.fillStyle = "#E8DFC9";
                        ctx.fillRect(halfW - lintelW + 0.015, minY + 0.015, lintelW - 0.03, assemblyH - 0.03);
                        ctx.fillStyle = "#FFFDF9";
                        ctx.fillRect(halfW - lintelW + 0.015, minY + 0.015, lintelW - 0.03, 0.02);

                        // Top & Bottom Trim
                        const trimH = 0.05;
                        ctx.fillStyle = "#3B2011";
                        ctx.fillRect(-halfW + lintelW, minY, doorOpeningW - 2 * lintelW, trimH);
                        ctx.fillStyle = "#26150B";
                        ctx.fillRect(-halfW + lintelW, maxY - trimH, doorOpeningW - 2 * lintelW, trimH);

                        // Door Leaf
                        const leafX = -halfW + lintelW + 0.01;
                        const leafW = doorOpeningW - 2 * lintelW - 0.02;
                        const leafMinY = minY + trimH + 0.01;
                        const leafMaxY = maxY - trimH - 0.01;
                        const leafH = leafMaxY - leafMinY;

                        // Recessed shadow gap
                        ctx.fillStyle = "#120702";
                        ctx.fillRect(leafX - 0.01, leafMinY - 0.01, leafW + 0.02, leafH + 0.02);

                        const isArrived = !!(activeDestination && (activeDestination.id === node.id || activeDestination.roomId === node.room) && activeDestination.isArrived);

                        if (isArrived && assets.room_door_open) {
                            ctx.drawImage(assets.room_door_open, leafX, leafMinY, leafW, leafH);
                        } else {
                            const woodGrad = ctx.createLinearGradient(leafX, leafMinY, leafX, leafMaxY);
                            woodGrad.addColorStop(0, "#A05A2C");
                            woodGrad.addColorStop(0.3, "#87441B");
                            woodGrad.addColorStop(0.7, "#6E3514");
                            woodGrad.addColorStop(1, "#52250C");
                            ctx.fillStyle = woodGrad;
                            ctx.fillRect(leafX, leafMinY, leafW, leafH);

                            // Molded Panels (Left and Right)
                            const p1W = leafW * 0.44;
                            const p1H = leafH * 0.72;
                            const pY = leafMinY + (leafH - p1H) / 2;
                            // Left Panel
                            ctx.fillStyle = "#160803";
                            ctx.fillRect(leafX + 0.04, pY, p1W, p1H);
                            ctx.fillStyle = "#612C11";
                            ctx.fillRect(leafX + 0.052, pY + 0.012, p1W - 0.024, p1H - 0.024);
                            ctx.fillStyle = "rgba(255, 210, 160, 0.35)";
                            ctx.fillRect(leafX + 0.052, pY + 0.012, p1W - 0.024, 0.012);
                            // Right Panel
                            const p2X = leafX + 0.04 + p1W + 0.05;
                            const p2W = leafW * 0.42;
                            ctx.fillStyle = "#160803";
                            ctx.fillRect(p2X, pY, p2W, p1H);
                            ctx.fillStyle = "#59270F";
                            ctx.fillRect(p2X + 0.012, pY + 0.012, p2W - 0.024, p1H - 0.024);
                            ctx.fillStyle = "rgba(255, 210, 160, 0.30)";
                            ctx.fillRect(p2X + 0.012, pY + 0.012, p2W - 0.024, 0.012);

                            // Brass hardware
                            ctx.fillStyle = "#B38222";
                            ctx.fillRect(-0.04, minY + 0.06, 0.08, 0.03);
                            ctx.fillStyle = "#FFD56B";
                            ctx.fillRect(-0.03, minY + 0.065, 0.06, 0.018);
                        }
                    }

                    ctx.restore();
                } else if (node.type === 'FIRE_EXIT') {
                    // Retain dedicated Fire Exit Door & Sign
                    const doorImg = assets.fire_door;
                    const signImg = assets.fire_sign;
                    const visibleTargetWidth = ASSET_CONFIG.FIRE_EXIT_WIDTH_M;
                    const visibleRatio = ASSET_CONFIG.FIRE_EXIT_VISIBLE_RATIO;
                    const signVisibleRatio = ASSET_CONFIG.FIRE_SIGN_VISIBLE_RATIO;
                    const rotationOffset = ASSET_CONFIG.FIRE_EXIT_ROTATION_OFFSET;

                    const boundingWidth = visibleTargetWidth / visibleRatio;
                    const scale = boundingWidth / doorImg.width;
                    const boundingHeight = doorImg.height * scale;

                    ctx.save();
                    ctx.translate(node.x, node.y);
                    ctx.rotate(baseAngle + rotationOffset);

                    ctx.drawImage(
                        doorImg,
                        -boundingWidth / 2,
                        -boundingHeight / 2,
                        boundingWidth,
                        boundingHeight
                    );

                    if (assets.fire_exit_marker) {
                        ctx.drawImage(assets.fire_exit_marker, -0.45, -boundingHeight / 2 - 0.95, 0.9, 0.9);
                    }

                    if (signImg) {
                        const targetSignVisibleWidth = visibleTargetWidth * 0.8;
                        const signBoundingWidth = targetSignVisibleWidth / signVisibleRatio;
                        const signScale = signBoundingWidth / signImg.width;
                        const signW = signImg.width * signScale;
                        const signH = signImg.height * signScale;
                        
                        ctx.drawImage(
                            signImg,
                            -signW / 2,
                            -boundingHeight / 2 - signH - ASSET_CONFIG.SIGN_OFFSET_M, 
                            signW,
                            signH
                        );
                    }
                    ctx.restore();
                }
            }
        });

        ctx.restore();
    }

    function renderWalls(ctx, nodes, edges, nodeMap, viewMinX = -100, viewMaxX = 100, viewMinY = -100, viewMaxY = 200) {
        if (!assets.wall_h || !assets.wall_v) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const scale = CONFIG.tileWorldSize / 1254; // 1.2 / 1254 = 0.000956938 m/px

        // Reusable Vertical Wall Tiler (culled by viewport)
        function drawVWall(x, y1, y2) {
            if (x < viewMinX - 1.0 || x > viewMaxX + 1.0 || y2 < viewMinY || y1 > viewMaxY) return;
            if (y2 <= y1 + 0.05) return;
            const sx = 258, sy = 35, sw = 277, sh = 1904;
            const wallThick = sw * scale; // ~0.265 m
            const tileH = sh * scale;    // ~1.822 m
            let curY = y1;
            while (curY < y2) {
                const segLen = Math.min(tileH, y2 - curY);
                const srcH = (segLen / tileH) * sh;
                ctx.drawImage(
                    assets.wall_v,
                    sx, sy, sw, srcH,
                    x - wallThick / 2, curY, wallThick, segLen
                );
                curY += segLen;
            }
        }

        // Reusable Horizontal Wall Tiler (culled by viewport)
        function drawHWall(x1, x2, y) {
            if (y < viewMinY - 1.0 || y > viewMaxY + 1.0 || x2 < viewMinX || x1 > viewMaxX) return;
            if (x2 <= x1 + 0.05) return;
            const sx = 46, sy = 219, sw = 1891, sh = 361;
            const wallThick = sh * scale; // ~0.345 m
            const tileW = sw * scale;     // ~1.810 m
            let curX = x1;
            while (curX < x2) {
                const segLen = Math.min(tileW, x2 - curX);
                const srcW = (segLen / tileW) * sw;
                ctx.drawImage(
                    assets.wall_h,
                    sx, sy, srcW, sh,
                    curX, y - wallThick / 2, segLen, wallThick
                );
                curX += segLen;
            }
        }

        // Subsegment hole cutter for door openings
        function getSubsegments(start, end, holes) {
            const validHoles = holes
                .filter(h => h.end > start && h.start < end)
                .sort((a, b) => a.start - b.start);
            const segs = [];
            let cur = start;
            for (const h of validHoles) {
                if (h.start > cur + 0.05) {
                    segs.push([cur, Math.min(h.start, end)]);
                }
                cur = Math.max(cur, h.end);
            }
            if (cur < end - 0.05) {
                segs.push([cur, end]);
            }
            return segs;
        }

        // Door hole extractor
        const doors = nodes.filter(n => n.type === 'ROOM_DOOR' || n.type === 'FIRE_EXIT');
        function getDoorHole(d) {
            const w = (d.type === 'FIRE_EXIT') ? ASSET_CONFIG.FIRE_EXIT_WIDTH_M : ASSET_CONFIG.ROOM_DOOR_WIDTH_M;
            return { start: d.pos - w / 2, end: d.pos + w / 2 };
        }

        // 1. West Entrance Spine Wall: along x = -1.2, from y = -1.0 to y = 31.0
        const wSpineHoles = doors
            .filter(d => d.x < 0 && d.y < 30)
            .map(d => getDoorHole({ pos: d.y, type: d.type }));
        getSubsegments(-1.0, 31.0, wSpineHoles).forEach(([y1, y2]) => {
            drawVWall(-1.2, y1, y2);
        });

        // 2. East Entrance Spine Wall: along x = +1.2, from y = -1.0 to y = 31.0
        const eSpineHoles = doors
            .filter(d => d.x > 0 && d.y < 30)
            .map(d => getDoorHole({ pos: d.y, type: d.type }));
        getSubsegments(-1.0, 31.0, eSpineHoles).forEach(([y1, y2]) => {
            drawVWall(1.2, y1, y2);
        });

        // 3. North Top Ring Wall (West & East of spine entrance)
        // Outer corners: x = -12.4 and x = +12.5. Spine opening: x in [-1.2, 1.2]
        drawHWall(-11.78, -1.2, 31.0);
        drawHWall(1.2, 11.79, 31.0);

        // 4. West Outer Wall: along x = -12.4, from y = 31.64 to y = 73.54
        const wWingHoles = doors
            .filter(d => d.x < -5 && d.y > 30)
            .map(d => getDoorHole({ pos: d.y, type: d.type }));
        getSubsegments(31.64, 73.54, wWingHoles).forEach(([y1, y2]) => {
            drawVWall(-12.4, y1, y2);
        });

        // 5. East Outer Wall: along x = +12.5, from y = 31.63 to y = 73.54
        const eWingHoles = doors
            .filter(d => d.x > 5 && d.y > 30 && d.y < 74)
            .map(d => getDoorHole({ pos: d.y, type: d.type }));
        getSubsegments(31.63, 73.54, eWingHoles).forEach(([y1, y2]) => {
            drawVWall(12.5, y1, y2);
        });

        // 6. South Outer Wall: along y = 74.3, from x = -11.78 to x = 11.81
        const southHoles = doors
            .filter(d => d.y > 73.5)
            .map(d => getDoorHole({ pos: d.x, type: d.type }));
        getSubsegments(-11.78, 11.81, southHoles).forEach(([x1, x2]) => {
            drawHWall(x1, x2, 74.3);
        });

        // 7. Outer Corners
        // TL corner at (-12.4, 31.0)
        if (assets.corner_tl) {
            ctx.drawImage(assets.corner_tl, -12.4 - 0.3789, 31.0 - 0.3818, 1.2, 1.2);
        }
        // TR corner at (12.5, 31.0)
        if (assets.corner_tr) {
            ctx.drawImage(assets.corner_tr, 12.5 - 0.8879, 31.0 - 0.3818, 1.2, 1.2);
        }
        // BL corner at (-12.4, 74.3)
        if (assets.corner_bl) {
            ctx.drawImage(assets.corner_bl, -12.4 - 0.3789, 74.3 - 0.9091, 1.2, 1.2);
        }
        // BR corner at (12.5, 74.3)
        if (assets.corner_br) {
            ctx.drawImage(assets.corner_br, 12.5 - 0.8879, 74.3 - 0.9091, 1.2, 1.2);
        }

        // 8. Grand Entrance Portal at ENTRANCE (0, 0)
        if (assets.entrance) {
            const entW = 2.4 * (1536 / 1070);
            const entH = entW * (1024 / 1536);
            ctx.drawImage(assets.entrance, -entW / 2, -entH * 0.5, entW, entH);
        }

        // 9. Central Void Perimeter Walls & Courtyard Windows
        // Central Void Courtyard rect: [-9.5, 9.5] x [34.5, 71.0]
        // Surrounding corridor inner wall edges:
        // North void wall: y = 33.4, from x = -10.0 to 10.1
        drawHWall(-10.0, 10.1, 33.4);
        // South void wall: y = 71.9, from x = -10.0 to 10.1
        drawHWall(-10.0, 10.1, 71.9);
        // West void wall: x = -10.0, from y = 33.4 to 71.9
        drawVWall(-10.0, 33.4, 71.9);
        // East void wall: x = 10.1, from y = 33.4 to 71.9
        drawVWall(10.1, 33.4, 71.9);

        // Windows overlooking courtyard
        if (assets.large_window) {
            const winW = 1.38;
            const winH = 0.74;
            // North void window
            ctx.drawImage(assets.large_window, -winW / 2, 33.4 - winH / 2, winW, winH);
            // South void window
            ctx.drawImage(assets.large_window, -winW / 2, 71.9 - winH / 2, winW, winH);
        }

        ctx.restore();
    }

    // --------------------------------------------------------------------------
    // PHASE 23A: AUTHORITATIVE ARCHITECTURAL ROOM BAYS
    // --------------------------------------------------------------------------
    const ROOM_BAYS = {
        'WAB204':  { x1: -6.8,  x2: -1.2,  y1: -1.0,  y2: 2.8,   wallSide: 'east',  doorNode: 'W204_DOOR' },
        'WAB203':  { x1: -8.5,  x2: -1.2,  y1: 3.2,   y2: 19.8,  wallSide: 'east',  doorNode: 'W203_D2', doors: ['W203_D1', 'W203_D2', 'W203_D3'] },
        'WAB202':  { x1: -6.8,  x2: -1.2,  y1: 22.8,  y2: 29.2,  wallSide: 'east',  doorNode: 'W202_DOOR' },
        'WAB205':  { x1: 1.2,   x2: 6.8,   y1: -1.0,  y2: 3.6,   wallSide: 'west',  doorNode: 'W205_DOOR' },
        'WAB206':  { x1: 1.2,   x2: 6.8,   y1: 8.5,   y2: 14.5,  wallSide: 'west',  doorNode: 'W206_DOOR' },
        'WAB207':  { x1: 1.2,   x2: 6.8,   y1: 18.5,  y2: 24.5,  wallSide: 'west',  doorNode: 'W207_DOOR' },
        'WAB218':  { x1: -17.0, x2: -12.4, y1: 31.2,  y2: 34.6,  wallSide: 'east',  doorNode: 'W218_DOOR' },
        'WAB217':  { x1: -17.0, x2: -12.4, y1: 37.0,  y2: 41.2,  wallSide: 'east',  doorNode: 'W217_DOOR' },
        'WAB216':  { x1: -18.2, x2: -12.4, y1: 41.8,  y2: 49.5,  wallSide: 'east',  doorNode: 'W216_DOOR' },
        'WAB216A': { x1: -18.2, x2: -12.4, y1: 53.5,  y2: 61.6,  wallSide: 'east',  doorNode: 'W216A_DOOR' },
        'WAB215':  { x1: -17.0, x2: -12.4, y1: 62.2,  y2: 66.2,  wallSide: 'east',  doorNode: 'W215_DOOR' },
        'WAB214':  { x1: -17.0, x2: -12.4, y1: 67.5,  y2: 72.3,  wallSide: 'east',  doorNode: 'W214_DOOR' },
        'WAB208':  { x1: 12.5,  x2: 17.1,  y1: 31.2,  y2: 34.6,  wallSide: 'west',  doorNode: 'W208_DOOR' },
        'WAB209':  { x1: 12.5,  x2: 18.5,  y1: 36.6,  y2: 43.0,  wallSide: 'west',  doorNode: 'W209_DOOR' },
        'WAB210':  { x1: 12.5,  x2: 17.8,  y1: 43.8,  y2: 50.8,  wallSide: 'west',  doorNode: 'W210_DOOR' },
        'WAB211':  { x1: 12.5,  x2: 17.8,  y1: 52.0,  y2: 62.0,  wallSide: 'west',  doorNode: 'W211_DOOR' },
        'WAB212':  { x1: 12.5,  x2: 17.8,  y1: 70.8,  y2: 76.0,  wallSide: 'west',  doorNode: 'W212_DOOR' },
        'WAB213':  { x1: 0.5,   x2: 9.5,   y1: 74.3,  y2: 81.0,  wallSide: 'north', doorNode: 'W213_DOOR' }
    };

    function renderRoomBays(ctx, rooms, nodes, nodeMap, cameraZoom, viewMinX = -100, viewMaxX = 100, viewMinY = -100, viewMaxY = 200) {
        if (!rooms || rooms.length === 0) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const currentZoom = cameraZoom || 18;

        rooms.forEach(room => {
            const bay = ROOM_BAYS[room.id];
            if (!bay) return;
            if (bay.x2 < viewMinX || bay.x1 > viewMaxX || bay.y2 < viewMinY || bay.y1 > viewMaxY) {
                return; // Frustum culled!
            }

            const bw = bay.x2 - bay.x1;
            const bh = bay.y2 - bay.y1;

            // 1. Outer Building Drop Shadow (Depth under exterior room walls)
            ctx.save();
            ctx.fillStyle = "rgba(4, 7, 13, 0.45)";
            if (bay.wallSide === 'east') {
                ctx.fillRect(bay.x1 - 0.35, bay.y1 - 0.25, 0.35, bh + 0.5);
                ctx.fillRect(bay.x1 - 0.35, bay.y1 - 0.25, bw + 0.35, 0.25);
                ctx.fillRect(bay.x1 - 0.35, bay.y2, bw + 0.35, 0.25);
            } else if (bay.wallSide === 'west') {
                ctx.fillRect(bay.x2, bay.y1 - 0.25, 0.35, bh + 0.5);
                ctx.fillRect(bay.x1, bay.y1 - 0.25, bw + 0.35, 0.25);
                ctx.fillRect(bay.x1, bay.y2, bw + 0.35, 0.25);
            } else if (bay.wallSide === 'north') {
                ctx.fillRect(bay.x1 - 0.25, bay.y2, bw + 0.5, 0.35);
                ctx.fillRect(bay.x1 - 0.25, bay.y1, 0.25, bh + 0.35);
                ctx.fillRect(bay.x2, bay.y1, 0.25, bh + 0.35);
            }
            ctx.restore();

            // 2. Room Floor Tile / Pattern (Per Category)
            ctx.save();
            switch (room.category) {
                case 'CLASSROOM':
                    // Warm ivory/cream tile with subtle grid
                    ctx.fillStyle = "#EAE1CF";
                    ctx.fillRect(bay.x1, bay.y1, bw, bh);
                    ctx.strokeStyle = "rgba(180, 165, 140, 0.35)";
                    ctx.lineWidth = 0.04;
                    for (let gx = bay.x1 + 1.2; gx < bay.x2 - 0.2; gx += 1.2) {
                        ctx.beginPath(); ctx.moveTo(gx, bay.y1); ctx.lineTo(gx, bay.y2); ctx.stroke();
                    }
                    for (let gy = bay.y1 + 1.2; gy < bay.y2 - 0.2; gy += 1.2) {
                        ctx.beginPath(); ctx.moveTo(bay.x1, gy); ctx.lineTo(bay.x2, gy); ctx.stroke();
                    }
                    break;

                case 'STAFFROOM':
                case 'FACULTY':
                    // Polished mahogany wood floor planks
                    ctx.fillStyle = "#3D2415";
                    ctx.fillRect(bay.x1, bay.y1, bw, bh);
                    ctx.strokeStyle = "rgba(35, 18, 8, 0.45)";
                    ctx.lineWidth = 0.05;
                    for (let py = bay.y1 + 0.6; py < bay.y2 - 0.2; py += 0.6) {
                        ctx.beginPath(); ctx.moveTo(bay.x1, py); ctx.lineTo(bay.x2, py); ctx.stroke();
                    }
                    break;

                case 'SEMINAR_HALL':
                    // Grand institutional deep navy carpet with gold border runner
                    ctx.fillStyle = "#152238";
                    ctx.fillRect(bay.x1, bay.y1, bw, bh);
                    ctx.strokeStyle = "rgba(214, 168, 79, 0.4)";
                    ctx.lineWidth = 0.08;
                    ctx.strokeRect(bay.x1 + 0.5, bay.y1 + 0.5, bw - 1.0, bh - 1.0);
                    // Central aisle runner in ruby velvet
                    ctx.fillStyle = "rgba(128, 29, 40, 0.45)";
                    ctx.fillRect(bay.x1 + 0.6, 9.8, bw - 1.2, 2.6);
                    break;

                case 'LIBRARY':
                    // Parquet hardwood with reading room rug
                    ctx.fillStyle = "#3B2214";
                    ctx.fillRect(bay.x1, bay.y1, bw, bh);
                    ctx.fillStyle = "#6E251B";
                    ctx.fillRect(bay.x1 + 1.1, bay.y1 + 1.6, bw - 2.2, bh - 2.8);
                    ctx.strokeStyle = "#D6A84F";
                    ctx.lineWidth = 0.05;
                    ctx.strokeRect(bay.x1 + 1.1, bay.y1 + 1.6, bw - 2.2, bh - 2.8);
                    break;

                case 'LABORATORY':
                    // High-tech dark technical floor (assets.floor_dark)
                    if (assets.floor_dark) {
                        if (!darkFloorPattern) {
                            darkFloorPattern = ctx.createPattern(assets.floor_dark, 'repeat');
                            const dfScale = 1.2 / assets.floor_dark.width;
                            darkFloorPattern.setTransform(new DOMMatrix().scale(dfScale, dfScale));
                        }
                        ctx.fillStyle = darkFloorPattern;
                        ctx.fillRect(bay.x1, bay.y1, bw, bh);
                    } else {
                        ctx.fillStyle = "#CBD9E6";
                        ctx.fillRect(bay.x1, bay.y1, bw, bh);
                    }
                    ctx.strokeStyle = "rgba(145, 175, 205, 0.45)";
                    ctx.lineWidth = 0.05;
                    for (let gx = bay.x1 + 1.2; gx < bay.x2 - 0.2; gx += 1.2) {
                        ctx.beginPath(); ctx.moveTo(gx, bay.y1); ctx.lineTo(gx, bay.y2); ctx.stroke();
                    }
                    for (let gy = bay.y1 + 1.2; gy < bay.y2 - 0.2; gy += 1.2) {
                        ctx.beginPath(); ctx.moveTo(bay.x1, gy); ctx.lineTo(bay.x2, gy); ctx.stroke();
                    }
                    break;

                case 'STORAGE':
                    // Dusty concrete stone floor
                    ctx.fillStyle = "#464A50";
                    ctx.fillRect(bay.x1, bay.y1, bw, bh);
                    ctx.strokeStyle = "rgba(50, 52, 58, 0.6)";
                    ctx.lineWidth = 0.06;
                    for (let gy = bay.y1 + 1.0; gy < bay.y2; gy += 1.0) {
                        ctx.beginPath(); ctx.moveTo(bay.x1, gy); ctx.lineTo(bay.x2, gy); ctx.stroke();
                    }
                    break;

                case 'FACILITY':
                    // Clean ceramic bathroom tile grid
                    ctx.fillStyle = "#D4E7EF";
                    ctx.fillRect(bay.x1, bay.y1, bw, bh);
                    ctx.strokeStyle = "rgba(165, 195, 210, 0.5)";
                    ctx.lineWidth = 0.04;
                    for (let gx = bay.x1 + 0.6; gx < bay.x2 - 0.1; gx += 0.6) {
                        ctx.beginPath(); ctx.moveTo(gx, bay.y1); ctx.lineTo(gx, bay.y2); ctx.stroke();
                    }
                    for (let gy = bay.y1 + 0.6; gy < bay.y2 - 0.1; gy += 0.6) {
                        ctx.beginPath(); ctx.moveTo(bay.x1, gy); ctx.lineTo(bay.x2, gy); ctx.stroke();
                    }
                    if (assets.washroom_icon) {
                        ctx.drawImage(assets.washroom_icon, (bay.x1 + bay.x2) / 2 - 0.4, bay.y1 + 0.45, 0.8, 0.8);
                    }
                    break;
            }

            // 2.5 Architectural Floor Tile Border & Corner Trim
            if (assets.floor_border) {
                const bThick = 0.22;
                ctx.drawImage(assets.floor_border, bay.x1 + 0.35, bay.y1 + 0.35, bw - 0.7, bThick);
                ctx.drawImage(assets.floor_border, bay.x1 + 0.35, bay.y2 - 0.35 - bThick, bw - 0.7, bThick);
                if (assets.floor_corner) {
                    ctx.drawImage(assets.floor_corner, bay.x1 + 0.2, bay.y1 + 0.35, bThick, bThick);
                    ctx.drawImage(assets.floor_corner, bay.x2 - 0.2 - bThick, bay.y1 + 0.35, bThick, bThick);
                    ctx.drawImage(assets.floor_corner, bay.x1 + 0.2, bay.y2 - 0.35 - bThick, bThick, bThick);
                    ctx.drawImage(assets.floor_corner, bay.x2 - 0.2 - bThick, bay.y2 - 0.35 - bThick, bThick, bThick);
                }
            }

            ctx.restore();

            // 3. Interior Props & Furnishings (High Zoom >= 14)
            if (currentZoom >= 14) {
                ctx.save();
                switch (room.category) {
                    case 'CLASSROOM': {
                        // Student double-desks with chairs
                        const deskW = 1.3, deskH = 0.55;
                        const col1X = bay.x1 + 0.8;
                        const col2X = bay.x1 + 2.6;
                        for (let dy = bay.y1 + 1.4; dy < bay.y2 - 1.1; dy += 1.2) {
                            // Column 1 Desk
                            ctx.fillStyle = "#7C5329";
                            ctx.fillRect(col1X, dy, deskW, deskH);
                            ctx.fillStyle = "#946332";
                            ctx.fillRect(col1X + 0.05, dy + 0.05, deskW - 0.1, deskH - 0.1);
                            // Student laptop / notebook
                            ctx.fillStyle = "#1E2B37";
                            ctx.fillRect(col1X + 0.2, dy + 0.1, 0.32, 0.25);
                            ctx.fillStyle = "#64B5F6";
                            ctx.fillRect(col1X + 0.22, dy + 0.12, 0.28, 0.16);
                            // Chairs
                            if (assets.chair) {
                                ctx.drawImage(assets.chair, col1X + 0.14, dy + deskH + 0.02, 0.36, 0.36);
                                ctx.drawImage(assets.chair, col1X + 0.74, dy + deskH + 0.02, 0.36, 0.36);
                            } else {
                                ctx.fillStyle = "#1976D2";
                                ctx.fillRect(col1X + 0.12, dy + deskH + 0.04, 0.4, 0.28);
                                ctx.fillRect(col1X + 0.72, dy + deskH + 0.04, 0.4, 0.28);
                            }

                            // Column 2 Desk if space permits
                            if (col2X + deskW < bay.x2 - 0.6) {
                                ctx.fillStyle = "#7C5329";
                                ctx.fillRect(col2X, dy, deskW, deskH);
                                ctx.fillStyle = "#946332";
                                ctx.fillRect(col2X + 0.05, dy + 0.05, deskW - 0.1, deskH - 0.1);
                                ctx.fillStyle = "#1E2B37";
                                ctx.fillRect(col2X + 0.2, dy + 0.1, 0.32, 0.25);
                                ctx.fillStyle = "#64B5F6";
                                ctx.fillRect(col2X + 0.22, dy + 0.12, 0.28, 0.16);
                                if (assets.chair) {
                                    ctx.drawImage(assets.chair, col2X + 0.14, dy + deskH + 0.02, 0.36, 0.36);
                                    ctx.drawImage(assets.chair, col2X + 0.74, dy + deskH + 0.02, 0.36, 0.36);
                                } else {
                                    ctx.fillStyle = "#1976D2";
                                    ctx.fillRect(col2X + 0.12, dy + deskH + 0.04, 0.4, 0.28);
                                    ctx.fillRect(col2X + 0.72, dy + deskH + 0.04, 0.4, 0.28);
                                }
                            }
                        }
                        // Corner campus planter
                        if (assets.planter) {
                            const px = bay.wallSide === 'east' ? bay.x2 - 0.9 : bay.x1 + 0.4;
                            ctx.drawImage(assets.planter, px, bay.y2 - 0.85, 0.6, 0.6);
                        }
                        break;
                    }

                    case 'STAFFROOM': {
                        // Central conference table
                        const tx = (bay.x1 + bay.x2) / 2 - 1.2;
                        const ty = (bay.y1 + bay.y2) / 2 - 0.4;
                        const tw = 2.4, th = 1.1;
                        ctx.fillStyle = "#5A3416";
                        ctx.fillRect(tx, ty, tw, th);
                        ctx.fillStyle = "#75451F";
                        ctx.fillRect(tx + 0.08, ty + 0.08, tw - 0.16, th - 0.16);
                        // Conference chairs
                        ctx.fillStyle = "#2D3748";
                        for (let cx = tx + 0.2; cx < tx + tw - 0.2; cx += 0.65) {
                            ctx.fillRect(cx, ty - 0.28, 0.42, 0.22);
                            ctx.fillRect(cx, ty + th + 0.04, 0.42, 0.22);
                        }
                        // Consultation / side table
                        if (assets.small_table) {
                            ctx.drawImage(assets.small_table, tx - 0.95, ty + 0.15, 0.75, 0.65);
                        }
                        // Staff workstation in corner
                        ctx.fillStyle = "#4A321E";
                        ctx.fillRect(bay.x1 + 0.5, bay.y1 + 1.2, 1.1, 0.55);
                        ctx.fillStyle = "#101D2F";
                        ctx.fillRect(bay.x1 + 0.7, bay.y1 + 1.28, 0.38, 0.28);
                        ctx.fillStyle = "#00E5FF";
                        ctx.fillRect(bay.x1 + 0.72, bay.y1 + 1.3, 0.34, 0.2);
                        if (assets.planter) {
                            ctx.drawImage(assets.planter, bay.x1 + 0.45, bay.y2 - 0.8, 0.6, 0.6);
                            ctx.drawImage(assets.planter, bay.x2 - 1.05, bay.y2 - 0.8, 0.6, 0.6);
                        }
                        break;
                    }

                    case 'SEMINAR_HALL': {
                        // 4 Tiered rows of cushioned seminar seats with gold armrests
                        const rowW = 5.6;
                        const rx = bay.x1 + 0.8;
                        for (let ry = bay.y1 + 2.4; ry < bay.y2 - 2.0; ry += 1.8) {
                            ctx.fillStyle = "#6B1A24";
                            ctx.fillRect(rx, ry, rowW, 0.65);
                            ctx.fillStyle = "#8B2432";
                            ctx.fillRect(rx + 0.06, ry + 0.06, rowW - 0.12, 0.53);
                            for (let cx = rx + 0.6; cx < rx + rowW - 0.4; cx += 0.6) {
                                ctx.fillStyle = "#D6A84F";
                                ctx.fillRect(cx - 0.03, ry, 0.06, 0.65);
                            }
                        }
                        // Presentation podium / stage
                        if (assets.stage) {
                            ctx.drawImage(assets.stage, bay.x1 + 0.8, bay.y2 - 2.0, 3.2, 1.6);
                        } else {
                            ctx.fillStyle = "#4E2E16";
                            ctx.fillRect(bay.x1 + 0.8, bay.y2 - 1.8, 2.8, 1.3);
                            ctx.fillStyle = "#D6A84F";
                            ctx.fillRect(bay.x1 + 1.1, bay.y2 - 1.5, 0.8, 0.5);
                        }
                        if (assets.planter) {
                            ctx.drawImage(assets.planter, bay.x2 - 1.0, 3.6, 0.6, 0.6);
                            ctx.drawImage(assets.planter, bay.x2 - 1.0, 10.2, 0.6, 0.6);
                            ctx.drawImage(assets.planter, bay.x2 - 1.0, 17.2, 0.6, 0.6);
                        }
                        break;
                    }

                    case 'LIBRARY': {
                        // Perimeter bookshelves filled with books
                        const shelfD = 0.52;
                        ctx.fillStyle = "#4A2B15";
                        ctx.fillRect(bay.x1 + 0.8, bay.y1 + 0.5, bw - 1.6, shelfD);
                        const bookColors = ["#C0392B", "#27AE60", "#2980B9", "#F39C12", "#8E44AD"];
                        for (let bx = bay.x1 + 0.9; bx < bay.x2 - 0.9; bx += 0.24) {
                            ctx.fillStyle = bookColors[Math.floor(Math.abs(bx * 7)) % bookColors.length];
                            ctx.fillRect(bx, bay.y1 + 0.54, 0.18, shelfD - 0.08);
                        }
                        // Reading tables
                        const rtw = 2.0, rth = 0.95;
                        const rtx = bay.x1 + 1.4, rty = bay.y1 + 2.0;
                        ctx.fillStyle = "#643B1B";
                        ctx.fillRect(rtx, rty, rtw, rth);
                        ctx.fillStyle = "#7E4B24";
                        ctx.fillRect(rtx + 0.08, rty + 0.08, rtw - 0.16, rth - 0.16);
                        ctx.fillStyle = "#2D3748";
                        ctx.fillRect(rtx + 0.25, rty - 0.26, 0.42, 0.22);
                        ctx.fillRect(rtx + 1.15, rty - 0.26, 0.42, 0.22);
                        ctx.fillRect(rtx + 0.25, rty + rth + 0.03, 0.42, 0.22);
                        ctx.fillRect(rtx + 1.15, rty + rth + 0.03, 0.42, 0.22);
                        if (assets.small_table) {
                            ctx.drawImage(assets.small_table, rtx + rtw + 0.3, rty + 0.15, 0.75, 0.65);
                        }
                        break;
                    }

                    case 'LABORATORY': {
                        // Computer lab benches with glowing cyan monitors
                        const benchW = Math.min(bw - 2.0, 3.8);
                        const bx = (bay.x1 + bay.x2) / 2 - benchW / 2;
                        for (let by = bay.y1 + 1.9; by < bay.y2 - 1.3; by += 1.6) {
                            ctx.fillStyle = "#37474F";
                            ctx.fillRect(bx, by, benchW, 0.65);
                            ctx.fillStyle = "#455A64";
                            ctx.fillRect(bx + 0.06, by + 0.06, benchW - 0.12, 0.53);
                            for (let mx = bx + 0.3; mx < bx + benchW - 0.3; mx += 1.1) {
                                ctx.fillStyle = "#102027";
                                ctx.fillRect(mx, by + 0.08, 0.42, 0.32);
                                ctx.fillStyle = "#00E5FF";
                                ctx.fillRect(mx + 0.04, by + 0.11, 0.34, 0.22);
                                if (assets.chair) {
                                    ctx.drawImage(assets.chair, mx + 0.04, by + 0.66, 0.34, 0.34);
                                } else {
                                    ctx.fillStyle = "#263238";
                                    ctx.fillRect(mx + 0.05, by + 0.70, 0.32, 0.22);
                                }
                            }
                        }
                        // Server rack with blinking LEDs
                        ctx.fillStyle = "#102027";
                        ctx.fillRect(bay.x1 + 0.5, bay.y1 + 0.75, 0.65, 1.0);
                        ctx.fillStyle = "#00E676";
                        ctx.fillRect(bay.x1 + 0.65, bay.y1 + 0.95, 0.08, 0.08);
                        ctx.fillStyle = "#FFB300";
                        ctx.fillRect(bay.x1 + 0.85, bay.y1 + 0.95, 0.08, 0.08);
                        break;
                    }

                    case 'FACULTY': {
                        // Executive desk with computer & lamp
                        const edx = (bay.x1 + bay.x2) / 2 - 0.95;
                        const edy = (bay.y1 + bay.y2) / 2 - 0.35;
                        const edw = 1.9, edh = 0.85;
                        ctx.fillStyle = "#4A2810";
                        ctx.fillRect(edx, edy, edw, edh);
                        ctx.fillStyle = "#633716";
                        ctx.fillRect(edx + 0.06, edy + 0.06, edw - 0.12, edh - 0.12);
                        // Executive high-back chair
                        ctx.fillStyle = "#1A1A1A";
                        ctx.fillRect(edx + edw / 2 - 0.28, edy - 0.38, 0.56, 0.32);
                        // Guest chairs
                        ctx.fillStyle = "#334155";
                        ctx.fillRect(edx + 0.2, edy + edh + 0.06, 0.42, 0.25);
                        ctx.fillRect(edx + edw - 0.62, edy + edh + 0.06, 0.42, 0.25);
                        if (assets.small_table) {
                            ctx.drawImage(assets.small_table, edx + edw - 0.72, edy + edh + 0.06, 0.62, 0.52);
                        }
                        // Desktop PC & Lamp
                        ctx.fillStyle = "#1E293B";
                        ctx.fillRect(edx + 0.25, edy + 0.14, 0.38, 0.28);
                        ctx.fillStyle = "#38BDF8";
                        ctx.fillRect(edx + 0.28, edy + 0.16, 0.32, 0.19);
                        ctx.fillStyle = "#D6A84F";
                        ctx.fillRect(edx + edw - 0.45, edy + 0.18, 0.22, 0.22);
                        break;
                    }

                    case 'STORAGE': {
                        // Stacked wooden crates with diagonal cross-braces
                        const crates = [
                            { x: bay.x1 + 0.7, y: bay.y1 + 1.4, w: 0.85, h: 0.85 },
                            { x: bay.x1 + 1.65, y: bay.y1 + 1.4, w: 0.8, h: 0.8 },
                            { x: bay.x1 + 0.7, y: bay.y1 + 2.35, w: 0.8, h: 0.8 },
                            { x: bay.x1 + 1.6, y: bay.y1 + 2.3, w: 0.85, h: 0.85 },
                            { x: bay.x2 - 1.7, y: bay.y1 + 1.4, w: 0.8, h: 0.8 }
                        ];
                        crates.forEach(c => {
                            ctx.fillStyle = "#5D4037";
                            ctx.fillRect(c.x, c.y, c.w, c.h);
                            ctx.fillStyle = "#795548";
                            ctx.fillRect(c.x + 0.05, c.y + 0.05, c.w - 0.1, c.h - 0.1);
                            ctx.strokeStyle = "#4E342E";
                            ctx.lineWidth = 0.04;
                            ctx.beginPath();
                            ctx.moveTo(c.x + 0.05, c.y + 0.05); ctx.lineTo(c.x + c.w - 0.05, c.y + c.h - 0.05);
                            ctx.moveTo(c.x + c.w - 0.05, c.y + 0.05); ctx.lineTo(c.x + 0.05, c.y + c.h - 0.05);
                            ctx.stroke();
                        });
                        break;
                    }

                    case 'FACILITY': {
                        // Restroom stalls and porcelain washbasins
                        const stallW = 0.85, stallD = 1.05;
                        const sx = bay.x1 + 0.75;
                        for (let sy = bay.y1 + 1.3; sy < bay.y2 - 0.8; sy += 1.15) {
                            ctx.fillStyle = "#94A3B8";
                            ctx.fillRect(sx, sy, stallW, stallD);
                            ctx.fillStyle = "#CBD5E1";
                            ctx.fillRect(sx + 0.04, sy + 0.04, stallW - 0.08, stallD - 0.08);
                            ctx.strokeStyle = "#64748B";
                            ctx.lineWidth = 0.04;
                            ctx.strokeRect(sx, sy, stallW, stallD);
                        }
                        // Sinks
                        const sinkX = bay.x2 - 0.75;
                        for (let sy = bay.y1 + 1.4; sy < bay.y2 - 0.8; sy += 1.1) {
                            ctx.fillStyle = "#FFFFFF";
                            ctx.fillRect(sinkX, sy, 0.42, 0.32);
                            ctx.strokeStyle = "#94A3B8";
                            ctx.lineWidth = 0.03;
                            ctx.strokeRect(sinkX, sy, 0.42, 0.32);
                        }
                        break;
                    }
                }
                ctx.restore();
            }

            // 4. Modular Enclosing Walls & Stone Corner Pillars
            ctx.save();
            const wt = 0.36; // wall thickness

            function drawWallSegment(x, y, w, h, isHoriz) {
                ctx.fillStyle = "#101D2F";
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = "#E8DFC9";
                if (isHoriz) {
                    ctx.fillRect(x, y, w, h * 0.72);
                    ctx.fillStyle = "#FFFDF9";
                    ctx.fillRect(x, y, w, 0.05);
                    ctx.fillStyle = "#D6CABA";
                    for (let jx = x + 1.2; jx < x + w - 0.2; jx += 1.2) {
                        ctx.fillRect(jx, y, 0.04, h * 0.72);
                    }
                } else {
                    ctx.fillRect(x, y, w * 0.72, h);
                    ctx.fillStyle = "#FFFDF9";
                    ctx.fillRect(x, y, 0.05, h);
                    ctx.fillStyle = "#D6CABA";
                    for (let jy = y + 1.2; jy < y + h - 0.2; jy += 1.2) {
                        ctx.fillRect(x, jy, w * 0.72, 0.04);
                    }
                }
            }

            function drawCornerPillar(cx, cy) {
                const ps = 0.44;
                ctx.fillStyle = "#D6A84F";
                ctx.fillRect(cx - ps / 2, cy - ps / 2, ps, ps);
                ctx.fillStyle = "#FFFDF9";
                ctx.fillRect(cx - ps / 2 + 0.05, cy - ps / 2 + 0.05, ps - 0.1, ps - 0.1);
                ctx.strokeStyle = "#101D2F";
                ctx.lineWidth = 0.05;
                ctx.strokeRect(cx - ps / 2, cy - ps / 2, ps, ps);
            }

            if (bay.wallSide === 'east') {
                drawWallSegment(bay.x1, bay.y1, wt, bh, false);
                drawWallSegment(bay.x1, bay.y1, bw, wt, true);
                drawWallSegment(bay.x1, bay.y2 - wt, bw, wt, true);
                drawCornerPillar(bay.x1 + wt / 2, bay.y1 + wt / 2);
                drawCornerPillar(bay.x1 + wt / 2, bay.y2 - wt / 2);
            } else if (bay.wallSide === 'west') {
                drawWallSegment(bay.x2 - wt, bay.y1, wt, bh, false);
                drawWallSegment(bay.x1, bay.y1, bw, wt, true);
                drawWallSegment(bay.x1, bay.y2 - wt, bw, wt, true);
                drawCornerPillar(bay.x2 - wt / 2, bay.y1 + wt / 2);
                drawCornerPillar(bay.x2 - wt / 2, bay.y2 - wt / 2);
            } else if (bay.wallSide === 'north') {
                drawWallSegment(bay.x1, bay.y1, wt, bh, false);
                drawWallSegment(bay.x2 - wt, bay.y1, wt, bh, false);
                drawWallSegment(bay.x1, bay.y2 - wt, bw, wt, true);
                drawCornerPillar(bay.x1 + wt / 2, bay.y2 - wt / 2);
                drawCornerPillar(bay.x2 - wt / 2, bay.y2 - wt / 2);
            }
            ctx.restore();

            // 5. Integrated 16-Bit Institutional WAB Plaque at TOP of Room
            drawPlaque(ctx, room, bay, currentZoom);
        });

        ctx.restore();
    }

    function drawPlaque(ctx, room, bay, cameraZoom) {
        ctx.save();
        const currentZoom = cameraZoom || 18;
        const bw = bay.x2 - bay.x1;
        const cx = (bay.x1 + bay.x2) / 2;
        let cy = bay.y1 + 0.74;
        if (room.id === 'WAB213') {
            cy = bay.y1 + 1.95; // Below north entrance in South lab
        }

        const isDetailed = currentZoom >= 14;
        let pw;
        if (room.id === 'WAB213') {
            pw = Math.min(bw - 0.8, isDetailed ? 8.0 : 3.8);
        } else if (bw >= 5.5) {
            pw = Math.min(bw - 0.5, isDetailed ? 5.1 : 2.8);
        } else {
            pw = Math.min(bw - 0.35, isDetailed ? 4.25 : 2.5);
        }
        const ph = isDetailed ? 1.25 : 0.72;
        const rx = cx - pw / 2;
        const ry = cy - ph / 2;

        // Plaque Drop Shadow
        ctx.fillStyle = "rgba(4, 7, 13, 0.75)";
        ctx.fillRect(rx + 0.06, ry + 0.06, pw, ph);

        // Deep Solid Navy Backing
        ctx.fillStyle = "#0B1524";
        ctx.fillRect(rx, ry, pw, ph);

        // Gold 16-bit Border
        ctx.strokeStyle = "#FFB52E";
        ctx.lineWidth = 0.08;
        ctx.strokeRect(rx, ry, pw, ph);

        // Corner gold pixel trim
        ctx.fillStyle = "#FFD166";
        const cs = 0.13;
        ctx.fillRect(rx, ry, cs, cs);
        ctx.fillRect(rx + pw - cs, ry, cs, cs);
        ctx.fillRect(rx, ry + ph - cs, cs, cs);
        ctx.fillRect(rx + pw - cs, ry + ph - cs, cs, cs);

        // Text Hierarchy
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (isDetailed) {
            // Primary WAB Code (Large, Ivory/Cream, Pixel Font)
            ctx.fillStyle = "#FFFDF9";
            ctx.font = "bold 0.38px 'Press Start 2P', monospace";
            ctx.fillText(room.code, cx, cy - 0.23);

            // Secondary Room Title (Substantially more visible, 800 Manrope, Luminous Gold/Cream)
            if (room.locked) {
                ctx.fillStyle = "#FF7B72";
                ctx.font = "800 0.32px 'Manrope', -apple-system, sans-serif";
                ctx.fillText("LOCKED • Storage Room", cx, cy + 0.23);
            } else if (room.category === 'FACILITY') {
                ctx.fillStyle = "#FFDF85";
                ctx.font = "800 0.32px 'Manrope', -apple-system, sans-serif";
                const sub = room.id === 'WAB208' ? "🚹 Men's Washroom" : "🚺 Ladies Washroom";
                ctx.fillText(sub, cx, cy + 0.23);
            } else {
                ctx.fillStyle = "#FFDF85";
                ctx.font = "800 0.33px 'Manrope', -apple-system, sans-serif";
                const maxLen = pw > 7.0 ? 48 : (pw > 4.5 ? 32 : 22);
                const sub = room.name.length > maxLen ? room.name.substring(0, maxLen - 2) + "…" : room.name;
                ctx.fillText(sub, cx, cy + 0.23);
            }
        } else {
            // Medium / Low zoom: Primary WAB Code only (clamped to remain clearly legible at exhibition distance)
            ctx.fillStyle = "#FFFDF9";
            const codeSize = Math.max(0.38, 5.2 / currentZoom).toFixed(2);
            ctx.font = `bold ${codeSize}px 'Press Start 2P', monospace`;
            ctx.fillText(room.code, cx, cy);
        }
        ctx.restore();
    }

    // Phase 6 & Phase 7 Cached Offscreen Layers
    let cachedStaticWorldCanvas = null;
    let cachedMinimapCanvases = {
        NORTH: null,
        TRANSITION: null,
        SOUTH: null
    };

    const STATIC_WORLD_BOUNDS = {
        minX: -26,
        minY: -18,
        maxX: 26,
        maxY: 88,
        scale: 24 // 24 px per world meter = 1248 x 2544 px
    };

    function renderAuditoriumVoid(ctx, assets, viewMinX = -100, viewMaxX = 100, viewMinY = -100, viewMaxY = 200) {
        // Frustum culled: only render if courtyard intersects visible viewport
        const isVoidVisible = !(viewMaxX < -10.0 || viewMinX > 10.0 || viewMaxY < 34.0 || viewMinY > 71.5);
        if (!isVoidVisible) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // 1. Multi-Stop Deep Shaft Void Base Gradient (Level 0 depth)
        const voidGrad = ctx.createLinearGradient(0, 34.5, 0, 71.0);
        voidGrad.addColorStop(0, "#08111D");
        voidGrad.addColorStop(0.2, "#04070D");
        voidGrad.addColorStop(0.8, "#04070D");
        voidGrad.addColorStop(1, "#08111D");
        ctx.fillStyle = voidGrad;
        ctx.fillRect(-9.5, 34.5, 19.0, 36.5);

        // 2. Recessed ambient shadow along void edges to convey vertical depth below Level 1
        ctx.save();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-9.1, 34.9, 18.2, 35.7);
        ctx.strokeStyle = "rgba(14, 27, 45, 0.55)";
        ctx.lineWidth = 0.4;
        ctx.strokeRect(-8.8, 35.2, 17.6, 35.1);
        ctx.restore();

        // 3. Auditorium Seating Tiers (Level 0, below Level 1 balcony)
        if (assets && assets.seating) {
            ctx.save();
            // Upper seating section (North tiered rows)
            ctx.drawImage(assets.seating, -7.5, 36.5, 15.0, 7.5);
            // Lower seating section (South tiered rows)
            ctx.drawImage(assets.seating, -7.5, 52.5, 15.0, 7.5);

            // Subtle dark atmospheric depth shadow over seating
            ctx.fillStyle = "rgba(4, 7, 13, 0.42)";
            ctx.fillRect(-7.5, 36.5, 15.0, 7.5);
            ctx.fillRect(-7.5, 52.5, 15.0, 7.5);
            ctx.restore();
        }

        // 4. Auditorium Stage & Podium (Center-South, Level 0)
        if (assets && assets.stage) {
            ctx.save();
            const stW = 7.6;
            const stH = 5.8;
            const stX = -stW / 2;
            const stY = 62.8;
            ctx.drawImage(assets.stage, stX, stY, stW, stH);

            // Warm stage lighting glow
            const stGlow = ctx.createRadialGradient(0, stY + stH / 2, 0.5, 0, stY + stH / 2, stW / 1.8);
            stGlow.addColorStop(0, "rgba(255, 235, 170, 0.16)");
            stGlow.addColorStop(1, "rgba(255, 235, 170, 0)");
            ctx.fillStyle = stGlow;
            ctx.fillRect(stX - 1, stY - 1, stW + 2, stH + 2);

            ctx.fillStyle = "rgba(214, 168, 79, 0.85)";
            ctx.font = "bold 0.32px 'Press Start 2P', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("STAGE (LEVEL 0)", 0, stY + stH - 0.6);
            ctx.restore();
        }

        // 5. Central Institutional Void Label
        ctx.save();
        ctx.fillStyle = "#FFFDF9";
        ctx.font = "bold 0.85px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("AUDITORIUM", 0, 48.2);

        ctx.fillStyle = "#D6A84F";
        ctx.font = "bold 0.65px 'Manrope', sans-serif";
        ctx.fillText("(LEVEL 0 - BELOW)", 0, 49.5);

        ctx.strokeStyle = "rgba(214, 168, 79, 0.4)";
        ctx.lineWidth = 0.08;
        ctx.setLineDash([0.3, 0.2]);
        ctx.beginPath();
        ctx.moveTo(-4.5, 50.4);
        ctx.lineTo(4.5, 50.4);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#FFFDF9";
        ctx.font = "bold 0.65px 'Press Start 2P', monospace";
        ctx.fillText("OPEN TO BELOW", 0, 51.4);

        ctx.fillStyle = "#B8C9DC";
        ctx.font = "600 0.60px 'Manrope', sans-serif";
        ctx.fillText("(Overlooks Level 0 Auditorium)", 0, 52.6);
        ctx.restore();

        // 6. Modular Balustrades & Railings (Level 1 Balcony Edge)
        if (assets && assets.balustrade_h && assets.balustrade_v) {
            ctx.save();
            const railThick = 0.85;

            // North Balustrade: y = 34.5, spans x in [-9.5, 9.5] (19.0m)
            const segW = 3.8;
            for (let bx = -9.5; bx < 9.4; bx += segW) {
                ctx.drawImage(assets.balustrade_h, bx, 34.5 - railThick / 2, segW, railThick);
            }

            // South Balustrade: y = 71.0, spans x in [-9.5, 9.5] (19.0m)
            for (let bx = -9.5; bx < 9.4; bx += segW) {
                ctx.drawImage(assets.balustrade_h, bx, 71.0 - railThick / 2, segW, railThick);
            }

            // West Balustrade: x = -9.5, spans y in [34.5, 71.0] (36.5m)
            const segH = 3.65;
            for (let by = 34.5; by < 70.9; by += segH) {
                ctx.drawImage(assets.balustrade_v, -9.5 - railThick / 2, by, railThick, segH);
            }

            // East Balustrade: x = 9.5, spans y in [34.5, 71.0] (36.5m)
            for (let by = 34.5; by < 70.9; by += segH) {
                ctx.drawImage(assets.balustrade_v, 9.5 - railThick / 2, by, railThick, segH);
            }

            // Corner Anchor Pillars at the 4 balustrade vertices
            const corners = [
                { x: -9.5, y: 34.5 },
                { x: 9.5, y: 34.5 },
                { x: -9.5, y: 71.0 },
                { x: 9.5, y: 71.0 }
            ];
            corners.forEach(c => {
                ctx.fillStyle = "#D6A84F";
                ctx.fillRect(c.x - 0.45, c.y - 0.45, 0.9, 0.9);
                ctx.strokeStyle = "#0E1B2D";
                ctx.lineWidth = 0.08;
                ctx.strokeRect(c.x - 0.45, c.y - 0.45, 0.9, 0.9);
            });

            ctx.restore();
        } else {
            // Fallback golden railing stroke
            ctx.save();
            ctx.strokeStyle = "#D6A84F";
            ctx.lineWidth = 0.22;
            ctx.strokeRect(-9.5, 34.5, 19.0, 36.5);
            ctx.restore();
        }

        ctx.restore();
    }

    function renderFireExitStaircases(ctx, nodes, assets, viewMinX = -100, viewMaxX = 100, viewMinY = -100, viewMaxY = 200) {
        const fireExits = [
            { id: "FE_1", x: 12.5, y: 35.6, dir: 1, x1: 12.5, x2: 17.2, y1: 34.6, y2: 36.6 },
            { id: "FE_L", x: -12.4, y: 35.6, dir: -1, x1: -17.2, x2: -12.4, y1: 34.6, y2: 36.6 },
            { id: "FE_B", x: 11.2, y: 74.6, dir: 1, x1: 11.2, x2: 15.9, y1: 73.6, y2: 75.6 }
        ];

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        fireExits.forEach(fe => {
            const bw = fe.x2 - fe.x1;
            const bh = fe.y2 - fe.y1;
            if (fe.x2 < viewMinX || fe.x1 > viewMaxX || fe.y2 < viewMinY || fe.y1 > viewMaxY) {
                return;
            }

            const isEast = fe.dir === 1;

            // 1. Concrete landing floor base
            ctx.fillStyle = "#0a111a";
            ctx.fillRect(fe.x1, fe.y1, bw, bh);

            // 2. Multi-stop descending depth gradient (Level 1 landing down into Level 0 stairwell shaft)
            const shaftGrad = ctx.createLinearGradient(
                isEast ? fe.x1 : fe.x2, 0,
                isEast ? fe.x2 : fe.x1, 0
            );
            shaftGrad.addColorStop(0, "rgba(20, 32, 48, 0.45)");
            shaftGrad.addColorStop(0.5, "rgba(10, 16, 26, 0.85)");
            shaftGrad.addColorStop(1, "#020509");
            ctx.fillStyle = shaftGrad;
            ctx.fillRect(fe.x1, fe.y1, bw, bh);

            // 3. Pixel art staircase asset descending down
            const stairImg = assets ? assets.staircase_down : null;
            if (stairImg) {
                ctx.save();
                const stW = 2.4;
                const stH = 1.8;
                const stY = fe.y1 + (bh - stH) / 2;
                if (isEast) {
                    ctx.drawImage(stairImg, fe.x1 + 0.15, stY, stW, stH);
                } else {
                    ctx.translate(fe.x2 - 0.15, stY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(stairImg, 0, 0, stW, stH);
                }
                ctx.restore();
            }

            // Step tread depth lines
            ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
            ctx.lineWidth = 0.04;
            for (let i = 1; i <= 4; i++) {
                const stepX = isEast ? fe.x1 + 0.35 + i * 0.45 : fe.x2 - 0.35 - i * 0.45;
                ctx.beginPath();
                ctx.moveTo(stepX, fe.y1 + 0.1);
                ctx.lineTo(stepX, fe.y2 - 0.1);
                ctx.stroke();
            }

            // 4. Outer stairwell enclosure walls (16-bit retro architecture)
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 0.10;
            ctx.beginPath();
            if (isEast) {
                ctx.moveTo(fe.x1, fe.y1);
                ctx.lineTo(fe.x2, fe.y1);
                ctx.lineTo(fe.x2, fe.y2);
                ctx.lineTo(fe.x1, fe.y2);
            } else {
                ctx.moveTo(fe.x2, fe.y1);
                ctx.lineTo(fe.x1, fe.y1);
                ctx.lineTo(fe.x1, fe.y2);
                ctx.lineTo(fe.x2, fe.y2);
            }
            ctx.stroke();

            // 5. 16-Bit Directional Plaque: Communicates LEVEL 1 -> STAIRS DOWN -> LEVEL 0
            const plaqueW = 1.8;
            const plaqueH = 1.6;
            const plaqueX = isEast ? fe.x2 - plaqueW - 0.15 : fe.x1 + 0.15;
            const plaqueY = fe.y1 + (bh - plaqueH) / 2;

            // Plaque background & gold border
            ctx.fillStyle = "#09111c";
            ctx.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
            ctx.strokeStyle = "#d97706";
            ctx.lineWidth = 0.04;
            ctx.strokeRect(plaqueX, plaqueY, plaqueW, plaqueH);

            // Plaque text
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const centerX = plaqueX + plaqueW / 2;

            ctx.fillStyle = "#93c5fd";
            ctx.font = "bold 0.14px 'Press Start 2P', monospace";
            ctx.fillText("LEVEL 1", centerX, plaqueY + 0.24);

            ctx.fillStyle = "#fbbf24";
            ctx.font = "bold 0.14px 'Press Start 2P', monospace";
            ctx.fillText("↓", centerX, plaqueY + 0.52);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 0.11px 'Press Start 2P', monospace";
            ctx.fillText("STAIRS DOWN", centerX, plaqueY + 0.80);

            ctx.fillStyle = "#fbbf24";
            ctx.font = "bold 0.14px 'Press Start 2P', monospace";
            ctx.fillText("↓", centerX, plaqueY + 1.08);

            ctx.fillStyle = "#4ade80";
            ctx.font = "bold 0.14px 'Press Start 2P', monospace";
            ctx.fillText("LEVEL 0", centerX, plaqueY + 1.34);
        });

        ctx.restore();
    }

    function buildStaticWorldCache(nodes, edges, nodeMap, rooms) {
        if (typeof document === 'undefined') return;
        try {
            const c = document.createElement('canvas');
            c.width = Math.round((STATIC_WORLD_BOUNDS.maxX - STATIC_WORLD_BOUNDS.minX) * STATIC_WORLD_BOUNDS.scale);
            c.height = Math.round((STATIC_WORLD_BOUNDS.maxY - STATIC_WORLD_BOUNDS.minY) * STATIC_WORLD_BOUNDS.scale);
            const cCtx = c.getContext('2d');
            if (!cCtx) return;

            cCtx.imageSmoothingEnabled = false;
            cCtx.save();
            cCtx.scale(STATIC_WORLD_BOUNDS.scale, STATIC_WORLD_BOUNDS.scale);
            cCtx.translate(-STATIC_WORLD_BOUNDS.minX, -STATIC_WORLD_BOUNDS.minY);

            renderEnvironment(cCtx, STATIC_WORLD_BOUNDS.minX, STATIC_WORLD_BOUNDS.maxX, STATIC_WORLD_BOUNDS.minY, STATIC_WORLD_BOUNDS.maxY);
            renderBuildingFoundation(cCtx, STATIC_WORLD_BOUNDS.minX, STATIC_WORLD_BOUNDS.maxX, STATIC_WORLD_BOUNDS.minY, STATIC_WORLD_BOUNDS.maxY);
            renderFloors(cCtx, nodes, edges, nodeMap, STATIC_WORLD_BOUNDS.minX, STATIC_WORLD_BOUNDS.maxX, STATIC_WORLD_BOUNDS.minY, STATIC_WORLD_BOUNDS.maxY);
            renderAuditoriumVoid(cCtx, assets, STATIC_WORLD_BOUNDS.minX, STATIC_WORLD_BOUNDS.maxX, STATIC_WORLD_BOUNDS.minY, STATIC_WORLD_BOUNDS.maxY);
            renderRoomBays(cCtx, rooms, nodes, nodeMap, 24, STATIC_WORLD_BOUNDS.minX, STATIC_WORLD_BOUNDS.maxX, STATIC_WORLD_BOUNDS.minY, STATIC_WORLD_BOUNDS.maxY);
            renderWalls(cCtx, nodes, edges, nodeMap, STATIC_WORLD_BOUNDS.minX, STATIC_WORLD_BOUNDS.maxX, STATIC_WORLD_BOUNDS.minY, STATIC_WORLD_BOUNDS.maxY);
            renderFireExitStaircases(cCtx, nodes, assets, STATIC_WORLD_BOUNDS.minX, STATIC_WORLD_BOUNDS.maxX, STATIC_WORLD_BOUNDS.minY, STATIC_WORLD_BOUNDS.maxY);
            renderDoors(cCtx, nodes, edges, nodeMap, rooms, null, STATIC_WORLD_BOUNDS.minX, STATIC_WORLD_BOUNDS.maxX, STATIC_WORLD_BOUNDS.minY, STATIC_WORLD_BOUNDS.maxY);

            cCtx.restore();
            cachedStaticWorldCanvas = c;
            console.log("[MapRenderer] Static world canvas pre-rendered and cached successfully");
        } catch (err) {
            console.warn("[MapRenderer] Could not cache static world layer:", err);
        }
    }

    function buildStaticMinimapCache(nodes, edges) {
        if (typeof document === 'undefined') return;
        try {
            const scenes = ['NORTH', 'TRANSITION', 'SOUTH'];
            scenes.forEach(scene => {
                const c = document.createElement('canvas');
                c.width = 124;
                c.height = 176;
                const mCtx = c.getContext('2d');
                if (!mCtx) return;

                const w = c.width;
                const h = c.height;
                mCtx.fillStyle = "#08101C";
                mCtx.fillRect(0, 0, w, h);

                const worldW = 27;
                const worldH = 78;
                const pad = 6;
                const scale = Math.min((w - pad * 2) / worldW, (h - pad * 2) / worldH);
                const originX = w / 2;
                const originY = pad + (2 * scale);
                function toMx(wx) { return originX + wx * scale; }
                function toMy(wy) { return originY + wy * scale; }

                // Void
                const voidX = toMx(-9.5);
                const voidY = toMy(34.5);
                const voidW = 19.0 * scale;
                const voidH = 36.5 * scale;
                mCtx.fillStyle = "#04080E";
                mCtx.fillRect(voidX, voidY, voidW, voidH);

                if (scene === 'TRANSITION') {
                    mCtx.strokeStyle = "#FFD56B";
                    mCtx.lineWidth = 1.5;
                    mCtx.strokeRect(voidX - 0.5, voidY - 0.5, voidW + 1, voidH + 1);
                    mCtx.fillStyle = "#FFD56B";
                    mCtx.font = "bold 6px 'Press Start 2P', monospace";
                    mCtx.textAlign = "center";
                    mCtx.textBaseline = "middle";
                    mCtx.fillText("AUDITORIUM", toMx(0), toMy(52.75));
                } else {
                    mCtx.strokeStyle = "rgba(214, 168, 79, 0.45)";
                    mCtx.lineWidth = 1;
                    mCtx.strokeRect(voidX, voidY, voidW, voidH);
                    mCtx.fillStyle = "rgba(214, 168, 79, 0.35)";
                    mCtx.font = "bold 6px 'Press Start 2P', monospace";
                    mCtx.textAlign = "center";
                    mCtx.textBaseline = "middle";
                    mCtx.fillText("VOID", toMx(0), toMy(52.75));
                }

                // Corridor lines
                if (edges && nodes) {
                    const nMap = new Map(nodes.map(n => [n.id, n]));
                    edges.forEach(e => {
                        const f = nMap.get(e.from);
                        const t = nMap.get(e.to);
                        if (f && t) {
                            const isNorthEdge = (f.y <= 32.3 && t.y <= 32.3);
                            const isSouthEdge = (f.y >= 32.1 || t.y >= 32.1);
                            mCtx.beginPath();
                            mCtx.moveTo(toMx(f.x), toMy(f.y));
                            mCtx.lineTo(toMx(t.x), toMy(t.y));
                            if (scene === 'NORTH') {
                                mCtx.strokeStyle = isNorthEdge ? "#FFD56B" : "rgba(214, 168, 79, 0.22)";
                                mCtx.lineWidth = Math.max(isNorthEdge ? 2.0 : 1.0, (isNorthEdge ? 2.8 : 1.4) * scale);
                            } else if (scene === 'SOUTH') {
                                mCtx.strokeStyle = isSouthEdge ? "#FFD56B" : "rgba(214, 168, 79, 0.22)";
                                mCtx.lineWidth = Math.max(isSouthEdge ? 2.0 : 1.0, (isSouthEdge ? 2.8 : 1.4) * scale);
                            } else {
                                mCtx.strokeStyle = "rgba(214, 168, 79, 0.55)";
                                mCtx.lineWidth = Math.max(1.5, 2.0 * scale);
                            }
                            mCtx.stroke();
                        }
                    });

                    // Room Door Points
                    nodes.forEach(n => {
                        if (n.type === "ROOM_DOOR") {
                            const isNorthDoor = n.y <= 32.2;
                            if (scene === 'NORTH') {
                                mCtx.fillStyle = isNorthDoor ? "rgba(255, 253, 249, 0.9)" : "rgba(255, 253, 249, 0.2)";
                            } else if (scene === 'SOUTH') {
                                mCtx.fillStyle = !isNorthDoor ? "rgba(255, 253, 249, 0.9)" : "rgba(255, 253, 249, 0.2)";
                            } else {
                                mCtx.fillStyle = "rgba(255, 253, 249, 0.5)";
                            }
                            mCtx.fillRect(toMx(n.x) - 1, toMy(n.y) - 1, 2, 2);
                        }
                    });
                }
                cachedMinimapCanvases[scene] = c;
            });
            console.log("[MapRenderer] Minimap static background pre-rendered and cached");
        } catch (err) {
            console.warn("[MapRenderer] Could not cache static minimap layer:", err);
        }
    }

    return {
        init,
        buildStaticWorldCache,
        buildStaticMinimapCache,
        get cachedStaticWorldCanvas() { return cachedStaticWorldCanvas; },
        get cachedMinimapCanvases() { return cachedMinimapCanvases; },
        STATIC_WORLD_BOUNDS,
        renderBuildingFoundation,
        renderFloors,
        renderWalls,
        renderDoors,
        renderFireExitStaircases,
        renderAuditoriumVoid,
        renderRoomBays,
        renderEnvironment,
        renderMinimap,
        ROOM_BAYS,
        CONFIG,
        ASSET_CONFIG,
        assets
    };
})();

export function renderCanvasMap(ctx, canvas, camera, { nodes, edges, nodeMap, rooms, currentRoute, activeDestination, isDebug, cameraZoom, mapScene = 'NORTH', drawPlayer, drawDebug, drawNpc, drawStudent, playerPos, guideY = 1.1, getStudentY }) {
  const dpr = (canvas.width && canvas.style && canvas.style.width) ? (canvas.width / parseFloat(canvas.style.width)) : Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, 2);
  const zoom = camera.zoom || cameraZoom || 18;
  const cssW = (canvas.style && canvas.style.width) ? parseFloat(canvas.style.width) : (camera.viewportWidth || canvas.width / dpr);
  const cssH = (canvas.style && canvas.style.height) ? parseFloat(canvas.style.height) : (camera.viewportHeight || canvas.height / dpr);

  // Fast frustum bounds in world meters (with 5.0m margin for large assets)
  const margin = 5.0;
  const viewMinX = -camera.x / zoom - margin;
  const viewMaxX = (cssW - camera.x) / zoom + margin;
  const viewMinY = -camera.y / zoom - margin;
  const viewMaxY = (cssH - camera.y) / zoom + margin;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  // Fill entire canvas with Phase 8A Deep Navy (#0E1B2D) institutional background
  ctx.fillStyle = "#0E1B2D";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set high-density pixel-crisp world transform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  ctx.save();

  // Camera transform in world-space (CSS pixel coordinates)
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  const assets = MapRenderer.assets;

  // --------------------------------------------------------------------------
  // STATIC WORLD LAYER (Phase 6 Cached Offscreen Canvas Blit)
  // --------------------------------------------------------------------------
  if (MapRenderer.cachedStaticWorldCanvas) {
    ctx.drawImage(
      MapRenderer.cachedStaticWorldCanvas,
      MapRenderer.STATIC_WORLD_BOUNDS.minX,
      MapRenderer.STATIC_WORLD_BOUNDS.minY,
      MapRenderer.STATIC_WORLD_BOUNDS.maxX - MapRenderer.STATIC_WORLD_BOUNDS.minX,
      MapRenderer.STATIC_WORLD_BOUNDS.maxY - MapRenderer.STATIC_WORLD_BOUNDS.minY
    );
  } else {
    // Fallback direct rendering for headless test runners
    MapRenderer.renderEnvironment(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);

  // --------------------------------------------------------------------------
  // LAYER -1.5: BUILDING FOUNDATION SYSTEM (Phase 25 Architectural Plinth)
  // --------------------------------------------------------------------------
  MapRenderer.renderBuildingFoundation(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);

  // --------------------------------------------------------------------------
  // LAYER -1: OUTDOOR VEGETATION & CAMPUS GROUNDS (Surrounding Architectural Perimeter)
  // --------------------------------------------------------------------------
  const OUTDOOR_VEGETATION = [
    // Entrance Plaza formal hedges
    { type: 'hedge', x: -6.8, y: -2.5, w: 2.2, h: 0.9 },
    { type: 'hedge', x: 4.6, y: -2.5, w: 2.2, h: 0.9 },
    { type: 'hedge', x: -6.8, y: -12.5, w: 2.2, h: 0.9 },
    { type: 'hedge', x: 4.6, y: -12.5, w: 2.2, h: 0.9 },

    // Flower clusters at plaza corners & rest nodes
    { type: 'flower_cluster', x: -7.5, y: -3.8, s: 1.2 },
    { type: 'flower_cluster', x: 6.3, y: -3.8, s: 1.2 },
    { type: 'flower_cluster', x: -7.5, y: -10.5, s: 1.2 },
    { type: 'flower_cluster', x: 6.3, y: -10.5, s: 1.2 },

    // Flowering bushes
    { type: 'bush_flowering', x: -19.2, y: 37.0, s: 1.4 },
    { type: 'bush_flowering', x: 19.2, y: 37.0, s: 1.4 },
    { type: 'bush_flowering', x: -19.2, y: 51.0, s: 1.4 },
    { type: 'bush_flowering', x: 19.2, y: 51.0, s: 1.4 },
    { type: 'bush_flowering', x: -19.2, y: 67.0, s: 1.4 },
    { type: 'bush_flowering', x: 19.2, y: 67.0, s: 1.4 },
    { type: 'bush_flowering', x: -3.8, y: -1.2, s: 1.3 },
    { type: 'bush_flowering', x: 2.5, y: -1.2, s: 1.3 },

    // Medium trees in campus groves
    { type: 'tree_medium', x: -22.5, y: 35.0, s: 2.3 },
    { type: 'tree_medium', x: 22.5, y: 35.0, s: 2.3 },
    { type: 'tree_medium', x: -22.5, y: 55.0, s: 2.3 },
    { type: 'tree_medium', x: 22.5, y: 55.0, s: 2.3 },
    { type: 'tree_medium', x: -15.0, y: 5.0, s: 2.2 },
    { type: 'tree_medium', x: 13.0, y: 5.0, s: 2.2 },

    // West Exterior Garden (Framing outside of West room bays x < -18.2)
    { type: 'tree_large', x: -19.8, y: 33.0, s: 2.8 },
    { type: 'bush', x: -19.0, y: 35.6, s: 1.3 },
    { type: 'tree_small', x: -19.6, y: 38.2, s: 2.0 },
    { type: 'bush', x: -19.0, y: 41.2, s: 1.3 },
    { type: 'tree_large', x: -19.8, y: 45.0, s: 2.8 },
    { type: 'bush', x: -19.0, y: 49.0, s: 1.3 },
    { type: 'tree_small', x: -19.6, y: 53.0, s: 2.0 },
    { type: 'bush', x: -19.0, y: 57.0, s: 1.3 },
    { type: 'tree_large', x: -19.8, y: 61.0, s: 2.8 },
    { type: 'bush', x: -19.0, y: 65.0, s: 1.3 },
    { type: 'tree_small', x: -19.6, y: 68.8, s: 2.0 },
    { type: 'tree_large', x: -19.8, y: 73.0, s: 2.8 },

    // East Exterior Garden (Framing outside of East room bays x > 18.5)
    { type: 'tree_large', x: 20.0, y: 33.0, s: 2.8 },
    { type: 'bush', x: 19.2, y: 35.6, s: 1.3 },
    { type: 'tree_small', x: 19.8, y: 38.2, s: 2.0 },
    { type: 'bush', x: 19.2, y: 41.2, s: 1.3 },
    { type: 'tree_large', x: 20.0, y: 45.0, s: 2.8 },
    { type: 'bush', x: 19.2, y: 49.0, s: 1.3 },
    { type: 'tree_small', x: 19.8, y: 53.0, s: 2.0 },
    { type: 'bush', x: 19.2, y: 57.0, s: 1.3 },
    { type: 'tree_large', x: 20.0, y: 61.0, s: 2.8 },
    { type: 'bush', x: 19.2, y: 65.0, s: 1.3 },
    { type: 'tree_small', x: 19.8, y: 68.8, s: 2.0 },
    { type: 'tree_large', x: 20.0, y: 73.0, s: 2.8 },

    // North Exterior Garden (Framing Entrance & North room bays)
    { type: 'tree_large', x: -9.8, y: -1.2, s: 2.6 },
    { type: 'bush', x: -2.6, y: -1.8, s: 1.2 },
    { type: 'bush', x: 2.6, y: -1.8, s: 1.2 },
    { type: 'tree_large', x: 9.8, y: -1.2, s: 2.6 },
    { type: 'tree_small', x: -9.8, y: 3.5, s: 2.0 },
    { type: 'tree_small', x: 8.8, y: 3.5, s: 2.0 },
    { type: 'tree_large', x: -10.2, y: 11.0, s: 2.6 },
    { type: 'tree_large', x: 8.8, y: 11.0, s: 2.6 },
    { type: 'tree_small', x: -10.2, y: 17.5, s: 2.0 },
    { type: 'tree_small', x: 8.8, y: 17.5, s: 2.0 },
    { type: 'tree_large', x: -9.8, y: 23.0, s: 2.6 },
    { type: 'tree_large', x: 8.8, y: 23.0, s: 2.6 },

    // South Exterior Garden (Framing South Block & WAB 213 y > 81.0)
    { type: 'tree_large', x: -14.2, y: 82.5, s: 2.8 },
    { type: 'tree_large', x: 14.2, y: 82.5, s: 2.8 },
    { type: 'bush', x: -5.5, y: 82.4, s: 1.3 },
    { type: 'bush', x: 0.0, y: 82.4, s: 1.3 },
    { type: 'bush', x: 5.5, y: 82.4, s: 1.3 }
  ];

  OUTDOOR_VEGETATION.forEach(veg => {
    // Frustum culling: skip vegetation outside visible viewport
    if (veg.x < viewMinX - 2.5 || veg.x > viewMaxX + 2.5 || veg.y < viewMinY - 2.5 || veg.y > viewMaxY + 2.5) {
      return;
    }

    let img = null;
    if (veg.type === 'tree_large') img = assets.tree_large;
    else if (veg.type === 'tree_medium') img = assets.tree_medium;
    else if (veg.type === 'tree_small') img = assets.tree_small;
    else if (veg.type === 'bush') img = assets.bush;
    else if (veg.type === 'bush_flowering') img = assets.bush_flowering;
    else if (veg.type === 'flower_cluster') img = assets.flower_cluster;
    else if (veg.type === 'hedge') {
      if (assets.hedge) ctx.drawImage(assets.hedge, veg.x, veg.y, veg.w, veg.h);
      return;
    }

    if (img) {
      ctx.drawImage(img, veg.x - veg.s / 2, veg.y - veg.s / 2, veg.s, veg.s);
    }
  });

  // --------------------------------------------------------------------------
  // LAYER 0: CONTINUOUS PIXEL-ART FLOOR TILES (1.2m grid)
  // --------------------------------------------------------------------------
  MapRenderer.renderFloors(ctx, nodes, edges, nodeMap, viewMinX, viewMaxX, viewMinY, viewMaxY);

  // R_TOP Architectural Transition Landmark (y = 32.2, spine connection into south ring)
  if (assets.transition_tile && viewMinY < 35.0 && viewMaxY > 30.0 && viewMinX < 3.0 && viewMaxX > -3.0) {
    ctx.save();
    // Seamless 2.4m transition tile across junction
    ctx.drawImage(assets.transition_tile, -1.2, 31.0, 2.4, 2.4);
    
    // Gateway columns flanking the portal into South Block
    if (assets.column) {
      ctx.drawImage(assets.column, -1.85, 31.4, 0.65, 1.4);
      ctx.drawImage(assets.column, 1.2, 31.4, 0.65, 1.4);
    }

    // Floor landmark emblem (Gold compass rosette at R_TOP)
    ctx.strokeStyle = "rgba(214, 168, 79, 0.65)";
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.arc(0, 32.2, 0.85, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(214, 168, 79, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, 31.6);
    ctx.lineTo(0.3, 32.2);
    ctx.lineTo(-0.3, 32.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Subtle architectural zone watermark on floor (non-intrusive)
  if (viewMinY < 20.0 && viewMaxY > 12.0 && viewMinX < 5.0 && viewMaxX > -5.0) {
    ctx.save();
    ctx.fillStyle = "rgba(14, 27, 45, 0.22)";
    ctx.font = "bold 0.55px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NORTH WING", 0, 16.0);
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // LAYER 0.5: CENTRAL VOID COURTYARD (Auditorium Level 0 / Open to Below)
  // Authoritative geometry: x in [-9.5, 9.5], y in [34.5, 71.0]
  // --------------------------------------------------------------------------
  MapRenderer.renderAuditoriumVoid(ctx, assets, viewMinX, viewMaxX, viewMinY, viewMaxY);

  // --------------------------------------------------------------------------
  // LAYER 1.0: FIRE EXIT STAIRWELLS (Descending from Level 1 toward Level 0)
  // --------------------------------------------------------------------------
  MapRenderer.renderFireExitStaircases(ctx, nodes, assets, viewMinX, viewMaxX, viewMinY, viewMaxY);

  // --------------------------------------------------------------------------
  // LAYER 1: ROOM BAYS & ARCHITECTURAL ROOM BOXES (Phase 23A - Viewport Culled)
  // --------------------------------------------------------------------------
  MapRenderer.renderRoomBays(ctx, rooms, nodes, nodeMap, cameraZoom || camera.zoom || 18, viewMinX, viewMaxX, viewMinY, viewMaxY);

  // --------------------------------------------------------------------------
  // LAYER 1.2: STRUCTURAL WALLS & CORRIDOR PERIMETER (Phase 7C - Viewport Culled)
  // --------------------------------------------------------------------------
  MapRenderer.renderWalls(ctx, nodes, edges, nodeMap, viewMinX, viewMaxX, viewMinY, viewMaxY);

  // --------------------------------------------------------------------------
  // LAYER 1.5: CAMPUS FURNITURE (Benches & Planters - Viewport Culled)
  // --------------------------------------------------------------------------
  // Courtyard Benches
  const BENCHES = [
    { x: 0, y: 35.8, w: 1.6, h: 0.9, rot: 0 },
    { x: -9.0, y: 48.0, w: 1.6, h: 0.9, rot: Math.PI / 2 },
    { x: -9.0, y: 60.5, w: 1.6, h: 0.9, rot: Math.PI / 2 },
    { x: 9.0, y: 48.0, w: 1.6, h: 0.9, rot: -Math.PI / 2 },
    { x: 9.0, y: 60.5, w: 1.6, h: 0.9, rot: -Math.PI / 2 },
    { x: -4.5, y: 69.8, w: 1.6, h: 0.9, rot: 0 },
    { x: 4.5, y: 69.8, w: 1.6, h: 0.9, rot: 0 },
    { x: -1.0, y: 28.5, w: 1.4, h: 0.8, rot: 0 }
  ];

  if (assets.bench) {
    BENCHES.forEach(b => {
      if (b.x < viewMinX - 1.5 || b.x > viewMaxX + 1.5 || b.y < viewMinY - 1.5 || b.y > viewMaxY + 1.5) return;
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.rot) ctx.rotate(b.rot);
      ctx.drawImage(assets.bench, -b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    });
  }

  // Campus Planters (Courtyard corners & Corridor niches)
  const PLANTERS = [
    // 4 corners of courtyard railing
    { x: -9.1, y: 35.0 },
    { x: 9.1, y: 35.0 },
    { x: -9.1, y: 70.5 },
    { x: 9.1, y: 70.5 },

    // Spine corridor niches
    { x: -0.9, y: 2.2 },
    { x: 0.9, y: 2.6 },
    { x: -0.9, y: 8.0 },
    { x: 0.9, y: 14.5 },
    { x: -0.9, y: 15.0 },
    { x: 0.9, y: 24.5 },

    // West wing corridor sides
    { x: -11.9, y: 31.8 },
    { x: -11.9, y: 34.0 },
    { x: -11.9, y: 37.8 },
    { x: -11.9, y: 41.2 },
    { x: -11.9, y: 44.5 },
    { x: -11.9, y: 59.2 },
    { x: -11.9, y: 62.0 },
    { x: -11.9, y: 64.8 },
    { x: -11.9, y: 68.2 },

    // East wing corridor sides
    { x: 11.9, y: 31.8 },
    { x: 11.9, y: 34.0 },
    { x: 11.9, y: 37.2 },
    { x: 11.9, y: 40.5 },
    { x: 11.9, y: 44.0 },
    { x: 11.9, y: 54.0 },
    { x: 11.9, y: 57.5 },
    { x: 11.9, y: 72.2 },

    // South wing
    { x: 3.5, y: 73.8 },
    { x: 6.5, y: 73.8 }
  ];

  if (assets.planter) {
    const pw = 0.72;
    const ph = 0.68;
    PLANTERS.forEach(p => {
      if (p.x < viewMinX - 1.5 || p.x > viewMaxX + 1.5 || p.y < viewMinY - 1.5 || p.y > viewMaxY + 1.5) return;
      ctx.drawImage(assets.planter, p.x - pw / 2, p.y - ph / 2, pw, ph);
    });
  }

  // Campus Environmental Lamps (Lighting corridor portals & niches)
  if (assets.lamp) {
    const LAMPS = [
      { x: -1.75, y: 1.2 },
      { x: 1.75, y: 1.2 },
      { x: -1.75, y: 30.6 },
      { x: 1.75, y: 30.6 },
      { x: -10.2, y: 33.2 },
      { x: 10.2, y: 33.2 },
      { x: -10.2, y: 72.0 },
      { x: 10.2, y: 72.0 }
    ];
    LAMPS.forEach(l => {
      if (l.x < viewMinX - 1.5 || l.x > viewMaxX + 1.5 || l.y < viewMinY - 1.5 || l.y > viewMaxY + 1.5) return;
      ctx.drawImage(assets.lamp, l.x - 0.25, l.y - 0.75, 0.5, 1.5);
    });
  }

  // Campus Notice Boards along spine corridor walls
  if (assets.notice_board) {
    const BOARDS = [
      { x: -1.1, y: 8.8, w: 1.3, h: 0.85 },
      { x: 1.1, y: 16.5, w: 1.3, h: 0.85 }
    ];
    BOARDS.forEach(nb => {
      if (nb.x < viewMinX - 1.5 || nb.x > viewMaxX + 1.5 || nb.y < viewMinY - 1.5 || nb.y > viewMaxY + 1.5) return;
      ctx.drawImage(assets.notice_board, nb.x - nb.w / 2, nb.y - nb.h / 2, nb.w, nb.h);
    });
  }
  // Campus Trash Bins (Corridor niches, entrance, outside washrooms)
  if (assets.trash_bin) {
    const TRASH_BINS = [
      { x: -1.75, y: 0.6 },
      { x: 1.75, y: 0.6 },
      { x: 1.05, y: 22.8 },   // Outside WAB 208 washroom
      { x: -12.6, y: 33.5 },
      { x: 12.6, y: 33.5 },
      { x: -12.6, y: 55.0 },
      { x: 12.6, y: 55.0 },
      { x: -11.0, y: 72.8 }   // Outside WAB 218 washroom
    ];
    TRASH_BINS.forEach(tb => {
      if (tb.x < viewMinX - 1.5 || tb.x > viewMaxX + 1.5 || tb.y < viewMinY - 1.5 || tb.y > viewMaxY + 1.5) return;
      ctx.drawImage(assets.trash_bin, tb.x - 0.22, tb.y - 0.28, 0.44, 0.56);
    });
  }

  // --------------------------------------------------------------------------
  // LAYER 2: DOORS & PORTALS (Phase 7B calibrated + Phase 23 specialized)
  // --------------------------------------------------------------------------
  MapRenderer.renderDoors(ctx, nodes, edges, nodeMap, rooms, activeDestination, viewMinX, viewMaxX, viewMinY, viewMaxY);

  // --------------------------------------------------------------------------
  // LAYER 2.5: ARCHITECTURAL GRAND ENTRANCE CANOPY BANNER (Above 0, 0)
  // --------------------------------------------------------------------------
  ctx.save();
  const entX = 0, entY = -1.0;
  // Ivory plaque
  ctx.fillStyle = "#FFFDF9";
  ctx.fillRect(entX - 1.15, entY - 0.45, 2.3, 0.9);
  ctx.strokeStyle = "#FFB52E";
  ctx.lineWidth = 0.1;
  ctx.strokeRect(entX - 1.15, entY - 0.45, 2.3, 0.9);

  ctx.fillStyle = "#12344A";
  ctx.font = "bold 0.42px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ENTRY", entX, entY - 0.12);

  // Downward golden pointer arrow
  ctx.fillStyle = "#FFB52E";
  ctx.beginPath();
  ctx.moveTo(entX - 0.24, entY + 0.08);
  ctx.lineTo(entX + 0.24, entY + 0.08);
  ctx.lineTo(entX, entY + 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  }

  // --------------------------------------------------------------------------
  // LAYER 3: ACTIVE DESTINATION HALO & WAYFINDING OVERLAYS (Phase 23A)
  // --------------------------------------------------------------------------
  nodes.forEach(n => {
    if (n.type === "ROOM_DOOR") {
      const isDest = activeDestination && activeDestination.id === n.id;
      if (isDest) {
        ctx.save();
        ctx.strokeStyle = "#FFB52E";
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  });

  // Fire Exits (Green Badges + Fire Exit Marker Asset)
  nodes.forEach(n => {
    if (n.type === "FIRE_EXIT") {
      ctx.save();
      const bw = 1.35, bh = 0.52;
      const fx = n.x, fy = n.y - 0.85;

      if (assets.fire_exit_marker) {
        ctx.drawImage(assets.fire_exit_marker, n.x - 0.45, n.y - 1.45, 0.9, 0.9);
      }

      ctx.fillStyle = "#176B3A";
      ctx.fillRect(fx - bw / 2, fy - bh / 2, bw, bh);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 0.05;
      ctx.strokeRect(fx - bw / 2, fy - bh / 2, bw, bh);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 0.22px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const label = n.id === "FE_1" ? "EXIT 1" : "EXIT";
      ctx.fillText("FIRE", fx, fy - 0.1);
      ctx.fillText(label, fx, fy + 0.14);
      ctx.restore();
    }
  });

  // --------------------------------------------------------------------------
  // LAYER 4: JRPG NAVIGATION TRAIL & DESTINATION BEACON
  // --------------------------------------------------------------------------
  if (currentRoute && currentRoute.found && currentRoute.path && currentRoute.path.length > 0) {
    ctx.save();
    if (mapScene === 'TRANSITION') {
      ctx.globalAlpha = 0.45; // Subtle route fade during cinematic transition camera reveal
    }
    const path = currentRoute.path;
    const now = performance.now();

    // 0. Navigation Start Marker at path[0]
    if (assets.navigation_start_marker && path.length > 0) {
      ctx.save();
      const startNode = path[0];
      const startPulse = 1.0 + 0.04 * Math.sin(now * 0.004);
      const smSize = 1.25 * startPulse;
      ctx.drawImage(assets.navigation_start_marker, startNode.x - smSize / 2, startNode.y - smSize / 2, smSize, smSize);
      ctx.restore();
    }

    // 1. Outer Soft Glow Trail
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = "rgba(0, 229, 255, 0.28)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();

    // 2. Vibrant Amber / Gold JRPG Trail Ribbon
    ctx.lineWidth = 0.65;
    ctx.strokeStyle = "rgba(245, 130, 32, 0.95)";
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();

    // 3. Flowing Animated Directional Arrows (Direction Arrow Asset)
    ctx.save();
    const animOffset = (now * 0.002) % 1.0;
    ctx.strokeStyle = "#FFFDF9";
    ctx.lineWidth = 0.15;
    ctx.lineCap = "round";

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const segDx = p2.x - p1.x;
      const segDy = p2.y - p1.y;
      const segLen = Math.hypot(segDx, segDy);
      if (segLen < 0.6) continue;

      const angle = Math.atan2(segDy, segDx);
      const chevronSpacing = 3.0; // meters between chevrons
      const numChevrons = Math.floor(segLen / chevronSpacing);

      for (let c = 0; c <= numChevrons; c++) {
        const frac = ((c / Math.max(1, numChevrons)) + animOffset) % 1.0;
        const cx = p1.x + segDx * frac;
        const cy = p1.y + segDy * frac;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        if (assets.direction_arrow) {
          const aW = 0.65;
          const aH = 0.65;
          ctx.drawImage(assets.direction_arrow, -aW / 2, -aH / 2, aW, aH);
        } else {
          ctx.beginPath();
          ctx.moveTo(-0.25, -0.22);
          ctx.lineTo(0.12, 0);
          ctx.lineTo(-0.25, 0.22);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();

    // 4. Pulsing Destination Beacon Rings & Destination Marker Asset
    const destNode = path[path.length - 1];
    const pulsePhase = (now * 0.003) % 1.0;
    const bob = Math.sin(now * 0.004) * 0.08;

    ctx.save();
    // Expanding radar ring
    ctx.strokeStyle = `rgba(0, 229, 255, ${1 - pulsePhase})`;
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.arc(destNode.x, destNode.y, 0.4 + pulsePhase * 1.0, 0, Math.PI * 2);
    ctx.stroke();

    // Outer gold ring
    ctx.strokeStyle = "#FFB52E";
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.arc(destNode.x, destNode.y, 0.65, 0, Math.PI * 2);
    ctx.stroke();

    if (assets.destination_marker) {
      const dmSize = 1.35;
      ctx.drawImage(assets.destination_marker, destNode.x - dmSize / 2, destNode.y - dmSize * 0.85 + bob, dmSize, dmSize);
    } else {
      // Inner diamond pin
      ctx.fillStyle = "#FFB52E";
      ctx.beginPath();
      ctx.moveTo(destNode.x, destNode.y - 0.45);
      ctx.lineTo(destNode.x + 0.35, destNode.y);
      ctx.lineTo(destNode.x, destNode.y + 0.45);
      ctx.lineTo(destNode.x - 0.35, destNode.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#0E1B2D";
      ctx.beginPath();
      ctx.arc(destNode.x, destNode.y, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floating destination badge
    ctx.fillStyle = "#FFB52E";
    ctx.fillRect(destNode.x - 0.9, destNode.y - 1.35, 1.8, 0.45);
    ctx.strokeStyle = "#0E1B2D";
    ctx.lineWidth = 0.06;
    ctx.strokeRect(destNode.x - 0.9, destNode.y - 1.35, 1.8, 0.45);
    ctx.fillStyle = "#0E1B2D";
    ctx.font = "bold 0.16px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DESTINATION", destNode.x, destNode.y - 1.13);
    ctx.restore(); // restore destination beacon save
    ctx.restore(); // restore transition alpha save
  }

  // --------------------------------------------------------------------------
  // LAYER 5: PLAYER CHARACTER & SHADOW (World Space - Rendered ABOVE route)
  // --------------------------------------------------------------------------
  if (playerPos && assets.player_location_marker) {
    ctx.save();
    const pPulse = 1.0 + 0.05 * Math.sin(performance.now() * 0.005);
    const pSize = 1.35 * pPulse;
    ctx.globalAlpha = 0.88;
    ctx.drawImage(assets.player_location_marker, playerPos.x - pSize / 2, playerPos.y - pSize / 2, pSize, pSize);
    ctx.restore();
  }

  // Depth-sorted character rendering (Player, Campus Guide, Roaming Student)
  const drawGuideFunc = typeof drawNpc === 'function' ? drawNpc : null;
  const drawPlayerFunc = typeof drawPlayer === 'function' ? drawPlayer : null;
  const drawStudentFunc = typeof drawStudent === 'function' ? drawStudent : null;

  const charactersToDraw = [];

  if (drawPlayerFunc && playerPos) {
    charactersToDraw.push({
      y: playerPos.y,
      draw: () => drawPlayerFunc(ctx, camera.zoom),
      name: "player"
    });
  }

  if (drawGuideFunc) {
    const gy = typeof guideY === 'number' ? guideY : 1.1;
    charactersToDraw.push({
      y: gy,
      draw: () => drawGuideFunc(ctx, camera.zoom),
      name: "guide"
    });
  }

  if (drawStudentFunc) {
    const sy = typeof getStudentY === 'function' ? getStudentY() : 18.0;
    charactersToDraw.push({
      y: sy,
      draw: () => drawStudentFunc(ctx, camera.zoom),
      name: "student"
    });
  }

  // Sort characters by feet world Y position (smaller Y = further north = drawn first)
  charactersToDraw.sort((a, b) => a.y - b.y);

  for (const char of charactersToDraw) {
    try {
      char.draw();
    } catch (err) {
      console.warn(`[MapRenderer] Error in draw ${char.name}:`, err);
    }
  }

  // Debug Overlays (when debug mode is active)
  if (isDebug) {
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    edges.forEach((edge) => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      }
    });

    nodes.forEach((node) => {
      switch (node.type) {
        case "ROOM_DOOR": ctx.fillStyle = "#ff9800"; break;
        case "FIRE_EXIT": ctx.fillStyle = "#f44336"; break;
        case "BOUNDARY": ctx.fillStyle = "#9c27b0"; break;
        default: ctx.fillStyle = "#4caf50"; break;
      }
      if (node.id === "ENTRANCE") ctx.fillStyle = "#03a9f4";

      const radius = 3 / camera.zoom;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#12344a";
      ctx.font = `${10 / camera.zoom}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(node.id, node.x, node.y - (4 / camera.zoom));
    });
  }

  // Diagnostic movement/hitbox overlays (debug only, world space)
  if (typeof drawDebug === 'function') {
    drawDebug(ctx, camera.zoom);
  }

  ctx.restore();

  // Screen-Space Cinematic Transition Overlay (Phase 23/23A Transition Scene)
  if (mapScene === 'TRANSITION') {
    ctx.save();
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const barH = 26;
    ctx.fillStyle = "rgba(4, 8, 14, 0.78)";
    ctx.fillRect(0, 0, cssW, barH);
    ctx.fillRect(0, cssH - barH, cssW, barH);

    ctx.strokeStyle = "rgba(214, 168, 79, 0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barH);
    ctx.lineTo(cssW, barH);
    ctx.moveTo(0, cssH - barH);
    ctx.lineTo(cssW, cssH - barH);
    ctx.stroke();

    const badgeW = Math.min(cssW - 32, 340);
    const badgeH = 24;
    const badgeX = (cssW - badgeW) / 2;
    const badgeY = barH + 8;

    ctx.fillStyle = "rgba(8, 16, 28, 0.94)";
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = "#D6A84F";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    ctx.fillStyle = "#FFD56B";
    ctx.font = "bold 8.5px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦ AUDITORIUM OVERLOOK ✦", cssW / 2, badgeY + badgeH / 2);
    ctx.restore();
  }
}

/**
 * 16-Bit Bottom-Left Minimap Renderer (Phase 23)
 * Authoritatively plots the whole building footprint, void, camera frustum, player and destination.
 */
export function renderMinimap(minimapCtx, minimapCanvas, camera, { nodes, edges, rooms, currentRoute, playerPos, mapScene = 'NORTH' }) {
  if (!minimapCtx || !minimapCanvas) return;

  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  minimapCtx.clearRect(0, 0, w, h);

  // World bounding box: X [-13.5, 13.5] (27m), Y [-2, 76] (78m)
  const worldW = 27;
  const worldH = 78;
  const pad = 6;
  const scale = Math.min((w - pad * 2) / worldW, (h - pad * 2) / worldH);
  const originX = w / 2;
  const originY = pad + (2 * scale); // map y = 0 to pad + 2*scale

  function toMx(wx) { return originX + wx * scale; }
  function toMy(wy) { return originY + wy * scale; }

  // Deep void navy background or cached static minimap layer (Phase 7)
  if (MapRenderer.cachedMinimapCanvases && MapRenderer.cachedMinimapCanvases[mapScene]) {
    minimapCtx.drawImage(MapRenderer.cachedMinimapCanvases[mapScene], 0, 0);
  } else {
  minimapCtx.fillStyle = "#08101C";
  minimapCtx.fillRect(0, 0, w, h);

  // 1. Central Void Courtyard (Auditorium open-to-below)
  const voidX = toMx(-9.5);
  const voidY = toMy(34.5);
  const voidW = 19.0 * scale;
  const voidH = 36.5 * scale;

  minimapCtx.fillStyle = "#04080E";
  minimapCtx.fillRect(voidX, voidY, voidW, voidH);

  if (mapScene === 'TRANSITION') {
    minimapCtx.strokeStyle = "#FFD56B";
    minimapCtx.lineWidth = 1.5;
    minimapCtx.strokeRect(voidX - 0.5, voidY - 0.5, voidW + 1, voidH + 1);

    minimapCtx.fillStyle = "#FFD56B";
    minimapCtx.font = "bold 6px 'Press Start 2P', monospace";
    minimapCtx.textAlign = "center";
    minimapCtx.textBaseline = "middle";
    minimapCtx.fillText("AUDITORIUM", toMx(0), toMy(52.75));
  } else {
    minimapCtx.strokeStyle = "rgba(214, 168, 79, 0.45)";
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(voidX, voidY, voidW, voidH);

    minimapCtx.fillStyle = "rgba(214, 168, 79, 0.35)";
    minimapCtx.font = "bold 6px 'Press Start 2P', monospace";
    minimapCtx.textAlign = "center";
    minimapCtx.textBaseline = "middle";
    minimapCtx.fillText("VOID", toMx(0), toMy(52.75));
  }

  // 2. Corridor Graph Lines (Scene-sensitive highlighting)
  if (edges && nodes) {
    const nMap = new Map(nodes.map(n => [n.id, n]));
    edges.forEach(e => {
      const f = nMap.get(e.from);
      const t = nMap.get(e.to);
      if (f && t) {
        const isNorthEdge = (f.y <= 32.3 && t.y <= 32.3);
        const isSouthEdge = (f.y >= 32.1 || t.y >= 32.1);

        minimapCtx.beginPath();
        minimapCtx.moveTo(toMx(f.x), toMy(f.y));
        minimapCtx.lineTo(toMx(t.x), toMy(t.y));

        if (mapScene === 'NORTH') {
          if (isNorthEdge) {
            minimapCtx.strokeStyle = "#FFD56B";
            minimapCtx.lineWidth = Math.max(2.0, 2.8 * scale);
          } else {
            minimapCtx.strokeStyle = "rgba(214, 168, 79, 0.22)";
            minimapCtx.lineWidth = Math.max(1.0, 1.4 * scale);
          }
        } else if (mapScene === 'SOUTH') {
          if (isSouthEdge) {
            minimapCtx.strokeStyle = "#FFD56B";
            minimapCtx.lineWidth = Math.max(2.0, 2.8 * scale);
          } else {
            minimapCtx.strokeStyle = "rgba(214, 168, 79, 0.22)";
            minimapCtx.lineWidth = Math.max(1.0, 1.4 * scale);
          }
        } else {
          // TRANSITION: Balanced with glow at R_TOP
          minimapCtx.strokeStyle = "rgba(214, 168, 79, 0.55)";
          minimapCtx.lineWidth = Math.max(1.5, 2.0 * scale);
        }
        minimapCtx.stroke();
      }
    });

    // 3. Room Door Points (Subtle dots with scene weighting)
    nodes.forEach(n => {
      if (n.type === "ROOM_DOOR") {
        const isNorthDoor = n.y <= 32.2;
        if (mapScene === 'NORTH') {
          minimapCtx.fillStyle = isNorthDoor ? "rgba(255, 253, 249, 0.9)" : "rgba(255, 253, 249, 0.2)";
        } else if (mapScene === 'SOUTH') {
          minimapCtx.fillStyle = !isNorthDoor ? "rgba(255, 253, 249, 0.9)" : "rgba(255, 253, 249, 0.2)";
        } else {
          minimapCtx.fillStyle = "rgba(255, 253, 249, 0.5)";
        }
        minimapCtx.fillRect(toMx(n.x) - 1, toMy(n.y) - 1, 2, 2);
      }
    });
  }
  }

  // 4. Active Navigation Route (Full continuous path)
  if (currentRoute && currentRoute.found && currentRoute.path && currentRoute.path.length > 0) {
    minimapCtx.strokeStyle = "#00E5FF";
    minimapCtx.lineWidth = 2.2;
    minimapCtx.beginPath();
    minimapCtx.moveTo(toMx(currentRoute.path[0].x), toMy(currentRoute.path[0].y));
    for (let i = 1; i < currentRoute.path.length; i++) {
      minimapCtx.lineTo(toMx(currentRoute.path[i].x), toMy(currentRoute.path[i].y));
    }
    minimapCtx.stroke();

    // Destination dot on minimap
    const dest = currentRoute.path[currentRoute.path.length - 1];
    minimapCtx.fillStyle = "#00E5FF";
    minimapCtx.beginPath();
    minimapCtx.arc(toMx(dest.x), toMy(dest.y), 3, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  // 5. Approximate Camera Viewport Frustum Rectangle
  if (camera && camera.zoom) {
    const mainW = camera.mainWidth || 400;
    const mainH = camera.mainHeight || 800;
    const camWorldLeft = -camera.x / camera.zoom;
    const camWorldTop = -camera.y / camera.zoom;
    const camWorldW = mainW / camera.zoom;
    const camWorldH = mainH / camera.zoom;

    const vpX = toMx(camWorldLeft);
    const vpY = toMy(camWorldTop);
    const vpW = camWorldW * scale;
    const vpH = camWorldH * scale;

    minimapCtx.fillStyle = "rgba(214, 168, 79, 0.12)";
    minimapCtx.fillRect(vpX, vpY, vpW, vpH);
    minimapCtx.strokeStyle = "rgba(255, 253, 249, 0.8)";
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(vpX, vpY, vpW, vpH);
  }

  // 6. R_TOP Transition Landmark Anchor
  const rtopX = toMx(0);
  const rtopY = toMy(32.2);
  if (mapScene === 'TRANSITION') {
    minimapCtx.strokeStyle = "rgba(0, 229, 255, 0.75)";
    minimapCtx.lineWidth = 1.2;
    minimapCtx.beginPath();
    minimapCtx.arc(rtopX, rtopY, 4.5, 0, Math.PI * 2);
    minimapCtx.stroke();
  }
  minimapCtx.fillStyle = mapScene === 'TRANSITION' ? '#00E5FF' : 'rgba(214, 168, 79, 0.8)';
  minimapCtx.fillRect(rtopX - 1.5, rtopY - 1.5, 3, 3);

  // 7. Player Blip ("● YOU")
  if (playerPos) {
    const px = toMx(playerPos.x);
    const py = toMy(playerPos.y);

    // Radar ripple
    const pulse = (performance.now() * 0.003) % 1;
    minimapCtx.strokeStyle = `rgba(214, 168, 79, ${1 - pulse})`;
    minimapCtx.lineWidth = 1;
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 2.5 + pulse * 5, 0, Math.PI * 2);
    minimapCtx.stroke();

    // Solid gold player blip
    minimapCtx.fillStyle = "#FFB52E";
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 2.5, 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.strokeStyle = "#FFFFFF";
    minimapCtx.lineWidth = 0.5;
    minimapCtx.stroke();
  }

  // 8. 16-Bit Scene Indicator Badge (Requirement 17)
  minimapCtx.save();
  const scenePillW = 86;
  const scenePillH = 14;
  const scenePillX = (w - scenePillW) / 2;
  const scenePillY = 4;

  minimapCtx.fillStyle = "rgba(8, 16, 28, 0.92)";
  minimapCtx.fillRect(scenePillX, scenePillY, scenePillW, scenePillH);
  minimapCtx.strokeStyle = mapScene === 'TRANSITION' ? '#00E5FF' : '#D6A84F';
  minimapCtx.lineWidth = 1;
  minimapCtx.strokeRect(scenePillX, scenePillY, scenePillW, scenePillH);

  minimapCtx.fillStyle = mapScene === 'TRANSITION' ? '#00E5FF' : '#FFD56B';
  minimapCtx.font = "bold 5.5px 'Press Start 2P', monospace";
  minimapCtx.textAlign = "center";
  minimapCtx.textBaseline = "middle";

  const badgeText = mapScene === 'NORTH' ? 'PAGE 1: NORTH' :
                    mapScene === 'TRANSITION' ? 'TRANSITION' :
                    'PAGE 2: SOUTH';
  minimapCtx.fillText(badgeText, w / 2, scenePillY + scenePillH / 2);
  minimapCtx.restore();
}

export function renderMap(container, nodes, edges, rooms, onDoorClick) {
  container.innerHTML = "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  container.appendChild(svg);
  return { svg, nodesMap: new Map(nodes.map(n => [n.id, n])) };
}

export const renderRoomBays = MapRenderer.renderRoomBays;
export const ROOM_BAYS = MapRenderer.ROOM_BAYS;

if (typeof window !== 'undefined') {
  window.MapRenderer = MapRenderer;
}
