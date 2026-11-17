# Spec Delta

## Purpose

Lets players change the arena camera's zoom level with the mouse wheel on desktop or a pinch gesture on touch devices, without affecting the HUD or command accuracy.

## ADDED Requirements

### Requirement: Mouse Wheel Zoom
During a started match the frontend SHALL zoom the arena camera in when the player scrolls the mouse wheel up and out when the player scrolls it down, without requiring Ctrl, changing the zoom by a fixed multiplicative step per wheel notch. Ctrl+wheel SHALL NOT change the arena camera zoom.

#### Scenario: Scroll up over the arena
- **WHEN** the player scrolls the mouse wheel up over the arena during a started match without holding Ctrl
- **THEN** the arena view zooms in by one step while the camera keeps following the local tank

#### Scenario: Scroll down over the arena
- **WHEN** the player scrolls the mouse wheel down over the arena during a started match without holding Ctrl
- **THEN** the arena view zooms out by one step

#### Scenario: Scroll outside a started match
- **WHEN** the player scrolls the mouse wheel in the main menu, lobby, or results screen
- **THEN** the camera zoom does not change

#### Scenario: Scroll while holding Ctrl
- **WHEN** the player scrolls the mouse wheel over the arena while holding Ctrl
- **THEN** the arena camera zoom does not change
- **AND** the game does not prevent the browser's default Ctrl+wheel action

### Requirement: Touch Pinch Zoom
During a started match the frontend SHALL zoom the arena camera in proportion to the change in distance between two simultaneous touch points: spreading the fingers zooms in, pinching them together zooms out.

#### Scenario: Spread two fingers
- **WHEN** the player places two fingers on the arena and moves them apart
- **THEN** the zoom increases proportionally to the distance ratio relative to the gesture start, within the zoom limits

#### Scenario: Pinch two fingers together
- **WHEN** the player places two fingers on the arena and moves them closer together
- **THEN** the zoom decreases proportionally to the distance ratio relative to the gesture start, within the zoom limits

#### Scenario: Single-finger tap still commands the tank
- **WHEN** the player taps the arena with a single finger and no pinch gesture is active
- **THEN** the tap is handled as a click-to-move or click-to-attack command exactly as a left click

### Requirement: Gestures Do Not Issue Commands
Pointer input that is part of a pinch gesture SHALL NOT issue movement, attack, or targeted-ability commands, and SHALL NOT show click feedback markers.

#### Scenario: Second finger lands
- **WHEN** a second finger touches the arena while one finger is already down
- **THEN** no command is issued for the second touch and a pinch gesture begins

#### Scenario: Fingers lift after pinch
- **WHEN** the player lifts the fingers at the end of a pinch gesture
- **THEN** no command is issued until all fingers have been released and a new tap begins

### Requirement: Zoom Limits
The camera zoom SHALL stay within a fixed minimum and maximum, and SHALL NOT zoom out so far that the visible area exceeds the world in either dimension.

#### Scenario: Zoom past maximum
- **WHEN** the player keeps zooming in at the maximum zoom
- **THEN** the zoom stays at the maximum

#### Scenario: Zoom past minimum
- **WHEN** the player keeps zooming out at the minimum zoom
- **THEN** the zoom stays at the minimum and no area outside the world boundaries becomes visible

#### Scenario: Viewport resizes while zoomed out
- **WHEN** the viewport grows so the current zoom would show area beyond the world edges
- **THEN** the zoom is raised to the smallest value that keeps the view within the world

### Requirement: HUD Unaffected by Zoom
The ability HUD bar, status text, and minimap SHALL keep their screen size, position, and pointer interaction regardless of the arena zoom level, and SHALL NOT react to wheel or pinch zoom input on them.

#### Scenario: Zoomed arena
- **WHEN** the arena is zoomed in or out
- **THEN** the HUD bar, ability buttons, status text, and minimap render at the same screen size and position as at default zoom and remain clickable

#### Scenario: Wheel over the HUD
- **WHEN** the player scrolls the mouse wheel over the HUD bar or minimap
- **THEN** the arena zoom does not change

### Requirement: Commands Resolve Correctly at Any Zoom
Arena clicks, taps, and targeting previews SHALL resolve to the world position under the pointer at the current zoom level.

#### Scenario: Click while zoomed
- **WHEN** the player clicks a point or an enemy in the arena while the camera is zoomed in or out
- **THEN** the move destination, attack target, or ability target is the world position or entity shown under the pointer

### Requirement: Browser Input Isolation
Mouse-wheel and touch-pinch gestures handled as game zoom SHALL NOT scroll or zoom the browser page. The game SHALL NOT disable browser zoom globally or suppress Ctrl+wheel.

#### Scenario: Pinch on mobile browser
- **WHEN** the player pinches on the game on a mobile browser
- **THEN** only the arena camera zoom changes and the page layout scale stays unchanged

#### Scenario: Normal wheel over the arena
- **WHEN** the player scrolls the mouse wheel over the arena without holding Ctrl during a started match
- **THEN** the game zooms the arena without scrolling the browser page

### Requirement: Zoom Resets When Leaving the Arena
The camera zoom SHALL reset to the default level when the player leaves the arena, and each new match SHALL start at the default zoom.

#### Scenario: Return to menu after zooming
- **WHEN** the player leaves a match while zoomed in or out
- **THEN** the main menu and lobby render at the default zoom

#### Scenario: Start next match
- **WHEN** a new match starts after a previous zoomed match
- **THEN** the arena camera starts at the default zoom
