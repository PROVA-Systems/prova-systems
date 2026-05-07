# Pilot-Live-Setup für Marcel — 8-Punkte-Checkliste

**Stand:** 2026-05-07 nach MEGA³³ FINAL (Tag v900)

Diese Datei ist die Schritt-für-Schritt-Anleitung für die 8 Manual-Items
aus deiner Wake-Up-Liste. CC kann nichts davon selbst tun (externe Services
oder destruktive Operationen) — alles braucht deine Hand.

---

## 🔴 KRITISCH (vor erstem Pilot)

### 1. Branch-Merge mega30 → 31 → 32 → 33 → main

**Voraussetzung:** Alle 4 Branches sind gepusht.

**Empfohlen — Squash-Merge in main:**

```bash
# Option A: Eine PR pro Sprint (sauberer Verlauf)
gh pr create --base main --head mega30-... --title "MEGA³⁰ ..."
gh pr create --base main --head mega31-... --title "MEGA³¹ Vollendung + Vision-Kern"
gh pr create --base main --head mega32-flows-bescheinigungen-mobile --title "MEGA³² 4-Flows + Bescheinigungen + Mobile"
gh pr create --base main --head mega33-ui-integration-100-percent --title "MEGA³³ UI-Integration 100% Vision"

# Option B: Sequenziell direkt mergen (schneller, weniger PR-Noise)
git checkout main
git merge --no-ff mega30-... -m "Merge MEGA³⁰"
git merge --no-ff mega31-... -m "Merge MEGA³¹"
git merge --no-ff mega32-flows-bescheinigungen-mobile -m "Merge MEGA³²"
git merge --no-ff mega33-ui-integration-100-percent -m "Merge MEGA³³"
git push origin main
```

**Konflikt-Risiko:** sw.js CACHE_VERSION + APP_SHELL — wahrscheinlich
müssen die in main 1× zusammengeführt werden. Tag `v900` zeigt auf
MEGA³³-Spitze.

**Tests vor Merge:** `node --test tests/` lokal grün → main-Push.

---

### 2. AVV-Anwalt-Review

**Anhänge an Anwalt:**
- `docs/legal/AVV-PAKET-FUER-ANWALT.md` (komplettes Paket)
- `docs/legal/AVV-ANWALT-ANSCHREIBEN.md` (Anschreiben mit 6 Review-Aufträgen)
- `agb.html`, `datenschutz.html`, `impressum.html`, `avv.html`

**Anwalt-Anfrage:** Email + PDF-Druck der Anschreiben.

**Ergebnis-Erwartung:**
- AVV-Master-Template formal abgenommen
- US-Anbieter-DPA-Status geklärt (OpenAI/Anthropic/Stripe/Netlify)
- TOMs ausreichend dokumentiert
- Datenschutz-Beauftragter-Pflicht-Status geklärt

---

### 3. Stripe Live-Webhook registrieren

**Stripe Dashboard:**
1. Login → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://app.prova-systems.de/.netlify/functions/stripe-webhook`
3. Events (7):
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
   - `payment_intent.succeeded`
4. Save → Webhook-Signing-Secret kopieren (`whsec_...`)

**Netlify ENV-Var:**
- Site Settings → Environment Variables → `STRIPE_WEBHOOK_SECRET` setzen
- Redeploy oder neue Lambda-Cold-Start abwarten

**Test:** Stripe Dashboard → Send test webhook → 200 OK

---

### 4. PDFMonkey-Upload 6 neue Bescheinigungs-Templates

**6 Templates uploaden (aus `docs/templates-goldstandard/`):**

| Template | Kategorie | Pfad |
|---|---|---|
| B-04-MAENGELFREIHEIT | pdf | `docs/templates-goldstandard/02-bestaetigungen/B-04-MAENGELFREIHEIT.liquid.template.html` |
| B-05-ZUSTANDSBESCHEINIGUNG | pdf | `docs/templates-goldstandard/02-bestaetigungen/B-05-ZUSTANDSBESCHEINIGUNG.liquid.template.html` |
| B-06-BEWEISSICHERUNGSBESTAETIGUNG | pdf | `docs/templates-goldstandard/02-bestaetigungen/B-06-BEWEISSICHERUNGSBESTAETIGUNG.liquid.template.html` |
| BRIEF-AUFTRAG-ANNAHME | brief | `docs/templates-goldstandard/07-korrespondenz/BRIEF-AUFTRAG-ANNAHME.liquid.template.html` |
| BRIEF-TERMIN-BESTAETIGUNG | brief | `docs/templates-goldstandard/07-korrespondenz/BRIEF-TERMIN-BESTAETIGUNG.liquid.template.html` |
| BRIEF-SACHVERSTANDIGE-ANERKENNUNG | brief | `docs/templates-goldstandard/07-korrespondenz/BRIEF-SACHVERSTANDIGE-ANERKENNUNG.liquid.template.html` |

**Plus 2 ältere (sollten bereits hochgeladen sein):**
- F-02-AUFTRAGSBESTAETIGUNG
- F-03-TERMIN-BESTAETIGUNG

**Nach Upload — UUIDs in Netlify-ENV-Vars setzen:**

```
PDFMONKEY_TPL_F02                = <UUID-für-F-02>
PDFMONKEY_TPL_BRIEF_AUFTRAG      = <UUID-für-BRIEF-AUFTRAG-ANNAHME>
PDFMONKEY_TPL_F03                = <UUID-für-F-03>
PDFMONKEY_TPL_BRIEF_TERMIN       = <UUID-für-BRIEF-TERMIN-BESTAETIGUNG>
PDFMONKEY_TPL_B04                = <UUID-für-B-04>
PDFMONKEY_TPL_B05                = <UUID-für-B-05>
PDFMONKEY_TPL_B06                = <UUID-für-B-06>
PDFMONKEY_TPL_BRIEF_ANERKENNUNG  = <UUID-für-BRIEF-SACHVERSTANDIGE-ANERKENNUNG>
```

**Resolver-Logik in `bescheinigung-generate.js`:**
- ENV-Var gesetzt → echte UUID an PDFMonkey
- ENV-Var leer → Template-Name als Fallback (für Test-Runs)

---

## 🟡 WICHTIG (parallel zu kritischen)

### 5. Resend-Domain SPF/DKIM/DMARC

**Resend Dashboard:**
1. Domains → `prova-systems.de` (oder `app.prova-systems.de`)
2. DNS-Records anzeigen lassen + bei deinem DNS-Provider (Cloudflare?) einsetzen:
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: 3 CNAME-Records (resend liefert)
   - DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@prova-systems.de`
3. Verify in Resend → Status "Verified" abwarten (10-60 Min)

---

### 6. versicherungs_partner Top-10 partnerschaft_status

**Supabase SQL Editor:**

```sql
UPDATE versicherungs_partner
SET partnerschaft_status = 'aktiv',
    avv_status = 'aktiv',
    avv_unterzeichnet_am = NOW()
WHERE name IN (
  'Allianz', 'AXA', 'HDI', 'R+V', 'VHV',
  'Provinzial', 'Württembergische', 'Zurich', 'Generali', 'Gothaer'
);
```

(Anpassen je nach tatsächlichen Pilot-Versicherern.)

---

### 7. OG-Image für Landing (1200×630)

**Tool-Empfehlungen:** Figma, Canva, oder Photopea.

**Vorgaben:**
- Größe: 1200×630 Pixel (Facebook/LinkedIn Standard)
- Inhalt: PROVA-Logo + Tagline + ggf. Mockup
- Speicherort: `/icons/og-image.png`

**Verlinkung in `index.html`:**
```html
<meta property="og:image" content="https://prova-systems.de/icons/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

---

### 8. Memory + CHANGELOG aktualisieren

**CHANGELOG-MASTER.md:** ✅ bereits durch CC ergänzt für MEGA³³ (siehe Top-Block).

**Memory:** du musst selbst.
- Memory-Update über `/memory:add ...` falls relevante Architektur-Decisions
- Bei wiederkehrenden Patterns die für CC merkbar sein sollen

---

## ⚙️ Optional / nach Pilot

- Realtime-Subscription auf `auftraege` aktivieren (M³⁵)
- Mobile-Polish § 407a Pre-Send-Modal (M³⁵)
- OCC Konflikt-Detection (M³⁵)
- Lighthouse Mobile-Audit (Score ≥95 anstreben)

---

*Stand 2026-05-07 — nach MEGA³³ FINAL Tag v900*
*Co-Authored-By Claude Opus 4.7 (1M context)*
