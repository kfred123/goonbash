## Context

GoonBash's authoritative backend is a Colyseus room (`GameRoom.ts`) with plain, schema-typed state (`shared/src/state/Tank.ts` etc.) and small, unit-tested pure helper modules (`combat.ts`, `lobbyControls.ts`). The frontend (`GameScene.ts`, Phaser) renders state updates and translates input into room messages. Today `Tank.role` exists as a string field but is never set by the player and has no gameplay effect; there is no lobby role picker and no ability/HUD system. Older `openspec/specs/damagedealer-role`, `healer-speed-skill`, and `homing-rocket-ability` describe a different, Godot-era design (per-role ultimates, homing projectiles) that was never ported to the current TypeScript/Colyseus/Phaser stack and is out of scope here; this change establishes the real, current foundation instead.

## Goals / Non-Goals

**Goals:**
- Let each player pick exactly one role (`healer`, `tank`, `damagedealer`) in the waiting lobby, synced like the existing team selection, changeable until the host starts the match, defaulting sensibly if unset.
- Apply role-driven base stats and a distinct visual (color/shape) when a tank spawns/renders.
- Provide one shared, server-authoritative ability slot per player: a single cooldown, a single "activate" message, and a `role`-based dispatch to the correct effect (heal aura / shield / rapid-fire).
- Surface the ability in a bottom-screen HUD element with icon, cooldown fill, and an activation control (keybind + click), following the existing pattern of small pure functions + unit tests for gameplay logic.

**Non-Goals:**
- Homing/targeted projectile abilities, multiple abilities per role, or ability upgrades/leveling (left for a later refinement, per the user's request to iterate later).
- Rebalancing base combat stats (`fireRange`, `fireDamage`, `fireCooldownMax`) beyond what's needed to make roles feel distinct; exact numbers are placeholders to tune later.
- Reconciling/removing the legacy Godot-era role specs; that cleanup is a follow-up change.

## Decisions

1. **Single shared ability field set, dispatched by role** — Add `abilityCooldown`/`abilityCooldownMax`/`abilityActiveUntil` (or similar) fields to `Tank` plus a `role`-keyed pure-function map (`resolveAbilityEffect(role, ...)` in a new `ability.ts`, mirroring `combat.ts`) instead of three separate per-role schemas.
   - *Alternative*: Bespoke fields per role (`shieldActiveUntil`, `healAuraActiveUntil`, `rapidFireActiveUntil`).
   - *Why*: One generic slot keeps `Tank` schema small, makes the HUD/activation code role-agnostic, and matches the "one ability per role" scope; role-specific magnitude (heal rate, damage reduction %, fire-rate multiplier) is looked up from a small `ROLE_ABILITY_CONFIG` table keyed by role.
2. **Role selection reuses the team-selection message pattern** — Add a `selectRole` room message validated by a new pure `canChangeRole(phase, role)` function in `lobbyControls.ts` (mirroring `canChangeTeam`), stored as `player.role` and synced automatically via Colyseus schema.
   - *Why*: Consistent with existing host/team control conventions in the same file; keeps validation logic unit-testable without a running room.
3. **Damage reduction and heal application live in `combat.ts`-style pure functions** — e.g. `applyIncomingDamage(hp, damage, damageReductionRatio)` and `applyHealing(hp, maxHp, healPerSecond, deltaSeconds)`, called from `GameRoom`'s tick loop, so the Tank shield check happens where damage is currently applied and the Healer aura check happens where positions/HP are already iterated each tick.
   - *Alternative*: Have the ability itself mutate state directly.
   - *Why*: Matches existing separation of pure logic (testable, no Colyseus dependency) from the room's stateful tick, as already done for movement/combat.
4. **Visual distinction is a client-side color/shape lookup keyed by `role`** — `GameScene.ts` picks a fill color and a simple shape variant (e.g. circle for healer, square for tank, triangle/diamond for damagedealer) purely from `tank.role`, no new network fields.
   - *Why*: `role` is already synchronized state; no protocol change needed for rendering.
5. **HUD ability bar is a fixed-position DOM/Phaser overlay bound to the local player's own tank** — shows icon (per role), a radial/linear cooldown mask, and listens for a dedicated key (e.g. `Space`) or a click, sending the same `activateAbility` message regardless of role.
   - *Why*: Single input path server-validates cooldown and role; avoids client trusting local cooldown state for anything but UI feedback.

## Risks / Trade-offs

- **Risk: Generic ability slot under-fits future multi-ability roles** → Mitigation: keep `ROLE_ABILITY_CONFIG` and `resolveAbilityEffect` structured so adding a second slot/ability later is additive, not a rewrite; explicitly called out as future refinement in the proposal.
- **Risk: Healer aura requires iterating nearby allies every tick while active, adding tick cost** → Mitigation: only scan allies while `abilityActiveUntil` is in the future for at least one healer, and reuse existing per-tick entity iteration rather than a new loop.
- **Risk: Players confused by identical base tank shape aside from color (accessibility)** → Mitigation: use both color and shape (not color alone) per the proposal, and keep the legend/labels visible in the lobby role picker.
- **Risk: Server/client cooldown drift makes the HUD show "ready" slightly before the server accepts activation** → Mitigation: server remains source of truth and rejects/no-ops early activation; client reconciles cooldown from synced state on the next update rather than trusting its own timer.

## Migration Plan

- Additive schema fields on `Tank` (role becomes meaningful, new ability fields) — no breaking change to existing state consumers since `role` already exists and defaults are backward compatible (`"grunt"` remains a safe default until a role is explicitly picked, or is replaced with a default of `"tank"`/`"damagedealer"` — to confirm in tasks).
- No data migration needed; this is a fresh in-memory room feature with no persistence layer involved.
- Roll back by reverting the change set; no external contracts are versioned.

## Open Questions

- Exact tuning numbers (heal rate/sec, shield damage-reduction %, rapid-fire rate multiplier, ability duration, cooldown length) — left as placeholders for the follow-up refinement pass the user requested.
- Whether unset/default role should remain `"grunt"` (no ability, baseline stats) or force a default of one real role; leaning toward defaulting to `"tank"` for safety, to confirm during implementation.
