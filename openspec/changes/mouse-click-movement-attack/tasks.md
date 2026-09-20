## 1. Shared Schema

- [x] 1.1 Add `moveTargetX`, `moveTargetY`, `hasMoveTarget` fields to `Tank` in `shared/src/state/Tank.ts`
- [x] 1.2 Add `lockedTargetId` (string, default `""`) field to `Tank`
- [x] 1.3 Remove `inputX`/`inputY` fields from `Tank` (and any other schema consuming them) once backend/frontend no longer reference them (see section 4)

## 2. Backend Command Handling

- [x] 2.1 Replace the `"input"` message handler in `GameRoom.onCreate` with a `"command"` handler accepting `{ x?, y?, targetId? }`
- [x] 2.2 On a valid `targetId` referring to a living enemy tank or minion: set `lockedTargetId`, clear `hasMoveTarget`
- [x] 2.3 On valid numeric `x`/`y` (and no valid `targetId`): clamp to arena bounds, set `moveTargetX`/`moveTargetY`, `hasMoveTarget = true`, clear `lockedTargetId`
- [x] 2.4 Ignore commands for tanks that are dead or when `phase !== "started"`, and ignore malformed commands (no valid `targetId` and no valid `x`/`y`)

## 3. Backend Movement & Targeting Resolution

- [x] 3.1 In `GameRoom`'s per-tick update loop, for each alive player tank with `lockedTargetId` set: look up the target; if missing/dead, clear `lockedTargetId` and skip movement/firing for that tank this tick
- [x] 3.2 If the locked target is valid and farther than `fireRange`, move the tank one step toward the target's current position (reusing the tank's existing speed)
- [x] 3.3 If the locked target is valid and within `fireRange`, stop the tank's movement and fire at that specific target id (bypassing `findNearestEnemyInRange` for player tanks with a lock)
- [x] 3.4 Else if `hasMoveTarget` is true: move the tank one step toward `(moveTargetX, moveTargetY)`; on arrival within an arrival epsilon, clear `hasMoveTarget` and stop
- [x] 3.5 Else (no lock, no move target): tank stands idle and does not fire
- [x] 3.6 Ensure minion AI targeting/firing (`findNearestEnemyInRange` usage for minions) is left unchanged

## 4. Frontend Input Capture

- [x] 4.1 Remove keyboard-based `sendInput` (WASD/arrow key polling) and the `keydown`/`keyup` listeners from `GameScene.ts`
- [x] 4.2 Add a `pointerdown` handler on the scene that converts the click to world/map coordinates
- [x] 4.3 Hit-test the click against currently rendered enemy tank/minion/base sprites within a small click-radius tolerance; ignore friendly-unit sprites
- [x] 4.4 On enemy hit: send `room.send('command', { targetId })`; otherwise send `room.send('command', { x, y })`
- [x] 4.5 Do not send any command while the local player's tank is dead (reuse existing dead-tank guard)
- [x] 4.6 Add a click-feedback marker: spawn a red cross centered on the target (tracking it every frame as it moves) when an enemy/base sprite was hit, or a green cross fixed at the click point when it was a ground click; fade/destroy the marker after ~1 second
- [x] 4.7 Suppress the click-feedback marker when the click hit a friendly unit (no move/attack command issued)

## 5. Tests & Verification

- [x] 5.1 Add backend unit tests for move-to-point arrival/stop behavior
- [x] 5.2 Add backend unit tests for lock acquisition, chase-when-out-of-range, fire-when-in-range, and lock-clearing on target death
- [x] 5.3 Add/update tests verifying a new click (point or different enemy) overrides an existing lock
- [x] 5.4 Update or remove any existing tests/manual steps referencing keyboard `inputX`/`inputY` handling
- [x] 5.5 Manually verify in a local match: clicking ground moves the tank there and stops, showing a fading green cross; clicking a distant enemy or enemy base chases then attacks it, showing a red cross centered on and following the target until it fades; clicking elsewhere releases the lock; the lock survives multiple ticks without re-clicking
- [x] 5.6 Run backend test suite and fix any regressions
