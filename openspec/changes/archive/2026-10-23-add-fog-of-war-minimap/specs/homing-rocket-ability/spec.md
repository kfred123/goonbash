## ADDED Requirements

### Requirement: Visible Rocket Target Acquisition
The system SHALL require the selected enemy to be currently visible to the firing player's team in addition to all existing living-enemy, range, role, and cooldown conditions when acquiring a Homing Rocket target. The client SHALL exclude concealed targets from selection and the server SHALL reject concealed target IDs independently. Rejection SHALL NOT launch a rocket or consume cooldown. After a valid launch, loss of sight SHALL NOT interrupt the rocket's existing inescapable tracking or damage resolution and SHALL NOT reveal its concealed target.

#### Scenario: Select concealed target
- **WHEN** the player attempts to select an enemy outside their team's current sight
- **THEN** no rocket target is acquired and no rocket is launched

#### Scenario: Visibility is lost before activation reaches the server
- **WHEN** an otherwise eligible rocket activation arrives after the enemy has left team vision
- **THEN** the server rejects the activation without consuming cooldown and communicates the rejection to the requesting client

#### Scenario: Sight is lost after launch
- **WHEN** a validly launched rocket's living target becomes concealed
- **THEN** the rocket continues tracking and can damage the target without revealing its hidden entity presentation
