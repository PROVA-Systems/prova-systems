# MEGA³⁷ D01 — OWASP Top 10 2025

**Datum:** 2026-05-08
**Methodik:** Static-Code-Audit, RLS-Verify via Supabase MCP, npm audit.

## Severity

| # | Domäne | Severity | Status |
|---|--------|----------|--------|
| A01 | Broken Access Control (RLS) | 🟢 LOW | 5/5 kritische Tabellen RLS=true |
| A02 | Cryptographic Failures (TLS/Hashes) | 🟢 LOW | HTTPS via Netlify, bcrypt für admin-pw |
| A03 | Injection (SQL/XSS) | 🟡 MEDIUM | Supabase-PostgREST = SQL-safe; XSS-Schutz via escHtml/escapeAttr |
| A04 | Insecure Design | 🟡 MEDIUM | Workspace-Isolation OK; State-Machines z. T. ad-hoc |
| A05 | Security Misconfiguration | 🟢 LOW | netlify.toml-Headers, kein Default-Pwd |
| A06 | Vulnerable Components (npm audit) | 🟢 LOW | 0 high/critical, 0 total moderate |
| A07 | Auth Failures | 🟡 MEDIUM | 2FA (M³² W11) verfügbar, Brute-Force-Schutz via Rate-Limit |
| A08 | Software Integrity (SRI) | 🟡 MEDIUM | CSP setzt nur 'self' + Whitelist; SRI-Tags fehlen für CDN-Scripts |
| A09 | Logging Failures | 🟢 LOW | audit_trail-Tabelle + Sentry |
| A10 | SSRF | 🟢 LOW | URL-Validation in pdf-proxy + foto-upload via Whitelist |

## Top-3-Empfehlungen

1. **A07 Auth:** Force-2FA für Admin-Login (M³² W11 lib vorhanden, aber Pflicht-Toggle prüfen).
2. **A08 SRI:** Subresource-Integrity-Hashes für `https://js.stripe.com`, `https://browser.sentry-cdn.com`, `https://cdn.jsdelivr.net` ergänzen.
3. **A04 Insecure Design:** State-Machine-Audit für Auftrag-Phasen formalisieren (akte-logic.js AKTE_PHASEN ist gut, aber Frontend-Validierung könnte umgangen werden — Server-Side-Phase-Transitionen prüfen).

## Quellen
- OWASP Top 10 2025 Cheatsheet — owasp.org/www-project-top-ten/
- OWASP A08 Software Integrity — cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security
- OWASP A10 SSRF Cheat Sheet — cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention
