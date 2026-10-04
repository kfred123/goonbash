# Proposal

## Why

Today a tank's initial spawn position is a fully random point anywhere on the map (`Math.random() * 1500` for both axes), so players can start the match far from their own base with no relation to their team's side. On death, `respawnTank` places the tank exactly on top of its team's base coordinates, dropping it inside the main tower itself rather than near it. This is disorienting and makes the tower feel like a tiny landing pad instead of a defensible structure. Players should always begin and reappear close to their own main tower, but just outside it, and should be able to tell teammates and enemies apart at a glance by name, not by the literal label `"YOU"`.

## What Changes

- Initial tank spawn (on joining the match) is placed at a randomized point near the player's own team base instead of a random point anywhere on the 3000x1800 map.
- Tank respawn after death is placed at a randomized point near the player's own team base instead of exactly on the base's coordinates, so the tank no longer spawns inside the main tower.
- The name label rendered above each tank in the arena always shows that player's actual display name (with a visual indicator for the local player), replacing the current literal `"YOU"` text shown above the local player's own tank.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `game-backend`: initial tank spawn position and post-death respawn position are both computed as an offset near the owning team's base rather than a map-wide random point (spawn) or the base's exact coordinates (respawn).
- `game-frontend`: the name label rendered above every tank shows the player's actual name at all times, including for the local player's own tank.

## Impact

- `backend/src/rooms/GameRoom.ts`: `onJoin` (initial spawn position) and `resolveRespawns`/`respawnTank` usage (respawn position) change to compute a position near the team's base instead of a map-wide random point or the exact base coordinates.
- `backend/src/rooms/combat.ts`: `respawnTank` changes to accept/apply a near-base offset instead of the exact base coordinates.
- `backend/src/rooms/combat.test.ts`: existing respawn-position assertions updated to reflect the new near-base (not exact-base) respawn location.
- `frontend/src/GameScene.ts`: `upsertTank` name label logic changes to always display `tank.name` (with a "(You)"-style indicator for the local player) instead of the literal `"YOU"` string.
