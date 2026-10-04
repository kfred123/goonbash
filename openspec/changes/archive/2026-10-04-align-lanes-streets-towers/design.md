# Design

## Context

Lane geometry currently lives only inside `GameRoom.buildLanePath` (`backend/src/rooms/GameRoom.ts`): 3 lanes between the fixed bases blue `(240, 900)` and red `(2160, 900)`, using `LANE_EDGE_Y = [150, 900, 1650]` and `LANE_TURN_X = [750, 1650]`. The middle lane is a straight line; the top/bottom lanes diagonal from the base out to `(turnX, edgeY)`, run straight to the far turn point, then diagonal back into the enemy base.

The visible streets are a static Tiled tilemap (`frontend/public/assets/maps/arena.json`, loaded via `createTilemap()` in `frontend/src/GameScene.ts`): 3 horizontal cobblestone bands near rows 3-4, 13-15, and 25-26 (world y ≈ 220, 928, 1664), connected by vertical cobblestone columns near the map's left/right edges (world x ≈ 220, 2240). This is a different shape than the lane paths above (it has no diagonal turn segments and its verticals sit at the map edges, not at x=750/1650), so minions/tanks visibly walk off the drawn road on the outer lanes.

There are no towers in the current TypeScript/Colyseus rewrite. An archived Godot prototype (`archive/scripts/LaneTowerLogic.gd`) had them: HP 300, fire range 250, fire rate 1.2s, damage 12, auto-targeting nearest enemy, destroyed at 0 HP, granting XP to nearby enemies. `specs/system_overview.md` documents this as a baseline feature of the original design.

## Goals / Non-Goals

**Goals:**
- Single source of truth for lane waypoint geometry, consumed by minion spawning, tower placement, and street rendering.
- Visible streets that match the actual lane paths (same diagonal/straight shape) for all 3 lanes.
- 2 towers per team per lane (12 total), auto-attacking like existing entities, destructible, rendered with health bars.

**Non-Goals:**
- No changes to base/minion/tank stats, XP/leveling (not present in the current rewrite), or ability systems.
- No dynamic/runtime-editable lane layout (lane shape stays a fixed, tunable constant set as today).
- No new tile assets; street rendering reuses the existing `cobblestone_texture.jpg`.

## Decisions

### Shared lane waypoint module
Move the lane path math out of `GameRoom` into a new `shared/src/lanes.ts` exporting a pure function, e.g. `buildLanePath(fromBase, toBase, laneEdgeY)` plus the lane constants (`LANE_EDGE_Y`, `LANE_TURN_X`) and a helper `getLaneDefinitions(blueBase, redBase)` returning, per lane, the ordered waypoint list from blue base to red base. Both backend (minion spawning, tower placement) and frontend (street drawing) import this module, so lane shape changes in one place and everything derived from it stays consistent.
- Alternative considered: keep the logic backend-only and have the backend broadcast computed lane waypoints to the client at match start. Rejected because it adds a new network message/state field purely to communicate static, deterministic geometry that the frontend can compute itself from the same shared formula (bases are already fixed/shared constants), and because the shared-module approach also lets backend-side tower placement reuse the exact same function without new RPCs.

### Street rendering approach
Keep the existing Tiled tilemap (`arena.json`) for the grass background layer only; remove/neutralize the hand-authored cobblestone street tiles there. Render all lane streets into one transparent, world-sized canvas texture. Trace every shared waypoint list into a single canvas path and stroke the entire lane network twice: first with a slightly wider dark outline, then with the repeating cobblestone tile as the narrower stroke pattern. Use round line caps and joins. Drawing all outlines before any road fill prevents an outline from one branch from being painted over the textured surface of another branch at their shared base junction. This also avoids separately rotated `TileSprite` segments, whose end caps overlap at turns and whose tile texture does not align consistently. Draw this road texture above the grass and below all entities.
- Alternative considered: hand-edit `arena.json` tile-by-tile to approximate the diagonal segments. Rejected because Tiled's grid tiles can't cleanly represent arbitrary diagonal angles at the lane's turn points, and it would re-introduce the same drift risk if lane constants ever change.
- Previous implementation tested: one rotated `TileSprite` per straight segment. Rejected after visual inspection showed large, unnatural overlaps at turns and inconsistent texture continuity. A single stroked path gives the road one joined outline and one repeating texture pass per lane.

### Tower entity and placement
Add `Tower extends Entity` in `shared/src/state/Tower.ts` with `hp`, `maxHp`, `fireRange`, `fireCooldown`, `fireCooldownMax`, `fireDamage` (mirroring `Minion`'s shape), registered as `@type({ map: Tower }) towers` on `GameState`. On the `started` phase transition, for each of the 3 lanes and each team, place 2 towers at path-length fractions `0.2` and `0.4` measured from that team's own base along the lane path (so blue towers sit near x≈240 side progressing inward, red towers sit mirrored near the 2160 side), giving even, non-overlapping spacing with the inner tower farther from base than the outer one, consistent with "one tower, then another further away."
- Alternative considered: fixed world-space x-coordinates per tower regardless of lane shape. Rejected because the outer lanes are diagonal, so a fixed-x placement would put outer-lane towers off the visual road; placing by path-length fraction keeps towers on the lane for both the straight middle lane and the diagonal outer lanes.

### Combat integration
Towers reuse the existing generic combat helpers in `backend/src/rooms/combat.ts` (`findNearestEnemyInRange`, `hasDied`, `applyDamage`) the same way minions and bases already do. In `resolveCombat`, add towers to `enemyCandidates` and call `updateShooter` for each living tower, same as minions.

### Frontend rendering
Add `upsertTower(tower, id)` in `GameScene.ts` mirroring `upsertBase` (team-colored rectangle/sprite + `updateHealthBar`), and remove the sprite/health bar when a tower id disappears from `state.towers` (same pattern already used for other entities going away).

## Risks / Trade-offs

- [Canvas-textured streets may not match the map tile scale] → Build the pattern from the same 64x64 atlas tile used by the Tiled map and verify its scale and joins in a local match.
- [Moving lane constants out of `GameRoom` could subtly change minion paths if the extraction is imprecise] → Port `buildLanePath` with no logic changes, only relocating it, and keep/extend existing backend tests (`GameRoom`/combat tests) to assert identical waypoint output before/after the move.
- [Removing the static cobblestone tiles changes `arena.json`, a hand-authored asset] → Keep the grass tile layer untouched; only drop the cobblestone tile ids from the data array so the file stays a valid Tiled map with just a background layer.
