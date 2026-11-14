# Proposal

## Why

The Healer can currently heal nearby allies over time or improve their own movement, but has no ability to quickly restore a single endangered teammate. A targeted burst heal adds a distinct clutch-support option without replacing either existing skill.

## What Changes

- Add **Rettungsimpuls (Rescue Impulse)** as the Healer's third independently learned and upgraded ability.
- Let the Healer target a living, visible allied player tank or minion, including themselves, within 250 world units and instantly heal 18 HP at rank 1, plus 3 HP per rank above 1, capped at the target's maximum HP.
- Give the ability a 20-second base cooldown, reduced by the existing rank-based cooldown rule; invalid targets do not apply healing or start cooldown.
- Allow activation on a target at full HP; it still starts the ability's cooldown.
- Extend the existing Heal Aura to heal living allied minions in its radius at the same rate as allied tanks.
- Add a third Healer HUD slot on **R**, with ally-target selection, confirmation, and cancellation behavior.

## Capabilities

### New Capabilities

- `healer-rescue-impulse`: Defines the Healer's targeted, rank-scaled burst heal, valid targets, range, and cooldown.

### Modified Capabilities

- `ability-hud`: Add the Healer's third R-slot ability and its ally-target selection controls, including cancellation and protection against leaking target clicks into movement or attacks.

## Impact

- `shared/src/abilities.ts` and ability tests: register the ability, role ordering, and rank-based tuning.
- `backend/src/rooms/GameRoom.ts` and ability tests: validate target visibility, team, life state, range, and authoritative cooldown before applying healing.
- `frontend/src/GameScene.ts`, ability controls, and HUD tests: present the third Healer slot and ally selection interaction.
- `README.md`: document the Healer's third ability and its targeting controls.
