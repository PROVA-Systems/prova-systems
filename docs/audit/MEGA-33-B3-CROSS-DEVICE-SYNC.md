# MEGA³³ B3 — Cross-Device-Sync Audit

**Datum:** 2026-05-07
**Auditor:** Claude Code Opus 4.7
**Scope:** Auto-Save + Realtime-Subscription Coverage über alle Production-Pages

---

## 1. Auto-Save-Coverage (Pages mit Live-Save)

| Page | Auto-Save? | Mechanismus | Cross-Device-Risk |
|---|---|---|---|
| `neuer-fall.html` | ✅ | `ProvaWizardSave.saveStep` (MEGA³³ A1) | Low — Phase-Save sofort sichtbar |
| `wertgutachten.html` | ✅ | `wgBerechne*` + speichern() throttled | Low |
| `beratung.html` | ✅ | `bindAutoSave()` (5s throttle) | Low |
| `baubegleitung.html` | ✅ | `proj.begehungen`-Updates | Low |
| `stellungnahme.html` | ✅ | `bindAutoSave()` + §6 Editor onInput | Low |
| `app.html` | ✅ | Field-onBlur + localStorage-Mirror | Med — wenn Tab geschlossen |
| `akte.html` | ✅ | nur lesend (read-only) | Keiner |
| `freigabe.html` | ✅ | onSubmit + Audit-Trail-Insert | Keiner |
| `einstellungen.html` | ✅ | onChange persist | Low |
| `dashboard.html` | ✅ | nur lesend | Keiner |

**Befund:** Alle Production-Pages haben Auto-Save oder sind read-only.

---

## 2. Realtime-Subscription-Coverage

| Tabelle | Subscribe-Page | Verwendung | Status |
|---|---|---|---|
| `auftraege` | dashboard, archiv | Live-Liste neuer Aufträge | ⚪ Nicht aktiv (lib/data-store.js Foundation vorhanden) |
| `eintraege` | baubegleitung | Multi-Device-Begehungs-Sync | ⚪ Nicht aktiv |
| `dokumente` | freigabe | PDF-Generation-Status | ⚪ Nicht aktiv |
| `notifications` | dashboard | Push-Updates | ⚪ Nicht aktiv |

**Befund:** Realtime-Foundation in `lib/data-store.js` vorhanden (supabase.channel-Pattern), aber noch **NICHT aktiv abonniert** in Production-Pages. Cross-Device-Sync läuft aktuell via:
1. Auto-Save bei Edit (sofort in DB)
2. Page-Reload bei Re-Open (lädt aktuellen Stand)

**Risiko-Bewertung:** Akzeptabel für Solo-SVs. Für Team-Büros (379€-Tier) Realtime-Aktivierung in MEGA³⁵ empfohlen.

---

## 3. Konflikt-Resolution-Strategie

**Aktuell:** Last-Write-Wins (Supabase RLS UPDATE überschreibt).

**Mitigation für Solo-SV:**
- Auto-Save throttled auf 1 Update/Sek (nicht pro Keystroke)
- localStorage-Draft vor DB-Write (Recovery bei DB-Outage)
- Offline-Banner zeigt User explizit den Modus

**Empfehlung MEGA³⁵:** OCC (Optimistic Concurrency Control) via `updated_at`-Vergleich vor UPDATE.

---

## 4. Lücken-Liste (für nachfolgende Sprints)

1. **Realtime-Subscription** auf `auftraege` für Dashboard (M³⁵)
2. **Push-Notifications** für Mobile bei Status-Wechsel (M³⁶)
3. **OCC-Konflikt-Detection** mit Toast bei Konflikt (M³⁵)
4. **Service-Worker Background-Sync** für Offline-Edits (M³⁶)

---

*Co-Authored-By Claude Opus 4.7 (1M context)*
