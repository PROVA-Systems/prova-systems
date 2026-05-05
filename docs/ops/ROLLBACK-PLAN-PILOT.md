# Rollback-Plan Pilot-Phase (MEGA²⁵ Phase 7)

**Stand:** 2026-05-09
**Scope:** Critical-Bug-Recovery während Pilot-Launch
**Owner:** Marcel Schreiber (Sole-Operator)

---

## Severity-Klassifizierung

### CRITICAL (sofortiger Rollback)
- Datenverlust beim Speichern von Akten
- §6 Fachurteil wird nicht persistiert
- PDF-Generation komplett kaputt (alle Templates)
- Stripe-Checkout schlägt fehl (kein Sign-Up möglich)
- Login komplett kaputt (alle SVs ausgesperrt)
- Multi-Tenant-Isolation gebrochen (User sehen fremde Daten)

**Response-Time:** < 1h
**Action:** Git-Revert + Push + sw.js-Bump + Email an alle Pilot-SVs

### HIGH (Hotfix-Sprint statt Rollback)
- Eine Mode kaputt (B oder C, A muss laufen)
- Bestimmte Schadenart bricht PDF-Gen
- KI-Hilfe wirft Errors (Fallback auf manuelles Schreiben funktioniert)
- Welcome-Wizard hängt (manueller Workaround möglich)

**Response-Time:** < 24h
**Action:** Hotfix-Branch + cherry-pick + push

### MEDIUM (Backlog)
- UI-Bugs ohne Funktions-Impact
- Mobile-Layout-Issues
- Slow-Performance einzelner Pages

**Response-Time:** nächster geplanter Sprint
**Action:** Backlog-Item + Folge-Sprint

---

## Rollback-Strategie

### Option A: Git-Revert (empfohlen für Critical)

```bash
# 1. Identifiziere den problematischen Commit
git log --oneline -20

# 2. Revert (erstellt einen NEUEN Commit, der die Änderungen rückgängig macht)
git revert <commit-sha>

# 3. Bei Multi-Commit-Rollback:
git revert <oldest>..<newest>  # alle in einem revert-PR

# 4. sw.js bumpen damit User die Revert-Version laden
# Manuell: CACHE_VERSION = 'prova-vXXX-rollback' setzen

# 5. Push
git push origin main

# 6. Verify auf prova-systems.de innerhalb 5 Min
```

### Option B: Git-Reset (NUR mit Marcel-OK!)

```bash
# WARNING: Destroyed Local-Commits + Remote-History!
git reset --hard <last-stable-commit>
git push --force-with-lease origin main

# Danach: Tag setzen
git tag -a v285-rollback -m "Rollback nach Pilot-Critical-Bug"
git push origin v285-rollback
```

**WICHTIG:** Option B nur wenn Option A nicht möglich (z.B. corrupted-state).

### Option C: Branch-Rollback via Netlify-Dashboard

1. Netlify → Deploys → letzter erfolgreicher Build vor dem Bug
2. "Publish Deploy" auswählen
3. Sofort-Live ohne Git-Änderung
4. Danach: Git-Revert nachziehen für Konsistenz

---

## Database-Rollback-Strategie

### Migrationen (Supabase)

**Aktuell vorhanden:** Migrations 01-11 (alle additive Schema-Änderungen)

### Revert einer Migration

Migrationen sind in Production schwer rückgängig zu machen. Bei Critical-Issue:

```sql
-- Beispiel: Migration 11 rückgängig (Beweisbeschluss-Spalten)
ALTER TABLE auftraege
  DROP COLUMN IF EXISTS beweisbeschluss_pdf_storage_path,
  DROP COLUMN IF EXISTS beweisbeschluss_pdf_extrakt,
  DROP COLUMN IF EXISTS beweisbeschluss_pdf_extrakt_version,
  DROP COLUMN IF EXISTS beweisbeschluss_pdf_uploaded_at;

DROP INDEX IF EXISTS idx_auftraege_beweisbeschluss;
```

**Empfehlung:** **KEIN Migration-Rollback während Pilot.** Stattdessen:
- Frontend deaktiviert die Funktion (schnell)
- Spalten bleiben nullable + ungenutzt
- Cleanup im Folge-Sprint

### Daten-Restore

**Supabase Auto-Backup (Free Plan):** 7 Tage tägliche Snapshots

**Manuelles Backup vor jedem Sprint:**
```bash
# Nutzt scripts/supabase-export-tables.js (falls existiert)
node scripts/supabase-export-tables.js > backups/sb-$(date +%Y%m%d).json
```

### Restore via Supabase-Dashboard

1. Supabase → Project Settings → Backups
2. Snapshot vor Bug auswählen
3. Restore Confirmation (deletes data after snapshot!)
4. **WICHTIG:** Stripe-Subscriptions bleiben aktiv (Stripe ≠ Supabase) — manuell prüfen

---

## Kommunikations-Plan

### Sofort-Email an Pilot-SVs (Template)

```
Subject: [PROVA] Wichtiger Hinweis — Service-Update

Hallo [VORNAME],

Wir haben gerade einen Bug entdeckt und ein Fix deployed.

Was war kaputt:
[KURZE BESCHREIBUNG]

Was wir gemacht haben:
[ROLLBACK / HOTFIX]

Was du jetzt tun musst:
1. Page neu laden (Strg+F5 oder Cmd+Shift+R)
2. Falls Issues: Email an mich

Falls du in den letzten X Stunden Daten verloren hast:
schreibe mir, ich schaue im Audit-Trail nach.

Danke für deine Geduld,
Marcel
```

### Status-Page (optional)

Status-Updates auf prova-systems.de/status (oder externes Tool wie Statuspage.io):
- "🟢 Operational" — Default
- "🟡 Degraded" — Eine Funktion kaputt
- "🔴 Major Outage" — Mehrere Kernfunktionen
- "🛠️ Maintenance" — Geplante Wartung

---

## Rollback-Test-Drill (vor Pilot-Launch)

### Drill 1: Trivial-Rollback üben (15 Min)

1. Erstelle Test-Branch: `test/rollback-drill`
2. Push trivial-Change (z.B. README-Tippfehler)
3. Revert via `git revert HEAD`
4. Push + Verify auf Netlify

### Drill 2: SW-Cache-Invalidierung (10 Min)

1. Bumpe sw.js manuell: v285 → v285-test
2. Push
3. Verify: User-Browser lädt neue Version
4. Reset zurück auf v285

### Drill 3: Sentry-Alert-Reception (5 Min)

1. Trigger /sentry-test mit gültigem Secret
2. Sentry-Dashboard: Alert sichtbar?
3. Email-Notification bei Marcel?

---

## Post-Mortem-Template

Nach jedem Critical-Rollback:

```markdown
# Post-Mortem [DATUM]

## Was passierte
[Bug-Beschreibung]

## Wann
- Bug eingeführt: [COMMIT-SHA + Datum]
- Erkannt: [Datum + Wer]
- Mitigated: [Datum + Wie]
- Resolved: [Datum]

## Root-Cause
[Detaillierte Analyse]

## Impact
- Anzahl betroffene SVs: [N]
- Datenverlust: [Ja/Nein/Wenn ja: details]
- Downtime: [Minuten]

## Prevention
- [ ] Test ergänzt
- [ ] Code-Review-Item
- [ ] Architektur-Anpassung
- [ ] Monitoring-Alert

## Lessons Learned
[Bullet-Liste]
```

Speicherort: `docs/post-mortems/YYYY-MM-DD-summary.md`

---

## Marcel-Pflicht vor Pilot-Launch

- [ ] Drill 1 (Trivial-Rollback) durchgeführt
- [ ] Drill 2 (SW-Cache) durchgeführt
- [ ] Drill 3 (Sentry) durchgeführt
- [ ] Communication-Template-Email-Account konfiguriert
- [ ] Stripe-Customer-Portal-URL parat (für Refund-Anfragen)
- [ ] Letzte Stable-Commit-SHA notiert: **123e7d4** (MEGA²³+²⁴ Final)

---

*MEGA²⁵ Phase 7 — Rollback-Plan ready für Pilot-Phase.*
