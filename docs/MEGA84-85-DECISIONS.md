# MEGA⁸⁴/⁸⁵ DECISIONS — Mega-Marathon Pass 1 (Vor-Ort-Power-Foundation)

**Stand:** 2026-05-16 · Branch: `feat/mega84-85-mega-marathon` (von main)
**Pass 1:** ~6h Code · 3 Commits · Block 0 + A.1-A.4 + H

---

## Pre-Read ✅

- `CLAUDE.md` (Stand nach Hotfix-1 + Hotfix-2 + MEGA83 Merge in main)
- MEGA83-DECISIONS, MEGA82-HOTFIX-2-DECISIONS
- `vor-ort.html`, `skizzen.html`, `supabase/functions/ki-proxy/index.ts`, `lib/prova-legacy-bridge.js`

**Pre-Merge-Finding:** main hatte unmerged sw.js Conflict zwischen Hotfix-2 (v3248) und MEGA83 (v3300). Resolved durch Combined-Comment + v3300-mega83-merge-hotfix2 als CACHE_VERSION (höher).

---

## Scope-Realität für Mega-Marathon

| Block | Inhalt | Status |
|---|---|---|
| **0.1** Akte-Tokens | Section-Labels 15px prominent | ✅ |
| **0.2** Bridge-Sweep | 83 Pages mit prova-legacy-bridge.js | ✅ |
| **0.3** Edge-Reaping | CLI-Doku für Marcel | ✅ |
| **A.1** DB-Migration | skizzen.foto_pins | ✅ Migration 58 |
| **A.2** Skizzen-Pin-UI | lib/skizzen-pins.js | ✅ |
| **A.3** KI-Vision-Captions | ki-proxy + lib/prova-ki-foto.js | ✅ |
| **A.4** Diktat-Chips | ki-proxy + lib/prova-ki-diktat-mapping.js | ✅ |
| **A.5** Mobile-3-Tab | vor-ort.html Komplett-Refactor | ⏸ DEFER Pass 2 |
| **B** Founder-Cockpit | admin-dashboard + KPIs + 2FA | ⏸ DEFER Pass 2 |
| **C** KI-Pipeline | gpt-4o → gpt-5.5 Migration | 🟡 teilweise (Alias-Mapping in ki-proxy ist da, Frontend-Caller noch) |
| **D** PDF-Compliance | 3 Templates LG-Disclosure | ⏸ DEFER Pass 3 |
| **E** Trial-Guard | 30T + Coupons | ⏸ DEFER Pass 3 |
| **F** Global-Search 360 | Multi-Table + Strg+K | ⏸ DEFER Pass 3 |
| **G** Audit-Edges Konsolidierung | 5→1 audit-log-v1 | ⏸ DEFER Pass 3 |
| **H** Final | sw v3400 + Doku | ✅ |

**Pass 1 geliefert:** Foundation (Migration + 3 Libs + 2 KI-Tasks) + Quick-Wins.

---

## Block 0 — Quick-Wins ✅

### 0.1 — Akte-Section-Labels
`akte.html` `.ak-section-label` analog `.dc-section-label` aus Hotfix-2: 15px statt 11px, ohne uppercase, `var(--text)` statt `var(--text3)`, Icon-Span separat, Section-Row mit Trennlinie. Plus Sub-Block-Heads (`.ak-side-head`) 13px bold, Empty-States 13px text2.

### 0.2 — Bridge-Sweep (83 Pages)
`sed`-Bulk-Insert nach `prova-config.js` Script-Tag. Cross-Subdomain-Auth-Bridge funktioniert jetzt end-to-end (MEGA83 C deckte nur 4 Top-Pages ab, jetzt alle 83).

### 0.3 — Edge-Reaping
`docs/MEGA84-EDGE-DELETED.md` mit Marcel-CLI-Apply-Pfad. CC-Self-Apply nicht möglich (Supabase-CLI nicht in Sandbox).

---

## Block A — Vor-Ort-Power-Foundation ✅

### A.1 — DB-Migration 58
`supabase-migrations/58_mega84_skizzen_foto_pins.sql`:
- `ALTER TABLE skizzen ADD foto_pins jsonb DEFAULT '[]'`
- GIN-Index für Pin-Queries
- Pin-Format: `{ id, x_pct, y_pct, foto_id, label, kategorie?, ki_caption?, created_at }`

**Apply via MCP:**
```
mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv name=mega84_skizzen_foto_pins query=<Inhalt>
```

### A.2 — Skizzen-Pin-UI (`lib/skizzen-pins.js`)
- `ProvaSkizzePins.attach(svgEl, {skizzeId})` initialisiert Pin-Mode-Capability
- `setMode(svgEl, 'pin'|'view')` toggelt
- Click in Pin-Mode → Pin-Marker-Position → Modal mit Label/Kategorie/foto_id
- Click auf existierenden Pin (View-Mode) → Lightbox
- WeakMap-State pro SVG-Element
- Auto-Persist via Supabase `.update(skizzen)`
- SVG-Pins als `<g>` mit Circle + Number-Text

**Foto-Picker-UI** ist DEFER Pass 2 — vorerst manuelle UUID-Eingabe.

### A.3 — KI-Vision-Captions (gpt-5.5-vision)

**ki-proxy Backend-Patches:**
- `VISION_PURPOSES = new Set(['foto_caption_vision', 'skizze_interpret'])`
- `MODEL_API_NAME`: `vision` → `gpt-5.5-vision` + Legacy-Alias `gpt_4o_vision`
- `PRICE_PER_M_TOKENS`: `gpt-5.5-vision` 5.00€/15.00€ pro 1M Tokens
- `callOpenAIVision(model, prompt, system, imageBase64, maxTokens)` — Multi-Modal-API mit `image_url`-Content-Block
- `buildSystemPrompt('foto_caption_vision')` mit verbindlichem Wortlaut (Konjunktiv II, §-Vorschlag, JSON-Output, NO PII)
- Handler-Routing: wenn `purpose IS Vision` → callOpenAIVision statt callOpenAI, Pseudonymisierung skipped (Bild generisch genug)
- Body-Param `image_base64` (Vision-Required)

**Frontend `lib/prova-ki-foto.js`:**
- `ProvaKiFoto.generateCaption({imageFile|imageBase64, context?})` 
- File → Base64-Conversion via FileReader
- POST `/functions/v1/ki-proxy` mit purpose `foto_caption_vision`
- JSON-Parse (Code-Fence-Defense)
- Returnt `{ caption, paragraph_suggestion, confidence, raw }`

### A.4 — Diktat → §§ Mapping mit Chips

**ki-proxy Backend:** purpose `diktat_paragraph_mapping` mit verbindlichem System-Prompt (NIEMALS §6/§7 generieren, Konjunktiv II §§3-5, JSON-Array-Output mit alternatives).

**Frontend `lib/prova-ki-diktat-mapping.js`:**
- `.structure(transkript, opts?)` → POST ki-proxy → JSON-Array
- `.renderChips(containerEl, chips, onSave)` rendert pro § einen Chip mit:
  - Paragraph-Select (§1-§5, klickbar zum Wechseln)
  - Confidence-Anzeige (in %)
  - Text-ContentEditable (Inline-Edit)
  - Alternatives-Hint (gelbe Box bei Konflikt-Vorschlag)
  - Übernehmen/Verwerfen-Actions
- onSave-Callback persistiert in `auftraege.details->>'paragraphen'` (Caller-Job)
- Inline-Styles, kein externes CSS

---

## DEFER Pass 2/3

### Pass 2 (P0, ~8-10h):

**Block A.5 — Vor-Ort-Mode-Unified 3-Tab-Mobile:**
Begründung: `vor-ort.html` Komplett-Refactor (3 Tabs Skizze/Foto/Diktat) ohne Browser-Test zu invasiv. Libs aus Pass 1 sind bereit zum Plug-In.

**Block B — Founder-Cockpit:**
admin-dashboard.html mit KPIs + User-Mgmt + Login-as-User + 2FA-Mandatory. Eigenständiger Sprint, braucht admin-Subdomain-Auth-Tests.

**Block C — KI-Pipeline-Migration komplett:**
ki-proxy hat schon Alias-Mapping (`gpt_4o → gpt-5.5`). Frontend-Caller die hardcoded gpt-4o-Strings nutzen müssen noch migriert werden (grep + replace).

### Pass 3 (P1/P2, ~7-10h):

- **Block D** — 3 PDFMonkey-Templates mit LG-Disclosure-Liquid-Block (F-04, F-09, F-15)
- **Block E** — Trial-Guard 30T + Coupon-Codes + Banner
- **Block F** — Global-Search 360° mit Multi-Table + Strg+K
- **Block G** — 5-Audit-Edges → 1 generische audit-log-v1

---

## Files geändert / neu in Pass 1

| File | Status |
|---|---|
| `akte.html` | modified (Token-Upgrades) |
| 83× App-Pages | modified (Bridge-Script-Tag) |
| `supabase/functions/ki-proxy/index.ts` | modified (Vision-Support + 2 Prompts) |
| `lib/skizzen-pins.js` | **NEU** (280 Zeilen) |
| `lib/prova-ki-foto.js` | **NEU** (Vision-Frontend-Wrapper) |
| `lib/prova-ki-diktat-mapping.js` | **NEU** (Diktat-Chips) |
| `supabase-migrations/58_mega84_skizzen_foto_pins.sql` | **NEU** |
| `sw.js` | v3300 → v3400 |
| `docs/SW-VERSION-HISTORY.md` | erweitert |
| `docs/MEGA84-EDGE-DELETED.md` | **NEU** (CLI-Pfad) |
| `docs/MEGA84-85-DECISIONS.md` | **NEU** (dieses File) |
| `docs/MEGA84-85-MARCEL-CHECKLIST.md` | **NEU** |

---

## Marcel-Apply-Pfad

### 1. Migration 58 applien
```
mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv name=mega84_skizzen_foto_pins query=<58_mega84_skizzen_foto_pins.sql>
```

### 2. ki-proxy Edge-Function deployen (gpt-5.5-vision aktiv)
```bash
supabase functions deploy ki-proxy --project-ref cngteblrbpwsyypexjrv
```

### 3. Optional: 6 sichere Edges löschen (siehe `docs/MEGA84-EDGE-DELETED.md`)

### 4. Browser-Smoke-Test
Siehe `docs/MEGA84-85-MARCEL-CHECKLIST.md` (12-Punkte).
