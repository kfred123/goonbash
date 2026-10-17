## Purpose

Defines the authoritative match simulation, including movement, combat, minion lane paths, team-base spawning, match completion, and final player statistics.

## Requirements

### Requirement: Authoritative Game Loop
The backend SHALL run a fixed time-step game loop that processes player move-to-point and attack-target-lock commands, updates entity positions, and clamps all entity positions to the expanded game world's boundaries. Each tick SHALL resolve automatic targeting, player-selected target priority, projectile movement, damage, player death, and pending respawns. A player's valid locked target SHALL take priority over the nearest enemy; without a lock the tank SHALL passively fire at the nearest valid enemy already in range without chasing it.

#### Scenario: Processing movement
- **WHEN** the game loop ticks
- **THEN** the server applies queued move-to-point and attack-target-lock commands and computes each tank's new absolute position, clamped within the current game world's boundaries

#### Scenario: Processing a move-to-point command
- **WHEN** the game loop ticks and a tank has a pending move destination with no locked target
- **THEN** the server moves the tank a step toward that destination and stops it once it arrives

#### Scenario: Processing a locked-target command
- **WHEN** the game loop ticks and a tank has a locked target that is out of its fire range
- **THEN** the server moves the tank a step toward the target's current position instead of applying raw directional input

#### Scenario: Firing at a locked target in range
- **WHEN** the game loop ticks and a tank has a locked target within its fire range and its fire cooldown has elapsed
- **THEN** the tank stops moving and the server spawns a projectile aimed at that specific locked target rather than selecting the nearest enemy

#### Scenario: Resolving combat
- **WHEN** the game loop ticks during a started match
- **THEN** the server updates target selection for every combat-capable unit while honoring player target locks, advances in-flight projectiles, applies projectile damage on impact, and processes player deaths and pending respawns

### Requirement: Manage Minion AI
The backend SHALL handle the spawning and automated movement/targeting logic of the minions, using a single shared lane path definition (per lane: a diagonal-straight-diagonal path for the two outer lanes, a straight path for the middle lane) that is also used to place lane towers and derive the visually rendered streets, so minion movement, tower placement, and street rendering never diverge. Minions SHALL hold position to automatically engage enemies within fire range instead of advancing toward their waypoint, and resume their lane path when no enemy remains in range.

#### Scenario: Minion spawning
- **WHEN** the spawn timer reaches zero
- **THEN** the server spawns a new wave of minions at each base and sets their initial waypoints along the shared lane path definition

#### Scenario: Lane path reused for towers
- **WHEN** a match transitions to the "started" phase and lane towers are placed
- **THEN** tower positions are computed from the same lane path definition used for minion waypoints, so towers sit on the lane

#### Scenario: Minion encounters an enemy
- **WHEN** a minion has an enemy-team unit within its fire range
- **THEN** the minion stops advancing toward its waypoint and targets and fires at that enemy for as long as an enemy remains in range

#### Scenario: Minion loses its target
- **WHEN** a minion no longer has any enemy-team unit within its fire range because enemies died, left range, or were destroyed
- **THEN** the minion resumes moving toward its waypoint along the shared lane path

### Requirement: Towers Participate in Combat Resolution
The backend's combat resolution SHALL include lane towers as both potential attackers and valid enemy targets, alongside tanks, minions, and bases.

#### Scenario: Tank targets tower
- **WHEN** a player tank has no locked target and an enemy tower is the nearest valid enemy within its fire range
- **THEN** the tank's auto-targeting may select and fire at that tower

### Requirement: Position Tanks Near Team Base
The backend SHALL place a tank at a randomized position near its own team's base — close enough to be clearly associated with that base, but outside the base structure itself — both when the tank first spawns on joining a started match and whenever it respawns after dying. The backend SHALL NOT place a tank at a map-wide random position unrelated to its team, nor exactly on top of its base's coordinates.

#### Scenario: Initial spawn near own base
- **WHEN** a player's tank is created for a match
- **THEN** the server assigns it a starting position near its team's base rather than an arbitrary point elsewhere on the map

#### Scenario: Respawn near own base, not inside it
- **WHEN** a dead tank's respawn delay has elapsed
- **THEN** the server restores the tank to full HP at a randomized position near its team's base that is offset from the base's exact coordinates, so the tank does not reappear inside the main tower

### Requirement: Player Movement Speed
The backend SHALL use role-specific base movement speeds of 95 world units per second for Healer, 70 for Tank, and 100 for Damagedealer. Temporary ability modifiers SHALL apply to these base speeds.

#### Scenario: Tank moves toward a commanded destination
- **WHEN** a player's tank has an active move command or is chasing a locked target
- **THEN** the server advances the tank's position each tick using that role's base movement speed scaled by elapsed time, with any active movement modifiers applied

#### Scenario: Role move speeds remain distinct
- **WHEN** tanks of different roles (healer, tank, damagedealer) are each moving toward a destination without temporary modifiers
- **THEN** Healer moves at 95, Tank at 70, and Damagedealer at 100 world units per second

### Requirement: End the match when a main base is destroyed
The backend SHALL end the match when either team's main base reaches zero hit points, record the opposing team as the winner, and preserve the final match state. Once ended, the backend SHALL stop advancing combat and SHALL reject gameplay actions for that match.

#### Scenario: A main base is destroyed
- **WHEN** one team's main base reaches zero hit points during a started match
- **THEN** the match phase changes to ended and the opposing team is recorded as the winner
- **AND** the final player statistics remain available to all clients

#### Scenario: Gameplay action arrives after match end
- **WHEN** a player sends a gameplay action after the match has ended
- **THEN** the backend does not apply the action or resume the simulation

### Requirement: Preserve per-player match statistics
The backend SHALL maintain final per-player kills, level, and damage-dealt statistics for both teams and make them available to clients when the match ends. Kills SHALL count opposing player tanks eliminated by a player's damage. Damage dealt SHALL count actual hit points removed from opposing tanks, minions, lane towers, and main bases by that player's attacks, after defensive reductions; damage that exceeds remaining hit points SHALL not be counted. Level SHALL be the player's final server-authoritative level under player progression, starting at 1 rather than remaining fixed at 1.

#### Scenario: Player damages an opposing entity
- **WHEN** a player's attack damages an opposing tank, minion, lane tower, or main base
- **THEN** that player's damage-dealt statistic increases by the hit points actually removed

#### Scenario: Player eliminates an opposing tank
- **WHEN** a player's attack reduces an opposing player tank's hit points to zero
- **THEN** that player's kill count increases by one
- **AND** the eliminated tank's later respawn does not remove the credited kill

#### Scenario: Match ends with players on both teams
- **WHEN** a main base is destroyed
- **THEN** the final statistics identify each match participant's team and include their kills, final progression level, and damage dealt
