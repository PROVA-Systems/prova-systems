# MEGA⁵⁷ — Loading-Order Final Fix

**Datum:** 2026-05-10 16:30 GMT+2
**Sprint:** Defense-in-Depth nach MEGA⁵⁶
**Methode:** Auto-Reorder via `tools/fix-loading-order.sh`

---

## Problem

Marcel's Network-Tab beweist: `/.netlify/functions/dashboard-fristen-upcoming` → 401.
URL geht zu Netlify, nicht zu Supabase. → edge-shim wird BYPASSED.

Loading-Order in 71 HTMLs (Pre-MEGA⁵⁷):
```html
<script src="prova-fetch-auth.js"></script>     ← LADET FIRST
<script src="/lib/prova-config.js"></script>
<script src="/lib/edge-shim.js"></script>       ← lädt SECOND, patcht window.fetch
```

prova-fetch-auth.js Z39 cached `nativeFetch = window.fetch.bind(window)` BEVOR edge-shim
window.fetch patched → bypass.

**MEGA⁵⁶ Fix** (function nativeFetch) ist im Repo, aber Defense-in-Depth: trotzdem
Reihenfolge korrigieren damit auch ohne MEGA⁵⁶-Fix funktioniert.

---

## Fix

`tools/fix-loading-order.sh` (idempotent, awk-basiert):
- find lines mit `src="prova-fetch-auth.js"` und `src="/lib/edge-shim.js"`
- wenn pfauth-Zeile < edge-shim-Zeile: swap (delete pfauth, insert nach edge-shim)
- skip wenn schon korrekt order, kein edge-shim, oder kein pfauth

**Ergebnis:**
```
Fixed (reordered):              67
Skipped (already pfauth>shim):   4
Skipped (no edge-shim):           0
Skipped (no pfauth):            141
Errored:                          0
```

67 HTMLs gepatcht. 4 waren schon korrekt (z.B. app-login.html). 141 ohne pfauth (statische Public Pages).

---

## Beispiel: dashboard.html (POST-MEGA⁵⁷)

```html
<script src="/lib/prova-config.js"></script>     ← Z21
<script src="/lib/edge-shim.js"></script>        ← Z22 patcht window.fetch
<script src="prova-fetch-auth.js"></script>      ← Z23 cached jetzt patched fetch
```

→ Egal ob MEGA⁵⁶ Dynamic-Fix da ist oder nicht: `nativeFetch` ist jetzt patched.

---

## Service-Worker

`sw.js` `prova-v3020` → `prova-v3030-mega57-loading-order-fix`

Forciert Browser-Cache-Refresh.

---

## Marcel-Test (~3 Min)

```
1. F12 → Application → Service Workers → Unregister
2. F12 → Storage → Clear site data
3. Inkognito → app.prova-systems.de/login → Login
4. Dashboard lädt
5. F12 → Network → Filter "functions"
   ERWARTUNG: ALLE Calls zu cngteblrbpwsyypexjrv.supabase.co/functions/v1/*
   NICHT zu app.prova-systems.de/.netlify/functions/*
6. F12 → Console → Filter "401"
   ERWARTUNG: leer (max echte Auth-Fails)
7. F12 → Console → Filter "[edge-shim] reroute"
   ERWARTUNG: viele Logs (jeder Function-Call wird umgeleitet)
8. Anstehende Fristen: kein "HTTP 401"
9. Dashboard-KPIs zeigen Werte
```

---

## Acceptance

| Kriterium | Status |
|---|---|
| 67 HTMLs reordered (pfauth NACH edge-shim) | ✅ |
| MEGA⁵⁶ Dynamic-Fix bleibt als Defense-in-Depth | ✅ |
| sw.js v3030 forciert Cache-Refresh | ✅ |
| Idempotent (2. Run = 0 Fixed) | ✅ Verify |
| Doc geschrieben | ✅ dieses |

---

## Phase C — dashboard.html SyntaxError Z898

`dashboard.html` Zeile 898 ist regulärer HTML-Anchor-Tag (`<a href="briefvorlagen.html">`).
**Kein JS-SyntaxError** an dieser Stelle.

Der von Marcel gemeldete SyntaxError kommt vermutlich aus einer **gebundleten JS-Datei**
oder einem **Inline-Script** in einer anderen Page. Browser-Console-Trace mit Source-Map
nötig zur exakten Lokalisierung.

**Defer:** ohne Browser-Console-Logs nicht zielgerichtet fixbar. Marcel kann F12-Screenshot
liefern, dann targeted Fix in MEGA⁵⁸.

---

## Tags

```
mega57-loading-order-fix     ← NEU
mega56-fetch-shim-fix
mega55-lambda-cleanup-phase1
mega54-admin-redeploy-complete
... (alle MEGA⁴³-⁵³)
```
