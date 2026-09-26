# Spec Delta

## Purpose

Defines how the frontend's viewport tracks the local player's tank across a game world that is larger than the visible screen, so the player always sees the action around themselves without the entire map being shown at once.

## ADDED Requirements

### Requirement: Camera Follows Local Player
The frontend SHALL keep the local player's tank visible by continuously moving the camera's view toward the local player's current position each frame.

#### Scenario: Local player moves across the world
- **WHEN** the local player's tank position updates to a new location within the world
- **THEN** the camera view smoothly re-centers so the local player's tank remains visible on screen

#### Scenario: No local player tank present
- **WHEN** there is no local player tank yet (e.g. lobby/menu, or before the match has started)
- **THEN** the camera does not attempt to follow and instead shows its default/menu view

### Requirement: Camera Bounded to World Edges
The frontend SHALL constrain the camera so it never scrolls to show any area outside the game world's boundaries.

#### Scenario: Local player near a world edge
- **WHEN** the local player's tank is near or at the edge of the world
- **THEN** the camera stops at the world boundary, showing area up to the edge without revealing space beyond it, even though the player tank may no longer be centered

### Requirement: Only a Portion of the World Is Visible at Once
The frontend SHALL render only the portion of the game world currently within the camera's viewport, since the world is larger than a single screen.

#### Scenario: Entities outside the current viewport
- **WHEN** a tank, minion, base, or projectile is positioned outside the camera's current viewport
- **THEN** that entity is not rendered on screen until the camera's viewport moves to include its position
