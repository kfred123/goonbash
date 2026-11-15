# Spec Delta

## Purpose

Defines the Tank's placed protection dome, which temporarily reduces incoming damage for allied tanks and minions inside its stationary area.

## ADDED Requirements

### Requirement: Tank Protection Dome Activation
The system SHALL allow a Tank to place its learned Protection Dome at its current position when the ability is off cooldown. The dome SHALL remain at that position for five seconds and have a 180-world-unit radius, even if its owner moves or dies.

#### Scenario: Tank places a learned dome
- **WHEN** a Tank activates its learned Protection Dome while it is off cooldown during a started match
- **THEN** the system creates a stationary dome centered at the Tank's current position
- **AND** the dome remains active for five seconds and starts the ability's cooldown

#### Scenario: Dome is not movable with the Tank
- **WHEN** the Tank moves after placing the dome
- **THEN** the dome remains at its original position until it expires

#### Scenario: Dome persists after its owner dies
- **WHEN** the Tank dies while its Protection Dome is active
- **THEN** the dome remains at its original position until it expires

#### Scenario: Dome activation is unavailable
- **WHEN** a player is not a Tank, has not learned Protection Dome, the match is not started, or the ability is on cooldown
- **THEN** the system does not create a dome or change the ability cooldown

### Requirement: Protection Dome Reduces Allied Damage
The system SHALL reduce incoming damage to living allied tanks and minions within an active dome's radius by 35 percent at ability level 1, increasing by one percentage point per additional level up to 44 percent at level 10. Its reduction SHALL be determined from the ability rank at placement and remain fixed for that dome's duration.

#### Scenario: Allied tank or minion is protected
- **WHEN** a living allied tank or minion takes damage while within the active dome's radius
- **THEN** the system applies the dome's damage reduction for its ability level before subtracting health

#### Scenario: Enemy or structure is outside the protection
- **WHEN** an enemy unit or any structure takes damage while inside a dome
- **THEN** the dome does not reduce that damage

#### Scenario: Unit is outside the dome or the dome expires
- **WHEN** a unit is outside the dome's radius or the dome has expired
- **THEN** the dome does not reduce that unit's damage

#### Scenario: Protection overlaps another defensive effect
- **WHEN** a Tank is protected by a dome while its Shield or Entrench is active, or while multiple domes overlap
- **THEN** the system applies only the greatest applicable damage-reduction percentage once

### Requirement: Protection Dome Cooldown
The Protection Dome SHALL have a base cooldown of 30 seconds. Its cooldown SHALL reduce by 3 percent per ability rank above level 1 and never below 50 percent of its base cooldown.

#### Scenario: Dome cannot be placed during cooldown
- **WHEN** a Tank attempts to place a Protection Dome before its cooldown ends
- **THEN** the system does not create another dome

#### Scenario: Dome expires independently of cooldown
- **WHEN** five seconds have elapsed since dome placement
- **THEN** the dome stops reducing damage even if the ability remains on cooldown
