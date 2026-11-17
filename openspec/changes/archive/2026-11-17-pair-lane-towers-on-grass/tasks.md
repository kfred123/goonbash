# Tasks

## 1. Roadside pair geometry

- [x] 1.1 Implement deterministic checkpoint tangent/normal sampling using the existing shared lane geometry; add focused tests for straight and diagonal segments, exact vertices, repeated points, and explicit rejection of unusable geometry, verifying existing point sampling and lane waypoints remain unchanged.
- [x] 1.2 Derive tower clearance from the full rendered border width and a conservative scaled footprint covering the existing outpost, rotating cannon, ruin, and server radius; verify footprint measurements against current artwork and add geometry assertions showing a positive grass gap.
- [x] 1.3 Update `getLaneTowerPlacements` to emit two same-team side-labelled towers per existing checkpoint, preserving the 0.2/0.4 path fractions; replace the old 12-centerline-tower assertions with tests for 24 unique positions, four towers per team per lane, equal opposite perpendicular offsets, correct midpoints, deterministic canonical side labels, full-footprint clearance from every lane, and full-footprint world bounds.

## 2. Authoritative entities and existing behavior

- [x] 2.1 Include side identity in `GameRoom` tower IDs and create independent normal tower entities; add a match-start regression test verifying all 24 entries survive insertion with unique IDs, correct team ownership, expected authoritative coordinates, and unchanged per-tower stats.
- [x] 2.2 Add focused regression coverage for paired towers' independent damage, cooldowns, destruction, and surviving-partner behavior, plus grass-based visibility and attacks using allied spotting; verify a destroyed member remains a ruin at its own grass position and does not disable its partner.
- [x] 2.3 Update directly related tower-placement documentation, including any statements assuming 12 towers or centerline placement; verify the documentation describes two same-team roadside pairs per team per lane and 24 total towers without claiming changed minion routes, tower stats, or terrain rules.

## 3. Integration verification

- [x] 3.1 Run the smallest existing shared/backend test commands covering changed geometry, placement, match initialization, combat, and vision, plus the affected workspace builds/type checks; verify all pass without introducing a network schema dependency.
- [x] 3.2 Inspect a started match for both teams on all three lanes: verify two opposing grass towers at every previous checkpoint, a clear road including borders on diagonal approaches, correct health bars and click targets, distinct minimap dots under existing visibility rules, independent cannon feedback, and ruins staying at the destroyed towers' authoritative positions.
