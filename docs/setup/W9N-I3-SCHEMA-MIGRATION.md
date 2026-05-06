# W9N-I3 — Sprint 06b Schema-Migration + 06c Live-Save Status

**Datum:** 2026-05-10
**Branch:** `welle-9-market-ready`

---

## TL;DR

**Schema:** `2026_05_10_w9_06b_auftraege_extend.sql` neu erstellt aus PLANNED-File. Marcel-Manual-Apply pflicht.

**Live-Save:** `auftrag-neu-logic.js` existiert NICHT mehr. Equivalent ist `prova-wizard.js` mit `_abschliessen()` der bereits in app.html-Form schreibt (kein DB-Draft, sondern Form-Pre-Fill).

---

## Schema-Migration (Marcel-Manual-Apply)

### File
`supabase/migrations/2026_05_10_w9_06b_auftraege_extend.sql`

**Inhalt:** ENUM `auftraggeber_typ` (privatperson/versicherung/anwalt/gericht/behoerde/firma) + minimal-invasive Spalten-Erweiterung in `auftraege`-Tabelle.

### Apply-Anleitung

**Option A — Supabase Dashboard SQL Editor (Marcel pflicht):**
1. Login [supabase.com](https://supabase.com) → Project `cngteblrbpwsyypexjrv`
2. SQL Editor → New Query
3. Inhalt von `supabase/migrations/2026_05_10_w9_06b_auftraege_extend.sql` einfügen
4. Run → Erwartung: keine Errors (idempotent via DO-Block)

**Option B — Supabase CLI:**
```bash
supabase db push --include-all
```

### Verifikation
Nach Apply:
```sql
-- Erwartung: ENUM existiert
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'auftraggeber_typ';

-- Erwartung: 6 Werte (privatperson, versicherung, anwalt, gericht, behoerde, firma)
```

---

## Live-Save Status

### Befund

`auftrag-neu-logic.js` existiert NICHT mehr im Code. Das W6-I3-Spec basiert auf Memory aus früherer Codebase-Version.

**Aktueller Wizard-Stack (W2-I3-Welle):**
- `neuer-fall.html` — Wizard-Landing-Page (W2-I3 Bug-Fix)
- `prova-wizard.js` — 4-Schritt-Wizard (Auftragstyp → Wo&Was → Auftraggeber → Rahmen)
- `auftragstyp.js` — Auftragstyp-Dialog
- `app.html` — Hauptformular wo Wizard-Daten eingespeist werden

### Wizard-Flow

1. User klickt "Neuer Fall" → `neuer-fall.html` öffnet auftragstyp-Dialog
2. Auftragstyp gewählt → `prova-wizard.js` startet 4-Schritt-Form
3. Pro Schritt: Felder ausfüllen (LocalStorage-Persistenz via `WZ.felder`)
4. Schritt 4 → `_abschliessen()` schreibt alle Felder in `app.html`-Form via `_setVal()`
5. User finalisiert in app.html → existing Save-Logic (DB-Insert via Airtable/Supabase)

### Live-Save-Bewertung

**Aktueller Stand:** Kein direkter Draft-Save in DB während Wizard. Persistenz läuft via:
- LocalStorage (`WZ.felder`) während Wizard
- Final-Insert beim app.html-Submit

**Würde ein Draft-Save Sinn machen?**
- Pro: Schutz vor Datenverlust bei Browser-Crash mid-Wizard
- Contra: Wizard ist nur 5-10 Min, LocalStorage reicht
- **CTO-Vote:** Aktueller Stand ist OK für Pre-Pilot. Welle-X-Item: optional Draft-Save in `auftrag_drafts`-Tabelle.

---

## W9N-I3 Acceptance

- ✅ Schema-Migration als datierter File erstellt (`2026_05_10_w9_06b_auftraege_extend.sql`)
- ✅ Marcel-Manual-Apply-Doku erstellt (DIESE Doku)
- 🟢 Live-Save bereits via prova-wizard.js + LocalStorage funktional (kein Code-Change nötig)
- ⏸ Marcel-TODO: SQL apply via Dashboard

### Welle-X-Backlog
- Optional: `auftrag_drafts`-Tabelle für DB-basiertes Draft-Save (post-Pilot wenn User-Feedback "Browser-Crash mid-Wizard verloren" kommt)

---

*MEGA²⁹ W9N-I3 — Schema-File erstellt, Live-Save via prova-wizard.js bereits OK.*
