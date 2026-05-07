# 🏁 PROVA Marathon zu 100% — Master-Plan v1

**Stand:** 07.05.2026 (Tag 19 Marathon-Start)
**Basis:** CC-Audit `docs/audit/AUDIT-2026-05-07-VISION-STATUS.md`
**Vision-Komplettheit aktuell:** 58%
**Ziel:** 100% Vision-Komplett
**Geschätzte Restzeit:** 8-12 Marathon-Tage (bis ~15.-19.05.2026)

---

## 🎯 Marcel-Direktive (PERMANENT)

> **"Wir bauen NICHT für 1-3 Testpiloten. Wir bauen 100% Vision-Komplett."**

- Kein "Pilot-Live-Sprint" als Marathon-Ende
- Vision-Master + Regeln-Permanent sind Source-of-Truth
- Memory ist nicht zuverlässig — Repo ist Wahrheit (Audit-Lesson)
- Web-Claude darf nie sagen "fertig" wenn Audit-Items offen sind

---

## 📊 Vision-Komplettheit pro Bereich (Audit 07.05.)

| # | Bereich | Status | % | Priorität |
|---|---|---|---|---|
| 1 | Schema (DB) | ✅ | 98% | DONE |
| 2 | KI-Härtung | 🟡 | 70% | P1 |
| 3 | KI-Modell-Migration W3-I0 | 🟡 | 75% | P2 |
| 4 | Prompt-Caching W4-Bonus | 🔴 | 0% | P3 |
| 5 | §6 Fachurteil-Editor | 🟡 | 50% | **P0** |
| 6 | Compliance-Härtung | 🟡 | 80% | **P0** |
| 7 | Flow A Schadensgutachten | 🟡 | 70% | P1 |
| 8 | Flow B Wertgutachten | 🟡 | 50% | P2 |
| 9 | Flow C Beratung | 🟡 | 40% | P2 |
| 10 | Flow D Baubegleitung | 🟡 | 45% | P2 |
| 11 | AUTH-COCKPIT | 🟡 | 75% | P2 |
| 12 | APP-LANDING-SPLIT | 🟡 | 60% | **P0** |
| 13 | Sandbox/Demo | 🔴 | 0% | P3 |
| 14 | Finanz-Workflows | 🔴 | 25% | **P0** |
| 15 | PDF-Templates | ✅ | 85% | P2 |
| 16 | Mobile-Rescue P1-P4 | 🟡 | 50% | P2 |
| 17 | Diktat + Whisper | 🟡 | 75% | P2 |
| 18 | Onboarding-Pipeline | ✅ | 85% | P1 |
| 19 | ENVs + Infrastruktur | 🟡 | 75% | **P0** |

**Legende:** P0 = Pilot-Blocker / Vision-Kern. P1 = Wichtig vor 100%. P2 = Vollausbau. P3 = Polish.

---

## 🏗️ MARATHON-WELLEN-PLAN

### 🌅 MEGA³⁰ — Tag 20 (07.05. tagsüber): "Pilot-Blocker-Sprint"

**Ziel:** 6 Pilot-Blocker schließen + ENV-Branch mergen
**Erwartet:** 58% → 67%
**Items:**

#### M30-I1 — MEGA³³-Branch zu main mergen
- Marcel-Manual: PR-Review + Merge `mega33-env-konsolidierung` → main
- 2 Manual-ENVs setzen: `PROVA_EMAIL_CRON_SECRET` + `RESEND_API_KEY` 
- Acceptance: main hat MEGA³³ Commits, Netlify Build grün

#### M30-I2 — netlify.toml Cron-Schedules
- `[[scheduled.functions]]` Block hinzufügen
- 4 Crons: trial-ending (täglich 09:00), pilot-feedback (täglich 10:00), 
  fristen-reminder (täglich 06:00), status-check (alle 5 Min)
- Cron-Secret-Auth-Pattern verifizieren
- Acceptance: Netlify Functions Schedule UI zeigt 4 aktive Crons

#### M30-I3 — §6 Fachurteil-Editor Lücken-Closure (KRITISCH)
- 6 AUDIT-UNKLAR-Items in `stellungnahme.html` hardenen:
  1. 60% Viewport-Layout für Editor-Textfeld
  2. 500-Zeichen-Eigenleistung-Gate als hartes Pre-Freigabe-Gate
  3. 2/3 Qualitäts-Marker (Norm-Regex / Konjunktiv-Regex / §-Verweis-Regex)
  4. Override-Modal mit `audit_trail`-Eintrag bei < 500 Zeichen
  5. S1/S2/S3-Buttons opt-in (NICHT default), CSS-Trennung
  6. Skizzen-Inline-Embed via Marker `[SKIZZE-N]` aus skizzen-Tabelle
- Tests: `tests/fachurteil-editor.test.js` mit 6 Coverage-Cases
- Acceptance: alle 6 Soll im Editor + getestet

#### M30-I4 — §407a-Pre-Send-Modal in freigabe.html
- Modal vor Freigabe-Button mit 3 Pflicht-Häkchen:
  1. "Ich bestätige, dass ich das §6 Fachurteil persönlich erstellt habe"
  2. "Ich bestätige, dass KI-Hilfen nur als Werkzeug genutzt wurden"
  3. "Ich bestätige die Richtigkeit aller Stamm- und Auftrags-Daten"
- Audit-Trail-Eintrag bei Bestätigung (kategorie='compliance_407a_bestaetigt')
- Acceptance: Freigabe blockiert ohne 3 Häkchen, Audit-Eintrag korrekt

#### M30-I5 — DSGVO Vollendung
- DB-Function `dsgvo_user_portabilitaet()` via Supabase-MCP anlegen
- Lambda `netlify/functions/dsgvo-portabilitaet.js`
- UI-Page `app/dsgvo-mein-konto.html` mit 3 Buttons (Export / Portabilität / Löschen)
- 7-Tage-Cool-Off bei Löschung
- Tests
- Acceptance: alle 3 DSGVO-Functions live + UI-Page

#### M30-I6 — `ki_protokoll`-Insert-Coverage Audit
- Grep alle `ki-proxy.js`-Calls
- Verifizieren: jeder Call → Insert in ki_protokoll
- Defensive Fallback bei DB-Error
- Tests: Mock-Insert-Verifikation
- Acceptance: 100% Coverage, kein KI-Call ohne Logging

---

### 🌃 MEGA³¹ — Tag 21 (07.→08.05. NACHT): "Finanz + Vision-Kern"

**Ziel:** Finanz-Workflows + KI-Härtung-Test-Suite
**Erwartet:** 67% → 76%
**Items:**

#### M31-I1 — Mahnwesen-Cron-Lambda (3 Stufen)
- `netlify/functions/mahnwesen-cron.js` täglich 06:00
- Stufen: Tag 14 (Erinnerung) / Tag 21 (Mahnung +5€) / Tag 35 (Letzte +10€)
- PDFMonkey-Templates F-06/F-07/F-08
- Email via Resend
- SV-Push-Notification
- Idempotenz (kein 2× triggern)
- Schema: `rechnungen.mahn_stufe` + `mahn_datum_letzte`
- Tests: 4 Test-Cases
- Acceptance: Cron registriert + Stufen-Logik korrekt

#### M31-I2 — ZUGFeRD-Rechnungen 2.1 BASIC
- Lambda `netlify/functions/rechnung-zugferd.js`
- XML-Generation aus rechnung-Daten
- PDF/A-3 Embedding via pdf-lib
- Storage in `sv-files/rechnungen/zugferd/`
- Email-Versand mit ZUGFeRD-PDF als Anhang
- Tests: XML-Validierung gegen Schema
- Acceptance: ZUGFeRD-konformes PDF+XML in Anhang

#### M31-I3 — 5-Test-Suite pro KI-Funktion (Regel 15)
- Pro KI-Funktion (10 Funktionen aus KI-PROMPTS-MASTER):
  1. Funktionalitäts-Test (gibt Output?)
  2. Edge-Case-Test (leerer Input, Sonderzeichen)
  3. Präzisions-Test (Erwarteter Output erreicht?)
  4. Konsistenz-Test (gleicher Input → gleicher Output bei temperature 0)
  5. Performance-Test (< 10s)
- Verzeichnisse: `tests/ki-funktionen/{funktion}/`
- Acceptance: 50 Tests grün (10 Funktionen × 5)

#### M31-I4 — Force-Admin-2FA-Logic
- `admin-login.html`: 2FA-Pflicht-Check für admin_emails
- Bei Login ohne 2FA: redirect zu `/setup-2fa.html`
- Tests
- Acceptance: Marcel kann sich nicht ohne 2FA in Admin einloggen

#### M31-I5 — `auftraege.auftraggeber_typ` Migration
- Marcel-Decision: ENUM-Spalte vs M:N-Tabelle `auftrag_kontakte`
- Migration anlegen + applizieren via Supabase-MCP
- `auftrag-neu-logic.js` Live-Save aktivieren (Sprint 06c)
- Tests
- Acceptance: Wizard speichert Auftraggeber live in DB

---

### 🌅 MEGA³² — Tag 22 (08.05. tagsüber): "APP-LANDING-SPLIT Final"

**Ziel:** Marcel-Direktive umsetzen — Repo-Trennung + Marketing-Site
**Erwartet:** 76% → 84%
**Items:**

#### M32-I1 — APP-LANDING-SPLIT Code-Repo-Hardening
- Audit: Code-Mix prüfen (was rendert wo?)
- netlify.toml: separate Build-Targets für Landing vs App
- SW-Scope: zwei Service-Worker (sw-landing.js + sw-app.js)
- Cookies: getrennte Domains, kein Cross-Domain-Sharing
- Cross-Domain-Redirects host-explizit
- App-Boundary-Hardening (kein App-Code auf Landing-Domain)
- Tests: 15-Page-Smoke-Test
- Acceptance: Audit-Ergebnis "Code-Trennung sauber"

#### M32-I2 — Landing als komplette Marketing-Site
- Hero-Section mit USP-Claim
- Features-Section: 8-10 Funktionen visualisiert
- Pricing-Cards (Solo 179€ / Team 379€ / Founding 99€)
- Testimonials-Slot (placeholder-fähig)
- FAQ (10 Fragen aus echten SV-Pain-Points)
- About/Founder-Story-Page
- Footer mit Legal-Links
- Blog-Section (mind. 3 Pillar-Posts)
- Acceptance: Landing-Lighthouse > 95

#### M32-I3 — SEO + Performance-Polish
- Schema.org SoftwareApplication-Markup
- Open-Graph-Tags
- Sitemap.xml + robots.txt
- Image-Optimization (WebP)
- Critical-CSS inlined
- Acceptance: Lighthouse SEO 100, Performance > 90

#### M32-I4 — Bescheinigungen 7 Arten Vollständigkeit
- Audit der `dokument_typ` ENUM (33 Werte) — 7 Bescheinigungen identifizieren
- Templates check: welche fehlen in `02-bestaetigungen/`?
- Fehlende Templates anlegen (RECHERCHE-PFLICHT! IHK + BVS-Quellen)
- Test-Daten als JSON pro Template
- Acceptance: 7/7 Bescheinigungen in PDFMonkey + Code

---

### 🌃 MEGA³³ — Tag 23 (08.→09.05. NACHT): "4-Flows Vollausbau"

**Ziel:** Flows B/C/D auf 90%+ bringen
**Erwartet:** 84% → 90%
**Items:**

#### M33-I1 — Flow B Wertgutachten Multi-Verfahren
- Sachwert-Verfahren (BewG)
- Vergleichswert-Verfahren
- Ertragswert-Verfahren
- ImmoWertV-Konformität
- 3 Templates (oder F-19a/b/c-Variants)
- BORIS-Daten-Lookup (RECHERCHE-PFLICHT)
- Tests
- Acceptance: alle 3 Verfahren wählbar + funktional

#### M33-I2 — Flow C Beratung 3-Phasen-Workflow
- Phase 1 Annahme: Beratungs-Auftrag + Honorar-Vereinbarung
- Phase 2 Termin: Vor-Ort-Termin + Diktat + Notizen
- Phase 3 Abschluss: Beratungs-Bericht + Rechnung
- Page-Wizard
- Templates
- Tests
- Acceptance: 3 Phasen durchlaufbar end-to-end

#### M33-I3 — Flow D Baubegleitung Multi-Termin
- Phasen: Auftragsannahme + n Begehungs-Termine + Schluss-Bericht
- Eintraege-Linking pro Termin
- Foto-Doku pro Begehung
- Bau-Phasen-Timeline-UI
- Templates
- Tests
- Acceptance: n-Termin-Workflow + Schluss-Bericht-PDF

#### M33-I4 — Flow A Skip-Logic
- Beweissicherung-Skip (kein §6, kein Fachurteil)
- Gegengutachten-Skip
- Ergänzungsgutachten-Skip
- Wizard-Logic verifizieren
- Tests
- Acceptance: 3 Spezial-Flows ohne §6 funktional

---

### 🌅 MEGA³⁴ — Tag 24 (09.05.): "AUTH-COCKPIT P3 + Mobile-Rescue"

**Ziel:** Cockpit auf 95%+ + Mobile P1-P4 ausbauen
**Erwartet:** 90% → 95%
**Items:**

#### M34-I1 — Gutachten-Timing per User Widget
- `admin-time-tracking.js` (oder vorhanden hardenen)
- Gutachten-Erstellungs-Zeit aggregieren pro User
- Heatmap im Cockpit
- Acceptance: Widget zeigt Daten

#### M34-I2 — Subdomain admin.prova-systems.de DNS-Live-Verify
- Marcel-Manual: DNS-Records bei IONOS prüfen
- SSL-Cert verifizieren
- Smoke-Test: 17/17 Cockpit-Widgets laden
- Acceptance: admin-Subdomain produktiv

#### M34-I3 — Mobile-Rescue P1: Mobile-Layout-Audit
- Page-by-Page-Audit (alle Hauptpages mobile)
- Touch-Targets >= 44px Coverage
- Sidebar-Resize-Bug-Fix (Vision-Master + Memory-Notiz)
- Audit-Doku in `docs/audit/MOBILE-AUDIT-P1.md`
- Acceptance: Audit-Score dokumentiert

#### M34-I4 — Mobile-Rescue P2-P4
- P2: Touch-Target-Vollabdeckung
- P3: Mobile-Diktat-First-UX (Audio-Recording als Primary-Action mobile)
- P4: Mobile-Foto-Upload-Optimierung (Geo-Tag, EXIF-Strip, Komprimierung)
- Tests mobile (Playwright Mobile)
- Acceptance: Mobile-Smoke-Test grün

#### M34-I5 — Whisper-Chunker für >25MB Audio
- Audio-Splitting-Lambda
- Chunked-Processing
- Re-Assembly Transkript
- Tests
- Acceptance: 60-Min-Diktat erfolgreich transkribiert

---

### 🌃 MEGA³⁵ — Tag 25 (09.→10.05. NACHT): "Sandbox + KI-Polish"

**Ziel:** Sandbox/Demo + KI-Migration Polish
**Erwartet:** 95% → 98%
**Items:**

#### M35-I1 — Sandbox/Demo für Landing
- prova-systems.de/demo Page ohne Login
- Mock-Workflow Schadensgutachten end-to-end
- Tour-Komponente 5-7 Steps
- Mock-Layer (kein echter API-Call)
- Conversion-Funnel-Tracking via feature_events
- Watermark "DEMO" auf Outputs
- Tests
- Acceptance: Demo-Workflow ohne Login durchführbar

#### M35-I2 — `lib/ai-router.js` Standalone
- chooseModel() in eigenem Lib-File
- Reuse durch andere Lambdas
- Tests
- Acceptance: ai-router.js als Modul nutzbar

#### M35-I3 — Prompt-Caching Aktivierung (W4-Bonus)
- System-Prompts > 1024 Tokens stabilisieren
- OpenAI cache_control Headers
- Schema: `ki_protokoll.cached_tokens_in` Migration
- Cost-Tracking-Update
- Tests
- Acceptance: -40% Input-Cost messbar

#### M35-I4 — User-Setting "ki_modus"
- Spalte `users.ki_modus` (ENUM: 'schnell', 'praezise')
- Settings-Page-Toggle
- chooseModel() respektiert User-Mode
- Tests
- Acceptance: User kann Modus umschalten

#### M35-I5 — AVV-Tabelle pflegen
- `versicherungs_partner` mit allen relevanten AVV-Empfängern
- Marcel + Recherche: BVS, Versicherer, IHK
- Pflicht-Felder gefüllt
- Acceptance: ≥10 Einträge

---

### 🌅 MEGA³⁶ — Tag 26 (10.05.): "Final-QA + 100%"

**Ziel:** 100% Vision-Komplett
**Erwartet:** 98% → 100%
**Items:**

#### M36-I1 — Vision-Master Re-Audit
- Komplettes Repo-Audit gegen Vision-Master
- Pro Bereich erneut % bestimmen
- Letzte Lücken identifizieren + schließen
- Acceptance: alle 19 Bereiche ≥ 90%

#### M36-I2 — Edge-Cases + Performance-Polish
- 50 Edge-Case-Tests
- Performance-Optimization (Bundle-Size, Lambda-Cold-Start)
- Sentry-Integration final
- Acceptance: alle Tests grün, Performance-Budget eingehalten

#### M36-I3 — Pre-Audit IHK-Konformität
- IHK-SVO 4-Teile-Struktur Check auf allen Templates
- Tranche-1-Templates fixen (7 mit falscher §1-§6-Struktur)
- §407a-Compliance-Walk
- EU AI Act Art. 50 Coverage
- Acceptance: IHK-Pre-Audit-Report grün

#### M36-I4 — Forced Re-Consent bei Doku-Update
- `rechtsdokumente.version`-Tracking
- `pending_consents` View für aktive Sessions
- Modal vor App-Use bei neuer Version
- Tests
- Acceptance: Re-Consent-Modal triggert korrekt

#### M36-I5 — Final-Smoke-Test 50 User-Flows
- 50 End-to-End-Flows (alle 4 Flows × Edge-Cases)
- Playwright-Suite
- Acceptance: 50/50 grün

---

## 🎯 Zeit-Realistik

| Tag | Datum | Welle | Erwartete Items | Vision-Stand |
|---|---|---|---|---|
| 20 | 07.05. tagsüber | MEGA³⁰ | 6 Items | 58% → 67% |
| 21 | 07.→08.05. Nacht | MEGA³¹ | 5 Items | 67% → 76% |
| 22 | 08.05. tagsüber | MEGA³² | 4 Items | 76% → 84% |
| 23 | 08.→09.05. Nacht | MEGA³³ | 4 Items | 84% → 90% |
| 24 | 09.05. | MEGA³⁴ | 5 Items | 90% → 95% |
| 25 | 09.→10.05. Nacht | MEGA³⁵ | 5 Items | 95% → 98% |
| 26 | 10.05. | MEGA³⁶ | 5 Items | 98% → 100% |

**Gesamt: 7 Marathon-Tage. ~34 Items. Tag der Vision-Komplettheit: ~10.05.2026.**

Mit Puffer für Unvorhergesehenes: **bis 12.-15.05.2026 zu 100%**.

---

## 🚨 Pflicht-Patterns (alle 7 Wellen)

### Pattern 1: SCHEMA-FIRST
- `docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md` ist SSOT
- Bei DB-Touch: Schema verifizieren VOR Code

### Pattern 2: PER-ITEM-COMMIT-PUSH
- Atomic Commits + Push nach jedem Item
- Format: `feat(MEGA{N}-I{X}): <kurz>`

### Pattern 3: CONTINUOUS-RUN bei Nacht-Wellen
- Marcel schläft, kein Stopp
- EIN Final-Report am Ende der Welle

### Pattern 4: RECHERCHE-PFLICHT
- Vor jeder fachlichen Aussage über SV-Praxis: ≥10 Quellen
- IHK / BVS / VBD / IfS / SVO / Urteile / Fachlit
- Quellen am Antwort-Ende namentlich

### Pattern 5: SCHEMA-FIRST → CODE-LATER
- Bei Drift-Risiko: pause + audit
- Migration via Supabase-MCP

### Pattern 6: TEST-COVERAGE NICHT FALLEN
- Aktueller Stand: 148+ Tests grün
- Pro Item: neue Tests dazu, keine alten brechen

### Pattern 7: AUDIT-DRIVEN-DEV
- CC-Audit als Quelle, nicht Memory
- Bei Konflikt: Repo gewinnt

---

## 📋 Welcher Welle JETZT starten?

**MEGA³⁰ — Tag 20 (07.05. tagsüber):**

Pflicht-Marcel-Manual zuerst:
1. ✅ MEGA³³-Branch reviewen + zu main mergen
2. ✅ ENVs setzen: `PROVA_EMAIL_CRON_SECRET` + `RESEND_API_KEY`
3. ✅ Stripe Webhook Live-Mode-Switch (falls noch nicht)

Dann CC-Sprint:
4. ✅ §6 Editor 6 Lücken-Closure
5. ✅ §407a-Pre-Send-Modal
6. ✅ DSGVO Vollendung
7. ✅ Cron-Schedules
8. ✅ ki_protokoll-Coverage

---

## 🎬 Pro-Welle CC-Prompts: nach Bestätigung von Marcel

Web-Claude erstellt pro Welle einen Mega-Prompt für CC mit:
- Acceptance-Criteria-First
- Self-Scoping erlaubt
- Kein Code-Snippet (Marcel-Direktive 09.05.)
- Per-Item-Push
- RECHERCHE-PFLICHT bei SV-Fach-Items

---

**Letzte Aktualisierung:** 07.05.2026 morgens
**Nächste Aktualisierung:** nach jeder Welle (% pro Bereich neu)
