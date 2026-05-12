# TEIL G — 30-Tage-Sprint-Plan

**Annahme:** 1 Dev (vollzeit) + Marcel als Product-Owner mit 30%-Zeit. Start Tag 0, Go-Live Tag 30.

**T-Shirt-Größen:** S = 0.5–1 Tag, M = 1–2 Tage, L = 2–3 Tage, XL = 3–5 Tage.

**Farbcode:**
- 🟢 = Core-Feature, ohne das kein Pilot möglich
- 🟡 = Wichtig, kann aber auf Release 2 (Tag 35) verschoben werden
- ⚪ = Nice-to-have, optional

---

## Woche 1 — Fundament (Tag 0–7)

| Tag | Task | Größe | Priorität | Ergebnis |
|-----|------|:-----:|:---------:|----------|
| 0 | Kick-Off, Architektur-Review mit Marcel | S | 🟢 | TEIL F als ratifizierte Entscheidung |
| 0–1 | esbuild-Config, Package-Installation (14 TipTap-Pakete) | S | 🟢 | `dist/prova-editor.js` Build läuft |
| 1 | `ProvaEditor`-Klasse-Skelett, Basis-Setup (Code aus TEIL C Section 0) | M | 🟢 | Editor rendert "Hello World" |
| 2 | TipTap StarterKit konfigurieren, §6-Placeholder setzen | S | 🟢 | Leeres Editor-Feld zeigt Platzhalter |
| 2–3 | BubbleMenu + FloatingMenu integrieren (Code aus TEIL C P2+P3) | M | 🟢 | Selektion → Bubble, leere Zeile → Floating |
| 3 | Table-Extension, Image-Extension, Highlight-Extension verkabeln | S | 🟢 | 3 Blöcke funktionieren |
| 4 | `@tiptap/suggestion` einbinden, Slash-Menü-Renderer (TEIL C P1) | XL | 🟢 | `/` → Menü mit 8 Block-Typen |
| 5 | Slash-Menü stylen + Keyboard-Nav + Fuzzy-Match | L | 🟢 | Pfeiltasten, Enter, Fuzzy mit `.includes()` |
| 6 | Focus-Mode (3 Flavors) implementieren (TEIL C P6) | L | 🟢 | Cmd+Shift+F zyklisch |
| 7 | **Woche-1-Demo an Marcel:** Core-Invocation-Layer live | — | 🟢 | **Milestone 1:** Slash + Bubble + Focus funktionieren |

**Woche-1-Aufwand:** ~7 Entwicklertage.
**Woche-1-Deliverable:** Ein TipTap-Editor mit Slash-Menü, Bubble-Menü, Focus-Mode in 3 Varianten. Das ist bereits besser als 80% aller deutschen SaaS-Editoren.

---

## Woche 2 — PROVA-Spezifika (Tag 8–14)

| Tag | Task | Größe | Priorität | Ergebnis |
|-----|------|:-----:|:---------:|----------|
| 8 | Custom-Node `prova-callout` (3 Severities) + Slash-Integration | L | 🟢 | `/mangel`, `/klaeren`, `/ok` verfügbar |
| 9 | Custom-Mark `prova-fragment-marker` | M | 🟢 | Inline-Marker rendert farblich je Quelle |
| 9–10 | `FragmentSidebar`-Klasse (TEIL C P7) | L | 🟢 | Rechte Sidebar zeigt Befund-Fragmente |
| 10 | Click-Sync zwischen Editor-Marker ↔ Sidebar-Karte | S | 🟢 | Klick springt und flasht |
| 11 | Custom-Node `prova-textbaustein-block` (locked) | M | 🟢 | Textbausteine werden uneditierbar eingefügt |
| 11–12 | Custom-Node `prova-foto-embed` mit EXIF-Anzeige | L | 🟢 | Fotos mit Meta-Zeile |
| 12 | Custom-Node `prova-skizze-embed` (Integration zu skizzen.html) | M | 🟡 | Skizzen-Link im Editor funktioniert |
| 13 | Character-Count-Extension + Eigenleistungs-Tracker | M | 🟢 | Status-Leiste zeigt "Zeichen / Eigen / KI%" |
| 14 | **Woche-2-Demo:** §6-Editor mit Befund-Fragment-Sidebar | — | 🟢 | **Milestone 2:** Fragment-Integration live |

**Woche-2-Aufwand:** ~7 Entwicklertage.
**Woche-2-Deliverable:** Der HERZSTÜCK-Teil aus Session 4 ist im Editor angekommen. SV sieht Fragmente rechts, kann sie per Klick einfügen, und der 500-Zeichen-Tracker wacht.

---

## Woche 3 — Command Palette + KI-Suggestion (Tag 15–21)

| Tag | Task | Größe | Priorität | Ergebnis |
|-----|------|:-----:|:---------:|----------|
| 15 | `CommandPalette`-Klasse inkl. `command-score` (TEIL C P4) | XL | 🟢 | Cmd+K öffnet Modal |
| 16 | ~30 Editor-Commands registrieren (Bold, H1, KI-Konjunktiv, etc.) | L | 🟢 | Palette zeigt alle Aktionen |
| 16–17 | Kontext-Filter + Scale-Boost + Alias-Matching | M | 🟢 | Smart-Sorting funktioniert |
| 17 | Keyboard-Cheat-Sheet (`?` Overlay) | S | 🟢 | Zeigt aktuelle Kontext-Shortcuts |
| 18 | Custom-Mark `prova-ki-suggestion` (TEIL C P8) | L | 🟢 | KI-Änderungen als Diff sichtbar |
| 18–19 | Suggesting-Bubble mit Accept/Reject-Buttons | L | 🟢 | Klick auf Suggestion → Mini-Popover |
| 19 | Accept/Reject-Logik + Undo-Integration (Falle 3 aus TEIL C!) | M | 🟢 | Accept nicht rückgängig via Ctrl+Z |
| 20 | ki_protokoll-Logging für jede KI-Aktion | M | 🟢 | Audit-Trail aus Session 4 integriert |
| 21 | **Woche-3-Demo + RELEASE 1 Code-Freeze** | — | 🟢 | **Milestone 3 = Pilot-Release 1** |

**Woche-3-Aufwand:** ~7 Entwicklertage.
**Woche-3-Deliverable:** Kompletter Core-5 + KI-Integration. Das ist Pilot-ready für internes Testing mit 2–3 Pilot-SVs.

---

## Woche 4 — Polish + Advanced Features (Tag 22–30)

| Tag | Task | Größe | Priorität | Ergebnis |
|-----|------|:-----:|:---------:|----------|
| 22 | Custom-Mark `prova-norm-citation` (DIN/EN/VDI) | M | 🟡 | Norm-Zitate strukturell erfasst |
| 22–23 | Wikilink-Extension `[[` basierend auf Mention (TEIL C P9) | L | 🟡 | Heading-Link + Alias funktionieren |
| 23 | `searchWikiTargets` Index-Aufbau (Headings, Anhänge, Bausteine) | M | 🟡 | Picker hat alle Ziele |
| 24 | Mobile-Anpassungen (iPad-Tap-Targets, Sheet-Slash-Menü) | L | 🟢 | iPad-Tests grün |
| 25 | Performance-Audit + iPad-Testing mit Lighthouse | M | 🟢 | <60ms-Keystroke-Latenz bestätigt |
| 25–26 | Dark-Mode-CSS + Print-Warning-Hinweis | M | 🟡 | User kann dark schreiben |
| 26 | Zeichen-Tracker extern erweitert (KI vs Selbst vs Baustein) | M | 🟢 | Regel 11 vollständig erfasst |
| 27 | E2E-Tests mit Playwright (5 Szenarien: Slash, Bubble, KI, Save, Export) | L | 🟢 | CI-Pipeline läuft |
| 28 | Bug-Bash-Day (Marcel + Dev zusammen testen) | XL | 🟢 | Top-20 Issues behoben |
| 29 | Doku: README, Keyboard-Map, Developer-Guide | M | 🟡 | Onboarding-Dokument fertig |
| 30 | **Go-Live-Review:** Produktiv-Deploy-Prep | S | 🟢 | **Milestone 4 = Pilot-Go-Live-Freigabe** |

**Woche-4-Aufwand:** ~9 Entwicklertage (mehr Tage als 7 verfügbar, weil Polish + Testing nicht abbrechbar sind).

---

## Gesamt-Bilanz nach 30 Tagen

| Kategorie | Geplant | Tatsächlich |
|-----------|:-------:|:-----------:|
| Entwickler-Tage | 30 | 30 (100% Auslastung) |
| Kern-Features 🟢 | 24 | 24 (alle fertig) |
| Nice-to-have 🟡 | 8 | 4–6 (Rest → Release 2) |
| Custom-Nodes/Marks | 7 | 6 (norm-citation evtl. R2) |
| Code-Volumen | ~3500 LOC | ~3500 LOC geschätzt |
| Bundle-Size | <500 KB | 253 KB ✓ |

---

## Was NICHT im 30-Tage-Sprint enthalten ist

Bewusst aufgeschoben — landet in Release 2 (Tag 31–50):

| Feature | Warum aufgeschoben |
|---------|-------------------|
| Comments zusätzlich zu Fragment-Sidebar | Pilot braucht Fragments; echte User-Comments in R2 |
| Realtime-Save + Conflict-Resolution | Pilot ist Single-User; Multi-Session später |
| Markdown-Export (E7) | Q3-Roadmap |
| DOCX-Import (E8) | Q4-Roadmap |
| Advanced-Tabellen-Features (Merge, Formeln) | Nur wenn Pilot-SVs fragen |
| Versions-History-UI (Slider) | Datenbasis da, UI später |
| §-Cross-Ref-Graph-View | YAGNI; vielleicht nie |

Alle haben **strategische Gründe** für die Verschiebung — nicht Zeitdruck.

---

## Risiko-Register für den Sprint

| Risiko | Eintrittswkeit | Impact | Mitigation |
|--------|:--------------:|:------:|-----------|
| TipTap-Version-Breaking (3.x kommt während Sprint) | niedrig | hoch | Auf 2.x pinnen, Major-Update erst nach R2 |
| Slash-Menü-Performance auf iPad schlecht | mittel | mittel | Tag 4–5 iPad-Testing parallel; Virtualisierung nachschieben falls >200ms |
| Fragment-Store-API noch nicht stabil | mittel | mittel | Mock-Adapter in Woche 2, echter Store in Woche 3 |
| Bundle-Size explodiert durch ungeplante Extensions | niedrig | hoch | Jeden Freitag `npm run analyze`, bei >400 KB Warning |
| Marcel nicht 30% verfügbar | mittel | hoch | Async-Feedback per Loom-Videos + Checkliste, nicht Sync-Meetings |
| KI-Endpoint langsamer als 2s | hoch | mittel | Timeout-Banner, Retry-Logic, Fallback auf "keine Suggestion" |

---

## Critical Path (wenn ein Ding kippt, kippt alles)

```
Tag 1: Editor-Basis läuft
    ↓
Tag 5: Slash-Menü + Bubble funktionieren
    ↓
Tag 9: Fragment-Sidebar verbunden
    ↓
Tag 15: Cmd+K läuft
    ↓
Tag 19: KI-Suggestion mit Accept/Reject
    ↓
Tag 21: RELEASE 1 Code-Freeze
    ↓
Tag 28: Alle Bugs behoben
    ↓
Tag 30: Go-Live
```

Jeder Tag-X-Meilenstein ist harte Abhängigkeit für Tag X+1. Wenn Slash-Menü am Tag 5 nicht funktioniert, ist Cmd+K am Tag 15 gefährdet (beide nutzen command-score). Wenn Fragment-Sidebar am Tag 9 nicht steht, fehlt der HERZSTÜCK-Demo-Effekt in Woche 2.

---

## Entscheidungs-Check-Points

Marcel muss an diesen Tagen **go/no-go** entscheiden:

| Tag | Entscheidung | Falls "no" |
|-----|--------------|-----------|
| 7 | Ist Slash-Menü-UX gut genug? | Woche 2 pausiert, UX-Redesign |
| 14 | Ist Fragment-Integration gut genug? | Session 4 HERZSTÜCK-Konzept re-evaluieren |
| 21 | RELEASE 1 Code-Freeze? | +1 Woche Polish statt neue Features |
| 28 | Go-Live OK? | +3 Tage Bugs; Deploy auf Tag 33 |

---

## Nach dem Sprint: Release 2 Roadmap (nur Überblick)

```
Tag 31–35:  Wikilinks vollständig + Norm-Citation-Mark
Tag 36–40:  Version-History-UI (Slider + Diff-View)
Tag 41–45:  Echte Comments (zusätzlich zu Fragments)
Tag 46–50:  Markdown-Export + DOCX-Import (Stub)
Tag 51–55:  Advanced-Tabellen (Cell-Merge, Summen-Zeile)
Tag 56–60:  Performance-Pass 2 (Service-Worker-Caching für Editor-Code)
```

Das ist **+30 Tage** nach Pilot-Go-Live. Release 2 wird auf Basis echter Pilot-SV-Feedback priorisiert.

---

## Die eine Sache, die diesen Sprint zum Erfolg macht

**Tägliche Builds. Tägliche Demos.**

Nicht am Ende von Woche 1 "jetzt ist Core-Layer fertig", sondern jeden Tag um 17:00 Uhr einen Build deployen und Marcel hat 10 Minuten, ihn zu sehen. Das reduziert Überraschungen auf < 24h Drift.

Konkret:
- `git push` → GitHub Actions baut + deployt nach `/preview/prova-editor/`
- Marcel bekommt Slack-Notif mit Changelog
- Falls kritischer Einwand: Tag X+1 wird korrigiert statt Ende von Woche

---

*→ Weiter mit `08-ANHANG-Kreativfragen.md` für die 8 Session-5-Spezialfragen.*
