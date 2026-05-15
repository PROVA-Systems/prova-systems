# MEGA⁷⁸ — Marcel-Smoke-Test-Checklist

**Pre-Test:** Hard-Reload (Strg+Shift+R), InPrivate-Browser, DevTools offen.

## Smoke-Test 12 Punkte

| # | Aktion | Erwartung | Phase |
|---|---|---|---|
| 1 | Hard-Reload Dashboard | **0** `airtable-wrapper-deprecated` in Console (SW v3241) | D |
| 2 | Einstellungen → Benachrichtigungen | Toggles laden mit korrekten Werten: alle 4 = true, quiet_hours_enabled = false | B.1 |
| 3 | **Cmd+K** auf Dashboard | Overlay öffnet sofort | C.3 |
| 4 | **Cmd+K** auf Einstellungen | Overlay öffnet auch hier (Editor-Restriction weg) | C.3 |
| 5 | **Cmd+K** auf Akte-Page | Overlay öffnet auch hier | C.3 |
| 6 | "DIN" tippen in Suche | Treffer aus `normen` mit Aktenzeichen/Bereich | C.2 |
| 7 | "Schmidt" tippen (wenn Marcel den Namen in Aufträgen hat) | Treffer aus `auftraege` + `kontakte` gruppiert | C.2 |
| 8 | Filter-Pill **"Nur Aufträge"** | Andere Quellen verschwinden, nur Aufträge-Treffer sichtbar | C.3 |
| 9 | ↑↓ Tastatur-Navigation | Treffer-Highlight bewegt sich | C.3 |
| 10 | Enter auf Treffer | Navigation zur Detail-Page (`/akte.html?az=...`) | C.2 |
| 11 | Esc | Overlay schließt | C.3 |
| 12 | Bibliothek-Page öffnen | Linker Card-Rand ist auf gleicher x-Koordinate wie Dashboard-Hero-Header | E.2 |

## DB-Verify-Queries (per Supabase-MCP)

```sql
-- B.1: Marcels notification_settings hat neues Schema
SELECT id, email, notification_settings
FROM public.users
WHERE id = '68b27e9e-c32c-415d-9775-ce7273881861';

-- B.3: Marcel hat user_workflow_settings-Row mit Default
SELECT * FROM public.user_workflow_settings
WHERE user_id = '68b27e9e-c32c-415d-9775-ce7273881861';

-- C.1: globale Suche funktioniert
SELECT * FROM public.global_search('DIN', 3, NULL);
SELECT * FROM public.global_search('Schmidt', 3, 'kontakte');  -- mit Filter

-- C.1: Liste der grants
SELECT routine_schema, routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'global_search';
```

## Was Marcel heute NICHT testen muss (Defer MEGA79)

- **Persönlicher KI-Kontext-Effekt** auf KI-Vorschläge — Frontend speichert korrekt, Backend-Anhang in KI-System-Prompt kommt MEGA79
- **KI-Lernpool-Einwilligungs-Effekt** — Frontend speichert, INSERT-Check kommt MEGA79
- **Whisper-Sprach-Param** — MEGA79
- **admin-ki-aggregations 403** wenn 2FA-stale — Frontend zeigt jetzt "2FA erforderlich" sauber, Backend-Konsistenz-Check kommt MEGA79
- **applyPhaseVisibility echte Logik** — Pass-Through-Stub aus MEGA77 ist Production-Safe, echte Phase-Sichtbarkeits-Logic kommt MEGA79
- **Server-Side-Airtable-Cleanup** in 10+ Netlify-Functions — fallen auto nach ENV-Cleanup (MEGA76 G.1)

## Failure-Trigger

- Bei `airtable-wrapper-deprecated` Warn in Console → SW-Cache leer mit Strg+F5, dann erneut testen
- Bei Cmd+K-Overlay öffnet nicht → DevTools-Console auf Stack-Trace von `keydown` checken
- Bei RPC-Fehler in Console (`global_search`) → Supabase-MCP `execute_sql SELECT * FROM global_search('test',3,NULL)` zum Reproduzieren

## Erfolgs-Trigger

- Alle 12 Punkte grün → bereit für Squash-Merge `feat/mega78-backend-wiring` → `main`
- Cmd+K von 3 verschiedenen Pages funktional → Phase C-Hauptwunsch erfüllt
- Marcels notification_settings hat neue Keys + alte Werte preserviert → B.1 erfolgreich
