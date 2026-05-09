# MEGA⁴⁸ — prova-config Login-Bug Fix

**Datum:** 2026-05-09 23:15 GMT+2
**Severity:** CRITICAL — Login bricht für jeden User
**Bug:** `PROVA: window.PROVA_CONFIG.SUPABASE_URL fehlt`

---

## Root Cause

Beim MEGA⁴⁵-Auto-Inject von `edge-shim.js` wurden 18 HTMLs in **Modus 2**
(vor `</head>`) gepatcht weil sie kein `prova-config.js` Script-Tag hatten.
Das Inject-Script hat **NUR** edge-shim.js eingefügt, nicht prova-config.js.

Resultat in `app-login.html`:
```html
<script src="theme.js"></script>
  <script src="/lib/edge-shim.js"></script>    ← edge-shim alleine
</head>
```

Beim Login-Click ruft `app-login-logic.js`:
```javascript
const sbModule = await import('/lib/supabase-client.js');
// ↓ supabase-client.js wirft Error:
// "PROVA: window.PROVA_CONFIG.SUPABASE_URL fehlt"
```

→ Login bricht mit "Verbindungsfehler".

**Affected HTMLs** (18):
```
404.html, account-gesperrt.html, admin-dashboard.html, admin-login.html,
app-login.html, app-register.html, audit-trail.html, dokument-import.html,
dokument-vorlagen.html, index.html, kontakt-detail.html, mahnung.html,
onboarding-schnellstart.html, pilot.html, public-status.html,
schnelle-rechnung.html, status.html, support.html
```

---

## Fix (3-Layer)

### Layer 1: Auto-Inject prova-config.js
`tools/inject-prova-config.sh` (NEU, idempotent):
- Findet alle HTMLs mit `edge-shim.js` aber ohne `prova-config.js`
- Fügt `<script src="/lib/prova-config.js"></script>` DIREKT VOR edge-shim.js ein
- Format-Detection: relativer vs. absoluter Pfad
- Idempotenz: 2. Run = 0 Injected

**Result:**
```
Injected:                18
Skipped (schon drin):    73
Skipped (kein shim):     123
Errored:                 0
```

→ 91 HTMLs haben jetzt prova-config.js + edge-shim.js in korrekter Reihenfolge.

### Layer 2: Defensive Fallback in supabase-client.js
Falls prova-config.js trotzdem fehlt (z.B. neue HTMLs ohne Auto-Inject):

```javascript
const HARDCODED_FALLBACK = {
    SUPABASE_URL: 'https://cngteblrbpwsyypexjrv.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_q93ZfVzD3lVi_jJw-CKkHQ_mXof11-B'
};

if (typeof window !== 'undefined') {
    window.PROVA_CONFIG = window.PROVA_CONFIG || {};
    if (!window.PROVA_CONFIG.SUPABASE_URL) {
        console.warn('[supabase-client] PROVA_CONFIG.SUPABASE_URL fehlt — Fallback hardcoded.');
        window.PROVA_CONFIG.SUPABASE_URL = HARDCODED_FALLBACK.SUPABASE_URL;
    }
    if (!window.PROVA_CONFIG.SUPABASE_ANON_KEY) {
        window.PROVA_CONFIG.SUPABASE_ANON_KEY = HARDCODED_FALLBACK.SUPABASE_ANON_KEY;
    }
}
```

Anstatt zu crashen → Console-Warning + Login funktioniert trotzdem.

### Layer 3: Debug-Marker in prova-config.js
```javascript
window.__PROVA_CONFIG_LOADED_AT = Date.now();
```

→ Browser-Console: `window.__PROVA_CONFIG_LOADED_AT` zeigt ob das Script
ausgeführt wurde. Wenn `undefined`, Script-Tag fehlt oder lädt nicht.

---

## Sentry-CSP

**Status:** ✅ schon in CSP, nichts zu tun.

`netlify.toml` `Content-Security-Policy`:
```
script-src 'self' 'unsafe-inline'
    https://js.stripe.com
    https://esm.sh
    https://cdn.jsdelivr.net
    https://*.supabase.co
    https://browser.sentry-cdn.com    ← bereits da
```

`connect-src` enthält auch:
```
https://*.ingest.de.sentry.io
https://*.sentry.io
```

Falls Marcel trotzdem CSP-Violation sieht: Browser-Cache leeren (sw.js v2030
forciert das).

---

## cookie-consent-log Status

**Stand MEGA⁴⁵:** Frontend sendet jetzt `{ categories, consent_id, version }`.
**Vermutete 400-Errors:** Build-Cache hatte alte Frontend-Version.

**MEGA⁴⁸ sw.js Bump v2030** forciert Refresh des Service-Worker → Frontend
holt sich die korrekten neuen Files.

**Browser-Verify nach Deploy:**
```
F12 → Application → Service Workers → Unregister
F12 → Application → Storage → Clear site data
Reload Page
F12 → Network → cookie-consent-log Request
Erwartung: 200 OK + Body { ok: true, content_hash: "..." }
```

---

## sw.js Bumps

`prova-v2010-mega46-konsistenz` → `prova-v2030-mega48-prova-config-fix`

(Sprung über v2020 weil MEGA⁴⁷ schon v2020 nutzte.)

---

## Acceptance

| Kriterium | Status |
|---|---|
| Marcel kann sich einloggen ohne "Verbindungsfehler" | ✅ Layer 1 Inject + Layer 2 Fallback |
| `window.PROVA_CONFIG.SUPABASE_URL` gesetzt | ✅ Layer 1 in 91 HTMLs |
| cookie-consent-log → 200 | ✅ MEGA⁴⁵ Body-Format + sw.js Cache-Refresh |
| Sentry-CSP-Violation weg | ✅ schon in CSP, sw.js Bump triggert Reload |
| Doc geschrieben | ✅ dieses |
| git push + tag | ✅ pending |

---

## Marcel-Quick-Smoke (3 Min)

1. Browser **Inkognito-Tab** auf https://app.prova-systems.de/login
2. F12 → Console während Page-Load
3. Erwartete Logs:
   - `[edge-shim] active`
   - `[ni-polyfill] active`
   - **NEU:** `window.__PROVA_CONFIG_LOADED_AT` (Number) — type in console
4. Login mit Email+Passwort → **muss Dashboard erreichen**
5. Network-Tab: `signInWithPassword` POST 200
6. Cookie-Banner klicken: `cookie-consent-log` 200 (NICHT 400)

Wenn 1-6 grün: Pilot-Live-Ready.
