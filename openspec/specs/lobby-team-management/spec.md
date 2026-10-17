## Purpose

Define synchronized player names and team assignments, host-only lobby controls, host succession, and empty-room cleanup.

## Requirements

### Requirement: Assign players to balanced teams
The system SHALL assign every player joining a waiting lobby to either the red or blue team. It SHALL assign the player to the team with fewer members and SHALL assign red when both teams have the same number of members.

#### Scenario: Player joins a team with fewer members
- **WHEN** a player joins a waiting lobby and blue has fewer members than red
- **THEN** the system assigns the player to the blue team
- **AND** synchronizes the assignment to all lobby participants

#### Scenario: Player joins evenly sized teams
- **WHEN** a player joins a waiting lobby and red and blue have equal member counts
- **THEN** the system assigns the player to the red team

### Requirement: Change team before match start
The system SHALL allow every player in a waiting lobby to change their own team between red and blue. It SHALL reject requests for another player's team, invalid team values, and team changes after the match starts.

#### Scenario: Player switches teams while waiting
- **WHEN** a player selects the blue team while the lobby is waiting
- **THEN** the system assigns that player to blue
- **AND** synchronizes the updated roster to all lobby participants

#### Scenario: Player attempts to switch after start
- **WHEN** a player requests a team change after the match has started
- **THEN** the system leaves the team assignments unchanged

### Requirement: Restrict lobby management to its creator
The system SHALL designate the first player to join a lobby as its host. Only that host SHALL be authorized to rename the lobby or start the match, while the lobby is waiting. If the host leaves or disconnects while other players remain, the system SHALL designate a new host from the remaining participants. The system SHALL delete the lobby once it has no remaining active players, whether the match is waiting, started, or ended.

#### Scenario: Non-host attempts a host action
- **WHEN** a non-host player requests a lobby rename or match start
- **THEN** the system leaves the lobby name and match phase unchanged

#### Scenario: Host leaves while other players remain
- **WHEN** the host leaves or disconnects and at least one other player is still in the lobby
- **THEN** the system designates one of the remaining players as the new host
- **AND** synchronizes the new host assignment to all lobby participants
- **AND** the new host gains authorization to rename the lobby and start the match while it is waiting

#### Scenario: Last active player leaves a waiting lobby
- **WHEN** the only remaining player in a waiting lobby leaves or disconnects
- **THEN** the system removes the lobby from the active lobby list

#### Scenario: Last active player leaves a started lobby
- **WHEN** the only remaining player in a started lobby leaves or disconnects
- **THEN** the system removes the lobby from the active lobby list

#### Scenario: Last active player leaves a finished lobby
- **WHEN** the only remaining player leaves an ended match from its result screen or disconnects
- **THEN** the system deletes the empty lobby

### Requirement: Rename a waiting lobby
The system SHALL let the host rename a waiting lobby and SHALL synchronize the accepted name to room participants and the lobby list.

#### Scenario: Host renames the lobby
- **WHEN** the host submits a valid new name while the lobby is waiting
- **THEN** the system updates the lobby name for all participants
- **AND** the lobby list reports the new name

### Requirement: Start the match for all participants
The system SHALL keep a new lobby in a waiting phase until its host starts it. When the host starts the match, the system SHALL transition the room to the started phase for every connected participant and enable gameplay simulation.

#### Scenario: Host starts a lobby
- **WHEN** the host starts a waiting lobby
- **THEN** every connected participant receives the started game state
- **AND** the system begins normal gameplay simulation for the room

### Requirement: Synchronize player name with team assignment
The system SHALL associate each connected player's display name with their team assignment in the synchronized lobby state, so every client can render the roster with names instead of generic labels.

#### Scenario: Player joins with a display name
- **WHEN** a player joins a waiting lobby and supplies a display name
- **THEN** the system stores that name alongside the player's team assignment
- **AND** synchronizes it to all lobby participants

#### Scenario: Player joins without a display name
- **WHEN** a player joins a waiting lobby without supplying a display name
- **THEN** the system assigns a default placeholder name
- **AND** synchronizes it to all lobby participants
