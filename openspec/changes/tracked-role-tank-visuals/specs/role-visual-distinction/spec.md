# Spec Delta

## MODIFIED Requirements

### Requirement: Distinct Visual Appearance per Role
The system SHALL render Healer, Tank and Damagedealer as distinct armored tracked vehicles in gameplay and lobby previews. Each vehicle MUST have two visible tracks and a visible cannon. Large painted surfaces SHALL retain the player's team color; role identity SHALL also be recognizable from the chassis and turret silhouette.

#### Scenario: Tank rendered in game world
- **WHEN** a player tank is rendered
- **THEN** Healer uses the H1 repair tank with an ivory tool turret and rear toolboxes, Tank uses the T2 wide-tracked Bastion with wedge armor, and Damagedealer uses the D1 narrow Jaeger with a long cannon
- **AND** team color, ownership marking, health and name remain identifiable

#### Scenario: Role preview in lobby
- **WHEN** a player views the role selection controls in the waiting lobby
- **THEN** each role card displays the same vehicle identity in the player's team color
- **AND** its simplified small drawing retains visible tracks and cannon

## ADDED Requirements

### Requirement: Independent cannon aiming
Each role's cannon SHALL face its current combat target independently of the chassis. The chassis SHALL face movement, and an idle cannon SHALL retain its previous direction when no combat target exists.

#### Scenario: Moving while engaging a target
- **WHEN** a tank moves in one direction and engages an enemy in another
- **THEN** its chassis follows movement and its turret points at the enemy
- **AND** the selection marking and attached labels remain correctly positioned

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
Role visuals SHALL preserve independent healer ability effects, ownership marking, camera follow, death visibility and cleanup without changing combat rules.

#### Scenario: Defensive ability on the local Tank
- **WHEN** the local Tank activates a defensive ability
- **THEN** protection is visible without removing the white ownership marking

#### Scenario: Death and removal
- **WHEN** a tank dies or is removed
- **THEN** its complete vehicle and attached effects are hidden or destroyed together
- **AND** respawn restores the complete role model without stale healing indicators
