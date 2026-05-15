# MEGA⁸⁰ MARCEL-CHECKLIST — Cron-Pipeline + Pilot-Blocker

**Stand:** 2026-05-15
**Branch:** `feat/mega80-cron-pipeline`
**Voraussetzung:** Pull + Hard-Reload (`Strg+F5`) damit v3243 lädt

---

## A. Migrations applien (vor allem anderen)

### A.1 Phase A — Termin-Cron

```
mcp Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega80_termin_erinnerungen_cron
  query=<Inhalt von supabase-migrations/55_mega80_termin_erinnerungen_cron.sql>
```

**Erwartung:** Success. Kein Error.

### A.2 Phase B — Mahnwesen-Cron

```
mcp Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega80_mahnwesen_vorbereitung_cron
  query=<Inhalt von supabase-migrations/56_mega80_mahnwesen_vorbereitung_cron.sql>
```

**Erwartung:** Success.

### A.3 Cron-Jobs aktiv?

```sql
SELECT jobid, schedule, jobname, active
FROM cron.job
WHERE jobname IN ('termin-pre-push-minutely', 'termin-tagesplan-daily', 'mahnwesen-vorbereitungen-daily', 'fristen-erinnerungen-daily')
ORDER BY jobname;
```

**Erwartung:** 4 Zeilen, alle `active=true`.

---

## B. Smoke-Tests (Marcel — bitte alle 9 abhaken)

### 1️⃣ Cron termin-pre-push-minutely + termin-tagesplan-daily aktiv?

→ siehe A.3 oben. Wenn beide ✅ aktiv → ✅.

### 2️⃣ Cron mahnwesen-vorbereitungen-daily aktiv?

→ siehe A.3 oben. Wenn ✅ aktiv → ✅.

### 3️⃣ Test-Termin in ~20 Min → 5 Min später Push?

```sql
INSERT INTO public.termine (
  workspace_id, datum, uhrzeit_von, uhrzeit_bis, titel, typ, status,
  created_by_user_id, assigned_to_user_id, timezone
)
VALUES (
  '65b25a13-17b7-45c0-b567-6edee235dd98',
  CURRENT_DATE,
  (now() + INTERVAL '20 minutes')::time,
  (now() + INTERVAL '21 minutes')::time,
  'MEGA80-Test-Termin-A',
  'ortstermin', 'geplant',
  '68b27e9e-c32c-415d-9775-ce7273881861',
  '68b27e9e-c32c-415d-9775-ce7273881861',
  'Europe/Berlin'
)
RETURNING id;
```

Dann manuell triggern (statt 5 Min zu warten):

```sql
-- Diff manuell auf 15 Min schieben → 'pre' sollte triggern
UPDATE public.termine SET uhrzeit_von = (now() + INTERVAL '15 minutes')::time WHERE titel='MEGA80-Test-Termin-A';
SELECT public.process_termin_erinnerungen('pre');
```

**Erwartung:** `{"mode":"pre","processed":1,...}`. Dann:

```sql
SELECT kategorie, titel, body, link_typ, link_url FROM public.notifications
WHERE user_id='68b27e9e-c32c-415d-9775-ce7273881861' ORDER BY created_at DESC LIMIT 3;
```

→ Eine Zeile mit `kategorie='termine'`, `link_typ='termin'`, `titel` enthält "Termin in 15 Min". ✅

### 4️⃣ Test-Rechnung überfällig + Cron triggern → Notification?

```sql
INSERT INTO public.dokumente (
  workspace_id, typ, status, doc_nummer, betrag_brutto,
  faelligkeit, created_by_user_id, sent_at
)
VALUES (
  '65b25a13-17b7-45c0-b567-6edee235dd98',
  'rechnung_jveg', 'versendet', 'MEGA80-MAHN-TEST-001', 500.00,
  CURRENT_DATE - INTERVAL '14 days',
  '68b27e9e-c32c-415d-9775-ce7273881861',
  now() - INTERVAL '21 days'
)
RETURNING id;

SELECT public.prepare_mahnwesen_notifications();
```

**Erwartung:** `{"processed":1,...}`. Notification mit `kategorie='aufgaben'` (14 Tage < 30 → nicht achtung), Body enthält Verzugszinsen-Betrag + Mahngebühr 5€. ✅

Cleanup:
```sql
DELETE FROM public.dokumente WHERE doc_nummer LIKE 'MEGA80-MAHN-TEST%';
DELETE FROM public.termine WHERE titel LIKE 'MEGA80-Test-Termin%';
```

### 5️⃣ admin-ki-aggregations 200 mit Marcel-JWT? — ⏸ DEFER MEGA81

Edge-Function-Patch verschoben (siehe DECISIONS Defer-Liste). Frontend-Pre-Check aus MEGA77 schützt aktuell vor Non-Founder-Aufruf.

### 6️⃣ Whisper mit Sprache de-AT → audit_trail-Eintrag? — ⏸ DEFER MEGA81

Edge-Function-Patch verschoben.

### 7️⃣ Inline-Suggestions off → kein Auto-Trigger im Editor?

1. App öffnen → Einstellungen → KI&Diktat
2. Toggle **"Inline-KI-Vorschläge"** AUS
3. Speichern → harter Reload
4. Editor in Akte öffnen → 4-5 Sätze schreiben → **keine Auto-Vorschläge**
5. Slash-Befehl `/ki` manuell → KI-Antwort erscheint (Slash bleibt aktiv) ✅
6. Toggle wieder AN → Reload → Auto-Vorschläge erscheinen wieder ✅

### 8️⃣ Login auf prova-systems.de → kein zweiter Login auf app.? — ⏸ DEFER MEGA81

Cross-Domain-Cookie-Migration ist eigener Sprint (MEGA81 F.1).

### 9️⃣ Diktat-Mode-Switch auf manuell → Recorder gestoppt? **(KRITISCH)**

1. App öffnen → Akte mit Diktat-Tab
2. **"Diktat starten"** klicken → Browser fragt Mic-Permission → erlauben
3. 5 Sekunden sprechen → Text erscheint
4. Tab-Wechsel auf **"Manuelle Eingabe"**
5. **Erwartung:**
   - Browser-Tab-Indikator (roter Punkt links neben Favicon) **sofort weg** ✅
   - System-Mikrofon-LED am Laptop aus ✅
   - Kein laufender getUserMedia-Stream mehr (Browser-Inspect → about:webrtc oder vergleichbares ist leer)

→ Wenn das funktioniert, ist Marcels 5×-gemeldeter Pilot-Blocker beseitigt.

---

## C. Bei Fehler

- Phase A/B Migration-Apply-Fehler → Output an Web-Claude posten
- Phase B.4 Mahnwesen-Cron Notification kommt nicht → notification_settings prüfen: `SELECT id, notification_settings->>'zahlung_erinnerung_enabled' FROM public.users WHERE id='68b27e9e-c32c-415d-9775-ce7273881861';`
- Phase 9 Diktat-Mode-Bug bleibt → Console-Log: `window._provaAufnahmeStream` nach Mode-Switch prüfen — sollte `null` sein

---

## D. Was kommt mit MEGA⁸¹

- Phase C admin-ki-aggregations Edge-Function Auth-Hardening
- Phase D Whisper-Sprache Edge-Function-Patch
- Phase F.1 Login Cross-Domain Cookie-Adapter
- Phase G applyPhaseVisibility DOM-Markup
- Phase H Netlify-Functions Airtable-Cleanup
- Phase F.2 Split-Audit-Doku (kann Marcel parallel selbst auditen)
