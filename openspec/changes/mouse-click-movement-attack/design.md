## Context

Tanks currently move via raw directional input: the frontend polls WASD/arrow key state every frame and sends `{ x, y }` in `[-1, 1]` as `inputX`/`inputY` over the `"input"` message; `GameRoom`'s update loop applies these as velocity each tick. Attacking is fully automatic: each tick, every alive tank/minion calls `findNearestEnemyInRange(unit, candidates, fireRange)` and fires at whatever enemy is nearest and in range (`fireRange = 150`), with no player choice of target.

This change replaces that scheme for player tanks with point-and-click control:
- Click empty ground → move to that point.
- Click an enemy → lock onto it, closing distance if needed, then engage it specifically (not just "nearest enemy") once in range.
- The lock persists across ticks (re-chasing a moving target) until the player clicks elsewhere or the target dies.

Minion AI is unaffected; it keeps using `findNearestEnemyInRange`.

## Goals / Non-Goals

**Goals:**
- Replace keyboard directional input with mouse click-to-move for player tank movement.
- Let players click an enemy sprite (tank, minion, or enemy base) to select it as an explicit attack target.
- Auto-approach a locked target when it's out of `fireRange`, then stop and let existing fire-cooldown/projectile logic engage it.
- Persist the lock across ticks/target movement until the player issues a new click (elsewhere or on another enemy) or the target dies.
- Show a short-lived visual marker at the click location: green cross for a move command, red cross for an attack command, fading after ~1 second.
- Keep all authoritative movement/targeting/combat resolution on the backend (client only sends intents).

**Non-Goals:**
- Changing minion AI targeting or projectile/damage mechanics.
- Pathfinding around obstacles (movement remains a straight-line move-to-point, matching the current lack of obstacle collision).
- Multi-target selection, right-click context menus, or other RTS-style UI beyond single left-click.
- Keeping legacy WASD movement working (it is removed for player tanks per the proposal's breaking change).

## Decisions

### 1. Replace `inputX`/`inputY` with a destination + locked-target model on `Tank`
Add to `shared/src/state/Tank.ts`:
- `moveTargetX: number`, `moveTargetY: number`, `hasMoveTarget: boolean` — the commanded destination point.
- `lockedTargetId: string` (empty string = no lock) — id of the tank/minion the player clicked to attack.

Remove `inputX`/`inputY` usage for tank movement (fields can be dropped since no other consumer depends on them per the frontend/backend scan).

Alternative considered: keep `inputX`/`inputY` alongside new fields and let the client choose either mode. Rejected — the proposal explicitly replaces the keyboard scheme, and supporting both increases server-side ambiguity (which mode wins each tick) for no current benefit.

### 2. One message type: `"command"` carrying either a point or a target id
The client sends a single `"command"` message shaped as `{ x, y }` (move-to-point) or `{ targetId }` (attack). The server:
- On `{ x, y }`: clears `lockedTargetId`, sets `hasMoveTarget = true` with the clamped-to-arena point.
- On `{ targetId }`: validates the id refers to a living enemy tank/minion; sets `lockedTargetId`, clears `hasMoveTarget` (movement toward the target is derived each tick from the lock, not stored as a static point, since the target can move).

Alternative considered: two separate message names (`move_to`, `attack_target`). Rejected in favor of one message for simpler client call sites (a single click handler branches on what was clicked and sends one message), but either is a thin wrapper — this is a naming choice, not a behavior difference.

### 3. Per-tick resolution order in `GameRoom`'s update loop
For each alive player tank, each tick:
1. If `lockedTargetId` is set:
   - Look up the target entity (tank or minion) by id.
   - If it no longer exists or is dead (`hasDied`/`state === "dead"`), clear `lockedTargetId` and stop (tank goes idle).
   - Else compute distance to the target's current position.
     - If distance > `fireRange`: move the tank straight toward the target's current position at its normal speed (steer-toward, recomputed every tick since the target moves).
     - If distance <= `fireRange`: stop moving; existing fire-cooldown/projectile spawn logic fires at this specific `lockedTargetId` instead of calling `findNearestEnemyInRange`.
2. Else if `hasMoveTarget`:
   - Move straight toward `(moveTargetX, moveTargetY)` at normal speed.
   - On arrival (distance <= a small arrival epsilon), clear `hasMoveTarget` and stop.
3. Else: tank stands idle.

This reuses the existing fire-cooldown/projectile-spawn code path (`combat.ts`), only changing *which* candidate is selected as the shooting target for player tanks (explicit lock vs. nearest-enemy scan).

### 4. Frontend hit-testing for clicks
`GameScene.ts` registers a single `pointerdown` handler on the scene. It hit-tests the click against currently-rendered enemy tank/minion/base sprites (existing sprite maps used for interpolation) within a small click-radius tolerance:
- Hit an enemy sprite (tank, minion, or base) → send `{ targetId: <id> }` and show a red cross at the click point.
- Otherwise → send `{ x: worldX, y: worldY }` (pointer position converted to world/map coordinates) and show a green cross at the click point.

Friendly-unit clicks are ignored (no self-targeting, no marker), matching existing `combat.ts` team-exclusion behavior.

### 5. Movement speed source
Reuse the tank's existing speed constant/field used by the old directional-input movement code (no new speed concept); only the *direction/target* of movement changes, not how fast a tank moves per tick.

### 6. Click-feedback marker is purely client-side, not server state
The green/red cross marker is rendered entirely by `GameScene.ts` at the moment of the click, driven by the same hit-test result already computed to decide which message to send (enemy/base sprite hit → red cross; otherwise → green cross). The green (move) marker is drawn once at the fixed click point and tweened to fade out. The red (attack) marker is instead centered on the target's current position and re-centered on it every frame (via the tank/minion/base's live state position) for as long as it remains visible, so it visually tracks a moving target instead of staying at the original click point. Both are destroyed after ~1 second via a Phaser tween/timer — no new schema field, network message, or server-side state is needed since the marker conveys no gameplay information and only the clicking player needs to see it.

Alternative considered: broadcast the click classification through Colyseus state so all clients see each other's click markers. Rejected — the requirement only calls for feedback to the clicking player, and adding shared state for a purely cosmetic, per-player UI cue would add unnecessary network/schema surface.

## Risks / Trade-offs

- [Removing keyboard input is a breaking change for any existing player muscle memory or tests] → Update/replace existing input-related frontend tests and manual verification steps to use mouse; call out clearly in tasks.md and release notes (proposal already marks this **BREAKING**).
- [Straight-line move-to-point with no pathfinding means tanks can walk through obstacles/bases] → Acceptable since current WASD movement has the same lack of collision; no regression introduced.
- [Locked target moving out of the map bounds or behind a base could cause a tank to path oddly] → Out of scope; matches existing minion/auto-fire behavior which already targets purely by distance with no obstacle awareness.
- [Single `"command"` message with two shapes could be sent with both `x`/`y` and `targetId` malformed/ambiguous input] → Server validates: if `targetId` is present and refers to a valid living enemy, treat as attack; otherwise fall back to treating it as a move-to-point if `x`/`y` are valid numbers; otherwise ignore the message.

## Migration Plan

1. Add new `Tank` schema fields (`moveTargetX/Y`, `hasMoveTarget`, `lockedTargetId`) alongside existing `inputX/inputY`.
2. Implement backend command handling and per-tick movement/targeting resolution using the new fields.
3. Switch the frontend to send `"command"` messages from mouse clicks instead of `"input"` from keyboard polling.
4. Remove the now-unused keyboard input capture and `inputX`/`inputY` fields/handlers once the new path is verified end-to-end.
5. Rollback: revert steps 3-4 (restore keyboard `sendInput`/`inputX`/`inputY` handling) if mouse control regresses gameplay; the backend can support both message handlers side-by-side during a transition if needed.

## Open Questions

- None outstanding; arrival epsilon and click hit-radius tolerance are implementation constants to be tuned during implementation/testing rather than product decisions.
