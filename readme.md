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

### Rollen-Grafik: Sanitaetspanzer, Bastion und Jaeger

Alle drei Rollen erscheinen als Comic-Kettenpanzer in ihrer Teamfarbe. Der **Healer (H1 Sanitaetspanzer)** besitzt einen hellen Werkzeugturm und Heckboxen, der **Tank (T2 Bastion)** breite Ketten und schwere Keilpanzerung, der **Damagedealer (D1 Jaeger)** eine schmale Wanne und lange Kanone. Die Lobby zeigt dieselben Fahrzeuge mit 32 statt bisher 20 Einheiten nominaler Breite (60 % groesser) in hoeheren Rollenkarten. Im Spiel dreht sich die Wanne in Fahrtrichtung, der Turm unabhaengig davon zum aktuellen Kampfziel; ohne Ziel behaelt er seine letzte Ausrichtung.

Ein einheitlicher metallischer Schraubenschluessel mit offenem Maul, massivem Schaft und offenem Ringende kennzeichnet den Healer-Turm, das Heal-Aura-Symbol und geheilte Verbuendete. Bei aktiver Heal Aura erscheinen kleine Servicemarkierungen am Fahrzeug; bei aktivem Speed helle Auspuffstreifen. Alle umlaufenden Auswahl-, Team-, Heilungs- und Schutzkreise entfallen. Teamfarbe und der Namenszusatz `(You)` bleiben zur Zuordnung erhalten, Faehigkeitszustaende stehen weiterhin im HUD. Spielwerte, Trefferbereich und Faehigkeitsregeln bleiben unveraendert.

Eine lokale Phaser-Pruefseite laesst sich nach `npm run dev --workspace=frontend` unter `/tests/workshopHealer.html` oeffnen. Sie zeigt alle ausgewaehlten Rollen und den neuen Schraubenschluessel und prueft Spiel- und Lobbygroessen, Teamfarben, Turmausrichtung, Faehigkeitsanzeigen, Respawn und Aufraeumen ohne Backendverbindung.

### Mob-Grafik: Nietenkaefer

Die automatisch spawnenden Mobs erscheinen als kleine mechanische Nietenkaefer mit sechseckiger teamfarbener Panzerung, hellem Sichtschlitz, Nieten, kurzer Kanone und vier beweglichen Beinen. Diagonal gegenueberliegende Beinpaare laufen im Wechsel; die Schrittfolge folgt der tatsaechlich dargestellten Wegstrecke und wird bei langsamer Bewegung entsprechend langsamer. Im Stand ruhen die Beine. Der Koerper folgt der Fahrtrichtung, die Kanone zielt unabhaengig auf das aktuelle Kampfziel.

Die nominale Mob-Groesse bleibt bei 18 Einheiten; Trefferflaechen, Spielwerte und Lebensbalken bleiben unveraendert. Blau und Rot entsprechen den Spieler-Teamfarben, umlaufende Kreise gibt es nicht. Nach `npm run dev --workspace=frontend` zeigt `/tests/minionBeetle.html` beide Teams vergroessert und in Spielgroesse beim Laufen, Anhalten und Umkehren, einschliesslich Renderer-Pruefungen ohne Backend.

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
