## Why

GoonBash tanks currently all play identically (`role` defaults to a generic `"grunt"` and has no gameplay effect). Team-based combat needs differentiated roles so players can coordinate: someone keeps the team alive, someone soaks damage, and someone deals it. This proposal introduces a first, intentionally simple role system (Healer, Tank, Damagedealer) with lobby selection, visual distinction, and one HUD-activated special ability per role, as a foundation to refine later.

## What Changes

- Add a role picker to the waiting lobby (`Spiel_lobby`) so every player chooses Healer, Tank, or Damagedealer before the match starts; the choice is synced to all clients and can be changed until the host starts the match.
- Give each role a distinct in-game appearance (color/shape) so tanks are visually identifiable at a glance during combat.
- Add a bottom-of-screen HUD ability slot showing the local player's role-specific special ability, its cooldown, and an activation control (key press / click).
- Implement one special ability per role:
  - **Healer**: Area heal-over-time that heals the caster and nearby allied tanks for a fixed rate per second over a fixed duration.
  - **Tank**: Temporary damage-reduction shield that lowers incoming damage for a fixed duration.
  - **Damagedealer**: Temporary rapid-fire buff that increases the caster's fire rate for a fixed duration.
- All three abilities share a common cooldown/activation mechanism (single ability slot, server-authoritative timing) so future roles/abilities can reuse it.

## Capabilities

### New Capabilities
- `role-selection`: Lobby UI and server state for choosing/syncing a player's role (Healer, Tank, Damagedealer) before match start.
- `role-visual-distinction`: Per-role visual appearance (color/shape) applied to tanks in the game world and lobby preview.
- `ability-hud`: Bottom-screen HUD element that shows the local player's special ability icon, cooldown, and lets them trigger it.
- `healer-aura-ability`: Healer's area heal-over-time special ability (self + nearby allies).
- `tank-shield-ability`: Tank's temporary damage-reduction shield special ability.
- `damagedealer-rapidfire-ability`: Damagedealer's temporary fire-rate buff special ability.

### Modified Capabilities
- `client-lobby-menu`: The waiting-lobby state gains a role selection control per player alongside the existing team controls.

## Impact

- Backend: `shared/src/state/Tank.ts` (`role` field gains meaningful values + base stat/visual mapping), `backend/src/rooms/GameRoom.ts` / `combat.ts` (role-aware stat application, ability cooldown/effect resolution, damage reduction and heal application), lobby room code (role selection message + sync, e.g. `backend/src/rooms/lobbyCommands*`).
- Frontend: `frontend/src/GameScene.ts` (per-role tank rendering, ability HUD element, ability activation input, cooldown/visual feedback for shield/heal/rapid-fire), lobby UI (role picker alongside team picker).
- This is an initial, intentionally simple version; existing legacy `damagedealer-role` / `healer-speed-skill` / `homing-rocket-ability` specs describe a prior, more elaborate (unimplemented) design and will be reconciled or superseded in a follow-up change once this foundation lands.
