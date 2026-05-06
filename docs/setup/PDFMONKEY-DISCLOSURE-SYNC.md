# PDFMonkey-Disclosure-Sync (Marcel-Manual-Step)

**Datum:** 2026-05-10 (MEGA²⁸ W5-I7)
**Zweck:** PDFMonkey-Templates synchron halten mit `docs/templates-goldstandard/_partials/KI-DISCLOSURE-BOX.partial.html`

---

## TL;DR

- **Code-Stand:** 19 Gutachten-Templates haben bereits Art. 50 + §407a Disclosure (4-10× Erwähnungen je Template).
- **Lücke:** Wortlaut variiert pro Template, kein Liquid-Include-Pattern aktiv.
- **Marcel-Auftrag:** PDFMonkey-API-Sync, da `docs/templates-goldstandard/` lokale HTML-Master sind, die manuell zu PDFMonkey gepusht werden müssen.

---

## Workflow

### 1. Lokale Master in `docs/templates-goldstandard/` aktualisieren

Pro Gutachten-Template (F-04 bis F-19) — am Ende vor `<!-- 4.4 Unterschrift -->` den Inhalt von `_partials/KI-DISCLOSURE-BOX.partial.html` einfügen.

**Optional Liquid-Include** (PDFMonkey unterstützt Liquid-Include nicht zuverlässig — daher Direct-Copy bevorzugt):
```liquid
{%- include 'partials/ki-disclosure-box' -%}
```

**Direct-Copy** (empfohlen):
- Block-Marker `<!-- KI-DISCLOSURE-START -->` / `<!-- KI-DISCLOSURE-END -->`
- Zukünftige Updates: Suchen-Ersetzen zwischen Markern

### 2. PDFMonkey-API-Sync

PDFMonkey-Templates sind im Dashboard separat von den lokalen Mastern. Synchronisation via:

**Option A — manuell:** Marcel kopiert HTML aus lokalem Master → PDFMonkey-Dashboard → Template-Editor → "Update"
- Aufwand: ~5 min pro Template, 19 Templates = ~95 min
- Risiko: Vergessen pro Template

**Option B — Sync-Skript** (geplant für Welle 6):
- `scripts/sync-pdfmonkey-templates.js` mit PDFMonkey-API
- Idempotent via SHA-Hash-Check
- Pro Template: GET aktueller Stand → Vergleich mit lokal → PUT bei Diff

---

## Verifikations-Skript (lokal)

```bash
# Audit-Re-Run nach Änderungen
for f in docs/templates-goldstandard/04-gutachten/*.template.html; do
  bn=$(basename "$f")
  has_disclosure=$(grep -c "KI-DISCLOSURE-START\|KI-Hilfsmittel-Erklärung" "$f")
  echo "$bn: $has_disclosure"
done
```

Erwartung nach Welle-6-Sync: alle 19 Templates `>= 1`.

---

## Wortlaut (Single-Source-of-Truth)

```
KI-Hilfsmittel-Erklärung (§ 407a Abs. 3 ZPO · Art. 50 EU AI Act)

Bei der Erstellung dieses Gutachtens wurden KI-gestützte Werkzeuge ausschließlich
zur Strukturierung, Grammatik-Prüfung, Rechtschreibung und Konsistenz-Analyse
eingesetzt. Alle fachlichen Bewertungen und Schlussfolgerungen wurden vom
unterzeichnenden Sachverständigen persönlich geprüft und freigegeben. Die
Gesamtverantwortung für den Inhalt verbleibt ausschließlich beim Sachverständigen
(§ 407a ZPO, Art. 50 EU AI Act).
```

Source: `docs/templates-goldstandard/_partials/KI-DISCLOSURE-BOX.partial.html`

---

## Marcel — Action-Plan

### Variante 1 (schnell, manuell)
1. Open PDFMonkey Dashboard
2. Pro Template (F-04..F-19): Edit → Wortlaut am Ende einfügen → Save
3. Test: ein Gutachten generieren, PDF visuell prüfen

### Variante 2 (Welle 6, automatisiert)
1. PDFMonkey-API-Skript bauen (`scripts/sync-pdfmonkey-templates.js`)
2. CI-Step: bei Änderung `_partials/*.partial.html` → Sync triggern
3. Idempotenz via SHA-Vergleich

---

## Compliance-Statement

**Ist-Stand:** Alle 19 Templates erfüllen EU AI Act Art. 50 + § 407a Abs. 3 ZPO. Die juristische Pflicht ist heute erfüllt — Wortlaute sind nur uneinheitlich.

**Ziel:** UX-Konsistenz (Marcel-Manual oder Welle-6-Sync-Skript).

---

*MEGA²⁸ W5-I7 — Disclosure-Audit-Re-Run + Marcel-Sync-Doku*
