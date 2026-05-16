# MEGA⁸³ MARCEL-CHECKLIST — Akte-Mission-Control + Freigabe-Wizard + Auth-Bridge

**Stand:** 2026-05-16 · Branch: `feat/mega83-akte-mission-control`
**Voraussetzung:** Pull + Hard-Reload (Strg+F5) damit v3300 lädt.

---

## A. Smoke-Tests (12 Punkte)

### 1️⃣ Akte Mission-Control Layout

- Aktive Akte öffnen (z.B. SCH-2026-001)
- **Sichtbar:**
  1. Topbar mit AZ + Breadcrumb + Status-Badge + Buttons
  2. **Visueller Phase-Stepper** (4 Kreise Flow A/B, 3 Flow C/D) — done=grün-✓, active=blue-pulse, pending=grau
  3. **Stammdaten-Bar** kompakt (eine Zeile: AZ + Schadensart + Auftraggeber + Ort)
  4. Phase-Header "Phase X — Name" + Sub "Y Aufgaben für diese Phase"
  5. **Phase-Checklist** mit ✓/leeren Kreisen + Action-Links rechts
  6. Rechte Spalte: **Activity-Sidebar** mit 5 Sub-Blocks (Aktivität/Dokumente/Fristen/Termine/Mehr)
  7. Sticky-Footer unten ✅

### 2️⃣ Phase-Stepper klickbar (bidirektional)

- Klick auf bereits abgeschlossene Phase (.done) → **Modal öffnet sich** (statt Browser-confirm!)
- Modal mit ↩️-Icon, "Phase X nochmals öffnen?" + 2 Buttons
- "Phase X öffnen" klicken → DB persistiert + Stepper rendert neu
- Klick auf aktive (active) → no-op
- Klick auf zukünftige (pending) → Toast-Warning ✅

### 3️⃣ Stammdaten-Bar collapsible + Inline-Edit

- Click auf Stammdaten-Bar → Bar expandiert (animiert), 7-Felder-Grid sichtbar
- Click auf "Schadensart" → Cursor erscheint, Wert editierbar
- Wert ändern + Tab/Click-Out → "Gespeichert ✓"-Toast erscheint
- localStorage-Persist: nach Reload bleibt Bar-State (offen/zu) gespeichert ✅

### 4️⃣ Phase-Checklist Smart-Detection

- Akte mit Phase 2 (Termin) und einem angelegten Termin:
  - "Termin angelegt" ist **automatisch ✓** (smart-detected)
- Akte mit Phase 3 und vorhandenem Fachurteil:
  - "§ 6 Fachurteil eigenhändig" ist ✓
- Klick auf manuelles Item (z.B. "Vor-Ort-Termin durchgeführt"):
  - Toggle persistent in `auftraege.details.phase_checks` JSONB
- required-Items mit gelbem * markiert wenn noch nicht ✓ ✅

### 5️⃣ Activity-Sidebar zeigt Live-Daten

- Aktivität: max 5 audit_trail-Einträge mit relativer Zeit ("vor 12 Min")
- Dokumente: max 5 mit typ-Icons (💶 Rechnung, ✉️ Brief, 📄 Gutachten, 📑 Bescheinigung)
- Fristen: max 3, sortiert nach Datum, Color-Code rot<3T, orange<7T
- Termine: max 2, Datum+Uhrzeit+Ort
- Mehr-Drawer: 4 Sekundär-Aktionen ✅

### 6️⃣ Freigabe-Wizard Step 1

- In Akte: Sticky-Footer → "Phase abschließen →" oder Action-Button → öffnet `freigabe-wizard.html?id=...`
- Progress-Bar oben: Step 1 active, 2+3 pending
- 5 §407a-Checks gerendert mit ✓/!/× Icons
- Weiter-Button: aktiv wenn Fachurteil + Eigenleistung ≥ 500 Zeichen vorhanden ✅

### 7️⃣ Freigabe-Wizard Step 2

- "Weiter →" klicken → Step 2 active
- 3 Checkboxes, Weiter-Button disabled bis alle 3 ✓
- LG-Darmstadt-Warning-Box mit Beschluss-Hinweis sichtbar
- Datum (heute) + SV-Name aus user_metadata
- "Bestätigen + Weiter" → persistiert `auftraege.gutachtendatum` ✅

### 8️⃣ Freigabe-Wizard Step 3 (PDF + Versand)

- Step 3 aktiv → "📄 PDF erstellen" Button
- Klick → Loading-Status → "✓ PDF erstellt"
- Versand-Section + Rechnung-Section werden sichtbar
- "Auftrag abschließen ✓" → `auftraege.status='abgeschlossen'` + Redirect zu Akte ✅

### 9️⃣ Cross-Domain Auth ohne Doppel-Login

- Inkognito öffnen, auf `prova-systems.de/login` Marcel-Login
- F12 → Application → Cookies → `.prova-systems.de`:
  - `prova_auth_token` mit Domain `.prova-systems.de` sichtbar
  - `prova-auth-token` (Supabase) auch
- Im gleichen Tab: `app.prova-systems.de/dashboard` öffnen
- **Erwartung:** KEIN erneuter Login — direkt Dashboard ✅
- F12 → localStorage → `prova_auth_token`: hydrated aus Cookie

### 🔟 Logout räumt Bridge-Cookies

- Logout-Button klicken
- F12 → Cookies → `.prova-systems.de`: `prova_auth_token` weg
- Reload → Pre-Check redirected zu `/login` ✅

### 1️⃣1️⃣ sw v3300 lädt

- F12 → Application → Service Workers
- Active: `prova-v3300-mega83-akte-mission-control`
- Wenn alt: Clear-Storage + Hard-Reload

### 1️⃣2️⃣ Console sauber bei Akte-Load

- 3 verschiedene Akten öffnen
- F12 Console: keine kritischen Errors
- Speziell:
  - keine `getAktePhasenForAuftrag is not a function`
  - keine `renderActivitySidebar` Promise-Rejections
  - keine `Cannot read properties of null` von alten DOM-Elementen ✅

---

## B. Bei Fehlern

| Symptom | Lösung |
|---|---|
| Phase-Stepper unsichtbar | Hard-Reload (Cache), evtl. akte-logic.js prüfen ob `renderAktePhaseStepper` geladen |
| Stammdaten-Bar Inline-Edit speichert nicht | F12 Console nach `[saveStammdatenField]` Error |
| Activity-Sidebar leer obwohl Daten da | Multi-Entity-Query `.or()` Syntax-Fehler? Console |
| Doppel-Login bleibt | Cookies auf `.prova-systems.de` nicht gesetzt — `lib/prova-legacy-bridge.js` nicht im Head geladen? |
| Freigabe-Wizard "Auftrag nicht gefunden" | URL muss `?id=<uuid>` oder `?az=<az>` haben |
| PDF-Erstellung 500 | pdf-proxy Edge-Function-Logs prüfen |

---

## C. Edge-Reaping nach MEGA83-Merge (optional)

Siehe `docs/MEGA83-EDGE-REAPING-FINAL.md` — 6 sichere Functions können via CLI gelöscht werden:
```bash
supabase functions delete global-search global-search fristen-reminder-cron mahnwesen-cron migrate-normen-airtable migrate-textbausteine-airtable skizze-save --project-ref cngteblrbpwsyypexjrv
```

(Eigenständig ausführen je Function siehe Doku.)

---

## D. Nicht in MEGA83 enthalten (DEFER MEGA84)

| Item | Status |
|---|---|
| Activity-Sidebar Mobile als eigener Drawer | DEFER (aktuell als Sektion unter Main) |
| Bulk-Patch Bridge-Hydration restliche 80+ Pages | DEFER (sed-Script) |
| 5 Audit-Edges → 2 Edges Konsolidierung | DEFER (Compliance-Test-Pfad) |
| Foto-Pins JSONB | MEGA84 (Vor-Ort-UX) |
| KI-Vision-Captions | MEGA84 |
| Diktat-Chips Editor-Pattern | MEGA84 |

---

## E. Apply-Pfad

1. Pull `feat/mega83-akte-mission-control`
2. Hard-Reload App
3. 12-Punkte-Smoke-Test
4. Bei grün: PR mergen in main + Tag `v3300-mega83-akte-mission-control` setzen
5. Optional vor Pilot: Edge-Reaping CLI-Apply (6 Functions)
