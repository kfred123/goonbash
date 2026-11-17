# Spec Delta

## MODIFIED Requirements

### Requirement: Click-to-Move
A living player tank SHALL move toward a point on the game field that the player clicks, provided the click lands on empty ground rather than a unit or structure and no ability target-selection mode is active. Friendly-unit clicks SHALL leave current commands unchanged.

#### Scenario: Player clicks empty ground
- **WHEN** the player left-clicks empty ground that is not occupied by a unit or structure and no ability target-selection mode is active
- **THEN** the tank clears any locked attack target and begins moving in a straight line toward that point at its normal role-specific speed, subject to world bounds

#### Scenario: Tank arrives at the commanded point
- **WHEN** a moving tank reaches its commanded destination point
- **THEN** the tank stops moving and has no move destination or locked attack target, while passive engagement remains available

#### Scenario: Player clicks ground during ability targeting
- **WHEN** the player left-clicks ground while Barricade placement targeting is active
- **THEN** the click is handled only as the Barricade placement point and does not issue a move command
