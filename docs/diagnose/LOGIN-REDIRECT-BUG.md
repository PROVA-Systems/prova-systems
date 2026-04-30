# LOGIN-REDIRECT-BUG — Diagnose

**Datum:** 01.05.2026 morgens
**Status:** Root-Cause identifiziert · KEIN Fix angewendet
**Symptom:** Nach Login auf `/login` landet User auf `/tools/test-supabase-login.html?logged_in=1` statt auf `/dashboard` (oder anderer ursprünglich aufgerufener Page)

---

## TL;DR

`auth-supabase-logic.js` enthält **zwei hard-codierte Default-Redirects** auf die alte K-1.0-Test-Page. Das Logic-File stammt aus Sprint K-1.0 als „Test-Login mit Master-Cockpit-Daten" und wurde in Phase 3c von der neuen `login.html` weiterhin als Auth-Logik eingebunden. Die Test-Page-Defaults sind nie auf `/dashboard` umgestellt worden.

`auth-guard.js` macht alles richtig (`/login?next=<original-path>`). Der Bug sitzt im **Auth-Logic-File**, das den `next=`-Parameter teilweise ignoriert.

---

## Bug-Kette (Schritt für Schritt)

1. **Marcel öffnet** `https://app.prova-systems.de/dashboard`
2. **`/dashboard` rendert** über netlify.toml-Rewrite → `dashboard.html`
3. Auf `dashboard.html` läuft (irgendwo) `runAuthGuard()` aus `lib/auth-guard.js`
4. Keine Session → Redirect zu `/login?next=%2Fdashboard` (auth-guard.js Zeile 48-50 ✓ korrekt)
5. **Marcel landet auf `login.html`** (via netlify.toml-Rewrite `/login → /login.html`)
6. `login.html` lädt am Ende: `<script type="module" src="/auth-supabase-logic.js">`
7. **Hier kommen die zwei Bug-Pfade:**

### Bug-Pfad A — Auto-Redirect für „bereits eingeloggte" User (DOMContentLoaded)

`auth-supabase-logic.js` Zeile 218-225:

```js
// Bereits eingeloggt? Auto-Redirect (für Convenience im Test)
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && !action) {
        showInfo('Bereits eingeloggt als ' + (session.user.email || '?') + ' — leite weiter…');
        setTimeout(() => {
            window.location.href = '/tools/test-supabase-login.html?logged_in=1';   // ← BUG
        }, 1200);
    }
}).catch(() => { /* nicht blocken */ });
```

**Hypothese:** Auf `app.prova-systems.de/dashboard` hatte Marcel eine **Supabase-localStorage-Session aus einem vorigen Login**. `auth-guard.js` prüft synchron via `getCurrentSession()`, sieht keine gültige Session (Token ggf. expired), redirected zu `/login`. Auf `/login` läuft DOMContentLoaded, `supabase.auth.getSession()` (mit automatischem Token-Refresh) **resolved doch noch zu einer gültigen Session**. Auto-Redirect feuert nach 1200ms → Test-Page. Marcel sieht ggf. kurz „Bereits eingeloggt — leite weiter..." aber landet auf der Test-Page statt `/dashboard`.

**Ignoriert komplett `next=`-Parameter aus URL.**

### Bug-Pfad B — Post-Login-Fallback (handleLogin)

`auth-supabase-logic.js` Zeile 121-124:

```js
// Default-Redirect: Test-Page zeigt Master-Cockpit-Daten
const params = new URLSearchParams(window.location.search);
const next = params.get('next') || '/tools/test-supabase-login.html?logged_in=1';   // ← BUG-Fallback
window.location.href = next;
```

**Hypothese:** Wenn der `next=`-Parameter fehlt (z.B. User öffnet `/login` direkt ohne vorherige Auth-Guard-Umleitung), greift der Fallback und schickt zur Test-Page. Wenn `next=` vorhanden, sollte's korrekt sein — aber die Test-Page sollte nicht der Fallback sein, sondern `/dashboard`.

**Bemerkung:** Wenn Marcel `/dashboard` aufruft und das `next=`-Param sauber durchgereicht wird, sollte dieser Pfad NICHT triggern (next=/dashboard wäre da). Marcel's Bug ist daher **wahrscheinlicher Pfad A**, aber B ist auch zu fixen weil es der Fallback ist, den jeder Direkt-Login-Aufruf trifft.

---

## Code-Treffer im Detail

### `auth-supabase-logic.js` (PRIMARY — 2 Bugs)

| Zeile | Code | Hypothese: Bug? |
|---:|---|---|
| **123** | `const next = params.get('next') \|\| '/tools/test-supabase-login.html?logged_in=1';` | **JA — Fallback nach Form-Login** |
| **223** | `window.location.href = '/tools/test-supabase-login.html?logged_in=1';` | **JA — Auto-Redirect für eingeloggte User, ignoriert `next=`** |

Plus Header-Kommentar (Zeile 1-9) bestätigt Test-Stage:
```
PROVA Systems — Supabase-Auth-Logic (ESM)
Sprint K-1.0 Block 6 — parallel zu Netlify Identity / login.html
Wird in K-1.5 Cutover als finales Auth-System aktiviert.
Bis dahin: Test-Mode für Entwickler + Browser-Roundtrip-Test.
Page: /auth-supabase.html
```

→ Das File wurde **nie auf Production-Auth umgestellt**. K-1.5 Cutover hat das übersehen, login.html (Phase 3c) hat es 1:1 übernommen.

### `login.html` (Zeile 189) — kein Bug, nur Bindung

```html
<script type="module" src="/auth-supabase-logic.js"></script>
```

Bindet die buggy Logic ein. Login.html selbst hat keine Redirect-Logik.

### `lib/auth-guard.js` (Zeile 28-55) — KORREKT, kein Fix nötig

```js
const LOGIN_PAGE = '/login';
// ...
export async function runAuthGuard(options = {}) {
    const session = await getCurrentSession();
    if (!session) {
        const next = options.next || (window.location.pathname + window.location.search);
        const url = (options.loginPage || LOGIN_PAGE) + `?next=${encodeURIComponent(next)}`;
        window.location.href = url;
        return new Promise(() => {});
    }
    return { user: session.user, session, workspaceId: null };
}
```

Macht alles richtig: speichert Original-URL als `next=` Param, redirected zu `/login`. Die Verantwortung, `next=` nach Login zu beachten, liegt beim Auth-Logic-File.

### `lib/supabase-client.js` (Zeile 35) — kein Redirect, nur Error-String

```js
'Öffne tools/test-supabase-login.html und paste den Anon-Key '
```

Ist nur ein Error-Message-String beim Anon-Key-Setup-Banner. Keine Redirect-Logik.

### `tools/test-supabase-login.html` (Zeile 380) — kein Bug

```js
await signOut('/tools/test-supabase-login.html?logged_out=1');
```

Test-Page redirectet beim eigenen Logout-Button auf sich selbst. Kein Cross-Setup. Nicht relevant für Marcel's Login-Redirect-Bug.

→ Test-Page setzt **KEINEN** localStorage-Wert der den nächsten Login dahin zurückzwingt. Die Hard-Codierung sitzt ausschließlich in `auth-supabase-logic.js`.

### Repo-weite `test-supabase-login`-Vorkommen

| File | Zeile | Kontext |
|---|---:|---|
| `auth-supabase-logic.js` | 123 | **Bug-Fallback** |
| `auth-supabase-logic.js` | 223 | **Bug-Auto-Redirect** |
| `lib/supabase-client.js` | 35 | nur Error-String |
| `tools/test-supabase-login.html` | 380 | Logout-Self-Redirect |
| `docs/SUPABASE-ENV-SETUP.md` | 94 | nur Doku |
| `docs/sprint-status/CUTOVER-PAGE-INVENTORY.md` | 218 | nur Tooling-Liste |
| `SPRINT-K-1-0-COMPLETE.md` | 14, 84, 183 | nur Sprint-Doku |
| `SPRINT-K-1-3-4-5-MEGA-PROMPT.md` | 182, 557 | nur Sprint-Doku |
| `SPRINT-K-1-3-4-5-COMPLETE.md` | 13 | nur Sprint-Doku |
| `SPRINT-K-1-1-und-K-1-2-MEGA-PROMPT.md` | 600 | nur Sprint-Doku |

→ Nur **2 Code-Treffer** sind Bugs. Alle anderen sind Doku.

---

## Cache-/Storage-Faktor

**`localStorage` für Auth-State:** Supabase persistiert Tokens unter Key `sb-cngteblrbpwsyypexjrv-auth-token` (Project-spezifisch). Wenn Marcel testet und mehrfach loggt, kann dieser Key bestehen und die Auto-Redirect-Logik (Pfad A) sieht eine refreshable Session.

**Workaround für Marcel jetzt:** Hard-Refresh + Inkognito-Tab + ggf. localStorage clear (`localStorage.clear()` in DevTools-Console auf `app.prova-systems.de`) → dann sollte Pfad A nicht triggern.

**Service-Worker-Cache:** sw.js cacht `/auth-supabase-logic.js` als Teil von APP_SHELL (Zeile 50). Bei Logic-Fix muss CACHE_VERSION bumpen sonst sehen User die alte Version.

---

## Vorschlag für Fix (Marcel entscheidet)

### Variante 1 — Minimal: Defaults von Test-Page auf `/dashboard` umstellen

Beide Stellen in `auth-supabase-logic.js` patchen:

```js
// Zeile 123 — POST-LOGIN-FALLBACK
const next = params.get('next') || '/dashboard';

// Zeile 223 — AUTO-REDIRECT für bereits eingeloggte User
const params = new URLSearchParams(window.location.search);
const next = params.get('next') || '/dashboard';
window.location.href = next;
```

Plus sw.js CACHE_VERSION v245 → v246.

**Pro:** Minimal, eindeutig, in 5 Min gefixt.
**Contra:** Code-Header sagt weiterhin „K-1.0 Test-Mode". Naming-Hygiene-TODO bleibt.

### Variante 2 — Aufräumen: Logic-File umbenennen

`auth-supabase-logic.js` → `login-logic.js` (passt zu `login.html`). Header-Kommentar updaten. Plus die 2 Default-Fixes.

**Pro:** Naming sauber, Test-Page-Erwähnung verschwindet komplett.
**Contra:** mehr Files berührt (login.html + sw.js APP_SHELL + ggf. weitere Imports).

### Variante 3 — Auto-Redirect entfernen

Pfad A (Zeile 218-226) komplett entfernen. „Bereits eingeloggt" → User soll explizit auf Login-Form klicken oder auf `/dashboard` direkt navigieren (was er ja gemacht hat — und dann nicht ausgeloggt war? Edge-Case).

**Pro:** weniger Magic, weniger Race-Conditions.
**Contra:** User mit gültiger Session sieht die Login-Form statt direkt durchgewunken — UX-Hick.

**Browser-Claude-Empfehlung:** **Variante 1 + Pfad A behalten aber mit `next=` respektieren** = saubere Default-Korrektur ohne UX-Regression. Pfad A wird zu:

```js
if (session && !action) {
    const params2 = new URLSearchParams(window.location.search);
    const target = params2.get('next') || '/dashboard';
    showInfo('Bereits eingeloggt als ' + (session.user.email || '?') + ' — leite weiter…');
    setTimeout(() => { window.location.href = target; }, 1200);
}
```

---

## Files-Liste für Fix

| File | Was ändern | Pflicht? |
|---|---|---|
| `auth-supabase-logic.js` | Zeile 123 + Zeile 218-226 | ✅ |
| `sw.js` | CACHE_VERSION bumpen v245 → v246 | ✅ (Regel 30) |
| `login.html` | (optional) auth-supabase-logic.js → login-logic.js renamen | nein |
| `auth-supabase.html` | (optional) gleicher Logic-Import — bleibt auf Test-Page-Default? | nein, redirected eh per netlify.toml zu /login |

---

## Empfehlung Marcel-Entscheidung

1. **Schnell-Fix (Variante 1):** Hotfix-Branch `hotfix/login-redirect-default`, 2 Edits + sw.js bump, 1 Commit, push, Marcel-Verify.
2. **Naming-Cleanup (Variante 2):** in einem Folge-Sprint nach Pilot-Onboarding.
3. **localStorage-Reset für Marcel JETZT:** in DevTools-Console auf `app.prova-systems.de` ausführen, dann Login retry — danach sollte Bug nicht mehr triggern (sofern Variante 1 deployed):
   ```js
   localStorage.clear(); sessionStorage.clear(); location.reload();
   ```

---

*Diagnose erstellt 01.05.2026 morgens · Branch: aktuell `main` (nur read-only Search). Kein Fix-Commit ohne Marcel-Freigabe.*
