# Proposal

## Why

Adding a computer player currently replaces the lobby with a separate setup screen, and bot rows only expose a small removal marker. Team-local controls and a compact popup will make adding, moving, and removing bots understandable without losing sight of the rosters.

## What Changes

- Replace the global `ADD BOT` entry and full-screen setup with a `Hinzufuegen` action in each of the red and blue team lists.
- Open a small popup over the waiting lobby to select easy, medium, or hard difficulty and confirm adding a bot to the originating team. Preserve the existing role choice in a compact form.
- Show explicit `Team wechseln` and `Entfernen` buttons after each computer player's roster details.
- Add an authoritative host-only request to move an existing bot to the opposite team while preserving its identity, role, difficulty, and readiness.
- Preserve host-only management, lobby capacity, countdown restrictions, synchronized roster updates, and visible rejection messages.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `client-lobby-menu`: Team-local bot creation popup and discoverable per-bot team-switch/removal actions.
- `lobby-team-management`: Host-authorized bot team changes, distinct from human self-service team changes.

## Impact

- Frontend: `frontend/src/GameScene.ts` waiting-lobby rendering and popup lifecycle, plus `frontend/src/lobbyPresentation.ts` and its tests.
- Backend: `backend/src/rooms/GameRoom.ts` bot management handlers and existing lobby lifecycle tests; reuse existing lobby errors and synchronized participant state.
- Protocol: add a bot team-change message; keep existing `add_bot` and `remove_bot` requests compatible.
- Specifications: this builds on the implemented but not yet archived `add-team-ai-players` change; its bot creation/removal, capacity, and host-authority behavior remains unchanged.
- No new dependencies, bot AI changes, or changes to human team/role controls.
