# Design

## Context

The Colyseus room is authoritative for combat and holds each player's synchronized `Tank` state. Role base stats are defined in shared code; tanks currently expose HP and fire damage, while the frontend already has a bottom HUD bar for the selected role ability. See proposal.md for the motivation and specs/player-progression/spec.md for the behavior contract.

## Goals / Non-Goals

**Goals:**
- Keep XP awards, level calculations, stat bonuses, and ability purchases authoritative in the game room.
- Replicate progression through the existing shared Colyseus state so clients render the same values.
- Extend the existing bottom HUD for progression without allowing client-side purchases to mutate game state.
- Start with simple deterministic balancing values that are easy to tune.

**Non-Goals:**
- Add a separate armor statistic; use the existing maximum-HP model for survivability.
- Add new active ability effects or change role selection and lobby behavior.
- Add out-of-match, account-wide, or persistent progression.

## Decisions

### Store progression on the synchronized player tank

Add level, experience toward the next level, unspent skill points, and learned ability levels to the shared tank state. Initialize players at level 1 with no XP or skill points. The server updates these values at kill and purchase events; the HUD only sends requests and renders replicated state. This avoids a parallel progression store and keeps reconnect-in-match state consistent with the room's existing lifecycle.

### Award XP from the death event, not damage attribution

When a minion or player tank dies, use its death position to find every living player tank within 500 world units. Award 10 XP per eligible tank for a minion and 50 XP for a player tank, including nearby players on either team. Do not use projectile ownership or damage history to split rewards. The initial radius is a gameplay tuning value, while the fixed reward makes equal participation straightforward to verify.

### Use a linear-to-level threshold and role-base stat bonuses

Require `100 * currentLevel` XP to advance, retaining leftover XP and processing every crossed threshold. Each level above 1 adds 5 maximum HP and 0.5 fire damage to the role's base values. Resolve those totals from the role base and current level rather than incrementing the tank's current stats, so applying role setup or respawning cannot compound bonuses. Restore the current maximum HP on respawn and retain level, XP, skill points, and ability levels for the match.

### Make ability purchases server-validated and catalog-driven

Represent ability levels as learned ability state and keep the catalog of available abilities and their per-level effects in shared role/ability configuration. Initially expose the selected role's existing special ability as an available ability; it is learned at level 1 through a skill-point purchase and can then be upgraded to level 10. The server validates ability availability, current level, and skill-point balance before changing either side of the purchase. Additional abilities can later be added to the catalog without changing the XP or level model.

### Extend the existing bottom HUD

Keep the current role ability presentation and add an accessible progression area to the same bottom HUD. Display level, an XP progress bar, and an explicitly labeled available skill-point count, including zero. This count represents only points not yet allocated, not all points ever earned.

Fill the XP bar using experience earned within the current level divided by that level's advancement threshold. Immediately after the bar, display `current XP / required XP`, for example `50 / 200 XP`. Each new level starts counting from zero rather than accumulating previously completed levels; XP beyond a crossed threshold is retained as progress in the new level. An exact threshold crossing displays `0 / next threshold XP` and an empty bar.

Use separate, clearly labeled and visually distinguishable controls for activation and learning/upgrading, rather than overloading the same click action. Preserve the activation shortcut as an activation-only input. Purchase controls show locked, learned, max-level, and insufficient-points states; lack of skill points must not prevent activation of an otherwise eligible learned ability. Neither action triggers the other, and HUD clicks do not issue movement commands. The server's replicated state remains the source of truth; local optimistic state must not imply a purchase succeeded before the server update arrives.

### Append levels to above-tank name labels

Render each visible player's name as `Display Name (Lvl N)` using the synchronized player level. Update the label on level changes and preserve the local-player indicator separately so `(Lvl N)` remains immediately after the actual name. This extends the existing name label instead of adding a separate level overlay.

## Risks / Trade-offs

- [Rewarding nearby players on either team can grant XP to an opponent] → This follows the requested rule that all nearby players receive the same reward; keep eligibility and radius centralized so playtesting can tune the policy without changing combat attribution.
- [A fixed 500-unit radius may feel too broad or too narrow on the 2400-by-1800 map] → Treat it as an initial balancing value and adjust after observing matches.
- [Floating-point damage bonuses may affect projectile damage fractions] → Keep the calculation deterministic on the server and verify the frontend only displays the synchronized state.
- [More HUD controls compete for limited bottom-bar space] → Reuse and extend the existing HUD rather than adding a second overlay, and ensure clicks on progression controls do not issue movement commands.

## Migration Plan

Progression is match-local and initialized when each tank joins, so no database migration is required. Deploy the shared state and backend validation with the frontend HUD together; a client/server version mismatch should fail through the existing room connection handling rather than silently accepting unknown purchase messages. Roll back by reverting the coordinated client, shared, and backend changes.
