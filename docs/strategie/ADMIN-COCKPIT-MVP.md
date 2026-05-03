# 🔧 PROVA Admin-Cockpit MVP — Doku

**Erstellt:** 03.05.2026 (Sprint N3 + N3-EXT)
**Aufrufbar:** `https://app.prova-systems.de/admin/`
**Berechtigung:** Marcel-only (Email-Whitelist)

---

## Architektur

```
admin/index.html  (Single-Page-Cockpit, ~700 LOC Vanilla-JS)
   │
   ├──► /lib/prova-config.js  (window.PROVA_CONFIG)
   │
   ├──► supabase-js (Auth)
   │       └─ Email-Whitelist-Check client-side
   │
   └──► /.netlify/functions/admin-*  (alle mit withSentry+requireAdmin)
           │
           ├─ admin-pilot-list      GET   30/min   Pilot-Tabelle + Akten/Members
           ├─ admin-stripe-kpis     GET   30/min   MRR + Conversions + Founding-Coupon
           ├─ admin-sentry-errors   GET   30/min   Letzte Issues Functions+Browser
           ├─ admin-audit-trail     GET   30/min   Audit-Events filterbar
           ├─ admin-impersonate     POST   5/min   Read-only Token 30min TTL
           ├─ admin-send-email      POST  10/min   Vordef. Templates an Pilot
           └─ admin-force-logout    POST   5/min   Alle Sessions beenden
```

---

## Auth-Flow

```
User → /admin/                         (Frontend laedt)
  ↓
prova-config.js setzt window.PROVA_CONFIG
  ↓
supabase.auth.getSession()
  ↓
  ├─ Session vorhanden + Email in ADMIN_EMAILS  → Cockpit laden
  ├─ Session vorhanden + Email NICHT in Whitelist → signOut + Login-Form
  └─ Keine Session                              → Login-Form
  ↓
Login-Form: Email + Passwort
  ↓
supabase.auth.signInWithPassword()
  ↓
Cockpit laden + Tab "Pilot-Liste" auto-load
  ↓
JEDER API-Call sendet 'Authorization: Bearer <jwt>' + 'X-Provider: supabase'
  ↓
Backend: requireAdmin
  ├─ resolveUser (JWT-Validation)
  ├─ Email-Whitelist (hardcoded)
  ├─ Rate-Limit pro Admin-Email + Endpoint
  └─ Audit-Trail-Eintrag (auch unauthorized/forbidden/rate_limit)
```

**Whitelist (in `lib/admin-auth-guard.js`):**
```js
const ADMIN_EMAILS = [
  'marcel.schreiber891@gmail.com',
  'marcel@prova-systems.de',
  'kontakt@prova-systems.de',
  'admin@prova-systems.de'
];
```

---

## Die 5 Tabs

### 1. 📋 Pilot-Liste
- Tabelle: Workspace · Email · Tier · Status · Akten · Trial-Tag · Lifetime €
- Filter: Alle / Trial / Aktiv / Überfällig / Gekündigt
- **Auto-Refresh** alle 30s (deaktivierbar via Checkbox)
- **CSV-Export** (10 Spalten, Excel-kompatibel UTF-8)

### 2. 💰 Stripe-KPIs
- KPI-Cards: MRR · Aktive WS · Trials · Überfällig · Lifetime €
- Letzte 30 Tage: Trials gestartet · Conversions · Conversion-Rate · Churn · Churn-Rate
- Founding-Coupon-Status: Eingelöst · Verbleibend von 10

### 3. 🚨 Sentry-Errors
- Pro Projekt (Functions + Browser): Issue-Tabelle (ID/Titel/Level/Count/Users/LastSeen)
- Permalinks öffnen Sentry direkt
- Wenn `SENTRY_AUTH_TOKEN` nicht konfiguriert: Hint-Box

### 4. 📜 Audit-Trail (NEU N3-EXT)
- Filter: Alle / admin.* / stripe.* / auth.* / ki.*
- Zeitraum: 1h / 24h / 7T / 30T
- Top-Events (Aggregation) + Event-Liste mit Details

### 5. ⚡ Quick-Actions
- **Pilot-Workspace ansehen** (Read-only Impersonation, 30 Min TTL)
- **Daten neu laden** (Force-Reload alle Tabs)
- **Email an Pilot-SV** (NEU N3-EXT, 11 Templates, Vorschau + Absenden)
- **Force-Logout** (NEU N3-EXT, beendet alle Sessions, Reason-Pflicht)

---

## Rate-Limits

| Endpoint | Limit | Begründung |
|---|---|---|
| admin-pilot-list | 30/min | Auto-Refresh nutzt es alle 30s |
| admin-stripe-kpis | 30/min | Stripe API ist eh rate-limited |
| admin-sentry-errors | 30/min | Sentry-API hat eigene Limits |
| admin-audit-trail | 30/min | Read-only |
| admin-impersonate | 5/min | Kritische Aktion |
| admin-send-email | 10/min | Sendet echte Mails |
| admin-force-logout | 5/min | Sehr kritisch |

---

## Audit-Trail-Events (admin.*)

| Event | Auslöser |
|---|---|
| `admin.<fn>.invoked` | Erfolgreicher Call |
| `admin.<fn>.unauthorized` | Kein Token |
| `admin.<fn>.forbidden` | Email nicht in Whitelist |
| `admin.<fn>.mismatch` | Token-Mismatch |
| `admin.<fn>.rate_limit` | Limit erreicht |
| `admin.email_sent` | Send-Email erfolgreich (target pseudonymisiert) |
| `admin.force_logout` | Force-Logout (mit reason + success-flag) |
| `admin.impersonation_started` | Impersonation-Token erzeugt |

**SQL-Query:**
```sql
select created_at, typ, sv_email, details
from audit_trail
where typ like 'admin.%'
  and created_at > now() - interval '24 hours'
order by created_at desc;
```

---

## Sicherheit (Defense in Depth)

| Layer | Check |
|---|---|
| **Frontend** | Email-Whitelist im JS, Auto-Logout bei Non-Admin |
| **Frontend** | Sensitive-Aktionen mit confirm()-Dialog (Force-Logout) |
| **Frontend** | Reason-Pflicht in Impersonation + Force-Logout |
| **Backend** | resolveUser → JWT-Validation |
| **Backend** | Email-Whitelist hardcoded (nicht ENV) |
| **Backend** | Rate-Limit pro Admin-Email + Endpoint |
| **Backend** | Audit-Trail bei JEDER Aktion |
| **Token** | Impersonation read-only + 30 Min TTL + workspace-locked |
| **Doppel-Schutz** | Force-Logout nur via supabase.auth.admin.signOut (Service-Role) |

---

## Marcel-Pflicht-ENV (Netlify)

Pflicht (Cockpit funktioniert sonst nicht):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (in prova-config.js eingebunden)
- `SUPABASE_SERVICE_ROLE_KEY`

Empfohlen (sonst gibt's Hint-Boxen):
- `STRIPE_SECRET_KEY` (für KPI-Tab)
- `STRIPE_COUPON_FOUNDING` = `FOUNDING-99` (für Founding-Coupon-Anzeige)
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG` (für Sentry-Tab)
- `PROVA_SMTP_HOST/USER/PASS` (für Send-Email-Action)
- `AUTH_HMAC_SECRET` (für Impersonation-Token)

---

## Backlog (nicht in MVP)

- [ ] 2FA erzwungen (aktuell optional via Supabase Account-Settings)
- [ ] Notes-Feature pro Pilot (erfordert `admin_notes` Tabelle in Schema)
- [ ] Workspace-Detail-Drilldown (Audit-Events + Akten-Liste pro Workspace)
- [ ] Impersonation-Frontend-Read-only-Modus in den Auftrags-Pages
- [ ] Sentry-Pagination > 10 Issues
- [ ] WebSocket statt 30s-Polling
- [ ] Bulk-Actions (Email an mehrere Pilots, CSV-Multi-Action)

---

*Dokumentiert im Sprint N3-EXT (POST-MEGA-MEGA-PILOT-LAUNCH-FINAL).*
