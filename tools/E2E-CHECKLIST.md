# PROVA E2E Smoke Checklist

**Wichtig:** `e2e-smoke.ps1` ist **kein** Browser-E2E und **kein** Live-Test gegen Netlify/Airtable/Make. Es prüft nur, ob erwartete Strings/Dateien im Repo vorhanden sind. Echter Workflow-Test = Abschnitt 2 manuell (oder Playwright/Cypress separat).

## 1) Automatischer Wiring-Check

Im Projektroot ausfuehren:

`powershell -ExecutionPolicy Bypass -File .\tools\e2e-smoke.ps1`

Optional Seiten direkt im Browser oeffnen:

`powershell -ExecutionPolicy Bypass -File .\tools\e2e-smoke.ps1 -OpenBrowser`

Erwartung: `Result: PASS (nur statische Verkabelung - kein E2E-Browser)`

Nach jedem Lauf wird automatisch `tools/E2E-RESULT.md` geschrieben (Zeitstempel, alle Check-Zeilen, Platzhalter fuer manuelle PASS/FAIL).

## 2) Manueller Browser-Durchlauf (echter E2E)

### A. Dashboard
- `dashboard.html` oeffnen
- Keine JS-Fehler/White-Screen
- KPI-Kacheln werden angezeigt

### B. Akte
- `akte.html?az=E2E-001` oeffnen
- Alle 7 Tabs vorhanden und klickbar:
  - `📋 Überblick`
  - `📄 Gutachten`
  - `💶 Rechnung`
  - `📅 Termine`
  - `📧 Kommunikation`
  - `🗂️ Unterlagen`
  - `📝 Notizen`

### C. Akte-Links
- In Akte pruefen:
  - Termin-Button -> `termine.html?az=E2E-001`
  - Rechnung-Link -> `rechnungen.html?az=E2E-001`
  - Brief-Link -> `briefvorlagen.html?az=E2E-001`
  - Unterlagen-Link -> `nachforderung-unterlagen.html?az=E2E-001`

### D. Termine
- `termine.html?az=E2E-001` oeffnen
- Termin anlegen:
  - Typ `Abgabefrist`
  - Datum heute+3
  - Titel setzen
- Speichern
- Neuer Eintrag erscheint in Liste

### E. Import-Assistent
- `import-assistent.html` oeffnen
- CSV hochladen
- Mapping fuer Pflichtfelder sichtbar:
  - `Aktenzeichen`
  - `Auftraggeber_Name`
  - `Auftraggeber_Email`
  - `Schadensart`
  - `Objekt_Adresse`
  - `Status`
  - `Erstellt_Am`
- Vorschau zeigt 5 Zeilen
- Import starten zeigt Fortschritt `X von Y Faellen importiert`

### F. Freigabe
- `freigabe.html?fall=E2E-001` oeffnen
- Ohne Checkbox -> Validierungsfehler
- Ohne Auftraggeber-E-Mail -> Eingabeabfrage
- Nach Start: Polling bis max 120s, danach entweder:
  - Erfolgsstatus + PDF-Link, oder
  - Timeout-Fehler

### G. Rechnungen
- `rechnungen.html?az=E2E-001` oeffnen
- PDF-Generierung ausloesen
- Erwartet:
  - F1-Trigger
  - Bei Erfolg: Hinweis `PDF bereit`
  - Bei Fehler: klare Fallback-Meldung

### H. Onboarding
- `onboarding.html` bis letzter Schritt
- Abschluss ohne JS-Fehler
- Redirect zu Dashboard

### I. Navigation
- Drawer/BotNav pruefen:
  - `Widerspruch` vorhanden
  - `Jahresbericht` vorhanden
  - `Import` vorhanden (nur einmal)
  - `Hilfe & Support` vorhanden

## 3) Ergebnis-Protokoll (Template)

- Dashboard: PASS/FAIL
- Akte Tabs: PASS/FAIL
- Akte Links mit AZ: PASS/FAIL
- Termine Speichern: PASS/FAIL
- Import Mapping/Preview/Progress: PASS/FAIL
- Freigabe Validierung + Polling: PASS/FAIL
- Rechnungen F1 + Fallback: PASS/FAIL
- Onboarding L8 Trigger: PASS/FAIL
- Nav Eintraege: PASS/FAIL

