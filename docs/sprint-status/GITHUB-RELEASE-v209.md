# GitHub-Release-Notes — v209-user-facing-maximum-done

> Marcel kopiert Inhalt nach https://github.com/PROVA-Systems/prova-systems/releases/new + Tag `v209-user-facing-maximum-done`.

---

## 🌙 PROVA Systems v209 — User-Facing-Maximum

POST³-MEGA-MEGA. 8 Sub-Sprints in 5h. 8 Commits. 110 Tests grün.
Pattern-Reuse + Realitaets-Check + Senior-Engineering-Behavior.

### Was ist neu

#### 📄 Q1 — F-09 + F-15 Liquid-Goldstandards (`0f07921`)
- **F-09 KURZGUTACHTEN** (~485 LOC): Teil 3.1-3.5 Befundaufnahme/Beweissicherung/Ursachenanalyse/Fachurteil/Sanierung
- **F-15 GERICHTSGUTACHTEN** (~520 LOC): Beweisbeschluss + Beweisfragen + Verfahrensparteien + § 404a/§ 407a/§ 10 IHK-SVO
- Beispiel-Payloads mit realistischen Schadensfällen

#### 📱 Q2+Q3 — Mobile-Rescue (`da4f522`)
- `lib/mobile-polish.css` (~140 LOC): Touch-Targets 44×44, iOS Safe-Area, Tabellen→Cards, Tablet-Layout, Print-Styles
- `lib/mobile-polish.js` (~180 LOC): Lazy-Loading-Polyfill, Offline-Banner, Pull-to-Refresh, Camera-API, Geolocation
- 10 Pages integriert (dashboard/akte/app/freigabe/archiv/einstellungen/stellungnahme/wertgutachten/beratung/baubegleitung)

#### 💼 Q4 — Flow C Beratung (`4bc85a2`)
- `lib/schemas/beratung.js` mit 3 zod-Schemas + 3 Enums
- F-20 BERATUNGSPROTOKOLL Liquid-Goldstandard mit Honorar-Card + Empfehlungs-Prioritäts-Badges

#### 🏗 Q5 — Flow D Baubegleitung (`cafa538`)
- `lib/schemas/baubegleitung.js` mit Projekt + Begehung + Abnahme
- F-21 BAUBEGLEITUNG-PROTOKOLL (periodische Begehung, Mangel-Schwere-Color-Coding)
- F-22 BAUABNAHME (Status-Card + Sicherheitseinbehalt + § 640 BGB / § 12 VOB/B)

#### 🎛 Q6 — AUTH-COCKPIT Voll-Version (`ec40ffb`)
- `admin/voll.html` mit 12 Tab-Sektionen + Charts.js
- 3 neue Backend-Endpoints (Live-Sessions, KI-Costs, System-Health) — alle mit 2FA-Pflicht
- 6/12 Sektionen live, 6/12 als BACKLOG transparent dokumentiert

#### 🧪 Q7 — Test-Coverage 70 → 110 (`f504785`)
- 17 neue Tests für Beratung-Schemas
- 23 neue Tests für Baubegleitung-Schemas
- `npm run test:all` läuft 110/110 grün

### Bricht das was?

**Nein.** Reine additive + defensive Änderungen.

⚠ **Eine Verhaltens-Aenderung:** 3 neue Admin-Endpoints (`admin-live-sessions`, `admin-ki-costs`, `admin-system-health`) erfordern AAL2 (2FA) wie bereits in v208.

### Marcel-Pflicht

1. F-04 + F-09 + F-15 PDFMonkey-Migrations (HTML-Copy ins Dashboard)
2. F-20 + F-21 + F-22 Templates in PDFMonkey neu anlegen
3. PROVA_SENTRY_TEST_SECRET in Netlify ENV
4. Supabase MFA aktivieren → AAL2-Login
5. Admin-Cockpit Voll-Version unter `/admin/voll.html` testen
6. `npm run test:all` lokal — sollte 110/110 grün sein

### Bekannte Limitationen (BACKLOG Sprint K-2)

- 6 Cockpit-Voll-Sektionen (Time-Tracking, Feature-Heatmap, Drop-off, Churn, PDF-Queue, Alerts) — transparent dokumentiert
- AIRTABLE-MIG-01..04 bundles (~17-22h)
- H-25..H-30 Auth-Backlog
- Mobile-Phase-4-Polish in 30+ restlichen Pages

### Tag-Liste

- v200-app-landing-split-done
- v203-vollcutover-airtable-out
- v204-security-hardening-done
- v206-skalierung-mega-done
- v207-pilot-launch-ready (POST-MEGA-MEGA)
- v208-tech-debt-marathon-done (POST-POST-MEGA-MEGA)
- → **v209-user-facing-maximum-done** (POST³-MEGA-MEGA)

### Files-Stats

```
8 commits · 30+ files modified · 20+ files created
110/110 Tests gruen
~3500 LOC neu (davon ~1400 LOC Templates, ~600 LOC Tests,
~700 LOC Cockpit, ~400 LOC Mobile-Polish, ~400 LOC Doku)
0 NACHT-PAUSE-Files (alle Aufgaben pragmatisch geloest)
```

---

🤖 Erstellt im POST³-MEGA-MEGA User-Facing-Maximum-Sprint, 04.05.2026 nacht.
Co-Authored-By: Claude Opus 4.7 (1M context)
