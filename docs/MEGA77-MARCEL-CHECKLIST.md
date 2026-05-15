# MEGA⁷⁷ — Marcel-Smoke-Test-Checklist

**Pre-Test:**
- Cache leeren (Strg+Shift+R Hard-Reload)
- InPrivate/Inkognito-Browser
- DevTools-Console offen, Network-Tab aktiviert

## Smoke-Test 17 Punkte

| # | Aktion | Erwartung |
|---|---|---|
| 1 | Login → Dashboard | **0** `airtable-wrapper-deprecated` in Console (SW v3240) |
| 2 | Akte `GS-2026-001` öffnen | Lädt ohne `ReferenceError: applyPhaseVisibility` (B.1) |
| 3 | Dashboard → KI-Verbrauch-Tile | Zeigt Wert (Founder + 2FA aktiv), nicht "nur Founder"/"2FA erforderlich" (B.2) |
| 4 | Einstellungen → KI & Diktat | Nur 4 Toggles sichtbar: Diktat-Sprache + Inline-Vorschläge + Lernpool-Einwilligung + Persönlicher Kontext (C.1.1) |
| 5 | "Auto-Qualitätscheck" und "KI-Analyse-Modus" | **Weg** — nicht mehr im DOM |
| 6 | "Persönlicher KI-Kontext" auf "Spezialist Feuchteschäden, DIN 4108, WTA" setzen | Toast "gespeichert ✅", DB-Verify per MCP: `user_workflow_settings.persoenlicher_ki_kontext` ist gesetzt |
| 7 | KI-Vorschlag in Akte testen | **DEFER MEGA78** — Backend-Hook ist noch nicht im KI-Proxy live. Setting ist persistiert, Wirkung kommt in MEGA78 |
| 8 | "KI-Lernpool-Einwilligung" aus | DB-Verify: `ki_lernpool_einwilligung = false` |
| 9 | Einstellungen → Benachrichtigungen | "In Vorbereitung"-Hinweis + ⏳-Pills an jedem Toggle (C.2) |
| 10 | "Fristen-Alarme" toggle umschalten | DB-Verify per MCP: `users.notification_settings->>'fristen_alarm_enabled'` ist `true/false` korrekt |
| 11 | Sidebar | "Integrationen"-Item heißt jetzt **"Export & Import"** (C.3) |
| 12 | Tab "Export & Import" öffnen | **Kein** Airtable-Card, **kein** Make.com-Card, nur Fristen-Export + Daten-Import |
| 13 | Einstellungen → Vorlagen-Section scrollen | parse-docx GET liefert 200 (oder JSON-500 wenn Lambda-Auth fehlt) — **kein 502 Bad Gateway** (B.3) |
| 14 | Sidebar → Skizzen | Sidebar bleibt sichtbar (D.1) |
| 15 | Sidebar → Fristen | Sidebar bleibt sichtbar (war schon in MEGA75-F-Batch2) |
| 16 | Hilfe-Seite öffnen | **Eine** Tastenkürzel-Section, **eine** Fehlercodes-Section — keine Dubletten (D.3) |
| 17 | Cmd+K | **Noch nicht voll funktional** — vollständige 360°-Suche kommt in MEGA78. Aktuell läuft die existierende Live-Suche aus MEGA75 |

## Failure-Trigger

- **Bei JEDEM** `airtable-wrapper-deprecated` Warn in Console → SW-Cache leeren mit Strg+F5, dann erneut testen. Wenn dann immer noch: Bug-Report
- Bei `ReferenceError: applyPhaseVisibility` → Bug-Report, Production-Stopper
- Bei 502 parse-docx → Lambda-Logs in Netlify checken

## Erfolgs-Trigger

- 0× airtable in Console über alle 17 Tests → bereit für Squash-Merge
- 4 KI-Settings sichtbar + funktional → C.1 Trust-Recovery erfolgreich
- Tab "Export & Import" + keine Airtable/Make-Cards → C.3 Marcel-Direktive umgesetzt

## DB-Verify-Commands (Marcel per Supabase-MCP)

```sql
-- Verify Migration applied
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='user_workflow_settings'
  AND column_name IN ('diktat_sprache','inline_ki_suggestions_enabled','ki_lernpool_einwilligung','persoenlicher_ki_kontext')
ORDER BY column_name;

-- Verify Marcel's eigener Workflow-Settings-Row nach UI-Save
SELECT *
FROM public.user_workflow_settings
WHERE user_id = '68b27e9e-c32c-415d-9775-ce7273881861';

-- Verify notification_settings jsonb nach UI-Save
SELECT id, email, notification_settings
FROM public.users
WHERE id = '68b27e9e-c32c-415d-9775-ce7273881861';
```

## Was du heute NICHT testen musst (defer MEGA78)

- Cmd+K-360°-Suche
- Backend-Wirkung von `persoenlicher_ki_kontext` (kommt in MEGA78)
- Backend-Wirkung von `ki_lernpool_einwilligung` (kommt in MEGA78)
- Whisper-Sprach-Param-Durchreichung (kommt in MEGA78)
- Email/Push-Versand bei Fristen-Alarmen (kommt in MEGA80)
- Bibliothek-Layout-Padding (kommt in MEGA78)
