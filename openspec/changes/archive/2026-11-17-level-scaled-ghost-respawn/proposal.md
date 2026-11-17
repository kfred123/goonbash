# Proposal

## Why

Dead players currently disappear for a fixed three-second delay, leaving no in-world indication of where or when they will return. A translucent preview near the team's main tower makes the return location clear, while a level-scaled wait makes death more consequential as a player progresses.

## What Changes

- Immediately relocate a dead player's tank to a randomized valid position near its own main tower and display it at 50% opacity to its owner and teammates only. Enemies never see the preview.
- Keep the preview outside active gameplay: no movement, attacks, ability use, targeting, damage, healing, or vision contribution.
- Replace the fixed delay with `level at death * 2 seconds`, calculated once by the server for each death.
- Show a live countdown above the preview only to its owner.
- On expiry during an ongoing match, restore full current maximum HP, normal opacity, and normal control at the preview's position without another relocation. Preserve role and progression.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `player-respawn`: Replace disappearing tanks and the fixed delay with an allied-only translucent respawn preview, a level-scaled authoritative deadline, and an owner-only overhead countdown.

## Impact

- Backend: death and respawn transitions in `backend/src/rooms/GameRoom.ts`, positioning/timing helpers and tests in `backend/src/rooms/combat.ts`, and per-client projection in `backend/src/rooms/VisibilitySerializer.ts`.
- Shared state: reuse `Tank.state` and `Tank.respawnAt`; no additional life-state value or external dependency is expected.
- Frontend: tank rendering, visibility application, camera/interpolation behavior, countdown lifecycle, and input gating in `frontend/src/GameScene.ts` and associated presentation helpers/tests.
- Preserve existing death-position kill-XP accounting, enemy concealment, dead-player action guards, full-health restoration, and match-end simulation freeze.
