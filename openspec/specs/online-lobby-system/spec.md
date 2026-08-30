## ADDED Requirements

### Requirement: Centralized Matchmaking API
The system SHALL provide an HTTP API endpoint to retrieve a list of active online game sessions.

#### Scenario: User fetches lobby list
- **WHEN** user opens the "Online" tab in the main menu
- **THEN** client retrieves the list of open lobbies from the C# Lobby API

### Requirement: Server Browser UI
The game client SHALL provide a UI screen allowing players to see all active online games and join them.

#### Scenario: User joins an online match
- **WHEN** user clicks "Join" on a specific lobby entry
- **THEN** client connects via WebSocket to the IP and Port specified in that lobby entry

### Requirement: Dedicated Server Instantiation
The C# Lobby API SHALL spawn a new headless Godot instance when a player creates a new online game.

#### Scenario: User creates an online match
- **WHEN** user clicks "Create Game" in the Online tab
- **THEN** C# API starts a new process for GoonBash with `--server` flag and assigns it a unique port
