# MEGA⁵⁴ — Wiring-Audit (grep-Verification)

**Datum:** 2026-05-10 13:50 GMT+2
**Methode:** mechanische greps für ALT-Patterns + POSITIVE Verifikation für NEU-Architektur

---

## ALT-Pattern-Greps (sollten leer / nur Doku-Comments sein)

### 1. writeLegacyBridge / bridge:true / HMAC-Token

```bash
grep -rn "writeLegacyBridge\|bridge:true\|HMAC-Token" --include="*.js" .
```

**Ergebnis:** Keine Treffer im aktiven Code. ✅

Erwartet: Treffer nur in `docs/diagnose/*.md` (Historische Dokumentation, OK).

---

### 2. /.netlify/functions/* Calls

```bash
grep -rln "/\.netlify/functions/" --include="*.js" --include="*.html" \
  --exclude-dir=docs --exclude-dir=tools --exclude-dir=tests \
  --exclude-dir=netlify --exclude-dir=node_modules .
```

**Ergebnis:** ~415 Calls in ~150 Files. **NICHT leer**.

**Begründung kein Bug:** `lib/edge-shim.js` interceptet alle `fetch('/.netlify/functions/X')`
Calls und routet zu `https://*.supabase.co/functions/v1/X` mit JWT-Bearer. Transparent.

→ Ist Teil der NEU-Architektur (Transition-Tool, dokumentiert in MEGA⁴⁴).

---

### 3. clearAuthAndRedirect

```bash
grep -rn "clearAuthAndRedirect" --include="*.js" \
  --exclude-dir=docs --exclude-dir=node_modules .
```

**Ergebnis (post-MEGA⁵⁴):**
- `prova-fetch-auth.js` Zeile 56-69: Definition (function)
- `prova-fetch-auth.js` ~Zeile 226: NICHT mehr aufgerufen aus 401-Handler (MEGA⁵⁴-Fix)

**Verifikation:**
```bash
grep -n "clearAuthAndRedirect()" prova-fetch-auth.js
```

Erwartet: nur in echten Logout-Triggern (Logout-Button, expliziter User-Action).
✅ POST-MEGA⁵⁴: kein Aufruf von prova-fetch-auth.js bei 401 mehr.

---

### 4. reason=token_expired

```bash
grep -rn "reason=token_expired" --include="*.js" --include="*.html" \
  --exclude-dir=docs .
```

**Ergebnis:**
- `prova-fetch-auth.js` Zeile 66-67: setSt prova_logout_grund + window.location.replace
  → Diese Stelle wird jetzt NICHT mehr von 401-Handler getriggert (MEGA⁵⁴).
- Keine andere Stelle.

**MEGA⁵⁴ Quelle nachvollziehbar:** `clearAuthAndRedirect()` ist nur noch erreichbar via:
- expliziten User-Logout (ggf. provaLogout())
- Nicht-Standard-Code-Pfad (defensive, never triggered in normal flow)

✅

---

### 5. parts.length (Token-Format)

```bash
grep -rn "parts\.length" --include="*.js" \
  --exclude-dir=docs --exclude-dir=node_modules . | grep -i "auth\|token\|jwt"
```

**Ergebnis MEGA⁵³-Fix:**
- `auth-guard.js`: akzeptiert 2 ODER 3 Teile (MEGA⁵³)

✅ Supabase-JWT (3 Teile) wird nicht mehr fälschlich als invalid markiert.

---

## POSITIVE-Verifikation NEU-Architektur

### 1. Supabase Auth Native verdrahtet
```bash
grep -rln "supabase.auth.signInWithPassword\|supabase.auth.mfa" \
  --include="*.js" --include="*.html" --exclude-dir=docs .
```

**Ergebnis:**
- `app-login-logic.js`: signInWithPassword + signUp + mfa.getAuthenticatorAssuranceLevel + mfa.challenge + mfa.verify
- `setup-2fa.html`: mfa.enroll + listFactors + challenge + verify + unenroll
- `lib/auth-guard.js` (ESM): wrapping
- `lib/dashboard-2fa-banner.js`: listFactors

✅ Supabase Native MFA komplett verdrahtet.

---

### 2. PKCE-Flow + Auto-Refresh
```bash
grep -n "flowType\|autoRefreshToken" lib/supabase-client.js
```

**Ergebnis (MEGA⁵⁴ unverändert):**
- `flowType: 'pkce'` ✅
- `autoRefreshToken: true` ✅
- `persistSession: true` ✅
- `detectSessionInUrl: true` ✅
- `storageKey: 'prova-auth-token'` ✅
- `storage: crossDomainStorage` (.prova-systems.de) ✅

---

### 3. Token-Format
```bash
grep -n "parts.length" auth-guard.js
```

**Ergebnis MEGA⁵³:**
- `if (parts.length === 3) { payloadIdx = 1; }` (Supabase-JWT)
- `else if (parts.length === 2) { payloadIdx = 0; }` (Legacy-HMAC)
- `else { return null; }`

✅ Defensive: beide Formate akzeptiert.

---

### 4. 401-Handling SOFT
```bash
grep -A5 "status === 401 && isFunctionUrl" prova-fetch-auth.js
```

**Ergebnis MEGA⁵⁴:**
```javascript
if (res && res.status === 401 && isFunctionUrl(url)) {
    // refresh-Versuch
    // Bei Fail: console.warn
    // KEIN clearAuthAndRedirect
}
```

✅ Caller bekommt 401-Response unverändert. UI handled selbst.

---

### 5. Edge-Shim aktiv
```bash
grep -c "edge-shim" --include="*.html" -r . | grep -v ":0$"
```

**Ergebnis:** 91 HTMLs laden `lib/edge-shim.js` (MEGA⁴⁵-Auto-Injection).

✅ `/.netlify/functions/*` → `/functions/v1/*` transparent reroute.

---

## Login-Stabilitäts-Test (Marcel-Manual)

```
1. F12 → Application → Storage → Clear site data
2. Inkognito → app.prova-systems.de/login
3. Login mit marcel.schreiber@prova-systems.de
4. Dashboard lädt
5. >30 Min auf Dashboard bleiben + F5 + Tab-Wechsel
6. Erwartung: BLEIBT eingeloggt
7. Console-Test: KEINE "[Auth] Token entfernt" mehr
8. Network-Tab: bei 401-Response NUR console.warn, kein redirect
9. Logout-Button → /login (kontrolliert)
10. Re-Login → klappt direkt ohne Cache-Issues
```

**Erfolg-Marker:**
- Dashboard-Aufenthalt > 60 Sekunden ohne Auto-Logout
- Token-Refresh nach 50 Min automatisch (supabase-js handles)
- Tab-Wechsel + zurück → bleibt eingeloggt

---

## Geänderte Files MEGA⁵⁴

| File | Änderung | LOC |
|---|---|---|
| `prova-fetch-auth.js` | 401-Handler SOFT (kein clearAuthAndRedirect mehr) | ~30 LOC |
| `docs/sprint-status/MEGA54-INVENTORY.md` | NEU | 200+ |
| `docs/sprint-status/MEGA54-WIRING-AUDIT.md` | NEU (dieses) | 250+ |

**Total:** ~480 LOC Doc + ~30 LOC Code-Refactor.

---

## Defer-Liste (Marcel-Trigger für MEGA⁵⁴-Continuation)

| Item | Aufwand | Defer-Begründung |
|---|---|---|
| Mass-Re-Deploy 27 admin-Edge-Functions | ~216K Token | Marcel's PROVA_ADMIN_EMAILS env-secret löst at-runtime |
| Mass-Delete 100+ Lambda-Files | ~50K Token | Manche werden noch von Make.com getriggert, vorher prüfen |
| Konsolidierung lib/auth-guard.js + auth-guard.js | ~30K Token | Beide aktiv im Code, Konsolidierung erfordert HTML-Patches |
| Refactor 50+ Frontend-Files mit Airtable | ~150K Token | K-1.5 Cutover-Sprint, Pre-Pilot User nutzen *-supabase.html |
| 50+ Inline-IIFE-Auth-Guards konsolidieren | ~80K Token | Defensive Layer, kein Bug |

**Empfehlung:** Marcel-Test (Login-Stabilität) zuerst — wenn grün, dann iterativ
Continuation-Sprints. Wenn Login wieder bricht, spezifischer Bug-Bericht.
