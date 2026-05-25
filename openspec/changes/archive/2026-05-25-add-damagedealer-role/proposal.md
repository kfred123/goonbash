## Why

Currently, the game only features two roles: Tank (shield/melee) and Healer (support). Introducing a pure "Damagedealer" (DPS) role adds crucial depth to team compositions. A high-damage, low-HP glass cannon role creates new tactical dynamics, where the healer must prioritize keeping the fragile DPS alive, while the tank protects them from enemy fire. The new targeted "Homing Rocket" ability also introduces a new paradigm of unescapable targeted abilities to the game.

## What Changes

- Add a new selectable role: `damagedealer` (glass cannon stats: low HP, high speed, high standard damage).
- Introduce a new ability mechanic: "Homing Rocket".
- Implement targeted logic: Firing roughly at an enemy locks the rocket onto the closest target in that trajectory.
- Update the Lobby UI to include the new role selection card and preview.

## Capabilities

### New Capabilities
- `damagedealer-role`: Core stats, visuals, and registration of the new role.
- `homing-rocket-ability`: The logic for the auto-locking, inescapable homing rocket that scales damage based on a percentage of the player's base damage.

### Modified Capabilities
- `<existing-name>`: N/A

## Impact

- `NetworkManager.gd` and `Lobby.gd` will be updated to include the new role and its UI representations.
- `PlayerTank.gd` will be extended to handle the new base stats and the ability logic for the Damagedealer.
- A new script/scene for the `HomingRocket` (or modifications to `Bullet.gd`) will be required to handle the seeking logic and targeted impact damage.
