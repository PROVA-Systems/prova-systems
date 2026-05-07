# MEGA³⁴ A1 — Cookie-Banner DSGVO Compliance Sources

**Datum:** 2026-05-07

## Recherche-Quellen (≥10)

| # | Quelle | Inhalt |
|---|---|---|
| 1 | **§ 25 TTDSG** | Einwilligung in Cookies (außer technisch notwendige) |
| 2 | **DSGVO Art. 7** | Bedingungen für Einwilligung (frei, informiert, eindeutig) |
| 3 | **DSGVO Art. 4 Nr. 11** | Definition Einwilligung |
| 4 | **EuGH C-673/17 "Planet49"** | Vorab-angekreuzte Checkbox = unzulässig |
| 5 | **EuGH C-49/17 "Fashion ID"** | Drittanbieter-Cookies brauchen explizite Einwilligung |
| 6 | **DSK-Orientierungshilfe Telemedien (2021)** | Konsens-Banner-Anforderungen DE |
| 7 | **IAB TCF v2.2** | Industriestandard Consent-Strings (optional) |
| 8 | **ePrivacy-Richtlinie 2002/58/EG Art. 5(3)** | Cookie-Consent-Pflicht EU |
| 9 | **BGH I ZR 7/16 "Cookie-Einwilligung II"** | Opt-In-Pflicht für nicht-notwendige Cookies |
| 10 | **DSGVO Art. 13/14** | Informationspflichten + Transparenz |
| 11 | **§ 4 BDSG-neu** | Verarbeitung zu eigenen Geschäftszwecken |

## Compliance-Anforderungen

- ✅ KEINE Pre-Selection außer „Notwendig"
- ✅ Granular: Necessary / Analytics / Marketing
- ✅ Equally prominent: „Akzeptieren" + „Ablehnen"
- ✅ Widerruf jederzeit möglich (Settings-Page)
- ✅ Audit-Trail (cookie_consents-Tabelle)
- ✅ Link zu Datenschutz-Erklärung
- ✅ Erst-Aufruf: Banner blockiert UI bis Entscheidung
- ✅ Drittanbieter-Cookies (Stripe/Resend/PDFMonkey) NUR bei Marketing-Consent

## PROVA-Cookie-Inventar

| Cookie | Kategorie | Zweck |
|---|---|---|
| `prova_auth_token` | Necessary | Login-Session |
| `prova_sv_email` | Necessary | User-Identifikation |
| `prova_paket` | Necessary | Tier-Routing |
| `prova_cookie_consent` | Necessary | Consent-Speicher |
| Plausible | Analytics | Pseudonyme Page-Visits |
| (optional) Stripe | Marketing | Conversion-Tracking |

---

*Co-Authored-By Claude Opus 4.7 (1M context)*
