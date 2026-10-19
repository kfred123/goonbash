# Tasks

## 1. Shared terrain and sight model

- [x] 1.1 Reconcile current main-base/tower code and overlapping active change requirements, then extract the existing arena dimensions, lane anchors, and road widths into shared definitions reused by road rendering; verify existing lane, tower placement, and cannon tests still pass and streets retain their original geometry.
- [x] 1.2 Add independent replicated sight ranges to tanks, minions, lane towers, and bases and explicit role sight defaults (182/169/208, minion 130, structures 325); wire role initialization and preserve sight through progression and respawn; verify schema/default, role-stat, progression, and respawn tests, including firing-range changes that do not alter sight.
- [x] 1.3 Implement pure shared road/grass classification and direct sightline terrain-length accounting with merged round-corridor intervals; add tests for road edges, caps, joins, overlapping roads, tangent rays, zero-length rays, and bounds; verify the targeted shared tests pass.
- [x] 1.4 Implement observer budget penalties and the union of living allied observers; test 200-unit all-road range, the 80-road-plus-60-grass boundary, 50-unit all-grass range, intervening grass, inclusive cutoffs, overlapping allied sight, observer death/removal, destroyed structures, and respawn; verify deterministic shared tests pass.
- [x] 1.5 Register new shared tests in the existing test script if its explicit test list requires it and document the absolute sight table, shared vision, road-border classification, and quarter-range all-grass example in the existing gameplay documentation; verify the workspace test command includes the new cases and the documentation matches numerical fixtures.

## 2. Authoritative visibility-aware gameplay

- [x] 2.1 Integrate current team-vision queries into room state transitions and simulation decisions, invalidating observer data after movement, spawning, death, respawn, disconnect, or team change; verify backend tests show no dead-observer or previous-position vision is reused for a later decision.
- [x] 2.2 Filter automatic target selection and each new shot for tanks, minions, towers, and bases by current team visibility while retaining firing-range checks, lock priority, and passive movement semantics; verify tests cover hidden nearest enemies, ally-provided sight, no range extension, tower/base shots, and minions resuming their lane.
- [x] 2.3 Validate attack-target commands against visibility and clear locked/current targets before hidden-target pursuit or new firing; send a non-position-bearing invalid-target rejection for concealed IDs; verify tests cover forged hidden IDs, stale commands, lock loss, no last-position chase, and continued movement commands into dark ground.
- [x] 2.4 Gate rocket activation on current team visibility without consuming cooldown on rejection, while keeping already-fired ordinary shots and rockets independent of later visibility; verify ability/combat tests cover loss before activation, loss after launch, impact damage, target death, and unchanged defensive reductions and statistics.
- [x] 2.5 Document sight-limited attack/lock behavior and the retained full-state replication limitation in the existing gameplay/developer documentation; verify wording distinguishes normal-client concealment and server command validation from network data redaction.

## 3. Arena concealment and fog presentation

- [x] 3.1 Add testable frontend visibility policy helpers using shared terrain and sight rules and the local player's team; cover unknown team, dead local tank with surviving allies, enemy ruins, and canonical versus interpolated positions; register these tests in the frontend script and verify they pass.
- [x] 3.2 Apply visibility after state upserts and scene updates to complete tank/minion/base/tower presentation, including names, health bars, cannons, role effects, muzzle flashes, and late tween callbacks; verify focused presentation tests and a two-team visual check show no orphan labels, stale flashes, or replayed hidden shots.
- [x] 3.3 Exclude concealed enemies from attack/rocket hit tests and remove hidden-target attack markers and position following; handle server invalid-target rejections with visible feedback; verify input tests cover hidden ground clicks, stale attack and rocket requests, and unchanged friendly-click behavior.
- [x] 3.4 Add a reusable world-space dimming overlay from the shared visibility field, initially sampling at 8-unit spacing and applying 0.6 black alpha to unrevealed terrain; verify tests measure a maximum 12-world-unit contour error and manual camera/grass-transition checks show normal brightness only in revealed areas.
- [x] 3.5 Apply projectile presentation rules without changing simulation: show allied projectiles and only currently revealed enemy projectile positions, with no concealed enemy target markers or leaking trails/impact effects; verify focused tests and a visual in-flight fog transition check.
- [x] 3.6 Wire fog/effect lifecycle cleanup on arena teardown, room leave, menu return, results, and scene shutdown; document current-vision-only darkness and presentation rules; verify repeated join/leave checks leave no stale textures, callbacks, masks, or enemy presentation.

## 4. Read-only minimap

- [x] 4.1 Add pure world-to-minimap projection and responsive layout helpers for a 4:3 full-arena overview; verify tests for all arena corners, center, camera independence, resize, HUD/title avoidance, and small viewports.
- [x] 4.2 Render simplified grass/roads, the shared fog field, small blue/red team dots for living tanks/minions and intact towers/bases, and a local-player outline; verify tests and two-team visual checks cover distant allies, enemy reveal/concealment, destroyed towers, death, respawn, and no remembered enemy dots.
- [x] 4.3 Isolate the minimap rectangle from movement, attack, rocket selection, and camera commands and attach it to arena lifecycle cleanup; verify input tests and repeated match entry show no world commands from minimap clicks and exactly one fresh minimap.
- [x] 4.4 Document minimap dot colors, local-player outline, read-only controls, and fog behavior in the existing gameplay documentation; verify documentation agrees with the implemented HUD and visibility cases.

## 5. Cross-system acceptance

- [x] 5.1 Run the root workspace test command and build plus any existing backend type-check command, verifying shared exports/schema consumers and affected combat, abilities, progression, respawn, cannon visuals, and results behavior; resolve only regressions introduced by this change.
- [x] 5.2 Exercise live two-client matches for both team views, concealed target rejection, dark-ground movement and menu reentry; use deterministic authoritative-room and Phaser fixtures for roads/grass, allied spotting, scout death, tower destruction, lock loss, stale rocket activation, in-flight impacts and local death/respawn; verify arena, minimap and combat agree across these checks.
- [x] 5.3 Profile a normal 10-player match and a minion-heavy scene, checking fog refresh work, scene responsiveness, and resource stability across repeated entry/exit; optimize reuse, observer bounds, and refresh cadence without relaxing exact targeting/concealment or the 12-unit contour bound.
- [x] 5.4 Verify coordinated local frontend/backend/shared release builds using fresh live rooms and review the documented full-version rollback path; confirm existing lobby and final scoreboard regression tests remain unchanged. Production deployment is not part of applying this change.
