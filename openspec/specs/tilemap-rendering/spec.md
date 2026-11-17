## Purpose

Rendert den Arena-Hintergrund als Tilemap aus kachelbaren Texturen, sodass die Spielwelt einen strukturierten visuellen Boden hat statt eines leeren Hintergrunds.

## Requirements

### Requirement: Tilemap-Datenformat
Das System SHALL das Tiled-kompatible JSON-Tilemap-Format unterstützen, das ein zweidimensionales Grid definiert und Tile-IDs pro Tile-Layer als flaches, zeilenweise angeordnetes Array in `layers[].data` speichert.

#### Scenario: Tilemap-Definition enthält Grid-Dimensionen und Tile-Typen
- **WHEN** eine Tilemap-JSON-Datei geladen wird
- **THEN** enthält sie die Grid-Breite, Grid-Höhe, Tile-Größe in Pixeln, eine Tile-Typ-zu-Textur-Zuordnung und pro Tile-Layer ein flaches Array mit Tile-IDs in zeilenweiser Reihenfolge
- **AND** enthält `layers[].data` für den 38 × 29 Tiles großen Arena-Layer genau 1102 skalare Tile-IDs statt verschachtelter Arrays

### Requirement: Tilemap deckt die Arena ab
Die Tilemap SHALL die gesamte Spielarena (2400×1800 Pixel) lückenlos mit Tiles abdecken.

#### Scenario: Keine sichtbaren Lücken in der Arena
- **WHEN** der Spieler die Kamera über die gesamte Arena bewegt
- **THEN** ist an jeder Position ein Tile sichtbar und es gibt keine schwarzen oder leeren Bereiche

### Requirement: Textur-Tiles für Gras und Stein
Das System SHALL mindestens zwei Tile-Typen unterstützen: einen Gras-Typ und einen Kopfsteinpflaster-Typ. Sichtbare Straßen SHALL aus derselben Lane-Pfad-Geometrie wie Minion-Wegpunkte und Turmpositionen abgeleitet werden, statt unabhängig festgelegt zu werden.

#### Scenario: Unterscheidbare Bodentypen
- **WHEN** die Arena gerendert wird
- **THEN** sind Gras-Tiles und Stein-Tiles visuell klar unterscheidbar durch ihre jeweilige Textur

### Requirement: Tilemap rendert unter allen Spielobjekten
Die Tilemap SHALL auf der untersten visuellen Ebene (niedrigster Depth-Wert) gerendert werden, sodass alle Spielobjekte (Tanks, Minions, Basen, Projektile, UI) darüber erscheinen.

#### Scenario: Spielobjekte überlagern die Tilemap
- **WHEN** ein Tank sich über verschiedene Tiles bewegt
- **THEN** wird der Tank immer über der Tilemap gerendert und nie von Tiles verdeckt

### Requirement: Tilemap scrollt mit der Kamera
Die Tilemap SHALL korrekt mit der Spielkamera mitscrollen, wenn diese dem Spieler folgt.

#### Scenario: Kamera-Follow mit Tilemap
- **WHEN** die Kamera dem Spieler-Tank folgt und sich über die Arena bewegt
- **THEN** bewegt sich die Tilemap synchron mit, sodass die Bodentexturen zur Spielerposition passen

### Requirement: Configurable road width and clear inter-lane grass spacing

The arena SHALL provide centrally adjustable road-width and clear-grass-gap factors relative to the pre-change geometry. Their defaults SHALL be 1.38 and 0.90 respectively; the road-width default is 15% greater than the previously configured factor of 1.20. The road-width factor SHALL apply to both the paved width and the total outer-border width. The grass gap SHALL be measured perpendicular to adjacent parallel lane sections between their facing outer road borders, not between their centerlines. Arena bounds, base positions, the middle lane, horizontal turn coordinates, and the three-lane topology SHALL remain unchanged.

#### Scenario: Default dimensions are applied
- **WHEN** an arena uses the default factors
- **THEN** the paved road width is 154.56 world units instead of 112 and the total outer-border width is 171.12 instead of 124
- **AND** each clear grass gap between the parallel sections is 563.4 world units instead of 626
- **AND** the upper, middle, and lower parallel lane centerlines are at y = 165.48, 900, and 1634.52 respectively
- **AND** the arena remains 2400 by 1800 world units with unchanged base positions

#### Scenario: Road width is adjusted independently of the grass gap
- **WHEN** the road-width factor changes while the grass-gap factor remains 0.90
- **THEN** road widths change relative to their original dimensions
- **AND** lane centerlines are recomputed so each clear grass gap remains 563.4 world units
- **AND** changing road width from 1.20 to 1.38 increases the paved width from 134.4 to 154.56 and the outer-border width from 148.8 to 171.12 world units

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
