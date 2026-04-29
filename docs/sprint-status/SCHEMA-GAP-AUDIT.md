# Schema-Gap-Audit — auftraege ↔ Sprint 06b

**Datum:** 2026-04-30 (Nacht-Sprint v3 N4)
**Methodik:** Vergleich `lib/auftrags-schema.js` (Sprint 06b Bedarf) vs.
`supabase-migrations/02_schema_kerngeschaeft.sql` (auftraege-Tabelle live).

---

## Executive Summary

**Befund:** Das auftraege-Schema ist bereits enterprise-grade —
**90% der Sprint-06b-Felder mappen ohne Migration** auf bestehende Spalten,
hauptsächlich via `objekt JSONB` und `details JSONB`.

**Migration-Bedarf:** Minimal — **2 neue Spalten + 1 neuer ENUM-Typ + 2 Indexe**.
Plus 2 COMMENTS für JSONB-Schema-Doku.

**Datei:** `supabase/migrations/PLANNED_06b_auftraege_extend.sql`
(NICHT applied — Marcel reviewt + applied manuell).

---

## Mapping-Tabelle: lib/auftrags-schema.js → DB

### Phase 1A — Stammdaten

Stammdaten leben **nicht in auftraege** — sondern im verlinkten kontakte-Eintrag.
Pro Auftrag wird ein FK gesetzt → Single-Source-of-Truth.

| Wizard-Feld | DB-Spalte |
|---|---|
| auftraggeber_typ | **NEU** `auftraege.auftraggeber_typ` (ENUM) |
| _kontakt-Picker_ → kontakte-Stammdaten | **NEU** `auftraege.auftraggeber_kontakt_id` (FK auf kontakte) |

### Phase 1B — Vorgangsdaten (typ-spezifisch)

Alle in `auftraege.details JSONB` (existing). **Kein Migration-Bedarf** — JSONB nimmt beliebige Felder auf.

| Auftraggeber-Typ | Felder in details |
|---|---|
| versicherung | schadennummer, versicherungsnummer, versicherungsart, selbstbeteiligung_eur |
| anwalt | anwalt_az, mandant_seite |
| gericht | gericht_az, beweisbeschluss_datum, beweisfragen, frist_gutachten, kostenvorschuss_eur |
| behoerde | behoerden_az, rechtsgrundlage |
| firma | firma_az, projekt_nr |
| privatperson | privat_az (optional) |

PLANNED-Migration enthält `COMMENT ON COLUMN details` mit dem JSONB-Schema als Doku.

### Phase 2 — Schadens-Objekt + Beteiligte

| Wizard-Feld | DB-Spalte |
|---|---|
| objekt_adresse_strasse, _nr | `auftraege.objekt JSONB` (existing) |
| objekt_adresse_plz, _ort | `auftraege.objekt JSONB` |
| objekt_typ | `auftraege.objekt JSONB` |
| baujahr | `auftraege.objekt JSONB` |
| schadensart | `auftraege.schadensart_kategorie` (existing) — Wert direkt aus SCHADENSARTEN-Keys |
| schadensart_label | `auftraege.schadensart_label` (existing) |
| schadens_datum | `auftraege.schadensstichtag` (existing) |
| **Beteiligte** (eigentuemer, klaeger, beklagter, mandant, etc.) | `auftrag_kontakte` (existing M:N-Tabelle mit `kontakt_rolle` ENUM, 14 Werte) |

### Phase 3 — Ortstermin + Befund

| Wizard-Feld | DB-Spalte |
|---|---|
| ortstermin_datum, _uhrzeit | `auftraege.details JSONB` (alternativ: separater termine-Eintrag mit typ='ortstermin') |
| anwesende, hilfsmittel | `auftraege.details JSONB` |
| wetterbedingungen, feuchte_messwerte, riss_messungen | `auftraege.details JSONB` |
| schadensbeschreibung | `auftraege.fragestellung` (existing) — semantisch passend |
| fotos | separate `fotos`-Tabelle (existing K-1.0) |

---

## Gap-Tabelle (was fehlt vs. was reicht)

| Bereich | Status | Migration nötig? |
|---|---|---|
| Auftraggeber-Typ-Discriminator | **fehlt** | ✅ Spalte + ENUM |
| FK auf Stammdaten-Kontakt | **fehlt** | ✅ Spalte |
| Vorgangsdaten typ-spezifisch | **details JSONB existiert** | ❌ |
| Objekt-Daten | **objekt JSONB existiert** | ❌ |
| Schadensart | **schadensart_kategorie existiert** | ❌ — UI nutzt schadensart_kategorie direkt |
| Beteiligte (M:N) | **auftrag_kontakte + kontakt_rolle ENUM existieren** | ❌ |
| Phase 3 Ortstermin-Daten | **details JSONB oder termine-Tabelle** | ❌ |
| Foto-Anhänge | **fotos-Tabelle existiert** | ❌ |
| Phase-Tracking | **auftrag_phasen mit state JSONB existiert** | ❌ |

**Total:** 2 fehlende Spalten + 1 ENUM. Migration kompakt, idempotent, low-risk.

---

## PLANNED-Migration-Inhalt

Datei: `supabase/migrations/PLANNED_06b_auftraege_extend.sql`

```sql
-- 1. ENUM auftraggeber_typ (privatperson|versicherung|anwalt|gericht|behoerde|firma)
CREATE TYPE auftraggeber_typ AS ENUM (...);

-- 2. Spalten in auftraege
ALTER TABLE public.auftraege
    ADD COLUMN IF NOT EXISTS auftraggeber_typ        auftraggeber_typ,
    ADD COLUMN IF NOT EXISTS auftraggeber_kontakt_id UUID REFERENCES public.kontakte(id) ON DELETE SET NULL;

-- 3. Indexe (workspace-scoped + nullable-skip)
CREATE INDEX idx_auftraege_auftraggeber_typ ON ...;
CREATE INDEX idx_auftraege_auftraggeber_kontakt ON ...;

-- 4. COMMENT-Doku fuer details JSONB Schema (kein DDL)

-- 5. Sanity-Output (DO $$ ... RAISE NOTICE)
```

---

## Marcel-TODO (vor Sprint 06c Live-Save)

1. **Review** der PLANNED-Migration (`supabase/migrations/PLANNED_06b_auftraege_extend.sql`)
   - Passt der Scope? (2 Spalten + ENUM)
   - Stimmt die ENUM-Werte-Liste mit Wizard-Anforderungen überein?
   - Sind Indexe sinnvoll dimensioniert?

2. **Umbenennen** in versioniertes File (z.B. `20260501_06b_auftraege_extend.sql`)
   nach Marcel-Approval.

3. **Apply** entweder via:
   - Supabase-Dashboard → SQL Editor (manuell)
   - oder `supabase db push` (CLI mit Project-Ref)

4. **Verifikation:** Sanity-Output prüfen
   - "ENUM auftraggeber_typ exists: t"
   - "Column auftraggeber_typ exists: t"
   - "Column auftraggeber_kontakt_id exists: t"

5. **Sprint 06c aktivieren:** auftrag-neu-logic.js (von Sprint 06b N6) kann
   Live-Save in DB aktivieren (statt LocalStorage-only).

---

## Risiken / Notizen

1. **Bestehende `auftraege`-Daten:** Migration ist additive (nur ADD COLUMN). Bestehende
   Rows bekommen `auftraggeber_typ = NULL` und `auftraggeber_kontakt_id = NULL`. Frontend
   muss damit umgehen können (Fallback: Wizard nicht anbieten für Legacy-Auftrage,
   Edit-Mode öffnet leere Felder zum Nachtragen).

2. **`zweck` ENUM (existing):** existiert bereits mit Werten `privat|...`. Marcel-
   Klarheit wäre gut: ist `zweck` semantisch identisch zu `auftraggeber_typ`? Falls
   ja, könnte man die neue ENUM-Spalte sparen und stattdessen `zweck` umnutzen +
   ENUM erweitern. **Empfehlung:** beide separat lassen — `zweck` ist breiter
   gemeint (gerichtlich/privat), `auftraggeber_typ` ist die konkrete Discriminator-
   Spalte für UI.

3. **`auftrag_kontakte` Single-Source-of-Truth:** `auftraggeber_kontakt_id` als
   neue FK-Spalte ist redundant zu `auftrag_kontakte WHERE rolle='auftraggeber' AND
   ist_primaer=true`. Trade-off: explizite FK ist denormalisiert, aber Index-Performance
   und Query-Simplicity klar besser. Alternative wäre View statt Spalte.

4. **kontakt_rolle ENUM ↔ Wizard-Beteiligte:** auftrags-schema.js nutzt Felder wie
   `versicherungsnehmer`, `mandant`, `klaeger_anwalt` — diese mappen auf:
   - versicherungsnehmer → kontakt_rolle = 'geschaedigter'
   - mandant → kontakt_rolle = 'auftraggeber' (oder 'geschaedigter' je nach Mandant-Seite)
   - klaeger_anwalt → kontakt_rolle = 'anwalt_klaeger'
   - beklagter_anwalt → kontakt_rolle = 'anwalt_beklagter'
   
   Wizard-Logik muss das mapping kennen — kommt in auftrag-neu-logic.js (N6).

---

## Branch

`audit/schema-gap-06b` (push folgt nach Commit, Merge in main erlaubt — Doku + PLANNED-File).
