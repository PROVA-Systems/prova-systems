# Master-Docs Update + Archiv-Cleanup — DONE

**Datum:** 01.05.2026 mittag (post Option-C Deploy, sw.js v249)
**Branch:** `docs/post-option-c-cleanup-and-update` (gepusht, **KEIN Merge** in main)
**Mode:** Doku-only · KEIN Auth-Code-Touch · KEIN sw.js-Bump

---

## Zusammenfassung

**6 Commits auf einem konsolidierten Branch:**

| # | Commit | Inhalt |
|---:|---|---|
| 1 | `d36a992` | PROVA-CHAT-TRANSPORT-v37 NEU (cherry-picked aus `docs/post-option-c-master-update`) |
| 2 | `25206da` | PROVA-VISION-MASTER aktualisiert (cherry-picked) |
| 3 | `5667f6b` | PROVA-SPRINTS-MASTERPLAN aktualisiert (cherry-picked) |
| 4 | `8b4c192` | PROVA-ARCHITEKTUR-MASTER aktualisiert (cherry-picked) |
| 5 | `ccd8b93` | PROVA-REGELN-PERMANENT mit Regeln 33+34+35 (cherry-picked) |
| 6 | `4933af9` | Archiv-Cleanup: 16 Files verschoben + ARCHIV-INVENTAR + Knowledge-Sync-Liste |

**Total: ~1170 LOC Doku, 16 Files in `docs/archiv/`, 0 Code-Touch.**

---

## TASK 1 — Master-Files aktualisiert (5 Files)

Per Cherry-Pick aus dem zuvor erstellten Branch `docs/post-option-c-master-update` — keine Re-Erstellung.

| File | Status |
|---|---|
| `PROVA-CHAT-TRANSPORT-v37.md` | NEU (221 Zeilen, vollständig erstellt) |
| `PROVA-VISION-MASTER.md` | Auth-Konzept neu, übrige Sektionen TODO-Platzhalter |
| `PROVA-SPRINTS-MASTERPLAN.md` | Phase A/B/C/D/E gefüllt, Sprint-Tickets-Details TODO |
| `PROVA-ARCHITEKTUR-MASTER.md` | Auth-Architektur+SW+Functions+Migrations-Stand komplett, übrige TODO |
| `PROVA-REGELN-PERMANENT.md` | Regeln 33-35 NEU komplett, Regeln 1-32 TODO-Sammel-Platzhalter |

**Kontext-Hinweis:** Original-Master-Files lebten in Marcel's Claude.ai-Web-Project-Knowledge, **nicht im Repo**. Per Konflikt-Protokoll: TODO-Platzhalter für unbekannte Sektionen (statt raten). Marcel füllt beim Knowledge-Sync.

---

## TASK 2 — Archiv-Cleanup (16 Files verschoben)

### Neue Folder-Struktur

```
docs/archiv/
├── README.md                       (Erklärung was wo)
├── chat-transports/                (alte CHAT-TRANSPORT-vXX)
├── sprint-prompts/                 (Sprint-Prompts/COMPLETEs/Pause-Files)
├── anleitungen/                    (alte Cleanup/Quickstart-Anleitungen)
└── master-snapshots/               (mit README — leer wegen Cross-Env)
```

### Verschoben pro Kategorie

| Kategorie | Anzahl | Notiz |
|---|---:|---|
| **B** Chat-Transports | 1 | `PROVA-CHAT-TRANSPORT-v35.md` |
| **C** Sprint-Prompts | 11 | SPRINT-K-1-* COMPLETEs+PROMPTs, NACHT-PAUSE*, MEGA-PAUSE-PHASE-2 |
| **D** Anleitungen | 1 | `CHANGELOG-MASTER-ERGAENZUNG.md` |
| **E** zu-prüfen → archiviert | 3 | Edge-Function-Inventar K-1.2, Supabase-Refactor-Master, K-1-4-Page-Migration-Guide |
| **E** zu-prüfen → behalten (UNCLEAR) | 7 | siehe ARCHIV-INVENTAR.md |
| **F** SQL-Migrations | – | nicht angetastet (Marcel-Klärung pro File pending) |
| **G** BES-Templates | – | nicht angetastet (Sprint 04d pending) |

Vollständige Liste mit Begründung: `docs/sprint-status/ARCHIV-INVENTAR.md`

### Repo-Root-Reduktion

11 obsolete Sprint/Pause-Files aus dem Root entfernt → cleanere Wurzel.

---

## TASK 3 — Master-Snapshots

`docs/archiv/master-snapshots/README.md` mit Hinweis erstellt — Snapshots intentional **leer**, weil die Original-Master-Files vor Update nicht im lokalen Repo existierten (lebten in Web-Knowledge). Ein Cross-Env-Snapshot war nicht möglich.

Marcel kann nach Bedarf seine letzte Web-Knowledge-Version dort manuell ablegen für Audit-Trail.

---

## Knowledge-Sync-Liste für Marcel

`docs/MARCEL-KNOWLEDGE-CLEANUP.md` enthält:
- **Liste was in Claude.ai-Knowledge gelöscht** werden soll (~30 obsolete Files)
- **Liste was hochgeladen** werden soll (9 aktuelle Master-Files)
- **Empfohlener Workflow** mit Schritt-für-Schritt-Anleitung
- **Reduktions-Statistik:** ~100 Files vorher → ~10-15 nachher (~85% Reduktion)

---

## Nächster Schritt für Marcel

### 1. Branch reviewen

```bash
git checkout docs/post-option-c-cleanup-and-update
ls docs/archiv/         # neue Struktur
cat docs/sprint-status/ARCHIV-INVENTAR.md       # was verschoben wurde + warum
cat docs/MARCEL-KNOWLEDGE-CLEANUP.md            # was im Knowledge zu tun ist
```

### 2. Optional: TODO-Platzhalter mit Web-Knowledge-Inhalt füllen

Pro Master-File die noch `TODO: Marcel ergänzt`-Sektionen haben:
- Web-Knowledge-Version öffnen
- Inhalt in entsprechende Sektion paste'n
- Branch-Commit „TODO-Platzhalter aus Web-Knowledge gefüllt"

### 3. Merge in main

```bash
git checkout main
git merge docs/post-option-c-cleanup-and-update --no-ff -m "merge: post-Option-C Master-Docs + Archiv-Cleanup"
git push origin main
```

### 4. Knowledge syncen

Nach Merge: `docs/MARCEL-KNOWLEDGE-CLEANUP.md` öffnen → Schritt-für-Schritt durchgehen.

### 5. Optional: Vorgänger-Branch löschen

`docs/post-option-c-master-update` ist obsolet (cherry-picked → enthalten in diesem Branch):

```bash
git branch -D docs/post-option-c-master-update
git push origin --delete docs/post-option-c-master-update
```

---

## Verbotsliste eingehalten ✅

| Verboten | Status |
|---|---|
| Auth-Code anfassen | ✅ unangetastet |
| Frontend-Render-Code | ✅ unangetastet |
| sw.js bumpen | ✅ v249 unverändert |
| Merge in main | ✅ kein Merge |
| Bei Unklarheit raten | ✅ Konflikt-Protokoll → BEHALTEN bei UNCLEAR |

---

## Statistik

| Metrik | Wert |
|---|---:|
| Branches | 1 (konsolidiert aus zwei Sprints) |
| Commits | 6 (5 cherry-picked + 1 archiv-cleanup) |
| Files verschoben | 16 |
| Files behalten (UNCLEAR + lebend) | 17 |
| Master-Files erstellt/aktualisiert | 5 |
| Doku-Files NEU | 4 (CHAT-TRANSPORT-v37, ARCHIV-INVENTAR, MARCEL-KNOWLEDGE-CLEANUP, archiv/README) |
| Doku-LOC total | ~1170 |
| Code-Touch | 0 |

---

*Master-Docs-Cleanup-Sprint abgeschlossen 01.05.2026 mittag · Branch `docs/post-option-c-cleanup-and-update` gepusht · KEIN Merge — Marcel reviewt + entscheidet*
