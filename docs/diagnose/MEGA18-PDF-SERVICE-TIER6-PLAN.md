# MEGA¹⁸ — PDF-Service + Mode-C-Generic + Tier-6 Plan

**Datum:** 2026-05-08
**Vorgaenger-Tag:** v225-mode-c-pilot-ready (MEGA¹⁷-PERFECTION)
**Modus:** Implementation

---

## 1. Brutal-Honesty: Was existiert vs was Marcel will

### Existing (gefunden):
- `netlify/functions/pdf-proxy.js` — sicherer Download-Proxy via PDFMonkey-API. Kein Document-Creation.
- `lib/prova-pdf-mode-c.js` (MEGA¹⁷ W59) — **Browser-jsPDF**, kein PDFMonkey
- `netlify/functions/generate-pdf-mode-c.js` — GET-only, returnt interpolated_html (Stub)
- `docs/templates-goldstandard/` — 27+ Templates (Rechnungen, Mahnungen, Gutachten)
- `PDFMONKEY_API_KEY` ENV bereits in pdf-proxy genutzt

### Marcel-Direktive vs Realitaet:
**Marcel will:** Mode C PDF-Service via PDFMonkey, NICHT Browser-jsPDF.
**Konsequenz:** Browser-jsPDF aus MEGA¹⁷ wird NICHT zerstoert — bleibt als Offline-Fallback. Service-Abstraction macht es trivial einen weiteren Service-Adapter (`pdf-service-browser-jspdf`) hinzuzufuegen.

---

## 2. Naming-Konflikt Tier-6 PDFs (KRITISCH)

Marcel-Direktive nennt:
- F-01 JVEG-Rechnung → **existiert** als `F-01-JVEG-GERICHTSRECHNUNG.template.html` ✅
- F-06 Mahnung Stufe 2 → existing F-06 ist Mahnung-1. **F-07-MAHNUNG-2** existiert ✅
- F-07 Mahnung Stufe 3 → existing F-07 ist Mahnung-2. **F-08-MAHNUNG-3-LETZTE** existiert ✅
- F-16 SV-Kostenrechnung → **existing F-16-ERGAENZUNG.template.html** (KOLLISION!) ❌
- F-17 Aktenauszug → **existing F-17-SCHIEDSGUTACHTEN.template.html** (KOLLISION!) ❌
- F-18 Honorartabelle → **existing F-18-BAUABNAHME.template.html** (KOLLISION!) ❌

### Decision (pragmatisch ohne Marcel-Block):
- F-01 ueberarbeiten (bereits JVEG-Rechnung)
- F-07 ueberarbeiten (bereits Mahnung-2)
- F-08 ueberarbeiten (bereits Mahnung-3)
- **NEU**: F-23-SACHVERSTAENDIGENKOSTEN (statt F-16 wegen Kollision)
- **NEU**: F-24-AKTENAUSZUG (statt F-17)
- **NEU**: F-25-HONORARTABELLE (statt F-18)

Marcel-Pflicht-Update vor Pilot: PDFMonkey-Template-IDs fuer F-23/F-24/F-25 anlegen.

---

## 3. Capacity-Estimate (ehrlich)

Token-Realistisch nach 17 MEGA-Sprints in einer Session.

| Tier | Tasks | Token-Estimate | Confidence |
|---|---|---:|---:|
| **PRIMARY** | W64-W70 + 3 PDFs (F-01 ueberarbeitung, F-23 NEU, F-25 NEU) + Tests + Final | ~85k | 80% |
| **STRETCH** | + 3 weitere PDFs (F-07 Mahnung-2, F-08 Mahnung-3, F-24 Aktenauszug) | +35k | 35% |
| **ULTIMATE** | + Mode B Polish in 1 Page | +15k | 10% |

**Decision:** PRIMARY confirmed. STRETCH nur falls nach W72 noch >40k Restbudget.

**Anti-Pattern dokumentiert:**
- ❌ KEIN cp+sed bei den 3 PDFs — jede pro Hand erarbeitet
- ❌ KEIN Browser-jsPDF zerstoeren (Defense-in-Depth-Fallback)
- ❌ KEIN Service-Lock-In zu PDFMonkey (Abstraction-Layer)

---

## 4. Architektur Service-Abstraction-Layer

```
              akte.html (Frontend)
                      │
                      │ POST /netlify/functions/generate-pdf-mode-c
                      ▼
        ┌──── generate-pdf-mode-c.js ──────┐
        │  1. Auth + Auftrag-Load          │
        │  2. Vorlage-Load + RLS           │
        │  3. interpolateHtml (lib/mode-c) │
        │  4. PDFService.generatePdf(html) │
        └──────────────┬───────────────────┘
                       │ Interface-Call
                       ▼
        ┌─── lib/pdf-service-interface.js ──┐
        │  generatePdf(html, options)        │
        │    → returnt {download_url}        │
        │  isAvailable()                     │
        │  serviceName                       │
        └───────────────┬────────────────────┘
                        │
       ┌────────────────┼─────────────────────────┐
       ▼                ▼                         ▼
 pdfmonkey.js     docraptor.js (Stub)    browser-jspdf.js (existing)
   (default)      (MEGA²⁰ Migration)     (offline-Fallback)
       │
       ▼
   PDFMonkey API
   (Liquid-Template
    MODE_C_GENERIC)
```

**ENV-Konfiguration:**
- `PDF_SERVICE` = "pdfmonkey" (default)
- `PDFMONKEY_API_KEY` = (existing)
- `PDFMONKEY_MODE_C_TEMPLATE_ID` = (Marcel-Pflicht zu setzen)

---

## 5. Mode-C-Generic-Template (Liquid)

### Liquid-Variablen:
- `{{title}}` — default "Mode C Dokument" (faellt auf Akten-Titel zurueck)
- `{{html_content}}` — User-HTML (interpoliert)
- `{{footer_text}}` — "Aktenzeichen XYZ · Seite X von Y"
- `{{custom_css}}` — optional User-CSS
- `{{header_logo}}` — optional, PROVA-Logo Default

### Design System v1.0:
- Inter (UI) + JetBrains Mono (Code)
- #1a3a6b primary, #3b82f6 accent
- A4, 2cm Margins
- Header ab Seite 2
- Footer ab Seite 1: "Aktenzeichen · Seite N / M"
- DSGVO-Hinweis im Footer
- EU AI Act Box: nur bei Gutachten-Outputs (Mode C ist generic, daher OPTIONAL via Variable)

---

## 6. Implementation-Plan PRIMARY (W64-W73)

### W64: Plan-File (this) — DONE
### W65: lib/pdf-service-interface.js
### W66: lib/pdf-service-pdfmonkey.js
### W67: lib/pdf-service-docraptor.js (Stub)
### W68: generate-pdf-mode-c.js POST-Endpoint
### W69: pdf-templates/MODE_C_GENERIC.html (Goldstandard-Backup)
### W70: akte.html PDF-Button → POST + Polling
### W71: Tier-6 PDFs (3 PRIMARY: F-01 ueberarbeiten, F-23 NEU, F-25 NEU)
### W72: Tests
### W73: Final-Report + sw.js v278

---

## 7. Was NICHT in MEGA¹⁸ (ehrlich → MEGA¹⁹+)

- **F-07 Mahnung-2 + F-08 Mahnung-3 + F-24 Aktenauszug** — STRETCH, nur falls Token reicht
- **DocRaptor-Implementation** — Stub mit Migration-TODO ist genug, echter Code in MEGA²⁰ falls noetig
- **Mode B Polish** — bewusst NICHT versprochen
- **PDFMonkey-Template-Anlage** — Marcel-Pflicht (UI-Klick)

---

## 8. Anti-Patterns vermeiden

❌ Browser-jsPDF aus MEGA¹⁷ zerstoeren — bleibt als Fallback
❌ Tier-6 PDFs cp+sed — jede DEEP-Work
❌ Service-Lock-In — Abstraction-Layer Pflicht
❌ Polling ohne Timeout (PDFMonkey kann haengen) — max 60s + Abort
❌ download_url direkt an Frontend — pdf-proxy.js Pattern fuer Security beibehalten

---

## 9. Erwartete Quality-Metrics

- **Tests:** 266 → 320+ (~50 neue)
- **PDF-Service-Adapter:** 0 → 3 (interface + pdfmonkey + docraptor-stub)
- **PDF-Templates** (Goldstandard): 27 → 30 (3 NEU + 1 ueberarbeitet)
- **Pattern-Copy:** 0
- **Mode C: 95% → 98%+** (PDF-Service live)

---

*Plan-Stand 2026-05-08. Start W65: lib/pdf-service-interface.js.*
