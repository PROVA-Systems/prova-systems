# PROVA E2E Smoke - Result

> **Hinweis:** Die automatisierten Zeilen sind ein **statischer Code-/Verkabelungs-Check** (kein Browser, kein Live-Workflow). Manuelle Browser-Checks unten ausfuellen.

| Feld | Wert |
|------|------|
| **Generiert** | 2026-04-10 12:27:28 |
| **Projektroot** | `C:\PROVA-Systems\prova-systems\WEBSITE\PROVA-Deploy_3` |
| **Gesamt (Code-Wiring)** | **PASS** |

## Automatisierte Checks

| Status | Check | Datei |
|--------|-------|-------|
| PASS | Dashboard loads dashboard logic | `dashboard.html` |
| PASS | Dashboard loads frist-guard | `dashboard.html` |
| PASS | Dashboard uses FAELLE table | `dashboard-logic.js` |
| PASS | Dashboard uses RECHNUNGEN table | `dashboard-logic.js` |
| PASS | Dashboard uses TERMINE table | `dashboard-logic.js` |
| PASS | Akte tab Overview exists | `akte.html` |
| PASS | Akte tab Gutachten exists | `akte.html` |
| PASS | Akte tab Rechnung exists | `akte.html` |
| PASS | Akte tab Termine exists | `akte.html` |
| PASS | Akte tab Kommunikation exists | `akte.html` |
| PASS | Akte tab Unterlagen exists | `akte.html` |
| PASS | Akte tab Notizen exists | `akte.html` |
| PASS | Termine includes Abgabefrist type | `termine.html` |
| PASS | Termine includes Gerichtstermin type | `termine.html` |
| PASS | Termine has Frist-Guard push hook | `termine.html` |
| PASS | Freigabe uses make-proxy g3 (no hardcoded Make URL) | `freigabe.html` |
| PASS | Korrektur uses make-proxy s1 (no hardcoded Make URL) | `freigabe.html` |
| PASS | Freigabe has 120s timeout handling | `freigabe.html` |
| PASS | Rechnungen uses make-proxy f1 | `rechnungen-logic.js` |
| PASS | Onboarding uses make-proxy l8 | `onboarding.html` |
| PASS | make-proxy accepts k3,a5,f1,g3,l8,s1 | `netlify/functions/make-proxy.js` |
| PASS | Nav contains Widerspruch entry | `nav.js` |
| PASS | Nav contains Jahresbericht entry | `nav.js` |
| PASS | Nav contains Hilfe entry | `nav.js` |
| PASS | Nav import entry appears exactly once | `nav.js` |

## Manuelle Browser-Checks

Siehe `tools/E2E-CHECKLIST.md`. Nach dem Durchlauf hier ergaenzen:

- Dashboard: 
- Akte Tabs: 
- Akte Links (az): 
- Termine speichern: 
- Import: 
- Freigabe: 
- Rechnungen F1: 
- Onboarding: 
- Navigation: 

