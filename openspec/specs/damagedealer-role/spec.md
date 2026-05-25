# damagedealer-role Specification

## Purpose
TBD - created by archiving change add-damagedealer-role. Update Purpose after archive.
## Requirements
### Requirement: Damagedealer Role Selection
The system SHALL allow players to select the "damagedealer" role in the pre-game lobby.

#### Scenario: Player selects damagedealer role
- **WHEN** the player clicks the "Damagedealer" role card in the Lobby UI
- **THEN** their role is updated to "damagedealer" and synced to all other players

### Requirement: Damagedealer Base Stats
The system SHALL configure a PlayerTank as a Damagedealer if the role is selected.

#### Scenario: Damagedealer spawns
- **WHEN** the game starts and the player's role is "damagedealer"
- **THEN** the tank spawns with low max HP, fast movement speed, and a unique visual hull polygon

