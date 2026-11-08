# Tasks

## 1. Zoom math module

- [x] 1.1 Create `frontend/src/cameraZoom.ts` with `DEFAULT_ZOOM`, `MAX_ZOOM`, `BASE_MIN_ZOOM`, `WHEEL_STEP`, `getMinZoom(viewport)`, `clampZoom`, `wheelZoom` and `pinchZoom` as described in design.md §3; verify `npm run build --workspace=frontend` type-checks
- [x] 1.2 Add `frontend/src/cameraZoom.test.ts` covering wheel in/out steps, max/min clamping, viewport-derived min zoom (view never exceeds 2400x1800), pinch ratio scaling and zero/invalid distance handling; add it to the frontend `test` script and verify `npm test --workspace=frontend` passes

## 2. HUD camera separation

- [x] 2.1 Add a `uiCamera` in `GameScene.create()` and a per-frame assignment that makes scroll-factor-0 top-level objects and menu elements render only on the UI camera and all other objects only on the main camera; resize the UI camera on `RESIZE`; verify by temporarily setting main zoom to 2 that the HUD bar, status text, minimap, menus and results screen render unscaled in place
- [x] 2.2 Verify HUD interactions still work with a zoomed main camera: ability buttons, upgrade buttons, rocket/shock/mortar target selection, and minimap clicks issue no arena commands

## 3. Wheel zoom and lifecycle

- [x] 3.1 Register a non-passive canvas `wheel` handler in `GameScene` that applies `wheelZoom` without Ctrl only during a started match and outside the HUD, preventing default page scrolling only for handled events; configure Phaser not to suppress Ctrl+wheel. Verify with automated input tests and in the browser that normal wheel zooms within limits, Ctrl+wheel leaves the camera unchanged and is not prevented, and wheel does nothing in menu/lobby or over the HUD
- [x] 3.2 Extend `resetCamera()` and arena start to reset zoom to `DEFAULT_ZOOM` and clear pinch state, and re-clamp zoom in `handleResize`; verify zoom resets after leaving a match and that enlarging the window while zoomed out never shows space beyond the world edges
- [x] 3.3 Verify clicks, attack locks, click markers and the mortar preview land on the world position under the cursor at min, default and max zoom

## 4. Pinch zoom on touch

- [x] 4.1 Enable multiple touch pointers and implement pinch tracking (start distance/zoom, `pointermove` update via `pinchZoom`, gesture end when fewer than two pointers, suppression until all are released); verify with browser devtools touch emulation or a real phone that spreading/pinching zooms within limits
- [x] 4.2 Defer single-finger arena commands until release and cancel them when a second touch begins, a touch is cancelled or released outside the arena, or the match ends; verify taps still move/attack and no finger of a pinch issues commands or click markers

## 5. Touch gesture isolation

- [x] 5.1 Scope touch gesture suppression to the game canvas or container without disabling browser zoom globally or intercepting Ctrl+wheel; verify on a mobile browser (or emulation) that an in-game touch pinch does not scale the page, and verify Ctrl+wheel remains available to the browser

## 6. Integration check

- [ ] 6.1 Run `npm test --workspace=frontend` and `npm run build --workspace=frontend`, then play a match on desktop and a touch device confirming all `camera-zoom` spec scenarios
  - Frontend tests, build, desktop live match, and mobile-emulated live match passed; a physical touch-device check remains.
