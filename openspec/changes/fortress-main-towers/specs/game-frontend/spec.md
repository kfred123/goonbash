# Spec Delta

## ADDED Requirements

### Requirement: Render Main Bases as Fortress Keeps
The frontend SHALL render each main base as a large team-colored, crenellated keep with a prominent central cannon turret. The cannon SHALL visibly rotate to face the base's current enemy target and SHALL show a firing effect when the base fires.

#### Scenario: Main base appears in the arena
- **WHEN** a main base is visible in the camera viewport
- **THEN** it is rendered as a fortress keep with a clearly visible central cannon and its existing health bar

#### Scenario: Main base tracks a target
- **WHEN** a main base has a current enemy target
- **THEN** its cannon rotates to face that target

#### Scenario: Main base fires
- **WHEN** a main base fires a projectile
- **THEN** the cannon visibly fires in the projectile's direction
