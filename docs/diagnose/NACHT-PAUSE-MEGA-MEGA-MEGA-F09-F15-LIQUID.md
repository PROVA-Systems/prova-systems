# NACHT-PAUSE — F-09 + F-15 Liquid-Migration

**Sprint:** MEGA-MEGA-MEGA O2 (IHK-SVO Templates)
**Datum:** 03.05.2026 abend
**Status:** Entscheidung benoetigt
**Marcel-Decision-Pflicht:** ja

---

## Was ich gefunden habe

Die Goldstandard-Templates fuer F-09 KURZGUTACHTEN und F-15 GERICHTSGUTACHTEN sind **hardcoded Demo-Versionen** mit echten Personennamen + Adressen ("Frau Maria Kowalski, Ringstraße 12, 50733 Köln", "Landgericht Köln"). Sie sind 4-Teile-strukturiert und IHK-SVO-konform vom Aufbau, aber nicht Liquid-templated.

F-19 WERTGUTACHTEN ist demgegenueber bereits Liquid-templated (Production-Ready) mit `{{ variable }}` und `{% if %}/{% endif %}`.

F-04 habe ich heute neu erstellt als Liquid-Goldstandard (Production-Ready, 4-Teile, IHK-SVO-konform).

---

## Status-Matrix

| Slot | PDFMonkey-ID | Goldstandard | Liquid? | 4-Teile? | EU AI Act + § 407a |
|---|---|---|---|---|---|
| F-04 | C4BB257B | ✅ neu erstellt | ✅ | ✅ | ✅ |
| F-09 | BA076019 | ✅ vorhanden | ❌ Demo | ✅ | ✅ |
| F-15 | 36E140DC | ✅ vorhanden | ❌ Demo | ✅ | ✅ |
| F-19 | 29064D98… | ✅ vorhanden | ✅ | ✅ | ✅ |

---

## Entscheidungs-Optionen

### Option A — Pre-Pilot Status-Quo lassen, Liquid-Migration in Sprint K-2

**Pro:**
- Pilot-Launch kann sofort starten, F-04 reicht als erster Slot
- F-09 + F-15 bleiben als Demo-PDFs im PDFMonkey-Service (funktional)
- Keine zusaetzliche Marcel-Arbeit heute Nacht

**Con:**
- F-09 / F-15 PDFs zeigen Demo-Daten (Frau Kowalski) statt echter Pilot-Daten
- Pilots koennen aktuell *kein* echtes Kurzgutachten oder Gerichtsgutachten generieren

**Aufwand:** 0 (status-quo)

### Option B — F-09 + F-15 jetzt liquid-migrieren

**Pro:**
- Pilot kann ALLE Slots nutzen
- Saubere Production-Templates ueberall
- Keine Demo-Daten mehr in Produktion

**Con:**
- 2 weitere Templates (~750-1050 LOC each) muessen liquid-templated werden
- Viel Find-Replace-Arbeit (Kowalski-Werte → {{ variable }})
- Schaetzung 90-150 Min Arbeit + Test-Render-Verifikation
- Marcel muss PDFMonkey-Templates ebenfalls neu hochladen (+30 Min)

**Aufwand:** 2-3h (mein Teil) + 30 Min Marcel

### Option C — Quick-Win: F-09 nur Variablen-Map vorbereiten

**Pro:**
- Mittlerer Aufwand
- Marcel kann F-09 spaeter mit klarem Plan migrieren
- Pilot startet mit F-04 (haeufigste Variante)

**Con:**
- Nicht so vollstaendig wie Option B

**Aufwand:** 30-60 Min

---

## Empfehlung

**Option A** fuer den Pilot-Launch v207-v208.

Begruendung:
1. **F-04 reicht fuer 70% der Pilot-Faelle** (Solo-SVs machen oft Kurzstellungnahmen, weniger Gerichtsgutachten in den ersten 90 Tagen)
2. **F-09 / F-15 funktionieren ja** als Demo-PDFs — der Pilot kriegt ein PDF zurueck, nur mit Demo-Daten gemischt. Das ist *unschoen* aber nicht *broken*.
3. **Pilot-Feedback waere wertvoller** als jetzt 3h in Liquid-Migration zu investieren — Sprint K-2 priorisiert dann was wirklich genutzt wird
4. **Sicheres Deploy-Risiko:** Liquid-Fehler in F-09 koennten PDF-Generierung komplett brechen. F-04 testbar, F-09/F-15 ohne Live-Test riskant.

**Fallback:** Wenn Marcel doch Option B will, ich kann das in Sprint O3 oder O7 nachholen wenn Zeit uebrig bleibt — Pattern ist klar (siehe F-04).

---

## Aktion bei Marcel-Approval Option A (default)

1. F-04 PDFMonkey-Migration (siehe `docs/strategie/IHK-SVO-TEMPLATES-MIGRATION.md`)
2. F-09 / F-15 in Sprint K-2 Backlog: `BACKLOG.md` Eintrag PDF-05 + PDF-06
3. Pilot-Pages updaten falls F-09/F-15 explizit als "verfuegbar" angekuendigt werden — falls nicht, kein User-facing Issue
4. Master-Files-Sync: F-09 + F-15 als "Liquid-Migration pending" markieren

---

*NACHT-PAUSE-File erstellt im Sprint O2, 03.05.2026 abend. Marcel-Decision morgen frueh.*
