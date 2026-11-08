# Proposal

## Why

The arena camera uses a fixed 1:1 scale, so players cannot get a wider tactical overview or a closer look at a fight. On small mobile screens the fixed scale shows very little of the 2400x1800 arena, which makes positioning and target selection hard.

## What Changes

- Add a player-controlled zoom level for the arena camera during a started match.
- Desktop: the mouse wheel alone zooms in and out in small multiplicative steps; Ctrl+wheel does not control the game camera.
- Mobile/touch: a two-finger pinch gesture zooms in and out; single-finger taps keep working as click-to-move/attack.
- Zoom is clamped to a fixed range and never zooms out far enough to show space beyond the world edges.
- The camera keeps following the local tank; zoom is centered on the screen (the followed tank), not the cursor.
- HUD elements (ability bar, status text, minimap) stay at their normal screen size and position regardless of zoom.
- World pointer commands (move, attack, mortar/rocket/shock targeting) keep resolving to the correct world position at any zoom level.
- Handled mouse-wheel and touch-pinch gestures do not scroll or zoom the browser page; Ctrl+wheel remains available to the browser.
- Zoom resets to the default level when leaving the arena (menu/lobby always show the unzoomed view).

## Capabilities

### New Capabilities
- `camera-zoom`: Player-controlled arena camera zoom via mouse wheel and touch pinch, including zoom limits, HUD independence, input isolation and lifecycle reset.

### Modified Capabilities
<!-- None: camera-follow, mouse-click-control and minimap requirements remain valid as written at any zoom level. -->

## Impact

- `frontend/src/GameScene.ts`: camera setup, wheel/pinch input handling, HUD camera separation, reset on leaving the arena.
- New pure helper module in `frontend/src` (zoom clamping/step and pinch math) with a `node:test` unit test added to the frontend `test` script.
- `frontend/src/FogPresentation.ts`: minimap container must render on the HUD camera only.
- `frontend/index.html`: touch handling to prevent native browser pinch zoom over the game without disabling browser zoom globally.
- No backend, shared schema or networking changes.
