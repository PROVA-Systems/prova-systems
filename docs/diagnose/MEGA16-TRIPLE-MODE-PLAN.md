# MEGA¹⁶ — Triple-Mode-Completion Plan

**Datum:** 2026-05-07/08
**Vorgaenger-Tag:** v222 (MEGA¹⁵.5 ENV-Fix done)
**Modus:** Implementation (Mode B Erweiterung + Mode C MVP)

---

## 1. Honesty-Check

Marcel-Wunschliste fuer MEGA¹⁶:
- Mode B in 2 weitere Pages (akte + stellungnahme)
- Mode C voll: Word-Upload-UI + Backend + Mapping-UI + PDF-Gen
- Onboarding-Wizard mit Demo-Animation
- KI-Integration im Editor (Confidence-Hook + Autosuggest-Plugin + Fallback-Badge)

**Realistic-Capacity nach 12+ Sprints in einer Session:**
- Mode B Pattern-Reuse: machbar (Pattern aus W35 existiert)
- Word-Import-Backend mit mammoth: machbar via CDN
- Word-Import-UI Minimal: machbar (List + Upload + Delete)
- Onboarding-Wizard: 1 grosses Modal mit Animationen — Token-heavy
- KI-Editor-Integration: TipTap-Plugin-API-Tiefe — Token-heavy

**Decision:** PRIMARY 4 Tiers + Final, STRETCH/ULTIMATE bewusst NICHT versprochen.

---

## 2. PRIMARY (sicher schaffbar)

### W43: Mode B in akte.html
- §6 Fachurteil-Section mit Mode-Resolver
- ProvaEditor-Integration analog briefvorlagen.html (W35)
- Toggle textarea/Editor je nach User-Setting
- Auto-Save in beiden Modi (Defense gegen Datenverlust)

### W44: Mode B in stellungnahme.html
- Pattern aus W35 + W43 wiederverwenden
- KI-Stellungnahme-Sektion mit Editor-Option

### W45: Word-Import Backend `/netlify/functions/parse-docx.js`
- mammoth.js fuer .docx → HTML (npm-Package OR CDN)
- Variablen-Detection: `\$Variable` + `\{\{Variable\}\}` Regex
- Speichern in Supabase-Tabelle `user_vorlagen`
- File-Size-Limit 10MB, .docx-only

### W46: Word-Import-UI Minimal in einstellungen.html
- Upload-Button + Drag-Zone (Mode C Section)
- Vorlagen-Liste mit Delete
- Detected-Variables-Preview
- Mapping-UI minimal (text-input pro Variable)

### W47: Final-Report

---

## 3. NICHT geliefert in MEGA¹⁶ (ehrlich → MEGA¹⁷)

### Onboarding-Wizard
**Begruendung:** Modal mit 3 Mode-Cards + Demo-Animations + Tour ist eigenes grosses Thema. Marcel kann mit Settings-UI manuell waehlen.

### KI-Integration im Editor
**Begruendung:** TipTap-Plugin-API ist nicht trivial (ProseMirror-Plugin-System). ProvaConfidence + ProvaAutosuggest als TipTap-Extensions zu schreiben braucht 1-2 Sprint-Tiefe.

**Workaround heute:** ProvaConfidence + KI-Fallback-Badge sind im **Mode A** schon live (nach KI-Aufruf). User in Mode B kann KI-Funktion aus Toolbar triggern.

### Mode-C-Mapping-UI komplett
**Begruendung:** Pflicht-Felder-Validation + Bidirektionales Mapping-UI ist Komplex (Drag-and-Drop fuer Mapping). MVP heute: Text-Input pro Variable mit dropdown.

---

## 4. Token-Capacity-Estimate

| Task | Aufwand | Cumulative |
|---|---:|---:|
| W43 Mode B akte | ~8k | 8k |
| W44 Mode B stellungnahme | ~6k | 14k |
| W45 parse-docx Backend | ~12k | 26k |
| W46 Word-Import-UI | ~10k | 36k |
| W47 Final-Report | ~6k | 42k |

**Total: ~42k Tokens.** Realistisches Restbudget gegeben.

---

## 5. Database-Schema-Erweiterung (PLANNED)

`user_workflow_settings.mode_c_vorlagen_ids` (UUID[]) existiert bereits seit Migration 07.

**NEU benoetigt:** Tabelle `user_vorlagen`:

```sql
CREATE TABLE IF NOT EXISTS user_vorlagen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  source_filename TEXT,
  file_size       INTEGER,
  parsed_html     TEXT NOT NULL,
  variables       TEXT[],              -- erkannte Platzhalter
  variable_mapping JSONB,              -- {variable_name: prova_field}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_vorlagen_user ON user_vorlagen(user_id);
ALTER TABLE user_vorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_vorlagen_self ON user_vorlagen
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

→ Wird in `db/PLANNED-user_vorlagen.sql` und `supabase-migrations/08_user_vorlagen.sql` erstellt.

---

## 6. Anti-Patterns vermeiden

❌ **mammoth.js bundlen** — CDN via esm.sh oder unpkg (CLAUDE.md Vanilla)
❌ **Word-Macros ausfuehren** — mammoth ignoriert XML-Logic, nur HTML-Output
❌ **Variablen-Erkennung zu strict** — sowohl `$Var` als auch `{{Var}}` akzeptieren
❌ **File-Upload ohne Size-Limit** — 10MB max + magic-bytes-check
❌ **Mode-C ohne Mode-A-Fallback** — wenn Vorlage broken, fall back zu Mode A

---

## 7. Erwartete Quality-Metrics

- **Tests:** 932 → 980+ (~50 neue)
- **LOC neu:** ~1500
- **Mode-B-Pages live:** 1 → 3 (briefvorlagen + akte + stellungnahme)
- **Mode C MVP:** funktional (Upload + List + Delete + Variable-Detection)
- **Pattern-Copy:** 0

---

*Plan-Stand 2026-05-07/08. Start: W43 (Mode B in akte.html).*
