# K-2 Marcel-Cutover-Checklist

**Sprint:** K-2 (Live-Cutover)
**Owner:** Marcel · **Manuelle Step-by-Step-Ausführung**
**Vorbereitet in:** Mega-Sprint #4 Phase 5 (28.04.2026)

**WICHTIG:** Dieses File ergänzt `docs/CUTOVER-RUNBOOK.md` mit konkreten Marcel-Schritten + Smoke-Tests + Rollback-Plänen pro Schritt.

---

## ⏱ Zeit-Estimate

| Phase | Dauer | Was |
|---|---|---|
| Pre-Cutover Verifikation | 30 Min | Smoke-Tests Edge Functions + Pages |
| Live-Cutover (5 Schritte) | 60-90 Min | Stripe → Make → Identity → Airtable → sw.js |
| Post-Cutover Smoke-Test | 30 Min | 3 Browser, 2 Geräte, alle Workflows |
| **TOTAL** | **2-2.5 h** | + 30 Min Buffer |

**Best-Time-Window:**
- ☀️ **Sonntag früh (8:00-11:00)** — keine Pilot-User aktiv, ganzer Tag Buffer
- 🚫 **NICHT** während Wochentag-Geschäftszeiten (9:00-18:00)
- 🚫 **NICHT** vor Feiertag oder Wochenende-Trip (Marcel braucht 24h-Hotfix-Bereitschaft)

---

## 🚨 PRE-CUTOVER-CHECKLIST (30 Min)

```
Sprint K-1.x Status
[ ] K-1.0 Foundation grün         (Supabase 61 Tabellen, Auth-Test)
[ ] K-1.1 Migration Code-bereit   (Live-Run optional bei Pilot-Start)
[ ] K-1.2 Edge Functions deployed (alle 8 in supabase functions list)
[ ] K-1.3 Pilot grün              (gutachterliche-stellungnahme.html getestet)
[ ] K-1.4 Auth-Layer parallel     (auth-supabase.html + nav.js Hybrid)
[ ] K-1.5 Vorbereitung-Skripte    (scripts/cutover/* existieren)

Externe Services
[ ] Resend Domain verifiziert     (DNS TXT-Records bei prova-systems.de)
[ ] Stripe Webhook-Test grün      (Test-Event in stripe_events ankommt)
[ ] PDFMonkey-Templates published (kurzstellungnahme + alle anderen)
[ ] pg_cron Lifecycle-Job läuft   (cron.job zeigt aktiven Daily-Job)

Backups
[ ] Supabase-Snapshot erstellt    (Backups → Manual Snapshot)
[ ] Airtable-Snapshot erstellt    (Manage Base → Snapshots)
[ ] Lokale Code-Backup            (git push aller Branches)

Architektur-Konflikt
[ ] NACHT-PAUSE-DASHBOARD.md gelesen (Variante A/B/C entschieden?)
```

→ **Wenn auch nur EINER rot: STOP. Cutover NICHT starten.**

---

## 📋 Cutover-Schritte (60-90 Min)

### Schritt 1 — Edge Functions Final-Smoke-Test (5 Min)

```
URL: https://prova-systems.de/tools/test-edge-functions.html
Login → "Alle 8 testen"
```

**Erwartet — alle 8 grün oder erwartetes-Fail:**
| # | Function | Erwartung |
|---|---|---|
| 1 | ki-proxy | 200 + Mock-Response |
| 2 | whisper-diktat | disabled (manueller Audio-Upload nötig) |
| 3 | pdf-generate | 200 + signed URL (5-15s wegen PDFMonkey-Polling) |
| 4 | send-email | 200 + Mail kommt an Marcel-Inbox |
| 5 | stripe-webhook | 401 (= ok, keine Signature) |
| 6 | lifecycle-trigger | 401 (= ok, kein System-Token) |
| 7 | audit-write | 200 |
| 8 | ical-feed | 400 (= ok, kein Token) |

**Smoke-Test Erfolgs-Kriterium:** keine 5xx-Errors. Wenn 5xx: STOP.

**Rollback bei Fail:** keine Aktion nötig — wir haben noch nichts geändert.

---

### Schritt 2 — Pilot-Page Live-Test (10 Min)

```
URL: https://prova-systems.de/gutachterliche-stellungnahme.html
```

**Workflow:**
1. Phase 1: AZ vorausgefüllt mit `GS-2026-NNN`, Datum heute
2. Pflicht: Datum + Art + Frage ausfüllen
3. „Weiter →" → Phase 2 → Antwort ausfüllen
4. „Weiter →" → Phase 3 → „Versenden →"
5. **Erwartet:** PDF-Generation 5-15s → Toast „✓ PDF fertig" → Redirect zu `/akte.html?id=...`

**Smoke-Test Erfolgs-Kriterium:**
- Console: keine roten Errors
- Network-Tab: `pdf-generate` returns 200
- DB-Check (SQL-Editor):
  ```sql
  SELECT id, az, status, phase_aktuell FROM auftraege ORDER BY created_at DESC LIMIT 1;
  -- erwartet: typ='kurzstellungnahme', status='aktiv', phase_aktuell=3
  ```

**Rollback bei Fail:** siehe `K-1-PDF-TEST-VORBEREITUNG.md` Risiko-Liste.

---

### Schritt 3 — Stripe Webhook umstellen (15 Min)

**Vorgehensweise:** `scripts/cutover/02-stripe-webhook-update.md`

Kurz:
1. https://dashboard.stripe.com/webhooks
2. Neuen Endpoint anlegen (alten parallel laufen lassen):
   - URL: `https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/stripe-webhook`
   - 5 Events: `checkout.session.completed`, `customer.subscription.{updated,deleted}`, `invoice.payment_{succeeded,failed}`
3. **Signing Secret kopieren** → `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
4. Stripe-Dashboard → **Send test event** → erwarten: 200 OK in Supabase Logs

**Smoke-Test:**
```sql
SELECT id, event_type, status, verarbeitung_fehler
FROM stripe_events ORDER BY created_at DESC LIMIT 5;
```
Erwartet: Test-Event mit `status='ignoriert'` (Subscription-ID kein Workspace) ODER `status='verarbeitet'`.

**Rollback bei Fail:**
- Neuen Endpoint disable im Stripe-Dashboard
- Alter Endpoint läuft weiter (alte Make-F1 ist noch aktiv)

---

### Schritt 4 — Make.com Scenarios deaktivieren (15 Min)

**Vorgehensweise:** `scripts/cutover/01-deactivate-make.md`

Kurz: 9 Scenarios in https://www.make.com Dashboard auf **Active → OFF**:
- T3 (5147519), F1 (5192002), L3 (5038113), L8 (5147509), L10 (5158552)
- G1 (4867125), G3 (4790180), K2 (4920914), A5 (5147393)

**NICHT löschen** — Rollback-Reserve.

**Smoke-Test:**
- Manual-Trigger eines Test-Auftrags via Pilot-Page → Edge Function läuft, NICHT Make
- Stripe-Test-Event (kommt nicht 2x bei Make + Edge — UNIQUE-Constraint in stripe_events idempotent)
- Lifecycle-Test: Trial-User-Anlage → erwartet: keine Welcome-Mail von Make + Email von Resend

**Rollback bei Fail:**
- Scenarios in Make wieder auf **Active**
- Stripe Webhook-URL zurück auf alten Netlify-Endpoint (Schritt 3 rückgängig)
- Edge Function `stripe-webhook` ggf. delete: `supabase functions delete stripe-webhook`

---

### Schritt 5 — Netlify Identity disable (10 Min)

**Vorgehensweise:** `scripts/cutover/03-netlify-identity-disable.md`

Kurz:
1. `_redirects` Update (Repo-Root):
   ```
   /login              /auth-supabase.html  301
   /app-login.html     /auth-supabase.html  301!
   /login.html         /auth-supabase.html  301!
   ```
2. `git commit + push` → Netlify auto-deploy
3. Im Netlify-Dashboard:
   - Site Settings → Identity → **Disable Identity Service** (NICHT delete)

**Smoke-Test:**
- Inkognito-Browser: `https://prova-systems.de/app-login.html` → redirect zu `/auth-supabase.html`
- Login mit Founder-Account → grün
- Console: keine `netlifyIdentity is not defined` Errors

**Rollback bei Fail:**
- Netlify-Dashboard: **Enable Identity Service**
- `_redirects` 4 Zeilen entfernen, push
- Marcel kann via altem `app-login.html` einloggen

---

### Schritt 6 — Airtable Read-Only (10 Min)

**Vorgehensweise:** `scripts/cutover/04-airtable-readonly.md`

Kurz:
1. Airtable Base `appJ7bLlAHZoxENWE` → Manage Base → **Snapshot erstellen** (`K-2-pre-readonly-YYYY-MM-DD`)
2. Share → **alle Collaborators auf Read-only**
3. Owner-Rolle für Marcel behalten

**NICHT löschen!** Mind. 4 Wochen Read-Only-Backup.

**Smoke-Test:**
- Versuch in Airtable Web-UI Zelle editieren → blockiert
- AIRTABLE_PAT in Netlify-ENV BLEIBT (für Re-Migration / DSGVO)

**Rollback bei Fail:**
- Read-Only zurücknehmen (Edit-Rolle wiederherstellen)
- Snapshot zurückspielen falls Daten kaputt

---

### Schritt 7 — Smoke-Test Round 2 (15 Min)

Wieder Browser-Tests in **3 Browsern (mind. 2 Geräten)**:

| Browser | Geräte | Test |
|---|---|---|
| Chrome Desktop | PC | kompletter Workflow Login → Auftrag → PDF |
| Safari iOS | iPhone | mobile UX, Login funktioniert |
| Firefox Inkognito | PC | kein Cache-Bias |

Pro Browser:
- [ ] Login `auth-supabase.html` grün
- [ ] Pilot-Page `gutachterliche-stellungnahme.html` Workflow grün
- [ ] PDF-Generation grün
- [ ] Logout grün
- [ ] Re-Login grün (Auto-Redirect bei aktiver Session)

**Bei rotem Smoke-Test: STOP. Rollback Schritte 6 → 5 → 4 → 3 in umgekehrter Reihenfolge.**

---

### Schritt 8 — sw.js bumpen + Deploy (5 Min)

```bash
# Im Repo:
# Aktuell v235 (nach Mega-Sprint #4 Cleanup)
# Bump auf v236 für Cutover

# Edit sw.js Z.8: 'prova-v235' → 'prova-v236'
git add sw.js
git commit -m "K-2 Cutover: sw.js bump v235 -> v236"
git push   # Netlify deployt automatisch
```

**Smoke-Test:**
- Erste Visit nach Deploy: F12 → Application → Service Workers
- Console: `[SW] Activated prova-v236`
- DevTools → Network → Offline-Test: App-Shell-Files cached, Pages laden offline

**Rollback bei Fail:**
- sw.js Z.8 zurück auf v235, Force-Push
- Browser-Cache zwingt zu Hard-Refresh (Marcel: `Ctrl+Shift+R`)

---

### Schritt 9 — Cleanup-Script (10 Min)

```bash
# Erst Dry-Run:
bash scripts/cutover/05-cleanup-frontend.sh --dry-run

# Wenn OK: live mit Confirmation:
bash scripts/cutover/05-cleanup-frontend.sh
```

→ Tote Files in `_obsolete-cutover-YYYYMMDD/` (Soft-Delete für Recovery).

**Smoke-Test nach Cleanup:**
- Pilot-Page noch grün (Files die noch genutzt werden NICHT in obsolete/)
- Console: keine 404 für gelöschte Files

**Rollback:** `mv _obsolete-cutover-YYYYMMDD/<file> ./` für betroffenes File.

---

### Schritt 10 — Final-Tag setzen (2 Min)

```bash
git tag v180-k-1-cutover-done
git push --tags
```

**Akzeptanz:**
- Stripe-Events kommen in `stripe_events` an (live-mode)
- Resend-Mails kommen an
- Make-Account zeigt 0 aktive Scenarios
- Netlify Identity „Disabled"
- Pilot-Page funktioniert

---

## 🚨 Rollback-Master-Plan

| Stadium | Rollback-Strategie |
|---|---|
| **Vor Schritt 3** | Keine Aktion — wir haben nur Smoke-Tests gemacht |
| **Schritte 3-7** (vor sw.js) | Alles reversibel binnen 30 Min: Stripe Webhook-URL zurück, Make Scenarios on, Netlify Identity enable, _redirects revert, Airtable Edit-Rolle zurück |
| **Nach sw.js-Bump (8)** | sw.js zurück auf v235, Force-Deploy. Browser-Cache → Hard-Refresh. Plus alle Schritte 3-7 reverten. |
| **Nach Cleanup (9)** | Files aus `_obsolete-cutover-YYYYMMDD/` zurück nach Repo-Root. `mv` reicht. |
| **Kritischer DB-Bug** | Supabase-Snapshot-Restore. **Alle Daten seit Snapshot weg!** Nur als Notfall. |

---

## 📊 Akzeptanz Cutover Done

```
✓ Smoke-Tests Round 2 grün (3 Browser, 2 Geräte)
✓ sw.js v236 in Production aktiv
✓ Supabase-Logs zeigen normale Last (keine 5xx-Spikes)
✓ Stripe-Events kommen in stripe_events an (live-mode)
✓ Resend-Mails kommen an (Test-Email an Marcel)
✓ Make-Account zeigt 0 aktive Scenarios
✓ Netlify Identity zeigt "Disabled"
✓ git tag v180-k-1-cutover-done && git push --tags
```

---

## 🌅 Post-Cutover (Tag 0 → Woche 4)

### Sofort (Tag 0)
- ✅ Tag setzen
- ✅ Memory: K-1 abgeschlossen, Voll-Supabase-Stack
- ✅ CHANGELOG-MASTER.md ergänzen
- ✅ Marcel-Memo: Live-Status

### Woche 1-2
- 📊 Tägliches Smoke-Test (5 Min/Tag)
- 🐛 Bugs in Supabase-Realität fixen
- 📈 Pilot-User-Anfragen sammeln

### Woche 4
- ✅ Cutover-Final-Confirmation
- 💰 Make-Account kündigen ($11-19/Mo Saving)
- 📦 Airtable in Monat 3 archivieren

### Sprint K-2 starten
- 🧹 Cleanup-Plan ausführen (siehe `K-2-CLEANUP-PLAN.md`)
- 🔍 Audit-Phase
- 📣 Marketing-Aufbau
- 👥 Pilot-Outreach starten

---

## ⚠️ Wichtige Hinweise

1. **NICHT Make-Account vor 2 Wochen kündigen.** Rollback-Reserve.
2. **NICHT Airtable löschen** vor Monat 3. DSGVO-Backup.
3. **NICHT alle Schritte am gleichen Tag** wenn unsicher — kann auf 2 Tage verteilt werden:
   - Tag A: Schritte 1-3 (Edge-Smoke + Pilot + Stripe)
   - Tag B: Schritte 4-10 (Make + Identity + sw.js + Cleanup)
4. **Hotfix-Bereitschaft 24h** nach Cutover — Marcel sollte erreichbar sein.

---

🎯 **Cutover ist Marcels manuelle Aufgabe. Diese Doku ist die Anleitung. Smoke-Test zwischen jedem Schritt.**
