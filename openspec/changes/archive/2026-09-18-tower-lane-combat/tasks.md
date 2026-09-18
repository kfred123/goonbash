## 1. Combat Configuration

- [x] 1.1 Create `shared/src/config/CombatConfig.ts` exporting spawn interval, mob speed/hp/damage/attackRange, and tower hp/damage/attackRange as named constants
- [x] 1.2 Export `CombatConfig` from `shared/src/index.ts`

## 2. Shared Schema Changes

- [x] 2.1 Add `Tower` schema type (`shared/src/state/Tower.ts`) extending `Entity` with `hp`, `maxHp`
- [x] 2.2 Rename `Base` usages to `Tower` (or replace `Base` with `Tower`) across `shared/src/state/GameState.ts` (`bases` map → `towers` map)
- [x] 2.3 Extend `Minion` schema with `hp`, `maxHp`, `damage`, `attackRange`, `speed` (already present), `lane`, `targetId`, and a waypoint index/list reference
- [x] 2.4 Define lane waypoint data structures (top/mid/bottom paths per team), e.g. `shared/src/state/Lanes.ts`
- [x] 2.5 Update `shared/src/index.ts` exports for new/renamed types

## 3. Backend Game Loop

- [x] 3.1 Update `GameRoom.createBase`/tower creation to use `Tower` and `CombatConfig` values, spawning one tower per team (left/right)
- [x] 3.2 Replace `spawnWave` with per-lane spawning: every `CombatConfig.spawnInterval`, spawn one mob per lane per team, initialized with that lane's waypoint path and `CombatConfig` mob stats
- [x] 3.3 Implement nearest-enemy-in-range targeting: each tick, for every mob, scan opposing-team mobs/towers/tanks within `attackRange`, set `targetId` to the closest
- [x] 3.4 Implement combat resolution: apply mob damage to its current target each tick; remove mobs whose `hp` reaches 0; mark towers destroyed whose `hp` reaches 0
- [x] 3.5 Implement movement-vs-combat state: mob moves along lane waypoints only when it has no target; stops and attacks when it has a target
- [x] 3.6 Implement resume-path behavior: when a mob's target is cleared (dies/out of range), continue movement from current position toward the next unvisited waypoint
- [x] 3.7 Implement tower-as-final-target: when a mob reaches the last waypoint (enemy tower position), set the tower as its target and resolve combat until tower destroyed

## 4. Frontend / Client Updates

- [x] 4.1 Update any client code referencing `state.bases`/`Base` to use `state.towers`/`Tower`
- [x] 4.2 Add/update rendering for tower health and mob health bars if client already renders minions/bases

## 5. Testing

- [x] 5.1 Add/update backend tests for tower spawning, per-lane mob spawn cadence, and lane assignment
- [x] 5.2 Add/update backend tests for nearest-enemy targeting (including target switching when a closer enemy appears)
- [x] 5.3 Add/update backend tests for combat damage application, mob death/removal, and tower destruction
- [x] 5.4 Add/update backend tests for resume-path behavior after combat ends
- [x] 5.5 Verify `CombatConfig` values can be changed and are reflected in behavior without further code changes (e.g. a config-driven test)

## 6. Validation

- [x] 6.1 Run `openspec validate tower-lane-combat --strict` and fix any issues
- [x] 6.2 Run backend/shared/frontend build and test suites to confirm no regressions
