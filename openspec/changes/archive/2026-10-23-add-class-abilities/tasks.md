# Tasks

## 1. Shared Ability Model and Progression

- [x] 1.1 Define stable IDs and role availability for all six abilities, add per-ability synchronized state, and apply shared level/cooldown scaling; verify `npm test --workspace=shared` covers catalog validity, independent levels, and level scaling.
- [x] 1.2 Update ability purchases to require an ability ID and validate role access, skill points, and the 0–10 level range; verify `npm test --workspace=backend` covers independent purchases and rejects invalid or unavailable IDs without state changes.
- [x] 1.3 Repair the Healer Speed main spec's malformed section structure and verify `openspec show "healer-speed-skill" --type spec` parses all four requirements.

## 2. Authoritative Backend Effects

- [x] 2.1 Update activation handling to require an ability ID and use that ability's own learned state and cooldown; verify backend ability tests cover each role's two abilities, simultaneous independent cooldowns, and rejected locked/cooling-down activations.
- [x] 2.2 Implement Healer Speed and Tank Entrench in authoritative movement updates, including expiration and strongest-only Tank damage reduction; verify backend tests cover movement multipliers, immobility, expiration, and non-stacking Shield/Entrench damage.
- [x] 2.3 Implement Homing Rocket target validation, launch damage, tracking, impact, and target-loss cleanup; verify backend tests cover every supported enemy type, range/team/liveness rejection, progression-scaled damage, pursuit, impact once, and no retargeting after target loss.

## 3. Multi-Ability HUD and Target Selection

- [x] 3.1 Display both role abilities with independent locked/level/active/cooldown states and separate learn/upgrade controls; bind the primary ability to Space and the secondary to E; verify frontend tests cover role-specific ability rendering and independent HUD state.
- [x] 3.2 Add Homing Rocket target-selection mode with valid-target activation, invalid-click handling, and cancellation that cannot issue regular move/attack commands; verify frontend tests cover target clicks, Escape/right-click cancellation, and command isolation.

## 4. Integration Verification

- [x] 4.1 Run `npm test` and `npm run build` from the repository root; resolve failures and verify all shared, backend, and frontend packages pass with the synchronized ability schema and message payloads.
