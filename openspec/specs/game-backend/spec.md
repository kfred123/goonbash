## Purpose

Defines the authoritative match simulation, including movement, combat, minion lane paths, team-base spawning, match completion, and final player statistics.

## Requirements

### Requirement: Grass Movement Speed Penalty
The backend SHALL reduce the movement speed of every mobile unit, including player tanks and minions, to 50% of its otherwise-applicable speed while it moves over grass. The backend SHALL apply the terrain penalty after role-specific base speed and any active movement ability modifiers have been applied. Units on stone terrain SHALL receive no terrain speed penalty.

#### Scenario: Player tank moves on grass
- **WHEN** a player tank moves while on a grass tile
- **THEN** the backend advances it at 50% of its role-specific speed, including any active movement modifiers

#### Scenario: Minion moves on grass
- **WHEN** a minion moves while on a grass tile
- **THEN** the backend advances it at 50% of its normal movement speed

#### Scenario: Unit moves on stone
- **WHEN** a mobile unit moves while on a stone tile
- **THEN** the backend applies no terrain speed penalty

### Requirement: Main Bases Fire at Nearby Enemies
During a started match, each living main base SHALL automatically fire at the nearest living enemy tank, minion, lane tower, or opposing main base within 250 world units. Each shot SHALL deal 24 damage, and the base SHALL fire no more often than once every 1,200 milliseconds. The backend SHALL replicate the shot and apply damage authoritatively; a base SHALL not fire when no valid enemy is in range.

#### Scenario: Enemy enters main-base range
- **WHEN** a living enemy enters a main base's 250-unit range during a started match and the base's cooldown has elapsed
- **THEN** the backend selects the nearest valid enemy and spawns a projectile from that base toward it
- **AND** the base begins a 1,200-millisecond firing cooldown

#### Scenario: Main-base projectile hits
- **WHEN** a main-base projectile reaches its designated enemy target
- **THEN** the backend applies 24 damage to that target and removes the projectile

#### Scenario: No valid enemy is in range
- **WHEN** a main base has no living enemy within 250 world units
- **THEN** the backend does not spawn a projectile for that base

#### Scenario: Main base is destroyed or the match has ended
- **WHEN** a main base has zero hit points or the match is not in the started phase
- **THEN** the backend does not allow that base to fire

### Requirement: Authoritative Game Loop
The backend SHALL run a fixed time-step game loop that processes player move-to-point and attack-target-lock commands, updates entity positions, and clamps all entity positions to the expanded game world's boundaries. Each tick SHALL resolve automatic targeting, player-selected target priority, projectile movement, damage, player death, and pending respawns. A player's valid team-visible locked target SHALL take priority over the nearest enemy; without a lock the tank SHALL passively fire at the nearest valid team-visible enemy already in range without chasing it. Commands, pursuit, and each new shot SHALL use current shared team vision; hidden enemy IDs SHALL NOT bypass visibility checks. Existing in-flight projectiles SHALL continue resolving even after visibility is lost.

#### Scenario: Processing movement
- **WHEN** the game loop ticks
- **THEN** the server applies queued move-to-point and valid team-visible attack-target-lock commands and computes each tank's new absolute position, clamped within the current game world's boundaries

#### Scenario: Processing a move-to-point command
- **WHEN** the game loop ticks and a tank has a pending move destination with no locked target
- **THEN** the server moves the tank a step toward that destination and stops it once it arrives, regardless of whether the destination terrain is revealed

#### Scenario: Processing a locked-target command
- **WHEN** the game loop ticks and a tank has a team-visible locked target that is out of its fire range
- **THEN** the server moves the tank a step toward the target's current position instead of applying raw directional input

#### Scenario: Firing at a locked target in range
- **WHEN** the game loop ticks and a tank has a team-visible locked target within its fire range and its fire cooldown has elapsed
- **THEN** the tank stops moving and the server spawns a projectile aimed at that specific locked target rather than selecting the nearest enemy

#### Scenario: Resolving combat
- **WHEN** the game loop ticks during a started match
- **THEN** the server updates target selection for every combat-capable unit using current team visibility while honoring valid player target locks, advances in-flight projectiles independently of later visibility loss, applies projectile damage on impact, and processes player deaths and pending respawns

#### Scenario: Client supplies a concealed target ID
- **WHEN** a player sends an attack-target command naming a living enemy not visible to their team
- **THEN** the server rejects the attack without setting a lock, initiating pursuit, or revealing that enemy's position
- **AND** the requesting client receives an invalid-target rejection

#### Scenario: Vision disappears before pursuit
- **WHEN** the last observer revealing a locked enemy dies or moves away before that tank's next movement or firing decision
- **THEN** the server clears the lock before using the enemy's coordinates for pursuit or a new shot

### Requirement: Manage Minion AI
The backend SHALL handle the spawning and automated movement/targeting logic of the minions, using a single shared lane path definition (per lane: a diagonal-straight-diagonal path for the two outer lanes, a straight path for the middle lane) that is also used to place lane towers and derive the visually rendered streets, so minion movement, tower placement, and street rendering never diverge. Living minions SHALL contribute shared team vision. Minions SHALL hold position to automatically engage team-visible enemies within fire range instead of advancing toward their waypoint, and resume their lane path when no visible enemy remains in range.

#### Scenario: Minion spawning
- **WHEN** the spawn timer reaches zero
- **THEN** the server spawns a new wave of minions at each base and sets their initial waypoints along the shared lane path definition
- **AND** those living minions begin contributing vision using their configured absolute sight ranges

#### Scenario: Lane path reused for towers
- **WHEN** a match transitions to the "started" phase and lane towers are placed
- **THEN** tower positions are computed from the same lane path definition used for minion waypoints, so towers sit on the lane

#### Scenario: Minion encounters an enemy
- **WHEN** a minion has a team-visible enemy-team unit within its fire range
- **THEN** the minion stops advancing toward its waypoint and targets and fires at that enemy for as long as a visible enemy remains in range

#### Scenario: Minion loses its target
- **WHEN** a minion no longer has any team-visible enemy-team unit within its fire range because enemies died, left range, became concealed, or were destroyed
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
