# Audit 17 — Backup/Restore-Drill (Doku-only)

**Datum:** 02.05.2026 (Sprint S6 Phase 3)
**Auditor:** Claude Code (Doku, Marcel führt Drill durch)

---

## Warum dieser Drill?

DSGVO Art. 32 Abs. 1 lit. c verlangt „die Fähigkeit, die Verfügbarkeit der personenbezogenen Daten und den Zugang zu ihnen bei einem physischen oder technischen Zwischenfall **rasch wiederherzustellen**".

PROVA muss vor Pilot-Launch verifizieren:
- **RTO** (Recovery Time Objective) — wie lange bis Service wieder läuft?
- **RPO** (Recovery Point Objective) — wie viele Daten gehen maximal verloren?

---

## Voraussetzungen

| Item | Wert | Marcel-Action |
|---|---|---|
| Supabase-Plan | Pro (täglicher Backup-Schedule) | Verifizieren im Dashboard → Project Settings → Backups |
| Backup-Retention | 7 Tage (Pro) / 30 Tage (Team) | Verifizieren |
| Service-Role-Access | Marcel hat Founder-Berechtigungen | ja |
| Dev-Project | nicht vorhanden | TBD — Marcel-Entscheidung |

⚠️ **Drill darf NICHT in Production-Project durchgeführt werden** — würde echten Daten-Loss verursachen wenn Restore fehlschlägt.

---

## Option A — Dev-Project anlegen (empfohlen)

### Aufwand
- Anlage Dev-Project in Supabase (~5 Min)
- Plan: Free-Tier reicht für Drill
- Region: gleiches eu-central-1

### Drill-Schritte

```bash
# Schritt 1 — Dev-Project anlegen
# (über Supabase-Dashboard → New Project)
# Neuer Project-ID: cngteblrbpwsyypexjrv-dev (Beispiel)

# Schritt 2 — Production-Backup downloaden
# Dashboard → Project Settings → Backups → "Latest" → Download
# Datei z.B. "backup-2026-05-02-03-00.tar.gz"

# Schritt 3 — Restore in Dev-Project
# Dashboard (Dev) → Database → Restore from backup → Upload
# ODER via Supabase CLI:
#   supabase db reset --project-ref <dev-project-id> --db-url <backup-url>

# Schritt 4 — Verifikation in Dev
psql "postgresql://postgres:<dev-password>@db.<dev-id>.supabase.co:5432/postgres" \
  -c "SELECT COUNT(*) FROM auftraege;"
# Erwartet: gleiche Anzahl wie in Production
```

### Akzeptanz-Kriterien
- [ ] Restore-Time < 30 Min für PROVA-DB-Größe (heute < 100MB)
- [ ] Datenvollständigkeit: alle 60 Tabellen, gleiche row-counts ±1 (innerhalb Backup-Window)
- [ ] RLS-Policies + Functions + Indizes wiederhergestellt
- [ ] auth.users-Tabelle: alle Test-Logins funktionieren in Dev nach Restore

---

## Option B — Test-Schema in Production-Project (NICHT empfohlen)

```sql
-- Nicht-destruktiv: paralleles Schema 'restore_test' anlegen
CREATE SCHEMA restore_test;
-- Dann selektive Restore in dieses Schema
```

**Probleme:**
- pg_restore unterstützt nicht direkt Schema-Rename
- Risiko bei Disk-Full oder Connection-Issues
- Vermischt Test mit Production-Daten

**Empfehlung:** lieber Option A.

---

## Option C — Logical-Backup via pg_dump (Workaround)

Marcel kann jederzeit ohne Supabase-Pro-Backup ein **eigenes** logical-Backup machen:

```bash
# Voraussetzung: pg_dump installiert
pg_dump "postgresql://postgres:<password>@db.cngteblrbpwsyypexjrv.supabase.co:5432/postgres" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-acl \
  -F c \
  -f prova-backup-2026-05-02.dump
```

**Vorteil:** unabhängig vom Supabase-Plan, einfach zu Backblaze/S3 zu kopieren.

**In MARCEL-PFLICHT-AKTIONEN:** „Backup-2-of-3-Regel" — wöchentlicher pg_dump zu eigenem Storage (~5€/Mo).

**Restore-Test mit logical-Backup:**
```bash
# In Dev-Project:
pg_restore -d "postgresql://..." prova-backup-2026-05-02.dump
```

---

## Erwartete Werte (zur Messung)

| Metrik | Erwartet Pre-Pilot | Nach 50 Pilot-SVs |
|---|---|---|
| DB-Größe | < 100 MB | < 5 GB |
| RTO (Backup → Service-Live) | < 30 Min | < 60 Min |
| RPO (Datenverlust-Window) | < 24h (täglicher Backup) | < 24h |
| Test-Restore-Erfolgsrate | 100% (3/3 Drills) | 100% |

---

## Drill-Frequenz nach Pilot-Launch

| Frequenz | Was |
|---|---|
| Quartalsweise | Full-Drill in Dev-Project (Option A) |
| Monatlich | pg_dump-Test (Option C, lokal verifizieren) |
| Nach Schema-Migration | Verify dass Backup-Restore noch funktioniert |
| Vor jedem Major-Release | Full-Drill |

---

## Disaster-Recovery-Plan (Skeleton)

→ siehe `docs/audit/DR-PLAN.md` (Phase 4 Audit 22)

---

## Marcel-Aktion

1. **Supabase-Plan verifizieren** — ist Pro aktiv? Backup-Schedule?
2. **Drill-Option wählen** (A empfohlen)
3. **Drill durchführen** + Ergebnisse hier dokumentieren:

```
[ ] Drill 1 durchgeführt am: __________
    RTO: ____ Min   |   Datenvollständigkeit: ____ %
    Probleme: ____________________________
```

4. **In MARCEL-PFLICHT-AKTIONEN:** „pg_dump-Wöchentlich-Backup einrichten" als Folge-Aktion

---

*Backup-Drill-Doku 02.05.2026. Marcel führt Drill durch.*
