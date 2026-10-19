# Design

## Context

Player-tank movement is authoritative in the backend and already combines role-specific base speed with temporary movement ability modifiers. Minions advance using their own movement speed. The Tiled ground layer is grass; visible stone lanes are drawn over it from shared lane paths, so movement terrain must use that same path geometry.

## Goals / Non-Goals

**Goals:**

- Apply one consistent 50% terrain multiplier to all mobile units currently on grass.
- Preserve role, minion, and ability speed values as the pre-terrain speed.
- Keep the Healer Speed skill effective on grass by applying its multiplier before terrain scaling.

**Non-Goals:**

- Change base movement speeds, Healer skill scaling, tile layout, or lane geometry.
- Add terrain penalties to stone or alter movement for stationary entities.

## Decisions

- Determine terrain from whether the unit's current position falls within the visible stone lane width around a shared lane path. Share the road width with the renderer, so a visual change to that width also changes terrain classification consistently. Apply the factor to the speed already calculated for that unit. Computing terrain from destination alone would apply the penalty before a unit has entered the terrain.
- Use a terrain factor of 0.5 for grass and 1.0 for stone for both player tanks and minions. Separate unit-specific terrain rules would risk inconsistent movement and are not requested.
- Keep the Healer skill calculation intact and apply terrain scaling after it. This preserves the existing level-based skill multiplier and gives the requested result of `base speed × skill multiplier × 0.5` on grass. Applying the penalty first would incorrectly reduce the skill's effect.

## Risks / Trade-offs

- [Units crossing a tile boundary can change speed between simulation ticks] → Sample terrain from the unit's current position for each movement update, keeping behavior deterministic and responsive.
- [A terrain lookup error could produce inconsistent speeds] → Reuse shared lane geometry and road width and validate terrain classification for both grass and stone in movement tests.
