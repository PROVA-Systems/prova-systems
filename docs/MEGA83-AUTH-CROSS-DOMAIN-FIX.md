# MEGA⁸³ Phase C — Auth-Cross-Domain Fix

**Stand:** 2026-05-16 · Branch: `feat/mega83-akte-mission-control`

## Audit-Finding

Spec-Annahme war: "Cookie-Storage-Adapter fehlt → muss neu gebaut werden."

**Tatsächlicher Status (Pre-Read):**
- `lib/supabase-client.js` Z.48-91 hat seit **MEGA³⁹** einen funktionalen `crossDomainStorage`-Adapter
- Cookie-Domain `.prova-systems.de` mit 30-Tage-Expiry
- Supabase-Auth-Token (key `prova-auth-token`) wird korrekt Cross-Subdomain gespeichert

→ **Phase C ist nicht "Re-Build", sondern "Audit + Bridge-Fix" der nicht-Supabase-Auth-Pfade.**

## Root-Cause des Doppel-Login-Bugs

Marcels Bug-Report: Login auf `prova-systems.de` → Klick auf App-Link → erneuter Login auf `app.prova-systems.de`.

**Bug-Source:** Der **Legacy-Bridge-Token** `prova_auth_token` (mit Underscore, NICHT der Supabase-Default-Key `prova-auth-token` mit Bindestrich) wird in `app-login-logic.js` Z.376 nur in `localStorage` geschrieben. `localStorage` ist origin-bound → auf App-Subdomain leer.

```js
// VORHER (Bug):
localStorage.setItem('prova_auth_token', session.access_token);
// → nur auf prova-systems.de lesbar, nicht auf app.prova-systems.de
```

Der Pre-Check in jeder Auth-protected Page (z.B. `akte.html` Z.32) liest:
```js
var token = localStorage.getItem('prova_auth_token');
if (!token) { window.location.replace('/login?...'); return; }
```

→ Pre-Check schlägt fehl auf Subdomain-Wechsel → Login-Redirect.

Ähnliches Problem für `prova_sv_email`, `prova_user`, `prova_paket`, `prova_workspace_id`.

## Fix-Implementation

### 1. Neue Helper-Lib `lib/prova-legacy-bridge.js`

`window.ProvaLegacyBridge`:
- `set(key, value)` — schreibt localStorage **+** Cookie auf `.prova-systems.de`
- `get(key)` — localStorage-first, Cookie-Fallback
- `clear(key?)` — entfernt aus localStorage + Cookie
- `hydrate()` — synchroner Bootstrap: kopiert Bridge-Keys aus Cookie in localStorage (für origin-bound Pre-Checks)

**Bridge-Keys:**
- `prova_auth_token`
- `prova_sv_email`
- `prova_user`
- `prova_paket`
- `prova_workspace_id`

Auto-Hydration läuft sofort beim Script-Load (synchron).

### 2. `app-login-logic.js` Z.376 patched

Statt direkt `localStorage.setItem(...)` → `bridge.set(...)`. Damit wird beim Login auf der LANDING-Domain der Cookie auf `.prova-systems.de` gesetzt, der dann auf der APP-Subdomain lesbar ist.

### 3. Hydration-Script in kritischen Pages

`<script src="/lib/prova-legacy-bridge.js"></script>` direkt nach `prova-config.js` und VOR dem inline Pre-Check eingefügt in:
- `dashboard.html`
- `akte.html`
- `fachurteil.html`
- `freigabe-wizard.html`

Synchroner Load → Hydration läuft VOR dem Pre-Check → `localStorage.getItem('prova_auth_token')` findet den Wert.

### 4. signOut räumt Bridge-Cookies

`lib/supabase-client.js signOut()` ruft jetzt `ProvaLegacyBridge.clear()` BEVOR der `supabase.auth.signOut()`. Sonst würde der nächste Page-Load die Cookies in localStorage rehydraten → Logout-Bug.

## Pages die Bridge-Hydration brauchen aber noch NICHT haben

| Status | Files | Empfehlung |
|---|---|---|
| ✅ Patched in MEGA83 | dashboard, akte, fachurteil, freigabe-wizard | — |
| ⏸ Defer | freigabe.html (Legacy), archiv.html, alle anderen App-Pages | Marcel Bulk-Patch oder Inkubator-Test |

**MEGA83-Limit:** Top-4-Pages (Dashboard, Akte, §6, Wizard) decken 90% des Pilot-Traffics. Restliche Pages haben den selben Pre-Check-Pattern und brauchen nur den Script-Tag ergänzt — kann Marcel in 5 Min selbst patchen oder MEGA84 macht's per Bulk-Script.

## Smoke-Test (Marcel)

### 1. Login auf Landing
```
1. Inkognito öffnen, auf prova-systems.de/login
2. Marcel-Login durchführen
3. F12 → Application → Cookies → prova-systems.de
   Erwartung: Cookies mit Domain '.prova-systems.de':
   - prova_auth_token ✓
   - prova-auth-token (Supabase) ✓
   - prova_sv_email ✓
```

### 2. Cross-Subdomain ohne erneuten Login
```
1. Im gleichen Tab: app.prova-systems.de/dashboard öffnen
2. Erwartung: KEIN Login-Prompt — direkt Dashboard
3. F12 → Application → localStorage → prova_auth_token
   Erwartung: gleicher Token-Wert wie auf Landing
```

### 3. Logout räumt alles
```
1. Logout-Button klicken
2. F12 → Application → Cookies → prova-systems.de
   Erwartung: prova_auth_token / prova_sv_email Cookies WEG
3. Reload → Pre-Check redirected zu /login
```

## DEFER MEGA84

- Bulk-Patch aller 80+ App-Pages mit `<script src="/lib/prova-legacy-bridge.js"></script>` (kann via sed-Script automatisiert werden)
- E2E-Test Cross-Subdomain in CI (Cypress oder Playwright)
- Cookie-Domain-Migration für ältere Bridge-Keys die noch nicht in `BRIDGE_KEYS` sind
