# GoonBash

**GoonBash** is a fast-paced, multiplayer tank-based MOBA (Multiplayer Online Battle Arena) inspired by the classic "Minions" from CasualCollective. Players take control of specialized "Comic-Style" tanks to lead their teams and minions to victory by destroying the enemy base.

## Game Mechanics

### 1. Teams & Roles
The game features two teams (Blue vs. Red). Each player chooses a tank with a specific role:
- **The Grunt**: Well-rounded tank with balanced speed, armor, and firepower.
- **The Sniper**: High-damage, long-range tank with low health.
- **The Heavy**: High-health, slow-moving tank capable of soaking up damage.
- **The Support**: Repairs allies and provides buffs, but has limited offensive capabilities.

### 2. Automatic Minions (Mobs)
Strategic depth is added by "Goons" (minions) that spawn automatically from each base:
- They move along predefined paths toward the enemy base.
- They automatically target enemy minions, players, and structures.
- Their primary purpose is to soak up turret fire and deal chip damage to the enemy base.

### 3. Objective
The goal is simple: **Destroy the Enemy Command Center**. 
- Bases are protected by automated defensive turrets.
- Players must coordinate their pushes with the spawn waves of minions.

### 4. Progression
- Gain experience and scrap metal (currency) by destroying enemy minions and tanks.
- Upgrade tank abilities or buy temporary power-ups during the match.

### 5. Team vision and fog of war

Living allied tanks, minions, lane towers and the main base share current vision.
Unrevealed ground stays recognizable but dark; enemies, their names, health bars
and effects disappear outside team vision. Previously revealed ground becomes dark
again when the last observer leaves or dies. Ruins and dead tanks provide no sight.

| Observer | Absolute sight range (world units) |
|---|---:|
| Healer | 325 |
| Tank | 325 |
| Damagedealer | 325 |
| Minion | 130 |
| Lane tower / main base | 325 |

All player roles have the same sight range as towers. Sight ranges are independent
absolute values: firing-range changes and progression do not multiply sight.
The direct sightline costs one budget unit per road unit and two per grass unit.
The rendered road border counts as road for sight (movement still uses the existing
stone width). Standing in grass additionally halves the observer's budget:
a 200-unit observer sees 200 units along road, but only 50 units entirely through
grass. An 80-unit road segment leaves enough budget for 60 more grass units.

Only team-visible enemies can be selected, pursued, automatically attacked, or
chosen for a Homing Rocket. Losing team sight clears attack locks and pursuit.
Already-fired shots and rockets still track and hit their living target; fog
does not grant invulnerability. Movement commands into dark ground remain valid.

The upper-right, read-only minimap shows the full arena and current fog. Blue/red
dots identify living units and intact structures; a white outline identifies
your tank. Allies remain on the map; enemies appear only while revealed, with no
last-known-position dots. Minimap clicks never move the tank or camera or fire
abilities. The map scales with the viewport and is removed on leaving the arena.

**Network visibility:** the server keeps full canonical state private and sends
each connection a separate visibility-filtered Colyseus schema view. Concealed
enemies and hostile projectiles are absent from initial snapshots and removed by
patches on vision loss; stationary structures reappear when a scout reveals them.
Hidden target/owner references are cleared. Move destinations, attack-lock intent,
XP and ability cooldown details are private to the controlling player. Other
players receive effect timestamps only while the effect is still active, not
expired cast timestamps from periods of concealment. Public
lobby identity/team/role and scoreboards remain available; the waiting lobby does
not expose canonical spawn positions. Unknown memberships receive no spatial
entities, and match results do not lift visibility restrictions.
Clients can retain information they previously observed: this prevents new hidden
state from being transmitted, not historical knowledge or deductions from visible
projectile trajectories. In-flight tracking and damage still use canonical state.

Deploy shared schemas, backend and frontend together, using fresh rooms. Roll
back all three together rather than mixing versions; no database migration is needed.

After starting the frontend, `/tests/fogOfWar.html` runs deterministic Phaser
checks for concealment, effects, minimap input, resize, teardown and fog sampling
performance (10 and 200 observers). With a local backend on port 2578, append
`?live` to also check two real Colyseus clients, replicated sight values, absent
concealed entities, hidden target rejection and movement into fog. Backend schema
roundtrip tests decode actual snapshots and patches for reveal/conceal transitions,
private metadata, team changes, late joins and rejoin. A loopback WebSocket test
uses two real SDK clients against a stopped `GameRoom` fixture to check repeated
stationary tower/base revelation and removal callbacks. It reuses the existing
client SDK as a backend test-only dependency. For the live check, start the backend with
`$env:PORT='2578'; npm run dev --workspace=backend` in PowerShell.

### Rollen-Grafik: Sanitaetspanzer, Bastion und Jaeger

Alle drei Rollen erscheinen als Comic-Kettenpanzer in ihrer Teamfarbe. Der **Healer (H1 Sanitaetspanzer)** besitzt einen hellen Werkzeugturm und Heckboxen, der **Tank (T2 Bastion)** breite Ketten und schwere Keilpanzerung, der **Damagedealer (D1 Jaeger)** eine schmale Wanne und lange Kanone. Die Lobby zeigt dieselben Fahrzeuge mit 32 statt bisher 20 Einheiten nominaler Breite (60 % groesser) in hoeheren Rollenkarten. Im Spiel dreht sich die Wanne in Fahrtrichtung, der Turm unabhaengig davon zum aktuellen Kampfziel; ohne Ziel behaelt er seine letzte Ausrichtung.

Ein einheitlicher metallischer Schraubenschluessel mit offenem Maul, massivem Schaft und offenem Ringende kennzeichnet den Healer-Turm, das Heal-Aura-Symbol und geheilte Verbuendete. Bei aktiver Heal Aura erscheinen kleine Servicemarkierungen am Fahrzeug; bei aktivem Speed helle Auspuffstreifen. Alle umlaufenden Auswahl-, Team-, Heilungs- und Schutzkreise entfallen. Teamfarbe und der Namenszusatz `(You)` bleiben zur Zuordnung erhalten, Faehigkeitszustaende stehen weiterhin im HUD. Spielwerte, Trefferbereich und Faehigkeitsregeln bleiben unveraendert.

Eine lokale Phaser-Pruefseite laesst sich nach `npm run dev --workspace=frontend` unter `/tests/workshopHealer.html` oeffnen. Sie zeigt alle ausgewaehlten Rollen und den neuen Schraubenschluessel und prueft Spiel- und Lobbygroessen, Teamfarben, Turmausrichtung, Faehigkeitsanzeigen, Respawn und Aufraeumen ohne Backendverbindung.

### Mob-Grafik: Nietenkaefer

Die automatisch spawnenden Mobs erscheinen als kleine mechanische Nietenkaefer mit sechseckiger teamfarbener Panzerung, hellem Sichtschlitz, Nieten, kurzer Kanone und vier beweglichen Beinen. Diagonal gegenueberliegende Beinpaare laufen im Wechsel; die Schrittfolge folgt der tatsaechlich dargestellten Wegstrecke und wird bei langsamer Bewegung entsprechend langsamer. Im Stand ruhen die Beine. Der Koerper folgt der Fahrtrichtung, die Kanone zielt unabhaengig auf das aktuelle Kampfziel.

Die nominale Mob-Groesse ist standardmaessig 21.6 statt 18 Einheiten; Trefferflaechen, Spielwerte und Lebensbalkenbreiten bleiben unveraendert. Blau und Rot entsprechen den Spieler-Teamfarben, umlaufende Kreise gibt es nicht. Nach `npm run dev --workspace=frontend` zeigt `/tests/minionBeetle.html` beide Teams vergroessert und in Spielgroesse beim Laufen, Anhalten und Umkehren, einschliesslich Renderer-Pruefungen ohne Backend.

### Weltgroessen anpassen

Die drei Faktoren in `shared/src/worldScale.ts` unter `WORLD_SCALE` sind die
zentralen Stellschrauben. Sie beziehen sich immer auf die unveraenderten
Originalmasse in `WORLD_BASELINE`, nicht auf das Ergebnis der letzten Anpassung.

| Faktor | Standard | Wirkung |
|---|---:|---|
| `entity` | `1.20` | Spieler 40 -> 48, Mobs 18 -> 21.6; Lane-Tuerme, Ruinen und Hauptbasen proportional 20 % groesser |
| `roadWidth` | `1.20` | Pflasterbreite 112 -> 134.4, Gesamtbreite inklusive Rand 124 -> 148.8 |
| `grassGap` | `0.90` | Freier Rasen zwischen parallelen Lane-Abschnitten 626 -> 563.4 |

Der Rasenabstand wird zwischen den aeusseren Strassenraendern gemessen, nicht
zwischen den Mittellinien. Die neue Mittelliniendistanz ist Rasenabstand plus
Gesamtstrassenbreite, standardmaessig 712.2. Die Lane-Zeilen liegen damit bei
y = 187.8 / 900 / 1612.2; Weltgrenzen (2400 x 1800), Basen und x-Knickpunkte
bleiben gleich. An den diagonalen Zulaeufen laufen die Lanes weiterhin zusammen.
Strassen, Mob-Pfade, Turmpositionen, Minimap und terrainabhaengige Sicht verwenden
dieselbe Geometrie. Wird nur die Strassenbreite geaendert, bleibt der konfigurierte
freie Rasenabstand durch Neuberechnung der Lane-Zeilen erhalten.

Alle Faktoren muessen endlich und positiv sein; die abgeleiteten Strassen
einschliesslich Rand muessen innerhalb der Arena liegen. Unzulaessige Werte
brechen mit einem expliziten Konfigurationsfehler ab, statt still geklemmt zu
werden. Fuer Originalgroessen alle drei Faktoren auf `1.00` setzen.

Die Objekt-Skalierung passt auch Auswahlradien, Abstaende der Namen/Lebensbalken,
Zielmarkierungen und Kanonenmuendungen an. Schadenswerte, HP, Reichweiten,
Bewegungstempo, Cooldowns und serverseitige Treffer-/Kollisionsradien bleiben
unveraendert. Nur die Projektil-Startpunkte der Strukturkanonen folgen den
groesseren Muendungen. Lobbyvorschauen (32 Einheiten), HUD, Schriftgroessen,
Lebensbalkenbreiten, Minimap-Punkte und Kamera-Zoom werden nicht vergroessert.

Nach einer Aenderung `npm run build --workspace=shared` ausfuehren und Backend
und Frontend gemeinsam neu starten bzw. aus derselben Revision neu bauen und
deployen; frische Spielraeume verwenden. Es gibt keinen Laufzeitregler und keine
Datenmigration. `/tests/worldScale.html` prueft die Skalierung in einem echten
Phaser-Arenarenderer nach `npm run dev --workspace=frontend`.

## Technical Goals

- **Multiplayer**: Real-time synchronization for competitive play.
- **Cross-Platform**: Seamless play on both **Web Browsers** and **Mobile Devices**.
- **Aesthetic**: Vibrant, "Comic-style" 2D or stylized 3D graphics with high-impact visual effects.

## Server und Client starten

Voraussetzungen: [Node.js](https://nodejs.org/) und npm.

1. Abhängigkeiten im Projektverzeichnis installieren:

	```bash
	npm install
	```

2. Den Server in einem Terminal starten:

	```bash
	npm run dev --workspace=backend
	```

	Der Server ist anschließend standardmäßig unter Port `2567` erreichbar.

3. Den Client in einem zweiten Terminal starten:

	```bash
	npm run dev --workspace=frontend
	```

4. Die im Terminal angezeigte Vite-Adresse im Browser öffnen (standardmäßig `http://localhost:5173`). Der Client verbindet sich automatisch mit dem Server unter `ws://localhost:2567`.

Der Server kann über die Umgebungsvariable `PORT` auf einen anderen Port gelegt werden. In diesem Fall muss die Serveradresse im Client entsprechend angepasst werden.

---
*Created by Antigravity*
