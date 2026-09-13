## Context

The frontend is a single Phaser `GameScene` that renders three states by mutating its own display objects: an "available games" lobby list, a waiting-lobby roster, and the started arena. There is no separate main menu, and no client-held player identity — the waiting-lobby roster only distinguishes `sessionId === this.room.sessionId` ("YOU") from everyone else ("PLAYER"). The backend (`GameRoom`, Colyseus) already deletes a lobby via `LobbyRegistry.leave` in `onLeave`, decrementing player count and removing the lobby entry once it hits zero, for both waiting and started lobbies — this behavior already exists and mainly needs verification/tests, not new logic.

## Goals / Non-Goals

**Goals:**
- Add a main-menu step (name entry) that runs before any lobby/network interaction.
- Thread the player's name from the client into the room join options and synchronized state so all clients can render it.
- Replace generic roster labels with real player names in the waiting lobby.
- Add a "Back to Main Menu" action reachable from the lobby list and the waiting lobby that cleanly disconnects and returns to name entry.
- Confirm/lock in lobby auto-deletion once the last active player leaves, with a regression test.

**Non-Goals:**
- No persistent account system, authentication, or server-side name uniqueness/profanity checks.
- No reconnection/rejoin-with-same-identity support beyond what already exists.
- No changes to team-balancing or gameplay simulation logic.

## Decisions

- **Name storage (client)**: Keep the player name in a small in-memory/`sessionStorage`-backed value owned by `GameScene` (or a thin menu controller), not a new global framework. Rationale: the project has no state-management library; a minimal local field is consistent with the existing scene's style and avoids a new dependency. `sessionStorage` (not `localStorage`) is used so a fresh browser tab always re-prompts for a name while a page reload/back-navigation within the same tab keeps it.
- **Main menu implementation**: Implement the main menu as an additional internal state of `GameScene` (a `showMainMenu()` method paralleling `showLobbyMenu()`/`showWaitingLobby()`) rather than a new Phaser `Scene` class. Rationale: the existing lobby list/waiting-lobby/arena states already live in one scene and share `destroyMenuElements()`/`addButton()` helpers; introducing a second Phaser Scene would require scene-transition plumbing and duplicate those helpers for one extra screen with no gameplay/render loop of its own.
- **Name transport**: Send `playerName` as part of the existing `joinOrCreate('game_room', { lobbyId, playerName })` options object. Rationale: Colyseus already exposes `client.options` on join; this avoids adding a new message round-trip before the room state is available.
- **Server-side name field**: Add `@type("string") name` to the `Tank` schema (synchronized per-player entity) rather than a separate map on `GameState`. Rationale: `Tank` is already keyed by `sessionId` and iterated when rendering the roster; colocating `name` avoids a second lookup structure to keep in sync.
- **Name validation**: Trim and cap length (e.g. 20 chars) client-side before enabling the "Continue" action; server trims/falls back to `Player` if empty or missing, mirroring the existing `LobbyRegistry.rename` trim-and-fallback pattern.
- **Back-to-main-menu navigation**: Add an explicit `leave()` call on the Colyseus `Room` (client-initiated, consented) before tearing down menu elements and calling `showMainMenu()`. Rationale: this reuses the existing `onLeave` server cleanup path (including lobby deletion) rather than introducing a second disconnect code path.
- **Lobby deletion confirmation**: No production code change is anticipated for `LobbyRegistry`; add/extend a `GameRoom`/`LobbyRegistry` test asserting the lobby is removed after the only remaining participant leaves, covering both `waiting` and `started` phases, to lock in current behavior as a spec-backed guarantee.

## Risks / Trade-offs

- [Player enters no name / closes the prompt] → Client blocks progression to the lobby menu until a non-empty, trimmed name is provided; no server-side identity depends on the name being unique.
- [Existing in-flight rooms don't have `tank.name` on already-connected clients when this ships] → Not a concern in practice since rooms are ephemeral (in-memory, deleted on empty); no migration needed.
- [Reusing one Phaser Scene for main menu adds branching complexity to `GameScene`] → Mitigated by following the existing `showX()` + `destroyMenuElements()` pattern already used for the other two states, keeping the diff mechanical.
- [`sessionStorage` name is lost on tab close] → Acceptable; matches the non-goal of not persisting identity across sessions.

## Migration Plan

- Additive change with no persisted data to migrate (lobbies and rooms are in-memory and ephemeral).
- Roll out frontend and backend together since the join options/schema change is a coordinated client+server contract; no compatibility shim needed given both are deployed from the same monorepo build.
- Rollback is a plain revert; no data cleanup required.

## Open Questions

- None outstanding; defaults above (20-char cap, `sessionStorage`, fallback name `Player`) are treated as accepted decisions for this change.
