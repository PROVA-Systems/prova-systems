# MEGA⁸⁴ Block 0.3 — Edge-Reaping CLI-Apply

**Stand:** 2026-05-16 · Branch: `feat/mega84-85-mega-marathon`
**Vorgaenger:** `docs/MEGA82-EDGE-REAPING.md` (Pre-Audit) + `docs/MEGA83-EDGE-REAPING-FINAL.md` (Re-Verify)

CC-Self-Apply ist **NICHT möglich** (Supabase-CLI nicht im CC-Sandbox verfügbar). Marcel führt CLI-Commands manuell aus.

---

## Pre-Verify (24h Logs beobachten)

```bash
PROJECT_REF="cngteblrbpwsyypexjrv"
for fn in global-search fristen-reminder-cron mahnwesen-cron migrate-normen-airtable migrate-textbausteine-airtable skizze-save; do
  echo "=== $fn ==="
  supabase functions logs $fn --project-ref $PROJECT_REF | tail -20
done
```

**Erwartung:** Keine Invocations in den letzten 24h. Wenn doch → STOP, Caller finden.

---

## Source-Backup (optional, vor Delete)

```bash
mkdir -p _archiv/edge-functions/MEGA84-deleted/
cp -r supabase/functions/global-search                  _archiv/edge-functions/MEGA84-deleted/
cp -r supabase/functions/fristen-reminder-cron          _archiv/edge-functions/MEGA84-deleted/
cp -r supabase/functions/mahnwesen-cron                 _archiv/edge-functions/MEGA84-deleted/
cp -r supabase/functions/migrate-normen-airtable        _archiv/edge-functions/MEGA84-deleted/
cp -r supabase/functions/migrate-textbausteine-airtable _archiv/edge-functions/MEGA84-deleted/
cp -r supabase/functions/skizze-save                    _archiv/edge-functions/MEGA84-deleted/
```

---

## Cloud-Delete (destructive!)

```bash
PROJECT_REF="cngteblrbpwsyypexjrv"
supabase functions delete global-search                  --project-ref $PROJECT_REF
supabase functions delete fristen-reminder-cron          --project-ref $PROJECT_REF
supabase functions delete mahnwesen-cron                 --project-ref $PROJECT_REF
supabase functions delete migrate-normen-airtable        --project-ref $PROJECT_REF
supabase functions delete migrate-textbausteine-airtable --project-ref $PROJECT_REF
supabase functions delete skizze-save                    --project-ref $PROJECT_REF
```

## Lokale Verzeichnisse löschen + Commit

```bash
git rm -r supabase/functions/global-search
git rm -r supabase/functions/fristen-reminder-cron
git rm -r supabase/functions/mahnwesen-cron
git rm -r supabase/functions/migrate-normen-airtable
git rm -r supabase/functions/migrate-textbausteine-airtable
git rm -r supabase/functions/skizze-save
git rm tools/migrate-bibliothek-airtable.html   # Optional: Migration-Tool ist tot
git commit -m "chore(mega84): edge-reaping 6 sichere Functions geloescht"
git push
```

---

## Caller-Re-Verify (Grep nach Delete)

Falls Marcel doch noch einen Caller findet:
```bash
grep -rn "global-search\|fristen-reminder-cron\|mahnwesen-cron\|migrate-normen-airtable\|migrate-textbausteine-airtable\|skizze-save" \
  --include='*.html' --include='*.js' --include='*.ts' \
  --exclude-dir='_archiv' --exclude-dir='docs' --exclude-dir='tests' \
  --exclude-dir='supabase' --exclude-dir='netlify'
```

**Erwartung:** 0 Treffer in Frontend/App-Code. Treffer in `tests/`, `docs/` oder `_archiv/` sind OK.

---

## Rollback bei Fehler

```bash
# Bei Delete-Fehler: aus _archiv wiederherstellen + neu deployen
cp -r _archiv/edge-functions/MEGA84-deleted/<name> supabase/functions/<name>
supabase functions deploy <name> --project-ref $PROJECT_REF
git checkout HEAD~1 supabase/functions/<name>
```

---

## DEFER MEGA85 oder später

- `dashboard-fristen-upcoming` — vermutet tot, MEGA81 widgetHeute ersetzt — eigene Verifikation
- `termin-reminder` — Make.com-Altlast
- `onboarding-mail-cron`, `email-pilot-feedback-cron`, `email-trial-ending-cron` — Cron-Status prüfen
- `email-welcome` vs `send-welcome-email` (Make.com-Audit nötig)
- `list-dokument-templates` vs `document-templates-list` (Caller-Konsolidierung)
- `push-notify`, `uptime-webhook` — externer Trigger
- `sentry-test` — Test-Endpoint, vermutlich Dead-Weight
- **5 Audit-Edges Konsolidierung** → 1 generische `audit-log-v1` mit task-Param (MEGA85 Block G)
