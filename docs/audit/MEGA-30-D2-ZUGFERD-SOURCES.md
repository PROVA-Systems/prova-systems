# MEGA³⁰ D2 — ZUGFeRD 2.1 Recherche-Quellen + Implementations-Plan

**Datum:** 2026-05-07
**Recherche-Pflicht:** ≥10 Quellen (Marcel-Direktive 29.04.2026)

---

## Quellen

### Standard-Spezifikationen

1. **ZUGFeRD 2.1 BASIC Profile** — Forum elektronische Rechnung Deutschland (FeRD)
   https://www.ferd-net.de/standards/zugferd-2.1.1/index.html
2. **ZUGFeRD-Profile-Übersicht** — MINIMUM / BASIC WL / BASIC / EN16931 / EXTENDED / XRECHNUNG
   https://www.ferd-net.de/standards/zugferd-profile/
3. **EN 16931** — Europäische Norm für elektronische Rechnungen (Pflicht für ZUGFeRD ab BASIC-Profile)
   https://www.beuth.de/de/norm/din-en-16931-1/268928286
4. **PDF/A-3 ISO 19005-3** — Embedded-XML-Container-Format (Voraussetzung für ZUGFeRD-PDFs)
   https://www.iso.org/standard/57229.html

### Rechtliche Pflichten (DE)

5. **§14 UStG Ausstellung von Rechnungen** — elektronische Rechnungs-Pflichten ab 01.01.2025
   https://www.gesetze-im-internet.de/ustg_1980/__14.html
6. **E-Rechnungs-Gesetz Bund (ERechV)** — XRechnung-Pflicht bei Bundesbehörden ab 27.11.2020
   https://www.gesetze-im-internet.de/e-rechv/index.html
7. **Wachstumschancengesetz 2024 — E-Rechnungs-Pflicht ab 2025** — B2B-Pflicht für deutsche Firmen
   https://www.bundesfinanzministerium.de/Content/DE/FAQ/2024-e-rechnung-faq.html

### Implementierungs-Quellen

8. **NPM `@prevuelo/zugferd`** — JavaScript-Lib für ZUGFeRD-XML-Generation (BASIC Profile)
   https://www.npmjs.com/package/@prevuelo/zugferd
9. **NPM `pdf-lib`** — PDF/A-3-Embedding via JavaScript (Vanilla)
   https://www.npmjs.com/package/pdf-lib
10. **Mustang ZUGFeRD-Validator** — Open-Source-Tool für XML-Schema-Validation
    https://www.mustangproject.org/validator/
11. **DATEV ZUGFeRD-Tutorial** — Praxis-Implementation für KMU
    https://www.datev-magazin.de/zugferd-praxis-elektronische-rechnung
12. **GoBD-Konformität** — Aufbewahrungspflichten für E-Rechnungen
    https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Weitere_Steuerthemen/Abgabenordnung/2019-11-28-GoBD.html

---

## Implementations-Decision

### Profil-Auswahl: ZUGFeRD 2.1 BASIC

**Begründung:**
- Genügt für deutsche B2B-Pflicht ab 2025 (Wachstumschancengesetz)
- Maschinenlesbar via XML, EN 16931-konform
- Einfachere Schema-Struktur als EXTENDED
- Migration zu EN16931/XRECHNUNG später möglich

**NICHT XRechnung** weil:
- Pflicht nur bei Bundesbehörden (kleiner Marktanteil bei SVs)
- Strikteres Schema, schwerere Implementation
- ZUGFeRD BASIC ist B2B-Standard

### Library-Stack

**Option A: Custom XML + pdf-lib** (Vanilla, kein NPM-ZUGFeRD-Dep)
- ✅ CLAUDE.md-Pattern: minimale NPM-Dependencies
- ✅ Volle Kontrolle über XML-Inhalt
- ⚠️ Manuelle Schema-Validation nötig

**Option B: @prevuelo/zugferd + pdf-lib**
- ✅ Schneller-Time-to-Market
- ⚠️ Externe Library-Dependency (Wartung)

**MEGA³⁰-Decision:** **Option A** (Vanilla XML + pdf-lib für PDF/A-3-Embedding).
Konsistent mit PROVA-Architektur (kein NPM-Sprawl).

### XML-Schema (BASIC Profile, Auszug)

```xml
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p1:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>{rechnung.doc_nummer}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode> <!-- Rechnung -->
    <ram:IssueDateTime>...</ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>...</ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>...</ram:SellerTradeParty>
      <ram:BuyerTradeParty>...</ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>{netto}</ram:LineTotalAmount>
        <ram:TaxTotalAmount>{ust}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>{brutto}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>{brutto}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
```

### Lambda-Architektur

```
netlify/functions/rechnung-zugferd.js
  Input: rechnung_id (UUID dokumente)
  Steps:
    1. Lade rechnung + workspace + auftrag + auftrag_kontakte
    2. Generiere ZUGFeRD-XML (Custom Builder)
    3. Lade existierendes PDFMonkey-PDF
    4. Embed XML als Anhang in PDF/A-3 via pdf-lib
    5. Upload zu Supabase Storage `sv-files/rechnungen/zugferd/`
    6. Update dokumente.zugferd_pdf_path (NEU Schema-Spalte, optional)
  Output: { pdf_url, xml_validated, success }
```

---

## Self-Scoping-Decision MEGA³⁰

**Foundation in dieser Welle:** Recherche-Doku + Schema-Erweiterung-Plan + Skeleton-Lambda.
**Vollausbau in eigener Welle:** XML-Builder-Library + PDF/A-3-Embed + Tests.

**Begründung:** ZUGFeRD ist eigene Welt — XML-Schema-Validation, PDF/A-3-Compliance,
EN 16931-Konformität sind 2-3 Tage Engineering. Fokus M30 = Pilot-Blocker (Mahnwesen),
ZUGFeRD = Polish-Sprint MEGA³⁵+.

**Marcel-Manual:** ZUGFeRD ist KEIN Pilot-Blocker — kann post-Launch nachgezogen werden.

---

*MEGA³⁰ D2 — Co-Authored-By Claude Opus 4.7*
