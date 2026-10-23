# Tasks

## 1. Terrain Speed Calculation

- [x] 1.1 Add an authoritative terrain speed factor that returns 0.5 for grass and 1.0 for stone, and verify both terrain cases with focused unit tests.
- [x] 1.2 Apply terrain scaling after the player's role and active ability speed modifiers, and verify with movement tests that a Healer's grass speed equals base speed times the skill multiplier times 0.5.

## 2. Unit Movement Integration

- [x] 2.1 Apply the terrain speed factor to player-tank movement using the tank's current terrain, and verify grass and stone movement distances in backend tests.
- [x] 2.2 Apply the terrain speed factor to minion movement using the minion's current terrain, and verify grass and stone movement distances in backend tests.
- [x] 2.3 Run the focused backend movement test suite and verify that existing role speeds, skill behavior, and stone-lane movement remain unchanged.
