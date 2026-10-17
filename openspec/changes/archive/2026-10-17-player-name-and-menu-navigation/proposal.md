## Why

Players currently jump straight into an anonymous lobby list with no way to identify themselves, and the client has no top-level "main menu" separate from the lobby flow. Other players in a waiting lobby only ever see generic `YOU` / `PLAYER` labels, and there is no way to leave the lobby screens back to a starting point. This makes multiplayer sessions feel impersonal and gives players no way to back out of the multiplayer flow once they've entered it.

## What Changes

- Add a new main menu screen that is shown first, where the player enters a display name before doing anything else.
- Persist the entered name durably in the browser and require a non-empty name before the player can proceed to the lobby menu.
- Pass the player's name to the backend when creating or joining a lobby room, and replace the generic `YOU` / `PLAYER` roster labels in the waiting lobby with each participant's actual name.
- Add a "Back to Main Menu" action in the lobby menu (available lobbies screen and the waiting-lobby roster screen) that disconnects the player from any active room and returns them to the main menu name entry screen.
- Confirm/harden that a lobby is deleted once its last active player leaves or disconnects, whether the lobby is waiting or already started.
- Automatically hand off host privileges to another remaining participant when the current host leaves or disconnects while the lobby still has players.

## Capabilities

### New Capabilities
- `client-main-menu`: The player-name entry screen shown before the lobby menu, including validation and navigation into the lobby menu.

### Modified Capabilities
- `client-lobby-menu`: Displays each participant's player name instead of generic labels, and adds a "Back to Main Menu" action that returns to the main menu.
- `lobby-team-management`: Requires the player's name to be included in the synchronized lobby roster, clarifies that a lobby SHALL be removed once it has no remaining active players (covering both waiting and started lobbies), and requires host reassignment when the current host leaves while other players remain.

## Impact

- `frontend/src/GameScene.ts`: add a main-menu scene/state for name entry, thread the player name through lobby creation/joining, render player names in the waiting-lobby roster, and add back-to-main-menu navigation.
- `frontend/src/main.ts`: wire up the new main menu as the initial scene/state.
- `shared/src/state/Tank.ts` and `shared/src/state/GameState.ts`: add a synchronized player name field.
- `backend/src/rooms/GameRoom.ts`: accept and store the player name on join, keep existing lobby-cleanup-on-leave behavior working for both waiting and started lobbies, and reassign `hostSessionId` on host departure.
- `backend/src/lobbies/LobbyRegistry.ts`: no structural change expected; verified against the lobby-deletion requirement.
