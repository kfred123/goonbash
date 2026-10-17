# Tasks

## 1. World size and backend bounds

- [x] 1.1 Add `WORLD_WIDTH = 2400` / `WORLD_HEIGHT = 1800` constants at the top of `backend/src/rooms/GameRoom.ts` and derive base positions (`blue: (240, 900)`, `red: (2160, 900)`), `LANE_EDGE_Y = [150, 900, 1650]`, and `LANE_TURN_X = [750, 1650]` from them; verify `npm test` in `backend/` still passes.
- [x] 1.2 Update the move-command clamp in the `"command"` message handler and both position clamps in `updateTankMovement` from `[20,780]/[20,580]` to the new world bounds (e.g. `[60, WORLD_WIDTH-60]` / `[60, WORLD_HEIGHT-60]`); verify by unit test or manual play that a tank driven to a far edge stops at the new boundary instead of `780`/`580`.
- [x] 1.3 Scale the `onJoin` initial spawn randomization (`Math.random()*500`) to the new world size (e.g. `Math.random()*1500`) and verify newly joined tanks appear within world bounds, not clustered at the old 0-500 range.
- [x] 1.4 Add/update a backend test in `backend/src/rooms/combat.test.ts` (or a new test file) asserting `stepToward`/movement clamping respects the new world bounds constants; verify `npm test` passes.

## 2. Halve player movement speed

- [x] 2.1 Halve `moveSpeed` for all three roles in `shared/src/roles.ts` (`healer: 95`, `tank: 70`, `damagedealer: 100`); verify `npm test` in `shared/` (or wherever role stats are tested) still passes.
- [x] 2.2 Confirm no other code hardcodes the old speed values (search for `190`, `140`, `200` near role/tank speed usage) and update any found; verify via `grep`/build that no stale literals remain.

## 3. Frontend camera follow

- [x] 3.1 In `frontend/src/GameScene.ts`, call `this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)` using the same world dimensions as the backend, and start `startFollow` on the local player's tank sprite once it is created/identified after the match starts; verify by running `npm run dev` in `frontend/` and visually confirming the camera scrolls with the local tank instead of showing the whole map.
- [x] 3.2 Add camera-follow smoothing (small lerp, e.g. `0.1`) and confirm the camera never shows space outside `[0, WORLD_WIDTH] x [0, WORLD_HEIGHT]` even when the local tank is at a world edge; verify by manually moving a tank into each corner of the world.
- [x] 3.3 Update click-to-move pointer handling to convert screen coordinates to world coordinates via the active camera (e.g. `pointer.worldX`/`pointer.worldY`) so move-to-point commands remain accurate once the camera is no longer fixed at the origin; verify by clicking near a screen edge while scrolled away from world origin and confirming the tank moves to the clicked world location, not the pre-camera screen location.
- [x] 3.4 Ensure the camera falls back to its default (non-following) view in menu/lobby screens where there is no local player tank yet; verify by checking the main menu and lobby screens render normally with no camera-follow errors in the console.

## 4. Verification

- [x] 4.1 Run the full backend test suite (`npm test` in `backend/`) and confirm all tests pass with the new world size, bounds, and movement speed values.
- [x] 4.2 Manually play a full match end-to-end (start game, move a tank across the map, fight near a base) confirming: only part of the map is visible at once, the camera follows the player smoothly, movement feels half as fast as before, and the tank cannot leave the world bounds.
