# Marcel-Actions Required — ENV-Fix MEGA¹⁵.5

**Datum:** 2026-05-07
**Anlass:** AWS-Lambda-4KB-ENV-Limit Deploy-Block
**Code-Side bereit:** ja (W37-W39)
**Marcel-Side ausstehend:** ja (Netlify-UI-Aktionen)

---

## Reihenfolge der Aktionen

### Schritt 1 — JSON-ENV `MAKE_WEBHOOKS` setzen (KRITISCH)

**Im Netlify-UI:**
1. Site-Settings → Environment-Variables → "Add a variable"
2. Key: `MAKE_WEBHOOKS`
3. Value: JSON mit allen 21 Webhooks-URLs

**Aktuelle Webhooks vor Migration sammeln:**
Aus deinem Netlify-UI alle MAKE_WEBHOOK_*-Werte kopieren. Empfehlung: bestehende Werte vor Loeschung BACKUPEN!

**JSON-Struktur (Beispiel — konkrete Values aus Netlify):**

```json
{
  "a5":         "https://hook.eu1.make.com/xxxx",
  "f1":         "https://hook.eu1.make.com/xxxx",
  "g1":         "https://hook.eu1.make.com/xxxx",
  "g3":         "https://hook.eu1.make.com/xxxx",
  "k1":         "https://hook.eu1.make.com/xxxx",
  "k2":         "https://hook.eu1.make.com/xxxx",
  "k3":         "https://hook.eu1.make.com/xxxx",
  "kauf":       "https://hook.eu1.make.com/xxxx",
  "l3":         "https://hook.eu1.make.com/xxxx",
  "l4":         "https://hook.eu1.make.com/xxxx",
  "l5":         "https://hook.eu1.make.com/xxxx",
  "l8":         "https://hook.eu1.make.com/xxxx",
  "l9":         "https://hook.eu1.make.com/xxxx",
  "l10":        "https://hook.eu1.make.com/xxxx",
  "s1":         "https://hook.eu1.make.com/xxxx",
  "s3":         "https://hook.eu1.make.com/xxxx",
  "s6":         "https://hook.eu1.make.com/xxxx",
  "s9":         "https://hook.eu1.make.com/xxxx",
  "support":    "https://hook.eu1.make.com/xxxx",
  "trial":      "https://hook.eu1.make.com/xxxx",
  "whisper":    "https://hook.eu1.make.com/xxxx",
  "willkommen": "https://hook.eu1.make.com/xxxx"
}
```

4. Scope waehlen:
   - "Specific scopes" → nur folgende Functions:
     - `make-proxy`
     - `emails`
     - `team-interest`

5. Save

**Test:** ein einzelner Webhook-Call (z.B. via `make-proxy?key=k3`) sollte funktionieren.

---

### Schritt 2 — Veraltete ENVs LOESCHEN (sicher, da Defaults im Code)

Im Netlify-UI loeschen:

#### 2a) STRIPE-Defaults (5 ENVs)
**Begruendung:** `lib/prova-stripe-prices.js` hat hardcoded Defaults aus dem neuen Stripe-Account (03.05.2026). Diese ENV-Vars sind nur OVERRIDE-Mechanismus.

- `STRIPE_PRICE_SOLO`
- `STRIPE_PRICE_TEAM`
- `STRIPE_PRICE_ADDON_5`
- `STRIPE_PRICE_ADDON_10`
- `STRIPE_PRICE_ADDON_20`

**Risiko:** keiner — Code nutzt Defaults wenn ENV fehlt.
**Test nach Loeschung:** Stripe-Checkout-Flow durchgehen.

#### 2b) Tippfehler-ENV (1)
- `STRIPE_PRICE_` (leerer Suffix — eindeutig Tippfehler)

#### 2c) Redundante AIRTABLE-Vars (2)
- `AIRTABLE_TOKEN` (wird nur als Fallback in health.js gelesen)
- `AIRTABLE_API_KEY` (deprecated)

**Pruefen:** stelle sicher dass `AIRTABLE_PAT` korrekt gesetzt ist!

#### 2d) Test-only-ENV (1)
- `PROVA_SENTRY_TEST_SECRET` (Test-Endpoint, in Production nicht noetig)

**Total Loeschungen: 9 ENV-Vars.**

---

### Schritt 3 — 21 Legacy-MAKE_WEBHOOK_*-Vars LOESCHEN

**WICHTIG:** ERST Schritt 1 (MAKE_WEBHOOKS-JSON setzen) UND mindestens einen Webhook-Test.

Dann loeschen:
- `MAKE_WEBHOOK_A5`
- `MAKE_WEBHOOK_F1`
- `MAKE_WEBHOOK_G1`
- `MAKE_WEBHOOK_G3`
- `MAKE_WEBHOOK_K1`
- `MAKE_WEBHOOK_K2`
- `MAKE_WEBHOOK_K3`
- `MAKE_WEBHOOK_KAUF`
- `MAKE_WEBHOOK_L3`
- `MAKE_WEBHOOK_L4`
- `MAKE_WEBHOOK_L5`
- `MAKE_WEBHOOK_L8`
- `MAKE_WEBHOOK_L9`
- `MAKE_WEBHOOK_L10`
- `MAKE_WEBHOOK_S1`
- `MAKE_WEBHOOK_S3`
- `MAKE_WEBHOOK_S6`
- `MAKE_WEBHOOK_S9`
- `MAKE_WEBHOOK_SUPPORT`
- `MAKE_WEBHOOK_TRIAL`
- `MAKE_WEBHOOK_WHISPER`
- `MAKE_WEBHOOK_WILLKOMMEN`
- `MAKE_S3_WEBHOOK` (alt — pruefen ob noch verwendet)
- `MAKE_S4_WEBHOOK` (alt)

**Total: bis zu 23 Loeschungen.**

**Backwards-Compat-Sicherheit:** Code (lib/make-webhooks.js) hat Fallback `process.env.MAKE_WEBHOOK_<KEY>` — falls JSON-Lookup fehlschlaegt, fungieren die Legacy-Vars als Backup. **Erst loeschen wenn Test erfolgreich!**

---

### Schritt 4 — Function-Scopes setzen (drastische Reduktion)

Pro ENV "Specific scopes" festlegen statt "All scopes":

#### Gruppe: Stripe (~5 Functions)
**ENVs:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_AUTO_TAX`
- `STRIPE_FOUNDING_COUPON_ID`

**Scope:** nur `stripe-*`-Functions:
- stripe-webhook
- stripe-checkout
- stripe-portal
- stripe-customer
- stripe-status

#### Gruppe: Admin (~22 Functions)
**ENVs:**
- `ADMIN_PASSWORD_BCRYPT`
- `ADMIN_PASSWORD_HASH`
- `PROVA_ADMIN_REQUIRE_2FA`
- `PROVA_INTERNAL_SECRET`

**Scope:** nur `admin-*`-Functions

#### Gruppe: Airtable (~8 Functions)
**ENVs:**
- `AIRTABLE_PAT` (wenn Schritt 2c done)
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_SV`
- `AIRTABLE_BRIEFE_TABLE`
- `AIRTABLE_AUDIT_TRAIL_TABLE`

**Scope:** nur Functions mit "airtable" im Namen

#### Gruppe: Make-Webhooks (3 Functions)
**ENV:** `MAKE_WEBHOOKS` (nach Schritt 1)
**Scope:**
- make-proxy
- emails
- team-interest

#### Gruppe: VAPID Push-Notifications (~2 Functions)
**ENVs:**
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

**Scope:** Functions mit "push" oder "notification"

#### Gruppe: SMTP/Email (~5 Functions)
**ENVs:**
- `IONOS_SMTP_HOST/USER/PASS`
- `PROVA_SMTP_HOST/USER/PASS/PORT/FROM_NAME`
- `PROVA_SMTP_ENCRYPTION_KEY`

**Scope:** Functions mit "email" oder "support"

#### Gruppe: PDFMonkey (~3 Functions)
**ENVs:**
- `PDFMONKEY_API_KEY`
- `PDFMONKEY_FOTO_TEMPLATE_ID`
- `PDF_PROXY_SECRET`

**Scope:** Functions mit "pdf"

#### Gruppe: Webhook-Secrets (Function-spezifisch)
- `UPTIME_WEBHOOK_SECRET` → uptime-webhook
- `TERMIN_REMINDER_SECRET` → termin-* Functions
- `TEAM_INTEREST_SECRET` + `TEAM_INTEREST_RATE_LIMIT_IP_PER_MIN` → team-interest

#### PFLICHT-ALL-Functions (NICHT Scopen!)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `AUTH_HMAC_SECRET`
- `PROVA_INTERNAL_WRITE_SECRET`
- `PROVA_SUPABASE_JWKS_URL`
- `PROVA_SUPABASE_PROJECT_URL`
- `PROVA_AUDIT_TRAIL_TABLE`
- `PROVA_MIGRATION_PATH`

---

### Schritt 5 — Deploy triggern + verifizieren

1. Im Netlify-UI: "Deploys" → "Trigger deploy" → "Deploy site"
2. Watch Deploy-Log
3. **Erwartet:** Deploy succeeds (4KB-Limit-Error weg)

**Falls Deploy weiterhin fehlschlaegt:**
- Pruefe ob alle Schritte 1-4 done sind
- Pruefe ob Stripe-ENVs wirklich geloescht (Schritt 2a)
- Pruefe ob MAKE_WEBHOOK_*-Legacy-Vars geloescht (Schritt 3)
- Notfall-Plan: weitere Konsolidierung (z.B. PROVA_SMTP_* in JSON)

---

### Schritt 6 — Schema-Migration 07 anwenden (separat, falls noch nicht)

```sql
-- supabase-migrations/07_user_workflow_settings.sql
-- Apply via Supabase-CLI oder Dashboard SQL-Editor (Staging-Test pflicht)
```

Dies ist **unabhaengig vom ENV-Fix**, aber pflicht fuer Mode-B-Settings (workflow-settings.js Backend).

---

## Verifikation

### Test 1: Webhook-Trigger
```bash
curl -X POST 'https://prova-systems.de/.netlify/functions/make-proxy?key=k3' \
  -H 'Content-Type: application/json' -d '{}'
# Erwartet: 200 OK mit irgendeiner Antwort (oder skipped:true wenn Webhook nicht in JSON)
```

### Test 2: Stripe-Checkout (Default-Prices)
- Settings → Pakete → Solo abonnieren → Erwarten: Stripe-Checkout-Page mit 149€/Monat
- Wenn Fehler "Price not found": ENVs nicht korrekt geloescht ODER Defaults im Code nicht aktuell

### Test 3: Email-Webhook
- Trial-Erinnerung-Test (irgendein Trigger der `emails.js` aufruft)

---

## Rollback-Plan

Falls Deploy/Tests fehlschlagen:

1. **JSON-ENV behalten** aber Legacy-MAKE_WEBHOOK_*-ENVs WIEDERHERSTELLEN
   - Code (lib/make-webhooks.js) hat Backwards-Compat: liest beide
2. **Stripe-ENVs WIEDERHERSTELLEN** falls Stripe-Calls fehlen
3. **AIRTABLE_TOKEN/API_KEY WIEDERHERSTELLEN** falls Airtable-Auth fehlt
4. Function-Scopes auf "All" zuruecksetzen falls einzelne Functions ENVs vermissen

**Code-Side bleibt rueckwaerts-kompatibel** — kein Code-Rollback noetig.

---

## Zusammenfassung Reduktion

| Aktion | Reduktion |
|---|---:|
| MAKE_WEBHOOK_* (21) → MAKE_WEBHOOKS (1) | -20 |
| STRIPE_PRICE_* loeschen (5) | -5 |
| STRIPE_PRICE_ Tippfehler | -1 |
| AIRTABLE_TOKEN + _API_KEY | -2 |
| MAKE_S3/S4_WEBHOOK | -2 |
| PROVA_SENTRY_TEST_SECRET | -1 |
| **Total ENV-Count-Reduktion** | **-31** |

**Pre:** 85 Vars in JEDER Function = ~5-6KB
**Post:** ~54 Vars + Function-Scoping (jede Function nur ~10-15 Vars) = unter 4KB

---

*Marcel-Action-Plan-Stand 2026-05-07. Code-Side ready, Marcel-Side ausstehend.*
