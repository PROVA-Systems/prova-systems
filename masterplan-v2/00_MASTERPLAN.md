# PROVA Systems — PILOT-READY Masterplan v2.1 (aktualisiert)

**Stand:** 25. April 2026 (Update nach 5 Strategie-Gesprächen Abend 24.04.)  
**Version:** 2.1 (ersetzt v2.0 von Nacht 24./25.04.)  
**Änderung v2.0 → v2.1:** Fristen-System, Dashboard-Widgets, Bescheinigungen, KI-Werkzeuge erweitert, Sprint 9 auf 2 Tage, Gesamtplan 21 Tage

---

## Executive Summary

### Was dieser Plan tut
PROVA Systems geht **nicht** als "halbfertig, Testkunden-Feedback nachbessern" live, sondern als **fertiges Produkt**. Das schließt Security, DSGVO, Architektur, UX, Compliance, Operations und alle Kern-Features ein.

### Der Weg
**21 Arbeitstage**, verteilt auf 5-7 Wochen Kalender-Zeit, **~110-130h Code-Zeit** mit Claude Code. Am Ende:
- Keine bekannten Security-Blocker
- Saubere Architektur ohne Legacy-Ballast (Make.com nur noch für Cron-Jobs)
- DSGVO vollständig umgesetzt (Technik + Rechtstexte)
- **Alle 11 Auftragstypen sauber + Bescheinigungen als eigener Workflow**
- **Fristen-System mit 5 Pipelines unvergessbar**
- **KI-Werkzeuge §407a-konform mit Kosten-Monitoring**
- Operations-Grundlage (Monitoring, Backup, Incident-Response)
- Freelancer-Audit-fähig bei minimalem Scope → geringeres Budget

### Änderungen v2.0 → v2.1

**Sprint 9 gewachsen** (4-5h → 15-17h, auf 2 Tage verteilt):
- §6-Editor Leer-Feld-First mit Befunde-Panel
- 3 Verantwortungs-Stufen (S1/S2/S3)
- Konjunktiv II via GPT-4o (nicht mini!)
- Halluzinations-Check + §407a-Check automatisch vor Freigabe
- Einstellungen-Block für Toggle
- Profi-Modus für erfahrene User
- "KI-Funktions-Garantie" als neue Qualitäts-Regel

**Sprint 10 erweitert** (4-5h → 7-9h):
- Stufenmodell 2 Schritte (Auftragstyp → Stammdaten)
- Karten-Grid gruppiert nach Flow A/B/C/D
- Externe Dokumente extrahieren (Beweisbeschluss, Schadensmeldung, etc.)
- Aktenzeichen-3-Felder-Konsolidierung

**Sprint 11 erweitert** (5-6h → 9-11h):
- Fristen-System mit 5 Pipelines
- 8 Frist-Typen mit Auto-Berechnung + SV-Bestätigung
- Eskalations-Stufen (farb-codiert)
- 5 fixe Dashboard-Widgets (konfigurierbar → Post-Pilot)

**Sprint 12 erweitert** (5-6h → 10-12h):
- Bescheinigungen als eigener Workflow
- 3 neue PDFMonkey-Templates (F-21/22/23)
- 3 neue Briefvorlagen
- bescheinigungen.html als Selector mit 7 Arten

**Sprint 18 erweitert** (6-7h → 7-8h):
- KI-Kosten-Widget pro User (Pflicht nach Sprint 9)
- Push-Alert bei > 5% Umsatz-Quote

**Sprint 19 erweitert** (5-6h → 6-7h):
- Neue Sidebar-Struktur (4 Gruppen ARBEIT/WERKZEUGE/DOKUMENTE/BÜRO)
- Aktiver-Fall-Anker oben

**Sprint 20 erweitert** (5-6h → 6-7h):
- Demo-Fall SCH-DEMO-001 automatisch beim Onboarding

**01_UI-PRINZIPIEN** ergänzt:
- "KI-Vorschläge sind opt-in, nicht default"-Regel
- "Positive Marker statt Warnungen"-Regel (subtile Qualitäts-Indikatoren)

**Neuer Backlog-Eintrag:**
- Post-Pilot: Konfigurierbare Widgets (Drag&Drop + Toggle)
- Post-Pilot: Tier-2-Widgets (KI-Tipps, Norm des Tages, Persönliche Stats, Foto-Galerie)
- Post-Pilot: Hilfe-Erklär-Bereiche (Typ B) + Live-Hilfe-Button (Typ C)

---

## Guiding Principles (nicht verhandelbar)

### Prozess-Regeln (unverändert)
1. Nichts zweimal anfassen
2. Logische Reihenfolge
3. Claude Code als Senior-Dev
4. Code-Realität vor Audit-Report
5. Datenflüsse vorher denken
6. Marcel testet im Browser, Claude Code testet serverseitig
7. Kein Scope-Creep
8. Git-Tag + Memory-Update am Ende jedes Sprints

### Produkt-Regeln (erweitert um KI-Prinzipien)
- Eine Primär-Aktion pro Screen (Stripe)
- 80% Weißraum, 20% Content (Linear)
- Keine Dropdown-Menüs tiefer als 1 Ebene (Notion)
- **KI-Vorschläge sind opt-in, nicht default** (§407a-Schutz)
- **Positive Qualitäts-Marker statt Warnungen** (Respekt vor Experten)
- Keyboard-Shortcuts für Power-User (Linear/Superhuman)
- Empty States sind eigene Features
- Destruktive Aktionen mit sekundärer Bestätigung
- Ältere Nutzer-freundlich: 15px+ Body, 44×44 Touch-Targets

### Rechtliche Regeln (unverändert)
- §407a ZPO: SV macht Fachurteil persönlich
- KI-Offenlegung: EU AI Act Art. 50
- DSGVO: Pseudonymisierung vor OpenAI (client + server)
- §312g BGB: Widerrufsbelehrung bei Verbraucher-Privatgutachten
- Aufbewahrungspflicht: 5 Jahre Gutachten (JVEG), 10 Jahre steuerrechtlich

### Neue Regel: "KI-Funktions-Garantie"
Jede KI-Funktion muss vor Produktiv-Deployment 5 Tests bestehen:
1. **Funktionalität** (10 Happy-Path-Beispiele)
2. **Edge-Cases** (5 Extreme: sehr kurz, sehr lang, ohne Satzzeichen, viele Fachbegriffe, Tippfehler)
3. **Präzision** (< 10% Falsch-Positiv-Rate bei 20 korrekten Texten)
4. **Konsistenz** (3× gleicher Input = gleiches Ergebnis im Kern)
5. **Zeitverhalten** (< 10s Antwort, sonst Progress-Indikator)

Wenn ein Test rot ist → Funktion wird ausgeblendet im UI bis grün. **"Wenn eins nicht funktioniert, bin ich verbrannt"** (Marcel, 25.04.2026).

---

## 21-Tage-Phasen-Plan

### Phase A — Security-Fundament (Tag 1-5, ~25h)
| Tag | Sprint | Stunden |
|---|---|---|
| 1 | P3 DSGVO Server-Pseudonymisierung | 4-5h |
| 2 | P4A Auth-Fundament | 5-6h |
| 3 | P4B Function-JWT + Rate-Limit | 3-4h |
| 4 | P5 Reste + Seiten-Audit-Fixes | 4-5h |
| 5 | Legacy-Datenmigration-Assistent | 4-5h |

### Phase B — Produkt-Kern (Tag 6-13, ~57h)
| Tag | Sprint | Stunden |
|---|---|---|
| 6 | B1 Einträge-System für Ortstermine | 6-7h |
| 7 | B2 Skizzen-Funktion | 5-6h |
| 8 | B3 Bibliothek-Pattern universal | 6-7h |
| **9** | **B4a KI-Werkzeug Kern (Konjunktiv II, Halluz, §407a, §6-Editor)** | **8h** |
| **10** | **B4b KI-Werkzeug Zusatz (Kommas, Grammatik, Absätze, Fachsprache, Einstellungen)** | **7-9h** |
| 11 | B5 Auftragstypen + Externe Docs + Aktenzeichen | 7-9h |
| 12 | B6 Workflows + Fristen + Dashboard | 9-11h |
| 13 | **B7 Rechnungen + Angebote + Bescheinigungen** | **10-12h** |

### Phase C — Migration & Operations (Tag 14-16, ~18h)
| Tag | Sprint | Stunden |
|---|---|---|
| 14 | M7a Make-Migration Teil 1 (G1 + Whisper) | 5-6h |
| 15 | M7b Make-Migration Teil 2 (Rest) | 5-6h |
| 16 | Operations (Sentry, Backup, Status-Page, Stripe) | 6-7h |

### Phase D — Compliance (Tag 17-18, ~12h)
| Tag | Sprint | Stunden |
|---|---|---|
| 17 | Compliance I (§407a + EU AI Act + AGB) | 6-7h |
| 18 | Compliance II (DSGVO-Betroffenenrechte) | 4-5h |

### Phase E — Admin, UX & Pre-Audit (Tag 19-21, ~20h)
| Tag | Sprint | Stunden |
|---|---|---|
| 19 | AUTH-COCKPIT + KI-Kosten-Widget | 7-8h |
| 20 | APP-LANDING-SPLIT + Mobile-Rescue + Sidebar-Neustruktur | 6-7h |
| 21 | Pre-Audit + Demo-Fall + Übergabe | 6-7h |

### Summe
**~132-155h Code-Zeit** über 21 Arbeitstage. Bei 4 Arbeitstagen/Woche = 5-6 Kalender-Wochen. **Realistisch: 6 Wochen**.

---

## Tag-für-Tag: Sprint-Übersicht

### SPRINT 01 — P3 DSGVO Server-Pseudonymisierung (4-5h)
Alle KI-Pfade client + server pseudonymisiert. AVV wird technisch gehalten.

### SPRINT 02 — P4A Auth-Fundament (5-6h)
Legacy-Migration raus, HMAC-Token, eine Quelle der Wahrheit.

### SPRINT 03 — P4B Function-JWT + Rate-Limit (3-4h)
Alle Functions JWT-geschützt, pro-User-Rate-Limit.

### SPRINT 04 — P5 Reste + Seiten-Audit-Fixes (4-5h)
Alle offenen Security-Findings + Import-Bug, Jahresbericht, Bescheinigungen-Link-Fix.

### SPRINT 05 — Legacy-Datenmigration-Assistent (4-5h)
SV kann Bestandsdaten (Kontakte, Altfälle, Altrechnungen, Altdokumente) importieren.

### SPRINT 06 — B1 Einträge-System (6-7h)
EINTRAEGE-Tabelle, Diktat/Notiz/Skizze, gerichtsfeste Chronologie, Opus 16kbps.

### SPRINT 07 — B2 Skizzen-Funktion (5-6h)
Canvas Tier 1+2, Marker-Verknüpfung.

### SPRINT 08 — B3 Bibliothek-Pattern universal (6-7h)
Normen, Textbausteine, Floskeln, §-Verweise, Kontakte, Positionen in 7 Seiten.

### SPRINT 09a — B4 KI-Werkzeug Kern (8h)
§6-Editor Leer-Feld-First, Konjunktiv-II (GPT-4o!), Halluzinations-Check, §407a-Check, UI-Komponente, Tests. **Pflicht-Input: KI-PROMPTS-MASTER.md.**

### SPRINT 09b — B4 KI-Werkzeug Zusatz (7-9h)
Kommasetzung, Grammatik, Absätze-Ordnen, Fachsprache, Normen-Konsistenz, Einstellungen-Block mit Profi-Modus, KI-Kosten-Tracking.

### SPRINT 10 — B5 Auftragstypen + Externe Docs (7-9h)
Stufenmodell, 11 Typen mit spezifischen Feldern, Beweisbeschluss-Extraktion, 3 Aktenzeichen-Felder.

### SPRINT 11 — B6 Workflows + Fristen + Dashboard (9-11h)
4 Flows mit Phasen-Timeline, Fristen-System 5-Pipelines + 8 Typen, 5 fixe Dashboard-Widgets.

### SPRINT 12 — B7 Rechnungen + Bescheinigungen (10-12h)
Auto-Rechnung nach Freigabe, JVEG-Modus, Angebots-Workflow, Mahnwesen, 7 Bescheinigungs-Arten (3 PDFMonkey + 3 Briefvorlagen).

### SPRINT 13 — M7a Make-Migration G1 + Whisper (5-6h)
Haupt-Gutachten-Flow + Whisper zu Netlify-Functions.

### SPRINT 14 — M7b Make-Migration Rest (5-6h)
G3, K2, L3, F1, A5 migriert. Nur noch 4 Cron-Szenarien bei Make.

### SPRINT 15 — Operations (6-7h)
Sentry, Airtable-Backup, Status-Page, Stripe-Secret-Rotation.

### SPRINT 16 — Compliance I (6-7h)
§407a-Pre-Send-Checkbox, EU AI Act PDFs, AGB/Datenschutz-Versionierung, AVV-Update.

### SPRINT 17 — Compliance II (4-5h)
DSGVO Art. 15/17/20 End-to-End, Einwilligungs-Management, Verarbeitungs-Verzeichnis.

### SPRINT 18 — AUTH-COCKPIT + KI-Kosten (7-8h)
admin.prova-systems.de mit 2FA, Live-Metriken, Login-as-User, **KI-Kosten-Widget pro User**.

### SPRINT 19 — Split + Mobile + Sidebar (6-7h)
Domain-Split, Mobile-Rescue P1-4, neue 4-Gruppen-Sidebar mit Aktiver-Fall-Anker.

### SPRINT 20 — Pre-Audit + Demo-Fall (6-7h)
AUDIT-REPORT abschließen, Playwright grün, Freelancer-Briefing, **Demo-Fall SCH-DEMO-001**, Pilot-Welcome-Pack.

---

## Nach Tag 21 — Der Übergang zu Pilot

**Freelancer-Audit:** 3 Tage à ca. 800€ = 2.400€. Scope Security + Architektur.

**Anwalt-Review parallel:** 300-500€ für AGB/Datenschutz/AVV.

**Pilot-Phase:**
- 2-3 handverlesene SVs zuerst (nicht 10 auf einmal!)
- Demo-Fall hilft bei Onboarding
- Weekly-Feedback-Calls
- Cockpit-Analytics überwachen
- Nach 4-6 Wochen: Rollout auf 10 Founding Members

**Post-Pilot-Backlog (explizit nicht jetzt):**
- Konfigurierbare Dashboard-Widgets (Drag&Drop, Toggle)
- Tier-2-Widgets: Offene Rechnungen, Monats-KPIs, KI-Tipps, Norm des Tages, Persönliche Stats
- Hilfe-Erklär-Bereiche (Typ B) + Live-Hilfe-Button (Typ C)
- Google/Outlook-Kalender-Sync (heute: Make-T3 mit Gmail)
- Konfigurierbare Live-KI-Funktionen (mehr Profi-Modus-Granularität)
- Finding 2.2 (Foto-EXIF-Strip + Face-Blur) falls Pilot-Feedback es verlangt
- Finding 2.6 (Personen-Regex-Erweiterung) falls Namen durchrutschen

---

## Marketing-Parallel-Plan

Während 21 Sprint-Tage laufen, macht Marcel parallel Marketing-Arbeit. **Details in `04_MARKETING-PARALLEL.md`** (unverändert seit v2.0).

**Kurz:**
- Woche 1-2: Landing, Warteliste, LinkedIn-Posts, 5 Interessenten
- Woche 3-4: 2 Blog-Posts, IHK-Netzwerk, Video-Demo-Script
- Woche 5-6: 2 weitere Blog-Posts, Pilot-Kandidaten konkretisieren
- Ziel Ende: 15-25 Warteliste + 5-8 konkrete Pilot-Interessenten

---

## Risiken + Mitigations (aktualisiert)

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Claude Code findet unerwartete Legacy-Abhängigkeit | Mittel | Mittel | Sprint-Start-Ritual Step 1 |
| Browser-Test zeigt Bug nach Deploy | Mittel | Niedrig | Rollback-Tag immer bereit |
| DSGVO-Pseudonymisierung bricht KI-Qualität | Niedrig | Mittel | Test-Diktat mit Fake-Daten VOR Go-Live |
| **KI-Funktion unzuverlässig (z.B. Konjunktiv II bei Mini)** | **Mittel** | **Hoch** | **KI-Funktions-Garantie (5 Tests), GPT-4o statt mini, Funktion bei rot ausblenden** |
| **KI-Kosten über 5% Umsatz** | **Niedrig-Mittel** | **Mittel** | **Monitoring im Cockpit, Push-Alert, Pricing-Anpassung oder Nutzungs-Limit** |
| Make-Migration bricht Bestandsdaten | Niedrig | Hoch | Alte Scenarios erst pausieren, nicht löschen |
| Auth-Umbau lockt Marcel aus | Mittel | Hoch | Notfall-Backup-Password + Bookmarklet-Token |
| Motivation lässt bei Tag 15+ nach | Mittel | Hoch | Weekly-Review, kleine Meilensteine feiern |
| Pilot-SV-Feedback deckt fundamentales Problem auf | Niedrig | Hoch | Nur 2-3 Piloten zuerst + Demo-Fall als Onboarding |
| **"Wenn ein Helferlein nicht funktioniert, SV springt ab"** | **Mittel** | **Sehr Hoch** | **KI-Funktions-Garantie zwingend, Test-Suite pro Funktion** |

---

## Storage-Strategie (unverändert v2.0)

| Datentyp | Wo | Warum |
|---|---|---|
| Audio-Diktate (Opus 16 kbps) | Netlify Blobs (Pro-Plan 100 GB) | Im Stack |
| Fotos | Airtable-Attachment | Bleibt aus v98 |
| Skizzen (PNG/SVG) | Airtable-Attachment | Klein, direkt |
| PDFs (Gutachten, Rechnungen, Briefe, Bescheinigungen) | Airtable-Attachment | Sauber in der Akte |
| Text (Einträge, Felder, Timeline) | Airtable-Zellen | Normale Records |
| Audit-Logs | AUDIT_TRAIL-Tabelle | 5 Jahre |
| Backups | Netlify Blobs + später R2 | Disaster-Recovery |

Bei Wachstum > 50 SVs: Cloudflare R2 (1 Tag Migration, 34€/Monat für 2,25 TB).

---

## Preis-Modell (unverändert)

- **Solo:** 149€/Monat
- **Team:** 279€/Monat
- **Add-ons:** 5 Fälle (price_1TJLnv8), 10 Fälle (price_1TJLpG8)
- **Founding-Members:** 99€ lifetime für erste 10 Pilotkunden

---

## Anlagen-Dokumente (v2.1-Stand)

| Dokument | Version | Inhalt |
|---|---|---|
| `00_MASTERPLAN.md` | **v2.1** | Diese Datei |
| `01_UI-PRINZIPIEN.md` | **v2.1** | KI-Regeln ergänzt |
| `02_WORKFLOWS.md` | v2.0 | Unverändert |
| `03_SYSTEM-ARCHITEKTUR.md` | v2.0 | Unverändert |
| `04_MARKETING-PARALLEL.md` | v2.0 | Unverändert |
| `05_LEGACY-DATENMIGRATION.md` | v2.0 | Unverändert |
| `SPRINT-01-P3-DSGVO.md` | v2.0 | Unverändert |
| `SPRINT-02-P4A-Auth.md` | v2.0 | Unverändert |
| `SPRINT-03-P4B-JWT.md` | v2.0 | Unverändert |
| `SPRINT-04-P5-Reste.md` | v2.0 | Unverändert |
| `SPRINT-05-Datenmigration.md` | v2.0 | Unverändert |
| `SPRINT-06-B1-Eintraege.md` | v2.0 | Unverändert |
| `SPRINT-07-B2-Skizze.md` | v2.0 | Unverändert |
| `SPRINT-08-B3-Bibliothek.md` | v2.0 | Unverändert |
| `SPRINT-09-B4-KI-Werkzeug.md` | **v2.1** | Komplett-Umbau, auf 2 Tage |
| `SPRINT-10-B5-Auftragstypen.md` | **v2.1** | Stufenmodell, Externe Docs, Aktenzeichen |
| `SPRINT-11-B6-Workflows.md` | **v2.1** | Fristen, Dashboard-Widgets |
| `SPRINT-12-B7-Rechnungen.md` | **v2.1** | Bescheinigungen integriert |
| `SPRINT-13-M7a-G1-Whisper.md` | v2.0 | Unverändert |
| `SPRINT-14-M7b-Rest.md` | v2.0 | Unverändert |
| `SPRINT-15-Operations.md` | v2.0 | Unverändert |
| `SPRINT-16-Compliance-I.md` | v2.0 | Unverändert |
| `SPRINT-17-Compliance-II.md` | v2.0 | Unverändert |
| `SPRINT-18-Auth-Cockpit.md` | **v2.1** | KI-Kosten-Widget |
| `SPRINT-19-Split-Mobile.md` | **v2.1** | Sidebar-Neustruktur |
| `SPRINT-20-Pre-Audit.md` | **v2.1** | Demo-Fall SCH-DEMO-001 |

---

## Stand-Notiz

**Tag 0 (24./25.04.2026) — Vor-Pilot-Arbeiten heute:**
- Mobile-Rescue Phase 0 → v180-trial-hotfix-3-done ✅
- S-SICHER P2 → v180-ssicher-p2-done ✅
- S-SICHER P2.6 → v180-ssicher-p2-6-done ✅
- Strategie-Beschluss: Make-Migration, Einträge-System, Bescheinigungen behalten
- Masterplan v2.0 → v2.1 erweitert nach 5 Strategie-Gesprächen

**Bekannte Pflicht-Inputs für Start:**
- **KI-PROMPTS-MASTER.md** muss im Projekt-Root sein bevor Sprint 9a startet (Marcel bringt mit)

**Tag 1 beginnt:** [Datum eintragen wenn Start]

**Bisher erledigt aus 36 Findings:** 6 Kritische + Hohe geschlossen. 30 offen → werden in Phase A abgearbeitet.

---

**Dieses Dokument ist lebendig. Nach jedem Sprint: Stand-Notiz ergänzen, Sprint-Doc finalisieren.**
