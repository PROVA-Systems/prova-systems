# APP-LANDING-SPLIT — File-Inventory

**Datum:** 2026-04-30
**Sprint:** APP-LANDING-SPLIT (Phase 2 — Inventory)
**Branch:** `sprint-app-landing-split` (von `main`)
**Status:** READ-ONLY — kein File-Move, kein Merge. Inventory + Plan.

---

## 🎯 Ziel der Aufteilung

Domain-Architektur (Marcel-Direktive):

| Subdomain | Zweck | Beispiele |
|---|---|---|
| **prova-systems.de** | reine Marketing/Legal-Landing | `/`, `/preise`, `/impressum`, `/datenschutz` |
| **app.prova-systems.de** | SaaS-App (Login-protected) | `/login`, `/dashboard`, `/akte/...`, `/briefe` |
| **admin.prova-systems.de** | Founder/Admin-Cockpit | `/admin-dashboard`, `/admin-login` |

---

## 📊 Zahlen

| Kategorie | Anzahl | Notiz |
|---|---|---|
| **LANDING** | 5 | index + 4 Legal-Pages |
| **APP** | ~70 | Login-protected SaaS-Pages |
| **ADMIN** | 2 | admin-dashboard, admin-login |
| **SHARED** | 1 | 404.html (beide Subdomains) |
| **DEAD-CANDIDATE** | ~50 | Cluster 1+2+3 aus CUTOVER-PAGE-INVENTORY |
| **INFRA (non-HTML)** | 5 | netlify.toml, sw.js, manifest.json, robots.txt, sitemap.xml |
| **Total Root-HTML** | **129** | (aus `ls *.html`) |

> Cluster-Verweise beziehen sich auf `docs/sprint-status/CUTOVER-PAGE-INVENTORY.md`. Marcel-Reviews dort sind Voraussetzung für DEAD-Action.

---

## 🌐 LANDING (prova-systems.de — öffentlich)

| Page | Begründung | Action |
|---|---|---|
| **index.html** | "PROVA Landing Page — 2026 Edition" Marketing-Hero | **BLEIBT** auf prova-systems.de Root |
| **impressum.html** | §5 TMG Pflicht, von App + Landing Footer verlinkt | **BLEIBT** (LANDING-canonical) — App linkt cross-domain dorthin |
| **datenschutz.html** | Art. 13 DSGVO Pflicht, von App + Landing verlinkt | **BLEIBT** (LANDING-canonical) — App linkt cross-domain |
| **agb.html** | AGB öffentlich, Pre-Login-Sichtbarkeit Pflicht (§ 305 BGB) | **BLEIBT** (LANDING-canonical) |
| **avv.html** | AVV-Vertrag, von Pilot-SVs vor Vertragsabschluss einsehbar | **BLEIBT** (LANDING-canonical) |

**Legal-Strategie:** Legal-Pages bleiben am LANDING-Root (CLAUDE.md Regel 27 — 48+ Cross-References, NICHT in Subfolder verschieben). App-Footer auf `app.prova-systems.de` linkt absolut zu `https://prova-systems.de/impressum.html` etc. Kein Duplikat, kein Symlink — eine kanonische Quelle.

---

## 🔁 SHARED (beide Subdomains)

| Page | Begründung | Action |
|---|---|---|
| **404.html** | Generischer 404-Handler, beide Netlify-Sites brauchen das | **VERSCHIEBT als Kopie** — beide Subdomains servieren identisches 404 |

> Netlify hostet zwei separate Sites (eine pro Subdomain), beide brauchen ein eigenes 404. Daher: `404.html` bleibt im Repo am Root, beide Sites kopieren es beim Build. Alternative: zwei minimal-unterschiedliche 404 (App-404 = "Zurück zum Dashboard", Landing-404 = "Zurück zur Startseite") — Marcel-Entscheidung in Phase 3.

---

## 🚪 APP — Auth & Onboarding (app.prova-systems.de)

| Page | Begründung | Action |
|---|---|---|
| **auth-supabase.html** | Pure-Supabase-Login (GREEN), wird `/login` der App | **VERSCHIEBT** → app.prova-systems.de **+ Alias** `/login` |
| **app-register.html** | Registrierungs-Page (Hybrid YELLOW) | **VERSCHIEBT** → app.prova-systems.de/register |
| **onboarding-supabase.html** | Onboarding-Flow nach Register (GREEN) | **VERSCHIEBT** → app.prova-systems.de/onboarding |
| **onboarding-welcome.html** | Welcome-Step (Hybrid) | **VERSCHIEBT** → app.prova-systems.de |
| **onboarding-schnellstart.html** | Quickstart-Variante (Hybrid) | **VERSCHIEBT** → app.prova-systems.de |
| **onboarding.html** | Legacy-Onboarding (Hybrid) | **VERSCHIEBT** → app.prova-systems.de — DEAD-CANDIDATE wenn -supabase ersetzt |
| **app-login.html** | **Legacy Netlify-Identity Login (RED)** | **REDIRECT** 301: `prova-systems.de/app-login.html` → `app.prova-systems.de/login` + auf App selbst auf `/login` |
| **account-gesperrt.html** | Sperrung-Page nach Failed-Login (RED — NetlifyId) | **VERSCHIEBT + Migration** → app.prova-systems.de — niedrige Prio, RED-Migration nötig |

> **Kritisch:** `prova-systems.de/login` muss 301-Redirect auf `app.prova-systems.de/login` werden, damit alte Bookmarks/Mail-Links nicht brechen. Dito `/app`, `/register`, `/logout` (siehe netlify.toml v5.4 Zeilen 28-44).

---

## 📱 APP — Core (Sidebar / hochfrequent)

Pages aus nav.js + Tier A/B aus CUTOVER-PAGE-INVENTORY.

| Page | Status (Auth) | Begründung | Action |
|---|---|---|---|
| **dashboard.html** | YELLOW | Landing nach Login | **VERSCHIEBT** → app.prova-systems.de/dashboard |
| **akte.html** | YELLOW | Akten-Detail-Page (höchste Prio Cutover) | **VERSCHIEBT** → app.prova-systems.de/akte |
| **app.html** | YELLOW | Schadensgutachten-Wizard (häufigste Page) | **VERSCHIEBT** → app.prova-systems.de/app |
| **archiv.html** | YELLOW | Aufträge-Liste | **VERSCHIEBT** → app.prova-systems.de/archiv |
| **briefe.html** | GREEN | Brief-Generator (live K-UI) | **VERSCHIEBT** → app.prova-systems.de/briefe |
| **kontakte-supabase.html** | GREEN | Adressbuch (live K-UI) | **VERSCHIEBT** → app.prova-systems.de/kontakte |
| **profil-supabase.html** | GREEN | SV-Profil (live K-UI) | **VERSCHIEBT** → app.prova-systems.de/profil |
| **termine.html** | YELLOW | Kalender | **VERSCHIEBT** → app.prova-systems.de/termine |
| **rechnungen.html** | YELLOW | Rechnungen + Mahnungen | **VERSCHIEBT** → app.prova-systems.de/rechnungen |
| **einstellungen.html** | YELLOW | Workspace-Settings | **VERSCHIEBT** → app.prova-systems.de/einstellungen |
| **freigabe.html** | YELLOW | Freigabe-Workflow | **VERSCHIEBT** → app.prova-systems.de/freigabe |
| **stellungnahme.html** | YELLOW | §6 Fachurteil-Editor | **VERSCHIEBT** → app.prova-systems.de/stellungnahme |
| **gutachterliche-stellungnahme.html** | GREEN | live Pilot-Page | **VERSCHIEBT** → app.prova-systems.de |
| **hilfe.html** | YELLOW | In-App-Hilfe | **VERSCHIEBT** → app.prova-systems.de/hilfe |

**Flow B/C/D-Pages:**

| Page | Begründung | Action |
|---|---|---|
| **wertgutachten.html** | Flow B Wizard | **VERSCHIEBT** → app |
| **beratung.html** | Flow C Wizard | **VERSCHIEBT** → app |
| **baubegleitung.html** | Flow D Wizard | **VERSCHIEBT** → app |
| **ortstermin-modus.html** | Flow A Ortstermin-Modus | **VERSCHIEBT** → app |

**Werkzeuge:**

| Page | Begründung | Action |
|---|---|---|
| **jveg.html** | Honorar-Rechner | **VERSCHIEBT** → app |
| **normen.html** | Normen-Bibliothek | **VERSCHIEBT** → app |
| **textbausteine.html** | Textbaustein-Verwaltung | **VERSCHIEBT** → app |
| **positionen.html** | Preis-Positionen | **VERSCHIEBT** → app |
| **zpo-anzeige.html** | §407a Compliance-Anzeige | **VERSCHIEBT** → app |
| **jahresbericht.html** | Jahres-Statistik | **VERSCHIEBT** → app |
| **kostenermittlung.html** | Kosten-Tool aus Workflow | **VERSCHIEBT** → app |

**Sonstige App-Pages:**

| Page | Begründung | Action |
|---|---|---|
| **benachrichtigungen.html** | In-App-Notifications | **VERSCHIEBT** → app |
| **portal.html** | Abonnement verwalten (Stripe-Portal) | **VERSCHIEBT** → app |
| **statistiken.html** | App-Statistiken | **VERSCHIEBT** → app |
| **freigabe-queue.html** | Freigabe-Liste-View | **VERSCHIEBT** → app |
| **import-assistent.html** | Daten-Import (CSV/Excel) | **VERSCHIEBT** → app |
| **smtp-einrichtung.html** | SMTP-Konfiguration für Emails | **VERSCHIEBT** → app |

---

## 📋 APP — Workflow-Single-Pages (Cluster 4)

Cluster 4 aus CUTOVER-INVENTORY. Vermutlich live, nicht in Sidebar, aus Workflow heraus erreichbar. **Marcel-Review pro Page nötig** — bis dahin als APP klassifiziert.

| Page | Marcel-Status | Action |
|---|---|---|
| **auftrag-ablehnen.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **auftrag-ablehnung.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **abnahmeprotokoll-formal.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **akteneinsicht-antrag.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **anforderung-unterlagen-erweitert.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **begehungsprotokoll.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **datenschutz-einwilligung-gericht.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **ergaenzung.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **erechnung.html** | live? | VERSCHIEBT → app (Marcel-Review) — E-Rechnung-Flow |
| **erinnerungsschreiben.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **gericht-auftrag.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **gutachten-zusammenfassung.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **kuendigung-auftrag.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **ortsbesichtigung-protokoll-gericht.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **rechnungskorrektur.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **schiedsgutachten.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **schlussrechnung-aufstellung.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **sicherheitsbedenken.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **stellungnahme-gegengutachten.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **terminabsage.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **terminsbestaetigung.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **terminsverlegung-antrag.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **verguetungsanzeige.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **vollmacht-sv.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **vor-ort.html** | live? | VERSCHIEBT → app (Marcel-Review) — vermutlich Vorgänger ortstermin-modus |
| **widerspruch-gegengutachten.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **widerspruch-gutachten.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **zwischenbericht.html** | live? | VERSCHIEBT → app (Marcel-Review) |
| **integration-template.html** | dev/test | VERSCHIEBT → app oder LOESCHEN (Marcel-Review) |

---

## 👨‍💼 ADMIN (admin.prova-systems.de)

| Page | Begründung | Action |
|---|---|---|
| **admin-dashboard.html** | Founder-Cockpit, Pilot-Monitoring, Pricing | **VERSCHIEBT** → admin.prova-systems.de/dashboard |
| **admin-login.html** | Admin-Login (separat von User-Login) | **VERSCHIEBT** → admin.prova-systems.de/login |

> CLAUDE.md erwähnt admin.prova-systems.de explizit. Diese Pages haben eigene Auth-Schicht (Founder-only), gehören nicht in App-Domain.

---

## ⚙️ INFRA (non-HTML, plus Service-Files)

| File | Pfad | Action im Split |
|---|---|---|
| **netlify.toml** | Root | **AUFTEILEN** — neue Konfig pro Subdomain (Phase 3 Edit) |
| **sw.js** | Root | **VERSCHIEBT** → app-only (Service Worker nur auf App-Subdomain registrieren — Landing braucht keinen SW) |
| **manifest.json** | Root | **VERSCHIEBT** → app-only (PWA-Manifest gehört zur App) |
| **offline.html** | Root | **VERSCHIEBT** → app-only (von SW als Offline-Fallback genutzt) |
| **robots.txt** | Root | **AUFTEILEN** — Landing crawlbar, App `Disallow: /` |
| **sitemap.xml** | Root | **AUFTEILEN** — Landing-Sitemap (Marketing), App-Sitemap entfällt (nicht crawlbar) |

> **PWA-Konsequenz:** `sw.js` + `manifest.json` müssen auf der App-Subdomain leben — sonst kann der SW Cross-Origin nicht greifen. Bedeutet: App-Subdomain hat ihren eigenen `sw.js` + `manifest.json`. Marketing-Landing bleibt SW-frei (besseres Crawling, kürzere Time-to-Interactive).

---

## 🗑️ DEAD-CANDIDATE — pending Marcel-Review

Aus CUTOVER-PAGE-INVENTORY Cluster 1, 2, 3. **Vor APP-LANDING-SPLIT entscheiden** ob diese Files überhaupt verschoben werden müssen — wenn Marcel "DELETE" bestätigt, sparen wir uns die Migration.

### Cluster 1 — Brief-Doppel-Pages (~28 Files, durch K-UI/briefe.html ersetzt)

| Page | Action |
|---|---|
| abschlussbericht-versicherung.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| aktennotiz.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| angebot-gutachten.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| auftragsbestaetigung.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| beauftragungsbestaetigung-gericht.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| checkliste-brandschaden.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| checkliste-sturmschaden.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| checkliste-wasserschaden.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| datenschutz-mandant.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| deckungsanfrage.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| einladung-ortstermin-gericht.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| einladung-ortstermin.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| einverstaendnis-dsgvo.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| ergaenzungsfragen-antwort.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| erstbericht-versicherung.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| fristverlaengerungsantrag.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| honorarvereinbarung.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| kostenrahmen-erhoehung.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| kostenvoranschlag-sanierung.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| kostenvorschuss-gericht.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| maengelanzeige.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| maengelruege.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| messprotokoll-feuchte.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| messprotokoll-risse.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| nachforderung-unterlagen.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| ortstermin-arbeitsblatt.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| ortstermin-protokoll.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| umladebrief-ortstermin.html | **LOESCHEN** (nach Marcel-OK Cluster 1) |
| **briefvorlagen.html** | **LOESCHEN** — durch briefe.html ersetzt (Cluster Tier E) |
| **kontakte.html** | **LOESCHEN** — durch kontakte-supabase.html ersetzt (Cluster Tier E) |

### Cluster 2 — vorlage-NN-*.html (11 Files, Goldstandard-Versionsreste)

| Page | Action |
|---|---|
| vorlage-01-standard.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-02-kurzgutachten.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-03-beweissicherung.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-04-gerichtsgutachten.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-05-brandschaden.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-06-feuchteschimmel.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-07-elementarschaden.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-08-baumaengel.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-09-ergaenzungsgutachten.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-10-schiedsgutachten.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |
| vorlage-11-bauabnahmeprotokoll.html | **LOESCHEN** (nach Marcel-OK Cluster 2) |

### Cluster 3 — Versions-Reste / RED Pages

| Page | Begründung | Action |
|---|---|---|
| **stellungnahme-v3.1.html** | RED, alte Version | **LOESCHEN** |
| **stellungnahme-gate.html** | RED, Pre-Editor-Gate vermutlich tot | **LOESCHEN** |
| **mahnung.html** | RED (NetlifyId), durch mahnung-1/2/3 ersetzt | **LOESCHEN** |
| **mahnung-1.html** | YELLOW, durch K-UI/briefe.html (Mahnung-Templates) ersetzt | **LOESCHEN** (nach Marcel-OK) |
| **mahnung-2.html** | YELLOW, durch K-UI/briefe.html ersetzt | **LOESCHEN** (nach Marcel-OK) |
| **mahnung-3.html** | YELLOW, durch K-UI/briefe.html ersetzt | **LOESCHEN** (nach Marcel-OK) |
| **mahnwesen.html** | YELLOW, evtl durch rechnungen.html-Tab ersetzt | **LOESCHEN** (nach Marcel-OK) |
| **effizienz.html** | RED, Zweck unklar | **LOESCHEN** |
| **schnelle-rechnung.html** | im FAB schon auskommentiert (Cluster Tier E) | **LOESCHEN** |
| **pdfmonkey-brief-template.html** | PDFMonkey-Source, nicht App-Page | **LOESCHEN** oder VERSCHIEBT in `docs/templates-source/` |
| **pdfmonkey-messprotokoll-template.html** | PDFMonkey-Source, nicht App-Page | **LOESCHEN** oder VERSCHIEBT in `docs/templates-source/` |

---

## 📈 Sprint-06b-Branch-Hinweis

Auf `feature/sprint-06b-auftrag-neu-skeleton` existiert eine zusätzliche **`auftrag-neu.html`**. Im Inventory nicht enthalten weil noch nicht in `main`. Beim Merge: **VERSCHIEBT → app.prova-systems.de/auftrag-neu** (APP-Wizard).

---

## 🛣️ Migration-Plan (für Phase 3)

### Schritt 1 — Marcel-Reviews vor jedem Move

1. **Cluster 1 (28 Brief-Doppel-Pages):** OK zum Löschen?
2. **Cluster 2 (11 Vorlage-Pages):** Goldstandard-Reste — OK zum Löschen?
3. **Cluster 3 (RED + Mahnung*.html + effizienz):** OK zum Löschen?
4. **Cluster 4 (~30 Workflow-Single-Pages):** welche live, welche tot?

Wenn alle Reviews "Löschen" sagen: ~50 Files weg, **nur ~75 HTML-Pages müssen verschoben werden**.

### Schritt 2 — Netlify-Site-Setup (Phase 3)

Variante A — **Eine Netlify-Site, zwei Custom-Domains** mit Path-Rewrites:
- prova-systems.de → serves nur LANDING-Pages (index, legal)
- app.prova-systems.de → serves alles andere
- Implementiert via netlify.toml `[[redirects]]` mit `host`-Conditions

Variante B — **Zwei Netlify-Sites** mit gemeinsamem GitHub-Repo:
- Site 1: prova-systems.de (publish: `landing/`)
- Site 2: app.prova-systems.de (publish: `app/`)
- Repo umstrukturiert in 2 Top-Level-Folder
- **Nachteil:** doppelte Builds, aber sauberer Cache + SW-Trennung

**Empfehlung:** Variante A (single-site, host-based redirects). Schneller umzusetzen, ein Build, eine Domain-Config. Variante B nur wenn echte SW-/PWA-Trennung nötig.

### Schritt 3 — Kritische Redirects (netlify.toml)

```toml
# Alte App-Pfade auf Landing-Domain → 301 zu App
[[redirects]]
  from = "/login"
  to   = "https://app.prova-systems.de/login"
  status = 301
  conditions = { Host = ["prova-systems.de", "www.prova-systems.de"] }

[[redirects]]
  from = "/dashboard"
  to   = "https://app.prova-systems.de/dashboard"
  status = 301
  conditions = { Host = ["prova-systems.de", "www.prova-systems.de"] }

[[redirects]]
  from = "/app-login.html"
  to   = "https://app.prova-systems.de/login"
  status = 301
```

> **Wichtig:** alle bestehenden Pilot-User-Bookmarks zeigen auf `prova-systems.de/dashboard`, `prova-systems.de/akte.html?id=...`, etc. → Redirects MÜSSEN den `?id=...`-Querystring weiterreichen (Netlify macht das per Default mit `:splat` bzw. preserveQueryString).

### Schritt 4 — Cross-Domain-Auth-Cookie

Supabase-Session-Cookie aktuell: `prova-systems.de`. Nach Split:
- Option 1: Cookie `app.prova-systems.de` only — Landing kann User-Login-Status nicht sehen ("Anmelden"-Button im Landing-Header zeigt immer)
- Option 2: Cookie `.prova-systems.de` (Wildcard) — beide Subdomains lesen, dafür Subdomain-Trust nötig
- **Empfehlung:** Option 2 — Cookie auf `.prova-systems.de` setzen, App + Landing sehen Login-Status, Header kann adaptiv "Anmelden" / "Zur App" zeigen

Marcel + Browser-Claude: in Phase 3 entscheiden.

### Schritt 5 — sw.js + manifest.json

`sw.js` registriert sich aktuell für `/` mit Scope `/`. Nach Split:
- App-Site: `sw.js` registriert sich nur auf `app.prova-systems.de/` — APP_SHELL-Pfade müssen `/dashboard` etc. ohne Subdomain-Präfix bleiben (relativer Scope), oder explizit `https://app.prova-systems.de/...`
- Landing-Site: kein SW

**CACHE_VERSION Bump nötig** (Regel 30) sobald sw.js angepasst wird.

---

## 📝 Offene Fragen für Phase 3

1. **Variante A oder B** — single-site mit host-rewrites oder zwei Netlify-Sites?
2. **Auth-Cookie-Scope** `.prova-systems.de` (cross-domain) oder `app.` only?
3. **Legal-Pages-Strategie:** kanonisch auf prova-systems.de + Cross-Domain-Links aus App, ODER Duplikat-Deploy auf beiden Subdomains?
4. **Cluster-Reviews:** wann macht Marcel die 4 Cluster-Reviews — vor Phase 3 (spart Move-Aufwand) oder parallel?
5. **Admin-Subdomain:** in Phase 3 mitziehen oder später?

---

## 🚀 Action-Summary (alle 129 Root-HTML)

| Action | Anzahl | Notiz |
|---|---|---|
| **BLEIBT** auf prova-systems.de | 5 | index + 4 Legal |
| **VERSCHIEBT** auf app.prova-systems.de | ~70 | nach Cluster-1+2+3-Bereinigung |
| **VERSCHIEBT** auf admin.prova-systems.de | 2 | admin-dashboard, admin-login |
| **VERSCHIEBT als Kopie** | 1 | 404.html beide Sites |
| **REDIRECT** alt → neu | mehrere | netlify.toml-Updates |
| **LOESCHEN** (DEAD-CANDIDATE) | ~50 | nach Marcel-OK Cluster 1+2+3 |
| **Total geprüft** | **129** | ✅ |

---

*Inventory erstellt 2026-04-30, Branch `sprint-app-landing-split`.*
*Phase 2 abgeschlossen — Phase 3 (Domain-Setup + Move) nach Marcel-Cluster-Reviews.*
