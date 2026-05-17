# GoonBash System Overview

**Status:** Baseline
**Date:** 2026-05-16

This document provides a high-level overview of the core systems and features currently implemented in the GoonBash project (a MOBA-style multiplayer game). It serves as the "Single Source of Truth" for the existing architecture.

---

## 1. Core Framework & Multiplayer

### 1.1 Networking and Lobby (`NetworkManager.gd`, `Lobby.gd`)
The game is built on a Client-Server architecture.
- Players can host a game or join an existing host.
- The **Lobby** allows players to select one of two available roles (Tank or Doc/Healer) before the game starts.
- Once the game starts, the `NetworkManager` synchronizes the transition to the main map (`MainMap.gd`).

### 1.2 Resource Management (`ResourceManager.gd`)
- Handles the "lazy loading" of critical assets like Minions (`Minion.tscn`) and Projectiles (`Bullet.tscn`) to prevent errors caused by circular dependencies during loading.

---

## 2. Player Controller, Roles & Progression

### 2.1 Split Body/Cannon Mechanics (`PlayerTank.gd`)
- The player character consists of a chassis (Body) responsible for movement, and a turret (Cannon) that can rotate independently to face the mouse cursor.
- Firing will spawn projectiles (`Bullet.gd`) in the direction the cannon is facing.

### 2.2 Role System
There are currently two selectable roles, differing in stats and special abilities.
**Global Rule:** Player attack ranges must never exceed the attack range of Lane Towers or Minions.
- **Tank:** 
  - Has higher base health and armor.
  - Possesses the **"Shield"** special ability to temporarily block incoming damage.
- **Healer (Doc):**
  - Possesses the **"Repair"** special ability, an activatable Area-of-Effect (AoE) heal that restores health to friendly units within a radius.
  - Activation is visualized by a rotating wrench effect.

### 2.3 Leveling System & HUD
- Players gain **XP (Experience Points)** through in-game actions.
- Upon leveling up, the player receives **Ability Points**.
- These points can be used manually via the **UI/HUD (Ability Bar)** to unlock or upgrade class-specific special abilities (like Repair or Shield).

---

## 3. World Entities & AI

### 3.1 Bases (`BaseLogic.gd`)
- Each team owns a main base.
- Bases feature a continuous, slow health regeneration (Health Recovery) mechanic.
- Destroying the enemy team's base is the primary objective of the game.

### 3.2 Lane Towers (`LaneTowerLogic.gd`)
- Mid-lane defense towers are placed strategically on the map.
- They serve to control the map and will automatically attack enemies that enter their range.

### 3.3 Minions (`MinionAI.gd`)
- NPC units that spawn in waves and follow designated lanes.
- Equipped with navigation logic and AI to automatically detect and attack enemy units and structures.
