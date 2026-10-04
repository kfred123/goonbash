## Purpose

Defines the authoritative backend simulation: the fixed-tick game loop, minion AI, and the rules governing where tanks are positioned when they spawn or respawn.

## Requirements

### Requirement: Authoritative Game Loop
The backend SHALL run a fixed time-step game loop that processes player inputs, updates entity positions based on velocity and physics, and computes combat interactions.

#### Scenario: Processing movement
- **WHEN** the game loop ticks
- **THEN** the server applies all queued movement commands and computes the new absolute position of each tank

### Requirement: Manage Minion AI
The backend SHALL handle the spawning and automated movement/targeting logic of the minions.

#### Scenario: Minion spawning
- **WHEN** the spawn timer reaches zero
- **THEN** the server spawns a new wave of minions at each base and sets their initial waypoints

### Requirement: Position Tanks Near Team Base
The backend SHALL place a tank at a randomized position near its own team's base — close enough to be clearly associated with that base, but outside the base structure itself — both when the tank first spawns on joining a started match and whenever it respawns after dying. The backend SHALL NOT place a tank at a map-wide random position unrelated to its team, nor exactly on top of its base's coordinates.

#### Scenario: Initial spawn near own base
- **WHEN** a player's tank is created for a match
- **THEN** the server assigns it a starting position near its team's base rather than an arbitrary point elsewhere on the map

#### Scenario: Respawn near own base, not inside it
- **WHEN** a dead tank's respawn delay has elapsed
- **THEN** the server restores the tank to full HP at a randomized position near its team's base that is offset from the base's exact coordinates, so the tank does not reappear inside the main tower
