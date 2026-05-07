# MEGA³⁷ Vault-Migration — Marcel's Action-Liste

**Datum:** 2026-05-08
**Sprint:** MEGA³⁷ Phase C (C1–C7)
**Status:** Migrations 25 + 26 sind APPLIED. Marcel macht den Rest.

---

## Was CC bereits gemacht hat

✅ **Migration 25** `service_endpoints` live in DB (10 Make-Webhook-Placeholder, alle `active=FALSE`).
✅ **Migration 26** `vault_helpers` live (`get_vault_secret`, `has_vault_secret`).
✅ `lib/service-endpoints-cache.js` (Browser-Lib, 5-Min-TTL).
✅ `netlify/functions/list-service-endpoints.js` (GET-Lambda).
✅ `netlify/functions/lib/get-make-webhook-url.js` (Server-Helper mit DB-First + Legacy-ENV-Fallback).
✅ Tests für beide Layer.

⏸ **Du musst:** echte Webhook-URLs eintragen, Vault-Secrets setzen, Edge-Function-Secrets setzen, Netlify-ENVs aufräumen.

---

## Schritt 1 — service_endpoints UPDATEN

Im Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/cngteblrbpwsyypexjrv/sql):

```sql
-- Beispiel für L3-Lifecycle (Trial-Start):
UPDATE public.service_endpoints
SET endpoint_url = 'https://hook.eu1.make.com/EchteUrlAusNetlify',
    active = TRUE,
    updated_at = NOW()
WHERE service_key = 'make:l3-lifecycle-trial';

-- Wiederholen für alle 10 Hooks. Aktuelle Werte aus Netlify-ENVs:
--   MAKE_WEBHOOK_G1, MAKE_WEBHOOK_G3, MAKE_WEBHOOK_K2,
--   MAKE_WEBHOOK_L3, MAKE_WEBHOOK_L8, MAKE_WEBHOOK_L9, MAKE_WEBHOOK_L10,
--   MAKE_WEBHOOK_A5, MAKE_WEBHOOK_T3, MAKE_WEBHOOK_F1
```

**Verify:**
```sql
SELECT service_key, active, length(endpoint_url) AS url_len
FROM public.service_endpoints ORDER BY service_key;
```
Erwartet: 10 Zeilen, alle `active=true`, `url_len` ≥ 30.

---

## Schritt 2 — Vault-Secrets setzen

```sql
-- API-Keys ins Vault legen (encrypted):
SELECT vault.create_secret('sk-...REAL-OPENAI-KEY', 'openai_api_key');
SELECT vault.create_secret('REAL-PDFMONKEY-KEY',    'pdfmonkey_api_key');
SELECT vault.create_secret('re_...REAL-RESEND-KEY', 'resend_api_key');
SELECT vault.create_secret('REAL-ANTHROPIC-KEY',    'anthropic_api_key');

-- Verify (nur Existenz, kein Wert):
SELECT public.has_vault_secret('openai_api_key');
SELECT public.has_vault_secret('pdfmonkey_api_key');
SELECT public.has_vault_secret('resend_api_key');
```

Erwartet: 3-4× `t` (TRUE).

---

## Schritt 3 — Edge Function Secrets setzen

Edge Functions lesen Secrets via `Deno.env.get(...)` aus Supabase-Edge-Function-Secrets (NICHT Netlify-ENVs!).

```bash
# Lokal einmalig:
supabase login

# Secrets setzen (für Edge Functions ki-proxy, whisper-diktat, pdf-generate, send-email, brief-generate):
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set PDFMONKEY_API_KEY=...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Verify:
supabase secrets list
```

---

## Schritt 4 — Test-Auftrag durchziehen

1. Test-Auftrag erstellen (neuer-fall.html → Wizard)
2. Brief generieren (briefvorlagen.html)
3. KI-Call auslösen (z. B. Konjunktiv-II-Check)
4. PDF generieren (Freigabe → PDF)
5. E-Mail senden (Versand)

→ Alle Schritte sollten ohne Netlify-ENV-Drift funktionieren.

**Logs prüfen:**
- Supabase Edge Function Logs (Dashboard → Edge Functions)
- Netlify Function Logs

---

## Schritt 5 — Netlify-ENV-Cleanup

⚠️ **ERST nach Test in Schritt 4!** Sonst Production-Outage.

**LÖSCHEN** in Netlify-Dashboard:
```
MAKE_WEBHOOK_G1, MAKE_WEBHOOK_G3, MAKE_WEBHOOK_K2,
MAKE_WEBHOOK_L3, MAKE_WEBHOOK_L8, MAKE_WEBHOOK_L9, MAKE_WEBHOOK_L10,
MAKE_WEBHOOK_A5, MAKE_WEBHOOK_T3, MAKE_WEBHOOK_F1

PROVA_TEMPLATE_F04_ID, PROVA_TEMPLATE_F09_ID, PROVA_TEMPLATE_F10_ID
PROVA_TEMPLATE_K01_ID … PROVA_TEMPLATE_K12_ID

OPENAI_API_KEY, PDFMONKEY_API_KEY, RESEND_API_KEY, ANTHROPIC_API_KEY

AIRTABLE_PAT, AIRTABLE_TOKEN, AIRTABLE_BASE_ID
```

**BEHALTEN** in Netlify (Bootstrap-Critical):
```
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
JWT_SECRET
NETLIFY_EMAILS_SECRET (falls Forms aktiv)
```

Total nach Cleanup: **7-10 ENVs** (von vorher ~50).

---

## Schritt 6 — Verify-Checkliste

- [ ] `SELECT count(*) FROM service_endpoints WHERE active=TRUE` → 10
- [ ] `SELECT public.has_vault_secret('openai_api_key')` → t
- [ ] `supabase secrets list` zeigt 6+ Secrets
- [ ] Test-Auftrag durch alle 5 Workflow-Stufen ohne Fehler
- [ ] Netlify-ENV-Count: 7-10 (nicht mehr 50+)
- [ ] AWS-4KB-ENV-Limit-Warning: weg

---

## Im Notfall — Rollback

Wenn Production-Outage nach Cleanup:

1. **Make-Webhooks**: Alte Netlify-ENVs aus `.env.backup-202605xx` zurückspielen (Helper `get-make-webhook-url.js` fällt automatisch auf Legacy-ENV zurück, solange sie existieren).
2. **Vault-Secrets**: Edge-Function-Secrets wieder setzen.
3. **Templates**: Migration 24 ist idempotent → re-run schadet nichts.

---

## Compounding-Engineering-Lesson

Diese Migration ehrt Marcel's Direktive 2026-05-08 *"Wenn ENV irgendwie nach Supabase kann → dahin verlagern!"*. Die alte M³⁶ W6.2 (`MAKE_WEBHOOKS_JSON` in Netlify) wurde verworfen, weil ein Netlify-JSON-Blob ENV-Verbrauch nur konsolidiert, nicht eliminiert.

**Neue Default-Regel:** Bootstrap-Critical (Netlify) ODER Konfiguration (Supabase)? → Default ist Supabase.

*— M³⁷ Vault-Migration-Action-List — 2026-05-08*
