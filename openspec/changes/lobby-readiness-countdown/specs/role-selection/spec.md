# Spec Delta

## MODIFIED Requirements

### Requirement: Select a Role in the Lobby
The system SHALL allow every not-ready player in a waiting lobby to select one of three roles: Healer, Tank, or Damagedealer. A ready player or a player in countdown SHALL NOT be allowed to select another role.

#### Scenario: Player selects a role
- **WHEN** a not-ready player picks the "Healer", "Tank", or "Damagedealer" role card while the lobby is waiting
- **THEN** the system assigns that role to the player
- **AND** synchronizes the updated role to all lobby participants

#### Scenario: Player has not yet chosen a role
- **WHEN** a player joins a waiting lobby and has not picked a role
- **THEN** the system assigns them a default role and not-ready status
- **AND** the player can change it while waiting and not ready

### Requirement: Change Role Before Match Start
The system SHALL allow a player to change their own role only while the lobby is waiting and that player is not ready. It SHALL reject role changes for another player, invalid role values, role changes by ready players, and role changes during countdown or after match start.

#### Scenario: Player switches role while waiting
- **WHEN** a not-ready player selects a different valid role while the lobby is waiting
- **THEN** the system updates that player's role
- **AND** synchronizes the change to all lobby participants

#### Scenario: Player attempts to change role after match start
- **WHEN** a player requests a role change after the match has started
- **THEN** the system leaves that player's role unchanged

#### Scenario: Invalid role requested
- **WHEN** a player requests a role value other than Healer, Tank, or Damagedealer
- **THEN** the system leaves that player's role unchanged

#### Scenario: Ready player attempts a role change
- **WHEN** a ready player requests another role while waiting
- **THEN** the system rejects the request and leaves that player's role unchanged

#### Scenario: Player becomes not ready again
- **WHEN** a ready player becomes not ready while the lobby is waiting and then requests a valid role
- **THEN** the system accepts and synchronizes the role change

#### Scenario: Player attempts a role change during countdown
- **WHEN** any player requests another role during countdown
- **THEN** the system rejects the request and leaves that player's role unchanged
