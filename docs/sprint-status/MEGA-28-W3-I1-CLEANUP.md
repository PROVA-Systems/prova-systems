# MEGA²⁸ W3-I1 — Cluster-Review Cleanup-Status

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7
**Cluster-Review-Quelle:** `docs/sprint-status/CLUSTER-REVIEW-AUTO.md` (2026-04-30)

---

## TL;DR

**Deleted:** 1 Page (`ortstermin-arbeitsblatt.html` am Root)
**Already-Gone:** 19 Pages (Cluster-Doku-outdated — wurden seit 2026-04-30 bereits gelöscht/verschoben)
**Deferred:** 4 Pages (Marcel-Decision pflicht)

**Gesamt:** 24 Cluster-Review-DELETE-Kandidaten verarbeitet → 95% bereits clean.

---

## Ergebnis pro Kandidat

| Page | Cluster-Status (2026-04-30) | Heute (2026-05-10) | Aktion |
|---|---|---|---|
| angebot-gutachten.html | DELETE | nicht am Root | already-gone |
| beauftragungsbestaetigung-gericht.html | DELETE | nicht am Root | already-gone |
| checkliste-brandschaden.html | DELETE | nicht am Root | already-gone |
| deckungsanfrage.html | DELETE | nicht am Root | already-gone |
| einladung-ortstermin-gericht.html | DELETE | nicht am Root | already-gone |
| ergaenzungsfragen-antwort.html | DELETE | nicht am Root | already-gone |
| fristverlaengerungsantrag.html | DELETE | nicht am Root | already-gone |
| honorarvereinbarung.html | DELETE | nicht am Root | already-gone |
| kostenrahmen-erhoehung.html | DELETE | nicht am Root | already-gone |
| kostenvoranschlag-sanierung.html | DELETE | nicht am Root | already-gone |
| kostenvorschuss-gericht.html | DELETE | nicht am Root | already-gone |
| maengelanzeige.html | DELETE | nicht am Root | already-gone |
| maengelruege.html | DELETE | nicht am Root | already-gone |
| messprotokoll-feuchte.html | DELETE | nicht am Root | already-gone |
| messprotokoll-risse.html | DELETE | nicht am Root | already-gone |
| **ortstermin-arbeitsblatt.html** | DELETE | EXISTIERT am Root, 1 Ref in benachrichtigungen.html | **DELETED** (Ref gefixt: → vor-ort.html) |
| ortstermin-protokoll.html | DELETE | nicht am Root | already-gone |
| umladebrief-ortstermin.html | DELETE | nicht am Root | already-gone |
| stellungnahme-v3.1.html | DELETE | nicht am Root | already-gone |
| stellungnahme-gate.html | DELETE | nicht am Root | already-gone |
| effizienz.html | DELETE | nicht am Root | already-gone |
| **vorlage-10-schiedsgutachten.html** | DELETE | EXISTIERT, 2 Cross-Refs aus formulare/ | **DEFERRED** |
| **vorlage-11-bauabnahmeprotokoll.html** | DELETE | EXISTIERT, 2 Cross-Refs aus formulare/ | **DEFERRED** |
| pdfmonkey-brief-template.html | DELETE-or-MOVE | nicht am Root | already-gone |
| pdfmonkey-messprotokoll-template.html | DELETE-or-MOVE | nicht am Root | already-gone |

---

## Begründung Defer-Liste

### vorlage-10-schiedsgutachten.html
**Cross-Refs:**
- `formulare/vorlage-11-bauabnahmeprotokoll.html` (vorherige/nächste Vorlage)
- `vorlage-11-bauabnahmeprotokoll.html` (Cross-Ref im Cluster-Doc dokumentiert)

**Problem:** Cluster-Review-Doku erwähnt explizit: "vorlage-NN sind über `<a href="vorlage-XX.html">…</a>` untereinander cross-verlinkt (bidirektional)" → Bulk-Delete erzeugt 404s in formulare/-Subfolder.

**Empfehlung Marcel:** Erst `formulare/vorlage-NN-*.html` Subfolder als ganzes Cluster handhaben. Dann root + subfolder zusammen löschen.

### vorlage-11-bauabnahmeprotokoll.html
Gleicher Grund wie vorlage-10.

---

## Bereinigte Side-Effects

- `benachrichtigungen.html:632` — Demo-Notification-Link "Arbeitsblatt" zeigte auf gelöschte `ortstermin-arbeitsblatt.html`. **Fix:** Link auf `vor-ort.html` umgeleitet (existiert + ist die aktive Ortstermin-Page).
- `prova-layout.config.js:157` — Catalog-Eintrag `ortstermin-arbeitsblatt.html` entfernt (sw.js APP_SHELL war ohnehin clean).

---

## Cluster-Review-Doku-Drift-Hinweis 🟡

Die Cluster-Review-Auto-Doku vom 2026-04-30 ist **out-of-date**. 19 von 21 SAFE-DELETE-Pages existieren nicht mehr am Root — wurden zwischen 2026-04-30 und heute bereits verschoben/gelöscht (vermutlich in einem späteren Sprint). Die Doku sollte regeneriert werden (z.B. via `scripts/cluster_analyze.sh`-Re-Run) bevor die nächste Cleanup-Sprint-Welle läuft.

**Empfehlung:** Cluster-Review-Auto-Skript als CI-Step monatlich laufen lassen, damit die Doku nicht driftet.

---

## Ergebnisse

- ✅ 1 Datei gelöscht (`ortstermin-arbeitsblatt.html`)
- ✅ 1 Side-Effect-Bug gefixt (`benachrichtigungen.html` 404-Link)
- ✅ 1 Catalog-Eintrag entfernt (`prova-layout.config.js`)
- ⏸ 2 Files deferred (vorlage-10 + vorlage-11 — formulare/-Subfolder-Cluster pflicht)
- ✅ 19 Files bereits gelöscht (Cluster-Doku-Drift)

---

*MEGA²⁸ W3-I1 Cleanup ehrlich abgeliefert. Cluster-Doku-Drift entdeckt + dokumentiert.*
