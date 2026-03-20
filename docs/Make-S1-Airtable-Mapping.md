# Make.com S1 → Airtable Feld-Mapping

**Base-ID:** `appJ7bLlAHZoxENWE`  
**Tabelle:** SCHADENSFAELLE (`tblSxV8bsXwd1pwa0`)

Im Make.com-Szenario S1 (Webhook → Airtable Create Record) folgende Felder aus dem Webhook-Payload in Airtable mappen:

| Airtable-Feld (Name)     | Airtable-Feld-ID      | Webhook-Payload (von app-starter/pro/enterprise) |
|--------------------------|------------------------|-------------------------------------------------|
| Zeiterfassung_Start       | fldG8i55Fvc76U4vU     | `{{1.zeiterfassung_start}}`                     |
| Zeiterfassung_Schritt2   | fldXFwE6pX6A1Y8K4    | `{{1.zeiterfassung_schritt2}}`                  |
| Zeiterfassung_Schritt3   | fldlwlTfHCAsjBJL7    | `{{1.zeiterfassung_schritt3}}`                  |
| Bearbeitungszeit_Min     | fldexEdaixneFZMtH    | `{{1.dauer_gesamt_minuten}}`                    |
| Erstellungszeit_Sekunden | fldgkMOHTEfrANqGj    | `{{1.dauer_gesamt_sekunden}}`                   |

Die Frontend-Apps senden diese Werte bereits im S1-Webhook-Payload; S1 muss sie nur ins Airtable Create-Record-Modul übernehmen.

**Gutachten-Vorlage:**  
Feld `gutachten_vorlage_id` (bzw. Airtable-Feld fldVIe0dqMba0bUVu) wird aus dem Payload übernommen und in SCHADENSFAELLE gespeichert (für S3/PDFMonkey-Template-Auswahl und Auswertung).
