# AVV-Paket für Anwalt-Review

**Datum:** 2026-05-07
**Empfänger:** [Marcel-Anwalt für DSGVO-Compliance-Review]
**Zweck:** Auftragsverarbeitungs-Vereinbarung (AVV) Pre-Pilot-Live-Validierung

---

## 1. AVV-Master-Template

**Speicherort:** `docs/legal/AVV-MASTER-v1.0.md` (aus MEGA³¹ B3)

**Struktur:**
- § 1 Gegenstand und Dauer
- § 2 Konkretisierung des Auftrags (Art + Zweck der Verarbeitung)
- § 3 Pflichten des Auftragsverarbeiters (PROVA Systems)
- § 4 Pflichten des Verantwortlichen (SV)
- § 5 Subunternehmer (OpenAI/Anthropic/Resend/Supabase)
- § 6 Technisch-Organisatorische Maßnahmen (TOMs)
- § 7 Datenlöschung + Aufbewahrung
- § 8 Haftung + Schadenersatz
- § 9 Schlussbestimmungen

---

## 2. Subunternehmer-Liste (§ 5 AVV)

| Anbieter | Zweck | EU-Hosting? | DPA-Status |
|---|---|---|---|
| **Supabase** | Datenbank + Auth + Storage | ✅ Frankfurt eu-central-1 | ✅ DPA aktiv |
| **OpenAI** | KI-Hauptanbieter (GPT/Whisper) | 🟡 US-Hosting + EU-Repräsentant | ✅ DPA verfügbar (sign in OpenAI Dashboard) |
| **Anthropic** | KI-Backup (Claude) | 🟡 US-Hosting | 🟡 DPA via API-Console anfordern |
| **Resend** | Email-Versand | ✅ EU-Region (Frankfurt) | ✅ DPA aktiv |
| **PDFMonkey** | PDF-Generation | 🟡 EU + US Mix | ✅ DPA verfügbar |
| **Stripe** | Zahlungsverarbeitung | 🟡 US + EU-Subsidiary | ✅ DPA Standard EU |
| **Netlify** | Hosting Frontend + Lambdas | 🟡 US + EU-CDN | ✅ DPA verfügbar |

**Anmerkung Anwalt:** Bitte prüfen ob US-Anbieter (OpenAI/Anthropic/Stripe/Netlify) Standard-Vertrags-Klauseln (SCC) erfüllen.

---

## 3. Technisch-Organisatorische Maßnahmen (TOMs nach Art. 32 DSGVO)

### Vertraulichkeit
- Multi-Tenancy mit Supabase Row-Level-Security (RLS) per `workspace_id`
- JWT-Authentifizierung mit HMAC-SHA256
- 2FA-Pflicht für Admin-Accounts (Force-Admin-2FA, MEGA³¹ B2)
- Pseudonymisierung VOR jeder OpenAI/Anthropic-Übertragung (Regel 17)
- Verschlüsselung in Transit (TLS 1.3) + at-Rest (Supabase AES-256)

### Integrität
- Audit-Trail-Tabelle (INSERT-only) für alle state-changing-Operationen
- Stripe-Webhook-Idempotenz via UNIQUE-Constraint
- DB-Constraints (CHECK + FK + UNIQUE) gegen invaliden State

### Verfügbarkeit
- Supabase 99.9% SLA (Frankfurt eu-central-1)
- Netlify 99.99% SLA
- Sentry-Error-Tracking mit Pseudonymisierung in beforeSend-Hook

### Belastbarkeit
- Anthropic-Fallback bei OpenAI-Outage (MEGA²⁸ W3-I0)
- localStorage-Draft bei DB-Outage (MEGA³³ A1)
- Backup-Strategie: Supabase Daily-Backup + Point-in-Time-Recovery

### Verfahren zur Wiederherstellung der Verfügbarkeit
- Supabase Point-in-Time-Recovery (7 Tage)
- Netlify Deploy-Rollback via Git-Tag
- Sentry Issues + Uptime-Monitoring

### Verfahren zur Pseudonymisierung
- `lib/prova-pseudo.js` ersetzt: Names, E-Mails, Adressen, IBAN, Telefone
- Server-side in `netlify/functions/lib/prova-pseudo.js` (Defense-in-Depth)
- DSGVO-Audit-Log mit pseudo_counts (NICHT Inhalt) + sv_email_hash

### Verfahren zur Verschlüsselung
- TLS 1.3 für alle Endpoints
- Supabase Storage AES-256 at-Rest
- Browser localStorage NICHT für PII (nur Auth-Token + Session-Marker)

---

## 4. Datenschutz-Hinweise (DSGVO Art. 13)

**Speicherort:** `datenschutz.html`

Inhaltlich abgedeckt:
- Verantwortlicher (PROVA Systems / Marcel Schreiber)
- Datenschutz-Beauftragter (Pflicht ab gewisser User-Anzahl prüfen)
- Rechtsgrundlagen Art. 6 Abs. 1 (Vertrag + berechtigtes Interesse)
- Datenkategorien + Empfänger
- Speicherdauer (10 Jahre für Gutachten — IHK-SVO-Pflicht)
- Betroffenenrechte (Art. 15/17/20)
- Beschwerderecht bei Aufsichtsbehörde

**Anmerkung Anwalt:** Prüfen ob Pflicht zum Datenschutzbeauftragten erreicht ist (DS-GVO Art. 37 + § 38 BDSG).

---

## 5. Versicherungs-Partner mit avv_status (Live)

| Partner | Status | AVV-Datum |
|---|---|---|
| (Live in Tabelle `versicherungs_partner`) | TBD Marcel-Manual | TBD |

**Marcel-Pflege:** Tabelle `versicherungs_partner` mit `avv_status='aktiv'` befüllen für tatsächliche Pilot-Versicherer.

---

## 6. Anwalt-Anschreiben

**Speicherort:** `docs/legal/AVV-ANWALT-ANSCHREIBEN.md`

---

## 7. Review-Fragen für den Anwalt

1. Erfüllen die SCC-Klauseln der US-Anbieter (OpenAI/Anthropic) die EU-DSGVO-Anforderungen (post Schrems-II)?
2. Reicht die aktuelle Pseudonymisierung als TOM nach Art. 32 DSGVO?
3. Ist Datenschutz-Beauftragter Pflicht bei < 20 Pilot-Usern?
4. Wie lange darf die Gutachten-Aufbewahrung dauern (10 Jahre IHK-SVO vs. DSGVO-Datenminimierung)?
5. Ist das §407a-ZPO-Modal vor PDF-Erzeugung rechtlich ausreichend?
6. Welche Anpassungen für AVV-MASTER-v1.0 sind nötig vor Pilot-Live?

---

*Co-Authored-By Claude Opus 4.7 (1M context)*
