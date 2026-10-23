# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic Enemy Targeting
Every combat-capable unit SHALL automatically select the nearest living enemy-team unit or enemy structure within its fire range each tick, without requiring player input to aim. Combat-capable units SHALL include main bases, lane towers, minions, and player tanks. Valid targets SHALL include tanks, minions, lane towers, and main bases. A player tank's valid locked target SHALL override nearest-enemy selection; without a lock, passive targeting SHALL not cause the tank to chase enemies.

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

#### Scenario: Main base selects an enemy
- **WHEN** an enemy unit or structure enters a main base's firing range and no closer valid enemy is available
- **THEN** the main base selects that nearest enemy without player input
