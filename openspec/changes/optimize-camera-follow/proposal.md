# Proposal

## Why

The arena is currently exactly the size of the Phaser canvas (800x600), so the entire battlefield is always visible at once and the camera never moves. This makes the map feel small and cramped, and combined with the current move speeds it's too easy to cross the whole map. A larger world with a camera that follows the local player (with the map scrolling instead of always being fully visible), plus halved player movement speed, will make positioning, lane pushes, and combat feel more deliberate and spatially engaging.

## What Changes

- Expand the arena/world to be significantly larger than the visible viewport (world size decoupled from the 800x600 canvas).
- Reposition bases, lane waypoints, and spawn points to fit the larger world.
- Add a Phaser camera that follows the local player's tank, smoothly, and is clamped to the world bounds so it never scrolls past the map edges.
- Update the backend's movement clamping bounds to match the new, larger world dimensions.
- Halve every role's `moveSpeed` stat (healer, tank, damagedealer) so players move at half their current speed. **BREAKING**: existing balance/tuning assumptions (e.g. ability durations vs. travel distance) may need re-validation, though no external API changes.

## Capabilities

### New Capabilities
- `camera-follow`: Frontend camera behavior — follows the local player's tank, smooth-scrolls, and is clamped to the expanded world bounds so only a portion of the map is visible at a time.

### Modified Capabilities
- `game-frontend`: "Render Game World" requirement changes from rendering the whole map at fixed canvas size to rendering only the camera's current viewport into a larger world.
- `game-backend`: "Authoritative Game Loop" gains updated world-bounds clamping for the larger arena, and player tank move speeds are halved.

## Impact

- `frontend/src/GameScene.ts`: add/attach a following `Phaser.Cameras.Scene2D.Camera`, set world bounds, adjust rendering of map/entities relative to camera.
- `backend/src/rooms/GameRoom.ts`: update hardcoded position clamps (20/780, 20/580), base positions, lane edge/turn constants, and initial spawn randomization to the new world size.
- `shared/src/roles.ts`: halve `moveSpeed` for `healer`, `tank`, `damagedealer`.
- No changes to network protocol/message shapes; existing state schema (`Tank.x/y`, `Base.x/y`, etc.) is reused with new coordinate ranges.
