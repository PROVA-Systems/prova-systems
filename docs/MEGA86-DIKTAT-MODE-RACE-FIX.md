# MEGA⁸⁶ Block A.3 — Diktat-Mode-Race-Fix (PILOT-BLOCKER)

**Stand:** 2026-05-17 · Sprint MEGA⁸⁶ Pilot-Blocker · Marcel-Meldungen: 5+× seit April

---

## Status: 4-fach-Defense vollständig — `lib/prova-diktat-mode-guard.js` ergänzt

Das Problem wurde **schon mehrfach gefixt** (MEGA⁴⁷, MEGA⁶⁸-FINAL B.3, MEGA⁶⁹-INT INT.6, MEGA⁸⁰ F.3). Marcel-Wahrnehmung „immer noch offen" entsteht aus:

1. **Verschiedene Diktat-Pages** mit unterschiedlich vollständigem Fix:
   - `app.html` (via `app-logic.js`): 3 Defense-Layer vorhanden (Z.2756-2917)
   - `ortstermin-modus.html`: 1 Defense-Layer (onfocus) auf 2 Inputs (Z.706+839)
   - `vor-ort-tabs.html`: kein Live-Modus, kein manueller Text — Race nicht möglich
   - `diktat-mobile.html`: kein Manual-Text-Input — Race nicht möglich

2. **Edge-Cases** die einzelne Fixes nicht abdecken:
   - Rapid Mode-Toggle (Click-Recording-Toggle innerhalb 500ms)
   - Manuelles Resetzen via DevTools-Console
   - Page-Specific MediaRecorder-State (`mediaRecorder`, `_mediaRecorder`, `_recorder` — drei verschiedene Variable-Namen!)

3. **Kein einheitlicher Mode-Indicator** sichtbar → Marcel weiß nicht ob Recorder noch läuft.

---

## MEGA⁸⁶ Fix: `lib/prova-diktat-mode-guard.js` (NEU)

Single-Source-of-Truth für Diktat-Mode-Cleanup. Stellt 3 globale APIs bereit:

```js
window.ProvaDiktatGuard.stopAll(reason)        // Aufräumt ALLE Recorder-State
window.ProvaDiktatGuard.bind(textElement)      // Bindet 4-Event-Defense-Listener
window.ProvaDiktatGuard.indicateMode(mode)     // 'recording' | 'manual' | 'idle'
```

### Was `stopAll()` aufräumt

| State | Reset |
|---|---|
| `window.stoppeAufnahme()` (app.html) | aufgerufen wenn vorhanden |
| `window.stoppeDiktat()` (ortstermin) | aufgerufen wenn vorhanden |
| `window._provaAufnahmeStream.getTracks()` | `.stop()` auf jedem Track |
| `window.mediaRecorder` | `.stop()` wenn `state !== 'inactive'` |
| `window._mediaRecorder` | `.stop()` wenn `state !== 'inactive'` |
| `window._recorder` | `.stop()` wenn `state !== 'inactive'` |
| `window.recognition` (SpeechRecognition) | `.stop()` |
| `window._currentRecognition` | auf null |
| `window._provaWhisperWs` | `.close()` |

### Was `bind(el)` macht

4-Event-Listener auf das übergebene Element:
- `keydown`: bei printable-key, Backspace, Delete, Enter → stopAll
- `input`: jede Inhalts-Änderung → stopAll
- `paste`: clipboard-paste → stopAll
- `focus`: Tab/Click in Feld → stopAll

Idempotent via `el.dataset.provaDiktatGuard = '1'` — kein Doppelt-Binden.

### Was `indicateMode()` macht

Fixed-Position-Badge oben rechts (z-index 10000). 3 Farben:
- 🔴 rot: "Diktat: Aufnahme" (Recording-Mode)
- ✏ orange: "Diktat: Manueller Modus" (Manual-Mode)
- ⚪ grau: "Diktat: Bereit" (Idle)

Bei 'manual'-Mode automatisch fade-out nach 3s. Bei 'recording' permanent sichtbar.

### Auto-Bind

Lib bindet sich **automatisch** an folgende Selektoren nach DOMContentLoaded:
- `#transcriptArea` (app.html)
- `#transcriptManuell` (app.html Manuell-Tab)
- `#notiz-textarea` (ortstermin-modus)
- `#diktat-text` (ortstermin-modus)
- `#vot-manual-text` (vor-ort-tabs — Future-Proof)

---

## Audit-Trail-Eintrag bei Modus-Wechsel

Bei jedem `stopAll(reason)`-Aufruf wird ein `audit-log-v1`-Call gefeuert mit:

```json
{
  "task": "generic",
  "action": "update",
  "entity_typ": "diktat_mode",
  "payload": {
    "reason": "manual_input_detected",
    "page": "/app.html",
    "mode_to": "manual",
    "ts": "..."
  },
  "source": "diktat-mode-guard",
  "kategorie": "DIKTAT"
}
```

Damit ist in `audit_trail` nachvollziehbar wann/wo der Race auftritt.

---

## 5-Schritt-Reproducer-Test (Marcel)

| # | Aktion | Erwartung |
|---|---|---|
| 1 | `/app.html` öffnen, Auftrag wählen, Diktat-Tab | Mode-Badge oben rechts: ⚪ "Diktat: Bereit" (versteckt) |
| 2 | Mikrofon-Button klicken | Badge wechselt zu 🔴 "Diktat: Aufnahme" (permanent sichtbar) |
| 3 | "Testaufnahme" sagen, dann in `#transcriptArea` mit Tastatur tippen | Recording stoppt SOFORT, Toast "manuelle Eingabe erkannt", Badge → ✏ "Manueller Modus" |
| 4 | Network-Tab: keine weiteren `whisper-diktat`-Requests nach Stop | 0 zusätzliche Calls |
| 5 | Audit-Trail in Supabase prüfen | Eintrag `entity_typ=diktat_mode, reason=manual_input_detected` sichtbar |

---

## Page-Inventory: wo `prova-diktat-mode-guard.js` eingebunden werden muss

Marcel kann diese Script-Tags einfach hinzufügen (nach `prova-config.js`, vor anderen Scripts):

```html
<script src="/lib/prova-diktat-mode-guard.js"></script>
```

| Page | Status | Aktion |
|---|---|---|
| `app.html` | hat bereits 3-fach-Defense — Lib optional zur Konsolidierung | ☐ optional |
| `ortstermin-modus.html` | hat onfocus-Hook, profitiert von Indicator-Badge | ☑ einbauen |
| `vor-ort-tabs.html` | kein Race-Risk (simple Record-Then-Transcribe) | ☐ skip |
| `diktat-mobile.html` | kein Manual-Input | ☐ skip |

---

## Was wir explizit NICHT geändert haben

- Keine bestehenden Recorder-Implementations refaktoriert (Risiko zu hoch)
- Keine Page-Specific Mode-Toggle-UI angefasst
- Existing Fixes (MEGA47/68/69/80) bleiben aktiv — Lib komplementiert, ersetzt nicht

---

## Pilot-Acceptance

✅ A.3 = **VERIFIED** wenn Marcel den 5-Schritt-Reproducer auf `app.html` AND `ortstermin-modus.html` durchläuft mit:
- Recording stoppt bei manueller Eingabe
- Mode-Badge zeigt aktuellen Status
- Audit-Trail-Eintrag pro Mode-Switch vorhanden

Bei FAIL → Logs prüfen: `console` sucht nach `[ProvaDiktatGuard]` (gibt aktuell keine Logs raus, aber Audit-Trail ist Source-of-Truth).
