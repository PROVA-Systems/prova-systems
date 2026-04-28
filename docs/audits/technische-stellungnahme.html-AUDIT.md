# Pilot-Audit: technische-stellungnahme.html (K-1.3.A1)

**Datum:** 28.04.2026 · **Sprint:** K-1.3 (Frontend-Pilot)

## Page-Status (vor Refactor)

| Metrik | Wert |
|---|---|
| HTML | `technische-stellungnahme.html` — 304 Zeilen |
| Logic | `technische-stellungnahme-logic.js` — 255 Zeilen |
| Status | Skeleton v1, Backend-TODO sichtbar als `ts-todo-banner` |
| Auto-Save | `localStorage['prova_ts_draft_v1']` alle 30s — funktional |
| Phasen | 3 (Auftrag&Frage / Bewertung&Antwort / Versand&Abrechnung) |

## Externe Calls / Refactor-Punkte

### Aktuelle Imports (HTML head)
```
prova-fetch-auth.js     → durch Supabase-Auth ersetzen
auth-guard.js           → durch lib/auth-guard.js ersetzen (Block A4)
prova-notifications.js  → bleibt (UI)
prova-sanitize.js       → bleibt (XSS-Schutz)
prova-auth-api.js       → entfernen (Netlify Identity)
prova-sv-airtable.js    → entfernen (Airtable Cache)
theme.js                → bleibt (UI)
prova-layout.config.js  → bleibt (Layout)
nav.js                  → bleibt (Sidebar)
```

### Backend-Calls (Logic)
- **3 TODO_AT_SAVE-Markers** im Logic — nichts angebunden, perfekter Refactor-Start
- Keine Make-Webhook-Calls
- Keine Netlify-Function-Calls (außer auth-guard intern)

### Backend-Mapping (neu, auf Supabase)
| Logic-Aktion | Edge / data-store | Schema-Tabelle |
|---|---|---|
| Auto-Save (Draft) | `dataStore.auftraege.upsert` mit `status='entwurf'` | `auftraege` |
| Final-Save | `dataStore.auftraege.update` mit `status='aktiv'` | `auftraege` |
| Phase-Tracking | `phase_aktuell` direkt in auftraege-Row | `auftraege.phase_aktuell` |
| Auftraggeber speichern | `dataStore.kontakte.create` + `auftrag_kontakte` M:N | `kontakte` + `auftrag_kontakte` |
| AZ generieren | DB-Trigger `generate_az()` (existiert) ODER local `TS-YYYY-NNN` | `auftraege.az` |
| PDF generieren | Edge Function `pdf-generate` mit `template_key='kurzstellungnahme'` | `dokumente` |
| Audit | Edge Function `audit-write` mit `action='create/update'` | `audit_trail` |

### auftrag_typ-Wahl

Schema-ENUM hat `kurzstellungnahme` (KSN-YYYY-NNN). Technische Stellungnahme = "fachliche Stellungnahme zu konkreter Frage" → konzeptuell identisch. **Wahl: `typ='kurzstellungnahme'`**, AZ kann TS-Pattern bleiben.

## Refactor-Plan A2-A7

| Block | Aktion |
|---|---|
| A2 | Logic-File neu: `technische-stellungnahme-logic.js` als ESM-Modul, importiert `lib/data-store.js` + `lib/supabase-client.js` |
| A3 | HTML: 4 alte Scripts (`prova-fetch-auth`, `prova-auth-api`, `prova-sv-airtable`, `auth-guard`) entfernen, `lib/prova-config.js` + ESM-Modul-Imports einsetzen |
| A4 | `lib/auth-guard.js` als zentrales Modul für alle Pages |
| A5 | `tools/test-pilot-kurzstellungnahme.html` mit 6 Test-Buttons |
| A6 | `onboarding-supabase.html` für Workspace-Erst-Anlage |
| A7 | Sprint-Doku |

## Drift-Notiz

Mega-Prompt #2 nennt `login.html` als Refactor-Ziel — existiert nicht. Echte Login-Page heißt `app-login.html`. Wird in B12 berücksichtigt.

## Aufwand-Schätzung

Pilot ist Skeleton → kein "Bestand ablösen", sondern "Backend frisch anbinden". Aufwand reduziert: 2-3h statt 4-6h aus dem Skeleton-Comment.
