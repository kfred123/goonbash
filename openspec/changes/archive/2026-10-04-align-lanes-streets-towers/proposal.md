# Proposal

## Why

The arena's visual streets (the cobblestone tiles in `arena.json`) are a static, hand-authored layout that does not follow the same path the backend actually computes for minion lanes (`GameRoom.buildLanePath`, using `LANE_EDGE_Y`/`LANE_TURN_X`). The top and bottom streets run as vertical connectors near the map edges and flat horizontal bands near the map border, while the real top/bottom lane paths diagonal out from each base to inner turn points (x=750/1650) before running straight and diagonaling back in. Visually, minions and tanks walk off the drawn road. Additionally, the game currently has no lane towers at all (an existing archived prototype had them), so lanes have no map-control objectives besides the two bases.

## What Changes

- Extract the lane waypoint geometry (currently private to `GameRoom`) into a shared, reusable definition so both minion pathing and street/tower placement are derived from one source of truth.
- Replace the static street-tile layout with rendering that follows the exact lane waypoint path (diagonal-straight-diagonal for the outer lanes, straight for the middle lane), so streets and lanes always visually match, including after future tuning of lane constants.
- Add a new `Tower` entity (HP, team, fire range/rate/damage, similar to the archived `LaneTowerLogic.gd`) that auto-attacks enemies in range like minions/bases already do.
- Spawn exactly 2 towers per team per lane (12 towers total across 3 lanes), evenly spaced along each lane path on each team's own side, closest tower first and the second tower further out toward the lane midpoint — never two towers of the same team stacked at the same spot.
- Render towers on the frontend with team-colored sprites and health bars, consistent with how bases/minions are rendered today.

## Capabilities

### New Capabilities
- `lane-towers`: Defensive towers placed on each lane, per team, that auto-attack enemy tanks/minions/towers in range and can be destroyed.

### Modified Capabilities
- `game-backend`: Lane waypoint geometry becomes a shared definition consumed by minion spawning and tower placement; combat target resolution includes towers.
- `game-frontend`: Street rendering must follow the shared lane waypoint geometry instead of a static tile layout; towers must be rendered with health bars.

## Impact

- `backend/src/rooms/GameRoom.ts`: extract/reuse lane waypoint builder, spawn towers per lane on match start, include towers in `resolveCombat`/`enemyCandidates` and win-condition checks.
- `shared/src/state/`: new `Tower.ts` schema class, registered on `GameState`.
- `shared/src/` (new module): shared lane waypoint/path definitions usable by both backend and frontend.
- `frontend/src/GameScene.ts`: replace/augment `createTilemap` street rendering with a path-following draw, add tower sprite + health bar rendering (`upsertTower`), keep grass background from the existing tilemap.
- `frontend/public/assets/maps/arena.json`: cobblestone tiles no longer need to encode the lane shape (or are removed/simplified), since streets are drawn from lane waypoints.
