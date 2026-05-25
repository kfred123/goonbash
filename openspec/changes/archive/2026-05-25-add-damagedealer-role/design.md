## Context

GoonBash is a multiplayer twin-stick shooter. Currently, it has two roles: Tank and Healer. Players aim using the mouse position or a right stick, which determines the direction of the `PlayerTank` and its turret. We are introducing a new "Damagedealer" role with an inescapable "Homing Rocket" ultimate ability. 

## Goals / Non-Goals

**Goals:**
- Implement the "damagedealer" role with low HP, high speed, and a unique visual representation.
- Implement an unescapable, high-damage, auto-targeting "Homing Rocket" ability.
- Ensure the rocket correctly identifies targets based on the direction the player is aiming when fired.

**Non-Goals:**
- Adding a new manual targeting system that requires clicking directly on an enemy's hit box (we are opting for a directional auto-lock mechanism instead to preserve the fast-paced twin-stick feel).
- Making the rocket destructible by enemies.

## Decisions

1. **Auto-Locking Mechanism**: 
   - *Alternative*: Raycasting exactly from mouse to world to click an enemy.
   - *Decision*: When the ultimate is fired, the game will scan for all enemies in a cone or simply the closest enemy in the general direction the turret is facing. This fits better with twin-stick controllers and chaotic gameplay.
2. **Homing Logic**:
   - The `HomingRocket` will be a new node or an extension of `Bullet.gd`. It will store a reference to the `target_id`. In `_physics_process`, it will update its rotation towards the target's current position and move forward. Since it's inescapable, it will have a very high rotation speed (`lerp_angle` or `move_toward`) and a long lifespan.
3. **Damage Scaling**:
   - The damage will scale dynamically as a percentage multiplier of the Damagedealer's base damage. This calculation (`rocket_damage = damage * multiplier`) happens on firing, ensuring that as the player levels up and gains more base damage, the rocket damage continues to scale even if the rocket skill is fully upgraded.

## Risks / Trade-offs

- **Risk: Network Sync for Homing Missiles** -> If the client and server disagree on who the closest target is when fired, the rocket might track different targets. 
  - *Mitigation*: The client firing the rocket will determine the `target_id` locally and send it via RPC to the server/other clients when spawning the rocket. The rocket then purely follows that specific ID on all clients.
- **Risk: Target Dies Mid-Flight** -> The rocket's target might be killed by another player before impact.
  - *Mitigation*: The rocket should gracefully handle invalid target references. If the target dies, the rocket should either detonate harmlessly, fly straight, or lock onto a new target. We will make it fly straight.
