# Proposal

## Why

Players currently lack a persistent in-match progression loop that rewards participation and lets them specialize their tank. A shared, server-authoritative leveling system will make kills valuable to nearby teammates as well as the player who dealt damage, while giving each player clear opportunities to improve their combat stats and abilities.

## What Changes

- Start each player at level 1 and grant one skill point for every level gained.
- Award equal experience to every player near a kill, independent of damage dealt; player kills grant more experience than minion kills.
- Increase the experience threshold for each successive level.
- Give each level-up a modest increase to damage and armor or hit points.
- Let players spend one skill point to learn an ability or upgrade an existing ability, with each ability capped at level 10; expose available choices in the in-match HUD.
- Show each player's level immediately after their display name as `(Lvl N)`, for example `Player (Lvl 2)`.
- Clearly separate ability activation from learning/upgrading in the HUD, and display the number of unspent skill points available to allocate.
- Use sensible initial progression and reward values that can be tuned as playtesting provides feedback.

## Capabilities

### New Capabilities

- `player-progression`: Defines experience rewards and eligibility, level thresholds and rewards, skill-point spending, ability upgrades, and their in-match HUD representation.

### Modified Capabilities

None.

## Impact

The authoritative backend game state and kill/combat resolution must track and distribute experience, levels, skill points, and stat growth. Shared game-state and network message schemas must carry the progression data and ability upgrade requests. The frontend HUD must display progression and allow valid ability purchases/upgrades. Existing role and ability definitions may need to provide upgradeable stats or per-level values.
