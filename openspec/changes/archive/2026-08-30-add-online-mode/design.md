## Context

GoonBash currently uses a peer-to-peer listen-server model (`ENetMultiplayerPeer`), which requires players to be on the same LAN or to manually forward ports. To make the game truly multiplatform and easily accessible over the internet, we need a centralized matchmaking and dedicated server infrastructure.

## Goals / Non-Goals

**Goals:**
- Provide a global server browser in the game client.
- Allow users to create online matches without configuring routers.
- Isolate matches by running them as separate dedicated headless processes on a server.
- Support web browser clients by transitioning to `WebSocketMultiplayerPeer` for online matches.
- Preserve the existing LAN/Local connection mode.

**Non-Goals:**
- Complex matchmaking algorithms (Elo/Skill-based). For now, it's just an open server browser.
- In-game chat or user accounts (players will still just provide a display name).

## Decisions

**1. C# ASP.NET Core for Lobby API**
- **Rationale:** The team is familiar with C#, ASP.NET Core is highly performant, and it synergizes well with Godot (which also supports C#). It provides robust process management (`System.Diagnostics.Process`) to spawn Godot instances.

**2. Headless Godot Servers**
- **Rationale:** Instead of rewriting server logic, we export a headless version of GoonBash. The C# API spawns this executable with `--server --port=<port>` arguments. Godot reads these arguments and starts an authoritative server without graphics or audio.

**3. WebSocket Protocol for Online Mode**
- **Rationale:** Web browsers cannot establish raw UDP/TCP connections. To support HTML5 exports, we must use WebSockets or WebRTC. WebSockets are natively supported in Godot 4 and much simpler to set up than a WebRTC client-server topology. 

**4. Dual Network Mode Support**
- **Rationale:** We will keep the `ENet` listen-server setup for Local/LAN games, as it provides the lowest latency and doesn't require the C# API. The `NetworkManager` will dynamically instantiate `ENetMultiplayerPeer` for local mode or `WebSocketMultiplayerPeer` for online mode.

## Risks / Trade-offs

- **Risk: WebSocket Latency vs UDP** → WebSockets run over TCP, which can introduce head-of-line blocking compared to ENet's UDP. 
  - *Mitigation*: GoonBash is a MOBA, not a twitch-shooter. TCP latency is usually acceptable for this genre. If it becomes a bottleneck, we can investigate WebRTC.
- **Risk: Server Orchestration Security** → An attacker could spam the "Create Game" endpoint and crash the server by exhausting RAM.
  - *Mitigation*: The C# API will enforce a hard limit on the maximum number of concurrent headless instances.
- **Risk: Orphaned Processes** → A Godot server crashes or players leave, but the C# API still thinks it's running.
  - *Mitigation*: The C# API will monitor `Process.HasExited`. Additionally, the Godot server will auto-terminate (`get_tree().quit()`) if no players are connected after 5 minutes, or when a game finishes.
