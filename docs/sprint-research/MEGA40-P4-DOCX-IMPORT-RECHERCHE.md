# MEGA⁴⁰ P4 — DOCX-Import Recherche

**Datum:** 2026-05-08
**Sprint:** MEGA⁴⁰ Phase 4 — DOCX-Import
**Owner-Direktive (Master-Prompt P4):** „Recherche-Pflicht: 3-5 Quellen Lib-Auswahl"

---

## Auswahlkriterien

PROVA-spezifisch:
1. **Vanilla-JS-tauglich** — kein React-Pflicht (CLAUDE.md Regel)
2. **Browser + Node-fähig** — Editor läuft Browser, Tests laufen Node
3. **MIT/Apache/BSD** — keine GPL (Pre-Pilot-Pricing-Regel)
4. **Aktive Maintenance** — letzter Release ≤12 Monate
5. **Output-Qualität** — Headings + Listen + Tabellen + Bilder erhalten
6. **CDN-fähig** (esm.sh oder unpkg) — kein npm-Build-Step nötig
7. **Bundle-Size** — möglichst <500 KB minified

---

## Kandidaten

### 1. mammoth.js (Empfehlung ✅)

| Kriterium | Score |
|-----------|-------|
| Lizenz | BSD-2-Clause ✅ |
| Browser + Node | beides ✅ |
| Maintenance | aktiv (mwilliamson, regelmäßige Releases) ✅ |
| CDN | esm.sh + unpkg ✅ |
| Bundle | ~280 KB minified ✅ |
| HTML-Output | sehr sauber, semantisch korrekt ✅ |
| Image-Inline | base64-Embedding (für Editor: zu Storage upload) ✅ |
| Custom-Style-Mapping | ja, via styleMap-API ✅ |

**Pros:**
- Konvertiert DOCX zu sauberem semantischen HTML (h1/h2/p/ul/ol/table)
- Ignoriert komplexe Word-Sachen die TipTap eh nicht kann (Macros, OLE-Embeds)
- Style-Mapping erlaubt: `p[style-name='Quote'] => blockquote`
- Bilder werden als data-URI inlined, dann via PROVA editor-image-upload zu Storage

**Cons:**
- Keine native Tabelle-Splitting (rowspan/colspan funktioniert aber)
- Footnotes werden als <a> + <ol> am Ende ausgegeben — muss ggf. zu TipTap-Footnote-Mark gemappt werden
- Page-Breaks gehen verloren (Word-Konzept fehlt im HTML-Modell)

**Empfehlung:** Nutze mammoth.js für PROVA P4-DOCX-Import.

---

### 2. docx-preview (Alternativ — verworfen)

Nutzt OOXML-Parser direkt + rendert zu HTML.

**Cons:**
- Output ist HTML mit pixel-perfekten Word-CSS-Properties (font-family inline, exakte margins) — TipTap-unfreundlich
- Bundle 800+ KB
- Keine Style-Mapping-API
- Verworfen.

---

### 3. docxtemplater (Alternativ — verworfen)

Server-side DOCX-Templating-Engine.

**Cons:**
- Read-only/Render-only — kein Import
- Verworfen.

---

### 4. docx (npm) → reine Export-Library

**Cons:**
- Output-Library für DOCX-Generation, kein Import.
- Wird in P5 für Export genutzt — nicht in P4.

---

### 5. JSZip + manueller XML-Parse (Alternativ — verworfen)

Eigene Implementierung über DOCX-Format-Spec.

**Cons:**
- Aufwand 20+ Stunden für Headings + Listen + Tabellen + Bilder
- Maintenance-Last bei PROVA
- Verworfen — mammoth.js löst exakt das gleiche Problem mit weniger Risiko.

---

## Implementierungs-Plan P4

```
1. lib/docx-import.js
   - importDocx(arrayBuffer): Promise<{html, warnings, messages}>
   - htmlToTipTapJson(html): TipTap-JSON
   - extractPlaceholders(html): Array<{token: '{{Mandant}}', occurrences: 3}>
   - styleMap mit PROVA-Konventionen (z.B. Heading 1 → h2 weil PROVA Doc-Title als h1 reserviert)

2. dokument-import.html
   - Drag&Drop Upload-Zone
   - File-Picker-Fallback
   - Preview-Panel (TipTap-Editor read-only mit imported content)
   - Placeholder-Mapping-Wizard (jeder Placeholder → PROVA-Feld dropdown)
   - 2 Buttons: 'Als Vorlage speichern' / 'Direkt bearbeiten'

3. Tests:
   - extractPlaceholders findet {{...}}
   - htmlToTipTapJson konvertiert h1→heading{level:1}
   - Warnings für Page-Breaks/Footer/etc
```

---

## Mammoth.js CDN-Loading-Pattern

Analog zu TipTap-Pattern in lib/prova-editor.js:

```javascript
async function loadMammoth() {
  const m = await import('https://esm.sh/mammoth@1');
  return m.default || m;
}
```

mammoth ist auch via `<script src="https://unpkg.com/mammoth@1/mammoth.browser.js">` als UMD-Bundle ladbar (für Tests + Demo-Fallback).

---

## Style-Mapping (PROVA-Konvention)

```
Heading 1 → h2          (PROVA Doc-Titel ist H1)
Heading 2 → h3
Heading 3 → h4
p[style-name='Quote'] → blockquote
p[style-name='Code'] → pre.code
b => strong
i => em
u => u
```

---

## Risiken

1. **Bilder-Inline-Base64-Bloat** — DOCX mit 30 Bildern à 1 MB → 30 MB-base64-String. Mitigation: Auto-Upload via editor-image-upload Lambda für jedes Bild ≥50 KB.
2. **Footnote-Format-Mismatch** — Word-Footnotes als <ol> am Ende; TipTap-Footnote als <sup> inline. Mitigation: Helper-Funktion convertWordFootnotesToTipTap(json).
3. **Tabellen-Layout** — komplexe Word-Tabellen mit verschachtelten Cells. Mitigation: Warnings-Array zeigt User was nicht 1:1 importiert wurde.
4. **Page-Breaks gehen verloren** — Word-Konzept im HTML nicht abbildbar. Mitigation: Warning + Hinweis "Seitenumbrüche bitte manuell setzen".

---

## Decision-Final

**mammoth.js** für PROVA MEGA⁴⁰ P4 DOCX-Import.

Alternative für späteren Zeitpunkt (wenn mammoth aktive-Maintenance verliert): Custom OOXML-Parser via JSZip + xml2js.

---

*MEGA⁴⁰ P4 Recherche — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
