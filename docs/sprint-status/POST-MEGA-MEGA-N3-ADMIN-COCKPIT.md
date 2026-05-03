# POST-MEGA-MEGA — Sprint N3: Admin-Cockpit MVP

**Datum:** 03.05.2026 (abend)
**Sprint:** N3 (Admin-Cockpit MVP)
**Status:** ✅ DONE
**Vorgaenger:** N1 (Stripe-Test-Suite, commit `acf4045`), N2 (Onboarding-Drip, commit `22c4df5`)

---

## 🎯 Ziel

Marcel-only Operations-Cockpit fuer den Pilot-Launch:
- Live-Sicht auf alle Pilot-Workspaces (Trial-Tag, Akten-Count, Zahlungsstatus)
- Live-KPIs aus Stripe (MRR, Conversions, Churn, Founding-Coupon-Status)
- Sentry-Errors letzte 24h (Functions + Browser)
- Quick-Actions (Read-only Workspace-Impersonation mit Audit-Trail)

**Nicht-Ziel:** User-Management, Daten-Manipulation, Pricing-Aenderungen.

---

## ✅ Lieferumfang

### 1. Admin-Auth-Guard (Helper-Library)

**File:** `netlify/functions/lib/admin-auth-guard.js` (143 LOC)

**Funktion:**
```js
withSentry(requireAdmin(handler, { functionName, rateLimit }))
```

**Pre-Checks (in dieser Reihenfolge):**
1. Auth-Token via `resolveUser` (Supabase JWT oder HMAC-Fallback)
2. **Email-Whitelist** — hardcoded:
   - `marcel.schreiber891@gmail.com`
   - `marcel@prova-systems.de`
   - `kontakt@prova-systems.de`
   - `admin@prova-systems.de`
3. Rate-Limit pro Admin-Email + Endpoint (default 10/min, Functions-spezifisch konfigurierbar)
4. **Audit-Trail-Eintrag** bei JEDER Admin-Aktion (auch Read), inkl. IP + UA

**Auch geloggt:**
- `admin.<fn>.unauthorized` (kein Token)
- `admin.<fn>.mismatch` (Token-Mismatch)
- `admin.<fn>.forbidden` (nicht in Whitelist)
- `admin.<fn>.rate_limit` (Rate-Limit erreicht)
- `admin.<fn>.invoked` (Erfolgreicher Call)

**Warum hardcoded statt ENV:** Verhindert versehentliche Prod-Aenderung. Erweiterung erfordert Code-Commit + Review.

### 2. Backend-Functions (4 Stueck)

| File | Methode | Rate-Limit | Zweck |
|---|---|---|---|
| `admin-pilot-list.js` | GET | 30/min | Liste aller Workspaces mit Akten-Count + Members |
| `admin-stripe-kpis.js` | GET | 30/min | MRR + Conversion/Churn + Founding-Coupon-Status |
| `admin-sentry-errors.js` | GET | 30/min | Letzte 24h Issues aus Sentry-API |
| `admin-impersonate.js` | POST | 5/min | 30-Min-Read-only-Token + Audit |

**Pattern in jeder Function:**
```js
exports.handler = withSentry(requireAdmin(async function (event, context) {
  // context.adminEmail garantiert
  // context.user = JWT-Payload
}, { functionName: 'admin-X', rateLimit: { max: N, windowSec: 60 } }), { functionName: 'admin-X' });
```

### 3. Frontend-Cockpit

**File:** `admin/index.html` (~530 LOC, single-file Vanilla-JS)

**Tabs:**
1. 📋 **Pilot-Liste** — Tabelle mit Workspace, Email, Tier, Status-Pill, Akten, Trial-Tag, Lifetime €. Filter: Alle/Trial/Aktiv/Ueberfaellig/Gekuendigt.
2. 💰 **Stripe-KPIs** — KPI-Cards: MRR, aktive Workspaces, Trials, Ueberfaellig, Lifetime €. + Letzte-30-Tage-Section + Founding-Coupon-Status.
3. 🚨 **Sentry-Errors** — Issue-Tabelle pro Projekt (Functions + Browser), Permalink, Level, Count, User-Count.
4. ⚡ **Quick-Actions** — Impersonation-Form (workspace_id + Grund-Pflicht), Reload-Button, Audit-Trail-Export-SQL.

**Auth:**
- Supabase-Login mit Email/Password (wie restliche App).
- Email-Whitelist-Check **client-side UND server-side** (Defense in Depth).
- Eingeloggte Non-Admin werden sofort ausgelogged.
- Founder-Badge im Header.

**Mobile:** Responsive ab 768px (Tabs scrollen horizontal, Tabellen kuerzen Spalten 5+).

**Design:** Dark-Mode (slate-900), kein Marketing-Look — Operations-Tool fuer Marcel.

### 4. Sicherheit (Defense in Depth)

| Layer | Check |
|---|---|
| Frontend | Email-Whitelist im JS (kein Render fuer Non-Admin) |
| Frontend | Auto-Logout falls Login mit Non-Admin-Email |
| Backend | resolveUser → JWT-Validation (Supabase + HMAC-Fallback) |
| Backend | Email-Whitelist (hardcoded in admin-auth-guard.js) |
| Backend | Rate-Limit pro Admin-Email + Endpoint |
| Backend | Audit-Trail bei JEDER Aktion (auch nur Read) |
| Token | Impersonation read-only + 30 Min TTL + Workspace-locked |
| Audit | Stripe-API-Calls separat in Sentry-Wrap geloggt |

---

## 📋 Acceptance-Kriterien

| Krit. | Status | Hinweis |
|---|---|---|
| 4 Backend-Functions mit `withSentry`-Wrap | ✅ | Alle Functions verwenden M3-Pattern |
| Marcel-Email-Whitelist | ✅ | Hardcoded in admin-auth-guard.js |
| Rate-Limit (10/min default) | ✅ | Pro Function konfigurierbar |
| Audit-Trail bei JEDER Aktion | ✅ | inkl. unauthorized/forbidden/rate_limit |
| `admin/index.html` mit 4 Tabs | ✅ | Pilots/KPIs/Errors/Actions |
| Auth via Supabase | ✅ | window.PROVA_CONFIG-Pattern |
| Mobile-responsive | ✅ | <768px Spalten-Reduzierung |
| Read-only-Impersonation + Audit | ✅ | 30 Min TTL, Reason-Pflicht |
| Sentry-Integration | ✅ | optional via SENTRY_AUTH_TOKEN ENV |
| `node --check` alle Functions | ✅ | 4/4 OK |

---

## 🧪 Testing (Marcel-Pflicht)

### Vor erstem Login

1. ENV-Variablen in Netlify pruefen:
   - `SUPABASE_SERVICE_ROLE_KEY` (Pflicht)
   - `STRIPE_SECRET_KEY` (Pflicht fuer KPIs)
   - `SENTRY_AUTH_TOKEN` + `SENTRY_ORG_SLUG` (optional, sonst Hint im Tab)
   - `SENTRY_PROJECT_SLUG_FUNCTIONS` + `SENTRY_PROJECT_SLUG_BROWSER` (optional)
   - `AUTH_HMAC_SECRET` (Pflicht fuer admin-impersonate)
2. Login: `https://app.prova-systems.de/admin/`
3. Login mit Marcel-Founder-Email + Passwort.
4. Erwartung: Dashboard laedt, Tab "Pilot-Liste" aktiv, Workspaces sichtbar.

### Smoke-Tests (5 Punkte)

- [ ] **Login erfolgreich** mit `marcel.schreiber891@gmail.com`
- [ ] **Login abgelehnt** mit fremder Email (z.B. `test@example.com`)
- [ ] **Pilot-Liste** zeigt mind. 1 Workspace, Trial-Tag berechnet, Akten-Count > 0
- [ ] **Stripe-KPIs** zeigt MRR + Founding-Coupon-Status
- [ ] **Quick-Actions → Impersonation** mit valider workspace_id liefert Token + Eintrag in `audit_trail`

### Audit-Trail-Verifikation

Direkt in Supabase SQL Editor:
```sql
select created_at, typ, sv_email, details
from audit_trail
where typ like 'admin.%'
  and created_at > now() - interval '1 hour'
order by created_at desc
limit 20;
```

Erwartung: pro Tab-Switch ein Eintrag `admin.<function>.invoked`.

---

## ⚠ Bekannte Limitierungen

| Limitierung | Fix-Plan |
|---|---|
| 2FA nicht erzwungen | Marcel kann Supabase-Auth-2FA selbst aktivieren in Account-Settings |
| Sentry-API: nur 10 Issues pro Projekt | Genug fuer Pilot. Fuer Skalierung: Pagination ergaenzen |
| Impersonation-Token wird NICHT vom Frontend benutzt | Read-only-Modus erfordert Frontend-Anpassung in Auftrags-/Akte-Pages (Backlog Sprint K-2) |
| Founding-Coupon-ID-Resolve | nutzt `resolveFoundingCouponId` aus prova-stripe-prices.js — ENV `STRIPE_COUPON_FOUNDING` muss gesetzt sein, sonst Anzeige "—" |
| Lifetime-€-Berechnung | aus `gesamtzahlungen_lifetime_eur`-Spalte (von Stripe-Webhook gepflegt) — bei Refunds aktuell nicht reduziert |

---

## 🔗 Pfade

```
admin/index.html                                  ← Frontend (single-file)
netlify/functions/lib/admin-auth-guard.js         ← Helper-Library
netlify/functions/admin-pilot-list.js             ← Tab 1
netlify/functions/admin-stripe-kpis.js            ← Tab 2
netlify/functions/admin-sentry-errors.js          ← Tab 3
netlify/functions/admin-impersonate.js            ← Tab 4 Quick-Action
```

---

## 📝 Naechste Schritte

→ **Sprint N4** (Pre-Launch-Checklist + Briefing + Tag `v207-pilot-launch-ready`)

→ **Sprint FINALE** (POST-MEGA-MEGA-PILOT-READY-FINAL.md)

---

*Sprint N3 abgeschlossen — 03.05.2026 abend*
