# Tasks

## 1. Shared scale configuration and lane geometry

- [x] 1.1 Add the dependency-free shared scale configuration, immutable pre-change baselines, and exports with defaults entity = 1.20, road width = 1.20, grass gap = 0.90; add focused tests proving independent tuning, baseline restoration at 1.00, and explicit errors for invalid factors or out-of-bounds derived geometry.
- [x] 1.2 Derive paved width, outer-border width, and outer lane centerlines through the existing shared lane/arena exports; extend lane tests to assert explicit defaults 134.4, 148.8, 187.8/900/1612.2 and both 563.4-unit clear gaps using floating-point tolerances, while preserving base positions, arena bounds, turns, and reverse paths.
- [x] 1.3 Verify backend waves, path-relative tower placement, minimap streets, and road-dependent visibility use the derived shared geometry; extend affected lane, tower-placement, and vision tests to cover all 12 distinct on-path towers, both teams' paths, and adjusted border classification without changing vision costs or ranges.
- [x] 1.4 Document the three adjustment points, original baselines, outer-border grass-gap convention, supported tuning limits, and coordinated rebuild/restart requirement in `readme.md`; verify the documented defaults and computed geometry against the new tests.

## 2. Arena entity presentation and interactions

- [x] 2.1 Wire the shared entity factor into arena player size, minion size, base/tower root containers, and standalone ruins, preserving menu previews and nested rotations; add focused presentation tests proving 48-unit players, 21.6-unit minions, uniformly scaled structures/decorations, and no double scaling.
- [x] 2.2 Derive name and health-bar clearances, click-selection radii, and target-indicator geometry from the entity factor and reuse them in both creation and movement-update paths; add regressions for the enlarged selectable ring, unchanged hidden/dead/ruin restrictions, and stable offsets during interpolation and respawn.
- [x] 2.3 Keep role-menu previews, HUD, minimap markers, camera zoom, fonts, health-bar widths, and gameplay collision/impact/range constants unchanged; verify with focused presentation and gameplay regression assertions and document the presentation-only boundary in the scale section of `readme.md`.

## 3. Structure cannon and projectile alignment

- [x] 3.1 Derive shared base/tower muzzle distances from baselines 36 and 21 using the entity factor, retaining existing server/client consumers; update shared cannon, backend combat, and frontend shot-feedback tests to prove default distances 43.2 and 25.2 and origin agreement in multiple directions.
- [x] 3.2 Scale structure muzzle-flash geometry without changing timing or overriding scale in tweens; verify immediate-impact shots, conceal/reveal, and ruin transitions retain their feedback/visibility behavior and verify unchanged damage, cooldown, speed, and hit thresholds.

## 4. Integration verification

- [x] 4.1 Build `shared`, run the affected shared, frontend, and backend test files through their existing `tsx --test` runners, run `npm run build --workspace=frontend`, and run the backend no-emit TypeScript check if configured; verify every selected command succeeds and any new frontend test file is included by the explicit frontend test script.
- [x] 4.2 Inspect a running arena and minimap at unchanged zoom: verify wider roads, the two reduced parallel grass gaps, all player roles, mobs, bases, lane towers, ruins, labels, health bars, target clicks, firing feedback, and spawn/movement/respawn/conceal-reveal transitions; verify role-menu and HUD dimensions remain unchanged.
