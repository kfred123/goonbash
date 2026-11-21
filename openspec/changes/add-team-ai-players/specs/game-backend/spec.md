# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve per-player match statistics
The backend SHALL maintain final per-player kills, level, and damage-dealt statistics for both teams and make them available to clients when the match ends. Kills SHALL count opposing player tanks eliminated by a player's damage. Damage dealt SHALL count actual hit points removed from opposing tanks, minions, lane towers, and main bases by that player's attacks, after defensive reductions; damage that exceeds remaining hit points SHALL not be counted. Level SHALL be the player's final server-authoritative level under player progression, starting at 1 rather than remaining fixed at 1. Statistics SHALL remain associated with the same participant if their tank changes from human to bot control.

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

#### Scenario: Bot-controlled participant deals damage
- **WHEN** a bot-controlled tank deals damage or eliminates an opposing player tank after taking over from a human
- **THEN** the damage and kill statistics remain credited to that same participant
