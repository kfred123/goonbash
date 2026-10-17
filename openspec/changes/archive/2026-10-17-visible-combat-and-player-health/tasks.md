## 1. Shared Schema

- [x] 1.1 Add `Projectile` schema class in `shared/src/state/Projectile.ts` (`id`, `x`, `y`, `team`, `ownerId`, `targetId`, `damage`, `speed`)
- [x] 1.2 Add `fireRange`, `fireCooldown`, `fireCooldownMax`, `fireDamage` fields to `Entity` (or to `Tank`/`Minion` individually if fields diverge)
- [x] 1.3 Add `state: "alive" | "dead"` and `respawnAt` fields to `Tank`
- [x] 1.4 Add `@type({ map: Projectile }) projectiles` map to `GameState`
- [x] 1.5 Export `Projectile` from `shared/src/index.ts`

## 2. Backend Combat Resolution

- [x] 2.1 Implement `findNearestEnemyInRange(unit, tanks, minions)` helper that filters out same-team units entirely
- [x] 2.2 Implement per-tick target acquisition for all alive minions and alive tanks in `GameRoom.update()`
- [x] 2.3 Implement fire-cooldown countdown and projectile spawning when a unit has a target and cooldown is ready
- [x] 2.4 Implement projectile movement toward the target's last-known position each tick
- [x] 2.5 Implement projectile-hit detection (distance threshold to target) and damage application to the target's `hp`
- [x] 2.6 Remove projectiles on hit, on target death, or when they exceed a max travel distance/lifetime
- [x] 2.7 Ensure friendly units are excluded from both targeting and projectile-hit checks (no friendly damage, no friendly blocking)

## 3. Player Death & Respawn

- [x] 3.1 Detect when a tank's `hp` drops to 0 or below and transition it to `state = "dead"`, clearing its target and zeroing input
- [x] 3.2 Set `respawnAt = now + <respawn delay>` on death and ignore movement/input messages for dead tanks
- [x] 3.3 Exclude dead tanks from `findNearestEnemyInRange` (both as targets and as shooters)
- [x] 3.4 On each tick, check dead tanks for `now >= respawnAt` and reset `hp = maxHp`, position to the tank's team base, and `state = "alive"`
- [x] 3.5 Add unit tests covering: damage reduces HP, HP reaching 0 triggers death, respawn restores HP/position after the delay

## 4. Frontend Rendering

- [x] 4.1 Add projectile sprite management in `GameScene.ts` (`projectiles.onAdd` / `onRemove`, position updates each frame)
- [x] 4.2 Add a health bar UI element above each tank and minion sprite, updated from `hp`/`maxHp`
- [x] 4.3 Hide/show tank sprite and health bar based on `state` (`dead` vs `alive`)
- [x] 4.4 Stop sending movement input from the client while the local player's tank is dead

## 5. Verification

- [x] 5.1 Manually verify in a local match: minions auto-fire at enemy minions/tanks, tanks auto-fire at enemies, friendly units never get hit or block targeting
- [x] 5.2 Manually verify: a player tank's health bar depletes on taking damage, tank disappears at 0 HP, and respawns at its team base after the delay
- [x] 5.3 Run backend test suite and add/adjust tests as needed for the new combat and respawn logic
