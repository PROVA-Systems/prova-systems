# SPRINT 11 — B6 Workflow-Sauberkeit + Fristen-System + Dashboard

**Tag:** 12  |  **Aufwand:** 9-11h  |  **Phase:** B Produkt-Kern

---

## Ziel
Alle 4 Flow-Gruppen (A/B/C/D) sind konsistent mit Phasen-Timeline. Fristen-System mit 5 Pipelines + 8 Frist-Typen + Eskalations-Stufen macht Fristen unvergessbar. Dashboard bekommt die 5 fixen Pflicht-Widgets.

---

## Sprint-Start-Ritual
1. **Code-Check:** `akte-logic.js` (Timeline-Code), `dashboard-logic.js`, `termine.html` + TERMINE-Tabelle
2. **Datenfluss:** Wo werden Fristen heute gespeichert? Wo werden sie angezeigt?
3. **Scope-Fix:** Workflow-Timeline + Fristen + Dashboard-Widgets. Nicht konfigurierbares Dashboard (Post-Pilot).

---

## Scope

### 1. Flow-agnostische Timeline-Komponente (2-3h)

**Zentrale Config in `prova-flow-config.js`:**

```javascript
const FLOW_PHASES = {
  A: [
    { nr: 1, name: "Auftrag erfasst", icon: "📋" },
    { nr: 2, name: "§407a-Anzeige", icon: "⚠️", conditional: "ist_gerichtsgutachten" },
    { nr: 3, name: "Ortstermin", icon: "📍" },
    { nr: 4, name: "KI-Analyse + §6 Fachurteil", icon: "🤖" },
    { nr: 5, name: "Freigabe", icon: "✓" },
    { nr: 6, name: "PDF-Erstellung", icon: "📄" },
    { nr: 7, name: "Versand", icon: "📨" },
    { nr: 8, name: "Rechnung", icon: "💶" },
    { nr: 9, name: "Archiviert", icon: "🗂️" }
  ],
  B: [
    { nr: 1, name: "Auftrag erfasst", icon: "📋" },
    { nr: 2, name: "Objektbesichtigung", icon: "📍" },
    { nr: 3, name: "Vergleichsdaten", icon: "📊" },
    { nr: 4, name: "Wertermittlung", icon: "💶" },
    { nr: 5, name: "Freigabe + PDF", icon: "📄" },
    { nr: 6, name: "Rechnung + Archiv", icon: "🗂️" }
  ],
  C: [
    { nr: 1, name: "Auftrag erfasst", icon: "📋" },
    { nr: 2, name: "Objektbesichtigung", icon: "📍" },
    { nr: 3, name: "Beratungs-Report", icon: "📝" },
    { nr: 4, name: "Rechnung + Archiv", icon: "🗂️" }
  ],
  D: [
    { nr: 1, name: "Auftrag erfasst", icon: "📋" },
    { nr: 2, name: "Termine-Planung", icon: "📅" },
    { nr: 3, name: "Laufende Einträge", icon: "🔄" },
    { nr: 4, name: "Zwischenberichte", icon: "📝", optional: true },
    { nr: 5, name: "Abschlussbericht", icon: "📄" },
    { nr: 6, name: "Rechnung + Archiv", icon: "🗂️" }
  ]
};
```

**Komponente `prova-timeline.js`:**
- Lädt Phasen nach `fall.flow`
- Conditional-Logik (z.B. §407a nur bei Gerichts-)
- Skip-Darstellung für übersprungene Phasen
- Fristen-Integration pro Phase (siehe unten)
- Klickbare Phase → zur entsprechenden Aktion

### 2. Fristen-System — die 5 Pipelines (3-4h)

**Airtable TERMINE erweitern** um Felder:
- `frist_typ` (Single select): §411-Abgabe / §407a-Anzeige / §485-Beweissicherung / §312g-Widerruf / zahlungsziel / mahnstufe_1 / mahnstufe_2 / mahnstufe_3 / gerichtstermin / eigene_frist
- `frist_quelle` (Long text): Wo kommt die Frist her? (PDF-Seite, Auto-Berechnung, Manuell)
- `eskalations_stufe` (Formula): berechnet aus Resttagen
- `erinnerung_24h_sent` (Bool)
- `erinnerung_2h_sent` (Bool)
- `basis_fall` (Link zu SCHADENSFAELLE)

**Frist-Typen mit Auto-Berechnung:**

| Typ | Berechnung | §-Quelle |
|---|---|---|
| §411-Abgabe | Beweisbeschluss-Datum + 8 Wochen | §411 ZPO |
| §407a-Anzeige | Sofort (bei Kostenüberschreitung) | §407a ZPO |
| §485-Beweissicherung | Manuell | §485 ZPO |
| §312g-Widerruf | Auftragsbestätigung + 14 Tage | §312g BGB |
| zahlungsziel | Rechnungs-Versand + 14 Tage | — |
| mahnstufe_1 | Rechnung + 14 Tage | §286 BGB |
| mahnstufe_2 | Rechnung + 30 Tage | §286 BGB |
| mahnstufe_3 | Rechnung + 45 Tage | §286 BGB |
| gerichtstermin | Manuell | — |
| eigene_frist | Manuell | — |

**Eskalations-Stufen (Formula in Airtable):**
- `> 14 Tage` → "normal" (grau)
- `7-14 Tage` → "gelb"
- `3-7 Tage` → "orange"
- `1-2 Tage` → "rot"
- `heute` → "rot + pulse"
- `überfällig` → "dunkelrot"

**Pipeline 1 — Akte-Phasen-Leiste:**
- In `akte-logic.js` Timeline erweitert: pro Phase werden Fristen angezeigt
- Beispiel: Phase 4 zeigt "§411-Abgabefrist: 20.05.2026 (in 23 T)"
- Farb-codiert nach Eskalations-Stufe

**Pipeline 2 — Kalender (TERMINE):**
- Frist = eigener Termin-Typ
- In `termine.html`: Fristen erscheinen automatisch, farb-codiert

**Pipeline 3 — Dashboard-Widget "Anstehende Fristen":**
- Sortiert nach Dringlichkeit (überfällig → heute → diese Woche → diesen Monat)
- Zeigt nächste 14 Tage
- Klick → zur Akte

**Pipeline 4 — Push-Notifications:**
- 24h vorher: "Morgen läuft eine Frist ab: §411-Abgabe SCH-2026-031"
- 2h vorher: "In 2 Stunden: §411-Abgabe SCH-2026-031"
- Scheduled Function `frist-reminder-scheduler.js` läuft stündlich, prüft TERMINE auf anstehende Fristen

**Pipeline 5 — Sidebar-Indikator:**
- Roter Punkt am "Aktiver Fall"-Block wenn Frist < 7 Tage
- Tooltip beim Hover: "Frist am X.Y.Z: §411-Abgabe"

### 3. Auto-Frist-Erkennung bei PDF-Upload (aus Sprint 10)

Wenn in Sprint 10 KI eine Frist aus PDF extrahiert (z.B. §411-Abgabe aus Beweisbeschluss):
- Vorschlags-Modal: "Erkannte Frist: 20.05.2026, §411-Abgabe (Quelle: Seite 3)"
- SV bestätigt → 3 parallele Aktionen:
  1. `SCHADENSFAELLE.abgabefrist` gesetzt
  2. `TERMINE.create(typ='Frist', frist_typ='§411-Abgabe', erinnerung_24h=true, erinnerung_2h=true)`
  3. `AUDIT_TRAIL.create(aktion='Frist erkannt + bestätigt', quelle='KI')`

**Zwingende SV-Bestätigung** (Haftungsschutz!). Ohne Bestätigung keine Kalender-Eintragung.

### 4. 5 fixe Dashboard-Widgets (2-3h)

**Keine konfigurierbaren Widgets in dieser Phase** (kommt Post-Pilot). Feste Anordnung:

```
┌────────────────────────────────────────────────────────────┐
│  Zentrale                                                   │
│  Guten Morgen, {Name}! Heute {Wochentag}, {Datum}          │
│                                                              │
│  ┌──── 🚨 Kritisches (100%) ────────────────────────────┐ │
│  │  §407a-Pflicht fehlt / Fristen <3 Tage / Errors       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──── 📅 Heute (50%) ──────┬──── 📊 Diese Woche (50%) ─┐ │
│  │  Termine + Fristen heute │  Fotos, Diktate,          │ │
│  │                          │  abgeschl. Fälle, Umsatz  │ │
│  └──────────────────────────┴────────────────────────────┘ │
│                                                              │
│  ┌──── 📂 Aktive Fälle (100%) ──────────────────────────┐ │
│  │  Top 5 zuletzt bearbeitete, mit Phase + Datum         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──── ⏰ Anstehende Fristen (100%) ─────────────────────┐ │
│  │  Vorschau 14 Tage, eskaliert sortiert                 │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Widget-Inhalt im Detail:**

**🚨 Kritisches** — zeigt nur was HANDELN erfordert:
- §407a-Anzeige fehlt bei aktivem Gerichtsgutachten
- Fristen in < 3 Tagen
- Systemfehler (bei v2 Error-Stream aus Sentry)
- Zahlungseingänge nicht verbucht (MRR-Checks)
- Wenn leer: "Alles im grünen Bereich ✅"

**📅 Heute**:
- Alle TERMINE mit Datum=heute, chronologisch
- Klick auf Termin → Akte öffnen
- "Vorbereiten →"-Button

**📊 Diese Woche**:
- Fotos hochgeladen (Anzahl)
- Diktate erstellt (Anzahl)
- Gutachten abgeschlossen (Anzahl)
- Rechnungen versandt (Anzahl + Summe Netto)

**📂 Aktive Fälle**:
- 5 Fälle nach letztem Update, mit `phase_aktuell` und letzter Änderung
- "Alle anzeigen →" (zu archiv.html?filter=aktiv)

**⏰ Anstehende Fristen**:
- Alle Fristen der nächsten 14 Tage, eskalations-sortiert
- Überfällig oben (dunkelrot)
- Pro Eintrag: Datum, Fall-AZ, Typ, Resttage

### 5. Backlog für Post-Pilot (nicht Teil dieses Sprints)

Damit klar dokumentiert ist was **nicht** jetzt kommt:
- Konfigurierbare Widgets (Drag&Drop, Toggle, Tier-2-Widgets)
- Widget-Breiten individuell (half/full)
- Tier-2-Widgets: Offene Rechnungen, Monats-KPIs, Letzte Diktate, Foto-Galerie, KI-Tipps, Norm des Tages, Persönliche Stats

---

## Prompt für Claude Code

```
PROVA Sprint 11 — B6 Workflow + Fristen + Dashboard (Tag 12)

Pflicht-Lektuere: CLAUDE.md, akte-logic.js, dashboard-logic.js (5 Module!), 
termine.html, Masterplan-v2 02_WORKFLOWS.md

KONTEXT
=======
Timeline wird flow-agnostisch (4 Flows mit je eigenen Phasen).
Fristen-System mit 5 Pipelines, 8 Typen, Eskalation.
Dashboard bekommt 5 fixe Widgets (keine Konfig in v1).

SCOPE
=====

Commit 1: prova-flow-config.js + prova-timeline.js
- FLOW_PHASES-Konstante fuer A/B/C/D
- Timeline-Komponente, rendert je nach fall.flow
- Conditional-Phasen (z.B. §407a nur Gerichts-)
- Skip-Darstellung fuer uebersprungene Phasen

Commit 2: akte-logic.js anpassen
- Timeline-Komponente einbinden
- Fristen pro Phase anzeigen (farb-codiert)
- Klickbare Phase oeffnet passende Aktion

Commit 3: TERMINE-Schema erweitern (Airtable Meta API)
- frist_typ (Single select mit 10 Werten)
- frist_quelle (Long text)
- eskalations_stufe (Formula)
- erinnerung_24h_sent, erinnerung_2h_sent (Bool)
- basis_fall (Link zu SCHADENSFAELLE)

Commit 4: Fristen-Auto-Berechnung
- Bei Fall-Anlage Gerichtsgutachten: §411-Frist automatisch vorschlagen
- Bei Rechnungs-Versand: Zahlungsziel + Mahnstufen vorschlagen
- Alle Vorschlaege brauchen SV-Bestaetigung

Commit 5: frist-reminder-scheduler.js (Scheduled Function)
- Laeuft stuendlich via Netlify Scheduled Functions
- Prueft TERMINE auf anstehende Fristen
- Sendet Push-Notification via push-notify.js
- Aktualisiert erinnerung_24h_sent, erinnerung_2h_sent

Commit 6: dashboard-logic.js erweitern
- 5 fixe Widgets: Kritisches, Heute, Diese Woche, Aktive Faelle, Fristen
- Responsives Grid (mobile: alle full-width)
- Widget-Loading parallel (nicht sequenziell)

Commit 7: Akte-Phasen-Fristen-Integration
- Pro Phase: zugehoerige Fristen farb-codiert
- Klick auf Frist → oeffnet Termine-Detail

Commit 8: Sidebar-Indikator
- Roter Punkt am "Aktiver Fall" wenn Frist < 7 Tage
- Tooltip mit Frist-Details

Commit 9: termine.html erweitern
- Fristen als eigener Termin-Typ darstellen
- Filter: "Nur Fristen anzeigen"
- Eskalations-Farben

Commit 10: Tests + sw.js
- Playwright: Frist anlegen, Erinnerung triggern
- Dashboard-Widgets alle sichtbar + Daten korrekt
- 4 Flows rendern verschiedene Timelines

QUALITAET
=========
- Auto-Fristen IMMER mit SV-Bestaetigung (Haftungsschutz)
- Scheduled Function idempotent (2x Push vermeiden)
- Dashboard-Widgets unter 2s Ladezeit
- Mobile: Widgets untereinander

TAG: v180-workflow-fristen-done
```

---

## Acceptance
1. Akte eines Gerichtsgutachtens zeigt 9-Phasen-Timeline mit §411-Frist an Phase 4
2. Akte einer Beratung zeigt 4-Phasen-Timeline
3. Fall mit Frist in 5 Tagen: rote Markierung, Dashboard-Widget zeigt an
4. Push-Notification feuert 24h vor §411-Frist (Test via manuellem Trigger)
5. Dashboard zeigt 5 Widgets mit korrekten Daten
6. Sidebar zeigt roten Punkt bei aktivem Fall mit Frist < 7 Tage
7. 8 Frist-Typen anlegbar über Termine-UI

## Rollback
`git reset --hard v180-auftragstypen-done`

---

## Abhängigkeiten
- Sprint 10 (Auftragstypen) — für Fall-Anlage mit typ-spezifischen Fristen
- Sprint 3 (JWT) — für Scheduled-Function Auth
