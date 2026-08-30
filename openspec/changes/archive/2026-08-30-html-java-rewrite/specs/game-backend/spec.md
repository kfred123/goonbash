## ADDED Requirements

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
