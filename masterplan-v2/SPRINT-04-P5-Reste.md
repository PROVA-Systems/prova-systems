# SPRINT 04 — P5 Reste + Seiten-Audit-Fixes

**Tag:** 4 · **Aufwand:** 4-5h · **Phase:** A Security-Fundament

---

## Ziel
Alle offenen Security-Findings geschlossen + die drei bekannten Seiten-Bugs gefixt + Function-Duplikate gelöscht + Playwright-Suite 100% grün.

---

## Scope

### Security-Reste
- **Finding 5.1:** DOC_TYPE_MAP echte Tabellen-IDs in pdf-proxy.js
- **Finding 1.6:** Client-Helper Defense-in-Depth (Sanitize beim Rendern)
- **Finding 6.2:** Brief-Templates HTML-Sanitization (alle Variablen escapen)
- **Finding 4.5:** Function-Duplikate löschen (siehe docs/FUNCTION-DUPLIKATE.md von P2.4)
  - ki-statistik.js (zwei Versionen)
  - mahnung-pdf.js (zwei Versionen)
  - team-interest.js (zwei Versionen)
  - prova-sv-airtable.js (zwei Versionen)

### Bugs
- **prova-context.js:** RECHNUNGEN-Query 422 — Feldname "Status" stimmt nicht, korrigieren
- **onboarding-tour.js:168:** TypeError Null-Check für currentStep
- **import-assistent-logic.js:** Schreibt heute in localStorage statt Airtable — kompletter Rewrite folgt in Sprint 5, hier nur Bug-Marker
- **bescheinigungen.html:** Sidebar-Link entfernen, Seite löschen oder als 410 umleiten
- **jahresbericht.html:** Halbkaputt — Date-Range-Bug, fix
- **Unklar-Tabellen-IDs:** `tbli4t2WDLeBfuBB2` und `tblaboaRkJjrX3Z4J` — entweder Alias hinzufügen oder Code entfernen

### Tests
- **Playwright-Suite 100% grün** machen
- AUDIT-REPORT.md aktualisieren — alle 36 Findings durchgehen, Status setzen

---

## Prompt für Claude Code

```
PROVA Sprint 04 — P5 Reste + Seiten-Bugs (Tag 4)

Pflicht-Lektüre vor Start:
- CLAUDE.md
- AUDIT-REPORT.md (alle Findings, vor allem 1.6, 4.5, 5.1, 6.2)
- docs/FUNCTION-DUPLIKATE.md (aus P2.4)
- tests/*.spec.js (Playwright-Suite)


SCOPE-BLÖCKE
============

Block A — Security-Reste

A1: pdf-proxy.js DOC_TYPE_MAP echte Tabellen-IDs
- Heute: hardcoded Mock-IDs
- Neu: aus airtable.js TABLE_NAME_MAP importieren oder spiegeln
- Mapping: 'gutachten' -> SCHADENSFAELLE, 'rechnung' -> RECHNUNGEN, etc.

A2: prova-sanitize.js in Render-Stellen
- Alle innerHTML-Setzungen mit User-Daten escapen
- Hotspots: dashboard-render-faelle.js, akte-render.js (falls existent), 
  kontakte-logic.js, briefvorlagen-logic.js
- Helper window.PROVA_SANITIZE.escape(str)

A3: Brief-Templates HTML-Sanitize
- briefvorlagen-logic.js: alle {{var}}-Substitutionen escapen
- Bei reinem Text: escape pflicht
- Bei bewusst-HTML (z.B. <br> für Zeilenumbruch): allowlist nur <br>, <strong>, <em>

A4: Function-Duplikate löschen
- docs/FUNCTION-DUPLIKATE.md durchgehen
- Pro Duplikat: ältere Version löschen (per git history identifizieren)
- README oder docs/ARCHITEKTUR.md aktualisieren

Block B — Bekannte Bugs

B1: prova-context.js RECHNUNGEN-422
- grep -n "RECHNUNGEN" prova-context.js
- Feldname-Mismatch finden (vermutlich "Status" vs. "status")
- In Airtable schauen: korrekter Feldname
- Code anpassen

B2: onboarding-tour.js:168 Null-Check
- view file:line
- if (currentStep && currentStep.x) statt direktem Zugriff

B3: bescheinigungen.html
- Sidebar-Link in nav.js auskommentieren oder entfernen
- bescheinigungen.html aus Repo löschen
- Falls existiert: Redirect zu dashboard.html in netlify.toml

B4: jahresbericht.html Date-Range-Bug
- Browser-Test reproduzieren: was geht kaputt?
- Wahrscheinlich JavaScript-Date-Parse-Issue mit deutschen Datumsformaten
- Fix mit korrekter Date-Lib

B5: Unklar-Tabellen tbli4t2WDLeBfuBB2 und tblaboaRkJjrX3Z4J
- grep -rn "tbli4t2\|tblaboaR" *.js
- Entweder als TODO-Tabellen-Aliase ergänzen oder Code entfernen
- An Marcel rückfragen wenn unklar

Block C — Tests

C1: Playwright-Suite reparieren
- Alle tests/*.spec.js durchlaufen
- Failure-Tests fixen (durch Sprint 1-3 Änderungen evtl. defekt)
- Vor allem 01-login.spec.js (HMAC-Token-Workflow!)

C2: AUDIT-REPORT.md aktualisieren
- Alle 36 Findings durchgehen
- Status setzen: ✅ erledigt | 🟡 dokumentiert akzeptiert | 🔴 später
- Kommentar pro Finding mit Sprint-Tag

Block D — sw.js v207


QUALITÄTSKRITERIEN
==================
- Playwright komplett grün, kein einziger Fehler
- Alle Findings mit Status (kein "in progress")
- Keine Function-Duplikate mehr
- Defekte Seiten entweder gefixt oder entfernt


COMMITS
=======
"P5.A1: pdf-proxy DOC_TYPE_MAP echte IDs (Finding 5.1)"
"P5.A2: prova-sanitize Defense-in-Depth in Render-Stellen (Finding 1.6)"
"P5.A3: Brief-Templates HTML-Sanitize (Finding 6.2)"
"P5.A4: Function-Duplikate gelöscht (Finding 4.5)"
"P5.B1: prova-context RECHNUNGEN-422 Feldname"
"P5.B2: onboarding-tour Null-Check"
"P5.B3: bescheinigungen.html entfernt + Sidebar-Link weg"
"P5.B4: jahresbericht Date-Range-Bug"
"P5.B5: Unklar-Tabellen geklärt"
"P5.C1: Playwright-Suite grün"
"P5.C2: AUDIT-REPORT.md alle Findings Status gesetzt"
"P5.D: sw.js v207"


TAG: v180-ssicher-p5-done
```

---

## Marcel-Browser-Test (10 Min)

1. Dashboard → Sidebar: kein "Bescheinigungen"-Link mehr
2. Jahresbericht öffnen → funktioniert (kein Bug)
3. Onboarding-Tour als neuer User → kein TypeError in Console
4. RECHNUNGEN-Widget im Dashboard zeigt korrekte Daten (kein 422 in Network)
5. Briefvorlagen: variable mit `<script>` testen → wird escaped, nicht ausgeführt
