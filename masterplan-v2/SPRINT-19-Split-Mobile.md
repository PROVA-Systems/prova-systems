# SPRINT 19 — APP-LANDING-SPLIT + Mobile-Rescue + Sidebar-Neustruktur

**Tag:** 20  |  **Aufwand:** 6-7h  |  **Phase:** E Admin, UX & Pre-Audit

---

## Ziel
Saubere Domain-Trennung (Landing/App/Admin). Mobile funktioniert auf iOS-Safari und Android-Chrome. **Neue Sidebar-Struktur** mit Aktivem-Fall-Anker + 4 semantischen Gruppen.

---

## Sprint-Start-Ritual
1. **Code-Check:** `netlify.toml`, `nav.js` (Sidebar-Code), `sw.js` Scope, `mobile.css`
2. **Datenfluss:** Welche Cookies cross-domain, was muss getrennt werden?
3. **Scope-Fix:** Split + Mobile + Sidebar. Keine neuen Features auf Landing (Marketing separat).

---

## Scope

### 1. Domain-Split (1,5h)
- `prova-systems.de` → Landing (Marketing, Pricing, Features, CTA zur App)
- `app.prova-systems.de` → SaaS-App
- `admin.prova-systems.de` → Cockpit (aus Sprint 18)
- Separate SW-Scopes (kein Cache-Bleed)
- Separate Cookies (Domain-scoped)
- Redirects: `prova-systems.de/dashboard.html` → 301 → `app.prova-systems.de/dashboard.html`
- Legal-Seiten (Impressum, Datenschutz, AGB, AVV) bleiben auf Haupt-Domain

### 2. Landing-Page-Struktur (1h)
- Header: Logo + Nav (Features, Pricing, Blog, Kontakt)
- Hero: Value-Prop + CTA "Zur App →"
- Pricing: Solo 149€ / Team 279€
- Features-Sektion
- FAQ
- Footer: Legal-Links
- **Kein direkter Login auf Landing**
- Warteliste-Modus togglebar via ENV
- Copy bleibt (Marketing-Sprint separat)

### 3. Neue Sidebar-Struktur (1,5-2h)

**4-Gruppen-Struktur ersetzt die bisherige Täglich/Werkzeuge/Weitere-Funktionen:**

```
┌────────────────────────────────────────────┐
│  PROVA · Solo                              │
│                                            │
│  [ + Fall aufmachen ]                      │
│                                            │
│  ── Aktiver Fall (nur wenn einer offen) ──│
│  ● SCH-2026-031                            │
│    Gennerstr. 33 · Phase 2                 │
│    (roter Punkt wenn Frist < 7 Tage)       │
│                                            │
│  ── ARBEIT ─────                           │
│  Zentrale                                  │
│  Meine Fälle                               │
│  Kalender                                  │
│                                            │
│  ── WERKZEUGE ─────                        │
│  Normen                                    │
│  Textbausteine                             │
│  JVEG-Rechner                              │
│  Positionen & Preise                       │
│  Bescheinigungen                           │
│                                            │
│  ── DOKUMENTE ─────                        │
│  Rechnungen                                │
│  Briefe & Vorlagen                         │
│  Mahnwesen                                 │
│                                            │
│  ── BÜRO ─────                             │
│  Kontakte                                  │
│  Daten importieren                         │
│  Jahresbericht                             │
│                                            │
│  ⚙️ Einstellungen                          │
│  ❓ Hilfe                                   │
│  🚪 Abmelden                               │
└────────────────────────────────────────────┘
```

**Migration aus alter Struktur:**
- "Täglich" → aufgeteilt in ARBEIT + Aktiver-Fall-Anker oben
- "Werkzeuge" → ARBEIT (nur Top-Level-Nav) und WERKZEUGE (Helper-Tools)
- "Weitere Funktionen" → DOKUMENTE + BÜRO
- Permanent-Footer bleibt (Einstellungen, Hilfe, Abmelden)
- **Aktiver-Fall-Anker:** zeigt den zuletzt bearbeiteten Fall mit Phase + Indikator

**Implementierung in `nav.js`:**
- Neue Konstante `SIDEBAR_GROUPS` mit 4 Gruppen
- Active-State basiert auf Route
- Aktiver-Fall-Anker wird aus localStorage + /whoami-API gefüttert

### 4. Mobile-Rescue P1-4 (2-3h)

**P1 — Touch-Targets**
- Alles Interaktive min. 44×44 px
- nav.js Menü-Button mobile vergrößern
- Icon-Buttons in Tables: Padding erhöhen

**P2 — Sidebar-Resize-Bug**
- nav.js:479-488: ResizeObserver statt nur load-Event
- Bei 768-1100px: Sidebar auto-collapse
- Test: Fenster langsam ziehen → keine Darstellungsfehler

**P3 — iOS-Safari-Quirks**
- CSS-Variable `--vh` dynamisch setzen
- Input `font-size: 16px` (Zoom-Prevention)
- Bottom-Nav padding: `env(safe-area-inset-bottom)`
- `-webkit-overflow-scrolling: touch` auf Scroll-Containern

**P4 — PWA-Optimierung**
- `manifest.json` erweitern: share_target für Fotos
- Add-to-Homescreen-Prompt nach 3. Besuch (beforeinstallprompt)
- Offline-Indicator
- Service-Worker: Network-First für API, Cache-First für Assets

---

## Prompt für Claude Code

```
PROVA Sprint 19 — Split + Mobile + Sidebar-Neustruktur (Tag 20)

Pflicht-Lektuere: CLAUDE.md, netlify.toml, nav.js (ab Zeile 479), sw.js,
MOBILE-RESCUE-MASTERPLAN.md, mobile.css, UI-DIAGNOSE-AKUT.md

KONTEXT
=======
Domain-Split prova-systems.de (Landing) / app.prova-systems.de (SaaS) / 
admin.prova-systems.de (Cockpit aus Sprint 18).
Neue Sidebar: 4 Gruppen ARBEIT / WERKZEUGE / DOKUMENTE / BÜRO mit Aktiver-Fall-Anker.
Mobile fuer iOS-Safari + Android-Chrome + Tablet.

SCOPE
=====

Commit 1: DNS + Netlify Subdomain-Config
- app.prova-systems.de Setup
- netlify.toml Redirects alle App-Seiten (dashboard, akte, einstellungen, etc.)
- Legal-Seiten bleiben auf Haupt-Domain

Commit 2: prova-systems.de/index.html Landing
- Header, Hero, Pricing, Features, FAQ, Footer
- CTA "Zur App →" linkt zu app.prova-systems.de
- Warteliste-Modus togglebar via ENV

Commit 3: Service-Worker-Trennung
- sw.js Landing: nur Static-Caching
- sw.js App: App-Shell wie bisher
- Separate CACHE_VERSION pro Domain

Commit 4: Cookie-Scope strikt
- prova_session Domain=app.prova-systems.de
- prova_admin_session Domain=admin.prova-systems.de
- Landing ohne Session-Cookies

Commit 5: Sidebar-Neustruktur nav.js
- Neue Konstante SIDEBAR_GROUPS mit 4 Gruppen
- Aktiver-Fall-Anker oben (dynamisch)
- Roter Punkt-Indikator bei Frist < 7 Tage
- Active-State nach Route
- Migration: alte Speicher-Werte mappen auf neue Struktur

Commit 6: Mobile P1 — Touch-Targets
- CSS-Audit alle Buttons/Links/Icons auf min 44x44
- Icon-Buttons in Tables: Padding erhoehen

Commit 7: Mobile P2 — Sidebar-Resize-Bug
- ResizeObserver statt load-Event
- Auto-Collapse bei 768-1100px bei Resize

Commit 8: Mobile P3 — iOS-Safari
- --vh dynamisch, Input-Zoom-Prevention, Safe-Area-Insets
- -webkit-overflow-scrolling

Commit 9: Mobile P4 — PWA
- manifest.json share_target
- Add-to-Homescreen-Prompt
- Offline-Indicator

Commit 10: Tests + sw.js bump
- Lighthouse Mobile Score > 85
- iPhone-Safari Test
- Tablet-Portrait 768-1100px Test

QUALITAET
=========
- Lighthouse-Mobile > 85
- Split-Redirect 301 funktioniert
- Keine Cookie-Cross-Domain
- Sidebar-Migration idempotent

TAG: v180-split-mobile-sidebar-done
```

---

## Acceptance
1. `app.prova-systems.de/dashboard.html` funktioniert mit Session
2. `prova-systems.de/dashboard.html` → 301 → app-subdomain
3. iPhone-Safari: alle Seiten ohne Zoom bedienbar
4. Tablet-Portrait 768-1100px: Sidebar sauber (Resize-Test ok)
5. Lighthouse-Mobile-Score > 85
6. PWA installierbar
7. **Neue Sidebar: Aktiver-Fall-Anker zeigt korrekten Fall**
8. **4-Gruppen-Navigation funktioniert**
9. Bestehende User: Sidebar-Migration ohne Datenverlust

## Rollback
`git reset --hard v180-auth-cockpit-done`

---

**Hinweis:** DNS-Propagation kann 1-4h dauern. Deploy abends, Marcel testet morgens.
