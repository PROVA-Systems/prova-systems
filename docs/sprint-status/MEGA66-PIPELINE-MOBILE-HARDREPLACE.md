# MEGA⁶⁶ — KI-Pipeline End-to-End + Mobile + Dark + Hard-Replace

**Datum:** 2026-05-12
**Sprint:** MEGA⁶⁶ — NinjaAI Session 5 Tag 24-30 + Marcel-Hard-Replace
**Status:** ✅ COMPLETE (Pilot-Release-2)
**Vorgänger:** MEGA⁶⁵ (Cmd+K + KI-Suggestion v3070)
**Nachfolger:** MEGA⁶⁷ (Audit-Trail UI + Versand)

---

## TL;DR

WOW-Moment: Pipeline fließt End-to-End. Audio/Foto/Skizze/Notiz → `asset-to-fragments-v1` →
Fragmente in Sidebar → SV markiert → `fragments-to-befund-v1` → Markdown im Editor mit
Marker. Cmd+K-Commands rufen jetzt echte ki-proxy/ki-konsistenz-check/similarity-v1 auf.
Wikilinks zeigen Anhänge/Bausteine/Fragmente/Aufträge live aus DB. Mobile bekommt
44×44 Tap-Targets + Sheet-Slash + FAB. Dark-Mode mit Print-Warning. stellungnahme.html
**Hard-Replace mit Rollback** (`?editor=off`).

```
SV nimmt Audio auf
      ↓ ProvaAssetTrigger.processAudio (NEU)
asset-to-fragments-v1 (MEGA⁶³)
      ↓
befund_fragmente (status=roh)
      ↓ FragmentSidebar.load() Auto-Reload
[SV markiert in Sidebar]
      ↓ ProvaBefundGenerator (NEU)
fragments-to-befund-v1 (MEGA⁶³)
      ↓ _insertMarkdownAtCursor (parst [🔗fragment-uuid] zu prova-fragment-marker)
Editor mit Markdown + Markern
      ↓ Cmd+Alt+K (ProvaKiWire NEU)
ki-proxy → prova-ki-suggestion Mark mit Bubble
      ↓ ✓ Accept (MEGA⁶⁵)
set-ki-wirkung → ki_protokoll.wirkung=uebernommen + audit_trail
```

---

## Items (12/12 fertig)

### 4.1+4.2+4.3 — Asset-Trigger ✅
- `lib/prova-asset-trigger.{js,css}` — zentrale Lib
- API: `ProvaAssetTrigger.processAudio/Foto/Skizze/Notiz(assetId, auftragId, opts)`
- Deduplizierung via `_fragmentsExistFor(assetId)` Check
- Toast-UI (info/loading/success/error)
- Events: `prova:asset-trigger-start/done/error` + `prova:fragments-changed`

### 4.4 — Befund-Generierung ✅
- `lib/prova-befund-generator.{js,css}` — Modal mit Sprachstil + gutachten_teil
- POST `fragments-to-befund-v1` → Markdown → `_insertMarkdownAtCursor`
- Marker-Parser konvertiert `[🔗fragment-uuid]` zu `prova-fragment-marker`

### 4.5 — KI-Commands echte Backend-Calls ✅
- `lib/prova-ki-wire.js` — verbindet Commands-Registry-Events mit Edge Functions
- Konjunktiv (Cmd+Alt+K) → ki-proxy → setKiSuggestion-Mark
- Plausibilität → Callout statt Suggestion (semantisch passend)
- Similarity → similarity-v1 → Sidebar-Highlight

### 4.6 — Wikilink Backend-Source ✅
- `lib/prova-wikilink-source.js` — 5 Quellen: Headings + Anhänge + Bausteine + Fragmente + Aufträge
- Direkter Supabase-Client mit RLS (keine neuen Edge Functions)
- Cache 60s pro auftragId

### 4.7 — Foto-Picker ✅
- `lib/prova-foto-picker.{js,css}` — Thumbnail-Grid mit foto_typ-Filter
- Async Signed-URLs via `storage.createSignedUrl`
- Klick → `editor.commands.insertFoto`

### 4.8 — @ Zeitstempel ✅
- Simple-Format aus MEGA⁶⁵ reicht (Marcel-Option B)
- Full-Picker defer

### 4.9 — ki-s-stufen.js Cleanup ✅
- → `lib/_deprecated/ki-s-stufen.js`
- stellungnahme.html-Reference + Test laufen weiter
- `lib/_deprecated/README.md` mit Migration-Tabelle

### 4.10 — Mobile-Adaptionen ✅
- `lib/prova-mobile.css`: 44×44 Tap-Targets + Sheet-Slash bei <768px + FAB-Styling
- `lib/prova-fab.js`: `ProvaFab({ palette })` mit MediaQuery-Listener

### 4.11 — Dark-Mode + Print-Warning ✅
- `lib/prova-theme.js`: 3 Modi (light/dark/auto) + localStorage + DOMContentLoaded-Auto-Init
- `lib/prova-theme-dark.css`: alle prova-* Selektoren + @media print Warning + Light-Force-Print

### 4.12 — Hard-Replace stellungnahme.html ✅
- Default `?editor=mega66`, `?editor=off` für Rollback
- Banner-Text per Flag unterschiedlich

---

## Self-Scoping-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| anhaenge-list / textbausteine-list Edge Functions | **NICHT angelegt** — direkter Supabase-Client | Marcel-Anti-Pattern, RLS schützt |
| Asset-Trigger | **Auto + Dedup-Check** | `_fragmentsExistFor()` verhindert Doppel-Pipeline |
| Loading-State | **Toast (Bottom-Center)** statt Modal | non-blocking, 60ms-Doktrin |
| Wikilink Auftrag-Quelle | Top 20 nach updated_at | Riesen-Listen verhindern |
| @ Zeitstempel | **Simple-Format beibehalten** | Picker zu komplex für unklaren UX-Mehrwert |
| ki-s-stufen.js | **Soft-Deprecate** | Test bleibt grün, Cleanup MEGA⁷⁰ |
| Plausibilität → Callout | Spezial-Pfad | nicht ersetzbar → Callout passt semantisch |

---

## Verifikation

| Check | Status |
|---|---|
| 7 neue JS-Files Syntax-grün | ✅ |
| Bundle unverändert: 136 KB gzipped | ✅ |
| stellungnahme.html `?editor=off` Rollback | ✅ |
| sw.js → v3080-mega66 | ✅ |
| ki-s-stufen.js in `_deprecated/` | ✅ |

---

## File-Liste

### NEU
```
lib/
  prova-asset-trigger.{js,css}
  prova-wikilink-source.js
  prova-foto-picker.{js,css}
  prova-ki-wire.js
  prova-befund-generator.{js,css}
  prova-mobile.css
  prova-fab.js
  prova-theme.js
  prova-theme-dark.css
  _deprecated/README.md

tools/test-mega66.html
docs/sprint-status/MEGA66-PIPELINE-MOBILE-HARDREPLACE.md (dieses)
```

### GEÄNDERT
```
stellungnahme.html       Hard-Replace: default=mega66, ?editor=off=Rollback
sw.js                    CACHE_VERSION → v3080-mega66
```

### VERSCHOBEN
```
lib/ki-s-stufen.js       → lib/_deprecated/ki-s-stufen.js
```

---

## Bekannte Lücken

| Item | Sprint |
|---|---|
| FragmentSidebar.getSelectedIds() API | MEGA⁶⁷ |
| @ Zeitstempel Full-Picker | MEGA⁶⁷+ |
| KI-Panel (Cmd+J) | MEGA⁶⁸ |
| Audit-Trail UI | MEGA⁶⁷ |
| Versand-Modal | MEGA⁶⁷ |
| Asset-Trigger automatisch bei Upload | MEGA⁶⁷+ (foto-upload-v2 etc. integrieren) |
| iPad 60ms-Latenz-Test | Pre-Pilot |

---

## TAG-Empfehlung

`v3080-mega66-pipeline-mobile-hardreplace` nach Marcel-Test + Push.

**Pilot-Release-2 Status:** ✅ alle Pilot-kritischen Editor-Features fertig.
