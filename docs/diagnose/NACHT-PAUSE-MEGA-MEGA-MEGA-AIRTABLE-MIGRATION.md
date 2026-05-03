# NACHT-PAUSE — Airtable-Drift Migration

**Sprint:** MEGA-MEGA-MEGA O3 (Airtable-Drift-Cleanup)
**Datum:** 03.05.2026 abend
**Marcel-Decision-Pflicht:** ja

---

## Was ich gefunden habe

Der `AIRTABLE-DRIFT-AUDIT.md` listet **~50 Logic-Files + 32 Netlify-Functions** die noch Airtable nutzen. Marcel-Direktive sagte "Top 15 migrieren".

**Konflikt mit anderer Marcel-Direktive:**
> "Bug-Fixes: Defensive Fixes, keine großen Refactors."

15 Logic-Files migrieren = großer Refactor. Pro File:
- Airtable-Tabelle identifizieren
- Supabase-Pendant + Schema-Mapping pruefen
- Code-Refactor
- RLS-Compatibility verifizieren
- **Live-Test im Browser** (Click-through der Page)

Ohne Browser-Live-Test = **Production-Breaking-Risiko fuer Pilot-Launch**.

---

## Optionen

### Option A — Migration komplett verschieben (auf Sprint K-2)

**Pro:**
- 0 Production-Risiko fuer Pilot-Launch
- Marcel kann bei Migration anwesend sein, pro File live-testen
- Klarer Sprint-Plan mit Priorisierung steht (siehe AIRTABLE-DRIFT-CLEANUP-2026-05-03.md)

**Con:**
- Airtable-Drift bleibt in Codebase
- ~10-15h Migration-Sprint später nötig
- Race-Conditions aus OPTION-C bleiben (sind aber gefixt durch K-1.0/K-1.5 Auth-Migration)

**Aufwand:** 0 (nur Doku-Update)

### Option B — Top 5 HIGH-Priority migrieren ohne Tests

**Pro:**
- Drift wird messbar reduziert
- Pattern-Vorlage etabliert fuer Sprint K-2

**Con:**
- 5x Production-Breaking-Risiko
- Pilot-Page koennte broken sein wenn ein Migration-Fehler ist
- Marcel waeht morgen zu kaputter App auf

**Aufwand:** ~6-8h

### Option C — Nur ENV-Cleanup-Doku + 1 Pilot-Migration als Pattern

**Pro:**
- Klares Pattern fuer Marcel-K-2-Sprint
- Eine LOW-Risk-Function als Vorbild
- Mittlere Wertschoepfung

**Con:**
- Nicht so vollstaendig wie B
- Eine weitere Migration in K-2 noetig

**Aufwand:** ~2h (passt in heutige Nacht)

---

## Empfehlung

**Option A** fuer den Pilot-Launch v207-v208.

Begruendung:
1. **Production-Stabilitaet > Drift-Cleanup.** Aktuelle Hybrid-Architektur funktioniert. Airtable + Supabase parallel ist nicht hipp aber stabil.
2. **Race-Conditions sind durch K-1.5 Auth-Migration entschaerft.** Der OPTION-C-Race war pre-Cutover. Nach v203-vollcutover-airtable-out wurde Auth komplett auf Supabase verschoben.
3. **Marcel anwesend = sicherer:** Live-Tests pro File, sofortiges Rollback bei Issue.
4. **Pilot-Feedback informiert Migration-Reihenfolge:** Vielleicht nutzen Pilots `briefvorlagen-logic.js` gar nicht — dann muss das nicht zuerst migriert werden.
5. **0 Production-Risiko diese Nacht** — schlafe gut.

**Backlog-Eintraege fuer Sprint K-2:**
- `AIRTABLE-MIG-01`: frist-guard.js + prova-status-hydrate.js + nav.js + prova-context.js (HIGH-Bundle, 5h)
- `AIRTABLE-MIG-02`: dashboard-logic.js + archiv-logic.js + akte-logic.js (USER-CRITICAL-Bundle, 6-8h)
- `AIRTABLE-MIG-03`: einstellungen + briefvorlagen + rechnungen + mahnwesen (MEDIUM-Bundle, 5-6h)
- `AIRTABLE-MIG-04`: ENV-Konsolidierung + DEAD-Cleanup (1-2h)

**Total Sprint K-2 Migration-Effort:** ~17-22h.

---

## Aktion bei Marcel-Approval Option A (default)

1. Sprint O3 schliesst mit:
   - `AIRTABLE-DRIFT-CLEANUP-2026-05-03.md` als Strategie-Doku
   - ENV-Cleanup-Liste in BACKLOG.md ergaenzen
   - 0 Production-Files veraendert (sicher)
2. Sprint K-2 plant Migration im Detail
3. Pilot-Launch laeuft mit aktueller Hybrid-Architektur

---

*NACHT-PAUSE-File erstellt im Sprint O3, 03.05.2026 abend.*
