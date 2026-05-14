# PROVA Sprint 04f — Pre-Audit: Layout-Vereinheitlichung

**Stand:** 27.04.2026 · **Aufwand:** ~40 min Audit · **Status:** Read-only — kein Code geändert
**Bezug:** Marcel-Browser-Test 26.04. nach v180-ssicher-p5b-done — Layout-Inkonsistenzen über alle Auftragstyp-Pages

---

## Tabelle 1 — Patterns pro Page

| # | Page | Breadcrumb | Stepper | Topbar | H1-Format | Action-Footer | Layout-Vibe | Inline-CSS |
|---|---|---|---|---|---|---|---|---|
| 1 | `app.html` | CSS vorhanden, **kein Markup** | **5 Steps** (`.step` + `.step-circle` + `.step-connector`) | `<header class="topbar">` + 3× `topbar-btn` + ⚙ | `<h1 class="page-title">` | sticky `.page-actions` (Z. 1151) | Wizard mit Stepper | **27.8 KB** |
| 2 | `ergaenzung.html` | `PROVA › Ergänzungsgutachten` | nein | `<header class="topbar">` (nur Burger) | `<h1 style="…">🤔 …</h1>` | nein | Doku-Card-Form | 2.1 KB |
| 3 | `widerspruch-gutachten.html` | `PROVA › Gegengutachten / Erwiderung` | nein | `<header class="topbar">` (nur Burger) | **kein H1** | nein | Doku-Card-Form | 2.9 KB |
| 4 | `stellungnahme.html` | **keine** | `.flow-step` (custom) | **kein Topbar!** | **kein H1** | sticky Autosave-Bar + Normen-FAB | Editor mit Custom-Stepper | **35.5 KB** |
| 5 | `wertgutachten.html` | keine | `.wz-step` + `.wz-step-num` (eigene Klassen) | `<div class="topbar">` mit `📊 Wertgutachten` und **Flow-B-Label** | `<h1>📊 Wertgutachten</h1>` (kein class) | nein | Eigener WZ-Wizard | 6.6 KB |
| 6 | `beratung.html` | keine | nein | `<div class="topbar">` mit **`PROVA <span>· Beratung (Flow C)</span>`** | **kein H1** | nein | Notiz-Editor | 6.9 KB |
| 7 | `baubegleitung.html` | keine | nein | `<div class="topbar">` | **kein H1** | nein | Tab-Layout | 7.3 KB |
| 8 | `schiedsgutachten.html` | `PROVA › Schiedsgutachten` | nein | `<header class="topbar">` (nur Burger) | `<h1 style="…">⚖ …</h1>` | nein | Doku-Card-Form (kahl) | 2.1 KB |
| 9 | `schnelle-rechnung.html` | keine | nein | `<div class="topbar">` mit `.settings-link` ⚙ | `<h1 class="page-title">` | nein | Mini-Form | 2.9 KB |
| 10 | `briefvorlagen.html` | keine | nein | `<div class="topbar">` | **kein H1** | inline `.btn-row` | 3-Spalten-Editor | 9.3 KB |
| 11 | `akte.html` | CSS vorhanden, Markup unklar | nein | `<header class="topbar">` mit ⚙ + 3× `topbar-btn` | **kein H1** | nein | Akte-Detail | 15.3 KB |

**Notlandeplätze:**
- `app.html` ist die einzige Page mit deutlich definiertem **Stepper-Pattern** und **sticky-Action-Footer**. Sie ist die De-facto-Referenz für Auftragstyp-Wizards.
- `stellungnahme.html` ist mit 35.5 KB Inline-CSS der größte Sonderling. Praktisch eine eigene Mini-App.
- `schiedsgutachten.html` und `ergaenzung.html` und `widerspruch-gutachten.html` teilen `.doku-card`/`.doku-header`/`.doku-row`-Klassen (copy-paste, **identische Definitionen Zeile 39-52**) — diese drei sind layout-konsistent untereinander, aber weichen von app.html komplett ab.

---

## Tabelle 2 — Inkonsistenzen-Matrix

| Element | Variante 1 | Variante 2 | Variante 3 | Variante 4 | Empfehlung Sprint 04f |
|---|---|---|---|---|---|
| **Breadcrumb-Markup** | `PROVA › <strong>X</strong>` (3 Pages) | nur CSS, kein Markup (app.html, akte.html) | komplett fehlend (6 Pages) | — | **Standard:** `PROVA › <strong>X</strong>` auf allen Auftragstyp-Pages |
| **Topbar-Tag** | `<header class="topbar">` (5 Pages) | `<div class="topbar">` (5 Pages) | komplett fehlend (stellungnahme) | — | **Standard:** `<header class="topbar">` (semantisch korrekt) |
| **Topbar-Right Icons** | leer (4 Pages) | nur `settings-link` ⚙ (1 Page) | 3× `topbar-btn` (app, akte) | Glocke neu via prova-notifications.js | **Standard:** Glocke (auto-injected) + ⚙ Settings-Icon |
| **Stepper-CSS-System** | `.step` + `.step-circle` (app.html) | `.wz-step` (wertgutachten) | `.flow-step` (stellungnahme) | kein Stepper (alle anderen) | **Standard:** `.step` + `.step-circle` aus app.html (nur für Multi-Step-Flows nötig) |
| **H1-Format** | `<h1 class="page-title">` (2 Pages) | `<h1 style="…">` mit Emoji (3 Pages) | `<h1>X</h1>` ohne class (1 Page) | komplett fehlend (5 Pages) | **Standard:** `<h1 class="page-title">` ohne Emoji-Inline |
| **Action-Footer** | sticky `.page-actions` (app.html) | inline `.btn-row` (briefvorlagen) | sticky Autosave-Bar (stellungnahme) | komplett fehlend (8 Pages) | **Standard:** sticky `.page-actions` für Wizard-Flows |
| **Flow-Labels im UI** | sichtbar `(Flow C)` (beratung.html:129) | sichtbar `(Flow B …)` (wertgutachten.html:480 nur Comment) | — | nicht-sichtbar (alle anderen) | **Sofort weg** aus User-facing Text |
| **Inline-CSS-Volumen** | <3 KB (ergaenzung, schieds, schnelle-r.) | 6-10 KB (5 Pages) | 15-35 KB (akte, app, stellungnahme) | — | **Ziel:** alle <5 KB durch zentrale `page-template.css` |

---

## Tabelle 3 — To-Do-Liste für Sprint 04f

| # | Page | Was muss ändern | Aufwand | Block |
|---|---|---|---|---|
| 1 | **alle 11 Pages** | Breadcrumb-Snippet einheitlich `PROVA › <strong>X</strong>` | 1.5 h | A |
| 2 | **wertgutachten.html, beratung.html** | Flow-B/C-Labels aus User-facing Text raus | 15 min | A |
| 3 | **stellungnahme.html** | Topbar hinzufügen (mind. Burger + Breadcrumb + Glocke-Slot) | 30 min | B |
| 4 | **akte.html, ergaenzung.html, widerspruch-, beratung, baubegleitung, briefvorlagen** | H1-Tag mit `class="page-title"` ergänzen wo fehlt | 30 min | A |
| 5 | **schiedsgutachten.html** | Layout aufwerten: Stepper-Pattern oder mind. 1 KB CSS-Polish (Header-Card, Hero-Section) — derzeit "kahler" als die anderen Doku-Card-Pages | 1 h | C |
| 6 | **app.html → page-template.css** | Stepper, page-actions-sticky, page-title-CSS extrahieren | 1.5 h | D |
| 7 | **alle 11 Pages → page-template.css** | Inline-Style-Blöcke entrümpeln, Common-Layout-CSS herausziehen | 2 h | D |
| 8 | **alle Pages mit `<div class="topbar">`** | auf `<header class="topbar">` umstellen | 30 min | A |
| 9 | **wertgutachten.html, beratung.html** | `<div class="topbar">` → `<header class="topbar">` und Topbar-Right standardisieren | 30 min | A |
| 10 | **schnelle-rechnung.html** | Topbar-Pattern angleichen (heute Solo `.settings-link`) | 15 min | A |
| 11 | **app.html, akte.html** | Topbar-Right-Icons hinterfragen — 3× `topbar-btn` muss konsolidiert werden mit Glocke | 30 min | A |
| 12 | **stellungnahme.html** | 35.5 KB inline CSS auf <10 KB reduzieren durch page-template.css | 2 h | D |

**Geschätzter Gesamt-Aufwand Sprint 04f:** **8-10 h** (verteilt auf 4 Blöcke A-D).

---

## Sichtbare "Flow A/B/C/D"-Texte im UI

Genau **2 sichtbare Treffer** im User-facing Text (alles andere sind nur Code-Kommentare):

| Page:Zeile | Wortlaut | Status |
|---|---|---|
| `beratung.html:129` | `<div class="topbar-title">PROVA <span>· Beratung (Flow C)</span></div>` | 🔴 Sichtbar im Topbar-Title |
| `wertgutachten.html:480` | `<!-- ─── RELEVANTE NORMEN (Flow B, Sprint 4) ─── -->` | 🟡 Nur HTML-Kommentar (nicht user-facing), aber sollte aufgeräumt werden |

Empfehlung: Beide entfernen, beratung.html-Topbar zu `PROVA › Beratung` (Standard-Breadcrumb).

---

## HTML-Pages mit eigenen `<style>`-Inline-Blöcken

Top 25 nach Größe (alle Auftragstyp-Pages):

```
41866  index.html
35452  stellungnahme.html        ← Sonderling
27786  app.html                  ← Referenz
24989  dashboard.html
22213  stellungnahme-v3.1.html   ← Legacy?
18802  kostenermittlung.html
18795  archiv.html
16959  ortstermin-modus.html
15651  kontakte.html
15491  termine.html
15301  akte.html                 ← Auftragstyp
13571  rechnungen.html
12760  jveg.html
9961   normen.html
9598   einstellungen.html
9303   briefvorlagen.html        ← Auftragstyp
7315   baubegleitung.html        ← Auftragstyp
6930   beratung.html             ← Auftragstyp
6625   wertgutachten.html        ← Auftragstyp
2904   schnelle-rechnung.html    ← Auftragstyp
2865   widerspruch-gutachten.html ← Auftragstyp
2084   ergaenzung.html           ← Auftragstyp
2084   schiedsgutachten.html     ← Auftragstyp
```

**Spitzenkandidaten für CSS-Extraktion in page-template.css:**
1. stellungnahme.html (35.5 KB)
2. app.html (27.8 KB)
3. akte.html (15.3 KB)

Wenn nur diese drei auf 5-7 KB pro Page reduziert werden, sparen wir ~50 KB initialen Page-Load × 3 Pages = ~150 KB Bytes-on-Wire.

---

## Vorschlag — `page-template.css`

Zentrale CSS-Datei für Layout-Skelett aller Auftragstyp-Pages:

```css
/* ──────────────────────────────────────────────────────
   page-template.css — Sprint 04f
   Layout-Skelett fuer alle Auftragstyp-Pages.
   Eingebunden NACH prova-design.css, VOR Page-spezifischer
   Inline-Style.
   Skope: nur Layout-Konstanten — keine Page-spezifischen
   Komponenten-Styles.
   ────────────────────────────────────────────────────── */

/* ─── 1. PAGE-TITLE (H1) ─── */
.page-title {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}
.page-subtitle {
  font-size: 13px;
  color: var(--text3);
  margin: 0 0 24px;
}

/* ─── 2. BREADCRUMB ─── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text3);
  margin-bottom: 8px;
  min-width: 0;
  overflow: hidden;
}
.breadcrumb strong {
  color: var(--text2);
  font-weight: 600;
}
.breadcrumb-sep {
  color: var(--text3);
  margin: 0 2px;
}

/* ─── 3. TOPBAR (semantic <header>) ─── */
header.topbar {
  height: 52px;
  min-height: 52px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.topbar-right { display: flex; align-items: center; gap: 6px; }

/* ─── 4. STEPPER (für Multi-Step-Wizards) ─── */
.steps {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding: 4px 0;
}
.step { display: flex; align-items: center; gap: 8px; }
.step-circle {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--surface2);
  color: var(--text3);
  transition: all 0.2s ease;
}
.step.active .step-circle {
  background: var(--accent);
  color: white;
}
.step.done .step-circle {
  background: var(--success);
  color: white;
}
.step-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text3);
  white-space: nowrap;
}
.step.active .step-label { color: var(--accent); font-weight: 600; }
.step.done .step-label { color: var(--success); }
.step-connector {
  width: 32px;
  height: 2px;
  background: var(--surface2);
}
.step.done + .step-connector { background: var(--success); }

/* ─── 5. ACTION-FOOTER (sticky) ─── */
.page-actions {
  position: sticky;
  bottom: 0;
  z-index: 50;
  background: var(--bg);
  padding: 14px 0;
  margin-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.page-actions-left {
  margin-right: auto;
  display: flex; align-items: center; gap: 8px;
}

/* ─── 6. PAGE-CONTENT-AREA ─── */
.page-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 28px 48px;
}
@media (max-width: 768px) {
  .page-content { padding: 16px 16px 96px; }
  header.topbar { padding: 0 16px; }
}
```

**Eingebunden in jede Auftragstyp-Page:**
```html
<link rel="stylesheet" href="prova-design.css">
<link rel="stylesheet" href="page-template.css">
<style>/* nur seiten-spezifische Polish-Regeln */</style>
```

---

## Empfehlung — Block-Aufteilung Sprint 04f

### Block A — Breadcrumb + Topbar + H1-Vereinheitlichung (3-4 h)
**Was:** Alle 11 Pages bekommen Breadcrumb-Markup, `<header class="topbar">`, `<h1 class="page-title">` (wo fehlt). Flow-Labels raus.
**Risiko:** niedrig — kein Funktions-Code, nur Layout-Markup.
**Sw.js:** v220 → v221.

### Block B — `page-template.css` einführen + auf 6 simple Pages anwenden (2-3 h)
**Was:** Neue CSS-Datei anlegen mit Skelett (siehe oben). Auf ergaenzung, schiedsgutachten, schnelle-rechnung, widerspruch-gutachten, beratung, baubegleitung anwenden. Pro Page: Inline-CSS-Block reduzieren auf nur seiten-spezifische Polish.
**Risiko:** mittel — Visual-Diff pro Page nötig.
**Sw.js:** v221 → v222.

### Block C — Schwergewichte refactoren (3-4 h)
**Was:** `app.html`, `stellungnahme.html`, `akte.html`, `wertgutachten.html`, `briefvorlagen.html` auf `page-template.css` umstellen. Stellungnahme.html ist der Hauptaufwand (35.5 KB → ~10 KB Ziel).
**Risiko:** hoch — App-kritische Pages, Visual-Diff streng nötig.
**Sw.js:** v222 → v223 (oder pro Page einzeln).

### Block D — Schiedsgutachten Layout-Polish (1 h)
**Was:** Schiedsgutachten.html bekommt 1 KB CSS-Polish: Hero-Header-Card mit Icon + Subtitle, Doku-Cards mit `.section-card`-Pattern statt nur kahlem Border. Mind. visuelle Parität mit ergaenzung.html.
**Risiko:** niedrig.
**Sw.js:** v223 → v224.

### Block E — Tag + Verifikation (15 min)
**Was:** Marcel-Tour durch alle 11 Pages. Tag `v180-ssicher-p5f-done`.

---

## Notizen / offene Fragen

- **Ist `stellungnahme-v3.1.html` legacy oder aktiv?** — 22.2 KB Inline-CSS vermutet alter Stand. Sprint 04f sollte das aufräumen oder löschen.
- **`app.html` Stepper hat 5 Steps; soll der für andere Auftragstypen (Beratung, Wertgutachten, Baubegleitung) auch passen oder wirklich custom?** — Aktuell hat jede Auftragstyp eine eigene Step-Logik. Vereinheitlichung wäre teurer (~ +2 h) als die aktuelle Audit-Schätzung.
- **Mobile-Bottom-Nav (akte.html Z. 86):** existiert nur in akte.html. Konsistenz mit prova-bottom-nav (mobile.css) wäre wünschenswert — aber separater Sprint.
- **Glocken-Slot:** Sprint 04b X1 hat bereits `.prova-notif-slot` als Standard etabliert. Pages ohne Topbar (stellungnahme.html) bekommen über prova-notifications.js auto-Fallback fixed top-right.

---

**Audit fertig.** Marcel reviewt → gemeinsame Sprint-Planung.
