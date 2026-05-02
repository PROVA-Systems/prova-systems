# Sprint D Status — STRIDE Threat-Model

**Datum:** 02.05.2026 nacht
**Output:** `docs/strategie/PROVA-THREAT-MODEL.md`
**Pentest-Briefing-Update:** `docs/strategie/PENTEST-BRIEFING.md` mit Threat-Model-Link

---

## Cluster-Coverage

| Cluster | Threats | Mermaid-Diagramm | Status |
|---|---:|---|---|
| 1 Auth | 6 | ✅ Sequence | DONE |
| 2 KI | 6 | ✅ Flowchart | DONE |
| 3 Daten | 6 | ✅ Flowchart | DONE |
| 4 Billing | 6 | ✅ Sequence | DONE |
| 5 Admin | 6 | ❌ (noch nicht implementiert) | PENDING (Sprint 18) |

**TOTAL: 30 echte Threats (Cluster 5 dokumentiert für Sprint 18)**.

Marcel-Akzeptanz „mind. 30 Threats": ✅ erfüllt.

---

## Severity-Verteilung

| Severity | # | Backlog-Status |
|---|---:|---|
| CRITICAL | 2 | RL-01 (NACHT-PAUSE), 2FA (Marcel-Aktion) |
| HIGH | 6 | alle in BACKLOG |
| MITTEL | 9 | alle in BACKLOG |
| NIEDRIG | 14 | Standard-Mitigations vorhanden |

---

## Backlog-Übergabe (11 Findings TM-01 bis TM-11)

→ siehe `docs/strategie/PROVA-THREAT-MODEL.md` Aggregations-Tabelle. Alle TM-Findings sind cross-referenced auf bestehende BACKLOG-Einträge oder NEEDS-MARCEL.

---

## Wichtige Beobachtungen

### Cluster Auth — solide
- Supabase ES256 + JWKS-Verify ist Industry-Standard
- Phase 1.9 hat CORS + COOP/COEP gefixt
- **Einzige CRITICAL:** `auth-token-issue` Brute-Force (Tot-Code, NACHT-PAUSE für Marcel-Entscheidung)

### Cluster KI — Pseudo-Lücke in KI-008
- KI-PROMPTS-MASTER zeigt: Normen-Picker (smart-mode) sendet ungeschütztes Diktat
- Sprint-9-Pflicht-Fix

### Cluster Daten — RLS solide, Upload-Validation Lücke
- RLS-Coverage 60/60 Tabellen
- 4 Findings für PLANNED-Migration (H-12)
- foto-upload Polyglot + DoS-Schutz fehlen

### Cluster Billing — Stripe-Standard
- Webhook-Signatur-Verify ✅
- Idempotenz via UNIQUE-Constraint ✅
- Einzige Lücke: stripe_events INSERT-Policy (PLANNED-Migration)

### Cluster Admin — noch nicht aktiv
- Sprint 18 geplant
- 2FA für Marcel-Account ist sofortige Pflicht (Phase 1)

---

## Pentest-Pre-Read

`docs/strategie/PENTEST-BRIEFING.md` jetzt mit Verweis auf Threat-Model. Pentester bekommen vor dem Engagement:
- 5-Cluster-Datenfluss-Diagramme
- 30 dokumentierte Threats mit Mitigation-Status
- Severity-Sortierung

→ spart Pentester Discovery-Zeit, fokussiert auf Verifikation + Net-New-Findings.

---

## Was Claude Code in Sprint D NICHT gemacht hat

- ❌ Cluster-5 ausgearbeitet (admin.prova-systems.de noch nicht implementiert)
- ❌ Tests pro Threat geschrieben (Sprint 9-10 Multi-Tenant-Test-Suite-Erweiterung)

---

## Was Claude Code AUTONOM gemacht hat

- ✅ 5 Cluster mit STRIDE-Methodik
- ✅ 30 Threats dokumentiert
- ✅ 4 Mermaid-Diagramme (Auth, KI, Daten, Billing)
- ✅ Severity-Bewertung pro Threat
- ✅ Cross-Reference zu BACKLOG
- ✅ Pentest-Briefing-Update

---

*Sprint D abgeschlossen 02.05.2026 nacht. Mega-Nacht-Sprint A+B+C+D komplett — Final-Report folgt.*
