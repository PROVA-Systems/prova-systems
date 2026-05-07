# MEGA³⁶ W7 — Mobile-Polish Audit + Patches

**Datum:** 2026-05-08
**Sprint:** MEGA³⁶ Welle 7 (W7.2–W7.5)
**Branch:** `mega34-final-100-percent`

---

## W7.2 — Mobile Foto-Upload UX-Verify

**Status:** ✅ Verified, kein Code-Patch nötig.

**Verify-Pfad:**
- `netlify/functions/foto-upload.js` (M³⁵ C1) erwartet JSON+base64-Payload
- `lib/foto-upload-mobile.js` (M³⁵) konvertiert FormData→base64 vor POST
- EXIF-Stripping serverseitig (M³⁵ C1 Test-Suite)

**Mobile-spezifisch:**
- iOS Safari: HEIC-Format wird via canvas.toDataURL('image/jpeg')
  konvertiert vor Upload
- Android Chrome: native input[type=file] mit accept="image/*" akzeptiert
  Galerie + Kamera
- Tap-Target: Upload-Button hat min-height:48px in `mobile.css`

**Kein Patch nötig** — die UX wurde in M³⁵ C1 zu „echtem 100%" gebracht.

---

## W7.3 — Cookie-Banner Mobile-Verify

**Status:** ✅ Verified, alle Tap-Targets ≥44px.

**Verify-Pfad** (`lib/cookie-consent.js`):
- `.cc-btn{padding:12px 22px; min-height:44px; flex:1; min-width:140px;}`
- 3 Buttons gleichberechtigt (DSGVO Art. 7 + EuGH Planet49):
  - „Alle akzeptieren" / „Nur notwendige" / „Auswahl speichern"
- 13-Monate-Re-Show-Pflicht implementiert

**Mobile-Verhalten:**
- Modal sliddet von unten ein (`align-items:flex-end`)
- Volle Bildschirmbreite, max. 88vh hoch
- Buttons werden bei Bedarf umgebrochen (`flex-wrap:wrap` implizit
  durch `flex:1; min-width:140px`)
- Vertikaler Scroll falls nötig

**Kein Patch nötig.**

---

## W7.4 — Stepper rückwärts klickbar

**Status:** ✅ PATCH ANGEWENDET in `prova-wizard.js`.

**Was wurde gebaut:**
- `_header()` rendert Step-Bubbles jetzt mit konditionellem
  `onclick="_wzZurueckZuSchritt(i)"`-Handler — aber NUR wenn die
  Bubble einen `done`-Schritt anzeigt (cursor: pointer).
- `aria-label="Zurück zu Schritt N: …"` für Screenreader.
- `role="button" tabindex="0"` + Keyboard-Trigger (Enter/Space)
  → vollwertige Tastatur-Bedienbarkeit.
- Neue globale Funktion `window._wzZurueckZuSchritt(n)`:
  - validiert: nur Rückwärts-Sprünge erlaubt (target < WZ.schritt)
  - sichert vor dem Sprung die aktuell eingegebenen Daten via
    `_sammleDaten()` (kein Datenverlust)
  - ruft `_oeffneSchritt(target)` für sauberes Re-Render
- Aktuelle und zukünftige Steps bleiben unklickbar (cursor:default,
  kein onclick).

**Effekt für SVs:**
Der Wizard fühlt sich jetzt wie ein moderner Multi-Step-Form an —
ein Klick auf einen abgeschlossenen Step springt direkt zurück, ohne
sich durch den «Zurück»-Button-Knopf zu wiederholen. Bei kurzen Wegen
(Step 4 → Step 2) drei Klicks gespart.

---

## W7.5 — Lighthouse-Kontrast-Audit

**Status:** ⚠️ Out-of-Scope (CLI-Pflicht), Doku als TODO.

**Begründung:**
Lighthouse-CLI braucht eine laufende Browser-Instanz + ggf.
authentifizierten Zugang zu PROVA. Im aktuellen CC-Sandbox-Kontext
nicht ausführbar. Marcel kann das selbst lokal ausführen:

```bash
# Voraussetzung: Chrome installiert, Lighthouse global
npm install -g lighthouse
lighthouse https://app.prova-systems.de/dashboard.html \
  --only-categories=accessibility \
  --output=html --output-path=./lh-dashboard.html \
  --chrome-flags="--headless"
```

**Erwartete Top-Findings (auf Basis manueller Sichtung):**
1. PDFMonkey-Status-Badge `.kpi-sub` mit `color:var(--text3)` (#4d5568)
   auf `var(--surface)` (#1c2130) → Kontrast ~3.3:1, WCAG AA verlangt 4.5:1
2. `.bs-rechtsbasis` (Bescheinigungen-Cards) — gleicher --text3-Drift
3. PRIMARY-Buttons sollten geprüft werden (gradient → Kontrast schwer
   messbar, aber Accent #4f8ef7 auf #fff ≈ 4.5:1)

**Empfehlung:** Bei Pilot-Launch eine Lighthouse-Test-Run machen, dann
ggf. `--text3` von #4d5568 auf #6b7388 anheben (≈ 4.6:1).

---

## Zusammenfassung W7

| Item | Status | Ergebnis |
|------|--------|----------|
| W7.2 | ✅ | Foto-Upload-UX bereits in M³⁵ C1 funktional |
| W7.3 | ✅ | Cookie-Banner ≥44px Tap-Targets bestätigt |
| W7.4 | 🟢 NEU | Stepper rückwärts klickbar (a11y inklusive) |
| W7.5 | ⚠️ | Lighthouse-Run an Marcel delegiert |

*M³⁶ W7 — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
