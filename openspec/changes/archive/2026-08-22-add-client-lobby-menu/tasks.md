## 1. Gemeinsame Lobby-Verträge

- [x] 1.1 Gemeinsame Lobby-Typen für ID, Name, Spielerzahl, Maximalgröße und Status in `shared` definieren.
- [x] 1.2 Erfolgs- und Fehlerantworten für Lobby-Auflistung, Erstellung und Beitritt festlegen und typisieren.

## 2. Backend-Lobbyverwaltung

- [x] 2.1 In der Backend-Anwendung eine In-Memory-Verwaltung aktiver Lobbys mit eindeutigen IDs und Kapazitätsprüfung implementieren.
- [x] 2.2 HTTP-Endpunkte zum Auflisten und Erstellen von Lobbys ergänzen.
- [x] 2.3 Den Join-Ablauf auf ausgewählte Lobby-IDs ausrichten und nicht vorhandene oder volle Lobbys mit einem Fehler ablehnen.
- [x] 2.4 Spielerzahlen bei Join und Leave aktualisieren und leere Lobbys aus der Liste entfernen.
- [x] 2.5 Backend-Tests für Auflisten, Erstellen, Beitreten, volle Lobbys und Entfernen leerer Lobbys ergänzen.

## 3. Client-Menü und Warteraum

- [x] 3.1 Den direkten automatischen Join beim Clientstart durch den Menü-Zustand mit Lobby-Liste und `Create Game`-Button ersetzen.
- [x] 3.2 Lobby-Daten laden, aktualisieren und mit Spielerzahlen sowie Join-Aktionen darstellen.
- [x] 3.3 Erstellen einer Lobby implementieren und danach den Warteraum mit aktualisierter Spielerzahl anzeigen.
- [x] 3.4 Beitreten zu einer ausgewählten Lobby implementieren und den Warteraum bzw. die Spielszene für den gewählten Raum öffnen.
- [x] 3.5 Lobby-Fehler, leere Listen, volle Räume und Wiederholungsaktionen sichtbar behandeln.
- [x] 3.6 Warteraum auf Zustandsänderungen abonnieren und Spielerzahlen für alle verbundenen Clients aktualisieren.

## 4. Spielübergang und Verifikation

- [x] 4.1 Den Übergang vom Warteraum in die bestehende Spielszene integrieren, ohne die vorhandene Entity-Darstellung zu regressieren.
- [x] 4.2 Frontend-Build und Backend-Typecheck ausführen.
- [x] 4.3 Einen manuellen Zwei-Client-Test für Lobby-Erstellung, Listenaktualisierung und Beitritt dokumentieren und durchführen.