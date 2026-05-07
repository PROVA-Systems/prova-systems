# MEGA³⁷ D07 — Drittland-Übermittlung + Pseudonymisierung

**Datum:** 2026-05-08

## Provider-Inventar

| Provider | Land | Rechtsgrundlage | AVV/SCC | Severity |
|----------|------|-----------------|---------|----------|
| Supabase | Frankfurt (DE/EU) | Art. 28 DSGVO | AVV Pflicht (Marcel-Pflicht) | 🟢 LOW |
| Stripe | US | SCC + EU-US DPF | AVV + DPF-Cert | 🟡 MEDIUM |
| OpenAI | US | SCC + EU-US DPF | AVV + DPF | 🟡 MEDIUM |
| PDFMonkey | FR (EU) | Art. 28 DSGVO | AVV Pflicht | 🟢 LOW |
| Netlify | US | SCC + EU-US DPF | AVV + DPF | 🟡 MEDIUM |
| Make.com | CZ (EU) | Art. 28 DSGVO | AVV Pflicht | 🟢 LOW |
| Anthropic | US | SCC + DPF (falls nutzbar) | AVV-Status prüfen | 🟡 MEDIUM |
| Resend | US | SCC + DPF | AVV-Status prüfen | 🟡 MEDIUM |

## Pseudonymisierung vor KI-Übertragung

`lib/prova-pseudo.js` — verifiziert in tests/ki-funktions-garantie.test.js (Test 2). Pflicht-Felder werden vor Übergabe an OpenAI/Anthropic durch Platzhalter ersetzt:
- Namen → `<NAME_1>`, `<NAME_2>` …
- Adressen → `<ADRESSE>`
- E-Mails, Telefon, IBAN → Platzhalter
- Aktenzeichen → `<AZ>`

✅ Erfüllt CLAUDE.md Regel 17 (Server-side Pflicht in Edge Function `ki-proxy`).

## Logs

audit_trail-Einträge: `payload_pseudo`-Spalte enthält ggf. pseudonymisierte Payload-Snapshots — keine PII im Klartext-Log.

## Top-3-Empfehlungen
1. **AVV-Tracker** in `versicherungs_partner` o.ä. Tabelle: pro Provider AVV-Datum + DPF-Cert-Status + Anwalts-Review-Datum.
2. **Marcel-Manual:** AVV-Templates aus avv.html mit allen 8 Providern abgleichen.
3. **EU-US DPF-Status** halbjährlich prüfen (politische Risiken = Schrems III?).

## Quellen
- DSK-Empfehlung Schrems-II
- EDPB-Recommendation 01/2020 SCCs
- avv.html (PROVA Root)
