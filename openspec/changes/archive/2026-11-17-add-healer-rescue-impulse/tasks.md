# Tasks

## 1. Shared Ability Contract

- [x] 1.1 Register `healer-rescue-impulse` with Healer role, 20-second base cooldown, 18 HP base healing, and append it as the Healer's third ability; extend shared tests to verify role ordering and rank-1/rank-10 healing and cooldown scaling.

## 2. Authoritative Healing

- [x] 2.1 Handle Rescue Impulse activation on the server by validating the active match, Healer role, learned ability, cooldown, and a living, visible allied player tank or minion within 250 units; add tests proving invalid requests do not heal or start cooldown.
- [x] 2.2 Apply rank-scaled instant healing without exceeding current maximum HP and start cooldown only after successful validation, including self-targeting and full-HP targets; add tests for exact-range targeting, rank scaling, health capping, and independent ability state.

## 3. Healer Target Selection and Documentation

- [x] 3.1 Add Healer Rescue Impulse to the R shortcut and implement exclusive ally-target selection, confirmation, invalid-click retention, and Escape/right-click/same-ability cancellation; extend frontend tests to verify selection behavior and no movement or attack command leakage.
- [x] 3.2 Document the Healer's third ability, target rules, healing values, and cancellation controls in `README.md`; verify the instructions match the HUD behavior.

## 4. Integration Verification

- [x] 4.1 Run the relevant shared, backend, and frontend test suites and verify a Healer can learn, target, and activate Rescue Impulse while other roles cannot purchase it.
