## 1. C# Lobby API Setup

- [x] 1.1 Create new ASP.NET Core Web API project
- [x] 1.2 Create `LobbyController` with endpoints for getting lobbies (`GET /api/lobbies`)
- [x] 1.3 Implement `POST /api/lobbies/create` to spawn Godot processes
- [x] 1.4 Add basic process monitoring to track running Godot servers

## 2. Headless Godot Server Support

- [x] 2.1 Add OS argument parsing in Godot (`OS.get_cmdline_args()`)
- [x] 2.2 Prevent UI rendering and switch to headless mode if `--server` is detected
- [x] 2.3 Modify `NetworkManager` to start `WebSocketMultiplayerPeer` when running as server
- [x] 2.4 Add auto-shutdown logic (`get_tree().quit()`) when a match ends or all players leave

## 3. Godot Client & UI Updates

- [x] 3.1 Update `Lobby.tscn` to include tabs for "Local/LAN" and "Online"
- [x] 3.2 Implement HTTP Request logic in Godot to fetch lobbies from the C# API
- [x] 3.3 Add "Create Online Game" button that calls the C# API
- [x] 3.4 Modify connection logic to use `WebSocketMultiplayerPeer` when joining an online game

## 4. Verification & Testing

- [x] 4.1 Verify Local/LAN mode still works with `ENet`
- [x] 4.2 Verify Headless Godot server successfully accepts WebSocket connections
- [x] 4.3 Verify C# API correctly tracks and routes ports for multiple concurrent matches
