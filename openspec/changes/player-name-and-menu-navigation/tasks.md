## 1. Shared state

- [ ] 1.1 Add `@type("string") name` to `shared/src/state/Tank.ts` with a sensible default (e.g. `"Player"`)
- [ ] 1.2 Confirm `shared` build/exports pick up the new field (no export list changes expected beyond existing `Tank` export)

## 2. Backend: accept and store player name

- [ ] 2.1 In `backend/src/rooms/GameRoom.ts` `onJoin`, read `options.playerName`, trim it, cap its length, and fall back to `"Player"` when empty
- [ ] 2.2 Set the resolved name on the new `Tank` instance before adding it to `state.tanks`
- [ ] 2.3 Add/extend a test verifying a joining client's name is stored and synchronized on the tank state

## 3. Backend: confirm lobby cleanup on empty

- [ ] 3.1 Add a test in `backend/src/lobbies/LobbyRegistry.test.ts` (or a `GameRoom` test) asserting the lobby is removed after its only player leaves while `phase === "waiting"`
- [ ] 3.2 Add the equivalent test for `phase === "started"`
- [ ] 3.3 Fix `LobbyRegistry`/`GameRoom` `onLeave` only if either test above reveals a gap (current code is expected to already pass)

## 4. Frontend: main menu screen

- [ ] 4.1 Add a `showMainMenu()` state to `GameScene` with a name input (HTML input overlay or Phaser text input) and a `Continue` button
- [ ] 4.2 Read/write the player name from `localStorage` so it persists across browser restarts and pre-fills the field when returning to the main menu
- [ ] 4.3 Validate the trimmed name is non-empty before enabling `Continue`; show a validation message otherwise
- [ ] 4.4 On `Continue`, store the trimmed name and call `showLobbyMenu()`
- [ ] 4.5 Update `create()` in `GameScene` (and `main.ts` if needed) to start on `showMainMenu()` instead of `showLobbyMenu()`

## 5. Frontend: use the player name in lobby flows

- [ ] 5.1 Pass `playerName` in the `joinOrCreate('game_room', { lobbyId, playerName })` options in `connectToLobby`
- [ ] 5.2 Update `showWaitingLobby` to render each tank's `tank.name` instead of the `YOU`/`PLAYER` labels, keeping a `(You)` suffix or highlight for the local session

## 6. Frontend: back-to-main-menu navigation

- [ ] 6.1 Add a `Back to Main Menu` button to `showLobbyMenu()` (available-lobbies screen) that calls `showMainMenu()` directly (no active room to leave)
- [ ] 6.2 Add a `Back to Main Menu` button to `showWaitingLobby()` that calls `this.room.leave()` (consented) before destroying menu elements and calling `showMainMenu()`
- [ ] 6.3 Guard against double-navigation/errors if the room is already disconnected when the button is pressed

## 7. Verification

- [ ] 7.1 Run backend tests (`npm test` in `backend/`) and confirm the new lobby-cleanup and player-name tests pass
- [ ] 7.2 Manually verify: enter name on main menu → see it in the lobby list → create/join a lobby → see own and other players' names in the waiting-lobby roster → back-to-main-menu from both screens → last player leaving deletes the lobby
