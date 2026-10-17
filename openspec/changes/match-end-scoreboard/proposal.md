# Proposal

## Why

Destroying a team's main tower should clearly end the match and communicate the outcome to both teams. Players also need a fair, transparent comparison of their individual performance before returning to the main menu.

## What Changes

- End the match when either team's main tower is destroyed, and identify the winning and losing teams.
- Show a victory or defeat screen with a separate player table for each team, including kills, level, and damage dealt.
- Default each table to most kills and let players sort by kills, level, or damage dealt.
- Provide an action to leave the match and return to the main menu.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-backend`: End matches on main-tower destruction and provide final per-player match statistics and outcome.
- `game-frontend`: Display the match outcome and sortable team scoreboards, with navigation back to the multiplayer menu.

## Impact

Changes affect authoritative match and combat state in `backend/src/rooms/GameRoom.ts` and related shared state, plus match rendering and navigation in `frontend/src/GameScene.ts`. No new external dependencies or public service integrations are expected.
