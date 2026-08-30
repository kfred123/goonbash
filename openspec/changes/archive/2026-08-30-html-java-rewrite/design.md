## Context

GoonBash is currently an early-stage Godot 4 project. To achieve seamless cross-platform browser play with a robust, AI-friendly infrastructure, we are completely rewriting the game. The new architecture will use an HTML5 frontend and a Node.js backend, both written in TypeScript.

## Goals / Non-Goals

**Goals:**
- Establish the architectural foundation for the web client and Node.js server.
- Define the framework choices for both ends.
- Design a state synchronization model for real-time multiplayer that leverages shared code.

**Non-Goals:**
- Implementing persistent player accounts and databases (MVP will focus on single-match logic).
- Adding new game mechanics that didn't exist in the Godot version.

## Decisions

**1. Backend Framework: Node.js with Colyseus (TypeScript)**
- *Rationale:* Node.js allows us to use TypeScript on the backend, which means we can share movement, collision, and math logic directly with the frontend. Colyseus is a purpose-built multiplayer framework that handles Room management and state synchronization (Delta compression) automatically.
- *Alternatives considered:* Java (Spring Boot/Netty). While highly performant, Java prevents code sharing with the browser, requiring the AI to write and maintain identical game physics in two different languages (JS and Java), which is highly error-prone.

**2. Frontend Engine: Phaser 3 (TypeScript)**
- *Rationale:* Phaser 3 is the industry standard for 2D HTML5 games. It includes an arcade physics engine, input handling, and scene management, all of which are critical for a MOBA.
- *Alternatives considered:* PixiJS. PixiJS is faster but only provides rendering; we would have to write our own physics and input systems.

**3. Code Sharing: Shared Module**
- *Rationale:* We will create a `shared` module for types, constants, and math logic to ensure the client and server simulate the game world identically.

**4. State Synchronization: Authoritative Server with Client Prediction**
- *Rationale:* To prevent cheating, the server is the absolute authority. Because we share code, the client can run the exact same movement logic to predict its position instantly, avoiding input lag, while the server corrects it if it desyncs.

## Risks / Trade-offs

- **[Risk] Node.js is single-threaded, potentially bottlenecking if too many matches run on one process.**
  -> *Mitigation:* A simple MOBA match doesn't require extreme CPU overhead. We can scale horizontally by spinning up multiple Node.js processes for different game rooms.
- **[Risk] Complex client-side prediction in JS.**
  -> *Mitigation:* Start with a simple interpolation-only model (dummy client) before implementing full prediction.
