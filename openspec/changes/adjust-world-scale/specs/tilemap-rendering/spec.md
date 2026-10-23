# Spec Delta

## ADDED Requirements

### Requirement: Configurable road width and clear inter-lane grass spacing

The arena SHALL provide centrally adjustable road-width and clear-grass-gap factors relative to the pre-change geometry. Their defaults SHALL be 1.20 and 0.90 respectively. The road-width factor SHALL apply to both the paved width and the total outer-border width. The grass gap SHALL be measured perpendicular to adjacent parallel lane sections between their facing outer road borders, not between their centerlines. Arena bounds, base positions, the middle lane, horizontal turn coordinates, and the three-lane topology SHALL remain unchanged.

#### Scenario: Default dimensions are applied
- **WHEN** an arena uses the default factors
- **THEN** the paved road width is 134.4 world units instead of 112 and the total outer-border width is 148.8 instead of 124
- **AND** each clear grass gap between the parallel sections is 563.4 world units instead of 626
- **AND** the upper, middle, and lower parallel lane centerlines are at y = 187.8, 900, and 1612.2 respectively
- **AND** the arena remains 2400 by 1800 world units with unchanged base positions

#### Scenario: Road width is adjusted independently of the grass gap
- **WHEN** the road-width factor changes while the grass-gap factor remains 0.90
- **THEN** road widths change relative to their original dimensions
- **AND** lane centerlines are recomputed so each clear grass gap remains 563.4 world units

#### Scenario: Baseline geometry can be restored
- **WHEN** both geometry factors are set to 1.00
- **THEN** the road widths return to 112 and 124 world units
- **AND** the parallel centerlines return to y = 150, 900, and 1650
- **AND** each clear grass gap returns to 626 world units

### Requirement: Scaled terrain remains consistent across game systems

Rendered roads, authoritative minion paths, path-relative tower positions, minimap terrain, and road-dependent visibility SHALL use the same adjusted lane geometry. Geometry adjustment SHALL preserve two distinct towers per team per lane, bidirectional traversal, and the existing terrain visibility rules.

#### Scenario: Units and towers follow the adjusted roads
- **WHEN** an arena starts with adjusted geometry
- **THEN** both teams' minions follow paths along the rendered road centerlines
- **AND** all 12 lane towers are placed on their corresponding adjusted paths without coincident same-team tower positions

#### Scenario: Minimap and visibility agree with the adjusted terrain
- **WHEN** the adjusted arena is rendered and team vision is evaluated
- **THEN** minimap roads depict the adjusted widths and paths
- **AND** road-dependent vision classification uses the adjusted borders with the existing visibility costs and ranges
