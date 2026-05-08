# 🌅 MEGA⁴¹ — PRE-PILOT-VOLLENDUNG (Master-Prompt)

**Owner:** Marcel Schreiber
**Branch:** `mega41-pre-pilot-completion` (NEU von `main` @ `a72a803`)
**Tag:** v1300 → v1400 (nur bei N/N Acceptance)
**Modus:** AUTONOMOUS — Auto-Mode, Self-Scoping aktiv, ehrliche PARTIAL bei Token-Limit
**Geschätzt:** 28-38h CC-Zeit, 5-7 Sessions

---

## 🚨 EXECUTIVE CONTEXT

PROVA hat M⁴⁰ Editor & Vorlagen live. **Audit zeigt: 3/13 DONE, 10/13 PARTIAL, 0/13 MISSING.** Keine Bereiche fehlen komplett — aber 10 Bereiche brauchen die letzten 5-30% bis 100%. **Pre-Pilot-Bereitschaft erfordert dass alle 13 Punkte ✅ sind.**

**Hauptquelle:** `docs/audit/PROVA-VOLLSTAENDIGKEITS-AUDIT-2026-05-12.md`

**Marcel-Direktiven:**
> "Pilot kann warten — wir bauen NICHT für 1-3 Pilot-SVs. Wir bauen 100% Vision-Komplett."
> "Wenn das nicht funktioniert, funktioniert gar nichts." (zu P11 Daten-Import)

---

## 🛡️ ANTI-ABKÜRZUNGS-REGELN

```
Phase 0 PFLICHT — Audit-Bericht + Master-Dokumente lesen
Per-Item-Push (1 funktionales Item = 1 Commit)
Heart-Beat alle 5 Items (Status-Update)
Token-Limit ehrlich bei <15% — sauberer Resume-Point
KEIN Branch-Merge zu main durch CC (Marcel-Pflicht)
KI-Modelle: gpt-5.5 (frontier) + gpt-5.5-instant (light)
NIEMALS gpt-4o oder gpt-4o-mini (deprecated Feb 2026)
KI-Modell-Namen NIEMALS im UI sichtbar
Konjunktiv-II-Pflicht in §6-Hinweisen (§407a ZPO)
sw.js CACHE_VERSION in JEDEM Commit bumpen
Working-Tree-Disziplin — CLAUDE.md, masterplan-v2/, NACHT-PAUSE.md NICHT antasten
Recherche-Pflicht für Compliance-relevante Themen (DSGVO, IHK, BVS, §407a)
KI-Funktions-Garantie 5-Tests-Suite pro KI-Funktion
```

---

## 🎯 SELF-SCOPING-FREIHEIT

Du bist **Senior-Dev mit Co-Founder-Mandat.** Marcel + Web-Claude liefern Vision + Acceptance, **du entscheidest wie umgesetzt wird:**

```
✅ DU entscheidest: Library-Auswahl, Schema-Details, Code-Architektur, Reihenfolge,
   Test-Strategie, UI-Umsetzung-Details

🛑 NICHT-Verhandelbar:
   - Vision pro Phase
   - User-Stories
   - Acceptance-Criteria
   - Compliance-Regeln (§407a, EU AI Act, DSGVO)
   - KI-Modell-Stack (gpt-5.5)
   - Storage-Patterns (JSONB für komplexe Daten)
```

**Bei Spec-Lücken:** best-effort + Doku in Phase-Report. NICHT pausieren.

---

## 🚨 AUTONOMOUS-MODE

```
✅ Marcel ist offline. Du läufst mehrere Sessions autonom.
✅ KEINE Confirmation-Pausen
✅ Migration via Supabase MCP (Authorization GEGEBEN)
✅ Per-Item-Push, kein Mid-Phase-Stop

🛑 EHRLICH STOPP nur bei:
   - Token-Window <15% → PARTIAL-Doku + Resume-Plan
   - DESTRUCTIVE-Action ohne klare Direktive
   - 3 aufeinanderfolgende identische Test-Failures
   - Acceptance-Liste komplett grün (= FINAL)
```

---

## 📚 PHASE 0 — AUDIT-RECHECK + PFLICHT-LEKTÜRE

### Hauptquellen

```
docs/audit/PROVA-VOLLSTAENDIGKEITS-AUDIT-2026-05-12.md ⭐ KRITISCH
   → 13 Punkte detailliert
   → Top-3 Pre-Pilot-Blocker
   → Was nicht verifiziert wurde

PROVA-VISION-MASTER.md
PROVA-ARCHITEKTUR-MASTER.md
PROVA-REGELN-PERMANENT.md
CHANGELOG-MASTER.md (für M⁴⁰-Stand)
docs/sprint-status/MEGA-40-FINAL.md
```

### Output Phase 0

`docs/sprint-status/MEGA41-PHASE-0-AUDIT-RECHECK.md` mit:

1. **Audit-Bericht-Synthese** (welche 10 PARTIAL-Punkte, was genau fehlt)
2. **Code-Stand-Snapshot pro Phase** (Was ist da, was fehlt)
3. **Implementierungs-Reihenfolge** mit Begründung
4. **Geschätzte Token-Kosten pro Phase** (für Session-Splitting)

---

## 🔥 PHASE 1 — P11 DATEN-IMPORT BACKEND (~6-8h) — TOP-PRIORITÄT

### Marcel-Zitat

> "Wenn das nicht funktioniert, funktioniert gar nichts."

### Vision

Ein etablierter SV mit 15 Jahren Gutachten Manager-Daten kann **mit einem Klick** seine komplette Datenbank zu PROVA migrieren. Kontakte, alte Aufträge, Rechnungen, Dokumente — alles übernehmbar. **Das ist der Killer für Marktdurchdringung.**

### User-Story

> "Ich exportiere aus Gutachten Manager eine CSV/JSON. Ich lade sie in PROVA hoch. Nach 5 Minuten habe ich alle meine 200 Kontakte, 80 Aufträge, 50 Rechnungen in PROVA. Verlustfrei. Mit Audit-Trail."

### Was am Ende stehen muss

```
✅ Bestehende UI import-assistent.html (374 LOC) ist funktional verbunden
✅ Backend-Lambdas für Mass-Import:
   - Kontakte (CSV + JSON-Format)
   - Aufträge mit allen Sub-Bezügen
   - Rechnungen
   - Dokumente (Metadaten + ggf. Datei-Refs)
✅ Format-Detector (erkennt Gutachten Manager / GutachtenAgent / Bauexpert / Generic-CSV)
✅ Mapping-UI: User mappt fremde Spalten auf PROVA-Felder
✅ Preview vor Import (zeigt erste 5 Zeilen mit Mapping)
✅ Validation: Pflichtfelder, Duplikate-Erkennung, Format-Checks
✅ Bulk-Insert mit Transaction-Sicherheit (alles oder nichts)
✅ Audit-Trail jedes Imports (was, wann, von wem, wie viele Records)
✅ Rollback-Möglichkeit innerhalb 24h
✅ Performance: 1000 Records < 30 Sekunden
✅ Error-Handling: Liste der fehlgeschlagenen Records mit Grund
```

### Recherche-Pflicht

Bevor Implementation: **3-5 Quellen** zu CSV-Mass-Import-Patterns + DSGVO-konforme Daten-Migration. Best-Practices von etablierten SaaS (Notion-Import, Linear-Import, Stripe-Import).

### Acceptance Phase 1

- [ ] Import von 100 Test-Kontakten aus CSV: <10s, 0 Datenverlust
- [ ] Import von 50 Aufträgen mit Beziehungen: alle Kontakt-Refs korrekt
- [ ] Format-Detector erkennt mind. 3 Formate korrekt
- [ ] Duplikate werden erkannt (E-Mail-Match bei Kontakten)
- [ ] Rollback eines Imports funktioniert
- [ ] Audit-Trail-Eintrag pro Import sichtbar
- [ ] 15+ Tests grün
- [ ] Doku in `docs/features/MEGA41-PHASE-1-DATEN-IMPORT.md`

---

## 🔍 PHASE 2 — P6 AUDIT-TRAIL KI-VS-SV-TRENNUNG (~3-4h)

### Vision

Bei jedem KI-generierten Inhalt im System ist **automatisch und unverkennbar** dokumentiert dass dieser Inhalt von KI kam, nicht vom SV. Bei jedem SV-Eingabe-Inhalt umgekehrt. Vor Gericht: lückenlose Beweiskette wer was geschrieben hat.

### User-Story

> "Mein Gutachten geht vor Gericht. Der Anwalt fragt: 'Hat eine KI das geschrieben?' Ich klicke im Audit-Trail und sehe: 87% SV-eigene Eingabe, 13% KI-Vorschläge die ich übernommen habe. Mit genauen Zeitstempeln und Inhalten."

### Was am Ende stehen muss

```
✅ Schema-Erweiterung audit_trail-Tabelle:
   - source-Feld mit ENUM ('ki', 'sv_eigen', 'sv_uebernommen', 'system')
   - confidence-Score bei KI-Inhalten
   - eu_ai_act_disclosed-Boolean
   - indiziert für schnelle Abfragen
✅ Alle KI-Calls (über ki-proxy) loggen automatisch source='ki' mit Modell + Confidence
✅ Alle SV-direkten Eingaben loggen source='sv_eigen'
✅ "KI-Vorschlag übernommen"-Klick logt source='sv_uebernommen' mit Original-KI-Ref
✅ EU AI Act Disclosure-Stempel auf JEDEM KI-Inhalt (nicht nur weg_c PDF):
   - Im Editor sichtbar als kleines Badge
   - Im PDF-Export immer am Ende
   - Im Audit-Trail-Export
✅ Audit-Trail-Viewer (audit-trail.html) zeigt:
   - Filter nach source
   - Timeline pro Auftrag/Dokument
   - Export als PDF (gerichtsfest)
   - SV-Eigenleistungs-Quote (% sv_eigen + sv_uebernommen)
✅ §407a-Compliance-Check: Mindestens X% SV-Eigenleistung pro Gutachten (konfigurierbar)
```

### Recherche-Pflicht

Vor Implementation: **3+ Quellen** zu EU AI Act Art. 50 (Transparenz-Pflicht), §407a ZPO (Persönliche-Verantwortung-Doktrin), gerichtliche Anforderungen an KI-Audit-Trails (BGH-Rechtsprechung 2024-2026).

### Acceptance Phase 2

- [ ] Schema-Migration applied via MCP
- [ ] Index auf source-Feld + Performance-Test (<50ms bei 10k Einträgen)
- [ ] Alle KI-Funktionen loggen automatisch
- [ ] EU AI Act Badge im Editor sichtbar bei KI-Inhalt
- [ ] Audit-Trail-Viewer funktional
- [ ] PDF-Export gerichtsfest (mit Signatur-Hash)
- [ ] SV-Eigenleistungs-Berechnung korrekt
- [ ] 12+ Tests grün
- [ ] Recherche-Doku mit 3+ Quellen
- [ ] Doku

---

## 📡 PHASE 3 — P9 PUSH-ALERTS + HEALTH-COVERAGE (~3-4h)

### Vision

Wenn irgendwo im PROVA-System etwas nicht funktioniert (Make.com down, PDFMonkey down, Supabase langsam, Stripe-Webhook fehlgeschlagen), bekommt **Marcel automatisch eine Push-Notification** auf sein Handy — bevor User sich beschweren. **Reaktiv → Proaktiv.**

### User-Story (aus Marcel's Audio)

> "Ich bekomme eine Nachricht, wenn irgendwo irgendwas nicht funktioniert, das heißt ein Server ist down und ich bekomme die Push-Up-Nachricht, dass ich da jetzt mal nachschauen muss, ohne dass mich ganz viele Beschwerden erreichen."

### Was am Ende stehen muss

```
✅ admin-system-health Lambda erweitert auf 8+ Services:
   - Supabase (Lese-Latenz + Connection-Pool)
   - Netlify-Functions (Sample-Ping)
   - PDFMonkey (Template-List-Endpoint)
   - Make.com (Scenario-Status pro G1/G3/K2/L3/L8/L9/L10/A5/T3/F1)
   - Stripe (API-Reachability)
   - OpenAI / Anthropic (KI-Proxy-Health)
   - Make-Webhooks (jeder einzelne)
   - Domain/SSL-Cert (Ablauf-Warning)
✅ pg_cron-Schedule alle 5 Min Health-Check
✅ Health-Status-Tabelle mit History (für Uptime-Berechnung)
✅ Push-Notification-Trigger:
   - Service down >1 Min → Push an Marcel
   - Service-Wieder-Up → Recovery-Push
   - Latenz-Spike >5s → Warning-Push
   - SSL-Cert <14 Tage Ablauf → Warning
✅ Push-Throttling: max 1 Push pro Service pro Stunde (Anti-Spam)
✅ Admin-Dashboard System-Health-Section zeigt Live-Status (Ampel-System)
✅ Uptime-Statistik 24h / 7d / 30d
✅ Optional: Email-Fallback wenn Push fehlschlägt
```

### Acceptance Phase 3

- [ ] 8+ Services im Health-Check
- [ ] pg_cron Schedule aktiv (every 5 min)
- [ ] Push erreicht Marcel's Gerät bei Test-Down (manuell triggern)
- [ ] Throttling funktioniert (kein Spam)
- [ ] Admin-Dashboard zeigt Ampel
- [ ] Uptime-Berechnung korrekt
- [ ] Recovery-Push funktioniert
- [ ] 10+ Tests grün
- [ ] Doku

---

## 📄 PHASE 4 — P5 PDF-AGGREGATIONS-LAMBDA (~4-5h)

### Vision

Wenn der SV ein Gutachten finalisiert, werden **alle Eintrag-Typen** (Diktate, manuelle Notizen, Fotos, Skizzen, Mix-Inhalte) **chronologisch und strukturiert** ins finale PDF eingewoben. Nicht als Anhang — als integraler Teil des Gutachtens.

### User-Story

> "Ich habe vor Ort 12 Fotos gemacht, 3 Skizzen erstellt, 8 Diktate aufgenommen und 5 manuelle Notizen geschrieben. Beim PDF-Export sehe ich: das Gutachten ist sauber strukturiert mit den Bildern an den richtigen Stellen, Skizzen mit Marker-Verknüpfungen zu Befunden, Diktate als Original-Text-Quelle dokumentiert. Wie aus einem Guss."

### Was am Ende stehen muss

```
✅ Aggregations-Lambda das eintraege-Tabelle abfragt für ein Auftrag
✅ Sortier-Logik: chronologisch, gruppiert nach Befund/Sektion
✅ Foto-Integration:
   - Mit Caption + Alt-Text
   - Skalierung (max-width DIN A4)
   - Floating-Layout möglich
   - Bild-Verzeichnis am Anhang-Ende
✅ Skizzen-Integration:
   - Als PNG eingebettet
   - Marker-Liste mit Befund-Referenzen
   - Maßstab-Anzeige
✅ Diktat-Integration:
   - Original-Text als Quelle dokumentiert
   - KI-bereinigter Text als Fließtext
   - source='ki' / 'sv_eigen' Markierung (P6-Integration)
✅ Manuelle Notizen: Inline an chronologisch korrekter Stelle
✅ Mix-Inhalte: kombinierte Behandlung
✅ EU AI Act Disclosure am Gutachten-Ende
✅ §407a-Hinweis am Gutachten-Ende
✅ Performance: 100-Eintrag-Aggregation <15s
✅ Editor-Integration: "Aus Einträgen generieren"-Button
✅ Manuelle Reorder-Möglichkeit nach Aggregation
```

### Acceptance Phase 4

- [ ] Test-Auftrag mit 50 Einträgen aller Typen → strukturiertes PDF
- [ ] Bilder erscheinen an korrekten Stellen (nicht alle am Ende)
- [ ] Skizzen mit Marker-Liste zu Befunden
- [ ] Diktat-Original und -bereinigt unterscheidbar
- [ ] Performance-Test grün
- [ ] §407a + EU AI Act Compliance auto-injiziert
- [ ] 10+ Tests grün
- [ ] Doku

---

## 🆘 PHASE 5 — P7 SUPPORT-SYSTEM VOLLENDUNG (~3-4h)

### Vision (aus Marcel's Audio)

> "Ein vernünftiger Support drin. So weitgehend und breit aufgestellt, dass wir nahezu jede Frage über den Support beantworten können. Sachverständiger hat eine Frage, kann auf den Support gehen und seine Frage dort eingeben und bekommt auf fast alles eine Antwort. Und wenn dem nicht so ist, dass das ins Admin-Dashboard reinkommt."

### Was am Ende stehen muss

```
✅ support.html mit:
   - FAQ-Suchfeld (instant-search)
   - Kategorisierte FAQ-Liste (Gutachten / Rechnungen / Diktat / Skizzen /
     Bescheinigungen / Termine / KI-Hilfen / Vorlagen / Import / Account / Billing)
   - 30+ FAQ-Einträge initial seeded
   - "Frage stellen"-Form wenn keine FAQ passt
✅ FAQ-Schema in Supabase:
   - kategorie, frage, antwort, tags, last_updated
   - Volltextsuche (tsvector)
✅ Ticket-System:
   - User stellt Frage → Insert in support_tickets
   - Auto-Email an Marcel (empfehlung@... oder support@...)
   - Status: 'open', 'in_progress', 'answered', 'closed'
   - User-Antwort in support.html sichtbar
✅ Admin-Dashboard Support-Inbox:
   - Liste offener Tickets
   - Antworten direkt aus Dashboard
   - Antwort wird Email + In-App-Notification
   - Kategorie-Vorschlag fürs FAQ ("aus diesem Ticket FAQ erstellen")
✅ Initial-FAQ-Content (30+ Einträge) basierend auf:
   - PROVA-Vision-Master
   - PROVA-Architektur-Master
   - Sprint-Doku
   - Häufigsten SV-Fragen (recherchierbar in BVS-Foren etc.)
✅ KI-Hilfe-Integration: bei "Frage stellen" wird zuerst die FAQ-DB durchsucht via
   semantischer Suche, dann KI-Antwort-Vorschlag, dann erst echtes Ticket
```

### Recherche-Pflicht

Vor FAQ-Seeding: **Recherche der häufigsten Fragen** in BVS, IfS, IHK-Sachverständigen-Foren. Mind. 30 reale Fragen mit professionellen Antworten.

### Acceptance Phase 5

- [ ] support.html funktional mit FAQ-Search
- [ ] 30+ FAQ-Einträge geseedet
- [ ] Ticket-Eingang funktional
- [ ] Admin-Dashboard Support-Inbox sichtbar
- [ ] Email-Notifications gehen raus
- [ ] KI-Antwort-Vorschlag vor Ticket-Erstellung
- [ ] 12+ Tests grün
- [ ] Doku

---

## 🔍 PHASE 6 — P1 GLOBALE SUCHE DRILLDOWN-VERIFY + POLISH (~2-3h)

### Vision (aus Marcel's Audio)

> "Tippe DIN, dann irgendeine Zahl, sobald ich die Zahl anklicke werden alle, die mit dieser Zahl anfangen, angezeigt. Tippe ich eine weitere Zahl ein, wird alles entfernt drunter, die diese Zahl nicht mehr enthalten. Je weiter ich suche, desto genauer wird die Suchanzahl."

### Was am Ende stehen muss

```
✅ Live-Filter-Drilldown verifizieren UND polishen:
   - "DIN" → alle DIN-Treffer
   - "DIN 9" → nur 9er-DIN-Treffer (DIN 9, DIN 90, DIN 985, DIN 988, ...)
   - "DIN 98" → nur 98er-DIN-Treffer (DIN 985, DIN 988, ...)
   - "DIN 985" → 1 Treffer
✅ Cross-Type-Suche getestet:
   - "Schimmel" → Bilder + Befunde + Aufträge + Diktate + Bescheinigungen + FAQ
✅ Cmd-K / Strg-K Hotkey global aktiv (alle 30+ Pages)
✅ Recent-Searches gespeichert (max 10)
✅ Favorited-Searches möglich
✅ Performance: <100ms für Filter-Update bei jedem Keystroke
✅ Mobile-optimiert (Suche auch auf iPhone/Android benutzbar)
✅ Auto-Complete-Suggestions ab 2 Zeichen
✅ Visual-Feedback: hervorgehobene Match-Stellen
```

### Acceptance Phase 6

- [ ] DIN-Drilldown manuell + automatisiert grün
- [ ] Cmd-K Hotkey auf 30+ Pages
- [ ] Performance <100ms
- [ ] Mobile-Test grün
- [ ] 10+ Tests grün

---

## 🔗 PHASE 7 — P2 KONTAKT-360-VIEW (~3-4h)

### Vision (aus Marcel's Audio)

> "Das bedeutet, ich gehe auf einen Kontakt und kann von dort alles, was bisher über diesen Kontakt vorhanden ist, sehen. Jedes einzelne Gutachten, jede einzelne Rechnung, jede einzelne Bescheinigung, jedes Bild, was dort gemacht worden ist, ist das alles implementiert."

### Was am Ende stehen muss

```
✅ kontakt-detail.html mit 360°-Tabs:
   - Übersicht (Kerndaten + Statistiken)
   - Aufträge (alle, sortiert nach Datum, mit Status)
   - Rechnungen (alle, mit Status: offen/bezahlt/mahnstufe)
   - Bescheinigungen (alle Top-12-Typen)
   - Dokumente (Briefe, PDFs, ...)
   - Bilder (Galerie aller Fotos verknüpft mit Aufträgen)
   - Skizzen (alle vom SV erstellten Skizzen mit diesem Kontakt)
   - Diktate / Eintraege
   - Termine (Historie + zukünftige)
   - Korrespondenz-Timeline
   - Kommentare/Notizen
✅ Statistiken:
   - Anzahl Aufträge
   - Gesamtumsatz
   - Durchschnittliche Bearbeitungszeit
   - Letzte Interaktion
   - Zahlungsverhalten-Score (basiert auf Mahnungen)
✅ Quick-Actions:
   - Neuer Auftrag mit diesem Kontakt
   - Brief an diesen Kontakt
   - Termin mit diesem Kontakt
   - Bescheinigung für diesen Kontakt
✅ Filter + Suche innerhalb der Kontakt-Akte
✅ Export: kompletter Kontakt-Bericht als PDF
✅ Performance: Kontakt mit 100+ Bezügen lädt <2s
```

### Acceptance Phase 7

- [ ] kontakt-detail.html zeigt alle 9 Bezugs-Typen
- [ ] Statistiken korrekt berechnet
- [ ] Quick-Actions funktional
- [ ] Performance-Test mit Test-Kontakt
- [ ] PDF-Export funktional
- [ ] 12+ Tests grün

---

## 🔄 PHASE 8 — P3 WORKFLOWS STEPPER-POLISH (~2-3h)

### Vision (aus Marcel's Audio)

> "Haben wir die Workflows so, dass sie verständlich sind, nicht überladen sind? Haben wir da schlaue Ideen von bereits berühmten und erfolgreichen SaaS-Systemen übernommen?"

### Was am Ende stehen muss

```
✅ Stepper-Logik konsistent über alle 4 Flows (A=Schaden, B=Wert, C=Beratung, D=Baubegleitung):
   - Visuelles Stepper-Design einheitlich (wie Stripe Checkout / Notion Onboarding)
   - Rückwärts-Navigation IMMER möglich
   - "Pausieren + Später-fortsetzen" funktioniert
   - Progress-Indikator mit %-Wert
✅ UX-Audit gegen etablierte SaaS-Patterns:
   - Linear: Issue-Erstellung
   - Notion: Page-Creation-Flow
   - Stripe Dashboard: Payment-Setup
   - Asana: Task-Creation
✅ Konsistenz-Check:
   - Buttons gleicher Position (Weiter rechts, Zurück links)
   - Pflichtfelder einheitlich markiert
   - Validierungs-Feedback einheitlich (inline + Toast)
   - Save-Status sichtbar
✅ Mobile-Stepper: ein-Spalten-Layout, Touch-optimiert
✅ Keyboard-Navigation (Tab, Enter, Esc)
✅ Acessibility: Screen-Reader-tauglich (aria-Tags)
```

### Recherche-Pflicht

UX-Patterns analysieren von 4-5 etablierten SaaS (Notion, Linear, Stripe, Asana, Vercel-Dashboard). Doku mit Screenshots + welche Patterns übernommen.

### Acceptance Phase 8

- [ ] 4 Flows visuell + funktional konsistent
- [ ] Mobile-Test alle 4 Flows
- [ ] Keyboard-Navigation grün
- [ ] Accessibility-Audit (axe oder Lighthouse)
- [ ] UX-Recherche-Doku mit 5 Quellen
- [ ] 8+ Tests grün

---

## 📑 PHASE 9 — P10 PDFs VOLLSTÄNDIGKEITS-AUDIT (~2-3h)

### Vision

Alle PDFMonkey-Templates funktionieren produktiv, sind im Design-System v1.0, IHK-konform, EU AI Act-compliant. Kein Template ist deprecated oder broken.

### Was am Ende stehen muss

```
✅ Live-Inventur aller PDFMonkey-Templates via API:
   - Anzahl aktiver Templates
   - Alle Template-IDs gegen lib/dokument-templates-cache.js verglichen
   - Drift erkannt + dokumentiert
✅ Test-Render pro Template mit Sample-Daten:
   - F-01 JVEG, F-04 Kurzstellungnahme, F-09 Kurzgutachten
   - F-10 Beweissicherung, F-15 Gerichtsgutachten, F-19 Wertgutachten
   - F-08 Mahnung, F-06 + F-07
   - BES-01 bis BES-12 Bescheinigungen
   - BRIEF-MASTER (DIN 5008), FOTO, SOLO/TEAM Welcome
✅ Pseudonymisierungs-Audit:
   - Vor jedem KI-Call werden personenbezogene Daten ersetzt
   - Test mit Test-Auftrag verifiziert
✅ §407a-Block in jedem Gutachten-Template
✅ EU AI Act Disclosure in jedem KI-touched Template
✅ Performance: durchschnittliche PDF-Generation <8s
✅ Fehler-Liste falls Templates broken
```

### Acceptance Phase 9

- [ ] Live-Template-Inventar dokumentiert
- [ ] Drift zu lib/dokument-templates-cache.js gefixt
- [ ] Test-Render aller relevanten Templates grün
- [ ] Pseudonymisierung verifiziert
- [ ] Performance-Test grün
- [ ] Doku mit Template-Status-Matrix
- [ ] 8+ Tests grün

---

## 📱 PHASE 10 — P13 MOBILE SYNC-KONFLIKT-VERHALTEN (~2-3h)

### Vision (aus Marcel's Audio)

> "Die mobile Nutzung muss perfekt sein. Sie muss offline funktionieren. Alles, was eingegeben worden ist, alle Bilder, jede Skizze — nichts darf verlustig sein, wenn wir irgendwo in den Keller gehen, wenn der Sachverständige Internetprobleme hat. Alles muss nachträglich erreichbar sein und übertragbar."

### Was am Ende stehen muss

```
✅ Sync-Konflikt-Strategie verifiziert + dokumentiert:
   - SV editiert offline auf iPhone
   - Gleichzeitig editiert Team-Mitglied online
   - Beim Re-Connect: Konflikt-Resolution-UI
   - Last-Write-Wins ODER Merge-Vorschlag
✅ Offline-Queue:
   - IndexedDB persistente Queue
   - Auto-Retry bei Wieder-Online
   - Visual-Feedback (Sync-Icon mit Status)
✅ Datenverlust-Verhinderung:
   - Service-Worker cached letzte Edit-Inhalte
   - localStorage-Backup bei jedem Save
   - "Wiederherstellbare Entwürfe"-Page
✅ Test-Szenarien (Browser-DevTools-Offline-Mode):
   - Auftrag offline erstellen → Online → Sync grün
   - Foto offline machen → Online → Upload + Aggregation
   - Skizze offline zeichnen → Online → Sync
   - Diktat offline aufnehmen → Online → Whisper-Transkription
   - Mehrere Edits offline → Online → Reihenfolge erhalten
✅ Performance: Re-Sync 50 Einträge <30s
✅ Mobile-spezifische Pages getestet:
   - diktat-mobile.html
   - foto-mobile (falls existiert)
   - skizze-mobile (falls existiert)
   - Pull-to-Refresh
   - Touch-Gesten konsistent
```

### Acceptance Phase 10

- [ ] Konflikt-Resolution-Strategie dokumentiert
- [ ] Offline-Queue funktional
- [ ] 5 Test-Szenarien manuell + automatisch grün
- [ ] Mobile-spezifische Pages getestet
- [ ] Performance-Test grün
- [ ] Datenverlust-Recovery getestet
- [ ] 12+ Tests grün

---

## ✅ PHASE 11 — VERIFY ✅-PUNKTE (P4, P8, P12) (~2-3h)

### Vision

Die 3 Audit-Punkte die als ✅ DONE markiert sind, werden **nochmal verifiziert** (Live-Tests statt Source-Greps), um sicher zu sein dass sie wirklich produktionsreif sind.

### Was am Ende stehen muss

```
✅ P4 Skizzen Live-Test:
   - Apple Pencil Pressure-Sensitivity
   - S Pen Test
   - IndexedDB Auto-Save-Recovery
   - Marker-System mit Befund-Cross-Reference

✅ P8 Admin-Dashboard Live-Test:
   - Alle 12 AUTH-COCKPIT-Sektionen klickbar
   - 25 admin-* Lambdas erreichbar
   - Login-as-User funktional
   - 2FA mandatory für Marcel

✅ P12 Einstellungen Live-Test:
   - Alle 8 Sections funktional
   - Hell/Dunkel-Toggle persistiert
   - KI-Settings (Modell-Auswahl, Token-Budget)
   - Workflow-Defaults speicherbar
   - Datenschutz-Settings (DSGVO-Recht auf Auskunft, Löschung)
   - Paket-Anzeige (Solo/Team/Founding)

✅ Bug-Fix-Report falls Issues gefunden
```

### Acceptance Phase 11

- [ ] P4 Live-getestet
- [ ] P8 Live-getestet (alle Sektionen)
- [ ] P12 Live-getestet (alle Sections)
- [ ] Bug-Liste falls vorhanden
- [ ] 8+ Tests grün

---

## 🎯 PHASE 12 — COMPOUND-INTEGRATION-TESTS (~3-4h)

### Vision

Alle Phasen-Funktionen werden **gemeinsam in End-to-End-Szenarien** getestet, weil im Produktiv-Betrieb Features sich gegenseitig beeinflussen.

### E2E-Test-Szenarien

```
Szenario 1: "Neuer SV migriert von Gutachten Manager"
   - Account erstellen
   - DSGVO-Consent
   - CSV-Import (P11) → 100 Kontakte + 50 Aufträge
   - Erstes neues Gutachten erstellen (Editor + 3-Wege)
   - Aus Einträgen aggregieren (P5)
   - PDF generieren mit §407a + EU AI Act (P6 + P10)
   - Audit-Trail prüfen (P6)

Szenario 2: "Mobile Außentermin"
   - Offline-Mode aktivieren
   - Auftrag erstellen
   - 5 Fotos machen
   - 2 Skizzen zeichnen (P4)
   - 3 Diktate aufnehmen
   - Manuelle Notizen
   - Online → Sync (P13)
   - Aggregation ins Gutachten (P5)
   - PDF-Export

Szenario 3: "Etablierter SV mit eigener Word-Vorlage"
   - Login (cross-domain)
   - DOCX-Import seiner Vorlage
   - Hybrid-Modus mit Locked-Sections
   - Bibliothek-Toolbar nutzen
   - Spell + Konjunktiv-II-Check (P6)
   - PDF-Export

Szenario 4: "System-Admin tagsüber"
   - Admin-Dashboard
   - Health-Check zeigt Make.com-Latenz-Spike (P3 Alert simuliert)
   - Support-Inbox: 3 Tickets, 1 beantworten (P7)
   - User-Stats anschauen
   - Audit-Trail eines Gutachtens prüfen (P6)

Szenario 5: "Globale Suche und Kontakt-360"
   - Cmd-K → "Müller" → Kontakt finden (P1)
   - Kontakt-360-View öffnen (P2)
   - Alle Bezüge sichtbar
   - Quick-Action: neuer Auftrag
```

### Acceptance Phase 12

- [ ] Alle 5 Szenarien manuell durchgespielt
- [ ] Performance-Werte gemessen
- [ ] Bug-Liste falls Issues
- [ ] Doku mit Screenshots
- [ ] 5 E2E-Tests automatisiert (mind. die kritischen Pfade)

---

## 🎯 PHASE 13 — FINAL + Tag v1400 (~1h)

### Pre-FINAL-Checks

```
[ ] Phase 0 Audit-Recheck komplett
[ ] Phase 1 Daten-Import Backend
[ ] Phase 2 Audit-Trail KI-vs-SV
[ ] Phase 3 Push-Alerts + Health-Coverage
[ ] Phase 4 PDF-Aggregations-Lambda
[ ] Phase 5 Support-System
[ ] Phase 6 Globale Suche Polish
[ ] Phase 7 Kontakt-360-View
[ ] Phase 8 Workflows Stepper-Polish
[ ] Phase 9 PDFs Vollständigkeit
[ ] Phase 10 Mobile Sync-Konflikt
[ ] Phase 11 ✅-Verify
[ ] Phase 12 E2E-Tests
[ ] Migrations applied via MCP
[ ] Master-Doku-Updates
[ ] sw.js v1400
[ ] CHANGELOG-MASTER.md ergänzt
```

### Master-Doku-Updates (CC-Verantwortung)

```
PROVA-VISION-MASTER.md (Status-Update)
PROVA-ARCHITEKTUR-MASTER.md (neue Tabellen + Lambdas)
PROVA-CHAT-TRANSPORT-vAKTUELL.md
CHANGELOG-MASTER.md (M⁴¹-Eintrag)
docs/audit/PROVA-VOLLSTAENDIGKEITS-AUDIT-POST-M41.md (neuer Score)
```

### Tag v1400

WENN alle 17 Acceptance-Items grün:

```
sw.js Version: prova-v1400-mega41-pre-pilot-ready
Tag: v1400
Message: "PROVA M⁴¹ Pre-Pilot-Vollendung — alle 13 Audit-Punkte ✅,
Daten-Import + KI-Audit-Trail + Push-Alerts + PDF-Aggregation +
Support-System + Kontakt-360 + Workflow-Polish + PDFs-Verify +
Mobile-Sync + E2E-Tests. Pilot-Ready."
```

OHNE alle Acceptance: PARTIAL-Doku.

---

## 🚨 TOKEN-LIMIT-PROTOKOLL

Bei ~85% Token-Window:
1. STOPP nach aktueller Item-Commit
2. PARTIAL-Doku: `docs/sprint-status/MEGA-41-PARTIAL-N-OF-M.md`
3. KEIN Tag-Bump
4. Sauberer Resume-Plan

Realistisch: 5-7 Sessions à ~2-4h. Empfohlene Bündelung:

```
Session 1: Phase 0 + 1 (Daten-Import — TOP-PRIORITÄT)        ~7-9h
Session 2: Phase 2 + 3 (KI-Audit + Push-Alerts)              ~6-8h
Session 3: Phase 4 + 5 (PDF-Aggregation + Support)           ~7-9h
Session 4: Phase 6 + 7 + 8 (Suche + Kontakt-360 + Workflows) ~7-10h
Session 5: Phase 9 + 10 + 11 (PDFs + Mobile + Verify)        ~6-9h
Session 6: Phase 12 + 13 (E2E + FINAL)                       ~4-5h
```

---

## 📋 KRITISCHE REFERENZ-DATEN

### KI-Modelle (seit M³⁹ P1)

```
PRÄZISE  → gpt-5.5 (frontier)
SCHNELL  → gpt-5.5-instant

VERBOTEN — gpt-4o, gpt-4o-mini, gpt-4-turbo
```

### Branch-Strategie

```
mega41-pre-pilot-completion
   ↑ NEU von
main (HEAD a72a803, M⁴⁰ FINAL gemerged, Tag v1300)

Marcel-Backup: main-backup-pre-mega41

Nach FINAL: Marcel mergt mega41 → main, dann Tag v1400
```

### Master-Doku-Lokationen

```
docs/audit/PROVA-VOLLSTAENDIGKEITS-AUDIT-2026-05-12.md ⭐ HAUPTQUELLE
PROVA-VISION-MASTER.md
PROVA-ARCHITEKTUR-MASTER.md
PROVA-REGELN-PERMANENT.md
docs/sprint-status/MEGA-40-FINAL.md (M⁴⁰-Stand)
```

---

## 🎯 ERFOLGS-MESSUNG

Nach M⁴¹-FINAL erfüllt PROVA:

```
✅ 13/13 Audit-Punkte DONE (von 3/13 + 10/13 PARTIAL)
✅ Pre-Pilot-Bereitschaft 100%
✅ Daten-Migration von Gutachten Manager funktioniert
✅ KI-vs-SV-Audit-Trail gerichtsfest
✅ Push-Alerts schützen vor Down-Time-Eskalation
✅ Multi-Modal-Gutachten-Aggregation komplett
✅ Self-Service-Support für SVs
✅ Kontakt-360 als CRM-Funktionalität
✅ UX auf SaaS-Marktführer-Niveau
✅ Mobile-Offline-First komplett
✅ E2E-Tests für 5 kritische Szenarien
```

= **Pilot-Welle 1 kann starten.**

---

## 🔥 START

**REIHENFOLGE:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13

**REGEL:**
- Phase 0 PFLICHT vor Phase 1
- Audit-Bericht ist Hauptquelle
- Self-Scoping aktiv für ALLE Implementierungs-Details
- Per-Item-Push, Heart-Beat alle 5 Items
- Token-Limit ehrlich
- Recherche-Pflicht für P2 (Audit-Trail), P5 (Support-FAQ-Content), P8 (UX-Patterns)

**Marcel ist offline. Du arbeitest autonom.**
**Du bist Senior-Dev mit Co-Founder-Mandat.**
**Bei Unsicherheit: best-effort + Doku — NICHT pausieren.**

🚀 **GO.**
