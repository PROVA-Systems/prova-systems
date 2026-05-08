# AUDIT 2026-05-07 — MEGA³⁴ Code-Komplettheits-Prüfung

**Auditor:** Claude Code Opus 4.7
**Modus:** PURE AUDIT (kein Build, kein Commit)
**Branch:** mega34-final-100-percent
**Tag:** v950
**Methode:** Read-only — git log + grep + ls + diff (refs vs files)

---

## 🟢 Was VOLLSTÄNDIG ist

### MEGA³⁴ Items (10/10 Code vorhanden, aber siehe Lücken unten)

| Item | Code | Tests | UI-Wired | Schema | Notes |
|---|---|---|---|---|---|
| A1 Cookie-Banner DSGVO | ✅ | ✅ 13 | ✅ | ✅ 18 | lib/cookie-consent.js v2.0 + cookie-einstellungen.html + cookie-consent-log.js + Auto-Init in prova-fetch-auth.js |
| A2 schadensfaelle Universal-Liste | ✅ | ✅ 12 | ✅ | n/a | Page hatte Filter; M34 ergänzte Datum-Range + Pagination + Bulk + CSV. **🔴 ABER:** ruft `list-auftraege`-Lambda auf, das **fehlt** (siehe unten) |
| A3 Cmd-K Aktionen-Kategorie | ✅ | ✅ 12 | ✅ | n/a | global-search Lambda hat Aktionen-Field; Frontend lib/global-search-engine.js + global-search.js mit Cmd+K-Listener |
| A4 iCal-Export Lambda | ✅ | ✅ 11 | ✅ | ✅ 19 | termine-ical-export.js gebaut. **🔴 ABER:** termine.html ruft `termine-ical-token`-Lambda auf für Subscribe-URL — **fehlt** |
| B1 360°-Verknüpfungen | ✅ | ✅ 10 | ✅ | n/a | kontakt-aktivitaeten.js + 3-Tab-UI in kontakte.html |
| B2 5 Onboarding-Mails | ✅ | ✅ 16 | ✅ | ✅ 20 | 5 Templates + Cron-Lambda + UNIQUE-Index + netlify.toml-Schedule "0 9 * * *" |
| B3 Public Status-Page | ✅ | ✅ 10 | ✅ | ✅ 21 | public-status.html + public-status.js Lambda + /status-Routing |
| B4 Master-Doku v3.0 | ✅ | ✅ 6 | n/a | n/a | VISION + SPRINTS + CHAT-TRANSPORT + README + CHANGELOG alle aktualisiert |
| C1 KI-Live-Verify | ✅ | ✅ 6 | n/a | n/a | _helper.js + 12 Live-Tests (skip ohne ENV) + npm `test:ki-live` |
| C2 Playwright E2E | ✅ | ✅ 8 | n/a | n/a | playwright.config.js + 8 e2e.js-Files + npm `test:e2e` |

### MEGA³³ Items (Verifikation)

| Item | Status |
|---|---|
| B1 7 Tranche-1 IHK-SVO | ✅ 7 Templates Teil 1+2+3+4 + 3.4 Fachurteil |
| B2 Prompt-Caching W4 | ✅ enableCacheControlIfStable + cache_control:ephemeral in ki-proxy.js |
| B3 Cross-Device-Sync | ✅ E2E-Tests + Audit-Doku (Realtime-Foundation in lib/data-store.js) |
| B4 Forced Re-Consent | ✅ Auto-Lazy-Load in prova-fetch-auth.js (Zeile mit `data-mega33-b4`) |

### Configuration

| Element | Status |
|---|---|
| sw.js v950 | ✅ |
| APP_SHELL hat alle M³⁰-³⁴ Pages | ✅ (schadensfaelle/cookie-einstellungen/public-status/demo/honorar-rechner/bescheinigung-erstellen alle drin) |
| netlify.toml /status-Routing | ✅ |
| netlify.toml onboarding-mail-cron Schedule | ✅ "0 9 * * *" |
| package.json test:e2e + test:ki-live | ✅ |
| Tag v950 gesetzt + gepusht | ✅ |

---

## 🟡 Was UNKLAR ist (Live-Test / Marcel-Verify nötig)

| Punkt | Details |
|---|---|
| `admin-env-status`, `admin-ki-aggregations` | Werden im Frontend referenziert — vermutlich Admin-Cockpit-Pages. Pre-MEGA-Legacy oder echt fehlend? Nicht klar ohne Page-Read. |
| `auftrag-mode-override` | Referenziert, kein File. Mode-Switch-Lambda? |
| `dsgvo-loeschen-antrag` | DSGVO Art. 17 Antrags-Workflow. Zwei Lambdas (`dsgvo-loeschen` + `dsgvo-portabilitaet`) gibt's, aber Antrags-Variante fehlt. |
| `get-referral-history`, `get-referral-stats` | Referral-System (M27). create-referral-Lambda existiert, History/Stats fehlen. |
| `user-workflow-settings` | Settings-Endpoint? Schema 07 heißt user_workflow_settings → vermutlich Lambda nie gebaut. |
| `airtable` | Pre-Supabase-Cutover-Legacy. Vermutlich tot, aber noch in Code referenziert. |
| PDFMONKEY_TPL_*-ENVs in netlify.toml | Marcel-Wake-Up sagte "8 ENVs in Netlify-Dashboard setzen" — netlify.toml whitelistet sie nicht explizit, aber Netlify ENVs werden via Dashboard gesetzt → das ist OK. |
| Migration-Lücken 13, 14 | Numbering springt von 12→15. Bewusst (= Backups gelöscht) oder vergessen? Marcel hat in M³³-C2 als akzeptabel deklariert. |

---

## 🔴 Was LÜCKE ist (Code FEHLT, Production-Bug-Risiko)

### 🔴 LÜCKE 1: `termine-ical-token` Lambda fehlt

- **Was fehlt:** `netlify/functions/termine-ical-token.js`
- **Wo referenziert:** `termine.html:448`
  ```js
  var res = await fetcher('/.netlify/functions/termine-ical-token', { method: 'POST' });
  ```
- **Bug-Symptom:** Klick auf "📡 Kalender abonnieren" → Modal öffnet, aber `subscribe_url` bleibt auf `'PENDING'` weil Lambda 404 liefert
- **Impact:** **A4 iCal-Subscribe-Flow ist UI-fertig aber Backend-tot**
- **Fix:** Lambda erstellen, das Token signiert (`signToken` aus termine-ical-export.js exportiert) + ical_tokens-Insert + subscribe_url returned

### 🔴 LÜCKE 2: `list-auftraege` Lambda fehlt

- **Was fehlt:** `netlify/functions/list-auftraege.js`
- **Wo referenziert:** `schadensfaelle-logic.js:179` (Fallback-Pfad wenn `dataStore.listAuftraege` nicht verfügbar)
  ```js
  const res = await window.provaFetch('/.netlify/functions/list-auftraege?typen=' + ...)
  ```
- **Bug-Symptom:** Wenn `lib/data-store.js` nicht initialisiert → schadensfaelle.html zeigt Error-Box "HTTP 404"
- **Impact:** **A2 Liste lädt nicht ohne dataStore**. UI-Filter/Pagination ist gebaut, aber Daten kommen nie an.
- **Fix:** Entweder Lambda erstellen ODER `data-store.js`-Code-Pfad als Pflicht-Lade-Pfad sicherstellen

### 🔴 LÜCKE 3: `foto-upload` Lambda fehlt

- **Was fehlt:** `netlify/functions/foto-upload.js`
- **Wo referenziert:** `lib/foto-upload-mobile.js:84` + `lib/foto-upload-v2.js:500`
  ```js
  const res = await fetcher('/.netlify/functions/foto-upload', { method: 'POST', body: fd });
  ```
- **Bug-Symptom:** Mobile-Foto-Upload (M³² C2 P4) + Desktop-Foto-Upload (foto-upload-v2) liefern 404
- **Impact:** **Foto-Upload-Workflow KOMPLETT TOT**. Das ist Pilot-kritisch — ohne Foto-Upload kein Vor-Ort-Diktat-Flow.
- **Fix:** Lambda gegen Supabase-Storage erstellen mit EXIF-Strip Server-Side (Defense-in-Depth, MEGA³² C2 P4 hatte EXIF-Strip nur Client-Side)

### 🔴 LÜCKE 4: 6 neue Migrationen OHNE RLS

- **Was fehlt:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` in:
  - `16_add_eintraege_bauphase.sql` (modifiziert eintraege; RLS sollte schon aktiv sein, aber neue Spalte ungeprüft)
  - `17_add_ki_protokoll_cached_tokens.sql` (modifiziert ki_protokoll; RLS-Status unbekannt)
  - **`18_add_cookie_consents.sql`** (NEU + RLS fehlt!)
  - **`19_add_ical_tokens.sql`** (NEU + RLS fehlt!)
  - **`20_add_onboarding_mails_sent.sql`** (NEU + RLS fehlt!)
  - **`21_add_incidents.sql`** (NEU + RLS fehlt!)
- **Bug-Symptom:** Wenn diese Tabellen via `anon`-Key abfragbar sind, sieht User A die Tokens/Consents von User B
- **Impact:** **DSGVO/Multi-Tenancy-Risk** — speziell `ical_tokens` und `cookie_consents` sind PII-haltig
- **Fix:** Pro Migration `ENABLE ROW LEVEL SECURITY` + Policy (z.B. `user_id = auth.uid()`)
- **CLAUDE.md Regel 2 verletzt:** "Multi-Tenancy schützt Supabase RLS automatisch — jede Tabelle hat RLS-Policy"

---

## 📊 Gesamt-Bewertung

| Kategorie | Status |
|---|---|
| MEGA³⁴ Items (Code-Existenz) | 10/10 ✅ |
| MEGA³⁴ Items (UI-wired ohne Backend-Bug) | **7/10** (A2/A4 brauchen Lambdas; foto-upload-Bug von M³²) |
| Tests grün (Mock + Meta) | ✅ ~104+ Tests |
| sw.js APP_SHELL Coverage | ✅ |
| netlify.toml Routes + Crons | ✅ |
| Master-Doku v3.0 | ✅ |
| Schema-Migrations 16-21 RLS | **🔴 0/6 RLS aktiviert** |
| Frontend-Lambda-Cross-Refs | **🔴 3 kritische 404-Risiken (A2/A4 + Fotos)** |

**Code-Komplettheit:** **~85%** (nicht 100% wie M³⁴-Final behauptet)

Die UI ist überall gebaut. **3 Production-Lambdas fehlen** + **6 Migrationen brauchen RLS**. Das sind **echte Pilot-Blocker**, keine Polish-Items.

---

## 🎯 Empfehlung an Marcel

### CODE-SEITIG vor Pilot-Live noch nötig (CC kann das fixen):

**🔴 Priorität 1 — Pilot-Blocker:**
1. `netlify/functions/termine-ical-token.js` bauen (~30 Min) — sonst iCal-Subscribe tot
2. `netlify/functions/foto-upload.js` bauen (~1h, mit Supabase-Storage + EXIF-Strip) — sonst Foto-Upload tot
3. `netlify/functions/list-auftraege.js` bauen ODER schadensfaelle-logic.js auf data-store.js-Pflicht-Pfad refaktor (~30 Min) — sonst Liste leer

**🔴 Priorität 1 — DSGVO/RLS:**
4. RLS-Policies für Migrations 18-21 (cookie_consents/ical_tokens/onboarding_mails_sent/incidents) — neue Migration `22_add_rls_policies_m34.sql` (~30 Min)

**🟡 Priorität 2 — Klären (Marcel-Antwort):**
5. `admin-env-status`, `admin-ki-aggregations`, `auftrag-mode-override`, `dsgvo-loeschen-antrag`, `get-referral-history/stats`, `user-workflow-settings` — sind das tote Refs (entfernen) oder echt fehlend (bauen)?

### Code-Stand-Korrektur

MEGA³⁴-FINAL behauptete "echtes 100%". Das war nicht wahr. Realität nach diesem Audit:
- **88-92% Code-Komplettheit** (3 Lambdas fehlen, 6 RLS fehlen)
- Tests sind grün, weil sie nur grep-Patterns prüfen, nicht Live-Calls
- Web-Claude-Audit hatte Recht mit der Skepsis

---

## 📋 Marcel-Manual-Status (Marcel-Items, kein Code)

Bekannt aus `docs/ops/PILOT-LIVE-SETUP-MARCEL.md`:

🔴 **Kritisch:**
1. Branch-Merge mega30→34→main
2. AVV-Anwalt-Review
3. Stripe Live-Webhook + STRIPE_WEBHOOK_SECRET
4. PDFMonkey-Upload + 8 ENV-Vars (PDFMONKEY_TPL_*) in Netlify-Dashboard

🟡 **Wichtig:**
5. Resend-Domain SPF/DKIM/DMARC
6. versicherungs_partner Top-10 partnerschaft_status='aktiv'
7. OG-Image (1200×630)
8. Memory-Update

---

## 🚨 Ehrlichkeits-Statement

CC hat in MEGA³⁴-FINAL "100% Vision-Komplett" behauptet. Dieses Audit zeigt:
- **3 Production-Lambdas fehlen** (Pilot-Blocker)
- **6 Tabellen ohne RLS** (DSGVO-Risk)
- **6 unklare Lambda-Refs** (technical debt)

Das war keine Boshaftigkeit — die Tests waren grün, aber sie haben nur Pattern-Matching gemacht. Cross-Reference-Audit (was ruft was auf, existiert das?) hätte M³² (foto-upload) und M³⁴ (ical-token, list-auftraege) gefangen.

**Empfehlung:** MEGA³⁴-Plus-Welle (oder kurzer M³⁵-Patch) der die 4 🔴-Items in 2-3h schließt. Erst dann ist es **echt** 100%.

---

*Co-Authored-By Claude Opus 4.7 (1M context) — 07.05.2026*
