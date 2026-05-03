# Datenschutz-Folgenabschätzung (DSFA, Art. 35 DSGVO) — PROVA Systems

**Stand:** 04.05.2026 (MEGA⁶ S2)
**Verantwortlicher:** Marcel Schreiber, PROVA Systems
**Methode:** vereinfachtes Risiko-Assessment nach DSK-Kurzpapier Nr. 5

---

## Schwellenwert-Pruefung (Art. 35 Abs. 3)

PROVA verarbeitet Daten in folgenden Kategorien, die eine DSFA erforderlich machen:

| Kriterium DSK | PROVA-Bezug |
|---|---|
| **a) Bewertende oder Profil-Verarbeitung** | KI-Analyse von Diktaten zur Strukturhilfe |
| **b) Automatisierte Entscheidungsfindung mit Rechtswirkung** | NEIN (KI macht KEINE rechtlichen Bewertungen) |
| **c) Systematische Überwachung** | NEIN |
| **d) Sensitive Daten Art. 9** | TEILWEISE (Bauschäden koennten Gesundheitsdaten enthalten z.B. bei Schimmelschäden mit Gesundheitsbezug) |
| **e) Daten von schutzbedürftigen Gruppen** | gelegentlich (Mieter mit Migrationshintergrund, Senioren) |
| **f) Innovative Technologien** | JA (KI/AI Act Art. 50) |
| **g) Übermittlung Drittland** | JA (OpenAI USA, mit Pseudonymisierung) |

**Ergebnis:** DSFA erforderlich (Pflicht aus a + d + f + g).

---

## Verarbeitungstaetigkeiten mit Risiko

### 1. KI-Verarbeitung (OpenAI GPT-4o + Whisper)

**Beschreibung:** Diktate des SVs werden via Whisper transkribiert. Texte werden via GPT-4o strukturiert (Konjunktiv-II-Pruefung, §407a-Check, Halluzinations-Check). NIE eigenständige fachliche Bewertungen.

**Risiken:**
- ⚠ **HOCH:** Übertragung personenbezogener Daten in USA (OpenAI)
- ⚠ **MITTEL:** Mögliche Re-Identifikation aus Kontext-Zeilen
- ⚠ **MITTEL:** Halluzinationen (KI erfindet Fakten)

**Schutzmaßnahmen:**
- ✅ Server-side Pseudonymisierung VOR Übertragung (`lib/prova-pseudo.js`):
  - Namen → `[NAME_1]`, `[NAME_2]` (workspace-eindeutig)
  - Adressen → `[ADRESSE_1]`
  - IBAN → `[IBAN_1]`
  - Datum → `[DATUM_1]`
- ✅ OpenAI DPA (Standardvertragsklauseln + AVV)
- ✅ Halluzinations-Check pflicht VOR Freigabe (Art. 50 EU AI Act)
- ✅ EU AI Act Art. 50 Disclosure in PDF Teil 1.3 + Teil 4.3
- ✅ Audit-Logging in `ki_protokoll` (Cost + Tokens + Result-Length)
- ✅ Verantwortungsklausel: SV ist final fuer Inhalt verantwortlich

**Rest-Risiko:** NIEDRIG — Pseudonymisierung + Verantwortungs-Klausel + DPA reichen.

### 2. Foto-Speicherung Ortstermin

**Beschreibung:** Schadensfotos werden im Supabase-Bucket `sv-files` gespeichert.

**Risiken:**
- ⚠ **MITTEL:** Personen koennen incidentell auf Fotos sein
- ⚠ **NIEDRIG:** EXIF-GPS-Daten verraten Standort (kein Schutzbedarf da Akten-Adresse ohnehin bekannt)

**Schutzmaßnahmen:**
- ✅ Privater Bucket mit RLS (workspace_id-based)
- ✅ signed-URLs mit kurzer TTL (15min)
- ⚠ EXIF-Removal optional in Sprint K-2 implementieren
- ✅ Hinweis fuer SV: Personen-Anonymisierung empfohlen vor Hochladen

**Rest-Risiko:** NIEDRIG — RLS + signed-URLs reichen fuer SV-Workflow.

### 3. Auftragsdaten in Akten (Beweissicherung)

**Beschreibung:** Vollständige Schadensakten mit Adressen, Personen, Schadenshöhe.

**Risiken:**
- ⚠ **MITTEL:** Lange Aufbewahrung (5-30 Jahre)
- ⚠ **NIEDRIG:** Daten-Lecks bei DB-Kompromittierung

**Schutzmaßnahmen:**
- ✅ RLS workspace-level
- ✅ Backup AES-256 at-rest (Supabase)
- ✅ Loesch-Anfrage via dsgvo-loeschen-Endpoint
- 📝 Klare Loesch-Routine fuer Akten >Aufbewahrungs-Frist (Sprint K-2)

**Rest-Risiko:** NIEDRIG (mit dem Caveat dass Loesch-Routine implementiert ist).

### 4. Audit-Trail mit IP-Hint

**Beschreibung:** Jede sicherheitsrelevante Aktion wird mit pseudonymisiertem IP-Hint geloggt (3 Octets).

**Risiken:**
- ⚠ **NIEDRIG:** IP-Hint kann theoretisch zur Provider-Region zurueckgefuehrt werden

**Schutzmaßnahmen:**
- ✅ Nur 3 von 4 Octets gespeichert (z.B. `192.168.0` statt `192.168.0.42`)
- ✅ Aufbewahrung 1J + Anonymisierung danach
- ✅ Berechtigtes Interesse Art. 6 Abs. 1 lit. f (Sicherheit, Forensik)

**Rest-Risiko:** SEHR NIEDRIG.

### 5. Stripe-Zahlung

**Beschreibung:** Subscription-Bezahlung über Stripe.

**Risiken:**
- ⚠ **NIEDRIG:** USA-Drittland

**Schutzmaßnahmen:**
- ✅ Stripe DPA + Standardvertragsklauseln
- ✅ KEINE Karten-Daten (PAN/CVC) im PROVA-System (Stripe-Hosted-Checkout)
- ✅ Webhook-Signatur-Verifikation
- ✅ idempotency-keys gegen Doppelte

**Rest-Risiko:** NIEDRIG.

---

## Übergreifende technische und organisatorische Maßnahmen

| TOM | Status |
|---|---|
| Verschlüsselung at-rest (AES-256) | ✅ Supabase |
| Verschlüsselung in-transit (TLS 1.3) | ✅ |
| Multi-Tenancy mit RLS | ✅ |
| Pseudonymisierung vor Drittland-Transfer | ✅ |
| Backup mit Restore-Test | ✅ Supabase Point-in-Time |
| Sentry-PII-Filter | ✅ |
| MFA fuer Admin-Endpoints | ✅ AAL2-Pflicht |
| Rate-Limiting | ✅ pro Endpoint |
| Audit-Logging | ✅ |
| Loesch-Konzept | ⚠ Akten-Lifecycle dokumentieren |

---

## Konsultation Aufsichtsbehörde (Art. 36)

**Erforderlich?** Nein. Restrisiken sind durch TOM ausreichend gemindert.

**Bei spaeterem Trigger** (z.B. neuer KI-Use-Case ohne Pseudonymisierung):
Aufsichtsbehörde NRW (LDI) konsultieren.

---

## Fazit

**Gesamt-Restrisiko:** NIEDRIG.

PROVA hat mit Pseudonymisierung + RLS + DPA-Standardvertragsklauseln + EU-Region-Hosting + Audit-Trail eine solide DSGVO-Baseline. Die wenigen Schwächen (Loesch-Routine, EXIF-Removal optional) sind in Sprint K-2 adressierbar und bedürfen keiner Aufsichts-Konsultation.

**Marcel-Pflicht:** DSFA jährlich review-en + bei jedem neuen KI-Use-Case neu durchfuehren.

---

*DSFA-Stand 04.05.2026 — naechster Review 04.05.2027.*
