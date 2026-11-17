# Proposal

## Why

Hosts can currently start immediately, even while participants are choosing teams and roles, and game names are assigned implicitly and renamed later. A clearer team lobby with explicit readiness and a shared, cancellable countdown makes match preparation predictable for every participant.

## What Changes

- Require a valid game name during creation; display the accepted name consistently in the browser and waiting lobby.
- **BREAKING**: Remove post-creation renaming, including host controls and server support. Creation without a valid name no longer falls back to `New Game`.
- Present Team Red and Team Blue as two clearly separated rosters with player names, selected roles, and green checkmarks for ready players.
- Let each participant, including the host, toggle readiness while waiting. Ready players cannot change team or role until they become not ready again.
- Enable host start only when every current participant is ready; enforce the same rule on the server.
- Replace immediate start with a server-authoritative five-second countdown visible to everyone. Lock all lobby configuration and readiness changes and reject new joins during the countdown.
- Cancel the countdown if any participant leaves or disconnects, return to waiting, and require another explicit host start. Preserve remaining players' readiness and existing host succession.

## Capabilities

### New Capabilities

None. Readiness and countdown extend the existing lobby capability.

### Modified Capabilities

- `client-lobby-menu`: Named creation, separated team panels, readiness presentation and controls, gated start, and countdown/cancellation UI without rename controls.
- `lobby-team-management`: Immutable creation-time names, synchronized readiness, ready-player team locking, all-ready host start, countdown lifecycle, and countdown join restrictions.
- `role-selection`: Allow role selection and changes only while waiting and not ready.

## Impact

Affected surfaces include the Phaser lobby UI in `frontend/src/GameScene.ts`, HTTP lobby creation in `backend/src/index.ts`, `LobbyRegistry`, `GameRoom` message and lifecycle handlers, and shared lobby/schema types. The custom `VisibilitySerializer` must retain complete lobby rosters and replicate readiness/countdown metadata during both waiting and countdown without exposing gameplay coordinates. Existing lobby, role, registry, replication, and UI tests and directly related documentation need updating. No new runtime dependency is expected; gameplay and post-start join policy remain otherwise unchanged.
