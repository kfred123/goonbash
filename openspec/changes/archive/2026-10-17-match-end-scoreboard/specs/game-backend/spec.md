# Spec Delta

## ADDED Requirements

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
The backend SHALL maintain final per-player kills, level, and damage-dealt statistics for both teams and make them available to clients when the match ends. Kills SHALL count opposing player tanks eliminated by a player's damage. Damage dealt SHALL count actual hit points removed from opposing tanks, minions, lane towers, and main bases by that player's attacks, after defensive reductions; damage that exceeds remaining hit points SHALL not be counted. For this change, every player's level SHALL be 1.

#### Scenario: Player damages an opposing entity
- **WHEN** a player's attack damages an opposing tank, minion, lane tower, or main base
- **THEN** that player's damage-dealt statistic increases by the hit points actually removed

#### Scenario: Player eliminates an opposing tank
- **WHEN** a player's attack reduces an opposing player tank's hit points to zero
- **THEN** that player's kill count increases by one
- **AND** the eliminated tank's later respawn does not remove the credited kill

#### Scenario: Match ends with players on both teams
- **WHEN** a main base is destroyed
- **THEN** the final statistics identify each match participant's team and include their kills, level, and damage dealt
