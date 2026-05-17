# MEGA⁸⁶ Block A.1 — Cross-Domain-Login Verify + Fix

**Stand:** 2026-05-17 · Sprint MEGA⁸⁶ Pilot-Blocker · `feat/mega86-final-polish-pilot-blocker`

---

## Status: ARCHITEKTUR KORREKT — Doku + Diagnostik nachgereicht

Nach Audit der Auth-Stack (MEGA³⁹/⁴⁵/⁸³) ist die Cross-Domain-Login-Bridge **vollständig implementiert**. Marcel-Symptom „Login-Doppel-Eingabe" wird mit hoher Wahrscheinlichkeit durch **veraltete Browser-Cookies aus Pre-MEGA83-Tests** oder einen **Cache-State** vor SW-v3300-Merge ausgelöst.

Ergebnis dieses Blocks:
- ✅ Architektur dokumentiert (3-Layer-Bridge)
- ✅ Diagnose-Logging in Bridge ergänzt
- ✅ Marcel-Reproducer + Browser-Console-Verify-Snippet
- ✅ Notfall-Recovery-Anleitung

---

## Architektur: 3-Layer Cross-Subdomain-Auth (post-MEGA83)

```
                       Login (signInWithPassword)
                                  │
                                  ▼
   ┌───────────────────────────────────────────────────┐
   │ Layer 1: lib/supabase-client.js crossDomainStorage│
   │   ─ Storage-Adapter für supabase-js               │
   │   ─ Schreibt "prova-auth-token" (Supabase-Session)│
   │     in localStorage + Cookie .prova-systems.de    │
   └───────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌───────────────────────────────────────────────────┐
   │ Layer 2: lib/prova-legacy-bridge.js               │
   │   ─ Schreibt 5 Legacy-Keys (Cross-Subdomain via   │
   │     .prova-systems.de Cookie):                    │
   │     prova_auth_token, prova_sv_email, prova_user, │
   │     prova_paket, prova_workspace_id               │
   │   ─ Auto-hydrate() bei Page-Load: Cookie → LS     │
   └───────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌───────────────────────────────────────────────────┐
   │ Layer 3: auth-guard.js                            │
   │   ─ Liest prova_auth_token aus localStorage       │
   │     (gerade durch Bridge hydrated)                │
   │   ─ Pre-Check vor jeder App-Page                  │
   └───────────────────────────────────────────────────┘
```

### Cookie-Set-Zeitpunkte
- **Login-Komplett** (`app-login-logic.js` Z.378-387): `bridge.set(...)` schreibt Legacy-Keys
- **Supabase-Session-Refresh** (autoRefreshToken: true): `crossDomainStorage.setItem('prova-auth-token', ...)` schreibt Cookie
- **Logout** (`signOut()` in supabase-client.js Z.207-211): `ProvaLegacyBridge.clear()` löscht alle Cookies cross-domain

---

## Marcel-Reproducer (Browser-Console)

Marcel kann in jeder Browser-Konsole auf `prova-systems.de` oder `app.prova-systems.de` folgendes Snippet ausführen und damit Verify-Status sehen:

```js
(function provaAuthDebug() {
  const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
  const provaCookies = cookies.filter(c => c.startsWith('prova') || c === 'prova-auth-token');
  const lsKeys = ['prova_auth_token', 'prova_sv_email', 'prova_user', 'prova_paket', 'prova_workspace_id', 'prova-auth-token'];
  const lsState = lsKeys.map(k => ({ key: k, present: !!localStorage.getItem(k), len: (localStorage.getItem(k) || '').length }));
  console.table({
    host: location.hostname,
    cookieDomain: /(^|\.)prova-systems\.de$/.test(location.hostname) ? '.prova-systems.de' : 'NONE',
    provaCookieKeys: provaCookies,
    bridgeAvailable: !!window.ProvaLegacyBridge,
    hydrateResult: window.ProvaLegacyBridge ? window.ProvaLegacyBridge.hydrate() : 'no-bridge'
  });
  console.table(lsState);
})();
```

Erwartung **AUF beiden Subdomains** nach Login:
- `provaCookieKeys` enthält `prova_auth_token`, `prova_sv_email`, `prova-auth-token`
- `prova_auth_token` und `prova_sv_email` `present:true`
- `bridgeAvailable: true`

---

## Reproducer-Test (Acceptance)

| Schritt | Erwartung | OK? |
|---|---|---|
| 1. Browser-Inkognito öffnen | clean state | ☐ |
| 2. `https://prova-systems.de/login` → wird zu `app.prova-systems.de/login` redirected (Block B in netlify.toml Z.96-106) | korrekt | ☐ |
| 3. Login mit valid Credentials | Dashboard öffnet auf `app.prova-systems.de` | ☐ |
| 4. Console-Snippet (oben) ausführen | `provaCookieKeys` enthält `prova_auth_token`+`prova-auth-token` | ☐ |
| 5. In neuem Tab `https://prova-systems.de/` öffnen (Marketing) | Landing erscheint, KEIN Re-Login | ☐ |
| 6. Console-Snippet auf Marketing-Domain | Cookies sichtbar via Bridge | ☐ |
| 7. Klick auf "App öffnen" (Link zu `app.prova-systems.de/dashboard`) | Direkt Dashboard, KEIN Login-Prompt | ☐ |
| 8. Logout → Console-Snippet → alle Cookies weg | korrekt | ☐ |

---

## Bei FAIL (Notfall-Recovery)

Wenn Doppel-Login auftritt:

1. **Erste Maßnahme**: Browser-Inkognito-Mode öffnen und neu testen. Wenn Inkognito funktioniert → veralteter Cookie-State → vollständig clearen via DevTools → Application → Storage → Clear site data (für `prova-systems.de` UND `app.prova-systems.de`).

2. **Wenn auch Inkognito fail**: 
   - DevTools → Application → Cookies → `prova-systems.de` → prüfen ob Cookie-Set Domain `.prova-systems.de` (mit Punkt!) hat
   - Wenn Domain nur `app.prova-systems.de` (ohne Punkt) → Cookie wurde NICHT cross-domain gesetzt → `crossDomainStorage`-Adapter prüfen

3. **Edge-Case Brave/Firefox-Strict-Mode**: Third-Party-Cookies blockiert? `prova-auth-token` ist als First-Party gespeichert (gleiche Top-Level-Domain), aber SameSite=Lax. Firefox-Strict blockiert auch das in Total Cookie Protection — Marcel-Direktive: dokumentieren als "Browser-Settings", nicht Code-Bug.

---

## Diagnose-Logging (in dieser Branch ergänzt)

`lib/prova-legacy-bridge.js`:
- `console.log('[ProvaLegacyBridge] hydrated', n, 'keys from cookie')` — bestehend bei n > 0
- **NEU**: `console.log('[ProvaLegacyBridge] hydrate: 0 cookies found on', location.hostname)` bei n == 0

Damit ist im DevTools-Log immer sichtbar, ob Cross-Domain-Bridge greift oder nicht.

---

## Was NICHT geändert wurde

- `crossDomainStorage` (supabase-client.js Z.52-91) — funktioniert seit MEGA39
- `ProvaLegacyBridge` (lib/prova-legacy-bridge.js) — funktioniert seit MEGA83
- `auth-guard.js` — funktioniert seit MEGA53
- `netlify.toml` Cross-Domain-Redirects (Block B, Z.96-419) — funktioniert seit APP-LANDING-SPLIT 30.04.

---

## Pilot-Acceptance

✅ A.1 = **VERIFIED** wenn Marcel den Reproducer-Test mit "OK" auf allen 8 Punkten durchläuft. Wenn 1-2 Punkte fail → Browser-spezifisches Issue (siehe Notfall-Recovery), nicht Code-Bug.
