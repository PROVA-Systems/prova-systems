# MEGA⁶⁵ — Cmd+K + KI-Suggestion + Wikilinks + Norm-Citation + Cheat-Sheet

**Datum:** 2026-05-12
**Sprint:** MEGA⁶⁵ — NinjaAI Session 5 Tag 15-23 compressed
**Status:** ✅ COMPLETE (Frontend + 1 neue Edge Fn)
**Vorgänger:** MEGA⁶⁴ (Editor-Fundament v3060)
**Nachfolger:** MEGA⁶⁶ (KI-Pipeline-Integration + Mobile)

---

## TL;DR

Pilot-Release-1 Code-Freeze. ProvaCommandPalette mit ~30 Actions (Linear-Stil), KI-Diff-View
mit Accept/Reject-Bubble, Wikilinks (`[[`), Norm-Picker (DIN/EN/VDI in `normen_bibliothek`),
Cheat-Sheet (`?`) und @HH:MM Zeitstempel-Refs. **Slash bleibt für Content, Cmd+K für Actions.**

```
INVOCATION-LAYER (MEGA⁶⁴):    Slash (Content) · Bubble · Floating · Focus
                                          +
INVOCATION-LAYER (MEGA⁶⁵):    Cmd+K (Actions) · ? Cheat-Sheet · [[ Wikilink · @ Timestamp
                                          +
MARKS (MEGA⁶⁵):               prova-ki-suggestion · prova-norm-citation
                                          ↓
BACKEND:                      set-ki-wirkung Edge Function (LIVE)
```

---

## Bundle-Strategie

**+ 2 npm-Pakete + ~2 KB gzipped Zuwachs.**

- `@tiptap/extension-mention@2.27.2` — Suggestion-API für Wikilinks
- `command-score@0.1.x` — Linear's Fuzzy-Score-Algorithmus für Command-Palette
- Bundle: 426 KB raw / **136 KB gzipped** (von 134 KB) — Budget 350 KB, **61 % unter Budget**

Build via `npm run build:editor`.

---

## Items (10/10 fertig)

### 3.1 — Bundle-Erweiterung ✅
- `scripts/editor-bundle-entry.js`: + Mention + commandScore + `prova-editor.js` Mapping
- `lib/editor-tiptap-bundle.js` neu gebundelt

### 3.2 — ProvaCommandPalette ✅
- `lib/prova-command-palette.{js,css}` — NEUE Klasse, KEIN Refactor von `cmd-k-modal.js`
- Self-Scoping Marcel-Decision-Punkt:
  - `cmd-k-modal.js` bleibt als globaler Cross-Type-Search (Akten/Kontakte/Termine), nicht angerührt
  - Neue Palette ist editor-Context-aware, aktiv nur wenn `document.body.dataset.provaEditorMega65 === '1'`
- API: `new ProvaCommandPalette({ editor, getContext })` + `register(cmds[])` + `show/hide/toggle/search()`
- Recent-Tracking via `localStorage.prova_cmdpalette_recent`
- `command-score` für Fuzzy-Match, Boosts: +0.5 most-recent, +0.2 weitere recent, +0.3 section-match, +0.2 alias-exact
- Keyboard: ↑↓ navigieren, Enter aktivieren, Esc schließen, Click-outside schließt

### 3.3 — Commands-Registry ✅
- `lib/prova-commands-registry.js` — `ProvaCommandsRegistry.build({ editor, openCheatSheet, … })` liefert ~30 Commands
- **5 Kategorien (genau 31 Commands):**

| Kategorie | Anzahl | Beispiele |
|---|---|---|
| Navigation | 6 | `nav.sachverhalt` (§2), `nav.befund` (§5), `nav.fachurteil` (§6), `nav.zusammenfassung` (§7), `nav.anhang`, `nav.cockpit` |
| KI-Aktionen | 8 | `ki.konjunktiv` (⌘⌥K), `ki.norm-verweis` (⌘⌥V), `ki.norm-zitat` (⌘⌥N), `ki.panel` (⌘J), `ki.plausibilitaet`, `ki.similarity`, `ki.fragments-to-befund`, `ki.discard-all` |
| Editor | 14 | Bold/Italic/Underline + H1/H2/H3 + List/Ordered + Quote/HR + Fragment-Marker + Norm + Foto + Tabelle + Focus-Mode |
| Export & Versand | 4 | Save (⌘S), PDF, DOCX, Versand |
| System | 3 | Cheat-Sheet, Auto-Save, Statistik |

Score-Booster: recent (+0.5/+0.2), section-match (+0.3), alias-exact (+0.2).

### 3.4 — prova-ki-suggestion Mark ✅
- `lib/extensions/prova-ki-suggestion.{js,css}` — Inline-Mark mit 8 Attributen
- Attribute exakt nach NinjaAI Custom-Nodes-Spec Extension 6: suggestionId, type (insert/delete/replace), original, newText, providerHash (SHA256, KEIN Klarname!), confidence (0-1), kiProtokollId, createdAt
- Inline-Diff-CSS:
  - `replace`: gelber BG + dashed underline
  - `insert`: grüner BG
  - `delete`: roter BG + line-through
- **Accept/Reject-Bubble** via Floating-UI:
  - 2 Buttons mit Tastatur-Hint (↩ / esc)
  - Confidence-Badge
  - providerHash (gekürzt auf 16 Zeichen, kein Klarname)
- Commands: `setKiSuggestion(attrs)`, `unsetKiSuggestion()`, `acceptKiSuggestionAt(pos)`, `rejectKiSuggestionAt(pos)`
- Accept: ProseMirror-Transaction ersetzt original durch newText + entfernt Mark + ruft async `set-ki-wirkung` (uebernommen)
- Reject: entfernt Mark, Text bleibt original + ruft async `set-ki-wirkung` (verworfen)

### 3.5 — set-ki-wirkung Edge Function ✅ DEPLOYED
- `supabase/functions/set-ki-wirkung/index.ts` v1 ACTIVE
- Input: `{ ki_protokoll_id, wirkung: 'uebernommen'|'verworfen'|'bearbeitet' }`
- Auth: JWT (verify_jwt=true) — Smoke-Test ohne Bearer: **401 ✓**
- RLS-Loaded-Row vor Update (Schutz vor Cross-Workspace-Manipulation)
- Trigger `update_ki_wirkung_timestamp` aus MEGA⁶² setzt `wirkung_set_at` + `wirkung_set_by` automatisch
- audit_trail-Eintrag bei `uebernommen`/`bearbeitet` (kategorie=`ki_einsatz`, source=`sv_uebernommen`)

### 3.6 — Cheat-Sheet ✅
- `lib/prova-cheat-sheet.{js,css}` — 4-Spalten-Modal
- Trigger: `?` außerhalb Editor (mit `_inEditableContext()`-Guard für Inputs/ProseMirror) + via Command-Palette
- Sections: Global (4) · Editor (10) · KI-Aktionen (6) · Navigation (9) = **29 Shortcuts**
- Plattform-aware via `ProvaPlatform.fmt()`
- Footer zeigt Plattform-Name (macOS/Windows/Linux)

### 3.7 — Wikilinks ✅
- `lib/extensions/prova-wikilink.{js,css}` — `Mention.configure({ char: '[[' })`-Extension
- 5 Target-Typen (vorbereitet, Vollverkabelung mit Anhängen/Bausteinen/Aufträgen in MEGA⁶⁶):
  - `heading` 📌 (default-Source liefert Headings via Editor-State-Traversal)
  - `anhang` 📎, `baustein` 📦, `fragment` 🎤, `auftrag` 📁 (via `opts.searchSources` injectable)
  - `norm` 📐 als Bonus-Typ
- Suggestion-Render: eigenes Vanilla-Popup mit ↑↓/Enter/Esc-Keyboard
- Klick auf Wikilink → `CustomEvent('prova:wikilink-clicked')` mit targetType/Id/Label

### 3.8 — prova-norm-citation + Norm-Picker ✅
- `lib/extensions/prova-norm-citation.{js,css}` — Inline-Mark `<cite class="prova-norm">`
- Attribute: norm, absatz, jahr, quellenLink
- Display: DIN 18533-1:2017-07, Abschnitt 5.2.3 (DIN-1505-konform)
- **`ProvaNormPicker.open(editor)`** — Modal mit Live-Search gegen `normen_bibliothek`-Tabelle
- Initial-Load sortiert nach `nutzungs_count` + `haeufigkeit` (top 20)
- Such-Logik: `ilike` auf `norm_nr` + `titel`, `aktiv=true`-Filter
- Trigger: Cmd+Alt+N + Command-Palette "Norm-Zitat suchen" + Slash `/norm` möglich (Hook vorhanden)

### 3.9 — @ Zeitstempel-Referenz ✅
- `lib/prova-timestamp-ref.js` — Self-Scoping Marcel-Option B (Simple-Format)
- InputRule: `@HH:MM` Pattern → Substitution durch `prova-fragment-marker` mit `quelle='diktat'` + `fragmentId=audio-ts:<audio_id>:<start_ms>`
- `audio_id` aus `window.PROVA_EDITOR_CONTEXT.audio_id` (Frontend-Kontext)
- Klick auf Timestamp-Marker → `CustomEvent('prova:audio-seek')` mit `{ audio_id, start_ms }`
- Full-Picker mit Audio-Liste defer auf MEGA⁶⁶

### 3.10 — Integration + Test-Page ✅
- `stellungnahme.html`: Feature-Flag `?editor=mega65` lädt MEGA⁶⁴ Bundle + MEGA⁶⁵ Module
- `?editor=mega64` bleibt parallel funktionsfähig
- Body-Marker `data-prova-editor-mega65="1"` aktiviert Cmd+K-Capture in der neuen Palette (cmd-k-modal.js bleibt für globale Pages)
- `tools/test-mega65.html`: Demo-Page mit allen 10 Items + KI-Stub-Button
- `sw.js` CACHE_VERSION: `prova-v3060-mega64` → **`prova-v3070-mega65-cmdk-suggestion-wikilinks`**

---

## Self-Scoping-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| **cmd-k-modal.js** | NICHT angetastet, neue Lib `prova-command-palette.js` parallel | Marcel-Option B aus Sprint-Prompt: existing Lib ist Cross-Type-Search, neue Palette ist Action-Palette — unterschiedliche Use-Cases, gleicher Shortcut wird über body-Marker disambiguiert |
| **command-score** | Standard-NPM (3 KB) statt eigene Implementation | Marcel-Empfehlung im Sprint-Prompt; Linear-getestetes Pattern |
| **mousetrap** | NICHT installiert | Native `keydown`-Listener reichen für Cmd+K + Cmd+Alt+X-Shortcuts; Mousetrap wäre +4 KB ohne klaren Mehrwert |
| **Recent-Tracking** | localStorage (`prova_cmdpalette_recent`) | Marcel-Option im Sprint; Supabase-profiles wäre Round-Trip + RLS-Komplexität für unkritische UX-Daten |
| **Wikilink-Sources** | Default-Source liefert nur Headings; Anhänge/Bausteine/Fragmente/Aufträge via `opts.searchSources` Injection | Vollverkabelung mit Backend-Fetches in MEGA⁶⁶ — Skelett steht, Frontend kann custom sources jetzt schon liefern |
| **KI-Suggestion Diff-Styling** | durchgestrichener Original + grüner New (Bubble) statt Inline-Tooltip | NinjaAI-Spec exakt umgesetzt (Extension 6 visuelle Spec) |
| **Norm-Picker UI** | Modal mit Live-Search (statt Inline-Dropdown) | normen_bibliothek hat 20+ Felder; Modal-Layout zeigt mehr Kontext (Badge + Titel + Untertitel + Jahr) |
| **@ Zeitstempel** | Option B Simple-Format (`@HH:MM` → Marker via InputRule) | MEGA⁶⁵ liefert Trigger + CustomEvent; Audio-Player-Lightbox + Picker-UI defer MEGA⁶⁶ |
| **Migration in stellungnahme.html** | Feature-Flag ?editor=mega65, kein Hard-Replace | Pilot-Risiko-Minimierung wie MEGA⁶⁴; Hard-Replace defer MEGA⁶⁶ |

---

## Verifikation (live)

| Check | Status |
|---|---|
| Bundle gebaut | ✅ 426 KB raw / **136 KB gzipped** |
| Bundle < 350 KB gzipped | ✅ 61 % unter Budget |
| `set-ki-wirkung` Edge Function deployed v1 ACTIVE | ✅ |
| Smoke-Test `set-ki-wirkung` ohne Bearer = 401 | ✅ |
| 7 neue JS-Files Syntax-grün (`node --check`) | ✅ |
| stellungnahme.html Feature-Flag `?editor=mega65` | ✅ |
| `tools/test-mega65.html` Demo-Page | ✅ |

---

## Marcel-Test (15 Min)

```
1. F12 → SW Unregister, Reload → sw.js zeigt v3070-mega65
2. /tools/test-mega65.html öffnen

3. Cmd+K testen:
   - Cmd+K (Mac) / Ctrl+K (Win) öffnet Palette
   - Tippe "konj" → "Konjunktiv-Vorschlag holen" oben mit Boost
   - ↓ ↑ Enter funktioniert
   - Esc schließt

4. Cheat-Sheet:
   - ? Taste (außerhalb Editor) öffnet 4-Spalten-Modal
   - Spalten: Global / Editor / KI / Navigation
   - Shortcuts plattform-aware (⌘ Mac vs Ctrl Win)
   - Esc schließt

5. KI-Suggestion-Stub:
   - Klick "↪ KI-Suggestion-Stub einfügen" Button
   - Gelber Mark "könnte feucht sein" erscheint im Editor
   - Klick darauf → Accept/Reject-Bubble mit Diff-View
   - ✓ Accept: Text bleibt, Mark weg
   - ✗ Reject: Text bleibt, Mark weg
   - Echte API kommt MEGA⁶⁶ (KI-Pipeline)

6. Wikilinks:
   - Tippe "[[ §6" → Picker mit Heading "§6 Fachurteil"
   - Enter wählt aus → Wikilink erscheint
   - Klick auf Wikilink → CustomEvent 'prova:wikilink-clicked' (DevTools Console)

7. Norm-Picker:
   - Cmd+Alt+N → Modal öffnet
   - Tippe "DIN 18" → normen_bibliothek wird durchsucht
   - Enter fügt cite.prova-norm in Editor ein

8. @ Zeitstempel:
   - Tippe "@14:32" + Space → Pattern wird zu prova-fragment-marker (cyan/diktat)
   - Klick auf Marker → CustomEvent 'prova:audio-seek'

9. stellungnahme.html?editor=mega65:
   - Banner: "MEGA⁶⁵ Editor aktiv"
   - Cmd+K funktioniert im Editor-Context
```

---

## Bekannte Lücken / TODOs für MEGA⁶⁶+

| Item | Sprint | Begründung |
|---|---|---|
| KI-Suggestion echte API-Calls (ki-proxy/konjunktiv etc.) | MEGA⁶⁶ | Backend-Trigger-Layer "prova:ki-suggestion-request" Event ist da, Frontend-Listener mit ki-proxy-Aufruf folgt |
| Wikilink-Quellen für Anhang/Baustein/Fragment/Auftrag | MEGA⁶⁶ | `opts.searchSources` Injection-Point da, Backend-Fetches fehlen |
| @ Zeitstempel Full-Picker mit Audio-Liste | MEGA⁶⁶ | Simple-Format MEGA⁶⁵, Picker MEGA⁶⁶ |
| KI-Panel (Cmd+J) | MEGA⁶⁶ | Sidepanel mit KI-Optionen für Absatz |
| Hard-Replace stellungnahme.html | MEGA⁶⁶ | Nach Pilot-Smoke-Test |
| iPad-Latenz-Test, 60ms-Doktrin | Pre-Pilot | Marcel Hardware-Test |
| Foto-Picker | MEGA⁶⁶ | aktuell alert(), `lib/foto-upload-v2.js` integrieren |
| Versand-Modal | MEGA⁶⁷ | Stufe 1/2/3 |

---

## File-Liste

### NEU
```
lib/
  prova-command-palette.{js,css}        ProvaCommandPalette-Klasse
  prova-commands-registry.js            ~31 Commands in 5 Kategorien
  prova-cheat-sheet.{js,css}            ? = Tastenkürzel-Modal
  prova-timestamp-ref.js                @HH:MM → fragment-marker

lib/extensions/
  prova-ki-suggestion.{js,css}          Inline-Mark + Accept/Reject-Bubble
  prova-wikilink.{js,css}               [[ Mention-Extension-Wrapper
  prova-norm-citation.{js,css}          DIN/EN/VDI-Mark + Picker

supabase/functions/set-ki-wirkung/index.ts   Edge Function v1 ACTIVE

tools/test-mega65.html
docs/sprint-status/MEGA65-CMDK-KISUGGESTION-WIKILINKS.md (dieses)
```

### GEÄNDERT
```
scripts/editor-bundle-entry.js        + Mention + commandScore Exports
lib/editor-tiptap-bundle.js           rebuilt (426 KB / 136 KB gzipped)
lib/prova-editor.js                   + Mention + commandScore Mapping
package.json                          + @tiptap/extension-mention + command-score
stellungnahme.html                    Feature-Flag erweitert für ?editor=mega65
sw.js                                 CACHE_VERSION → v3070-mega65
```

### IN SUPABASE
```
Edge Function: set-ki-wirkung v1 ACTIVE
```

---

## Sicherheit + Compliance

- **DSGVO** ✓ Bundle lokal, kein CDN
- **§407a-Beweis** ✓ ki_protokoll.wirkung wird via set-ki-wirkung gesetzt (uebernommen/verworfen/bearbeitet)
- **EU AI Act Art. 50** ✓ providerHash (SHA256, kein Klarname) in prova-ki-suggestion sichtbar
- **Vanilla-JS** ✓ kein React/Vue eingeführt
- **Plattform-Awareness** ✓ ProvaPlatform.fmt() überall genutzt
- **verify_jwt=true** ✓ set-ki-wirkung gibt 401 ohne Bearer
- **60ms-Doktrin** vorbereitet (Bundle klein, Vanilla, kein Sync-LLM-Call im Input-Loop)

---

## Acceptance

| Kriterium | Status |
|---|---|
| 10 Items geliefert | ✅ |
| Bundle < 350 KB gzipped | ✅ 136 KB |
| ~30 Commands (eigentlich 31) | ✅ |
| set-ki-wirkung Edge deployed | ✅ |
| 7 neue JS-Files Syntax-grün | ✅ |
| stellungnahme.html Feature-Flag | ✅ |
| Test-Page tools/test-mega65.html | ✅ |
| sw.js v3070-mega65 | ✅ |
| Sprint-Doku (dieses) | ✅ |
| iPad-Test / 60ms-Latenz | ⏳ Marcel-Test |

---

## TAG-Empfehlung

`v3070-mega65-cmdk-suggestion-wikilinks` nach Marcel-Test + Push.

---

*Ende MEGA⁶⁵ — Pilot-Release-1 Code-Freeze · bereit für MEGA⁶⁶ (KI-Pipeline-Wiring + Mobile).*
