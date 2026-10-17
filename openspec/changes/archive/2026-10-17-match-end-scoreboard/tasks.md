# Tasks

## 1. Shared Match Results State

- [x] 1.1 Add the ended phase, winner team, and synchronized per-player result statistics to shared game state; verify the shared TypeScript build and schema tests pass.
- [x] 1.2 Add shared-state tests for initializing and serializing player result records, including the fixed level value; verify `npm test --workspace=shared` passes.

## 2. Backend Match Completion and Statistics

- [x] 2.1 Track actual opposing damage and player-tank kills at projectile impact, preserving each participant's record after leaving; verify backend tests cover mitigation, overkill, kill credit, and disconnected players.
- [x] 2.2 End the match on main-base destruction, record the opposing winner, and reject further simulation/actions; verify backend tests cover both base outcomes and post-end action handling with `npm test --workspace=backend`.

## 3. Match Results Screen

- [x] 3.1 Render the victory/defeat screen with one results table per team and all requested player statistics when the synchronized match ends; verify `npm run build --workspace=frontend` succeeds and both outcomes display correctly in a match.
- [x] 3.2 Add independent ascending/descending sorting by kills, level, and damage, with kills descending as the default; verify column selection changes each team's row order and repeated selection reverses it.
- [x] 3.3 Add a return-to-main-menu action that leaves the room and clears match presentation; verify a player can return from results without remaining connected to the finished room.

## 4. Integration Validation

- [x] 4.1 Build shared, backend, and frontend together and run the shared/backend test suites; verify the result state is compatible across client and server and all checks pass.
