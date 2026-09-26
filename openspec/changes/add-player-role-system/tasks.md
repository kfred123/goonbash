## 1. Shared State & Types

- [x] 1.1 Add `Role` type (`"healer" | "tank" | "damagedealer"`) to `shared/src` and export it
- [x] 1.2 Update `Tank.ts`: give `role` a real default (e.g. `"tank"`) and add ability schema fields (`abilityCooldownEndsAt`, `abilityActiveUntil`, `abilityCooldownMax`)
- [x] 1.3 Add a `ROLE_STATS` config (maxHp, fireRange, fireCooldownMax, fireDamage, move speed) keyed by role
- [x] 1.4 Add a `ROLE_ABILITY_CONFIG` config (cooldown, duration, magnitude per role: heal rate, damage reduction %, fire-rate multiplier)

## 2. Lobby Role Selection (Backend)

- [x] 2.1 Add `canChangeRole(phase, role)` pure function to `lobbyControls.ts` (mirrors `canChangeTeam`)
- [x] 2.2 Add unit tests for `canChangeRole` in `lobbyControls.test.ts` (valid role while waiting, invalid role, change after start)
- [x] 2.3 Add a `selectRole` message handler in `GameRoom.ts` that validates via `canChangeRole` and updates `player.role` (implemented as the `select_role` message, matching existing `change_team`/`rename_lobby` naming convention)
- [x] 2.4 Verify role changes sync to all connected clients via existing schema sync

## 3. Role-Based Spawn Stats (Backend)

- [x] 3.1 Apply `ROLE_STATS` to a tank on spawn and respawn based on `player.role`
- [x] 3.2 Add/update unit tests covering spawn stat application per role

## 4. Ability Activation & Effects (Backend)

- [x] 4.1 Add `resolveAbilityEffect(role, ...)` and cooldown-check pure functions in a new `ability.ts` (combat.ts-style, no Colyseus dependency)
- [x] 4.2 Add `activateAbility` message handler in `GameRoom.ts`: validates role + cooldown, sets `abilityActiveUntil`/cooldown fields
- [x] 4.3 Implement Healer aura tick logic: heal self + allies within radius while active (reuse existing per-tick entity iteration)
- [x] 4.4 Implement Tank shield: apply damage-reduction ratio when `abilityActiveUntil` is in the future, in the damage-application path
- [x] 4.5 Implement Damagedealer rapid fire: reduce effective `fireCooldownMax` while `abilityActiveUntil` is in the future
- [x] 4.6 Add unit tests: heal aura affects only allies in radius, shield reduces damage correctly, rapid fire changes effective fire cooldown, cooldown rejects re-activation, duration expiry reverts effects

## 5. Lobby UI: Role Selection (Frontend)

- [x] 5.1 Add a role picker (Healer/Tank/Damagedealer cards) to the waiting-lobby UI alongside the existing team picker
- [x] 5.2 Wire role card selection to send the `selectRole` message (implemented as `select_role`)
- [x] 5.3 Render each participant's currently selected role in the lobby roster
- [x] 5.4 Style each role card with its role color/shape preview (reuse the same values as in-game rendering)

## 6. Role Visual Distinction (Frontend)

- [x] 6.1 Add a role-to-color/shape lookup in `GameScene.ts`
- [x] 6.2 Update tank rendering to use the role-based color/shape instead of a uniform appearance

## 7. Ability HUD (Frontend)

- [x] 7.1 Add a full-width bottom HUD bar (icon slot + cooldown fill), clearly separated from the arena, bound to the local player's tank/role
- [x] 7.2 Map each role to an iconic vector glyph (wrench = healer, shield = tank, dashed rapid-fire lines = damagedealer), drawn via Phaser Graphics
- [x] 7.3 Bind a dedicated key (e.g. Space) and a click/tap on the HUD icon to send the `activateAbility` message (implemented as `activate_ability`)
- [x] 7.4 Reconcile HUD cooldown display from synced server state (server remains source of truth)
- [x] 7.5 Add basic visual feedback in the game view for active shield/heal-aura/rapid-fire (e.g. tint or particle, minimal effort) (HUD label shows "ACTIVE" while the effect is running)

## 8. Verification

- [x] 8.1 Run backend unit test suite and ensure all new/existing tests pass
- [ ] 8.2 Manual multi-client smoke test: select different roles in lobby, start match, verify visuals differ and each ability triggers its effect
- [ ] 8.3 Update relevant README/docs if lobby or HUD controls are documented elsewhere
