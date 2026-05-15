# MEGA⁸¹ MARCEL-CHECKLIST — Mission-Control + Repo-Sync

**Stand:** 2026-05-15 · **Branch:** `feat/mega81-dashboard-mission-control`
**Voraussetzung:** Pull + Hard-Reload (Strg+F5) damit v3244 lädt.

---

## A. Migration applien

```
mcp Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega81_notification_rpcs
  query=<Inhalt von supabase-migrations/57_mega81_notification_rpcs.sql>
```

**Erwartung:** Success. Verify mit:

```sql
SELECT proname FROM pg_proc WHERE proname LIKE 'notifications_%';
-- Erwartet 4 Rows: notifications_unread_count, notifications_list,
--                  notifications_mark_read, notifications_mark_all_read
```

## B. Edge-Function-Deploys (CLI)

```bash
supabase functions deploy admin-ki-aggregations --project-ref cngteblrbpwsyypexjrv
supabase functions deploy whisper-diktat --project-ref cngteblrbpwsyypexjrv
```

---

## C. Smoke-Tests (12 Punkte)

### 1️⃣ Notifications-RPCs funktionieren

```sql
-- Als Marcel via MCP (auth.uid ist NULL in MCP, daher Test mit SET ROLE)
SELECT public.notifications_unread_count();
SELECT * FROM public.notifications_list(10, NULL, false);
```

In der App: F12 Console:
```js
const sb = (await import('/lib/supabase-client.js')).supabase;
await sb.rpc('notifications_unread_count');
await sb.rpc('notifications_list', { p_limit: 10, p_kategorie: null, p_only_unread: false });
```

→ Beide liefern Daten. ✅

### 2️⃣ Bell ist sichtbar im Header

- App öffnen → Dashboard
- Topbar rechts: 🔔 Icon erscheint
- Wenn ungelesene Notifications da → roter Badge mit Zahl

→ ✅ wenn Bell + ggf. Badge sichtbar

### 3️⃣ Bell-Dropdown öffnen + Liste sehen

- Bell klicken → Dropdown geht auf
- Erwartung: Liste der letzten 30 Notifications, ungelesene zuerst markiert
- Outside-Klick oder Esc schließt

→ ✅

### 4️⃣ Notification als gelesen markieren

- Auf eine ungelesene klicken → navigiert zu `link_url`
- Browser-Back → Badge-Zahl ist um 1 reduziert

→ ✅

### 5️⃣ Alle als gelesen

- Bell öffnen → "Alle als gelesen"-Button klicken
- Badge verschwindet, Liste-Items sind nicht mehr fett

→ ✅

### 6️⃣ Heute-Widget ist erstes Tile auf Dashboard

- Dashboard öffnen
- Erstes Tile: 🎯 Heute
- Mit oder ohne Termine/Fristen heute — wenn nichts da: "Heute steht nichts an. Guten Tag!"
- Wenn Termine: Listet sie mit Uhrzeit auf
- Wenn Fristen heute oder überfällig: zeigt sie unter Section-Label

→ ✅

### 7️⃣ Cron-Jobs noch aktiv

```sql
SELECT jobname, schedule, active FROM cron.job ORDER BY jobid;
```

Erwartet 5 Rows, alle `active=true`:
- prova-health-check
- prova-status-check
- fristen-erinnerungen-daily
- mahnwesen-vorbereitungen-daily
- termin-tagesplan-daily

→ ✅

### 8️⃣ admin-ki-aggregations is_founder-Check

```bash
TOKEN=<dein Marcel-JWT>
curl -i -H "Authorization: Bearer $TOKEN" \
  https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/admin-ki-aggregations?range=7d
```

→ 200 wenn `users.is_founder = true` für Marcel-Email. 403 wenn nicht.

```sql
SELECT email, is_founder FROM public.users WHERE email ILIKE '%marcel%';
```

→ ✅ wenn Marcel als is_founder eingetragen ist

### 9️⃣ whisper-diktat respektiert Sprache

- Einstellungen → KI&Diktat → Diktat-Sprache auf `de-AT` setzen → Speichern
- Diktat aufnehmen (kurzes "Test")
- F12 → Network → whisper-diktat-Request anschauen — Server sollte Whisper-Language `de` (ISO-639-1 vom `de-AT`-Setting) erhalten

→ ✅ (oder Marcel überspringt — Whisper-API gibt Ergebnis trotzdem zurück, Sprach-Hint ist nur Optimierung)

### 🔟 Inline-Suggestions Toggle wirkt

- Einstellungen → "Inline-KI-Vorschläge" auf AUS
- Speichern + Reload
- Fachurteil-Editor öffnen → 4-5 Sätze tippen → kein Ghost-Text mehr
- Slash-Befehl `/ki` triggert weiterhin manuell ✅
- Toggle wieder AN → Reload → Ghost-Text kommt zurück

→ ✅

### 1️⃣1️⃣ Cron-Migrations spiegelt Live-Stand

```sql
SELECT pg_get_functiondef('public.process_termin_tagesplan'::regproc);
```

→ Output sollte exakt dem Inhalt von `supabase-migrations/55_mega80_termin_tagesplan_cron.sql` entsprechen.

```sql
SELECT pg_get_functiondef('public.prepare_mahnwesen_notifications'::regproc);
```

→ Output entspricht `supabase-migrations/56_mega80_mahnwesen_vorbereitung_cron.sql`.

→ ✅ Repo-Sync verified

### 1️⃣2️⃣ sw.js v3244 lädt

- F12 → Application → Service Workers
- Active worker: `prova-v3244-mega81-mission-control`
- Wenn noch alte Version: F12 → Application → Clear storage → Clear site data → Hard-Reload

→ ✅

---

## D. Bei Fehlern

- **Bell nicht sichtbar:** `.prova-notif-slot` fehlt auf manchen Pages — Marcel-Audit auf welcher Page
- **RPC 404:** Migration 57 nicht applied — Step A wiederholen
- **admin-ki-aggregations 403 obwohl Founder:** `is_founder` nicht gesetzt in users-Row
- **Heute-Widget leer obwohl Termine vorhanden:** termine.assigned_to_user_id fehlt → Widget zeigt nur die mit `assigned_to_user_id = auth.uid()` OR `NULL`

---

## E. Nicht in MEGA81 enthalten (kommt in MEGA82+)

- Login Cross-Domain Cookie-Adapter (F.1)
- Edge-Function-Reaping (5 sichere Deletes + 11 Audit-Kandidaten)
- applyPhaseVisibility DOM-Refactor in akte.html
- Pre-Push-Minutely Termin-Cron — Reevaluation ob noch nötig
