## ADDED Requirements

### Requirement: Headless Execution
The Godot game SHALL be capable of running in headless mode, acting entirely as a server without spawning graphics, audio, or a local player entity.

#### Scenario: Launch with --server argument
- **WHEN** the executable is run with `--server` in the command line arguments
- **THEN** it suppresses UI rendering and automatically starts hosting a WebSocketMultiplayerPeer server

### Requirement: Dual Mode Networking
The game SHALL support both `ENetMultiplayerPeer` (for Local/LAN) and `WebSocketMultiplayerPeer` (for Online/Headless mode), selecting the appropriate one based on context.

#### Scenario: Player hosts local game
- **WHEN** player clicks "Host" in the LAN menu
- **THEN** game starts an `ENetMultiplayerPeer` server locally

#### Scenario: Headless server starts
- **WHEN** process is launched via the API with `--server`
- **THEN** it starts a `WebSocketMultiplayerPeer` server on the specified port
