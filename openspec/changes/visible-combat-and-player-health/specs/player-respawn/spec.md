## ADDED Requirements

### Requirement: Player Tanks Participate in Automatic Combat
Player-controlled tanks SHALL automatically fire on enemy units within range using the same automatic targeting and projectile system as other combat-capable units, and SHALL themselves be valid targets that enemy minions and enemy tanks can automatically fire upon.

#### Scenario: Player tank auto-fires
- **WHEN** an enemy-team unit is within a player tank's fire range
- **THEN** the player tank automatically targets and fires visible projectiles at it without requiring a dedicated fire input from the player

#### Scenario: Player tank is targeted
- **WHEN** a player tank is the nearest enemy-team unit within an enemy minion's or enemy tank's fire range
- **THEN** that enemy unit targets and fires at the player tank

### Requirement: Player Health Bar
Each player tank SHALL display a visible health bar reflecting its current HP relative to its maximum HP, visible to all players in the match.

#### Scenario: Tank takes damage
- **WHEN** a player tank's HP decreases due to an enemy projectile hit
- **THEN** the tank's health bar updates to reflect the new HP-to-maxHP ratio for all connected clients

### Requirement: Player Death on Zero HP
When a player tank's HP reaches zero, the system SHALL remove it from active play in the arena: it stops moving, stops firing, cannot be targeted, and is not rendered as a visible combatant.

#### Scenario: Tank HP reaches zero
- **WHEN** a player tank's HP is reduced to 0 or below by incoming damage
- **THEN** the tank immediately stops responding to movement input, is excluded from all enemy targeting, and disappears from the arena view

### Requirement: Respawn at Team Base
After dying, a player tank SHALL respawn after a fixed delay with full HP at the position of their team's main base/tower.

#### Scenario: Respawn timer elapses
- **WHEN** the fixed respawn delay has elapsed after a player tank's death
- **THEN** the tank's HP is restored to its maximum, its position is reset to its team's main base, and it becomes visible, targetable, and controllable again

#### Scenario: Player attempts to move while dead
- **WHEN** a player sends movement input while their tank is dead and awaiting respawn
- **THEN** the input is ignored until the tank has respawned
