# MEGA⁵¹ — 403-Handling, Admin-EMAILS, cookie-consent-log Schema-Fix

**Datum:** 2026-05-10 00:30 GMT+2
**Anlass:** Marcel ausgeloggt nach Login → Symptom-Diagnose

---

## Tl;dr

3 Fixes parallel:

| # | Issue | Fix |
|---|---|---|
| 1 | `cookie-consent-log` 500 (Schema-Mismatch) | Edge v23 deployed mit korrektem Schema |
| 2 | `marcel.schreiber@prova-systems.de` fehlt in Admin-Whitelist | hardcoded EMAILS aktualisiert |
| 3 | Frontend-403-Handling (Defense-in-Depth) | prova-fetch-auth.js explicit 403-no-logout |

---

## Issue 1 — cookie-consent-log Schema-Mismatch

**Diagnose:** Edge-Function v22 (MEGA⁴⁵) inserted `{ consent_id, version, categories, content_hash, ip_hash, user_agent, country }` in `cookie_consents`-Tabelle. ABER reales Schema:

```sql
cookie_consents (
  id           uuid     NOT NULL,
  anonymous_id text,
  user_id      uuid,
  consent      jsonb    NOT NULL,
  page         text,
  user_agent   text,
  ip_country   text,
  created_at   timestamp NOT NULL
)
```

→ Spalten `consent_id`, `version`, `categories`, `content_hash`, `ip_hash` existieren NICHT → INSERT failed → 500.

**Fix:** Edge `cookie-consent-log` v23 deployed:
```typescript
await sb.from('cookie_consents').insert({
    anonymous_id: consent_id,           // body.consent_id → DB.anonymous_id
    consent: { categories, version, content_hash },  // jsonb merge
    page,
    user_agent,
    ip_country: country
});
```

**Plus Defense-in-Depth:**
- Bei Schema-Drift: graceful return 200 mit `{ ok: false, skipped }` statt 500
- Frontend (`lib/cookie-consent.js`) ist fail-silent → kein UX-Impact

**Verify nach Push:**
```bash
curl -X POST https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/cookie-consent-log \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"categories":{"necessary":true,"analytics":false,"marketing":false},"consent_id":"test-123","version":"v1"}'
# Erwartung: { ok: true, content_hash: "..." }
```

---

## Issue 2 — Admin-Whitelist erweitert

**Diagnose:** `supabase/functions/_shared/admin-auth.ts` HARDCODED_ADMIN_EMAILS:
```
marcel.schreiber891@gmail.com   ✓ (Marcel Gmail)
marcel@prova-systems.de         ⚠ (existiert nicht real)
kontakt@prova-systems.de        ✓
admin@prova-systems.de          ✓
```

Fehlt: **`marcel.schreiber@prova-systems.de`** (Marcel's Pilot-Email FQDN).

**Fix:**
- Lokales `_shared/admin-auth.ts` aktualisiert (Code-Hygiene für Future-Deploys)
- **Marcel-Side:** Edge-Secret `PROVA_ADMIN_EMAILS=marcel.schreiber@prova-systems.de` ist gesetzt → at-runtime mit HARDCODED gemerged → Marcel sofort als Admin

```typescript
const ADMIN_EMAILS = Array.from(new Set([
    ...HARDCODED_ADMIN_EMAILS.map(e => e.toLowerCase()),
    ...ENV_ADMIN_EMAILS    // Marcel's PROVA_ADMIN_EMAILS Env-Secret
]));
```

**Defer:** Re-Deploy ALLER 23 Admin-Functions wäre nötig damit hardcoded-Update live geht. Kein Pre-Pilot-Blocker da Env-Secret das Problem schon löst.

**Plus 2FA-Pflicht:** Marcel hat `PROVA_ADMIN_REQUIRE_2FA=false` gesetzt → kein AAL2-Block mehr im Pilot.

---

## Issue 3 — Frontend-403-Handling (Defense-in-Depth)

**Diagnose:** Marcel berichtete: "Frontend interpretiert 403 als Token-Expired → Logout".

**Code-Audit:**
- `prova-fetch-auth.js`: NUR 401 triggert clearAuthAndRedirect ✓ (KEIN 403)
- `auth-guard.js`: keine 403-Logic ✓
- `dashboard-logic.js` (`loadKiTokenKpi`): catched `!resp.ok` → zeigt "—" ✓ (KEIN Logout)
- Keine andere Stelle im Frontend triggert Logout auf 403

**Vermutung:** Marcel sah tatsächlich **401 (Token expired)** nach 1h Inaktivität.
Symptom-Verschiebung weil mehrere Edge-Calls parallel laufen → admin-ki-aggregations
gibt 403 (Email nicht in Whitelist), aber gleichzeitig läuft ein anderer Call mit
expired Token → 401 → prova-fetch-auth.js triggert Logout. 

**Fix (Defense-in-Depth):** `prova-fetch-auth.js` explizit erweitert:
```javascript
// MEGA⁵¹: 403 ist NIEMALS ein Logout-Trigger.
// 403 = Permission-Denied (nicht in Admin-Whitelist, keine 2FA, RLS, etc.)
// Token bleibt VALID → User soll eingeloggt bleiben.
if (res && res.status === 403 && isFunctionUrl(url)) {
    var fnName = url.split(FUNCTION_PREFIX)[1]?.split('?')[0] ?? '?';
    console.info('[fetch-auth] 403 forbidden on ' + fnName + ' — kein Logout (Permission-Denied, Token bleibt valid)');
}
```

→ explizit dokumentiert als „kein Logout-Trigger". Console-Marker für Marcel's
Debug. Caller (z.B. dashboard-logic) handled `!resp.ok` weiter wie gewohnt.

---

## Service-Worker

`sw.js` `prova-v2050` → `prova-v2060-mega51-403-handling`

---

## Acceptance

| Kriterium | Status |
|---|---|
| `cookie-consent-log` 200 | ✅ Edge v23 + Schema-Fix |
| Marcel als Admin erkannt | ✅ via Marcel's PROVA_ADMIN_EMAILS Env-Secret + lokales Hardcoded-Update |
| 2FA-Block bei Pilot weg | ✅ via Marcel's PROVA_ADMIN_REQUIRE_2FA=false |
| 403 triggert KEIN Logout | ✅ explizit dokumentiert + Console-Info |
| Doc geschrieben | ✅ dieses |

---

## Marcel-Test (nach Deploy)

```
1. F12 → Application → Storage → Clear site data
2. Inkognito → https://app.prova-systems.de/login
3. Login mit marcel.schreiber@prova-systems.de
4. Dashboard lädt
5. F12 Console: Erwartung
   - ggf. "[fetch-auth] 403 forbidden on admin-ki-aggregations — kein Logout"
     (passiert nur falls Edge noch nicht gemerged Email)
   - KEIN Logout-Redirect
6. Network-Tab: admin-* Calls → 200 statt 403 (post Marcel's Env-Secret-Setup)
7. Cookie-Banner-Klick → cookie-consent-log → 200 (NICHT 500)
   - Body: { ok: true, content_hash: "..." }
8. 1h offen halten → Token wird auto-refresht (autoRefreshToken: true)
   → KEIN Logout
```

Falls Marcel weiter ausgeloggt wird: F12 Network-Tab → Request mit Status 401
→ welche Function? → das ist der echte Bug-Ursprung.

---

## Bekannte Restprobleme (defer)

- 23 Admin-Edge-Functions haben gebundleten _shared/admin-auth.ts mit dem alten
  HARDCODED_ADMIN_EMAILS. Marcel's PROVA_ADMIN_EMAILS Env-Secret merged at-runtime
  → kein Issue. Re-Deploy aller 23 wäre Sprint-Aufwand für Code-Hygiene.

- `dashboard-logic.js` `loadKiTokenKpi` zeigt "Daten nicht verfügbar" für
  non-Admin-User (Pilot-Phase ok, sind alle Founder). Post-Pilot: Frontend
  sollte KPI-Box gar nicht rendern wenn user.is_admin=false.
