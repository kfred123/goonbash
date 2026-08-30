## Why

The current multiplayer system relies on a Local Area Network (LAN) / direct IP listen-server model, which is inaccessible for most users across the internet due to NAT and router configurations. Implementing a true online mode with a dedicated headless server and a centralized lobby API allows players across all platforms (including browsers and smartphones) to easily find, create, and join matches without complex network configurations.

## What Changes

- Add a centralized C# Lobby API (ASP.NET Core) to track active game sessions and manage port assignments.
- Modify the Godot project to support a headless dedicated server mode.
- Transition the networking protocol from `ENetMultiplayerPeer` to `WebSocketMultiplayerPeer` to support web browser clients.
- Update the Main Menu / Lobby UI to support both the existing Local/LAN mode and the new Online Mode with a server browser.
- Add command-line argument parsing so the C# API can dynamically spawn dedicated Godot servers.

## Capabilities

### New Capabilities
- `online-lobby-system`: Introduces a centralized server browser and matchmaking API for creating and finding games online.
- `headless-dedicated-server`: Introduces the ability to run the game without graphics/audio as an authoritative server instance.

### Modified Capabilities
- `network-synchronization`: The underlying protocol transitions from `ENet` to `WebSocket` for online matches to enable cross-platform (especially web) compatibility.

## Impact

- `NetworkManager.gd`: Will need logic to instantiate either `ENet` or `WebSocket` depending on the selected mode.
- `Lobby.gd` / `Lobby.tscn`: Significant UI changes to show a server browser and mode toggle.
- Build/Export process: Requires a new "Dedicated Server" Linux/Windows export preset.
- Infrastructure: Requires hosting for the C# ASP.NET Core API and the Godot Headless instances.
