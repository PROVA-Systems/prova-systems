# Template-Konsolidierung-Plan (MEGA²⁴ Block 10)

**Stand:** 2026-05-09
**Scope:** Identifikation von Doppelungen zwischen pdf-templates/ und docs/templates-goldstandard/

## Aktuelle Struktur

### pdf-templates/ (Production)
- Used by: `pdf-generate` Edge-Function + `rechnung-pdf` Lambda + `mahnung-pdf` Lambda
- Format: HTML mit Variable-Placeholders ({{}})
- Examples: F-01-JVEG-RECHNUNG.template.html

### docs/templates-goldstandard/ (Source-of-Truth)
- Used by: Marcel als Quell-Material für Anwalt-Reviews
- Format: HTML + payload.json + Liquid-Variants
- Examples: F-04-KURZSTELLUNGNAHME, F-09-KURZGUTACHTEN, F-15-GERICHTSGUTACHTEN, F-19-WERTGUTACHTEN

## Identifizierte Doppelungen

### F-01 JVEG-Rechnung
- ✅ `pdf-templates/F-01-JVEG-RECHNUNG.template.html` (Production)
- ✅ `docs/templates-goldstandard/01-rechnungen/F-01-JVEG-GERICHTSRECHNUNG.template.html` (Source)
- ✅ `docs/templates-goldstandard/01-rechnungen/F-01-JVEG-GERICHTSRECHNUNG.payload.json` (Schema)
- **Drift-Risiko:** Mittel — pflegen als 1:1-Sync via Build-Step?

### F-04 Kurzstellungnahme
- ⚠️ Nur in `docs/templates-goldstandard/` — KEIN production-template
- Wird via `pdf-generate` Edge-Function direkt aus goldstandard-Pfad gezogen?
- **Action:** Verifikation ob production tatsächlich via docs/-Pfad läuft

### F-09 Kurzgutachten
- Doppelung wie F-04
- Liquid-Variant (.liquid.template.html) zusätzlich vorhanden

### F-15 Gerichtsgutachten
- Doppelung wie F-04
- Liquid-Variant für Render-Engine

## Konsolidierungs-Strategie

### Option A: Goldstandard als Single-Source-of-Truth
- `pdf-templates/` löschen
- `pdf-generate` Edge-Function liest direkt aus `docs/templates-goldstandard/`
- Vorteil: 0 Duplikation, 0 Drift-Risiko
- Nachteil: Coupling Production → docs/

### Option B: Build-Step (Goldstandard → pdf-templates)
- Build-Skript `scripts/sync-templates.js` kopiert + transformiert
- pre-deploy Step in netlify.toml
- Vorteil: Production-Pfad bleibt clean
- Nachteil: 1 mehr Build-Step

### Option C: Status quo (manueller Sync)
- Aktuell — funktioniert, aber Drift-Risiko
- CHANGELOG-MASTER trackt Sprint-bezogene Änderungen

**Empfehlung:** **Option B** — Build-Step nach 1. Pilot-Iteration einführen. Bis dahin Status quo.

## Fragen für Marcel

1. Wo liegt aktuell der Production-Pfad für F-04/F-09/F-15-PDFs? `pdf-templates/` oder `docs/templates-goldstandard/`?
2. Liquid vs HTML — welches Format pflegt PDFMonkey aktuell?
3. Wie oft ändern sich Goldstandard-Templates? (Frequenz für Build-Step-Entscheidung)

## Action-Items (Post-Pilot)

| ID | Action | Aufwand |
|---|---|---|
| TPL-1 | Production-Pfad-Verifikation (Marcel-Frage 1) | 30 Min |
| TPL-2 | Build-Step-Skript Implementation | 2h |
| TPL-3 | netlify.toml pre-deploy-Step | 15 Min |
| TPL-4 | Drift-Check via Pre-Commit-Hook | 1h |

---

*Template-Konsolidierung-Plan, MEGA²⁴ Block 10*
