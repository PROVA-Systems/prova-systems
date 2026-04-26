# Legacy-Datenmigration

**Zweck:** Ein neuer SV hat Bestandsdaten aus seinem bisherigen System (Word-Gutachten-Vorlagen, Outlook-Kontakte, Excel-Rechnungen). Er soll diese **ohne manuellen Aufwand** nach PROVA bringen — sonst ist die Einstiegshürde zu hoch.

**Zeitpunkt:** Sprint 05 (Tag 5 im Masterplan)

---

## Import-Typen

### 1. Kontakte
**Quelle:** CSV-Export aus Outlook, Excel, anderes CRM  
**Ziel:** KONTAKTE-Tabelle in Airtable  
**Standardfelder im CSV:**
- Name (Pflicht)
- Firma
- Email
- Telefon
- Adresse
- Notizen
- Tags (comma-separated)

**Mapping-Assistent:**
- Preview der ersten 5 Zeilen
- SV mappt CSV-Spalten auf PROVA-Felder (mit intelligenten Defaults)
- Rolle optional: "Alle als Auftraggeber" / "Alle als Geschädigte" / "Später einzeln kategorisieren"

**Dedup:** Via Email-Match (wenn Email leer: via Name + Adresse)

---

### 2. Altfälle
**Quelle:** CSV mit Fall-Daten, optional PDF-Ordner mit Gutachten  
**Ziel:** SCHADENSFAELLE mit Status "archiviert"  

**Zwei Modi:**

**Modus A — Nur Meta-Daten-Import:**
Nur Fall-Daten aus CSV:
- AZ (Pflicht)
- Datum
- Auftraggeber
- Objekt-Adresse
- Schadenart
- Status (alle auf "archiviert" setzen)
- Honorar (für Jahresbericht-Statistik)

**Modus B — Mit PDF-Anhang:**
Wie Modus A + Bulk-PDF-Upload. Matching via Dateiname-Pattern `AZ_*.pdf` → PDF wird als Anhang an den Altfall geknüpft.

**Dedup:** Via AZ-Match.

---

### 3. Altrechnungen
**Quelle:** CSV aus Buchhaltungssoftware  
**Ziel:** RECHNUNGEN mit Status "bezahlt_historisch"  
**Zweck:** Jahresbericht zeigt korrekte Umsatz-Historie

**Felder:**
- Rechnungsnummer
- Datum
- Empfänger (Match zu Kontakte)
- Beträge (Netto, USt, Brutto)
- Zahlungsdatum
- Zugehöriger Fall (AZ, optional)

---

### 4. Altdokumente (Bulk-PDF-Upload)
**Quelle:** Ordner mit PDFs  
**Ziel:** Anhang an passende Altfälle  

**Matching-Strategien:**
1. **Dateiname-Pattern:** `SCH-2024-017_Gutachten.pdf` → Match zu Fall `SCH-2024-017`
2. **AZ-Erkennung aus PDF-Inhalt:** pdf-proxy extrahiert Text, findet AZ → Match
3. **Manuell:** SV weist einzeln zu, wenn kein Match

---

## Import-Workflow (UI)

```
1. Import-Assistent öffnen (Sidebar → Weitere Funktionen → Import)

2. Typ wählen:
   ○ Kontakte  ○ Altfälle  ○ Altrechnungen  ○ Altdokumente

3. Datei hochladen:
   [Drag & Drop CSV / ZIP / PDFs hier]

4. Preview:
   Tabelle mit den ersten 5 Zeilen
   Erkannte Struktur wird angezeigt
   SV korrigiert bei Bedarf

5. Feld-Mapping:
   CSV-Spalte  →  PROVA-Feld
   "Vorname"   →  Name (mit Nachname)
   "Email"     →  Email
   "Tel"       →  Telefon
   ...

6. Duplikat-Handling:
   ○ Skip    ○ Update    ○ Merge-Ask

7. Import starten:
   Progress-Bar
   Live-Log (Fehler sofort sichtbar)

8. Zusammenfassung:
   ✅ 47 importiert
   ⚠️ 3 Duplikate übersprungen
   ❌ 2 Fehler (Details anzeigen)
   
   [ Rollback möglich 24h lang ]
```

---

## Rollback-Fähigkeit

Nach jedem Import wird ein "Import-Batch" in Airtable angelegt:

**Tabelle IMPORT_BATCHES** (neu, oder in AUDIT_TRAIL):
- batch_id (UUID)
- sv_email
- typ (kontakte/faelle/rechnungen/dokumente)
- anzahl_records
- erstellt_am
- rollback_deadline (+24h)
- status (aktiv/zurückgerollt)

**Importierte Records bekommen:**
- `import_batch_id` → Link
- `import_datum` → Timestamp
- `import_quelle` → Dateiname

**Rollback-Button** in Import-Assistent zeigt letzten Batch. Klick → alle Records mit dieser batch_id werden gelöscht (wenn noch in 24h-Fenster).

---

## Edge-Cases

### Umlaute in CSV
Unterstützen: UTF-8 **und** ISO-8859-1 (Windows-Export aus älterer Software).  
Auto-Detect via BOM oder Encoding-Sniffing.

### Datumsformate
Akzeptieren:
- DD.MM.YYYY (deutscher Standard)
- YYYY-MM-DD (ISO)
- DD/MM/YYYY (US-Outlook-Export)

### Sehr große Imports (>1000 Zeilen)
- Batch-Upload in 50er-Blöcken
- Progress-Bar mit ETA
- Bei Abbruch: bereits importierte Records bleiben, Rest kann später nachgezogen werden

### Sonderzeichen in Namen
Harte Zeichen vermeiden (keine Backticks, keine Pipes). Ersetzen + loggen.

---

## Was NICHT importiert wird (out-of-scope)

- Word-Gutachten-Vorlagen (SV kann als Textbaustein manuell erfassen)
- Email-Archive (wäre eigenes Projekt)
- Rechnungs-Layout/Template (PROVA nutzt eigene Templates)
- Bank-Daten (manuell in Einstellungen eintragen)

---

## Testing

Marcel testet mit echten Testdaten (eigene Kontakte, eigene Altfälle falls vorhanden):

1. **50 Kontakte-CSV** → alle in KONTAKTE
2. **10 Altfälle-CSV** → alle in SCHADENSFAELLE als archiviert
3. **20 PDFs bulk** → Namens-Matching funktioniert
4. **Rollback-Test:** Import → Rollback → keine Restdaten

---

## Juristische Aspekte

**Datenverarbeitungs-Zustimmung beim Import:**
- Banner: "Die importierten Kontakte werden in Ihrem Account gespeichert. Sie sind verantwortlich für die datenschutzrechtliche Zulässigkeit (z.B. vorhandene Einwilligungen bei Privatpersonen)."
- Zustimmungs-Checkbox vor Import

**Datenminimierung (DSGVO Art. 5):**
- Nur importieren was wirklich gebraucht wird
- Keine "Alles-Importieren"-Haltung
- Import-Assistent zeigt was importiert würde → User kann abwählen

**Aufbewahrungsfristen beachten:**
- Importierte Altrechnungen: 10 Jahre (GoBD)
- Importierte Altfälle: 5 Jahre (JVEG-Empfehlung)
- Älteres: Hinweis einblenden "Diese Daten sind älter als die Aufbewahrungspflicht — bitte prüfen ob Import notwendig"

---

**Dieses Dokument ist Referenz für Sprint 05.**
