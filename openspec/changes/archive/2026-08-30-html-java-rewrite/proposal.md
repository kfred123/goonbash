## Why

The current GoonBash project is built in Godot 4. To better align with web-centric development goals and ensure a robust, AI-friendly development workflow, we are migrating to a pure HTML5/TypeScript frontend and a Node.js (TypeScript) backend. This complete rewrite allows us to use standard web game engines (like Phaser) and share game logic between the client and server.

## What Changes

- **BREAKING**: The existing Godot 4 codebase (GDScript, Scenes) will be replaced entirely.
- Creation of a new `frontend` project using HTML5/TypeScript (Phaser 3) to render the 2D game state and handle player inputs.
- Creation of a new `backend` project using Node.js (TypeScript) to serve as the authoritative game server, handling game logic, minion AI, and combat math.
- Creation of a `shared` package to hold common types, physics math, and game constants used by both frontend and backend.
- Implementation of real-time state synchronization using Colyseus or Socket.io.

## Capabilities

### New Capabilities
- `game-frontend`: The HTML5/TS client responsible for rendering the game world, playing animations, and capturing user input.
- `game-backend`: The Node.js authoritative server responsible for maintaining game state, handling movement/combat logic, and managing minion spawning.
- `multiplayer-networking`: The WebSocket communication protocol and state synchronization layer.

### Modified Capabilities

## Impact

- The current Godot project files (`.godot`, `project.godot`, `scenes`, `scripts`) will be archived or removed.
- The repository structure will be split into three main modules: `frontend`, `backend`, and `shared`.
- All future development will shift from GDScript to TypeScript.
