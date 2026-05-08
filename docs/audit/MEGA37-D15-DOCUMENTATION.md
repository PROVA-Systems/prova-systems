# MEGA³⁷ D15 — Documentation + Onboarding

**Datum:** 2026-05-08

## Doku-Inventar

| Datei | Zweck | Aktuell? |
|-------|-------|----------|
| README.md (80 LoC) | Setup-Quick-Start | 🟡 zu kurz für 290-Page-App |
| PROVA-VISION-MASTER.md (464 LoC) | 4-Flow-Architektur | 🟢 Stand M³⁵ |
| CLAUDE.md | CC-Arbeitsregeln | 🟢 stetig gepflegt |
| CHANGELOG-MASTER.md (699 LoC) | Sprint-Historie | 🟢 |
| docs/master/PROVA-MARCEL-ONBOARDING.md | Marcel-Selbsthilfe | 🟢 |
| docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md | Schema-Doku | 🟢 |
| docs/master/PROVA-REGELN-PERMANENT.md | Anti-Patterns | 🟢 |
| docs/templates-goldstandard/ | PDFMonkey-Templates | 🟢 |
| KI-PROMPTS-MASTER.md (Root) | KI-Prompts | 🟢 |
| docs/audit/MEGA*-*.md (40+ Dokus) | Sprint-Audit-Trail | 🟢 |
| docs/ops/MEGA37-MARCEL-VAULT-MIGRATION.md | Marcel-Action für M³⁷ | 🟢 NEU |

## Lücken

| Item | Severity |
|------|----------|
| ADRs für Schlüssel-Entscheidungen (z. B. Vanilla-JS vs React) | 🟡 MEDIUM |
| Runbooks für Pilot-Operations | 🟡 MEDIUM |
| Public API-Docs | 🟡 MEDIUM |
| LICENSE-File | ⚠️ prüfen — fehlt? |
| Architecture-Diagramm | 🟡 MEDIUM |

## Top-3-Empfehlungen
1. **README.md erweitern:** Architektur-Diagramm, Tech-Stack-Tabelle, Setup-Anleitung für neue Entwickler (Beilage zu MARCEL-ONBOARDING).
2. **ADRs einführen** in `docs/adr/`: 1 Datei pro Schlüssel-Decision (Vanilla-JS, Supabase-First, Vault-Migration etc.).
3. **Runbook für Pilot-Live-Day:** Was-tun-wenn-X-passiert, Eskalations-Pfad, Marcel-Pager-Routine.

## Quellen
- ADR Tools — adr.github.io
- Diátaxis Documentation Framework — diataxis.fr
