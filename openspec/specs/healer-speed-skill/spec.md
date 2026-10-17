# healer-speed-skill Specification

## Purpose

Defines the Healer's learned temporary movement-speed skill, including its level scaling, duration, cooldown, and HUD availability.

## Requirements

### Requirement: Healer Speed Skill Activation
The system SHALL allow Healer players to independently learn and activate Speed when it is off cooldown. Speed SHALL use its own ability level, active duration, and cooldown, independent of Heal Aura.

#### Scenario: Successful skill activation
- **WHEN** the Healer player presses the designated ability key for the Speed skill
- **AND** the skill is off cooldown
- **THEN** the Healer's movement speed multiplier is increased according to the skill level
- **AND** the ability goes on cooldown
- **AND** Heal Aura's level, active effect, and cooldown remain unchanged

### Requirement: Speed Skill Level Scaling
The system SHALL scale Speed's movement multiplier from 1 through 10. The multiplier SHALL be 1.15 at level 1 and increase by 0.05 per additional level, up to 1.60 at level 10.

#### Scenario: Level 1 Activation
- **WHEN** the skill is activated at level 1
- **THEN** the movement speed multiplier is set to 1.15

#### Scenario: Level X Activation
- **WHEN** the skill is activated at level X (up to 10)
- **THEN** the movement speed multiplier is set to `1.15 + (X - 1) * 0.05`

### Requirement: Skill Duration Expiration
Speed SHALL last 4 seconds and have an 18-second base cooldown, reduced by 3 percent per rank above level 1 and never below 50 percent of its base cooldown. The system SHALL restore the Healer's base movement speed when the effect expires.

#### Scenario: Duration Ends
- **WHEN** the duration timer for the Speed skill reaches zero
- **THEN** the movement speed multiplier is reset to 1.0

### Requirement: UI Integration
The system SHALL display Speed as the Healer's independently learned secondary ability on the HUD, with its own level, cooldown, and availability.

#### Scenario: HUD Display
- **WHEN** the player spawns as a Healer
- **THEN** the HUD displays an icon for the Speed skill
- **AND** the UI shows the current level, cooldown status, and availability
