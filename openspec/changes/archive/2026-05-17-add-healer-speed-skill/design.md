## Context

The GoonBash game currently features a Healer role that possesses a single special ability: "Repair". To enhance the gameplay depth and maneuverability of the Healer, we are introducing a new "Speed" skill. This skill will temporarily boost the Healer's movement speed, allowing for better positioning and escapes. The ability will have levels (up to 10), with each level increasing the speed boost.

## Goals / Non-Goals

**Goals:**
- Implement a functional Speed skill for the Healer role.
- Support a leveling system for the skill (10% base speed increase, +5% per subsequent level, max level 10).
- Integrate the skill into the existing ability HUD for cooldown and level tracking.
- Ensure the speed boost is synchronized properly across the network (server-authoritative).
- Keep duration and cooldown balanced relative to other abilities.

**Non-Goals:**
- Modifying the Tank role's abilities.
- Overhauling the entire movement or ability system (we will hook into the existing one).
- Adding complex visual effects for the speed boost (simple functional implementation first, visual fine-tuning later).

## Decisions

1. **Ability Structure**: The Speed skill will be implemented similarly to existing abilities. We will add the necessary logic to the Healer's role script or the `PlayerTank.gd` script to handle the speed modifier calculation when the ability is active.
2. **Speed Modifier**: When activated, a speed multiplier will be applied to the base movement speed. `Multiplier = 1.0 + 0.10 + (Level - 1) * 0.05`.
3. **Network Authority**: The activation of the ability and the resulting speed change will be managed on the server to prevent speed hacking. The client will send an RPC to activate the ability, and the server will update the speed multiplier and sync it back.
4. **UI Integration**: We will add a new ability slot or modify the Healer's ability bar to accommodate the Speed skill, utilizing the existing ability UI components to show cooldown and level.

## Risks / Trade-offs

- **Balance**: A speed boost can make the Healer very slippery and hard to kill. We need to ensure the duration is relatively short and the cooldown is appropriate.
- **State Management**: Ensuring the speed modifier correctly resets when the ability duration expires, even if the player is stunned or killed during the effect.
