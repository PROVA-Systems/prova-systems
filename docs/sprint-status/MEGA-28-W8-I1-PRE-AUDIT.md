# MEGA²⁸ W8-I1 — Pre-Audit Sprint K Tranche-1

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7
**Branch:** `welle-8-sprint-k`
**Trigger:** W6-I5 Inventory + W7-I5 Klärung — vor Template-Build

---

## TL;DR

**Wichtige Korrektur zum Memory:** Die 5 Tranche-1-Templates haben **bereits IHK-SVO 4-Teil-Struktur** im Code. Die `§-Pattern`-Hits sind RECHTS-VERWEISE (z.B. "§ 1029 ZPO", "§ 194 BGB"), KEINE Strukturierungs-§§.

**Was wirklich fehlt:** `.liquid.template.html`-Varianten für PDFMonkey-Variable-Substitution.

| Template | 4-Teil-Marker | §-Pattern (Rechts-Verweise) | .liquid-Variante | Aufwand |
|---|---|---|---|---|
| F-04-KURZSTELLUNGNAHME | 8× ✅ | 5× | ❌ fehlt | 1.5h |
| F-16-ERGAENZUNG | 12× ✅ | 13× | ❌ fehlt | 1.5h |
| F-17-SCHIEDSGUTACHTEN | 10× ✅ | 15× | ❌ fehlt | 2h |
| F-18-BAUABNAHME | 9× ✅ | 19× | ❌ fehlt | 2h |
| F-19-WERTGUTACHTEN | 15× ✅ | 13× | ❌ fehlt | 2h |

**Sprint-Definition aktualisiert:** "Migration auf 4-Teil" → bereits done. Welle 8 baut **Liquid-Varianten** (Variable-Substitution für PDFMonkey-Sync).

---

## Detail pro Template

### F-04-KURZSTELLUNGNAHME (1.5h)
**Code-Stand:** Static-HTML mit Sample-Daten. 4-Teil-Struktur ✅.
**Liquid-Bedarf:** Standard-SV-Variablen (sv_name, az, datum, etc.) + Schadens-Spezifika.
**Recherche-Bedarf:** Kurzstellungnahme-Spezifika (BGH NJW 2014, 1452).

### F-16-ERGAENZUNG (1.5h)
**Code-Stand:** §-Pattern hat 13× — vermutlich "§ 411a ZPO Ergänzungsgutachten", "§ 412 ZPO" — Rechts-Verweise, KEINE Struktur-§§.
**Liquid-Bedarf:** Ergänzungs-Verweis auf Original-Gutachten + Beweisfragen-Adressierung.
**Recherche-Bedarf:** §407a Abs. 4 ZPO + §411a ZPO + §412 ZPO.

### F-17-SCHIEDSGUTACHTEN (2h)
**Code-Stand:** §-Pattern 15× — Rechts-Verweise (§1029 ZPO, §317 BGB, §319 BGB).
**Liquid-Bedarf:** Schieds-spezifische Klauseln (Bindungswirkung, Anfechtbarkeit).
**Recherche-Bedarf:** §1029 ff. ZPO Schiedsverfahren + Schiedsgutachten-Abgrenzung BGH.

### F-18-BAUABNAHME (2h)
**Code-Stand:** §-Pattern 19× — VOB/B §12, BGB §640, DIN-Verweise.
**Liquid-Bedarf:** Abnahme-Status, Mängel-Liste, Abnahme-Vorbehalte.
**Recherche-Bedarf:** VOB/B §12 + BGB §640 + DIN 18299.

### F-19-WERTGUTACHTEN (2h) — **REFERENCE-IMPLEMENTATION**
**Code-Stand:** §-Pattern 13× — ImmoWertV, BauGB §194, BVS-Verweise.
**Liquid-Bedarf:** ImmoWertV-Variablen (Bewertungsstichtag, Vergleichswert/Sachwert/Ertragswert, Marktwert).
**Recherche-Bedarf:** ImmoWertV 2021 + BauGB §194 + IDW S 1 + BGH-Genauigkeitsmarge.

→ Detail-Recherche in `MEGA-28-W8-T5-RECHERCHE-F19.md`.

---

## Sprint-Plan-Update für Welle 8

### Phase A — Pre-Audit (W8-I1) ✅ DONE
Status-Korrektur: 4-Teil-Migration nicht nötig, Liquid-Conversion ist der echte Sprint-K-Auftrag.

### Phase B — F-19 als Reference (W8-I2)
- Recherche ≥10 Quellen ✅ (siehe `MEGA-28-W8-T5-RECHERCHE-F19.md`)
- Liquid-Variante `F-19-WERTGUTACHTEN.liquid.template.html`
- Test (Struktur + Variable-Substitution)

### Phase C — F-04 + F-16 + F-17 + F-18 (Welle 8b, separate Sessions)
Pro Template eigene Recherche-Doku + Liquid-Conversion.

### Phase D — admin-cockpit Sektionen 7+12 (W8-I7)
Lambda-Bau + Frontend-Live-Fetch.

### Phase E — Final-Doku + Master-Sync (W8-I8)

---

## Cap-Strategie für diese Session

Realistisch in 30-40 Min:
- ✅ W8-I1 Pre-Audit (DIESE Doku)
- ✅ W8-T5 Recherche-Doku F-19 (≥10 Quellen)
- ✅ W8-I2 F-19 Liquid-Variante als Reference

**Welle 8b (next session):**
- W8-I3..I6: F-04 + F-16 + F-17 + F-18 Liquid-Conversion
- W8-I7: admin-cockpit Sektionen 7+12
- W8-I8: Final + sw.js v310

---

*MEGA²⁸ W8-I1 Pre-Audit — Sprint-Definition korrigiert (Liquid-Conversion statt 4-Teil-Migration), F-19 als Reference-Implementation in dieser Session.*
