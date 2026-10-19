# Tasks

## 1. Outpost Rendering

- [x] 1.1 Replace the lane-tower visual with a smaller, team-accented outpost based on the main-tower design while retaining its health bar and rendering destroyed towers as static ruins until match end; verify frontend rendering tests cover visibility, damage updates, ruin persistence, and match-end cleanup.
- [x] 1.2 Rotate each outpost cannon toward its current target and show a firing effect in the recorded shot direction; verify rendering tests cover target tracking and shots whose projectiles disappear in the creation update.

## 2. Combat Compatibility

- [x] 2.1 Preserve existing lane-tower damage, range, and cooldown, and ensure destroyed towers stop attacking and cannot be targeted; verify combat tests cover unchanged stats and exclude destroyed towers from combat.
- [x] 2.2 Keep visual dimensions independent from collision and click-targeting geometry, and ensure destroyed ruins are non-blocking and non-selectable while remaining replicated through match end; verify interaction and collision tests cover active towers and ruins.
