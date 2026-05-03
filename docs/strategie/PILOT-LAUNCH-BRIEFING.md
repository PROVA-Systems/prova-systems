# 📨 PROVA Pilot-Launch — Marcel-Briefing

**Datum:** 03.05.2026 (POST-MEGA-MEGA Sprint N4)
**Empfaenger:** Marcel Schreiber (Founder)
**Zweck:** Was du als Founder am Launch-Tag tun musst.

---

## 🎯 Wo wir stehen

Nach 3 Wochen Sprint-Marathon (Catch-up → MEGA-SKALIERUNG → MEGA-MEGA-NACHT → POST-MEGA-MEGA):

✅ **Founding-Pilot-Programm** funktional (90T Trial + Auto-FOUNDING-99 + Stripe-Webhooks)
✅ **Onboarding-Drip-Campaign** (7 Templates + Make.com-JSON oder pg_cron-Backup)
✅ **Admin-Cockpit MVP** (4 Tabs: Pilot-Liste / KPIs / Sentry / Quick-Actions)
✅ **Stripe-Test-Suite** automatisiert (8 Szenarien, Live-Mode-Gate)
✅ **Sentry Error-Tracking** (DSGVO-konform, beforeSend PII-Filter)
✅ **zod-Schema-Validation** in 5 kritischen Functions (M2 Pattern)
✅ **Pilot-Page** (Hero + Trust + Features + FAQ + Live-Counter)

---

## 📋 Was DU am Launch-Tag tust

### Schritt 1: Pre-Launch-Checklist abarbeiten (~60-90 Min)

→ `docs/strategie/PILOT-LAUNCH-CHECKLIST.md` Punkt fuer Punkt durchgehen.

**Kritische Punkte (NICHT skippen):**
- ENV-Variablen (Sektion 1) — kompletter Live-Mode-Switch
- Stripe-Webhook (Sektion 2) — Stripe-CLI-Test
- Smoke-Test Auftrags-Flow (Sektion 4) — du musst das einmal selbst machen
- Mobile-Test (Sektion 11) — auf deinem eigenen Geraet

### Schritt 2: Eigenen Founder-Account anlegen

1. `https://app.prova-systems.de/auth-supabase.html` → registrieren
2. Email: `marcel.schreiber891@gmail.com` (Whitelist-Match!)
3. Workspace-Onboarding durchklicken
4. Optional: Stripe-Checkout mit eigener Karte → Sofort-Refund nach Webhook-Test
5. Login zu `/admin/` → 4 Tabs durchgehen

### Schritt 3: Erste Pilot-Einladungen (5 Stueck)

**Wichtig:** **KEINE Mass-Mail!** Du schreibst persoenlich.

**Vorlage Pilot-Einladung:**

```
Hallo [Vorname],

vor zwei Jahren habe ich angefangen, ein eigenes Tool zu bauen — fuer
genau das was du und ich jeden Tag machen: Bausachverstaendigen-Gutachten.

Es heisst PROVA. KI-natives B2B-SaaS, speziell fuer ö.b.u.v. SVs in
Deutschland. Workflow: Diktat → KI-Strukturhilfe (KEINE eigene Bewertung)
→ §6 Fachurteil schreibt der SV → automatischer Halluzinations- und
§407a-Check → PDF.

Ich suche 10 Pilot-SVs fuer ein Founding-Member-Programm:
- 99€/Monat lifetime (statt 149€) — fuer immer
- 90 Tage Trial, danach automatisch
- Direkter Draht zu mir fuer Roadmap-Mitsprache
- Logo-Erwaehnung auf der Website (optional)

Wenn du mit-pilotieren willst:
→ https://prova-systems.de/pilot

Frag mich alles direkt. Ich antworte in <24h.

Gruss
Marcel
```

**Ziel: 5 Einladungen am Launch-Tag, weitere 5 in Woche 2.**

### Schritt 4: Daily-Pflichtroutine (erste 14 Tage)

**Morgens (~10 Min):**
- Admin-Cockpit Tab "Pilot-Liste" → wer ist gestern eingeloggt?
- Tab "Stripe-KPIs" → Conversions / Churn?
- Tab "Sentry-Errors" → neue Fehler letzte 24h?

**Mittags (~5 Min):**
- Email-Inbox: Pilot-Fragen beantworten

**Abends (~10 Min):**
- Audit-Trail-Stichprobe (Supabase SQL Editor):
  ```sql
  select * from audit_trail
  where created_at > now() - interval '24 hours'
    and typ ~ '(error|forbidden|rate_limit|fail)'
  order by created_at desc;
  ```

---

## 🚨 Wenn etwas schiefgeht

| Problem | Sofort-Aktion |
|---|---|
| Stripe-Webhook liefert nicht | Stripe Dashboard → Webhooks → "Resend" klicken |
| User kann nicht einloggen | Supabase Auth Logs pruefen, ggf. Magic-Link senden |
| PDF wird nicht generiert | PDFMonkey-Account: API-Limit erreicht? |
| §6-Editor laedt nicht | sw.js Cache-Version pruefen + Cmd-Shift-R |
| Sentry zeigt 100+ Errors/h | Sofort die HAEUFIGSTE Function checken, ggf. Notfall-Rollback |
| DSGVO-Anfrage von User | Edge Function `dsgvo-handler` POST `dsgvo_user_export` mit user_id |

**Notfall-Rollback (nukliear):**
```bash
git revert HEAD~3..HEAD   # letzte 3 Commits rueckgaengig
git push origin main      # triggert Netlify-Re-Deploy
```

---

## 📊 Erfolgs-Kriterien (90T-Founding-Phase)

Nach 90 Tagen ist der Pilot erfolgreich wenn:

- ✅ **8/10 Pilot-Slots besetzt** (Founding-Coupon-Cap)
- ✅ **Conversion ≥ 60%** (8 von 10 zahlen nach Day-90 weiter)
- ✅ **NPS ≥ 40** (von Day-14-Email-Antworten)
- ✅ **0 kritische DSGVO-Vorfaelle** (Audit-Trail clean)
- ✅ **< 5% Sentry-Errors/Session** (Sentry-Report)
- ✅ **Mind. 50 abgeschlossene Auftraege gesamt** (Statistik aus admin-pilot-list)

---

## 🔗 Wichtige Links

| Was | Wo |
|---|---|
| Live-App | https://app.prova-systems.de/ |
| Landing | https://prova-systems.de/ |
| Pilot-Page | https://prova-systems.de/pilot.html |
| Admin-Cockpit | https://app.prova-systems.de/admin/ |
| Supabase Dashboard | https://supabase.com/dashboard/project/cngteblrbpwsyypexjrv |
| Stripe Dashboard | https://dashboard.stripe.com/dashboard |
| PDFMonkey | https://app.pdfmonkey.io/ |
| Sentry | https://prova-systems.sentry.io/ |
| Netlify | https://app.netlify.com/sites/prova-systems |
| GitHub Repo | https://github.com/PROVA-Systems/prova-systems |

---

## 📁 Wichtige Dokumente fuer dich

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` | Anti-Patterns + Pflicht-Lektuere fuer Sprints |
| `docs/strategie/PILOT-LAUNCH-CHECKLIST.md` | DIESE Checklist |
| `docs/strategie/PILOT-LAUNCH-BRIEFING.md` | Dieses Dokument |
| `docs/strategie/ONBOARDING-AUTOMATION.md` | Drip-Campaign-Setup |
| `docs/strategie/STRIPE-PRICING-FINAL.md` | Stripe-Konfiguration |
| `KI-PROMPTS-MASTER.md` | Alle GPT-Prompts |
| `PROVA-SUPABASE-REFACTOR-MASTER.md` | Migration-Strategie |

---

## 🎯 NACH dem Launch (Nice-to-have, nicht-blockend)

- [ ] Calendly-Integration fuer "30-Min-Pilot-Onboarding-Call"-Slots
- [ ] App-Polish (Animations, Loading-States)
- [ ] Roadmap-Public-Page (Pilot-Wuensche live)
- [ ] Erste Case-Study (mit Pilot-Erlaubnis)

→ Diese Sachen gehoeren in Sprint K-2 (Post-Pilot).

---

## ❤️ Founder-Mindset-Reminder

- **Es geht NICHT darum, fehlerfrei zu starten.** Es geht darum, in den naechsten 14 Tagen 5 Fragen zu beantworten:
  1. Wollen Solo-SVs ueberhaupt zahlen?
  2. Welcher der 4 Flows wird zuerst genutzt? (A=Schaden, B=Wert, C=Beratung, D=Baubeg)
  3. Wo steigen sie aus? (Funnel-Drop)
  4. Was ist das **eine Feature** das fehlt?
  5. Welcher KI-Hilfe wird **nicht** vertraut?

- **Je schneller du Antworten hast, desto fokussierter ist Sprint K-2.**

- **Pilot-SVs sind keine Beta-Tester.** Sie zahlen 99€/Monat. Behandle sie wie zahlende Kunden mit Roadmap-Vetorecht.

- **Sieh ins Cockpit, nicht in den Code.** Du bist Founder, nicht Coder.

---

*Du bist bereit. Lass uns das Ding live nehmen. 🚀*

— Erstellt im POST-MEGA-MEGA Sprint N4 am 03.05.2026.
