# Edge-Function-Inventar für Sprint K-1.2

**Stand:** 27.04.2026 nach „Make raus"-Decision
**Ziel:** 8 Edge Functions die alle 10 Make-Scenarios ersetzen + 1-2 fehlende Funktionen die in Make nie gebaut wurden

---

## 🎯 Die 8 Edge Functions

### 1. `pdf-generate` — ersetzt G1 + G3 Gutachten
- **Trigger:** HTTP-Endpoint `POST /functions/v1/pdf-generate`
- **Body:** `{ auftragId, templateKey, empfaenger_email }`
- **Flow:**
  1. Auftrag aus Supabase laden (mit allen Linked Records)
  2. Daten für PDFMonkey-Payload aufbereiten
  3. PDFMonkey POST `/api/v1/documents`
  4. Polling alle 2s (max 30s) auf `status=success`
  5. PDF-URL in `dokumente`-Tabelle speichern
  6. Email mit PDF-Link via `email-send` triggern
  7. Audit-Trail-Eintrag
- **Ersetzt Make-Komplexität:** 3× wait cycles, meta-toJSON-Wrapping, isinvalid-Hadling — alles weg
- **Code-Größe:** ~120 Zeilen

### 2. `email-send` — ersetzt K2 Komm
- **Trigger:** HTTP-Endpoint `POST /functions/v1/email-send`
- **Body:** `{ to, subject, html, attachments?, zweck, verknuepft_id?, verknuepft_typ? }`
- **Flow:**
  1. Resend-API-Call mit Rate-Limit-Awareness
  2. `email_log` INSERT mit Provider-Message-ID (für Bounces/Complaints später)
  3. Status-Tracking via Resend-Webhooks
- **Ersetzt Make-Komplexität:** Gmail-Connection-ID-Quirks, account vs __IMTCONN__, manuelle Aktivierung — alles weg
- **Code-Größe:** ~50 Zeilen

### 3. `user-lifecycle` — ersetzt L3 + L8 + L9 + L10
- **Trigger:** `pg_cron` täglich um 09:00 UTC
- **Flow:**
  1. Query: Alle User mit `abo_status = 'trial'`
  2. Pro User: Days-since-signup berechnen
  3. Bei Tag 0 (just signed up): Welcome-Mail (`zweck: lifecycle_welcome`)
  4. Bei Tag 3: Tutorial-Erinnerung (`zweck: lifecycle_tag3`)
  5. Bei Tag 7: Mid-Trial-Check (`zweck: lifecycle_tag7`)
  6. Bei Tag 12: Trial-Endet-bald-Warnung (`zweck: lifecycle_trial_ending`)
  7. `onboarding_progress.welcome_email_gesendet_at` etc. updaten
  8. Idempotenz: nicht 2× am gleichen Tag
- **Ersetzt Make-Komplexität:** 4 separate Scenarios mit gleicher Logik — jetzt 1 Function
- **Code-Größe:** ~150 Zeilen

### 4. `admin-notify` — ersetzt A5 Admin
- **Trigger:** HTTP-Endpoint `POST /functions/v1/admin-notify`
- **Body:** `{ event_type, payload, urgency? }`
- **Flow:**
  1. Email an Marcel (`marcel@prova-systems.de`)
  2. Push-Notification falls Marcel Web-Push aktiv hat
  3. `audit_trail` INSERT
- **Code-Größe:** ~40 Zeilen

### 5. `termin-reminder` — ersetzt T3 Termine
- **Trigger:** `pg_cron` stündlich
- **Flow:**
  1. Query: Termine in nächsten 24h die noch keine Erinnerung gekriegt haben
  2. Pro Termin: Email an SV + ggf. Push-Notification
  3. `termine.erinnerung_24h_gesendet_at` setzen
  4. Bei Termin in 1h: zweite Erinnerung (kurzfristig)
- **Ersetzt Make-Komplexität:** Manuelle Aktivierung war nötig — jetzt automatisch via pg_cron
- **Code-Größe:** ~80 Zeilen

### 6. `stripe-webhook` — ersetzt F1 Finanzen
- **Trigger:** HTTP-Endpoint `POST /functions/v1/stripe-webhook`
- **Headers:** `stripe-signature` (für Verification)
- **Flow:**
  1. Signature-Verify (sonst Reject 401)
  2. `stripe_events` INSERT mit `stripe_event_id` UNIQUE → bei Konflikt: bereits verarbeitet, return 200
  3. Switch über `event.type`:
     - `checkout.session.completed` → workspace.abo_status auf `aktiv`, abo_aktiv_seit setzen
     - `customer.subscription.updated` → abo_tier syncen, naechste_zahlung_am setzen
     - `customer.subscription.deleted` → abo_status auf `gekuendigt`
     - `invoice.payment_succeeded` → letzte_zahlung_am, betrag, gesamtzahlungen_lifetime_eur += betrag
     - `invoice.payment_failed` → abo_status auf `ueberfaellig`, retry_count++
  4. Bei Erfolg: status='verarbeitet', auswirkung_beschreibung
  5. Bei Fehler: status='verarbeitung_fehler', naechster_retry_at = NOW() + 1h
- **Kritisch:** Stripe sendet Events mehrfach — UNIQUE-Constraint in `stripe_events.stripe_event_id` verhindert Doppel-Verarbeitung
- **Code-Größe:** ~180 Zeilen

### 7. `mahnung-trigger` — NEU (war in Make NICHT gebaut!)
- **Trigger:** `pg_cron` täglich um 10:00 UTC
- **Flow:**
  1. Query: Rechnungen mit `status='versendet' AND faelligkeit < NOW() - INTERVAL '14 days' AND letzte_mahnung IS NULL`
  2. Pro Rechnung: Mahnung-PDF generieren via `pdf-generate` (Template `mahnung-1`)
  3. Email an Empfänger via `email-send`
  4. `dokumente` INSERT mit `parent_dokument_id = rechnung.id` (Mahnungs-Kette aus Phase 3)
  5. `letzte_mahnung_am` setzen, `mahnstufe = 1`
  6. Bei `mahnstufe=1` älter als 14 Tage: Mahnung 2 etc.
- **Wichtig:** Das ist ein FEATURE das in Make nie gebaut wurde — jetzt sauber direkt
- **Code-Größe:** ~100 Zeilen

### 8. `dsgvo-handler` — neu (HTTP-Wrapper für DB-Functions)
- **Trigger:** HTTP-Endpoint `POST /functions/v1/dsgvo-handler`
- **Body:** `{ action: 'export'|'loeschen', user_id }`
- **Flow:**
  1. Auth-Check (nur User selbst oder Founder)
  2. RPC-Call zu `dsgvo_user_export()` oder `dsgvo_user_loeschen()` (existieren bereits in Phase 4!)
  3. Bei Export: ZIP-File erstellen, in Storage hochladen, Download-Link returnen
  4. Bei Löschung: Bestätigungs-Email an User
- **Code-Größe:** ~50 Zeilen

---

## 📊 Total

| Metrik | Wert |
|---|---|
| Edge Functions | 8 |
| Code-Zeilen total | ~770 |
| Build-Aufwand für Claude Code | ~6-8h |
| pg_cron-Jobs | 3 (`user-lifecycle` daily, `termin-reminder` hourly, `mahnung-trigger` daily) |
| Resend-Setup | 1× (API-Key in ENV, Webhook-Endpoint für Bounces) |

**Zum Vergleich:** 10 Make-Scenarios mit insgesamt ~300 Modulen. Davon 2 nicht aktiv (T3, F1).

---

## 🛠️ Externe Services nach Migration

| Service | Status | Zweck |
|---|---|---|
| **Supabase** | ✅ kern | DB + Auth + Storage + Edge Functions + pg_cron |
| **Resend** | ➕ NEU | Email-Versand + Audiences (für später Newsletter) |
| **PDFMonkey** | ✅ behalten | PDF-Generation (kein Ersatz nötig) |
| **Stripe** | ✅ behalten | Billing |
| **OpenAI** | ✅ behalten | KI (über Edge Function `ki-proxy`) |
| ~~Make.com~~ | ❌ raus nach K-1.5 | — |
| ~~Cloudinary~~ | ❌ raus (war eh schon) | Storage in Supabase |
| ~~Netlify Identity~~ | ❌ raus nach K-1.0 | Auth in Supabase |

**Von 7 externen Services auf 5 reduziert. Klare Architektur-Konsolidierung.**

---

## 📅 Zeitplan-Update

```
K-1.0  Foundation                    🟢 6-8h    HEUTE ABEND
K-1.1  Migrations-Pipeline           🟢 8-12h   MORGEN
K-1.2  Edge Functions (alle 8)       🟢 6-8h    ÜBERMORGEN
K-1.3  Frontend-Pilot Kurzstellungn. 🟢 4-6h    Tag 4
K-1.4  Frontend-Refactor Rest        🟢 12-16h  Tag 5-6
K-1.5  Cutover + Make-Deaktivierung  🟢 3-4h    Tag 7
       └─ Make-Account NACH grünem Cutover kündigen
```

**Total Sprint K-1: 6-7 Arbeitstage. Make-Migration kostet GAR keine extra Zeit.**

---

## ⚠️ Wichtig — was Marcel JETZT NICHT tun darf

1. ❌ **Make-Account NICHT kündigen** bis Sprint K-1.5 grün ist (Fallback-Sicherheit)
2. ❌ **Make-Scenarios NICHT deaktivieren** während K-1.0–K-1.4 — alte Live-Logik soll laufen
3. ❌ **Make-Webhooks in ENV-Vars NICHT löschen** — werden in K-1.5 sauber abgeschaltet

**Grund:** Parallel-Betrieb. Erst wenn neues System grün ist, schalten wir um.

---

*Ende Edge-Function-Inventar*
