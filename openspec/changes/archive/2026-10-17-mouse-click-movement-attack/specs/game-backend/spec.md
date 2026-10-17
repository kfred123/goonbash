## MODIFIED Requirements

### Requirement: Authoritative Game Loop
The backend SHALL run a fixed time-step game loop that processes player move-to-point and attack-target-lock commands, updates entity positions accordingly, and computes combat interactions, firing tank weapons at the player-selected locked target when one is set instead of the nearest enemy.

#### Scenario: Processing a move-to-point command
- **WHEN** the game loop ticks and a tank has a pending move destination with no locked target
- **THEN** the server moves the tank a step toward that destination and stops it once it arrives

#### Scenario: Processing a locked-target command
- **WHEN** the game loop ticks and a tank has a locked target that is out of its fire range
- **THEN** the server moves the tank a step toward the target's current position instead of applying raw directional input

#### Scenario: Firing at a locked target in range
- **WHEN** the game loop ticks and a tank has a locked target within its fire range and its fire cooldown has elapsed
- **THEN** the server spawns a projectile aimed at that specific locked target rather than selecting the nearest enemy
