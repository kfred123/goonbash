## Purpose

Define team assignment and host-managed controls while a multiplayer lobby is waiting.

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
The system SHALL designate the first player to join a lobby as its host. Only that host SHALL be authorized to rename the lobby or start the match.

#### Scenario: Non-host attempts a host action
- **WHEN** a non-host player requests a lobby rename or match start
- **THEN** the system leaves the lobby name and match phase unchanged

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
