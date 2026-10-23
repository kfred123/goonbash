# Spec Delta

## MODIFIED Requirements

### Requirement: Healer Speed Skill Activation
The system SHALL allow players with the Healer role to activate the Speed skill, provided they have learned it and it is not on cooldown. Speed SHALL have its own level, active duration, and cooldown independent of Heal Aura.

#### Scenario: Successful skill activation
- **WHEN** the Healer player activates the learned Speed skill
- **AND** the skill is off cooldown
- **THEN** the Healer's movement speed multiplier increases according to the skill level
- **AND** the ability goes on cooldown
- **AND** the Heal Aura's level, active effect, and cooldown remain unchanged

### Requirement: Speed Skill Level Scaling
The system SHALL scale the Speed skill's multiplier by level from 1 through 10. The multiplier SHALL be 1.15 at level 1 and increase by 0.05 per additional level, up to 1.60 at level 10.

#### Scenario: Level 1 Activation
- **WHEN** the skill is activated at level 1
- **THEN** the movement speed multiplier is set to 1.15

#### Scenario: Level X Activation
- **WHEN** the skill is activated at level X (up to 10)
- **THEN** the movement speed multiplier is set to `1.15 + (X - 1) * 0.05`

### Requirement: Skill Duration Expiration
The system SHALL revert the Healer's movement speed multiplier to its base value when the Speed skill's 4-second duration expires. Speed SHALL have an 18-second base cooldown, independent of Heal Aura, reduced by 3 percent per rank above level 1 and never below 50 percent of its base cooldown.

#### Scenario: Duration Ends
- **WHEN** the duration timer for the Speed skill reaches zero
- **THEN** the movement speed multiplier is reset to 1.0

#### Scenario: Speed cannot be reactivated during cooldown
- **WHEN** the Healer attempts to activate the learned Speed skill before its cooldown ends
- **THEN** Speed does not activate

#### Scenario: Speed cooldown is independent of Heal Aura
- **WHEN** Speed is activated or its cooldown changes
- **THEN** Heal Aura's cooldown and activation availability are unchanged

#### Scenario: Unlearned Speed is not activated
- **WHEN** the Healer attempts to activate an unlearned Speed skill
- **THEN** the system does not apply the movement-speed boost or start its cooldown
