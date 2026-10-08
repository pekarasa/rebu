# Rezept-App – Spezifikation

## Ziel
Mobile App zum einfachen Erfassen, Teilen und Nachkochen von Rezepten. Fokus auf Einfachheit – kein Account, kein Overhead.

---

## Kernfunktionen

### 1. Rezept erfassen

**Pflichtfelder:**
- Titel
- Portionen (Zahl, Default: 4)
- Zutaten: beliebig viele Einträge, je bestehend aus:
  - Menge (Dezimalzahl)
  - Einheit (z. B. g, ml, TL, EL, Stück – frei wählbar oder aus Vorschlagsliste)
  - Name (Freitext)
- Zubereitungsschritte (nummerierte Liste, Freitext je Schritt)

**Optionale Felder:**
- Foto (aus Kamera oder Galerie)
- Zeitaufwand (Vorbereitung / Kochen, in Minuten)
- Kategorie (z. B. Frühstück, Hauptgericht, Dessert, Snack)
- Notizen / Tipps (Freitext)

**Verhalten:**
- Zutaten und Schritte können per Drag & Drop umsortiert werden
- Einzelne Zutaten / Schritte können gelöscht werden
- Entwurf wird automatisch zwischengespeichert (kein Datenverlust bei Abbruch)

---

### 2. Rezept anzeigen

#### 2a. Stöbern / Suchen (Listenansicht)

Übersichtliche Liste aller Rezepte zum Browsen und Finden.

**Darstellung je Rezept-Karte:**
- Foto (Vorschau, quadratisch oder 4:3)
- Titel
- Badges: Saison, KH-Tag, Kategorie
- Zeitaufwand (falls erfasst)

**Suche & Filter:**
- Volltextsuche über Titel und Zutaten
- Saisonfilter (Default: aktuelle Saison)
- KH-Filter (Default: kein Filter)
- Beide Filter kombinierbar, einzeln deaktivierbar

**Sortierung:**
- Default: alphabetisch
- Optional: zuletzt hinzugefügt, Zeitaufwand

---

#### 2b. Nachkochen (Detailansicht)

Optimierte Ansicht zum aktiven Kochen – klar, ablenkungsfrei, gross.

**Aufbau:**
1. **Kopfbereich:** Foto (gross), Titel, Badges (Saison, KH-Tag), Zeitaufwand
2. **Portionsselektor:** +/– oder Direkteingabe (Default: erfasste Portionszahl)
3. **Zutatenliste:** Menge – Einheit – Name; Mengen skalieren in Echtzeit mit Portionsselektor
4. **Zubereitungsschritte:** nummeriert, ein Schritt pro Block, grosse Schrift; jeden Schritt einzeln abhakbar (visuelles Durchstreichen)

**Komfort:**
- Bildschirm bleibt aktiv (kein Auto-Lock solange Detailansicht offen)
- Abgehakte Schritte bleiben sichtbar (nicht ausgeblendet)
- "Kochen beenden"-Button setzt alle Häkchen zurück
- Teilen-Button jederzeit erreichbar (fixiert oben)

---

### 3. Rezept teilen & austauschen

**Exportformate (einzelnes Rezept):**
- **App-zu-App (direkt):** Rezept wird als Deep Link kodiert (Daten im Link selbst, keine Server-Infrastruktur); Empfänger öffnet Rezept direkt in der App oder als Web-Vorschau
- **Text:** Formatierter Klartext (Titel, Zutaten, Schritte) für WhatsApp, E-Mail, SMS etc. – über nativen Teilen-Dialog des Betriebssystems
- **JSON-Datei:** Export eines einzelnen Rezepts als `.json`-Datei (Dateiname: `<titel>.rezept.json`)
- **PDF:** Druckfreundliche Darstellung (optional, v2)

**Sammel-Export / -Import:**
- **Export aller Rezepte:** Alle Rezepte (inkl. Fotos als Base64) in eine einzelne `.json`-Datei exportieren – für Backup oder Geräteübertragung
- **Import einer JSON-Datei:** Einzelne Rezept-Datei oder Sammel-Export importieren; bei UUID-Kollision wird nachgefragt: überschreiben oder als Kopie speichern

**App-zu-App zwischen zwei Geräten:**
- Übertragung über den nativen Teilen-Dialog (AirDrop, Bluetooth, Nearby Share, E-Mail etc.)
- Empfänger-App erkennt `.rezept.json`-Dateien und öffnet Importdialog automatisch
- Kein gemeinsamer Server oder Account erforderlich

**Verhalten beim Import:**
- Vorschau des Rezepts vor dem Speichern
- Option: "Speichern" oder "Verwerfen"
- Bei Sammel-Import: Liste aller enthaltenen Rezepte mit Auswahlmöglichkeit (alle / einzelne)
- Saison und KH-Tag werden nach Import neu berechnet

---

### 4. Saisonalität

**Grundprinzip:**
Jedem Rezept wird automatisch eine Saison zugeordnet, basierend auf den enthaltenen Zutaten. Die Suche auf der Startseite filtert standardmässig nach der aktuellen Saison.

**Zutatendatenbank (lokal, fest eingebaut):**
- Die App enthält eine interne Liste saisonaler Zutaten mit ihrer Verfügbarkeit pro Monat
- Beispiele:
  - Erdbeeren → Juni – August
  - Kürbis → Oktober – Dezember
  - Spargel → April – Juni
  - Äpfel → September – November
- Die Liste deckt gängige Gemüse- und Obstsorten ab (Mitteleuropa)
- Nicht gelistete Zutaten gelten als ganzjährig verfügbar

**Saison-Ermittlung pro Rezept:**
- Die App prüft alle Zutaten des Rezepts gegen die Zutatendatenbank
- Ein Rezept gilt als saisonal in einem Monat, wenn alle saisonalen Zutaten in diesem Monat verfügbar sind
- Das Ergebnis ist eine Liste von Monaten, in denen das Rezept als saisonal gilt
- Diese wird beim Speichern berechnet und im Rezept hinterlegt

**Saisons-Einteilung (für Anzeige):**
| Saison | Monate |
|---|---|
| Frühling | März – Mai |
| Sommer | Juni – August |
| Herbst | September – November |
| Winter | Dezember – Februar |

**Suche & Filter:**
- Standardmässig zeigt die Startseite nur Rezepte der aktuellen Saison
- Ein gut sichtbarer Filter-Chip "Saison: Frühling/Sommer/Herbst/Winter" kann deaktiviert oder gewechselt werden
- Bei deaktiviertem Filter: alle Rezepte sichtbar
- Rezepte, die keiner Saison eindeutig zugeordnet werden können (z. B. nur ganzjährige Zutaten), erscheinen immer

**Anzeige im Rezept:**
- In der Detailansicht wird die Saison als Badge angezeigt (z. B. "Herbst")
- Zutaten, die saisonal sind, können optional markiert werden (visueller Hinweis)

---

### 5. Kohlenhydrat-Erkennung

**Grundprinzip:**
Die App erkennt automatisch den primären Kohlenhydratlieferanten eines Rezepts anhand der Zutaten und hinterlegt diesen als Tag. In der Suche kann nach diesem Tag gefiltert werden.

**KH-Datenbank (lokal, fest eingebaut):**
- Interne Liste bekannter KH-Lieferanten mit Priorität (höchste Priorität gewinnt bei mehreren Treffern)
- Beispiele:

| KH-Tag | Erkannte Zutaten (Beispiele) | Priorität |
|---|---|---|
| Pasta | Spaghetti, Penne, Tagliatelle, Lasagneplatten | 1 |
| Reis | Reis, Risotto, Basmatireis | 1 |
| Kartoffeln | Kartoffeln, Gschwellti, Pommes, Gnocchi | 1 |
| Brot / Teig | Mehl, Brotteig, Blätterteig, Pizzateig | 2 |
| Hülsenfrüchte | Linsen, Kichererbsen, Bohnen | 2 |
| Getreide | Quinoa, Couscous, Bulgur, Polenta | 2 |

- Nicht erkannte Rezepte erhalten keinen KH-Tag (z. B. reine Salate, Fleischgerichte)

**Ermittlung pro Rezept:**
- Beim Speichern werden alle Zutaten gegen die KH-Datenbank geprüft (Texterkennung, Kleinschreibung)
- Der KH-Lieferant mit der höchsten Priorität und der grössten Menge (falls messbar) wird als primärer Tag gesetzt
- Bei Gleichstand: erster Treffer in der Zutatenliste gewinnt
- Das Ergebnis wird im Rezept gespeichert

**Suche & Filter:**
- Auf der Startseite kann zusätzlich zum Saisonfilter ein KH-Filter gesetzt werden
- Auswahl als Chip oder Dropdown (z. B. "Pasta", "Reis", "Kartoffeln", …)
- Kein KH-Filter aktiv = alle Rezepte sichtbar (Default)
- KH-Filter und Saisonfilter sind kombinierbar

**Anzeige im Rezept:**
- KH-Tag als Badge in der Detailansicht (neben Saison-Badge)

---

## Daten & Speicherung

**Lokal:**
- Alle Daten werden lokal auf dem Gerät gespeichert (kein Account erforderlich)
- Datenformat: JSON, strukturiert nach Datenmodell (siehe unten)

**Backup / Sync (optional):**
- iCloud (iOS) bzw. Google Drive (Android) für automatisches Backup
- Kein Echtzeit-Sync zwischen Geräten in v1

**Import:**
- Rezept aus Deep Link importieren
- Einzelne `.rezept.json`-Datei importieren
- Sammel-Export `.json` importieren (alle oder ausgewählte Rezepte)
- Kein Import aus externen Quellen (z. B. Webseiten) in v1

---

## Datenmodell

```
Rezept
├── id              String (UUID)
├── titel           String
├── portionen       Int (Default: 4)
├── zeitVorbereitung  Int? (Minuten)
├── zeitKochen      Int? (Minuten)
├── kategorie       String?
├── notizen         String?
├── foto            Blob? (lokal gespeichert)
├── erstelltAm      DateTime
├── geaendertAm     DateTime
├── saisonMonate    Int[]  (Liste der Monate 1–12, berechnet)
├── khTag           String?  (z. B. "Pasta", "Reis", automatisch berechnet)
├── zutaten[]
│   ├── id          String
│   ├── reihenfolge Int
│   ├── menge       Decimal
│   ├── einheit     String
│   └── name        String
└── schritte[]
    ├── id          String
    ├── reihenfolge Int
    └── text        String

ZutatSaison  (interne Datenbank, fest eingebaut)
├── name            String  (normalisiert, Kleinschreibung)
└── monate          Int[]   (z. B. [6, 7, 8] für Juni–August)

ZutatKH  (interne Datenbank, fest eingebaut)
├── name            String  (normalisiert, Kleinschreibung)
├── tag             String  (z. B. "Pasta")
└── prioritaet      Int     (1 = hoch, 2 = mittel)
```

---

## UI-Screens

| Screen | Beschreibung |
|---|---|
| Rezeptliste (Stöbern) | Rezept-Karten mit Foto, Titel, Badges; Suchfeld, Saison- & KH-Filter-Chips, + Button |
| Rezept erfassen | Scrollbares Formular, Abschnitte: Basis, Zutaten, Schritte |
| Rezept nachkochen | Vollbild-Detailansicht: Foto, Portionsselektor, Zutatenliste, abhakbare Schritte |
| Teilen-Dialog | Auswahl Exportformat (Link / Text / JSON / PDF), dann nativer Teilen-Dialog |
| Import-Dialog | Vorschau importiertes Rezept(e), Auswahl bei Sammel-Import, Speichern / Verwerfen |
| Einstellungen | Sammel-Export aller Rezepte als JSON, Sammel-Import |

---

## Nutzerfluss

```
Startseite (Rezeptliste)
  ├── Saison-Filter aktiv (Default: aktuelle Saison)
  │     ├── Filter-Chip antippen → Saison wechseln oder deaktivieren
  │     └── Suche berücksichtigt aktiven Filter
  ├── KH-Filter (Default: kein Filter)
  │     ├── Filter-Chip antippen → KH-Tag wählen (Pasta, Reis, Kartoffeln, …)
  │     └── Kombinierbar mit Saisonfilter
  ├── + Neues Rezept
  │     └── Formular ausfüllen → Speichern → Saison & KH-Tag werden berechnet → Detailansicht
  ├── Rezept antippen (Stöbern → Detailansicht / Nachkochen)
  │     ├── Portionen anpassen → Zutatenmengen skalieren in Echtzeit
  │     ├── Zutatenliste lesen
  │     ├── Schritte der Reihe nach abhaken
  │     ├── "Kochen beenden" → alle Häkchen zurücksetzen
  │     ├── Teilen → Exportformat wählen (Link / Text / JSON / PDF) → nativer Teilen-Dialog
  │     └── Bearbeiten → Formular → Speichern
  ├── Link empfangen (extern)
  │     └── Rezept-Vorschau → "Speichern" → in Rezeptliste
  ├── JSON-Datei empfangen / geöffnet (extern)
  │     └── Import-Dialog → Vorschau / Auswahl → Speichern → in Rezeptliste
  └── Einstellungen
        ├── Alle Rezepte exportieren → Sammel-JSON → nativer Teilen-Dialog
        └── JSON importieren → Datei wählen → Import-Dialog
```

---

## Nicht-Ziele (Out of Scope)

- Soziales Netzwerk / Bewertungen / Kommentare
- Einkaufslisten-Integration
- Nährwertberechnung
- Web-Version / Desktop-App
- Import von Rezepten aus Webseiten
- Automatischer Echtzeit-Sync zwischen mehreren Geräten

---

## Plattform

- iOS und Android
- Technologie: Ionic + Angular + Capacitor
- Mindest-OS: iOS 16 / Android 10
