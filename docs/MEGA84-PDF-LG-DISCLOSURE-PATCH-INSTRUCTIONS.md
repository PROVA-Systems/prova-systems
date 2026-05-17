# MEGA⁸⁴/⁸⁵ Pass 2b Block D — PDFMonkey-Template-Patches für LG-Darmstadt-Disclosure

**Stand:** 2026-05-17 · Branch: `feat/mega84-85-pass2b-compliance-search`
**Marcel-Task:** PDFMonkey-Dashboard direkt patchen. CC kann PDFMonkey-API nicht patchen.

---

## Hintergrund

Nach Beschluss LG Darmstadt vom 10.11.2025 (Az.&nbsp;19&nbsp;O&nbsp;527/16) kann nicht offengelegter wesentlicher KI-Einsatz zur Vergütungsfestsetzung auf 0 € führen. Pflicht-Disclosure auf KI-gestützten Gutachten ist daher zwingend.

**Pre-Render-Check** verhindert PDF-Generierung wenn KI-Tasks vorhanden aber `ki_anzeige_datum` fehlt.

---

## Liquid-Block (Copy-Paste in 3 Templates)

Ort: **vor der Unterschrift** in F-04, F-09, F-15 PDFMonkey-Templates:

```liquid
{% if has_ki_einsatz %}
<div style="border:1px solid #f59e0b;padding:14px 18px;margin:24px 0;border-radius:8px;font-size:11pt;background:#fef3c7;page-break-inside:avoid;">
  <h3 style="margin:0 0 8px;font-size:12pt;font-weight:700;color:#0b2228;">
    Hinweis zur KI-Nutzung (EU AI Act Art. 50, § 407a Abs. 3 ZPO)
  </h3>
  <p style="margin:0;line-height:1.55;color:#1a2530;">
    Bei der Erstellung der §§&nbsp;1-5 dieses Gutachtens wurden KI-gestützte
    Werkzeuge zur Strukturierung von Diktat-Inhalten und zur
    Normen-Vorauswahl eingesetzt ({{ ki_modell_label | default: "gpt-5.5-Reihe via OpenAI API" }}).
  </p>
  <p style="margin:8px 0 0;line-height:1.55;color:#1a2530;">
    Die §§&nbsp;6 (Fachurteil) und 7 (Kostenermittlung) wurden vollständig
    vom unterzeichnenden Sachverständigen persönlich erstellt.
  </p>
  <p style="margin:8px 0 0;font-style:italic;color:#1a2530;">
    Sämtliche KI-gestützten Texte wurden vor Freigabe geprüft und
    fachlich verantwortet (vgl. Beschluss LG Darmstadt 10.11.2025,
    Az.&nbsp;19&nbsp;O&nbsp;527/16).
  </p>
  {% if ki_anzeige_datum %}
  <p style="margin:8px 0 0;font-size:10pt;color:#6b7280;">
    KI-Einsatz angezeigt an Auftraggeber/Gericht am: {{ ki_anzeige_datum | date: "%d.%m.%Y" }}
  </p>
  {% endif %}
</div>
{% endif %}
```

---

## Template-IDs (PDFMonkey-Live-API)

| Template | UUID | Status |
|---|---|---|
| **F-04 Kurzstellungnahme** | `c4bb257b-...` (Marcel hat die volle UUID) | 🟡 PATCH PENDING |
| **F-09 Kurzgutachten** | `ba076019-...` | 🟡 PATCH PENDING |
| **F-15 Gerichtsgutachten** | `36e140dc-...` | 🟡 PATCH PENDING |

Optional auch für späteren Sprint:
- F-10 Beweissicherung, F-11 Brandschaden, F-12 Feuchte-Schimmel
- F-13 Elementarschaden, F-14 Baumängel, F-19 Wertgutachten

---

## PDFMonkey-Dashboard-Pfad (Marcel)

1. https://www.pdfmonkey.io/de/dashboard öffnen
2. Templates → F-04 / F-09 / F-15 öffnen
3. Liquid-Editor: Block oben **kopieren** und vor der `<div class="signature-block">` (oder äquivalent) einfügen
4. Save + "Generate Sample PDF" mit `has_ki_einsatz=true` + `ki_anzeige_datum=2026-05-17`
5. Visual-Check: Box mit gelbem Hintergrund sichtbar
6. Sample mit `has_ki_einsatz=false`: Box NICHT sichtbar ✓

---

## Frontend-Variable-Mapping

`pdf-proxy.js` (Netlify-Function) wurde in Block D.2 erweitert um die 3 neuen Variablen:

```js
const payload = {
  // ...existing fields
  has_ki_einsatz: Array.isArray(auftrag.ki_tasks) 
    ? auftrag.ki_tasks.length > 0 
    : (auftrag.ki_tasks && Object.keys(auftrag.ki_tasks).length > 0),
  ki_modell_label: 'gpt-5.5-Reihe via OpenAI API',
  ki_anzeige_datum: auftrag.ki_anzeige_datum  // optional, kann null sein
};
```

---

## Pre-Render-Check (Frontend-Block D.3)

Wenn `ki_tasks` vorhanden aber `ki_anzeige_datum` NULL → User-Modal vor PDF-Generierung blockt:

> ⚠️ KI-Einsatz dokumentiert, aber **Anzeige-Datum fehlt**.
> 
> Nach § 407a Abs. 3 ZPO und Beschluss LG Darmstadt 10.11.2025 muss der KI-Einsatz an Auftraggeber/Gericht angezeigt werden. Bitte tragen Sie das Datum ein, an dem Sie die KI-Anzeige verschickt haben.
>
> [📅 KI-Anzeige-Datum setzen] [Abbrechen]

Bei "Datum setzen": Date-Picker, schreibt in `auftraege.ki_anzeige_datum`. Danach PDF-Generierung freigegeben.

Diese Logic ist in `freigabe-wizard.html` Step 3 implementiert.

---

## Verify nach Marcel-Apply

```bash
# Test 1: Auftrag mit KI-Tasks + ki_anzeige_datum
curl -X POST .../pdf-proxy -d '{"auftrag_id":"<test-id>", "template":"F-09"}'
# Erwartung: PDF mit Disclosure-Box

# Test 2: Auftrag OHNE KI-Tasks
curl -X POST .../pdf-proxy -d '{"auftrag_id":"<no-ki-id>", "template":"F-09"}'
# Erwartung: PDF OHNE Disclosure-Box

# Test 3: Frontend Pre-Render-Check
# Akte mit ki_tasks befüllt aber ki_anzeige_datum=NULL → Freigabe-Wizard Step 3 → Modal "Datum setzen"
```
