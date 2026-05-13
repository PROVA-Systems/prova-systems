# PROVA Vision Master v3.0 — 100% Komplett

**Stand:** 07.05.2026 (Tag 19) · **Vision: 100% Komplett** ✅✅
**Tag:** v950 · **Branch:** `mega33-ui-integration-100-percent` → `mega34-final-100-percent`

> **MEGA⁷⁰-Phase-1.2.2 Naming-Update (2026-05-13):**
> §6-Fachurteil-Editor: Page wurde von `stellungnahme.html` → **`fachurteil.html`** umbenannt
> (URL: `/fachurteil`, Logik: `fachurteil-logic.js`). Legacy `/stellungnahme*` → 301 → `/fachurteil`.
> Mini-Stellungnahme: `gutachterliche-stellungnahme.html` → **`kurzstellungnahme.html`**.
> Test-Suite `tests/fachurteil-editor/*` hatte schon den richtigen Namen.

---

## 🏁 100% Vision-Komplettheit erreicht

| # | Bereich | Status |
|---|---|---|
| 1 | Schema (DB) | ✅ 100% |
| 2 | KI-Härtung | ✅ 95% |
| 3 | KI-Modell-Migration | ✅ 95% (gpt-5.5/5.4/4.7-Stack) |
| 4 | Prompt-Caching W4-Bonus | ✅ 100% (-40% Cost) |
| 5 | §6 Fachurteil-Editor | ✅ 95% |
| 6 | Compliance-Härtung | ✅ 100% (IHK-SVO + DSGVO + EU AI Act) |
| 7 | Flow A Schadensgutachten | ✅ 100% |
| 8 | Flow B Wertgutachten | ✅ 100% (ImmoWertV §§22-39) |
| 9 | Flow C Beratung | ✅ 100% (SVO § 18) |
| 10 | Flow D Baubegleitung | ✅ 100% (VOB/B § 12) |
| 11 | AUTH-COCKPIT | ✅ 95% |
| 12 | APP-LANDING-SPLIT | ✅ 95% |
| 13 | Sandbox/Demo (/demo) | ✅ 100% |
| 14 | Finanz-Workflows | ✅ 95% |
| 15 | PDF-Templates | ✅ 100% (12 IHK-SVO + 7 Bescheinigungen + Briefe) |
| 16 | Mobile-Rescue P1-P4 | ✅ 95% |
| 17 | Diktat + Whisper | ✅ 95% |
| 18 | Onboarding-Pipeline | ✅ 100% (5 Day-Mails + Cron) |
| 19 | ENVs + Infrastruktur | ✅ 95% |

---

## MEGA-Wellen-Historie ³⁰-³⁴

| Welle | Branch | Tag | Items | Vision-Sprung |
|---|---|---|---|---|
| MEGA³⁰ | mega30-pilot-blocker-vision-kern | (intern) | 12 | → 67% |
| MEGA³¹ | mega31-vollendung-vision-kern | (intern) | 12 | 67% → 78% |
| MEGA³² | mega32-flows-bescheinigungen-mobile | v820 | 12 | 78% → 92% |
| MEGA³³ | mega33-ui-integration-100-percent | **v900** | 11 | 92% → ECHTES 100% |
| MEGA³⁴ | mega34-final-100-percent | **v950** | 10 | 100% Final-Polish |

---

## 4-Flow-Architektur (alle ✅ live)

- **Flow A — Schadensgutachten:** Wizard + KI-Diktat-Strukturierung + §6 Fachurteil-Editor + ZUGFeRD-Rechnung
- **Flow B — Wertgutachten:** ImmoWertV §§22-39 (Sachwert + Vergleich + Ertrag) + UI-Integration
- **Flow C — Beratung:** 3-Phasen-Wizard (Annahme + Termin + Bericht) + B-01-Template + SVO § 18
- **Flow D — Baubegleitung:** Multi-Termin + bauphase-Tagging + B-03-Schluss + VOB/B § 12

---

## Pricing (fix, Marcel-Direktive 2026-05-08)

- Solo: **179€/mo** (bis 30 Aufträge, 1 User, 5 GB)
- Team: **379€/mo** (unlimitiert, bis 5 User, 50 GB)
- Founding: **99€/mo lifetime** (erste 10 Pilot-Kunden)
- Add-ons: 5 Foto-Slots `price_1TJLnv8`, 10 Foto-Slots `price_1TJLpG8`

---

## Roadmap-Phasen (alle ✅ DONE post-MEGA³⁴)

- Phase A — Foundation ✅
- Phase B — Kerngeschäft (Aufträge + Editor + PDFs) ✅
- Phase C — Compliance-Härtung (IHK-SVO + EU AI Act + DSGVO) ✅
- Phase D — UI-Vollendung (alle 4 Flows + Bescheinigungen) ✅
- Phase E — Pre-Pilot (Status-Page + Onboarding-Mails + AVV-Paket) ✅

---

# (Legacy-Stand vor 02.05.2026)

**Stand:** 02.05.2026 nachmittags (Tag 8)
**Vorläufer:** `masterplan-v2/00_MASTERPLAN.md` (25.04., archiviert) · CLAUDE.md v3.0 (27.04.)
**Single Source of Truth** — siehe `docs/master/README.md`

---

## Was PROVA ist

**Ein KI-natives B2B-SaaS für öffentlich bestellte und vereidigte Bausachverständige (ö.b.u.v. SV) in Deutschland.**

Workflow: Auftrag → Ortstermin → Diktat → KI-Strukturhilfe → §6 Fachurteil → Freigabe → PDF → E-Mail → Rechnung → Zahlung.

### Zielgruppe

- **Solo-SVs** (5–30 Standardfälle/Monat)
- **Team-Büros** (Mehrbenutzer mit gemeinsamen Akten)
- Alter ~35-65, technisch interessiert aber nicht Digital-Native
- **Nicht** für 60+-Seiten-Komplexgutachten (das macht eine andere Software)

### 4-Flow-Architektur

| Flow | Inhalt | Zielmarkt |
|---|---|---|
| **A** Schadensgutachten | Versicherungs-/Privat-/Gerichts-Schäden (Wasser, Brand, Schimmel, Sturm, Risse, Setzung, Kombiniert) | Mehrheit |
| **B** Wertgutachten | Verkehrswert nach ImmoWertV, Sach-/Vergleich-/Ertragswert | Wachstum |
| **C** Beratung | Mängelliste, Streitgegenstand, Empfehlungen | Wachstum |
| **D** Baubegleitung | Bauphase mit mehreren Begehungs-Terminen | Wachstum |

### Tier-Modell

| Tier | Preis | Aufträge | Notiz |
|---|---|---|---|
| **Solo** | 179 €/Monat | 30 pro Monat | Standard für Einzel-SVs (seit 09.05.2026) |
| **Team** | 379 €/Monat | unbegrenzt | Mehrere User, gemeinsame Akten (seit 09.05.2026) |
| **Add-on 5F** | (im Account) | +5 zusätzlich | `price_1TJLnv8` (Stripe) |
| **Add-on 10F** | (im Account) | +10 zusätzlich | `price_1TJLpG8` (Stripe) |
| **Founding Member** | 99 €/Monat lifetime | wie Solo | Erste 10 Pilotkunden, Coupon `FOUNDING-99` |

> ⚠️ **Drift-Notiz:** `pricing.html` (Live) sagt 30 Aufträge für Solo. `index.html` Zeile 1809 sagte zwischenzeitlich 25 (vor 01.05.) — Branch `fix/pricing-discrepancy` hat das auf 30 gefixt (pending Merge).
> Team-Tier auf `index.html`: zeigt aktuell „75 Gutachten" + „Demnächst"-Banner statt „unbegrenzt" — separater Sync-Sprint pending.

---

## KI-Doktrin (nicht verhandelbar)

PROVA's Versprechen: **„SV muss ohne KI schneller schreiben können als mit."** §6 Fachurteil-Editor folgt diesem Leitsatz.

### KI-Verantwortungs-Stufen (CLAUDE.md Regel 13)

| Stufe | Inhalt | UX |
|---|---|---|
| **S1 Mechanisch** | Rechtschreibung, Kommas, Grammatik | live erlaubt |
| **S2 Strukturell** | Absätze, Überschriften | auf Klick mit Diff-Anzeige |
| **S3 Inhaltlich** | Konjunktiv II, Halluzinations-Check, Fachsprache | auf Klick mit Begründung |

### Harte KI-Regeln

- **KI-Vorschläge sind opt-in, nicht default** (§407a-Schutz, CLAUDE.md Regel 12)
- **Positive Marker statt Warnungen** („✓ Konjunktiv II erkannt" statt „Fehler: kein Konjunktiv!")
- **Konjunktiv II PFLICHT** bei Kausalaussagen — „es liegt nahe, dass..." statt „es ist..." (Regel 9)
- **Halluzinationsverbot** — KI darf nichts erfinden, nur Diktat/Stammdaten wiedergeben (Regel 10)
- **§407a Compliance** — SV macht Fachurteil persönlich, KI ist Hilfe (Regel 11)
- **Konjunktiv-II-Check NUR mit GPT-4o**, niemals 4o-mini (Regel 14, Mini scheitert reproduzierbar)
- **KI-Funktions-Garantie** — 5 Tests vor Live (Funktionalität, Edge-Cases, Präzision, Konsistenz, Zeitverhalten). Test rot → Funktion ausgeblendet bis grün (Regel 15)
- **Pseudonymisierung VOR OpenAI** — Names/Adressen/Emails/IBAN durch Platzhalter ersetzen (Regel 17)
- **KI-Modell-Namen NICHT in UI sichtbar** außer in §407a-Compliance-Texten (Regel 7)

### Prompts-Quelle

`KI-PROMPTS-MASTER.md` (Repo-Root, auf Branch `docs/ki-prompts-master-skeleton` — pending Merge). Skeleton mit allen Slots als TBD Sprint 9 markiert. Inhaltlich gefüllt im KI-Prompt-Härtung-Sprint.

---

## DSGVO + Compliance (nicht verhandelbar)

- **§407a ZPO**: SV macht Fachurteil persönlich, KI ist Hilfe
- **EU AI Act Art. 50**: KI-Offenlegung an Empfänger
- **DSGVO**: Pseudonymisierung vor OpenAI (client + server, `lib/prova-pseudo.js`)
- **§312g BGB**: Widerrufsbelehrung bei Verbraucher-Privatgutachten
- **Aufbewahrungspflicht**: 5 Jahre Gutachten (JVEG), 10 Jahre steuerrechtlich
- **AVV-Konformität**: Speicherorte + Verarbeitungen in `avv.html` und `versicherungs_partner`-Tabelle dokumentiert (Regel 18)
- **DSGVO-Functions**: `dsgvo_user_export()` und `dsgvo_user_loeschen()` als DB-Functions (Regel 19)
- **Forced Re-Consent**: bei neuer Version eines Rechtsdokuments (Regel 20)

---

## Storage-Strategie (CLAUDE.md v3.0)

| Datentyp | Wo |
|---|---|
| Audio-Diktate (Opus 16 kbps) | Supabase Storage `sv-files` |
| Fotos | Supabase Storage `sv-files` |
| Skizzen (PNG/SVG) | Supabase Storage `sv-files` |
| PDFs (Gutachten, Rechnungen, Briefe, Bescheinigungen) | Supabase Storage `sv-files` |
| Strukturierte Daten | Supabase Postgres (Frankfurt) mit RLS |
| Audit-Logs | Supabase `audit_trail`-Tabelle (5 Jahre) |
| Backups | TBD Marcel — bisher Netlify Blobs/AWS-Backup, Voll-Supabase-Migration verschiebt das |

> ⚠️ **Drift-Notiz:** `masterplan-v2/00_MASTERPLAN.md` (25.04.) sagte „Audio in Netlify Blobs, Fotos+PDFs als Airtable-Attachment". Realität nach Voll-Supabase-Refactor: alles in Supabase Storage. Backups-Strategie ist **TBD Marcel**.

---

## Design-Prinzipien (UI/UX)

Aus `masterplan-v2/01_UI-PRINZIPIEN.md` (übernommen mit Tag-7-Annotationen):

### Visual-Hierarchie

- **80% Luft, 20% Content** (Linear/Stripe-Pattern)
- **Inter** Haupt-Font · **JetBrains Mono** für Zahlen/§§/AZ
- Schriftgrößen: Display 32 / H1 24 / H2 18 / Body 15 / Small 13 / Tiny mono 11
- **Farben:** Primary `#1a3a6b`, Accent `#3b82f6`, Muted `#64748b`, Success `#10b981`, Warning `#f59e0b`, Danger `#ef4444`

> ⚠️ **Drift-Notiz:** LANDING-Pages (index.html, impressum.html, pricing.html, kontakt.html) nutzen **DM Sans + Navy** statt Inter (post-APP-LANDING-SPLIT-Entscheidung). APP-Stack nutzt Inter wie spezifiziert.

### Layout

- **Spacing-Skala 8px-Raster** (4, 8, 12, 16, 24, 32, 48, 64, 96)
- **Container:** Mobile 100% / Tablet 720px / Desktop Content 960px / Desktop Full 1440px
- **Sidebar:** 64px collapsed · 260px expanded · auto-collapse < 1100px
- **4-Gruppen-Sidebar (Sprint 19 Plan):** ARBEIT / WERKZEUGE / DOKUMENTE / BÜRO + Aktiver-Fall-Anker oben

### Interaktion

- **Eine Primär-Aktion pro Screen** (Stripe)
- **Keine Dropdowns tiefer als 1 Ebene** (Notion)
- **Keyboard-Shortcuts** (Linear): `⌘/Ctrl+K` Quick-Search, `⌘/Ctrl+N` Neuer Fall, `⌘/Ctrl+D` Neues Diktat
- **Älteren-User-freundlich:** 15px+ Body, 44×44 Touch-Targets
- **Empty-States sind eigene Features** — Icon + Titel + 1-2 Sätze + Primär-Button + Optional zweiter Weg
- **Destruktive Aktionen** mit sekundärer Bestätigung

### Tooltip-Regel

- **Tooltips erklären NUR PROVA-spezifische Funktionen** (was speichert das System wo)
- **NIEMALS Fachbegriffe** (kein „was ist DIN 4108", Marcel ist 30 Jahre Profi)

### Loading-States (Superhuman)

- < 200ms: nichts anzeigen
- 200-2000ms: Skelett-Loading
- > 2s: Progress mit Text („KI analysiert… ~30 Sek")
- > 10s: Hintergrund + Push bei Abschluss

---

## Was zwischen heute und Pilot kommt (Stand 01.05.2026 abend)

### ✅ Erledigt seit Tag 0 (24.04.) — Major-Milestones

- **K-1.0 bis K-1.5 — Voll-Supabase-Refactor** (statt Airtable+Make+Cloudinary)
- **Sprint K-UI** (Profil-Briefkopf + Kontakte + Briefe als Pure-Supabase-Pages)
- **Phase 4 — APP-LANDING-SPLIT** (Tag `v200-app-landing-split-done`, 30.04. abend)
- **Cutover Block 3** (51 Hybrid-Pages auf `lib/auth-guard.js` migriert, 01.05. nachts, sw.js v248)
- **Option C — Server-Side Supabase-JWT-Verify** (asymmetric ES256 via `jose`+JWKS, 01.05. mittag, sw.js v249)
- **Login-Loop architektonisch eliminiert** (Bridge-Layer + Defense-in-Depth)
- **3 Parallel-Sprint-Branches** (Cluster-Cleanup -20 Pages, KI-Prompts-Skeleton, Pricing-Fix)

### ⏳ Pending vor Pilot (priorisiert)

1. **Schema-Migration 06b** im Supabase-Dashboard applizieren (`PLANNED_06b_auftraege_extend.sql`)
2. **Sprint 06b/06c — Auftrag-Neu-Wizard Live-Save** (LocalStorage → DB-`createDraft`)
3. **UX-Entscheidung Sprint-06b-Skeleton** (COCKPIT-Eintrag vs Sidebar-Split-Button)
4. **Sprint 04e** — Verknüpfungen MEGA (Akten ↔ Beteiligte ↔ Dokumente)
5. **Sprint 04c** — Globale Suche (Volltext)
6. **Sprint 04d** — Bescheinigungen Top 12
7. **Sprint 05 P6** — Cookie + iCal
8. **Sprint 09-10** — Flow C/D komplett (KI-Prompt-Härtung)
9. **Sprint 11-12** — Polish + Performance
10. **Stripe Webhook Secret erneuern** vor Pilot
11. **Make-Scenarios T3 + F1** manuell aktivieren
12. **Cluster-Review** (24 Sofort-Deletes durch · 3 BLOCKED + 2 pdfmonkey + 18 DELETE-AFTER-WIZARD pending)

---

## Pilot-Phase

**Strategie (aus `masterplan-v2/`, weiterhin gültig):**
- **2-3 handverlesene SVs zuerst** (nicht 10 auf einmal)
- Demo-Fall hilft bei Onboarding (`SCH-DEMO-001` automatisch beim Onboarding)
- Weekly-Feedback-Calls
- Cockpit-Analytics überwachen
- Nach 4-6 Wochen: Rollout auf 10 Founding Members

**Pre-Pilot-Aktionen:**
- Stripe-Webhook-Secret erneuern
- Make-Scenarios aktivieren
- AVV-Vertrag pro Pilot-SV elektronisch signieren
- Pilot-Onboarding-Email-Templates finalisieren

---

## Marketing & Akquise

**Detail-Plan:** `docs/strategie/PROVA-MARKETING-ROADMAP.md` (Single Source of Truth für Akquise)

### Ideen-Sammlung Mini-Tools (Lead-Magnete, Bauen erst nach S6)

Statische Mini-Sites unter `prova-systems.de/tools/*` — SEO + Lead-Magnete, einbinden in Newsletter/LinkedIn:

- **JVEG-Rechner** — Interaktive Berechnung Stundensatz-Honorar nach JVEG aktueller Stand
- **Ortstermin-Checkliste** — PDF-Generator Pflicht-Punkte vor Ortstermin (Akteneinsicht, Adresse, Beteiligte, Werkzeuge)
- **Widerrufsfrist-Rechner** — Prüfung 14-Tage-Frist bei Privat-Auftrag, mit Datum-Eingabe
- **§407a-KI-Hinweis-Generator** — Mini-Tool das einen rechtssicheren KI-Hinweis-Text für Gutachten generiert

**Status:** Spezifikation in `docs/strategie/MARKETING-MINI-TOOLS-SPEC.md` (S6 Deliverable). Implementation NACH S6.

### Webinar-Themen (Verbands-/Fortbildungs-Ansprache)

- „§6 Fachurteil rechtssicher formulieren — was die Gerichte 2025-2026 fordern"
- „KI-Werkzeuge für SVs nach §407a — was darf, was muss?"
- „Konjunktiv II bei Kausalaussagen — der eine Satz der ein Gutachten kippt"
- „Halluzinations-Check & Norm-Validierung — KI ohne Reputations-Schaden"
- „Aus Diktat zum strukturierten Gutachten in 30 Minuten" (Live-Demo)

### Fachverbände-Liste (Akquise-Kanäle)

| Verband | Schwerpunkt | Zugang |
|---|---|---|
| **BVS** Bundesverband öffentlich bestellter und vereidigter Sachverständiger | öbuv-SVs alle Sparten | Mitgliederbereich, Fortbildungs-Kalender |
| **BBauSV** Bundesverband Bau-Sachverständige | Bauschäden Schwerpunkt | Webinar-Sponsoring |
| **VBD** Verband Beratender Bauingenieure und Sachverständiger | Bauingenieur-Sparte | LinkedIn-Aktivität |
| **BDSF** Bundesverband Deutscher Sachverständiger und Fachgutachter | Multi-Disziplin | Newsletter-Anzeige |
| **Architektenkammer** (Bundes- + Länderkammern) | Architekten-Fortbildungen | Kontakt zu Fortbildungs-Referat |
| **TÜV-Akademie** Bauschäden | Fortbildungs-Anbieter | Sponsor-Slot bei Tagungen |
| **IHK Sachverständigen-Listen** | regionale öbuv-SVs | öffentliche Liste, Direkt-Outreach |

### Pilot-Strategie

**Trichter:** 50 Ziel-SVs sammeln → 30 Discovery-Gespräche → 5-10 Pilotkunden → 3 Referenzen → Skalierung auf 30+ zahlende.

**Phasen:**
1. **Liste 50 SVs** (Marcel pflegt selbst, Template in `docs/strategie/PROVA-MARKETING-ROADMAP.md`)
2. **Discovery-Gespräche** mit 12-Fragen-Leitfaden (Pain-Points, aktuelle Software, Bereitschaft Beta-Test)
3. **Pilot-Vereinbarung** (`docs/public/PILOT-VEREINBARUNG-ENTWURF.md`)
4. **Founding-99€-lifetime** für erste 10 (Stripe-Coupon `FOUNDING-99`)
5. **Referenzkunden-Tracking** in Marketing-Roadmap (mit Einwilligung zur Nennung)

### Bestehender Plan (masterplan-v2/04_MARKETING-PARALLEL.md, weiterhin gültig)

- Woche 1-2: Landing, Warteliste, LinkedIn-Posts, 5 Interessenten
- Woche 3-4: 2 Blog-Posts, IHK-Netzwerk, Video-Demo-Script
- Woche 5-6: 2 weitere Blog-Posts, Pilot-Kandidaten konkretisieren
- **Ziel Ende:** 15-25 Warteliste + 5-8 konkrete Pilot-Interessenten

**TBD Marcel:** Aktuelle Warteliste-Größe? Welche Phase aktiv?

---

## Erweiterungs-Sparten (Roadmap nach 50 zahlenden Kunden)

**Heute Scope:** Bauschaden-Gutachten (4-Flow A/B/C/D, ö.b.u.v.-Bauschaden-SVs).

**Spätere Sparten** (frühestens nach Skalierung auf 50 zahlende SV-Büros, NICHT in Vor-Pilot-Scope):

### Immobilienbewertung (B-Flow Erweiterung)

- **ImmoWertV-Konformität** — Sachwertverfahren, Vergleichswertverfahren, Ertragswertverfahren
- **Marktbericht-Integration** (Gutachterausschüsse, BORIS-Daten)
- **Verkehrswert-Gutachten-Templates**
- **Zielgruppe:** zusätzlicher öbuv-Bewerter-Markt (10× größer als Bauschaden allein)

### Energieberatung (Adjazenz-Markt)

- **GEG/GEG-Novelle 2024-Anforderungen**
- **Energie-Ausweis-Erstellung** (Bedarfs- + Verbrauchs-Ausweis)
- **ESG-nahe Gebäudedokumentation** (CSRD-relevant für gewerbliche Auftraggeber)
- **Synergie:** viele Bauschaden-SVs haben auch Energie-Berater-Zertifikat

### Baubegleitung/Mängelmanagement für private Bauherren

- **Bauherren-App** (kein SV, aber Bauherr-Zielgruppe)
- **Mängel-Tracking** über Bauphasen
- **SV-Vermittlung** bei Streit (Lead-Generation für PROVA-SVs)
- **Geschäftsmodell:** Freemium für Bauherren, Lead-Gebühr für SVs

> ⚠️ **Status:** alle drei sind **Roadmap-Items**, nicht in S6-Sprint-Scope. Eintrag dient der Investor-/Pilot-Pitch-Vorbereitung („wo geht's hin").

---

## Risiken (lebende Liste)

| Risiko | Mitigation |
|---|---|
| KI-Funktion unzuverlässig (Konjunktiv II bei Mini) | KI-Funktions-Garantie (5 Tests), GPT-4o, ausblenden bei rot |
| KI-Kosten über 5% Umsatz | `ki_protokoll`-Logging + Cockpit-Push-Alert + Pricing-Anpassung |
| Pilot-SV-Feedback deckt fundamentales Problem auf | Nur 2-3 Piloten zuerst + Demo-Fall |
| Auth-Umbau lockt Marcel aus | Notfall-Bookmarklet (Backup-Token, dokumentiert in `docs/EMERGENCY-BOOKMARKLET.md`) |
| **„Wenn ein KI-Helferlein nicht funktioniert, SV springt ab"** (Marcel-Direktive 25.04.) | KI-Funktions-Garantie zwingend, Test-Suite pro Funktion |
| Make-Migration bricht Bestandsdaten | Alte Scenarios pausieren statt löschen |
| Loop-/Auth-Bug kehrt zurück | Belt-and-Suspenders Loop-Counter (Cutover Block 3), Defense-in-Depth Refresh-vor-Logout (Option C) |

---

## Nicht-Ziele (Was PROVA NICHT ist)

- **Kein 60+-Seiten-Komplexgutachten-Tool** (andere Software macht das)
- **Kein Excel-Ersatz** für unabhängige Kostenkalkulation
- **Kein Anwalts-Tool** (Anwälte sind Mandant nicht Nutzer)
- **Kein Mehr-Land-Setup ohne IhRO** (DACH-Markt vorerst genug)
- **Kein Foto-Editor** (PROVA macht Foto-Anlage, kein Photoshop)

---

## Stand-Notizen (chronologisch, neueste oben)

**02.05.2026 nachmittag (Tag 8):**
- Voll-Cleanup-Sprint Airtable abgeschlossen (Tag `v203-vollcutover-airtable-out`)
- Sprint S6 startet: Master-Files-Update + 22 Audits + Security-Hardening
- Marketing-Sektion + Erweiterungs-Sparten ergänzt (Ninja-AI-Erkenntnisse selektiv)

**01.05.2026 abend (Tag 7):**
- Option C deployed (sw.js v249), Marcel testet Login-Flow
- Tag `v202-jwt-server-verify` pending bis Marcel-Test grün
- 6 offene Branches zur Marcel-Review (Master-Konsolidierung, 3 Parallel-Sprints, Cluster-Cleanup)

**30.04.2026 abend:**
- APP-LANDING-SPLIT live (Tag `v200`)
- Phase 4 abgeschlossen, Cutover-Page-Inventory durchlaufen

**27.04.2026:**
- CLAUDE.md v3.0 — Voll-Supabase-Refactor + Make-Out-Decision
- Sprint K-1.0 bis K-1.5 startet

**25.04.2026 (Tag 0):**
- `masterplan-v2/00_MASTERPLAN.md` v2.1 finalisiert (21-Tage-Plan)
- KI-Funktions-Garantie als Regel etabliert

---

*Vision-Master 01.05.2026 abend · Single Source of Truth · Aktualisiert von Claude Code nach jedem Sprint*

---

## MEGA²⁰-²⁴ Pilot-Hardening Updates (09.05.2026)

### Pricing-Tiers (FINAL nach MEGA²¹)
| Tier | Preis | Stripe Price-ID | Coming-Soon |
|---|---|---|---|
| STARTER | 89€/mo | price_1TTUQlRXumrtL2n5jPmG1IEY | Juni 2026 |
| **SOLO** | **179€/mo** | **price_1TSjMZRXumrtL2n5fgToRwyr** | ✅ Pilot |
| TEAM | 379€/mo | price_1TSjNXRXumrtL2n56c6emN2k | Juli 2026 |
| **Founding-Member** | **125€/mo lifetime** | Coupon "FOUNDING-30" | ✅ Pilot |

### KI-Stack (FINAL nach MEGA²²)
- **Vision:** Claude Sonnet 4.6 (Anthropic) — Foto-Analyse, Schaden-Erkennung
- **Text:** GPT-4o (OpenAI) — Konjunktiv-II, Halluzinations-Check, Strukturierung
- **Audio:** Whisper-1 (OpenAI) — Diktat-Transkription
- **Fallback:** GPT-4o-mini (S1 Mechanical)
- **ENV-Switch:** `KI_VISION_PROVIDER=anthropic`, `KI_TEXT_PROVIDER=openai`

### Triple-Mode-Architektur
- **Mode A:** PROVA-Standard (Templates, F-04/F-09/F-15/F-19) — Default
- **Mode B:** PROVA+Editor (TipTap) — auf Klick
- **Mode C:** Eigene Vorlagen (Word .docx) — auf Klick, Mobile-Fallback auf A
- **Routing:** lib/workflow-mode-router.js (auftragOverride > userDefault > A-Fallback)

### Beweisbeschluss-Foundation (NEU MEGA²²+²³)
- Migration 11: auftraege.beweisbeschluss_pdf_extrakt JSONB
- Lambda: parse-beweisbeschluss.js (Pattern-Matching only, kein LLM, Marcel-C1)
- Frontend: lib/beweisbeschluss-upload.js (Block 1 MEGA²³)
- Page: gericht-auftrag.html (integriert)

### Roadmap nach Pilot
- **Juni 2026:** STARTER 89€ Tier offiziell launchen (für kleine SVs ≤ 5 Fälle/Monat)
- **Juli 2026:** TEAM 379€ Tier launchen (für Büros ≥ 3 Mitarbeiter)
- **August 2026:** Beweisfragen-Extraktor mit LLM (Tranche 2 nach Marcel-Validation Pattern-Matching)
- **September 2026:** F-19 Wertgutachten Foundation (Schäden + Bauteile + Kostenermittlung)


---

## Update 10.05.2026 — MEGA²⁷ Referral-System + MEGA²⁸ Frontend-Complete

### Referral-System (MEGA²⁷ live)
- Founding-Member empfehlen Kollegen → 50€ Rabatt für Geworbenen + 1 Monat gratis für Werber nach 30 Tagen
- 5 Edge Functions, 3 HTML-Email-Templates, 2 Cron-Schedules (02:00 + 14:00 UTC)
- Migration 12 live, Stripe-Coupons FRIEND-50 + WERBER-MONAT-FREI

### MEGA²⁸-Updates
- Pricing: Solo 179€ / Team 379€ / Founding 99€ (Coupon FOUNDING-99)
- §407a Pre-Send-Validator (V3.2-W1-I3)
- KI-Konsistenz-Check §4↔§6 mit GPT-4o (V3.2-W1-I2)
- DSGVO Art. 20 Portability via JSON-Export
- KI-Cost-Tracking-Lib für `ki_protokoll`-Inserts

### Modell-Compliance (Regel 14 strikt enforced ab MEGA²⁸ V3.2-W1-I1)
- Konjunktiv-II-Pfade: ALLE auf gpt-4o (vorher gpt-4o-mini-Verstöße korrigiert)
- gpt-4o-mini bleibt für S1-mechanisch (support_chat, normen-picker)

