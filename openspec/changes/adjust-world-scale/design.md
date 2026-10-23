# Design

## Context

See `proposal.md` for motivation and the two delta specifications for observable behavior.

Shared arena geometry currently defines a 2400 by 1800 world, base positions (240, 900) and (2160, 900), lane centerlines at 150/900/1650, turns at x = 750/1650, paved width 112, and outer-border width 124. `getLaneWaypoints` feeds `ARENA_LANES`, backend wave paths, and path-relative tower placement. `FogPresentation` already draws minimap streets from shared paths and widths; `RoadGeometry` uses the outer width for terrain-dependent vision.

Entity presentation is less centralized: arena players use size 40, role-menu previews size 32, minions use size 18, and structure shapes are drawn with local dimensions. Selection radii and name/health-bar offsets are literals in `GameScene`; movement updates repeat some offsets. Shared cannon muzzle distances (36 for bases, 21 for lane towers) feed both server projectile creation and frontend shot feedback.

## Goals / Non-Goals

**Goals:**
- Make independent entity, road, and grass adjustments available in one small, typed shared configuration module.
- Compute all derived dimensions from immutable pre-change baselines; avoid repeatedly multiplying already-scaled values.
- Preserve one lane geometry and one structure muzzle geometry across client and server.
- Retain explicit numeric acceptance criteria so a centerline-only reduction cannot masquerade as the requested grass reduction.

**Non-Goals:**
- Runtime customization, a settings panel, a general geometry framework, or a new rendering abstraction.
- Whole-world/camera scaling, changed arena bounds, changed base locations, longer/wider textures, or combat-stat rebalancing.
- Scaling menu previews or screen-space UI. "Towers" includes lane outposts, their ruins, and main-base cannon keeps.

## Decisions

### 1. One shared configuration with three independent factors

Add a small `shared/src/worldScale.ts` module, exported through `shared/src/index.ts`, with named entity, road-width, and grass-gap factors defaulting to 1.20, 1.20, and 0.90. Keep baseline road widths, centerline spacing, and nominal unit sizes alongside the factors, with comments explaining that all factors refer to pre-change dimensions. Derive shared public dimensions from these values.

Keep the module dependency-free. `lanes.ts`, `arena.ts`, cannon helpers, and frontend presentation consume it; it must not import them and create cycles. Reuse existing exports such as `LANE_ROAD_WIDTH`, `LANE_BORDER_WIDTH`, and `LANE_EDGE_Y` to minimize consumer changes. A small pure dimension derivation helper is appropriate if needed to exercise alternate factors; no generic configuration registry is required.

Alternative: change individual numeric constants. Rejected because future tuning would still require edits across multiple modules. Alternative: scale the camera or the entire scene. Rejected because it also scales grass and UI and cannot satisfy independent factors.

### 2. Measure clear grass between outer road borders

Use the parallel lane sections between the existing x turns as the spacing reference. The original centerline distance is 750; the actual clear grass width is 750 - 124 = 626. The target is 626 * 0.90 = 563.4. With the new outer width 124 * 1.20 = 148.8, the required centerline distance is 563.4 + 148.8 = 712.2.

Keep the middle lane at y = 900, giving outer centerlines y = 187.8 and 1612.2. Keep turn x coordinates and base positions fixed. Compute lane rows from the baseline grass gap and the newly derived border width, not by scaling existing lane y coordinates. Wider roads apply along the entire polyline, including diagonal approaches and rounded joins.

The percentage is defined on parallel sections: lanes converge at bases, so there is no uniform nonzero gap along every diagonal segment. Reducing centerline distance by 10% would leave the wrong grass width once roads widen; this alternative is rejected.

Do not round shared coordinates or widths to tiles or whole pixels. Canvas supports fractional stroke dimensions, and server waypoints must agree with the frontend and minimap.

### 3. Scale arena presentation once, at its existing construction boundary

Pass the scaled nominal player size into `createRoleShape` only from arena spawning; leave menu-card size 32 unchanged. Make minion construction consume the shared nominal size rather than its hardcoded 18, preserving its drawing normalization of 82. Scale tower/base root containers and standalone ruin graphics once, keeping child drawing coordinates and cannon rotations unchanged.

Scale attached geometry with its owner, including shadows and role-specific effects, without multiplying child scale a second time. Keep health-bar widths and font sizes readable at their current values; derive clearance offsets from the entity factor. Reuse those offsets in both upsert and interpolation paths. Derive click-selection radii and target-indicator placement/extent from the same factor, keeping server collision and projectile-hit thresholds unchanged.

Alternative: multiply every vertex and dimension. Rejected because it duplicates scale logic and is prone to missed decorations and inconsistent ruins. Globally modifying the role constructor's scale is also rejected because it would unintentionally enlarge menu previews.

### 4. Share scaled structure muzzle distances

Derive `BASE_CANNON_MUZZLE_DISTANCE` and `TOWER_CANNON_MUZZLE_DISTANCE` from their existing baselines and the entity factor: defaults become 43.2 and 25.2. Existing shared helpers, backend `createShotProjectile`, and frontend shot-feedback helpers must continue consuming these values. Scale muzzle-flash geometry in proportion, while retaining its timing and avoiding tween targets that overwrite the intended final scale.

This intentionally moves structure projectile spawn origins to match enlarged cannons. It does not change attack acquisition range, projectile speed, damage, cooldowns, or impact thresholds. Tank/minion projectile spawning retains its existing behavior; no new muzzle-origin mechanic is introduced for those units.

Alternative: enlarge only frontend flashes. Rejected because authoritative projectiles would visibly originate inside the cannon.

### 5. Keep existing lane and visibility consumers authoritative

Continue using shared lane-building functions for waves and tower placements instead of duplicating paths in the backend. Preserve path fractions, tower counts, and mirrored traversal. Ensure the minimap and road/grass vision classification consume derived widths and rows; do not retune vision costs or ranges to compensate for changed terrain.

Update tests that freeze old arena coordinates to assert the new derived geometry. Retain explicit tests using custom literal polylines where they test general path math rather than default arena layout.

## Risks / Trade-offs

- [Larger sprites overlap labels or bars during movement] -> Use shared presentation clearances for both initial placement and interpolation; check all roles and minions.
- [Grass spacing accidentally measured from road centers or stone edges] -> Assert the explicit outer-border gap 563.4 and baseline restoration to 626 independently of exported constants.
- [One surface retains old geometry] -> Cover server paths/tower placements, minimap terrain, and road-vision classification with focused regressions and a visual arena check.
- [Scaling compounds in nested objects or recreated visuals] -> Scale at a single construction boundary and exercise spawn, conceal/reveal, ruin, and respawn transitions.
- [Changing structure origins affects close-range flight time] -> Accept the muzzle-position consequence only; verify unchanged combat parameters and existing immediate-impact feedback.
- [Extreme future factors put lanes outside the arena or eliminate grass] -> Document supported tuning constraints; reject non-finite/non-positive factors and derived out-of-bounds geometry with an explicit configuration error rather than clamping or silently falling back.
- [Client and backend use different compiled factors] -> Rebuild and deploy both against the same shared package revision.

## Migration Plan

1. Add configuration and dimension derivation, then wire existing shared exports.
2. Update arena presentation and structure muzzle dimensions; preserve network schema and gameplay constants.
3. Add focused geometry and rendering regressions and document the adjustment points in `readme.md`, including rebuild/restart requirements and the grass measurement convention.
4. Run targeted existing test runners for affected shared, frontend, and backend files; build the shared package before dependent tests/builds and run the frontend production build. Use the backend TypeScript configuration for a no-emit check if present.
5. Visually inspect an arena, minimap, all player roles, mobs, both structure classes, selection, and lifecycle transitions. No database or persistent-state migration is needed.

Rollback is a normal code revision rollback and coordinated rebuild/redeploy. Setting all three factors to 1.00 restores pre-change dimensions without rewriting drawing code.
