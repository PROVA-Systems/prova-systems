# MEGA⁴⁵ Frontend-Smoke-Audit

**Datum:** 2026-05-09 03:50 GMT+2 (post-Marcel-ENV-Cleanup)
**Sprint:** MEGA⁴⁵ — edge-shim Auto-Injection + Push
**Tool:** `tools/inject-edge-shim.sh` (idempotent)

---

## Zusammenfassung

| Metrik | Wert |
|---|---|
| HTML-Files im Scope | 214 |
| HTML-Files mit edge-shim.js (NACH Injection) | **91** |
| HTML-Files mit `/.netlify/functions/*` Calls | 58 |
| JS-Files (Frontend) mit `/.netlify/functions/*` Calls | 106 |
| **Total Netlify-Calls im Frontend** | **415** |
| Cloudinary-URLs im Frontend | **0** ✅ |
| Make.com-Webhooks im Frontend | **20+ Calls in 10 Files** ⚠ |
| Idempotenz verifiziert | ✅ (2. Run = 0 Injected) |

---

## Edge-Shim-Coverage

`tools/inject-edge-shim.sh` injiziert `<script src="lib/edge-shim.js">` in zwei Modi:

### Modus 1: Nach `prova-config.js` Zeile (87 Files)
HTMLs mit existierender Supabase-Foundation kriegen den Shim direkt nach
dem Config-Loader, sodass `window.PROVA_CONFIG` schon verfügbar ist:

```html
<script src="lib/prova-config.js"></script>
<script src="lib/edge-shim.js"></script>     <!-- AUTO-INJECTED -->
<script type="module" src="lib/supabase-client.js"></script>
```

Pfad-Detection: relativ (`lib/...`) vs. absolut (`/lib/...`) wird automatisch
angepasst.

### Modus 2: Vor `</head>` (4 Files)
HTMLs ohne `prova-config.js` aber mit `/.netlify/functions/*` Calls
(Public Pages: index, status, support, public-status etc.):

```html
  <script src="/lib/edge-shim.js"></script>
</head>
```

Edge-Shim funktioniert auch ohne Supabase-Client — fällt auf
`localStorage.sb-*-auth-token` für JWT-Extraktion zurück.

---

## Top-15 Files nach Netlify-Call-Volumen

```
admin-cockpit.html          25 calls   (Admin-Dashboard, alle Sektionen)
admin/voll.html             13 calls
admin-dashboard.html        12 calls
lib/schadensfall-tabs-widget.js  10 calls
akte-logic.js               10 calls   (Auftrag CRUD)
einstellungen.html           9 calls
app-logic.js                 9 calls   (Hauptlogik App.html)
stellungnahme-logic.js       8 calls
prova-context.js             8 calls
einstellungen-logic.js       8 calls
rechnungen-logic.js          7 calls
prova-fetch-auth.js          7 calls
prova-auth-api.js            7 calls
lib/editor-tiptap.js         7 calls
admin/index.html             7 calls
```

Alle 415 gehen jetzt durch `window.fetch` → `edge-shim` → Supabase Edge.

---

## ⚠ Make.com-Webhooks (Post-Pilot Migration)

**Frontend-Files mit direkten Make-Webhook-POSTs** (NICHT durch edge-shim
gerouted, da `hook.eu1.make.com` URL):

```
app-logic.js                   (5 Webhooks: G1, K1, S11, Whisper, etc.)
dashboard-logic.js             (S8 Support-Webhook)
kontakte-logic.js              (S8 Support-Webhook)
termine-logic.js               (S8 Support-Webhook)
freigabe-logic.js              (S1, S3 Webhooks)
briefvorlagen-logic.js         (K3 Webhook)
beratung-logic.js              (K3 Webhook)
baubegleitung-polish.js        (K3 Webhook)
wertgutachten-logic.js         (K3 Webhook)
prova-pseudo-send.js           (Pseudonymisierungs-Pre-Check)
```

**Stand:** Diese 20+ direkten Make-Calls funktionieren weiterhin
(Make-Scenarios sind aktiv). Pre-Pilot KEIN Blocker.

**Migrations-Pfad (post-Pilot):**

| Make-Webhook | Edge-Replacement |
|---|---|
| Support-Webhook (S8) | `support-ticket-create` (User-JWT) |
| Whisper-Webhook | `whisper-diktat` (bereits ACTIVE) |
| K3 Brief-Webhook | `brief-generate` (bereits ACTIVE) |
| G1/S1/S3 Gutachten-Webhooks | `pdf-generate` / `generate-pdf-mode-c` |

In K-1.5 Cutover: alle Make-Scenarios deaktivieren + Frontend-URLs durch
Edge-Calls ersetzen.

---

## ✅ Cloudinary

**0 Cloudinary-Referenzen im Frontend.** Storage-Layer ist komplett auf
Supabase Storage migriert (Buckets `sv-files`, `sv-public`, `sv-system`).

Verified:
```bash
grep -r "cloudinary\|res\.cloudinary\.com\|api\.cloudinary\.com" \
    --include="*.html" --include="*.js" \
    --exclude-dir=docs,tools,tests,netlify,scripts \
    .
# (kein Output)
```

---

## Funktionierende Architektur (post-Push)

```
Browser-fetch('/.netlify/functions/X')
        ↓
   edge-shim.js Interceptor (window.fetch monkey-patched)
        ↓
   _extractFunctionName('X')
        ↓
   _getAccessToken()
     ├─ window.__provaSupabaseClient.auth.getSession() (primär)
     └─ localStorage 'sb-*-auth-token' (fallback)
        ↓
   fetch('https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/X')
     + Authorization: Bearer <jwt>
     + apikey: <anon-key>
        ↓
   Edge-Function (Deno-Runtime)
     + verify_jwt: true → Supabase auto-validates Bearer
     OR adminHandler → Email-Whitelist + 2FA-Check
     OR cron-secret → x-cron-secret Header
        ↓
   Postgres + RLS-Policies basierend auf workspace_id
```

---

## Test-Empfehlung für Marcel

Nach `git push origin main` und Netlify-Auto-Deploy:

1. **Browser-Console** auf einer App-Page öffnen (F12 → Console)
2. Erwartete Logs:
   ```
   [edge-shim] active — rerouting /.netlify/functions/* → https://...
   [edge-shim] reroute admin-system-health → https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-system-health
   ```
3. **Network-Tab**: alle XHR-Requests gehen an `*.supabase.co/functions/v1/*` statt `/.netlify/functions/*`
4. **Smoke-Sequenz**: `docs/smoke-test-frontend-pages.md` durchklicken (10 Sektionen, ~30 Min)

---

## Notfall-Deaktivierung

Falls der Shim Probleme macht:

```javascript
// Browser-Console:
window.PROVA_EDGE_SHIM_DISABLED = true;
location.reload();
```

Oder in HTML einfügen vor `<script src="lib/edge-shim.js">`:

```html
<script>window.PROVA_EDGE_SHIM_DISABLED = true;</script>
```

Dann routen Fetches wieder direkt zu `/.netlify/functions/*`. Da
Marcel ENVs in Netlify gecleant hat, funktionieren diese Lambdas
allerdings nicht mehr — daher ist der Shim faktisch erforderlich.

---

## Pre-Pilot-Status

| Item | Status |
|---|---|
| Edge Functions deployed | ✅ 144 ACTIVE |
| pg_cron Schedules | ✅ 6 aktiv (Vault-Secrets) |
| Edge-Secrets in Supabase | ✅ gesetzt |
| Netlify-ENVs gecleant | ✅ < 500 Bytes |
| **edge-shim.js in 91 HTMLs** | **✅ MEGA⁴⁵ |
| sw.js CACHE_VERSION | ✅ v2000 |
| `git push origin main` | ⏳ pending (jetzt) |
| Browser-Smoke-Test | ⏳ Marcel (~30 Min) |
| Pilot-Onboarding | ⏳ 3-4 SVs |

---

## Tag

`mega45-frontend-patch-complete` — set after commit.
