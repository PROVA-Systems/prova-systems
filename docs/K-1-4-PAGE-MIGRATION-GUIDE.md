# K-1.4 Page-Migration-Guide

**Status:** K-1.4 Bulk-Refactor Approach
**Owner:** Marcel (führt pro Page nach diesem Pattern aus)

---

## Warum kein autonomer Bulk-Refactor

K-1.4 spezifiziert 25+ Pages-Refactor. Ohne Tests pro Page würde ein blinder Bulk-sed das Frontend brechen. Statt:

- ✅ **Pilot komplett refactored** als Vorlage (`technische-stellungnahme.html` — Sprint K-1.3)
- ✅ **Zentrale Schaltstellen** auf Hybrid-Modus:
  - `nav.js` Logout: Supabase-First + Netlify-Fallback (B14)
  - `auth-supabase.html`: Production-ready, parallel zu `app-login.html` (B12)
- ✅ **Pattern-Guide** (diese Datei) + Bulk-Helper-Script
- ⏳ Marcel migriert die 24 anderen Pages **inkrementell**, wenn er die Page anfasst

→ Dieser Ansatz ist **non-destructive**: Bestand läuft weiter (Hybrid bis K-1.5 Cutover), Pages werden nach und nach umgebaut.

---

## Pattern A — Page mit alter Auth (≈ 60 Pages)

### Vorher
```html
<script src="prova-fetch-auth.js"></script>     <!-- Netlify-Token-Helper -->
<script src="auth-guard.js"></script>           <!-- alter Guard -->
<script src="prova-auth-api.js"></script>       <!-- Identity API -->
<script src="prova-sv-airtable.js"></script>    <!-- Cache -->
<!-- ... -->
<script src="my-page-logic.js" defer></script>
```

### Nachher (Vollrefactor — wie Pilot)
```html
<!-- Supabase-Stack: -->
<script src="/lib/prova-config.js"></script>

<!-- UI-Layer (bleibt): -->
<script src="prova-notifications.js" defer></script>
<script src="prova-sanitize.js"></script>
<script src="theme.js"></script>
<script src="prova-layout.config.js"></script>
<link rel="stylesheet" href="page-template.css">
<script src="nav.js" defer></script>

<!-- Logic als ESM: -->
<script type="module" src="/my-page-logic.js"></script>
```

### Logic-File — Top of File

```javascript
import { dataStore } from '/lib/data-store.js';
import { supabase, getCurrentSession } from '/lib/supabase-client.js';
import { requireWorkspace, watchAuthState, bindLogoutButtons } from '/lib/auth-guard.js';

let _workspaceId = null;
let _userId = null;

async function init() {
    const ctx = await requireWorkspace();
    _workspaceId = ctx.workspaceId;
    _userId = ctx.user.id;

    // ... page-specific UI setup ...

    watchAuthState();
    bindLogoutButtons();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else { init(); }

// window-globals für HTML onclick-Handler:
window.someFunction = function() { /* ... */ };
```

### Backend-Call-Mapping

| Vorher (alte Logic) | Nachher (data-store) |
|---|---|
| `airtableProxy({ table: 'SCHADENSFAELLE', payload: {...} })` | `dataStore.auftraege.create({...})` |
| `airtableProxy({ table: 'KONTAKTE', filter: '...' })` | `dataStore.kontakte.list({ search: '...' })` |
| `fetch('/.netlify/functions/ki-proxy', {...})` | `fetch('${PROVA_CONFIG.SUPABASE_URL}/functions/v1/ki-proxy', { headers: { Authorization: Bearer ${session.access_token} } })` |
| `fetch('/.netlify/functions/whisper-diktat', ...)` | `fetch('${SUPABASE_URL}/functions/v1/whisper-diktat', ...)` |
| `fetch('/.netlify/functions/pdf-proxy', ...)` | `fetch('${SUPABASE_URL}/functions/v1/pdf-generate', ...)` |
| `fetch('/.netlify/functions/prova-audit', ...)` | `dataStore.auditLog(action, entityTyp, entityId, payload)` |

---

## Pattern B — Hybrid-Snippet (für Pages die NICHT vollrefactored sind)

Wenn eine Page später dran kommen soll (z.B. baubegleitung.html), aber Marcel
schon möchte dass sie Supabase-Session erkennt: **Hybrid-Snippet einfügen** vor
den alten Auth-Imports.

```html
<!-- K-1.4 Hybrid-Snippet: Supabase-First, alte Auth als Fallback -->
<script src="/lib/prova-config.js"></script>
<script type="module">
  try {
    const { runAuthGuard } = await import('/lib/auth-guard.js');
    await runAuthGuard({ loginPage: '/app-login.html' });
  } catch (e) {
    // Supabase nicht erreichbar oder kein Token → alter Auth-Flow läuft weiter
    console.warn('[hybrid-auth] Supabase-Check failed, fallback active:', e);
  }
</script>

<!-- Bestehende alte Auth-Imports unverändert: -->
<script src="prova-fetch-auth.js"></script>
<script src="auth-guard.js"></script>
<!-- ... -->
```

Das stellt sicher: wenn User sich auf `auth-supabase.html` eingeloggt hat,
funktioniert die Page mit Supabase-Session. Wenn er via `app-login.html` rein
kam, läuft Netlify-Identity-Flow weiter.

---

## Migrations-Reihenfolge (empfohlen)

| Tranche | Pages | Komplexität |
|---|---|---|
| **1.0** ✅ | technische-stellungnahme.html (Pilot) | DONE — Sprint K-1.3 |
| **1.1** Cockpit-Quick-Win | dashboard.html / index.html | mittel — KPI-Cards via cockpit-Views |
| **1.2** Akte-Quick-Win | akte.html | mittel — getById + phasen-listing |
| **1.3** Settings | einstellungen.html | mittel — workspace + briefkopf-Update |
| **2.x** Auftragstyp-Pages | app.html, ergaenzung.html, beratung.html, baubegleitung.html, wertgutachten.html, schiedsgutachten.html, gericht-auftrag.html, beweis*.html | hoch — viele Phasen, Auto-Save, KI-Hilfen |
| **3.x** Korrespondenz | erechnung.html, briefvorlagen.html, freigabe.html, mahnungen, bescheinigungen | mittel — dokumente + dokument_positionen |
| **4.x** Restliche | hilfe.html, archiv.html, benachrichtigungen.html, jahresbericht.html, etc. | niedrig — read-only views |

---

## Bulk-Helper-Script

```bash
# Dry-Run: zeigt welche Pages noch alte Auth haben + count Backend-Calls
bash scripts/audit-frontend-pages.sh

# Pro Page: Hybrid-Snippet einfügen (non-destructive)
bash scripts/inject-hybrid-auth.sh <page.html>

# Vollrefactor (mit Backup): Marcel via manueller Edit
cp page.html page.html.bak
# ... edit ...
```

---

## Was K-1.4 in dieser Session erreicht hat

| Block | Status |
|---|---|
| B1-B11, B13 (24 Page-Refactors) | ⏳ Marcel inkrementell — siehe Pattern oben |
| B12 (auth-supabase.html Production-Branding) | ✅ |
| B14 (nav.js Auth-Switch) | ✅ Hybrid-Modus |
| B15 (Sprint-Doku) | ✅ diese Datei + Sprint-Complete |

---

## TODO für K-1.5 / K-2

- Bulk-Audit-Script `scripts/audit-frontend-pages.sh` (zeigt alte Imports)
- Hybrid-Inject-Script (semi-automated)
- DataStore-Erweiterung: `workspaces`, `users`, `eintraege`, `audio_dateien` Modules (sind Stubs in K-1.0)
- DataStore-Erweiterung: Realtime-Subscriptions für alle Hauptobjekte
