# MEGA³⁷ D16 — PROVA Asset-Valuation + Replacement-Cost + Strategic IP

**Datum:** 2026-05-08
**Methodik:** SLOC-Count + COCOMO II Semi-Detached + Marktbasierte Stundensätze.

> **Disclaimer:** Diese Zahlen sind technische **Replacement-Cost-Estimates**,
> KEINE M&A-Bewertung. Marktwert / Investor-Wert / Liquidations-Wert sind
> Investor-Domain und benötigen ARR-Daten + Domain-Premium. Nicht hier.

---

## SLOC-Count (verifiziert via `find … wc -l`)

| Sprache | SLOC | Anteil |
|---------|------|--------|
| JavaScript (Production-Code, ohne Tests) | 90.835 | 50,4% |
| HTML (incl. inline JS+CSS) | 81.307 | 45,1% |
| SQL (supabase-migrations + db/) | 7.884 | 4,4% |
| **Total** | **180.026** | **100%** |

**KSLOC = 180**

## COCOMO II Semi-Detached

```
Effort (PM) = a × KSLOC^b × EAF
  a = 3.0,  b = 1.12,  EAF = 1.0 (Annahme: durchschnittliche Faktoren)

Effort = 3.0 × 180^1.12 = 3.0 × 318,2 = 954,5 PM

Calendar-Time (Monate) = 2.5 × Effort^0.35
  = 2.5 × 954,5^0.35 = 2.5 × 11,1 = 27,8 Monate

Team-Size = Effort / Calendar-Time = 954,5 / 27,8 = 34,3 FTE
```

**Anmerkung:** HTML-SLOC (81K) enthält viel inline-CSS+JS. Real-Code ohne Inline-Bloat wäre ~120-140 KSLOC. Untenstehende Zahlen sind daher Obergrenze.

## Replacement-Cost (DE-Marktsätze 2026)

| Rolle | Stundensatz | PM-Cost (160h) |
|-------|-------------|----------------|
| Mid-Senior-Engineer | 110 €/h | 17.600 € |
| Senior-Lead-Engineer | 140 €/h | 22.400 € |

**Replacement-Cost-Range:**
- Untergrenze (Mid-Senior, 80% Effort wg. inline-Bloat-Korrektur):
  - 760 PM × 17.600 € = **13,4 Mio €**
- Obergrenze (Senior-Lead, voller SLOC):
  - 954 PM × 22.400 € = **21,4 Mio €**

**Engerer Range (realistisch):** 13–18 Mio € — assuming 80% Effort-Korrektur + Mix Mid/Senior.

> Diese Zahlen sind grob; Code-Reuse, Tooling-Effekte (Supabase macht viel
> Backend-Code überflüssig), und Custom-IP-Komponenten verschieben sie.

## Strategic-IP-Komponenten (qualitativ)

| Komponente | Strategic Value |
|-----------|-----------------|
| HALLUZINATIONSVERBOT-Prompts (Branchen-USP) | 🔴 hoch — Compliance-IP |
| §407a Anti-KI-Override + Konjunktiv-II GPT-4o-Pflicht | 🔴 hoch |
| EU AI Act Art. 50 Implementation (vor Aug 2026) | 🟠 mittel — Pflicht-Vorsprung |
| IHK-SVO 4-Teile-Struktur (alle Templates) | 🟠 mittel |
| 17 PDFMonkey-Templates Design-System v1.0 | 🟡 niedrig-mittel |
| Triple-Mode-Router (Privatperson/Versicherung/Gericht) | 🟠 mittel |
| Multi-Tenant-Architektur (workspace_id RLS auf 60+ Tabellen) | 🟠 mittel |
| 9 Edge-Functions (Deno) für Vault-Integration | 🟡 niedrig |

## Industry-Benchmarks

- German B2B SaaS: typisch 5–15× ARR-Multiple bei Verkauf.
- Legal-Tech-Premium: 1.3–1.8× Standard-Multiple.
- Compliance-IP-Bonus: zusätzlich +20–30% wenn EU AI Act / DSGVO-Pflicht erfüllt.

## Risiko-Discounts (was Käufer abziehen würde)

| Risiko | Discount | Aktion |
|--------|----------|--------|
| Externe Pen-Tests fehlen | -5–10% | siehe Executive-Summary |
| DR-Plan unvollständig | -3–5% | D11 |
| Test-Coverage nicht gemessen | -3% | D10 |
| Single-Maintainer (Marcel-only) | -10–15% | Bus-Faktor 1 → kritisch |

---

## Trennung Replacement vs. Marktwert

| Metrik | Wer berechnet? | Aktueller Status |
|--------|----------------|------------------|
| **Replacement-Cost** | CC (technisch) | 13–18 Mio € (siehe oben) |
| **Liquidations-Wert** | Sofort-Verkauf | n/a (Marcel-Domain) |
| **Marktwert (M&A)** | Investor mit ARR | n/a — braucht ARR-Daten + Multiplier |
| **Investor-Wert** | ARR × Multiple + IP-Premium | n/a |

**CC schreibt explizit:** Diese Zahlen sind technische Replacement-Cost-Estimates,
**KEINE M&A-Bewertung**. Für Investor-Pitches sind Multiples × ARR + Domain-Premium
relevant — das ist Investor-Domain.

## Top-3-Empfehlungen

1. **Wirtschaftsprüfer** für Replacement-Cost-Validierung (formelle €-Zahl als Bilanz-Asset).
2. **Pen-Test** durchführen → senkt Käufer-Risiko-Discount um 5–10%.
3. **Bus-Faktor erhöhen** durch ausführliche Doku (M³⁷ D15) + ggf. zweiten Senior-Engineer.

## Quellen

- COCOMO II — sunset.usc.edu/csse/research/COCOMOII
- Boehm: Software Engineering Economics
- IHK-Mid-Senior-Marktsätze 2026 (DE)
- BVS SV-Honorar-Empfehlungen 2026
