# Design

## Context

See proposal.md for motivation. Minions are 18-unit rectangles snapped to server positions. The existing tank renderer separates movement-facing chassis from target-facing turrets and draws vector primitives with dark outlines.

## Goals / Non-Goals

**Goals:** Match the approved mechanical beetle silhouette at minion scale, show continuous walking between state updates and retain health/target feedback.

**Non-Goals:** No new minion classes, firing rules, movement rules, rings or protocol fields.

## Decisions

- Use a Phaser root container with a ground shadow, rotating body container (legs and hull) and independent cannon. Normalize the approved drawing to an 18-unit nominal footprint instead of enlarging minions to player size.
- Draw the four articulated legs with alternating diagonal pairs. Advance phase by rendered distance (one cycle per 12 world units), not wall time, so slowed movement slows the gait and stationary units do not walk.
- Smooth replicated positions with frame-rate-independent exponential interpolation and a 0.05-unit arrival threshold. Snap the final tiny remainder and return legs to their resting pose. A time-only repeating tween would walk in place between packets and during combat.
- Reuse the existing north-facing heading helper. Body heading follows movement; cannon follows the replicated combat target, retaining its heading without a target. Spawn facing the next waypoint.
- Keep target positions in each visual, not a second scene map. Update minion motion before tank aiming and keep health bars aligned with the rendered position. Removal destroys the entire hierarchy; no timers or tweens require cleanup.
- Reuse the drawing contract for pure drawing/motion tests and add a backend-free Phaser check page exercising actual GameScene integration.

## Risks / Trade-offs

- [Detail disappears at 18 units] -> Large team plate, strong light visor and chunky limbs; enlarged and actual-size previews.
- [Interpolation introduces visual lag] -> Short 45 ms time constant, render-only change, unchanged authoritative movement and click targeting.
- [Idle numerical tails cause walking] -> Explicit arrival threshold and rest pose; distance-based tests across frame rates.
- [Leg geometry leaks or changes collision] -> One owned container hierarchy and unchanged click radius and combat state.
