# Cutover Schritt 01 — Make.com Scenarios deaktivieren

**Sprint:** K-1.5 · **Owner:** Marcel · **Reihenfolge:** Schritt 1/5 nach Smoke-Tests
**WICHTIG:** Erst nach grünen Smoke-Tests aller Edge Functions ausführen!

---

## Make-Scenarios → Edge-Function-Mapping

| # | Make-Scenario | Make-ID | Ersetzt durch Edge Function | Function-URL |
|---|---|---|---|---|
| 1 | T3 Termin-Reminder | 5147519 | `lifecycle-trigger` (cron_daily-Sweep) | `/functions/v1/lifecycle-trigger` |
| 2 | F1 Finanzen | 5192002 | `stripe-webhook` (5 Event-Handler) | `/functions/v1/stripe-webhook` |
| 3 | L3 Lifecycle | 5038113 | `lifecycle-trigger` (trial_start) | `/functions/v1/lifecycle-trigger` |
| 4 | L8 Lifecycle | 5147509 | `lifecycle-trigger` (trial_ending) | `/functions/v1/lifecycle-trigger` |
| 5 | L10 Lifecycle | 5158552 | `lifecycle-trigger` (cron) | `/functions/v1/lifecycle-trigger` |
| 6 | G1 Gutachten Init | 4867125 | `pdf-generate` | `/functions/v1/pdf-generate` |
| 7 | G3 Gutachten PDF | 4790180 | `pdf-generate` (Polling + Storage) | `/functions/v1/pdf-generate` |
| 8 | K2 Komm/Email | 4920914 | `send-email` (Resend) | `/functions/v1/send-email` |
| 9 | A5 Admin | 5147393 | `audit-write` | `/functions/v1/audit-write` |

---

## Schritt-für-Schritt

### 1. Vorab-Verifikation

```
✓ Edge Functions deployed     (supabase functions list)
✓ Smoke-Tests grün             (tools/test-edge-functions.html)
✓ Resend Domain verifiziert    (resend.com/domains)
✓ Stripe Webhook umgestellt    (siehe 02-stripe-webhook-update.md)
✓ pg_cron Job läuft            (SELECT * FROM cron.job)
```

### 2. Pro Scenario deaktivieren

1. https://www.make.com/en/login
2. Dashboard → Scenarios
3. Pro Scenario in obiger Tabelle:
   - Klicken
   - Toggle **Active → OFF** (oben rechts)
   - **NICHT** löschen — Rollback-Reserve!
   - Notiz im Scenario-Title-Anhang: `[K-1.5 deaktiviert YYYY-MM-DD]`

### 3. Verifikation

```
✓ Alle 9 Scenarios sind OFF
✓ Stripe-Test-Event läuft auf Supabase Edge Function (nicht Make)
✓ Test-Email via send-email kommt an (Resend, nicht Gmail)
✓ pg_cron Daily-Sweep produziert keine doppelten Lifecycle-Mails
```

---

## Rollback (falls Edge Functions Probleme haben)

1. Scenario in Make wieder auf **Active** setzen
2. Stripe Webhook-URL zurück auf `/.netlify/functions/stripe-webhook`
3. Edge Function stoppen: `supabase functions delete <name>`
4. Marcel-Memo: was war kaputt, was muss gefixt werden

**Make-Account NICHT kündigen** bis 2 Wochen alle Scenarios stabil OFF sind.

---

## Nach erfolgreichem Cutover (≥ 2 Wochen)

- Make.com Account kündigen (spart $11-19/Monat)
- Webhook-URLs der deaktivierten Scenarios in Netlify-ENV entfernen:
  - `MAKE_WEBHOOK_T3`, `MAKE_WEBHOOK_F1`, `MAKE_WEBHOOK_L3`, `MAKE_WEBHOOK_L8`, `MAKE_WEBHOOK_L10`, `MAKE_WEBHOOK_G1`, `MAKE_WEBHOOK_G3`, `MAKE_WEBHOOK_K2`, `MAKE_WEBHOOK_A5`
