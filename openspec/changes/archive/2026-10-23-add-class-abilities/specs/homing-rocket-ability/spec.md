# Spec Delta

## MODIFIED Requirements

### Requirement: Homing Rocket Firing
The system SHALL allow a Damagedealer to fire a learned Homing Rocket ability at a separately selected enemy target. A target SHALL be a living enemy player, minion, tower, or base within 900 world units of the Damagedealer when the rocket is fired. The server SHALL validate the ability's learned state, cooldown, target identity, target team, target type, and range before firing.

#### Scenario: Firing the ultimate
- **WHEN** a Damagedealer with a learned Homing Rocket selects a living enemy player, minion, tower, or base within 900 world units
- **AND** the rocket is off cooldown
- **THEN** the server fires a rocket at that target
- **AND** starts the rocket's cooldown

#### Scenario: Rocket target is invalid
- **WHEN** the selected target is missing, dead, friendly, unsupported, or more than 900 world units away
- **THEN** the server does not fire a rocket
- **AND** the rocket cooldown does not start

#### Scenario: Rocket is unlearned or cooling down
- **WHEN** the Damagedealer has not learned Homing Rocket or its cooldown has not elapsed
- **THEN** the server does not fire a rocket

### Requirement: Inescapable Tracking
After firing, the Homing Rocket SHALL continuously steer toward its designated target at a maximum travel speed of 450 world units per second and SHALL pursue it regardless of the target moving beyond the firing range.

#### Scenario: Target moves out of line of sight
- **WHEN** the rocket's target changes position while the rocket is in flight
- **THEN** the rocket adjusts its trajectory to continue pursuing that same target

#### Scenario: Rocket impacts its target
- **WHEN** the rocket reaches its designated target
- **THEN** the server applies rocket damage to that target once and removes the rocket

#### Scenario: Target is destroyed during flight
- **WHEN** the rocket's designated target is destroyed or otherwise ceases to be a valid living target before impact
- **THEN** the server removes the rocket without applying damage to another entity

### Requirement: Rocket Damage Scaling
The Homing Rocket SHALL deal damage based on the Damagedealer's current role- and progression-adjusted fire damage at launch. The multiplier SHALL be 3.0 at ability level 1 and increase by 0.25 per additional ability level, reaching 5.25 at level 10.

#### Scenario: Rocket hits target
- **WHEN** a Homing Rocket hits its designated target
- **THEN** it deals damage equal to the firing Damagedealer's fire damage at launch multiplied by `3.0 + 0.25 * (ability level - 1)`

#### Scenario: Shooter's damage progression is included
- **WHEN** a Damagedealer has fire-damage bonuses from player progression
- **THEN** the rocket's launch damage is calculated from that increased fire damage

### Requirement: Rocket Cooldown
The Homing Rocket SHALL have a base cooldown of 20 seconds, beginning only when a valid rocket is fired. Its cooldown SHALL reduce by 3 percent per ability rank above level 1 and never below 50 percent of its base cooldown.

#### Scenario: Attempting to fire during cooldown
- **WHEN** the Damagedealer attempts to fire while the Homing Rocket is on cooldown
- **THEN** no rocket is fired and the HUD continues to show the remaining cooldown

#### Scenario: Selecting a target does not start cooldown
- **WHEN** the Damagedealer enters target-selection mode but does not fire at a valid target
- **THEN** the rocket remains off cooldown
