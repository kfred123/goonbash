# Spec Delta

## Purpose

Rendert den Arena-Hintergrund als Tilemap aus kachelbaren Texturen, sodass die Spielwelt einen strukturierten visuellen Boden hat statt eines leeren Hintergrunds.

## ADDED Requirements

### Requirement: Tilemap-Datenformat
Das System SHALL ein JSON-basiertes Tilemap-Format unterstützen, das eine zweidimensionale Grid-Struktur mit Tile-Typ-Zuweisungen definiert.

#### Scenario: Tilemap-Definition enthält Grid-Dimensionen und Tile-Typen
- **WHEN** eine Tilemap-JSON-Datei geladen wird
- **THEN** enthält sie die Grid-Breite, Grid-Höhe, Tile-Größe in Pixeln, eine Tile-Typ-zu-Textur-Zuordnung und ein 2D-Array mit Tile-Typ-IDs

### Requirement: Tilemap deckt die Arena ab
Die Tilemap SHALL die gesamte Spielarena (2400×1800 Pixel) lückenlos mit Tiles abdecken.

#### Scenario: Keine sichtbaren Lücken in der Arena
- **WHEN** der Spieler die Kamera über die gesamte Arena bewegt
- **THEN** ist an jeder Position ein Tile sichtbar und es gibt keine schwarzen oder leeren Bereiche

### Requirement: Textur-Tiles für Gras und Stein
Das System SHALL mindestens zwei Tile-Typen unterstützen: einen Gras-Typ und einen Kopfsteinpflaster-Typ.

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
