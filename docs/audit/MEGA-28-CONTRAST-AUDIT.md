# Kontrast-Audit MEGA²⁸ W1-I8

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7 (1M context)
**Methodology:** Statische CSS-Analyse via Grep + Color-Math (CC als senior product designer)
**Live-Browser-Tools (axe-core/Pa11y):** nicht installiert in CC-Environment, daher Static-Audit

---

## Methodology

WCAG-AA-Vorgabe:
- Normaler Text: 4.5:1 Kontrast
- Großer Text (≥18pt regular oder ≥14pt bold): 3:1
- UI-Elemente + Icons: 3:1

CSS-Variablen-Audit aus den Hauptseiten:

```css
/* PROVA Standard-Theme (Dark) */
--bg:        #0b0d11;  /* sehr dunkel */
--bg2:       #111318;
--bg3:       #161a22;
--surface:   #1c2130;
--surface2:  #232a3a;

--text:      #eaecf4;  /* hell, primär */
--text2:     #8b93ab;  /* mittel-hell, sekundär */
--text3:     #4d5568;  /* dunkler-grau, tertiär */

--accent:    #4f8ef7;  /* PROVA-Blau */
--accent2:   #3a7be0;
--success:   #10b981;
--warning:   #f59e0b;
--danger:    #ef4444;
```

---

## Kontrast-Berechnung (relevante Paare)

### Text auf Backgrounds

| Vordergrund | Hintergrund | Ratio (geschätzt) | Status |
|---|---|---|---|
| #eaecf4 (text)  | #0b0d11 (bg)       | ~16:1 | ✅ AAA |
| #eaecf4 (text)  | #1c2130 (surface)  | ~12:1 | ✅ AAA |
| #8b93ab (text2) | #0b0d11 (bg)       | ~6.5:1 | ✅ AA |
| #8b93ab (text2) | #1c2130 (surface)  | ~5.0:1 | ✅ AA |
| **#4d5568 (text3)** | **#0b0d11 (bg)** | **~3.0:1** | ⚠️ AA NUR für große Texte |
| **#4d5568 (text3)** | **#1c2130 (surface)** | **~2.4:1** | 🔴 UNTER AA |

### Buttons / Accent

| Element | Background | Status |
|---|---|---|
| #fff (CTA-Button-Text) | #4f8ef7 (accent) | ~3.8:1 ⚠️ Großer Text OK, kleiner zu wenig |
| #4f8ef7 (Link) | #1c2130 (surface) | ~3.7:1 ⚠️ |

### Status-Badges

| Vordergrund | Hintergrund | Status |
|---|---|---|
| #34d399 (success-light) | rgba(16,185,129,.12) | ~4.8:1 ✅ AA |
| #f87171 (danger-light) | rgba(239,68,68,.12) | ~4.5:1 ✅ AA Grenze |
| #fbbf24 (warning-light) | rgba(245,158,11,.12) | ~5.2:1 ✅ AA |

---

## 🔴 KRITISCHE FINDINGS

### Finding #1: `--text3` (#4d5568) auf hellen Surface-Backgrounds

**Risiko:** Tertiär-Text (Sub-Labels, Datums-Hinweise, Badge-Subtitles) liegt unter WCAG-AA bei `surface`-Hintergrund (#1c2130). Verhältnis ~2.4:1 — schwer lesbar bei normalem Text.

**Wo betroffen:**
- `.sf-table tbody tr td` (color: var(--text2)) — bei verschachtelten Sub-Texten mit text3
- `.kpi-sub` in Admin-Cockpit
- `.empty-state .desc` 
- Footer/Disclaimer-Texte

**Empfehlung:** `--text3` von #4d5568 → **#6b7280** anheben → ~3.5:1 auf surface (akzeptabel für Hilfstexte mit ≥14pt).

### Finding #2: PROVA-Accent (#4f8ef7) auf Surface

**Risiko:** Link-Farbe + CTA-Buttons mit weißem Text auf #4f8ef7 sind im 3.7:1-Bereich. Für kleinen Text (<14pt regular) unter AA.

**Empfehlung:** Bei kleinen Buttons + Sub-Links → font-weight: 600 nutzen + min-font-size 14px (bereits Marcel-Spec für Touch-Targets).

### Finding #3: Markenfarben nicht gefährdet

`#4f8ef7` PROVA-Blau ist Marcel's Brand-Decision. Audit empfiehlt:
- KEIN Wechsel der Brand-Farbe
- Nutzung mit weißem Text + Bold-Weight + Min-14pt (Standard-Pattern)
- Decision-Log: Markenfarbe akzeptabel mit Pattern-Constraints

---

## 🟢 SICHER (keine Action)

- Haupt-Text (#eaecf4) auf allen Backgrounds: AAA
- Sekundär-Text (#8b93ab) auf bg/surface: AA
- Status-Badges (success/warning/danger) auf alpha-Backgrounds: AA

---

## Quick-Fixes umgesetzt

KEINE Quick-Fixes ohne Marcel-OK — Markenfarben + bewusste Design-Entscheidungen.

**Decision-Log:** `--text3` Korrektur erfordert Marcel-Decision (Brand-Hierarchie-Wechsel von 3-Tier auf 2-Tier wenn text3 angehoben).

---

## Marcel — Action-Items

### 🟡 EMPFOHLEN
1. **`--text3` Anpassung** auf #6b7280 (statt #4d5568) für 3.5:1 Mindest-Ratio
2. **Globaler CSS-Refactor** — alle `var(--text3)`-Stellen prüfen auf Lesbarkeit
3. **Button-Audit:** kleine CTAs auf font-size:14px + font-weight:600 fixieren

### 🔵 OPTIONAL (nice-to-have)
4. **axe-core CLI** in Dev-Setup integrieren für automatisierte Lighthouse-Runs post-MEGA²⁸
5. **Alt-Theme:** Light-Mode-Variante für Print/Outdoor-Use (Sprint nach Pilot)

---

## Limits dieses Audits

- ❌ Keine Live-Browser-Verification (axe-core/Pa11y nicht verfügbar in CC-Env)
- ❌ Keine ARIA-Audit (separate Sprint)
- ❌ Keine Focus-State-Color-Audit
- ❌ Keine Image-Alt-Text-Audit
- ✅ Statische CSS-Color-Math + Senior-Product-Designer-Bewertung

---

*MEGA²⁸ W1-I8 — Static Contrast Audit (CTO-Sicht ohne Live-Tooling)*
