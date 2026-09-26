## ADDED Requirements

### Requirement: Tank Shield Activation
The system SHALL allow a player whose role is Tank to activate their special ability, provided it is off cooldown, granting the Tank a temporary damage-reduction shield.

#### Scenario: Tank activates the shield
- **WHEN** a Tank player activates their special ability
- **AND** the ability is off cooldown
- **THEN** the system grants the Tank a damage-reduction shield and starts the ability's cooldown

### Requirement: Shield Reduces Incoming Damage
While the shield is active, the Tank SHALL take reduced damage from incoming attacks, by a fixed reduction percentage, for a fixed duration.

#### Scenario: Tank takes damage while shield is active
- **WHEN** the Tank's shield is active
- **AND** the Tank takes damage from an attack
- **THEN** the applied damage is reduced by the shield's fixed reduction percentage before being subtracted from health

#### Scenario: Tank takes damage after shield expires
- **WHEN** the Tank's shield has expired
- **AND** the Tank takes damage from an attack
- **THEN** the full, unreduced damage is applied

### Requirement: Shield Duration and Cooldown
The Tank's shield SHALL stop reducing damage once its fixed duration elapses, and SHALL be unavailable to reactivate until its cooldown elapses.

#### Scenario: Duration ends
- **WHEN** the shield's active duration reaches zero
- **THEN** the Tank no longer receives damage reduction from that activation

#### Scenario: Reactivation during cooldown
- **WHEN** a Tank player attempts to activate the shield while it is on cooldown
- **THEN** the shield does not activate again
