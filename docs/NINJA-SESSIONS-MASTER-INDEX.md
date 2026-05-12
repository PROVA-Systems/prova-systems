# NinjaAI Sessions Master-Index — PROVA Architektur-Referenz

**Datum:** 2026-05-12  
**Zweck:** Konsolidierte Quick-Reference für alle CC-Sessions, Sprints und Marcel-Entscheidungen.  
**Status:** AUTHORITATIVE. Wird vor jedem CC-Sprint gelesen (Pflicht-Lesen-Block).

---

## ⚡ Schnell-Navigation für CC

| Wenn der Sprint thematisch ... | Lies vor allem ... |
|---|---|
| Backend / Pipeline / Asset-Fusion | `session4/04-TEIL-B-Thema3-HERZSTUECK-Asset-Fusion.md` |
| Audit-Trail / §407a-Beweis | `session4/03-TEIL-B-Thema2-Audit-Trail.md` |
| KI-Hilfen / RDG-Grenze | `session4/02-TEIL-B-Thema1-KI-maximal-helfen.md` |
| §6-Editor / Werkzeuge im Editor | `session4/05-TEIL-B-Thema4-Paragraph6-Werkzeuge.md` |
| Versand / Export-Strategie | `session4/07-TEIL-B-Thema6-Versand.md` |
| TipTap-Setup / Bundle-Konfig | `session5/03-TEIL-C-TipTap-Implementation.md` |
| Editor-Architektur / Layout | `session5/06-TEIL-F-PROVA-Editor-Architektur.md` |
| Slash-Menu / Bubble / Cmd+K | `session5/03-TEIL-C-TipTap-Implementation.md` + `session5/08-ANHANG-Kreativfragen.md` |
| Custom-Nodes (Callout, Fragment, etc.) | `session5/09-ANHANG-Custom-Nodes-Spec.md` |
| Pilot-Risiken | `session4/11-TEIL-E-Pilot-Risiko.md` |
| Sprint-Reihenfolge | `session4/12-TEIL-F-Implementierungs-Reihenfolge.md` + `session5/07-TEIL-G-30-Tage-Sprint.md` |

---

## 🧬 Session 4 — Architektur-Sparring (Befund-Fragmente)

### Das 3-Ebenen-Modell (HERZSTÜCK)

```
EBENE 1: Assets (Rohmaterial)
         Diktate · Fotos · Skizzen · Notizen
         ↓ KI-Extraktion (asset-to-fragments-v1, Pipeline pro Asset-Typ)
EBENE 2: BEFUND-FRAGMENTE (atomare Beobachtungen + Provenance) ← NEU
         Tabelle befund_fragmente · quelle_asset_id · quelle_startzeit_ms
         ↓ SV-Kuratierung (status=roh→gepruft) + KI-Strukturierung
EBENE 3: Befund-Entwurf (Markdown mit Marker [🔗fragment-uuid])
         Edge Function fragments-to-befund-v1
         ↓ SV-Redaktion + KI-Assistenz (Bubble-Menu / Slash / Cmd+K)
EBENE 4: Gutachten (SV-eigenverantwortlich, finaler Text)
         documents.content_json (TipTap ProseMirror-JSON, 1:1 persistiert)
```

### Warum Ebene 2 existenziell ist
- **Token-Ökonomie:** 1,5 Mio → 50k Tokens → ~0,20 €/Auftrag statt 40-80 €/Auftrag
- **§407a-Beweiskette:** jedes Fragment hat `quelle_asset_id` + `quelle_startzeit_ms` → klickbar zurück zum Audio/Foto
- **Kuratierung:** SV kann verwerfen/zusammenführen/retaggen → behält Hoheit
- **Cross-Reference:** pgvector findet ähnliche Fragmente in alten Aufträgen

### Juristische Basis — LG Darmstadt 10.11.2025 (Az. 19 O 527/16)
SV bekam Honorar auf 0 € wegen verschleierter KI-Nutzung.
Wörtlich: *"Pauschale Mitteilung 'mit Hilfe einer KI erstellt' genügt nicht."*
→ Unser `ki_protokoll.wirkung` = exakter Schutz davor (Tracking je KI-Call).
→ MEGA⁶² + MEGA⁶³ haben das in Code umgesetzt.

### Die 5 Marcel-akzeptierten Ninja-Widersprüche (PERMANENT)
1. **IHK 5-Teile bleiben** (Verfeinerung gegen IHK Köln 4-Teile, IHK-Export-Mode optional)
2. **KEINE direkte beA/DATEV-Anbindung** (deren Spielfeld, wir bauen Export-Adapter ZIP)
3. **Befund-Fragmente unverzichtbar** (3 Ebenen, nicht 2)
4. **KEINE BGB/ZPO-Paragraphen-Vorschläge durch KI** (§407a-grenzwertig, RDG-Risiko)
   → stattdessen: Gerichtsurteils-Ähnlichkeits-Suche (über pgvector)
5. **Werkzeuge kontextsensitiv, nicht "alle erreichbar"**
   → Bubble-Menu + Slash + sichtbarer "+Einfügen"-Spiegel für 50+ Zielgruppe

### Pilot-relevante Risiken (Top 3 aus TEIL-E)
- **§407a-Verletzung wird bekannt** → Onboarding + Audit-Trail + Legal-Hotline
- **Daten-Leak** → PITR + RLS-Audit + Pseudonymisierung
- **KI-Halluzination** → Substring-Check + 3 Vision-Varianten + KI-Warnung
  bei ungewöhnlichen Werten

### Sprint-Reihenfolge nach Ninja (TEIL-F)
```
Phase 0 (Wo 1-2):  Fundament → MEGA⁶² ✅ FERTIG
Phase 1 (Wo 3-10): HERZSTÜCK + Audit + §6-Editor + Versand Stufe 1
                   - Block A Backend → MEGA⁶³ ✅ FERTIG
                   - Block B Audit-UI → MEGA⁶⁷ (geplant)
                   - Block C Editor → MEGA⁶⁴+⁶⁵+⁶⁶ (laufend)
                   - Block D Versand → MEGA⁶⁸ (geplant)
Phase 2 (Q2 2026): Versand Stufe 2, Cmd+K, Mobile-Upload
Phase 3 (Q3 2026): Externe Dokumente, N8, beA-Export, IHK-Mode
Phase 4 (Q4/Q1):   Gegenüberstellung, Collab, Mobile-App

Pilot-Go-Live: ~10 Wochen mit 2 Devs (Ninja-Schätzung)
```

---

## 🎹 Session 5 — Editor-Pattern-Adoption

### Architektur-Prinzip (UNVERHANDELBAR)
> **Editor-State = Dokument.**
> TipTap-content_json wird 1:1 in `documents.content_json` gespeichert.
> KEINE Transformation, KEINE Zwischen-Schicht.
> Wiederherstellung: `editor.commands.setContent(docFromDB.content_json)`.

### Die 60-ms-Latenz-Doktrin
Jeder Keystroke <60 ms Latenz. Bubble-Menu-Updates und Focus-Mode-Transitions
DÜRFEN NICHT den Input-Loop blockieren. Wenn doch → falsch gebaut.

### Vanilla-JS-Bekenntnis
- KEIN React/Vue/Tailwind
- TipTap-Core ist framework-agnostisch
- Bubble/Floating/Slash-Menu = Vanilla-JS-Module die TipTap-Events konsumieren
- Bundle-Ziel: <350 KB gzipped

### Slash vs Cmd+K — Linears geniale Trennung
- `/` = **CONTENT-Invocation** ("was füge ich ein?")
  - nur Block-Typen, nur auf leeren Zeilen
  - 12 Items in 3 Gruppen
- `Cmd+K` = **ACTION-Invocation** ("was tue ich?") (kommt MEGA⁶⁵)
  - Navigation, KI-Aktionen, Export, Speichern
  - ~30 Commands

### Slash-Menu-Taxonomie (12 Items)
```
Gruppe A — Struktur (4):
  /h1, /h2, /h3, /divider

Gruppe B — Inhalt (5):
  /liste, /nummer, /zitat, /tabelle, /foto

Gruppe C — Prüf-Marker (3):
  /mangel (rot), /klaeren (gelb), /ok (grün)
```

### Die 7 PROVA-Custom-Nodes (Alleinstellungs-Merkmale!)
| Node/Mark | Typ | Zweck |
|---|---|---|
| `prova-callout` | Block | Prüf-Marker (Mangel/Klären/OK/Info) |
| `prova-textbaustein-block` | Block, locked | Eingefügte Textbausteine (unveränderlich) |
| `prova-foto-embed` | Block | Foto mit EXIF-Meta + GPS + Caption |
| `prova-skizze-embed` | Block | SVG-Embed (Integration zu skizzen.html) |
| `prova-fragment-marker` | Inline-Mark | Text aus befund_fragmente (klickbar) |
| `prova-ki-suggestion` | Inline-Mark | KI-Diff-View (Accept/Reject) |
| `prova-norm-citation` | Inline-Mark | DIN/EN/VDI strukturiert |

### Bundle-Spec (fest, gzipped)
```
@tiptap/core + pm + starter-kit       135 KB (3 Packages, Pflicht)
@tiptap/extension-{bubble,floating,…} 70 KB  (10 Extensions, Pflicht)
@tiptap/suggestion                    6 KB
@floating-ui/dom                      10 KB
command-score (für Cmd+K MEGA⁶⁵)      3 KB
mousetrap (für Cmd+K MEGA⁶⁵)          4 KB
Eigene Custom-Nodes (7 Stück)         30 KB
Eigene UI (Cmd+K, Focus, Diff)        35 KB
─────────────────────────────────────────────
TOTAL                                 ~267 KB (Budget 500 KB)
```

### Die 8 bewusst abgelehnten Patterns (DROPS)
| # | Pattern | Begründung |
|---|---|---|
| D1 | Nested Blocks | §407a-Risiko: PDF kollabiert → Gerichts-Suizid |
| D2 | Daily Notes | Wir sind Gutachten-Tool, kein Tagebuch |
| D3 | Realtime-Cursors | §407a verbietet mehrfache Autorenschaft |
| D4 | Emoji-Picker | Gutachten mit 🚨 ist peinlich (-15 KB) |
| D5 | Math/LaTeX | SVs brauchen Zahlen, keine Formeln (YAGNI) |
| D6 | Toggle/Collapsible | Print kennt kein "expanded" |
| D7 | Backlinks-Graph | Nice-to-have, kein Kunden-Problem |
| D8 | Templates-Marketplace | Wir haben Textbausteine |

### Keyboard-Doktrin
- Cmd+B/I/U: Starter-Kit
- Cmd+Alt+1/2/3: H1/H2/H3
- Cmd+Shift+8/7/9: Bullet/Numbered/Quote
- Cmd+Shift+F: Focus-Mode zyklisch (off → sentence → paragraph → typewriter)
- `/` am Zeilenanfang: Slash-Menu
- ⌘ auf Mac, Ctrl auf Win/Linux → **lib/prova-platform.js** nutzen!

### Killer-Feature: Character-Count mit Eigenleistungs-Tracker
```
Status-Leiste:
┌──────────────────────────────────────────────────────────────┐
│ Zeichen: 2847 · Eigenleistung: 2341 ✓ (Min: 500) · KI: 506 (18%) │
│ Qualitäts-Marker: Konjunktiv ✓ · §-Verweis ✓ · Norm-Zitat ✓     │
└──────────────────────────────────────────────────────────────┘
```
- Eigenleistung = Total − (Fragment-Marker + KI-Suggestion + Textbaustein)
- Visualisiert §407a-Beweiskette LIVE
- Min-Tracker 500 Zeichen als progressive Warnung

### NinjaAI-Widerspruch (1 von 1)
> "2-3 Wochen sind realistisch NUR für Core-5. Vollausbau = 5 Wochen."

- **Release 1 (Tag 21):** Core-5 + Basic-Wikilinks
- **Release 2 (Tag 35):** Comments + Suggesting + volle Custom-Nodes

**Marcel-Decision:** akzeptiert. 5 Wochen ehrlich > 3 Wochen mit Folge-Debt.

---

## 📋 Sprint-Tracking (Stand 2026-05-12)

### MEGA⁶² — Phase 0 Fundament ✅
- 7 Migrations applied (befund_fragmente, ki_protokoll.wirkung, anhaenge erweitert,
  shares, HNSW-Index, audit_trail.kategorie, security-fix)
- 4 Edge Functions deployed
- lib/prova-platform.js (⌘/Ctrl-Awareness)
- sw.js v3040

### MEGA⁶³ — HERZSTÜCK Backend ✅
- 2 Migrations (prompt_purpose +8, audio_dateien.word_timestamps)
- 4 _shared-Libs (pseudonymize, ki-protokoll, halluzinations-check, embedding)
- asset-to-fragments-v1 v2 FULL (4 Sub-Functions)
- fragments-to-befund-v1 v2 FULL (GROUP BY + gpt-5.5 + Halluzinations-Check)
- Kosten: ~0,20 € pro typischem Auftrag (Ziel ERREICHT)
- sw.js v3050

### MEGA⁶⁴ — Editor-Fundament (laufend)
- Ninja Session 5 Tag 0-14 compressed
- TipTap-Bundle + ProvaEditor + Slash + Bubble + Floating + Focus
- 5 Custom-Nodes (Callout, Fragment-Marker, Textbaustein, Foto, Skizze)
- Fragment-Sidebar + Click-Sync
- Character-Count mit Eigenleistungs-Tracker
- Ziel: sw.js v3060

### MEGA⁶⁵ — Cmd+K + KI-Suggestion (geplant)
- Ninja Session 5 Tag 15-21
- CommandPalette (Vanilla, command-score)
- prova-ki-suggestion Mark mit Accept/Reject
- Wikilinks `[[...]]` via @tiptap/extension-mention
- Ziel: Pilot-Release 1

---

## 🔑 ENV-Variables Reference (CC-kritisch!)

### Supabase Edge Function Secrets
> Setze im Supabase Dashboard → Settings → Edge Functions → Secrets

| Variable | Wofür | Status |
|---|---|---|
| `OPENAI_API_KEY` | text-embedding-3-small + gpt-5.5 | ✓ gesetzt (vorhanden) |
| `ANTHROPIC_API_KEY` | claude-sonnet-4-6 (Vision für Fotos) | ⚠ ggf. neu setzen |
| `SUPABASE_URL` | Edge-Runtime built-in | ✓ |
| `SUPABASE_ANON_KEY` | Edge-Runtime built-in | ✓ |

### Netlify ENV (für Netlify Functions, NICHT für Edge Functions)
| Variable | Wofür |
|---|---|
| `AIRTABLE_PAT/TOKEN` | Legacy (im Migration-Pfad) |
| `STRIPE_SECRET_KEY` | Stripe-Calls |
| `STRIPE_WEBHOOK_SECRET` | Webhook-Validation |
| `PDFMONKEY_API_KEY` | PDF-Generation |
| `MAKE_WEBHOOK_*` | Make.com-Scenarios |
| `RESEND_API_KEY` | System-Emails |

**Wichtig:** ANTHROPIC_API_KEY in Netlify hilft NICHT für Supabase Edge Functions!
CC's `asset-to-fragments-v1` liest aus Supabase-Env.

---

## 🚦 Marcel-Direktiven (PERMANENT)

1. **100%-Vision-Komplett** — wir bauen nicht für 1-3 Testpiloten, sondern Vision-fertig
2. **Recherche-Pflicht** — vor jeder fachlichen Aussage min. 10 Quellen (IHK, BVS, etc.)
3. **CC-Maximum-Scope** — MEGA-Sprints mit max Items, KEINE engen Code-Vorgaben
4. **STOP bei Unsicherheit** — Frage ist besser als Fehler
5. **Vanilla JS** — nicht verhandelbar
6. **Frankfurt EU** — alle KI-Calls, DSGVO-pflicht
7. **§407a** — KI nie für Rechtsanwendung, nur für Materialbereitstellung
8. **Pseudonymisierung VOR jedem KI-Call** — ohne Ausnahme
9. **ki_protokoll-INSERT bei JEDEM KI-Call** — §407a-Beweiskette
10. **KI-Provider-Namen nie im UI** — "KI-Assistent" statt "GPT"

---

## 📂 Verzeichnis-Struktur dieser Doku

```
docs/
├── NINJA-SESSIONS-MASTER-INDEX.md          ← DIESES File (Quick-Ref)
├── session4/                                ← Architektur-Sparring
│   ├── 00-README.md
│   ├── 01-TEIL-A-Recherche-Nachweis.md     (22 Quellen)
│   ├── 02-TEIL-B-Thema1-KI-maximal-helfen.md
│   ├── 03-TEIL-B-Thema2-Audit-Trail.md
│   ├── 04-TEIL-B-Thema3-HERZSTUECK-Asset-Fusion.md   ★ KERN
│   ├── 05-TEIL-B-Thema4-Paragraph6-Werkzeuge.md
│   ├── 06-TEIL-B-Thema5-IHK-Struktur-Inhaltsangabe.md
│   ├── 07-TEIL-B-Thema6-Versand.md
│   ├── 08-TEIL-B-Thema7-Externe-Dokumente.md
│   ├── 09-TEIL-C-Architektur-ASCII.md
│   ├── 10-TEIL-D-UI-Patterns-Wireframes.md
│   ├── 11-TEIL-E-Pilot-Risiko.md             ★ 15 Risiken
│   └── 12-TEIL-F-Implementierungs-Reihenfolge.md  ★ Roadmap
│
└── session5/                                ← Editor-Pattern-Adoption
    ├── 00-README.md
    ├── 01-TEIL-A-Editor-Analysen.md         (7 Apps tief)
    ├── 02-TEIL-B-Pattern-Matrix.md          (35 Patterns)
    ├── 03-TEIL-C-TipTap-Implementation.md   ★ Code-Skizzen
    ├── 04-TEIL-D-Entscheidungs-Matrix.md    (1:1/ADAPT/DROP)
    ├── 05-TEIL-E-Library-Empfehlungen.md    (Bundle)
    ├── 06-TEIL-F-PROVA-Editor-Architektur.md ★ BAUPLAN
    ├── 07-TEIL-G-30-Tage-Sprint.md          ★ Tag-für-Tag
    ├── 08-ANHANG-Kreativfragen.md           (8 Spezialfragen)
    └── 09-ANHANG-Custom-Nodes-Spec.md       ★ 7 Extensions
```

---

*Letzte Aktualisierung: 2026-05-12 nach MEGA⁶³ Backend-Delivery.*  
*Nächstes Update: nach MEGA⁶⁴ Editor-Fundament.*
