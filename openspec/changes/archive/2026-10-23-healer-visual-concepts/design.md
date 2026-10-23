# Design

## Context

Motivation und Umfang stehen in `proposal.md`. GoonBash verwendet eine farbige Comic-Aesthetik mit Top-down-Panzern. Im Phaser-Renderer erzeugt `createRoleShape` derzeit einen Kreis fuer den Healer, ein Quadrat fuer den Tank und ein Dreieck fuer den Damagedealer.

Die Weltansicht verwendet 40 Einheiten grosse Spielerformen; die Lobbyvorschau verwendet 20 Einheiten vor der Viewport-Skalierung. Beide verwenden Blau `#4D8DFF` beziehungsweise Rot `#FF4444` fuer die Teamzuordnung. `ROLE_VISUALS` hinterlegt zusaetzlich Healer-Gruen `#33CC66`. Aktive Heilung wird bereits mit einem schwebenden Schraubenschluessel ueber betroffenen Verbuendeten dargestellt. Heal Aura und Speed sind unabhaengige Faehigkeiten.

Der Nutzer hat den Werkstatt-Sanitaeter und seine direkte Integration in Spiel und Lobby freigegeben. Die drei folgenden Konzeptbeschreibungen dokumentieren die erwogenen Alternativen; umgesetzt wird ausschliesslich Vorschlag 1.

## Goals / Non-Goals

**Goals:**
- Den ausgewaehlten Werkstatt-Sanitaeter in beiden Darstellungsgroessen konsistent umsetzen.
- Vorhandene Positionierung, Auswahlmarkierung und Faehigkeitszustaende weiterverwenden.
- Die runde Grundsprache beibehalten und den Healer auch ohne Farbe von Quadrat und Dreieck absetzen.

**Non-Goals:**
- Keine humanoiden Charaktere, neuen Klassen, zusaetzlichen Faehigkeiten oder Balanceaenderungen.
- Kein Skin-Auswahlmenue und keine Umsetzung der beiden nicht ausgewaehlten Alternativen.
- Keine neuen Mechaniken durch die dekorativen Effekte.

## Decisions

### Gemeinsame Bildsprache

Die drei in der Konzeptphase verglichenen Entwuerfe teilen kraeftige dunkelgraue Konturen (`#202633`), wenige grosse Flaechen und einen kleinen versetzten Bodenschatten. Der ausgewaehlte Werkstatt-Sanitaeter bleibt um den bisherigen 40-Einheiten-Koerper herum aufgebaut; ausladende Details sind rein dekorativ und suggerieren keine groessere Trefferflaeche.

Die groesste zusammenhaengende lackierte Flaeche bleibt in Teamfarbe. Elfenbein `#F3F0DC`, Anthrazit `#303745` und sparsame gruene Reparaturlichter `#33CC66` ergaenzen sie. Gruen ersetzt nicht die Teamfarbe. Form und Symbol tragen die Rollenkennung, nicht ausschliesslich die Farbe.

Die normale Lobbyvorschau zeigt dieselbe Identitaet ohne Partikel und mit reduziertem Detailgrad. Ein heller Auswahlrand fuer die eigene Figur sowie Namen, Lebensbalken und schwebende Heilungssymbole bleiben frei.

Die verworfenen Alternativen (Bio-Tech-Gaertner und Impuls-Drohne) bleiben als Entscheidungsverlauf dokumentiert; nur der Werkstatt-Sanitaeter wird umgesetzt. Eine vollstaendig gruene Rollenfarbe wuerde die Teamzuordnung verschlechtern, ein humanoider Magier die bestehende Panzerwelt verlassen.

### Vorschlag 1: Werkstatt-Sanitaeter

**Charakter:** Ein kleiner, robuster Reparaturpanzer; freundlich, praktisch und sofort als Unterstuetzer erkennbar.

**Silhouette und Aufbau:** Eine runde, leicht gedrungene Karosserie sitzt zwischen zwei kurzen, dunklen Kettensegmenten. Oben liegt ein grosser elfenbeinfarbener Werkzeugdeckel mit einem dunklen Schraubenschluessel-Symbol. An der Front ersetzt eine kurze, stumpfe Reparaturduese das lange Kanonenrohr. Zwei kompakte Werkzeugboxen bleiben eng am Heck.

**Farben und Material:** Teamfarbene Karosserie und Kettenabdeckungen, heller Deckel, dunkle Gummierung. Ein einzelnes gruenes Statuslicht akzentuiert die Front. Keine medizinische Kennzeichnung noetig: Werkzeugdeckel und Duese vermitteln Reparatur.

**Bewegung und Faehigkeiten:** Beim Fahren reichen kleine Staubstupser an den Ketten. Fuer Heal Aura oeffnen sich zwei kleine Serviceklappen und ein dezenter gruener Ring pulsiert am Boden; der vorhandene Schraubenschluessel bleibt als eindeutiger Heilungsindikator ueber Empfaengern erhalten. Speed zeigt kurze helle Auspuffstreaks, ohne einen zusaetzlichen Heilungsring zu erzeugen.

**Lobby und kleine Groessen:** Bei 20 Einheiten bleiben Rundkoerper, zwei dunkle Ketten und der helle Werkzeugdeckel; Werkzeugboxen und Statuslicht entfallen. Das Symbol wird vereinfacht statt filigran verkleinert.

**Staerke / Grenze:** Beste Anbindung an die vorhandene Panzer- und Reparatursprache, niedriger relativer Zeichenaufwand. Ketten duerfen die Gesamtform nicht wie den quadratischen Tank wirken lassen.

### Vorschlag 2: Bio-Tech-Gaertner

**Charakter:** Eine verspielte mobile Regenerationsstation, die mechanische Reparatur mit einem kleinen Gewaechshaus verbindet.

**Silhouette und Aufbau:** Eine runde, flache Fahrplattform traegt eine grosse glaserne Kuppel. Darunter stehen zwei dicke, stilisierte Blaetter um einen leuchtenden Reparaturkern. Drei kurze Stuetzrollen sind nur als kleine dunkle Ausbuchtungen sichtbar; sie bilden keine dreieckige Aussenkontur. Ein seitlicher Schlauch endet in einer kurzen Frontduese.

**Farben und Material:** Breiter teamfarbener Aussenring und teamfarbene Frontplatte, elfenbeinfarbene Halterung, anthrazitfarbener Unterbau. Gruen sitzt im Inneren der Kuppel. Glas wird durch eine einzige helle Reflexflaeche angedeutet, nicht durch komplexe Transparenz.

**Bewegung und Faehigkeiten:** Die Kuppel wippt dezent, die Blaetter bewegen sich nur wenig. Bei Heal Aura entfalten sich die Blaetter und wenige blattfoermige Lichtpartikel steigen innerhalb des Bodenrings auf. Der vorhandene Schraubenschluessel ueber geheilten Einheiten bleibt erhalten und verbindet die Naturmetapher mit der Reparaturmechanik. Bei Speed pulsieren zwei hintere Lueftungsschlitze; keine dauerhafte Partikelspur.

**Lobby und kleine Groessen:** Teamring, heller Kuppelreflex und ein grosses Doppelblatt bleiben erhalten. Schlauch, Rollen und einzelne Partikel entfallen. Die helle Einfassung trennt das gruene Innere vom grasigen Spielfeld.

**Staerke / Grenze:** Eigenstaendigste, freundlichste Variante. Pflanzen und Glas brauchen staerkere Vereinfachung als der Werkzeugpanzer und koennen auf gruenem Untergrund schlechter lesbar sein.

### Vorschlag 3: Impuls-Drohne

**Charakter:** Ein leichter, praeziser Tech-Support, der Energie statt schwerer Werkzeuge vermittelt.

**Silhouette und Aufbau:** Ein runder schwebender Koerper mit grosser heller zentraler Reparaturlinse und zwei kurzen seitlichen Stabilisatoren. Eine offene Ringfassung um die Linse laesst die Form luftig statt schwer gepanzert wirken. Vorn sitzt ein kleiner, stumpfer Projektor. Der kompakte kreisfoermige Rumpf bleibt dominant; keine dreieckige Fluegelform.

**Farben und Material:** Breite teamfarbene Ringsegmente und Stabilisatoren, elfenbeinfarbene Linse, dunkle Zwischenraeume. Gruene Lichtpunkte liegen nur an den Ringunterbrechungen. Kein ueberwiegend weisser oder gruener Koerper, der die Teamkennung verdraengt.

**Bewegung und Faehigkeiten:** Ein weicher Schatten und minimales Schweben vermitteln Leichtigkeit. Das Schweben ist rein optisch, keine neue Flug- oder Hindernisregel. Bei Heal Aura laufen gruene Lichtimpulse um die Ringsegmente und ein duenner Bodenring erscheint. Keine Heilstrahlen zu einzelnen Zielen, da die Faehigkeit eine Flaechenheilung ist. Speed streckt kurz zwei helle Hecklichtstreifen; die Heilungsanzeige bleibt davon unabhaengig.

**Lobby und kleine Groessen:** Unterbrochener Teamring, helle Mittellinse und zwei kurze Stabilisatoren bleiben; Lichtpunkte und Schwebeanimation entfallen. Die Ringunterbrechungen sollen auch ohne Farbe erkennbar sein.

**Staerke / Grenze:** Klarste futuristische Silhouette und passend zur mobilen Healer-Rolle. Hoeherer Animationsaufwand als Variante 1; Schwebeeffekt darf keine abweichende Spielmechanik versprechen.

### Vergleich und unverbindliche Empfehlung

| Kriterium | Werkstatt-Sanitaeter | Bio-Tech-Gaertner | Impuls-Drohne |
|---|---|---|---|
| Erster Eindruck | Reparaturpanzer | Mobile Regeneration | Energie-Support |
| Hauptmerkmal | Werkzeugdeckel und kurze Ketten | Kuppel mit Doppelblatt | Offener Ring mit Linse |
| Naehe zur bisherigen Panzerwelt | Sehr hoch | Mittel | Hoch, futuristischer |
| Lesbarkeit bei kleiner Darstellung | Hoch | Mittel; Kuppel vereinfachen | Hoch; Ringluecken erhalten |
| Relativer Umsetzungsaufwand | Niedrig | Mittel | Mittel |
| Wichtigster Zielkonflikt | Abgrenzung zum Tank | Kontrast auf Gras | Schweben ohne Flugmechanik |

**Auswahl: Werkstatt-Sanitaeter.** Der Nutzer hat die urspruengliche Empfehlung bestaetigt. Er knuepft am direktesten an die vorhandenen Schraubenschluessel-Symbole und die Comic-Panzerwelt an.

### Integration des ausgewaehlten Entwurfs

Eine Phaser-Container-Figur ersetzt ausschliesslich die Healer-Kreiszeichnung. Sie besitzt dieselbe Position und Sichtbarkeit wie die bisherige Form. Ein eigener Auswahlring implementiert die bisherige `setStrokeStyle`-Schnittstelle, damit die weisse Markierung der eigenen Figur erhalten bleibt. Andere Rollen bleiben einfache Shapes.

Eine gemeinsame Zeichenfunktion rendert den Rumpf bei 40 Einheiten und die vereinfachte Lobbyfigur bei 20 Einheiten. Sie nutzt nur Phaser-Grafikprimitive, keine geladenen Assets. Dunkle Ketten liegen hinter dem teamfarbenen Rundrumpf; heller Werkzeugdeckel und dunkler Schraubenschluessel liegen darueber. Werkzeugboxen, Statuslicht und Kettenrillen entfallen in der kleinen Ansicht.

Ein separates bodennahes Graphics-Kind zeichnet einen pulsierenden Heilungsring und unabhaengige Speed-Auspuffstreifen. Die Zustaende kommen ausschliesslich aus den replizierten `activeUntil`-Werten und dem Todeszustand. Lobbyfiguren bleiben statisch. Keine dauernden Partikel, neuen Timer oder Bewegungsstaub: So bleibt die Darstellung klein und deterministisch. Oeffnende Serviceklappen werden als helle seitliche Markierungen angedeutet.

Die Sprite-Map wird explizit auf Shape oder Healer-Container typisiert. Kamerafolge und Interpolation greifen weiter auf die Wurzelposition zu. Sichtbarkeit und Zerstoerung der Wurzel betreffen alle Kindobjekte, auch bei Tod, Menuewechsel und Matchende. Beim Entfernen eines Spielers werden ebenfalls Namen, Lebensbalken und Heilungssymbole entfernt. Tests zeichnen die gemeinsamen Primitive mit einem aufzeichnenden Graphics-Ersatz und pruefen Teamfarben, Detailreduktion und Effektkombinationen; der Frontend-Build prueft die Phaser-Anbindung.

## Risks / Trade-offs

- [Zu viele Details auf 40/20 Einheiten] -> Grosse Merkmale priorisieren und die Lobbyvariante bewusst vereinfachen; die reproduzierbare Browserpruefung separat bei 1:1 beurteilen.
- [Rollen- und Teamfarben widersprechen sich im bestehenden Spec/Renderer] -> Delta-Spec trennt die bestehende Teamfarbe von der formbasierten Rollenidentitaet.
- [Gruene Effekte gehen auf Gras verloren] -> Dunkle Einfassung und helle Innenkante statt grossflaechiger gruener Fuellung.
- [Effekte ueberdecken Namen, Lebensbalken oder Heilungssymbole] -> Dekorative Effekte bodennah halten und die bestehende Anzeige oberhalb der Figur reservieren.
- [Dekoration suggeriert neue Mechaniken] -> Kleine koerpernahe Effekte statt eines scheinbar neuen Reichweitenindikators; Trefferbereich und Spielwerte unveraendert lassen.
