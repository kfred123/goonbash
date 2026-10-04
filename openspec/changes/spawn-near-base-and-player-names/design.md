# Design

## Context

See proposal.md for motivation. Relevant current state:

- `GameRoom.onJoin` sets `tank.x = Math.random() * 1500` and `tank.y = Math.random() * 1500`, ignoring the tank's team entirely. Bases are at fixed coordinates: `blue-base` at `(240, 900)`, `red-base` at `(2160, 900)` in a `3000x1800` world (`WORLD_MARGIN`-clamped play area).
- `combat.ts#respawnTank(maxHp, baseX, baseY)` returns `{ hp: maxHp, x: baseX, y: baseY, state: "alive", respawnAt: 0 }` — the exact base coordinates, with no offset.
- `GameRoom.resolveRespawns` calls `respawnTank(tank.maxHp, base?.x ?? tank.x, base?.y ?? tank.y)`, so it already looks up the owning base; only the exact-coordinate behavior needs to change.
- `GameScene.upsertTank` creates the name label as `isMe ? 'YOU' : (tank.name || 'Enemy')` once, at tank-sprite creation time, and never updates it afterward.

## Goals / Non-Goals

**Goals:**
- Compute a reusable "near base" offset position for both initial spawn and respawn so the two call sites share one notion of "near".
- Keep the offset position clamped within the existing world bounds (`MIN_X`/`MAX_X`/`MIN_Y`/`MAX_Y`) so a base near the map edge can't place a tank out of bounds.
- Always render the real player name above every tank, with a lightweight local-player indicator.

**Non-Goals:**
- Changing base positions, world size, or lane layout.
- Adding any new visual asset (tower sprite, spawn-circle indicator) beyond the existing name label.
- Changing respawn timing (`RESPAWN_DELAY_MS`) or respawn HP behavior.

## Decisions

- **Shared helper for near-base offset**: Add a small helper (e.g. `nearBasePosition(baseX, baseY)` in `backend/src/rooms/combat.ts`) that returns `{ x, y }` offset from the base by a random vector within a fixed radius (e.g. 80–140px), clamped to the world bounds. Both `GameRoom.onJoin` (via the tank's assigned team's base) and `respawnTank` use this helper, so "near base" has one definition. Alternative considered: duplicate random-offset logic in both places — rejected to avoid the two call sites drifting apart (e.g. different radii).
- **`respawnTank` signature**: Change `respawnTank(maxHp, baseX, baseY)` to compute the offset internally via the shared helper rather than taking a pre-offset `x`/`y`, so existing callers only need to keep passing base coordinates and `combat.test.ts` can assert the result is near-but-not-equal-to the base.
- **Initial spawn uses the tank's own team base**: `onJoin` already determines `tank.team` via `this.nextTeam()` before placing the tank; reorder so the team is assigned first, then look up `this.state.bases.get(`${tank.team}-base`)` and apply the same near-base helper, falling back to the previous random behavior only if a base is unexpectedly missing (defensive; bases are always created in `onCreate`).
- **Frontend name label always shows the real name**: Replace the one-time `isMe ? 'YOU' : ...` text with a label that always starts from `tank.name || 'Player'`, appending a short local-player marker (e.g. `` `${tank.name} (You)` ``) only for the local session, mirroring the existing lobby roster's `(You)` convention (see `GameScene.ts` line ~305). The label is still set once at creation (tank names don't change after join), so no new per-tick update path is introduced.

## Risks / Trade-offs

- [Random near-base offset could occasionally place a tank overlapping another tank or just outside the playable margin] → Clamp the offset point to `MIN_X..MAX_X` / `MIN_Y..MAX_Y` and keep the offset radius small enough that it can't cross into enemy territory from either base's position.
- [Changing `respawnTank`'s signature/behavior affects existing unit tests] → Update `combat.test.ts` assertions to check the respawned position is within the expected radius of the base instead of exactly equal to it.
- [Longer player names could visually crowd the arena] → Out of scope; existing `MAX_NAME_LENGTH = 20` truncation already bounds label width, unchanged by this design.
