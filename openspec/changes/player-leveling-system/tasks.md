# Tasks

## 1. Shared Progression Model

- [x] 1.1 Add synchronized level, XP, skill-point, and ability-level state to player tanks; verify shared TypeScript build and schema defaults.
- [x] 1.2 Implement and test pure progression helpers for increasing XP thresholds, multi-level carryover, and role-base HP/damage bonuses; verify shared unit tests cover boundary thresholds and non-compounding stat calculations.
- [x] 1.3 Define and test the initial upgradeable ability catalog and per-level effect calculations, including the level-10 cap; verify shared tests cover unlearned, learned, and maximum-level abilities.

## 2. Authoritative Backend Progression

- [x] 2.1 Award equal fixed XP to every living player in range when a minion or player tank dies; verify backend tests cover both reward amounts, radius boundaries, both teams, and damage-independent awards.
- [x] 2.2 Apply level gains, skill points, and derived role stats through a single server-authoritative progression path; verify backend tests cover multi-level gains and persistence through respawn and role-stat setup.
- [x] 2.3 Add a validated ability purchase message that learns or upgrades available abilities for one skill point; verify backend tests reject missing points, unknown abilities, and upgrades past level 10 without mutating state.

## 3. In-Match Progression HUD

- [x] 3.1 Extend the bottom HUD to display level, XP progress, explicitly labeled unspent skill points (including zero), and available ability levels; verify frontend TypeScript build succeeds and the HUD count updates after level-ups and confirmed purchases.
- [x] 3.2 Add clearly labeled, visually distinct activation and learn/upgrade controls and prevent HUD clicks from issuing movement commands; verify each action sends only its own request, the activation shortcut never purchases upgrades, purchase states are clear, and zero skill points do not block eligible activation.
- [x] 3.3 Append `(Lvl N)` immediately after every visible player's actual name in above-tank labels; verify local and remote labels update on level-up, render `Alex (Lvl 2)`, and preserve the local-player indicator.
- [x] 3.4 Render current-level XP as a progress bar followed by `current XP / required XP`; verify `50 / 200 XP` fills 25 percent, an exact level-up resets the display to `0 / 200 XP`, and overflow displays only the remaining XP within the new level.

## 4. Integration Verification

- [x] 4.1 Run shared and backend test suites plus the frontend production build; verify all progression tests pass and a multiplayer match synchronizes kill rewards, level-ups, stat gains, purchases, and respawns.
