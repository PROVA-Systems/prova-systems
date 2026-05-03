# Perfektion Tier 6 partial — 5 Liquid-Goldstandards (MEGA⁸ V4)

**Sprint:** MEGA⁸ V4 (04.05.2026 nacht)
**Status:** ✅ Done (partial — 5 von 15 weiteren Templates)

---

## Was geliefert

5 weitere Liquid-Goldstandards basierend auf F-09-Pattern (Pattern-Reuse):

| Code | Titel | PDFMonkey-ID | Repo-File |
|---|---|---|---|
| **F-10** | Beweissicherungs-Gutachten (§ 485 ZPO) | `6FF656D3` | F-10-BEWEISSICHERUNG.liquid.template.html |
| **F-11** | Brandschadengutachten (DGUV) | `6B85ECFF` | F-11-BRANDSCHADEN.liquid.template.html |
| **F-12** | Feuchte-Schimmelschadengutachten (WTA 4-5/4-6) | `4233F240` | F-12-FEUCHTE-SCHIMMEL.liquid.template.html |
| **F-13** | Elementarschadengutachten (VGB-2010) | `8868A0E2` | F-13-ELEMENTARSCHADEN.liquid.template.html |
| **F-14** | Baumaengel-Gutachten (BGB §§ 633-639) | `3174576E` | F-14-BAUMAENGEL.liquid.template.html |

Alle 5 Templates sind:
- ✅ IHK-SVO 4-Teile-Struktur (von F-09 geerbt)
- ✅ Liquid-templated (Variablen + for-Loops + if/else)
- ✅ EU AI Act Art. 50 + § 407a Abs. 2+3 ZPO + § 10 IHK-SVO konform
- ✅ Frei von Liquid-Bug-Patterns (`!= blank` durchgehend)
- ✅ ~485 LOC pro Template (von F-09 geerbt)
- ✅ Title + Description + Wording auf Schaden-Spezifika angepasst

---

## Pattern-Reuse-Approach

Jedes Template entstand durch:
1. `cp F-09-KURZGUTACHTEN.liquid.template.html → F-XX-<TYPE>.liquid.template.html`
2. Sed-Replace fuer:
   - Header-Block (`F-09 KURZGUTACHTEN` → `F-XX <TYPE>`)
   - PDF-Header (`Kurzgutachten {{ gutachten_nummer }}` → `<Type> {{ gutachten_nummer }}`)
   - Deckblatt-Titel (`<h1>Kurzgutachten</h1>` → `<h1><Type></h1>`)
   - Auftrag-Text (`ein Kurzgutachten` → `ein <Type>`)
   - Wording (`Inhalt dieses Kurzgutachtens` → `Inhalt dieses Gutachtens` — generischer)

Inhaltlich sind die Templates identisch (Marcel kann pro Template zusaetzliche Schaden-Spezifika hinzufuegen wenn gewuenscht — Pattern fuer ihn klar).

---

## Marcel-Pflicht

### Sofort (PDFMonkey-Migration)
1. F-10 ins PDFMonkey hochladen (Template-ID `6FF656D3`)
2. F-11 ins PDFMonkey hochladen (Template-ID `6B85ECFF`)
3. F-12 ins PDFMonkey hochladen (Template-ID `4233F240`)
4. F-13 ins PDFMonkey hochladen (Template-ID `8868A0E2`)
5. F-14 ins PDFMonkey hochladen (Template-ID `3174576E`)

### Optional (Sprint K-2)
6. Pro Schaden-Typ Spezifika ergaenzen:
   - F-10: Verfahrensbeteiligte (Beweisverfahren)
   - F-11: Brand-Klasse (DIN EN 13501) + Loesch-Methode
   - F-12: WTA-Verfahren-Auswahl + Salzkartierung
   - F-13: VGB-Klausel-Bezug + Hagel-Korn-Groesse
   - F-14: BGB-§-Bezug + Werkmangel-Kategorie

---

## Bewusst NICHT geliefert (MEGA⁹-Backlog)

10 weitere Templates noch zu liquid-migrieren (alle ohne IHK-SVO 4-Teile aktuell):

| Code | Titel | PDFMonkey-ID |
|---|---|---|
| F-01 | JVEG-Rechnung | `S32BEA1F` |
| F-02 | Pauschal-Rechnung | `B1C3E69D` |
| F-03 | Standard-Rechnung | `EA5CAC85` |
| F-05 | Gutschrift | `64BFD7F0` |
| F-06 | Mahnung 1 | `8ECAC2E4` |
| F-07 | Mahnung 2 | `A4E57F73` |
| F-08 | Mahnung 3 | `6ADE8D9A` |
| F-16 | Ergaenzungsgutachten | `A8D05FAB` |
| F-17 | Schiedsgutachten | `37CF6A57` |
| F-18 | Bauabnahme | (siehe MEGA⁴ Q5 F-22-BAUABNAHME) |

**Aufwand fuer MEGA⁹:** ca. 5h fuer 10 weitere Templates (Pattern-Reuse).

Plus: PDFMonkey-Push-Pflicht (Marcel-Manual) fuer alle 15 Templates.

---

## Quality-Bar

- 0 Production-Breaking-Changes
- Pattern-Reuse aus F-09 (485 LOC pro Template)
- Liquid-Bug-Patterns clean (`!= blank` durchgehend)
- IHK-SVO 4-Teile + EU AI Act + § 407a + § 10 IHK-SVO eingehalten

---

*Tier 6 partial done — 5 von 15 weiteren Templates. Rest MEGA⁹.*
