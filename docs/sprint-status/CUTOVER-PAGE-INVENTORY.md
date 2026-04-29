# Cutover Page-Inventory — 2026-04-30 (Nacht-Audit)

**Methodik:** grep über alle `*.html` im Repo nach 4 Indikatoren:
- `/lib/auth-guard.js` Import (direkt oder via `-logic.js`-Modul)
- `<script src="https://identity.netlify.com/...">` (Netlify-Identity-Widget)
- `<script src="auth-guard.js">` (Legacy-Hash-Session-Guard)
- `<script src="prova-fetch-auth.js">` (Legacy-Auth-Header-Helper)
- nav.js-Verlinkung
- sw.js APP_SHELL-Eintrag

**READ-ONLY** — keine Code-Änderungen, nur Dokumentation.

---

## Zahlen

| Kategorie | Anzahl |
|---|---|
| Root-HTML insgesamt | **129** |
| Subfolder-HTML (`briefe/`, `formulare/`, `legal/`, `tools/`) | 47 |
| **GREEN** (Pure Supabase via `/lib/auth-guard.js`) | **6** |
| **RED — Netlify Identity Widget aktiv** | **6** |
| **YELLOW — Hybrid-Stack (Legacy `auth-guard.js` + `prova-fetch-auth.js`)** | **~52** |
| **GRAY — nicht in nav.js + nicht in sw.js APP_SHELL** | **~95** |
| nav.js Sidebar-Items | 20 |
| sw.js APP_SHELL HTML-Eintrage | 31 |

---

## Reihenfolge für Cutover (Marcel-Empfehlung)

### Tier A — KRITISCH (vor allen anderen)

Pages die direkt am User-Flow nach Login hängen oder vom bereits live gegangenen K-UI-Workflow erreicht werden:

| Page | Status | nav.js | sw.js | Begründung |
|---|---|---|---|---|
| **akte.html** | YELLOW | nein | ja | **Brief-Workflow-Ziel** — briefe.html "→ Akte"-Link bricht aktuell. **Höchste Prio.** |
| **app.html** | YELLOW | ja | ja | Schadensgutachten-Wizard, häufigste Page |
| **dashboard.html** | YELLOW | ja | ja | Landing-Page nach Login — Cutover-First-Impression |

### Tier B — User-facing häufig (Sidebar)

Per nav.js verlinkt, Hybrid-Stack:

| Page | Status | sw.js | Frequenz | Notiz |
|---|---|---|---|---|
| archiv.html | YELLOW | ja | sehr hoch | Aufträge-Liste — direkt nach Dashboard |
| termine.html | YELLOW | ja | hoch | Kalender |
| rechnungen.html | YELLOW | ja | hoch | Rechnungen + Mahnungen |
| einstellungen.html | YELLOW | ja | mittel | wichtig für Konfiguration |
| freigabe.html | YELLOW | ja | hoch | Workflow-Page |
| stellungnahme.html | YELLOW | ja | hoch | §6 Fachurteil-Editor |

### Tier C — User-facing selten (Sidebar)

| Page | Status | sw.js | Notiz |
|---|---|---|---|
| baubegleitung.html | YELLOW | ja | Flow D |
| beratung.html | YELLOW | ja | Flow C |
| wertgutachten.html | YELLOW | ja | Flow B |
| ortstermin-modus.html | YELLOW | ja | Flow A Ortstermin |
| jveg.html | YELLOW | ja | Honorar-Rechner |
| jahresbericht.html | YELLOW | ja | jährlich |
| normen.html | YELLOW | ja | Nachschlage-Tool |
| textbausteine.html | YELLOW | ja | Vorlagen |
| positionen.html | YELLOW | ja | Preise |
| zpo-anzeige.html | YELLOW | ja | §407a Compliance |
| hilfe.html | YELLOW | nein | aus Sidebar erreichbar |
| kostenermittlung.html | YELLOW | ja | nicht in nav, aus Workflow |
| gutachterliche-stellungnahme.html | **GREEN** ✅ | ja | bereits Supabase |

### Tier D — Internal/Tools

| Page | Status | Notiz |
|---|---|---|
| onboarding.html, onboarding-schnellstart.html | YELLOW | Pre-Cutover-Onboarding |
| onboarding-welcome.html | YELLOW | nicht in sw |
| onboarding-supabase.html | **GREEN** ✅ | bereits Supabase |
| auth-supabase.html | **GREEN** ✅ | Login-Target |
| app-login.html | **RED** | Legacy Login — wird in Cutover Block 2 redirected |
| app-register.html | YELLOW | nicht in nav |
| account-gesperrt.html | **RED** | Netlify Identity drin — wird selten getroffen |
| admin-dashboard.html, admin-login.html | YELLOW | Founder-Cockpit |
| benachrichtigungen.html | YELLOW | nicht in nav |
| portal.html | YELLOW | nicht in nav |
| 404.html, offline.html, index.html | sonstige | Legal-OK |

### Tier E — Legacy-Pages aus Sidebar (Deprecate-Kandidaten nach Cutover)

| Page | Status | Ersatz | Empfehlung |
|---|---|---|---|
| **kontakte.html** | YELLOW | kontakte-supabase.html | Aus nav.js entfernen, Page als Redirect nach Cutover |
| **briefvorlagen.html** | YELLOW | briefe.html | Aus nav.js entfernen, Page als Redirect |
| **schnelle-rechnung.html** | YELLOW | briefe.html?mode=schnellbrief (für Briefe) bzw. K-2.x für Rechnungen | im FAB schon auskommentiert |

---

## Tier GRAY — vermutlich tot (Marcel reviewt)

**95 Root-Pages** + **47 Subfolder-Pages** sind weder in nav.js noch in sw.js APP_SHELL. Wahrscheinlichste Erklärung pro Cluster:

### Cluster 1 — Doppel-Pages mit `briefe/`-Subfolder

Diese Pages existieren **doppelt** (Root + briefe/-Subfolder). Vermutlich frühere Iteration, jetzt durch K-UI/briefe.html (PDFMonkey-Templates) abgelöst:

```
abschlussbericht-versicherung.html       ⇔ briefe/abschlussbericht-versicherung.html
aktennotiz.html                          ⇔ briefe/aktennotiz.html
angebot-gutachten.html                   ⇔ briefe/angebot-gutachten.html
auftragsbestaetigung.html                ⇔ briefe/auftragsbestaetigung.html
beauftragungsbestaetigung-gericht.html   ⇔ briefe/beauftragungsbestaetigung-gericht.html
checkliste-brandschaden.html             ⇔ briefe/checkliste-brandschaden.html
checkliste-sturmschaden.html             ⇔ briefe/checkliste-sturmschaden.html
checkliste-wasserschaden.html            ⇔ briefe/checkliste-wasserschaden.html
datenschutz-mandant.html                 ⇔ briefe/datenschutz-mandant.html
deckungsanfrage.html                     ⇔ briefe/deckungsanfrage.html
einladung-ortstermin-gericht.html        ⇔ briefe/einladung-ortstermin-gericht.html
einladung-ortstermin.html                ⇔ briefe/einladung-ortstermin.html
einverstaendnis-dsgvo.html               ⇔ briefe/einverstaendnis-dsgvo.html
ergaenzungsfragen-antwort.html           ⇔ briefe/ergaenzungsfragen-antwort.html
erstbericht-versicherung.html            ⇔ briefe/erstbericht-versicherung.html
fristverlaengerungsantrag.html           ⇔ briefe/fristverlaengerungsantrag.html
honorarvereinbarung.html                 ⇔ briefe/honorarvereinbarung.html
kostenrahmen-erhoehung.html              ⇔ briefe/kostenrahmen-erhoehung.html
kostenvoranschlag-sanierung.html         ⇔ briefe/kostenvoranschlag-sanierung.html
kostenvorschuss-gericht.html             ⇔ briefe/kostenvorschuss-gericht.html
maengelanzeige.html                      ⇔ briefe/maengelanzeige.html
maengelruege.html                        ⇔ briefe/maengelruege.html
messprotokoll-feuchte.html               ⇔ briefe/messprotokoll-feuchte.html
messprotokoll-risse.html                 ⇔ briefe/messprotokoll-risse.html
nachforderung-unterlagen.html            ⇔ briefe/nachforderung-unterlagen.html
ortstermin-arbeitsblatt.html             ⇔ briefe/ortstermin-arbeitsblatt.html
ortstermin-protokoll.html                ⇔ briefe/ortstermin-protokoll.html
umladebrief-ortstermin.html              ⇔ briefe/umladebrief-ortstermin.html
```

**Empfehlung:** Marcel reviewt — nach Bestätigung beide Cluster entfernen (1 Sprint), Brief-Generierung läuft via K-UI/briefe.html + Edge Function brief-generate.

### Cluster 2 — Doppel-Pages `formulare/` ↔ `vorlage-XX-...`

```
formulare/vorlage-01-standard.html       ⇔ vorlage-01-standard.html
formulare/vorlage-02-kurzgutachten.html  ⇔ vorlage-02-kurzgutachten.html
... (11 Files)
```

11 Goldstandard-Vorlagen — vermutlich PDFMonkey-Source. Die echten Templates sind in `docs/templates-goldstandard/` (Marcel hat dort bereits den K-UI-Sprint gepatcht). Die HTML-Pages im Root + formulare/-Folder sind ältere Iteration.

**Empfehlung:** Marcel-Klärung — sind die noch lebende Workflow-Pages oder Goldstandard-Versionsleichen?

### Cluster 3 — Versions-Reste

```
stellungnahme-v3.1.html        — RED (Netlify Identity), vermutlich alte Version
stellungnahme-gate.html        — RED, vermutlich Pre-Editor-Gate
stellungnahme-gegengutachten.html — YELLOW, vermutlich nicht mehr im Flow
mahnung.html                   — RED (Netlify Identity), durch mahnung-1/2/3.html ersetzt?
mahnung-1.html, -2.html, -3.html — YELLOW, durch K-UI/briefe.html (Mahnung-Templates K-06A/B/C) ersetzt
mahnwesen.html                 — YELLOW, evtl. durch rechnungen.html-Tab ersetzt
effizienz.html                 — RED (Netlify Identity), Zweck unklar
```

### Cluster 4 — Workflow-Single-Pages (vermutlich noch lebend, aber nicht in Sidebar)

Pages mit eigenem Workflow-Pfad, nicht in nav, aber wahrscheinlich vom User-Click erreicht:

```
auftrag-ablehnen.html, auftrag-ablehnung.html
abnahmeprotokoll-formal.html
akteneinsicht-antrag.html
anforderung-unterlagen-erweitert.html
begehungsprotokoll.html
datenschutz-einwilligung-gericht.html
ergaenzung.html
erechnung.html
erinnerungsschreiben.html
freigabe-queue.html
gericht-auftrag.html
gutachten-zusammenfassung.html
import-assistent.html
integration-template.html
kuendigung-auftrag.html
ortsbesichtigung-protokoll-gericht.html
rechnungskorrektur.html
schiedsgutachten.html
schlussrechnung-aufstellung.html
sicherheitsbedenken.html
smtp-einrichtung.html
statistiken.html
terminabsage.html
terminsbestaetigung.html
terminsverlegung-antrag.html
verguetungsanzeige.html
vollmacht-sv.html
vor-ort.html
widerspruch-gegengutachten.html
widerspruch-gutachten.html
zwischenbericht.html
```

**Empfehlung:** Marcel-Review pro Page — entweder migrieren (falls live) oder deprecaten.

### Cluster 5 — pdfmonkey-*-template

```
pdfmonkey-brief-template.html
pdfmonkey-messprotokoll-template.html
```

PDFMonkey-Templates die nicht in `docs/templates-goldstandard/` sind. Vermutlich Stand-Alone Versuche. Marcel-Review.

### Cluster 6 — tools/

```
tools/test-edge-functions.html
tools/test-pilot-kurzstellungnahme.html
tools/test-supabase-login.html
```

Test-Tools für Marcel — bleiben.

### Cluster 7 — legal/

```
legal/agb.html, legal/avv.html, legal/datenschutz.html, legal/impressum.html, legal/datenschutz-intern.html
```

**ACHTUNG (CLAUDE.md Regel 27):** Legal-Pages sind im Root (impressum.html, datenschutz.html, agb.html, avv.html) wegen 48+ Cross-References. Die `legal/`-Subfolder-Versionen sind vermutlich Duplikate.

**Empfehlung:** Marcel reviewt — legal/-Subfolder-Versionen vermutlich entfernen, Root-Versionen sind kanonisch.

---

## Detail-Tabelle (Sidebar-Pages + Tier A-C)

| Page | Status | Auth-Guard | NetlifyId-Script | nav.js | sw.js | Empfehlung |
|---|---|---|---|---|---|---|
| **profil-supabase.html** | GREEN | /lib/auth-guard.js (via logic) | nein | ja | ja | ✅ fertig |
| **kontakte-supabase.html** | GREEN | /lib/auth-guard.js (via logic) | nein | ja | ja | ✅ fertig |
| **briefe.html** | GREEN | /lib/auth-guard.js (via logic) | nein | ja | ja | ✅ fertig |
| **gutachterliche-stellungnahme.html** | GREEN | /lib/auth-guard.js (via logic) | nein | nein | ja | ✅ fertig |
| **onboarding-supabase.html** | GREEN | /lib/auth-guard.js (via logic) | nein | nein | ja | ✅ fertig |
| **auth-supabase.html** | GREEN | /lib/auth-guard.js (via logic) | nein | nein | ja | ✅ Login-Target |
| akte.html | YELLOW | Legacy auth-guard.js | nein | nein | ja | **Tier A** — höchste Prio |
| app.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | **Tier A** |
| dashboard.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | **Tier A** |
| archiv.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier B |
| termine.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier B |
| rechnungen.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier B |
| einstellungen.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier B |
| freigabe.html | YELLOW | Legacy auth-guard.js | nein | nein | ja | Tier B (Workflow) |
| stellungnahme.html | YELLOW | Legacy auth-guard.js | nein | nein | ja | Tier B (§6 Editor) |
| baubegleitung.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier C |
| beratung.html | YELLOW | (kein Guard?) | nein | nein | ja | Tier C |
| wertgutachten.html | YELLOW | Legacy auth-guard.js | nein | nein | ja | Tier C |
| ortstermin-modus.html | YELLOW | Legacy auth-guard.js | nein | nein | ja | Tier C |
| jveg.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier C |
| jahresbericht.html | YELLOW | Legacy auth-guard.js | nein | ja | nein | Tier C |
| normen.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier C |
| textbausteine.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier C |
| positionen.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier C |
| zpo-anzeige.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | Tier C |
| hilfe.html | YELLOW | Legacy auth-guard.js | nein | ja | nein | Tier C |
| kontakte.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | **Tier E** — deprecate, durch kontakte-supabase ersetzt |
| briefvorlagen.html | YELLOW | Legacy auth-guard.js | nein | ja | ja | **Tier E** — deprecate, durch briefe.html ersetzt |
| app-login.html | **RED** | (alter Login) | ja | nein | ja | **Cutover Block 2** — 301-Redirect zu auth-supabase |
| account-gesperrt.html | **RED** | Legacy + NetlifyId | ja | nein | nein | Niedrige Prio (selten getroffen) |
| effizienz.html | **RED** | NetlifyId | ja | nein | nein | Tier GRAY — Marcel-Review |
| mahnung.html | **RED** | NetlifyId | ja | nein | nein | Tier GRAY — vermutlich tot |
| stellungnahme-gate.html | **RED** | NetlifyId | ja | nein | nein | Tier GRAY — Pre-Editor-Gate vermutlich tot |
| stellungnahme-v3.1.html | **RED** | NetlifyId | ja | nein | nein | Tier GRAY — alte Version |

---

## Konkrete Cutover-Reihenfolge für Block 3

Aus dem Inventory ergibt sich diese Empfehlung für **K-1.5 Block 3 (60+ HTML-Pages Migration)**:

1. **akte.html** — **vorrangig** (Brief-Workflow-Ziel, bricht aktuell)
2. **app.html** — Schadensgutachten-Wizard, häufigste Page
3. **dashboard.html** — Landing nach Login
4. **archiv.html** — Aufträge-Liste
5. **rechnungen.html** + **termine.html** + **einstellungen.html** — User-facing häufig
6. **freigabe.html** + **stellungnahme.html** — Workflow-Pages
7. **baubegleitung/beratung/wertgutachten/ortstermin-modus.html** — Flow B/C/D
8. **jveg/jahresbericht/normen/textbausteine/positionen/zpo-anzeige/hilfe.html** — selten genutzte Sidebar-Tools
9. **kontakte.html + briefvorlagen.html** — aus nav.js entfernen, statt migrieren
10. **app-login.html** — wird durch 301-Redirect erledigt (Block 2)
11. **account-gesperrt.html / effizienz.html / mahnung.html / stellungnahme-gate.html / stellungnahme-v3.1.html** — Tier GRAY, Marcel-Review (vermutlich deprecate ohne Migration)

**Geschätzter Aufwand pro Page (Migration auf `/lib/auth-guard.js`):**
- Standard-Page: 15-30 min (Script-Tags austauschen, Auth-Helper-Aufrufe in Logic-File anpassen)
- Page mit komplexer Auth-Logik (akte, app, freigabe): 30-60 min

**Tier A+B (~9 Pages):** ~4-6 h
**Tier C (~13 Pages):** ~3-4 h
**Tier D + Tier E:** ~2 h
**Total Migration:** ~9-12 h

---

## Marcel-Reviews benötigt

1. **Cluster 1 (Brief-Doppel-Pages):** ~28 Root-Pages + 28 briefe/-Subfolder-Pages — kann **alles** weg sobald Marcel "ja" sagt? K-UI/briefe.html ersetzt alle.
2. **Cluster 2 (formulare/+vorlage-XX):** sind das Goldstandard-Versionsreste oder noch lebende Workflow-Pages?
3. **Cluster 3 (Versions-Reste):** stellungnahme-v3.1, stellungnahme-gate, mahnung*.html, mahnwesen, effizienz — alle deprecate?
4. **Cluster 4 (~30 Workflow-Single-Pages):** welche sind noch live, welche tot?
5. **Cluster 7 (legal/-Subfolder):** entfernen (Root-Versionen kanonisch)?

Falls Marcel die Bestätigung gibt: 50-90 HTML-Pages können nach Cutover gelöscht werden → drastische Repo-Reduktion.

---

## Branch-Stand

`audit/cutover-page-inventory` (push folgt nach Commit dieses Files).
