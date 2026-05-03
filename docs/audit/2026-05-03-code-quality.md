# Audit 19 — Code-Quality + Dead-Code

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code
**Methodik:** ESLint-Output + manuelle Greps

---

## Tool-Stand

| Tool | Status |
|---|---|
| ESLint | installiert (v10.2.0), Config? — TBD |
| Prettier | nicht installiert |
| TypeScript | nicht genutzt (Vanilla JS per Marcel-Doktrin) |
| knip (unused exports) | nicht installiert |
| depcheck | nicht installiert |

---

## Findings

### MEDIUM-1 — kein .eslintrc.* im Repo

```bash
ls -la .eslintrc* 2>/dev/null
# (nichts)
```

ESLint ist als devDependency installiert, aber ohne Config keine Wirkung. Sollte mit `eslint-plugin-security` aktiviert werden.

**Empfehlung-Skeleton** `.eslintrc.json`:
```json
{
  "env": { "browser": true, "node": true, "es2022": true },
  "extends": ["eslint:recommended"],
  "plugins": ["security"],
  "rules": {
    "no-eval": "error",
    "no-implied-eval": "error",
    "security/detect-object-injection": "warn"
  }
}
```

**Severity:** MEDIUM
**Status:** BACKLOG (Folge-Sprint)

### MEDIUM-2 — Vermutlicher Tot-Code

Aus früheren Audits bekannt:
- `auth-token-issue.js` (Login-Tot-Code post-K-1.5, NACHT-PAUSE)
- `invite-user.js` (Netlify-Identity-API, post-K-1.5 tot)
- `foto-upload.js` (Airtable-Storage, post-Voll-Cleanup tot)
- `airtable-Refs in ~68 Frontend-Files` (Tot-Code-Strings, durch prova-fetch-auth.js geblockt — Voll-Cleanup-Sprint dokumentiert)

**Action:** in Sprint 11+ (Logic-Files-Sweep) auflösen.

**Severity:** MEDIUM (Wartungs-Aufwand, kein Security-Issue)

### LOW-1 — Inkonsistente Async/Await-Patterns

Manche Functions nutzen Promise-Chains, andere async/await. Stilkonsistenz fehlt — keine Sicherheits-Implikation.

### LOW-2 — Console.log statt prova-logger

Mehrere Functions nutzen `console.log` statt `lib/prova-logger.js`. Logging-Stil inkonsistent.

---

## SBOM (Software Bill of Materials)

**Tool-Empfehlung:** `cyclonedx-npm`:
```bash
npx -y @cyclonedx/cdxgen@latest -o sbom.json
```

Aufwand: ~5 Min. Liefert CycloneDX-Format für Pentest-Briefing.

→ Marcel-Pflicht-Aktion (in BACKLOG).

---

## Findings → BACKLOG

| ID | Severity | Titel | Action |
|---|---|---|---|
| CQ-01 | MED | .eslintrc + security-plugin | BACKLOG |
| CQ-02 | MED | Tot-Code-Cleanup (Sprint 11+) | bekannter Backlog |
| CQ-03 | LOW | Async-Style-Konsistenz | BACKLOG |
| CQ-04 | LOW | Logger-Konsistenz (prova-logger statt console) | BACKLOG |
| CQ-05 | INFO | SBOM erzeugen vor Pentest | NEEDS-MARCEL |

---

*Audit 19 abgeschlossen 03.05.2026*
