# Audit 15 — Audit-Logging-Vollständigkeit

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code
**Methodik:** Code-Review aller `audit_trail`-INSERT-Stellen + Schema-Vergleich

---

## Findings-Übersicht

| Severity | Anzahl | Bereich |
|---|---:|---|
| HIGH | 1 | audit_trail INSERT-Policy zu permissiv (Cross-Tenant-Pollution) — Audit 3 H-12 |
| MEDIUM | 4 | Login/Logout/Password-Reset nicht durchgängig geloggt |
| LOW | 2 | Append-Only-Garantie, Retention-Auto-Cleanup |

---

## Pflicht-Events laut DSGVO-Compliance + SV-Berufsordnung

| Event | Aktuell geloggt? | File |
|---|---|---|
| Login (success) | ⚠️ teilweise | Supabase Auth (kein PROVA-Eintrag) |
| Login (fail) | ✅ | `lib/auth-resolve.js` `logAuthFailure` |
| Logout | ❌ | nicht geloggt |
| Password-Reset (Anfrage) | ❌ | Supabase managed, kein PROVA-Eintrag |
| Password-Reset (durchgeführt) | ❌ | dito |
| Permission-Change (Workspace-Member) | ❌ | RLS schützt, aber Logging fehlt |
| Data-Export (DSGVO Art. 15) | ❌ | dsgvo-auskunft.js loggt nicht |
| Data-Delete (DSGVO Art. 17) | ❌ | dsgvo-loeschen.js loggt nicht (nur Marcel-warn-Log) |
| Workspace-Wechsel | n/a | aktuell kein Workspace-Switcher |
| Stripe-Subscription-Activate | ✅ | `stripe-webhook.js` `stripe.subscription.activated` |
| Stripe-Subscription-Cancel | ✅ | `stripe-webhook.js` `stripe.subscription.cancelled` |
| Stripe-Invoice-Paid | ✅ | `stripe-webhook.js` `stripe.invoice.paid` |
| Stripe-Add-on-Purchase | ✅ | `stripe-webhook.js` `stripe.addon.purchased` |
| KI-Aufruf (mit Tokens + Kosten) | ✅ | `ki_protokoll`-Tabelle (separat von audit_trail) |
| Foto-Upload | ❌ | `foto-upload.js` loggt nicht |
| File-Delete | ❌ | nicht implementiert |
| Failed-Auth-Attempts | ✅ | `lib/auth-resolve.js` |
| Rate-Limit-Hit | ✅ | `lib/rate-limit-user.js` via `logAuthFailure('Rate-Limit-Hit')` |
| Cross-Tenant-Versuch | ❌ | RLS blockt, aber kein Log-Eintrag |

---

## HIGH — Audit-Trail INSERT-Policy zu permissiv

→ siehe Audit 3 H-12. PLANNED-Migration vorhanden (`supabase/migrations/PLANNED_2026-05-02_rls_audit_findings.sql`).

---

## MEDIUM-1 — Logout nicht geloggt

**Problem:** wenn User auslogged, wird kein Eintrag in `audit_trail` geschrieben. Forensik bei „User streitet ab eingeloggt zu sein" wird schwierig.

**Fix:** Frontend-Logout-Flow ergänzt eine Function-Call zu `audit-log.js` mit `typ: 'session.logout'`.

**Severity:** MEDIUM (Forensik-Lücke)
**Status:** BACKLOG (Folge-Sprint mit AUTH-PERFEKT 2.0)

---

## MEDIUM-2 — Password-Reset nicht geloggt

**Problem:** Supabase Auth managed Password-Reset transparent. PROVA-Audit-Trail bekommt keinen Eintrag → Compliance-Lücke (Wer hat wann Password-Reset angefordert?).

**Fix-Optionen:**
- A) Webhook-Subscription auf Supabase Auth-Events (komplex)
- B) Frontend-Hook bei Password-Reset → `audit-log`-Function-Call

**Severity:** MEDIUM
**Status:** BACKLOG

---

## MEDIUM-3 — DSGVO-Aktionen nicht geloggt

**Problem:** `dsgvo-auskunft.js` (Art. 15 Export) und `dsgvo-loeschen.js` (Art. 17) sind hochsensitive DSGVO-Aktionen. Müssen geloggt werden.

**Fix:**
```js
// In dsgvo-auskunft.js + dsgvo-loeschen.js Handler:
await sb.from('audit_trail').insert({
  workspace_id: workspaceId,
  user_id: auth.uid(),
  typ: 'dsgvo.auskunft_angefragt',  // oder dsgvo.loesch_angefragt
  details: JSON.stringify({
    timestamp: new Date().toISOString(),
    ip: clientIp,
    user_agent: ua
  })
});
```

**Severity:** MEDIUM (DSGVO Art. 5 Abs. 1 lit. f Integrität + Nachweisbarkeit)
**Status:** BACKLOG

---

## MEDIUM-4 — Cross-Tenant-Versuche nicht geloggt

**Problem:** RLS blockt Cross-Tenant-Zugriff (Audit 3, 33 Tests verifizieren). Aber: erfolgreiche Block-Events werden nicht geloggt → kein Anomalie-Detection-Signal.

**Fix:** im Frontend bei `error.code === 'PGRST116'` (RLS-Violation) → `audit-log` mit `typ: 'rls.cross_tenant_attempt'`.

**Severity:** MEDIUM
**Status:** BACKLOG

---

## LOW-1 — Append-Only-Garantie

**Beobachtung:** `audit_trail` hat keine UPDATE/DELETE-Policy in Supabase. Aktuell:
- INSERT: erlaubt (siehe H-12)
- SELECT: erlaubt (RLS)
- UPDATE/DELETE: nicht in Policies definiert → Default-Verhalten Supabase (verboten ohne Policy)

**Verifikation:**
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename='audit_trail';
-- Erwartet: nur INSERT + SELECT, kein UPDATE/DELETE
```

→ ✅ aktuell korrekt (Append-Only de-facto durch fehlende Policies)

**Empfehlung:** explizite DENY-Policy für UPDATE/DELETE für Klarheit:
```sql
CREATE POLICY audit_no_update ON audit_trail FOR UPDATE USING (false);
CREATE POLICY audit_no_delete ON audit_trail FOR DELETE USING (false);
```

**Severity:** LOW (Defense-in-Depth)
**Status:** in PLANNED-Migration ergänzen

---

## LOW-2 — Retention-Auto-Cleanup

**Problem:** DSGVO Art. 5 Abs. 1 lit. e — Speicherbegrenzung. 5 Jahre Aufbewahrung dokumentiert, aber kein automatischer Cleanup-Job.

**Fix:** Supabase pg_cron-Job:
```sql
SELECT cron.schedule('audit-trail-cleanup', '0 2 1 * *',  -- monatlich 02:00
  $$DELETE FROM audit_trail WHERE created_at < NOW() - INTERVAL '5 years'$$
);
```

**Severity:** LOW
**Status:** BACKLOG

---

## Findings → BACKLOG

| ID | Severity | Titel | Action |
|---|---|---|---|
| AL-01 | HIGH | audit_trail INSERT-Policy → user_id-Konsistenz | PLANNED-Migration H-12 |
| AL-02 | MED | Logout nicht geloggt | BACKLOG |
| AL-03 | MED | Password-Reset nicht geloggt | BACKLOG |
| AL-04 | MED | DSGVO-Aktionen nicht geloggt | BACKLOG (Folge-Sprint) |
| AL-05 | MED | Cross-Tenant-Versuche nicht geloggt | BACKLOG |
| AL-06 | LOW | Append-Only-Policy explizit | in PLANNED-Migration ergänzen |
| AL-07 | LOW | pg_cron 5J-Auto-Cleanup | BACKLOG |

---

*Audit 15 abgeschlossen 03.05.2026*
