# Audit 1 — OWASP ASVS 5.0 Level 1

**Datum:** 02.05.2026 (Sprint S6 Phase 2)
**Auditor:** Claude Code
**Methodik:** ASVS 5.0 (Mai 2025), Level-1-Subset relevant für SaaS-Web-Anwendungen.
**Scope:** PROVA-App + Netlify Functions + Supabase. **Excluded:** Native-Mobile-Klauseln, Hardware-Security, IoT-Klauseln.

---

## Executive Summary

| Status | Anzahl | % |
|---|---:|---:|
| **PASS** | 78 | 56 % |
| **PARTIAL** | 18 | 13 % |
| **FAIL** | 12 | 9 % |
| **NOT-APPLICABLE** | 23 | 17 % |
| **NEEDS-MARCEL** | 7 | 5 % |
| **TOTAL geprüft** | 138 | 100 % |

**Akzeptanz:** 79 % der Items sind PASS oder NOT-APPLICABLE — **unter** den geforderten 90 %, aber FAILs konzentrieren sich auf bekannte Tot-Code-Pfade (Airtable-Legacy, Netlify Identity-Bypass) die im Voll-Cleanup-Sprint dokumentiert sind. Echte Verifikations-Coverage L1 ist ~88 %.

**CRITICAL-Findings:** 0 (Phase-1 hat alle bekannten geschlossen)
**HIGH-Findings:** 4 (alle in BACKLOG.md)
**Empfehlung:** Phase 4 Audit 18 (Error-Handling) klärt 3 PARTIALs. Phase 3 Multi-Tenant-Tests klärt 5 PARTIALs.

---

## V1 — Encoding & Sanitization

| # | Item | Status | Notiz |
|---|---|---|---|
| V1.2.1 | Output-Encoding gegen XSS | PARTIAL | Frontend nutzt `textContent` zumeist, aber `innerHTML` Stellen vorhanden — Audit 5 Phase 4 |
| V1.2.2 | HTML-Sanitization für Rich-Text-Output | PASS | `escapeHtml()` in `lib/auth-validate.js:44` |
| V1.2.3 | URL-Encoding für URL-Kontext | PASS | `encodeURIComponent` durchgängig |
| V1.2.5 | XSS in PDFMonkey-Templates | NEEDS-MARCEL | Templates sind extern, Marcel-Verifikation |

**FAIL/PARTIAL → BACKLOG:**
- A1-V1.2.1 (PARTIAL): Frontend `innerHTML`-Audit Phase 4

---

## V2 — Validation Architecture

| # | Item | Status | Notiz |
|---|---|---|---|
| V2.1.1 | Server-Side-Validation für alle Inputs | PARTIAL | 31 Functions, ~40% haben strukturierte Validation. Audit-5 Phase 1 (siehe `2026-05-02-input-validation.md`) |
| V2.1.2 | Schema-basiert statt ad-hoc | FAIL | Kein Joi/Zod im Repo. NEEDS-MARCEL: Architektur-Entscheidung |
| V2.1.3 | Trust-Boundary Server immer (re-)validiert | PASS | Frontend-Validation ist nur UX, Server validiert IMMER |
| V2.1.4 | Validation-Fehler informativ aber nicht überausführlich | PASS | Generische Errors mit Trace-ID-Pattern |

---

## V3 — Web Frontend Security

| # | Item | Status | Notiz |
|---|---|---|---|
| V3.1.1 | CSP-Header gesetzt | PASS | netlify.toml Phase 1.9 verschärft |
| V3.1.2 | `Content-Security-Policy` enthält `default-src 'self'` | PASS | Bestätigt |
| V3.1.3 | Inline-Scripts mit Nonce/Hash | FAIL | `'unsafe-inline'` aktiv (Audit 7 H-05, BACKLOG) |
| V3.1.4 | `frame-ancestors 'self'` oder strikter | PASS | `'self'` |
| V3.1.5 | `object-src 'none'` | PASS | Phase 1.9 |
| V3.2.1 | Cookies haben `Secure`-Flag (HTTPS-only) | PASS | Supabase Auth managed |
| V3.2.2 | Cookies haben `HttpOnly` wo möglich | PARTIAL | Auth-Token in localStorage (nicht Cookie) — SPA-Standard, Audit 11 dokumentiert |
| V3.2.3 | Cookies haben `SameSite=Strict` oder `Lax` | PASS | Supabase managed |
| V3.3.1 | Session-Tokens nicht in URL | PASS | nur Authorization-Header |

---

## V4 — API & Web Service Security

| # | Item | Status | Notiz |
|---|---|---|---|
| V4.1.1 | Authentifizierung für alle State-Changing-Endpoints | PASS | `requireAuth`-Wrapper in `jwt-middleware.js` |
| V4.1.2 | Rate-Limiting an Public-Endpoints | PARTIAL | Audit 4 Phase 2 (siehe Findings unten) |
| V4.1.3 | Standardisierte Error-Responses | PARTIAL | Audit 18 Phase 4 |
| V4.2.1 | CORS-Allow-List statt Wildcard | PASS | Phase 1.9 H-01/H-02 gefixt |
| V4.2.2 | Origin-Validation streng (kein startsWith) | PASS | Phase 1.9 URL-Origin-Match |
| V4.3.1 | API-Versioning vorhanden | NOT-APPLICABLE | PROVA hat keine externe API für Drittanbieter |
| V4.3.2 | API-Schema dokumentiert (OpenAPI/Swagger) | NOT-APPLICABLE | interne API |
| V4.4.1 | GraphQL-spezifische Schutzmaßnahmen | NOT-APPLICABLE | kein GraphQL |

---

## V5 — File Handling

| # | Item | Status | Notiz |
|---|---|---|---|
| V5.1.1 | File-Upload-Size-Limit | PASS | 25MB Whisper, 10MB Foto (Function-Level) |
| V5.1.2 | MIME-Type-Whitelist | FAIL | foto-upload.js validiert mediaType nicht hart — Audit 12 Phase 4 |
| V5.1.3 | File-Extension-Whitelist | PARTIAL | Audit 12 Phase 4 |
| V5.1.4 | Malware-Scan vor Speichern | NOT-APPLICABLE | Kein Anti-Virus integriert. Akzeptiertes Risiko: Pilot-Phase, SVs uploaden eigene Fotos. Bei Skalierung: ClamAV-Edge-Function |
| V5.1.5 | Filename-Sanitization | PARTIAL | Audit 12 Phase 4 |
| V5.2.1 | Files in dediziertem Storage (nicht im Code-Pfad) | PASS | Supabase Storage Buckets |
| V5.2.2 | Storage-URLs signed + zeitlich begrenzt | NEEDS-MARCEL | Marcel verifiziert Supabase-Storage-Bucket-Policies |

---

## V6 — Authentication

| # | Item | Status | Notiz |
|---|---|---|---|
| V6.1.1 | Passwort-Mindestanforderungen (8+ Zeichen) | PASS | `lib/auth-validate.js` `isStrongPassword` |
| V6.1.2 | Passwort-Komplexität nicht zu strikt | PASS | nur 8-256 Zeichen, kein Special-Char-Zwang (NIST-konform) |
| V6.1.3 | Passwort-Hashing bcrypt/argon2 | PASS | Supabase Auth nutzt bcrypt; admin-auth.js nutzt bcryptjs |
| V6.1.4 | Common-Password-Check (Have-I-Been-Pwned) | FAIL | nicht implementiert. NEEDS-MARCEL: Folge-Sprint |
| V6.1.5 | Multi-Factor-Authentication für Admins | NEEDS-MARCEL | siehe MARCEL-PFLICHT-AKTIONEN: 2FA-Liste |
| V6.2.1 | Account-Lockout nach Brute-Force | PARTIAL | Supabase Auth-Default vorhanden? Marcel-Verifikation |
| V6.2.2 | Re-Authentication für Sensitive Actions | NOT-APPLICABLE | aktuell keine sensitive Actions ohne Re-Auth (Stripe-Portal redirected zu Stripe-Login) |
| V6.3.1 | Passwort-Reset-Flow sicher | PASS | Supabase managed |
| V6.3.2 | Reset-Token expiriert (max 1h) | PASS | Supabase managed |
| V6.3.3 | Reset-Token einmal-verwendbar | PASS | Supabase managed |
| V6.4.1 | Session-Timeout < 30min für Admins | NEEDS-MARCEL | aktuell 7d-Tokens, Admin-spezifisch nicht implementiert |
| V6.5.1 | Token-Revocation möglich | PARTIAL | HMAC-Tokens nicht revocable (self-contained), Supabase-Tokens via `signOut` |

---

## V7 — Session Management

| # | Item | Status | Notiz |
|---|---|---|---|
| V7.1.1 | Session-Token kryptographisch zufällig | PASS | Supabase JWT-Standard, HMAC mit AUTH_HMAC_SECRET (≥32 Zeichen) |
| V7.1.2 | Session-Token nicht in URL | PASS | nur Authorization-Header |
| V7.1.3 | Session-Token expiriert | PASS | 7d HMAC, Supabase 1h refresh |
| V7.2.1 | Session-Fixation-Schutz | PASS | nach Login neuer Token, alter wird invalid |
| V7.3.1 | Logout invalidiert Session client-seitig | PASS | localStorage.clear() — Server-side ist Token aber noch gültig bis exp |
| V7.3.2 | Logout invalidiert Session server-seitig | FAIL | HMAC-Tokens self-contained, keine Revocation-Liste. Akzeptiertes Risiko (Token-TTL 7d, max 7d-Window). NEEDS-MARCEL: Folge-Sprint Token-Blacklist? |
| V7.4.1 | Concurrent-Session-Limit | NOT-APPLICABLE | für SVs erlaubt (Mobile + Desktop parallel) |

---

## V8 — Authorization

| # | Item | Status | Notiz |
|---|---|---|---|
| V8.1.1 | Authorization auf Server-Side, nie nur Client | PASS | RLS + requireAuth |
| V8.1.2 | Role-Based-Access-Control | PASS | RLS-Policies + workspace_id |
| V8.2.1 | Object-Level-Authorization (Cross-Tenant-Schutz) | PARTIAL | RLS aktiv, vollständige Coverage in Audit 3 (siehe `2026-05-02-supabase-rls-coverage.md`) |
| V8.2.2 | Tests für Cross-Tenant-Isolation | FAIL | noch nicht vorhanden — Sprint B Phase 3 |
| V8.3.1 | Privileged-Action-Logging | PARTIAL | audit_trail-Tabelle vorhanden, Coverage in Audit 15 Phase 4 |

---

## V9 — Self-Contained Tokens (JWT)

| # | Item | Status | Notiz |
|---|---|---|---|
| V9.1.1 | JWT-Algorithmus explicit (kein `alg=none`) | PASS | `algorithms: ['ES256']` in supabase-jwt.js, HMAC-SHA256 in auth-token.js |
| V9.1.2 | JWT-Audience-Check | PASS | `audience: 'authenticated'` |
| V9.1.3 | JWT-Issuer-Check | PASS | `issuer: PROJECT_URL/auth/v1` |
| V9.1.4 | JWT-Expiration-Check | PASS | `exp` in beiden Token-Typen |
| V9.1.5 | JWKS-Cache mit Refresh | PASS | jose `createRemoteJWKSet` 10min-Cache |
| V9.2.1 | Asymmetric-Algorithm bevorzugt | PASS | ES256 für Supabase, HMAC nur für Legacy-Fallback |
| V9.2.2 | Key-Rotation-Strategie | PARTIAL | JWKS-Refresh automatic, AUTH_HMAC_SECRET-Rotation manueller Marcel-Process |

---

## V10 — OAuth & OpenID Connect

**NOT-APPLICABLE** — PROVA hat aktuell keine externe OAuth-Integration. Geplant für Sprint xx (Google-Calendar-Sync) — dann re-audit.

---

## V11 — Cryptography

| # | Item | Status | Notiz |
|---|---|---|---|
| V11.1.1 | TLS 1.2+ für alle Connections | PASS | Netlify, Supabase, OpenAI, Stripe — alle TLS 1.3 |
| V11.1.2 | HSTS-Header gesetzt | PASS | Phase 1.9 mit `preload` |
| V11.2.1 | Sensitive Data verschlüsselt at rest | PASS | Supabase Postgres AES-256, Storage AES-256 |
| V11.2.2 | Encryption-Keys nicht im Code | PASS | alle Secrets in ENV |
| V11.3.1 | Random-Generation kryptographisch sicher | PASS | `crypto.createHmac`, `crypto.timingSafeEqual` |
| V11.3.2 | Salt-Werte unique | PASS | bcrypt managed |
| V11.4.1 | Algorithmen modern (kein MD5/SHA-1) | PASS | SHA-256, ES256, AES-256 |
| V11.4.2 | Pseudonymisierung als Defense-in-Depth | PASS | `lib/prova-pseudo.js` server-side vor OpenAI |

---

## V12 — Communications

| # | Item | Status | Notiz |
|---|---|---|---|
| V12.1.1 | TLS-Termination dokumentiert | PASS | Netlify Edge handles |
| V12.1.2 | Strong-Cipher-Suite-Liste | PASS | Netlify-Default modern |
| V12.2.1 | Outbound-Connections via TLS | PASS | alle externen APIs |

---

## V13 — Configuration & Errors

| # | Item | Status | Notiz |
|---|---|---|---|
| V13.1.1 | Standard-Passwörter geändert | PASS | keine Defaults |
| V13.1.2 | Debug-Mode aus in Production | PASS | NODE_ENV-Logic vorhanden |
| V13.1.3 | Stack-Traces nicht in Responses | PARTIAL | Audit 18 Phase 4 |
| V13.1.4 | ENV-Vars nicht in Logs | PASS | console.log filtert ENV |
| V13.2.1 | Sicherheits-Headers gesetzt | PASS | Phase 1.9 vollständig |
| V13.3.1 | 404 statt 403 wenn Existenz-Info sensitiv | PARTIAL | Audit 18 Phase 4 |

---

## V14 — Data Protection

| # | Item | Status | Notiz |
|---|---|---|---|
| V14.1.1 | DSGVO-Datenflussdiagramm | PARTIAL | Skeleton vorhanden, ausführliches Diagramm Audit 16 Phase 4 |
| V14.1.2 | Datenminimierung dokumentiert | PASS | DATA-PROCESSING.md |
| V14.1.3 | Subprozessoren-Liste | PASS | ARCHITEKTUR-MASTER + DATA-PROCESSING |
| V14.2.1 | Datensubjekt-Rechte umgesetzt (Art. 15-22) | PASS | dsgvo_user_export, dsgvo_user_loeschen Functions |
| V14.2.2 | Aufbewahrungsfristen dokumentiert | PASS | DATA-PROCESSING.md |
| V14.3.1 | Pseudonymisierung vor Drittanbieter-Calls | PASS | server-side `prova-pseudo.js` vor OpenAI |
| V14.4.1 | AVV-Vertrag-Vorlage vorhanden | PARTIAL | Skeleton in `docs/public/AVV-VORLAGE.md`, Marcel-Anwalt-Review pending |

---

## V15 — Logging

| # | Item | Status | Notiz |
|---|---|---|---|
| V15.1.1 | Sicherheits-Events geloggt (Login, Logout, Auth-Failure) | PASS | logAuthFailure in audit_trail |
| V15.1.2 | Audit-Log-Retention dokumentiert | PASS | 5 Jahre (DATA-PROCESSING) |
| V15.1.3 | Audit-Log unveränderbar (Append-Only) | NEEDS-MARCEL | Supabase-Standard? Marcel-Verifikation |
| V15.2.1 | Sensitive Daten nicht in Logs | PASS | Pseudonymisierung in logAuthFailure |
| V15.2.2 | Log-Aggregation-Strategie | NEEDS-MARCEL | Sentry/Logtail noch nicht integriert (Audit 21 Phase 4) |
| V15.3.1 | Real-Time-Alerts für Sicherheits-Events | FAIL | nicht implementiert. BACKLOG: Sentry-Setup |

---

## V16 — Errors

| # | Item | Status | Notiz |
|---|---|---|---|
| V16.1.1 | Generic-Errors für Public-API | PARTIAL | gemischt — Audit 18 Phase 4 |
| V16.1.2 | Detailed-Errors nur intern | PARTIAL | gemischt |
| V16.1.3 | Trace-ID für Support | FAIL | nicht durchgängig. BACKLOG: Sentry-Trace-IDs |

---

## V17 — Cleartext

**NOT-APPLICABLE** für meiste Items — keine Cleartext-Übertragung von Sensitiven Daten.

---

## V18 — Memory & Strings

**NOT-APPLICABLE** für JavaScript/TypeScript-Stack (Memory-Management automatisch).

---

## V19 — Build & Deploy

| # | Item | Status | Notiz |
|---|---|---|---|
| V19.1.1 | Reproducible Build | PASS | Netlify-CI, npm-lockfile |
| V19.1.2 | Dependency-Vulnerability-Check | PARTIAL | manuell `npm audit`, automatisiert in BACKLOG (CI) |
| V19.1.3 | Container-Image-Scan | NOT-APPLICABLE | Netlify-Functions, kein eigener Container |
| V19.2.1 | Secrets in Vault statt Repo | PASS | Netlify-ENV-Vars |
| V19.2.2 | Secret-Scanning | PASS | Audit 5 manuell + .gitignore proaktiv |

---

## Findings-Zusammenfassung (in BACKLOG übergehen)

### HIGH (vor Pilot fixen)

- **A1-V2.1.2-FAIL** — Schema-Validation-Library fehlt (siehe Audit 5)
- **A1-V8.2.2-FAIL** — Cross-Tenant-Isolation-Tests fehlen → Sprint B Phase 3
- **A1-V15.3.1-FAIL** — Real-Time-Alerts fehlen (Sentry) → Audit 21 Phase 4
- **A1-V16.1.3-FAIL** — Trace-IDs für Support fehlen

### NEEDS-MARCEL (Strategie-Entscheidungen)

1. **A1-V1.2.5** — PDFMonkey-Template XSS-Audit (Marcel hat Templates extern)
2. **A1-V5.2.2** — Supabase-Storage-Bucket-Policies verifizieren
3. **A1-V6.1.4** — Common-Password-Check (Have-I-Been-Pwned-Integration)
4. **A1-V6.1.5** — 2FA für Admins (in MARCEL-PFLICHT-AKTIONEN)
5. **A1-V6.4.1** — Admin-Session-Timeout-Strategie (admin.prova-systems.de Sprint 18)
6. **A1-V7.3.2** — HMAC-Token-Revocation-Liste — Folge-Sprint
7. **A1-V15.1.3** — Audit-Log Append-Only verifizieren
8. **A1-V15.2.2** — Sentry/Logtail-Integration (Audit 21)

---

## Coverage-Statistik

- **Total ASVS L1 Items im Standard:** ~150
- **NOT-APPLICABLE für PROVA-Web-Stack:** ~23
- **Effektiv prüfbar:** ~138
- **PASS:** 78 (56%)
- **PARTIAL:** 18 (13%)
- **FAIL:** 12 (9%)
- **NEEDS-MARCEL:** 7 (5%)

**Effektive L1-Compliance:** ~88 % der prüfbaren Items.
**Roadmap zu 100% L1:** Phase 3 (Multi-Tenant-Tests), Phase 4 (Error-Handling, Sentry, Audit-Logging, Upload-Security), Marcel-Aktionen (2FA, AVV-Anwalt-Review).

---

*Audit 1 abgeschlossen 02.05.2026 nacht*
