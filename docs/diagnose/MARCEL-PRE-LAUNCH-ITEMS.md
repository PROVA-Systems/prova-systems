# 🎯 Marcel Pre-Launch-Action-Items (MEGA²⁵ Phase 1)

**Stand:** 2026-05-09
**Owner:** Marcel Schreiber
**Status:** 4 Pflicht-Items + 7 Empfehlungen vor Pilot-Launch

---

## TL;DR (3 Zeilen)

1. **4 BLOCKER** — ohne diese läuft Pilot NICHT (~30 Min)
2. **3 EMPFOHLEN** — vor Welle 1 (Mo 2026-05-12) (~2h)
3. **4 NICE-TO-HAVE** — post-Pilot (kein Blocker)

---

## 🔴 BLOCKER-Items (vor Push-zu-main)

### Item 1: `npm install pdf-parse` (~1 Min)

**Warum:** Lambda `parse-beweisbeschluss.js` requires pdf-parse. Aktuell NICHT in `package.json`.

**Code-Side-Check:**
```bash
grep "pdf-parse" package.json
# Ergebnis: 0 (FEHLT)
```

**Fix:**
```bash
npm install pdf-parse --save
git add package.json package-lock.json
git commit -m "chore(deps): add pdf-parse for parse-beweisbeschluss"
```

**Verify:**
```bash
node -e "console.log(require('pdf-parse'))"
# Erwartet: Function definition
```

**Risk wenn nicht erledigt:** Beweisbeschluss-Upload (Block 1) schlägt mit "pdf-parse not available" fehl. **CRITICAL** — Beweisbeschluss-PDF-Funktionalität funktioniert nicht.

---

### Item 2: Migration 11 in Supabase applyen (~5 Min)

**Warum:** Spalten `auftraege.beweisbeschluss_*` müssen existieren für parse-beweisbeschluss.

**File:** `supabase-migrations/11_auftraege_beweisbeschluss.sql` ✅ existiert

**Anwendung:**
1. Supabase Dashboard → SQL Editor
2. Inhalt von `supabase-migrations/11_auftraege_beweisbeschluss.sql` einfügen
3. "Run" klicken

**Verify-SQL:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='auftraege' AND column_name LIKE 'beweisbeschluss%';
```

**Erwartet (4 Spalten):**
- beweisbeschluss_pdf_storage_path (TEXT)
- beweisbeschluss_pdf_extrakt (JSONB)
- beweisbeschluss_pdf_extrakt_version (INT)
- beweisbeschluss_pdf_uploaded_at (TIMESTAMP)

**Risk wenn nicht erledigt:** Lambda parse-beweisbeschluss returnt 503 mit "auftraege.beweisbeschluss_*-columns not migrated" — Beweisbeschluss-Upload schlägt fehl. **HIGH**.

---

### Item 3: Stripe-Coupon FOUNDING-30 anlegen (~5 Min)

**Warum:** Founding-Member-Discount 30% (179€ → 125€/mo lifetime).

**Code-Side-Check:**
```bash
grep -rn "FOUNDING-30" --include="*.js"
# Ergebnis: 0 — Coupon wird NUR in Stripe-Dashboard genutzt, nicht im Code referenziert
```

**Anlage:**
1. Stripe Dashboard → Coupons → "Create Coupon"
2. Settings:
   - **ID:** `FOUNDING-30` (eigene ID setzen, nicht auto-generated)
   - **Type:** Percentage discount
   - **Percent off:** 30%
   - **Duration:** Forever
   - **Max redemptions:** 10 (nur Founding-10)
   - **Description:** "Founding Member 30% lifetime discount"

**Alternativ als Fixed-Amount:**
   - **Type:** Fixed amount
   - **Amount off:** 54€ (179€ - 125€ = 54€)
   - **Currency:** EUR
   - **Duration:** Forever

**Verify:**
- Stripe Dashboard → Coupons → "FOUNDING-30" sichtbar
- Test-Checkout mit Coupon: Subscription wird mit 125€/mo erstellt

**Risk wenn nicht erledigt:** Founding-Member zahlen vollen Solo-Preis (179€), Promise von 125€ nicht eingehalten. **HIGH** — Marketing-/Trust-Issue.

---

### Item 4: 9 ENV-Variablen in Netlify (~10 Min)

**Warum:** KI-Provider-Routing + DSGVO-Email-Notify benötigt diese Variablen.

**Code-Side-Check:**
```bash
grep -ln "KI_VISION_PROVIDER" *.js netlify/functions/*.js lib/*.js
# Ergebnis: lib/ki-service-anthropic.js, lib/ki-service-interface.js,
#          netlify/functions/ki-proxy.js (korrekt)
```

**Anlage in Netlify Dashboard:**
1. https://app.netlify.com → Site Settings → Environment variables
2. Add Variable für jeden:

| Name | Value | Pflicht |
|---|---|---|
| `KI_VISION_PROVIDER` | `anthropic` | ✅ |
| `KI_TEXT_PROVIDER` | `openai` | ✅ |
| `KI_FALLBACK_MODEL` | `gpt-4o-mini` | ✅ |
| `ANTHROPIC_API_KEY` | sk-ant-... (real key) | ✅ |
| `IMPERSONATION_NOTIFY` | `on` | ✅ |
| `SMTP_HOST` | smtp.ionos.de (oder Resend) | ✅ |
| `SMTP_USER` | marcel@prova-systems.de | ✅ |
| `SMTP_PASS` | <server-password> | ✅ |
| `SMTP_FROM` | `PROVA <noreply@prova-systems.de>` | ✅ |

**Optional (Defaults sind OK):**
| Name | Default | Override-Grund |
|---|---|---|
| `SMTP_PORT` | 587 | Falls Port 465 SSL gewünscht |

**Verify:**
- Netlify Dashboard → Environment variables → Liste zeigt alle 9
- Trigger Re-Deploy: Site Settings → Build & Deploy → "Trigger Deploy"
- Wait 2-3 Min bis Deploy live
- Settings-Tab im Admin-Cockpit (sobald Lambda existiert) zeigt alle ✅

**Risk wenn nicht erledigt:**
- Foto-KI nutzt Default OpenAI statt Claude (MEDIUM)
- Konjunktiv-II nutzt GPT-4o-mini statt GPT-4o (CRITICAL — Qualitäts-Regression)
- DSGVO-Impersonation-Email funktioniert nicht (MEDIUM — Audit-Log greift trotzdem)

---

## 🟡 EMPFOHLEN-Items (vor Welle 1)

### Item 5: Manuelle Browser-Tests (~1h)

Pflicht-Pfade durchklicken (siehe `docs/ops/LAUNCH-DAY-PLAN.md` Pre-Launch-Tag):

**Desktop (Chrome + Firefox):**
1. Signup-Flow End-to-End (login.html → app.html)
2. Welcome-Wizard 4-Step (Persona → Mode → Tour → Demo-Akte)
3. Mode A: Akte erstellen → Diktat → KI-Hilfe → PDF
4. Mode B: TipTap-Editor speichern + laden
5. Mode C: Vorlage hochladen + Mapping
6. Beweisbeschluss-PDF Upload (Mode A, gericht-auftrag.html)
7. Foto-Upload + Foto-KI-Analyse (Claude Sonnet 4.6)
8. Logout + Re-Login

**Mobile (iOS Safari + Android Chrome 375px):**
1. Welcome-Wizard mobile
2. Diktat-Aufnahme mobile (CRITICAL für Vor-Ort)
3. Mode-C-Mobile-Fallback (Toast erscheint)

### Item 6: UptimeRobot 5 Monitore aktivieren (~10 Min)

Siehe `docs/ops/MONITORING-CHECKLIST.md` Layer 1.

### Item 7: Pilot-SV-Outreach-Liste finalisieren (~30 Min)

3-4 SVs aus IHK-Netzwerk auswählen für Welle 1 (Mo 2026-05-12).
Email-Template aus `docs/strategie/EMAIL-TEMPLATES.md` Template 1 personalisieren.

---

## 🟢 NICE-TO-HAVE (Post-Launch)

### Item 8: Lambda admin-env-status.js implementieren (~30 Min)
Backend für Settings-Tab. Liste der 9 ENV-Vars (Status: gesetzt/fehlt) ohne Werte.

### Item 9: Lambda admin-ki-aggregations.js implementieren (~1h)
Backend für KI-Stats Frontend (Block 4). Aggregation aus `ki_protokoll`.

### Item 10: RLS-Audit via prova-rls-auditor (~1h)
Spezialagent für RLS-Policy-Review. Subagent-Definition: `.claude/agents/prova-rls-auditor.md`.

### Item 11: Performance Quick-Wins (~1.5h)
PERF-1/2/3 aus `docs/diagnose/PERFORMANCE-AUDIT-2026-05-09.md`:
- Sentry-Browser-SDK lazy-load
- App-Icons unused entfernen
- sw.js APP_SHELL prunen

---

## Push-Reihenfolge (nach Item 1-4)

```bash
# 1. pdf-parse Dependency
npm install pdf-parse --save
git add package.json package-lock.json
git commit -m "chore(deps): add pdf-parse for parse-beweisbeschluss"

# 2. Final Test-Run
node --test tests/... # alle Folder

# 3. Push to main
git push origin main

# 4. Tag (Marcel-OK!)
git tag -a v286-pilot-launch-ready -m "MEGA²⁵ Pre-Pilot-Final"
git push origin v286-pilot-launch-ready

# 5. Netlify-Deploy verfolgen
# https://app.netlify.com → Deploys → letzter Deploy

# 6. Production-Verify
curl https://app.prova-systems.de/.netlify/functions/health
# Erwartet: 200 OK
```

---

## Items-Mapping zu Sprint-Plan

| Item | Estimated Time | Sprint | Type |
|---|---|---|---|
| 1 pdf-parse install | 1 Min | Pre-Pilot | Code |
| 2 Migration 11 | 5 Min | Pre-Pilot | DB |
| 3 Stripe-Coupon | 5 Min | Pre-Pilot | Stripe |
| 4 9 ENV-Vars | 10 Min | Pre-Pilot | Netlify |
| 5 Browser-Tests | 1h | Pre-Welle-1 | QA |
| 6 UptimeRobot | 10 Min | Pre-Welle-1 | Monitoring |
| 7 Outreach-Liste | 30 Min | Pre-Welle-1 | Marketing |
| 8 admin-env-status | 30 Min | Post-Pilot | Code |
| 9 admin-ki-aggregations | 1h | Post-Pilot | Code |
| 10 RLS-Audit | 1h | Post-Pilot | Security |
| 11 Performance Quick-Wins | 1.5h | Post-Pilot | Performance |

---

## Marcel — Quick-Reference

**Items 1-4: Pflicht (~30 Min)**
**Items 5-7: Empfohlen (~2h)**
**Items 8-11: Post-Pilot**

Wenn Items 1-4 fertig: **GO für Push + Tag v286-pilot-launch-ready**.
Wenn Items 5-7 fertig: **GO für Welle 1 Mo 2026-05-12**.

---

*MEGA²⁵ Phase 1 — Marcel-Pflicht-Items dokumentiert.*
