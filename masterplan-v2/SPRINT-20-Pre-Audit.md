# SPRINT 20 — Pre-Audit + Demo-Fall + Übergabe

**Tag:** 21  |  **Aufwand:** 6-7h  |  **Phase:** E Admin, UX & Pre-Audit

---

## Ziel
System ist freelancer-ready. Scope für externen Audit klein → Kosten gering (~2.400€). Pilotkunden-Onboarding inkl. Demo-Fall ist vorbereitet.

---

## Sprint-Start-Ritual
1. **Code-Check:** AUDIT-REPORT.md — welche Findings jetzt wirklich grün?
2. **Datenfluss:** End-to-End-Test eines kompletten Gutachten-Zyklus
3. **Scope-Fix:** Nur Dokumentation, Tests, Abschluss, Demo-Fall. Kein neues Feature.

---

## Scope

### 1. Interner Audit-Re-Run (1h)
- AUDIT-REPORT.md durchgehen, pro Finding Status (grün/gelb/rot)
- Kurze Notiz pro Finding: "Fix in Sprint X", "Bewusst akzeptiert weil ...", "Offen"
- Zusammenfassung: wie viele kritische + hohe + mittlere Findings verbleiben

### 2. Playwright-Suite final (1h)
- `npx playwright test` — alle Tests
- Bei rot: sofort fixen, nicht stehen lassen
- Neue Tests aus Sprints 17-19 ergänzen (DSGVO, Cockpit, Mobile)
- CI-Integration optional

### 3. README.md neu (30 Min)
- Was ist PROVA (1 Absatz)
- Tech-Stack
- Dev-Setup: npm install, netlify dev, ENV
- Deploy: git push → Netlify auto
- Tests: npx playwright test
- Link zu Masterplan-v2

### 4. CLAUDE.md Review (30 Min)
- Die 20 eisernen Regeln aktualisieren
- "KI-Funktions-Garantie" als neue Regel aufnehmen
- Welche überholt? Welche schärfen?

### 5. docs/FREELANCER-AUDIT-BRIEFING.md (1h)
- Scope des Audits (Security + Architektur, kein Feature-Audit)
- Bekannte Einschränkungen:
  - Foto-EXIF-Strip nicht implementiert (bewusst, in Backlog)
  - EULA-Text noch nicht juristisch geprüft (Anwalt parallel)
  - Personen-Regex konservativ
- Zugriffs-Konten vorbereitet (Read-Only: Airtable, Netlify, Stripe)
- No-Go-Bereiche (AGB-Inhalt, juristische Formulierung)
- Erwartete Deliverables (Findings-Report, Empfehlungen, Re-Test)
- Budget: 3 Tage à 800€ = 2.400€ (eng-scoped)

### 6. docs/ARCHITECTURE.md (30 Min)
- Mermaid-Diagramme (aus 03_SYSTEM-ARCHITEKTUR.md syncen)
- Datenflüsse
- Sicherheits-Schichten
- Technologie-Entscheidungen (warum Airtable, warum Vanilla-JS)

### 7. Demo-Fall SCH-DEMO-001 (2-3h) ⭐

**Ein vorgefertigter Test-Fall** der neuen SVs beim Onboarding automatisch angelegt wird.

**Inhalt:**
- **AZ:** `SCH-DEMO-001`
- **Titel:** "Schimmelbefall Musterhaus"
- **Auftragstyp:** Privatgutachten
- **Auftraggeber:** "Max Mustermann" (fiktiv)
- **Schadensort:** Musterstraße 1, 12345 Musterstadt
- **Status:** Phase 3 (Ortstermin abgeschlossen)
- **Befüllt mit:**
  - 3 Beispiel-Fotos (Schimmel-Ecken, neutrale Test-Bilder) mit KI-Captions
  - 2 Einträge:
    - Eintrag #01 (Diktat): "Ortstermin Wohnzimmer, Nordwest-Wand. Schimmel auf ca. 2 m² sichtbar..."
    - Eintrag #02 (Notiz): "Raumluft feucht, Lüftungssituation unzureichend, Bewohner berichtet..."
  - 1 Beispiel-§6-Text (**read-only**, kann nur angesehen, nicht wiederverwendet werden)
  - 1 Skizze (Grundriss Wohnzimmer mit 2 Markern)
- **Gelbes Banner** sichtbar auf allen Demo-Fall-Seiten: "🧪 Demo-Fall — nicht für echte Gutachten"
- **Reset-Button** in Dashboard: "Demo zurücksetzen" → stellt Ausgangszustand wieder her

**Implementierung:**
- Seed-Skript `scripts/seed-demo-fall.js`
- Läuft automatisch bei neuer SV-Registrierung (in identity-signup.js)
- Demo-Fall ist isoliert pro SV (sv_email-gefiltert)
- Alle Änderungen sind reversibel über "Demo zurücksetzen"-Button
- Demo-Fall wird NICHT in Statistiken eingerechnet (Flag `ist_demo=true`)

### 8. Pilot-Welcome-Pack (1h)
- Welcome-Email-Serie (4 Mails: Tag 0, 3, 7, 14) als HTML in netlify-emails/
- `docs/PILOT-GUIDE.pdf` (Pandoc aus Markdown):
  - Erste Schritte (5 Seiten)
  - FAQ (3 Seiten)
  - Support-Kontakt
- Feedback-Formular als eigene Tally-Form oder Airtable-Table verlinkt

### 9. Backup-Restore-Test (30 Min)
- Einmal live durchlaufen: Airtable-Dump, parsen, in Test-Base re-importieren
- Dokumentation als `docs/DISASTER-RECOVERY.md`
- RTO: 4h Ziel
- RPO: 24h (nightly Backup aus Sprint 15)

### 10. Video-Demo (1h)
- Loom 5 Min: Neuer Fall → Diktat → KI → §6 → Freigabe → PDF → Rechnung
- Upload, Link in `docs/ABLAUF.md`
- Erwägung: auch auf Landing-Page einbinden

---

## Prompt für Claude Code

```
PROVA Sprint 20 — Pre-Audit + Demo-Fall + Uebergabe (Tag 21)

Pflicht-Lektuere: AUDIT-REPORT.md, CLAUDE.md, README.md, 
PROVA-CHAT-TRANSPORT-*.md, Masterplan-v2 komplett

KONTEXT
=======
Letzter Sprint vor Freelancer-Audit. Dokumentation + Uebergabe-Vorbereitung.
Demo-Fall wird aktiv beim Onboarding erzeugt.

SCOPE
=====

Commit 1: Interner Audit-Re-Run
- AUDIT-REPORT.md pro Finding Status setzen
- Zusammenfassung am Ende

Commit 2: Playwright-Suite final
- Alle Tests ausfuehren
- Bei rot: fixen
- Neue Tests aus Sprints 17-19

Commit 3: README.md neu

Commit 4: CLAUDE.md Review
- KI-Funktions-Garantie als Regel aufnehmen

Commit 5: docs/FREELANCER-AUDIT-BRIEFING.md
Commit 6: docs/ARCHITECTURE.md mit Mermaid

Commit 7: Demo-Fall SCH-DEMO-001 — Seed-Skript
- scripts/seed-demo-fall.js
- Felder wie im Sprint-Dokument spezifiziert
- Fotos: public/demo-assets/foto-01.jpg, foto-02.jpg, foto-03.jpg
- sv_email = neuer User bei Registrierung
- ist_demo=true Flag in SCHADENSFAELLE
- 3 Eintraege mit unterschiedlichen Typen
- 1 §6-Text read-only (im Feld markiert)

Commit 8: Demo-Fall-Integration
- identity-signup.js: nach User-Creation Seed-Skript aufrufen
- Dashboard-Widget: Wenn Demo-Fall aktiv, Banner "Noch keinen echten Fall? Demo ausprobieren"
- Reset-Button in einstellungen.html "Demo-Fall zuruecksetzen"

Commit 9: Demo-Fall-Exclusion aus Statistiken
- KI_STATISTIK, STATISTIKEN, Jahresbericht: ist_demo=true filter
- Cockpit-KPIs exklusive Demo-Daten

Commit 10: Pilot-Welcome-Pack
- netlify-emails/ HTML-Templates Tag 0/3/7/14
- docs/PILOT-GUIDE.md → PDF via pandoc
- docs/ABLAUF.md mit Video-Link

Commit 11: Backup-Restore-Test
- Einmal durchlaufen
- docs/DISASTER-RECOVERY.md

Commit 12: Video-Demo (Marcel macht selbst mit Loom)
- Script in docs/DEMO-SCRIPT.md

Commit 13: Tag + Release

QUALITAET
=========
- AUDIT-REPORT alle kritische + hohe Findings gruen
- Freelancer-Briefing 2-Seiter, 15 Min lesbar
- Onboarding-Walk: 0 → erstes PDF in < 30 Min
- Backup-Restore funktioniert
- Demo-Fall: vollstaendig, sicher, resetbar

TAG: v180-pilot-ready
RELEASE: v2.0.0-pilot-ready (Git-Release)
```

---

## Acceptance
1. AUDIT-REPORT alle kritische + hohe Findings grün oder dokumentiert akzeptiert
2. Freelancer-Briefing 2-Seiter, 15 Min lesbar
3. Onboarding-Walk: 0 → erstes PDF in < 30 Min
4. Backup-Restore funktioniert
5. **Demo-Fall erscheint bei neuer Registrierung automatisch**
6. **Demo-Fall-Reset funktioniert**
7. **Demo-Daten nicht in Statistiken**
8. Video-Demo aufgenommen, verlinkt
9. Pilot-Welcome-Pack komplett

## Rollback
Nicht benötigt — Sprint ist primär Dokumentation + Seed-Skript.

---

## Nach Sprint 20

**Freelancer-Audit beauftragen:**
- 2-3 Kandidaten anfragen (clearvoice, malt, toptal, Netzwerk)
- Spezifikation: Scope aus Freelancer-Briefing
- 3 Tage Budget
- Erwartung: Findings-Report innerhalb 1 Woche

**Anwalt-Review parallel:**
- AGB, Datenschutz, AVV, §407a-Text, Widerrufsbelehrung
- Budget 300-500€
- Spezialist SaaS + Sachverständigen-Recht

**Nach Audit + Review:**
- Findings umsetzen (Hotfixes)
- 2-3 Pilotkunden onboarden
- Weekly-Feedback-Calls
- Nach 4-6 Wochen Pilot: Öffentlicher Launch

---

**Dieses Dokument schließt den Masterplan v2 ab.**
