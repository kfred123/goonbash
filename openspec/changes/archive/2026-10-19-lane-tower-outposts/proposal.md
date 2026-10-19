# Proposal

## Why

Lane towers should share the recognizable fortified, cannon-equipped visual language of the main towers while remaining visually subordinate and reading as small lane outposts. Their appearance and rotating weapon will make their defensive role clearer without changing combat balance.

## What Changes

- Update lane tower rendering to use smaller outpost-like structures derived from the main-tower design, with a visible cannon that rotates toward its current target and visibly fires.
- Keep lane tower damage and existing combat behavior unchanged while preserving destroyed towers as nonfunctional ruins until the match ends.

## Capabilities

### New Capabilities

### Modified Capabilities

- `lane-towers`: Preserve existing combat behavior and damage, and keep destroyed towers in the game state as nonfunctional ruins until the match ends.
- `game-frontend`: Render lane towers as smaller fortified outposts with target-tracking, rotating cannons and firing feedback; render destroyed towers as static ruins.

## Impact

- Affected systems: lane-tower rendering and replicated state for tower destruction.
- No API, dependency, or combat-balance changes.
