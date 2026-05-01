# Audit 6 — Dependency-Vulnerability-Scan

**Datum:** 02.05.2026
**Sprint:** S6 Phase 1
**Auditor:** Claude Code
**Methodik:** `npm audit --json` + `npm outdated`

---

## npm-audit-Ergebnis

```
Total: 1 vulnerability
  HIGH:     1
  MODERATE: 0 (im selben Paket aber durch HIGH überdeckt)
  LOW:      0
  CRITICAL: 0
```

**Dependencies:** prod=63, dev=70, optional=1, total=132

---

## Findings

### HIGH-1 — `nodemailer@6.10.1` (Direct, prod)

| Punkt | Wert |
|---|---|
| Package | `nodemailer` |
| Version Current | `6.10.1` |
| Version Fixed | `8.0.7` (semver-major-Bump) |
| Verwendung | `netlify/functions/smtp-senden.js`, `netlify/functions/termin-reminder.js` |
| Direct/Transitive | direct |

**Vulnerabilities (4 in der Version-Range):**

| Source | Title | Severity | CVSS | CVE/GHSA |
|---|---|---|---|---|
| 1109804 | Email to unintended domain (Interpretation Conflict) | moderate | – | GHSA-mm7p-fcc7-pg87 |
| 1113165 | **addressparser DoS via recursive calls** | **HIGH** | **7.5** | GHSA-rcmh-qjqh-p98v |
| 1115470 | SMTP command injection via envelope.size | low | – | GHSA-c7w3-x93f-qmm8 |
| 1116270 | SMTP command injection CRLF in EHLO/HELO | moderate | 4.9 | GHSA-vvjj-xcjg-gr5g |

**Attack-Surface in PROVA:**

`smtp-senden.js:85` ruft `transporter.sendMail({to, ...})` mit `to` aus Request-Body. Authentifizierter User kann ein crafted `to`-Feld einsenden um den `addressparser` rekursiv aufzurufen (DoS). Auswirkung:
- Netlify-Function-Timeout (10s default) → 504-Response
- Netlify-Function-Billing erhöht (consumed function-seconds)
- Andere User nicht direkt betroffen (Function-Instances stateless, Netlify auto-scales)

**Reduzierter Impact in PROVA-Kontext:**
- ✅ `requireAuth` schützt vor anonymen Angreifern
- ✅ Netlify-Function-Timeout limitiert Auswirkung pro Call
- ⚠️ Per-User-Rate-Limit für `smtp-senden` muss verifiziert werden (Audit 9 Phase 2)

**Andere 3 Vulns:**
- `envelope.size` (low) — wir setzen `envelope` nicht in `sendMail()`-Aufruf, nicht ausnutzbar
- `EHLO/HELO`-CRLF (moderate) — wir setzen `name` nicht in `createTransport()`, nicht ausnutzbar (wir nutzen nur `host`, `port`, `auth`, `tls`)
- Email-to-unintended-domain (moderate) — komplexer Edge-Case, nicht direkt ausnutzbar in unserer Verwendung

**Severity-Bewertung:** **HIGH** (DoS gegen Function ist real, auch wenn limitiert)

---

## Empfohlene Fixes

### Fix 1 — `nodemailer` upgrade auf 8.0.7

```bash
npm install nodemailer@^8.0.7
```

**Breaking Changes 6.x → 8.x prüfen:**
- `nodemailer 7.x`: Node.js >= 18 Pflicht (✅ wir sind auf v24 lokal, Netlify Functions auf v18+)
- `nodemailer 8.x`: TypeScript-Definitions verbessert (kein Code-Impact für JS-Files)
- API-Aufruf `createTransport()` und `sendMail()` Signature unverändert ✅
- Verwendete Optionen in PROVA (`host`, `port`, `secure`, `auth`, `tls.rejectUnauthorized`) alle weiterhin supported ✅

**Risiko-Bewertung:** niedrig. Beide Verwendungen (`smtp-senden`, `termin-reminder`) nutzen Standard-API.

**Verifikation nach Fix:**
- `node --check netlify/functions/smtp-senden.js`
- `node --check netlify/functions/termin-reminder.js`
- Netlify-Build muss grün bleiben
- Manueller Test: SMTP-Mail-Versand aus Einstellungen-Page (Marcel)

---

## Outdated-Packages (nicht-Security)

| Package | Current | Latest | Severity | Action |
|---|---|---|---|---|
| `@supabase/supabase-js` | 2.105.0 | 2.105.1 | INFO | Patch-Update bei Gelegenheit |
| `bcryptjs` | 2.4.3 | 3.0.3 | LOW | Major-Bump prüfen — derzeit Admin-Password-Hash, breaking-change-Risiko |
| `eslint` | 10.2.0 | 10.3.0 | INFO | dev-dep, Patch-Update OK |
| `nodemailer` | 6.10.1 | 8.0.7 | **HIGH** | siehe Fix 1 |
| `stripe` | 14.25.0 | 22.1.0 | LOW | Major-Bump in Folge-Sprint, API-Breaking-Changes |

---

## SBOM (Software Bill of Materials)

**Tool-Hinweis:** `cyclonedx-npm` nicht installiert. Alternative: `npm ls --json` produziert maschinenlesbare Dependency-Liste.

```bash
# Empfehlung Folge-Sprint:
npx -y @cyclonedx/cdxgen@latest -o sbom.json
```

**Aufwand:** ~5 Min. Liefert CycloneDX-Format-SBOM (Industry-Standard, Anforderung mancher Pentest-Auftraggeber).

→ Marcel-Pflicht-Aktion: optional vor erstem Pentest SBOM erzeugen + Auditor mitgeben.

---

## Severity-Zusammenfassung

| Severity | Anzahl | Action |
|---|---:|---|
| CRITICAL | 0 | – |
| HIGH | 1 | **Fix Phase 1.9**: `nodemailer` upgrade auf 8.0.7 |
| MEDIUM | 0 | – |
| LOW | 2 | Stripe + bcryptjs Major-Bumps in Folge-Sprint |
| INFO | 2 | Patch-Updates bei Gelegenheit |

---

## Reproduktion

```bash
npm audit --json > audit.json
npm outdated
```

---

## CI-Empfehlung

**Folge-Sprint:** GitHub-Action `npm-audit` als wöchentlicher Cron + bei jedem PR. Beispiel-Workflow:

```yaml
# .github/workflows/security-audit.yml
name: Weekly Security Audit
on:
  schedule:
    - cron: '0 8 * * 1'  # Montag 8:00 UTC
  pull_request:
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm audit --audit-level=high
```

→ Ergänzt in `docs/audit/MARCEL-PFLICHT-AKTIONEN.md` als „CI-Integration"-Punkt.

---

*Audit 6 abgeschlossen 02.05.2026 nachmittags*
