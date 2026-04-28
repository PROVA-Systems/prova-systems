# PROVA Cutover-Runbook (K-1.5)

**Sprint:** K-1.5 · **Owner:** Marcel · **Manuelle Ausführung**

**WICHTIG:** Cutover wird **NICHT** autonom durchgeführt. Marcel führt jeden Schritt manuell aus, mit Smoke-Test zwischen den Schritten.

---

## Pre-Cutover-Checklist

```
✓ K-1.0 Foundation grün       (Supabase-Schema + Auth-Test)
✓ K-1.1 Migration Code-bereit (live-Run optional, leeres Schema OK für Pilot-Start)
✓ K-1.2 Edge Functions deployed (alle 8, Health-Check grün)
✓ K-1.3 Pilot grün             (technische-stellungnahme.html funktioniert)
✓ K-1.4 Auth-Layer parallel    (auth-supabase.html + nav.js Hybrid)
✓ Resend Domain verifiziert    (DNS TXT-Records)
✓ Stripe Webhook-Test grün     (Test-Event in stripe_events ankommt)
✓ pg_cron Lifecycle-Job läuft  (cron.job zeigt aktiven Daily-Job)
✓ Supabase-Snapshot erstellt   (Backups → Manual Snapshot)
✓ Airtable-Snapshot erstellt   (Manage Base → Snapshots)
```

---

## Cutover-Reihenfolge (10 Schritte)

### 1. Edge Functions Final-Smoke-Test

```
Browser: https://prova-systems.de/tools/test-edge-functions.html
```
- Alle 8 Buttons → grün oder erwartetes-Fail (stripe-webhook 401, ical-feed 400, lifecycle 401, whisper-disabled)

### 2. Pages Final-Smoke-Test (Inkognito-Browser)

```
- /auth-supabase.html       → Login, Register-Flow grün
- /technische-stellungnahme.html → Phasen 1-3 + Versenden + PDF kommt an
- /tools/test-pilot-kurzstellungnahme.html → 5 Tests grün
- /app-login.html           → Bestehender Login funktioniert (Hybrid)
- /index.html (oder /dashboard) → User landet drauf nach Login
```

### 3. Stripe Webhook umstellen
[scripts/cutover/02-stripe-webhook-update.md](../scripts/cutover/02-stripe-webhook-update.md)

- Endpoint-URL: Netlify → Supabase
- Test-Event aus Stripe-Dashboard
- Logs in Supabase Dashboard prüfen

### 4. Make Scenarios deaktivieren
[scripts/cutover/01-deactivate-make.md](../scripts/cutover/01-deactivate-make.md)

- 9 Scenarios auf OFF
- NICHT löschen (Rollback-Reserve)

### 5. Netlify Identity disablen
[scripts/cutover/03-netlify-identity-disable.md](../scripts/cutover/03-netlify-identity-disable.md)

- `_redirects` Update
- `app-login.html` → `.bak` ODER Meta-Refresh-Stub
- Identity Service in Netlify-Dashboard: **Disable** (nicht delete)

### 6. Airtable Read-Only
[scripts/cutover/04-airtable-readonly.md](../scripts/cutover/04-airtable-readonly.md)

- Snapshot erstellen
- Permissions auf Read-Only
- AIRTABLE_PAT in ENV bleibt

### 7. Smoke-Test Round 2

Wieder alle Browser-Tests:
- Login funktioniert (Supabase-Path)
- Dashboard lädt
- Pilot-Page funktioniert
- PDF-Generation funktioniert
- Mail-Versand funktioniert

**Bei rotem Smoke-Test: STOP, Rollback einleiten.**

### 8. sw.js bumpen + Deploy

```bash
# CACHE_VERSION ist bereits in K-1.5.C6 gebumpt auf v227
git push   # falls noch nicht
# Netlify deployt automatisch
```

Browser-Test:
- Erste Visit nach Deploy: Service-Worker lädt v227
- Console: `[SW] Activated prova-v227`
- Alle App-Shell-Files cached
- Offline-Modus testen (DevTools → Network → Offline)

### 9. Browser-Test in 3 Browsern (mind. 2 Geräte)

- **Chrome Desktop:** kompletter Workflow (Login → Auftrag → PDF)
- **Safari iOS oder Edge Mobile:** mobile UX
- **Firefox (mind. 1 Inkognito):** kein Cache-Bias

### 10. Cleanup-Script

```bash
# Erst Dry-Run
bash scripts/cutover/05-cleanup-frontend.sh --dry-run

# Wenn OK: live
bash scripts/cutover/05-cleanup-frontend.sh
```

→ Obsolete Files in `_obsolete-cutover-YYYYMMDD/` (Soft-Delete für Recovery)

---

## Akzeptanz Cutover Done

```
✓ Smoke-Tests Round 2 grün
✓ sw.js v227 in Production aktiv
✓ Supabase-Logs zeigen normale Last (keine 5xx-Spikes)
✓ Stripe-Events kommen in stripe_events an (live-mode)
✓ Resend-Mails kommen an (Test-Email an marcel)
✓ Make-Account zeigt 0 aktive Scenarios
✓ Netlify Identity zeigt "Disabled"
✓ git tag v180-k-1-cutover-done && git push --tags
```

---

## Rollback-Plan

| Stadium | Rollback |
|---|---|
| **Vor sw.js-Bump** (Schritte 3-7) | Make Scenarios reaktivieren, Stripe-Webhook-URL zurück, Identity Enable. Alles reversibel binnen 30 Min. |
| **Nach sw.js-Bump** (ab Schritt 8) | sw.js zurück auf v226, Force-Deploy. Browser-Cache zwingt zu Hard-Refresh. Alle Schritte 3-7 zusätzlich rückgängig machen. |
| **Nach Cleanup-Script** (Schritt 10) | Files aus `_obsolete-cutover-YYYYMMDD/` zurück nach Repo-Root. `git checkout HEAD~ -- <file>`. |
| **Kritischer DB-Bug** | Supabase-Snapshot-Restore (Backups → Restore). Bedeutet **alle Daten seit Snapshot weg**. Nur als Notfall. |

---

## Nach grünem Cutover

### Sofort (Tag 0)

- Tag setzen: `git tag v180-k-1-cutover-done && git push --tags`
- Memory: K-1 abgeschlossen, Voll-Supabase-Stack
- CHANGELOG-MASTER.md ergänzen
- PROVA-CHAT-TRANSPORT-v36.md schreiben

### Woche 1-2

- Tägliches Smoke-Test
- Pilot-User-Anfragen sammeln
- Bugs in Supabase-Realität fixen (kein Rollback mehr)

### Woche 4

- Cutover-Final-Confirmation
- Make-Account kündigen (spart $11-19/Monat)
- Airtable in 4 Wochen archivieren

### Sprint K-2 vorbereiten

- Audit-Phase
- Marketing-Aufbau
- Pilot-Outreach starten
