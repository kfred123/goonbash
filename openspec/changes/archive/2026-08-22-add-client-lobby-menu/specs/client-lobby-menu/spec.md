## ADDED Requirements

### Requirement: Display lobby menu
The client SHALL show a main multiplayer menu before connecting to a game room, including a list of available lobbies and a visible action to create a game.

#### Scenario: Player opens the multiplayer client
- **WHEN** the client finishes loading
- **THEN** it displays the lobby menu instead of joining a game room automatically
- **AND** the menu shows the available lobby list and a `Create Game` action

### Requirement: List available lobbies
The client SHALL retrieve and display active joinable lobbies with an identifier or name and their current and maximum player counts.

#### Scenario: Player refreshes the lobby list
- **WHEN** the lobby menu is opened or refreshed
- **THEN** the client requests the active lobbies from the backend
- **AND** each returned lobby is displayed with its player count and a join action

#### Scenario: No lobbies are available
- **WHEN** the backend returns an empty lobby list
- **THEN** the client displays an explicit empty-state message
- **AND** the create-game action remains available

### Requirement: Create a game lobby
The client SHALL allow a player to create a new lobby and enter its waiting state.

#### Scenario: Player creates a game
- **WHEN** the player activates `Create Game`
- **THEN** the backend creates a new lobby and room
- **AND** the client joins that room
- **AND** the client displays the waiting lobby with the current player count

### Requirement: Join an existing lobby
The client SHALL allow a player to select an available lobby and join it.

#### Scenario: Player joins a listed lobby
- **WHEN** the player activates the join action for an available lobby
- **THEN** the client connects to the selected room
- **AND** the client displays the waiting lobby or game state for that room

#### Scenario: Selected lobby is unavailable
- **WHEN** the selected lobby no longer exists or is full
- **THEN** the client remains in the lobby menu
- **AND** it displays an actionable error
- **AND** it can refresh the lobby list

### Requirement: Wait for players in a lobby
The client SHALL show a waiting state after creating or joining a lobby until the game is ready to start.

#### Scenario: Additional player joins
- **WHEN** another player joins the waiting lobby
- **THEN** the player count updates for all clients in that lobby

### Requirement: Handle lobby service errors
The client SHALL display a clear status when the lobby backend cannot be reached or returns an error.

#### Scenario: Lobby request fails
- **WHEN** loading, creating, or joining a lobby fails due to a network or server error
- **THEN** the client displays the failure in the lobby UI
- **AND** the player can retry or return to the lobby list