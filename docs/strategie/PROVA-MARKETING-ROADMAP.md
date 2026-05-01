# PROVA Marketing Roadmap

**Stand:** 02.05.2026 (Tag 8, Sprint S6 Phase 1)
**Eigentümer:** Marcel Schreiber (Akquise), Claude Code (Tools + Templates)

---

## Strategie-Trichter

```
50 Ziel-SVs                  ← Recherche (Marcel)
    ↓
30 Discovery-Gespräche       ← 12-Fragen-Leitfaden
    ↓
5-10 Pilotkunden             ← Founding-99€-lifetime, Pilot-Vereinbarung
    ↓
3 Referenzen                 ← Schriftliche Einwilligung
    ↓
30+ zahlende SV-Büros        ← Solo 149€ / Team 279€
```

---

## 1. Mini-Tools (Lead-Magnete)

**Status:** Spezifikation in `docs/strategie/MARKETING-MINI-TOOLS-SPEC.md` (S6 Deliverable). Implementation NACH S6.

| Tool | URL | SEO-Keywords | Lead-Magnet-Mechanik | Status |
|---|---|---|---|---|
| **JVEG-Rechner** | `prova-systems.de/tools/jveg-rechner` | „JVEG Stundensatz Sachverständiger", „Honorar Gerichtsgutachten" | Nach Berechnung: „Newsletter abonnieren für Gesetzes-Updates" | Spec pending |
| **Ortstermin-Checkliste** | `prova-systems.de/tools/ortstermin-checkliste` | „Checkliste Ortstermin Sachverständiger Bauschaden" | PDF-Download nach E-Mail | Spec pending |
| **Widerrufsfrist-Rechner** | `prova-systems.de/tools/widerrufsfrist` | „14-Tage-Frist Privatauftrag Sachverständiger" | „Mehr Tools für SVs" CTA | Spec pending |
| **§407a-KI-Hinweis-Generator** | `prova-systems.de/tools/ki-hinweis-407a` | „§407a ZPO KI-Hinweis Mustertext" | „PROVA macht das automatisch" CTA | Spec pending |

**Bauen erst NACH S6.** S6 produziert Spec, S6+1 baut.

---

## 2. Webinar-Themen

| Thema | Zielgruppe | Status | Plattform |
|---|---|---|---|
| „§6 Fachurteil rechtssicher formulieren — was die Gerichte 2025-2026 fordern" | öbuv-Bauschaden-SVs | Skript pending | Eigenes Zoom · BVS-Webinar-Sponsoring |
| „KI-Werkzeuge für SVs nach §407a — was darf, was muss?" | öbuv-SVs alle Sparten | Skript pending | LinkedIn-Live · Verbands-Webinar |
| „Konjunktiv II bei Kausalaussagen — der eine Satz der ein Gutachten kippt" | öbuv-Bauschaden + Immobilien | Skript pending | Eigenes Zoom |
| „Halluzinations-Check & Norm-Validierung — KI ohne Reputations-Schaden" | öbuv-SVs alle Sparten | Skript pending | LinkedIn-Live |
| „Aus Diktat zum strukturierten Gutachten in 30 Minuten" (Live-Demo) | öbuv-Bauschaden | Skript pending | Eigenes Zoom |

---

## 3. Fachverbände-Kanäle

| Verband | Schwerpunkt | Zugang-Strategie | Status |
|---|---|---|---|
| **BVS** Bundesverband öffentlich bestellter und vereidigter Sachverständiger | öbuv-SVs alle Sparten | Mitgliederbereich, Fortbildungs-Kalender, Webinar-Sponsoring | TBD Marcel |
| **BBauSV** Bundesverband Bau-Sachverständige | Bauschaden Schwerpunkt | Webinar-Sponsoring, Fachzeitschriften-Anzeige | TBD Marcel |
| **VBD** Verband Beratender Bauingenieure und Sachverständiger | Bauingenieur-Sparte | LinkedIn-Aktivität, Newsletter-Kooperation | TBD Marcel |
| **BDSF** Bundesverband Deutscher Sachverständiger und Fachgutachter | Multi-Disziplin | Newsletter-Anzeige | TBD Marcel |
| **Architektenkammer** (Bundes- + Länderkammern) | Architekten-Fortbildungen | Kontakt zu Fortbildungs-Referat, Webinar-Sponsoring | TBD Marcel |
| **TÜV-Akademie** Bauschäden | Fortbildungs-Anbieter | Sponsor-Slot bei Tagungen | TBD Marcel |
| **IHK Sachverständigen-Listen** | regionale öbuv-SVs | öffentliche Liste, Direkt-Outreach | TBD Marcel |

---

## 4. Discovery-Outreach-Material

**Wird in Sprint „Discovery-Outreach-Doku" (Phase B+) erstellt:**

### 4.1 Ziel-SV-Liste-Template (Marcel pflegt selbst)

**CSV-Format:**
```
Vorname, Nachname, Firma, IHK-Bezirk, Spezialisierung, Email, LinkedIn, Tel, Region, Status, Letzte-Action, Notizen
```

**Status-Werte:** `recherchiert` / `kontaktiert` / `gespräch` / `pilot-zugesagt` / `pilot-abgesagt` / `nicht-passend`

### 4.2 E-Mail-Vorlagen (4 Stück)

1. **Erstkontakt** — Vorstellung PROVA, Pilot-Programm, kurzes Gespräch-Angebot
2. **Follow-up** — Nach 5 Tagen ohne Antwort, Mehrwert-Hook
3. **Pilot-Einladung** — Nach Discovery-Gespräch, Pilot-Vereinbarung anhängen
4. **Referenz-Anfrage** — Nach 4 Wochen erfolgreichem Pilot-Use, Logo-Erlaubnis

### 4.3 12-Fragen-Discovery-Leitfaden

1. Wie viele Gutachten / Monat?
2. Welche Sparten (A/B/C/D)?
3. Aktuelle Software (Word/Excel/Spezial-SV-Software)?
4. Größtes Pain-Point bei Gutachten-Erstellung?
5. Wie wird heute strukturiert (Vorlagen, frei, KI)?
6. Erfahrung mit ChatGPT/KI-Tools im Berufskontext?
7. Was würde 2 Std/Gutachten sparen?
8. Bezahlbereitschaft monatlich?
9. Solo oder Team?
10. Pilot-Bereitschaft (4-6 Wochen Beta-Test)?
11. Empfehlbarkeit an Kollegen?
12. Ist DSGVO/Schweigepflicht-Thema bekannt?

---

## 5. Referenzkunden-Tracking

**Format-Vorschlag:**

```
Pilot-SV  | Onboarding | Erste-Akte | Wochen-Stand | Feedback-Score | Referenz-OK
SV-001    | 2026-05-15 | 2026-05-17 | 4 (zufrieden) | 8/10           | ja, mit Logo
SV-002    | ...        | ...        | ...           | ...            | nein, anonym
```

**Speicher:** Marcel pflegt selbst (Excel oder Notion). Template wird in Sprint „Discovery-Outreach-Doku" erstellt.

---

## 6. Marketing-Parallel-Plan (aus masterplan-v2/)

**Aus `masterplan-v2/04_MARKETING-PARALLEL.md` (25.04.2026, weiterhin gültig):**

| Phase | Wochen | Inhalt | Ziel |
|---|---|---|---|
| 1 | 1-2 | Landing live, Warteliste-Form, LinkedIn-Posts (3×/Woche) | 5 Interessenten |
| 2 | 3-4 | 2 Blog-Posts (SEO-relevant), IHK-Netzwerk, Video-Demo-Script | 10 Warteliste |
| 3 | 5-6 | 2 weitere Blog-Posts, Pilot-Kandidaten konkretisieren | 15-25 Warteliste + 5-8 Pilot-Interessenten |

**TBD Marcel:** Aktueller Stand? Wie viele Warteliste-Einträge? Welche Phase aktiv?

---

## 7. Pilot-Vereinbarung Eckpunkte (S6 Deliverable)

**Detail-Entwurf:** `docs/public/PILOT-VEREINBARUNG-ENTWURF.md` (S6 Phase 5, Anwalt-Review danach)

Eckpunkte:
- **Beta-Status:** Software in Entwicklung, Bugs erwartbar
- **Feedback-Pflicht:** Wöchentlicher 30-Min-Call für 6 Wochen
- **Datenverarbeitung:** AVV nach Art. 28 DSGVO unterzeichnet
- **Founding-99€-lifetime** für erste 10 SVs
- **Kündigung:** 14 Tage zum Monatsende
- **Haftung:** begrenzt auf 12 Monatsbeiträge (Beta-Status)
- **NDA:** keine Pflicht, aber „Diskretion erbeten" über Bugs während Pilot-Phase

---

## 8. Erweiterungs-Sparten (Roadmap nach 50 zahlenden Kunden)

**Aus PROVA-VISION-MASTER.md (Sektion „Erweiterungs-Sparten"):**

- Immobilienbewertung (ImmoWertV, Sachwert/Vergleichswert)
- Energieberater (GEG/ESG)
- Baubegleitung/Mängelmanagement für private Bauherren

**NICHT in Pre-Pilot-Scope.** Eintrag dient Investor-/Pilot-Pitch („wo geht's hin").

---

## Update-Trigger für diese Datei

- Jeder Pilot-SV-Status-Change
- Jeder neue Verbands-Kontakt
- Jedes geliefer­te Mini-Tool
- Jedes durchgeführte Webinar
- Quartalsweise Trichter-Review (Conversion-Rates)

---

*Marketing-Roadmap 02.05.2026 · Single Source of Truth für Akquise · Aktualisiert von Marcel + CC*
