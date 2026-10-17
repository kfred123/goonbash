## Purpose

Defines player tank combat participation, visible health, removal from active play on death, and full-health respawning near the team's base.

## Requirements

### Requirement: Player Tanks Participate in Automatic Combat
Living player-controlled tanks SHALL automatically fire on the nearest valid enemy within range using the shared projectile system when no player-selected target lock is set. A valid player-selected lock SHALL take priority over passive targeting, including when pursuing an out-of-range target. Living player tanks SHALL be valid targets for enemy minions and tanks.

#### Scenario: Player tank auto-fires
- **WHEN** an enemy-team unit is within a living player tank's fire range and the tank has no locked target
- **THEN** the player tank automatically targets and fires visible projectiles at the nearest valid enemy without requiring dedicated fire input

#### Scenario: Player tank is targeted
- **WHEN** a living player tank is the nearest valid enemy within an enemy minion's or an unlocked enemy tank's fire range
- **THEN** that enemy unit targets and fires at the player tank

### Requirement: Player Health Bar
Each living, visible player tank SHALL display a health bar reflecting its current HP relative to maximum HP, visible to all players whose camera viewport includes that tank.

#### Scenario: Tank takes damage
- **WHEN** a player tank's HP decreases due to an enemy projectile hit
- **THEN** the tank's health bar reflects the new HP-to-maxHP ratio on all connected clients where the tank is visible

### Requirement: Player Death on Zero HP
When a player tank's HP reaches zero, the system SHALL remove it from active play in the arena: it stops moving, stops firing, cannot be targeted, and is not rendered as a visible combatant.

#### Scenario: Tank HP reaches zero
- **WHEN** a player tank's HP is reduced to 0 or below by incoming damage
- **THEN** the tank immediately stops responding to movement input, is excluded from all enemy targeting, and disappears from the arena view

### Requirement: Respawn at Team Base
After dying during an ongoing match, a player tank SHALL respawn after a fixed delay with full current maximum HP at a randomized position near its team's main base, outside the base structure and offset from its exact coordinates, as defined by the backend's team-base positioning rules. Role-based stats and progression bonuses SHALL be retained.

#### Scenario: Respawn timer elapses
- **WHEN** the fixed respawn delay has elapsed after a player tank's death during a started match
- **THEN** the tank's HP is restored to its current maximum, its position is reset near its team's main base outside the structure, and it becomes visible, targetable, and controllable again

#### Scenario: Player attempts to move while dead
- **WHEN** a player sends movement input while their tank is dead and awaiting respawn
- **THEN** the input is ignored until the tank has respawned
