# Audit 20 — Lighthouse Performance + Accessibility

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code (Skript-vorbereitet, Marcel führt Lauf durch)
**Methodik:** Lighthouse CLI gegen Top-10-Pages

---

## Status: NEEDS-MARCEL

Lighthouse-Lauf erfordert Browser-Headless (Puppeteer/Chrome), kann ich aus Sandbox nicht zuverlässig ausführen. Marcel führt Lauf nach Stripe-Verify durch.

---

## Marcel-Lauf-Anleitung

### 1. Lighthouse CLI installieren
```bash
npm install -g lighthouse
```

### 2. Top-10-Pages Lauf
```bash
mkdir -p .lighthouse-reports

PAGES=(
  "https://prova-systems.de/"
  "https://app.prova-systems.de/login"
  "https://app.prova-systems.de/dashboard"
  "https://app.prova-systems.de/akte"
  "https://app.prova-systems.de/kontakte"
  "https://app.prova-systems.de/briefe"
  "https://app.prova-systems.de/rechnungen"
  "https://app.prova-systems.de/einstellungen"
  "https://app.prova-systems.de/profil"
  "https://app.prova-systems.de/normen"
)

for url in "${PAGES[@]}"; do
  name=$(echo "$url" | sed 's|https://||;s|/|_|g')
  lighthouse "$url" \
    --output html --output-path ".lighthouse-reports/${name}.html" \
    --chrome-flags="--headless --no-sandbox" \
    --only-categories=performance,accessibility,best-practices,seo
done
```

### 3. Zielwerte (laut Sprint-Prompt)

| Kategorie | Zielwert | PROVA-Zielgruppe |
|---|---|---|
| Performance | ≥ 85 | SVs sind oft mobil unterwegs |
| Accessibility | ≥ 95 | SVs sind 35-65 Jahre, brauchen gute Kontraste |
| Best-Practices | ≥ 90 | Moderne Web-Standards |
| SEO Landing | ≥ 95 | für `prova-systems.de` |

### 4. Auswertung

```bash
# JSON-Output für Maschinen-Auswertung:
lighthouse "$url" --output json --output-path "report.json" --quiet
jq '.categories | {perf: .performance.score, a11y: .accessibility.score, bp: .["best-practices"].score, seo: .seo.score}' report.json
```

---

## Erwartete Findings (Vorab-Schätzung basierend auf Code-Review)

### Performance
- **Wahrscheinlich gut** — Vanilla-JS, keine schwere Framework-Bundles
- Service-Worker-Cache aktiv (sw.js v252)
- Mögliche Issues:
  - LCP (Largest Contentful Paint): wenn Hero-Bilder auf LANDING groß
  - CLS (Cumulative Layout Shift): wenn Schriftgrößen-Sprünge

### Accessibility
- **Wahrscheinlich Mittel** — SV-Zielgruppe (35-65) braucht beste Kontraste
- Mögliche Issues:
  - Color-Kontrast-Verhältnisse (WCAG AA: 4.5:1 für normalen Text)
  - Touch-Target-Größen (44×44 px Mindest-Größe — Marcel hat das in Design-Prinzipien)
  - ARIA-Labels für Icon-Buttons

### Best-Practices
- **Wahrscheinlich gut** — moderne Headers (Phase 1.9 COOP/COEP/CORP)
- HTTPS überall, kein Mixed-Content
- CSP gesetzt (Phase 1.9)

### SEO (Landing)
- Meta-Tags? OG-Tags?
- Strukturierte Daten?
- robots.txt + sitemap.xml?

---

## Marcel-Pflicht-Aktion

- [ ] Lighthouse-Lauf gegen 10 Pages durchführen
- [ ] Reports in `.lighthouse-reports/` committen (nicht in git, lokal speichern)
- [ ] Findings in `docs/audit/2026-05-03-lighthouse-results.md` ergänzen
- [ ] HIGH-Findings in BACKLOG mit Severity

---

## Zusammenfassung

**Status:** Audit-Anleitung bereit. Marcel führt Lauf durch.

→ in BACKLOG: `LH-01 Lighthouse-Lauf Top-10-Pages`

---

*Audit 20 abgeschlossen 03.05.2026 (Anleitung) · Marcel führt Live-Lauf durch*
