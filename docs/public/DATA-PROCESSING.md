# PROVA Datenverarbeitungs-Übersicht

**Stand:** 02.05.2026 · Skeleton — wird in Sprint S6 Phase 5 ausgearbeitet.

---

## Wofür diese Datei?

Öffentliche Subprozessoren-Übersicht. Welche Daten wo verarbeitet werden. Vertrauensbaustein für Pilot-SVs + DSGVO-Pflicht.

---

## Datenkategorien

| Kategorie | Beispiele | Speicherort | Zugriff |
|---|---|---|---|
| **SV-Stammdaten** | Name, Adresse, IHK-Nr, Spezialisierung | Supabase EU | nur SV selbst + Marcel-Admin |
| **Auftraggeber-Daten** | Name, Adresse, Kontakt | Supabase EU | nur zugehöriger Workspace |
| **Akten-Inhalte** | Diktat, §§-Texte, Befunde | Supabase EU | nur zugehöriger Workspace |
| **Foto-Anhänge** | Bilder von Bauschäden | Supabase Storage EU | signed URLs, RLS-geschützt |
| **PDF-Gutachten** | finale Gutachten | Supabase Storage EU + PDFMonkey-Cache (24h) | RLS-geschützt |
| **Audit-Logs** | Login, Daten-Export, KI-Nutzung | Supabase EU `audit_trail` | Marcel-Admin (Aufbewahrung 5 Jahre) |
| **KI-Protokoll** | KI-Calls, Tokens, Kosten | Supabase EU `ki_protokoll` | nur zugehöriger Workspace |
| **Zahlungsdaten** | Email, Stripe-Customer-ID (KEINE Kreditkarten) | Supabase + Stripe IE | RLS-geschützt |

---

## Subprozessoren

*(Phase 5: aus PROVA-ARCHITEKTUR-MASTER.md Subprozessoren-Sektion übernehmen + ausarbeiten)*

| Anbieter | Sitz | Datenkategorien | EU/US-Transfer |
|---|---|---|---|
| Supabase Inc. | US (Hosting Frankfurt EU) | alle Stammdaten + Akten | EU-Hosting + SCC |
| OpenAI Ireland Ltd. | IE/US | pseudonymisierte Diktat-Texte | SCC + Pseudonymisierung |
| Stripe Payments Europe Ltd. | IE | E-Mail + Zahlungsdaten | EU-Verarbeitung |
| PDFMonkey SAS | FR | Auftragsdaten zur PDF-Generierung | EU-Verarbeitung |
| Make.com | CZ | Webhook-Payloads | EU-Verarbeitung |
| Netlify Inc. | US (Edge weltweit) | statische Frontend-Files + Function-Logs | SCC + DPA |
| Resend Inc. | US | E-Mail-Versand-Inhalte | SCC + DPA |
| IONOS SE | DE | DNS, Domain | EU-Verarbeitung |

---

## Pseudonymisierung vor KI-Verarbeitung

Vor jedem KI-Call durchläuft der Diktat-Text die Server-Side-Pseudonymisierung:

- Personennamen → `[NAME-1]`, `[NAME-2]`, …
- Adressen → `[ADRESSE-1]`, …
- E-Mails → `[EMAIL-1]`, …
- IBANs → `[IBAN-1]`, …
- Telefonnummern → `[TEL-1]`, …

Reverse-Mapping bleibt server-side, OpenAI sieht nur Platzhalter.

---

## Aufbewahrungsfristen

| Datentyp | Aufbewahrung | Rechtsgrundlage |
|---|---|---|
| Akten-Inhalte | 10 Jahre nach Abschluss | §147 AO + SV-Berufsordnung |
| Audit-Logs | 5 Jahre | DSGVO Art. 5 + §147 AO |
| KI-Protokoll | 5 Jahre | DSGVO Art. 5 |
| Zahlungsdaten | 10 Jahre | §147 AO |
| User-Account-Daten | bis Kündigung + 30 Tage Grace | DSGVO Art. 17 |

---

## Datensubjekt-Rechte (DSGVO Art. 15-22)

- **Art. 15 Auskunft:** `dsgvo_user_export()` Function ist verfügbar — User-Self-Service über Profil-Page
- **Art. 17 Löschung:** `dsgvo_user_loeschen()` Function — 30-Tage-Grace, dann Hard-Delete
- **Art. 20 Datenübertragbarkeit:** Export als JSON
- **Art. 21 Widerspruch:** über `kontakt@prova-systems.de`

---

*Wird in Sprint S6 Phase 5 final.*
