# Tasks

## 1. Asset-Setup

- [x] 1.1 Kopiere `assets/textures/grass_texture.jpg` und `assets/textures/cobblestone_texture.jpg` nach `frontend/public/assets/textures/`. Verifizierung: Beide Dateien existieren unter `frontend/public/assets/textures/` und sind über `http://localhost:5173/assets/textures/grass_texture.jpg` erreichbar.
- [x] 1.2 Erstelle die Tilemap-JSON-Datei `frontend/public/assets/maps/arena.json` im Tiled-kompatiblen Format. Das Grid muss 38×29 Tiles à 64px umfassen (= 2432×1856, abdeckend für die 2400×1800 Arena). Layout: Grasfläche als Basis, Kopfsteinpflaster-Lanes die Basen und das Zentrum verbinden (symmetrisch für Blue/Red). Verifizierung: Die JSON-Datei ist valides JSON, enthält `width: 38`, `height: 29`, `tilewidth: 64`, `tileheight: 64`, ein `layers`-Array mit einem Tile-Layer und ein `tilesets`-Array.

## 2. Phaser Asset-Loading

- [x] 2.1 Erweitere `GameScene.preload()` um das Laden der beiden Texturen als Tileset-Bilder via `this.load.image('grass', '/assets/textures/grass_texture.jpg')` und `this.load.image('cobblestone', '/assets/textures/cobblestone_texture.jpg')`. Verifizierung: Keine Konsolen-Fehler beim Laden der Szene; die Textur-Keys sind in `this.textures` verfügbar.
- [x] 2.2 Lade die Tilemap-JSON via `this.load.tilemapTiledJSON('arena-map', '/assets/maps/arena.json')` in `preload()`. Verifizierung: Kein Ladefehler; der Key `arena-map` ist nach dem Preload verfügbar.

## 3. Tilemap-Rendering

- [x] 3.1 Erstelle eine private Methode `createTilemap()` in `GameScene`, die nach dem Arena-Start aufgerufen wird. Die Methode soll: (a) die Tilemap via `this.make.tilemap({ key: 'arena-map' })` erstellen, (b) die Tilesets mit `map.addTilesetImage()` hinzufügen, (c) den Tile-Layer mit `map.createLayer()` erstellen und (d) den Layer mit `setDepth(-1)` unter alle Spielobjekte legen. Verifizierung: Die Tilemap ist im Spiel sichtbar und liegt unter Tanks, Minions und Basen.
- [x] 3.2 Rufe `createTilemap()` an der richtigen Stelle im Arena-Start-Flow auf (dort wo `arenaStarted = true` gesetzt wird), sodass die Tilemap gerendert wird bevor Spielobjekte erscheinen. Verifizierung: Beim Betreten der Arena ist der Hintergrund sofort sichtbar — kein schwarzer Hintergrund mehr.

## 4. Integration und Kamera

- [x] 4.1 Verifiziere, dass die Tilemap korrekt mit der Kamera-Follow-Logik zusammenarbeitet: beim Scrollen der Kamera (die dem Spieler folgt) scrollt die Tilemap mit. Verifizierung: Bewege den Spieler-Tank an verschiedene Positionen in der Arena; die Bodentexturen bewegen sich synchron mit der Kamera.
- [x] 4.2 Verifiziere, dass alle bestehenden Spielobjekte (Tanks, Minions, Basen, Projektile, Health-Bars, HUD) weiterhin korrekt über der Tilemap gerendert werden und keine visuellen Regressionen auftreten. Verifizierung: Spiele eine vollständige Runde mit mindestens zwei Spielern; alle UI-Elemente und Spielobjekte sind sichtbar und funktional.
