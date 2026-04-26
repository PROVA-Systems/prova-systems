# Sprint 04f — Nacht-Pause-Bericht

**Stand:** 27.04.2026 frueh
**Bezug:** Sprint 04f Layout-Vereinheitlichung
**Letzte Commits:** `c105574` (A) · `861dd7c` (B) · `f444713` (C) · `f51662f` (D) · `9a9d160` (E)
**Cache:** `prova-v221` (deployed nach Push)

---

## Was funktioniert hat

### Block A — page-template.css (✅ vollstaendig)
- Neue zentrale CSS-Datei (335 Zeilen) mit allen Layout-Klassen
- Eingebunden in alle 11 Auftragstyp-HTMLs
- sw.js APP_SHELL erweitert um `/page-template.css`

### Block B — Einfache Pages (✅ 5 von 6)
- `ergaenzung.html` ✓ Hero standardisiert + Settings-Icon
- `widerspruch-gutachten.html` ✓ Hero hinzugefuegt + Settings-Icon
- `schnelle-rechnung.html` ✓ Breadcrumb + Hero
- `briefvorlagen.html` ✓ `<header>` + Hero + Settings-Icon
- `akte.html` ✓ Breadcrumb-Klassen + 'Faelle' -> 'Auftraege'
- `app.html`: keine Aenderung noetig (war schon nach Standard)

### Block C — Schwergewichte (✅ Markup-Konsistenz, ❌ Stepper-Konsolidierung)
- `beratung.html` ✓ "(Flow C)" KOMPLETT WEG, Header + Hero
- `wertgutachten.html` ✓ Header semantisch + Hero, Code-Comment-Cleanup
- `baubegleitung.html` ✓ Header + Hero
- `stellungnahme.html` ✓ Settings-Icon Slot in flow-header
  (Hero NICHT — flow-header + fall-banner ist die existing Struktur)

### Block D — Schiedsgutachten (✅ vollstaendig)
- Hero hinzugefuegt
- 4-Step-Stepper hinzugefuegt (Parteien / Streitobjekt / Honorar / Abschluss)
- Settings-Icon
- Tippfehler 'Stritobjekt' korrigiert
- visuelle Paritaet mit ergaenzung.html erreicht

### Block E — sw.js + Verify (✅)
- `prova-v220` -> `prova-v221`
- Cross-Page-Verify: 11/11 laden page-template.css, kein Flow-Label im UI

---

## Was BEWUSST nicht angetastet wurde (Risiko-Avoidance)

### 1. Stepper-CSS-Klassen-Konsolidierung
**Ist:** 3 verschiedene Stepper-CSS-Systeme aktiv:
- `.step` + `.step-circle` (app.html)
- `.wz-step` + `.wz-step-num` (wertgutachten.html)
- `.flow-step` + `.flow-dot` (stellungnahme.html)

**Soll laut Spec:** alle auf `.page-stepper` umstellen

**Warum nicht gemacht:** Logic-Files referenzieren die bestehenden CSS-Klassen
und Element-IDs (z.B. `wertgutachten-logic.js` querySelector('.wz-step.active'),
`app-logic.js` setSurface auf `.step`-Klassen). Markup-Klasse-Rename ohne
parallelen Logic-Refactor brechte die State-Wechsel der Wizards.

**Naechster Schritt fuer Marcel:**
1. Pro Logic-File `grep .wz-step|.flow-step|.step\\b` durchgehen
2. Entweder: Logic-Files auf `.page-stepper` umstellen
3. Oder: page-template.css `.page-stepper`-Selektoren um Aliasse erweitern
   (`.step, .wz-step, .flow-step, .page-step { … }`)
4. Aufwand-Schaetzung: 2-3 h fuer alle 3 Pages mit Smoke-Test

### 2. stellungnahme.html Inline-CSS-Reduzierung
**Ist:** 35.5 KB Inline-CSS, eigene `.flow-header` mit 5-Step-Stepper,
`.fall-banner`, `.focus-bar`, viele `.editor-*`-Klassen

**Soll laut Spec:** Reduktion auf <10 KB durch page-template.css

**Warum nicht gemacht:** Die Page ist die zentrale §6-Fachurteil-App.
Refactor des Editor-Layouts ohne tiefen Smoke-Test (KI-Hilfen, Auto-Save,
Konjunktiv-II-Check, Halluzinations-Check) ist Nacht-Risiko zu hoch.

**Was gemacht wurde:** Settings-Icon-Slot in flow-header + Cosmetic-only.

**Naechster Schritt fuer Marcel:**
- Eigener Sprint nur fuer stellungnahme.html mit Browser-Test der
  KI-Funktionen vor jedem Visual-Refactor
- Aufwand-Schaetzung: 3-4 h

### 3. app.html Inline-CSS-Reduzierung (27.8 KB)
**Warum nicht gemacht:** App-kritische Page (Schadensgutachten-Wizard,
zentraler Workflow, Diktat-Recorder, Foto-Upload). Inline-CSS hat
viele page-spezifische Komponenten (`.diktat-tab`, `.fotos-grid`,
`.swipe-hint` etc.) die nicht in page-template.css gehoeren.

**Naechster Schritt fuer Marcel:**
- Selektive Extraktion (page-title/breadcrumb sind schon nach Standard;
  Stepper bleibt mit `.step`-Klassen wegen Logic-Bindung)
- Aufwand: 1 h fuer Polish, 4-5 h fuer kompletten Refactor inkl. Logic

---

## Bekannte Limitierungen

- **stellungnahme.html und akte.html** haben kein `<div class="page-hero">` —
  beide haben eigene Header-Strukturen (`.flow-header` mit Stepper bzw.
  `.akte-header`-Pattern). Marcel-Spec hat fuer akte.html "behaelt eigene
  Tab-Struktur" akzeptiert. Stellungnahme: war ohnehin "eigene Mini-App".

- **Stepper-Visual-Konsistenz noch nicht erreicht** zwischen den Pages:
  app.html (5-Step `.step`), wertgutachten (3-Step `.wz-step`),
  stellungnahme (5-Step `.flow-step`), beratung (3-Step `.br-phase`),
  schiedsgutachten (4-Step `.page-stepper` — NEU!).
  → Schiedsgutachten ist der einzige der bereits den neuen Standard nutzt
    (weil dort kein bestehender Logic-Code rangiert).

- **briefvorlagen.html** hatte ein eigenes `.topbar-title` mit "PROVA · ..."-
  Format. Wurde durch Standard-Breadcrumb ersetzt. Wenn Marcel das vorherige
  ohne `<header>`-Tag praeferierte, ist die Aenderung minimal-invasiv-
  reversibel.

---

## Was Marcel morgen frueh testen muss (Akzeptanz)

Inkognito-Browser:
1. **sw.js v221 aktiv** in Application-Tab
2. **Alle 11 Pages laden ohne Console-Errors**
3. **Sidebar funktioniert** (nav.js unangetastet)
4. **Glocke + Settings-Icon konsistent** oben rechts auf 9-10 Pages
5. **Breadcrumb-Format** "PROVA › X" einheitlich
6. **H1-Format** 28px bold mit `var(--accent)` ohne Emoji
7. **KEIN "Flow B/C/D" mehr sichtbar** im UI
8. **Schiedsgutachten** rendert mit Hero + Stepper (nicht mehr "kahl")
9. **Mobile <768px**: Pages bleiben benutzbar, Sidebar collapsed/slide-off

Falls Bugs: Hotfix P5f.X1.

---

## Tag

KEIN Tag gesetzt. Marcel testet morgen frueh und setzt manuell:
```
git tag v180-ssicher-p5f-done
git push origin v180-ssicher-p5f-done
```

---

## Gesamt-Stats

- **Commits:** 5 (A, B, C, D, E)
- **Files geaendert:** 14 (1 neu: page-template.css, 11 HTMLs, sw.js, AUDIT-LAYOUT-04f.md)
- **Zeilen +:** ~410 (CSS + HTML-Markup)
- **Zeilen -:** ~30 (alte Inline-Styles)
- **Cache:** v220 -> v221
- **Working-Tree intakt:** CLAUDE.md, masterplan-v2/, CHANGELOG-MASTER.md, AUDIT-LAYOUT-04f.md unangetastet
