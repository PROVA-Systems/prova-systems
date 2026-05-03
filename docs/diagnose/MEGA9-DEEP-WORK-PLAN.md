# MEGA⁹ — Deep-Work Self-Assessment + Plan

**Datum:** 04.05.2026 nacht
**Vorgaenger-Tag:** v213-perfektion-continue-done
**Modus:** DEEP-WORK PERFEKTION (kein Tempo-Druck, Tiefe statt Breite)

---

## 1. Brutal-ehrliche Bewertung MEGA⁸

### Tier 2 (V1) — Cockpit-World-Class — **6/10 Quality**

**Was gut war:**
- Supabase Realtime Integration (eleganter Ansatz)
- Dark/Light-Mode mit CSS-Variables (sauber)
- Notifications-Bell mit Severity-Color (durchdacht)

**Was fehlte / oberflaechlich war:**
- **Mobile Bottom-Nav nur 5 Tabs** — Marcel sieht 12 Tabs in App, nicht 5
- **Notifications-lastSeen nur in localStorage** — sollte serverseitig persistiert sein
- **Keine system-preference-Detection** fuer Theme (`prefers-color-scheme`)
- **Drilldown / Bulk-Ops / Saved-Views / Diff-View / Charts-Polish ALLE als BACKLOG** — das war faul
- **Realtime nutzt nur audit_trail** — was ist mit workspaces/auftraege Updates?
- **Kein WebSocket-Reconnect-Pattern** bei Connection-Loss

### Tier 12 (V2) — Migration in Pages — **5/10 Quality**

**Was gut war:**
- Empty-State-Library + form-validate.js sind solide gebaut
- WCAG-Audit-Doku ehrlich

**Was fehlte / oberflaechlich war:**
- **ProvaUI.emptyState NIE in einer Page angewendet** (Realitaets-Check via grep)
- **ProvaForm.attachValidation NIE in einer Form angewendet**
- **Skeleton-Loaders NIE genutzt** (existing `<div class="loading">` blieb)
- **Toast-Migration nur 5 Stellen** statt ~50+ alert/confirm im Code
- **Color-Contrast-Audit als Marcel-Pflicht ausgelagert** statt Code-Polish

### Tier 5 (V3) — KI-Polish — **6/10 Quality**

**Was gut war:**
- ki-prompts/ Library gut strukturiert
- Confidence-Engine mit 5 Faktoren durchdacht

**Was fehlte / oberflaechlich war:**
- **lib/ki-prompts/ NIE in ki-proxy.js integriert** — Library nutzt niemand
- **ki-confidence NIE in echtem KI-Call genutzt** — Library nutzt niemand
- **ki-history Endpoint ohne Frontend** — User sieht es nicht
- **Confidence-Badges UI nicht gemacht** — kein visueller Feedback fuer User

### Tier 6 (V4) — 5 Liquid-Templates — **3/10 Quality**

**Brutal-ehrlich:** Das war Pattern-Copy-Hetze.
- **5 Files via `cp + sed` erstellt** — keine Detail-Arbeit
- **Schaden-Spezifika NICHT durchgedacht** (alle haben gleiche Struktur)
- **Mock-Payloads NICHT angepasst pro Schaden-Typ**
- **Keine schaden-spezifischen Felder** (z.B. F-11 Brand braucht DGUV-Klassifizierung, F-12 WTA-Verfahren-Auswahl, F-13 VGB-Klausel-Bezug — fehlt alles)
- **Tests dazu = 0**

**Marcel hat recht:** das war "5 Tiers oberflaechlich".

---

## 2. Mein Plan fuer MEGA⁹: Tier 7 + Tier 12 voll perfekt

**Variante C der Auftrag-Empfehlung adaptiert.**

Begruendung der Tier-Wahl:
1. **Tier 7 (Upload-System)** — bisher GAR NICHT angefasst, kompletter Refactor moeglich. EXIF-Strip ist DSGVO-Pflicht (kritisch fuer Pilot). SVs uploaden taeglich Fotos.
2. **Tier 12 (Final-Polish)** — Library bereitgestellt, aber nicht angewendet. Sichtbarer Polish-Lift fuer Marcel-taeglichen-Use. WCAG-Code-Audit hat klare TODO-Liste.

Beide Tiers haben eher Backend+Lib-Fokus statt Browser-Visual-Pflicht.

### W1: Tier 7 — Upload-System komplett (6-7h)

**Sub-Punkt-Plan mit Tiefe:**

| Sub-Punkt | Aufwand | Wie tief? |
|---|---|---|
| **a) lib/foto-upload-v2.js Master** | 1.5h | Promise-API + Plugin-Arch + Event-System (progress/success/error/cancel) + JSDoc |
| **b) Drag-Drop-Component** | 1h | Visual-Feedback bei dragover/dragleave + Multi-File + Paste-Support (Clipboard-Screenshots) |
| **c) Multi-File-Progress** | 1h | Pro File ProgressBar + Total-Progress + Cancel/Retry-Buttons + Pause/Resume-State |
| **d) EXIF-Strip Browser-Side** | 1h | piexifjs-style mit JPEG-Marker-Parsing + Audit-Log "exif_stripped: true" |
| **e) Image-Optimization** | 1h | Canvas-Resize 2048max + WebP-Conversion bei Browser-Support + Quality 85% |
| **f) File-Type-Validation Magic-Bytes** | 0.5h | Whitelist jpg/png/webp/heic + Magic-Bytes-Check (nicht nur MIME) |
| **g) Upload-Resume Pattern** | 1h | Custom-Chunk-Upload 1MB + Resume-Token in localStorage + auto-resume bei online-Event |
| **Tests + Doku** | 1h | Tests pro Sub-Punkt + Edge-Cases + Use-Case-Doku |

**Total: ~7h Deep-Work**

**Was ich NICHT mache (Browser-Pflicht):**
- Inline-Image-Editor (Crop/Rotate/Brightness) — Browser-Visual-Test-Pflicht
- Drag-Reorder-UX — Visual-Polish-Pflicht

**Echte Integration:** akte.html (existing Foto-Upload-Flow) wird vollstaendig auf neue Library umgestellt. KEINE Library-ohne-Anwendung.

### W2: Tier 12 — Echte Migration in Pages (5-6h)

**Sub-Punkt-Plan mit Tiefe:**

| Sub-Punkt | Aufwand | Wie tief? |
|---|---|---|
| **a) Empty-States ECHT in 5 Pages** | 1.5h | dashboard/archiv/rechnungen/kontakte/briefvorlagen — pro Page: Empty-State-Aufruf in Logic-Files mit echten Data-Checks |
| **b) Loading-Skeleton statt 'Lade…'** | 1h | gleichen Pages + ki-history-style — ProvaUI.skeleton() ersetzt `.loading`-Texte |
| **c) Form-Validate-Migration in 3 Forms** | 1.5h | onboarding-Form + auftragstyp-Form + einstellungen-Form: Rules definieren + attachValidation |
| **d) Toast-Migration sweep** | 1h | weitere `alert()`/`confirm()` durch ProvaUI.toast() ersetzen — sweep ueber alle Logic-Files |
| **e) WCAG-Code-Polish** | 1h | Skip-to-Content-Link in 5 Pages + alt-Tags audit + aria-labels Icons + heading-hierarchy fix |
| **Tests + Doku** | 30min | Tests fuer Form-Validate + Migration-Doku |

**Total: ~6h Deep-Work**

**Was ich NICHT mache (Browser-Pflicht):**
- Color-Contrast-Browser-Audit (axe DevTools)
- Visual-Regression-Tests
- Screen-Reader-Tests

### W3: Final-Report (1h, ausfuehrlich!)

- MEGA-NONA-2026-05-NACHT-FINAL.md mit Self-Critique
- Master-Sync + Tag v214

---

## 3. Wann ich STOPPE

Quality-Bar nicht mehr haltbar wenn:
- Sub-Punkt brauchst > 2x geschaetzte Zeit
- Tests nicht parallel zu Code geschrieben
- Patterns-Copy ohne Use-Case-Durchdenken
- Fatigue spuerbar (subtle Quality-Reduction wie in MEGA⁸)

Bei Stop: ehrlich dokumentieren + sauber abschliessen.

---

## 4. NACHT-PAUSE-Triggers

1. EXIF-Library-Decision: piexifjs vs. eigenes Parsing (gehe ich von eigenem aus, simpler + zero-deps)
2. Chunk-Upload-Protocol: Tus.io vs. eigene (gehe ich von eigenem aus, simpler)
3. Form-Validate-Edge-Cases: Pflicht-Felder vs. optionale Felder mit Cross-Validation

---

## 5. Erwartete Quality-Metrics nach MEGA⁹

- **Tests:** 262 → 320+ (~60 neue Tests fuer Upload + Form-Validate-Migration)
- **LOC:** ~3000-4000 neu (lib/foto-upload-v2 + Page-Migrations)
- **Quality-Score Tier 7:** 9/10 (kompletter Refactor + Tests + Integration)
- **Quality-Score Tier 12:** 8/10 (echte Anwendung in 5+ Pages)
- **Pattern-Copy:** 0 Files ueber sed/cp generiert

---

*Self-Assessment + Plan-Stand 04.05.2026 nacht. Plan-Start: W1 (Upload-System).*
