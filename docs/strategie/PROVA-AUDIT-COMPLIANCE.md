# PROVA Audit & Compliance Tracking

**Stand:** 02.05.2026 nachmittags (Tag 8, Sprint S6 Phase 1)
**Eigentümer:** Marcel Schreiber + Claude Code
**Single Source of Truth:** Diese Datei trackt alle Audits + Frameworks + externe Reviews

---

## Was diese Datei ist

PROVA durchläuft im Pre-Pilot-Sprint S6 22 Audits. Diese Datei dokumentiert:

- Welche Audits laufen / sind erledigt
- Was Claude Code selbst durchführen kann (90%+ der Audits)
- Was externe Hilfe (Anwalt, Pentester, Steuerberater) braucht
- Versions-Historie pro Audit-Durchlauf
- Frameworks die wir zugrunde legen

**Vermeidung von Doppelarbeit:** vor jedem Audit-Re-Run hier prüfen ob aktueller Stand schon abdeckt.

---

## Frameworks die wir zugrunde legen

| Framework | Version | Zweck | Owner |
|---|---|---|---|
| **OWASP ASVS** | 5.0 (Mai 2025) | Application Security Verification Standard, Level 1 als Mindeststandard, Subset Level 2 für Auth/AccessControl/Crypto | CC |
| **OWASP LLM Top 10** | 2025 | LLM-spezifische Risiken (Prompt-Injection, Data-Leakage, Unbounded-Cost) | CC |
| **OWASP Top 10 Web** | 2021 (impliziert in ASVS 5.0) | Web-App-Risiken | CC |
| **DSGVO** | 2018 + Anpassungen | Pflicht-Framework EU-Verarbeitung | CC + Anwalt |
| **§203 StGB** | aktuell | Schweigepflicht öbuv-SVs (relevante Datenschutz-Pflicht) | Marcel + Anwalt |
| **§407a ZPO** | aktuell | KI-Hinweis-Pflicht bei Sachverständigengutachten | Marcel + Anwalt |
| **NIS2-Richtlinie** | EU-Umsetzung 2024 | Cybersecurity-Mindeststandards (für Pilot-SVs ggf. relevant) | Marcel-Recherche |
| **BSI IT-Grundschutz** | aktuell | DE-Standard, optional als Verkaufs-Argument | Marcel-Entscheidung |

---

## 22 Audits — Zuordnung CC vs Mensch

### Was Claude Code allein durchführt (18 Audits)

| # | Audit | Methodik | Aufwand | Status |
|---|---|---|---|---|
| 1 | OWASP ASVS 5.0 L1 | Code-Review, Pattern-Match | 4-6h | pending Phase 2 |
| 2 | OWASP LLM Top 10 | Code-Review KI-Pfade | 3-4h | pending Phase 2 |
| 3 | Supabase RLS-Vollabdeckung | SQL-Query, alle 61 Tabellen | 2-3h | pending Phase 2 |
| 5 | Secret-Scan im Repo | gitleaks + grep + git-history | 1h | **Phase 1.4** |
| 6 | Dependency-Vuln-Scan | npm audit + cyclonedx | 1h | **Phase 1.5** |
| 7 | CSP + Security-Headers | netlify.toml + curl | 1h | **Phase 1.6** |
| 8 | CORS | grep alle Functions | 30 min | **Phase 1.7** |
| 9 | Rate-Limit | grep + Coverage-Tabelle | 1-2h | pending Phase 2 |
| 10 | Input-Validation | grep + Schema-Audit | 2-3h | pending Phase 2 |
| 11 | localStorage-Audit | grep + Sensitivity-Tabelle | 1h | **Phase 1.8** |
| 12 | Datei-Upload-Security | Test-Upload mit Malicious-Files | 3h | pending Phase 4 |
| 13 | PDF-Generierung-Security | Injection-Test gegen PDFMonkey | 2h | pending Phase 4 |
| 14 | E-Mail-Versand | dig + mail-tester | 1h | pending Phase 4 |
| 15 | Audit-Logging-Vollständigkeit | DB-Schema + Code-Review | 2h | pending Phase 4 |
| 16 | DSGVO-Datenflussdiagramm | Mermaid + Doku | 2h | pending Phase 4 |
| 18 | Error-Handling | Provoziere Errors, prüfe Response | 2-3h | pending Phase 4 |
| 19 | Code-Quality + Dead-Code | ESLint + knip + depcheck | 2h | pending Phase 4 |
| 20 | Lighthouse Performance + A11y | Lighthouse CLI Top-10-Pages | 2h | pending Phase 4 |

### Was Claude Code mit Marcel-Hilfe macht (3 Audits)

| # | Audit | Marcel-Hilfe | Status |
|---|---|---|---|
| 4 | Multi-Tenant-Isolation-Test | Marcel: 3 Test-Workspaces in Supabase autorisieren · CC: Test-Suite bauen | pending Phase 3 |
| 17 | Backup/Restore-Drill | Marcel: Backup-Berechtigung im Supabase-Dashboard · CC: Restore-Skript + Daten-Verifikation | pending Phase 3 |
| 21 | Sentry/Error-Monitoring-Setup | Marcel: Sentry-Account anlegen, DSN bereitstellen · CC: SDK integrieren | pending Phase 4 |
| 22 | Disaster-Recovery-Plan | Marcel: Geschäfts-Impact-Bewertung pro Anbieter · CC: Plan dokumentieren | pending Phase 4 |

### Was außerhalb CC-Scope liegt (Mensch oder externe Profis)

| Audit | Wer | Wann | Aufwand |
|---|---|---|---|
| **DSGVO-Anwalt-Review** (AVV, Datenschutzerklärung, Pilot-Vereinbarung) | DSGVO-Anwalt | nach S6 Phase 5, vor erstem Pilot | 1.000-1.500€ Startup-Paket |
| **Externer Pentest** | Boutique-Pentester (3 Angebote einholen) | nach erstem Pilot-Cash | 3.000-5.000€ für 3-5 Tage |
| **DPIA** (Datenschutz-Folgenabschätzung) | DSGVO-Anwalt + Marcel | falls KI-Verarbeitung als Hochrisiko gilt | 500-1.000€ |
| **IT-Haftpflicht** | Versicherungsmakler | vor erstem zahlenden Kunden | 300-600€/Jahr |

---

## Audit-Versions-Historie

### S6 Phase 1 (02.05.2026)

| Audit | Durchgelaufen | Findings | Fixes-Commits |
|---|---|---|---|
| 5 — Secret-Scan | TBD | TBD | TBD |
| 6 — Deps | TBD | TBD | TBD |
| 7 — CSP/Headers | TBD | TBD | TBD |
| 8 — CORS | TBD | TBD | TBD |
| 11 — localStorage | TBD | TBD | TBD |

*(Wird befüllt wenn Phase 1 abgeschlossen.)*

### S6 Phase 2 (geplant, nächste Session)

OWASP ASVS L1, LLM Top 10, RLS-Coverage, Rate-Limit, Input-Validation.

### S6 Phase 3 (geplant)

Multi-Tenant-Test-Suite, Backup-Drill, CI-Integration.

### S6 Phase 4 (geplant)

Spezial-Audits 12-22.

### S6 Phase 5 (geplant)

Public-Deliverables-Final + AUDIT-SUMMARY-2026-05.md + Tag `v204-security-hardening-done`.

---

## Re-Audit-Kadenz (post-S6)

| Audit-Typ | Frequenz | Trigger |
|---|---|---|
| OWASP ASVS L1 Re-Run | quartalsweise | Post-Pilot-Erweiterungen, neue Features |
| Dependency-Vuln-Scan | wöchentlich (CI) | Auto via GitHub Dependabot oder npm audit cron |
| Secret-Scan | bei jedem Commit (CI) | gitleaks pre-commit hook |
| Multi-Tenant-Test-Suite | bei jedem Schema-Change | CI-Lauf |
| RLS-Coverage | bei jeder neuen Tabelle | Sprint-Definition-of-Done |
| Lighthouse | bei jedem Page-Add/Edit | CI |
| Externer Pentest | jährlich | nach Größe + Wachstumsphase |
| DSGVO-Anwalt-Review | bei wesentlichen Architektur-Änderungen | Marcel-Beobachtung |

---

## Glossar

- **CC** — Claude Code (diese KI-Co-Founder)
- **CRITICAL/HIGH/MEDIUM/LOW/INFO** — Severity-Stufen aus OWASP-Leitfäden
- **L1/L2/L3** — ASVS-Verification-Levels (1 = Pflicht-Mindestmaß, 2 = SaaS-Standard, 3 = Hochrisiko-Anwendungen)
- **DPIA** — Datenschutz-Folgenabschätzung nach Art. 35 DSGVO
- **AVV** — Auftragsverarbeitungs-Vertrag nach Art. 28 DSGVO
- **SCC** — Standardvertragsklauseln EU-Kommission für Drittland-Transfer
- **RTO** — Recovery Time Objective (max. erlaubte Ausfallzeit)
- **RPO** — Recovery Point Objective (max. erlaubter Datenverlust in Zeit)

---

*Audit-Compliance 02.05.2026 · Aktualisiert von Claude Code nach jedem Audit*
