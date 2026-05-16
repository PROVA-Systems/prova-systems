# MEGA⁸² D.5 — §407a-Disclosure-Box auf KI-PDFs

**Stand:** 2026-05-16 · **Scope:** PDFMonkey-Templates F-01 bis F-19

## Anforderung

Auf jedem PDF mit KI-Anteil (`auftraege.ki_tasks` JSONB nicht leer) automatisch eine Disclosure-Box am Ende vor der Unterschrift einbauen.

## Genauer Wortlaut (verbindlich aus MEGA82-Spec Anhang A.3)

```
─────────────────────────────────────────────────────────────────
HINWEIS ZUR KI-NUTZUNG
(EU AI Act Art. 50 · § 407a Abs. 3 ZPO)

Bei der Erstellung der §§ 1–5 dieses Gutachtens wurden KI-gestützte
Werkzeuge zur Strukturierung von Diktat-Inhalten und zur Normen-
Vorauswahl eingesetzt.

Die §§ 6 (Fachurteil) und 7 (Kostenermittlung) wurden vollständig
vom unterzeichnenden Sachverständigen persönlich erstellt.

Alle KI-gestützten Texte wurden vor Freigabe geprüft und verantwortet.
─────────────────────────────────────────────────────────────────

[Datum]                                    [Unterschrift SV]
```

## Liquid-Conditional

Disclosure-Box rendert nur wenn `ki_tasks` nicht leer ist. Liquid-Pattern:

```liquid
{%- if auftrag.ki_tasks and auftrag.ki_tasks.size > 0 -%}
<div class="ki-disclosure">
  <div class="ki-disclosure-title">HINWEIS ZUR KI-NUTZUNG</div>
  <div class="ki-disclosure-sub">(EU AI Act Art.&nbsp;50 · § 407a Abs.&nbsp;3 ZPO)</div>
  <p>Bei der Erstellung der §§&nbsp;1–5 dieses Gutachtens wurden KI-gestützte Werkzeuge zur Strukturierung von Diktat-Inhalten und zur Normen-Vorauswahl eingesetzt.</p>
  <p>Die §§&nbsp;6 (Fachurteil) und 7 (Kostenermittlung) wurden vollständig vom unterzeichnenden Sachverständigen persönlich erstellt.</p>
  <p>Alle KI-gestützten Texte wurden vor Freigabe geprüft und verantwortet.</p>
</div>
{%- endif -%}
```

## Templates die diese Box brauchen

Alle Gutachten-Templates in `docs/templates-goldstandard/04-gutachten/`:

| Template | Datei | Status |
|---|---|---|
| F-04 Kurzstellungnahme | `F-04-KURZSTELLUNGNAHME.template.html` | 🔵 TODO |
| F-09 Kurzgutachten | `F-09-KURZGUTACHTEN.liquid.template.html` | 🔵 TODO |
| F-10 Beweissicherung | `F-10-BEWEISSICHERUNG.liquid.template.html` | 🔵 TODO |
| F-11 Brandschaden | `F-11-BRANDSCHADEN.liquid.template.html` | 🔵 TODO |
| F-12 Feuchte-Schimmel | `F-12-FEUCHTE-SCHIMMEL.liquid.template.html` | 🔵 TODO |
| F-13 Elementarschaden | `F-13-ELEMENTARSCHADEN.liquid.template.html` | 🔵 TODO |
| F-14 Baumängel | `F-14-BAUMAENGEL.liquid.template.html` | 🔵 TODO |
| F-15 Gerichtsgutachten | `F-15-GERICHTSGUTACHTEN.liquid.template.html` | 🔵 TODO |
| F-19 Wertgutachten | `F-19-WERTGUTACHTEN.liquid.template.html` | 🔵 TODO |

**Σ 9 Templates.**

## Schalter im Freigabe-Wizard (B.8 Step 2)

User kann Disclosure manuell deaktivieren wenn er bestätigt: „100% manuell, keine KI eingesetzt." Pattern:

```js
// Im Freigabe-Wizard Step 2
if (window.userConfirmedNoKI === true) {
  // PDFMonkey-Payload: ki_disclosure_skip: true
}
```

Liquid:
```liquid
{%- if auftrag.ki_tasks and auftrag.ki_tasks.size > 0 and not ki_disclosure_skip -%}
  ...
{%- endif -%}
```

## DEFER MEGA83 — Implementation-Sprint

**Begründung Defer:** PDFMonkey-Liquid-Templates anzupassen + jedes Template einzeln testen + PDF-Output-Verifikation = eigener fokussierter Sprint. Aktuell betreut Marcel die PDFMonkey-Account-Verwaltung direkt; CC's Aufgabe in MEGA82 war Spezifikation + Doku.

**Marcel-Aufgabe MEGA82-Hotfix (optional vor Pilot):**
- Liquid-Block in F-04 + F-09 + F-15 (die meist genutzten Templates) als Sofort-Patch einbauen
- Restliche 6 Templates in MEGA83 nachziehen
