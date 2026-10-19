# Proposal

## Why

Units currently move over grass without a terrain speed cost, making grass functionally equivalent to the stone lanes. A 50% speed penalty will make terrain matter while preserving the Healer's Speed skill as a multiplier that applies before the terrain penalty.

## What Changes

- Reduce the movement speed of units on grass to 50% of their otherwise-applicable speed.
- Apply the grass penalty after all movement skill modifiers, including the Healer's Speed skill.
- Preserve movement speed on stone terrain.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-backend`: Add terrain-dependent movement speed behavior for units moving over grass.
- `healer-speed-skill`: Specify that the Healer's Speed multiplier is calculated before the grass movement penalty.

## Impact

- Affects authoritative movement calculations for player tanks and moving minions, terrain lookup, and related movement tests in the backend.
- Clarifies the order of applying movement modifiers when the Healer's Speed skill is active.
