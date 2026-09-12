## MODIFIED Requirements

### Requirement: Wait for players in a lobby
The client SHALL show a waiting state after creating or joining a lobby until the host starts the game. The waiting state SHALL show every participant's red or blue team and controls for the local player to select either team. It SHALL show the lobby name and, only to the host, controls to rename the game and start it.

#### Scenario: Additional player joins
- **WHEN** another player joins the waiting lobby
- **THEN** the player count and team roster update for all clients in that lobby

#### Scenario: Player changes team
- **WHEN** the local player selects the other team in the waiting state
- **THEN** the client sends the team-change request
- **AND** displays the synchronized team roster returned by the server

#### Scenario: Host manages the waiting lobby
- **WHEN** the local player is the lobby host
- **THEN** the client shows rename and start controls
- **AND** it hides those controls from non-host players

#### Scenario: Host starts the game
- **WHEN** the server synchronizes that the waiting lobby has started
- **THEN** the client removes the waiting-lobby controls
- **AND** displays the gameplay state
