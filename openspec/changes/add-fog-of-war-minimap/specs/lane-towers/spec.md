## MODIFIED Requirements

### Requirement: Tower Auto-Attack
A tower SHALL automatically detect and attack the nearest living enemy tank, minion, or opposing tower within its fire range that is currently visible to its team, on a fixed cooldown, the same way bases and minions engage visible enemies. It SHALL require current team visibility for each new shot, including vision supplied by another allied observer. Neither the visual redesign nor fog of war SHALL change its existing fire range, cooldown, or damage.

#### Scenario: Enemy minion enters tower range
- **WHEN** a team-visible enemy minion moves within a tower's fire range and the tower is not on cooldown
- **THEN** the tower fires at that minion and begins its fire cooldown

#### Scenario: No enemy in range
- **WHEN** no team-visible enemy entity is within a tower's fire range
- **THEN** the tower does not fire

#### Scenario: Tower appearance is updated
- **WHEN** a lane tower uses the outpost visual design
- **THEN** its existing fire range, cooldown, and damage remain unchanged

#### Scenario: Hidden enemy is inside firing range
- **WHEN** an enemy inside the tower's fire range is concealed by terrain and no ally reveals it
- **THEN** the tower does not acquire or fire at that enemy
