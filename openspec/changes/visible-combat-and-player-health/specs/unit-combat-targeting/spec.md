## ADDED Requirements

### Requirement: Automatic Enemy Targeting
Every combat-capable unit (minion or player tank) SHALL automatically select the nearest enemy-team unit or enemy base within its fire range as its current target each tick, without requiring player input to aim.

#### Scenario: Enemy enters range
- **WHEN** an enemy-team unit moves within a unit's fire range and no closer enemy is already targeted
- **THEN** the unit sets that enemy as its current target

#### Scenario: No enemy in range
- **WHEN** no enemy-team unit is within a unit's fire range
- **THEN** the unit has no current target and does not fire

#### Scenario: Enemy base within range
- **WHEN** a minion or player tank comes within fire range of the enemy team's base and no closer enemy unit is already targeted
- **THEN** the unit selects the enemy base as its current target and fires on it like any other enemy, reducing the base's HP on each hit
- **AND** once the base's HP reaches zero it is no longer selected as a target, though it remains present in the game state

### Requirement: Friendly Units Do Not Block Targeting or Fire
Targeting and shot resolution SHALL only consider enemy-team units as valid targets or obstructions; friendly-team units SHALL never be selected as a target, never block target selection, and never intercept a friendly projectile in flight.

#### Scenario: Friendly unit stands between shooter and enemy
- **WHEN** a friendly-team unit is positioned directly between a shooter and its selected enemy target
- **THEN** the shooter still targets and hits the enemy, and the friendly unit takes no damage and is not considered when picking the nearest target

#### Scenario: Friendly unit is closer than the enemy
- **WHEN** a friendly-team unit is closer to the shooter than any enemy-team unit
- **THEN** the shooter's target is chosen only among enemy-team units and the friendly unit is never selected

### Requirement: Visible Projectiles
When a unit fires at its target, the system SHALL spawn a visible projectile entity that travels from the shooter's position toward the target's position at fire time, replicated to all clients so players can see who is shooting at whom.

#### Scenario: Unit fires
- **WHEN** a unit's fire cooldown reaches zero and it has a current target
- **THEN** the server creates a projectile entity with the shooter's team, originating at the shooter's position and moving toward the target's position, and resets the unit's fire cooldown

#### Scenario: Projectile rendering
- **WHEN** a projectile entity is added to or updated in the replicated game state
- **THEN** the client renders a visible shot moving from its origin toward its target and removes it once it is removed from the state

### Requirement: Projectile Damage Resolution
A projectile SHALL apply its damage to the enemy unit it reaches and then be removed; a projectile SHALL never damage a friendly-team unit.

#### Scenario: Projectile reaches its target
- **WHEN** a projectile's position reaches (or passes) the position of an enemy-team unit it was fired at
- **THEN** the server subtracts the projectile's damage from that unit's HP and removes the projectile from the game state

#### Scenario: Target is destroyed or out of range before impact
- **WHEN** a projectile's designated target has died or is no longer present before the projectile reaches it
- **THEN** the projectile is removed without applying damage to any other unit
