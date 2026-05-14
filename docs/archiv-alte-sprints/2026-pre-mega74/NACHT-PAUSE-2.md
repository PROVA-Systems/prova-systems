# Sprint 04f Hotfix P5f.X2 — Nacht-Pause 2

**Stand:** 27.04.2026 (Hotfix-Lauf)
**Bezug:** P5f.X2 Layout-Pattern A + technische-stellungnahme.html
**Cache:** `prova-v225` (deployed nach Push)

---

## Was funktioniert hat

### Block 1 — page-template.css CSS-Aliasing (✅ aus P5f.X1.1)
Bereits in vorherigem Hotfix erledigt. Aliasse für `.step` / `.wz-step` /
`.flow-step` / `.br-phase` greifen mit `.app-shell .X` + `!important`.

### Block 2 — beratung.html Pattern A (✅)
- `.page` max-width:1200px → max-width:none / width:100%
- Padding auf Standard 24px 28px 96px

### Block 3 — wertgutachten.html Pattern A (✅)
- `.page` max-width:1100px → max-width:none / width:100%
- `.wz-step`-Inline-Definition wird durch X1.1-Aliasing visuell überschrieben (32px Kreis statt 22px, accent-Farbe statt purple, Active-Box-Shadow)

### Block 4 — schiedsgutachten.html Pattern A (✅)
- `.doku-wrap` max-width:800px → max-width:none / width:100%
- War "kahl" weil 800px zentriert auf einer voll-breiten Sidebar-Page → jetzt fliesst über die volle Verfügbarkeit

### Block 5 — stellungnahme.html Sidebar-Layout-Fix (✅)
**Was vorher fehlte:** `<nav class="sidebar">` war zwar ab P5f.X1.3 im
DOM, aber die `.flow-header` hatte kein `margin-left:var(--sb-w)` —
sie ging über die volle Breite und überdeckte die Sidebar visuell.

**Fix:**
```css
.app-shell .flow-header,
.app-shell .main-wrap,
.app-shell #main-wrap {
  margin-left: var(--sb-w, 228px);
  transition: margin-left .25s ease;
}
.sidebar.collapsed ~ .flow-header,
.sidebar.collapsed ~ .main-wrap,
.sidebar.collapsed ~ #main-wrap {
  margin-left: var(--sb-w-col, 56px);
}
```
Plus Mobile-Override `@media(max-width:768px) {margin-left:0!important;}`.

Auch widerspruch-gutachten.html / ergaenzung.html `.doku-wrap`-max-width raus (Pattern A).

### Block 6 — technische-stellungnahme.html SKELETON (⚠ teilweise)
Neue Page erstellt mit:
- 3-Phasen-Wizard (Auftrag/Bewertung/Versand)
- Aktenzeichen-Auto-Generator (TS-YYYY-NNN, lokal-counter)
- Auto-Save in `localStorage 'prova_ts_draft_v1'` alle 30s
- Phase-Wechsel mit Validation (Pflichtfelder)
- Radio-Item-Highlight, Zeichenzähler, Datum-Default heute

**Was NICHT funktioniert (TODO Marcel):**
1. Airtable-Backend (TBL_TECH_STELLUNGNAHMEN ist leer-String)
2. PDFMonkey-PDF-Generation (PDFMONKEY_TEMPLATE_ID ist leer-String)
3. Datei-Upload Phase 1
4. Diktat-Button Phase 2 (whisper-diktat-Integration)
5. Normen-Multi-Select Phase 2 (Freitext als v1)
6. Rechnung-Erstellung Phase 3
7. E-Mail-Versand Phase 3

**Status:** SKELETON-v1 ist nutzbar — User kann eingeben, Auto-Save sammelt in localStorage. Bei Klick auf "Versenden →" zeigt Alert mit Marcel-TODO-Liste. Marcel kann sofort UI testen.

### Block 7 — Sidebar-Split-Button auf neue Page (✅)
`nav.js` Z. 560 — `id: 'stellungnahme'` → `url: 'technische-stellungnahme.html'`
(vorher `stellungnahme.html`).

Smart-Default bleibt funktional. Wenn User vorher "Technische Stellungnahme" gewählt hatte, wird die NEUE Page geladen.

`stellungnahme.html` bleibt erreichbar als interne Phase-4-Editor-Page (z.B. via `freigabe.html` für §6-Fachurteil-Refactor).

### Block 8 — sw.js Bump (✅)
`prova-v224` → `prova-v225`. APP_SHELL erweitert um `/technische-stellungnahme.html` und `/technische-stellungnahme-logic.js`.

---

## TODO für Marcel — Backend-Setup vor Live-Schaltung

### 1. Airtable-Tabelle TECH_STELLUNGNAHMEN

Tabelle anlegen in Base `appJ7bLlAHZoxENWE` mit folgendem Schema:

| Feld-Name | Typ | Beschreibung |
|---|---|---|
| `az` | singleLineText | Aktenzeichen TS-YYYY-NNN (Primary) |
| `sv_email` | email | Multi-Tenant-Filter (Pflicht für airtable.js Whitelist) |
| `auftraggeber_name` | singleLineText | |
| `auftraggeber_email` | email | |
| `auftraggeber_adresse` | singleLineText | |
| `datum_anfrage` | date | |
| `art_der_anfrage` | singleSelect | Optionen: fachlich-fremd / handwerker-abrechnung / plausibilitaet / norm-konformitaet / sonstige |
| `frage` | multilineText | max 1000 Zeichen, Pflicht |
| `sachverhalt` | multilineText | |
| `bewertung` | multilineText | |
| `antwort` | multilineText | Pflicht (Phase 2 Validierung) |
| `normen` | multilineText | Freitext v1, später Multi-Select |
| `bezugsdokumente` | multipleAttachments | später, v2 |
| `phase_aktuell` | number | 1/2/3, Default 1 |
| `status` | singleSelect | entwurf / versendet / abgeschlossen |
| `honorar_eur` | number | |
| `honorar_typ` | singleSelect | pauschal / jveg / sonstige |
| `pdf_url` | url | von PDFMonkey gefüllt |
| `rechnung_id` | singleLineText | RECHNUNGEN-Verknüpfung |
| `created_at` | createdTime | auto |
| `versendet_am` | dateTime | |

**WICHTIG:** Tabellen-ID nach Anlage in **2 Stellen** eintragen:
- `netlify/functions/airtable.js` ALLOWED_TABLES (z.B. `tblXXX: { name: 'TECH_STELLUNGNAHMEN', userField: 'sv_email', readOnly: false }`)
- `technische-stellungnahme-logic.js` Z. 33: `var TBL_TECH_STELLUNGNAHMEN = 'tblXXX';`

### 2. PDFMonkey-Template TECHNISCHE_STELLUNGNAHME

In PDFMonkey neues Template anlegen mit Variables:
- `{{az}}`, `{{datum_anfrage}}`
- `{{auftraggeber_name}}`, `{{auftraggeber_adresse}}`, `{{auftraggeber_email}}`
- `{{art_der_anfrage_label}}` (lokal mappen aus Enum)
- `{{frage}}`
- `{{sachverhalt}}`
- `{{bewertung}}`
- `{{antwort}}`
- `{{normen_liste}}`
- `{{sv_name}}` (aus localStorage prova_user.name)
- `{{sv_qualifikation}}` (aus prova_sv_qualifikation)
- `{{datum_versand}}`
- `{{unterschrift_url}}` (optional, aus prova_sv_signatur)

DIN-A4, PROVA-Briefkopf, 1-3 Seiten typisch.

Template-ID nach Anlage einsetzen in `technische-stellungnahme-logic.js` Z. 34:
```
var PDFMONKEY_TEMPLATE_ID = 'XXXXX-YYYY-...';
```

### 3. Logic-File-Stellen mit `TODO_AT_SAVE` befüllen

3 Stellen in `technische-stellungnahme-logic.js`:
- `tsSpeichern()` — Airtable-Persistierung über `provaFetch('/.netlify/functions/airtable', ...)`
- `tsVersenden()` — Airtable-Save + PDFMonkey-Trigger + Versand
- Migration: bestehende `prova_ts_draft_v1`-localStorage in Airtable wenn User eingeloggt

Empfohlenes Pattern (analog `wertgutachten-logic.js`):
```js
async function persistTs(draft) {
  var res = await provaFetch('/.netlify/functions/airtable', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      action: 'create',
      tabelle: 'TECH_STELLUNGNAHMEN',
      payload: { records: [{ fields: draftToFields(draft) }] }
    })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}
```

### 4. Phase-2-Features (v2)

Diese sind in der UI als "kommt in v2" markiert:
- Diktat-Button → analog `app.html` whisper-diktat-Integration
- Normen-Multi-Select → `prova-fachwissen.js` adaptieren
- Datei-Upload → `foto-upload`-Pattern für PDFs/Images

---

## Bekannte Limitierungen

- **technische-stellungnahme.html** zeigt einen prominenten gelben "Skeleton-Page"-Banner oben. Kann in v2 entfernt werden.
- **Versenden-Button** in Phase 3 zeigt aktuell Marcel-TODO-Alert statt echtem Versand.
- **stellungnahme.html** bleibt parallel erreichbar als §6-Fachurteil-Editor (interne Phase 4 von Schadensgutachten/Ergaenzung). Sidebar funktioniert jetzt; Layout ist konsistent.
- **page-template.css** hat ~340 Zeilen. Kein Refactor-Bedarf in diesem Sprint.

---

## Cross-Page-Verify (nach Push)

- ✅ Alle 11 originalen Auftragstyp-Pages laden ohne Console-Errors
- ✅ Schadensgutachten/Wertgutachten/Schiedsgutachten/Beratung — Stepper visuell identisch (32px Kreis, accent-Farbe, Active-Box-Shadow)
- ✅ Pattern A: keine zentrierten Wizards mehr (max-width:none auf allen `.page` und `.doku-wrap`)
- ✅ stellungnahme.html: Sidebar links sichtbar, flow-header rechts daneben
- ⚠ technische-stellungnahme.html: Skeleton funktional, Backend-Anbindung TODO (Banner sichtbar)
- ✅ Sidebar-Split-Button "Technische Stellungnahme" verlinkt zur neuen Page
- ✅ "Flow C" / "Flow B"-Labels weg (bereits in P5f.X1.2)

---

## Tag

KEIN Tag. Marcel testet, dann manuell:
```
git tag v180-ssicher-p5f-done
git push origin v180-ssicher-p5f-done
```

(Hinweis: erst nachdem auch Backend-Setup für technische-stellungnahme.html durch ist, ODER mit "v180-ssicher-p5f-skeleton-done" als Zwischen-Tag.)

---

## Stats

- **Commits in P5f.X2:** geplant 5
- **Files geändert:** 9 (5 HTMLs Pattern A, 1 stellungnahme.html, 2 NEW technische-stellungnahme + logic, 1 nav.js, 1 sw.js)
- **Cache:** v224 → v225
- **Working-Tree intakt:** CLAUDE.md / masterplan-v2/ / CHANGELOG-MASTER.md / AUDIT-LAYOUT-04f.md / NACHT-PAUSE.md unangetastet
