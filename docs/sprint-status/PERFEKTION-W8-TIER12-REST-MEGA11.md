# MEGA¹¹ W8 — Tier 12 Restpunkte (DRY-Helper + Form-Validate-Erweiterung + WCAG)

**Sprint:** MEGA¹¹ W8 (2026-05-04)
**Status:** ✅ Done
**Quality-Score:** 9/10

---

## Was geliefert

### 1. `lib/prova-alert.js` — DRY-Helper (~80 LOC)

**Konsolidiert das in MEGA⁹+MEGA¹⁰ etablierte Defense-in-Depth-Pattern** in einen Helper:

```js
provaAlert(msg);                  // info-toast (default)
provaAlert(msg, 'error');         // error-toast
provaAlert(msg, 'success');       // success-toast
provaConfirm(msg);                // future-proof: native confirm jetzt, modal-confirm spaeter
```

**Defense-in-Depth-Layer:**
1. `if (window.ProvaUI?.toast)` -> nutzt Toast
2. Try/catch um toast() (Library-Fail-Defense)
3. Fallback: `alert()` im try/catch (UI-not-available-Defense)

**Migration-Vorteil:** alle 7+ Toast-Migration-Stellen aus MEGA⁹+MEGA¹⁰ koennen kuenftig von 5 Zeilen auf 1 Zeile reduziert werden:

Vorher (5 Zeilen):
```js
const errMsg = 'PDF-Generation Fehler: ' + e.message;
if (window.ProvaUI && window.ProvaUI.toast) {
  window.ProvaUI.toast(errMsg, 'error');
} else {
  alert(errMsg);
}
```

Nachher (1 Zeile):
```js
provaAlert('PDF-Generation Fehler: ' + e.message, 'error');
```

**Migration-Backlog:** Bestehende 7 Stellen bleiben aktuell (Defense-in-Depth funktioniert), MEGA¹² kann sweep-migrieren.

### 2. Form-Validate-Erweiterung in app-login-logic.js

**Register-Form (window.register):**
- `_validateRegisterInputs(nameEl, emailEl, pwEl)` Helper
- Field-Rules:
  - `reg-name`: required + minLength 2
  - `reg-email`: required + Email-Pattern (selbe Regex wie Login)
  - `reg-pw`: required + minLength 8 (Marcel-Pflicht)
- Bei Fehler: provaAlert + Field-Errors im DOM

**Reset-Form (window.resetPasswort):**
- Inline-Validation mit `validateField` direkt
- Email-Required + Pattern-Check
- Bei Fehler: provaAlert

**Defense-in-Depth:** Bei fehlender ProvaForm-Library bleibt der originale alert-Code als Fallback aktiv.

### 3. `tools/wcag-audit.js` — Statisches WCAG-Audit-Tool (~190 LOC)

**Findings-Engine** scant HTML-Files nach 6 WCAG-2.1-AA-Kriterien:
- WCAG-1.1.1: `<img>` ohne alt-Attribut (error)
- WCAG-1.3.1: Heading-Hierarchy-Sprung (warning)
- WCAG-2.4.4: `<a>` ohne href aber mit onclick (warning)
- WCAG-3.1.1: `<html>` ohne lang-Attribut (error)
- WCAG-4.1.2: Icon-only Button ohne aria-label (warning)
- BEST-PRACTICE: Skip-to-Content-Link absent (info)

**CLI:**
```bash
node tools/wcag-audit.js                  # alle HTML
node tools/wcag-audit.js dashboard.html   # eine Page
node tools/wcag-audit.js --json           # JSON-Output (CI-friendly)
```

**Exit-Code:** 0 = clean, 1 = errors found.

**Honesty-Note im Tool selbst:**
> "Hinweis: Das ist STATISCHER Audit. Visual-Tests + Color-Contrast + ARIA-Live-States brauchen axe-DevTools im Browser."

### 4. WCAG-Fixes in 3 Pages (dashboard, archiv, akte)

**Pro Page:**
- Skip-to-Content-Link am Body-Top (off-screen, focus-visible)
- aria-label auf 3 Icon-only Buttons (⚙ Einstellungen, 💬 Support, ✕ Modal-Close)
- Optionaler aria-label auf Frist-Banner-Close (akte.html spezifisch)

**Re-Audit nach Fixes:** alle 3 Pages = 0 Errors / 0 Warnings / 0 Info.

### 5. Tests (26 neue, alle gruen)

`tests/ui/w8-prova-alert-wcag.test.js`:
- 6 Tests: prova-alert.js Library-Existence + API-Contract + Defense-in-Depth-Patterns
- 13 Tests: WCAG-Audit-Tool (jede Rule mit Positive + Negative Case)
- 3 Tests: Regression-Schutz fuer fixed Pages (dashboard/archiv/akte = clean)
- 4 Tests: Register/Reset-Migration in app-login-logic.js

---

## Edge-Cases dokumentiert

a) **WCAG-Audit Icon-Detection:**
   - Heuristic: content < 3 Chars ODER nur Emoji/Symbol
   - False-Positive-Risk: 2-3-Zeichen-Wort-Buttons werden als Icon gewertet
   - Akzeptiert: "OK", "JA" sind selten als Button-Label

b) **Skip-Link-Detection:**
   - Regex prueft `class="skip"` ODER `class="skip-link"` ODER beliebiger `class="...skip..."`
   - Marcel-Pflicht: `id="main-content"` muss existieren als Link-Target

c) **Form-Validate Browser-Cache-Edge:**
   - Bei vorherig submitted Form (cached values) wird onfocus-event nicht getriggert
   - validateField bei Submit-Click checkt trotzdem
   - Pattern OK

d) **prova-alert race-condition:**
   - Wenn ProvaUI.toast erst nach prova-alert geladen wird → Fallback-alert zeigt
   - Akzeptiert: Edge-Case nur bei extrem schnellen User-Actions vor Page-Load

---

## Performance-Implications

- **prova-alert.js:** ~2KB minified, single-function
- **WCAG-Audit:** ~5ms pro Page (regex-only, kein DOM-Parser)
- **Skip-Link:** 0 Bytes runtime (CSS-only off-screen + :focus)
- **aria-label:** 0 Bytes runtime (HTML-Attribute)

---

## Browser-Test-Plan (Marcel-Pflicht)

### Test 1: Skip-Link (Tab-Navigation)

1. dashboard.html (oder archiv/akte) im Browser
2. Tab-Taste druecken (KEIN Maus-Click)
3. **Erwarten:** Skip-Link "Zum Inhalt springen" wird sichtbar oben-links
4. Enter -> springt zu `#main-content` oder `#page-main`
5. Tab erneut → Focus geht zu erstem fokussierbarem Element IM main

### Test 2: Screen-Reader (NVDA / VoiceOver)

1. Screen-Reader aktivieren
2. dashboard.html laden
3. Icon-Buttons werden vorgelesen mit aria-label (z.B. "Einstellungen oeffnen")
4. NICHT mehr: nur "Button" oder "Symbol" oder "Emoji"

### Test 3: Register-Form-Validation

1. app-login.html → Tab "Registrieren"
2. Name leer + Email "abc" + PW "1234" → Klick "Konto erstellen"
3. **Erwarten:**
   - Field-Error bei reg-name "Vollstaendiger Name erforderlich"
   - Field-Error bei reg-email "Bitte gueltige E-Mail-Adresse eingeben"
   - Field-Error bei reg-pw "Passwort muss mind. 8 Zeichen haben"
   - Toast "Bitte Eingaben pruefen"
4. Korrekte Eingaben → normale Register-Flow

### Test 4: Reset-Form-Validation

1. app-login.html → "Passwort vergessen?"
2. Email "nicht-valide" → Klick "Reset-Link"
3. Erwarten: Field-Error + Toast

### Test 5: WCAG-Audit-CLI

```bash
# Alle HTML-Pages auditen
node tools/wcag-audit.js

# Dashboard speziell
node tools/wcag-audit.js dashboard.html

# JSON-Output (z.B. fuer CI-Pipeline)
node tools/wcag-audit.js --json | jq
```

---

## Self-Critique (brutal-ehrlich)

### 9/10 — was gut war
- ✅ DRY-Helper geloest die Code-Duplikation aus MEGA⁹+MEGA¹⁰ (Defense-in-Depth-Pattern)
- ✅ Form-Validate-Erweiterung schliesst W5-Self-Critique-Lucke (Register + Reset waren NICHT migriert)
- ✅ WCAG-Audit-Tool ist USEFUL (echte Findings in 3 Pages → echte Fixes)
- ✅ Statisches Tool ist EHRLICH ueber Limits ("braucht axe-DevTools")
- ✅ 26 Tests umfassend mit Positive+Negative+Regression-Schutz
- ✅ Browser-Test-Plan inkludiert Screen-Reader-Test

### Was nicht 10/10 war
- ⚠️ Bestehende 7 Toast-Stellen NICHT auf prova-alert migriert (Backlog für MEGA¹²)
- ⚠️ WCAG-Audit prueft nur 3 Pages clean — viele andere Pages noch ungetestet
- ⚠️ Skip-Link ist Inline-Style (sollte in einer central CSS-File sein, MEGA¹²-Backlog)
- ⚠️ Heuristic fuer Icon-only Detection: false-positives bei 1-2-Zeichen-Word-Buttons moeglich

### Was Senior-Engineer noch tun wuerde
- Toast-Migration-Sweep mit prova-alert (7 Stellen gleichzeitig)
- WCAG-Audit auf alle 30+ HTML-Pages laufen + Mass-Fixes
- Skip-Link in zentraler CSS extrahieren (lib/wcag-helpers.css)
- Heading-Hierarchy-Audit-Refinement (jetzige Logik ist simpel, kann False-Negatives haben bei Inline-h2-h3-Mixes)

---

## Quality-Bar

- 0 Production-Breaking-Changes (Defense-in-Depth in allen Stellen)
- node --check OK fuer alle Files
- 26/26 Tests gruen
- WCAG-Compliance: 3 wichtigste Pages (dashboard, archiv, akte) sind audit-clean
- CLAUDE.md-Konformitaet:
  - Empty-States-Regel beachtet
  - Tooltip-Regel: Skip-Link erklaert was passiert (PROVA-spezifisch)
  - Regel 24 (`node --check`): erfuellt

---

## File-Inventory MEGA¹¹ W8

**Neu:**
- `lib/prova-alert.js` (~80 LOC)
- `tools/wcag-audit.js` (~190 LOC)
- `tests/ui/w8-prova-alert-wcag.test.js` (26 Tests)
- `docs/sprint-status/PERFEKTION-W8-TIER12-REST-MEGA11.md` (diese Datei)

**Modifiziert:**
- `app-login-logic.js` — _validateRegisterInputs + resetRule
- `dashboard.html` — Skip-Link + 3 aria-labels
- `archiv.html` — Skip-Link + 3 aria-labels
- `akte.html` — Skip-Link + 3 aria-labels

**Test-Suite:** 410 → 436 (+26, alle gruen)

**Marcel-Pflicht:**
- WCAG-Audit auf weitere Pages laufen + Fixes
- Toast-Migration-Sweep mit prova-alert in Sprint K-2
- Real-Screen-Reader-Test (NVDA/VoiceOver)

---

*Tier 12 Restpunkte done — DRY-Helper extrahiert, Form-Validate erweitert (W5-Lucke), WCAG-Tool erstellt + 3 Pages audit-clean. Quality 9/10.*
