# Design

## Context

See `proposal.md` for motivation and scope. The game uses a shared TypeScript ability registry and Colyseus schemas, an authoritative `GameRoom`, and a Phaser `GameScene`. Ability levels already range from 0 to 10, and the shared registry drives role eligibility and purchases.

The current projectile path always resolves an entity `targetId`, so it cannot represent an empty-ground shot. `GameRoom.applyDamage` already implements tank mitigation, kill XP, scoreboard attribution, tower ruins, and base destruction. These effects must remain the only damage/death pipeline.

`VisibilitySerializer` creates per-client state projections and strips concealed entity references. The frontend HUD, keyboard labels, slot placement, and resize logic currently assume exactly two abilities. Those assumptions, not the progression model, need extension.

## Goals / Non-Goals

**Goals:**
- Keep the ability registry, launch-time damage snapshot, server simulation, client aiming preview, and rendered blast radius consistent.
- Introduce ground targeting without relaxing entity-target validation for rockets or ordinary attacks.
- Separate physical ground position from visual shell elevation so presentation cannot affect collision or fog checks.
- Make a third ability accessible without overlapping progression controls or changing existing shortcuts.

**Non-Goals:**
- Real ballistic physics, terrain collision, destructible terrain, homing, damage-over-time, splash falloff, knockback, friendly fire, or camera/minimap navigation changes.
- A general-purpose ability scripting engine, redesigned damage framework, or new asset dependency.
- Changes to existing role stats, ability balance, sight ranges, or XP rules.

## Decisions

### 1. Extend the existing ability registry and progression

Register `damagedealer-mortar` after the two existing Damagedealer abilities. Use the existing skill-point purchase path and independent `AbilityState`; do not add a parallel unlock mechanism. Its initial configuration is radius 120, range 900, flight duration 1500 ms, base cooldown 24000 ms, building multiplier 3, and magnitude `2 + 0.2 * (level - 1)`. Apply the existing cooldown rule: `round(24000 * max(0.5, 1 - 0.03 * (level - 1)))`, giving 17520 ms at rank 10.

Add explicit optional configuration fields for flight duration and building multiplier rather than overloading active-effect duration or projectile speed. Share configuration through existing exports. Capture fire damage, ability magnitude, building multiplier, radius, and flight duration at launch so upgrades or level-ups during flight do not retroactively change a shot.

Alternative: make Mortar an automatically available ultimate. Rejected because all current abilities must be explicitly learned.

### 2. Use an explicit, exclusive targeting mode

Replace the rocket-only boolean with a discriminated selection state for no selection, rocket entity selection, or Mortar ground selection. Bind the third role index to `R`; retain `SPACE` and `E`. Repeated keydown events must not toggle modes. Selecting the active targeting ability again, Escape, or right-click cancels; switching to another eligible ability cancels the previous selection first.

During Mortar selection, show a 900-unit range ring and a 120-unit cursor-centered blast preview using camera-correct world coordinates. Allow dark terrain, occupied terrain, and the shooter's own point; preview validity depends only on finite in-world coordinates and range, not entity hit testing or sight. Invalid clicks show a clear hint and remain in selection mode without sending movement or attack commands. HUD and minimap clicks must not confirm a shot. Death, match exit/end, and scene teardown clear targeting graphics.

Drive mouse-cursor presentation from the same selection state: Rocket uses a red crosshair, Mortar a recognizable bomb silhouette, and no selection restores the ordinary cursor behavior. These replace, rather than accompany, the normal pointer. Generate lightweight cursor artwork locally with a contrasting outline so it remains visible over terrain, fog, and HUD; use a centered crosshair hotspot and an explicit bomb hotspot aligned with the actual selected point. Prefer Phaser/browser custom cursor support without adding an asset dependency. Apply the selection cursor consistently across the game canvas, including interactive controls that normally request a hand cursor, without changing their hit testing or click behavior. Cursor coordinates remain screen-space and must not drift with camera movement or zoom; Mortar's world-space blast preview remains additional feedback rather than a replacement for the bomb cursor.

Switch the cursor immediately when switching targeting skills, keep it while invalid clicks leave selection active, and restore normal cursor behavior on confirmation, cancellation, switching to a non-targeting ability, death, match end, leave, or scene shutdown. Leaving and reentering the canvas must not leave a hidden or stale cursor; the surrounding page retains its ordinary pointer. A rejection after confirmation must not reactivate a targeting cursor unless selection is explicitly reentered.

Create slots from the role's registry list and centralize index-to-shortcut and slot-position calculation. Update creation, role refresh, resize, destruction, and icon drawing together. Use a compact responsive layout for three abilities while retaining every role's progression controls.

Alternative: repurpose `E` or replace Rocket. Rejected because the requested skill is additional.

### 3. Validate ground coordinates independently on the server

Extend the existing `activate_ability` payload with `targetX` and `targetY` for Mortar, keeping Rocket's `targetId` contract unchanged. Resolve the shooter exclusively from the sending session. Validate phase, living state, role, learned rank, cooldown, finite numeric coordinates, closed arena bounds (`0..WORLD_WIDTH`, `0..WORLD_HEIGHT`), and inclusive Euclidean distance <= 900 from the authoritative launch position.

Do not clamp or auto-walk out-of-range shots: rejection must preserve the intended landing point and existing commands. Do not consult visibility or require an entity at that point. Only after validation succeeds, create a shell and start that ability's cooldown.

Extend the existing typed invalid-target feedback to identify Mortar and rejected launch reasons. A rejected Mortar request must generate actionable requesting-client feedback rather than silent failure, including stale cooldown, death, or match-state rejections. The client must not indicate launch success until authoritative state confirms it.

Alternative: use the ordinary `command` message or a fake target entity. Rejected because those paths imply pursuit, target visibility, or entity lifetime.

### 4. Add a ground-projectile branch, not another combat system

Extend `Projectile` with a Mortar discriminator and the ground-shot presentation data needed by clients, such as fixed landing coordinates, normalized flight progress, and blast radius. Keep canonical origin/timing/snapshot metadata server-side, keyed by projectile ID, and remove it with the projectile. Preserve existing normal and homing fields and behavior.

Process Mortar before resolving entity targets. Advance it using elapsed simulation time over 1500 ms, including a shot whose origin equals its destination. Ground coordinates interpolate along the fixed path. A separate client-side height curve, for example `4 * peakHeight * progress * (1 - progress)`, produces an apparent arc and ground shadow. No intercept collisions or retargeting occur.

At the first simulation step reaching the flight duration, resolve one explosion and remove the shell and metadata. The shell survives shooter death. Match completion stops further shell damage and clears all pending shell metadata through the existing cleanup paths. Do not interpret every replicated projectile removal as an explosion: fog culling and match cleanup also remove projectiles.

Alternative: reuse Homing Rocket with a stationary invisible target. Rejected because it introduces fake entities, visibility problems, and dependence on the target-lost path.

### 5. Resolve splash through the established damage path

At impact, collect current living enemy tanks, minions, towers, and bases whose centers are at distance <= 120 from the fixed landing point. Do not use launch-time occupants, visibility filtering, hitbox overlap, or a falloff curve. Damage each eligible entity at most once.

Snapshot damage is `launchFireDamage * (2 + 0.2 * (launchAbilityLevel - 1))`; multiply by 3 only for towers and bases. Pass the resulting amount and original owner ID through `GameRoom.applyDamage`. This preserves shield/entrench mitigation, HP clamping, XP, kills, damage statistics, ruins, and match completion. Stop further processing if a base death ends the match, following existing terminal-phase behavior.

Alternative: subtract HP directly or use target-radius overlap. Rejected because direct HP edits bypass important effects and overlap rules make the blast preview inaccurate.

### 6. Keep shell and impact presentation fog-safe

Extend `VisibilitySerializer` to copy the new fields explicitly. Allies may receive their shell's intended destination in fog; enemies receive a shell only when its ground position is currently visible, with concealed owner references redacted as today. Concealed launch/destination coordinates must not be exposed through enemy-only trajectory metadata; enemies can render from the current ground position and flight progress. No shell becomes a vision observer.

Send an explicit transient `mortar_impact` presentation message once at resolution, carrying only impact position, radius, team, and a unique shot ID. Send it to the firing team regardless of fog and to opponents only when the impact point is currently in their team vision. Never include victim IDs, victim coordinates, hit counts, or hit/no-hit feedback. Keep existing aggregate scoreboard semantics unchanged.

Render an oversized cannonball, shadow, and brief blast. The local aiming preview and allied intended-point feedback must remain legible over fog, but must not clear it. Hidden enemies' sprites, HP bars, minimap dots, and attachments remain hidden after blind damage. Test serialized full states and patches, not merely local sprite visibility.

Alternative: infer impact from projectile removal or broadcast all hit data. Rejected because removal is ambiguous and unconditional impact data can leak concealed combat.

## Risks / Trade-offs

- Initial balance is unproven -> Centralize the proposed numbers and test rank endpoints; tune through a follow-up balance change rather than scattered constants.
- Three slots can crowd narrow displays -> Derive layout from viewport and role ability count, including resize and progression button hit regions.
- Client/server position or cooldown races can reject apparently valid clicks -> Validate again on the server and provide explicit feedback without spending cooldown or altering commands.
- Multiple kills or base destruction during one blast can corrupt accounting -> Use the existing damage path, unique target iteration, and a terminal-phase guard.
- Visibility projections can omit new fields or accidentally leak endpoints -> Add dedicated full-state and patch replication cases for allied, visible enemy, and concealed shots.
- Fog can remove a shell before impact -> Use an explicit impact message rather than a removal-triggered visual.

## Migration Plan

No stored player data needs migration because progression is match-local. Deploy shared schema, backend, and frontend together; verify a fresh match with clients on both teams. Roll back all three packages together if necessary, ending active matches rather than attempting mixed-schema continuation.
