## Purpose

Defines the Damagedealer's learned rapid-fire ability, temporary fire-rate multiplier, duration, and cooldown.

## Requirements

### Requirement: Rapid Fire Activation
The system SHALL allow a player whose role is Damagedealer to activate their learned rapid-fire special ability, provided it is available and off cooldown, granting a temporary increased fire rate.

#### Scenario: Damagedealer activates rapid fire
- **WHEN** a Damagedealer player activates their learned rapid-fire ability
- **AND** the ability is available and off cooldown
- **THEN** the system increases the Damagedealer's fire rate and starts the ability's cooldown

### Requirement: Rapid Fire Increases Fire Rate
While rapid fire is active, the Damagedealer's weapon SHALL fire more frequently than its base fire rate, by a fixed multiplier, for a fixed duration.

#### Scenario: Damagedealer fires while rapid fire is active
- **WHEN** rapid fire is active
- **AND** the Damagedealer's weapon is ready to fire again
- **THEN** the time between shots reflects the reduced cooldown from the fixed multiplier

#### Scenario: Damagedealer fires after rapid fire expires
- **WHEN** rapid fire has expired
- **THEN** the Damagedealer's weapon reverts to its base fire rate

### Requirement: Rapid Fire Duration and Cooldown
Rapid fire SHALL stop boosting fire rate once its fixed duration elapses, and SHALL be unavailable to reactivate until its cooldown elapses.

#### Scenario: Duration ends
- **WHEN** rapid fire's active duration reaches zero
- **THEN** the Damagedealer's fire rate reverts to base

#### Scenario: Reactivation during cooldown
- **WHEN** a Damagedealer player attempts to activate rapid fire while it is on cooldown
- **THEN** rapid fire does not activate again
