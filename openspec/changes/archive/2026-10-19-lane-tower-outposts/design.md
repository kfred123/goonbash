# Design

## Context

See `proposal.md` for motivation and `specs/` for observable requirements. Lane towers already have replicated combat state and are rendered in the arena; the main-tower design establishes a layered, team-accented fortress with a rotating cannon.

## Goals / Non-Goals

**Goals:**
- Reuse the established main-tower visual language at a smaller scale so lane towers read as outposts rather than primary fortresses.
- Keep combat authority, targeting, and existing tower stats unchanged while making aiming and firing visible.
- Preserve destroyed towers as visual-only ruins until the match ends.

**Non-Goals:**
- Changing tower damage, range, cooldown, placement, health, or targeting rules.
- Adding image assets, external dependencies, or a new combat system.

## Decisions

- **Build the outpost from the main-tower visual primitives, scaled down.** Retain the stone/fortified silhouette and team-colored accents, but simplify the footprint and keep the cannon proportionate so lane towers remain visually secondary. This avoids a separate art style and new asset pipeline; drawing an unscaled main-tower design would obscure the intended size hierarchy.
- **Aim from the existing replicated target state.** Rotate the cannon toward the current target's latest position, leaving target selection and projectile direction authoritative on the server. This avoids duplicating targeting logic or introducing client-side combat decisions.
- **Reuse the main-tower firing-feedback pattern.** Show a muzzle flash in the recorded firing direction, including when a short-lived projectile is created and removed within one simulation update. Establish the initial state as the baseline so newly joined clients do not replay an old shot. This is more reliable than inferring a shot only from projectile presence.
- **Leave active combat values and processing untouched.** Retain the existing lane-tower attack, damage, range, and cooldown. On destruction, stop combat as before but preserve the tower's inert state for ruin rendering.
- **Retain destroyed towers as inert replicated state.** Mark a tower destroyed at zero HP and keep enough state for clients to render a static ruin at its last position until the match ends. Exclude destroyed towers from shooter updates, target selection, collision, and click targeting. This keeps the ruin visible without making it functional; deleting the entity immediately would lose the information needed to display it.

## Risks / Trade-offs

- [A smaller cannon may be less legible at normal camera zoom] → Preserve contrast between the cannon, stone structure, and team accents, and ensure the cannon remains visible at the existing game scale.
- [Target or shot presentation can lag replicated state] → Derive aim from the latest replicated target and use explicit shot-direction feedback; server-side combat remains authoritative.
- [Visual scaling could inadvertently alter tower collision or click targeting bounds] → Keep interaction and collision geometry independent from the rendered shapes.
- [A retained destroyed tower could accidentally remain in combat or interact with players] → Use its destroyed state to exclude it from all combat, targeting, collision, and interaction paths while retaining only its visual representation.
