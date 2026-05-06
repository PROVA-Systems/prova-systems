# TOM — Technische und Organisatorische Maßnahmen

**Stand:** 2026-05-10 (MEGA²⁸ KORR-22)
**Rechtsgrundlage:** Art. 32 DSGVO (Sicherheit der Verarbeitung)
**Status:** Anwalt-Review pflicht

---

## 1. Vertraulichkeit (Art. 32 Abs. 1 lit. b)

### 1.1 Zutrittskontrolle (physische Räume)
- Datenzentrum: Supabase Frankfurt (AWS eu-central-1)
- ISO 27001 + SOC 2 Type II zertifiziert (siehe Supabase-Compliance-Doku)
- Marcel-Operations: Office Köln (HomeOffice secure)

### 1.2 Zugangskontrolle (System-Login)
- **Auth-Stack:** Supabase Auth (JWT) + HMAC-Bridge (Cutover-Phase)
- **Passwort-Hashing:** bcrypt (cost-factor 12)
- **2FA-Layer (geplant Sprint AUTH-PERFEKT 2.0):** TOTP via otplib
- **Recovery-Codes:** 6-stellige Codes, single-use, Bcrypt-gehasht
- **Session-Management:** JWT mit 1h Default-TTL, Refresh-Token rotierend
- **Rate-Limiting:** 5 Login-Versuche / 15 Min / IP, 1h Lockout (RL-01)
- **Marcel-Notfall-Bookmarklet:** existiert für Account-Recovery (siehe `docs/EMERGENCY-BOOKMARKLET.md`)

### 1.3 Zugriffskontrolle (Row-Level-Security)
- **Multi-Tenant-Isolation:** Supabase RLS auf 60+ Tabellen
- **Workspace-basierte Trennung:** workspace_id pro Row, RLS-Policy enforcement
- **Service-Role-Key:** server-only, NIE im Frontend
- **Audit:** Specialized Subagent `prova-rls-auditor` für regelmäßige Reviews

### 1.4 Trennungskontrolle
- Multi-Tenancy: 1 Workspace = 1 Logical-Tenant
- Datenbank-Trennung: keine Cross-Tenant-Joins technisch möglich
- Test-/Production-Trennung: separate Supabase-Projekte (geplant Sprint K-1.5)

### 1.5 Pseudonymisierung (Art. 32 Abs. 1 lit. a)
- **Server-side Pseudo:** `lib/prova-pseudo.js` vor jedem KI-Call
- **Klartext-Logging verboten:** CLAUDE.md Regel 17
- **Reversibilität:** Mapping nur in PROVA-Server-RAM, nie persistent

---

## 2. Integrität (Art. 32 Abs. 1 lit. b)

### 2.1 Weitergabekontrolle (Transport)
- TLS 1.3 für alle Connections (Frontend ↔ Edge Functions ↔ Supabase ↔ externe APIs)
- Strict-Transport-Security Header
- HTTPS-only Cookies
- WebSocket-Connections: WSS only

### 2.2 Eingabekontrolle (Audit-Log)
- **`audit_trail`-Tabelle:** INSERT-only, RLS verhindert UPDATE/DELETE
- **Pro state-changing-Action:** function_name + payload (pseudonymisiert) + result + timestamp
- **Aufbewahrung:** 1 Jahr aktiv, dann Anonymisierung
- **Compliance:** Art. 30 DSGVO + IHK-SVO Nachweis

---

## 3. Verfügbarkeit + Belastbarkeit (Art. 32 Abs. 1 lit. b + c)

### 3.1 Verfügbarkeitskontrolle
- **Supabase-SLA:** 99.9% uptime (Pro-Plan)
- **Netlify-SLA:** 99.99% Edge-Network
- **UptimeRobot:** 5 Monitore (Frontend + App + Health + Sentry + Stripe-Webhook)
- **Sentry-Alerting:** sofort bei Critical-Errors, Email + (optional) SMS

### 3.2 Datensicherung
- **Supabase Auto-Backup:** täglich, 7 Tage Retention (Pro-Plan: 30 Tage)
- **Manuelles Backup:** `scripts/supabase-export-tables.js`
- **Restore-Drill:** quartalsweise (Doku in `docs/ops/RESTORE-DRILL.md`, geplant)
- **Disaster-Recovery-Plan:** in `docs/ops/DISASTER-RECOVERY.md` (geplant)

### 3.3 Wiederherstellbarkeit
- **RTO (Recovery Time Objective):** 4 Stunden
- **RPO (Recovery Point Objective):** 24 Stunden
- **Rollback-Plan:** in `docs/ops/ROLLBACK-PLAN-PILOT.md`

---

## 4. Verfahren zur regelmäßigen Überprüfung (Art. 32 Abs. 1 lit. d)

### 4.1 Auftragskontrolle
- DSGVO-Auftragsverarbeiter-Verträge mit allen Subprozessoren (siehe AVV §5)
- Standard-Vertragsklauseln (SCC) bei US-Anbietern (OpenAI, Stripe, etc.)

### 4.2 Bewertungs-Verfahren
- **Pen-Tests:** Sprint-Status: noch nicht durchgeführt — Marcel-TODO post-Pilot
- **Code-Audits:** Specialized Subagent für RLS, Auth-Coverage, ENV-Audit (siehe `docs/audit/`)
- **Sentry-Error-Reviews:** wöchentlich
- **DSGVO-Self-Audit:** quartalsweise

### 4.3 Mitarbeiter-Verpflichtung
- **Marcel als Sole-Operator:** Verpflichtung auf DSGVO-Geheimhaltung intrinsisch
- **Bei Erweiterung:** Vertraulichkeitserklärung pflicht

---

## 5. Auftragskontrolle (zusätzlich Art. 28)

- Weisungen des Auftraggebers werden dokumentiert (via PROVA-Settings + Code-Repo)
- Sub-Verarbeiter-Liste regelmäßig aktualisiert (siehe AVV §5)

---

## 6. Anlagen + Verweise

- **AVV-Vertrag:** `docs/legal/AVV.md`
- **Verfahrensverzeichnis:** `docs/legal/VERFAHRENSVERZEICHNIS.md`
- **Datenschutzerklärung:** `datenschutz.html`
- **Sentry-Compliance:** `docs/SENTRY-DSGVO.md`
- **Storage-Strategy:** `docs/STORAGE-DSGVO.md`

---

⚠️ **Anwalt-Review pflicht vor Pilot-Launch.**

*MEGA²⁸ KORR-22 — Vorlage von Claude Opus 4.7 (1M context)*
