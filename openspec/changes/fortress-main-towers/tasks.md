# Tasks

## 1. Main-Base Combat State

- [x] 1.1 Add replicated main-base firing range, damage, cooldown, and current-target state, using the agreed values and verify defaults with shared tests.
- [x] 1.2 Include living main bases in authoritative nearest-enemy targeting during started matches, create shots from the cannon muzzle, and verify range, damage, cooldown, target-loss, destroyed-base, and match-end behavior with backend tests.

## 2. Fortress Rendering

- [x] 2.1 Replace the main-base rectangle with a team-colored crenellated keep and central rotating cannon, preserve the health bar, and verify the frontend build succeeds.
- [x] 2.2 Aim each cannon toward its replicated target and display a firing effect aligned with replicated projectile direction; verify aim calculations with frontend tests and confirm projectiles visibly originate from the muzzle.

## 3. Integration Verification

- [x] 3.1 Run `npm test` and `npm run build` from the repository root and verify all workspaces pass.
