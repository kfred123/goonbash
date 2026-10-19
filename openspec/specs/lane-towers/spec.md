## Purpose

Lane towers are team-owned defensive structures placed along each lane that automatically attack approaching enemies, giving each lane intermediate objectives and map-control checkpoints between the two bases.

## Requirements

### Requirement: Tower Placement Per Lane
The system SHALL place exactly 2 towers per team on each of the 3 lanes (12 towers total), positioned along that lane's path at points closer to the owning team's own base than to the enemy base, with the two towers of a team separated from each other by a consistent, non-zero distance along the lane path (never placed at the same point).

#### Scenario: Match start tower placement
- **WHEN** a match transitions to the "started" phase
- **THEN** the server creates 2 blue towers and 2 red towers on each of the 3 lanes, each positioned along that lane's path, with each team's pair of towers spaced evenly apart rather than clustered together

### Requirement: Tower Auto-Attack
A tower SHALL automatically detect and attack the nearest living enemy tank, minion, or opposing tower within its fire range, on a fixed cooldown, the same way bases and minions already engage enemies. The visual redesign SHALL NOT change a tower's existing fire range, cooldown, or damage.

#### Scenario: Enemy minion enters tower range
- **WHEN** an enemy minion moves within a tower's fire range and the tower is not on cooldown
- **THEN** the tower fires at that minion and begins its fire cooldown

#### Scenario: No enemy in range
- **WHEN** no enemy entity is within a tower's fire range
- **THEN** the tower does not fire

#### Scenario: Tower appearance is updated
- **WHEN** a lane tower uses the outpost visual design
- **THEN** its existing fire range, cooldown, and damage remain unchanged

### Requirement: Tower Destruction
A tower SHALL track hit points and take damage from enemy fire. When its hit points reach zero, it SHALL stop attacking, SHALL no longer be a valid attack target, and SHALL remain in the game state as a nonfunctional ruin until the match ends.

#### Scenario: Tower reduced to zero HP
- **WHEN** a tower's hit points reach zero
- **THEN** the tower stops attacking and is no longer a valid attack target
- **AND** it remains in the game state as a ruin until the match ends
