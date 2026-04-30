# CUTOVER-BLOCK-3 — Inventory

**Datum:** 01.05.2026 nachts
**Sprint:** Login-Loop-Fix (Option B + Bridge-Layer-Hybrid)
**Branch:** `fix/login-loop-permanent`

---

## Zahlen

| Kategorie | Anzahl |
|---|---:|
| **YELLOW** (Legacy `auth-guard.js` + Inline-IIFE-Guard) | **53** |
| **RED** (Netlify Identity Widget) | **6** (`app-login` ist auch in YELLOW gezählt) |
| **GREEN** (Logic-Files mit `import lib/auth-guard.js`) | 5 Pages, via ESM-Logic |
| `prova-fetch-auth.js` Vorkommen | 58 Pages |

---

## Pages-Klassifikation für Migration

### MIGRATE (51 Pages — der Kern dieses Sprints)

Alle YELLOW-Pages **außer**:
- `app-login.html` → RED, Login-Page selbst, wird nicht migriert (wird nach Cutover obsolet)
- `admin-dashboard.html` → ADMIN-Subdomain-Scope, separater Sprint

```
abnahmeprotokoll-formal, akte, anforderung-unterlagen-erweitert, app, archiv,
auftrag-ablehnung, baubegleitung, begehungsprotokoll, benachrichtigungen, beratung,
briefvorlagen, dashboard, datenschutz-einwilligung-gericht, einstellungen, erechnung,
ergaenzung, freigabe-queue, freigabe, gericht-auftrag, hilfe, import-assistent,
jahresbericht, jveg, kontakte, kostenermittlung, maengelanzeige, mahnung-1, mahnung-2,
mahnung-3, mahnwesen, normen, onboarding-welcome, ortstermin-modus, portal, positionen,
rechnungen, rechnungskorrektur, schiedsgutachten, statistiken, stellungnahme-gegengutachten,
stellungnahme, terminabsage, termine, textbausteine, vollmacht-sv, vor-ort, wertgutachten,
widerspruch-gegengutachten, widerspruch-gutachten, zpo-anzeige, zwischenbericht
```

### SKIP (8 Pages)

| Page | Grund |
|---|---|
| `app-login.html` | Legacy-Login-Page, durch login.html ersetzt |
| `admin-dashboard.html` | ADMIN-Subdomain (separater Sprint) |
| `account-gesperrt.html` | RED, niedrige Priorität, selten getroffen |
| `effizienz.html` | RED, Tier GRAY (vermutl. tot — Cluster-Review pending) |
| `mahnung.html` | RED, durch mahnung-1/2/3 ersetzt (Cluster-Review pending) |
| `stellungnahme-gate.html` | RED, vermutl. tot |
| `stellungnahme-v3.1.html` | RED, alte Version |
| `app-register.html` | nicht in YELLOW-Liste, Auth-spezifisch |

### Schon GREEN (5 Pages — keine Migration nötig)

```
briefe.html               (Logic via briefe-logic.js)
kontakte-supabase.html    (Logic via kontakte-supabase-logic.js)
profil-supabase.html      (Logic via profil-supabase-logic.js)
gutachterliche-stellungnahme.html
onboarding-supabase.html
```

---

## Migration-Pattern pro Page

**Vorher (Legacy):**
```html
<script src="prova-fetch-auth.js"></script>
<script src="auth-guard.js"></script>             <!-- LEGACY -->
<script>
(function(){
  // Inline-IIFE-Guard mit prova_auth_token + prova_sv_email Check
  if (typeof provaAuthGuard !== 'function') { window.location.replace('app-login.html'); return; }
  var ok = provaAuthGuard({ silent: true });
  var email = localStorage.getItem('prova_sv_email') || '';
  if (!ok || !email) { window.location.replace('app-login.html'); return; }
})();
</script>
```

**Nachher (neu):**
```html
<script src="prova-fetch-auth.js"></script>       <!-- Helper bleibt, Bridge füllt prova_auth_token -->
<script src="/lib/prova-config.js"></script>
<script type="module">
  import { runAuthGuard } from '/lib/auth-guard.js';
  runAuthGuard().catch(e => console.error('[auth] guard failed', e));
</script>
```

**Was geändert wird:**
- `<script src="auth-guard.js">` ENTFERNT
- Inline-IIFE-Guard ENTFERNT
- `<script src="/lib/prova-config.js">` HINZUGEFÜGT (Pflicht-Vorbedingung für lib-Module)
- `<script type="module">` mit ESM-Import + `runAuthGuard()` Aufruf HINZUGEFÜGT

**Was BLEIBT (bewusst):**
- `prova-fetch-auth.js` (Helper, kein Auth-Guard, nutzt Bridge-Token)
- `prova-preise.js`, `paket-guard.js`, `prova-notifications.js`, andere Logic-Files (lesen Bridge-Keys)
- nav.js (lädt asynchron, eigener Logout-Handler)
- Alle Page-spezifischen `-logic.js` Files (lesen `localStorage.prova_sv_email` etc. — Bridge füllt das)

---

## Bridge-Layer-Plan (Phase B-1, vor HTML-Migration)

`lib/auth-guard.js` `runAuthGuard()` schreibt nach Session-OK:
- `prova_auth_token` = Bridge-Token (`base64(payload).bridge-supabase-<id>`)
- `prova_sv_email` = `session.user.email`
- `prova_user` = JSON `{email, id, bridge:true}`
- `prova_last_activity` = `Date.now().toString()`

`lib/supabase-client.js` `signOut()` clearet beide Stacks symmetrisch.

`auth-supabase-logic.js` `handleLogin()` + `handleSignUp()` setzen die Bridge-Keys auch direkt nach erfolgreichem Login (vor dem Redirect zu `/dashboard`), damit der Inline-IIFE-Guard auf der Ziel-Page **synchron** durchgeht (Bridge muss VOR Page-Render greifen).

Plus Belt-and-Suspenders:
- **Loop-Counter** in `sessionStorage` (5 Redirects in 30s → Fehlermeldung)
- **`next=`-Sanitizer** in Path B (verhindert next=/login)

---

## Migration-Reihenfolge (Batches)

| Batch | Pages | Frequenz |
|---|---|---|
| **B1 — Core/Sidebar (12)** | dashboard, akte, app, archiv, briefe-→ schon GREEN, einstellungen, freigabe, freigabe-queue, kontakte, profil-→GREEN, rechnungen, stellungnahme, termine | hochfrequent |
| **B2 — Flows (4)** | baubegleitung, beratung, wertgutachten, ortstermin-modus | mittel |
| **B3 — Werkzeuge (10)** | jveg, normen, textbausteine, positionen, zpo-anzeige, jahresbericht, kostenermittlung, hilfe, statistiken, briefvorlagen | mittel |
| **B4 — Single-Workflow (~25)** | abnahmeprotokoll-formal, anforderung-..., auftrag-ablehnung, begehungsprotokoll, datenschutz-..., erechnung, ergaenzung, gericht-auftrag, import-assistent, maengelanzeige, mahnung-1/2/3, mahnwesen, onboarding-welcome, portal, rechnungskorrektur, schiedsgutachten, stellungnahme-gegengutachten, terminabsage, vollmacht-sv, vor-ort, widerspruch-gegengutachten, widerspruch-gutachten, zwischenbericht, benachrichtigungen | niedrig bis selten |

---

## Erwartete Risiken

1. **Legacy-Functions liefern 401** weil Bridge-Token nicht server-HMAC-valid ist
   - Mitigation: betroffene Functions sind ohnehin auf Cleanup-Liste
   - Marcel meldet pro Page wenn Action fehlschlägt
2. **Page-spezifische Inline-Guards** mit anderem Pattern (z.B. Admin-Check)
   - Mitigation: pro Page kurz prüfen vor Edit. STOPPEN bei Sondercases, NACHT-PAUSE-LOOP-FIX.md
3. **Logic-Files die `prova_user.kanzlei` etc. lesen**
   - Bridge-Token-Payload ist minimal (email+id+bridge:true). Kanzlei-Felder fehlen → Logic-Files können `undefined`-Reads machen
   - Mitigation: Bridge-Schema erweitern wenn Page bricht (incremental fix, dokumentiert)

---

*Inventar erstellt 01.05.2026 01:45 · Migration startet jetzt*
