# GoonBash Constitution

This document defines the core principles, architecture, and coding standards for the GoonBash project. AI agents and developers must adhere to these rules when implementing new OpenSpecs.

## 1. Project Architecture
- **Engine:** Godot 4.x
- **Language:** GDScript
- **Genre:** MOBA-style Multiplayer Game
- **Architecture Pattern:** Client-Server model. Critical logic (health, damage, spawning) must be verified or executed on the server via `rpc_id(1)` or similar RPC mechanisms.

## 2. Coding Standards
- **Naming Conventions:**
  - `snake_case` for variables, functions, and file names (e.g., `player_tank.gd`).
  - `PascalCase` for class names, node names, and Scene files (e.g., `PlayerTank.tscn`).
  - `UPPER_SNAKE_CASE` for constants.
  - Prefix private/internal variables and functions with an underscore (e.g., `_current_health`).
- **Typing:** Use strict static typing where possible (e.g., `var health: int = 100`, `func take_damage(amount: int) -> void:`).
- **Scene Structure:** Keep scenes decoupled. Use signal up, call down. Use exported variables (`@export`) for configurable node references.

## 3. OpenSpec Workflow
This project uses **OpenSpec** for Specification-Driven Development.
- **Proposals:** New features or changes begin as a delta spec in `specs/active/`.
- **Delta Focus:** Specs should focus on *what is changing* (the delta) rather than restating the entire system.
- **Implementation:** Code must strictly fulfill the requirements defined in the active spec.
- **Archive:** Once implemented, the spec is moved to `specs/archive/` as a historical record of the change.

## 4. Documentation Language
- **English Only:** All code comments, `specs/` files, commit messages, and project documentation MUST be written entirely in **English**. 
- This rule applies strictly, even if the user converses or prompts in another language (e.g., German).

## 5. Game Design & Balance Rules
- **Attack Range Limit:** No player (regardless of role) may ever have a firing range that is higher than the attack range of Lane Towers or Minions.
