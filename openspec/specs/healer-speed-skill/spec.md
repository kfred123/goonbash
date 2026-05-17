## ADDED Requirements

### Requirement: Healer Speed Skill Activation
The system SHALL allow players with the Healer role to activate the Speed skill, provided they have unlocked it and it is not on cooldown.

#### Scenario: Successful skill activation
- **WHEN** the Healer player presses the designated ability key for the Speed skill
- **AND** the skill is off cooldown
- **THEN** the Healer's movement speed multiplier is increased according to the skill level
- **AND** the ability goes on cooldown

### Requirement: Speed Skill Level Scaling
The system SHALL scale the speed multiplier based on the skill level (1-10).

#### Scenario: Level 1 Activation
- **WHEN** the skill is activated at level 1
- **THEN** the movement speed multiplier is set to 1.10 (10% increase)

#### Scenario: Level X Activation
- **WHEN** the skill is activated at level X (up to 10)
- **THEN** the movement speed multiplier is set to 1.0 + 0.10 + (X - 1) * 0.05

### Requirement: Skill Duration Expiration
The system SHALL revert the movement speed multiplier to its base value when the skill duration expires.

#### Scenario: Duration Ends
- **WHEN** the duration timer for the Speed skill reaches zero
- **THEN** the movement speed multiplier is reset to 1.0

### Requirement: UI Integration
The system SHALL display the Speed skill on the Healer's HUD ability bar.

#### Scenario: HUD Display
- **WHEN** the player spawns as a Healer
- **THEN** the HUD displays an icon for the Speed skill
- **AND** the UI shows the current level, cooldown status, and availability
