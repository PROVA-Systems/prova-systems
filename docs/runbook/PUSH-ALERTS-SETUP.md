# Push-Alerts Setup-Guide (M⁴² P5)

**Datum:** 2026-05-08

Dieser Runbook-Eintrag erklärt das End-to-End-Setup für PROVA's System-Health-Push-Alerts.

---

## 🎯 Architektur

```
┌─────────────────────┐     alle 10 min     ┌──────────────────────┐
│ Netlify Schedule    │ ───────────────────▶│ health-check-cron.js │
│ */10 * * * *        │                     │ (M⁴¹ P3 Lambda)      │
└─────────────────────┘                     └──────────┬───────────┘
                                                       │
                                                       ▼
                                  ┌────────────────────────────────────┐
                                  │ probe() für 8 Services             │
                                  │ Supabase / OpenAI / Stripe / ...   │
                                  └────────────┬───────────────────────┘
                                               │
                              ┌────────────────┴───────────────────┐
                              │                                    │
                              ▼                                    ▼
                   ┌──────────────────────┐          ┌─────────────────────────┐
                   │ system_health_history│          │ push-notify.js          │
                   │ (Supabase, INSERT)   │          │ (wenn status=down)      │
                   └──────────────────────┘          └────────────┬────────────┘
                                                                   │
                                                                   ▼
                                                    ┌──────────────────────────┐
                                                    │ web-push (Browser-Push)  │
                                                    │ → registered devices     │
                                                    └──────────────────────────┘
```

---

## 🔧 ENV-Vars (Netlify Dashboard → Environment)

| Variable | Wert | Beschreibung |
|----------|------|--------------|
| `HEALTH_CHECK_CRON_SECRET` | random 64-char | Bearer-Token für Cron-Auth (Schutz gegen unauth Trigger) |
| `VAPID_PUBLIC_KEY` | von web-push generate | Browser-side Subscription-Key |
| `VAPID_PRIVATE_KEY` | von web-push generate | Server-side Sign-Key |
| `VAPID_SUBJECT` | `mailto:marcel.schreiber@…` | Contact-Address für Push-Provider |

**VAPID-Keys generieren:**
```bash
npx web-push generate-vapid-keys
```

---

## 📅 Netlify-Schedule (netlify.toml)

```toml
[functions."health-check-cron"]
  schedule = "*/10 * * * *"    # alle 10 Minuten
```

(In M⁴² P5 ergänzt — vorher fehlte der Eintrag, Cron lief NICHT.)

---

## 🚀 Setup-Schritte für Pilot-User (Marcel + Pilotkunden)

### Schritt 1: Browser-Berechtigung erteilen

1. Öffne `/push-setup.html`
2. Klick "Berechtigung anfragen"
3. Browser fragt → "Erlauben"

### Schritt 2: Subscription registrieren

1. Klick "Subscription speichern"
2. Server speichert Subscription in Supabase (`push_subscriptions` Tabelle)

### Schritt 3: Test-Push empfangen

1. Klick "Test-Push senden"
2. Innerhalb 5s sollte Browser-Notification erscheinen

---

## 🧪 Manueller End-to-End-Test (für Marcel)

1. Öffne `/health-test-down.html`
2. Klick "Health-Check sofort triggern" → Cron läuft sofort statt zu warten
3. Klick "Simuliere Service-Down" → triggert push-notify direkt
4. Push sollte in <10s ankommen

Falls nicht:
- ENV-Vars prüfen (`netlify env:list`)
- `system_health_history` Tabelle in Supabase: ist da was drin?
- Browser-DevTools → Console auf push-setup.html: gibt es Fehler?
- Service-Worker registriert? (`navigator.serviceWorker.getRegistrations()`)

---

## 📊 Monitoring

**Nach erfolgreichem Setup:**
- `system_health_history` füllt sich alle 10min mit 8 Service-Rows
- `push_alert_log` füllt sich nur bei Down-Events
- `/admin-cockpit.html` zeigt Health-Status-Widget (M⁴¹ P3)

---

## 🔴 Marcel-Pflicht-Items für Live-Verify

1. ENV-Vars auf Netlify setzen (4 Stück)
2. Netlify Deploy triggern (push zu main)
3. `/push-setup.html` durchlaufen (auf Marcel's Hauptgerät)
4. `/health-test-down.html` öffnen + Push-Test durchführen
5. Resultat in M⁴² Phase 13 FINAL dokumentieren

---

*M⁴² P5 — Co-Authored-By Claude Opus 4.7 — 2026-05-08*
