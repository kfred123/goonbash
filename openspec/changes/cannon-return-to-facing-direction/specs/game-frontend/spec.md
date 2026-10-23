# Spec Delta

## ADDED Requirements

### Requirement: Player Tank Cannon Returns to Facing Direction
The frontend SHALL rotate a player tank's cannon to face its current valid unit in attack focus. When the tank has no valid unit in attack focus, the cannon SHALL return to face the tank's current facing direction.

#### Scenario: Tank has a unit in attack focus
- **WHEN** a player tank has a valid unit in attack focus
- **THEN** its cannon faces that unit

#### Scenario: Tank has no unit in attack focus
- **WHEN** a player tank has no valid unit in attack focus
- **THEN** its cannon faces the same direction as the tank

#### Scenario: Attack focus is lost
- **WHEN** a player tank's unit in attack focus becomes invalid or unavailable
- **THEN** its cannon returns to the tank's current facing direction
