## 1. Project Cleanup & Setup

- [x] 1.1 Archive/remove existing Godot files (`.godot`, `project.godot`, `scenes`, `scripts`).
- [x] 1.2 Initialize root Monorepo (e.g. using npm workspaces).
- [x] 1.3 Initialize `shared` project for types and common logic.
- [x] 1.4 Initialize `frontend` project with Vite and Phaser 3.
- [x] 1.5 Initialize `backend` project with Node.js, TypeScript, and Colyseus.

## 2. Backend Foundation

- [x] 2.1 Setup Node.js server entry point and Colyseus Game Room.
- [x] 2.2 Create basic game loop (fixed time-step) running within the Room.
- [x] 2.3 Define core entity schemas in the `shared` folder (Tank, Minion, Base).

## 3. Frontend Foundation

- [x] 3.1 Setup basic Phaser 3 scene and canvas rendering.
- [x] 3.2 Implement Colyseus client connection to the backend Room.
- [x] 3.3 Create simple placeholder sprites/shapes for tanks and minions.
- [x] 3.4 Listen to Room state changes and update entity rendering based on server state.

## 4. Multiplayer Synchronization

- [x] 4.1 Implement input capture in Phaser and send messages to backend.
- [x] 4.2 Backend processes input messages, updates tank positions using `shared` math logic.
- [x] 4.3 Frontend smoothly interpolates tank positions between server updates.

## 5. Minion AI

- [x] 5.1 Backend: Implement minion wave spawning logic.
- [x] 5.2 Backend: Implement minion waypoints and simple pathfollowing.
- [x] 5.3 Frontend: Render minion waves updating via server state changes.
