# LOGIN-LOOP — Architektur-Lösung

**Datum:** 01.05.2026 mittag
**Status:** ROOT-CAUSE identifiziert · KEIN Fix angewendet (wartet auf Marcel-Freigabe)
**Vorgänger:** `docs/diagnose/LOGIN-REDIRECT-BUG.md` (Symptom 1: Test-Page-Default — gefixt mit Hotfix v246)

---

## TL;DR

**Der Loop hat NICHTS mit Race-Conditions oder Pfad A zu tun** (Hotfix v247 hat Pfad A korrekt deaktiviert). Die wahre Ursache: **`dashboard.html` und alle anderen Sidebar-Pages laufen weiterhin auf dem Legacy-Auth-Stack** und kennen keine Supabase-Sessions. Nach Supabase-Login werden die Legacy-Auth-Keys (`prova_auth_token`, `prova_sv_email`, `prova_user`) **nie gesetzt** — also schickt der Legacy-Inline-Guard auf jeder Page den gerade frisch eingeloggten User sofort zurück zu `app-login.html` → `/login`. Dort wird (weil neu eingeloggt) wieder zu `/dashboard` navigiert. Endlos-Loop.

**Fehlende Brücke** zwischen Supabase-Auth (neu) und Legacy-HMAC-Token-Auth (alt). Die Brücke fehlt seit Phase-3-Cutover.

---

## Root-Cause (vollständig)

### Architektur-Stand nach Phase 4 Cutover

| Stack | Login-Page | Storage-Keys | Verifikation | Genutzt von |
|---|---|---|---|---|
| **Legacy** (vor Cutover) | `app-login.html` | `prova_auth_token` (Underscore, HMAC), `prova_user`, `prova_sv_email`, `prova_session_v2` | `auth-guard.js` (root) `provaAuthGuard()` — checkt HMAC-Token Format + exp | **alle Hybrid-Pages**: dashboard, archiv, akte, app, briefe, kontakte, einstellungen, etc. (~52 Pages, „YELLOW" in CUTOVER-INVENTORY) |
| **Supabase** (nach Cutover) | `login.html` | `prova-auth-token` (Bindestrich, Supabase-SDK-Default mit `storageKey`-Override) | `lib/auth-guard.js` `runAuthGuard()` — checkt via `supabase.auth.getSession()` | **GREEN-Pages**: profil-supabase, kontakte-supabase, briefe, gutachterliche-stellungnahme, login, onboarding-supabase |

**Naming-Konflikt:** Legacy nutzt `prova_auth_token` (Underscore), Supabase-SDK schreibt `prova-auth-token` (Bindestrich). Beide existieren parallel in localStorage, aber die Hybrid-Pages prüfen NUR die Underscore-Variante.

### Bug-Kette (vollständige Loop-Trace)

```
Marcel öffnet /dashboard (Browser, Inkognito)
   ↓
dashboard.html lädt
   ↓
Zeile 17: <script src="auth-guard.js">  ← LEGACY-Auth-Guard
Zeile 19-42: Inline-IIFE-Guard prüft synchron:
   1. typeof provaAuthGuard === 'function'  →  ✓ (Script ist geladen)
   2. provaAuthGuard({silent:true})  →  liest localStorage.prova_auth_token
                                       Token fehlt (Marcel hat Supabase-Login, kein HMAC)
                                       returns false
   3. localStorage.getItem('prova_sv_email')  →  '' (auch leer)
   ↓
window.location.replace('app-login.html')
   ↓
/app-login.html → netlify.toml [[redirects]] (Block A) → 301 → https://app.prova-systems.de/login
   ↓
/login → _redirects (?) → /login.html (rewrite via netlify.toml Block C-pre)
   ↓
login.html lädt
   ↓
<script type="module" src="/auth-supabase-logic.js">
   ↓
auth-supabase-logic.js DOMContentLoaded:
   - Pfad A (v247): Session erkannt → console.log nur, KEIN Redirect ✓ (Hotfix-2 OK)
   - Form wird gerendert
   ↓
USER tippt Login-Daten + submit
   ↓
handleLogin() → supabase.auth.signInWithPassword() → erfolgreich
Supabase schreibt Session in localStorage unter Key 'prova-auth-token' (BINDESTRICH)
   ↓
Pfad B (Zeile 121-125):
   const next = params.get('next') || '/dashboard';   // next = '/dashboard'
   window.location.href = '/dashboard';
   ↓
Browser navigiert zu /dashboard
   ↓
GOTO Schritt 1 — LOOP, weil Legacy-Auth-Keys (Underscore!) nach wie vor leer sind
```

**Kein Service-Worker-Cache-Problem.** Auch frisches Inkognito reproduziert. Auch Hotfix v247 löst es nicht — es geht NICHT um Pfad A in `auth-supabase-logic.js`, sondern um die fehlende Brücke zu Legacy-Pages.

### Warum das Phase-4-Smoke-Test (15/15 PASS) übersehen hat

`scripts/smoke-test-cutover.sh` testet ausschließlich HTTP-Status-Codes (200/301/302) auf URL-Ebene. Es:
- ❌ logt sich nicht ein
- ❌ rendert keine Pages
- ❌ prüft kein localStorage / keine JS-Auth-Logik

Cross-Domain-Routing funktioniert auf HTTP-Level — aber Page-Render-Phase mit Auth-Guard-Verkettung wird nicht abgedeckt. **Smoke-Test sollte ergänzt werden um Headless-Login-Test** (Folge-Sprint).

### Warum es vor Phase 4 funktioniert hat

Vor APP-LANDING-SPLIT lief der Login über `app-login.html` + `app-login-logic.js`. Der Legacy-Logic-File (Zeile 119-129 von app-login-logic.js) **schreibt explizit alle 4 Legacy-Keys** nach erfolgreichem Login:

```js
localStorage.setItem('prova_auth_token', data.token);  // HMAC-Token vom Server
localStorage.setItem('prova_user', JSON.stringify({...}));
localStorage.setItem('prova_sv_email', resolvedEmail);
```

Daher konnte dashboard.html den User durchwinken. **Phase 4 hat den Login auf Supabase umgestellt — aber die Legacy-Page-Erwartungen nicht migriert.** Das war der Cutover-Block-3-Sprint, der noch nicht stattgefunden hat (alle Pages sind „YELLOW" laut CUTOVER-INVENTORY).

---

## Lösungs-Ansätze (drei Optionen)

### Option A — Hybrid Auth-Guard erweitern

`auth-guard.js` (Legacy, root) so umbauen dass `isValidSession()` ZUERST Supabase-Session prüft:
- Wenn Supabase-Session aktiv → return true + Legacy-Keys auto-fill
- Sonst Legacy-HMAC-Check wie bisher

**Pro:** Eingriff in 1 File. Keine API-Änderung.
**Contra:** auth-guard.js wird hybrid-komplex. Bei Cutover Block 3 muss man dieses File komplett ersetzen, nicht nur entfernen. Synchroner Check auf asynchrone Supabase-Session ist tricky (Supabase persistSession ist sync via localStorage, aber valid-token-check ist async).

### Option B — Legacy-Pages auf Supabase migrieren (Cutover Block 3 vorziehen)

Alle Sidebar-Pages bekommen statt Legacy-Auth-Stack den neuen lib/auth-guard.js. Inline-Guards weg, `<script src="auth-guard.js">` weg, durch ESM-Import ersetzen.

**Pro:** Architektonisch sauber. Kein Hybrid-Code mehr.
**Contra:** Großer Sprint (~12h für 50+ Pages). Marcel ist JETZT eingesperrt — Option B braucht zu lang.

### Option C — Bridge-Layer in `auth-supabase-logic.js` ⭐ EMPFOHLEN

Nach erfolgreichem Supabase-Login (handleLogin/handleSignUp) **die Legacy-Keys mitschreiben** als „faked but format-valid" Token. Symmetrisch beim Logout: Legacy-Keys mitclearen.

Schlüssel-Erkenntnis: `auth-guard.js` Zeile 32-49 (`verifyProvaToken`) checkt **client-seitig nur Format + exp + sub** — NICHT die HMAC-Signature (das ist server-side). Wir können einen format-validen Token schreiben ohne echte Server-HMAC:

```js
// Bridge-Token nach Supabase-Login
const payload = {
  sub: data.user.email,
  exp: Math.floor(Date.now()/1000) + 24*3600,   // 24h gültig
  iat: Math.floor(Date.now()/1000),
  source: 'supabase-bridge'                     // Marker für Debugging
};
const headerB64 = btoa(JSON.stringify(payload))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const bridgeToken = headerB64 + '.bridge-supabase-' + data.user.id;
localStorage.setItem('prova_auth_token', bridgeToken);
localStorage.setItem('prova_sv_email', data.user.email);
localStorage.setItem('prova_user', JSON.stringify({
  email: data.user.email,
  id: data.user.id,
  bridge: true
}));
localStorage.setItem('prova_last_activity', String(Date.now()));
```

**Pro:** Eingriff in 2-3 Files. Hotfix-grad. Marcel ist sofort entsperrt. Hybrid-Pages laufen, weil Legacy-Guard durch `verifyProvaToken` durchfindet.
**Contra:**
- Bridge-Token ist client-side gültig, aber server-side (Netlify Functions, die HMAC-Verify machen) wird er failen → Legacy-API-Calls von Hybrid-Pages liefern 401. **Aber** das ist akzeptabel: Edge Functions (X3, X4) nutzen Supabase-JWT, nicht den HMAC-Token. Legacy-API-Endpunkte sind im Cutover ohnehin auf dem Weg raus.
- Bridge-Token muss bei Token-Refresh oder Logout sauber clearen.

**Empfehlung: Option C als Hotfix JETZT, Option B als Folge-Sprint binnen 1-2 Wochen.**

---

## Vorgeschlagene Implementation (Option C)

### Files-Liste

| Datei | Änderung | Risiko |
|---|---|---|
| `auth-supabase-logic.js` | + Bridge-Helper-Function `_writeBridgeKeys(user)` <br> + Aufruf nach handleLogin Erfolg <br> + Aufruf nach handleSignUp Erfolg <br> + **Anti-Loop-Guard** in Path B (s.u.) | mittel |
| `lib/supabase-client.js` | `signOut()` → zusätzlich Legacy-Keys clearen (`prova_auth_token`, `prova_sv_email`, `prova_user`, `prova_session_v2`) | niedrig |
| `sw.js` | CACHE_VERSION v247 → v248 | niedrig |
| `docs/diagnose/LOGIN-LOOP-SOLUTION.md` | Diese Datei mit committen | niedrig |

**KEIN Eingriff** in `lib/auth-guard.js`, `auth-guard.js` (Legacy, root), `dashboard.html`, oder anderen Hybrid-Pages. Die Bridge wirkt transparent.

### Anti-Loop-Belt-and-Suspenders

Zusätzlich in `auth-supabase-logic.js` Path B + Pfad A (deaktiviert) ein **Loop-Counter** im `sessionStorage` einbauen, der bei mehr als N (z.B. 5) Redirects in 30 Sekunden eine Fehlermeldung anzeigt statt weiter zu navigieren:

```js
function _detectAndBreakLoop(targetUrl) {
  try {
    const key = 'prova-login-redirect-counter';
    const stamp = 'prova-login-redirect-stamp';
    const now = Date.now();
    const lastStamp = parseInt(sessionStorage.getItem(stamp) || '0', 10);
    if (now - lastStamp > 30_000) {
      sessionStorage.setItem(key, '0');
    }
    sessionStorage.setItem(stamp, String(now));
    const count = parseInt(sessionStorage.getItem(key) || '0', 10) + 1;
    sessionStorage.setItem(key, String(count));
    if (count > 5) {
      console.error('[auth] LOOP detected — refusing to redirect to', targetUrl);
      showError('Login-Loop erkannt. Bitte Browser-Daten löschen oder Inkognito-Tab nutzen.');
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(stamp);
      return false;   // Caller: do NOT navigate
    }
    return true;
  } catch (e) {
    return true;   // sessionStorage failed — don't block
  }
}
```

Reset des Counters bei `lib/auth-guard.js` `runAuthGuard()` wenn Session OK (Page rendert erfolgreich, kein Loop).

### Anti-Loop in Path B selbst

Der `next=`-Parameter darf nicht zur Login-Page selbst verweisen (sonst Endlos-Submit-Loop):

```js
// Path B (Zeile 121-125)
const params = new URLSearchParams(window.location.search);
let next = params.get('next') || '/dashboard';
if (next === '/login' || next.startsWith('/login?') || next === '/auth-supabase.html') {
  console.warn('[auth] next= points to login page — using /dashboard instead');
  next = '/dashboard';
}
if (_detectAndBreakLoop(next)) {
  window.location.href = next;
}
```

---

## Test-Strategie

### Phase A — Pre-Deploy Smoke

```bash
node --check auth-supabase-logic.js
node --check lib/supabase-client.js
node --check sw.js
```

### Phase B — Live-Test (Marcel-manuell, nach Deploy)

1. **Hard-Reset des Browsers:**
   ```js
   // DevTools-Console auf app.prova-systems.de
   localStorage.clear();
   sessionStorage.clear();
   // DevTools → Application → Service Workers → Unregister
   ```

2. **Inkognito-Tab** öffnen → `https://app.prova-systems.de/dashboard`
   - Erwartung: Single redirect zu `/login?next=%2Fdashboard`
   - **Page stabil**, kein Flackern

3. **Login** mit `marcel.schreiber@prova-systems.de`
   - Erwartung: Single redirect zu `/dashboard`
   - **Page stabil**, Legacy-Inline-Guard akzeptiert Bridge-Token

4. **DevTools → Application → Local Storage → app.prova-systems.de** prüfen:
   - `prova-auth-token` (Bindestrich, Supabase) ✓ vorhanden
   - `prova_auth_token` (Underscore, Bridge) ✓ vorhanden, mit `bridge-supabase-`-Suffix
   - `prova_sv_email` ✓ vorhanden, = User-Email
   - `prova_user` ✓ vorhanden, JSON mit `bridge: true`

5. **Edge-Cases:**
   - Bereits eingeloggt + direkt `/login` → kein Auto-Redirect (Hotfix v247) → Form sichtbar → Bridge bleibt funktional
   - Logout-Button auf einer Hybrid-Page (z.B. einstellungen.html) → Legacy-Keys + Supabase-Session werden gemeinsam gecleart
   - Refresh auf `/dashboard` nach Login → Page lädt stabil ohne Redirect

6. **Loop-Detection-Test (manueller Trigger):**
   - LocalStorage manuell „prova-login-redirect-counter" auf 6 setzen
   - `/dashboard` aufrufen
   - Erwartung: Fehlermeldung „Login-Loop erkannt" statt Endlos-Redirect

### Phase C — Headless-Login-Test (Folge-Sprint, nicht Teil dieser Lösung)

Smoke-Test um Playwright-Login-Flow erweitern:
- Login per Form
- Dashboard-URL erreichen
- Element-Sichtbarkeit prüfen (z.B. „Zentrale"-Headline)
- Bei Loop: Test-Failure mit URL-History

---

## Rollback-Strategie

Falls die Bridge-Lösung neue Probleme erzeugt:

```bash
# Option 1 — Revert nur den Bridge-Hotfix
git revert <hotfix-commit-sha>
git push origin main

# Option 2 — Rollback auf Pre-Hotfix-1 Stand (BREITER)
git revert -m 1 a418b37 aa34570 <hotfix-3-merge-sha>
# Login-Default zurück auf /tools/test-supabase-login.html
# (User landen auf Test-Page nach Login, aber kein Loop)
```

**Notfall-Workaround für Marcel persönlich** (falls Hotfix scheitert):
```js
// In DevTools-Console nach Supabase-Login manuell ausführen:
const email = 'marcel.schreiber@prova-systems.de';
const payload = { sub: email, exp: Math.floor(Date.now()/1000) + 86400 };
const b64 = btoa(JSON.stringify(payload)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
localStorage.setItem('prova_auth_token', b64 + '.manual-bridge');
localStorage.setItem('prova_sv_email', email);
localStorage.setItem('prova_user', JSON.stringify({email, id:'manual'}));
location.href = '/dashboard';
```

Marcel kann das einmalig in seinem Tab ausführen — dann läuft die App ohne Cutover-Migration.

---

## Risiko-Bewertung

| Bereich | Risiko | Mitigation |
|---|---|---|
| Bridge-Token client-side gültig, server-side ungültig | **mittel** | Edge Functions (X3, X4, Supabase-JWT-Bearer) nicht betroffen. Legacy-Functions (HMAC-Verify) werden 401 — aber Hybrid-Pages rufen ohnehin Supabase-Edge-Functions auf, nicht alte HMAC-Endpunkte. Falls einzelner Endpunkt 401, nicht-blocker (Marcel meldet pro Page). |
| Logout aus Hybrid-Page (z.B. nav.js `provaSbLogout`) | **niedrig** | nav.js nutzt schon `window.PROVA_DEBUG.supabase.auth.signOut()` (mit Plus Legacy-Clear). Bridge-Clear in `signOut()` von supabase-client.js ergänzt — Logout ist symmetrisch. |
| Auto-Redirect in altem Service-Worker (v246, v247) | **niedrig** | sw.js Bump auf v248 invalidiert Cache. Plus Hotfix-2 hat Pfad A bereits killed. |
| Bridge-Token Expiry vs. Supabase-Token-Refresh | **mittel** | Bridge-Token läuft nach 24h ab. Supabase refresht autonom alle ~1h. Bei Token-Refresh-Event in Supabase-Client neu schreiben (über `onAuthStateChange` Listener, separater Patch). |
| Anti-Loop-Counter blockiert legitime Navigation | **niedrig** | 5 Redirects in 30s ist hoher Threshold. Reset bei `runAuthGuard` Page-Render-OK. |

---

## Empfehlung

**JETZT:** Option C Bridge-Layer als Hotfix `fix/login-loop-permanent` durchziehen.
- Aufwand: ~30 Min Code, ~10 Min Test
- Marcel ist nach Deploy sofort entsperrt
- Pages funktionieren weiter

**FOLGE-SPRINT (nächste 1-2 Wochen):** Option B Cutover-Block-3 — Hybrid-Pages auf Supabase-Stack migrieren.
- Aufwand: ~12h für ~50 Pages
- Bridge wird obsolet, kann entfernt werden
- Architektur-Hygiene wiederhergestellt

**Smoke-Test-Ergänzung:** `scripts/smoke-test-cutover.sh` um Playwright-Login-Flow erweitern (separater Sprint).

---

## Marcel-Frage

**Soll ich Phase 3 (Implementation Option C Bridge) starten?**

Konkret würde ich machen:
1. Branch `fix/login-loop-permanent` von main
2. Bridge-Helper in `auth-supabase-logic.js` (handleLogin + handleSignUp)
3. Anti-Loop-Counter in Path B
4. Legacy-Clear in `lib/supabase-client.js signOut()`
5. sw.js v247 → v248
6. Diagnose-Doc + diese Solution-Doc mit-committen
7. Push, Smoke-Test (15/15 PASS muss bleiben)
8. Merge in main + Push (triggert Deploy)
9. Polling auf v248 + Marcel-Test-Anweisung

Falls **B (Cutover Block 3)** stattdessen gewünscht: das ist 12h-Sprint. Marcel müsste in der Zwischenzeit den manuellen Bridge-Workaround (DevTools-Console-Snippet aus Rollback-Section) nutzen, um die App zu benutzen.

Falls **A (Hybrid Auth-Guard erweitern)** gewünscht: legitim, aber komplexer und länger-lebig hybrid. C ist sauberer da die Bridge KOMPLETT in den neuen Files (auth-supabase-logic.js + supabase-client.js) liegt — der Legacy-Stack bleibt unangetastet bis er später ganz weg fliegt.

---

*Solution-Doc erstellt 01.05.2026 mittag · KEIN Code-Change · KEIN Commit · wartet auf Marcel-OK*
