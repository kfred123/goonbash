## Purpose

Defines automatic enemy selection, player target-lock priority, friendly-unit exclusion, and replicated projectile damage resolution.

## Requirements

### Requirement: Automatic Enemy Targeting
Every combat-capable unit SHALL automatically select the nearest living enemy-team unit or enemy structure within its fire range each tick, without requiring player input to aim. Valid targets SHALL include tanks, minions, lane towers, and main bases. A player tank's valid locked target SHALL override nearest-enemy selection; without a lock, passive targeting SHALL not cause the tank to chase enemies.

#### Scenario: Enemy enters range
- **WHEN** an enemy-team unit moves within a unit's fire range, no closer enemy is available, and no player-selected target lock overrides selection
- **THEN** the unit sets that enemy as its current target

#### Scenario: No enemy in range
- **WHEN** no valid enemy is within a unit's fire range
- **THEN** the unit does not fire
- **AND** an unlocked unit has no current target, while a player tank with a valid out-of-range lock retains the lock and pursues it

#### Scenario: Enemy base within range
- **WHEN** a minion or unlocked player tank comes within fire range of the enemy base and no closer valid enemy is available
- **THEN** the unit selects the enemy base and fires on it, reducing its HP on each hit
- **AND** once the base's HP reaches zero it is no longer selected, remains in the final game state, and ends the match

#### Scenario: Player-selected lock overrides nearest enemy
- **WHEN** a player tank has a valid locked target and another enemy is closer
- **THEN** it continues pursuing or firing only at its locked target rather than switching to the closer enemy

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
- **WHEN** a unit's fire cooldown reaches zero and it has a valid current target within range during a started match
- **THEN** the server creates a projectile entity with the shooter's team, originating at the shooter's position and moving toward the target's position, and resets the unit's fire cooldown

#### Scenario: Projectile rendering
- **WHEN** a projectile entity is added to or updated in the replicated game state
- **THEN** the client renders a visible shot moving from its origin toward its target when within the camera viewport and removes it once it is removed from the state

### Requirement: Projectile Damage Resolution
A projectile SHALL apply its damage to the enemy unit it reaches and then be removed; a projectile SHALL never damage a friendly-team unit. Applicable defensive reductions SHALL be applied before subtracting HP.

#### Scenario: Projectile reaches its target
- **WHEN** a projectile's position reaches or passes the position of the enemy-team unit it was fired at
- **THEN** the server subtracts the projectile's damage after applicable defensive reductions from that unit's HP and removes the projectile from the game state

#### Scenario: Target is destroyed or out of range before impact
- **WHEN** a projectile's designated target has died or is no longer present before the projectile reaches it
- **THEN** the projectile is removed without applying damage to any other unit
