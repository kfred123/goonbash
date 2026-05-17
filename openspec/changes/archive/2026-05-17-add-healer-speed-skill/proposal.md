## Why

The Healer role currently only has the "Repair" ability. To provide more strategic options and mobility for the Healer during matches, a new "Speed" skill is needed. This allows the Healer to quickly navigate the map, escape dangerous situations, or reach allies who need healing.

## What Changes

Adding a new "Speed" skill specifically for the Healer role.
- When activated, the player's movement speed increases.
- The initial speed boost is 10%.
- The skill can be upgraded, with each level granting an additional 5% speed boost.
- The maximum level for the skill is 10.
- Cooldown and duration will be balanced to match existing abilities.
- The skill will be added to the ability bar in the player's HUD, similar to the existing Repair ability.

## Capabilities

### New Capabilities
- `healer-speed-skill`: Defines the new Speed skill for the Healer role, including its effects, leveling system (up to level 10), duration, and cooldown mechanics.

### Modified Capabilities
- None

## Impact

- `PlayerTank` and role-specific scripts (e.g., `HealerRole`) to include the new skill logic.
- HUD components to display the new skill, its cooldown, and its level.
- Network synchronization for the speed boost effect.
