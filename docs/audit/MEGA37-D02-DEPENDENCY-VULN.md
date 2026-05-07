# MEGA³⁷ D02 — Dependency-Vulnerabilities + Supply Chain

**Datum:** 2026-05-08
**Methodik:** `npm audit --production` + `npm outdated`

## npm audit (Production)

```
critical:  0
high:      0
moderate:  0
low:       0
total:     0
```

✅ Saubere Production-Dependency-Bilanz.

## Dev-Dependencies
Total Findings: 205 (im Test-Scope, betreffen nicht das Production-Bundle).

## Severity

| Befund | Severity | Empfehlung |
|--------|----------|------------|
| Production: 0 vulns | 🟢 LOW | Status-Quo halten — `npm audit` als CI-Gate |
| Dev: 205 (low/moderate) | 🟡 MEDIUM | Dev-Tools hochziehen (eslint, etc.) — kein Pilot-Blocker |
| SRI fehlt für CDN-Scripts | 🟡 MEDIUM | siehe D01-A08 |
| Lockfile-Integrity | 🟢 LOW | package-lock.json ist im Repo, `npm ci` nutzt ihn |

## Top-3-Empfehlungen
1. **CI-Gate:** `npm audit --production --audit-level=high` als pflicht-Check für PR-Merges.
2. **Lockfile-Hash-Verify:** GitHub-Actions-Step `npm ci` (statt `npm install`) erzwingt Lockfile-Match.
3. **Dependabot/Renovate** für automatische Dependency-Updates aktivieren.

## Quellen
- npm audit docs — docs.npmjs.com/cli/v10/commands/npm-audit
- OWASP A06 — cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management
