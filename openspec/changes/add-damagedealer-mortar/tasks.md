# Tasks

## 1. Shared Ability and Wire Contracts

- [x] 1.1 Register `damagedealer-mortar` as the third Damagedealer ability, with explicit flight-duration and building-multiplier configuration and the specified rank scaling; extend `shared/src/abilities.test.ts` to verify role ordering, levels 1 and 10, 900 range, 120 radius, 1500 ms flight, 24000/17520 ms cooldowns, and unchanged existing ability values.
- [x] 1.2 Extend the projectile schema and shared exports with Mortar presentation fields while keeping server-only origin/snapshot metadata out of the schema; extend schema/default tests to verify round trips, ordinary projectile defaults, and independent ability initialization.
- [x] 1.3 Define typed Mortar ground-coordinate activation, rejection feedback, and victim-free impact message contracts through the existing shared interfaces/exports; verify client and server type checks accept the expanded contracts without weakening Rocket payload types.

## 2. Authoritative Launch and Projectile Flight

- [x] 2.1 Add pure Mortar point validation and launch-damage helpers using shared configuration; extend `backend/src/rooms/ability.test.ts` to cover exact 900/900.01 range, arena borders, NaN/infinite/missing/string coordinates, zero-distance aim, and rank-1/rank-10 damage examples.
- [x] 2.2 Add the Mortar branch to `GameRoom` activation, snapshot launch values, and begin cooldown only after successful validation; add handler tests for wrong role, unlearned ability, cooldown, dead shooter, inactive match, valid empty ground, occupied ground, and fog-covered ground, asserting explicit rejection feedback and unchanged commands/cooldowns on failure.
- [x] 2.3 Implement fixed-point flight before entity-target lookup using active simulation time and server-only launch metadata; add flight tests proving no impact at 1499 ms, one impact when a tick crosses 1500 ms, no retargeting/interception, correct zero-distance flight, and persistence after shooter death.
- [x] 2.4 Clean up Mortar metadata on impact, projectile removal, match termination, and room disposal using existing lifecycle paths; verify cleanup tests leave no pending shot metadata and no post-match impacts, while normal bullets and Homing Rocket retain their behavior.

## 3. Splash Damage and Existing Combat Outcomes

- [x] 3.1 Resolve current living enemy centers within an inclusive 120-unit blast radius, applying one full hit per entity and the 3x multiplier only to towers and bases through the existing damage pipeline; add combat tests for every entity type, 120/120.01 boundaries, allies, shooter, corpses, ruins, empty areas, and enemies entering/leaving the area during flight.
- [x] 3.2 Preserve launch-time damage and rank despite upgrades or level-ups during flight; verify focused tests with 12 launch fire damage produce 24/72 damage at rank 1 and 45.6/136.8 at rank 10, using floating-point-appropriate assertions, and verify later shots use updated values.
- [x] 3.3 Exercise Mortar through existing mitigation, kill XP, scoreboard attribution, tank death/respawn, tower destruction, and base match-end paths; add integration cases proving multiple deaths are rewarded once and a base-ending blast stops subsequent damage without duplicate outcomes.

## 4. Visibility-Scoped Replication and Impact Delivery

- [x] 4.1 Copy Mortar fields explicitly in `VisibilitySerializer`, retaining full allied shot presentation while suppressing concealed opponent owner references and launch/destination metadata; extend serializer tests to verify allied blind shots, visible opposing shots, hidden shots, and sight-loss transitions.
- [x] 4.2 Deliver one victim-free impact message to allies and only opponents with current sight of the impact point; add room tests proving visible impacts are delivered even after concealed travel, hidden opponents receive no event, and the payload contains no victim IDs, hit counts, or hit/no-hit confirmation.
- [x] 4.3 Extend full-state and patch replication tests to prove blind blast damage does not add hidden entities, HP bars' source data, minimap entities, owner references, or vision observers to an unauthorized client, and that new Mortar fields survive permitted serialization.

## 5. Three-Slot HUD and Ground-Target Controls

- [x] 5.1 Replace fixed two-slot HUD creation, refresh, resize, and destruction assumptions with role-list-driven slots and shared shortcut/layout mapping; extend `frontend/src/abilityControls.test.ts` to verify three Damagedealer controls, SPACE/E/R ordering, independent locked/learned/cooldown/purchase state, and unchanged two-slot roles.
- [x] 5.2 Replace rocket-only targeting state with mutually exclusive Rocket/Mortar selection, add the R binding, and implement cancellation, switching, and repeated-key protection; add control tests covering all entry/cancel paths, no accidental activation or purchases, and unchanged visible-enemy Rocket selection.
- [x] 5.3 Add camera-correct world-point Mortar confirmation and valid/invalid range-and-blast previews that work over fog and ignore entity hit testing; verify controls tests cover camera offset, bounds and range edges, occupied terrain, invalid-click retention, HUD/minimap exclusion, and no move/attack command leakage.
- [x] 5.4 Display server rejection feedback and clean selection/preview state on death, match completion, leave, and teardown; add lifecycle and feedback coverage showing authoritative cooldowns are retained and rejected requests never display a successful launch.
- [x] 5.5 Add a distinctive Mortar HUD icon and update `readme.md` player-facing controls and skill description to document R, ground confirmation/cancellation, blind fire, building effectiveness, and red-crosshair/bomb targeting cursors; verify the documented flow matches the HUD and works at normal and narrow supported viewport sizes after resizing.
- [x] 5.6 Replace the normal pointer with a high-contrast red crosshair during Rocket selection and a bomb-shaped cursor during Mortar selection, deriving cursor state from the exclusive selection mode and preserving the blast preview; add tests verifying entry through HUD/key, immediate cursor switching, persistence over invalid targets and interactive controls, and accurate aiming hotspots.
- [x] 5.7 Restore ordinary cursor behavior on confirmation, cancellation, switching to a non-targeting ability, death, match completion, arena exit, and scene shutdown; add lifecycle tests for each path, rejection after confirmation, and canvas leave/reentry so no stale, duplicate, or hidden pointer remains.

## 6. Shell and Explosion Presentation

- [x] 6.1 Render a large cannonball with a ground shadow and a presentation-only arc derived from flight progress, including allied feedback above fog without clearing it; add visual-helper tests for progress endpoints/midpoint, ground-position visibility checks, and differentiation from ordinary bullets.
- [x] 6.2 Render blast-radius-sized transient explosion effects only from authorized impact messages, not projectile removal; add tests for fog-culling removal, cleanup removal, one effect per shot ID, concealed-enemy presentation, and destruction of shell/shadow/impact objects during teardown.
- [x] 6.3 Include any newly added frontend test files in the existing explicit test runner list in `frontend/package.json`; verify `npm test --workspace=frontend` actually executes their named cases.

## 7. Cross-System Acceptance

- [x] 7.1 Run the shared, backend, and frontend test scripts after their focused cases pass, build shared/frontend with the existing build scripts, and run the backend TypeScript check; verify no regression in existing abilities, progression, combat, or visibility behavior.
- [x] 7.2 Exercise a fresh two-team match: learn Mortar separately, fire through R and HUD at visible and fog-covered ground, observe dodgeable delayed splash and stronger building damage, try invalid/cancelled shots, and verify independent cooldowns and no hidden-enemy reveal from either client.
- [x] 7.3 Check three-slot HUD operation, camera-offset aiming, resize layout, shell arc, blast-radius presentation, death-in-flight, and match-end cleanup in the running frontend; verify all controls remain usable and no orphan targeting or explosion graphics remain. Verify the red Rocket crosshair and Mortar bomb replace the normal pointer, stay legible over terrain/fog/HUD, remain aligned through camera movement/zoom/resize, and restore ordinary cursor behavior on every selection exit and canvas leave/reentry.
