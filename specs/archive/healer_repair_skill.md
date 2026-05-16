# Healer "Repair" Special Skill

**Status:** Applied
**Date:** 2026-05-16

## 1. Context
The "Doc" (Healer) class currently lacks an active role-specific ability. To make the class more engaging and impactful in team fights, we are introducing a manual, activatable area-of-effect (AoE) healing ability called "Repair."

## 2. Requirements & Goals
- Implement an activatable "Repair" skill for the Healer.
- The skill should heal friendly units within a certain radius.
- Include a visual effect (e.g., a rotating wrench) while the repair is active.
- The ability should be integrated into the new manual upgrade system (unlocked via ability points).
- Add HUD elements (ability bar) to track cooldown and upgrades.

## 3. The Delta (What is changing)

### 3.1 New Additions
- **Visual Effects:** New `RepairEffect` scene/node with a rotating wrench animation.
- **HUD:** New `AbilityBar` UI component to display the Repair skill, its cooldown, and its upgrade level.

### 3.2 Modifications
- **PlayerTank (Healer Role):** Update the input handling to trigger the repair skill. Add area detection logic to find and heal friendly targets.
- **Leveling System:** Integrate the skill unlock/upgrade logic into the player's leveling manager.

## 4. Technical Design / Implementation Notes
- The actual health modification (healing) must be handled or verified by the server.
- Use an `Area3D` or `Area2D` (depending on the game dimension) around the player to detect healable targets.

## 5. Acceptance Criteria
- [x] Healer can unlock the "Repair" skill using an ability point.
- [x] Activating the skill shows the rotating wrench visual effect.
- [x] Friendly units within the radius receive health.
- [x] The ability goes on cooldown after use, visible on the HUD.
