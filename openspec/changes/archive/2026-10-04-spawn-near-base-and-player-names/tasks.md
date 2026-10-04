# Tasks

## 1. Backend: shared near-base positioning helper

- [x] 1.1 Add a `nearBasePosition(baseX, baseY)` helper to `backend/src/rooms/combat.ts` that returns a randomized `{ x, y }` offset from the base within a fixed small radius, clamped to the world bounds; verify with a new unit test in `combat.test.ts` asserting the result stays within the radius and within bounds across repeated calls.
- [x] 1.2 Update `respawnTank` in `backend/src/rooms/combat.ts` to use `nearBasePosition` instead of returning the exact `baseX`/`baseY`, and update `combat.test.ts`'s existing respawn-position assertions to check the result is near-but-not-equal to the base coordinates; verify by running the backend test suite.

## 2. Backend: initial spawn and respawn near team base

- [x] 2.1 In `backend/src/rooms/GameRoom.ts#onJoin`, assign `tank.team` before positioning, look up the matching `${team}-base`, and set the tank's initial `x`/`y` via `nearBasePosition` (falling back to the previous random behavior only if the base is missing); verify by adding/updating a test or manual check confirming a newly joined tank's position is near its own team's base.
- [x] 2.2 Verify `resolveRespawns` in `GameRoom.ts` continues to work unchanged with the updated `respawnTank` signature/behavior (it already passes base coordinates); verify by running the backend test suite and confirming no other callers of `respawnTank` broke.

## 3. Frontend: always show real player names above tanks

- [x] 3.1 In `frontend/src/GameScene.ts#upsertTank`, change the name label text from `isMe ? 'YOU' : (tank.name || 'Enemy')` to always use `tank.name` (falling back to a generic placeholder only when empty), appending a local-player marker such as `(You)` for the local session's own tank; verify by manually joining a match with two clients and confirming each sees the other's real name and their own name marked as theirs.

## 4. Verification

- [x] 4.1 Run the backend test suite (`npm test` in `backend/`) and confirm all tests pass, including the updated respawn/spawn-position tests. (43/43 passed; `tsc --noEmit` clean for both backend and frontend.)
- [x] 4.2 Manually start a match with at least two players on each team and confirm: both players' tanks initially appear near their own base (not inside it, not randomly elsewhere on the map); after a tank dies and its respawn timer elapses, it reappears near its base but outside the tower; every visible tank's label shows its owner's real name, with the local player's own label visibly marked as theirs. (Confirmed per user instruction; name/health-bar-follows-tank fix verified via code review and clean `tsc --noEmit`.)
