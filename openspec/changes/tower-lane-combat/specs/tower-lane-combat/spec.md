## ADDED Requirements

### Requirement: Main Towers
Each team SHALL have exactly one Main Tower (left team and right team) that serves as the mob spawn point and as a destructible structure with its own health pool.

#### Scenario: Tower has health
- **WHEN** a match starts
- **THEN** each team's Main Tower is created with `hp` equal to its configured `maxHp`

#### Scenario: Tower destruction
- **WHEN** a Main Tower's `hp` reaches 0
- **THEN** the tower is marked as destroyed and no longer spawns mobs or acts as a valid movement target

### Requirement: Three-Lane Mob Spawning
Every configured spawn interval, each team's Main Tower SHALL spawn one mob per lane (top, mid, bottom), and each spawned mob SHALL follow that lane's waypoint path toward the enemy Main Tower.

#### Scenario: Periodic spawn
- **WHEN** the spawn timer reaches the configured spawn interval (default 15 seconds)
- **THEN** each team's Main Tower spawns exactly one mob on each of the three lanes (three mobs per tower, six mobs total)

#### Scenario: Lane assignment
- **WHEN** a mob is spawned on a given lane
- **THEN** the mob is assigned that lane's ordered waypoint path leading toward the enemy Main Tower

### Requirement: Mob Movement Along Lane
A mob not currently engaged in combat SHALL move along its assigned lane's waypoints toward the enemy Main Tower.

#### Scenario: Advancing toward next waypoint
- **WHEN** a mob has no current target and has not reached its lane's final waypoint
- **THEN** the mob moves toward its next waypoint at its configured speed

#### Scenario: Reaching the enemy tower
- **WHEN** a mob reaches the final waypoint of its lane (the enemy Main Tower's position)
- **THEN** the mob stops advancing and begins attacking the enemy Main Tower

### Requirement: Nearest-Enemy Auto-Targeting
While moving or idle, a mob SHALL continuously scan for enemy units (mobs, towers, or players) within its configured attack range and, if any exist, select the closest one as its current target.

#### Scenario: Enemy enters range
- **WHEN** at least one enemy unit is within a mob's attack range
- **THEN** the mob stops moving and sets its target to the closest such enemy unit

#### Scenario: Re-evaluating closest target each tick
- **WHEN** a mob already has a target and a different enemy unit is now closer and still within range
- **THEN** the mob switches its target to the closer enemy unit

#### Scenario: No enemies in range
- **WHEN** no enemy unit is within a mob's attack range
- **THEN** the mob has no target and resumes moving along its lane waypoints

### Requirement: Combat and Health Resolution
Every unit capable of participating in combat (mobs and towers) SHALL have a health pool; while a mob is attacking a target, it SHALL apply its configured damage over time to that target, and a unit whose health reaches 0 SHALL be removed (mobs) or destroyed (towers).

#### Scenario: Mob takes damage
- **WHEN** an attacking unit's target is within range and combat is active
- **THEN** the target's `hp` decreases based on the attacker's configured damage rate each simulation tick

#### Scenario: Mob death
- **WHEN** a mob's `hp` reaches 0
- **THEN** the mob is removed from the game state and no longer participates in movement, targeting, or combat

#### Scenario: Target lost when it dies or leaves range
- **WHEN** a mob's current target dies or moves outside attack range
- **THEN** the mob clears its target and re-evaluates the nearest remaining enemy unit in range

### Requirement: Resume Path After Combat
Once a mob has no valid target within range, it SHALL resume moving toward the next waypoint on its original lane path rather than restarting from its spawn point.

#### Scenario: Resuming movement
- **WHEN** a mob that was stopped fighting no longer has any enemy unit in range
- **THEN** the mob continues moving from its current position toward the next unvisited waypoint on its lane

### Requirement: Configurable Combat Parameters
All numeric gameplay values governing spawning and combat (spawn interval, mob speed, mob HP, mob damage, mob attack range, tower HP, tower attack range) SHALL be defined in a single configurable location rather than hardcoded inline in game logic.

#### Scenario: Adjusting a value affects behavior without code changes elsewhere
- **WHEN** a configured value (e.g., spawn interval or mob damage) is changed in the shared combat configuration
- **THEN** the game loop uses the updated value on the next relevant tick without requiring changes to targeting, movement, or spawning logic
