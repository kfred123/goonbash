# Spec Delta

## Purpose

Defines authoritative physical blocking, minion avoidance, and safe placement so active units cannot pass through entities that block their movement.

## ADDED Requirements

### Requirement: Team-independent collision matrix
Living player tanks SHALL block other living player tanks. Living lane towers and living main bases SHALL block living player tanks and living minions. Living minions SHALL not overlap other living minions. Player tanks and minions SHALL remain mutually passable. These rules SHALL apply regardless of either entity's team. Dead players, including respawn previews, and destroyed structures SHALL NOT block movement.

#### Scenario: Players meet
- **WHEN** a living player moves into another living player's occupied space on either team
- **THEN** the moving player stops or slides along contact without passing through or displacing the other player

#### Scenario: Player and minion meet
- **WHEN** a player and a minion cross paths on either team
- **THEN** neither entity blocks or displaces the other

#### Scenario: Unit approaches a structure
- **WHEN** a living player or minion approaches a living lane tower or main base of either team
- **THEN** the unit cannot enter or pass through the structure's collision footprint

#### Scenario: Inactive entity occupies the route
- **WHEN** a movement route passes through a dead player, a respawn preview, or a destroyed structure
- **THEN** that inactive entity does not obstruct the moving unit

### Requirement: Authoritative collision-safe movement
The server SHALL apply collision constraints to every player movement and minion movement before publishing positions. Starting from valid positions, blocked entities SHALL remain separated by at least the sum of their collision radii, within numerical tolerance, and SHALL NOT tunnel through one another even when a movement step would cross the entire obstacle. Collision resolution SHALL keep unit footprints within world bounds and SHALL NOT increase their permitted movement distance. Collision footprints SHALL be independent of visual scale changes, click-selection bounds, and projectile-hit rules.

#### Scenario: Large movement crosses a blocker
- **WHEN** a movement step would finish beyond a blocking entity without its endpoint touching that entity
- **THEN** the server prevents crossing the entity rather than checking only the final position

#### Scenario: Players attempt to exchange positions
- **WHEN** two players move toward and past each other's starting positions in the same update
- **THEN** they remain separated and do not exchange sides by passing through one another

#### Scenario: Contact occurs at the world boundary
- **WHEN** a unit moves against a blocker near the edge of the world
- **THEN** collision resolution leaves both the unit's footprint inside the world and its position outside blocking footprints

#### Scenario: Movement modifiers are active
- **WHEN** a unit moves with terrain penalties or an active speed modifier
- **THEN** its actual path distance does not exceed the movement allowance after those existing modifiers

#### Scenario: Enemy blocker is concealed
- **WHEN** an authoritative blocking entity is concealed from the moving player's team
- **THEN** it still blocks movement
- **AND** collision handling does not reveal its ID, coordinates, or hidden state to that client

### Requirement: Minion avoidance and lane continuation
Living minions SHALL avoid other living minions and living structures by steering around their collision footprints whenever a local route is available. Avoidance SHALL work for allied and opposing minions, including stationary combatants. Minions SHALL retain their lane objective during detours and resume progress toward it after clearing the obstacle. If no local route is available, a minion SHALL wait without overlapping blockers and retry as space becomes available. Collision avoidance SHALL NOT initiate pursuit of hidden enemies or change combat target priorities.

#### Scenario: Following minion meets a stationary minion
- **WHEN** an advancing minion encounters a stationary minion and free space exists beside it
- **THEN** the advancing minion takes a lateral detour and continues toward its lane objective without overlapping the stationary minion

#### Scenario: Allied tower stands on the lane
- **WHEN** an advancing minion reaches an allied lane tower with free space around it
- **THEN** it routes around the tower and continues along the original lane rather than stopping permanently or passing through the tower

#### Scenario: Opposing minions converge
- **WHEN** living minions from opposing teams converge on the same location
- **THEN** their collision footprints remain separate, including while they stop to fight

#### Scenario: Corridor is temporarily full
- **WHEN** all local routes around blocking entities are occupied
- **THEN** the minion waits without entering another blocking footprint
- **AND** it resumes advancing or avoiding when a route becomes available

### Requirement: Collision-safe activation
The server SHALL activate new players, respawning players, and newly spawned minions only at positions clear of their respective blockers and inside world bounds. Tank placement SHALL remain near the owning team's base. Minion wave placement SHALL remain associated with the owning base and assigned lanes. Positions reserved for inactive respawn previews SHALL be rechecked at activation because other players can occupy them while the preview is non-blocking. If no valid local position is available, activation SHALL wait and retry rather than create an overlap.

#### Scenario: Minion wave leaves its main base
- **WHEN** a base spawns a wave with multiple lane minions
- **THEN** each minion becomes active outside the living base's footprint and outside other living minion footprints
- **AND** each retains its assigned lane

#### Scenario: Player spawns near teammates
- **WHEN** a player joins active play near its team base while other players occupy nearby positions
- **THEN** it is placed outside the base, living player tanks, and living lane towers without treating minions as blockers

#### Scenario: Respawn preview position becomes occupied
- **WHEN** a player is ready to respawn but its preview position overlaps a living player or structure
- **THEN** the server selects a nearby clear team-base position before activation or waits until one is available

#### Scenario: Spawn area has no free space
- **WHEN** no valid local position exists for a pending player activation or minion spawn
- **THEN** the server keeps it inactive and retries without publishing an overlapping active entity
