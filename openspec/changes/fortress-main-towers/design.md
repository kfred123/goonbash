# Design

## Context

See `proposal.md` for motivation and `specs/` for the observable requirements. Main bases currently carry only health state and are drawn as rectangles. Lane towers, minions, and player tanks already participate in authoritative server-side targeting and projectile combat; projectiles and tower target IDs are replicated to clients.

## Goals / Non-Goals

**Goals:**
- Reuse the existing targeting, cooldown, projectile, and damage flow for main-base attacks.
- Make each base's target and shot direction legible in the top-down arena view.
- Preserve existing base destruction and match-ending behavior.

**Non-Goals:**
- Changing lane-tower or player-tank combat stats or behavior.
- Adding new art dependencies or changing the arena perspective.
- Rebalancing base health, movement, or match-ending rules.

## Decisions

- **Treat main bases as authoritative shooters.** Give base state the combat values and current target needed for the same nearest-enemy selection used by other automatic shooters. Include living bases in the server shooter update, with a 250-unit range, 24 damage, and a 1,200 ms cooldown. Reuse existing projectile resolution rather than applying damage directly at fire time. This keeps hit timing and damage server-authoritative; a separate base-only attack system would duplicate combat behavior.
- **Replicate target identity and derive cannon aim on the client.** The frontend can resolve the base's current target from replicated entity state and rotate the cannon toward its position. This avoids adding a second, potentially inconsistent aim calculation or requiring client input for an automated structure.
- **Draw the keep and cannon from layered Phaser shapes.** Replace the simple base rectangle with a stone-colored crenellated footprint, team-colored accents, and a distinct central rotating cannon assembly. Keep the health bar above the fort, and render a muzzle flash when a base projectile appears. This fits the current renderer without introducing external image assets.
- **Start each projectile at the cannon muzzle.** Compute its origin from the base position and the aim direction so the replicated shot visually leaves the cannon rather than the center of the fortress.

## Risks / Trade-offs

- [A main base can add substantial defensive pressure near its spawn area] → Keep its range and cooldown equal to lane towers and constrain the agreed strength increase to 24 damage per hit.
- [Client-side aim may lag slightly behind fast target movement between state updates] → Derive orientation from the latest replicated target and entity positions; the server remains the source of truth for projectile direction and impact.
- [Adding bases to automatic shooter updates may accidentally include destroyed bases or lobby-phase bases] → Filter for living bases and process firing only during started matches.
