## MODIFIED Requirements

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
