# Proposal

## Why

Lane towers currently occupy the middle of the road. Each existing defensive checkpoint should instead be framed by two towers facing each other across the lane, with both structures standing entirely on grass and the road remaining clear.

## What Changes

- Replace every existing lane tower with two independently functioning towers of the same owning team, one on each side of the road.
- Preserve the existing two longitudinal checkpoints per team per lane, at 20% and 40% of the lane path measured from that team's base.
- Increase the match total from 12 to 24 lane towers: four per team per lane, grouped into two opposing roadside pairs.
- Derive lateral offsets from the shared lane geometry, rendered road border, and scaled tower footprint so neither structure overlaps the road.
- Preserve tower stats, targeting, destruction, and existing terrain-based vision rules; each additional tower participates normally.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `lane-towers`: Replace centerline placement with same-team pairs on opposite grass verges at each existing checkpoint, including the new tower count.
- `game-backend`: Keep tower placement derived from shared minion lane paths while placing towers beside, rather than on, those paths.

## Impact

- `backend/src/rooms/towerPlacement.ts` and its tests: paired position generation, stable side identity, geometry and count assertions.
- `backend/src/rooms/GameRoom.ts`: unique entity IDs for both sides of every checkpoint.
- Shared lane geometry and world-scale dimensions: reuse road-border and footprint measurements; add only geometry support needed for deterministic placement.
- Existing client entity rendering, click targeting, minimap, visibility replication, combat, and ruins must work for all 24 independently identified towers at their authoritative positions.
- No new dependencies or network schema fields are expected. This intentionally doubles defensive entities and changes their terrain-dependent vision and combat coverage without changing per-tower balance values.
