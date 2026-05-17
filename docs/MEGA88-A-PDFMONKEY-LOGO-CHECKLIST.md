# MEGA⁸⁸-A Block G — PDFmonkey-Logo-Checklist

**Stand:** 2026-05-17 · Marcel-Task (CC kann PDFmonkey-Dashboard nicht direkt patchen)

---

## Logo-URLs für PDFmonkey

Logos liegen public-zugänglich unter `https://prova-systems.de/img/`:

| Variante | URL | Wann nutzen |
|---|---|---|
| Voll-Logo SVG | `https://prova-systems.de/img/logo-prova-systems.svg` | Header / Briefkopf — moderne PDF-Renderer |
| Voll-Logo PNG (fallback) | `https://prova-systems.de/img/logo-icon-512.png` | Wenn PDFmonkey SVG nicht rendert (alte Engine) — temporär bis Marcel PNG-Script läuft |
| Icon-only SVG | `https://prova-systems.de/img/logo-icon-only.svg` | Footer-Wasserzeichen / Stempel |
| Mono Navy SVG | `https://prova-systems.de/img/logo-icon-mono.svg` | Druck-Optimierung (1-Farbe) |

⚠️ **PNG-Files entstehen erst nach Marcel-Run von `node tools/generate-logo-pngs.js`** (einmalig). Bis dahin: SVG-URLs nutzen, alle modernen PDFmonkey-Engines rendern SVG.

---

## Liquid-Template-Snippets

### A) Header-Logo (alle Gutachten-Templates + Briefkopf)

```liquid
<div class="header-logo" style="margin-bottom: 18px;">
  <img src="https://prova-systems.de/img/logo-prova-systems.svg"
       alt="PROVA Systems"
       style="height: 42px; width: auto;">
</div>
```

### B) Footer-Branding-Stempel (Rechnungen + Bescheinigungen)

```liquid
<div class="footer-brand" style="text-align:center; padding-top:12px; border-top:1px solid #e5e7eb; font-size:10px; color:#6b7280;">
  <img src="https://prova-systems.de/img/logo-icon-mono.svg"
       alt="" style="height:18px;width:18px;vertical-align:middle;opacity:.65;margin-right:6px;">
  Erstellt mit PROVA Systems · prova-systems.de
</div>
```

### C) Wasserzeichen für Entwurf-PDFs

```liquid
<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);opacity:.08;z-index:-1;pointer-events:none;">
  <img src="https://prova-systems.de/img/logo-icon-mono.svg" style="height:300px;width:300px;">
</div>
```

---

## Template-Inventory + Aktion-Liste

CC hat diese Templates aus existing Repo-Doku identifiziert. Marcel klickt sich durch PDFmonkey-Dashboard und patcht jedes.

### Gutachten-Templates (Block A)

| Template-ID | Name | Header-Logo | Footer-Brand | Status |
|---|---|---|---|---|
| **F-04** | Schadensgutachten (Standard) | ☐ | ☐ | offen |
| **F-09** | Wertgutachten | ☐ | ☐ | offen |
| **F-15** | Beratungsprotokoll | ☐ | ☐ | offen |
| **F-19** | Baubegleitung-Bericht | ☐ | ☐ | offen |

### Korrespondenz-Templates (Block B)

| Template-ID | Name | Header-Logo | Footer-Brand | Status |
|---|---|---|---|---|
| **BRIEF-MASTER** | Universal-Brief-Vorlage | ☐ | ☐ | offen |
| **WELCOME-MAIL-MASTER** | Onboarding-Welcome-Mail | ☐ | ☐ | offen |

### Bescheinigungen (Block C — 12 Templates)

Aus `dokument_typ`-ENUM:
- bescheinigung_sv_bestaetigung
- bescheinigung_ortsbesichtigung
- bescheinigung_auftragsannahme
- bescheinigung_termin
- bescheinigung_maengelfreiheit
- bescheinigung_zustand
- bescheinigung_beweissicherung
- bescheinigung_schimmelfreiheit
- bescheinigung_feuchtigkeit
- bescheinigung_standsicherheit
- bescheinigung_bedenken_vob
- bescheinigung_behinderung_vob

→ Sammeltemplate: **BESCHEINIGUNG-MASTER** + Filiation pro Typ. Header-Logo zentral patchen genügt.

### Rechnungen + Mahnungen (Block D)

| Template-ID | Name | Header-Logo | Footer-Brand | Status |
|---|---|---|---|---|
| **RECHNUNG-MASTER** | Standard-Rechnung | ☐ | ☐ | offen |
| **RECHNUNG-JVEG** | JVEG-Rechnung (Gericht) | ☐ | ☐ | offen |
| **MAHNUNG-1/2/3** | 3-Stufen-Mahnwesen | ☐ | ☐ | offen |
| **GUTSCHRIFT-MASTER** | Storno-Gutschrift | ☐ | ☐ | offen |

### Spezial (Block E)

| Template-ID | Name | Header-Logo | Footer-Brand | Status |
|---|---|---|---|---|
| **FOTODOKU-MASTER** | Foto-Dokumentation | ☐ | ☐ | offen |
| **AUFTRAGSBESTAETIGUNG** | nach Auftragsannahme | ☐ | ☐ | offen |
| **TERMIN-BESTAETIGUNG** | nach Termin-Buchung | ☐ | ☐ | offen |

---

## Verbindlicher LG-Darmstadt-Disclosure-Block (parallel)

Wenn das jeweilige Template `has_ki_einsatz=true` rendert, MUSS zusätzlich der LG-Darmstadt-Disclosure-Block enthalten sein. Siehe `docs/MEGA84-PDF-LG-DISCLOSURE-PATCH-INSTRUCTIONS.md` (Pass 2b Block D). Beim Logo-Patch gleichzeitig prüfen ob LG-Block existiert.

---

## Verify pro Template

Nach Patch in PDFmonkey-Dashboard:
1. **Test-Render** mit Beispiel-Daten
2. **PDF-Download** + visueller Check: Logo ≥ 40px hoch, scharf, nicht pixelig
3. **Mobile-Test**: PDF auf Smartphone öffnen, Logo bleibt lesbar
4. Status-Spalte in dieser Liste abhaken

---

## Bei Problemen

- **SVG rendert nicht**: PDFmonkey-Engine alt → wechsle auf PNG-URL. Falls PNG noch nicht existiert: `node tools/generate-logo-pngs.js` ausführen + img/ committen + push (CDN-Cache invalidiert nach Deploy).
- **Logo zu dunkel auf Briefkopf**: `filter: brightness(0) invert(1);` für Weiß-Variante NICHT in PDFmonkey unterstützt — stattdessen white-bg-Variante via Mono-Logo + CSS color: white.
- **Aspect-Ratio verzerrt**: `width: auto;` hinzufügen, nur `height` setzen.

---

## Acceptance

✅ Block G = Marcel-Action (~30 Min für 12+ Templates). Ergebnis: alle PDFs mit konsistenter Brand.
