## 1. Skill Logic Setup

- [x] 1.1 Add Speed skill configuration variables to the player script (or Healer role script) including current level, base speed boost (10%), speed boost per level (5%), cooldown, and duration.
- [x] 1.2 Implement server-authoritative RPC functions for unlocking, upgrading, and activating the Speed skill.
- [x] 1.3 Add logic to calculate the active speed multiplier based on the current skill level (max level 10).

## 2. Movement Integration

- [x] 2.1 Modify the movement logic in `PlayerTank.gd` to apply the speed multiplier when the Speed skill is active.
- [x] 2.2 Implement a timer system to track the duration of the Speed skill and reset the speed multiplier when it expires.
- [x] 2.3 Ensure proper cleanup: reset the speed multiplier to base if the player dies or disconnects while the effect is active.

## 3. UI and HUD Integration

- [x] 3.1 Update the player HUD scene to include an ability slot for the new Speed skill, specific to the Healer role.
- [x] 3.2 Wire the UI to display the current skill level and allow manual upgrading when ability points are available.
- [x] 3.3 Wire the UI to visually indicate the cooldown state when the Speed skill is used.
- [x] 3.4 Test the skill activation, speed scaling, leveling, and UI updates in both single-player and networked environments.
