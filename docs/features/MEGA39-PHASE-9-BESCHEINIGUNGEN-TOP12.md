# MEGA³⁹ Phase 9 — Bescheinigungen Top 12 (Sprint 04d)

**Datum:** 2026-05-08

## 12 Bescheinigungs-Typen

| # | id | Template | Rechtsbasis | Compliance-Hinweis |
|---|----|----|----|----|
| 1 | sv-bestaetigung | BES-01 | IHK-SVO §8 | – |
| 2 | ortsbesichtigung | BES-02 | eigene Tätigkeit | – |
| 3 | auftragsannahme | BES-03 | BGB §631 | – |
| 4 | termin | BES-04 | eigene Tätigkeit | – |
| 5 | maengelfreiheit | BES-05 | VOB/B §12 Abs. 1 | NUR geprüfter Umfang zum Stichtag |
| 6 | zustand | BES-06 | BGB §640 | – |
| 7 | beweissicherung-bestaetigung | BES-07 | ZPO §485 | – |
| 8 | schimmelfreiheit | BES-08 | UBA-Schimmelleitfaden + DIN ISO 16000-17 | NUR sichtbare Oberflächen + Untersuchungsumfang |
| 9 | feuchtigkeit | BES-09 | DIN 4108-3 + WTA 4-5 | – |
| 10 | standsicherheit | BES-10 | BauO + SV-VO §85 | **NUR saSV — NICHT ö.b.u.v.-SV!** |
| 11 | bedenken-vob | BES-11 | VOB/B §4 Abs. 3 | – |
| 12 | behinderung-vob | BES-12 | VOB/B §6 Abs. 1 | – |

## Architektur

```
bescheinigungs-logic.js (NEU M³⁹ P9)
  ↓ (PROVA_BESCHEINIGUNGEN.erstelle)
generate-bescheinigungs-aktenzeichen Lambda  (M³⁶ W4.6, BES-YYYY-NNN)
  ↓
bescheinigung-generate Lambda  (M³⁰, PDF + DB)
  ↓
dokumente-Tabelle  (typ='bescheinigung', bescheinigungs_typ, bescheinigungs_az)
+ PDFMonkey-Template BES-01 bis BES-12
```

## Public API

```javascript
window.PROVA_BESCHEINIGUNGEN = {
  getTypen()            // → Array von 12 Typen
  getTyp(id)            // → einzelner Typ oder null
  erstelle(typ_id, daten)  // → Promise<{ az, dokument_id, pdf_url }>
};
```

`erstelle`-Workflow:
1. Pflichtfeld-Check (typ.pflichtfelder)
2. AZ-Generation via `generate-bescheinigungs-aktenzeichen` (race-safe Optimistic-Lock)
3. PDF + DB-Save via `bescheinigung-generate`-Lambda
4. Response: `{ az, dokument_id, pdf_url }`

## Compliance-Hinweise (eingebaut!)

Drei Bescheinigungs-Typen tragen einen `hinweis`-Text der im PDF als
„Eingeschränkter Untersuchungsumfang"-Disclaimer dargestellt werden muss:

- **maengelfreiheit:** „Aussage nur für geprüften Umfang zum Stichtag — KEINE Allzeit-Garantie."
- **schimmelfreiheit:** „Aussage NUR für geprüfte sichtbare Oberflächen + dokumentierten Untersuchungsumfang."
- **standsicherheit:** „NUR für staatlich anerkannte SV (saSV) — NICHT für ö.b.u.v.-SV im Schadensbereich!"

→ Reduziert Haftungs-Risiko bei späteren Schäden, die außerhalb des Untersuchungsumfangs liegen.

## DB-ENUM Mapping

`dokument_typ`-ENUM (aus M³⁷ B-Migration) enthält alle 12 `bescheinigung_*`-Werte:

```
bescheinigung_sv_bestaetigung
bescheinigung_ortsbesichtigung
bescheinigung_auftragsannahme
bescheinigung_termin
bescheinigung_maengelfreiheit
bescheinigung_zustand
bescheinigung_beweissicherung
bescheinigung_schimmelfreiheit
bescheinigung_feuchtigkeit
bescheinigung_standsicherheit
bescheinigung_bedenken_vob
bescheinigung_behinderung_vob
```

→ Alle 12 Mappings in `bescheinigungs-logic.js` Tests verifiziert.

## Tests

`tests/bescheinigungen/m39-p9-bescheinigungen-top12.test.js` — **16/16 grün**:
- 12 Typen exposed
- Alle erwarteten IDs aus Sprint 04d
- Schema-Vollständigkeit (id/titel/icon/kurz/template_code/rechtsbasis/typ_enum/pflichtfelder)
- Template-Codes BES-01 bis BES-12
- Compliance-Hinweise bei den 3 Risiko-Bescheinigungen
- VOB/B-Paragraphen korrekt
- ZPO §485 für Beweissicherung
- UBA-Schimmelleitfaden für Schimmelfreiheit
- DB-ENUM-Mapping verifiziert (12/12)
- erstelle-Validierung (unbekannter Typ + Pflichtfelder)
- Lambda-Wiring (AZ-Gen + bescheinigung-generate)
- AZ-Format BES-YYYY-NNN

## Marcel-Manual

### 12 PDFMonkey-Templates erstellen

Marcel muss in PDFMonkey 12 HTML-Templates anlegen (BES-01 bis BES-12). Pro Template:
- DIN 5008 Format
- §407a-Box (auf relevanten)
- KI-Disclosure wenn relevant (EU AI Act Art. 50)
- Anti-Austausch-Header ab Seite 2
- Compliance-Hinweise aus `BESCHEINIGUNGS_TYPEN[i].hinweis` als Disclaimer-Box

PROVA-Goldstandard-Templates in `docs/templates-goldstandard/02-bestaetigungen/` als Vorlage:
- B-04-MAENGELFREIHEIT.liquid.template.html (existiert)
- B-05-ZUSTANDSBESCHEINIGUNG.liquid.template.html (existiert)
- B-06-BEWEISSICHERUNGSBESTAETIGUNG.liquid.template.html (existiert)

→ 9 weitere müssen erstellt werden.

### bescheinigungen.html UI-Erweiterung

Aktuell zeigt `bescheinigungen.html` nur 11 Korrespondenz-Briefe (M⁴ K-XX). Für die 12 echten Bescheinigungen kann eine zweite Section hinzugefügt werden (analog Karten-Grid):

```html
<script src="bescheinigungs-logic.js" defer></script>
<section id="bescheinigungen-top12">
  <h2>Bescheinigungen (Sprint 04d)</h2>
  <div id="bes-grid"></div>
</section>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('bes-grid');
    PROVA_BESCHEINIGUNGEN.getTypen().forEach(t => {
      const card = document.createElement('div');
      card.className = 'bs-card';
      card.innerHTML = `<h3>${t.icon} ${t.titel}</h3>
        <p>${t.kurz}</p>
        <small>${t.rechtsbasis}</small>
        <button onclick="erstelle('${t.id}')">Erstellen</button>`;
      grid.appendChild(card);
    });
  });
</script>
```

## Acceptance

- [x] bescheinigungs-logic.js mit 12 Typen
- [x] AZ-Generator-Lambda integriert (M³⁶ W4.6 generate-bescheinigungs-aktenzeichen pre-existing)
- [x] bescheinigung-generate-Lambda integriert (M³⁰ pre-existing)
- [x] Compliance-Hinweise (3 Risiko-Bescheinigungen)
- [x] DB-ENUM-Mapping (M³⁷ B pre-existing)
- [x] 16 Tests grün
- [ ] Marcel-Manual: 9 weitere PDFMonkey-Templates BES-01..BES-12 (3 existieren in goldstandard)
- [ ] Marcel-Manual: bescheinigungen.html UI-Erweiterung mit Top-12-Section

*— M³⁹ P9 — 2026-05-08*
