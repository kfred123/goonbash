## MODIFIED Requirements

### Requirement: Capture Player Input
The frontend SHALL capture player mouse clicks and translate them into move-to-point and attack-target commands.

#### Scenario: Player clicks the game field to move
- **WHEN** the player left-clicks a point on the game field with no enemy unit under the cursor
- **THEN** the frontend sends a move-to-point command containing that point's world coordinates to the backend

#### Scenario: Player clicks an enemy to attack
- **WHEN** the player left-clicks an enemy tank, minion, or enemy base sprite
- **THEN** the frontend sends an attack-target command containing that enemy's id to the backend
