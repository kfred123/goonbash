# Spec Delta

## Purpose

Defines the Damagedealer's learned Mortar siege ability, including blind ground targeting, delayed area damage, building effectiveness, and fog-safe presentation.

## ADDED Requirements

### Requirement: Independent Learned Mortar Ability
The system SHALL offer Mortar as a third Damagedealer ability without replacing Rapid Fire or Homing Rocket. Mortar SHALL start unlearned at level 0 and SHALL use the existing one-skill-point learning and upgrading rules up to level 10. Its learned state, level, and cooldown SHALL be independent of other abilities. Other roles SHALL NOT learn or activate Mortar.

#### Scenario: Learn Mortar
- **WHEN** a Damagedealer with one available skill point purchases unlearned Mortar
- **THEN** Mortar reaches level 1 and exactly one skill point is spent
- **AND** Rapid Fire and Homing Rocket remain unchanged

#### Scenario: Invalid upgrade or role
- **WHEN** a purchase targets Mortar without a skill point, above level 10, or from another role
- **THEN** the purchase is rejected without changing skill points or ability levels

### Requirement: Authoritative Ground-Point Launch
The system SHALL let a living Damagedealer with learned, ready Mortar select a fixed ground point during an active match. The point SHALL have finite numeric coordinates inside the closed arena bounds and SHALL be at most 900 world units from the shooter's authoritative position at launch, using Euclidean distance. Any such point SHALL be valid regardless of current team vision or the presence of friendly or enemy entities. The server SHALL validate all launch conditions, SHALL NOT clamp or pursue an invalid point, and SHALL NOT use a supplied entity identity instead of ground coordinates. Rejected Mortar activation SHALL provide explicit feedback to the requesting client without spawning a shell, consuming cooldown, or changing movement/attack commands.

#### Scenario: Blind fire onto occupied ground
- **WHEN** a learned, ready Mortar is fired at an in-world point within range that is concealed and occupied by an unseen enemy
- **THEN** the server launches one shell toward the chosen coordinates without requiring or revealing an enemy identity

#### Scenario: Maximum range boundary
- **WHEN** a valid landing point is exactly 900 world units from the authoritative shooter position
- **THEN** it is accepted
- **AND** an otherwise valid point farther than 900 world units is rejected

#### Scenario: Invalid coordinates
- **WHEN** Mortar coordinates are missing, nonnumeric, nonfinite, or outside the arena
- **THEN** the server rejects the shot with feedback and preserves cooldown and current commands

#### Scenario: Shooter no longer eligible
- **WHEN** a Mortar request reaches the server while the shooter is dead, the match is not active, the role is wrong, Mortar is unlearned, or Mortar is cooling down
- **THEN** the server rejects activation with feedback without a new shell or cooldown change

#### Scenario: Empty or zero-distance destination
- **WHEN** the player chooses empty ground or the shooter's own in-world position
- **THEN** a valid learned, ready Mortar launches without requiring an entity target

### Requirement: Fixed Delayed Shell Impact
A launched Mortar shell SHALL reach its original landing point after 1500 milliseconds of active simulation time and explode exactly once on the first simulation update reaching that duration. It SHALL NOT follow an entity, collide with intervening entities, or deal damage before impact. Moving the shooter, moving potential victims, or the shooter's death SHALL NOT change or cancel an accepted shell. The shell SHALL be removed after resolution. Match completion SHALL prevent remaining shells from causing further damage.

#### Scenario: Enemy moves away
- **WHEN** an enemy leaves the selected area during the shell's flight
- **THEN** the shell continues to the original coordinates and does not follow that enemy

#### Scenario: Enemy moves into the area
- **WHEN** an enemy enters the blast area before impact
- **THEN** it is eligible for damage based on its position at impact

#### Scenario: No premature or repeated explosion
- **WHEN** simulation advances to 1499 milliseconds after launch
- **THEN** no Mortar damage has occurred
- **AND** when the next update crosses 1500 milliseconds, one explosion resolves and later updates do not repeat it

#### Scenario: Shooter dies in flight
- **WHEN** the firing Damagedealer dies before impact while the match remains active
- **THEN** the shell still resolves at the original point using its launch-time damage

#### Scenario: Match ends in flight
- **WHEN** the match ends before a pending shell impacts
- **THEN** that shell causes no post-match damage or gameplay effects

### Requirement: Enemy-Only Area Damage and Building Bonus
At impact, Mortar SHALL damage each living enemy player tank, minion, lane tower, and main base whose center lies within or exactly on a 120-world-unit radius around the landing point, including enemies concealed by fog. Each eligible entity SHALL receive at most one hit, with no distance falloff. Allies, the shooter, dead units, and destroyed structures SHALL NOT take Mortar damage.

Base blast damage SHALL equal the shooter's role- and progression-adjusted fire damage at launch multiplied by `2.0 + 0.2 * (Mortar level at launch - 1)`. Towers and main bases SHALL receive a further `3.0` damage multiplier; tanks and minions SHALL NOT receive this building multiplier. Launch-time values SHALL remain fixed for that shell even if progression changes in flight.

#### Scenario: Multiple target types in the blast
- **WHEN** a rank-1 Mortar launched with 12 fire damage impacts with an enemy tank, minion, tower, and base inside its radius
- **THEN** the tank and minion each receive 24 damage before existing mitigation
- **AND** the tower and base each receive 72 damage, unless the match has already ended

#### Scenario: Rank-10 damage
- **WHEN** a rank-10 Mortar launches with 12 fire damage
- **THEN** its blast damage is 45.6 against units before mitigation and 136.8 against buildings

#### Scenario: Blast boundary uses entity centers
- **WHEN** enemies have centers at distances of 120 and 120.01 world units from impact
- **THEN** the first takes one full hit and the second takes no damage regardless of sprite or hitbox size

#### Scenario: Allied or destroyed entity in the blast
- **WHEN** the blast overlaps allies, the shooter, dead tanks, or ruined towers
- **THEN** those entities take no Mortar damage

#### Scenario: Upgrade during flight
- **WHEN** the shooter gains fire damage or upgrades Mortar after launching a shell
- **THEN** that shell retains its original damage while subsequent shells use the upgraded values

### Requirement: Existing Damage and Death Outcomes
Mortar damage SHALL honor existing tank damage reduction, HP clamping, kill attribution, shared kill experience, damage statistics, tank respawn, tower ruins, and base-destruction match completion. A single explosion SHALL NOT duplicate deaths, rewards, or scoreboard entries, and SHALL stop additional damage once the match enters its terminal phase.

#### Scenario: Shielded tank is hit
- **WHEN** a shielded or entrenched enemy tank is inside the blast at impact
- **THEN** the existing strongest applicable damage reduction applies to Mortar damage

#### Scenario: Blast kills multiple enemies
- **WHEN** one blast kills multiple enemy minions or player tanks
- **THEN** each death produces its existing rewards and attribution exactly once

#### Scenario: Building destroyed
- **WHEN** Mortar reduces a tower or main base to zero HP
- **THEN** a tower remains a nonfunctional ruin or a main base ends the match under the existing rules

### Requirement: Independent Mortar Cooldown
Mortar SHALL have a base cooldown of 24000 milliseconds beginning only on a valid launch. At ability level L, the cooldown SHALL be `round(24000 * max(0.5, 1 - 0.03 * (L - 1)))` milliseconds. Aiming, cancelling, invalid requests, and empty-area impacts SHALL NOT create additional cooldown changes. Firing or upgrading Mortar SHALL NOT reset another ability's cooldown.

#### Scenario: Rank endpoints
- **WHEN** Mortar launches at rank 1 or rank 10
- **THEN** its cooldown starts at 24000 or 17520 milliseconds respectively

#### Scenario: Empty area is still a committed shot
- **WHEN** a valid shell lands without any eligible enemy in the blast
- **THEN** its launch cooldown remains spent without refund

#### Scenario: Mortar and Rocket are independent
- **WHEN** Mortar is on cooldown and a learned Homing Rocket is ready
- **THEN** Homing Rocket remains usable under its unchanged target-selection rules

### Requirement: Readable and Fog-Safe Presentation
The frontend SHALL depict Mortar as an oversized cannonball visually distinct from ordinary bullets, with an apparent arcing flight and a brief explosion indicating the actual blast radius. The firing team SHALL be able to see its shell and intended-point/impact effects even over concealed terrain. Opponents SHALL see the shell only while its ground position is currently visible to their team, and an impact effect only when its landing point is currently visible at impact.

Mortar SHALL NOT provide sight or reveal concealed entities, entity identities, health bars, minimap dots, target markers, or hit/no-hit feedback. Enemy recipients SHALL NOT receive concealed shooter identities or concealed launch/destination coordinates through shell trajectory metadata. Impact notifications SHALL NOT disclose victim identities or victim-specific state. Removing a shell from a client's view due to concealment or match cleanup SHALL NOT produce a false explosion.

#### Scenario: Blind impact hits a hidden enemy
- **WHEN** a Mortar damages an enemy outside the firing team's vision
- **THEN** the firing team sees its ground impact effect but not the concealed enemy, victim health, or a victim-specific hit confirmation
- **AND** the shot creates no new team vision

#### Scenario: Opponent loses sight of the shell
- **WHEN** an opposing shell leaves the observing team's current vision
- **THEN** its presentation disappears without a false impact effect or concealed trajectory metadata

#### Scenario: Visible impact after concealed travel
- **WHEN** an opponent cannot see a shell's earlier travel but can see its landing point at impact
- **THEN** that opponent sees one brief explosion without disclosure of concealed launch coordinates or shooter identity
