## Why

The game currently only has a single central spawn point per team with unarmed minions that walk in a straight line toward the enemy base and never fight anything along the way (`GameRoom.spawnWave`/`update` in `backend/src/rooms/GameRoom.ts`). There is no concept of lanes, towers, or minion-vs-minion combat, so matches lack the core MOBA push-and-defend loop. This change introduces main towers per team, three lanes (top/mid/bottom) with mobs marching down each lane, in-lane combat between opposing mobs, and destructible towers as the win condition driver.

## What Changes

- Add a **Main Tower** per team (left/right), replacing/extending the current `Base` as the structure mobs spawn from and the ultimate target mobs attack.
- Add three **lanes** (top, mid, bottom) per team; every 15 seconds each team's tower spawns one mob per lane that walks toward the enemy tower along that lane's path.
- Add **mob combat**: while moving, a mob continuously scans for the nearest enemy unit (mob, tower, or player) within its attack range on its lane; if one is found, the mob stops and attacks it (auto-targeting the closest target, re-evaluating target when the current one dies or leaves range).
- Add a shared **health/HP system** for mobs and towers: units take damage while under attack, and are removed (mobs) or considered destroyed (towers) when HP reaches 0.
- Add **resume-path behavior**: once no enemy unit remains in range, a stopped mob resumes moving along its lane waypoint path toward the enemy tower.
- Add **tower destruction**: mobs (and other allowed attackers) that reach the enemy tower attack it until its HP reaches 0, at which point the tower is destroyed.
- All combat/spawn values (spawn interval, mob HP/damage/speed/range, tower HP/damage/range) SHALL be defined as configurable parameters rather than hardcoded magic numbers.
- **BREAKING**: Replaces the current single-lane, non-combatant minion spawn/movement logic with the new multi-lane, combat-capable mob system; existing `Minion`/`Base` waypoint logic in `GameRoom.ts` is superseded.

## Capabilities

### New Capabilities
- `tower-lane-combat`: Main towers, three lanes, periodic mob spawning, mob movement along lane waypoints, nearest-enemy auto-targeting and combat, HP/damage/destruction for mobs and towers, and configurable combat parameters.

### Modified Capabilities
- `game-backend`: The authoritative game loop's minion-handling requirement is extended to cover multi-lane spawning, in-lane combat resolution, and tower destruction (previously only straight-line movement and simple wave spawning were specified).

## Impact

- Affected code: `backend/src/rooms/GameRoom.ts` (spawn/update loop), `shared/src/state/Minion.ts`, `shared/src/state/Base.ts`, `shared/src/state/GameState.ts` (new/changed schema types for towers, lanes, mobs), and any client rendering code that visualizes bases/minions/towers.
- New shared schema types likely needed: `Tower`, lane waypoint definitions, and a combat-relevant `targetId`/`state` field on mobs.
- No changes to networking transport or lobby/team-selection systems.
