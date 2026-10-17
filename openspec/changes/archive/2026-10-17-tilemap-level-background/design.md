# Design

## Context

Die GameScene (Phaser 3) rendert aktuell alle Spielobjekte als programmatische Formen (`add.rectangle`, `add.circle`, `add.graphics`) ohne Hintergrund. Die `preload()`-Methode ist leer. Im Ordner `assets/textures/` liegen kachelbare Texturen (`grass_texture.jpg` 1024×1024, `cobblestone_texture.jpg` 1024×1024), die aus der früheren Godot-Phase stammen. Die Spielwelt ist 2400×1800 Pixel groß (3× das 800×600 Viewport). Siehe proposal.md für die Motivation.

## Goals / Non-Goals

**Goals:**
- Arena hat einen visuell strukturierten Boden aus gekachelten Texturen
- Tilemap ist datengetrieben (JSON), damit das Layout ohne Code-Änderungen anpassbar ist
- Nahtlose Integration in die bestehende Kamera- und Depth-Logik

**Non-Goals:**
- Kein Tile-Editor oder Level-Editor — die Map wird manuell als JSON definiert
- Keine Kollisions-Logik auf Tile-Ebene — Tiles sind rein visuell
- Keine animierten Tiles
- Kein Einsatz der großen Arena-Map-PNG (Gemini_Generated_Image) — wir nutzen die kachelbaren Texturen

## Decisions

### 1. Phaser Tilemap API vs. manuelles Tile-Rendering

**Gewählt: Phaser Tilemap API** (`Phaser.Tilemaps.Tilemap`)

Phaser hat ein eingebautes Tilemap-System, das:
- Tiled-JSON-Format nativ unterstützt
- GPU-optimiertes Batch-Rendering von Tiles bietet
- Automatisch nur sichtbare Tiles rendert (Culling)
- Kamera-Integration out-of-the-box hat

**Alternative: Manuelles Grid aus `this.add.tileSprite()`**
- Einfacher, aber kein Culling, kein strukturiertes Tile-Typ-System
- Nicht skalierbar für spätere Erweiterungen (z.B. Hindernisse, Decorations)

**Rationale:** Die Tilemap-API ist der Standard in Phaser-Spielen und liefert optimales Rendering mit minimalem Code.

### 2. Tilemap-Datenformat

**Gewählt: Tiled-kompatibles JSON-Format**

Wir erstellen eine JSON-Datei im Tiled-Editor-kompatiblen Format, die Phaser direkt laden kann. Das ermöglicht:
- Direkten Import via `this.load.tilemapTiledJSON()`
- Zukunftsfähigkeit: falls ein Map-Editor gewünscht ist, kann Tiled direkt genutzt werden

**Alternative: Custom JSON + manuelles Parsing**
- Flexibler, aber unnötig wenn Phaser bereits ein bewährtes Format versteht

### 3. Tile-Größe

**Gewählt: 64×64 Pixel Tiles**

- Die Quell-Texturen (1024×1024) sind durch 64 teilbar → 16×16 Tile-Varianten pro Textur möglich, aber wir verwenden sie als einzelne sich wiederholende Tiles
- Bei 64px-Tiles: 38×29 Grid = 1.102 Tiles für die 2400×1800 Arena — performant
- Alternativ 128px: Nur 19×15 = 285 Tiles, aber die Texturen wirken dann gröber

### 4. Asset-Bereitstellung

**Gewählt: Texturen nach `frontend/public/assets/textures/` kopieren**

Phaser lädt Assets über HTTP-Pfade relativ zum Public-Verzeichnis. Statt komplexer Build-Pipeline-Integration kopieren wir die Texturdateien in den `public/`-Ordner, von wo Vite sie direkt ausliefert.

### 5. Arena-Layout

**Gewählt: Einfaches, symmetrisches MOBA-Layout**

```
 GRAS │ STEIN │ GRAS │ STEIN │ GRAS
──────┼───────┼──────┼───────┼──────
      │       │      │       │
 Base ▪───────┼──────┼───────▪ Base
 Blue │       │Center│       │ Red
      │       │      │       │
──────┼───────┼──────┼───────┼──────
 GRAS │ STEIN │ GRAS │ STEIN │ GRAS
```

- Grasfläche als Hauptboden
- Steinpflaster-Wege verbinden die Basen und das Zentrum (Lanes)
- Symmetrisch für beide Teams

### 6. Depth-Integration

Die Tilemap-Layer wird mit `setDepth(-1)` gerendert. Alle bestehenden Spielobjekte (Tanks, Minions, Basen, Projektile) haben implizit Depth 0+, das HUD hat Depth 2000+. Damit liegt die Tilemap garantiert unter allem.

## Risks / Trade-offs

- **[Textur-Qualität bei Zoom]** Die 1024×1024 Texturen werden auf 64px Tiles herunterskaliert → könnten matschig wirken → Mitigation: Kann zur Laufzeit evaluiert werden; Tile-Größe ist leicht anpassbar
- **[Initiale Ladezeit]** Zwei JPG-Texturen (~245 KB gesamt) müssen vor Spielstart geladen werden → Mitigation: Vernachlässigbar bei modernen Verbindungen; Preload geschieht in der Lobby-Phase
- **[Tiled-JSON Komplexität]** Das Tiled-Format hat viele optionale Felder → Mitigation: Wir nutzen nur die Minimal-Struktur, die Phaser benötigt
