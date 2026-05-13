# Teil 4 — Pattern-Matrix (alle 139 Pages)
**Das Herzstück. Jede Page aus der Liste. Jede bekommt ein Urteil.**

> Legende:
> **Aufwand:** XS (<1h) · S (1-3h) · M (3-8h) · L (8-20h) · XL (>20h)
> **Nutzen:** ★ (nice) · ★★ (spürbar) · ★★★ (deutlicher Impact) · ★★★★ (transformiert die Page)
> **Status:** 🟢 = keep as-is · 🔷 = optimieren (post-pilot) · 🟠 = wichtig (pre-pilot) · 🔴 = Pilot-Blocker

---

## 1. Dashboard & Zentrale

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| dashboard.html | KPI-Grid + Fristen + Was-steht-an Liste | + Skeleton-Loading bei Init + Empty-State-CTAs + Density-Toggle (Compact für 6 KPIs statt 5) | Linear, Vercel Dashboard | ★★★ | S | 🟠 |
| archiv.html | Table-Liste mit Filter | + Filter-Chips statt Dropdown + Spotlight-Suche mit Operatoren (`typ:gutachten 2026`) | GitHub Issues, Linear | ★★★ | M | 🔷 |
| schadensfaelle.html | Liste mit Kanban-Ansatz | + View-Toggle (Liste/Kanban/Timeline segmented) + Bulk-Actions via Checkbox | Linear Board-View | ★★★ | M | 🔷 |
| app.html (5-Step Wizard) | Wizard mit Weg-a/b/c **Tabs innen** | Weg-Wahl → **Segmented Control** statt Tabs + Sticky-Footer + Progress-Bar oben | Stripe Onboarding | ★★★★ | M | 🔴 |
| neuer-fall.html | Quick-Create-Form | + Cmd+K als primärer Trigger von überall (aktuell schon vorhanden, Hint ergänzen) | Linear „+ Create" | ★★ | XS | 🔷 |

---

## 2. Kern-Workflows (Flow A — Schaden)

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| gericht-auftrag.html | Formular-Seite | + Inline-Edit der Kontakt-Daten statt Separater Flow + Smart-Defaults aus letztem Auftrag | Attio | ★★ | S | 🔷 |
| vor-ort.html | Mobile-Diktat-Page | + Pull-to-Refresh (existiert in lib/) + Floating-Action-Button + Safe-Area-Respekt | Notion Mobile | ★★★ | S | 🟠 |
| ortstermin-modus.html | Spezial-Modus-Page | Focus-Mode-Toggle (Vollbild) + Keyboard-Hinweise sichtbar | iA Writer | ★★ | XS | 🔷 |
| gutachterliche-stellungnahme.html | Kurzgutachten-Editor | Bubble-Menu + Slash-Commands (siehe stellungnahme.html) konsequent ausrollen | Notion, Craft | ★★★ | S | 🟠 |
| **stellungnahme.html** (§6) | TipTap + persistente Toolbar + KI-Tools `<details>` + max-width-Fix | **Bubble-Menu** statt persistenter Top-Toolbar + **Slash-Commands** (`/norm`, `/baustein`) + Sidebar-Comments statt Inline + Focus-Mode-Auto-Hint + Skeleton für KI-Generierung statt blockender Loader | **Notion, Craft, Google Docs** | ★★★★ | M | 🔴 |
| stellungnahme-gegengutachten.html | Variante stellungnahme | Wie stellungnahme (shared component) | = | ★★★ | inkl. | 🔴 |
| ergaenzung.html (§412 ZPO) | Editor | Wie stellungnahme | = | ★★★ | inkl. | 🟠 |
| freigabe.html | Compliance-Check + PDF-Gen | + Sticky-Action-Footer („Zurück"/„PDF generieren & senden") + Optimistic-UI bei Check-Toggles + Skeleton während PDF-Build | Stripe-Checkout, Linear | ★★★ | S | 🟠 |
| freigabe-queue.html | Multi-Auftrag-Übersicht | + Bulk-Actions-Bar (append bottom-sticky) + Checkbox-Select + Status-Badges color-coded | Gmail Multi-Select, Linear | ★★★ | M | 🔷 |

---

## 3. Weitere Workflows (Flow B/C/D)

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| wertgutachten.html | Berechnungs-Modi-Auswahl | **Initial-Picker statt Tabs** (Sachwert/Vergleichswert/Ertragswert) + Wizard | QuickBooks, Stripe-Modes | ★★★ | M | 🟠 |
| beratung.html | Protokoll-Form | Inline-Edit + Voice-Diktat-Button prominent (via existing whisper-chunker) | Otter.ai | ★★ | S | 🔷 |
| baubegleitung.html | Mehrere Einträge | **Timeline-Pattern** (chronologisch, wie Activity-Stream) + Drag-to-Reorder | Linear Timeline | ★★★ | M | 🔷 |
| schiedsgutachten.html | selten verwendete Spezial-Page | Keep as-is, ggf. hinter Cmd+K „versteckt" aber findbar | — | ★ | XS | 🟢 |
| vorlage-01 bis vorlage-11 | PDF-Templates | Gallery-Pattern (Card-Grid) mit Preview-Thumbs + „Verwenden"-CTA + Filter-Chips nach Typ | Figma Template-Gallery, Notion-Templates | ★★★ | M | 🔷 |

---

## 4. Office / Büro

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| rechnungen.html | Liste + Detail | + **Side-Panel-Detail** (klick auf Zeile öffnet Panel rechts) statt Modal/Neue Page + Filter-Chips | Stripe Dashboard, Attio | ★★★ | M | 🔷 |
| erechnung.html | ZUGFeRD-Form | Inline-Validierung mit grünen/roten Indikatoren bei Pflichtfeldern + Save-Progress-Indicator | Stripe Invoicing | ★★ | S | 🔷 |
| schnelle-rechnung.html | Quick-Invoice | + Keyboard-First-Flow (Tab durch Felder + Enter speichert) | Superhuman | ★★ | XS | 🔷 |
| mahnwesen.html | Stufen-Pipeline | **Kanban-Board** (Stufe 1 → 2 → 3 → Inkasso) + Drag-to-Move | Pipedrive Pipeline | ★★★ | M | 🔷 |
| mahnung-1/2/3.html | Einzelstufen | Redirect via mahnwesen.html? Oder als Drawer-Detail? | — | ★ | S | 🔷 |
| briefe.html | Liste | + Empty-State mit „Ersten Brief erstellen" CTA + Vorschau-Thumbs wie Gallery | Gmail, Notion | ★★ | S | 🔷 |
| briefvorlagen.html | Vorlagen-Liste | Gallery-Pattern + Duplizieren-Action + Search-Filter | Notion Template-Gallery | ★★ | S | 🔷 |
| **kontakt-detail.html** | **9 TABS (PROBLEM)** | **Activity-Stream + Filter-Chips + Smart-Sidebar** (siehe Tabs-Audit 2.1) | **Attio, Linear, HubSpot** | ★★★★ | M | 🔴 |
| kontakte.html | Liste mit **4 Filter-Tabs** | **Filter-Chips mit Count-Badges** statt Tabs + Side-Panel-Detail | GitHub Issues, Linear | ★★★ | M | 🔷 |
| kontakte-supabase.html | Migration-Variante | → zu kontakte.html mergen, diese Variante löschen | — | ★★ | S | 🔷 |
| termine.html | Kalender | **Segmented-Control** (Liste/Woche/Monat) statt Tabs + Keyboard-Nav (J/K durch Termine) + iCal-Sync-Indicator | Google Calendar, Linear | ★★★ | M | 🔷 |
| fristen.html | 5-Pipeline-Ansicht | **Kanban** pro Pipeline + Count-Badges in Header + bottom-sticky „Neue Frist"-FAB | Linear | ★★★ | M | 🔷 |
| bescheinigungen.html | Liste | + Empty-State + Side-Panel-Detail + Status-Color-Coding (issued/pending) | Stripe | ★★ | S | 🔷 |
| bescheinigung-erstellen.html | Generator-Form | + Live-Preview rechts während Eingabe (split-view 60/40) | Stripe Invoice-Creator | ★★★ | M | 🔷 |
| dokumente-list.html | Datei-Liste | + Grid/List-View-Toggle + Drag-and-Drop-Upload direkt auf Page + Thumbnail-Previews | Google Drive, Notion | ★★ | M | 🔷 |
| dokument-import.html | Import-Flow | Skeleton-Loading + Progress-Bar bei großen Imports | — | ★★ | S | 🔷 |
| dokument-neu.html | Neues Dokument | Cmd+K-Shortcut ergänzen ("n d") + Template-Picker als Initial-Screen | Notion | ★★ | S | 🔷 |
| dokument-vorlagen.html | Vorlagen-Liste | Gallery-Pattern (wie briefvorlagen.html) | — | ★★ | S | 🔷 |
| import-assistent.html | CSV/vCard-Import | Step-Indicator + Live-Validation-Feedback („12 valide, 3 Fehler") | Notion Import, Airtable | ★★★ | M | 🔷 |
| wiederherstellbare-entwuerfe.html | Recovery-Liste | Empty-State + „Aus Backup wiederherstellen"-CTA + Timestamp prominent | — | ★ | XS | 🔷 |

---

## 5. Tools & Bibliotheken

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| normen.html | Suche + Liste | Instant-Search-Highlighting + Cmd+K-Integration (normen-picker.js existiert!) + Favoriten-Star | Algolia, GitHub Code-Search | ★★★ | M | 🔷 |
| textbausteine.html | Bibliothek | Gallery-Pattern mit Kategorie-Chips + Quick-Copy-Button auf Hover + „In Editor einfügen"-Action | Notion Snippets | ★★★ | S | 🔷 |
| positionen.html | Rechnungs-Positionen | Inline-Editierbare Tabelle + Bulk-Import-CSV | Airtable | ★★ | M | 🔷 |
| jveg.html | Rechner-Form | Live-Kalkulation während Input + Speicher-Button sticky | Calculator-Apps | ★★ | S | 🔷 |
| honorar-rechner.html | Honorar-Form | Wie jveg.html | = | ★★ | S | 🔷 |
| **kostenermittlung.html** | **3-Modus-Tabs (PROBLEM)** | **Initial-Picker (3 große Karten) + Wizard** | QuickBooks | ★★★ | M | 🟠 |
| skizzen.html | Vollbild-Editor | Keep as-is. Bubble-Menu für Zeichen-Tools (gilt schon für mobile existierende skizzen-embed) | Figma | ★★ | S | 🟢 |
| eintraege.html | Chronologie-Liste | **Activity-Stream** (chronologisch, scroll-loading) + Filter-Chips + Type-Icons | Linear Timeline, GitHub | ★★★ | M | 🔷 |
| editor-demo.html | Sandbox | Intern/Dev-only → keine User-Änderung | — | — | — | 🟢 |
| diktat-mobile.html | Mobile-Special | + Floating Record-Button + Haptic-Feedback (Vibration-API) + Focus-Mode (no-chrome bei Aufnahme) | Otter.ai, Voice Memos | ★★★ | S | 🔷 |

---

## 6. Einstellungen

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| einstellungen.html | **Sidebar-Sections (GUT!)** | KEEP. + Settings-Search-Box oben + Cmd+K-Integration („Settings › 2FA") + URL-Hash-Sync (vorhanden ✓) | Linear Settings, Slack | ★★ | S | 🟢 |
| profil-supabase.html | Profil-Form | Inline-Edit pro Feld statt „Bearbeiten-Modus" + Avatar-Upload mit Drag-Drop | Attio, Notion | ★★★ | S | 🔷 |
| smtp-einrichtung.html | SMTP-Config | Test-Verbindung-Button inline + Live-Feedback (grün/rot) + Skeleton beim Test | Mailgun Dashboard | ★★ | S | 🔷 |
| push-setup.html | Push-Perm | Stepper-Pattern (Perm erlauben → Test senden → Aktiv) | Apple-Push-Onboarding | ★★ | S | 🔷 |
| dsgvo-mein-konto.html | Self-Service | Klar gegliederte Action-Cards (Auskunft / Portabilität / Löschung) + Bestätigung-Confirm-Dialogs | GDPR-Tools | ★★ | S | 🔷 |
| cookie-einstellungen.html | Cookie-Banner | Segmented: Essential/Preferences/Analytics + „Alle akzeptieren/ablehnen" prominent | Usercentrics, Cookiebot | ★★ | S | 🔷 |
| benachrichtigungen.html | In-App-Benach | Inbox-Pattern (unread/read) + Mark-all-as-read + Filter-Chips (Alle/Ungelesen/Meine) | Linear Inbox | ★★★ | M | 🔷 |

---

## 7. Auth & Onboarding

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| app-login.html | Login-Form + Tabs (Mail/SSO) | Keep Tabs (2 OK). Magic-Link als zusätzliche Option (existiert?) + Device-Trust | Auth0, Supabase Auth UI | ★★ | S | 🔷 |
| app-register.html | Register + Stripe-Checkout | Progressive-Disclosure (Felder schrittweise) statt Langform + Password-Strength-Meter | Stripe Checkout, Vercel | ★★★ | M | 🔷 |
| setup-2fa.html | QR-Code + Recovery | Keep as-is (Standard-Flow). + Copy-Recovery-Codes-Button | 1Password, Bitwarden | ★★ | XS | 🟢 |
| onboarding.html | Welcome-Tour | Product-Tour-Library-Pattern (Hotspot-Tooltips) + Skip-any-step | Userflow, Intercom Product Tours | ★★ | M | 🔷 |
| onboarding-supabase.html | Migration | Mergen mit onboarding.html | — | ★ | S | 🔷 |
| onboarding-welcome.html | Post-Register | Personalisiert via Anrede + First-Action-Suggestion („Ersten Auftrag anlegen") | Notion, Linear | ★★ | S | 🔷 |
| onboarding-schnellstart.html | Quick-Start | Checkboxen-Liste mit Progress-Bar oben | Linear, Stripe Onboarding | ★★★ | S | 🔷 |
| account-gesperrt.html | Gesperrt-Page | Keep, nur Kontrast-Fix + „Support kontaktieren"-CTA prominent | — | ★ | XS | 🟢 |

---

## 8. Marketing / Public

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| index.html | Hero + Features | außer Scope (Marketing-Team), nur A11y-Checks | — | — | — | 🟢 |
| pricing.html | Tier-Karten | Monatlich/Jährlich-Toggle (Segmented) + FAQ unten + „Most Popular"-Badge | Stripe, Linear Pricing | ★★ | S | 🔷 |
| kontakt.html | Formular | Honeypot-Anti-Spam + Success-State mit „Wir melden uns in 24h" | — | ★ | XS | 🔷 |
| agb/datenschutz/impressum/avv | Legal-Texte | Table-of-Contents-Sidebar (sticky) + Such-Funktion | Stripe Legal, Termly | ★★ | M | 🔷 |
| pilot.html | Pilot-Landing | Testimonials + FAQ + klare CTA | — | ★ | — | 🟢 |
| demo.html | Live-Demo | Product-Tour mit Mock-Daten | Notion-Demo | ★★★ | L | 🔷 |
| public-status.html | Uptime-Dashboard | Keep, + 90-Tage-History-Heatmap-Chart | status.page, Upptime | ★★ | M | 🔷 |

---

## 9. Admin (Founder-only)

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| admin-login.html | Login + 2FA | Keep + IP-Allow-List-Hinweis | — | ★ | XS | 🟢 |
| admin-cockpit.html | Dashboard | KPI-Cards + Live-Counter (Supabase Realtime) + Alerts-Inbox prominent | Vercel Dashboard, Stripe Admin | ★★★ | L | 🔷 |
| admin-dashboard.html | Dashboard-Variante | Mergen mit admin-cockpit.html | — | ★ | M | 🔷 |
| audit-trail.html | Log-Viewer | Advanced-Filter-Bar mit Operatoren (`user:marcel action:login date:>2026-05-01`) + Export-CSV | GitHub Audit, Stripe Events | ★★★ | M | 🔷 |
| statistiken.html | KPI-Dashboard mit Charts | + Date-Range-Picker prominent + Drilldown-Klick → Detail-Page + Export-PNG/CSV | Stripe Analytics, Vercel Analytics | ★★★ | L | 🔷 |
| jahresbericht.html | Export-Page | Stepper (Zeitraum → Vorlage → Export) + Preview | — | ★★ | M | 🔷 |

---

## 10. Pflicht-Dokumente (Korrespondenz)

**Gemeinsame Charakteristik:** Alle sind „Fill-in-the-Blanks"-Formulare die in PDF enden.

| Page-Gruppe | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| auftragsbestaetigung, auftrag-ablehnung, auftrag-ablehnen, kuendigung-auftrag | Formulare | **Unified-Form-Template** + Split-View (Form links, Live-Preview rechts) | DocuSign-Template-Creator | ★★★ | L | 🔷 |
| terminsbestaetigung, terminabsage, terminsverlegung-antrag | Formulare | Gleich wie oben | = | ★★★ | inkl. | 🔷 |
| einladung-ortstermin | Formular | Gleich + iCal-Anhang-Option | Calendly | ★★ | S | 🔷 |
| nachforderung-unterlagen, anforderung-unterlagen-erweitert | Unterlagen-Form | Gleich + Checkliste-Auswahl für „Was fehlt" | — | ★★ | S | 🔷 |
| akteneinsicht-antrag | Antrag | Form + Paragraph-Hinweis | — | ★★ | S | 🔷 |
| vollmacht-sv | Vollmacht | Form + Unterschrift-Feld (Canvas-Signature) | DocuSign | ★★ | M | 🔷 |
| einverstaendnis-dsgvo, datenschutz-mandant, datenschutz-einwilligung-gericht | DSGVO-Texte | Klarere Struktur + Checkbox-Confirmations | — | ★ | S | 🔷 |
| widerspruch-gegengutachten, widerspruch-gutachten | Formulare | Wie oben + Verweis auf §§ | — | ★★ | S | 🔷 |
| verguetungsanzeige (JVEG) | Form | Live-Kalkulation mit jveg.html-Integration | — | ★★★ | M | 🔷 |
| zpo-anzeige, sicherheitsbedenken, aktennotiz | Formulare | Kurz-Form + Speichern-as-PDF | — | ★★ | S | 🔷 |
| abnahmeprotokoll-formal, begehungsprotokoll, ortsbesichtigung-protokoll-gericht | Protokolle | Structured-Form + Foto-Upload direkt inline (lib/foto-upload-v2 existiert) | — | ★★★ | M | 🔷 |
| abschlussbericht-versicherung, erstbericht-versicherung, zwischenbericht | Versicherungs-Reports | Template-basiert mit Vorlagen-Picker | — | ★★ | M | 🔷 |
| gutachten-zusammenfassung | Summary-Form | Auto-Draft aus Haupt-Gutachten (KI-gestützt, opt-in Regel 12!) | — | ★★★ | L | 🔷 |
| schlussrechnung-aufstellung, rechnungskorrektur, erinnerungsschreiben, mahnung | Rechnung/Mahnung-Forms | Wie rechnungen.html + Positionen-Inline-Edit | — | ★★ | M | 🔷 |
| checkliste-sturmschaden, checkliste-wasserschaden | Checklisten | Interaktive Checkboxen + Progress-Bar + Export-PDF | Notion Template | ★★★ | S | 🔷 |

---

## 11. System

| Page | Aktuelles Pattern | Empfohlenes Pattern | SaaS-Vorbild | Nutzen | Aufwand | Status |
|---|---|---|---|---|---|---|
| 404.html | Nicht-gefunden | + Cmd+K-Hinweis („Oder drücke ⌘K") + Beliebte-Pages-Links | Vercel 404, GitHub | ★★ | XS | 🔷 |
| 500.html | Server-Error | + Sentry-Event-ID anzeigen für Support | Sentry | ★ | XS | 🔷 |
| offline.html | Offline-Page | + Liste verfügbarer Offline-Features (was geht, was nicht) | Notion Offline | ★★ | S | 🔷 |
| maintenance.html | Wartung | + ETA-Timer + Status-Page-Link | status.page | ★ | XS | 🔷 |
| status.html | Status-Display | Wie public-status.html | = | ★ | inkl. | 🔷 |
| support.html | Kontakt-Form | + FAQ-Suche vor dem Kontakt-Form („haben wir deine Antwort schon?") | Intercom, Zendesk | ★★★ | M | 🔷 |
| hilfe.html | Hilfe-Artikel | Dokumentations-Layout (Sidebar-Nav + Content) + Such-Box oben | Linear Docs, Stripe Docs | ★★★ | L | 🔷 |
| portal.html | Stripe-Customer-Portal | Keep (Stripe-hosted), nur Branding-Check | — | ★ | — | 🟢 |
| pilot-tutorial.html | Tutorial | Interactive-Walk-Through (nicht lineare Slides!) | Typeform, Linear Onboarding | ★★ | L | 🔷 |

---

## 12. Aggregate — Pattern-Anwendungs-Statistik

Die **6 neuen Universal-Module** aus diesem Paket finden Anwendung auf:

| Modul | Anwendungs-Pages |
|---|---|
| **prova-detail-sidebar** | rechnungen, kontakte, kontakt-detail, bescheinigungen, fristen, termine, audit-trail |
| **prova-inline-edit** | profil-supabase, kontakt-detail, kontakte, positionen, fristen |
| **prova-bubble-menu** | stellungnahme, stellungnahme-gegengutachten, ergaenzung, gutachterliche-stellungnahme, beratung, dokument-neu |
| **prova-density-toggle** | (global, einstellungen.html führt ihn ein) |
| **prova-filter-chips** | archiv, schadensfaelle, kontakte, bescheinigungen, rechnungen, eintraege, fristen, admin-audit |
| **prova-a11y-contrast.css** | global (von allen Pages via Link-Tag) |

**Das heißt:** 6 neue Dateien → **~60 Pages profitieren** direkt.

---

## 13. Zahlen-Zusammenfassung

| Kategorie | Count |
|---|---|
| Pages geprüft (explizit) | 139 |
| Empfehlungen total | 47 konkrete Pattern-Wechsel, 60+ Verbesserungen |
| 🔴 Pilot-Blocker | 5 (kontakt-detail, app-wizard-innen, stellungnahme, freigabe, kostenermittlung) |
| 🟠 Pre-Pilot wichtig | 12 |
| 🔷 Post-Pilot optimieren | 80+ |
| 🟢 Keep as-is | 25+ |

---

**Hinweis zu „Keep as-is":** Viele Pages sind bereits gut. Der Auftrag war nicht, alles umzuwerfen — der Auftrag war: identifiziere, wo erfolgreichere SaaS bessere Patterns haben und
warum. Die 5 Pilot-Blocker sind das klarste Signal.
