# Spec Delta

## MODIFIED Requirements

### Requirement: Render Lane Towers
The frontend SHALL render each lane tower as a small, team-colored fortified outpost with a visible cannon and a health bar that updates as the tower takes damage. The cannon SHALL rotate to face the tower's current target and SHALL visibly fire when the tower fires. The outpost design SHALL be visually smaller than the main-tower design while sharing its fortified visual style. When the tower is destroyed, the frontend SHALL render a static ruin at its last position until the match ends, without a health bar or active cannon. The ruin SHALL not be targetable or block movement.

#### Scenario: Tower takes damage
- **WHEN** a tower's hit points decrease in a state update
- **THEN** the frontend updates that tower's health bar to reflect the new hit points

#### Scenario: Tower destroyed
- **WHEN** a tower's hit points reach zero
- **THEN** the frontend replaces its outpost and health bar with a static ruin at the tower's last position
- **AND** the ruin remains visible until the match ends without being targetable or blocking movement

#### Scenario: Lane tower appears in the arena
- **WHEN** a lane tower is visible in the camera viewport
- **THEN** it is rendered as a small fortified outpost with a visible cannon and its existing health bar

#### Scenario: Tower tracks a target
- **WHEN** a lane tower has a current enemy target
- **THEN** its cannon rotates to face that target

#### Scenario: Tower fires
- **WHEN** a lane tower fires a projectile
- **THEN** its cannon visibly fires in the projectile's direction

#### Scenario: Destroyed tower cannot function
- **WHEN** a lane tower is represented as a ruin
- **THEN** it has no health bar or active cannon and cannot be selected as an attack target or block movement
