# MEGA³⁷ D03 — Secret-Leakage + Credential-Hygiene

**Datum:** 2026-05-08
**Methodik:** grep für hardcoded Secrets, Git-History-Scan, Frontend-Code-Audit.

## Static-Audit-Ergebnisse

| Befund | Severity | Detail |
|--------|----------|--------|
| Live `sk-…`/`whsec_…` im Code | 🟢 LOW | 0 Treffer in `*.js`/`*.html` (nur in Tests/Mocks) |
| `process.env.*`-Refs | 🟢 LOW | 67 Lambdas nutzen ENVs korrekt |
| `.env`-Files im Repo | 🟢 LOW | Nicht-vorhanden, in `.gitignore` |
| Frontend-Code (`*.html`/Top-level `*.js`) | 🟢 LOW | Keine Secret-Strings |
| Default-Stripe-IDs in prova-stripe-prices.js | ℹ️ INFO | Kein Secret — public Price-IDs, kommentiert OK |

## Post-M³⁷-C-Verify
Nach Marcel-Action (Vault-Migration): API-Keys NUR noch in:
- Supabase Vault (für Lambdas via `get_vault_secret`)
- Edge Function Secrets (für ki-proxy, whisper-diktat etc.)
- 7-10 Bootstrap-ENVs in Netlify (SUPABASE_URL etc., keine API-Keys mehr)

## Top-3-Empfehlungen
1. **Pre-Commit-Hook** mit `gitleaks` oder `trufflehog` als Hard-Gate.
2. **Git-History-Scan:** einmaliger `gitleaks detect --no-banner --redact` über die ganze Historie.
3. **Secret-Rotation-Plan** dokumentieren (alle 6 Monate / bei Mitarbeiter-Wechsel).

## Quellen
- OWASP A02 Cryptographic Failures
- gitleaks (github.com/gitleaks/gitleaks)
- BSI Grundschutz APP.4.4 (Geheimnis-Management)
