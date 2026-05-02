# Marcel-Pflicht-Aktionen (S6)

**Stand:** 02.05.2026 (Sprint S6 Phase 1)
**Eigentümer:** Marcel Schreiber
**Update-Trigger:** Wenn Audit/Sprint neue Marcel-Aktion entdeckt

---

## Was diese Datei ist

Sammelpunkt für alles, was **Claude Code NICHT machen kann** und Marcel manuell tun muss. Strukturiert nach Dringlichkeit + Thema.

---

## 🔴 SOFORT (innerhalb 7 Tagen)

### Aus Stripe-Migration-Sprint (03.05.)

→ Detail-Doku in `docs/strategie/STRIPE-SETUP.md`

- [ ] **Neue Stripe-ENV-Vars in Netlify hinterlegen:**
  - `STRIPE_SECRET_KEY` (Live-Mode)
  - `STRIPE_PUBLISHABLE_KEY`
  - `PROVA_SUPABASE_PROJECT_URL` + `SUPABASE_SERVICE_ROLE_KEY` (für Webhook-Supabase-Writes)
- [ ] **Webhook-Endpoint im Stripe-Dashboard anlegen:** `https://prova-systems.de/.netlify/functions/stripe-webhook` mit 5 Event-Types
- [ ] **STRIPE_WEBHOOK_SECRET** kopieren + in Netlify setzen
- [ ] **Founding-Coupon `FOUNDING-99` im Stripe-Dashboard anlegen** (50€ off Solo, lifetime, 10 Plätze) → `STRIPE_FOUNDING_COUPON_ID` in Netlify
- [ ] **Customer-Portal im Stripe-Dashboard aktivieren**
- [ ] **Trigger Deploy** + Test-Checkout mit 4242-Karte
- [ ] **Alte Stripe-ENV-Vars vom Sandbox-Account löschen** (alte STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)

### Aus Voll-Cleanup-Sprint (02.05.)

- [ ] **12 AIRTABLE_*-ENV-Vars in Netlify-UI löschen** — Liste in `docs/sprint-status/AIRTABLE-ENV-CLEANUP-LIST.md`. Nach Löschung manuell „Trigger Deploy" in Netlify (kein Auto-Redeploy bei ENV-Change).

### Aus Sprint S6 Phase 1 (sobald Findings stehen)

- [ ] (TBD nach Phase 1 — wird hier ergänzt nach Audit-Findings)

---

## 🟠 VOR ERSTEM PILOT-SV (1-3 Wochen)

### Sicherheit & Operations

- [ ] **2FA für Marcel-Admin-Accounts** aktivieren:
  - Supabase Dashboard
  - Netlify Account
  - Stripe Dashboard
  - GitHub Account
  - IONOS (Domain-Registrar)
- [ ] **Stripe Webhook Secret rotieren** (alter Secret in ENV ersetzen)
- [ ] **Make.com T3 (Trial-Reminders) manuell aktivieren**
- [ ] **Make.com F1 (Founding-99€-Coupon) manuell aktivieren**
- [ ] **Supabase-Backup-Schedule prüfen** (Pro-Plan = täglich automatisch, Marcel verifiziert dass Pro aktiv ist)
- [ ] **Backup-2-of-3-Regel:** zusätzlich zu Supabase ein **wöchentliches `pg_dump`** zu eigener S3 oder Backblaze (~5€/Mo). Alternative: Cron-Edge-Function die `pg_dump` triggert und nach Backblaze schiebt — CC kann das bauen wenn Marcel S3-Credentials hat.

### Legal (ANWALT-TERMIN)

- [ ] **DSGVO-Anwalt-Termin buchen** (~1.000-1.500€ Startup-Paket)
- [ ] **AVV-Vorlage finalisieren lassen** (Entwurf in `docs/public/AVV-VORLAGE.md`)
- [ ] **Datenschutzerklärung finalisieren lassen** (Entwurf in `docs/public/DATENSCHUTZERKLAERUNG-ENTWURF.md`)
- [ ] **Pilot-Vereinbarung finalisieren lassen** (Entwurf in `docs/public/PILOT-VEREINBARUNG-ENTWURF.md`)
- [ ] **AGB anpassen lassen** (Beta-Status, Haftungsbegrenzung)

### Versicherung

- [ ] **IT-Haftpflicht-Versicherung recherchieren**
  - Anbieter: Hiscox, Markel, Hannoversche, Allianz Cyber
  - Budget: ~300-600€/Jahr
  - Deckungssumme: mind. 500.000€ Vermögensschäden + 250.000€ Cyber
  - Wartezeit beachten: oft 2-4 Wochen

### Subprozessoren-AVVs einholen

- [ ] **OpenAI Business-Account** anlegen + DPA anfordern (für AVV-konforme KI-Nutzung)
- [ ] **PDFMonkey DPA** anfordern (info@pdfmonkey.io)
- [ ] **Resend DPA** anfordern (über Dashboard verfügbar)
- [ ] **Netlify Pro Plan** verifizieren (DPA ist im Pro-Plan inklusive)
- [ ] **Make.com DPA** prüfen (oft im EU-Plan inklusive)
- [ ] **Supabase Standard-AVV** Status verifizieren (sollte signed sein)

---

## 🟡 NACH ERSTEM PILOT-CASH (3-12 Monate)

### Externer Pentest

- [ ] **3 Anbieter-Angebote einholen** (Boutique-Pentester bevorzugen):
  - SecurityHive, SySS, Cure53, mgm security partners, Compass Security DACH
  - Budget: ~3.000-5.000€ für 3-5 Tage fokussiert
- [ ] **Scope:** Auth, Multi-Tenant, API, Uploads, KI-Endpoints
- [ ] **Retest inklusive** verhandeln
- [ ] **Briefing-Doku** vorhanden in `docs/strategie/PENTEST-BRIEFING.md` (S6-Deliverable)

### Pilot-Akquise (Marketing-Sprint)

- [ ] **50 Ziel-SVs in Liste sammeln** (Verbandsseiten, lokale Suche, LinkedIn, IHK-Listen)
- [ ] **30 Discovery-Gespräche** durchführen (12-Fragen-Leitfaden)
- [ ] **5-10 Pilot-SVs auswählen**
- [ ] **Webinar-Termine planen** (3 erste Themen aus `docs/strategie/PROVA-MARKETING-ROADMAP.md`)

### Compliance-Reife

- [ ] **DPIA** (Datenschutz-Folgenabschätzung) prüfen ob Pflicht (KI-Verarbeitung könnte als Hochrisiko gelten)
- [ ] **NIS2-Selbsteinschätzung** (für Pilot-SVs ggf. relevant ab 2025)
- [ ] **BSI IT-Grundschutz Self-Assessment** (optional, als Verkaufs-Argument)

---

## 🟢 LAUFEND (quartalsweise oder bei Trigger)

- [ ] **Quartalsweise:** OWASP ASVS L1 Re-Run anstoßen (CC kann das automatisiert)
- [ ] **Monatlich:** Ziel-SV-Liste pflegen, Discovery-Gespräche-Status updaten
- [ ] **Wöchentlich:** Newsletter-Liste prüfen, Lead-Magnete-Conversion-Rate
- [ ] **Pro Pilot-SV-Onboarding:** AVV elektronisch signieren (Pilot-Vereinbarung anhängen)

---

## 🔵 RECHERCHE-AUFTRÄGE (Marcel zuteilen)

Aufgaben die Marcel selbst recherchieren muss (CC kann nicht):

- [ ] **Pentest-Anbieter-Vergleich** (3 Angebote)
- [ ] **DSGVO-Anwalt** (Empfehlungen aus Verbänden, IHK)
- [ ] **IT-Haftpflicht-Anbieter** (Vergleichsportale + Versicherungsmakler)
- [ ] **PDFMonkey Plan** verifizieren (aktueller Stand vs Pilot-Bedarf 1.000+ PDFs/Monat)
- [ ] **Supabase Plan** verifizieren (Free vs Pro vs Team — DSGVO-Verarbeitungsverzeichnis braucht Pro+)

---

## ✅ ERLEDIGT (chronologisch)

- 02.05.2026 — Voll-Cleanup-Sprint Marcel-Aktion: 12 ENV-Vars-Liste produziert (Marcel-Aktion noch ausstehend, siehe oben)

---

*Marcel-Pflicht-Aktionen 02.05.2026 · Aktualisiert nach jedem Sprint*
