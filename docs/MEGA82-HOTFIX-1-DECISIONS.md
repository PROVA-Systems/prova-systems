# MEGA⁸²-Hotfix-1 DECISIONS — Dashboard-Clean + AZ-Frontend-Fix

**Stand:** 2026-05-16 · Branch: `feat/mega82-hotfix-1-dashboard-clean`
**Vorgänger:** `feat/mega82-verkauf-ready` (MEGA82 Pass 1+2, 9 Commits, vom Marcel als Tag v3246 gesetzt)
**Trigger:** Marcel-Live-Smoke-Test fand 3 Dashboard-Bugs + AZ-Duplicate-Bug

---

## Pre-Read ✅

- `CLAUDE.md` MEGA82-Sektion
- `docs/MEGA82-DECISIONS.md` (Pass 1+2)
- `dashboard.html` (Ist-Stand mit 13 Sektionen)
- `dashboard-logic.js` (alte Airtable-basierte Logic)
- `app.html` + `app-logic.js` (AZ-Insert Z.586)

---

## Phase H0 — AZ-Frontend-Fix ✅

### Root-Cause

`app-logic.js` Z.586 hatte:
```js
const az = v('f-schadensnummer') || v('f-gerichts-az') || ('AZ-' + Date.now().toString().slice(-6));
```

Fallback `'AZ-' + Date.now().slice(-6)` konnte durch Race-Condition oder schnelles Klicken kollidieren → `409 Conflict` auf `auftraege_workspace_id_az_key` unique constraint.

### Fix

1. **Z.586:** `az` nur lesen wenn User-Input vorhanden (`azUserInput`-Variable)
2. **Z.651:** `safe.az` NUR setzen wenn `azUserInput` vorhanden (sonst weglassen)
3. **Z.665 Retry-Block:** gleiche Logik
4. **DB-Trigger** `public.auftraege_autogen_az()` (von Web-Claude per Migration `mega82_hotfix_auftraege_az_autogen` appliziert) füllt `NEW.az` kollisionsfrei mit `<PREFIX>-<JAHR>-<LFD-NR>` Format
5. **`.select('id, az')`** liefert generierten AZ zurück → UI zeigt im Toast

### Acceptance verifiziert

| AT | Status |
|---|---|
| AT-1 Leerer az-Insert → DB generiert SCH-2026-XXX → kein 409 | ✅ |
| AT-2 UI zeigt generierten AZ via data.az nach Insert | ✅ |
| AT-3 Backwards-Compat: User-eingegebener AZ wird respektiert | ✅ |
| AT-4 Zwei schaden-Inserts hintereinander → unique Lfd-Nr | ✅ via Trigger-Logic |

---

## Phase H1 + H2 — Dashboard-Redesign Mission-Control Clean ✅

### Strategie

H1.1, H1.2, H1.3 alle durch **Komplett-Replacement** des Dashboards behoben (statt einzelne Bug-Fixes auf der alten 13-Sektionen-Struktur). Marcel-Direktive: "Von 13 Sektionen auf 5".

### Bug-Behebung durch Replacement

| Bug | Behebung |
|---|---|
| H1.1 T-NaN in ANSTEHENDE FRISTEN | Workflow-Übersicht-Sektion komplett entfernt (war ProvaDashboardWidgets.widgetFaelligeFristen Source) |
| H1.2 "Noch kein Fall angelegt" Empty-State Bug | "Was steht an?"-Sektion komplett entfernt — Heute-Hero übernimmt |
| H1.3 Dritte Fristen-Box rechts unten | Rechte Spalte (Schnellzugriff + Fristen) komplett entfernt — Dashboard ist jetzt 1-spaltig |

### 5 neue Sektionen (FINAL)

**Sektion 1 — Header + Status-Zeile:**
- Tageszeit-Gruss („Guten Morgen/Tag/Abend") + Vorname aus user-metadata
- Status-Line dynamisch: `X Benachrichtigungen · Y Frist heute · Z Mahnung offen` ODER `Alles erledigt. Schönen Tag!`
- CTA-Button „+ Neuer Fall" rechts oben (unverändert)

**Sektion 2 — Heute (Hero-Card):**
- Hintergrund: subtiler accent-Gradient
- Items: Fristen überfällig/heute (mit AZ-Verlinkung) + Termine heute + Notification-Count
- Reihenfolge: Frist überfällig > Frist heute > Termin heute > Notifications
- Max 5 sichtbar, „Alle X Aufgaben →" wenn mehr
- Empty: ☀️ „Keine Aufgaben für heute. Schöner Tag!"

**Sektion 3 — 4 KPI-Kacheln:**
- Aktive Fälle (`auftraege` count, klick → archiv.html)
- Mahnungen (`dokumente` typ=mahnung_*, status≠bezahlt, klick → mahnwesen.html)
- Offene Beträge in **EUR** (SUM(`dokumente.betrag_brutto`) wo typ=rechnung*, status IN (versendet/gelesen/ueberfaellig), bezahlt_at IS NULL)
- KI-Calls 30T (`ki_protokoll` count, klick → einstellungen#ki)
- Zahl-Schrift 30px bold, Label 12px muted
- 2x2 Grid auf Mobile

**WEG:**
- ❌ Kachel "Kontingent" (info-arm)
- ❌ Kachel "KI-Verbrauch %" mit 2FA-Pre-Check (Tech-noise)
- ❌ Kachel "Fristen diese Woche" (Heute-Hero macht's)

**Sektion 4 — Aktive Fälle:**
- `auftraege` WHERE status=aktiv, sortiert nach updated_at DESC, max 5
- Pro Zeile: AZ (Mono-Font, klein, accent) + kompakter Titel (Schadensart · Auftraggeber · **Ort, KEINE Straße/PLZ**) + 4-Segment-Progress-Bar + "Phase X/4"
- Phase-Anzeige nutzt **MEGA82 Helper `getAktePhasenForAuftrag()`** (4 Phasen Flow A/B, 3 Phasen Flow C/D) — Helper inline-Duplikat in dashboard.html (vermeidet akte-logic.js Side-Effects)
- Empty: „Noch keine Aufträge. [+ Ersten Fall anlegen]"

**Sektion 5 — Aktivität:**
- `audit_trail` WHERE user_id=current AND action NOT IN ('login','logout'), DESC, max 5
- **Kompakter Text-Format** (Marcel-Direktive):
  ```
  ❌ "Du hast am 27.04.2026 um 19:27 einen Eintrag (workspace) angelegt"
  ✅ "27.04. · Eintrag in Akte GS-2026-001 hinzugefügt"
  ```
- Zeit-Spalte: `vor X Min/Std` für heute, `gestern`, `DD.MM.` für älter
- Entity-Refs verlinkt: Aktennamen klickbar zu `/akte?id=...`
- Empty: „Noch keine Aktivität."

### Performance

- Alle 4 datenliefernden Sektionen (Heute, KPIs, Faelle, Activity) **parallel** via `Promise.all`
- Init wartet maximal 1s (20×50ms) auf `getAktePhasenForAuftrag` Helper, dann renderDashboard
- Keine dauerhaften Skeleton-Loadings — Empty-States echt
- Pull-to-Refresh bindet jetzt auf `main-content` (nicht mehr `recent-list`)

---

## Phase H3 — sw + Doku ✅

- `sw.js` v3246 → **v3247-mega82-hotfix1-dashboard-clean** (3-Satz-Kommentar)
- `docs/SW-VERSION-HISTORY.md` ergänzt
- `docs/MEGA82-HOTFIX-1-DECISIONS.md` (dieses File)
- `docs/MEGA82-HOTFIX-1-MARCEL-CHECKLIST.md` mit Smoke-Test-Punkten

---

## Was wegfällt

| Element vom alten Dashboard | Schicksal |
|---|---|
| `<h1>` „Willkommen 👋" | Ersetzt durch Tageszeit-Gruss |
| `kpi-row` mit 5 Kacheln | Ersetzt durch 4 saubere KPI-Kacheln |
| `prova-dashboard-widgets-grid` (6 Widgets inkl. „Heute") | Heute-Hero standalone, andere Widgets weg |
| `aufgaben-feed` Skeleton + Empty-State-Bug | Komplett raus |
| Rechte Spalte: „Fristen heute" Box | Raus (dritte Anzeige) |
| Rechte Spalte: „Schnellzugriff" Box | Raus (Sidebar hat alle Links) |
| `dashboard-logic.js` Script-Tag | Entfernt (alte Airtable-Logic) |

---

## Files geändert

| File | Status |
|---|---|
| `app-logic.js` | H0 AZ-Fix |
| `dashboard.html` | H1+H2 Komplett-Refactor (-102 alt, +493 neu) |
| `sw.js` | v3246 → v3247 |
| `docs/SW-VERSION-HISTORY.md` | Hotfix-1-Block |
| `docs/MEGA82-HOTFIX-1-DECISIONS.md` | NEU |
| `docs/MEGA82-HOTFIX-1-MARCEL-CHECKLIST.md` | NEU |

---

## DEFER MEGA83 (Pflicht für Pilot-Launch)

| Item | Begründung |
|---|---|
| Akte-UI-Refactor B.2-B.9 | aus MEGA82 — Layout-Komplett-Refactor in akte.html mit Stepper + Sidebar + Sticky-Footer + Freigabe-Wizard |
| Login Cross-Domain (F.1) | Cookie-Domain-Migration mit Test-Pfad |
| Edge-Reaping CLI-Apply | Marcel führt 6 sichere `supabase functions delete` aus (Liste in `docs/MEGA82-EDGE-REAPING.md`) |
| LG-Disclosure auf 9 PDF-Templates (D.5) | Liquid-Pattern in `docs/AUDIT-PDF-DISCLOSURE.md` — Marcel patcht F-04/F-09/F-15 als Hotfix vor Pilot |
| Backend §§-Notation (A.4) | Test-Assertion-Sensitiv |

---

## Marcel-Apply-Pfad

1. **Browser-Smoke-Test** (12 Punkte in `docs/MEGA82-HOTFIX-1-MARCEL-CHECKLIST.md`)
2. **PR mergen** in main
3. **Tag setzen** v3247
4. **Pilot-Pre-Flight:** optional die 3 wichtigsten PDF-Templates mit Disclosure-Box patchen
