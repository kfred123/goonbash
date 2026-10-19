# Spec Delta

## ADDED Requirements

### Requirement: Grass Penalty Applies After Healer Speed
The system SHALL calculate the Healer's movement speed from its base speed and active Speed skill multiplier before applying the grass movement penalty. When the Healer moves over grass, the final speed SHALL be 50% of that skill-adjusted speed.

#### Scenario: Healer Speed skill active on grass
- **WHEN** a Healer moves over grass while its Speed skill is active
- **THEN** the system first applies the skill's level-based multiplier to the Healer's base movement speed
- **AND** then applies the 50% grass penalty to the resulting speed

#### Scenario: Healer Speed skill active on stone
- **WHEN** a Healer moves over stone while its Speed skill is active
- **THEN** the system applies the skill's level-based multiplier to the Healer's base movement speed without a terrain penalty
