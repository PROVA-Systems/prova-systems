# NACHT-PAUSE K-2.2 — Konsolidierung

**Datum:** 29.04.2026 · **Branch:** `sprint-k-2-2-konsolidierung` (von main)
**Status:** STOP — Sprint NICHT autonom gestartet

---

## Gate-Trigger

K-2.2-Mega-Prompt enthält:

```
PFLICHT vor Start: Lies /docs/sprint-status/K-2-1-STATUS.md

GATE:
  - Datei nicht existent → STOP, NACHT-PAUSE-K2-2.md anlegen
  - K-2-1 OVERALL=ROT → STOP
  - K-2-1 OVERALL=TEILWEISE oder GRUEN → weiter
```

### Datei-Existenz-Check

```
ls docs/sprint-status/  →  No such file or directory
```

→ **`docs/sprint-status/K-2-1-STATUS.md` existiert NICHT.**

K-2.1 hat gestern den NACHT-PAUSE-Gate getriggert (`docs/sprint-status/K-2-0-STATUS.md` hatte `NACHT_PAUSE_ANGELEGT=JA`) und nur **eine NACHT-PAUSE-Datei** angelegt, aber **kein Status-File**. Das ist die korrekte Konsequenz aus dem K-2.1-Mega-Prompt — Sprints die nicht starten produzieren keine Status-Files.

→ **STOP nach Marcels Matrix.**

---

## Inhaltliche Voraussetzungen ebenfalls nicht erfüllt

Selbst wenn die Status-Datei existieren würde, hätte K-2.2 mehrere Vorbedingungen:

### K-2.2A — Aufträge-Page Pattern A

Verweist auf:
- `kontakte.html` als Pattern-Vorbild (K-2.1B, **nicht gebaut**)
- `KORRESPONDENZ_TEMPLATES` für Brief-Schnell-Buttons (K-2.0 Block 3, **3 von 9 Templates fertig**)
- `briefe.html` für Query-Param-Support (K-2.0 Block 5, **nicht gebaut**)

→ **Hängt komplett an K-2.0 + K-2.1.** Ohne diese Foundation kein sinnvoller Bau.

### K-2.2B — Backlog-Aufräumen

Drei Sub-Items wären in der Theorie unabhängig:
- B1: `onboarding-tour.js:168` Null-Check
- B2: RECHNUNGEN-422 in `prova-context.js`
- B3: Sidebar-Layout-Bug 768-1100px in `nav.js`

**Aber** Marcels Matrix sagt explizit "Datei nicht existent → STOP" — das überschreibt jede Sub-Block-Logik.

### K-2.2C — KI-PROMPTS-MASTER

Eigenständige Doku-Aufgabe (`/docs/KI-PROMPTS-MASTER.md` neu anlegen + CLAUDE.md verlinken). **Theoretisch unabhängig** vom K-2.0/K-2.1-Stand. Aber wieder: Gate-Trigger dominiert.

---

## Was getan wurde

```
git checkout main                                  ✅
git checkout -b sprint-k-2-2-konsolidierung        ✅
NACHT-PAUSE-K2-2.md geschrieben (diese Datei)      ✅
Push                                                ⏳ folgt
```

**KEIN Code geschrieben** — nur Branch-Marker.

---

## Marcel-TODO morgen früh (Gesamt-Reihenfolge)

```
1. K-2.0 abschließen (siehe NACHT-PAUSE-K-2-0.md im K-2.0-Branch)
   - Variante A: K-04..K-09 selbst nachbauen
   - Variante B: K-2.0-Resume-Session beauftragen
   - Variante C: Hybrid

2. K-2.0-PR mergen (sprint-k-2-0-korrespondenz-layer → main)
   - PDFMonkey-Templates anlegen + UUIDs eintragen
   - supabase functions deploy brief-generate

3. K-2-0-STATUS.md updaten:
   - NACHT_PAUSE_ANGELEGT = NEIN
   - BLOCK_6_BRIEFKOPF = GRUEN (oder ROT für K-2.1B-only-Mode)

4. K-2.1-Mega-Prompt erneut geben
   → Gate-Logic erlaubt jetzt Start (NACHT_PAUSE=NEIN)
   → K-2.1A + K-2.1B oder nur K-2.1B je nach Block 6
   → K-2.1 erstellt nach Abschluss `docs/sprint-status/K-2-1-STATUS.md`

5. Erst danach K-2.2-Mega-Prompt erneut geben
   → Gate-Logic erlaubt jetzt Start (Status-File existiert + OVERALL=GRUEN/TEILWEISE)
   → Sub-Blöcke A/B/C ausführen
```

---

## Hinweis für nächsten K-2.2-Versuch

K-2.2 hat eine **strenge Gate** (`STOP wenn Datei nicht existent`). Dieser Branch (`sprint-k-2-2-konsolidierung`) ist sauber von main — wenn K-2.0 + K-2.1 in main gemerged sind, müsste der nächste K-2.2-Versuch:

- Den Branch erneut frisch von main anlegen (oder diesen rebasen auf main nach K-2.0+K-2.1-Merges)
- Status-File `docs/sprint-status/K-2-1-STATUS.md` muss in main existieren

---

## Branch-Marker-Zweck

Dieser Branch existiert **nur als Marker** dass Marcel den K-2.2-Mega-Prompt gegeben hat und das Gate getriggert wurde. Beim nächsten K-2.2-Versuch:

- Option A: diesen Branch löschen + frisch neu anlegen (sauberer)
- Option B: diesen Branch rebasen auf neuen main-Stand und Sprint von hier aus starten

---

🌙 **K-2.2 wartet auf K-2.0 + K-2.1 Abschluss. Branch-Marker bereit, kein Code-Drift.**
