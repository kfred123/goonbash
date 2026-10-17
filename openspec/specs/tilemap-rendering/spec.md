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
