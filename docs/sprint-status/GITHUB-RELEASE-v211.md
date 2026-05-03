# GitHub-Release-Notes — v211-compliance-pilot-ready-done

> Marcel kopiert Inhalt nach https://github.com/PROVA-Systems/prova-systems/releases/new + Tag `v211-compliance-pilot-ready-done`.

---

## 🌙 PROVA Systems v211 — Compliance + Pilot-Ready + Cockpit-Final

MEGA⁶. 7 Sub-Sprints in 4h. 6 Commits. **Tests 110 → 209 grün.**

### Was ist neu

#### 🎛 S1 — AUTH-COCKPIT 12/12 Sektionen Final (`f50b16d`)
- 6 neue Backend-Endpoints (alle mit 2FA-Pflicht): time-tracking, feature-heatmap, funnel, churn, pdf-queue, push-alerts
- 6 Coming-Soon-Boxes durch echte Tab-Bodies ersetzt
- Heatmap-Cell color-intensity, Sev-Badges für Alerts

#### 🛡 S2 — DSGVO-Audit-Vorbereitung (`503b74a`)
- DSGVO-AUDIT-CHECKLIST.md (30+ Punkte)
- VERARBEITUNGSVERZEICHNIS.md (Art. 30, 10 Tätigkeiten)
- DSFA-PROVA.md (Art. 35, 5 Risiko-Verarbeitungen)
- AVV-LISTE.md (Art. 28, 10 Subprozessoren)
- 18 DSGVO-Pseudonymisierungs-Tests

#### ⚖ S3 — Anwalt-Reviews-Doku (`9b1bee0`)
- 6 review-bereite Drafts in `legal-current/`: agb / datenschutz / impressum / avv-template / ai-disclosure / sv-407a-statement
- Briefing + Tracking + Anwalt-Recherche

#### 🚦 S4 — Pilot-Ready-Final-Check (`308e794`)
- `scripts/pilot-readiness-check.js` mit 18 Smoke-Checks + JSON-Report
- PILOT-ONBOARDING-FINAL.md (90-Tage-Reise mit 8 Touchpoints)
- PILOT-FAQ.md (Top 20 Fragen)
- PILOT-READINESS-FINAL.md mit 🟢 GO + 4 Marcel-Pflichten

#### 🧪 S5 — Test-Coverage 110 → 209 (`43e37e7`)
- Storage-Router-Tests (8)
- Cockpit-Endpoint-Tests (49 = 16 Endpoints × 3 Aspekte)
- DSGVO-Loesch-Tests (10)
- Total 209/209 grün

### Bricht das was?

**Nein.** Reine additive Aenderungen.

⚠ **Verhaltens-Aenderung (aus MEGA-MEGA-MEGA O4):** Die 6 neuen Cockpit-Endpoints erfordern AAL2 (2FA) wie alle Admin-Endpoints.

### Marcel-Pflicht (priorisiert)

**🔴 Kritisch:**
1. Anwalt-Erstgespraech (datenschutz, avv-template, ai-disclosure, sv-407a-statement) — 1.500-3.000 €
2. PROVA_SENTRY_TEST_SECRET in Netlify ENV
3. Supabase MFA aktivieren (TOTP)
4. PDFMonkey 6 Templates hochladen

**🟡 Vor 1. Pilot-Login:**
5. `npm run test:pilot-ready` lokal
6. Admin-Cockpit `/admin/voll.html` durchgehen
7. Cancellation-Survey-Modal in einstellungen.html

### Bekannte Limitationen (Sprint K-2 Backlog)

- Anwalt-Review-Phase-1 (siehe oben)
- Incident-Response-Plan
- Storage-Router: 8 weitere Functions migrieren
- Cookie-Banner-Pflicht-Pruefung

### Tag-Liste

- v207-pilot-launch-ready
- v208-tech-debt-marathon-done
- v209-user-facing-maximum-done
- v210-airtable-migration-done
- → **v211-compliance-pilot-ready-done** (dieser Release)

### Files-Stats

```
6 commits · 30+ files modified · 20+ files created
209/209 Tests gruen
~3.500 LOC neu (Endpoints + Compliance-Docs + Tests + Pilot-Docs)
0 NACHT-PAUSE-Files
```

---

🤖 Erstellt im MEGA⁶-Sprint COMPLIANCE+PILOT-READY+COCKPIT-FINAL, 04.05.2026 nacht.
Co-Authored-By: Claude Opus 4.7 (1M context)
