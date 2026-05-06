# MEGA²⁸ W7-I5 — Templates-Klärung F-18/F-22 + PROVA-GUTACHTEN-SOLO/TEAM

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7
**Trigger:** W6-I5 Sprint K Inventory Marcel-Klärungs-Liste

---

## TL;DR

Beide angefragten "Doppelungen" sind in Wirklichkeit **komplementäre Komponenten**, KEINE Konflikte.

| Frage | Antwort |
|---|---|
| F-18 vs F-22 BAUABNAHME | F-18 = Haupt-Gutachten (1017 Zeilen, Sample-Daten), F-22 = Liquid-Protokoll-Variante (184 Zeilen, Variablen). NICHT Doppelung — komplementär. |
| PROVA-GUTACHTEN-SOLO/TEAM | Sind Welcome-EMAIL-Templates für Tier-Onboarding, KEINE Gutachten-Templates. Falsch benannt + falsch eingeordnet im 05-sonstige-Ordner. |

---

## F-18 vs F-22 BAUABNAHME

### F-18-BAUABNAHME.template.html
- **Standort:** `docs/templates-goldstandard/04-gutachten/F-18-BAUABNAHME.template.html`
- **Größe:** 1017 Zeilen, 56KB
- **Inhalt:** Voll-Gutachten-Template mit Sample-Daten ("BA-2026-014, Gervinusstraße 23, Köln-Neustadt-Nord")
- **Struktur:** IHK-SVO 4-Teil (W6-I5 Audit bestätigt) — Teil 1-4 mit ausführlichen Sektionen
- **Stand:** 29.04.2026 (last modified)
- **Verwendung:** Standalone-Bauabnahme-Gutachten als PDF (PDFMonkey-Source)

### F-22-BAUABNAHME.liquid.template.html
- **Standort:** `docs/templates-goldstandard/05-sonstige/F-22-BAUABNAHME.liquid.template.html`
- **Größe:** 184 Zeilen, 11KB
- **Inhalt:** Liquid-Protokoll mit Variable-Substitution (`{{ abnahme_nummer }}`, `{{ projekt_name }}`)
- **Stand:** 03.05.2026 (neuer)
- **Verwendung:** Bauabnahme-Protokoll-Snippet (kompakter, Liquid-rendered)

### Bewertung
- **NICHT Doppelung.** F-18 = Standalone-Vollgutachten (lokaler HTML-Master für PDFMonkey-Sync). F-22 = compact Liquid-Protokoll für inline-Embedding.
- F-22 ist wahrscheinlich Teil eines anderen Workflows (z.B. Baubegleitung F-21-Protokoll), kein "Gutachten" im engeren SV-Sinn.

### Sprint-K-Welle-7-Plan
- **F-18:** Liquid-Variante bauen (1.5h) — gehört zu Tranche-1.
- **F-22:** **bleibt wie ist** — bereits Liquid, ist Protokoll-Snippet kein Vollgutachten.

---

## PROVA-GUTACHTEN-SOLO/TEAM

### Beide Files
- **Standort:** `docs/templates-goldstandard/05-sonstige/PROVA-GUTACHTEN-{SOLO|TEAM}.template.html`
- **Größe:** 197/209 Zeilen
- **Title:** "Willkommen bei PROVA Systems – Solo/Team"
- **Inhalt:** Welcome-EMAIL-Templates mit Tier-spezifischen Texten

### Befund
**FEHL-EINORDNUNG.** Files heißen `PROVA-GUTACHTEN-*` aber sind tatsächlich **EMAIL-Templates** (HTML-Email mit Hidden-Preheader, keine SV-Gutachten-Struktur).

### Empfehlung
1. **Rename:** `PROVA-WELCOME-EMAIL-{SOLO|TEAM}.template.html`
2. **Move:** in `docs/email-templates/` (separater Ordner für Email-Templates)
3. **Aus Sprint-K-Tranche-1 entfernen** — keine Gutachten-Liquid-Conversion nötig.

### Sprint-K-Welle-7-Plan
- **NICHT in Tranche-1.** Stattdessen:
- **Welle 8 (separater Sprint):** Email-Template-Cleanup mit Rename + Move + ggf. Variable-Migration.

---

## Aktualisierte Sprint K Tranche-1 Liste

Nach W7-I5 Klärung verbleiben in Tranche-1 für Welle 7-Build:

| # | Template | Aufwand |
|---|---|---|
| 1 | F-04-KURZSTELLUNGNAHME | 1.5h |
| 2 | F-16-ERGAENZUNG | 1.5h |
| 3 | F-17-SCHIEDSGUTACHTEN | 2h (recherche-intensiv §1029 ZPO) |
| 4 | F-18-BAUABNAHME | 2h (Liquid-Variante neu, F-22 bleibt) |
| 5 | F-19-WERTGUTACHTEN | 2h (ImmoWertV-Spezifika) |

**Total:** 5 Templates (vorher 7), ~9h. PROVA-GUTACHTEN-SOLO/TEAM ausgeklammert (Email-Cleanup-Sprint), F-22 bereits OK.

---

## Marcel — Empfehlungen

### 🟢 W7-I5 (sofort, kein Code-Change nötig)
1. **F-22 BLEIBT** — kein Cleanup nötig, ist absichtlich.
2. **PROVA-GUTACHTEN-SOLO/TEAM rename** + **move** in Welle 8.
3. **Sprint K Tranche-1 reduziert** auf 5 Templates (W6-I5 Inventory updated).

### 🟡 Welle 8 (Email-Template-Cleanup)
- Rename PROVA-GUTACHTEN-SOLO → PROVA-WELCOME-EMAIL-SOLO
- Rename PROVA-GUTACHTEN-TEAM → PROVA-WELCOME-EMAIL-TEAM
- Move beide in `docs/email-templates/`
- Update PDFMonkey-Sync-Skript (falls die als Email-Templates dort sind, bleiben sie unverändert)
- Marcel-Manual-Step in PDFMonkey für Tier-Welcome-Emails

---

*MEGA²⁸ W7-I5 Klärung: F-18/F-22 als komplementär bestätigt, PROVA-GUTACHTEN als Email-Templates klassifiziert. Sprint K Tranche-1 auf 5 Templates reduziert.*
