# Sentry — DSGVO-konforme Konfiguration

**Stand:** 03.05.2026 (MEGA-SKALIERUNG M3)
**Verantwortlich:** Marcel Schreiber (PROVA-Systems)

---

## Zweck

Sentry erfasst:
- **Errors:** unbehandelte Exceptions in Frontend (Browser) + Backend (Netlify Functions).
- **Performance-Spans:** 10 % Sample-Rate für Latenz-Analyse.
- **Breadcrumbs:** vorausgehende Navigation/Click-Events um Kontext zu rekonstruieren.

**Zweck der Verarbeitung (Art. 6 Abs. 1 lit. f DSGVO):** Stabilitäts-Verbesserung der Plattform; berechtigtes Interesse von PROVA-Systems an einem fehlerfreien SaaS für Bausachverständige.

---

## Region + AVV

- **Region:** EU (`ingest.de.sentry.io`, Frankfurt am Main).
- **AVV:** unterschrieben mit Functional Software, Inc. (Sentry).
- **Subprozessor-Eintrag:** `avv.html` Anlage 2 (siehe `legal/avv.html` + `avv.html`).
- **Cookie-Banner:** Sentry setzt **keine Cookies**. Keine Banner-Pflicht.

---

## PII-Filter (Privacy by Design — Art. 25 DSGVO)

Implementiert in `lib/sentry-init.js` (Frontend) + `netlify/functions/lib/sentry-wrap.js` (Backend) via `beforeSend`-Hook.

**Was wird gefiltert:**

| Feld | Filter-Aktion | Begründung |
|---|---|---|
| `request.headers.authorization` | gelöscht | JWT-Token = Auth-Geheimnis |
| `request.headers.cookie` | gelöscht | Session-IDs |
| `request.headers.x-prova-token` | gelöscht | Custom-Token |
| `request.data` (Body) | komplett ersetzt durch `[redacted by PROVA-PII-Filter]` | Body kann Email/Passwort/Akten-Inhalte enthalten |
| `user.email` | ersetzt durch `[redacted]` | DSGVO Art. 4 Personenbezug |
| `user.ip_address` | auf `null` gesetzt | IP-Adresse = personenbezogenes Datum |
| `breadcrumbs[].data.url` | Query-String entfernt | URLs enthalten oft Aktenzeichen / Suche / Email |

**Was wird gesendet:**

- Stack-Trace (Code-Pfad)
- HTTP-Method + Path (ohne Query-String)
- Function-Name (Tag)
- Build-SHA (Release-Tracking via `COMMIT_REF`)
- Workspace-ID (technische Kennung, kein Personenbezug)

---

## Session-Replay: AUS

Sentry-Session-Replay ist **deaktiviert** (`replaysSessionSampleRate: 0.0`, `replaysOnErrorSampleRate: 0.0`). Begründung: Replay würde Akten-Inhalte, Mandantendaten, KI-Diktate aufzeichnen — DSGVO-Risiko + Schweigepflicht §203 StGB.

---

## Performance-Monitoring

`tracesSampleRate: 0.1` → 10 % der Requests werden für Latenz-Spans erfasst. Spans enthalten URL (ohne Query-String), Method, Dauer. **Keine Body-Inhalte.**

---

## Test-Verifikation

Frontend:
```js
window.testSentryError();  // wirft Test-Error → Sentry-Dashboard
```

Backend (curl):
```bash
curl https://app.prova-systems.de/.netlify/functions/sentry-test?secret=$PROVA_SENTRY_TEST_SECRET
# → 500 + Error in Sentry sichtbar
```

ENV `PROVA_SENTRY_TEST_SECRET` muss in Netlify gesetzt sein, sonst gibt der Endpoint 401.

---

## Audit-Trail

| Datum | Aktion |
|---|---|
| 03.05.2026 | M3 Sentry-Integration + AVV unterschrieben + EU-Region (Marcel) |
| 03.05.2026 | Subprozessor-Eintrag in `avv.html` + `legal/avv.html` |
| 03.05.2026 | PII-Filter implementiert (Frontend + Backend) |

---

## Folge-Themen (Backlog)

- **Forced Re-Consent** für Bestands-User wegen neuem Subprozessor (CLAUDE.md Regel 20). Marcel-Aktion: AVV-Versionierung in `rechtsdokumente`-Tabelle (Supabase) hochzählen, sodass `v_user_pending_einwilligungen` triggert.
- Wrap-Pattern auf alle restlichen 25+ Functions ausweiten (Folge-Sprint).
- Optionale Alert-Rules in Sentry konfigurieren (z.B. Slack-Notify bei >5 Errors / 10 Min).
