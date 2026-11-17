# Tasks

## 1. Shared Ability and Barricade State

- [x] 1.1 Replace Tank Entrench with the Barricade ability in the shared catalog, retain its existing slot, define the 60-second lifetime and 90-second base cooldown, and verify rank scaling stays above the lifetime with shared ability tests.
- [x] 1.2 Add and export the replicated Barricade entity and match-state collection with owner, team, position, orientation, health, and expiration fields; verify schema serialization and state replication tests.

## 2. Authoritative Placement and Lifecycle

- [x] 2.1 Implement server-authoritative placement validation for learned state, cooldown, match state, the 180-unit initial placement range, road position, lane alignment, and overlap; verify valid and rejected placement tests, including that rejection does not start cooldown.
- [x] 2.2 Implement barricade expiration, normal-attack damage, destruction, and team-visibility projection; verify lifetime, early destruction, persistent cooldown, and visibility tests, and tune an initial health value.

## 3. Movement and Combat Integration

- [x] 3.1 Extend the swept movement collision solver to handle oriented barricades for Tanks and Minions on both teams while allowing movement around the ends; verify crossing, endpoint, and team-independent collision tests.
- [x] 3.2 Add visible enemy barricades to normal target acquisition and locked targeting, and damage only a projectile's designated barricade target; verify automatic targeting, friendly-target rejection, damage, destruction, and pass-through tests.

## 4. Client Placement and Presentation

- [x] 4.1 Add Barricade placement mode to the existing Tank ability slot and key, send a ground target only on selection, and support cancellation without moving or attacking; verify HUD and click-control tests.
- [x] 4.2 Render replicated visible barricades and remove them on expiration or destruction; verify rendering follows state and does not expose barricades outside their visibility rules.

## 5. Integration Verification

- [x] 5.1 Run the focused shared, backend, and frontend tests for ability progression, placement, collision, combat, and presentation together; verify the replacement works end to end and Shield and Protection Dome remain unchanged.
