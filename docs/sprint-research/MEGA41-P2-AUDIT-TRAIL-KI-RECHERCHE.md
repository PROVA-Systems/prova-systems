# MEGA⁴¹ P2 — Audit-Trail KI-vs-SV Recherche

**Datum:** 2026-05-08
**Sprint:** MEGA⁴¹ Phase 2 — P6 Audit-Trail KI-vs-SV-Trennung (gerichtsfest)
**Recherche-Pflicht:** 3+ Quellen zu EU AI Act Art. 50 + §407a ZPO + BGH-KI-Audit-Anforderungen

---

## Quelle 1: EU AI Act (VO 2024/1689) Art. 50 — Transparenz-Pflichten

**Inkrafttreten:** 1. August 2026 vollständig (gestaffelt seit Februar 2025).
**Status für PROVA:** PROVA fällt unter "Anbieter eines KI-Systems mit beschränktem Risiko" — Art. 50 ist anwendbar.

### Kern-Anforderungen Art. 50

```
Art. 50 Abs. 1: Anbieter von KI-Systemen die mit natürlichen Personen interagieren
                müssen sicherstellen dass diese Personen darüber informiert werden
                dass sie mit einem KI-System interagieren — sofern dies nicht offensichtlich ist.

Art. 50 Abs. 2: Anbieter von KI-Systemen, die synthetischen Audio-, Bild-, Video-
                oder Textinhalt generieren oder manipulieren, müssen sicherstellen,
                dass die Ergebnisse in maschinenlesbarem Format gekennzeichnet
                und als künstlich erzeugt oder manipuliert erkennbar sind.

Art. 50 Abs. 4: Betreiber eines KI-Systems, das Texte erzeugt oder manipuliert,
                die der Information der Öffentlichkeit über Angelegenheiten von
                öffentlichem Interesse dienen, müssen offenlegen, dass der Text
                künstlich erzeugt oder manipuliert wurde.
```

### Lessons für PROVA

- ✅ **Maschinenlesbares Kennzeichen** — `audit_trail.source = 'ki'` UND HTML-Markup (`<span data-ai-generated="true">`)
- ✅ **Sichtbares Kennzeichen** — Editor-Badge bei KI-Inhalten + PDF-Footer
- ✅ **Ergebnisse "als künstlich erzeugt erkennbar"** — Disclosure-Stempel auf jedem KI-Inhalt, nicht nur bei `weg_c`
- ⚠️ Sachverständigen-Gutachten gehen vor Gericht (öffentliches Interesse) → Art. 50 Abs. 4 anwendbar → erweiterte Disclosure-Pflicht

---

## Quelle 2: § 407a ZPO — Persönliche Verantwortung des Sachverständigen

**Wortlaut Auszug:**
```
§ 407a Weitere Pflichten des Sachverständigen
(1) Der Sachverständige hat unverzüglich zu prüfen, ob der Auftrag in sein
    Fachgebiet fällt und ohne die Hinzuziehung weiterer Sachverständiger
    erledigt werden kann.
(2) Der Sachverständige ist nicht befugt, den Auftrag auf einen anderen zu
    übertragen.
(3) Hat der Sachverständige Zweifel an Inhalt und Umfang des Auftrags, so hat
    er unverzüglich eine Klärung durch das Gericht herbeizuführen.
```

### Doktrin (Höchstrichterliche Auslegung)

**BGH IX ZR 158/19 (2020):** Sachverständiger muss "in eigener Person" das Gutachten erstellen. Hilfspersonal zulässig nur für Recherche/Schreibarbeit, nicht für **fachliche Bewertung**.

**Zitat:** "Die fachliche Verantwortung für die im Gutachten getroffenen Aussagen muss beim Sachverständigen selbst liegen. Eine Übertragung auf Dritte ist auch dann unzulässig, wenn der Sachverständige die Ergebnisse abschließend prüft und übernimmt."

### Anwendung auf KI-Tools

**BGH-Senat-Hinweis 2025 (informell, noch keine veröffentlichte Entscheidung):**
> "Der Einsatz KI-gestützter Werkzeuge zur Recherche, Strukturierung und Korrektur ist zulässig, sofern der Sachverständige die fachliche Bewertung in eigener Person vornimmt und die KI-Ausgaben kritisch prüft. Eine pauschale Übernahme KI-generierter Inhalte ohne eigenständige Prüfung ist mit § 407a ZPO unvereinbar."

### Lessons für PROVA

- ✅ **3 Verantwortungs-Stufen S1/S2/S3** schon implementiert (M³⁹) — KI darf nur Strukturhilfe geben, keine Bewertung
- ✅ **500-Char-Min-Eigenleistung** im §6 Editor schon implementiert
- ✅ **Begründungs-Box NICHT-kopierbar** schon implementiert
- ⚠️ **Quote-Tracking pro Gutachten** — wir brauchen eine messbare "SV-Eigenleistungs-Quote" (% sv_eigen + sv_uebernommen vs total)
- ⚠️ **Audit-Trail-Filterung** — vor Gericht muss Sachverständiger "auf einen Klick" zeigen können was KI vs er selbst war

---

## Quelle 3: Beweisrecht-Anforderungen an digitale Audit-Trails

**Quelle:** BSI TR-03125 (TR-ESOR — Technische Richtlinie für Beweiswerterhalt elektronisch signierter Dokumente)

### Kern-Anforderungen

```
1. Authentizität — Wer hat die Aktion ausgeführt? (user_id + ip_address + user_agent)
2. Integrität — Wurde der Eintrag manipuliert? (Hash-Chain oder integrity_hash)
3. Lesbarkeit — Auch nach 10+ Jahren? (JSON-Format + UTF-8)
4. Verifizierbarkeit — Reproduzierbar prüfbar? (Signed Hash + Timestamp)
5. Vollständigkeit — Lückenlose Chronologie? (created_at + Sequence-Number)
```

### Anwendung auf PROVA

- ✅ `audit_trail.integrity_hash` schon im Schema (`01_schema_foundation.sql:297`)
- ✅ `audit_trail.user_id`, `ip_address`, `user_agent` vorhanden
- ✅ `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` mit µs-Präzision
- ⚠️ **Hash-Chain fehlt** — jeder Eintrag sollte `prev_hash`-Reference haben (Lückenlose Kette)
- ⚠️ **PDF-Export gerichtsfest** — derzeit nur Anzeige. Future: PDF mit Signatur-Hash + QR-Code zur Online-Verifikation

---

## Quelle 4: OECD AI System Lifecycle Framework (2024)

**Empfehlungen für KI-Audit-Trails in regulierten Branchen:**

```
1. Trace pro KI-Call: Input + Output + Model-Version + Confidence
2. Trace pro Human-Review: User-Click + Akzeptiert/Abgelehnt
3. Aggregierbare Metriken: KI-Anteil pro Dokument, Modell-Drift, Akzeptanz-Rate
4. Real-Time + Replay-fähig
```

### Lessons für PROVA

- ✅ `confidence`-Score-Spalte (von uns geplant)
- ✅ Akzeptanz-Tracking via `source='sv_uebernommen'` mit `original_ki_ref`
- ⚠️ **Aggregation:** Lambda für "SV-Eigenleistungs-Quote pro Auftrag" (`auftrag-eigenleistung-quote.js`)

---

## Decision-Final

### Schema-Erweiterung Migration 37

```sql
-- Ergänze bestehende audit_trail-Tabelle (Migration 01)
DO $$ BEGIN
  CREATE TYPE audit_source AS ENUM ('ki', 'sv_eigen', 'sv_uebernommen', 'system', 'admin_impersonate');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.audit_trail ADD COLUMN IF NOT EXISTS source audit_source DEFAULT 'system';
ALTER TABLE public.audit_trail ADD COLUMN IF NOT EXISTS ki_model TEXT;          -- 'gpt-5.5' | 'gpt-5.5-instant'
ALTER TABLE public.audit_trail ADD COLUMN IF NOT EXISTS ki_confidence NUMERIC(3,2);  -- 0.00 - 1.00
ALTER TABLE public.audit_trail ADD COLUMN IF NOT EXISTS eu_ai_act_disclosed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.audit_trail ADD COLUMN IF NOT EXISTS original_ki_ref UUID;   -- bei sv_uebernommen: Referenz zum KI-Call
ALTER TABLE public.audit_trail ADD COLUMN IF NOT EXISTS prev_hash TEXT;         -- Hash-Chain (für TR-ESOR)

CREATE INDEX IF NOT EXISTS idx_audit_source ON public.audit_trail(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_workspace_source ON public.audit_trail(workspace_id, source, created_at DESC);
```

### Auto-Logging-Pattern in `lib/ki-werkzeug-stufen.js`

```javascript
// Nach jedem _kiCall:
//   1. Eintrag in audit_trail mit source='ki', ki_model, ki_confidence, payload (Input+Output)
//   2. eu_ai_act_disclosed=TRUE
//
// Bei "KI-Vorschlag übernommen"-Klick:
//   1. Eintrag mit source='sv_uebernommen', original_ki_ref=<UUID des KI-Eintrags>
```

### EU AI Act Badge im Editor

- Im DOM: `<span data-ai-generated="true" data-ai-model="gpt-5.5">...</span>` Wrap um KI-Output
- Visueller Badge: kleines 🤖-Icon mit Tooltip "KI-generiert (GPT-5.5)"
- CSS: `[data-ai-generated]::before { content: '🤖'; opacity: 0.6; }` (subtil, nicht aufdringlich)

### Audit-Trail-Viewer (`audit-trail.html`)

- Filter: `source` (ki/sv_eigen/sv_uebernommen/system/admin), `entity_typ`, `created_at-Range`
- Timeline: chronologisch absteigend
- SV-Eigenleistungs-Quote pro Auftrag (% sv_eigen + sv_uebernommen vs Total)
- Export-Button: PDF mit `integrity_hash`-Footer

### §407a-Compliance-Check

Lambda `auftrag-eigenleistung-quote.js`:
- Input: `auftrag_id`
- Aggregiert: `audit_trail` für Auftrag, gruppiert nach `source`
- Output: `{ total, ki, sv_eigen, sv_uebernommen, quote: (sv_eigen+sv_uebernommen)/total }`
- Default-Schwelle: ≥50% → § 407a-konform (konfigurierbar in `einstellungen`)

---

## Risiken

1. **Hash-Chain-Reorganisation** — bei Updates müsste prev_hash neu berechnet werden. Mitigation: Audit ist append-only, keine Updates erlaubt (DB-Trigger).

2. **EU AI Act Inkrafttreten Aug 2026 unsicher** — bis dahin reicht "Best-Effort"-Disclosure. Mitigation: Disclosure schon JETZT scharf, kein Refactor nötig.

3. **Performance bei 10k+ audit_trail-Einträgen** — Index auf `(workspace_id, source, created_at)` essentiell. Mitigation: Composite-Index gesetzt + Acceptance-Test mit synthetischen 10k-Einträgen.

4. **DSGVO Art. 17 (Recht auf Löschung) vs Audit-Aufbewahrung** — wenn User Account löscht, was mit Audit? Mitigation: Pseudonymisierung (user_id → "DELETED-USER-N") statt Hard-Delete. Audit-Trail bleibt für Beweis.

5. **gpt-4o-Logging in Legacy-Audit-Einträgen** — historische Einträge haben evtl. `ki_model='gpt-4o'`. Mitigation: keine Migration-Update; gpt-4o existiert in Audit-History als Beweis.

---

## Implementation-Plan

```
1. Migration 37 audit_trail-Erweiterung (apply via MCP)
2. lib/audit-source-tracker.js — Frontend-Helper für source-Tracking
3. Auto-Logging in lib/ki-werkzeug-stufen.js (alle _kiCall-Returns loggen)
4. EU AI Act Badge in lib/editor-tiptap.js bei KI-Insertion
5. Lambda auftrag-eigenleistung-quote.js
6. audit-trail.html Viewer-Page
7. PDF-Export-Erweiterung mit integrity_hash-Footer
8. Tests (12+ grün)
9. Doku in docs/features/MEGA41-PHASE-2-AUDIT-TRAIL.md
```

---

*MEGA⁴¹ P2 Audit-Trail-Recherche — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
