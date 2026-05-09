# Marcel — MEGA⁴⁶ Browser-Smoke-Test (~30 Min)

**Stand:** 2026-05-09 22:30 GMT+2 — nach MEGA⁴⁵-Login-Fix + MEGA⁴⁶-Cleanup
**Voraussetzung:** Netlify-Auto-Deploy nach `git push origin main` ist durch

---

## Setup

1. Browser: Chrome oder Firefox
2. **Inkognito-Tab** (frischer Cache)
3. F12 → **Console** + **Network** Tabs offen halten
4. Test-Account: dein eigener Marcel-Account

**Erwartete Console-Logs nach Page-Load:**
```
[edge-shim] active — rerouting /.netlify/functions/* → https://...
[ni-polyfill] active — netlifyIdentity → Supabase Auth
```

---

## Workflow A — Auth (5 Min)

### A1. Login
1. https://app.prova-systems.de/app-login.html
2. Email: `marcel.schreiber891@gmail.com` (oder marcel@prova-systems.de)
3. Passwort eingeben → "Anmelden"
4. **Erwartung:** Redirect zu `dashboard.html` (kein "Konto gesperrt")
5. **Console:** Kein roter Error
6. **Network:** Sehe `signInWithPassword` POST 200 zu `*.supabase.co/auth/v1/token`

**Falls 401:** Passwort falsch — Marcel-Hinweis nicht der Bug
**Falls 403 + "Konto gesperrt":** MEGA⁴⁵-Fix nicht aktiv — sw.js Cache leeren (Application → Storage → Clear)
**Falls Console-Error "netlifyIdentity is not defined":** Polyfill nicht geladen — sw.js Bump verifizieren

### A2. Logout + Re-Login
1. Auf Dashboard → User-Menu → Logout
2. **Erwartung:** Redirect zu Login, localStorage `prova_auth_token` leer
3. Sofort wieder Login → erneut Dashboard

---

## Workflow B — Dashboard (3 Min)

### B1. Dashboard-Render
1. https://app.prova-systems.de/dashboard.html
2. **Erwartung:** Begrüßung mit Marcel-Vorname
3. KPI-Boxen laden Werte (Aufträge, Fristen, KI-Tokens)
4. Fristen-Widget rechts zeigt kommende 7-Tage-Fristen

**Network-Tab:** sehe `dashboard-fristen-upcoming` 200 zu `*.supabase.co/functions/v1/`

### B2. Cookie-Banner
1. Falls Banner erscheint: "Alle akzeptieren"
2. **Network:** `cookie-consent-log` 200 (NICHT 400!)

---

## Workflow C — Akten (5 Min)

### C1. Aufträge-Liste
1. https://app.prova-systems.de/schadensfaelle.html
2. **Erwartung:** Liste lädt (auch wenn leer)
3. **Network:** `list-auftraege?typen=...` 200

**Falls leer:** OK — frischer Account
**Falls 500-Error:** `auftrag_typ`-Spalte-Mismatch (siehe MEGA46-Audit Section "Phase 1")

### C2. Neuer Auftrag (Wizard)
1. https://app.prova-systems.de/neuer-fall.html
2. Wizard-Schritte durchlaufen (Auftraggeber, Anschrift, Schadensfall)
3. "Speichern" am Ende
4. **Erwartung:** Redirect zu Akte-Detail

### C3. Demo-Akte erstellen
1. Dashboard → "Demo-Fall öffnen" Button
2. **Network:** `create-demo-akte` oder `onboarding-create-demo` 201
3. SCH-DEMO-001 erscheint in Akten-Liste

---

## Workflow D — Termine + Fristen (3 Min)

### D1. Fristen-Liste
1. https://app.prova-systems.de/fristen.html
2. **Network:** `fristen-list` 200

### D2. iCal-Export
1. Termine-Page → "iCal-Token holen" oder "Subscribe URL"
2. **Network:** `termine-ical-token` oder `ical-subscribe-url` 200

---

## Workflow E — KI-Pipeline (5 Min)

### E1. Diktat-Aufnahme (falls auf Mobile)
1. https://app.prova-systems.de/diktat-mobile.html
2. **Erwartung:** Mikrofon-Button funktional (Permission-Prompt)
3. Audio aufnehmen → Stop → "Transkribieren"
4. **Network:** `whisper-diktat` 200, transkribierter Text erscheint

### E2. KI-Konjunktiv-Check
1. In einer Akte → Stellungnahme schreiben → "KI Stufe 3 (Inhaltlich)"
2. **Network:** `ki-konsistenz-check` 200
3. Suggestions erscheinen

---

## Workflow F — PDF + Dokument (5 Min)

### F1. PDF-Generation
1. Akte → "Gutachten generieren" oder "PDF erstellen"
2. **Network:** `pdf-generate` oder `generate-pdf-mode-c` 200, returnt `pdf_url`
3. PDF öffnet im neuen Tab

### F2. DOCX-Export
1. Editor → "Als DOCX exportieren"
2. **Network:** `editor-docx-export` 200

### F3. Akte-ZIP
1. Akte → "Komplett-Export"
2. **Network:** `akte-export` 200

---

## Workflow G — Stripe (Nicht durchziehen!) (2 Min)

### G1. Pricing-Page
1. https://app.prova-systems.de/pricing.html
2. **Solo 179€ / Team 379€** sichtbar
3. Klick "Solo wählen" → Stripe-Checkout-Page öffnet
4. **NICHT** durchziehen — nur prüfen dass Page lädt
5. Schließe → zurück zu Pricing

**Network:** `stripe-checkout` 200, Response enthält `url` Field, Frontend redirected dorthin

---

## Workflow H — DSGVO (3 Min)

### H1. Daten-Export
1. https://app.prova-systems.de/dsgvo-mein-konto.html
2. "Meine Daten exportieren" → JSON-Download startet
3. **Network:** `dsgvo-portabilitaet` 200, `Content-Disposition: attachment; filename="prova-export-..."`

### H2. Re-Consent (falls neue Version)
1. Falls Modal "Neue Version der AGB" erscheint
2. Zustimmen
3. **Network:** `re-consent-submit` 201

---

## Workflow I — Admin-Cockpit (3 Min)

**Voraussetzung:** Marcel hat 2FA aktiviert in Supabase Dashboard → Auth → Users → Marcel → MFA → TOTP

### I1. Cockpit
1. https://admin.prova-systems.de oder https://app.prova-systems.de/admin-cockpit.html
2. Falls 403 mit "2FA-Pflicht" → in Supabase Auth MFA aktivieren, neu einloggen

### I2. KPI-Sektionen
- System Health: Alle Services grün
- MRR-Live: Zahl
- Funnel: Steps + %-Drops
- Sentry-Errors: Liste oder "configured: false"
- KI-Costs: Token+€

**Network:** je Sektion ein Edge-Call 200 zu `*.supabase.co/functions/v1/admin-*`

---

## Workflow J — Mobile (5 Min)

### J1. Responsive
1. F12 → Device-Toolbar → "iPhone 14 Pro" (393px)
2. Login → Dashboard → Burger-Menu klappt auf
3. Akten-Liste scrollbar

### J2. PWA-Install
1. Browser-Settings → "Zum Home-Bildschirm"
2. App-Icon erscheint, öffnet als Standalone

---

## ⚠ Bekannte Issues (Pre-Pilot)

### Legacy Airtable-Pages
Pages wie `mahnung-1.html`, `gericht-auftrag.html`, `vor-ort.html` rufen
Airtable direkt auf — funktionieren NICHT mehr. Pilot-User sollten nur die
Supabase-Suffix-Pages nutzen:
- `dashboard.html`, `auth-supabase.html`, `kontakte-supabase.html`,
  `profil-supabase.html`, `onboarding-supabase.html`, `schadensfaelle.html`

Andere Pages: Workaround — Marcel kann Demo-Daten manuell in Supabase
Dashboard → Table-Editor anlegen.

### Make.com-Webhooks
Support-Form (S8), Brief-Generator (K3) etc. laufen weiter via Make.
Pilot-User wissen nichts davon. Cutover in K-1.5.

### Admin-2FA Pflicht
Falls Admin-Cockpit 403 zeigt: 2FA in Supabase Dashboard aktivieren.
Quick-Fix: ENV `PROVA_ADMIN_REQUIRE_2FA=false` in Edge-Secrets setzen
(Marcel-Decision für Pilot-Phase).

---

## Erfolgs-Kriterium

✅ Workflow A (Login) — **PFLICHT**
✅ Workflow B (Dashboard) — **PFLICHT**
✅ Workflow C (Akten) — Fast pflicht (Demo-Akte funktioniert)
✅ Workflow F (PDF) — **PFLICHT** (Pilot-Wert ist Gutachten)
✅ Workflow I (Admin-Cockpit) — Soft (2FA-Setup separat)
🟡 Workflow E (KI) — Soft (kann nach Pilot-Start)
🟡 Workflow G (Stripe) — Soft (Pilot mit Founding-99 Coupon)
🟡 Workflow H (DSGVO) — Soft (Compliance, nicht Hauptfunktion)
🟡 Workflow J (Mobile) — Soft

**Falls alle PFLICHT-Workflows grün:** Pilot kann starten.

**Falls A oder B rot:** Stop, debug, kein Pilot bevor gefixt.

---

## Notfall-Recovery

### Edge-Shim-Probleme
```javascript
// In Browser-Console:
window.PROVA_EDGE_SHIM_DISABLED = true;
location.reload();
```
→ Fetches gehen wieder zu /.netlify/functions/ (broken da ENVs weg, aber
zumindest verstehen wir das Symptom).

### Polyfill-Probleme
```javascript
window.PROVA_NI_POLYFILL_DISABLED = true;
location.reload();
```
→ netlifyIdentity ist undefined, ReferenceErrors in legacy code.
Workaround: nur supabase-Pages nutzen.

### Service-Worker-Cache
```
F12 → Application → Service Workers → Unregister
F12 → Application → Storage → Clear site data
```
→ Forciert Reload des neuen sw.js + APP_SHELL.

### Logout-Stuck
```javascript
localStorage.clear();
sessionStorage.clear();
document.cookie.split(';').forEach(c => {
  document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/');
});
location.href = '/';
```
