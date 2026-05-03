# PROVA Audit-Findings Backlog

**Stand:** 02.05.2026 (Sprint S6 Phase 1)
**Aktualisiert von:** Claude Code nach jedem Audit
**Severity:** CRITICAL > HIGH > MEDIUM > LOW > INFO

---

## CRITICAL (sofort fixen)

| ID | Audit | Titel | Status |
|---|---|---|---|
| RL-01 | A4 | `auth-token-issue` Login-Endpoint ohne Rate-Limit (Brute-Force) | ✅ RESOLVED MEGA-SKALIERUNG M1c — 5/15min IP-Limit + 1h Lockout |

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

## Phase-4-Audit-Findings (Sprint X3, 03.05.2026)

### Foto-Upload (Audit 12)
| ID | Sev | Titel |
|---|---|---|
| FU-01 | HIGH | MIME-Whitelist + Magic-Bytes (Folge-Sprint) |
| FU-02 | HIGH | EXIF-Strip vor Storage (sharp-Library) |
| FU-03 | MED | Größen-Limit explicit |
| FU-04 | MED | Filename-Sanitization |
| FU-05 | LOW | Storage-Bucket-Policies verifizieren (NEEDS-MARCEL) |

### PDF-Generation (Audit 13)
| ID | Sev | Titel |
|---|---|---|
| PDF-01 | HIGH | foto-anlage-pdf max 50 Fotos (= H-24, in Sprint X4) |
| PDF-02 | MED | pdf-proxy URL-Whitelist (SSRF-Schutz) |
| PDF-03 | MED | PDFMonkey-Template-Injection-Test (NEEDS-MARCEL) |
| PDF-04 | MED | PDFMonkey-Cost-Cap pro User/Tag |

### Email (Audit 14)
| ID | Sev | Titel |
|---|---|---|
| EM-01..02 | HIGH | CRLF-Injection + Empfänger-Format (= H-20, in Sprint X4) |
| EM-03 | MED | SPF/DKIM/DMARC Verifikation (NEEDS-MARCEL) |
| EM-04 | MED | mail-tester.com Score (NEEDS-MARCEL) |
| EM-05 | LOW | Bounce-Handler |

### Audit-Logging (Audit 15)
| ID | Sev | Titel |
|---|---|---|
| AL-01 | HIGH | audit_trail INSERT-Policy (= H-12, PLANNED-Migration) |
| AL-02..05 | MED | Logout, Password-Reset, DSGVO-Aktionen, Cross-Tenant-Versuche logging |
| AL-06 | LOW | Append-Only-Policy explizit (in PLANNED ergänzen) |
| AL-07 | LOW | pg_cron 5J-Auto-Cleanup |

### DSGVO-Dataflow (Audit 16)
| ID | Sev | Titel |
|---|---|---|
| DA-01..02 | LOW | Whisper-Audio + Foto-Upload UI-Disclaimer (Folge-Sprint UI) |

### Error-Handling (Audit 18)
| ID | Sev | Titel |
|---|---|---|
| EH-01..03 | MED | Generic-Errors + Trace-IDs + 404-vs-403 |

### Code-Quality (Audit 19)
| ID | Sev | Titel |
|---|---|---|
| CQ-01 | MED | .eslintrc + security-plugin |
| CQ-02 | MED | Tot-Code-Cleanup (Sprint 11+) |
| CQ-05 | INFO | SBOM erzeugen (NEEDS-MARCEL) |

### Lighthouse (Audit 20)
| ID | Sev | Titel |
|---|---|---|
| LH-01 | NM | Lighthouse Top-10-Pages-Lauf (NEEDS-MARCEL) |

### Sentry (Audit 21)
| ID | Sev | Titel |
|---|---|---|
| SE-01..02 | HIGH | Real-Time-Alerts + Trace-IDs (Sentry-Setup) |
| SE-03 | MED | Sentry-Account + DPA (NEEDS-MARCEL) |

### Disaster-Recovery (Audit 22)
| ID | Sev | Titel |
|---|---|---|
| DR-01 | MED | Bus-Faktor 1 (NEEDS-MARCEL: Vertretungs-Person) |
| DR-02 | MED | Status-Page einrichten |
| DR-03 | LOW | Backup-2-of-3 (Backblaze, ~5€/Mo) |

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
| **H-08** | HIGH | A1 | Schema-Validation-Library fehlt (V2.1.2 FAIL) | NEEDS-MARCEL | Architektur-Entscheidung zod/joi |
| **H-09** | HIGH | A1 | Cross-Tenant-Isolation-Tests fehlen (V8.2.2) | offen | Sprint B Phase 3 |
| **H-10** | HIGH | A1 | Real-Time-Alerts (Sentry) fehlen (V15.3.1) | ✅ RESOLVED MEGA-SKALIERUNG M3 | Sentry @sentry/node 10.51 wraps 4 kritische Functions (auth-token-issue, stripe-checkout, stripe-webhook, ki-proxy) + Frontend (pilot, app, index). EU-Region (ingest.de.sentry.io), AVV unterschrieben |
| **H-11** | HIGH | A1 | Trace-IDs für Support fehlen (V16.1.3) | ✅ RESOLVED MEGA-SKALIERUNG M3 | Sentry generiert event_id pro Error → Marcel kann via Sentry-Dashboard zu User-Reports zuordnen. tracesSampleRate 0.1 fuer Performance-Spans |
| **H-12** | HIGH | A3 | RLS audit_trail INSERT ohne workspace_id-Konsistenz | PLANNED-Migration | `supabase/migrations/PLANNED_2026-05-02_rls_audit_findings.sql` |
| **H-13** | HIGH | A4 | admin-auth Brute-Force ohne Rate-Limit | ✅ FIXED Sprint X4 | 5/15Min/IP via lib/rate-limit-ip.js |
| **H-14** | HIGH | A4 | dsgvo-auskunft + dsgvo-loeschen ohne Rate-Limit | ✅ FIXED Sprint X4 | 1/Tag/User |
| **H-15** | HIGH | A4 | smtp-senden ohne Rate-Limit (Spam-Vektor) | ✅ FIXED Sprint X4 | 50/h/User |
| **H-16** | HIGH | A4 | foto-anlage-pdf + pdf-proxy ohne Rate-Limit (Cost) | ✅ FIXED Sprint X4 | 20/h + 100/h/User |
| **H-17** | HIGH | A4 | foto-upload ohne Rate-Limit (Storage-Flooding) | ✅ RESOLVED MEGA-SKALIERUNG M1c | Tot-Code geloescht (Function + foto-archiv.js Caller) |
| **H-18** | HIGH | A4 | invite-user ohne Rate-Limit (Spam-Invite) | ✅ RESOLVED MEGA-SKALIERUNG M1c | Tot-Code geloescht (0 Caller) |
| **H-19** | HIGH | A5 | emails Webhook-Forwarder ohne Empfänger-Validation | ✅ FIXED Sprint X4 | typ-Whitelist + Email-Format + CRLF |
| **H-20** | HIGH | A5 | smtp-senden Empfänger ungeprüft (CRLF-Injection-Risk) | ✅ FIXED Sprint X4 | isValidEmail + CRLF + Length-Limits |
| **H-21** | HIGH | A5 | invite-user Email + paket ungeprüft (Tot-Code) | ✅ RESOLVED MEGA-SKALIERUNG M1c | Tot-Code geloescht |
| **H-22** | HIGH | A5 | akte-export RTF-Injection-Risiko | ✅ FIXED Sprint X4 | rtfEscape() in 8 Stellen |
| **H-23** | HIGH | A5 | foto-upload kein MIME-Whitelist (Polyglot-Files) | ✅ RESOLVED MEGA-SKALIERUNG M1c | Tot-Code geloescht — neuer Foto-Workflow (Supabase Storage) erhaelt MIME-Whitelist by Design |
| **H-25** | HIGH | M1c | `app-login.html` + `app-login-logic.js` Legacy-Auth (Netlify Identity + auth-token-issue) | offen — Tech-Debt | Migration auf Supabase Auth (analog `login.html` / `auth-supabase-logic.js`) — eigener Sprint AUTH-PERFEKT 2.0 post-Pilot. Workaround: Rate-Limit + 1h Lockout aktiv (RL-01 RESOLVED) |
| **H-24** | HIGH | A5 | foto-anlage-pdf kein Foto-Anzahl-Limit | ✅ FIXED Sprint X4 | max 50 Fotos |
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
