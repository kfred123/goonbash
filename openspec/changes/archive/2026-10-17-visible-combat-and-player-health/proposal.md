## Why

The game currently has no combat: minions walk toward their waypoint but never fight, player tanks only move, and there is no way to see who is shooting whom, take damage, die, or come back into the match. Without visible shots, non-blocking targeting, and a player health/respawn loop, matches have no win/lose feedback and MOBA-style skirmishes are impossible to follow or play.

## What Changes

- All combat-capable units (minions, tanks, bases where relevant) automatically acquire the nearest valid enemy target within range and fire visible projectiles at it on a fire-rate cooldown.
- Friendly units no longer block each other's line of fire or movement path when selecting/approaching a target; targeting always considers only enemy units as obstructions, not teammates.
- Player-controlled tanks automatically fire at enemy units in range using the same auto-targeting/projectile system as minions, and are themselves valid targets that enemy units (minions and enemy tanks) can auto-fire at.
- Player tanks display a visible health bar reflecting current/max HP, updated in real time as they take damage.
- When a player tank's HP reaches 0, the tank is removed from the arena (player "dies"), a brief respawn timer starts, and the tank reappears with full HP at their team's main base/tower (not at their previous position).
- **BREAKING**: The `input` message handling and tank update loop gain new combat-related side effects (taking damage, dying); tanks are no longer purely player-driven objects with unlimited uptime.

## Capabilities

### New Capabilities
- `unit-combat-targeting`: Automatic enemy target acquisition and visible projectile firing for minions and tanks, including friendly-unit non-blocking rules for targeting/pathing.
- `player-respawn`: Player tank death-on-zero-HP and respawn-at-base behavior, including the respawn timer and state reset.

### Modified Capabilities
- `game-backend`: The authoritative game loop gains a combat resolution phase (target acquisition, projectile spawning/movement/collision, damage application, death handling) executed each tick alongside movement.
- `game-frontend`: The rendering layer gains projectile sprites, player/minion health bars, and death/respawn visual feedback.

## Impact

- Affected code: `backend/src/rooms/GameRoom.ts` (game loop, combat resolution, respawn logic), `shared/src/state/*` (new `Projectile` schema type, HP/targeting fields on `Entity`/`Tank`/`Minion`, respawn state on `Tank`), `frontend/src/GameScene.ts` (projectile rendering, health bar UI, death/respawn visuals).
- New shared schema types synced over the network increase state payload size slightly (per-projectile position updates each tick).
- No new external dependencies expected; builds on the existing Colyseus room/schema architecture.
