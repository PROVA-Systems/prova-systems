# MEGA⁵⁶ — Function-Map + Edge-Shim Bypass Bug Fix

**Datum:** 2026-05-10 15:50 GMT+2
**Sprint:** MEGA⁵⁶ — Function-Migration Final
**Strategie:** HYBRID (edge-shim Bug fix + Mass-Refactor in K-1.5)

---

## 🎯 ROOT CAUSE (Marcel's "401 überall")

`prova-fetch-auth.js` Zeile 39 (PRE-MEGA⁵⁶):
```javascript
var nativeFetch = window.fetch.bind(window);   // captures ORIGINAL fetch
```

Loading-Order in `dashboard.html` (line 21 + 23):
```html
<script src="prova-fetch-auth.js"></script>     ← LOADS FIRST
<script src="/lib/prova-config.js"></script>
<script src="/lib/edge-shim.js"></script>       ← LOADS SECOND, patches window.fetch
```

**Sequenz:**
1. `prova-fetch-auth.js` lädt → `nativeFetch = window.fetch.bind(window)` cached die ORIGINAL fetch
2. `edge-shim.js` lädt → patcht `window.fetch = patchedFetch` (intercepts /.netlify/functions/*)
3. Frontend ruft `provaFetch('/.netlify/functions/dashboard-fristen-upcoming')`
4. provaFetch → `nativeFetch(url, options)` → ORIGINAL fetch (bypassed shim!)
5. Request geht direkt zu `/.netlify/functions/dashboard-fristen-upcoming` (Lambda)
6. Lambda fehlt ENVs (Marcel-Cleanup) → 401/500
7. provaFetch's 401-Handler refresh → fail → MEGA⁵⁴ SOFT-401 → console.warn
8. Console-Spam mit 401s

**Ironie:** edge-shim selbst funktioniert. Aber provaFetch (das ALLE *-logic.js nutzen) bypasst es.

---

## ✅ FIX

`prova-fetch-auth.js` MEGA⁵⁶:
```javascript
// Dynamic window.fetch (NICHT cachen!) damit edge-shim picked up wird,
// auch wenn edge-shim NACH prova-fetch-auth lädt.
function nativeFetch(url, options) {
    return window.fetch.call(window, url, options);
}
```

→ Jeder `nativeFetch`-Aufruf nutzt aktuellen `window.fetch` → edge-shim wird durchlaufen → `/.netlify/functions/X` automatisch zu `/functions/v1/X` umgeleitet.

---

## Function-Map (148 Edge Functions ACTIVE)

### Frontend-Aufrufe → Edge Mapping

| Function | Frontend-Caller | Edge-Status | Note |
|---|---|---|---|
| dashboard-fristen-upcoming | dashboard.html | ✅ ACTIVE (MEGA⁴⁷) | Fix MEGA⁵⁶ shim-bypass |
| workflow-settings | einstellungen.html | ✅ ACTIVE (MEGA⁴³ Welle 5) | Fix MEGA⁵⁶ |
| re-consent-pending | nav.js / dashboard | ✅ ACTIVE (MEGA⁴³ Welle 6) | Fix MEGA⁵⁶ |
| parse-docx | dokument-import | ✅ ACTIVE (501 stub, MEGA⁴³) | Defer (Node-spezifisch) |
| push-notify | push-optin.js | ✅ ACTIVE v23 (MEGA⁵⁶) | Subscribe nativ, send graceful 503 |
| get-referral-stats | dashboard / referral-ui | **NEU MEGA⁵⁶** ACTIVE | Lambda gelöscht |
| get-referral-history | referral-ui.js | **NEU MEGA⁵⁶** ACTIVE | Lambda gelöscht |
| admin-ki-aggregations | admin-cockpit | ✅ ACTIVE v23 (MEGA⁵⁴) | Marcel hardcoded |
| ... 140 weitere ... | | ✅ ACTIVE | |

**Total: 148 Edge Functions ACTIVE** (von 146 vor MEGA⁵⁶, +2: get-referral-stats/-history).

### Lambda-Files (post-MEGA⁵⁵+⁵⁶ Stand)

```
gelöscht MEGA⁵⁵: 32 Files (28 Admin + 1 Login + 3 Auth-Libs)
gelöscht MEGA⁵⁶:  2 Files (get-referral-stats, get-referral-history)
gesamt gelöscht: 34 Files
```

**Behalten** (extern getriggert oder Cron):
- 9 Cron-Lambdas (netlify.toml schedule = ...)
- 5 Externe-Trigger: stripe-webhook, stripe-webhook-referral, make-proxy, pdf-proxy, push-notify
- /lib/* Helpers für Cron + Externe (~10 Files)

---

## Push-notify v23 — Graceful Deno-Native

**Vorher:** `import('npm:web-push@3.6.7')` → fail in Deno-Edge → 500
**Nachher (MEGA⁵⁶):**
- subscribe / unsubscribe / save-prefs / get-prefs / vapid-key → funktioniert nativ
- send / send-fristen → graceful 503 mit `{ ok: false, hint: 'web-push-deferred-post-pilot' }`

**Defer:** Echtes Web-Push-Sending implementieren wir post-Pilot via Deno-Native VAPID-Worker (RFC 8030 + RFC 8291 manual implementation, kein npm-Lib).

---

## einstellungen.html "Max Mustermann" Mock-Daten

**Aktion:** Marcel meldete Mock-Daten in einstellungen.html. **Defer**:
- Frontend-Side-Refactor für Mock→Real braucht User-Profile-Lookup via supabase.from('users')
- Aktuell: einstellungen-supabase.html hat REAL data, einstellungen.html ist Legacy

**Empfehlung:** Marcel nutzt `/profil-supabase.html` statt Legacy einstellungen.html.

---

## Service-Worker

`sw.js` `prova-v3010-mega54-soft-401` → `prova-v3020-mega56-fetch-shim-fix`

Forciert Cache-Refresh damit MEGA⁵⁶ prova-fetch-auth.js Fix live geht.

---

## Acceptance MEGA⁵⁶

| Kriterium | Status |
|---|---|
| ROOT CAUSE diagnosed (prova-fetch-auth bypass) | ✅ |
| prova-fetch-auth.js dynamic window.fetch | ✅ MEGA⁵⁶ |
| get-referral-stats Edge ACTIVE | ✅ NEU |
| get-referral-history Edge ACTIVE | ✅ NEU |
| push-notify graceful (statt 500) | ✅ v23 |
| 2 weitere Lambdas gelöscht | ✅ get-referral-* |
| Function-Map dokumentiert | ✅ dieses |

---

## Marcel-Test (~5 Min)

```
1. F12 → Application → Storage → Clear site data
2. Inkognito → app.prova-systems.de/login
3. Login mit marcel.schreiber@prova-systems.de
4. Dashboard lädt
5. F12 → Console → Filter "401":
   ERWARTUNG: leer (oder nur 1-2 echte Auth-Fails)
6. F12 → Network → Filter "functions":
   ERWARTUNG: alle Calls zu *.supabase.co/functions/v1/*
   NICHT mehr zu prova-systems.netlify.app/.netlify/functions/*
7. F12 → Console → Filter "[edge-shim] reroute":
   ERWARTUNG: viele Logs (jeder /.netlify/functions/* wird umgeleitet)
8. Dashboard-KPIs laden Werte (nicht "Daten nicht verfügbar")
9. Anstehende Fristen: kein "Fehler: HTTP 401"
10. Push-Notifications-Page: subscribe klappt, send graceful (kein 500)
```

**Erfolgs-Marker:** Console-401-Counter < 5 (nur echte Auth-Fails, keine Bypass-401s).

---

## Defer auf MEGA⁵⁷+

| Item | Aufwand | Begründung |
|---|---|---|
| Mass-Refactor 50+ *-logic.js zu supabase.functions.invoke() | hoch | edge-shim ist saubere Übergangs-Lösung |
| Mass-Delete restliche Lambdas (Cron + Externe) | mittel | erst pg_cron-Audit + Stripe/Make-Dashboard-Update |
| einstellungen.html Mock→Real (Profil-Sync) | mittel | profil-supabase.html ist Alternative |
| Echte Web-Push-Sending in Deno | hoch | post-Pilot, RFC 8030/8291 manual impl |
| Konsolidierung lib/auth-guard.js + auth-guard.js | mittel | beide aktiv, K-1.4 |

---

## Tags

```
mega56-fetch-shim-fix         ← NEU
mega55-lambda-cleanup-phase1
mega54-admin-redeploy-complete
mega54-soft-401-cleanup
mega53-login-bug-rootfix
mega52-2fa-complete
... (alle MEGA⁴³-⁵¹)
```
