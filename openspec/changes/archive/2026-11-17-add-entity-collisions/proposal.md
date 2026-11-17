# Proposal

## Why

Players can currently drive through other players and structures, and minions can occupy identical positions. Server-authoritative collision rules will make positioning meaningful and keep minion waves distinct without letting players obstruct them.

## What Changes

- Prevent living players from passing through other living players, living lane towers, or living main bases, regardless of team.
- Let players and minions pass through each other in both directions.
- Make living minions avoid one another and navigate around lane towers and main bases without overlapping or abandoning their lane objectives.
- Keep destroyed tower ruins and dead players, including respawn previews, non-blocking.
- Apply the same player collision rules to move commands and attack pursuit. Preserve commands while temporarily blocked rather than treating contact as arrival.
- Use collision-safe initial placement, wave spawning, and respawning so units do not begin active play inside blocking entities.

## Capabilities

### New Capabilities

- `entity-collisions`: Team-independent collision matrix, authoritative movement constraints, minion avoidance, and collision-safe placement.

### Modified Capabilities

- `game-backend`: Make minion lane movement obstacle-aware and ensure team-base tank placement respects occupied space.
- `mouse-click-control`: Qualify straight-line click movement and attack pursuit with collision constraints and blocked-command behavior.

## Impact

- Backend: `backend/src/rooms/GameRoom.ts`, movement/placement helpers, and focused simulation tests. Main bases are included as blockers by explicit user decision.
- Shared: explicit world-space collision dimensions for tanks, minions, towers, and bases, separate from visual scaling, click selection, and projectile impact radii.
- Frontend: retain authoritative position replication and existing click/attack UX; check existing interpolation against obstacle avoidance.
- Documentation: describe the collision matrix and movement behavior in `readme.md`.
- No physics-engine dependency, new network command, projectile blocking, full-map pathfinding, combat-stat change, or unrelated respawn/presentation redesign.
