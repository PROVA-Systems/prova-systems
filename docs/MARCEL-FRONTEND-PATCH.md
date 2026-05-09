# Marcel-Aktion: Frontend-Patch (MEGA⁴⁴)

**Stand:** 2026-05-09 03:20 GMT+2
**Status:** Edge-Shim aktiv, Per-Page-Patches optional

---

## Was passiert ist

144 Edge Functions sind ACTIVE in Supabase. Statt 280+ `fetch('/.netlify/functions/...')` Aufrufe in 100+ Frontend-Files manuell zu patchen wurde **`lib/edge-shim.js`** gebaut, der das transparent zur Laufzeit macht:

```
fetch('/.netlify/functions/admin-system-health')
  ↓ shim intercepts ↓
fetch('https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-system-health')
  + Authorization: Bearer <session-token>
  + apikey: <anon-key>
```

Existierender Code muss **nicht angefasst werden**. Der Shim:
- Hängt sich an `window.fetch` an
- Erkennt `/.netlify/functions/<name>` Pfade
- Routet zur entsprechenden Edge-Function um
- Zieht den JWT-Token aus `supabase.auth.getSession()` automatisch
- Fällt auf `localStorage` zurück falls Singleton noch nicht da

---

## Was du tun musst

### 1. Service-Worker-Cache prüfen

`sw.js` ist bereits auf `prova-v2000-mega43-44-edge-complete` gebumpt und enthält `lib/edge-shim.js` im APP_SHELL. Beim nächsten Deploy zieht der Worker den Shim automatisch.

### 2. Script-Tag in HTML-Pages einfügen

Jede HTML-Page die Netlify-Functions aufruft braucht den Shim. Pflicht-Reihenfolge:

```html
<script src="lib/prova-config.js"></script>          <!-- Vor allem -->
<script type="module" src="lib/supabase-client.js"></script>  <!-- App-Pages -->
<script src="lib/edge-shim.js"></script>             <!-- AB JETZT alle fetches gewrappt -->
<!-- … rest der Page-Scripts … -->
```

**Pages die das brauchen** (nicht-erschöpfend, basierend auf grep):

App-Shell (mit Supabase-Login):
- `dashboard.html`
- `app.html` / `akte.html`
- `archiv.html` / `schadensfaelle.html`
- `freigabe.html` / `stellungnahme.html`
- `rechnungen.html` / `termine.html` / `jveg.html`
- `briefvorlagen.html` / `kontakte.html`
- `einstellungen.html` / `bescheinigungen.html`
- `normen.html` / `positionen.html` / `textbausteine.html`
- `baubegleitung.html` / `kostenermittlung.html`
- `admin-cockpit.html` / `admin-dashboard.html` / `admin-login.html`
- `audit-trail.html` / `freigabe-queue.html`
- `pilot.html` / `pricing.html` / `hilfe.html`

Public-Pages (nur prova-config + edge-shim, KEIN supabase-client):
- `index.html` (Landing) — falls `/team-interest` aufgerufen
- `auth-supabase.html`
- `health-test-down.html`

Empfehlung: `nav.js` lädt schon viele Pages — füge Shim global ein.

### 3. Lokal smoke-testen (5 Min)

```bash
# Lokal Server
npx http-server -p 8080

# Im Browser:
# 1. F12 → Console
# 2. Login durchführen (auth-supabase.html)
# 3. Dashboard öffnen
# 4. In Console schauen nach Logs:
#    [edge-shim] active — rerouting /.netlify/functions/* → ...
#    [edge-shim] reroute admin-system-health → https://cngteblrbpwsyypexjrv...
```

Erwartet: alle Fetch-Aufrufe gehen jetzt an die Edge-URLs, kein 404.

---

## Schwachstellen / Edge-Cases

1. **PDF-Downloads (Response: blob)**: Funktionieren über den Shim genauso, da nur die URL umgeschrieben wird.
2. **Multipart/Form-Data Upload (`foto-upload`, `editor-image-upload`)**: Funktioniert — der Shim ändert nur URL+Headers, nicht den Body.
3. **Server-Sent Events / Streams**: Nicht relevant für PROVA — alle Edge-Functions sind request-response.
4. **POST mit `Content-Type` aus FormData**: Browser setzt automatisch `multipart/form-data; boundary=...`. Shim setzt nicht override (`if (!headers.has('Content-Type'))`).
5. **CORS-Preflight (OPTIONS)**: Edge-Functions haben CORS-Headers; identisch zu Netlify.

---

## Notfall-Deaktivierung

Falls der Shim Probleme macht, in Browser-Console:

```javascript
window.PROVA_EDGE_SHIM_DISABLED = true;
location.reload();
```

Oder per HTML-Tag VOR `lib/edge-shim.js`:

```html
<script>window.PROVA_EDGE_SHIM_DISABLED = true;</script>
<script src="lib/edge-shim.js"></script>
```

Dann gehen Fetches wieder direkt an `/.netlify/functions/...` (legacy Lambdas, falls noch nicht 410-stub).

---

## Per-Page-Migration (optional, nach Pilot-Start)

Nach dem Pilot solltest du Schritt-für-Schritt die Aufrufe nativ migrieren auf:

```javascript
// Vorher:
const res = await fetch('/.netlify/functions/admin-system-health');
const data = await res.json();

// Nachher (sauberer, ohne Shim-Dependency):
const data = await window.callEdgeFunction('admin-system-health', undefined, { method: 'GET' });
```

Der `callEdgeFunction` Helper ist auch in `lib/edge-shim.js` verfügbar.

---

## Pre-Pilot-Smoke-Test-Liste

Diese Functions MÜSSEN funktionieren bevor Pilot live geht:

| Function | Wo geklickt? | Was prüfen? |
|---|---|---|
| `auth-supabase` (native) | Login-Modal | JWT in localStorage |
| `provision-sv` | Nach Stripe-Checkout | Workspace+Membership angelegt |
| `dashboard-fristen-upcoming` | Dashboard | Fristen-Liste lädt |
| `list-auftraege` | Dashboard / Akte-List | Aufträge erscheinen |
| `eintraege-create` | Akte → Eintrag | Eintrag persistiert |
| `pdf-generate` | Akte → PDF | PDF-URL kommt zurück |
| `email-welcome` (cron) | Pilot-Onboarding | Email landet im Inbox |
| `stripe-checkout` | Pricing → Plan | Stripe-Session öffnet |
| `stripe-webhook` | Stripe-Test-Event | Status syncs |
| `admin-system-health` | Admin-Cockpit | Grüner Check |
| `auth-2fa-setup` | Einstellungen → 2FA | QR-Code rendert |
| `dsgvo-loeschen-antrag` | DSGVO-Mein-Konto | 30d-Mail kommt |
| `support-ticket-create` | Hilfe → Ticket | Marcel kriegt Mail |

---

## Status-Übersicht

| Wave | Functions | ACTIVE | Status |
|---|---|---|---|
| Welle 1 — Cockpit | 23 | ✅ 23 | DONE |
| Welle 2 — KI-Pipeline | 8 | ✅ 8 | DONE |
| Welle 3 — Stripe+Email | 15 | ✅ 15 | DONE |
| Welle 4 — Auftrag+Fristen | 13 | ✅ 13 | DONE |
| Welle 5 — Document+PDF+Editor | 28 | ✅ 28 | DONE |
| Welle 6 — DSGVO+2FA+Compliance | 10 | ✅ 10 | DONE |
| Welle 7 — Admin+Workflow+Cron+Onboarding+Import | 47 | ✅ 47 | DONE |
| **TOTAL** | **144** | **✅ 144** | **DONE** |

Deferred: `parse-beweisbeschluss`, `parse-docx` (Node-spezifisch, post-pilot)
