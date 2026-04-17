# PROVA SESSION 2 — KOMPLETT-LIEFERUNG
**Datum:** 17. April 2026
**Umfang:** 18 Fixes (Session 1 + 2 konsolidiert), 45 Dateien, 4 Scripts
**Dies ist die vollständige Lieferung** — enthält alle Session-1-Fixes + alle Session-2-Fixes.

---

## A. Kurzfassung

**Session 2 hat 10 neue Fixes gebracht, davon drei mit massivem Impact:**

1. **`returnFieldsByFieldId=true`** in `netlify/functions/normen.js` — Root Cause für leere Norm-Karten und für „DIN 4109 wird nicht gefunden". Ein Einzeiler mit riesigem Effekt, läuft seit Wochen falsch.

2. **Design-Drift-Autofix** — 22 HTML-Dateien auf einen Schlag vereinheitlicht, 117 inline-`#fff`/`#e5e7eb`/`#0b1628`-Werte durch zentrale Tokens ersetzt. Die „weiße Kartenflecken"-Beschwerde aus Screenshot 4 ist strukturell zu.

3. **Normen-Sync-Script** — einmalig lokal ausführen und Airtable hat garantiert alle 264 Fallback-Normen statt heute 120. Lücke strukturell geschlossen.

---

## B. Lieferumfang pro Fix

| # | Fix | Files | Session |
|---|---|---|---|
| 1 | Webhook-URLs Frontend → Proxy | `app-starter.html`, `app-enterprise.html`, `netlify/functions/make-proxy.js` | 1 |
| 2 | freigabe-logic SV_Email-Bug | `freigabe-logic.js` | 1 |
| 3 | onboarding Solo/Team Preise | `onboarding.html` | 1 |
| 4 | prova-check HTML-Scan | `prova-check.sh` | 1 |
| 5 | prova-design.css Tokens + Elevation | `prova-design.css`, `dashboard.html`, `freigabe.html` | 1 |
| 6 | global-search Prefix + Multi-Source | `global-search.js` | 1 |
| 7 | baubegleitung.html Dark-Theme | `baubegleitung.html` | 1 |
| 8 | Tote-Buttons-Audit | `scripts/audit-tote-buttons.py` (NEU), `prova-check.sh` | 1 |
| 9 | `--content-pad` Sidebar-Abstände | `prova-design.css`, `freigabe.html`, `kontakte.html` | 1 |
| A | **normen.js `returnFieldsByFieldId=true`** 🔴 | `netlify/functions/normen.js` | 2 |
| 10 | import-assistent Sidebar | `import-assistent.html` | 2 |
| 11 | Global-Search → Norm-Deeplink | `global-search.js`, `normen-logic.js` | 2 |
| 12 | mahnwesen Script-Einbindung + Empty-State | `mahnwesen.html` | 2 |
| 13 | Design-Drift-Audit-Script | `scripts/audit-design-drift.py` (NEU) | 2 |
| 14 | **Design-Drift-Autofix** | `scripts/fix-design-drift.py` (NEU) + 22 HTMLs | 2 |
| 15 | Admin-Dashboard KI-Stats + Funnel + Preise | `admin-dashboard.html`, `admin-dashboard-logic.js` | 2 |
| 16 | Hilfe-Seite Shortcuts + Fehlercodes | `hilfe.html` | 2 |
| 17 | **Normen-Sync-Script** | `scripts/sync-normen.js` (NEU) | 2 |
| 18 | sw.js Cache-Bump → v135 | `sw.js` | 2 |

---

## C. Deploy-Schritte

1. **ZIP auspacken** ins Repo, alle Pfade 1:1 überschreiben/ergänzen.
2. **Git commit** mit Message:  `"Session 1+2: 18 Fixes — Design-Konsistenz, Normen-Bug, Search-Multi-Source, Admin-Dashboard"`.
3. **Git push** → Netlify Auto-Deploy.
4. `prova-check.sh` läuft als Build-Gate, inkrementiert `sw.js` CACHE_VERSION zusätzlich automatisch → landet bei v136 live.

---

## D. Marcel-Actions (manuell, einmalig)

### D.1 — Netlify ENV (pflicht)

```
MAKE_WEBHOOK_S9 = https://hook.eu1.make.com/bslfuqmlud1vo8qems5ccn5z5f2eq4dl
```

Falls nicht schon aus Session 1 gesetzt.

### D.2 — Normen-Sync lokal ausführen (pflicht für volle DB)

```bash
# im Repo-Root, mit AIRTABLE_PAT aus Netlify-ENV
cd prova-systems
AIRTABLE_PAT=patXXXX... node scripts/sync-normen.js          # Dry-Run zuerst
AIRTABLE_PAT=patXXXX... node scripts/sync-normen.js --apply  # anwenden
```

Erwartetes Ergebnis: ~144 neue Normen werden in Airtable NORMEN-Tabelle angelegt, ~120 bestehende werden auf `Aktiv=true` gesetzt. Nach Run: Global Search findet alle 264 DIN/VOB/WTA-Normen.

### D.3 — Audit-Scripts kennen (optional, empfohlen)

```bash
# Zeigt inkonsistente CSS-Werte auf Layout-Klassen
python3 scripts/audit-design-drift.py

# Wendet bekannte Drift-Mappings auf alle HTMLs an
python3 scripts/fix-design-drift.py           # Dry-Run
python3 scripts/fix-design-drift.py --apply   # ausführen

# Findet Buttons ohne Event-Handler
python3 scripts/audit-tote-buttons.py

# Syncht Fallback-Normen nach Airtable
node scripts/sync-normen.js                   # Dry-Run
node scripts/sync-normen.js --apply           # ausführen
```

---

## E. Was jeder Session-2-Fix konkret macht

### Fix A — normen.js `returnFieldsByFieldId=true` 🔴 **Root Cause**

**Symptom:** Normen-Karten auf normen.html komplett leer (Bild 2), Global Search findet „DIN 4109" nicht obwohl sie da ist.

**Ursache:** `netlify/functions/normen.js` baute die Airtable-URL mit `fields[]=fldXXXX` (Feld-IDs), ohne aber `returnFieldsByFieldId=true` zu setzen. Airtable liefert in diesem Fall die Response-Keys als **Feldnamen** zurück (`fields: { 'Norm-Nummer': 'DIN 4108-2', ... }`), aber die Mapper-Funktion las `f[fieldId]` → `f['fldyeReuP8JN2ysfX']` → immer `undefined`. Ergebnis: 120 Records mit allen Feldern leer.

**Fix:** `&returnFieldsByFieldId=true` in URL ergänzt. Jetzt passt Feld-ID-Lookup zum Response-Schema.

### Fix 10 — import-assistent.html Sidebar

**Symptom:** Bild 3 zeigt die Seite ohne Sidebar, nur Content-Spalte.

**Ursache:** `<div class="app-shell"><div class="main">` direkt ohne `<nav class="sidebar">`-Element. nav.js findet keinen Einhänge-Punkt.

**Fix:** `<nav class="sidebar" id="sidebar"></nav>` + `<div class="sb-overlay">` ergänzt.

### Fix 11 — Global Search Deeplink + normen.html `?q=`

**Symptom:** Klick auf Norm-Treffer in der Suche landet auf normen.html ohne Filter, man muss dort nochmal tippen.

**Fix:** `global-search.js` generiert jetzt `normen.html?q=DIN%204108`. `normen-logic.js` liest den `?q=`-Parameter nach dem Laden der Normen und setzt automatisch das Suchfeld + rendert die Ergebnisse.

### Fix 12 — mahnwesen.html

**Symptom:** Bild 5 zeigt leere Tabellen-Spalten, komplett leer.

**Ursache:** `mahnwesen-logic.js` existiert im Repo, wird aber **nicht per `<script src>` eingebunden**. Inline-Code ruft `api.loadOpenFromAirtable()` auf, aber die API wurde nie registriert.

**Fix:** `<script src="mahnwesen-logic.js"></script>` ergänzt. Zusätzlich: Empty-State als freundliches Panel mit Icon + CTA statt nacktem Text.

### Fix 13 — Design-Drift-Audit-Script

Neues Tool `scripts/audit-design-drift.py`. Scannt alle inline `<style>`-Blöcke, listet für `.card`, `.form-section`, `.kpi`, `.panel` alle unterschiedlichen Werte für `background`, `border`, `border-radius`, `padding`, `box-shadow` auf. Zeigt pro Wert auf welchen Seiten er benutzt wird.

Ergebnis vorher: **`.card background` hatte 11 verschiedene Werte**, davon `#fff` (weiß!) auf **32 Seiten**.

### Fix 14 — Design-Drift-Autofix (MASSIV)

Neues Tool `scripts/fix-design-drift.py`. Ersetzt automatisch in HTMLs innerhalb von Target-Selektoren (`.card`, `.form-section`, etc.):
- `#fff` → `var(--surface)`
- `#e5e7eb` → `var(--border)`
- `#0b1628` → `var(--bg3)`
- `0 1px 4px rgba(0,0,0,.06)` → `var(--shadow-sm)`

Schutz vor false-positives: Läuft nur in CSS-Rules, deren Selektor eine Ziel-Klasse matcht. Button-`color:#fff` bleibt unberührt.

**Ergebnis: 22 Files, 117 Ersetzungen.** Die Seiten aus Bild 4 (erechnung, freigabe, jahresbericht + 19 weitere) haben jetzt dieselbe Card-Sprache wie Dashboard und Mahnwesen.

### Fix 15 — Admin-Dashboard Erweiterung

Neuer Tab „KI & Workflow":

- **4 KI-KPIs**: Calls/7d, Tokens/7d, Ø Bearbeitungsdauer, Hallu-Rate
- **Workflow-Funnel**: horizontale Balken für Status-Verteilung (Entwurf → KI-Entwurf → In Freigabe → Freigegeben → Versendet → Abgeschlossen → Bezahlt)
- **Top-Nutzer-Liste**: Top 10 SVs nach KI-Calls der letzten 7 Tage

Zusätzlich: MRR-Kalkulation auf kanonisch Solo 149 € / Team 279 € korrigiert (vorher `Team:349`, `Starter:149`, `Pro:149`, `Enterprise:349` — alte Pakete).

### Fix 16 — Hilfe-Seite Ausbau

- Neue Sektion **„Tastenkürzel"** mit 8 Shortcuts (Cmd+K, Esc, Pfeile, Leertaste, Strg+S, Strg+Enter, Strg+F5)
- Neue Sektion **„Fehlercodes & Lösungen"** mit 7 Codes (SMTP_NOT_CONFIGURED, NO_PDFMONKEY, HTTP 429, 401, Webhook nicht konfiguriert, AIRTABLE_PAT fehlt, Rate-Limit)
- Changelog-Eintrag für April 2026 (aktualisiert)

### Fix 17 — Normen-Sync-Script

`scripts/sync-normen.js`: Extrahiert die 264 Einträge aus `NORMEN_DB_FALLBACK` (in `normen-logic.js`) per JS-eval, lädt alle existierenden Normen aus Airtable, vergleicht per `{Norm-Nummer}`. Legt fehlende Normen an (~144 neue), updated bestehende auf `Aktiv=true`.

Sicherheit: Rate-Limit 4 Batches/s, Batch-Size 10 (Airtable-Limit), Dry-Run als Default, explizites `--apply` für Schreiben.

### Fix 18 — sw.js Cache-Bump

`CACHE_NAME = 'prova-v135'` (vorher v134). Browser laden geänderte Files frisch.

---

## F. Build-Gate-Status

Alle Checks grün mit 1 Info-Warnung (Tote-Buttons-Audit, kein Blocker):

```
✅ Syntax-Check (156 Dateien)
✅ Browser-Kompatibilität (kein optional chaining in Frontend)
✅ sw.js Cache-Version → auto-increment v135 → v136 im Build
✅ Kritische Dateien vorhanden
✅ Kein CORS Wildcard
✅ Keine Webhook-URLs im Frontend (JS + HTML geprüft)
✅ Multi-Tenant-Filter aktiv
✅ Kein Klartext-SMTP-Passwort
⚠️  19 potentiell tote Buttons (Mehrheit Demo-Content in app-enterprise.html)
```

---

## G. Offene Punkte für Session 3

### Kernfunktionen & KI

1. **E2E-Test Core-Workflow** — noch nie vollständig getestet: Diktat → G1 → KI-Entwurf → Freigabe → PDF → E-Mail → Rechnung → Zahlung. Ohne validierten Kassenkreislauf starten die Founding Members in ein Risiko.
2. **Make T3** (Gmail-Connection) und **F1** aktivieren.
3. **`STRIPE_WEBHOOK_SECRET`** aktualisieren nach Stripe-Registrierung.
4. **Notification-Bell in dashboard.html 🔔** — einziger echter toter Button aus Audit.

### Markt-Readiness (von dir gefragt)

Was potenziell noch fehlt für „Marktführer" im SV-Bausoftware-Segment:
- **Mandanten-Portal** (Auftraggeber-Login für Freigaben)
- **Native iOS/Android-App** (heute PWA — reicht oft, aber nicht für Offline-Vor-Ort-Einsatz)
- **Versicherungs-Standard-Schnittstellen** (FNOL/BiPRO zu HUK, Allianz etc.)
- **DATEV-Direkt-Schnittstelle** (heute nur CSV-Export)
- **Terminvereinbarungs-Portal** für Mandanten (Calendly-artig)

### Admin-Dashboard-Erweiterungen

- **Churn-Funnel** (Trial → Solo → Team vs. Trial → Abbruch)
- **Active Users today/week/month**
- **Support-Kategorie-Verteilung** (welche Fragen sind häufigst?)
- **Deployment-History** (welche Version läuft seit wann?)

### Weitere Design-Verdichtung

Der Autofix hat nur `.card`-Familie angefasst. Weitere potenzielle Targets:
- `.modal` / `.modal-box` — hatten wir noch nicht systematisch geprüft
- `.btn-primary` / `.btn-sm` — Button-Konsistenz
- `.form-row` / `.form-grid` — Formular-Layouts

Wenn du das in Session 3 willst: Audit-Script liefert schon die Drift-Zahlen.

### Normen-Datenpflege

Nach `sync-normen.js --apply` sollten 264 Normen in Airtable stehen. Danach:
- Regelmäßiger automatischer Sync (Netlify Scheduled Function 1× täglich?)
- Neue Normen zuerst in Fallback-DB, dann per Sync nach Airtable — damit Offline-Fallback immer mindestens so gut ist wie Produktiv-DB.

### Support-Ausbau

Heute: FAQ, Ticket-Form, Floating Chat-Widget. Potenzial:
- **Video-Tutorials** (Screen-Casts für erste 10 Gutachten-Schritte)
- **Status-Seite** (OpenAI/PDFMonkey/Airtable-Gesundheit live)
- **In-App-Tour** (erster Login → 3-Minuten-Walkthrough)

---

## H. Was nicht getan wurde (bewusst)

- **Keine globalen `!important`-Regeln** in prova-design.css eingeführt — saubere Kaskade bleibt.
- **Keine neuen Dateinamen.** Alle 45 Pfade identisch mit Repo.
- **Keine Topbar-Einführung.** Sidebar-Layout unverändert.
- **Keine Massen-Patches in HTMLs** außer dem kontrollierten Drift-Autofix (22 Files, nur Card-Familie).
- **KI_LERNPOOL-Schema** nicht final definiert — Hallu-Rate im Admin-Dashboard ist Platzhalter-Logik, funktioniert wenn die Tabelle entsprechende Typ-Einträge bekommt.

---

## I. Anker für Session 3

Wenn du Session 3 startest, beginne mit:

1. Diese Session-2-Lieferung ist deployed?
2. `node scripts/sync-normen.js --apply` wurde ausgeführt? (Airtable = 264 Normen)
3. `MAKE_WEBHOOK_S9` ist in Netlify ENV gesetzt?

Dann freigabe → Kernfunktionen + KI.

---

*Erstellt: 17. April 2026 · PROVA Session 1+2 konsolidiert · Marcel + Claude Co-Founder*
