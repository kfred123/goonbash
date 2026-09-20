## Why

Player movement and attacking currently rely on WASD/arrow keys with automatic nearest-enemy targeting. Point-and-click control (click-to-move, click-to-attack with a persistent target lock) is a more natural interaction model for this top-down tank game and gives players direct control over which enemy they engage, rather than always auto-firing at the nearest one.

## What Changes

- Add mouse input capture on the frontend: left-click on empty ground sends a "move to point" command; left-click on an enemy tank/minion sends an "attack target" command.
- Add a destination-based movement mode on the backend: tanks move toward a commanded `(x, y)` point at their normal speed and stop upon arrival, replacing the raw per-tick `inputX`/`inputY` directional velocity as the primary movement command.
- Add target-lock behavior: clicking an enemy sets it as the tank's locked target. If the enemy is out of `fireRange`, the tank first moves into range, then stops and fires (reusing existing fire-cooldown/projectile logic) at the locked target instead of the nearest-enemy auto-pick.
- The lock persists (continuing to chase/re-engage the same target as it moves) until the player issues a new command (clicking another point or another enemy), or the locked target dies/leaves play, at which point the tank has no target and stands idle until the next click.
- Add a short-lived click-feedback marker at the clicked location: a green cross when the click targeted empty ground (move command), or a red cross when the click targeted an enemy tank, minion, or enemy base (attack command). Each marker fades/disappears after about one second and is purely visual (no gameplay effect).
- **BREAKING**: Removes automatic nearest-enemy auto-targeting for player-controlled tanks; tanks only engage a target the player has explicitly clicked. Minion AI targeting is unaffected.

## Capabilities

### New Capabilities
- `mouse-click-control`: Click-to-move and click-to-attack-with-lock input scheme for player tanks, including move-to-point pathing, in-range attack engagement, and target lock/unlock semantics.

### Modified Capabilities
- `game-frontend`: "Capture Player Input" requirement changes from keyboard-driven directional input to mouse click capture for movement and attack commands.
- `game-backend`: "Authoritative Game Loop" requirement changes to process move-to-point and locked-target commands for tanks instead of raw directional input, and to resolve tank auto-fire against the player-selected locked target rather than the nearest enemy.

## Impact

- Frontend: `frontend/src/GameScene.ts` (input capture, `sendInput`, sprite click hit-testing, click-feedback marker rendering).
- Backend: `backend/src/rooms/GameRoom.ts` (message handlers, movement/update loop), `backend/src/rooms/combat.ts` (targeting logic).
- Shared schema: `shared/src/state/Tank.ts` (replace/augment `inputX`/`inputY` with destination and locked-target fields).
- Tests: `backend/src/rooms/combat.test.ts` and any movement-related tests.
