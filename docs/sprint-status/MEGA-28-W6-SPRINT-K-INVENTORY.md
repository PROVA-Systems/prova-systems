# MEGA²⁸ W6-I5 — Sprint K Tranche-1 Inventory

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7
**Status:** **NUR INVENTORY** — Build erfolgt in Welle 7 mit ≥10-Quellen-Recherche pro Template
**Trigger:** Memory 19.04.2026 — "7 Templates haben falsche §1-§6-Struktur statt IHK-SVO 4-Teil"

---

## TL;DR

**Befund Re-Audit:** Memory-Inhalt teilweise outdated. Zwischen 19.04. und 10.05. wurden 12+ Gutachten-Templates auf IHK-SVO 4-Teil migriert. Die "Tranche-1"-Liste sieht heute anders aus.

**Heute identifiziert:** 7 Templates ohne `.liquid.template.html`-Variante (= keine Liquid-Conversion erfolgt) und/oder mit fehlender Migration:

| # | Template | Status | Aufwand |
|---|---|---|---|
| 1 | F-04-KURZSTELLUNGNAHME | ✅ 4-Teil ja, ❌ kein Liquid | 1.5h |
| 2 | F-16-ERGAENZUNG | ✅ 4-Teil ja, ❌ kein Liquid | 1.5h |
| 3 | F-17-SCHIEDSGUTACHTEN | ✅ 4-Teil ja, ❌ kein Liquid | 2h (recherche-intensiv) |
| 4 | F-18-BAUABNAHME | ✅ 4-Teil ja, ❌ kein Liquid (parallel F-22-BAUABNAHME hat .liquid — Doppelung?) | 2h + Doppelung-Klärung |
| 5 | F-19-WERTGUTACHTEN | ✅ 4-Teil ja, ❌ kein Liquid | 2h (ImmoWertV-Spezifika) |
| 6 | PROVA-GUTACHTEN-SOLO | ❓ Master-Template (Solo-Tier) | Klärung Marcel |
| 7 | PROVA-GUTACHTEN-TEAM | ❓ Master-Template (Team-Tier) | Klärung Marcel |

**Total Aufwand:** ~10-12h (eigener Sprint Welle 7)

---

## Detail pro Template

### 1. F-04-KURZSTELLUNGNAHME
- **Aktueller Stand:** IHK-SVO 4-Teil-Struktur ✅ (Teil 1-4 mit 8 Erwähnungen, §-Pattern 0)
- **Lücke:** keine `.liquid`-Variante für PDFMonkey-Rendering
- **Recherche-Bedarf:** Kurzstellungnahme-Spezifika (BGH NJW 2014, 1452), Konjunktiv-II-Pflicht in Teil 3
- **Welle-7-Aufwand:** 1.5h Liquid-Conversion + Test + Marcel-PDFMonkey-Sync

### 2. F-16-ERGAENZUNG
- **Aktueller Stand:** 4-Teil ✅ (12 Erwähnungen)
- **Lücke:** keine `.liquid`-Variante
- **Recherche-Bedarf:** §407a Abs. 4 ZPO Ergänzungsgutachten-Spezifika
- **Welle-7-Aufwand:** 1.5h

### 3. F-17-SCHIEDSGUTACHTEN
- **Aktueller Stand:** 4-Teil ✅ (10 Erwähnungen) + 3 §-Pattern (Mischung)
- **Lücke:** keine `.liquid`-Variante + `§-Pattern` zu prüfen ob legacy-Reste
- **Recherche-Bedarf:** §1029 ff. ZPO Schiedsverfahren, Schiedsgutachten vs. Schiedsgericht (Abgrenzung)
- **Welle-7-Aufwand:** 2h (recherche-intensiv)

### 4. F-18-BAUABNAHME
- **Aktueller Stand:** 4-Teil ✅ (9 Erwähnungen) + 5 §-Pattern (Mischung)
- **Lücke:** keine `.liquid`-Variante. **Doppelung-Verdacht:** F-22-BAUABNAHME.liquid.template.html existiert parallel.
- **Recherche-Bedarf:** VOB/B §12 Abnahme + BGB §640
- **Welle-7-Aufwand:** 2h + Marcel-Klärung F-18 vs F-22

### 5. F-19-WERTGUTACHTEN
- **Aktueller Stand:** 4-Teil ✅ (15 Erwähnungen)
- **Lücke:** keine `.liquid`-Variante
- **Recherche-Bedarf:** ImmoWertV §1-§40, BelWertV §16, BauGB §194 (Verkehrswert), DIN EN 16341 (Asset Valuation)
- **Welle-7-Aufwand:** 2h (Wertgutachten-Spezifika sind eigenes Sub-Recherche-Feld)

### 6. PROVA-GUTACHTEN-SOLO
- **Aktueller Stand:** Master-Template für Solo-Tier (€149)
- **Frage Marcel:** Ist das ein eigenständiges Template oder Master-Wrapper für andere F-XX-Templates?
- **Welle-7-Aufwand:** TBD nach Marcel-Klärung

### 7. PROVA-GUTACHTEN-TEAM
- **Aktueller Stand:** Master-Template für Team-Tier (€279)
- **Frage Marcel:** wie SOLO. Doppelung oder echte Tier-Unterschiede?
- **Welle-7-Aufwand:** TBD nach Marcel-Klärung

---

## Marcel — Klärungs-Liste (vor Welle 7)

1. **F-18 vs F-22 BAUABNAHME:** zwei Files, einer mit .liquid, einer ohne. Konsolidieren oder beide aktiv?
2. **PROVA-GUTACHTEN-SOLO/TEAM:** Master-Wrapper oder eigenständige Templates? Falls Wrapper → Welle 7 baut nur F-04..F-19 als .liquid.
3. **§-Pattern-Reste in F-14/F-17/F-18:** Legacy-Reste oder bewusste § im Kontext (z.B. "§ 2 BGB" als Rechts-Verweis)?

---

## Welle-7-Plan-Skizze (Carry-Over)

### Phase A — Marcel-Klärung (15 Min, async)
Marcel beantwortet die 3 Fragen oben.

### Phase B — Liquid-Conversion (5x 1.5-2h)
Pro Template:
1. Recherche: ≥10 Quellen pro Spezifik (z.B. ImmoWertV für F-19)
2. Liquid-Variante schreiben mit Variablen-Substitution
3. Audit-Block-Comment mit Recherche-Quellen
4. Test (struktur + Compliance)
5. PDFMonkey-Sync (Marcel-Manual)

### Phase C — Cleanup
- Legacy-§-Pattern-Reste entfernen falls notwendig
- F-18/F-22 Doppelung klären

### Total Welle 7 Aufwand
~10-12h für Liquid-Conversion + Recherche.
Aus Spec: separate Welle, recherche-intensiv.

---

## Recherche-Quellen pro Template (Skizze)

### F-19-WERTGUTACHTEN (recherche-intensivste)
1. ImmoWertV (Immobilienwertermittlungsverordnung) §1-§40
2. BelWertV (Beleihungswertermittlungsverordnung) §16
3. BauGB §194 Verkehrswert-Definition
4. DIN EN 16341 Asset Valuation Standards
5. BGH NJW 2018 Wertermittlungs-Rechtsprechung
6. Vergleichswertverfahren §15 ImmoWertV
7. Ertragswertverfahren §17 ImmoWertV
8. Sachwertverfahren §21 ImmoWertV
9. Bewertungsstichtag §3 ImmoWertV
10. Sachverständigen-Pflichten ImmoWertV §13

### F-17-SCHIEDSGUTACHTEN
1. §1029 ZPO Schiedsvereinbarung
2. §1042 ZPO Schiedsverfahren
3. §1051 ZPO Anwendbares Recht
4. BGH NJW 2017 Schiedsgutachten-Abgrenzung
5. DIS-Schiedsgerichtsordnung
6. Sachverständige als Schiedsrichter (§1042 Abs. 4)
7. Schiedsgutachten vs. Schiedsgericht (Lehrbuch Geimer)
8. Streitwert-Berechnung in Schiedsverfahren
9. Anfechtbarkeit Schiedsgutachten §319 BGB
10. ICC-Rules zum Vergleich

(weitere Templates analog mit ≥10 Quellen pro Spezifik in Welle 7)

---

## Constraints für Welle 7

- ≥10 Quellen pro Template (Recherche-Pflicht-Compliance, CLAUDE.md)
- ≥1 Test pro Template (Liquid-Render + Struktur-Verify)
- Marcel-PDFMonkey-Sync-Doku pro Template
- KI-Disclosure-Box-Partial (W3-I5) integrieren
- Decision-Log bei Mehrdeutigkeit

---

## NICHT in Welle 6 (per Spec)

- ❌ Liquid-Conversion (Sprint K Tranche-1 Build = Welle 7)
- ❌ Recherche-Phase (>= 10 Quellen pro Template = Welle 7)
- ❌ PDFMonkey-Sync (Marcel-Manual nach Welle 7)

---

*MEGA²⁸ W6-I5 Inventory — Welle 7 hat klaren Plan, Aufwand-Schätzung 10-12h.*
