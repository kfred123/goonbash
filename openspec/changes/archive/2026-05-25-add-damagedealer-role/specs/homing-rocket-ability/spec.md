## ADDED Requirements

### Requirement: Homing Rocket Firing
The system SHALL allow Damagedealer players to fire a Homing Rocket ultimate ability.

#### Scenario: Firing the ultimate
- **WHEN** the Damagedealer player triggers their ultimate ability and it is off cooldown
- **THEN** the system finds the closest valid enemy target in the direction the player is aiming and spawns a Homing Rocket targeting that entity

### Requirement: Inescapable Tracking
The Homing Rocket SHALL continuously steer towards its designated target until impact.

#### Scenario: Target moves out of line of sight
- **WHEN** the rocket's target moves to a new position
- **THEN** the rocket smoothly adjusts its velocity to intercept the target

### Requirement: Rocket Damage Scaling
The Homing Rocket SHALL deal damage that scales proportionally to the Damagedealer's base damage (percentage based multiplier) so that damage continues scaling as the player's level (and base damage) increases.

#### Scenario: Rocket hits target
- **WHEN** the rocket collides with its target
- **THEN** it deals damage equal to a multiple of the Damagedealer's base damage, where the multiplier increases with the Rocket's skill level (e.g. 250% at skill level 1, up to 700% at skill level 10).

### Requirement: Rocket Cooldown
The Homing Rocket SHALL have a long cooldown period before it can be fired again.

#### Scenario: Attempting to fire during cooldown
- **WHEN** the Damagedealer attempts to fire the ultimate while it is on cooldown
- **THEN** the rocket is not fired and the player is notified of the remaining cooldown time
