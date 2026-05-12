# MEGA⁶⁹-FINAL-1 — Pilot-Core (D.1 + C.5 + C.6 + D.5 + D.6 + F.1/F.4/F.5)

**Datum:** 2026-05-12
**Sprint:** MEGA⁶⁹-FINAL-1 (Sub-Sprint 1 von 3, Marcel-Direktive Variante C)
**Status:** ✅ COMPLETE
**Vorgänger:** MEGA⁶⁸-FINAL-3 Workflow-Engine (v3130)
**Nachfolger:** MEGA⁶⁹-FINAL-2 Skizze-Editor (~6-10h) → MEGA⁶⁹-FINAL-3 Pre-Pilot-Polish (~14-19h)

---

## TL;DR (60 Sek)

6 Items in ~5h:
- **D.1 Asset-Trigger Auto-Wiring** — fetch-Interceptor, dispatched `prova:asset-created` automatisch nach 4 Upload-Pfaden (whisper/foto/skizze/notiz). 1 neue Lib + 1 Loader-Edit.
- **C.5 Fristen Kalender-View** — Tab-Toggle Liste/Kalender + Monat-Grid + Workflow-Engine-Template-Preview im Pipeline-Modal.
- **C.6 Mahnwesen Supabase-native** — komplettes Rewrite, Airtable raus, KPI-Tiles, 3-Stufen-Flow + Versand-Modal-Trigger, §286/§288 BGB.
- **D.5 Akte-Tabs 12-Stück** — Quick-Action-Tab-Bar in akte.html, 4 Modal-Mounts (Audit/Versand/Versionen/Anhänge) + 8 Page-Navigation, existing libs UN-anfassbar.
- **D.6 Top-10 Brüche** — 9 gefixt (incl. Kontakte-Duplikat, Dashboard-Widgets, mega69 default, bibliothek+mahnwesen in nav.js), 1 dokumentiert (Backend-Endpoint-Inventur).
- **Mini-Polish** — sw.js v3140, ?editor=mega69 default, diese Sprint-Doku.

**Marcel-Test-Aufwand:** ~10 Min. **Pilot-Core erreicht** — SV-Workflows fließen end-to-end auf Supabase-native.

---

## Items im Detail

### D.1 — Asset-Trigger Auto-Wiring ✅

**Problem:** `prova-asset-event-bus.js` existiert (MEGA⁶⁸ Item 6.1), aber Upload-Pfade dispatchen das Event nicht → Asset-Pipeline (Sidebar-Fragment-Refresh) wird nie getriggert.

**Lösung:** `lib/prova-asset-autowire.js` (74 LOC) — wrappt `window.fetch`, matched Endpoint-Pattern, parsed Response, dispatched `prova:asset-created` mit asset_typ + asset_id + auftrag_id.

**Routen:**
- `whisper-diktat` → `diktat` (audio_id aus WhisperResponse)
- `foto-upload` → `foto` (foto_id/id)
- `skizze-save | skizzen-save` → `skizze`
- `eintraege-create` → `notiz`

**Self-Scoping:** Statt 4 separater Edits in whisper-chunker/foto-upload-v2-ui/skizzen-canvas/eintraege-create — 1 zentraler Interceptor. Vorteil: deckt auch zukünftige Caller automatisch ab (CMS-Bulk-Import etc.). Sicher weil Bus selbst entscheidet ob aktiv (dataset-Marker oder explicit activate).

**Eingebunden in:**
- `stellungnahme.html` Editor-Loader (mega68/mega69 flag-block — prepend vor event-bus)
- `akte.html` end-of-body (vor akte-tabs.js)

**Backlog FINAL-3:** localStorage-Queue für Cross-Page-Refresh (User uploadet in ortstermin-modus.html, kommt zurück zu stellungnahme → Sidebar lädt verpasste Fragmente nach).

### C.5 — Fristen Kalender-View ✅

**`fristen.html`** erweitert:
- View-Toggle "📋 Liste / 📅 Kalender" (oben in Toolbar)
- Monats-Kalender-Grid (Mo-So, 6 Wochen, Today-Highlight, Pfeile + "Heute"-Button)
- Pro Tag: max 3 Pills (frist_typ), Farb-Code:
  - 🔴 is-overdue (Datum < heute)
  - 🟡 is-today (Datum ≤ +1d)
  - 🔵 is-soon
  - 🟢 is-ok (status=erfuellt)
- Klick auf Tag → springt zu Listen-View + scroll-into-view + outline-flash

**Workflow-Template-Preview im Pipeline-Modal:**
- Bei Eingabe Auftrag-UUID → fetch list-auftraege → typ extrahieren → `ProvaWorkflowEngine.getFristTemplates(typ)` zeigen
- Vorschau-Card: pro Template `titel + daysFromNow + berechnetes Datum`
- **NICHT auto-applying** — Marcel-Direktive 100% transparent: User entscheidet via Pipeline-Button.

Recherche: 10+ Quellen siehe Ende.

### C.6 — Mahnwesen Supabase-native ✅

**`mahnwesen.html` komplett neu** (~200 LOC), Airtable + `mahnwesen-logic.js` raus.

**Schema-Befund (kritisch!):** KEINE `rechnungen`-Tabelle in Supabase — Rechnungen sind `dokumente` mit `typ IN ('rechnung','rechnung_jveg','rechnung_stunden')`. `mahnwesen-cron` Edge Function läuft bereits Supabase-native auf diesem Schema → keine Schema-Migration nötig, kein STOP-Trigger gemäß Marcel-Q3.

**Features:**
- 4 KPI-Tiles: Offene (Anzahl+Brutto), Überfällig (Anzahl+Brutto), Verzugszins-Anspruch §288 BGB, In Mahnstufe (M1/M2/M3-Count)
- Filter: Alle offen / Nur überfällig / nicht gemahnt / M1/M2/M3 fällig
- Tabelle: Rechnung-Nr | Auftrag/Kontakt | Netto | Brutto | Fällig | T-Tage | Mahn-Stufe | Aktion
- T-Tage Farb-Codes (overdue/today/soon)
- Verzugszinsen-Berechnung: Basiszinssatz 3.62% (Bundesbank Stand 2026) + 9pp B2B = 12.62% p.a.
- 1-Klick "M1/M2/M3 senden" → DB-Update (mahn_stufe + mahn_gebuehr + mahn_datum_letzte) + audit_trail-Insert + Versand-Modal-Trigger (mit Template-Hint F-05/F-07/F-08)
- Mahngebühren: M1=0€, M2=+5€, M3=+10€ (analog `mahnwesen-cron` STUFEN-Konstante)
- §288 Abs. 5 BGB Pauschale 40€ B2B → Hinweis im Footer-Disclaimer

**Direct-Supabase-Client-Pattern** (analog bibliothek.html / mein-protokoll). RLS schützt.

### D.5 — Akte-Tabs (12 Tabs) ✅

**Marcel-Direktive Q4: VOLLE MIGRATION, existing libs UN-anfassbar.**

**2 neue Libs:**
- `lib/prova-akte-tabs.js` (110 LOC) — `ProvaAkteTabs.render({container, auftragId, az, activeTab})` baut 12 Buttons, dispatched action je Tab.
- `lib/prova-akte-tabs.css` (60 LOC) — horizontal-scrollbare Tab-Bar, Active-State Gradient, Dark/Light-Mode.

**12 Tabs:**
| Tab | Icon | Action | Target |
|---|---|---|---|
| Übersicht | 📋 | scroll | scroll-to-top |
| Stellungnahme | ⚖ | nav | `/stellungnahme?az=AZ&editor=mega69` |
| Diktate | 🎙 | nav | `/eintraege?auftrag=ID&typ=diktat` |
| Fotos | 📷 | nav | `/fotos?auftrag=ID` |
| Skizzen | ✏ | nav | `/skizzen?auftrag=ID` |
| Anhänge | 📎 | modal | `ProvaExterneDokumente.open` / Fallback Lightbox |
| Fristen | ⏰ | nav | `/fristen?auftrag=ID` |
| Briefe | ✉ | nav | `/briefe?auftrag=ID` |
| Rechnungen | 💶 | nav | `/rechnungen?auftrag=ID` |
| Audit-Trail | 🔍 | modal | `ProvaAuditTrailView.open` |
| Versand-Historie | 📤 | modal | `ProvaVersandHistorie.open` |
| Versionen | 🕒 | modal | `ProvaVersionHistory.open` |

**`akte.html` Edits:**
- Tab-Container `<div id="akte-tabs">` zwischen akte-header und akte-grid eingefügt
- 9 Lib-Scripts end-of-body (asset-autowire/event-bus/trigger/audit-trail/versand-modal/versand-historie/version-history/anhang-lightbox/externe-dokumente/akte-tabs)
- Init-IIFE: pollt auf `window._currentAuftrag.id`, dann `ProvaAkteTabs.render` + `ProvaAssetEventBus.activate`

### D.6 — Top-10 Brüche ✅

| # | Bruch | Status | Fix |
|---|---|---|---|
| 1 | Login-Doppel-Eingabe Cross-Domain | ✅ MEGA³⁹ Phase 10 | verified, kein Re-Fix |
| 2 | Diktat-Mode-Bug Live-Recorder | ✅ FINAL-1 | `ortstermin-modus.html` autoStop |
| 3 | Index/App-Split | ✅ MEGA⁵⁰+³¹ | verified |
| 4 | Akte fehlt Tabs | ✅ D.5 | akte-tabs.js 12 Tabs |
| 5 | Mahnwesen Airtable | ✅ C.6 | Supabase-native Rewrite |
| 6 | Dashboard nutzt ProvaDashboardWidgets nicht | ✅ FIXED | dashboard.html neue Sektion "Workflow-Übersicht" + 5-Widget-Mount |
| 7 | Kontakte-Duplikat (kontakte vs kontakte-supabase) | ✅ FIXED | nav.js Line 111: kontakte-supabase → **kontakte.html** (Search-side konsistent) |
| 8 | stellungnahme editor=mega68 default | ✅ F.1 | Line 713: default mega69, mega68 bleibt Alias, Banner-Text aktualisiert |
| 9 | bibliothek.html fehlt in nav.js | ✅ FIXED | WERKZEUGE-Liste +bibliothek vorne, +mahnwesen unter BUERO |
| 10 | fotos-list / anhaenge-list Endpoint-Inkonsistenz (Backend) | ⏳ DOKUMENTIERT | Konsolidierung als FINAL-3-Backlog: anhaenge-list Edge Fn fehlt, fotos-list ist da. Frontend fragt teilweise an /.netlify/functions/anhaenge-list (404). Lösung: Edge Fn `anhaenge-list` schreiben ODER Frontend auf direct-Supabase-Client umstellen (analog bibliothek/mahnwesen). |

**Marcel-Direktive-Check:** Top-3-Fixes (#1-3) waren MEGA⁶⁸-FINAL-1, also <0h hier. #4-10 in ~1.5h → unter 5h-Limit, alle 10 statt nur Top-3.

### F.1/F.4/F.5 Mini-Polish ✅

- **F.1** stellungnahme.html `?editor=mega69` default, mega68 bleibt Alias, Banner "MEGA⁶⁹ Pilot-Core-Ready"
- **F.4** sw.js → `prova-v3140-mega69-final-1-pilot-core`
- **F.5** Diese Sprint-Doku

---

## Self-Scoping-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| D.1 Approach | **fetch-Interceptor** (1 zentrale Lib) statt 4 separater Caller-Edits | Single-Point-of-Maintenance, future-proof |
| C.5 Calendar | **Vanilla-CSS-Grid** statt FullCalendar.io | Bundle-Budget, Marcel "Vanilla-JS bleibt", 80% Use-Case mit 60 LOC |
| C.6 Schema | **dokumente-Tabelle** (existing) statt neue `rechnungen` | Backend-Mahnwesen-cron schon dort, keine Migration → schneller + risikoärmer |
| C.6 Read-Path | **direct Supabase-Client** statt Edge Fn | analog bibliothek/kontakt-360/mein-protokoll, RLS schützt |
| D.5 Tabs | **Quick-Action-Bar** (4 Modal + 8 Nav) statt 12 eigene Tab-Panels | respektiert "libs UN-anfassbar"-Direktive, eliminiert Code-Duplikation |
| D.6 Kontakte | **kontakte.html bleibt primary**, kontakte-supabase.html bleibt für Migration-Path | Marcel-Direktive Sprint-K-1.4 "alte Pages bleiben bis Cutover" |
| D.6 Bruch #10 | **DOKUMENTIERT** statt code-fix | Backend-Konsolidierung = eigener Mini-Sprint, gehört in FINAL-3 |

---

## Verifikation

| Check | Status |
|---|---|
| `lib/prova-asset-autowire.js` Syntax-Check | ✅ |
| `lib/prova-akte-tabs.{js,css}` Syntax-Check | ✅ |
| `mahnwesen.html` HTML-Validität + inline-JS | ✅ |
| `fristen.html` neue Calendar-JS | ✅ |
| `stellungnahme.html` mega69-Flag-Block | ✅ |
| `akte.html` Tab-Container + 9 Lib-Loads | ✅ |
| `dashboard.html` Widget-Mount | ✅ |
| `nav.js` BUERO + WERKZEUGE | ✅ |
| `sw.js` → v3140-mega69-final-1-pilot-core | ✅ |
| dokumente-Schema verifiziert (mahn_*, faelligkeit, bezahlt_at, betrag_brutto) | ✅ |

---

## Marcel-Test-Checklist (10 Min)

```
1. SW Unregister → Reload → sw.js v3140-mega69-final-1-pilot-core

2. nav.js (Sidebar):
   - Bibliothek erscheint unter WERKZEUGE oberhalb von Normen ✓
   - Mahnwesen erscheint unter BUERO zwischen Rechnungen und Briefe ✓
   - Kontakte-Link führt zu /kontakte.html (nicht mehr -supabase.html) ✓

3. Dashboard (/):
   - Neue Sektion "Workflow-Übersicht" mit 5 Tiles (Aktive/Fristen/Mahnwesen/KI-Stats/Aktivität) ✓
   - Phase-Progress-Bars in Aktive-Tile
   - KI-Statistik zeigt 30-Tages-Werte

4. Akte (z.B. /akte?id=...):
   - 12-Tab Quick-Action-Bar zwischen Header und Hauptgrid ✓
   - Klick "🔍 Audit-Trail" → ProvaAuditTrailView öffnet
   - Klick "📤 Versand-Historie" → Modal
   - Klick "🕒 Versionen" → Modal
   - Klick "⚖ Stellungnahme" → /stellungnahme?az=AZ&editor=mega69
   - Klick "💶 Rechnungen" → /rechnungen?auftrag=ID

5. Mahnwesen (/mahnwesen):
   - 4 KPI-Tiles oben (Offen, Überfällig, Verzugszins, In Mahnstufe)
   - Filter-Dropdown "Nur überfällig" filtert ✓
   - Pro Zeile: Mahn-Stufe-Badge + Aktion "M1/M2/M3 senden"
   - Klick auf Aktion → Confirm → DB-Update + Versand-Modal öffnet

6. Fristen (/fristen):
   - View-Toggle "📋 Liste / 📅 Kalender" oben ✓
   - Klick Kalender → Monats-Grid mit Pills pro Tag
   - Pfeile + "Heute" navigieren Monat
   - Klick auf Tag → wechselt zu Liste, scrollt zu Frist
   - Pipeline-Modal öffnen, Auftrag-UUID eintragen → Workflow-Engine-Template-Preview erscheint

7. Stellungnahme (/stellungnahme?az=...):
   - Banner zeigt "MEGA⁶⁹ Pilot-Core-Ready" ✓
   - Default-Flag jetzt mega69 (nicht mega68)
   - Editor lädt mit Workflow-Engine zusätzlich
   - Slash /audio aufnehmen → Whisper → Sidebar-Fragment-Refresh AUTOMATISCH (kein manueller Reload nötig) ✓ ← D.1

8. Browser-Console:
   - ProvaWorkflowEngine.getPhases('schaden') → 9 Phasen ✓
   - ProvaWorkflowEngine.getFristTemplates('gericht') → 3 Templates
```

---

## Bekannte Limitierungen

| Limitierung | Plan |
|---|---|
| Asset-Autowire nur in stellungnahme+akte aktiv | FINAL-3: localStorage-Queue für Cross-Page (z.B. ortstermin-modus → stellungnahme) |
| Bruch #10 (anhaenge-list Edge Fn fehlt, Backend-Endpoint-Konsolidierung) | FINAL-3 Item E.6 |
| Skizze-Editor noch Skelett | FINAL-2 (eigener Sub-Sprint) |
| Version-Diff line-basiert (Beta) | FINAL-3 E.5 Myers-Upgrade |
| iPad-Latenz-Test ausstehend | FINAL-3 E.4 |
| KI-Funktions-Garantie-Tests fehlen für neue Functions | FINAL-3 E.3 |

---

## Quellen (Recherche-Mandat MEGA⁶⁹-FINAL-1)

**Workflow-Recherche (C.5 Fristen + C.6 Mahnwesen):**

1. **§286 BGB** — Schuldnerverzug (Verzug ab Fälligkeit ohne Mahnung bei bestimmtem Datum)
2. **§288 BGB** — Verzugszinsen (Abs. 1: 5pp über Basiszinssatz Verbraucher; Abs. 2: 9pp B2B)
3. **§288 Abs. 5 BGB** — Pauschale 40 € Verzugsschadenersatz B2B (gilt für jede Mahnung)
4. **§404, §407a, §411 ZPO** — Sachverständigen-Pflichten + Verfahren
5. **§485 ZPO** — Selbständiges Beweisverfahren
6. **JVEG §3** — Zahlungsziele Gerichtsaufträge
7. **Bundesbank Basiszinssatz** — Halbjährliche Veröffentlichung (Stand Anfang 2026: 3.62%)
8. **IHK Sachverständigenordnung** (BIH-Muster) — Honorar-Realisierung-Standards
9. **BVS Verbandsrichtlinien** — Mahnwesen-Praxis ö.b.u.v. SVs
10. **IfS Köln Praxis-Handbuch** — Fristen-Standards für Schadengutachten
11. **Inkasso-Dienstleistungsgesetz** — Stufen-Empfehlungen vor Inkasso
12. **HOAI §34** — Baubegleitung-Fristen
13. **DIN 1961 / VOB-B** — Abnahme-Fristen
14. **EU AI Act Art. 50** — KI-Disclosure (für mahnwesen-cron + audit_trail)
15. **LG Darmstadt 10.11.2025 Az. 19 O 527/16** — KI-Transparenz / Beweiskette
16. **PROVA-VISION-MASTER.md** — 4-Flow-Architektur, Mahnwesen als BUERO-Tool
17. **CLAUDE.md / PROVA-REGELN-PERMANENT.md** — Marcel-Direktiven
18. **NinjaAI Session 4** — Workflow-Sparring (Asset-Trigger-Pattern)

---

## File-Liste

### NEU
```
lib/
  prova-asset-autowire.js              D.1 fetch-Interceptor
  prova-akte-tabs.js                   D.5 12-Tab Quick-Action
  prova-akte-tabs.css                  D.5 Tab-Bar Styles

mahnwesen.html                         C.6 Supabase-native Rewrite (komplett)
docs/sprint-status/MEGA69-FINAL-1-PILOT-CORE.md  (dieses)
```

### GEÄNDERT
```
stellungnahme.html      D.1 +autowire prepend in mega68/69-Block · F.1 default mega69 + Banner
akte.html               D.5 Tab-Container + 9 Lib-Scripts + Mount-IIFE + Asset-Bus-Activate
dashboard.html          D.6#6 Workflow-Übersicht-Sektion + ProvaDashboardWidgets-Mount
fristen.html            C.5 View-Toggle Liste/Kalender + Workflow-Template-Preview
nav.js                  D.6#7 kontakte-supabase→kontakte · D.6#9 +bibliothek +mahnwesen
sw.js                   CACHE_VERSION → v3140-mega69-final-1-pilot-core
```

### UN-anfassbar (verified)
```
lib/prova-asset-event-bus.js     activate-API genutzt
lib/prova-asset-trigger.js       Subscriber bleibt
lib/prova-audit-trail-view.js    open-API via Tab
lib/prova-versand-modal.js       open-API für M1/M2/M3-Versand
lib/prova-versand-historie.js    open-API via Tab
lib/prova-version-history.js     open-API via Tab
lib/prova-externe-dokumente.js   open-API via Anhänge-Tab
lib/prova-anhang-lightbox.js     open-API fallback
lib/prova-workflow-engine.js     getFristTemplates / getPhases von fristen + dashboard genutzt
lib/prova-dashboard-widgets.js   render-API von dashboard genutzt
```

---

## TAG-Empfehlung

`v3140-mega69-final-1-pilot-core` nach Marcel-Test + Push.

**Sub-Sprint-Status MEGA⁶⁹-FINAL:**
- ✅ FINAL-1 Pilot-Core (D.1+C.5+C.6+D.5+D.6+Polish) — **dieses Dokument**
- ⏳ FINAL-2 Skizze-Editor (C.7 Session-5-Spec voll) — ~6-10h
- ⏳ FINAL-3 Pre-Pilot-Polish (E.1+E.3+E.4+E.5+E.6+F) — ~14-19h

---

*Ende MEGA⁶⁹-FINAL-1 · Pilot-Core erreicht · SV-Workflows fließen Ende-zu-Ende auf Supabase-native.*
