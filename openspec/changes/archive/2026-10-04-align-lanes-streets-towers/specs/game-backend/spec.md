# Spec Delta

## MODIFIED Requirements

### Requirement: Manage Minion AI
The backend SHALL handle the spawning and automated movement/targeting logic of the minions, using a single shared lane path definition (per lane: a diagonal-straight-diagonal path for the two outer lanes, a straight path for the middle lane) that is also used to place lane towers and derive the visually rendered streets, so minion movement, tower placement, and street rendering never diverge.

#### Scenario: Minion spawning
- **WHEN** the spawn timer reaches zero
- **THEN** the server spawns a new wave of minions at each base and sets their initial waypoints along the shared lane path definition

#### Scenario: Lane path reused for towers
- **WHEN** a match transitions to the "started" phase and lane towers are placed
- **THEN** tower positions are computed from the same lane path definition used for minion waypoints, so towers sit on the lane

## ADDED Requirements

### Requirement: Towers Participate in Combat Resolution
The backend's combat resolution SHALL include lane towers as both potential attackers and valid enemy targets, alongside tanks, minions, and bases.

#### Scenario: Tank targets tower
- **WHEN** an enemy tower is the nearest valid enemy within a player tank's fire range
- **THEN** the tank's auto-targeting may select and fire at that tower
