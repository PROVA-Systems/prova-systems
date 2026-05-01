# PROVA Audit-Findings Backlog

**Stand:** 02.05.2026 (Sprint S6 Phase 1)
**Aktualisiert von:** Claude Code nach jedem Audit
**Severity:** CRITICAL > HIGH > MEDIUM > LOW > INFO

---

## CRITICAL (sofort fixen)

*(keine Findings)*

---

## HIGH (vor Pilot fixen)

| ID | Audit | Titel | Status | Phase-1.9-Fix |
|---|---|---|---|---|
| H-01 | A8 CORS | Subdomain-Confusion via `startsWith` in `cors-helper.js` | offen | ✅ Phase 1.9 |
| H-02 | A8 CORS | Subdomain-Confusion via `includes('prova-systems')` (4 Functions) | offen | ✅ Phase 1.9 |
| H-03 | A6 Deps | `nodemailer@6.10.1` HIGH-Vuln (DoS via addressparser) | offen | ✅ Phase 1.9 |
| H-04 | A7 Headers | Fehlende COOP/COEP/CORP-Header | offen | ✅ Phase 1.9 |
| H-05 | A7 Headers | `script-src 'unsafe-inline'` — XSS-Schutz reduziert | offen | Backlog Architektur-Sprint |
| H-06 | A11 LocalStorage | Akten-Inhalte (Schweigepflicht §203 StGB) in localStorage | offen | Phase 1.9 verifiziert Logout-Wipe |
| H-07 | A11 LocalStorage | Auftraggeber-PII (DSGVO Art. 5) in localStorage | offen | Phase 1.9 verifiziert Logout-Wipe |

---

## MEDIUM (Sprint 7+ Backlog)

| ID | Audit | Titel | Status | Action |
|---|---|---|---|---|
| M-01 | A8 CORS | `Access-Control-Allow-Origin: '*'` in 5 Functions | offen | Phase 1.9 |
| M-02 | A8 CORS | `app.prova-systems.de` fehlt in ALLOWED_ORIGINS | offen | Phase 1.9 (zwingend mit H-01) |
| M-03 | A8 CORS | hardcoded `https://prova-systems.de` (3 Functions, App-Subdomain blockiert) | offen | Phase 1.9 |
| M-04 | A8 CORS | `admin-auth` Origin-Logik | offen | Phase 1.9 |
| M-05 | A7 Headers | `style-src 'unsafe-inline'` | offen | Backlog Architektur-Sprint |
| M-06 | A7 Headers | `https://identity.netlify.com` in CSP (Tot-Code) | offen | ✅ Phase 1.9 |
| M-07 | A7 Headers | `https://*.netlify.app` Wildcard | offen | ✅ Phase 1.9 |
| M-08 | A7 Headers | `wss:` Wildcard | offen | ✅ Phase 1.9 |
| M-09 | A11 LocalStorage | Auth-Token in localStorage (XSS-Steal-Vektor) | akzeptiert | Doku in SECURITY.md |
| M-10 | A11 LocalStorage | SV-Stammdaten in localStorage | akzeptiert | Doku |
| M-11 | A6 Deps | `bcryptjs` Major-Update (2.x → 3.x) | offen | Folge-Sprint |
| M-12 | A6 Deps | `stripe` Major-Update (14.x → 22.x) | offen | Folge-Sprint |

---

## LOW (akzeptiert oder Nice-to-Have)

| ID | Audit | Titel | Status |
|---|---|---|---|
| L-01 | A5 Secrets | `.gitignore` proaktiv um `.env`, `.env.production` etc. erweitern | ✅ Phase 1.9 |
| L-02 | A7 Headers | HSTS fehlt `preload` | ✅ Phase 1.9 |
| L-03 | A7 Headers | `img-src https:` Wildcard | Backlog |
| L-04 | A7 Headers | externe CDNs ohne SRI | Backlog |
| L-05 | A8 CORS | 4 verschiedene CORS-Patterns parallel | ✅ Phase 1.9 (Konsolidierung) |
| L-06 | A11 LocalStorage | Tot-Code Airtable-Keys (4 Keys) | Sprint 11+ |
| L-07 | A7 Headers | Make.com in CSP (sollte raus nach T3/F1-Migration) | Marcel-Aktion + Backlog |

---

## INFO (Dokumentations-Hinweise)

| ID | Audit | Titel |
|---|---|---|
| I-01 | A5 Secrets | Test-Garbage-Token in OPTION-C-INVENTORY.md |
| I-02 | A5 Secrets | Token-Prefixes in CHANGELOG (Rotation-Doku) |
| I-03 | A5 Secrets | ENV-Var-Namen in Doku/Code (correct) |
| I-04 | A5 Secrets | Template-Beispiele in Doku |
| I-05 | A7 Headers | X-Frame-Options + frame-ancestors redundant |
| I-06 | A7 Headers | Permissions-Policy unvollständig | ✅ Phase 1.9 erweitern |
| I-07 | A8 CORS | `x-prova-internal` Custom-Header |
| I-08 | A11 LocalStorage | ~33 Const-Variable-Keys nicht aufgelöst |

---

## Findings-Tabelle (alle Severity, sortierbar nach Status)

| ID | Severity | Audit | Titel | Status | Phase-1.9-Fix |
|---|---|---|---|---|---|
| H-01 | HIGH | A8 | CORS Subdomain-Confusion startsWith | ✅ FIXED | cors-helper.js URL-parsing |
| H-02 | HIGH | A8 | CORS Subdomain-Confusion includes (4 Functions) | ✅ FIXED | dsgvo-auskunft + audit-log + error-log + mein-aktivitaetsprotokoll |
| H-03 | HIGH | A6 | nodemailer 6.10.1 DoS-Vuln | ✅ FIXED | upgrade auf 8.0.7, npm audit clean |
| H-04 | HIGH | A7 | COOP/COEP/CORP fehlt | ✅ FIXED | netlify.toml Header-Block |
| H-05 | HIGH | A7 | unsafe-inline script-src | Backlog | Architektur-Sprint |
| H-06 | HIGH | A11 | Akten-Inhalte in localStorage | dokumentiert | Logout-Wipe verifizieren (Marcel-Test) |
| H-07 | HIGH | A11 | Auftraggeber-PII in localStorage | dokumentiert | Logout-Wipe verifizieren (Marcel-Test) |
| M-01 | MED | A8 | Wildcard CORS 5 Functions | ✅ FIXED | foto-captioning, ki-proxy, whisper-diktat, push-notify, stripe-portal |
| M-02 | MED | A8 | app.* fehlt in ALLOWED_ORIGINS | ✅ FIXED | cors-helper.js explizite Liste |
| M-03 | MED | A8 | hardcoded prova-systems.de | ✅ FIXED | normen, normen-picker, akte-export |
| M-04 | MED | A8 | admin-auth Origin-Logik | ✅ FIXED | nutzt jetzt cors-helper |
| M-05 | MED | A7 | unsafe-inline style-src | Backlog | Architektur-Sprint |
| M-06 | MED | A7 | identity.netlify.com Tot-Code | ✅ FIXED | netlify.toml CSP |
| M-07 | MED | A7 | netlify.app Wildcard | ✅ FIXED | netlify.toml CSP |
| M-08 | MED | A7 | wss: Wildcard | ✅ FIXED | netlify.toml CSP |
| L-01 | LOW | A5 | .gitignore Erweiterung | ✅ FIXED | .env-Pattern proaktiv |
| L-02 | LOW | A7 | HSTS preload | ✅ FIXED | netlify.toml |
| I-06 | INFO | A7 | Permissions-Policy unvollstaendig | ✅ FIXED | netlify.toml volle Liste |

---

## Severity-Definition

| Stufe | Beschreibung | Reaktion |
|---|---|---|
| **CRITICAL** | Daten-Leak-Risiko, Auth-Bypass, RLS-Lücke, Secret-Exposure, Cross-Tenant-Daten-Zugriff, RCE | sofort fixen + commit |
| **HIGH** | fehlende Rate-Limit, CSP zu locker, fehlende Validation, Dependency-Vulnerability mit Exploit | vor Pilot fixen |
| **MEDIUM** | Performance-Issue, Accessibility-Lücke, Code-Quality, Dead-Code, Logging-Lücke | Sprint 7+ Backlog |
| **LOW** | Nice-to-Have, akzeptiertes Risiko, Stil-Verbesserung | dokumentiert akzeptiert |
| **INFO** | Hinweis, kein Sicherheitsproblem | nur Doku |

---

*Backlog 02.05.2026 · Findings werden hier gesammelt aus 22 Audits in S6*
