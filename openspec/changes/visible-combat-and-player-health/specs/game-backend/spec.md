## MODIFIED Requirements

### Requirement: Authoritative Game Loop
The backend SHALL run a fixed time-step game loop that processes player inputs, updates entity positions based on velocity and physics, computes combat interactions, and resolves automatic targeting, projectile movement, damage, and player death/respawn.

#### Scenario: Processing movement
- **WHEN** the game loop ticks
- **THEN** the server applies all queued movement commands and computes the new absolute position of each tank

#### Scenario: Resolving combat
- **WHEN** the game loop ticks
- **THEN** the server updates automatic target selection for every combat-capable unit, advances in-flight projectiles, applies projectile damage on impact, and processes any player deaths or pending respawns that occurred that tick

### Requirement: Manage Minion AI
The backend SHALL handle the spawning and automated movement/targeting logic of the minions, including automatically engaging enemy units in combat while advancing toward their waypoint.

#### Scenario: Minion spawning
- **WHEN** the spawn timer reaches zero
- **THEN** the server spawns a new wave of minions at each base and sets their initial waypoints

#### Scenario: Minion encounters an enemy
- **WHEN** a minion has an enemy-team unit within its fire range
- **THEN** the minion targets and fires at that enemy while continuing to move toward its waypoint
