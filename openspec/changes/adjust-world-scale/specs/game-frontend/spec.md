# Spec Delta

## ADDED Requirements

### Requirement: Centrally configurable arena entity scale

The frontend SHALL apply a centrally adjustable entity-size factor relative to the pre-change presentation, defaulting to 1.20, to the linear dimensions of all arena player roles, mobs/minions, lane towers, main-base towers, and destroyed lane-tower ruins. Each entity's chassis, turret, shadow, and attached visual decorations SHALL remain proportionally aligned where present. Role-selection previews, HUD elements, minimap markers, camera zoom, and font sizes SHALL retain their existing screen-space sizing.

#### Scenario: Arena entities use the default larger dimensions
- **WHEN** an arena uses the default entity-size factor
- **THEN** a player's nominal size is 48 world units instead of 40 and a minion's nominal size is 21.6 instead of 18
- **AND** lane towers, main-base towers, and lane-tower ruins have linear visual dimensions equal to 1.20 times their pre-change dimensions
- **AND** all player roles retain their distinctive proportions and lane towers remain visually smaller than main-base towers

#### Scenario: Future entity-size tuning has one adjustment point
- **WHEN** the entity-size factor is changed and the application is rebuilt and restarted
- **THEN** every affected arena entity and its attached presentation uses that factor without requiring edits to individual drawing constants
- **AND** setting the factor to 1.00 restores the original entity dimensions
- **AND** neither road width nor the clear grass gap changes

#### Scenario: World scaling does not resize screen-space presentation
- **WHEN** entities are enlarged in the arena
- **THEN** role-selection previews, HUD elements, minimap markers, font sizes, and camera zoom retain their previous sizes or settings

### Requirement: Interaction and feedback remain aligned with scaled entities

Entity-associated name labels, health bars, target indicators, and structure firing feedback SHALL remain aligned with the scaled arena presentation during creation, movement interpolation, updates, visibility changes, destruction, and respawn. Labels and health bars SHALL remain clear of the larger bodies. Existing click-selection areas SHALL scale with their respective entity presentations. Structure projectile origins and muzzle flashes SHALL agree with the enlarged cannon muzzle positions. Hidden enemies and ruins SHALL retain their existing selection restrictions.

#### Scenario: Enlarged units move and respawn
- **WHEN** a scaled player or minion is created, interpolated, updated, or respawned
- **THEN** its health bar and any name label remain correctly positioned without intersecting its body
- **AND** its target feedback and attached effects remain aligned

#### Scenario: Selection area follows the enlarged presentation
- **WHEN** a click falls outside an eligible enemy entity's original click radius but inside its radius multiplied by the configured entity-size factor
- **THEN** the click selects that enemy according to the existing nearest-target selection rules
- **AND** concealed enemies and destroyed towers remain ineligible for selection

#### Scenario: A scaled structure fires
- **WHEN** a visible lane tower or main-base tower fires in any direction
- **THEN** its muzzle flash and authoritative projectile origin match its scaled cannon muzzle position
- **AND** a shot removed before replication still produces correctly positioned feedback under the existing visibility rules

#### Scenario: Presentation scaling preserves gameplay parameters
- **WHEN** the entity-size factor changes
- **THEN** damage, health, attack and ability ranges, cooldowns, movement speeds, collision and projectile-hit radii, and vision ranges remain unchanged
- **AND** only structure muzzle origins and client-side click-selection areas follow the new presentation size
