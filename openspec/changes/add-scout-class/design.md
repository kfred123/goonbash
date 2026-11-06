# Design

## Context

See `proposal.md` for motivation. The current game already has role selection, server-authoritative skill-point progression, temporary role abilities, terrain-adjusted movement, and shared team vision. This change extends those systems rather than introducing a separate class or ability framework.

## Goals / Non-Goals

**Goals:**
- Keep Scout role selection, ability ranks, activation, cooldowns, and effects consistent across server state and the match HUD.
- Preserve existing role behavior and the current base sight and terrain rules.
- Ensure immobilization prevents movement only, not firing.

**Non-Goals:**
- Rebalance existing roles or their abilities.
- Add damage or firing restrictions to Schockschuss.
- Introduce new dependencies or persistent player progression outside the match.

## Decisions

- **Extend the existing role and progression systems.** Add Scout to the established role selection and stat initialization paths, and register its three abilities with the existing role-specific skill purchase and activation flow. A separate Scout progression system would duplicate server validation and HUD behavior.
- **Keep the three abilities independent.** Each ability has its own rank, activation state, duration, and cooldown, while using the shared 0–10 ability rank and skill-point rules. This preserves independent upgrades and prevents one ability's use from implicitly activating or cooling down another.
- **Keep effects server-authoritative.** The server validates Scout role, learned rank, and cooldown before applying effects and synchronizes their active state. The HUD requests activation and displays the resulting state; it does not calculate authoritative movement, vision, or immobilization.
- **Apply effects at the existing gameplay boundaries.** Weitsicht temporarily increases the Scout observer's sight budget used by shared team vision. Offroad-Geschwindigkeit modifies the Scout's movement calculation only while traversing grass, in conjunction with the existing terrain penalty. Schockschuss applies a timed movement restriction when its projectile hits; firing remains available throughout that restriction.
- **Treat rank scaling as a gameplay contract and balance as tuning.** Range and duration for Weitsicht, grass speed bonus for Offroad-Geschwindigkeit, and immobilization duration for Schockschuss increase at every rank. Their initial values and per-rank increments are balance constants; cooldowns are independent per ability.

## Risks / Trade-offs

- [Additional temporary state may diverge between server and clients] → Keep activation, expiry, hit results, and effective stats authoritative on the server and synchronize state through the existing game-state flow.
- [Temporary vision or movement modifiers may be applied in the wrong order with terrain rules] → Reuse the existing observer sight-budget and terrain-adjusted movement paths, and test active and expired behavior on both grass and non-grass terrain.
- [Immobilization may accidentally suppress firing or persist after expiry] → Restrict only movement handling and test movement and firing independently before, during, and after the effect.
- [Ability values may be unbalanced] → Keep rank coefficients isolated as tunable balance values without changing the rank-scaling contract.

## Migration Plan

No persistent data migration is required. Deploy the server and clients with the updated role and synchronized ability state together so that all match participants understand the Scout role and effects. Roll back by deploying the prior server and client versions together.
