# Design

## Context

The arena today is exactly the Phaser canvas size (800x600); `GameRoom.ts` clamps every tank's position to `[20,780] x [20,580]`, bases sit at `(80,300)`/`(720,300)`, and lane waypoints use `LANE_EDGE_Y = [50,300,550]` / `LANE_TURN_X = [250,550]`. The frontend never creates or moves a camera, so the whole map is always fully visible. Move speeds live in `shared/src/roles.ts` (`healer 190`, `tank 140`, `damagedealer 200`) and are read by the backend's authoritative movement step. See proposal.md - Why for the motivation.

## Goals / Non-Goals

**Goals:**
- Make the world coordinate space larger than the 800x600 viewport, with the server remaining the sole authority on positions and bounds (no client-side prediction changes).
- Add a Phaser camera on the client that follows the local player's tank and never shows space outside the world.
- Halve all three roles' `moveSpeed` values.
- Keep the existing network protocol/state schema unchanged (only coordinate ranges and stat values change).

**Non-Goals:**
- No change to how movement commands are issued (still click-to-move / locked-target chase) or to combat/ability mechanics.
- No minimap, fog-of-war, or zoom controls - only camera-follow and bounding.
- No change to canvas/window resolution (800x600 viewport stays as the rendering surface).

## Decisions

- **World size**: Scale the world to `2400x1800` (3x the current 800x600 in each axis), preserving the 4:3 aspect ratio so existing lane geometry scales uniformly.
  - Alternative considered: keep width the same and only grow height, but that would distort the existing symmetric two-lane-edge/one-middle-lane layout; uniform scaling keeps the same relative geometry.
- **Coordinate scaling**: Multiply every hardcoded position/bound in `GameRoom.ts` by 3: base positions `(240,900)` / `(2160,900)`, tank move-target clamp `[60,2340] x [60,1740]`, `LANE_EDGE_Y = [150,900,1650]`, `LANE_TURN_X = [750,1650]`, initial join-time spawn randomization scaled from `Math.random()*500` to `Math.random()*1500`.
  - Alternative considered: introduce a `WORLD_SCALE` runtime constant multiplied at use-sites instead of pre-computed literals, to make future re-tuning easier. Chosen approach: define named `WORLD_WIDTH`/`WORLD_HEIGHT` (and derived lane/base) constants once at the top of `GameRoom.ts` so values stay both explicit and easy to re-derive, rather than scattering `* 3` throughout.
- **Camera implementation**: Use Phaser's built-in `camera.startFollow(target, true, lerpX, lerpY)` with `camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)`, attached in `GameScene` once the local player's tank sprite exists (on `arenaStarted`/tank creation), rather than hand-rolling scroll math.
  - Alternative considered: manually offsetting every draw call by a computed camera position. Rejected - reimplements what Phaser's camera system already provides, and would need to be kept in sync with Phaser's own coordinate/input systems (e.g. pointer-to-world conversion for click-to-move).
- **Follow smoothing**: Use a small lerp factor (e.g. `0.1`) rather than an instant hard-snap, for a smoother feel; this is purely a client visual concern and has no gameplay/server implication.
- **Movement speed**: Halve the three `moveSpeed` values in `shared/src/roles.ts` directly (`healer 95`, `tank 70`, `damagedealer 100`) rather than adding a global multiplier, since these are the single source of truth already consumed by the backend.

## Risks / Trade-offs

- [Scaling lane/base constants by hand risks silent mismatches between frontend expectations and backend authoritative values] → Centralize the new world-size and derived constants at the top of `GameRoom.ts` (single source of truth) and mirror the same `WORLD_WIDTH`/`WORLD_HEIGHT` values into the frontend camera bounds setup so both sides agree.
- [Halved movement speed lengthens time-to-engage, which could make early game feel slow or make some abilities (e.g. Healer Speed boost, timed durations) proportionally stronger/weaker relative to travel time] → Explicitly called out as a re-tuning consideration in the proposal; no ability numbers are changed in this proposal, follow-up balance changes can be proposed separately if needed after playtesting.
- [Camera following could interact oddly with the existing click-to-move input, which relies on pointer coordinates] → Convert pointer input through Phaser's camera-aware `pointer.worldX`/`pointer.worldY` (or equivalent) instead of raw screen coordinates when computing move-to-point commands.

## Migration Plan

- Single-PR change; no data migration needed (game state is ephemeral per match).
- Deploy backend and frontend together, since the frontend's world-bounds/camera setup depends on the backend's new coordinate ranges and vice versa (movement clamps must match what the camera expects to show).
- Rollback: revert the commit; no persisted state is affected.
