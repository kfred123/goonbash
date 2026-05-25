## 1. Role Registration and Lobby UI

- [x] 1.1 Update `NetworkManager.gd` to include `"damagedealer"` in the `ROLES` constant
- [x] 1.2 Update `Lobby.gd` to include a new `ROLE_DATA` entry for the Damagedealer (red/orange color, rocket icon, sharp polygon)
- [x] 1.3 Verify the new role can be selected and synced in the lobby

## 2. Damagedealer Base Stats and Visuals

- [x] 2.1 Update `PlayerTank.gd` to define the hull polygon for the `"damagedealer"` role
- [x] 2.2 Update `PlayerTank.gd` to apply low max HP and high movement speed for the Damagedealer
- [x] 2.3 Adjust standard firing logic (barrel length, fire rate) for the new role if needed

## 3. Homing Rocket Logic

- [x] 3.1 Create a new script/scene for the `HomingRocket` (or extend `Bullet.gd` to accept a `target_id` and rotate towards it)
- [x] 3.2 Implement tracking logic: Calculate rotation towards target position in `_physics_process`
- [x] 3.3 Implement impact logic: Base damage + (player_level * scaling_factor)
- [x] 3.4 Ensure the rocket cleans up properly if the target is destroyed before impact

## 4. Damagedealer Ultimate Integration

- [x] 4.1 Update `PlayerTank.gd` to handle the ultimate ability input for the `"damagedealer"` role
- [x] 4.2 Implement target acquisition: Scan for the closest valid enemy roughly in the direction the turret is facing
- [x] 4.3 Add a 20-30 second cooldown timer for the Damagedealer's ultimate ability
- [x] 4.4 Synchronize the firing of the Homing Rocket across the network via RPC, passing the `target_id`
