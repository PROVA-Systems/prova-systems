# Test-Checkliste: app-starter.html → S1 → Airtable

## Voraussetzungen
- Netlify: `AIRTABLE_TOKEN` gesetzt (Secret, Functions-Scope)
- Make.com S1: Webhook empfängt Payload, Airtable Create Record mit allen Zeitfeldern + `gutachten_vorlage_id` gemappt
- Lokal: z.B. `npx netlify dev` oder deployte URL

---

## 1. Whitelist (bereits bestätigt)
- [x] `netlify/functions/airtable.js`: **tbladqEQT3tmx4DIB** (SACHVERSTAENDIGE) ist in `ALLOWED_TABLE_IDS` → SV-Profil lädt über Proxy

---

## 2. Ablauf Test

### 2.1 Vor dem Test
- Browser: DevTools öffnen (F12) → Tab **Console**
- Optional: Tab **Network** → Filter „Fetch/XHR“, um den Request zu `hook.eu1.make.com` zu sehen

### 2.2 SV-Profil (ladeSVProfil)
1. Auf **app-starter.html** gehen (Startseite / Neues Gutachten).
2. SV-E-Mail eintragen (eine E-Mail, die in Airtable SACHVERSTAENDIGE existiert) und speichern/laden.
3. In der **Console** prüfen:
   - Kein Fehler 403 von `/.netlify/functions/airtable`.
   - Optional: `window.SV_PROFIL` und `window.SV_RECORD_ID` ausgeben (z.B. `console.log(window.SV_PROFIL)`).
4. **Ergebnis:** [ ] SV-Daten werden geladen (kein 403, Daten sichtbar)

### 2.3 Formular + Analyse starten
1. **Schritt 1:** Formular ausfüllen (mind. Schadensart, Auftraggeber, Adresse/PLZ/Ort, Aktenzeichen/Schadensnummer).
2. **Weiter zu Schritt 2** → Diktat einsprechen oder Text eingeben.
3. **Analyse starten** klicken (Webhook S1 wird ausgelöst).
4. Warten bis „Entwurf erfolgreich erstellt“ erscheint.

### 2.4 Airtable SCHADENSFAELLE
1. In Airtable Base **appJ7bLlAHZoxENWE** → Tabelle **SCHADENSFAELLE** den **neuesten Record** öffnen.
2. Prüfen, welche Felder befüllt sind (S1 mappt die Webhook-Keys auf Airtable-Felder).

**Erwartete Payload-Keys (von app-starter):**
- Stammdaten: `schadenart`, `schadensnummer`, `schadensdatum`, `auftraggeber_typ`, `auftraggeber_name`, `ansprechpartner`, `auftraggeber_email`, `strasse`, `plz`, `ort`, `gebaeudetyp`, `baujahr`, `geschaedigter`, `bereich`, …
- Inhalt: `transkript`, `timestamp`, `fotos_anzahl`, `fotos` (Array)
- Zeiterfassung: `zeiterfassung_start`, `zeiterfassung_schritt2`, `zeiterfassung_schritt3`, `dauer_gesamt_minuten`, `dauer_gesamt_sekunden`
- Vorlage: `gutachten_vorlage_id`

**In der Tabelle prüfen (bitte ankreuzen / kurze Notiz):**

| Airtable-Feld (oder Sinn)     | Erwarteter Webhook-Key        | Landet korrekt? (ja/nein/leer) |
|-------------------------------|-------------------------------|--------------------------------|
| Schadensart                   | schadenart                    |                                |
| Schadensnummer / Aktenzeichen | schadensnummer               |                                |
| Adresse (Strasse, PLZ, Ort)   | strasse, plz, ort             |                                |
| Auftraggeber                  | auftraggeber_name, typ        |                                |
| Transkript / Inhalt           | transkript                    |                                |
| Timestamp                     | timestamp                     |                                |
| Zeiterfassung_Start           | zeiterfassung_start           |                                |
| Zeiterfassung_Schritt2        | zeiterfassung_schritt2        |                                |
| Zeiterfassung_Schritt3        | zeiterfassung_schritt3        |                                |
| Bearbeitungszeit_Min          | dauer_gesamt_minuten          |                                |
| Erstellungszeit_Sekunden      | dauer_gesamt_sekunden         |                                |
| gutachten_vorlage_id          | gutachten_vorlage_id          |                                |

### 2.5 E-Mail
- [ ] Gmail-Bestätigung (Eingangsbestätigung) erhalten (Zeitpunkt: ___________)

---

## 3. Rückmeldung (Copy & Paste)

**SV-Profil (ladeSVProfil):**  
- Lädt ohne 403? ja / nein  
- Fehlermeldung (falls nein): ___________________________

**Airtable – welche Felder landen korrekt?**  
- Liste der Felder, die **korrekt** befüllt sind:  
- Liste der Felder, die **fehlen oder falsch** sind:  

**E-Mail:**  
- Bestätigung erhalten? ja / nein  

**Sonstige Fehler (Console/Network):**  
- (z.B. 403, 500, CORS, fehlende Felder im Make-Szenario)
