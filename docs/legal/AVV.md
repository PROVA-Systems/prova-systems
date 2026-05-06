# AVV — Auftragsverarbeitungs-Vertrag (Vorlage)

**Stand:** 2026-05-10 (MEGA²⁸ W5-I4 — Subprocessor-Liste komplett aktualisiert)
**Status:** Anwalt-Review pflicht vor Pilot-Launch
**Rechtsgrundlage:** Art. 28 DSGVO
**Vorgänger:** KORR-22 (W3.1) — heute mit aktuellem Subprocessor-Audit überarbeitet

---

## Vertragsparteien

**Auftraggeber (Verantwortlicher i.S.v. Art. 4 Nr. 7 DSGVO):**
- Sachverständiger / SV-Büro
- {{NAME}}, {{ANSCHRIFT}}, {{USTID}}

**Auftragsverarbeiter (i.S.v. Art. 4 Nr. 8 DSGVO):**
- PROVA-Systems / Marcel Schreiber
- {{ADRESSE_PROVA}}
- USt-ID: {{USTID_PROVA}}

---

## §1 Gegenstand

PROVA-Systems verarbeitet personenbezogene Daten im Auftrag des Auftraggebers zur:
- Speicherung von Auftrags-, Mandanten- und Schadensdaten
- Generierung von SV-Gutachten, Rechnungen, Bescheinigungen
- Bereitstellung der KI-Strukturhilfen (Pseudonymisierung Pflicht!)
- Versand von SV-Korrespondenz via SMTP

**Datenkategorien:**
- Stammdaten Auftraggeber/Mandanten (Namen, Anschriften, Email)
- Schadensbezogene Daten (Befunde, Fotos, Diktate)
- Rechnungs-/Bankdaten (IBAN, Steuer-ID)
- KI-Verarbeitungs-Logs (pseudonymisiert)

**Betroffenenkreise:** Auftraggeber des SV, Mandanten, ggf. Drittpersonen aus Gutachten-Kontext.

---

## §2 Art und Zweck der Verarbeitung

PROVA verarbeitet Daten ausschließlich nach dokumentierter Weisung des SV (Art. 28 Abs. 3 lit. a DSGVO).

**Zwecke:**
- Bereitstellung der PROVA-SaaS-Plattform
- KI-Strukturhilfen (mit Pseudonymisierung server-side)
- PDF-Generation via PDFMonkey
- Email-Versand via IONOS-SMTP

---

## §3 Dauer der Verarbeitung

- Während der Laufzeit der Subscription
- Nach Kündigung: 30 Tage Soft-Delete für Recovery
- Endgültige Löschung: 30 Tage post-Kündigung
- Backup-Aufbewahrung: 7 Tage Supabase-Auto-Backup

**Aufbewahrungspflichten des SV (außerhalb dieses AVV):**
- Gutachten + Rechnungen: 10 Jahre (HGB §257 / AO §147)
- Verfahren mit gerichtlicher Beauftragung: bis Verjährung

---

## §4 Technische und organisatorische Maßnahmen (TOM)

Siehe separate Anlage: `docs/legal/TOM.md`.

**Pflicht-Garantien (Auszug):**
- EU-Region (Supabase Frankfurt, Sentry EU)
- Verschlüsselung in Transit (TLS 1.3) und at-Rest (AES-256)
- Multi-Tenant-Isolation via Row-Level-Security
- Pseudonymisierung vor KI-Calls
- Backup täglich, Restore-Tests quartalsweise

---

## §5 Unterbeauftragung (Subprozessoren)

**Vollständige Subprozessor-Liste:** Siehe Anlage `docs/legal/SUBPROCESSOR-LISTE.md` (mit DPA-Verlinkung, Speicherdauer, Sub-Subprocessor pro Anbieter).

**Aktuell genehmigte Unterbeauftragte (Sub-Auftragsverarbeiter):**

| Anbieter | Zweck | Region | DPA-Status |
|---|---|---|---|
| Supabase Inc. | Datenbank, Auth, Storage, Edge Functions | EU (Frankfurt, eu-central-1) | EU-DPA verfügbar |
| Stripe Payments Europe Ltd. | Zahlungsabwicklung Subscriptions + Webhooks | Irland (EU) + USA (SCC) | EU-DPA |
| OpenAI L.L.C. | KI-Text-Strukturhilfe (gpt-5.5/5.4/5.4-mini), Speech-to-Text (whisper-1) | USA (SCC + Pseudo) | DPA standard |
| **Anthropic, PBC** ⭐ NEU | **KI-Backup-Provider** (claude-opus-4-7/sonnet-4-6/haiku-4-5-20251001) — automatischer Fallback bei OpenAI 429/5xx | USA (SCC + Pseudo) | DPA standard |
| PDFMonkey (par tlrk SAS) | PDF-Generation aus Liquid-Templates | Frankreich (EU) | EU-DPA |
| Functional Software Inc. (Sentry) | Error-Tracking + Performance-Monitoring (PII-pseudonymisiert) | USA (Marcel-Check für EU-Region) | DPA + SCC |
| Netlify, Inc. | Frontend-Hosting + Edge Functions + Build-Pipeline | USA + EU-Edge | DPA + SCC (Business-Tier) |
| 1&1 IONOS SE | SMTP-Email-Versand (SV-Korrespondenz, Welcome, Mahnungen) | Deutschland | AV-Vertrag |
| **Formagrid Inc. (Airtable)** | Legacy-SV-Stammdaten, Auth-Trail, Briefe (in 19 aktiven Lambdas — Migration-Plan zu Supabase) | USA (SCC) | DPA standard |
| **Make.com (Celonis-Tochter)** | Webhook-Bridge (Stripe-Events, Email-Trigger) — Migration-Plan zu Edge Functions | Tschechien (EU) | EU-DPA |
| Cloudflare, Inc. (TBD) | DNS / CDN / WAF — Marcel-Action: Dashboard-Status-Check pflicht (W5-I3 audit) | USA + EU | DPA + SCC (falls aktiv) |

**Stand der Subprozessor-Liste:** 2026-05-10 (W5-I4 nach Audit W5-I3).

**TBD-Items (Marcel-Check):** Cloudflare-Status (DNS / Workers aktiv?), DocRaptor (PDF-Fallback aktiv?). Status nach Marcel-Klärung in `SUBPROCESSOR-LISTE.md` final.

Änderungen der Subprozessor-Liste werden dem Auftraggeber mit 14-Tage-Vorlauf via Email mitgeteilt (gemäß Art. 28 Abs. 2 DSGVO).

---

## §6 Betroffenenrechte (Art. 15-21 DSGVO)

PROVA unterstützt SV bei der Erfüllung der Betroffenenrechte über:

- **Art. 15 (Auskunft):** Self-Service-Export via Settings → Privatsphäre → "Daten exportieren" (JSON)
- **Art. 17 (Löschung):** Self-Service via Settings → Privatsphäre → "Konto löschen"
- **Art. 20 (Portabilität):** Maschinenlesbares JSON-Export-Format
- **Art. 16 (Berichtigung):** UI-basierte Datenänderung jederzeit möglich

Edge Functions: `dsgvo-export.js`, `dsgvo-delete.js`, `dsgvo-portability.js` (siehe KORR-19).

---

## §7 Mitwirkungspflichten PROVA

PROVA unterstützt den SV bei:
- Datenpannen-Meldung Art. 33/34 DSGVO (innerhalb 24h Kenntnisnahme via Sentry-Alert)
- Datenschutz-Folgenabschätzung Art. 35 DSGVO
- Verfahrensverzeichnis (siehe `docs/legal/VERFAHRENSVERZEICHNIS.md`)

---

## §8 Haftung + Schadensersatz

Gilt das HGB-Schadensersatzrecht. Haftungsobergrenze gemäß PROVA-AGB.

---

## §9 Kontrollrechte des Auftraggebers

SV kann jederzeit anfordern:
- TOM-Dokumentation (in `docs/legal/TOM.md`)
- Zertifikate (z.B. ISO 27001 falls vorhanden)
- Audit-Bericht (max. 1× pro Jahr, kostenfrei)

---

## §10 Beendigung

- Daten-Rückgabe oder -Löschung nach Wahl des SV
- Default: Löschung nach 30 Tage Soft-Delete-Periode
- SV kann Export jederzeit selbst durchführen (Self-Service)

---

## §11 Sonstiges

- Schriftform für Änderungen
- Gerichtsstand: Köln
- Anwendbares Recht: deutsches Recht

---

**Anhänge:**
- Anlage 1: TOM (`docs/legal/TOM.md`)
- Anlage 2: Verfahrensverzeichnis (`docs/legal/VERFAHRENSVERZEICHNIS.md`)
- Anlage 3: Subprozessor-Liste (`docs/legal/SUBPROCESSOR-LISTE.md`)
- Anlage 4: Subprocessor-Audit-Befund (`docs/legal/SUBPROCESSOR-AUDIT.md`)

---

⚠️ **Anwalt-Review pflicht vor Pilot-Launch.**

*MEGA²⁸ W5-I4 — Subprocessor-Liste komplett aktualisiert basierend auf Audit W5-I3 (10.05.2026). Anthropic als KI-Backup-Provider ergänzt. Airtable + Make + Cloudflare ehrlich aufgeführt mit Migration-Status.*

*Vorgänger: KORR-22 (W3.1).*
