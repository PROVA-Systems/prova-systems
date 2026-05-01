# `docs/master/` — Single Source of Truth

**Erstellt:** 01.05.2026 abend (Tag 7)
**Status:** Konsolidiert aus Repo-Wahrheit · ersetzt verstreute Master-Files

---

## Was ist das?

Diese 5 Files sind **die einzige verlässliche Quelle** für PROVA's Vision, Sprint-Plan, Architektur, Regeln und Chat-Wechsel-Briefing:

| File | Zweck |
|---|---|
| `PROVA-VISION-MASTER.md` | Was PROVA ist · Zielgruppe · 4-Flow-Architektur · Tier-Modell · KI-Prinzipien |
| `PROVA-SPRINTS-MASTERPLAN.md` | Sprint-Historie (echt, was passierte) + Restplan zum Pilot |
| `PROVA-ARCHITEKTUR-MASTER.md` | Tech-Stack · Auth-Flow · Functions · Migrations-Stand · Routing |
| `PROVA-REGELN-PERMANENT.md` | Konsolidierte Regeln (~37 Stück) inkl. Tag-7-Erkenntnisse 33-35 |
| `PROVA-CHAT-TRANSPORT-vAKTUELL.md` | Quick-Start für Chat-Wechsel · Stand-Briefing · Wichtige IDs |

Alles andere (`masterplan-v2/`, alte Web-Knowledge-Files, frühere Skeleton-Versuche, `docs/PROVA-*.md`) ist **historisch** und ersetzt durch diese Files.

---

## Selbst-Pflege-Pflicht für Claude Code

**Diese Files werden NACH JEDEM SPRINT aktualisiert** — von mir, Claude Code. Marcel muss das nicht selbst machen. Er muss nur regelmäßig den Inhalt ins Web-Project-Knowledge laden.

### Update-Protokoll — was ändere ich wann?

| Auslöser | Welche Files? | Was genau? |
|---|---|---|
| **Sprint-Ende** (Tag, DONE-File) | `SPRINTS-MASTERPLAN`, `CHAT-TRANSPORT-vAKTUELL` | Sprint in Historie eintragen, Tag aktualisieren, neue Action-Items |
| **Architektur-Änderung** (z.B. neue Lib, Auth-Pivot, sw.js-Bump) | `ARCHITEKTUR-MASTER`, `CHAT-TRANSPORT-vAKTUELL` | Neuer Block in Architektur, Tech-Stack-Snapshot updaten |
| **Neue Regel-Discovery** (Lessons-Learned aus Bug-Sprint) | `REGELN-PERMANENT` | Regel als nächste Nummer ergänzen + Beispiel/Rationale |
| **Pricing/Tier-Änderung** | `VISION-MASTER` | Pricing-Sektion |
| **Neuer Major-Tag** (z.B. v201, v300) | `CHAT-TRANSPORT-vAKTUELL`, `SPRINTS-MASTERPLAN` | Tag-Liste, Aktueller-Stand-Block |
| **Pivot der Pilot-Strategie** | `VISION-MASTER`, `SPRINTS-MASTERPLAN` | Vor-Pilot-Backlog, Pilot-Phase-Block |
| **Drift erkannt** (Plan vs Realität) | jeweiliges File | Drift-Sektion mit Warnung markieren |

### Wann starte ich KEIN Update?

- Code-Hotfixes ohne Architektur-Implikation (z.B. CSS-Tweak)
- Cluster-Cleanup pure Doku-Verschiebung
- Pure Doku-Polishing in nicht-Master-Files

### Pre-Update-Checks

Vor jedem Update:
1. **Repo-Wahrheit lesen** — `git log`, neueste DONE-Files, Diagnose-Files
2. **Alte Inhalte beibehalten** — Sprints aus Vergangenheit nicht löschen
3. **Drift dokumentieren** — wenn Plan vs Realität abweicht: Sektion „Drift" ergänzen
4. **Bei Unsicherheit:** `TBD Marcel` markieren, NICHT raten

### Commit-Pattern

```
docs(master): <vision|sprints|arch|regeln|transport> — <kurz-Anlass>

Aktualisiert nach Sprint <X> / Architektur-Change <Y>:
- <Was änderte sich konkret>
- <Drift-Notiz falls relevant>
```

Master-File-Commits IMMER direkt in main (kein Branch nötig für reine Master-Updates), außer bei größeren Re-Strukturierungen.

---

## Marcel's Rolle

1. **Liest** die Master-Files wenn er Stand-Update braucht
2. **Lädt sie ins Claude.ai-Project-Knowledge** wenn ein neuer Browser-Claude-Chat startet (siehe `MARCEL-KNOWLEDGE-CLEANUP.md` Workflow — historisches Backup-Doc)
3. **Markiert TODO-Anschuss** wenn Claude Code falsch oder unklar dokumentiert
4. **Erfindet keine** Master-Files in anderen Pfaden — diese 5 sind kanonisch

---

## Drifts vs `masterplan-v2/00_MASTERPLAN.md`

`masterplan-v2/` ist **archivierter Plan-Stand vom 24./25.04.2026** (Tag 0 vor Voll-Supabase-Refactor). Dort: 21-Tage-Plan mit Sprints SPRINT-01 bis SPRINT-20, Phase A-E.

**Major-Drift:** Marcel hat am 27.04. einen kompletten Stack-Pivot beschlossen (Voll-Supabase statt Airtable+Make+Cloudinary). Der Plan im Repo (`masterplan-v2/`) wurde NICHT aktualisiert. Stattdessen lebte der neue Plan in CLAUDE.md (v3.0) und in Marcel's Web-Project-Knowledge.

**Hier konsolidiert:** Repo-Wahrheit (Commits + DONE-Files) + CLAUDE.md v3.0 + Tag-7-Errungenschaften.

`masterplan-v2/00_MASTERPLAN.md` bleibt als **historisches Artefakt** im Repo — als „so dachten wir Tag 0".

---

## Wo lebt was?

```
Repo-Root:
  CLAUDE.md                              ← Arbeits-Richtlinien für Claude Code (lebend)
  CHANGELOG-MASTER.md                    ← Sprint-Block-Historie (Sprint 02-04, alt)
  KI-PROMPTS-MASTER.md                   ← Sprint-9-Skeleton (auf Branch)

docs/master/                             ← DIESE FILES (Single Source of Truth)
  PROVA-VISION-MASTER.md
  PROVA-SPRINTS-MASTERPLAN.md
  PROVA-ARCHITEKTUR-MASTER.md
  PROVA-REGELN-PERMANENT.md
  PROVA-CHAT-TRANSPORT-vAKTUELL.md
  README.md (diese Datei)

docs/                                    ← Lebende Operations-Doku
  PROVA-MARCEL-SELBSTHILFE.md
  PROVA-CHAT-START-NEXT-SESSION.md
  CUTOVER-RUNBOOK.md, MIGRATION-RUNBOOK.md, etc.

docs/sprint-status/                      ← Sprint-DONE-Reports (chronologisch)
  PHASE-4-CUTOVER-DONE.md
  CUTOVER-BLOCK-3-DONE.md
  OPTION-C-DONE.md
  ...

docs/diagnose/                           ← Bug-Diagnosen (chronologisch)
  LOGIN-REDIRECT-BUG.md
  LOGIN-LOOP-SOLUTION.md
  TOKEN-EXPIRED-BUG.md

docs/archiv/                             ← Archivierte Sprint-Doku (post-Cleanup)
  chat-transports/                       (alte CHAT-TRANSPORT-vXX)
  sprint-prompts/                        (alte *-COMPLETE, *-PROMPT)
  anleitungen/                           (alte CLEANUP-ANLEITUNG)
  master-snapshots/                      (Master-File-Snapshots vor Major-Updates)

masterplan-v2/                           ← HISTORISCH, Plan-Stand 25.04. (NICHT aktualisieren)
```

---

*README erstellt 01.05.2026 abend · Diese Files sind kanonisch · Aktualisiert von Claude Code nach jedem Sprint*
