# OPTION-C-RACE-ANALYSE — Init-Reihenfolge + 401-Trigger

**Datum:** 01.05.2026 abend
**Symptom (Marcel-Browser-Konsole nach Login):**
```
[fetch-auth] supabase nicht verfuegbar — kein Refresh moeglich
[fetch-auth] refresh-retry failed → logout
[FristGuard] Airtable Fehler, nutze Cache: NetworkError when attempting to fetch resource.
[auth] Session detected on /login, no auto-redirect (anti-loop hotfix-2)
```
**URL nach Login:** `app.prova-systems.de/login?reason=token_expired`
**Erwartet:** stabiles Dashboard, kein Token-Expired
**Status:** ROOT-CAUSE identifiziert · KEIN Fix angewendet (wartet auf Marcel-Freigabe)

---

## TL;DR

**Zwei verschachtelte Probleme.** Der unmittelbare Logout kommt aus einer **Race-Condition** zwischen `defer`-Scripts und dem ESM-Modul von `lib/supabase-client.js`. Der Trigger der die Race aktiviert ist der **Airtable-Drift** — `frist-guard.js` ruft beim Page-Load eine Function auf, die intern Airtable kontaktiert. Wenn dieser Aufruf fehlschlägt (NetworkError/Token), versucht `prova-fetch-auth.js` einen Token-Refresh — aber `window.PROVA_DEBUG.supabase` ist zu diesem Zeitpunkt noch nicht gesetzt, weil das ESM-Modul noch nicht ausgeführt wurde.

Race-Condition + Airtable-Drift = Auto-Logout. Beides muss adressiert werden.

---

## Init-Reihenfolge auf `dashboard.html`

```
HTML-Parse-Phase (synchron):
  Z.16  prova-fetch-auth.js              ← klassisches IIFE, definiert window.provaFetch SOFORT
  Z.17  /lib/prova-config.js             ← klassisches IIFE, setzt window.PROVA_CONFIG SOFORT
  Z.18  prova-notifications.js [defer]   ← wartet auf DOMContentLoaded
  Z.19-32  Inline-IIFE Pre-Check         ← liest Bridge-Keys synchron, OK oder redirect
  Z.37-40  <script type="module">        ← ESM, lädt asynchron im Hintergrund
            import { runAuthGuard } from '/lib/auth-guard.js';
            runAuthGuard();
  Z.42-49  prova-sanitize, prova-pseudo, prova-account-gate, theme, nav [defer], …
  Z.951+   sw-register, global-search, auftragstyp, prova-context, …
  Z.959    dashboard-logic.js [defer]
  Z.961    frist-guard.js [defer]         ← LADET DAS PROBLEM-SKRIPT
  Z.962    honorar-tracker.js [defer]
```

### Lade-Reihenfolge in der Praxis

```
Phase A — Synchron während HTML-Parse:
  prova-fetch-auth.js IIFE → window.provaFetch ist definiert
  /lib/prova-config.js IIFE → window.PROVA_CONFIG.SUPABASE_URL ist definiert
  Inline-Pre-Check IIFE → liest localStorage, OK oder replace zu /login

Phase B — DOMContentLoaded:
  defer-Scripts und type="module" feuern jetzt (gemischt, Browser-abhängig)
  KRITISCH: Browser garantiert NICHT dass ESM-Module vor defer-Scripts laufen.
  In der Praxis: defer-Scripts werden meistens zuerst evaluiert weil sie
  während HTML-Parse vorgeholt wurden, ESM-Module starten ihre Resolution
  parallel aber Execution sequenziert.

Phase C — Module-Resolution (asynchron):
  /lib/auth-guard.js wird gefetcht
  /lib/auth-guard.js importiert /lib/supabase-client.js
  /lib/supabase-client.js läuft, setzt window.PROVA_DEBUG.supabase = supabase
  → ERST DANACH ist Refresh über window.PROVA_DEBUG.supabase möglich
```

**Race-Window:** zwischen DOMContentLoaded (defer-Scripts laufen) und dem Moment wo `lib/supabase-client.js` ausgeführt wurde. Dieses Fenster ist meist 50-300ms. In dem Fenster:
- `window.provaFetch` ist da (klassisch synchron geladen)
- `window.PROVA_DEBUG.supabase` ist NOCH NICHT da

---

## Der konkrete Bug-Trace

```
Marcel logt ein auf /login → echter Supabase-Token in prova_auth_token
  ↓
window.location.href = '/dashboard'
  ↓
dashboard.html lädt
  ↓
[Phase A — Synchron]
  prova-fetch-auth.js IIFE ✓
  prova-config.js IIFE ✓
  Inline-Pre-Check: prova_auth_token + prova_sv_email da → OK ✓
  ↓
[Phase B — DOMContentLoaded, defer-Scripts laufen]
  frist-guard.js Z.~480: window.addEventListener('DOMContentLoaded', start)
    ↓
    fetchUpcoming() oder ähnlich
    ↓
    Z.490: provaFetch('/.netlify/functions/airtable', { method:'POST', ... })
    ↓
    [Server-Side]
    netlify/functions/airtable.js
      ↓ resolveUser → SupabaseJWT.verify(jose) → OK
      ↓ Airtable-API-Call: api.airtable.com/v0/...
      ↓ FAILT — NetworkError oder 401 oder Schema-Mismatch
    ↓
    [Server returnt 4xx oder Function selbst wirft]
    ↓
  prova-fetch-auth.js sieht response.status === 401 (oder NetworkError im catch)
    ↓ token = getToken()  → echter Supabase-JWT (eyJ...)
    ↓ isSupabaseJwt(token) → TRUE (3 Teile, beginnt mit eyJ)
    ↓ console.info('[fetch-auth] 401 with supabase-jwt, trying refresh...')
    ↓
    tryRefreshAndRetry(url, options) Z.87:
      ↓ var supa = window.PROVA_DEBUG && window.PROVA_DEBUG.supabase;
      ↓ ⚠️ window.PROVA_DEBUG.supabase ist noch UNDEFINED weil
      ↓    /lib/supabase-client.js (ESM) noch nicht ausgeführt wurde
      ↓ if (!supa || !supa.auth || ...) {
      ↓    console.info('[fetch-auth] supabase nicht verfuegbar — kein Refresh moeglich');
      ↓    return null;
      ↓ }
    ↓
  retryRes ist null → Refresh-Failure-Pfad
    ↓ console.warn('[fetch-auth] refresh-retry failed → logout')
    ↓ clearAuthAndRedirect()
    ↓ localStorage.removeItem(prova_auth_token)
    ↓ localStorage.removeItem(prova_user)
    ↓ window.location.replace('/app-login.html?reason=token_expired')
    ↓ → netlify.toml 301 → /login?reason=token_expired
    ↓
Browser landet auf /login?reason=token_expired
  ↓ auth-supabase-logic.js DOMContentLoaded
  ↓ Pfad A: Session detected → console.log (anti-loop hotfix-2)
  ↓ User sieht Login-Form mit Reason-Banner
```

---

## Beteiligte Code-Stellen

### `prova-fetch-auth.js` (Race-Condition-Quelle)

Zeile 87-104 (`tryRefreshAndRetry`):
```js
async function tryRefreshAndRetry(url, options) {
    var supa = window.PROVA_DEBUG && window.PROVA_DEBUG.supabase;
    if (!supa || !supa.auth || typeof supa.auth.refreshSession !== 'function') {
      console.info('[fetch-auth] supabase nicht verfuegbar — kein Refresh moeglich');
      return null;
    }
    // ... refreshSession + retry ...
}
```

**Problem:** sync read of `window.PROVA_DEBUG.supabase` — ist im Race-Window noch undefined.

### `lib/supabase-client.js` (Setter)

Zeile 174-180:
```js
if (typeof window !== 'undefined') {
    window.PROVA_DEBUG = window.PROVA_DEBUG || {};
    window.PROVA_DEBUG.supabase = supabase;
    window.PROVA_DEBUG.getCurrentUser = getCurrentUser;
    window.PROVA_DEBUG.getActiveWorkspaceId = getActiveWorkspaceId;
}
```

**Problem:** wird nur ausgeführt wenn das ESM-Modul evaluiert wird — nach DOMContentLoaded gemischt mit defer-Scripts.

### `frist-guard.js` (Trigger)

Zeile 490+ (DOMContentLoaded):
```js
const resp = await provaFetch('/.netlify/functions/airtable', {
  method: 'POST',
  ...
});
```

**Problem:** Wirft den ersten Function-Call ab DOMContentLoaded — **der Drift-Trigger**. Plus 2 weitere provaFetch-Calls in Zeile 948 + 989. Tieferer Drift: Logic-Files rufen Legacy-Function für Daten die längst in Supabase leben sollten.

---

## Lösungs-Optionen

### OPT-A — Race-Condition-Fix (kurz, isoliert) ⭐ EMPFOHLEN für Phase 1

`prova-fetch-auth.js` `tryRefreshAndRetry` async um den Supabase-Client lazy zu importieren via dynamic import:

```js
async function tryRefreshAndRetry(url, options) {
    let supa = window.PROVA_DEBUG && window.PROVA_DEBUG.supabase;
    if (!supa) {
        // ESM-Modul evtl. noch nicht geladen — lazy import
        try {
            const mod = await import('/lib/supabase-client.js');
            supa = mod.supabase;
        } catch (e) {
            console.info('[fetch-auth] supabase nicht verfuegbar (lazy-import fail)', e);
            return null;
        }
    }
    if (!supa || !supa.auth) return null;
    const refreshRes = await supa.auth.refreshSession();
    // ... rest
}
```

**Pro:** 1-File-Edit · async-Import wird vom Browser gecacht (zweiter Aufruf ist instant) · Race ist eliminiert · Defense-in-Depth bleibt intakt
**Contra:** dynamic import ist async — first-call dauert ~50-100ms (vernachlässigbar wenn Function-Call sowieso ~200ms+ dauert)
**Aufwand:** ~10 min Code + Smoke-Test

### OPT-B — Eager-Init in dashboard.html

ESM-Modul VOR defer-Scripts in HTML einbinden mit explizitem `await`-Pattern. Funktional schwierig weil HTML-Parsing die Reihenfolge nicht hard garantiert.

**Pro:** keine prova-fetch-auth-Änderung
**Contra:** muss in 51 Hybrid-Page-HTMLs gemacht werden · Browser-Garantien sind weich · 1 fehlende Page = Race kommt zurück
**Aufwand:** ~2-3h für 51 Pages

### OPT-C — Bridge-Init in prova-fetch-auth.js IIFE

`prova-fetch-auth.js` selbst importiert `lib/supabase-client.js` direkt im IIFE:

```js
import('/lib/supabase-client.js').then(mod => {
    window.PROVA_DEBUG = window.PROVA_DEBUG || {};
    window.PROVA_DEBUG.supabase = mod.supabase;
});
```

**Pro:** Init-Order-unabhängig, eager
**Contra:** dynamic import in IIFE ist fire-and-forget — keine Garantie dass es vor erstem provaFetch-Call fertig ist · gleicher Race nur verschoben
**Verworfen.**

### OPT-D — Logic-Files refaktorieren um nicht mehr Airtable zu rufen

Verschmilzt mit Airtable-Drift-Cleanup (siehe `AIRTABLE-DRIFT-AUDIT.md`).

**Pro:** Eliminiert das Trigger-Symptom dauerhaft (kein 401 mehr, kein Refresh-Versuch)
**Contra:** Mega-Sprint (~50 Logic-Files migrieren oder ENV-Vars entfernen) · Race-Condition existiert weiter aber feuert nie mehr

### Kombi-Empfehlung

1. **Sofort (Phase 1):** OPT-A (Race-Condition-Fix) — Defense-in-Depth bleibt nutzbar, Refresh funktioniert auch wenn Airtable mal failt
2. **Strategisch (Phase 2):** Airtable-Drift-Cleanup laut `AIRTABLE-DRIFT-AUDIT.md` — Trigger-Symptom dauerhaft eliminieren
3. **Langfristig:** Defense-in-Depth-Code prüft ob nach Drift-Cleanup überhaupt noch nötig (vermutlich ja — Token-Expiry-Race ist real, auch ohne Airtable)

---

## Welche Function hat den 401 ausgelöst?

`frist-guard.js` Zeile 490 ruft `/.netlify/functions/airtable` auf — die erste Quelle des 401.

**Mögliche Ursachen für den 401 / NetworkError:**

1. **AIRTABLE_PAT abgelaufen** — Marcel hat das Token nach Voll-Supabase-Refactor revoked oder es ist via Airtable-Backend abgelaufen
2. **Airtable-Schema-Mismatch** — Tabelle umbenannt nach Voll-Supabase-Migration (Foundations 01-06 hatten neue Schemas)
3. **Workspace-ID-Filter** — `airtable.js` filtert via `sv_email`, der Filter findet nichts weil Daten nicht mehr in Airtable sind
4. **Rate-Limit** in `airtable-rate-limiter.js` — unwahrscheinlich für ersten Call

**TBD Marcel:** Ist `AIRTABLE_PAT` in Netlify-ENV noch gesetzt? Falls ja: ist es valide gegen Airtable-Backend? **Ohne diese Info können wir nicht sagen warum genau der 401 kam.** Aber egal welche der vier Ursachen — die Drift-Realität bleibt.

---

## Empfehlung

**OPT-A als unmittelbarer Hotfix.** ~10 min Code + Smoke-Test. Eliminiert die Race-Condition. Auch wenn Airtable in Phase 2 ausgeräumt wird, bleibt Defense-in-Depth nutzbar für echte Token-Expiry-Race-Conditions (z.B. nach 1h Inaktivität).

Phase 2 (Airtable-Drift-Cleanup) folgt danach — siehe separates `AIRTABLE-DRIFT-AUDIT.md`.

---

*Diagnose erstellt 01.05.2026 abend · KEIN Code-Change · KEIN Commit · wartet auf Marcel-OK*
