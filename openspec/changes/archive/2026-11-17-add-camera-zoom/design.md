# Design

## Context

- Phaser 3.88 with `Scale.RESIZE`; the world is 2400x1800 and the single main camera follows the local tank (`startFollow` with lerp 0.1, bounded by `setBounds`).
- All HUD elements (status text, ability bar, minimap container in `FogPresentation`, results/menus) live on the same main camera with `setScrollFactor(0)`. In Phaser, camera zoom still scales scroll-factor-0 objects around the camera center, so zooming the main camera alone would distort and misplace the HUD and break its hit areas.
- Arena commands are issued on `pointerdown` in `handlePointerClick`, using `pointer.updateWorldPoint(this.cameras.main)`, which already respects camera zoom. HUD exclusion uses screen-space checks (`HUD_BAR_HEIGHT`, `fog.contains`).
- Phaser only tracks one touch pointer by default, so a second finger is not reported unless extra pointers are added.

## Goals / Non-Goals

**Goals:**
- Wheel and pinch zoom for the arena camera with HUD unaffected.
- Keep zoom logic (clamping, wheel step, pinch ratio) in a pure, unit-tested module.

**Non-Goals:**
- Cursor- or pinch-midpoint-anchored zoom (the camera keeps following the tank, so zoom is centered on the tank).
- Free camera panning / drag-to-pan or edge scrolling.
- On-screen +/- zoom buttons, keyboard zoom shortcuts, or persisting zoom across matches/reloads.
- Changing minimap behavior (it remains a fixed full-arena overview).

## Decisions

### 1. Separate HUD camera
Add a second `uiCamera` (zoom 1, no scroll, transparent) on top of the main camera. Before each render, assign top-level scroll-factor-0 objects and all `menuElements` to the UI camera, and the remaining objects to the world camera, using `cameraFilter`. Container children follow their container. Menu elements must be included explicitly because their existing scroll factors are not all zero; otherwise the results background would cover menu text and buttons.
- *Why*: HUD creation is spread across many call sites; a scroll-factor rule needs no per-call changes and stays correct for future HUD elements.
- *Alternatives*: (a) counter-scale and reposition every HUD object by `1/zoom` – fragile, breaks text crispness and hit areas; (b) move HUD to a separate overlay Scene – large refactor of shared state and input routing; (c) explicit `uiCamera.ignore` calls at each creation site – easy to forget.
- Input: Phaser hit-tests per camera and respects camera filters, so HUD buttons hit-test through the UI camera at zoom 1 and world objects through the zoomed main camera. Verify during implementation that HUD `pointerdown` handlers still fire.

### 2. Zoom centered on the followed tank
Apply `cameras.main.setZoom(z)` only; keep `startFollow`. Phaser's follow + bounds clamping recenters automatically.
- *Why*: Cursor-anchored zoom would be immediately undone by follow. Simple and predictable on mobile.

### 3. Zoom limits and steps (pure module `cameraZoom.ts`)
- `DEFAULT_ZOOM = 1`, `MAX_ZOOM = 2`, `BASE_MIN_ZOOM = 0.5`, `WHEEL_STEP = 1.1` per notch (`deltaY < 0` → multiply, `> 0` → divide).
- Effective min zoom = `max(BASE_MIN_ZOOM, viewportWidth / WORLD_WIDTH, viewportHeight / WORLD_HEIGHT)` so the view never exceeds the world (keeps `camera-follow` bounds requirement intact). If effective min > MAX, clamp to effective min.
- Functions: `clampZoom(z, viewport)`, `wheelZoom(current, deltaY, viewport)`, `pinchZoom(startZoom, startDistance, currentDistance, viewport)`.
- Re-clamp on `RESIZE`.

### 4. Pinch handling
- Add touch pointers up to Phaser's limit so additional fingers cannot escape the multi-touch suppression.
- Track gesture state: when two pointers are down, record start distance and start zoom; on `pointermove` with both down, apply `pinchZoom`. Gesture ends when fewer than two pointers are down; a `pinchActive` flag stays set until all pointers are released.
- Defer an arena touch command until the sole finger is released. If another finger touches before release, cancel the pending command and suppress all touch commands until every finger is released; a pinch never emits a command or marker. Mouse clicks remain immediate.
- Defer touch activation of ability and upgrade buttons until release as well, so a second finger landing on a HUD control during a pinch cannot activate it. Require the touch to start and end on the same button.
- Cancel pending touch commands when the touch is cancelled, released outside the arena, or the match ends.

### 5. Wheel handling
Configure Phaser with `input.mouse.preventDefaultWheel: false` so it does not suppress every wheel event. Its wheel listener is then passive, so use a separate non-passive canvas listener for game zoom and remove it on scene shutdown. Handle the wheel without requiring Ctrl, only when `arenaStarted && phase === 'started'`, and only outside the HUD. Ignore events with `ctrlKey` set and do not call `preventDefault` on them, allowing the browser's default action. Prevent the default action only for wheel events consumed by the game.

### 6. Touch gesture isolation
- Use `touch-action: none` on the game canvas or container to keep an in-game touch pinch from also scaling or scrolling the page.
- If platform-specific touch gesture handlers are needed, scope them to touch gestures on the game canvas. Do not intercept Ctrl+wheel or disable browser zoom globally with `maximum-scale=1` or `user-scalable=no`.
- Some trackpad pinch gestures appear as Ctrl+wheel events; these remain browser gestures rather than camera zoom.

### 7. Lifecycle
`resetCamera()` (already called on every menu/lobby/results transition) also resets zoom to `DEFAULT_ZOOM` and clears pinch state. Arena start sets default zoom explicitly.

## Risks / Trade-offs

- [Per-frame camera assignment cost] → Only iterates top-level display list (a few hundred objects) and only writes when the filter differs.
- [Phaser input with two cameras might double-hit or miss HUD objects] → Verify HUD buttons, rocket targeting and minimap click isolation manually at several zoom levels; fall back to explicit `ignore` calls if needed.
- [Touch commands now fire on release rather than on contact] → Keeps single-finger taps available while preventing accidental movement or targeting when a pinch begins.
- [Zooming out widens the visible area] → Fog of war still hides enemies outside team vision, and min zoom is bounded, so no information advantage beyond terrain.
- [Text/graphics blur at high zoom] → Max zoom of 2 keeps blur acceptable; world graphics are vector-drawn.
- [Browser touch handling varies] → Verify touch-pinch isolation on mobile browsers without suppressing Ctrl+wheel or disabling page zoom globally.

## Migration Plan

Frontend-only; ships with the normal Render static-site deploy. Rollback by reverting the commit.
