## MODIFIED Requirements

### Requirement: Wait for players in a lobby
The client SHALL show a waiting state after creating or joining a lobby until the host starts the game. The waiting state SHALL show every participant's red or blue team alongside their player name, and controls for the local player to select either team. It SHALL show the lobby name and, only to the host, controls to rename the game and start it.

#### Scenario: Additional player joins
- **WHEN** another player joins the waiting lobby
- **THEN** the player count and team roster update for all clients in that lobby
- **AND** the new participant's name is shown next to their team

#### Scenario: Player changes team
- **WHEN** the local player selects the other team in the waiting state
- **THEN** the client sends the team-change request
- **AND** displays the synchronized team roster, including each participant's name, returned by the server

#### Scenario: Host manages the waiting lobby
- **WHEN** the local player is the lobby host
- **THEN** the client shows rename and start controls
- **AND** it hides those controls from non-host players

#### Scenario: Host starts the game
- **WHEN** the server synchronizes that the waiting lobby has started
- **THEN** the client removes the waiting-lobby controls
- **AND** displays the gameplay state

## ADDED Requirements

### Requirement: Return to the main menu from the lobby menu
The client SHALL provide a `Back to Main Menu` action from both the available-lobbies screen and the waiting-lobby screen that disconnects the player from any active room and returns to the main menu.

#### Scenario: Player backs out from the available-lobbies screen
- **WHEN** the player activates `Back to Main Menu` while viewing the available-lobbies screen
- **THEN** the client navigates to the main menu
- **AND** no room connection is left open

#### Scenario: Player backs out from the waiting lobby
- **WHEN** the player activates `Back to Main Menu` while in the waiting-lobby screen
- **THEN** the client disconnects from the lobby's room
- **AND** it navigates to the main menu
- **AND** the lobby's player count is decremented as a result of the disconnect
