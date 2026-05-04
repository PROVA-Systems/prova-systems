# PROVA Triple-Mode-Workflow-Architecture

**Datum:** 2026-05-06
**Sprint:** MEGA¹⁴ W28 (Foundation, Implementation kommt MEGA¹⁵+¹⁶)
**Status:** Architektur-Foundation — KEIN Editor/Word-Code

---

## 1. Vision

PROVA bietet 3 Workflow-Modes fuer SV-Gutachten-Erstellung:

| Mode | Bezeichnung | Beschreibung | Pilot-Phase |
|---|---|---|---|
| **A** | 🚀 PROVA-Standard | Strukturierte Templates (existing) | ✅ Foundation |
| **B** | ✏️ PROVA+Editor | TipTap-WYSIWYG, Word-frei | MEGA¹⁵ |
| **C** | 📁 Eigene Vorlagen | Word-Upload + Liquid-Mapping | MEGA¹⁶ |

---

## 2. UX-Pattern: Hybrid Default + Override

**Zentrale Insight:** Default-Mode in Settings, Override pro Akte.

```
┌─────────────────────────────────────────────────────────┐
│ User-Onboarding                                          │
│   "Wie schreibst du Gutachten am liebsten?"              │
│   [○] Mode A (vorgegebene Templates ausfuellen)          │
│   [○] Mode B (frei tippen wie in Word)                   │
│   [○] Mode C (eigene Vorlagen hochladen)                 │
│                                                          │
│ → gespeichert in user_workflow_settings.default_mode     │
└─────────────────────────────────────────────────────────┘

  Pro neue Akte:
  ┌──────────────────────────────────┐
  │ Akte SCH-2026-XYZ                 │
  │   Workflow: [Mode A ▼]            │
  │              ✅ Mode A (Standard) │
  │              ⚪ Mode B            │
  │              ⚪ Mode C            │
  │                                   │
  │ → akte.workflow_mode_override     │
  └──────────────────────────────────┘
```

**Falls Override leer:** Mode = User-Default.

---

## 3. Daten-Modell

### user_workflow_settings (NEU — MEGA¹⁵-Pflicht)

```sql
CREATE TABLE IF NOT EXISTS user_workflow_settings (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_mode         VARCHAR(8) NOT NULL CHECK (default_mode IN ('A','B','C')),
  default_mode_set_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Mode-spezifische Preferences
  mode_a_template_pref  TEXT,          -- z.B. 'F-09-KURZGUTACHTEN'
  mode_b_editor_config  JSONB,         -- TipTap-Toolbar-Settings
  mode_c_vorlagen_ids   UUID[],        -- Refs auf eigene Vorlagen
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uws_user ON user_workflow_settings(user_id);
```

### auftraege.workflow_mode_override (Spalte ergaenzen)

```sql
ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS workflow_mode_override VARCHAR(8) CHECK (workflow_mode_override IN ('A','B','C') OR workflow_mode_override IS NULL);
```

---

## 4. API-Design (Backend)

### `/netlify/functions/workflow-mode-resolve` (NEU — MEGA¹⁵)

```ts
// Input: { user_id, auftrag_id? }
// Output: { mode: 'A'|'B'|'C', source: 'override'|'default'|'fallback' }

GET /workflow-mode-resolve?auftrag_id=<uuid>
→ Wenn auftrag.workflow_mode_override → return override
→ Sonst: user_workflow_settings.default_mode
→ Fallback: 'A'
```

### `/netlify/functions/user-workflow-settings` (NEU — MEGA¹⁵)

```ts
GET   /user-workflow-settings              → current settings
PATCH /user-workflow-settings              → update default_mode + prefs
```

---

## 5. Frontend-Library (Skelett heute)

`lib/workflow-mode-router.js` — Skelett fuer Routing-Logic.

```js
ProvaWorkflowMode.resolve({ auftragOverride, userDefault })
   → 'A'|'B'|'C'

ProvaWorkflowMode.openForAuftrag(auftragId)
   → Lazy-loads Mode-spezifische UI:
       Mode A → existing Auftragstyp-Pages
       Mode B → editor.html (MEGA¹⁵)
       Mode C → vorlagen-picker.html (MEGA¹⁶)
```

---

## 6. Entscheidungs-Punkte fuer MEGA¹⁵+¹⁶

### MEGA¹⁵ (Mode B — TipTap-Editor)
- TipTap StarterKit + Tables-Extension + Image-Extension
- Liquid-zu-TipTap-Converter (existing Templates importieren)
- TipTap-zu-PDFMonkey-HTML-Output
- Auto-Save in Drafts (alle 5s)
- Konjunktiv-II-Pruefung in Editor (Inline-Highlights)
- Browser-Test-Pflicht: Marcel-Real-Test

### MEGA¹⁶ (Mode C — Word-Import)
- DOCX-Parser (mammoth.js oder server-side via libreoffice)
- Variablen-Detection: `{{kunde_name}}`-Pattern in Word → Liquid
- Mode-Switcher-UI (Settings + per-Akte-Dropdown)
- Vorlagen-Library pro User
- Validation: Pflichtfelder pro Vorlage

---

## 7. Migrations-Strategie (Wenn Modes B+C live)

### Bestandskunden
- Default-Mode = 'A' (existing-Behaviour bleibt)
- User koennen freiwillig zu 'B' oder 'C' wechseln

### Neue Pilot-Kunden
- Onboarding-Modal fragt Default-Mode nach 3 Akten
- Marketing-Material zeigt alle 3 Modes (Mode B als Killer-Feature)

---

## 8. Anti-Patterns vermeiden

❌ **Mode-Hard-Switching:** User-Daten bei Mode-Wechsel verlieren
   → Statt: pro Akte gespeicherter Mode + Konvertierung optional
   
❌ **Mode-Lock-In:** User kann nicht zu A zurueck nach B
   → Statt: Mode-Switch nur auf neue Akten, alte bleiben
   
❌ **Default-Vergessen:** User-Default-Setting versteckt
   → Statt: Settings → Workflow → Default sichtbar + erklaerend

---

## 9. Foundation-Files in MEGA¹⁴ W28 (HEUTE)

✅ `db/PLANNED-user_workflow_settings.sql` (Schema-Vorschlag)
✅ `lib/workflow-mode-router.js` (Skelett, Resolve-Logic)
✅ `docs/architecture/triple-mode-architecture.md` (diese Datei)
✅ `docs/architecture/mode-switcher-ux.md` (UX-Mockups)
✅ Tests fuer Mode-Resolve-Logic

❌ NICHT heute: TipTap-Code, DOCX-Parser, Mode-Switcher-UI

---

*Foundation done. MEGA¹⁵ implementiert Mode B (Editor), MEGA¹⁶ implementiert Mode C (Word) + Mode-Switcher.*
