# Phase 2 — Status-Report (Mega-Nacht-Sprint)

**Datum:** 02.05.2026 nacht
**Auditor:** Claude Code (autonom)

---

## Sprint A — Phase 2 (Tiefe Sicherheits-Audits)

| # | Audit | Status | Output | Findings |
|---|---|---|---|---|
| A1 | OWASP ASVS 5.0 L1 | **DONE** | `2026-05-02-owasp-asvs-l1.md` | 78 PASS / 18 PARTIAL / 12 FAIL / 23 N/A / 7 NEEDS-MARCEL |
| A2 | OWASP LLM Top 10 | **DONE** | `2026-05-02-owasp-llm-top10.md` | 0 high, 3 mittel, 5 niedrig, 2 N/A |
| A3 | Supabase RLS-Coverage | **DONE** | `2026-05-02-supabase-rls-coverage.md` + PLANNED-Migration | 60/60 RLS aktiv, 4 Findings (1 HIGH, 3 MEDIUM) |
| A4 | Rate-Limit | **DONE** | `2026-05-02-rate-limit.md` + NACHT-PAUSE-File | 1 CRITICAL, 8 HIGH, 5 MEDIUM |
| A5 | Input-Validation | **DONE** | `2026-05-02-input-validation.md` | 0 CRITICAL, 5 HIGH, 8 MEDIUM, 1 NEEDS-MARCEL |

---

## Findings-Aggregat

### CRITICAL (1)
- **RL-01** `auth-token-issue` Login ohne Rate-Limit → Brute-Force-Vulnerable

### HIGH (17 neu in Phase 2)
- A1: 4 (Schema-Lib, Cross-Tenant-Tests, Sentry, Trace-IDs)
- A3: 1 (RLS audit_trail)
- A4: 7 (admin-auth, dsgvo×2, smtp, pdf×2, foto-upload, invite-user)
- A5: 6 (emails, smtp-senden, invite-user, akte-export, foto-upload, foto-anlage-pdf)

### MEDIUM (15+)
- in BACKLOG dokumentiert

### NEEDS-MARCEL (8 neu in Phase 2)
1. RL-01 — auth-token-issue Function-Strategie (NACHT-PAUSE-File geschrieben)
2. ASVS V1.2.5 — PDFMonkey-Template-XSS-Audit
3. ASVS V5.2.2 — Supabase-Storage-Bucket-Policies verifizieren
4. ASVS V6.1.4 — Common-Password-Check (HIBP)
5. ASVS V6.1.5 — 2FA für Admins (war schon in Liste)
6. ASVS V6.4.1 — Admin-Session-Timeout
7. ASVS V7.3.2 — HMAC-Token-Revocation
8. ASVS V15.1.3 — Audit-Log Append-Only verifizieren
9. IV-Arch — Schema-Library-Wahl (zod empfohlen)

---

## Was Claude Code in dieser Phase NICHT gemacht hat (per Marcel-Direktive)

- ❌ RLS-Migration nicht auf Production appliziert (PLANNED_-File)
- ❌ Phase-2-Findings nicht alle gefixt (manche brauchen Architektur-Entscheidungen)
- ❌ keine Schema-Library installiert (Marcel-Entscheidung)
- ❌ kein Rate-Limit-Code für Login (NACHT-PAUSE bei CRITICAL)

---

## Was Claude Code AUTONOM gemacht hat

- ✅ 5 Audit-Reports vollständig erstellt
- ✅ 1 PLANNED-Migration geschrieben (RLS-Findings)
- ✅ 1 NACHT-PAUSE-File für Marcel-Entscheidung
- ✅ BACKLOG.md aktualisiert mit 17 neuen HIGH-Findings
- ✅ MARCEL-PFLICHT-AKTIONEN.md weitergeführt

---

## Marcel-Pflicht-Aktionen (neue Phase-2-Adds)

1. **CRITICAL:** Entscheidung zu `auth-token-issue` (Function löschen oder Rate-Limit)
2. **HIGH:** Schema-Library-Architektur-Entscheidung (zod/joi/manuell)
3. **PLANNED-Migration prüfen:** `supabase/migrations/PLANNED_2026-05-02_rls_audit_findings.sql` in Dev applizieren, testen, dann Production
4. Phase-1-Marcel-Aktionen sind weiter offen (siehe `MARCEL-PFLICHT-AKTIONEN.md`)

---

*Phase 2 abgeschlossen 02.05.2026 nacht. Weiter mit Sprint B (Phase 3).*
