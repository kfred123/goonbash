## MODIFIED Requirements

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

## ADDED Requirements

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
