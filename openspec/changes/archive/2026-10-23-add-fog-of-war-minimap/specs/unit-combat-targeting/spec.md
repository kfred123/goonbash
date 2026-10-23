## MODIFIED Requirements

### Requirement: Automatic Enemy Targeting
Every combat-capable unit SHALL automatically select the nearest living enemy-team unit or enemy structure within its fire range that is currently visible to its team each tick, without requiring player input to aim. Valid targets SHALL include tanks, minions, lane towers, and main bases. A player tank's valid team-visible locked target SHALL override nearest-enemy selection; without a lock, passive targeting SHALL not cause the tank to chase enemies. Team visibility SHALL be required both for acquisition and for each new shot, and SHALL NOT extend a shooter's firing range.

#### Scenario: Enemy enters range
- **WHEN** a team-visible enemy moves within a unit's fire range, no closer visible enemy is available, and no player-selected target lock overrides selection
- **THEN** the unit sets that enemy as its current target

#### Scenario: No enemy in range
- **WHEN** no valid team-visible enemy is within a unit's fire range
- **THEN** the unit does not fire
- **AND** an unlocked unit has no current target, while a player tank with a valid team-visible out-of-range lock retains the lock and pursues it

#### Scenario: Enemy base within range
- **WHEN** a minion or unlocked player tank comes within fire range of a team-visible enemy base and no closer valid visible enemy is available
- **THEN** the unit selects the enemy base and fires on it, reducing its HP on each hit
- **AND** once the base's HP reaches zero it is no longer selected, remains in the final game state, and ends the match

#### Scenario: Player-selected lock overrides nearest enemy
- **WHEN** a player tank has a valid team-visible locked target and another enemy is closer
- **THEN** it continues pursuing or firing only at its locked target rather than switching to the closer enemy

#### Scenario: Hidden enemy inside firing range
- **WHEN** an enemy is within firing range but outside all allied sight
- **THEN** it is excluded from target selection and no new projectile is fired at it

#### Scenario: Allied observer supplies sight
- **WHEN** an enemy is visible only through an allied observer and is within the shooter's firing range
- **THEN** that enemy is eligible for acquisition and firing

### Requirement: Visible Projectiles
When a unit fires at its currently team-visible target, the system SHALL spawn a projectile entity that travels from the shooter's position toward its target. The server SHALL replicate allied projectiles and only currently team-visible enemy projectiles to each client, clearing references to concealed owners or targets. A client SHALL render allied projectiles within its camera viewport and enemy projectiles only where their current position is visible to its team. Rendering SHALL NOT expose concealed enemy entities through attached trails or target feedback.

#### Scenario: Unit fires
- **WHEN** a unit's fire cooldown reaches zero and it has a valid current team-visible target within range during a started match
- **THEN** the server creates a projectile entity with the shooter's team, originating at the shooter's position and moving toward the target's position, and resets the unit's fire cooldown

#### Scenario: Projectile rendering
- **WHEN** a projectile entity is added to or updated in the replicated game state
- **THEN** the client renders a moving shot within the camera viewport if it belongs to the local team or its current position is team-visible, and removes its presentation once it leaves that eligibility or is removed from state

### Requirement: Projectile Damage Resolution
A projectile SHALL apply its damage to the enemy unit it reaches and then be removed; a projectile SHALL never damage a friendly-team unit. Applicable defensive reductions SHALL be applied before subtracting HP. Losing visibility after launch SHALL NOT cancel an existing projectile, its tracking, or its damage.

#### Scenario: Projectile reaches its target
- **WHEN** a projectile's position reaches or passes the position of the enemy-team unit it was fired at
- **THEN** the server subtracts the projectile's damage after applicable defensive reductions from that unit's HP and removes the projectile from the game state

#### Scenario: Target is destroyed or out of range before impact
- **WHEN** a projectile's designated target has died or is no longer present before the projectile reaches it
- **THEN** the projectile is removed without applying damage to any other unit

#### Scenario: Target enters fog after launch
- **WHEN** an already-fired projectile's living target becomes concealed
- **THEN** the projectile continues its existing tracking and impact resolution without granting vision of the target
