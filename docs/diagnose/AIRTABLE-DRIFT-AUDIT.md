# AIRTABLE-DRIFT-AUDIT — Voll-Audit nach Marcel-Doktrin

**Datum:** 01.05.2026 abend
**Auftrag:** Marcel-Doktrin „PROVA ist seit Sprint K-1.0 bis K-1.5 vollständig auf Supabase migriert" verifizieren
**Status:** **MASSIV DRIFT** — Doktrin nicht erfüllt, Airtable lebt weiterhin im Live-Daten-Pfad
**Methode:** `grep -rli "airtable" --include="*.{js,html,toml,json,ts}"` + Funktionalitäts-Klassifikation

---

## TL;DR

**Die Voll-Supabase-Migration ist NICHT vollendet.** Der Auth-Stack ist auf Supabase, aber der **Daten-Stack** läuft weiterhin überwiegend gegen Airtable via Legacy-`/.netlify/functions/airtable`-Proxy. Konkrete Zahlen:

| Bereich | Airtable-Treffer |
|---|---:|
| Frontend Logic-Files (*-logic.js, Helper) | **~80** Files |
| Netlify Functions (Server-Side) | **32** Files |
| HTML-Pages mit Airtable-Refs | ~25 |
| ENV-Vars `AIRTABLE_*` | **12** Variablen |
| `api.airtable.com` direkte Calls | **22** Files |
| Sub-Folder Excluded | `scripts/migrate/` (legitim — One-Way-Migration), `tests/` (Mock-Tokens), `docs/archiv/`, `masterplan-v2/` (historisch) |

**Marcel-Doktrin „nirgendwo Airtable im Live-Flow" — Realität:** Live-Daten-Flow läuft fast vollständig über Airtable. Die Voll-Supabase-Migration umfasste Auth (K-1.0), Storage (K-1.0), Edge Functions (K-1.2), 5 Pure-Supabase-Pages (K-UI). Aber: **die ~50 Hybrid-Logic-Files** (akte-logic, archiv-logic, app-logic, einstellungen-logic, etc.) wurden **nie auf Supabase umgestellt** — sie nutzen weiterhin `provaFetch('/.netlify/functions/airtable', ...)`.

→ **Strategischer Cleanup-Sprint nötig** (~10-15h, abhängig von Tiefe).

---

## Kategorisierung der Treffer

### Kategorie A — TOT (kein Live-Trigger, im Repo-Klutter)

Pages die nicht in `nav.js` verlinkt sind und keine -logic.js haben die zur Page geladen wird.

Aus dem Cluster-Review-Auto: ein Großteil der HTML-Files mit Airtable-Refs sind DEAD-CANDIDATEs. 20 wurden bereits gelöscht (`cleanup/cluster-review-auto`-Branch · gemerged in main).

**HTML-Pages mit Airtable-Refs (vermutlich tot):**
- `404.html`, `account-gesperrt.html`, `avv.html` (Legal-Display), `datenschutz.html` (Legal-Display) → Treffer kommt aus inline JSON oder Footer-Verweis, nicht Live-Daten

→ **Action:** Bei Cluster-Review-Folge-Sprint mit-clean. Nicht akut.

### Kategorie B — AKTIV (Live-Trigger im Login-Flow) ⚠️ KRITISCH

Diese Files werden bei jedem Page-Load auf einer Hybrid-Page aufgerufen und triggern den 401 → Refresh-Race aus `OPTION-C-RACE-ANALYSE.md`.

| File | Calls | Was tut es |
|---|---|---|
| `frist-guard.js` | 3× provaFetch zu /.netlify/functions/airtable (Z.490, 948, 989) | Lädt Fristen-Übersicht beim DOMContentLoaded auf jeder geschützten Page — **Trigger-Quelle des aktuellen Bugs** |
| `prova-status-hydrate.js` | 1× provaFetch zu /.netlify/functions/airtable (Z.104) | Hydriert SV-Profil im Topbar/Nav (Email, Avatar) beim Page-Load |
| `nav.js` | 1× provaFetch zu /.netlify/functions/airtable | Live-Counts in Sidebar (Anzahl Aufträge, Termine etc.) |
| `prova-context.js` | 7× | User-Context-Bootstrap |
| `prova-account-gate.js` | – (indirekt via context) | Account-Gate-Check (gesperrt? trial-end?) |
| `auto-save.js` | – (indirekt) | Auto-Save für Form-Felder |

**Migration-Empfehlung:**
- `frist-guard.js` → migrieren auf Supabase-Direct (`auftraege`-Tabelle mit `frist_*`-Spalten) ODER deaktivieren bis Sprint 11 (Fristen-System aus `masterplan-v2/`)
- `prova-status-hydrate.js` → Supabase: `users` + `workspace_memberships`-Join statt Airtable `SV`-Tabelle
- `nav.js` Live-Counts → Supabase-RLS-Reads via `data-store.js`
- Helper (`prova-context`, `prova-account-gate`) → eine zentrale `data-store.profile`-Methode

### Kategorie C — AKTIV (Logic-Files für Page-Workflow)

Page-spezifische Logic-Files die Airtable-Daten lesen/schreiben. **Großvolume, ~50 Files.**

| Logic-File | Page | Airtable-Tabelle (vermutlich) |
|---|---|---|
| `akte-logic.js` | akte.html | FAELLE |
| `app-logic.js` | app.html | FAELLE + briefe + Eintraege |
| `archiv-logic.js` | archiv.html | FAELLE-Liste |
| `einstellungen-logic.js` | einstellungen.html | SV |
| `briefvorlagen-logic.js` | briefvorlagen.html | BRIEFE + Templates |
| `dashboard-logic.js` | dashboard.html | FAELLE-Stats |
| `freigabe-logic.js` | freigabe.html | FAELLE |
| `gericht-auftrag-logic.js` | gericht-auftrag.html | FAELLE |
| `import-assistent-logic.js` | import-assistent.html | mehrere |
| `jahresbericht-logic.js` | jahresbericht.html | FAELLE-Aggregation |
| `kontakte-logic.js` | kontakte.html | KONTAKTE |
| `mahnung-check.js`, `mahnwesen-logic.js` | mahnung* | RECHNUNGEN |
| `onboarding-logic.js` | onboarding.html | SV |
| `rechnungen-logic.js`, `schnelle-rechnung-logic.js` | rechnungen* | RECHNUNGEN |
| `statistiken-logic.js` | statistiken.html | mehrere |
| `stellungnahme-logic.js` | stellungnahme.html | FAELLE + Eintraege |
| `termine-logic.js` | termine.html | TERMINE |
| `textbausteine-logic.js`, `textbaustein-search.js` | textbausteine.html | TEXTBAUSTEINE |
| `vor-ort-logic.js` | vor-ort.html | FAELLE + Eintraege |
| `wertgutachten-logic.js` | wertgutachten.html | FAELLE |
| `baubegleitung-logic.js`, `beratung-logic.js` | Flow B/C/D | FAELLE |
| `erechnung-logic.js`, `ergaenzung-logic.js`, `schiedsgutachten-logic.js` | spezielle Workflows | FAELLE |
| `gutachterliche-stellungnahme-logic.js` | gutachterliche-stellungnahme.html | **bereits Pure-Supabase** ✅ |
| `effizienz-logic.js`, `hilfe-logic.js`, `mahnung-pdf.js`, `offline-gutachten.js` | sonstige | div |
| Helper: `foto-archiv.js`, `global-search.js`, `honorar-tracker.js`, `jveg-rechnung-transfer.js`, `slide-panel.js`, `support-chat.js`, `trial-guard.js`, `prova-airtable-api.js`, `prova-api-cache.js`, `prova-api.js`, `prova-audit.js`, `prova-auth-api.js`, `prova-click-guard.js`, `prova-error-handler.js`, `prova-notifications.js`, `prova-pdf-download.js`, `prova-sv-airtable.js`, `paket-guard.js`, `push-optin.js` | – | div |

**Migrations-Empfehlung pro Cluster:**

| Cluster | Supabase-Tabelle | Edge-Function falls KI-relevant |
|---|---|---|
| FAELLE | `auftraege` | – |
| KONTAKTE | `kontakte` | – |
| BRIEFE | `briefe` | `brief-generate` (X3, live) |
| TERMINE | `termine` | – |
| RECHNUNGEN | `rechnungen` | – |
| AUDIT_TRAIL | `audit_trail` | `audit-write` (live) |
| SV | `users` + `workspace_memberships` | – |
| TEXTBAUSTEINE | `textbausteine` | – |
| KI_STATISTIK | `ki_protokoll` | – |

**Aufwand:** **~10-15h** für ~50 Files. Pattern: `provaFetch('/.netlify/functions/airtable', {body: JSON.stringify({method:'GET', path:'/v0/.../tbl...'})})` → `dataStore.<entity>.list(...)` oder `getSupabase().from('<table>').select(...)`.

### Kategorie D — TOT-im-Code (DIREKTE api.airtable.com-Calls außerhalb Function-Pattern)

```
jveg-rechnung-transfer.js:117  fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_FAELLE}?...`)
mahnung-pdf.js:227            fetch(`https://api.airtable.com/v0/appJ7bLlAHZoxENWE/tblSzxvnkRE6B0thx`)
```

**Diese 2 Files calling Airtable DIREKT** ohne via Server-Function. Sicherheits-Anti-Pattern: API-Token müsste im Frontend sein (vermutlich nicht — vermutlich tot).

**Action:** prüfen ob Files wirklich aufgerufen werden. Falls tot: löschen. Falls aktiv: ersetzen durch Supabase-Calls.

### Kategorie E — Server-Side Functions (Netlify)

32 Functions referenzieren Airtable. Bei Inspection nach Funktion:

**Hardcore-Airtable (Daten-Pfad):**
| Function | Was tut es | Migration |
|---|---|---|
| `airtable.js` | Generic Airtable-Proxy mit Whitelist | **LÖSCHEN** nach Logic-File-Migration |
| `airtable-rate-limiter.js` | Helper für airtable.js | **LÖSCHEN** mit airtable.js |
| `lib/airtable-query.js` | Helper für Airtable-Reads | **LÖSCHEN** |
| `auth-token-issue.js` | Login (Provisional-Pfad nutzt Airtable-SV-Lookup) | **REFAKTORIEREN** auf Supabase-Auth-only |
| `provision-sv.js` | Sign-up provisioniert Airtable-SV-Eintrag | **REFAKTORIEREN** → Supabase-Insert |
| `audit-log.js` | Audit-Trail-Insert | → `audit_trail`-Tabelle in Supabase via Edge `audit-write` |
| `dsgvo-auskunft.js`, `dsgvo-loeschen.js` | DSGVO-Export/Löschen über Airtable | **REFAKTORIEREN** auf DB-Functions `dsgvo_user_export()` / `dsgvo_user_loeschen()` |
| `mein-aktivitaetsprotokoll.js` | User-Activity-Log | → Supabase |
| `foto-upload.js` | Foto-Upload mit Airtable-Attachment | **REFAKTORIEREN** auf Supabase-Storage |
| `setup-tabellen.js` | Initial-Setup | **LÖSCHEN** wenn Voll-Supabase live |
| `smtp-credentials.js`, `smtp-senden.js` | Email-SMTP-Helper | bekommt SMTP-Settings aus Airtable → migrieren auf Supabase |

**Marketing/Admin (kein Daten-Pfad):**
| Function | Was tut es | Migration |
|---|---|---|
| `team-interest.js` | Marketing-Interesse-Form | → Supabase Tabelle `team_interest_leads` ODER Make-Webhook |
| `error-log.js` | Frontend-Error-Log | → Supabase `frontend_errors`-Tabelle |
| `health.js` | Health-Check, ruft Airtable-Health an | umstellen auf Supabase-Health |
| `identity-signup.js` | Netlify-Identity-Signup-Hook | **LÖSCHEN** (Identity nicht mehr genutzt) |
| `pdf-proxy.js` | Signed-PDF-URLs | Airtable-Lookup → Supabase Storage |
| `push-notify.js` | Web-Push | nutzt Airtable PUSH_SUBSCRIPTIONS → migrieren |
| `stripe-webhook.js` | Stripe-Events | Airtable-SV-Lookup → Supabase `users` |

**Minor:**
- `lib/auth-resolve.js` Z.151 Audit-Trail-Insert → `audit_trail`-Tabelle Supabase
- `lib/fetch-with-timeout.js`, `lib/prova-cache.js`, `lib/prova-fachwissen.js`, `lib/prova-fetch.js`, `lib/prova-subscription.js`, `lib/rate-limit-user.js` → wahrscheinlich Helper, Airtable-Refs prüfen
- `ki-proxy.js`, `ki-statistik.js` → Airtable für KI-Cost-Tracking → migrieren auf `ki_protokoll`
- `normen.js`, `normen-picker.js` → Read-only Normen-Katalog → migrieren auf Supabase `normen`-Tabelle (oder als Edge Function)
- `prova-subscription.js` → Stripe-Subscription-Status Lookup

### Kategorie F — Migrations-Skripte (legitim, behalten)

Diese Skripte ZIEHEN Airtable-Daten in Supabase (One-Way-Migration). Pflicht zu erhalten für Daten-Recovery / Pilot-Onboarding-Migrate-Path:

```
scripts/migrate/01-sachverstaendige.js
scripts/migrate/02-kontakte.js
scripts/migrate/03-schadensfaelle.js
scripts/migrate/04-eintraege.js
scripts/migrate/05-rechnungen.js
scripts/migrate/06-audit-trail.js
scripts/migrate/07-ki-statistik.js
scripts/migrate/lib/airtable-reader.js
scripts/migrate/lib/env.js
scripts/migrate/lib/supabase-writer.js
scripts/migrate/lib/transform.js
scripts/migrate/run-all.js
scripts/migrate/validate.js
```

**Action:** unangetastet lassen. Die nutzen ihre eigene `lib/airtable-reader.js` und sind **nicht** im Live-Flow.

### Kategorie G — Test-Files (Mock-Tokens, behalten)

```
tests/00-smoke.spec.js (... bis 07-doppelklick.spec.js)
```

Verwenden gemockte HMAC-Tokens für Test-Auth, KEIN echter Airtable-Call.

**Action:** unangetastet lassen.

### Kategorie H — Config / Build

| File | Treffer |
|---|---|
| `netlify.toml` | 1 Match (CSP `connect-src` enthält `api.airtable.com` für Frontend-Direct-Calls) → **entfernen** wenn keine Direct-Calls mehr |
| `sw.js` | 1 Match (im fetch-handler `url.hostname.includes('airtable.com')` als Skip-Bedingung) → **entfernen** wenn kein Airtable mehr |

---

## ENV-Vars (zu entsorgen nach Cleanup)

```
AIRTABLE_PAT                ← der Hauptzugang
AIRTABLE_TOKEN              ← Legacy-Alias
AIRTABLE_API_KEY            ← Legacy-Alias
AIRTABLE_API                ← Legacy-Alias
AIRTABLE_BASE_ID            ← Base "appJ7bLlAHZoxENWE"
AIRTABLE_BASE               ← Legacy-Alias
AIRTABLE_TABLE_SV           ← SV-Tabelle "tbladqEQT3tmx4DIB"
AIRTABLE_TABLE              ← Legacy-Alias
AIRTABLE_BRIEFE_TABLE       ← BRIEFE "tblSzxvnkRE6B0thx"
AIRTABLE_AUDIT_TRAIL_TABLE  ← AUDIT_TRAIL "tblqQmMwJKxltXXXl"
AIRTABLE_RATE_LIMIT         ← Rate-Limit-Config
AIRTABLE_UNAVAILABLE        ← Failover-Flag
```

**12 ENV-Vars insgesamt.** Nach Cleanup ALLE in Netlify-UI entfernen. Plus PROVA_AUDIT_TRAIL_TABLE bleibt aber zeigt jetzt auf Supabase-Tabelle.

---

## Hardcoded-Defaults Check (Regel 34)

Ergebnis:

| Pattern | Treffer | Action |
|---|---|---|
| `tools/test-supabase-login.html` (Test-URL-Default) | `lib/supabase-client.js` Zeile 35 (in Error-String, nicht aktiv) | Aufräumen bei nächster Sprint-Edit, nicht akut |
| `marcel.schreiber@` (Hardcoded Email) | **KEINE Treffer** in *.js | ✅ |
| `65b25a13-17b7-45c0-b567-...` (Hardcoded Workspace-ID) | **KEINE Treffer** in *.js | ✅ |
| `appJ7bLlAHZoxENWE` (Hardcoded Airtable-Base) | `mahnung-pdf.js` Zeile 227 (direkter Airtable-Call) | Wird mit mahnung-pdf-Cleanup adressiert |

**Sauberer als erwartet** — keine kritischen Hardcoded-Defaults in Logic-Files.

---

## Strategische Drift-Bewertung

### Was die Voll-Supabase-Migration WIRKLICH gemacht hat

✅ Auth-Stack → Supabase Auth ES256 (Option C heute)
✅ Storage → Supabase Storage (Briefe, PDFs, Fotos seit X3/X4)
✅ Edge Functions → Supabase (ki-proxy, brief-generate v3, pdf-generate v3 etc.)
✅ Schema-Foundation → 61 Tabellen in `supabase-migrations/`
✅ 5 Pure-Supabase-Pages (briefe, kontakte-supabase, profil-supabase, gutachterliche-stellungnahme, onboarding-supabase)
✅ `lib/data-store.js` als Frontend-API-Layer (existiert, aber unterbenutzt)

### Was NICHT migriert wurde (Drift)

❌ ~50 Hybrid-Logic-Files lesen weiter Airtable via `airtable.js` Function
❌ 32 Netlify Functions referenzieren weiter `AIRTABLE_*` ENV-Vars
❌ Daten-Stack ist real Hybrid: einige Pages auf Supabase, viele auf Airtable
❌ `data-store.js` wird nur von 5 Pages genutzt — Logic-Files nutzen direkten provaFetch

### Was Marcel implizit ist und nicht weiß

> Marcel-Zitat (CLAUDE.md v3.0, 27.04.): „PROVA ist seit Sprint K-1.0 bis K-1.5 vollständig auf Supabase migriert"

Das ist die **Doktrin** — die ÜBERZEUGUNG. Nicht die Implementation.

Was tatsächlich passierte:
- K-1.0 baute die Foundation (lib/-Stack, Supabase-Client)
- K-1.1 baute Migrations-Pipeline (`scripts/migrate/`)
- K-1.2 baute Edge Functions
- K-1.3 baute Pilot-Page (Kurzstellungnahme — das ist die GREEN-Page `gutachterliche-stellungnahme.html`)
- K-1.4 sollte 11 Auftragstyp-Pages refactoren — **wurde nur teilweise umgesetzt** (5 GREEN-Pages, nicht 11)
- K-1.5 sollte Cutover machen (Make-Deaktivierung) — Edge Functions live, aber Logic-Files nicht migriert

**Die Drift hat sich bei Cutover Block 3 weiter verschärft:** wir haben 51 Pages auf `lib/auth-guard.js` migriert (Auth-Stack), aber **nicht** auf `lib/data-store.js` (Daten-Stack). Die Logic-Files lesen weiter Airtable.

→ **Ohne klaren Daten-Migrations-Sprint ist die Voll-Supabase-Doktrin nicht erfüllt.** Pilot mit 2-3 SVs würde funktionieren weil Airtable-Backend noch läuft. Aber die Architektur-Erzählung ist falsch.

---

## Empfehlung zur Reihenfolge der Folge-Sprints

### Sprint S1 — Race-Condition-Hotfix (sofort, ~10 min)

**Was:** OPT-A aus `OPTION-C-RACE-ANALYSE.md` (lazy-import in `prova-fetch-auth.js`)

**Effekt:** Defense-in-Depth funktioniert auch wenn Airtable-Calls failen. Kein Auto-Logout durch Race.

**Akzeptanz nach Hotfix:**
- Console: KEIN „supabase nicht verfuegbar" mehr
- Console: KEIN „refresh-retry failed → logout" im Normal-Flow
- Login → Dashboard, stabil bleibt

→ **`[FristGuard] Airtable Fehler` bleibt zunächst sichtbar** (wir fixen nur den Refresh, nicht den Trigger). Marcel-Akzeptanz „Airtable nicht in Logs" ist nach Sprint S1 NICHT erfüllt.

### Sprint S2 — Frist-Guard + Status-Hydrate isoliert deaktivieren / migrieren (~2-3h)

**Was:** Die zwei Logic-Files die JEDEN Page-Load triggern auf Supabase umstellen ODER deaktivieren bis Sprint 11.

**Optionen:**
- **S2a (schnell):** `frist-guard.js` und `prova-status-hydrate.js` deaktivieren via Feature-Flag → keine Airtable-Calls mehr beim Page-Load
- **S2b (richtig):** Migrieren auf Supabase-Reads (`auftraege`-Frist-Felder + `users`-Profil-Join)

**Effekt:** „Airtable Fehler"-Console-Log verschwindet bei Login. Akzeptanz erfüllbar wenn man S2a wählt.

### Sprint S3 — Logic-Files-Massmigration (~10-15h, mehrtägig)

**Was:** ~50 Logic-Files auf `lib/data-store.js` umstellen. Pattern-Replace pro Cluster (FAELLE, KONTAKTE, BRIEFE, etc.).

**Effekt:** Keine `provaFetch` mehr zu `/.netlify/functions/airtable`. Airtable-Drift im Frontend eliminiert.

### Sprint S4 — Netlify-Functions-Migration (~6-10h)

**Was:** Server-Side Functions (Kategorie E) auf Supabase umstellen (entweder als Netlify-Functions mit Service-Role-Key, oder als Supabase-Edge-Functions).

**Effekt:** Keine Airtable-API-Calls mehr im Backend.

### Sprint S5 — Cleanup ENV-Vars + airtable.js + CSP (~1-2h)

**Was:** Nach S3 + S4: `airtable.js` + `airtable-rate-limiter.js` + `lib/airtable-query.js` löschen, 12 ENV-Vars in Netlify-UI entfernen, `netlify.toml` CSP `api.airtable.com` raus, `sw.js` Skip-Bedingung raus.

**Effekt:** Marcel-Akzeptanz vollständig erfüllt. `grep -ri "airtable"` zeigt nur noch `docs/archiv/`, `masterplan-v2/`, `scripts/migrate/`.

---

## Zeit-Empfehlung

| Sprint | Aufwand | Marcel-Akzeptanz |
|---|---|---|
| S1 Race-Fix | 10 min | Login stabil ohne Logout |
| S2a Frist-Guard deaktivieren | 30 min | Airtable-Console-Log weg bei Login |
| S2b Migration (richtig) | 2-3h | dito + Feature behalten |
| S3 Logic-Massmigration | 10-15h | provaFetch zu airtable weg im Frontend |
| S4 Netlify-Functions | 6-10h | Server-Side keine Airtable-Calls |
| S5 Cleanup | 1-2h | ENV-Vars + airtable.js + CSP weg |
| **Total** | **~20-30h** | volle Marcel-Doktrin erfüllt |

**Pragma:** S1 + S2a sofort (35 min) → Marcel hat sauberen Login + saubere Console. S3-S5 als Mehrtages-Sprint nach Pilot-Setup oder parallel zu Pilot-Tests.

---

## Open Questions für Marcel

1. **Ist `AIRTABLE_PAT` in Netlify-ENV noch valid?** Wenn ja, läuft Airtable-Backend noch — wir können Logic-Files schrittweise migrieren ohne Datenverlust. Wenn nein, ist alles was Airtable ruft sowieso 401.

2. **Daten-Wahrheit-Frage:** Wo leben die echten User-Daten gerade? In Airtable oder in Supabase? Sind die 7 `scripts/migrate/`-Skripts (`01-sachverstaendige` bis `07-ki-statistik`) schon ausgeführt worden? `scripts/migrate/logs/` prüfen.

3. **Pilot-Strategie:** Sind die 2-3 Pilot-SVs schon über die `data-store.js`-API onboardet (Pure-Supabase) oder nutzen sie noch Airtable als Backend? Falls letzteres, ist der Drift kein blocker für Pilot-Funktionalität — aber er ist ein Audit-Risk und Architektur-Schuld.

---

## Browser-Console nach erwartetem Cleanup

Nach S1 + S2a (35 min Aufwand):
```
[fetch-auth] (kein Output mehr)
[FristGuard] (kein Output mehr — Feature deaktiviert)
[StatusHydrate] (kein Output mehr — Feature deaktiviert oder migriert)
[auth] Session detected on /login, no auto-redirect (anti-loop hotfix-2)
   ← bleibt nur sichtbar wenn Marcel direkt /login aufruft mit aktiver Session
```

Nach S3-S5 (Mehrtages-Cleanup):
```
(Logs vollständig clean)
```

---

*Audit erstellt 01.05.2026 abend · KEIN Code-Change · Wartet auf Marcel-Freigabe der Folge-Sprint-Reihenfolge*
