# SPRINT 14 — M7b Make-Migration Teil 2 (Restliche Flows)

**Tag:** 14 · **Aufwand:** 5-6h · **Phase:** C Migration & Operations

---

## Ziel
Alle restlichen HTTP-Webhook-Make-Szenarien (G3, K2, L3, F1, A5) zu Netlify migrieren. Nur noch 4 Cron-Szenarien bei Make (L8/L9/L10/T3).

---

## Scope

| Make-Szenario | Neue Function | Was es tut |
|---|---|---|
| **G3** (4790180) Freigabe/PDF | `gutachten-freigabe.js` | Freigabe + finales PDF + Mail |
| **K2** (4920914) Support | `support-chat.js` | Support-Anfragen verarbeiten |
| **L3** (5038113) Stripe | direkt in `stripe-webhook.js` | Stripe-Event-Handling |
| **F1** (5192002) Rechnungen | `rechnung-erstellen.js` | War schon teilweise in Sprint 12 |
| **A5** (5147393) Admin | `admin-notify.js` | Admin-Benachrichtigungen |

**Bleiben bei Make (Cron-basiert):**
- L8 Welcome-Mails
- L9 Trial-Reminder
- L10 Churn-Prevention
- T3 Termin-Reminder

---

## Prompt für Claude Code

```
PROVA Sprint 14 — M7b Make-Migration Teil 2 (Tag 14)

Pflicht-Lektüre vor Start:
- Memory: alle Scenario-IDs + Hook-URLs
- Sprint 13 (M7a) abgeschlossen
- bestehende stripe-webhook.js, freigabe-logic.js


SCOPE
=====

Block A — G3 Freigabe-Migration

A1: netlify/functions/gutachten-freigabe.js
- POST mit { fall_id, §407a_bestätigt: bool, §6_text_hash, sv_email }
- requireAuth
- Sanity-Checks: §407a-Checkbox an, §6-Hash valid
- UPDATE SCHADENSFAELLE Status "freigegeben"
- PDFMonkey-Render finale Version (Modus "final")
- E-Mail an Auftraggeber via IONOS-SMTP
- AUDIT_TRAIL-Eintrag
- Response: { pdf_url, mail_sent: bool }

A2: freigabe-logic.js Umstellung
- Make-Webhook-URL → /.netlify/functions/gutachten-freigabe

Block B — K2 Support-Migration

B1: netlify/functions/support-chat.js
- POST mit { topic, message, sv_email }
- requireAuth
- INSERT in Support-Tickets-Tabelle (oder Email an support@prova-systems.de)
- Auto-Reply an SV
- Optional: bei Stichworten "Bug"/"Crash" → push-notify Marcel

B2: hilfe.html Umstellung
- Make-Webhook → Netlify-Function

Block C — L3 Stripe-Integration in stripe-webhook.js

C1: stripe-webhook.js erweitern
- Bisher: nur Subscription-Events
- Neu: alle bisherigen Make-L3-Aktionen direkt
  - Trial_Start setzen
  - Plan-Update bei Subscription-Änderung
  - Cancel-Event handling
  - Refund-Event handling
- L3 Make-Szenario kann pausiert werden

Block D — F1 Rechnungen (bereits in Sprint 12)

D1: rechnung-erstellen.js (existiert aus Sprint 12)
- Sicherstellen: 100% Make-F1-Funktional-Parität
- Versand-Logik
- E-Mail-Templates

D2: F1 Make-Szenario pausieren

Block E — A5 Admin-Notify-Migration

E1: netlify/functions/admin-notify.js
- POST mit { event_typ, payload }
- Push-Notification an Marcel
- Optional: Email an marcel_schreiber891@gmx.de
- Beispiel-Events: neuer_sv, plan_gekauft, kritischer_error, support_ticket

E2: Alle bestehenden Aufrufer umstellen
- grep für "MAKE_S5" oder Webhook-URL A5
- Replace mit /.netlify/functions/admin-notify

Block F — Make-Szenarien deaktivieren + L8/L9/L10/T3 prüfen

F1: G3, K2, L3, F1, A5 in Make-UI auf "off"

F2: L8, L9, L10, T3 prüfen
- L8 Welcome-Mails: aktiv?
- L9 Trial-Reminder: aktiv?
- L10 Churn-Prevention: aktiv?
- T3 Termin-Reminder: aktiv? (Memory: Gmail-Connection benötigt)

F3: ENV-Vars aufräumen
- MAKE_S3_WEBHOOK, MAKE_S4_WEBHOOK, etc. entfernen aus Netlify ENV (wenn nicht mehr genutzt)
- MAKE_WEBHOOK_KAUF, MAKE_WEBHOOK_WILLKOMMEN bleiben (für L8)

Block G — Tests

G1: Vollständiger End-to-End-Test:
- Neuer Fall (Sprint 13)
- Diktat (Sprint 13)
- KI-Analyse
- Freigabe (Sprint 14: gutachten-freigabe)
- Rechnung (Sprint 12: rechnung-erstellen)
- Versand
- Admin-Notify (Sprint 14)

Block H — sw.js v217


QUALITÄTSKRITERIEN
==================
- 5 Make-Szenarien deaktiviert
- 4 Cron-Szenarien aktiv und getestet
- Alle Functional-Parität
- AUDIT_TRAIL lückenlos
- Performance besser oder gleich


TESTS
=====
End-to-End:
1. Vollständiger Fall durchlaufen ohne Make
2. Stripe-Event simulieren (test-mode) → wird in stripe-webhook.js verarbeitet
3. Support-Anfrage → Support-Ticket erstellt + Auto-Reply
4. Marcel bekommt push für "neuer_sv"-Event
5. T3 läuft täglich morgen (manuell triggern + prüfen)


ACCEPTANCE
==========
1. 5 Functions live
2. 5 Make-Szenarien off
3. 4 Cron-Szenarien aktiv
4. End-to-End ohne Make funktioniert


TAG: v180-make-migration-2-done
```

---

## Marcel-Browser-Test (20 Min)

1. Vollständiger Workflow: Neuer Fall → Diktat → Analyse → Freigabe → Rechnung → Versand
2. Network-Tab: nur noch Netlify-Functions, kein make.com
3. Stripe-Test-Mode: Subscription kaufen → Status korrekt in Airtable
4. Support-Mail vom Hilfe-Center → Auto-Reply kommt
5. Make-UI: 5 Szenarien off, 4 on
