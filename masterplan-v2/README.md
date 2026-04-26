# PROVA Systems — PILOT-READY Masterplan v2.0

**Erstellt:** 24./25. April 2026  
**Umfang:** 26 Dokumente, ~6000 Zeilen Markdown  
**Ziel:** In 20 Arbeitstagen (6 Kalender-Wochen) pilotreifes Produkt

---

## 🎯 Was hier drin ist

Dies ist Dein vollständiger Arbeitsplan bis zum Pilotstart. Alles was wir heute (24.04.) im Co-Founder-Modus besprochen haben, ist hier drin:

- **3 abgeschlossene Sprints** von heute (Mobile Phase 0, S-SICHER P2, P2.6)
- **20 kommende Sprints** bis zum Pilotstart
- **Alle Entscheidungen** aus unseren Gesprächen (Make-Migration, Einträge-System, UI-Prinzipien, Storage-Strategie)
- **Deine Ideensammlung** vollständig integriert (Skizzen, Bibliothek, KI-Werkzeug, Auftragstyp-Felder)
- **Workflows aller 11 Auftragstypen** in 4 Flow-Gruppen
- **Marketing-Parallel-Plan** für die 6 Wochen
- **Datenmigration** aus Bestandssystemen

---

## 📂 Wie Du das liest

### Morgen früh: Reihenfolge
1. **`00_MASTERPLAN.md`** — Lies zuerst. Executive Summary + 20-Tage-Überblick. (ca. 30 Min)
2. **`01_UI-PRINZIPIEN.md`** — Design-System, gültig für alle Produkt-Sprints (ca. 15 Min)
3. **`02_WORKFLOWS.md`** — Alle 11 Auftragstypen. Hier siehst Du wie die einzelnen Flows aussehen (ca. 20 Min)
4. **`03_SYSTEM-ARCHITEKTUR.md`** — Technische Architektur mit Mermaid-Diagrammen (ca. 15 Min)
5. **`04_MARKETING-PARALLEL.md`** — Dein Marketing-Leitfaden (ca. 10 Min)
6. **`05_LEGACY-DATENMIGRATION.md`** — Wie Pilotkunden ihre Bestandsdaten mitnehmen (ca. 10 Min)

**Gesamt Lesezeit: ca. 1,5-2 Stunden gemütlich.**

### Pro Sprint-Tag
Öffne das jeweilige `SPRINT-XX-*.md` (1-2 Seiten pro Sprint). Jedes enthält:
- Ziel (1 Satz)
- Sprint-Start-Ritual
- Scope (was drin, was nicht)
- **Fertiger Prompt für Claude Code** (kopierbar)
- Acceptance-Kriterien
- Rollback-Plan

---

## 🗓️ Die 20-Tage-Übersicht

### Phase A — Security-Fundament (Tag 1-5, ~25h)
Alles was juristisch + technisch vor Pilot sitzen muss.

| Tag | Sprint | Stunden |
|---|---|---|
| 1 | P3 DSGVO Server-Pseudonymisierung | 4-5h |
| 2 | P4A Auth-Fundament | 5-6h |
| 3 | P4B Function-JWT + Rate-Limit | 3-4h |
| 4 | P5 Reste + Seiten-Audit-Fixes | 4-5h |
| 5 | Legacy-Datenmigration-Assistent | 4-5h |

### Phase B — Produkt-Kern (Tag 6-12, ~42h)
Features die PROVA vom "funktioniert" zum "unverzichtbar" heben.

| Tag | Sprint | Stunden |
|---|---|---|
| 6 | B1 Einträge-System für Ortstermine | 6-7h |
| 7 | B2 Skizzen-Funktion | 5-6h |
| 8 | B3 Bibliothek-Pattern universal | 6-7h |
| 9 | B4 KI-als-Werkzeug (§6-Opt-In) | 4-5h |
| 10 | B5 Auftragstyp-spezifische Felder | 4-5h |
| 11 | B6 Workflow-Sauberkeit (alle 4 Flows) | 5-6h |
| 12 | B7 Rechnungen + Angebote automatisch | 5-6h |

### Phase C — Migration & Operations (Tag 13-15, ~18h)
Make.com wird ausgelagert, Monitoring wird aufgesetzt.

| Tag | Sprint | Stunden |
|---|---|---|
| 13 | M7a Make-Migration Teil 1 (G1 + Whisper) | 5-6h |
| 14 | M7b Make-Migration Teil 2 (Rest) | 5-6h |
| 15 | Operations (Sentry, Backup, Status) | 6-7h |

### Phase D — Compliance (Tag 16-17, ~12h)

| Tag | Sprint | Stunden |
|---|---|---|
| 16 | Compliance I (§407a + EU AI Act + AGB) | 6-7h |
| 17 | Compliance II (DSGVO-Betroffenenrechte) | 4-5h |

### Phase E — Admin, UX & Pre-Audit (Tag 18-20, ~18h)

| Tag | Sprint | Stunden |
|---|---|---|
| 18 | AUTH-COCKPIT (admin.prova-systems.de) | 6-7h |
| 19 | APP-LANDING-SPLIT + Mobile-Rescue | 5-6h |
| 20 | Pre-Audit & Übergabe-Dokumentation | 5-6h |

---

## ⚙️ Das Sprint-Start-Ritual (jedes Mal gleich)

Vor jedem Sprint diese 7 Schritte:

1. **Code-Realität-Check** — was ist wirklich im Repo? (5 Min)
2. **Datenfluss-Check** — wo fließen die Daten tatsächlich entlang? (5 Min)
3. **Scope-Fixierung** — was genau in diesem Sprint, was explizit NICHT (10 Min)
4. **Claude-Code-Prompt** — Scope + Qualität + Acceptance (5 Min)
5. **Claude Code läuft** — autonom, mit Rollback-Sicherung (30-90 Min)
6. **Server-Acceptance-Checks** — via curl/grep (5 Min)
7. **Marcel-Browser-Test** — reale Use-Cases (5-15 Min)
8. **Commit als Tag + Memory-Update + nächster Sprint** (5 Min)

**Gesamt pro Sprint:** ~90-140 Min reine Arbeit. Realistisch: 1-2 Sprints pro Arbeitstag à 4-6h.

---

## 🔑 Die eisernen Regeln

Diese gelten für **jeden** Sprint, nicht verhandelbar:

1. **Nichts zweimal anfassen.** Wenn wir einen Bereich sauber bauen, ist er fertig.
2. **Logische Reihenfolge.** Keine Sprints vermischen.
3. **Claude Code als Senior-Dev.** Prompts geben Scope + Qualität + Acceptance, nicht Code-Zeilen.
4. **Code-Realität vor Audit-Report.** Vor jedem Sprint: Ist-Stand im Code prüfen.
5. **Datenflüsse vorher denken.**
6. **Marcel testet im Browser, Claude Code testet serverseitig.**
7. **Kein Scope-Creep.** Was nicht zum Sprint gehört → Backlog.
8. **Git-Tag + Memory-Update am Ende jedes Sprints.**

---

## 📊 Was am Ende steht (Tag 20)

- ✅ Keine bekannten Security-Blocker
- ✅ DSGVO vollständig umgesetzt (Technik + Rechtstexte)
- ✅ Saubere Architektur ohne Legacy-Ballast
- ✅ Make.com nur noch für 4 Cron-Szenarien (L8, L9, L10, T3)
- ✅ Alle 11 Auftragstypen mit sauberen Workflows
- ✅ Rechnungen/Angebote auto-generiert
- ✅ Live-Cockpit für Marcel mit 2FA
- ✅ Split-Domain (Landing/App/Admin)
- ✅ Mobile funktioniert
- ✅ Pilot-Welcome-Pack fertig
- ✅ Freelancer-Audit-ready

**Nach Tag 20:**
- Freelancer-Audit (3 Tage, ~2.400€)
- Anwalt-Review parallel (300-500€)
- Dann 2-3 Pilotkunden live
- Nach 4-6 Wochen Pilot: Öffentlicher Launch

---

## 💭 Entscheidungen die wir heute getroffen haben (zur Erinnerung)

**Storage:**
- Audio-Diktate in Netlify Blobs (Opus 16 kbps Mono, ca. 1 MB pro 10 Min)
- Fotos, Skizzen, PDFs in Airtable-Attachments
- Bei Wachstum (>50 SVs): Cloudflare R2 als Migration, 1 Tag Arbeit, 0,015€/GB/Monat
- Netlify Pro-Plan ohnehin benötigt

**EINTRAEGE-Tabelle:**
- Du hast Tabelle umbenannt (von DIKTATE)
- 3 Eintragstypen: `diktat`, `notiz`, `skizze` — alle gleichwertig
- Primärfeld als Formel: `{fall_az_lookup}-E{eintrag_nr_padded}` → "SCH-2026-031-E03"
- KI bekommt alle Einträge eines Falls als Bündel
- Verknüpfung zwischen Einträgen optional (nicht Pflicht)
- Claude Code legt Felder per Airtable Meta API an

**Make-Migration:**
- G1, G3, K2, L3, F1, A5, Whisper, WH_S1, WH_S3 → Netlify
- L8, L9, L10, T3 bleiben bei Make (Cron-Jobs)

**Produkt-Prinzipien:**
- EINE Primär-Aktion pro Screen (Stripe-Prinzip)
- 80% Weißraum, 20% Content (Linear-Prinzip)
- Keine Dropdown-Menüs tiefer als 1 Ebene (Notion-Prinzip)
- Empty States sind eigene Features
- Ältere-Nutzer-freundlich: min 15px Body-Font, 44×44 px Touch-Targets

**Pricing:**
- Solo 149€, Team 279€
- Keine Änderungen geplant
- Founding-Members: 99€ lifetime für erste 10 Pilotkunden

---

## ⏭️ Dein nächster Schritt morgen

**Morgen früh (45 Min):**
1. Kaffee machen
2. `00_MASTERPLAN.md` durchlesen
3. Kurz Notizen machen: was stört Dich, was fehlt, was soll anders
4. Kurz melden

**Dann besprechen wir:**
- Welche Änderungen am Plan?
- Wann starten wir Tag 1 (P3 DSGVO)?
- Gibt es Abhängigkeiten die wir noch lösen müssen (z.B. Netlify Pro aktivieren)?

**Kein Grund zur Eile.** Dieser Plan ist Dein Leitfaden für 6 Wochen. Bessere Prüfung jetzt spart spätere Korrekturen.

---

## 📞 Falls Du heute Nacht noch Fragen hast

- Gedächtnis ist aktualisiert (Masterplan v2 ist im Memory-Eintrag)
- Dokumente liegen in `/mnt/user-data/outputs/masterplan-v2/` — alle Dateien sind da
- Wenn eine Session abbricht, sage einfach "masterplan v2" und ich finde alles wieder

---

**Marcel, Du hast heute viel geschafft. Schlaf gut.**

— Claude
