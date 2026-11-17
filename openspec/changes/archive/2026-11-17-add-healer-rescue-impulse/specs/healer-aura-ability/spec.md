## MODIFIED Requirements

### Requirement: Heal Aura Affects Nearby Allies
While active, the Healer Aura SHALL heal the Healer and every living allied tank and minion within a fixed radius of the Healer's current position at a rate per second derived from the ability's current learned level, for a fixed duration.

#### Scenario: Ally within radius is healed
- **WHEN** the Healer Aura is active
- **AND** a living allied tank or minion is within the aura's radius of the Healer
- **THEN** that ally's health increases by the aura's heal rate at its current learned level each second, up to the ally's current maximum health including progression bonuses

#### Scenario: Ally leaves the radius
- **WHEN** the Healer Aura is active
- **AND** an allied tank or minion moves outside the aura's radius
- **THEN** that ally stops receiving healing from the aura until it re-enters the radius

#### Scenario: Enemy tanks are unaffected
- **WHEN** the Healer Aura is active
- **AND** an enemy tank is within the aura's radius
- **THEN** the enemy tank does not receive healing from the aura

#### Scenario: Enemy and dead minions are unaffected
- **WHEN** the Healer Aura is active
- **AND** an enemy unit or dead minion is within the aura's radius
- **THEN** that unit does not receive healing from the aura
