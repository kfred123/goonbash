# Spec Delta

## ADDED Requirements

### Requirement: Display match outcome and team scoreboards
The frontend SHALL display a result screen when the match ends, identify the local player's team as victorious or defeated, and show a separate scoreboard for each team. Each scoreboard SHALL list every match participant on that team with their name, kills, level, and damage dealt. Each scoreboard SHALL initially be sorted by kills from highest to lowest.

#### Scenario: Local player's team wins
- **WHEN** the match ends and the local player's team is the recorded winner
- **THEN** the frontend displays a victory message and both team scoreboards with final statistics

#### Scenario: Local player's team loses
- **WHEN** the match ends and the local player's team is not the recorded winner
- **THEN** the frontend displays a defeat message and both team scoreboards with final statistics

#### Scenario: Results are first displayed
- **WHEN** the result screen is displayed
- **THEN** each team's players are listed in descending order of kills

### Requirement: Sort team scoreboards
The frontend SHALL allow each team scoreboard to be sorted by kills, level, or damage dealt, in ascending or descending order.

#### Scenario: Player selects a sortable statistic
- **WHEN** the player activates the kills, level, or damage-dealt column heading
- **THEN** that team's scoreboard is sorted by the selected statistic
- **AND** activating the same heading again reverses its sort direction

### Requirement: Return to the main menu from match results
The frontend SHALL provide an action on the result screen that leaves the finished room and returns the player to the main menu.

#### Scenario: Player leaves match results
- **WHEN** the player activates the return-to-menu action
- **THEN** the client leaves the finished game room and displays the main menu
