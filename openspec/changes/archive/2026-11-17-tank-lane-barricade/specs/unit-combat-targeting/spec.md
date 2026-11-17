# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic Enemy Targeting
Every combat-capable unit SHALL automatically select the nearest living enemy-team unit or enemy structure within its fire range that is currently visible to its team each tick, without requiring player input to aim. Combat-capable units SHALL include main bases, lane towers, minions, and player tanks. Valid targets SHALL include tanks, minions, lane towers, main bases, and enemy barricades. A player tank's valid team-visible locked target SHALL override nearest-enemy selection; without a lock, passive targeting SHALL not cause the tank to chase enemies. Team visibility SHALL be required both for acquisition and for each new shot, and SHALL NOT extend a shooter's firing range.

#### Scenario: Enemy enters range
- **WHEN** a team-visible enemy moves within a unit's fire range, no closer visible enemy is available, and no player-selected target lock overrides selection
- **THEN** the unit sets that enemy as its current target

#### Scenario: No enemy in range
- **WHEN** no valid team-visible enemy is within a unit's fire range
- **THEN** the unit does not fire
- **AND** an unlocked unit has no current target, while a player tank with a valid team-visible out-of-range lock retains the lock and pursues it

#### Scenario: Enemy base within range
- **WHEN** a minion or unlocked player tank comes within fire range of a team-visible enemy base and no closer valid visible enemy is available
- **THEN** the minion or tank selects the enemy base and fires on it, reducing its HP on each hit
- **AND** once the base's HP reaches zero it is no longer selected, remains in the final game state, and ends the match

#### Scenario: Enemy barricade within range
- **WHEN** a team-visible enemy barricade is within fire range and is the nearest valid target
- **THEN** the unit selects the barricade and fires on it, reducing its HP on each hit

#### Scenario: Player-selected lock overrides nearest enemy
- **WHEN** a player tank has a valid team-visible locked target and another enemy is closer
- **THEN** it continues pursuing or firing only at its locked target rather than switching to the closer enemy

#### Scenario: Main base selects an enemy
- **WHEN** a team-visible enemy unit or structure enters a main base's firing range and no closer valid visible enemy is available
- **THEN** the main base selects that nearest enemy without player input

#### Scenario: Hidden enemy inside firing range
- **WHEN** an enemy is within firing range but outside all allied sight
- **THEN** it is excluded from target selection and no new projectile is fired at it

#### Scenario: Allied observer supplies sight
- **WHEN** an enemy is visible only through an allied observer and is within the shooter's firing range
- **THEN** that enemy is eligible for acquisition and firing

## ADDED Requirements

### Requirement: Barricade Attack Damage
Projectile damage from an opposing unit's normal attack SHALL reduce the targeted barricade's health, and a barricade SHALL NOT intercept a projectile aimed at another target.

#### Scenario: Projectile reaches a barricade
- **WHEN** an opposing unit's projectile reaches its designated barricade target
- **THEN** the projectile's damage is applied to the barricade and the projectile is removed

#### Scenario: Projectile crosses a barricade on its way to another target
- **WHEN** a projectile is traveling toward a different target and crosses a barricade
- **THEN** the projectile continues to its designated target without damaging the barricade
