# Tasks

## 1. Shared lane geometry module

- [x] 1.1 Create `shared/src/lanes.ts` exporting `LANE_EDGE_Y`, `LANE_TURN_X`, and `buildLanePath(fromBase, toBase, laneEdgeY)` moved out of `GameRoom.ts` with identical logic, plus a `getLaneWaypoints(blueBase, redBase)` helper returning the 3 lanes' full waypoint lists (base-to-base, including the base endpoints); verify with a new `shared/src/lanes.test.ts` asserting the same waypoints the old inline `buildLanePath` produced for the existing `LANE_EDGE_Y`/`LANE_TURN_X` values.
- [x] 1.2 Update `backend/src/rooms/GameRoom.ts` to import and use `buildLanePath`/lane constants from `shared/src/lanes.ts` instead of its private copies, removing the duplicated code; verify `npm test` in `backend` still passes (existing minion-path behavior unchanged).

## 2. Tower entity and backend placement

- [x] 2.1 Add `shared/src/state/Tower.ts` (`Tower extends Entity` with `hp`, `maxHp`, `fireRange`, `fireCooldown`, `fireCooldownMax`, `fireDamage`, defaults mirroring `Minion`/archived tower stats: hp 300, fireRange 250, fireCooldownMax ~1200ms, fireDamage 12) and register `@type({ map: Tower }) towers = new MapSchema<Tower>()` on `GameState`; verify the project's TypeScript build (`npm run build` or `tsc --noEmit` in `shared`/`backend`) compiles with no errors.
- [x] 2.2 Implement tower placement in `GameRoom.ts`: on transition to the `started` phase, for each of the 3 lanes (from `getLaneWaypoints`) and each team, create 2 towers positioned at path-length fractions 0.2 and 0.4 measured from that team's own base along the lane path; verify with a new backend test asserting 12 towers are created (2 teams × 3 lanes × 2 towers), each team's two towers are a non-zero, consistent distance apart, and towers sit on the lane path.
- [x] 2.3 Include towers in `resolveCombat`'s `enemyCandidates` and call `updateShooter` for each living tower (reusing `findNearestEnemyInRange`/`hasDied`/`applyDamage` from `combat.ts`), and ensure other entities (tanks/minions) can target towers; verify with a backend test where a minion/tank is placed in range of an enemy tower and the tower fires a projectile, and another test where a tower is reduced to 0 HP and is excluded from subsequent `enemyCandidates`.

## 3. Frontend street rendering aligned to lanes

- [x] 3.1 Remove the cobblestone street tiles from `frontend/public/assets/maps/arena.json`'s `ground` layer data (keep the grass tiles), so the tilemap only renders the background; verify the file still validates as Tiled JSON (loads without error) and the arena preview shows only grass.
- [x] 3.2 In `frontend/src/GameScene.ts`, add a street-drawing step that imports the same `shared/src/lanes.ts` lane waypoints (using the known base positions) and draws a textured, team-neutral road (e.g. `cobblestone` texture tiled along rectangle-strip segments) following each lane's diagonal-straight-diagonal/straight path, drawn before entity sprites so it sits under tanks/minions/towers; verify visually in the running frontend (`npm run dev`) that all 3 lanes' roads align with where minions actually walk, and the outer lanes show the diagonal turn segments.
- [x] 3.3 Replace the per-segment road `TileSprite`s with a single transparent road canvas: stroke each complete lane polyline once using a repeating 64x64 cobblestone atlas tile, rounded joins/caps, and a road width matching lane traffic; ensure the generated texture renders above grass and below game entities. Inspect an outer-lane turn in a live match for seamless joins and natural texture scale.

## 4. Frontend tower rendering

- [x] 4.1 Add `upsertTower(tower, id)` in `GameScene.ts` mirroring `upsertBase` (team-colored sprite + `updateHealthBar`), wired into the same state-change subscriptions used for bases/minions, and remove a tower's sprite/health bar when its id is no longer present in `state.towers`; verify by running a local match (`npm run dev` + backend) and confirming 12 tower sprites with health bars appear at match start, update when damaged, and disappear when destroyed.

## 5. Integration check

- [ ] 5.1 Run the full backend test suite (`npm test` in `backend`) and a manual local playtest (start backend + frontend, start a match) confirming: streets visually match minion/tank travel paths on all 3 lanes, exactly 12 towers appear at the correct spaced positions, towers fire on enemies in range, and a destroyed tower disappears from both state and rendering.
