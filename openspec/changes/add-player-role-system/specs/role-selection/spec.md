## ADDED Requirements

### Requirement: Select a Role in the Lobby
The system SHALL allow every player in a waiting lobby to select one of three roles: Healer, Tank, or Damagedealer.

#### Scenario: Player selects a role
- **WHEN** a player picks the "Healer", "Tank", or "Damagedealer" role card while the lobby is waiting
- **THEN** the system assigns that role to the player
- **AND** synchronizes the updated role to all lobby participants

#### Scenario: Player has not yet chosen a role
- **WHEN** a player joins a waiting lobby and has not picked a role
- **THEN** the system assigns them a default role
- **AND** the player can still change it before the match starts

### Requirement: Change Role Before Match Start
The system SHALL allow a player to change their own role at any time while the lobby is waiting, and SHALL reject role changes for another player, invalid role values, or role changes after the match has started.

#### Scenario: Player switches role while waiting
- **WHEN** a player selects a different valid role while the lobby is waiting
- **THEN** the system updates that player's role
- **AND** synchronizes the change to all lobby participants

#### Scenario: Player attempts to change role after match start
- **WHEN** a player requests a role change after the match has started
- **THEN** the system leaves that player's role unchanged

#### Scenario: Invalid role requested
- **WHEN** a player requests a role value other than Healer, Tank, or Damagedealer
- **THEN** the system leaves that player's role unchanged

### Requirement: Role Determines Spawn Stats
The system SHALL apply role-specific base stats to a player's tank when the match starts or the tank spawns/respawns, based on the player's selected role.

#### Scenario: Tank spawns with role-specific stats
- **WHEN** a player's tank spawns or respawns
- **THEN** its base stats (health, movement, and combat values) reflect the player's currently selected role
