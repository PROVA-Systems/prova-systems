# PROVA Infrastruktur-Referenz

> Alle System-IDs, Tabellen, Endpoints. **Keine Geheimnisse** — die liegen in Netlify ENV-Variables.

---

## Netlify

- **Site-ID:** `79cd5c61-e8e8-451e-9bf1-e2d17f971386`
- **Domain:** `prova-systems.de`
- **Functions-Path:** `/.netlify/functions/`
- **Auto-Deploy:** GitHub-Push triggert Build

### ENV-Variables (in Netlify hinterlegt, NICHT in Code)
- `AIRTABLE_PAT` / `AIRTABLE_TOKEN`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PDFMONKEY_API_KEY`, `PDFMONKEY_TEMPLATE_ID`
- `MAKE_WEBHOOK_KAUF`, `MAKE_WEBHOOK_WILLKOMMEN`
- `MAKE_S3_WEBHOOK` (L3 Stripe), `MAKE_S4_WEBHOOK` (L10)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `ADMIN_PASSWORD_BCRYPT`, `ADMIN_PASSWORD_HASH`
- `NETLIFY_EMAILS_SECRET`, `NETLIFY_EMAILS_DIRECTORY`
- `NETLIFY_IDENTITY_REDIRECT_URL`
- `NETLIFY_ACCESS_TOKEN`
- `PDF_PROXY_SECRET`

**WICHTIG:** Code liest diese via `process.env.XXX`. Niemals hartcodieren.

---

## Airtable

- **Base-ID:** `appJ7bLlAHZoxENWE`
- **Frontend-Zugriff:** AUSSCHLIESSLICH über `/.netlify/functions/airtable`
- **Multi-Tenant-Filter:** `sv_email` PFLICHT in jeder Query

### Whitelist in `airtable.js` (`ALLOWED_TABLES`)

| Table-ID | Name | userField | readOnly |
|---|---|---|---|
| `tblSxV8bsXwd1pwa0` | SCHADENSFAELLE (=FAELLE) | sv_email | false |
| `tbladqEQT3tmx4DIB` | SACHVERSTEANDIGE (=SV) | Email | false |
| `tblyMTTdtfGQjjmc2` | TERMINE | sv_email | false |
| `tblF6MS7uiFAJDjiT` | RECHNUNGEN | sv_email | false |
| `tblv9F8LEnUC3mKru` | KI_STATISTIK | null | false |
| `tbl4LEsMvcDKFCYaF` | KI_LERNPOOL | null | false |

**Wenn neue Tabelle gebraucht wird: ZWINGEND in diese Liste eintragen, sonst nicht erreichbar.**

### Wichtige Tabellen (nicht in Whitelist, aber existent)

| Table-ID | Name | Verwendung |
|---|---|---|
| `tblMKmPLjRelr6Hal` | KONTAKTE | Adressbuch (muss in Whitelist!) |
| `tblqQmMwJKxltXXXl` | AUDIT_TRAIL | KI-Nutzungs-Logs |
| `tblb0j9qOhMExVEFH` | STATISTIKEN | Aggregate |
| `tblSzxvnkRE6B0thx` | BRIEFE | Versendete Briefe |
| `tblnceVJIW7BjHsPF` | NORMEN | DIN/WTA/§-Verweise |
| `tblDS8NQxzceGedJO` | TEXTBAUSTEINE_CUSTOM | SV-eigene Bausteine + Floskeln |
| `tbljPQrdMDsqUzieD` | TEXTBAUSTEINE | Standard-Bausteine |
| `tblQ2WfO1LucdEZNE` | POSITIONEN_DATENBANK | Rechnungs-Positionen |
| `tblHYTzBmSlYIcgNg` | KI_PROMPT_LIBERY (sic, Tippfehler) | Prompt-Vorlagen |
| `tblat1VMMdO4P6RIh` | GUTEACHTEN (sic, Tippfehler) | Versionierung |
| `tblwgUQgtBWckPMHp` | EINWILLIGUNGEN | DSGVO-Audit |
| `tbljJkS3HOvtmpAGT` | RECHTSDOKUMENTE | Versions-Tracking |
| `tblAiF38HeS1R1Umj` | PUSH_SUBSCRIPTIONS | Web-Push |

### Bekannte Tippfehler (nicht jetzt fixen, koordinierte Migration in K3+)
- `SACHVERSTEANDIGE` → korrekt: `SACHVERSTAENDIGE`
- `KI_PROMPT_LIBERY` → korrekt: `KI_PROMPT_LIBRARY`
- `GUTEACHTEN` → korrekt: `GUTACHTEN`

---

## Make.com

- **Team-ID:** `1089536`
- **Folder:** `320185` (User-Lifecycle)

### Aktive Scenarios

| Scenario-ID | Name | Hook-ID | ENV-Var |
|---|---|---|---|
| 4867125 | G1 Gutachten | 2665405 | — |
| 4790180 | G3 Freigabe/PDF | 2656922 | — |
| 4920914 | K2 Support | 2564049 | — |
| 5038113 | L3 Stripe | 2560890 | `MAKE_S3_WEBHOOK` |
| 5147509 | L8 Lifecycle | 2784758 | — |
| 5147516 | L9 Trial-Erinnerungen | — | — |
| 5158552 | L10 | 2789382 | `MAKE_S4_WEBHOOK` |
| 5147393 | A5 Admin | 2784687 | — |
| 5147519 | T3 Termine | — | — |
| 5192002 | F1 Rechnungen | 2803919 | — |

### Make-Connections
- **Gmail:** Connection-ID `5630924` (immer für PROVA, NIE SMTP)
- **Airtable:** Connection-ID `5417164`
- **WICHTIG:** v1-Module nutzen `account`, v2-Module nutzen `__IMTCONN__`

---

## PDFMonkey

| Code | Template-ID | Verwendung |
|---|---|---|
| F-01 | `S32BEA1F` | JVEG-Rechnung |
| F-02 | `B1C3E69D` | Pauschal-Rechnung |
| F-03 | `EA5CAC85` | Standard-Rechnung |
| F-04 | `C4BB257B` | Kurz-Stellungnahme |
| F-05 | `64BFD7F0` | Gutschrift |
| F-06 | `8ECAC2E4` | Mahnung 1 |
| F-07 | `A4E57F73` | Mahnung 2 |
| F-08 | `6ADE8D9A` | Mahnung 3 |
| F-09 | `BA076019` | Kurzgutachten (Liquid-Migration pending — siehe IHK-SVO-TEMPLATES-MIGRATION.md) |
| F-10 | `6FF656D3` | Beweissicherung |
| F-11 | `6B85ECFF` | (Reserve) |
| F-12 | `4233F240` | Feuchte/Schimmel |
| F-13 | `8868A0E2` | Elementarschaden |
| F-14 | `3174576E` | Baumängel |
| F-15 | `36E140DC` | Gerichtsgutachten |
| F-16 | `A8D05FAB` | Ergänzungsgutachten |
| F-17 | `37CF6A57` | Schiedsgutachten |
| F-18 | `4D81616B` | Bauabnahme |
| F-19 | `29064D98-FD12-4135-9D44-F49CCF9819C6` | Wertgutachten |
| FOTO | `0383BD85` | Fotodokumentation |
| BRIEF | `BAD1170B` | Allgemeiner Brief |
| WELCOME-SOLO | `EC64C790-3E04` | Onboarding-Mail Solo |
| WELCOME-TEAM | `E865E0CD-535A` | Onboarding-Mail Team |

---

## Stripe

- **Keys:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (in Netlify ENV)
- **Tarife:** Solo `149€/mo`, Team `279€/mo`
- **Add-ons:** 5F=`price_1TJLnv8`, 10F=`price_1TJLpG8`
- **Webhook-Endpoint:** `/.netlify/functions/stripe-webhook`

---

## OpenAI

- **Modelle:** `gpt-4o`, `gpt-4o-mini` (Strukturhilfe), `whisper-large-v3` (Transkription)
- **API-Key:** `OPENAI_API_KEY` (in Netlify ENV)
- **Function-Endpoint:** `/.netlify/functions/ki-proxy`

### KI-Verbote (siehe CLAUDE.md)
- KI macht KEINE Bewertungen
- §6 Fachurteil ist KI-FREI
- Konjunktiv II Pflicht bei Kausalaussagen
- HALLUZINATIONSVERBOT
- Pseudonymisierung VOR jedem Call

---

## Wichtige Files & ihre Rolle

| File | Rolle |
|---|---|
| `airtable.js` | Netlify Function - einzige Brücke Frontend↔Airtable, mit Multi-Tenant-Filter |
| `ki-proxy.js` | Netlify Function - OpenAI-Anbindung mit Pseudonymisierung |
| `nav.js` | Sidebar/Navigation |
| `sw.js` | Service Worker - Cache-Version! |
| `auth-guard.js` | Login-Schutz für Seiten |
| `prova-audit.js` | Zentrales Audit-Logging (AUDIT_TRAIL, STATISTIKEN, KI_STATISTIK) |
| `prova-error-handler.js` | Globaler Error-Handler |
| `prova-context.js` | Globaler Kontext (aktiver Fall etc.) |
| `prova-design.css` | Design-System |

---

## Aktenzeichen-Klarheit (NEU in K1.5+)

PROVA unterscheidet zwischen drei Aktenzeichen-Arten:

| Feld | Inhalt | Beispiele |
|---|---|---|
| **`prova_aktenzeichen`** | PROVA-internes AZ (Format: SCH-YYYY-NNN) | `SCH-2026-031` |
| **`auftraggeber_az`** | AZ des Auftraggebers (Gericht/Versicherung/Anwalt) | `19 O 4711/24`, `S-4711234/24` |
| **`policennummer`** | Versicherungsscheinnummer | `VN-2024-1234567` |

**Migration-Status:**
- Alte Felder `Aktenzeichen`, `Auftrags_Nr`, `Schadensnummer_Versicherung`, `Polizzennummer`, `Versicherungsschein_Nr` als DEPRECATED markiert
- Neue Felder werden in S3 zusätzlich befüllt (parallel)
- Alte Felder werden NACH Pilotjahr in K4+ entfernt

---

## Push-Notifications (Web Push)

- **Public/Private Key:** in Netlify ENV `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
- **Function:** `/.netlify/functions/push-notify`
- **Tabelle:** `PUSH_SUBSCRIPTIONS` (`tblAiF38HeS1R1Umj`)

---

## DSGVO-Pseudonymisierung (kritisch!)

Vor jedem OpenAI-Call MÜSSEN folgende Daten ersetzt werden:

| Datentyp | Platzhalter |
|---|---|
| Vorname | `[VORNAME-1]`, `[VORNAME-2]`, ... |
| Nachname | `[NACHNAME-1]`, ... |
| Straße + Hausnummer | `[STRASSE-1]` |
| PLZ + Ort | `[ORT-1]` |
| Email | `[EMAIL-1]` |
| Telefonnummer | `[TEL-1]` |
| IBAN | `[IBAN-1]` |
| Steuernummer | `[STEUER-1]` |

**Mapping-Tabelle bleibt nur kurzzeitig im Speicher der Function**, wird nach Antwort verworfen.

---

## DEPRECATED Markierungen (Field-Beschreibungen)

Folgende Felder wurden in Sprint K1.5 als DEPRECATED markiert (Beschreibung im Airtable-UI angepasst):

| Tabelle | Feld | Status |
|---|---|---|
| SCHADENSFAELLE | `ID` (multilineText) | DEPRECATED, ungenutzt |
| SCHADENSFAELLE | `Auftrags_Nr` | DEPRECATED, wandert nach `auftraggeber_az` |
| SCHADENSFAELLE | `Schadensnummer_Versicherung` | DEPRECATED, wandert nach `auftraggeber_az` |
| SCHADENSFAELLE | `Polizzennummer` | DEPRECATED, wandert nach `policennummer` |
| SCHADENSFAELLE | `Versicherungsschein_Nr` | DEPRECATED, redundant zu `Polizzennummer` |
| SCHADENSFAELLE | `Aktenzeichen` | aktiv, klargestellt als PROVA-AZ |
