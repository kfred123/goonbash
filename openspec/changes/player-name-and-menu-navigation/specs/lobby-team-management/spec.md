## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Restrict lobby management to its creator
The system SHALL designate the first player to join a lobby as its host. Only that host SHALL be authorized to rename the lobby or start the match. If the host leaves or disconnects while other players remain, the system SHALL designate a new host from the remaining participants. The system SHALL delete the lobby once it has no remaining active players, regardless of whether the match is waiting or already started.

#### Scenario: Non-host attempts a host action
- **WHEN** a non-host player requests a lobby rename or match start
- **THEN** the system leaves the lobby name and match phase unchanged

#### Scenario: Host leaves while other players remain
- **WHEN** the host leaves or disconnects and at least one other player is still in the lobby
- **THEN** the system designates one of the remaining players as the new host
- **AND** synchronizes the new host assignment to all lobby participants
- **AND** the new host gains authorization to rename the lobby and start the match

#### Scenario: Last active player leaves a waiting lobby
- **WHEN** the only remaining player in a waiting lobby leaves or disconnects
- **THEN** the system removes the lobby from the active lobby list

#### Scenario: Last active player leaves a started lobby
- **WHEN** the only remaining player in a started lobby leaves or disconnects
- **THEN** the system removes the lobby from the active lobby list
