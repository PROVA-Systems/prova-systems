# CLUSTER-REVIEW-AUTO — DEAD-CANDIDATE-Analyse

**Datum:** 2026-04-30
**Branch:** `audit/cluster-review-auto` (von `main`)
**Methodik:** Automatisierte 5-Punkt-Analyse je Page:
1. Rückwärts-Verlinkung in anderen `*.html` (excl. `briefe/`, `formulare/`, `legal/`, `tools/`, `docs/`, `node_modules/`, `playwright-report/`)
2. Erwähnung in `nav.js`
3. Erwähnung in anderen `*.js` (Root + `lib/`, excl. eigene `<page>-logic.js`)
4. Erwähnung in `supabase/` + `netlify/`
5. `git log -1` Last-Modified-Date + Eintrag in `sw.js` APP_SHELL

**Wichtiger Befund (Pre-Analyse-Kalibrierung):** Zwei JS-Files erzeugen **systematisches Rauschen** in den Counts und müssen interpretierend abgewertet werden:

- **`prova-layout.config.js`** — enthält **119 .html-Einträge** als Layout-Catalog. Praktisch jede Cluster-Page erscheint dort, ohne dass das aktive Nutzung bedeutet. → **als „weak ref" werten**.
- **`app-logic.js`** — enthält **zwei Registries**, die echte Runtime-Loads triggern:
  - **8 Wizard-Typen** (`vorlage-01` bis `vorlage-08`) als Auftragstyp-Switcher
  - **10 Brief-Template-Slots** (id: A-01, A-03, B-01, D-01, D-04, D-06, E-06, G-01, G-01b, H-01, H-04) → laden via `ladeBriefTemplateHtml(file)`
  - → **als „strong ref / wizard-wired" werten** — Pages sind aktive Infrastruktur des Legacy-app.html-Wizards.

Damit verändert sich die Empfehlungs-Logik gegenüber der Spec — `app-logic.js`-Registry-Hits sind ein **Block-Signal für Delete**, kein „Logic-Ref"-Rauschen. Bis zur Migration des Schadensgutachten-Wizards (Cutover Tier A → app.html) bleiben diese Pages Infrastruktur.

---

## 📊 Empfehlungs-Schema (revidiert)

| Code | Bedeutung | Trigger |
|---|---|---|
| **DELETE** | Sicher löschbar | nur prova-layout.config.js-Catalog-Eintrag (weak), keine echten Refs |
| **DELETE-AFTER-WIZARD** | Löschen NACH app.html-Migration | app-logic.js-Registry-Eintrag (Brief- oder Vorlage-Slot) |
| **KEEP-DEPRECATE** | Nicht sofort löschen — durch neuere Page ersetzt | nav.js-Sidebar-Eintrag + Logic-Refs, aber Supabase-Variante existiert |
| **KEEP-ACTIVE** | In Produktion benutzt | nav.js + multiple Logic-Refs, kein Ersatz |
| **INVESTIGATE** | Unklare Lage | partielle Deprecation (z.B. nav.js drin, aber FAB auskommentiert) |

---

## 🔍 Cluster 1 — Brief-Doppel-Pages (28 + 2 aus Tier E)

| Page | nav.js | Echte Logic-Refs (außer config) | app-logic Registry | Empfehlung | Begründung |
|---|---|---|---|---|---|
| **abschlussbericht-versicherung** | 0 | app-logic.js | ✅ D-06 | **DELETE-AFTER-WIZARD** | Brief-Template-Slot in app.html-Wizard |
| **aktennotiz** | 0 | app-logic.js, fab.js | ✅ H-01 | **DELETE-AFTER-WIZARD** | + fab.js-Quick-Action „Aktennotiz" |
| **angebot-gutachten** | 0 | (nur config) | ❌ (Wizard nutzt `angebot-app.html`!) | **DELETE** | Anderer File-Name im Wizard — diese Page ist Doppel-Leiche |
| **auftragsbestaetigung** | 0 | app-logic.js, briefe-logic.js, lib/* | ✅ A-03 | **DELETE-AFTER-WIZARD** | Aktiv im Wizard + Brief-System |
| **beauftragungsbestaetigung-gericht** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag, kein realer Ref |
| **checkliste-brandschaden** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag (nur G-01 Wasser/Sturm sind drin) |
| **checkliste-sturmschaden** | 0 | app-logic.js | ✅ G-01b | **DELETE-AFTER-WIZARD** | Brief-Template-Slot |
| **checkliste-wasserschaden** | 0 | app-logic.js | ✅ G-01 | **DELETE-AFTER-WIZARD** | Brief-Template-Slot |
| **datenschutz-mandant** | 0 | app-logic.js | ✅ H-04 | **DELETE-AFTER-WIZARD** | DSGVO-Brief-Slot im Wizard |
| **deckungsanfrage** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **einladung-ortstermin-gericht** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **einladung-ortstermin** | 0 | app-logic.js | ✅ B-01 | **DELETE-AFTER-WIZARD** | Brief-Template-Slot |
| **einverstaendnis-dsgvo** | 0 | app-logic.js | ✅ E-06 | **DELETE-AFTER-WIZARD** | Brief-Template-Slot |
| **ergaenzungsfragen-antwort** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **erstbericht-versicherung** | 0 | app-logic.js | ✅ D-01 | **DELETE-AFTER-WIZARD** | Brief-Template-Slot |
| **fristverlaengerungsantrag** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **honorarvereinbarung** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **kostenrahmen-erhoehung** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **kostenvoranschlag-sanierung** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **kostenvorschuss-gericht** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **maengelanzeige** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **maengelruege** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **messprotokoll-feuchte** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **messprotokoll-risse** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **nachforderung-unterlagen** | 0 | app-logic.js | ✅ D-04 | **DELETE-AFTER-WIZARD** | Brief-Template-Slot |
| **ortstermin-arbeitsblatt** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **ortstermin-protokoll** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |
| **umladebrief-ortstermin** | 0 | (nur config) | ❌ | **DELETE** | Kein Registry-Eintrag |

**Aus Tier E (in CUTOVER-INVENTORY zusätzlich gelistet):**

| Page | nav.js | Echte Logic-Refs | Empfehlung | Begründung |
|---|---|---|---|---|
| **briefvorlagen** | ✅ 2 (Sidebar + FAB-Quick-Action `brief_standalone`) | akte-logic.js, app-logic.js, auto-save.js, **+ 11 weitere** | **KEEP-DEPRECATE** | 14 JS-Refs, aktiv in Sidebar + FAB. Replacement = `briefe.html` (live K-UI). Erst nach `briefe.html`-Cutover entlinken. **NICHT JETZT LÖSCHEN.** |
| **kontakte** | ✅ 3 (Sidebar + Quick-Search + Kontakt-Suche) | akte-logic.js, app-logic.js, auto-save.js, **+ 21 weitere** | **KEEP-DEPRECATE** | 24 JS-Refs (extreme Verbreitung), aktiv in vielen Workflows. Replacement = `kontakte-supabase.html` (live K-UI). Erst nach Cutover-Block-3 von Sidebar entlinken. **NICHT JETZT LÖSCHEN.** |

### Zwischenstand Cluster 1

- **DELETE sofort:** 18 Pages (alle, die KEIN Registry-Eintrag haben + kein nav.js + nur `prova-layout.config.js`)
- **DELETE-AFTER-WIZARD:** 10 Pages (Brief-Template-Slots im Legacy-app.html-Wizard — können NACH dessen Migration weg)
- **KEEP-DEPRECATE:** 2 Pages (briefvorlagen.html, kontakte.html — extrem verbreitet, brauchen Cutover-Sweep)

---

## 🔍 Cluster 2 — vorlage-NN-*.html (11 Files)

| Page | nav.js | Echte Logic-Refs | app-logic Wizard-Typ | Empfehlung |
|---|---|---|---|---|
| **vorlage-01-standard** | 0 | app-logic.js | ✅ `standard` | **DELETE-AFTER-WIZARD** |
| **vorlage-02-kurzgutachten** | 0 | app-logic.js | ✅ `kurzgutachten` | **DELETE-AFTER-WIZARD** |
| **vorlage-03-beweissicherung** | 0 | app-logic.js | ✅ `beweissicherung` | **DELETE-AFTER-WIZARD** |
| **vorlage-04-gerichtsgutachten** | 0 | app-logic.js | ✅ `gericht` (enterpriseOnly) | **DELETE-AFTER-WIZARD** |
| **vorlage-05-brandschaden** | 0 | app-logic.js | ✅ `brand` | **DELETE-AFTER-WIZARD** |
| **vorlage-06-feuchteschimmel** | 0 | app-logic.js | ✅ `feuchte` | **DELETE-AFTER-WIZARD** |
| **vorlage-07-elementarschaden** | 0 | app-logic.js | ✅ `elementar` | **DELETE-AFTER-WIZARD** |
| **vorlage-08-baumaengel** | 0 | app-logic.js | ✅ `baumaengel` | **DELETE-AFTER-WIZARD** |
| **vorlage-09-ergaenzungsgutachten** | 0 | auftragstyp.js | ❓ (kein Wizard-Typ in app-logic) | **INVESTIGATE** — auftragstyp.js-Ref klären |
| **vorlage-10-schiedsgutachten** | 0 | (nur config) | ❌ | **DELETE** |
| **vorlage-11-bauabnahmeprotokoll** | 0 | (nur config) | ❌ | **DELETE** |

**Anmerkung:** vorlage-NN sind über `<a href="vorlage-XX.html">…</a>` untereinander cross-verlinkt (bidirektional, "vorherige/nächste Vorlage"). Bei Bulk-Delete dieser Cluster werden auch die hrefs invalid — entweder Cluster zusammenhängend behandeln oder hrefs vorher entfernen.

### Zwischenstand Cluster 2

- **DELETE sofort:** 2 Pages (vorlage-10, vorlage-11 — keine Wizard-Typ-Wiring)
- **DELETE-AFTER-WIZARD:** 8 Pages (vorlage-01 bis vorlage-08)
- **INVESTIGATE:** 1 Page (vorlage-09 — auftragstyp.js-Ref klären)

---

## 🔍 Cluster 3 — Versions-Reste / RED Pages (11 Files)

| Page | nav.js | Echte Logic-Refs | Empfehlung | Begründung |
|---|---|---|---|---|
| **stellungnahme-v3.1** | 0 | (nur config) | **DELETE** | Reine Version-Leiche, keine echten Refs |
| **stellungnahme-gate** | 0 | (nur config) | **DELETE** | Pre-Editor-Gate Leiche, keine Refs |
| **mahnung** | 0 | briefe-logic.js, einstellungen-logic.js, honorar-tracker.js, + **13 weitere** | **KEEP-ACTIVE** | 16 JS-Refs (!) und 4 Server-Files (netlify/supabase). Wird AKTIV vom Mahn-Workflow genutzt. **NICHT LÖSCHEN.** |
| **mahnung-1** | 0 | briefe-logic.js, lib/* | **DELETE-AFTER-WIZARD** oder **INVESTIGATE** | 1 Server-Ref (vermutlich Edge-Function-Brief-Template). Briefe-System-Slot. Klären: ist das Mahnstufe-Template? |
| **mahnung-2** | 0 | briefe-logic.js, lib/* | **DELETE-AFTER-WIZARD** oder **INVESTIGATE** | wie mahnung-1 |
| **mahnung-3** | 0 | briefe-logic.js | **DELETE-AFTER-WIZARD** oder **INVESTIGATE** | wie mahnung-1 |
| **mahnwesen** | 0 (aber 1 href von mahnung.html) | auto-save.js, fab.js, mahnung-check.js, +1 | **INVESTIGATE** | 4 JS-Refs aktiv, mahnung-check.js ist neu klingend. Möglicherweise noch live Sub-View? |
| **effizienz** | 0 | (nur config) | **DELETE** | Zweck unklar, keine echten Refs, RED in CUTOVER |
| **schnelle-rechnung** | ✅ 2 (FAB-Quick-Action + Quick-Search) | fab.js | **INVESTIGATE** | nav.js-Hit ist kontradiktorisch zu CUTOVER-Tier-E-Annotation („im FAB schon auskommentiert"). Marcel: bewusst noch live? |
| **pdfmonkey-brief-template** | 0 | (nur config) | **DELETE** oder **VERSCHIEBEN** | Keine echten Refs. Falls PDFMonkey-Source: ggf. nach `docs/templates-source/` |
| **pdfmonkey-messprotokoll-template** | 0 | (nur config) | **DELETE** oder **VERSCHIEBEN** | wie pdfmonkey-brief-template |

### Zwischenstand Cluster 3

- **DELETE sofort:** 4 Pages (stellungnahme-v3.1, stellungnahme-gate, effizienz, beide pdfmonkey-templates → 5 wenn pdfmonkey gelöscht statt verschoben)
- **KEEP-ACTIVE:** 1 Page (mahnung.html — extreme Verbreitung in honorar-tracker etc)
- **INVESTIGATE:** 5 Pages (mahnung-1/2/3, mahnwesen, schnelle-rechnung)

---

## 📈 Gesamt-Empfehlung (52 Pages)

| Empfehlung | Anzahl | Pages |
|---|---:|---|
| **DELETE** sofort | **24** | s.u. ⬇️ |
| **DELETE-AFTER-WIZARD** (Block: app.html-Migration nötig) | **18** | s.u. ⬇️ |
| **KEEP-DEPRECATE** (Block: Cutover-Sweep nötig) | **2** | briefvorlagen, kontakte |
| **KEEP-ACTIVE** (NICHT löschen) | **1** | mahnung |
| **INVESTIGATE** (Marcel-Klärung) | **6** | vorlage-09, mahnung-1, mahnung-2, mahnung-3, mahnwesen, schnelle-rechnung |
| **TBD pdfmonkey-Strategie** | **1** | pdfmonkey-brief-template + pdfmonkey-messprotokoll-template (zählen 1× weil paarweise zu entscheiden) |

### DELETE — sofort (24 Pages)

```
abschlussbericht-versicherung.html  → korr.: DELETE-AFTER-WIZARD ⚠️
angebot-gutachten.html              ← DELETE (Wizard nutzt angebot-app.html)
beauftragungsbestaetigung-gericht.html
checkliste-brandschaden.html
deckungsanfrage.html
einladung-ortstermin-gericht.html
ergaenzungsfragen-antwort.html
fristverlaengerungsantrag.html
honorarvereinbarung.html
kostenrahmen-erhoehung.html
kostenvoranschlag-sanierung.html
kostenvorschuss-gericht.html
maengelanzeige.html
maengelruege.html
messprotokoll-feuchte.html
messprotokoll-risse.html
ortstermin-arbeitsblatt.html
ortstermin-protokoll.html
umladebrief-ortstermin.html
vorlage-10-schiedsgutachten.html
vorlage-11-bauabnahmeprotokoll.html
stellungnahme-v3.1.html
stellungnahme-gate.html
effizienz.html
pdfmonkey-brief-template.html       (oder VERSCHIEBEN)
pdfmonkey-messprotokoll-template.html (oder VERSCHIEBEN)
```

(Korrektur: `abschlussbericht-versicherung` aus dieser Liste raus — gehört in DELETE-AFTER-WIZARD-Block, weil app-logic.js D-06-Slot. Verbleiben **24 Pages**.)

### DELETE-AFTER-WIZARD — nach app.html-Cutover (18 Pages)

Voraussetzung: Schadensgutachten-Wizard (`app.html` + `app-logic.js`) ist auf neue Briefe-Infrastruktur (`briefe.html` + `briefe-logic.js`) migriert. Erst dann verschwinden die `ladeBriefTemplateHtml(file)`-Calls.

```
abschlussbericht-versicherung.html  (D-06)
auftragsbestaetigung.html           (A-03)
checkliste-sturmschaden.html        (G-01b)
checkliste-wasserschaden.html       (G-01)
datenschutz-mandant.html            (H-04)
einladung-ortstermin.html           (B-01)
einverstaendnis-dsgvo.html          (E-06)
erstbericht-versicherung.html       (D-01)
nachforderung-unterlagen.html       (D-04)
aktennotiz.html                     (H-01) + fab.js Quick-Action
vorlage-01-standard.html            (Wizard-Typ standard)
vorlage-02-kurzgutachten.html       (Wizard-Typ kurzgutachten)
vorlage-03-beweissicherung.html     (Wizard-Typ beweissicherung)
vorlage-04-gerichtsgutachten.html   (Wizard-Typ gericht, enterpriseOnly)
vorlage-05-brandschaden.html        (Wizard-Typ brand)
vorlage-06-feuchteschimmel.html     (Wizard-Typ feuchte)
vorlage-07-elementarschaden.html    (Wizard-Typ elementar)
vorlage-08-baumaengel.html          (Wizard-Typ baumaengel)
```

### KEEP-DEPRECATE — Cutover-Sweep nötig (2 Pages)

| Page | Aktive Refs | Cutover-Strategie |
|---|---|---|
| `briefvorlagen.html` | nav.js Sidebar + FAB-Quick-Action `brief_standalone` + 14 JS-Refs | (1) FAB-Quick-Action ändern auf `briefe.html?mode=schnellbrief`. (2) Sidebar-Eintrag entfernen. (3) Page als 301-Redirect auf `/briefe`. |
| `kontakte.html` | nav.js Sidebar + Quick-Search-Map + 24 JS-Refs (extreme Verbreitung) | (1) JS-Refs auf `kontakte-supabase.html` migrieren ODER `data-store.kontakte` ESM-Import (bessere Lösung). (2) Sidebar-Eintrag entfernen. (3) Page als 301-Redirect auf `/kontakte`. |

### KEEP-ACTIVE — NICHT löschen (1 Page)

| Page | Begründung |
|---|---|
| `mahnung.html` | 16 JS-Refs in `briefe-logic.js`, `einstellungen-logic.js`, `honorar-tracker.js`, plus 4 Server-Files (`netlify/`/`supabase/`). Aktiv im Mahn-Workflow eingesetzt. Trotz CUTOVER-RED-Klassifikation: Page wird produktiv genutzt. **NIEMALS löschen ohne Workflow-Migration.** |

### INVESTIGATE — Marcel-Klärung (6 Pages)

| Page | Frage an Marcel |
|---|---|
| `vorlage-09-ergaenzungsgutachten.html` | `auftragstyp.js` referenziert das Page — ist das der Wizard-Typ „Ergänzungsgutachten" der nicht in `app-logic.js` aufgenommen wurde, oder Tot-Code? |
| `mahnung-1.html` | Briefe-System-Slot (1 Server-Ref). Ist das die Mahnstufe-1-Vorlage die `briefe-logic.js` lädt? |
| `mahnung-2.html` | Wie mahnung-1 — Mahnstufe 2? |
| `mahnung-3.html` | Wie mahnung-1 — Mahnstufe 3? |
| `mahnwesen.html` | 4 JS-Refs (`auto-save.js`, `fab.js`, `mahnung-check.js`). Ist das eine Live-Sub-View für den Mahn-Überblick, oder durch `rechnungen.html`-Tab abgelöst? |
| `schnelle-rechnung.html` | nav.js-Sidebar (FAB-Quick-Action + Quick-Search) zeigen das ist live. CUTOVER-INVENTORY behauptet „im FAB schon auskommentiert" — das stimmt nur für `fab.js` (`//`-Kommentar), nicht für `nav.js`. Live oder tot? |

### pdfmonkey-Strategie

| Page | Frage an Marcel |
|---|---|
| `pdfmonkey-brief-template.html` | Ist das eine PDFMonkey-Source-HTML (für PDF-Rendering durch PDFMonkey-API) oder Stand-Alone-Versuch? Falls Source: nach `docs/templates-source/` verschieben statt löschen. |
| `pdfmonkey-messprotokoll-template.html` | Wie pdfmonkey-brief-template. |

---

## 📅 Last-Modified-Verteilung

Alle Pages sind innerhalb der letzten 17 Tage zuletzt geändert (zwischen 2026-04-11 und 2026-04-27). Damit greift der **„>30 Tage alt"-Filter aus der Spec NICHT** — die Sweep-Edits aus dem Cutover-K-UI-Sprint haben praktisch alle Files berührt. Last-Modified ist hier KEIN Empfehlungs-Treiber.

| Datum | Anzahl betroffener Files |
|---|---:|
| 2026-04-11 | 4 |
| 2026-04-13 | 28 |
| 2026-04-18 | 3 |
| 2026-04-19 | 5 |
| 2026-04-26 | 5 |
| 2026-04-27 | 2 |

Hauptsweep am **2026-04-13** (vermutlich K-UI-Sprint-Sweep). Pages mit jüngerem Datum (`maengelanzeige` 04-26, `briefvorlagen` 04-27 usw.) wurden im aktiven Sprint berührt — argument für sorgfältige Behandlung.

---

## 🎯 Aufgabe für Marcel

**Schritt 1 — schnelle DELETE-Freigabe (1 Min):**

Bestätige `DELETE` für die 24 Pages (Cluster-1-Reste, vorlage-10/11, stellungnahme-v3.1, stellungnahme-gate, effizienz). Diese sind nur in `prova-layout.config.js` als Catalog-Eintrag — keine echten Refs.

**Schritt 2 — INVESTIGATE klären (5 Min):**

6 Pages mit unklarer Lage. Für jede 1 Antwort:
- vorlage-09: live oder tot?
- mahnung-1/2/3: Mahnstufen-Templates oder Reste?
- mahnwesen: live Sub-View oder durch Rechnungen-Tab ersetzt?
- schnelle-rechnung: bewusst live oder soll weg?

**Schritt 3 — pdfmonkey-Strategie (1 Min):**

DELETE oder VERSCHIEBEN (`docs/templates-source/`)?

**Schritt 4 — DELETE-AFTER-WIZARD planen (Cutover):**

18 Pages bleiben bis zur Migration des `app.html`-Schadensgutachten-Wizards (Cutover-Block-3 Tier A). Sobald `app-logic.js` nicht mehr `ladeBriefTemplateHtml()` und nicht mehr `vorlage-NN.html` als Wizard-Typ aufruft → diese 18 Pages weg.

**Schritt 5 — KEEP-DEPRECATE planen (Cutover-Sweep):**

`briefvorlagen.html` + `kontakte.html` brauchen explizite JS-Ref-Migration vor 301-Redirect-Konvertierung. **briefvorlagen** = relativ klein (14 Refs). **kontakte** = aufwändig (24 Refs, in vielen Workflows). Mini-Sprint pro Page.

---

## 🧮 Repo-Reduktion bei voller Marcel-Freigabe

Wenn Marcel alle 24 DELETE freigibt:
- **24 Files weg** = ~3,5% des Root-HTML-Bestands (24 von 129)

Plus später nach app.html-Migration:
- **+18 Files** = ~14% des Root-HTML-Bestands weg

Plus nach kontakte+briefvorlagen-Cutover:
- **+2 Files** = insgesamt **44 Files weg**, **~34% des Root-HTML-Bestands**

Plus 28 doppelte `briefe/`-Subfolder-Pages (siehe CUTOVER-INVENTORY Cluster 1) und ggf. 11 `formulare/`-Subfolder-Pages: **70-90 Files Repo-Reduktion möglich**.

---

## 🤖 Methodik-Notizen

- Skript: `/tmp/cluster_analyze.sh` (Bash-Loop über `/tmp/cluster_pages.txt`)
- Output-TSV: `/tmp/cluster_results.tsv` (52 Datenzeilen)
- Excludes: `node_modules/`, `playwright-report/`, `docs/`, `briefe/`, `formulare/`, `legal/`, `tools/`
- Self-Excludes: `<page>-logic.js` für eigenes File ausgenommen
- Manuell qualifiziert: `prova-layout.config.js` und `app-logic.js` als Spezialfälle nach Pre-Analyse-Inspektion
- Falsch-Negativ-Risiko: Pages die nur via dynamische `fetch('/path/' + variable)` geladen werden, würden hier **nicht** auftauchen. Die `app-logic.js`-Registry deckt aber den Hauptfall ab.

---

*Auto-Analyse erstellt 2026-04-30, Branch `audit/cluster-review-auto`. Marcel reviewt + entscheidet → Folge-Sprint für Bulk-Delete-PR.*
