## MODIFIED Requirements

### Requirement: Manage Minion AI
The backend SHALL handle the spawning, per-lane movement, nearest-enemy auto-targeting, and combat resolution of mobs, including their attacks on the enemy Main Tower.

#### Scenario: Minion spawning
- **WHEN** the spawn timer reaches the configured spawn interval
- **THEN** the server spawns one mob per lane (top, mid, bottom) at each team's Main Tower and assigns each mob its lane's waypoint path

#### Scenario: Mob combat interrupts movement
- **WHEN** a mob detects an enemy unit within its attack range while moving along its lane
- **THEN** the server stops the mob's movement and resolves combat against the closest enemy unit each tick until no enemy remains in range

#### Scenario: Mob resumes movement after combat
- **WHEN** a mob no longer has an enemy unit within range
- **THEN** the server resumes moving the mob toward the next waypoint on its lane

#### Scenario: Mob attacks enemy tower
- **WHEN** a mob reaches the final waypoint of its lane at the enemy Main Tower
- **THEN** the server resolves combat between the mob and the Main Tower until the tower's health reaches 0
