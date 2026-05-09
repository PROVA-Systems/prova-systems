# MEGA⁴⁹ — Plausible Consent + Sentry Bundle + UptimeRobot

**Datum:** 2026-05-09 23:50 GMT+2
**Sprint:** zusätzlich zu MEGA⁴⁸ Login-Fix

---

## Phase A — Plausible (DSGVO-konform, opt-in)

**Status:** ✅ schon Consent-Aware, CSP fehlte + Trigger nach Consent ergänzt

`lib/analytics-plausible.js` (existiert seit MEGA¹¹ W7):
- Liest `ProvaCookieConsent.hasConsent()` vor jedem Tracking
- Lazy-load Plausible-Script erst wenn Consent vorhanden
- Re-init bei storage-Event (cross-tab)

**MEGA⁴⁹-Änderungen:**
1. `netlify.toml` CSP erweitert:
   - `script-src` + `https://plausible.io`
   - `connect-src` + `https://plausible.io`
2. `lib/cookie-consent.js` writeConsent: nach `analytics:true` →
   explizit `window.Plausible.init('prova-systems.de')` (same-tab Trigger)
3. Cookie-Banner-Verhalten:
   - "Alle akzeptieren" → analytics+marketing+necessary → Plausible lädt
   - "Nur notwendige" → nur necessary → Plausible lädt NICHT
   - "Auswahl speichern" mit Analyse=ON → Plausible lädt

**Test (nach Push):**
```
1. Browser inkognito → https://prova-systems.de
2. Cookie-Banner: "Alle akzeptieren"
3. F12 Network → script.tagged-events.js (plausible.io) lädt 200
4. Plausible-Dashboard (plausible.io/prova-systems.de) → Pageview erscheint nach 1-2 Min
5. Inkognito reset → "Nur notwendige" → KEIN plausible.io Request
```

---

## Phase B — Sentry: CDN → esm.sh

**Status:** ✅ migriert

**Vorher:**
```html
<script src="https://browser.sentry-cdn.com/10.51.0/bundle.tracing.min.js" crossorigin="anonymous"></script>
<script src="/lib/sentry-init.js"></script>
```
+ CSP `script-src ... https://browser.sentry-cdn.com`

**Nachher:**
```html
<script type="module" src="/lib/sentry-init.js"></script>
```
+ CSP `script-src ... https://esm.sh` (war schon drin)

`lib/sentry-init.js` (komplett umgeschrieben):
- Dynamic ESM-Import: `await import('https://esm.sh/@sentry/browser@9.20.0')`
- Init mit identischer Config (PII-Filter, EU-DSN, beforeSend, no-Replays)
- Keine externe CDN-Abhängigkeit mehr außer esm.sh
- `console.debug('[sentry-init] active via esm.sh')` Marker

**Patched HTMLs:** `app.html`, `index.html`, `pilot.html`

**CSP-Cleanup:** `https://browser.sentry-cdn.com` entfernt aus `script-src`.
`https://*.ingest.de.sentry.io` + `https://*.sentry.io` bleiben in
`connect-src` (Errors landen dort).

**Test:**
```
1. Browser → https://app.prova-systems.de (irgendeine Page mit Sentry)
2. F12 Console → "[sentry-init] active via esm.sh"
3. F12 Network → esm.sh/@sentry/browser@9.20.0 → 200
4. F12 Console → window.testSentryError() → "Test-Error gesendet"
5. Sentry-Dashboard (de.sentry.io) → Event erscheint
```

---

## Phase C — UptimeRobot Webhook

**Status:** ✅ deployed (uptime-webhook v23)

`supabase/functions/uptime-webhook/index.ts` (re-deployed, MCP):
- Auth: `x-webhook-secret` Header ODER `Authorization: Bearer <secret>` (UptimeRobot kann beide)
- Body-Format: UptimeRobot-Standard (`monitorFriendlyName`, `alertType` 1=down/2=up, `alertDetails`)
- Schreibt in **system_health_history** (Latency-Trace)
- **NEU MEGA⁴⁹:** schreibt in **incidents**:
  - `alertType=1` (DOWN) → INSERT `severity='critical', started_at=now`
    (skip falls schon offener Incident für gleichen Service)
  - `alertType=2` (UP nach DOWN) → UPDATE `resolved_at=now` für offene Incidents

**Response:** `{ ok, monitor, status, incident_id }`

**Test mit curl:**
```bash
# DOWN-Event simulieren
curl -X POST https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/uptime-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $UPTIME_WEBHOOK_SECRET" \
  -d '{
    "monitorFriendlyName": "test-monitor",
    "alertType": "1",
    "alertDetails": "test outage",
    "responseTime": 0
  }'
# Erwartung: { ok:true, monitor:"test-monitor", status:"down", incident_id:"<uuid>" }

# UP-Event (recovery)
curl -X POST ... -d '{
    "monitorFriendlyName": "test-monitor",
    "alertType": "2",
    "responseTime": 234
  }'
# Erwartung: { ok:true, monitor:"test-monitor", status:"up", incident_id:"<uuid same>" }

# Verify in Supabase Dashboard:
SELECT * FROM incidents WHERE service='test-monitor' ORDER BY created_at DESC LIMIT 5;
SELECT * FROM system_health_history WHERE service='test-monitor' ORDER BY created_at DESC LIMIT 5;
```

**UptimeRobot-Setup:**
- Monitor-URL: `https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/uptime-webhook`
- Method: POST
- Headers: `x-webhook-secret: <UPTIME_WEBHOOK_SECRET>`
- Body-Type: JSON (UptimeRobot-Default-Schema)

---

## Service-Worker-Bump

`sw.js` `prova-v2030-mega48-prova-config-fix` → `prova-v2040-mega49-plausible-sentry-cleanup`

Forciert Browser-Cache-Refresh.

---

## Acceptance

| Kriterium | Status |
|---|---|
| Plausible loadet erst nach Consent | ✅ schon implementiert + CSP-Fix |
| Plausible-Dashboard erfolgreich verifizierbar | ⏳ Marcel-Test post-Push |
| Sentry bundled (kein CDN) | ✅ via esm.sh |
| Sentry-Errors landen im Dashboard | ⏳ Marcel-Test (testSentryError) |
| UptimeRobot-Webhook funktioniert | ✅ deployed v23, curl-Test im Doc |
| Doc geschrieben | ✅ dieses |

---

## Nächste Schritte

1. **Marcel-Push-and-Test** (nach Netlify-Deploy):
   - F12 → Console: `[sentry-init] active via esm.sh`
   - Cookie-Banner → analytics-Consent → Plausible-Dashboard prüfen
   - `window.testSentryError()` → Sentry-Dashboard prüfen

2. **UptimeRobot Account-Setup** (Marcel-Side):
   - https://uptimerobot.com Account-Login
   - Monitor: `https://app.prova-systems.de` (HTTP, jede Minute)
   - Alert-Contact: Webhook → die Edge-URL oben
   - Test-Alert simulieren (Pause Monitor → bekommt down → resume → bekommt up)
