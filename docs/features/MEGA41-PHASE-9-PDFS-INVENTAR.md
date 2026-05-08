# MEGA⁴¹ Phase 9 — PDFs Vollständigkeits-Audit

**Status:** Audit-Infrastruktur live, Live-Audit-Run = Marcel-Pflicht
**Branch:** `mega41-pre-pilot-completion`

---

## Vision

Alle PDFMonkey-Templates funktionieren produktiv, sind im Design-System v1.0, IHK-konform, EU AI Act-compliant. Kein Template ist deprecated oder broken. Drift zwischen PDFMonkey-API und `dokument_templates`-Tabelle wird automatisch erkannt.

---

## Architektur

```
[Admin-Cockpit] → GET /admin-pdfmonkey-inventory
   ↓
   PDFMONKEY_API_KEY (ENV) ├── PDFMonkey GET /document_templates
                            └── Supabase dokument_templates
   ↓
   computeDrift() → matched / missing_in_supabase / missing_in_pdfmonkey
   computeCompliance() → 407a_blocks / ai_act_disclosure / gpt4o_violations
   ↓
   JSON-Response für UI
```

---

## Lambdas

### `admin-pdfmonkey-inventory.js`

**Zweck:** Live-Inventar + Drift-Detection.

**Drift-Logik:**
| Kategorie | Bedeutung | Action |
|-----------|-----------|--------|
| `matched` | Beide haben gleiche ID | ✅ OK |
| `missing_in_supabase` | PDFMonkey hat, Supabase referenziert NICHT | ⚠️ Tote PDFMonkey-Templates oder fehlende DB-Einträge |
| `missing_in_pdfmonkey` | Supabase referenziert, PDFMonkey hat NICHT | ❌ Broken Templates → DB cleanup |

**Compliance-Checks:**
- `407a_blocks`: Anzahl Templates mit `§ 407a` oder `407a ZPO` im Body
- `ai_act_disclosure`: Anzahl Templates mit `EU AI Act` oder `VO 2024/1689`
- `gpt4o_references`: **MUSS 0 sein** (gpt-4o ist deprecated Feb 2026)
- `gpt4o_violations`: Liste der Identifier mit gpt-4o-Drift

### `admin-pseudonymisierung-audit.js`

**Zweck:** PII-Leak-Detection vor jedem KI-Call.

**7 Synthetic-PII-Tests:**
| Test | Input | Expected |
|------|-------|----------|
| Vollständiger Name | `Max Mustermann` | must_not_contain |
| E-Mail-Adresse | `max.mustermann@beispiel.de` | must_not_contain |
| IBAN | `DE89370400440532013000` | must_not_contain |
| Telefonnummer | `089-123456789` | must_not_contain |
| Strasse + Hausnummer | `Musterstraße 42` | must_not_contain |
| **Aktenzeichen** | `12 O 345/24` | **must_contain** (Legit!) |
| **DIN-Norm** | `DIN 4108-2` | **must_contain** (Legit!) |

**DSGVO-Compliance-Flag:** `total_pii_leaks === 0`

---

## Marcel-Audit-Procedure

```bash
# 1. PDFMonkey-Inventar prüfen
curl -H "Authorization: Bearer $JWT" \
     -H "X-2FA: $TOTP" \
     https://app.prova-systems.de/.netlify/functions/admin-pdfmonkey-inventory \
  | jq '.'

# Erwartung:
#   - drift.matched.length >= 22 (Marcel-Anforderung "22+ Templates")
#   - drift.missing_in_pdfmonkey.length === 0
#   - compliance.gpt4o_must_be_zero === true
#   - compliance.all_have_407a === true

# 2. Pseudonymisierungs-Audit
curl -H "Authorization: Bearer $JWT" \
     -H "X-2FA: $TOTP" \
     https://app.prova-systems.de/.netlify/functions/admin-pseudonymisierung-audit \
  | jq '.'

# Erwartung:
#   - test_results.length === 7
#   - pass_count === 7
#   - fail_count === 0
#   - total_pii_leaks === 0
#   - compliance.dsgvo_compliant === true
```

---

## Erwartetes Live-Inventar (laut Master-Prompt P9)

```
F-01 JVEG
F-04 Kurzstellungnahme
F-06, F-07, F-08 (Mahnungen)
F-09 Kurzgutachten
F-10 Beweissicherung
F-15 Gerichtsgutachten
F-19 Wertgutachten
BES-01 bis BES-12 (Bescheinigungen, 12 Stück)
BRIEF-MASTER (DIN 5008)
FOTO
SOLO-WELCOME / TEAM-WELCOME (Onboarding)

Total: ~22+ Templates
```

---

## Drift-Resolution-Patterns

### Pattern 1: `missing_in_pdfmonkey` (Supabase referenziert tote ID)

**Fix:** SQL-Update in Supabase:
```sql
UPDATE dokument_templates SET pdfmonkey_template_id = NULL
WHERE pdfmonkey_template_id IN (<broken_ids>);
```
Dann neue PDFMonkey-IDs zuweisen oder Templates re-erstellen.

### Pattern 2: `missing_in_supabase` (PDFMonkey hat ungelinkte Templates)

**Fix:** Entweder:
- Neuen `dokument_templates`-Eintrag anlegen mit `pdfmonkey_template_id`
- ODER PDFMonkey-Template archivieren wenn obsolet

### Pattern 3: `gpt4o_references > 0` (KRITISCH)

**Fix:** PDFMonkey-Template-Body öffnen, `gpt-4o` durch `gpt-5.5` ersetzen, neu speichern.

---

## Acceptance-Status (Master-Prompt P9)

- [x] Live-Inventur-Lambda implementiert (admin-pdfmonkey-inventory)
- [x] Drift-Detection gegen `dokument_templates`-Tabelle
- [x] §407a-Block-Counter
- [x] EU AI Act Disclosure-Counter
- [x] gpt4o-Violations-Tracker
- [x] Pseudonymisierungs-Audit (7 PII-Test-Szenarien)
- [x] Doku mit Template-Status-Matrix (dieses File)
- [x] 8+ Tests grün (siehe `tests/pdfs-inventar/m41-p9-inventory.test.js`)
- [ ] **Marcel-Pflicht:** Live-Audit-Run + Drift-Behebung (post-Deploy)
- [ ] **Marcel-Pflicht:** Performance-Test PDF-Generation <8s pro Template (Live-Render)

---

## Bekannte Limitierungen

1. **Live-Test-Render** — kein automatischer Render-Test pro Template, da PDFMonkey-API-Costs entstehen würden. Marcel macht manuelle Stichproben (3-5 Templates).
2. **Performance-Messung** — `<8s` muss live geprüft werden (admin-pdf-queue zeigt Durations).
3. **PDFMonkey-API-Cost-Limit** — `?per_page=100` deckt aktuelle Bestand. Bei >100 Templates: Pagination via `page=2` notwendig.

---

*MEGA⁴¹ Phase 9 — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
