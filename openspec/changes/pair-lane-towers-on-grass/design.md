# Design

## Context

See proposal.md for motivation and scope. `getLaneTowerPlacements` currently samples each team's lane path at fractions 0.2 and 0.4 and emits one centerline tower per checkpoint. `GameRoom.createLaneTowers` identifies those entities using team, lane index, and tower index.

The shared lane paths include diagonal approach segments on outer lanes and a straight middle lane. The current stone width is 154.56 world units, but the full rendered border is 171.12 units and is included in `VisionTerrain`'s non-grass classification. Tower graphics and ruins scale with `WORLD_SCALE.entity`; the server's radius of 24 alone does not encompass every visual corner. Existing frontend and minimap presentation consume entity coordinates rather than generating tower positions.

## Goals / Non-Goals

**Goals:** Use deterministic, symmetric geometry with measurable whole-footprint grass clearance, preserve checkpoint progression along each lane, and give each member of a pair an independent stable entity identity.

**Non-Goals:** Change road geometry, minion waypoints, world dimensions, tower artwork, cannon aiming or idle orientation, per-tower stats, collision rules, or terrain/vision rules. "Opposite" describes positions across the road, not cannons forced to aim at each other.

## Decisions

### Derive pairs from existing checkpoints and local lane normals

Keep fractions 0.2 and 0.4 measured from each team's base. Obtain the anchor and normalized tangent of the polyline segment containing each anchor, then place towers at equal positive and negative offsets along its perpendicular. The midpoint remains exactly the previous tower position.

Reuse the shared path sampling semantics, extending geometry support only as needed to obtain a tangent. If sampling hits a vertex exactly, choose the incoming non-zero segment consistently with the existing sampler; skip zero-length segments and report invalid all-degenerate geometry explicitly. Current arena anchors do not sit on a turn.

A global vertical offset was rejected because it does not place towers directly opposite one another across diagonal roads. Moving checkpoints away from their existing fractions was rejected because the request preserves their longitudinal locations.

### Derive clearance from the road border and full tower footprint

Use half of `LANE_BORDER_WIDTH` plus a conservative scaled tower footprint radius plus a small explicit positive grass gap as the lateral offset. Define that footprint from the existing outpost, cannon's full rotation envelope, strokes, and ruin dimensions; also cover the server radius. Reuse an existing shared measurement if suitable, otherwise expose only the minimum shared dimension needed to avoid unrelated literal copies.

Validate each resulting footprint against the union of all lane segments, including round joins and caps, not just its generating segment, and against world bounds. A conservative circular bound is acceptable for the existing rectangular artwork and keeps diagonal clearance simple. Tests must establish that all current arena anchors satisfy these constraints; do not independently clamp or slide towers to conceal invalid geometry, since that would break symmetry and checkpoint preservation.

Checking only `isGrass(towerCenter)` was rejected because a tower could still visibly overlap stone or its border.

### Keep checkpoints and side identity distinct

Retain `towerIndex` as the existing checkpoint index and add a placement-only side discriminator, such as `left`/`right` relative to blue-to-red lane order. Include it in the server-created tower ID. No replicated schema change or paired-tower entity is needed: the two towers have the same owner but independent HP, cooldowns, targeting, shot feedback, and ruins.

Assigning both members the old ID would overwrite one map entry. Treating the pair as a single combat structure would change destruction and targeting semantics unnecessarily.

### Reuse normal terrain and client behavior

The normal authoritative position replication drives arena graphics, health bars, hit testing, minimap, and ruins. Verify those surfaces rather than introducing client-only placement offsets. Preserve grass observer penalties and visibility costs; towers gain no special road-like vision exemption. The total number of structures and their coverage change intentionally, but individual tower stats do not.

## Risks / Trade-offs

- [Twice as many towers increases defensive damage potential and simulation/replication work] -> Keep individual balance values unchanged, verify independent combat, and avoid unrequested balancing changes.
- [Grass placement reduces a tower's own effective sight] -> Preserve existing terrain rules and verify acquisition both with self-vision and allied spotting; do not silently compensate.
- [A center is grassy but corners or cannon still overlap the road] -> Use a full scaled footprint bound, positive gap, and checks against all road segments.
- [Side labels reverse when sampling from the red base] -> Define side in canonical blue-to-red orientation and test deterministic unique IDs for both teams.
- [Future geometry or scale changes invalidate placement] -> Cover the actual arena and derived dimensions in regression tests; fail invalid geometry explicitly rather than producing asymmetric or on-road fallbacks.

## Migration Plan

Generate the new positions when matches start. No persistent data migration or new network fields are required; existing IDs are match-local. Deploy with the normal application release process. Roll back the placement and identity changes together for subsequent matches if necessary.
