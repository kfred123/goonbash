## Purpose

Defines role-specific tracked vehicle silhouettes, independent cannon aiming, repair-tool visuals, and presentation lifecycle behavior shared between waiting-lobby previews and gameplay.

## Requirements

### Requirement: Distinct Visual Appearance per Role
The system SHALL distinguish Healer, Tank, and Damagedealer by hull silhouette and role details in gameplay and waiting-lobby previews. Hull paint SHALL retain the player's blue or red team color rather than using role color as the primary fill. The Healer SHALL appear as a round workshop repair tank with short tracks, a light tool cover bearing a wrench, and a short repair nozzle. Tank and Damagedealer SHALL retain their square and triangular silhouettes.

#### Scenario: Tank rendered in game world
- **WHEN** a player is rendered in the game view
- **THEN** its primary hull paint identifies its team
- **AND** its silhouette and details identify its role without relying on color
- **AND** the local player's light selection outline remains visible

#### Scenario: Role preview in lobby
- **WHEN** a player views role selection in the waiting lobby
- **THEN** the Healer preview uses the same workshop repair identity and team color as gameplay
- **AND** small details are reduced at lobby scale without removing the round hull, tracks, tool cover, or wrench

### Requirement: Independent cannon aiming
Each role's cannon SHALL face its current combat target independently of the chassis. The chassis SHALL face movement, and an idle cannon SHALL retain its previous direction when no combat target exists.

#### Scenario: Moving while engaging a target
- **WHEN** a tank moves in one direction and engages an enemy in another
- **THEN** its chassis follows movement and its turret points at the enemy
- **AND** attached labels remain correctly positioned

#### Scenario: Combat target disappears
- **WHEN** the tank no longer has a visible combat target
- **THEN** the cannon retains its last direction rather than snapping to an unrelated heading

### Requirement: Recognizable repair tool
Every repair wrench illustration SHALL depict a consistent recognizable metal tool with an open jaw, solid shaft and hollow ring end, including the Healer turret, healing indicators and Heal Aura ability icon.

#### Scenario: Repair icon at different sizes
- **WHEN** the player sees a Healer preview, a healing indicator or the ability HUD
- **THEN** the same tool silhouette appears with sufficient outline contrast
- **AND** fine highlights may be omitted at small sizes without replacing the jaw or ring with abstract lines

### Requirement: Preserve vehicle presentation lifecycle
Role visuals SHALL preserve independent healer service marks and speed effects, camera follow, death visibility and cleanup without changing combat rules. Vehicles SHALL NOT have surrounding selection, team or protection circles. The local player's light selection outline and the Healer's decorative repair ring SHALL remain supported.

#### Scenario: Defensive ability on the local Tank
- **WHEN** the local Tank activates a defensive ability
- **THEN** no protection or ownership circle appears around the vehicle
- **AND** the defensive ability state remains visible in the HUD

#### Scenario: Active healing with decorative repair effects
- **WHEN** Heal Aura is active
- **THEN** healed allies retain their floating repair wrench and the Healer retains its service marks
- **AND** the Healer's small decorative repair ring follows Heal Aura's active duration without changing healing rules

#### Scenario: Death and removal
- **WHEN** a tank dies or is removed
- **THEN** its complete vehicle and attached effects are hidden or destroyed together
- **AND** respawn restores the complete role model without stale healing indicators

### Requirement: Decorative Workshop Healer Effects
The Healer SHALL show a small pulsing repair ring while Heal Aura is active and short exhaust streaks while Speed is active. These effects SHALL independently follow replicated active durations, support simultaneous activation, and stop on expiry or death. They SHALL NOT change ability rules, targeting, collision size, movement, or healing. Existing allied healing wrench indicators SHALL remain.

#### Scenario: Independent and combined abilities
- **WHEN** either or both Healer abilities are active
- **THEN** only the corresponding decorative effects are visible
- **AND** neither effect changes the duration or availability of the other ability

#### Scenario: Death, respawn, and cleanup
- **WHEN** the Healer dies
- **THEN** its body and decorative effects are hidden
- **WHEN** it respawns
- **THEN** the same workshop identity returns with effects reflecting current ability state
- **WHEN** the player is removed or the arena is cleared
- **THEN** its presentation objects are destroyed together
