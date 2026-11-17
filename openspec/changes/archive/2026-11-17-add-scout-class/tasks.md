# Tasks

## 1. Add Scout Role and Ability Progression

- [x] 1.1 Add Scout to shared role types, lobby selection and validation, and role-specific spawn stats; verify with role-selection and spawn tests.
- [x] 1.2 Register the three Scout abilities with role-restricted skill-point purchases and independent ranks, activation state, and cooldowns; add tests for Scout-only access, invalid purchases, and independent ability state.
- [x] 1.3 Add the three Scout abilities to the in-match HUD using the existing learn, upgrade, and activation controls; verify the displayed ranks and server-confirmed activation state in frontend tests.

## 2. Implement Scout Reconnaissance and Mobility

- [x] 2.1 Implement server-authoritative Weitsicht activation, rank-based range and duration, team vision updates, and expiry; test scaling, shared vision, cooldown rejection, and restoration of base sight.
- [x] 2.2 Implement server-authoritative Offroad-Geschwindigkeit with a rank-scaled grass-only movement bonus and expiry; test grass and non-grass movement, scaling, cooldown rejection, and restoration of terrain-adjusted speed.

## 3. Implement Schockschuss and Verify Integration

- [x] 3.1 Implement Schockschuss projectile hits and rank-scaled movement immobilization without suppressing fire; test hits, misses, continued firing, blocked movement, expiry, and cooldown rejection.
- [x] 3.2 Run the relevant backend and frontend test suites and verify the Scout role, synchronized ability state, and all three effects together in a match.
