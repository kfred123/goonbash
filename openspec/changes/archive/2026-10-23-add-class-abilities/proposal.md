# Proposal

## Why

Each class currently has only one learnable ability, which limits build choices and leaves the Healer, Damage Dealer, and Tank without distinct secondary play styles. Adding one separately learnable active skill per class gives players meaningful choices while preserving the existing abilities and server-authoritative progression model.

## What Changes

- Add a separately learned and upgraded Healer Speed skill that temporarily increases movement speed.
- Add a separately learned and upgraded Damage Dealer homing rocket. The player enters a target-selection mode, chooses a valid enemy, and fires a rocket that pursues that target.
- Add a separately learned and upgraded Tank Entrench skill that prevents movement while greatly reducing incoming damage.
- Expand ability progression, activation, cooldown state, and the HUD to support multiple class-specific skills with independent levels and cooldowns.
- Keep all new ability validation, effects, target selection, and damage/movement rules server-authoritative.

## Capabilities

### New Capabilities

- `tank-entrench-ability`: Tank's temporary immobility and high damage reduction while entrenched.

### Modified Capabilities

- `ability-hud`: Show and operate multiple learned or locked skills, with independent cooldowns and clear target-selection feedback.
- `player-progression`: Learn and upgrade multiple abilities independently, spending one skill point per ability level.
- `healer-speed-skill`: Define the Healer's temporary movement-speed boost as a learnable, level-scaled ability.
- `homing-rocket-ability`: Replace directional auto-targeting with explicit selection of a valid enemy target before firing a homing rocket.

## Impact

- Shared game state and ability definitions need per-ability levels, cooldowns, and active-effect timing rather than a single role ability slot.
- The backend needs ability-specific activation and purchase validation, movement-speed modifiers, Tank immobility/damage reduction, and authoritative homing rocket targeting and damage.
- The frontend needs multiple ability controls and a distinct target-selection interaction that does not accidentally issue movement or regular attack commands.
- Existing progression and ability tests will need updates for per-ability state while preserving the existing Heal Aura, Shield, and Rapid Fire behavior.
- The existing Healer Speed spec is malformed as a main capability document; repair its structure so this change can update and archive its requirements.
