---
description: PROVA Sprint-Status Übersicht
---

Generate a comprehensive sprint status report:

1. **Latest git tag:** `git describe --tags --abbrev=0`
2. **Letzte 5 Commits:** `git log --oneline -5`
3. **Offene NACHT-PAUSE-Files:** `ls docs/diagnose/NACHT-PAUSE-*.md` (lesen + 1-Satz-Zusammenfassung pro File)
4. **Latest Sprint-Status-Report:** neueste Datei aus `docs/sprint-status/` lesen + Executive-Summary zitieren
5. **Marcel-Pflicht-Aktionen TOP 5:** aus `docs/audit/MARCEL-PFLICHT-AKTIONEN.md` "🔴 SOFORT"-Sektion lesen
6. **BACKLOG-Open-HIGH-Count:** in `docs/audit/BACKLOG.md` nach `HIGH | offen` greppen + zählen

Output Markdown-Summary:

```markdown
# PROVA Status — <Datum>

## Was läuft
- Tag: <git tag>
- Latest Commit: <commit message>
- ...

## Was steht aus
- NACHT-PAUSE-Files: <count> offen
  - <thema>: <1-Satz>
- HIGH-Findings offen: <count>

## Marcel-Pflicht-Aktionen (TOP 5)
1. ...

## Empfehlung was als nächstes
<deine Empfehlung basierend auf Stand>
```

Knapp halten — Marcel muss in 30s einen Überblick haben.
