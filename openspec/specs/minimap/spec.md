# minimap Specification

## Purpose

Provide a compact full-arena overview of terrain, shared team vision, and unit and tower positions without exposing enemies concealed by fog of war.

## Requirements

### Requirement: Fixed Full Arena Overview
During a started match the frontend SHALL display a read-only minimap anchored to the screen's upper-right area, showing the entire arena with preserved world aspect ratio, recognizable grass and roads, and current team fog. It SHALL remain independent of world camera movement and avoid the title and ability controls.

#### Scenario: Camera moves
- **WHEN** the camera follows the local tank across the arena
- **THEN** the minimap stays in its HUD position and continues showing the whole arena

#### Scenario: Viewport resizes
- **WHEN** the viewport size changes
- **THEN** the minimap resizes or repositions within the viewport without distorting coordinates or covering required HUD controls

### Requirement: Visibility Filtered Team Dots
The minimap SHALL show living allied tanks and minions and intact allied lane towers and main bases as small team-colored dots. It SHALL show the corresponding enemy dots only while their centers are currently visible to the local team. Blue and red SHALL represent their respective teams, and the local player's dot SHALL have an additional distinguishing outline.

#### Scenario: Visible enemy becomes concealed
- **WHEN** an enemy leaves all allied sight areas
- **THEN** its minimap dot disappears with its arena presentation and no last-known-position dot remains

#### Scenario: Distant allied unit
- **WHEN** a living ally is outside the camera viewport or in locally dark terrain
- **THEN** its dot remains visible at its correctly projected arena position

#### Scenario: Dead unit or destroyed tower
- **WHEN** a unit dies or a structure is destroyed
- **THEN** its active dot is removed and it no longer reveals fog

### Requirement: Minimap Input and Lifecycle Isolation
Pointer actions inside the minimap SHALL NOT issue movement, attack, or targeted-ability commands or alter camera position. Fog and minimap presentation SHALL be removed when leaving the arena and recreated without duplicate elements or stale enemy dots on a subsequent match.

#### Scenario: Click on minimap
- **WHEN** the player clicks the minimap while moving or selecting a rocket target
- **THEN** no arena command or rocket activation is generated and no world camera navigation occurs

#### Scenario: Return to menu and join again
- **WHEN** a player leaves a match for the menu and subsequently starts another match
- **THEN** the old minimap and fog are gone and exactly one fresh minimap uses the new match's team and vision
