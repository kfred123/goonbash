## ADDED Requirements

### Requirement: Healer Aura Activation
The system SHALL allow a player whose role is Healer to activate their special ability, provided it is off cooldown, causing a heal-over-time effect centered on the Healer.

#### Scenario: Healer activates the aura
- **WHEN** a Healer player activates their special ability
- **AND** the ability is off cooldown
- **THEN** the system begins healing the Healer and starts the ability's cooldown

### Requirement: Heal Aura Affects Nearby Allies
While active, the Healer Aura SHALL heal the Healer and every allied tank within a fixed radius of the Healer's current position at a fixed rate per second, for a fixed duration.

#### Scenario: Ally within radius is healed
- **WHEN** the Healer Aura is active
- **AND** an allied tank is within the aura's radius of the Healer
- **THEN** that ally's health increases by the aura's heal rate each second, up to its max health

#### Scenario: Ally leaves the radius
- **WHEN** the Healer Aura is active
- **AND** an allied tank moves outside the aura's radius
- **THEN** that ally stops receiving healing from the aura until it re-enters the radius

#### Scenario: Enemy tanks are unaffected
- **WHEN** the Healer Aura is active
- **AND** an enemy tank is within the aura's radius
- **THEN** the enemy tank does not receive healing from the aura

### Requirement: Heal Aura Duration and Cooldown
The Healer Aura SHALL stop healing once its fixed duration elapses, and SHALL be unavailable to reactivate until its cooldown elapses.

#### Scenario: Duration ends
- **WHEN** the Healer Aura's active duration reaches zero
- **THEN** the aura stops healing all affected tanks

#### Scenario: Reactivation during cooldown
- **WHEN** a Healer player attempts to activate the aura while it is on cooldown
- **THEN** the aura does not activate again
