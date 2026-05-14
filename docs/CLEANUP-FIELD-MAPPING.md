# Field-Mapping: Airtable → Supabase

**Stand:** 2026-05-14 (MEGA⁷² Phase A)
**Quelle:** `supabase-migrations/02_schema_kerngeschaeft.sql` + `2026_05_07_mega30_a2_auftraege_auftraggeber.sql` + Marcel-Vorgabe
**Konvention:** Lese-Pfade in Frontend-Code referenzieren dieses Mapping.

> **Pattern:** Wo möglich, **defensiver Fallback** während Migration:
> ```js
> const adresse = row?.objekt?.adresse || row?.Schaden_Strasse || '—';
> ```

---

## Tabelle `auftraege`

| Airtable-Feld (alt) | Supabase-Column (neu) | JS-Access | Hinweis |
|---|---|---|---|
| `Aktenzeichen` | `az` | `row.az` | text |
| `Titel` | `titel` | `row.titel` | text |
| `Fragestellung` | `fragestellung` | `row.fragestellung` | text |
| `Schadenart` / `Schadensart` | `schadensart_label` | `row.schadensart_label` | text |
| `Schadenskategorie` | `schadensart_kategorie` | `row.schadensart_kategorie` | text |
| `Schadensdatum` | `schadensstichtag` | `row.schadensstichtag` | date |
| `Auftragsdatum` | `auftragsdatum` | `row.auftragsdatum` | date |
| `Gutachtendatum` | `gutachtendatum` | `row.gutachtendatum` | date |
| `Status` | `status` | `row.status` | enum: entwurf/aktiv/abgeschlossen/archiv/storniert |
| `Zweck` | `zweck` | `row.zweck` | enum: privat/gericht/versicherung/... |
| `Phase` / `phase_aktuell` | `phase_aktuell` | `row.phase_aktuell` | int |
| `Phase_Max` | `phase_max` | `row.phase_max` | int |
| `Typ` | `typ` | `row.typ` | enum: schaden/wertgutachten/beratung/baubegleitung/... |
| `Schaden_Strasse` | `objekt->>'adresse'` | `row.objekt?.adresse` | jsonb-path (Schema-Konvention: 'adresse' = Straße+Hausnr kombiniert) |
| `Schaden_PLZ` | `objekt->>'plz'` | `row.objekt?.plz` | jsonb-path |
| `Schaden_Ort` | `objekt->>'ort'` | `row.objekt?.ort` | jsonb-path |
| `Schaden_Land` | `objekt->>'land'` | `row.objekt?.land` | jsonb-path |
| `Adresse` (kombiniert) | `objekt->>'adresse'` | `row.objekt?.adresse` | identisch zu Schaden_Strasse-Mapping |
| `Gebaeudetyp` / `Objektart` | `objekt->>'objektart'` | `row.objekt?.objektart` | jsonb-path: einfamilienhaus/mehrfamilienhaus/... |
| `Objektart_Label` | `objekt->>'objektart_label'` | `row.objekt?.objektart_label` | jsonb-path |
| `Baujahr` | `objekt->>'baujahr'` | `row.objekt?.baujahr` | jsonb (int) |
| `Wohnflaeche` | `objekt->>'wohnflaeche'` | `row.objekt?.wohnflaeche` | jsonb (number) |
| `Grundstuecksflaeche` | `objekt->>'grundstuecksflaeche'` | `row.objekt?.grundstuecksflaeche` | jsonb (number) |
| `Bauweise` | `objekt->>'bauweise'` | `row.objekt?.bauweise` | jsonb-path |
| `Schadensort` | `objekt->>'schadensort'` | `row.objekt?.schadensort` | jsonb-path |
| `Geo_Lat` / `Geo_Lng` | `objekt->>'geo_lat'` / `'geo_lng'` | `row.objekt?.geo_lat` etc. | jsonb |
| `Auftraggeber_Name` | `details->'auftraggeber'->>'name'` | `row.details?.auftraggeber?.name` | jsonb-path |
| `Auftraggeber_Typ` | `auftraggeber_typ` | `row.auftraggeber_typ` | **enum** (s. Mapping-Tabelle unten) |
| `Auftraggeber_Typ_Label` | `details->'auftraggeber'->>'typ_label'` | `row.details?.auftraggeber?.typ_label` | jsonb-path (UI-Label) |
| `Auftraggeber_Kontakt_Id` | `auftraggeber_kontakt_id` | `row.auftraggeber_kontakt_id` | uuid FK kontakte |
| `Ortstermin_Datum` | `details->>'ortstermin_datum'` | `row.details?.ortstermin_datum` | jsonb-path |
| `Beweisfragen` | `details->>'beweisfragen'` | `row.details?.beweisfragen` | jsonb-path |
| `KI_Entwurf` / `Fachurteil` | `fachurteil_text` | `row.fachurteil_text` | text (echte Column) |
| `Fachurteil_Eigenleistung_Chars` | `fachurteil_eigenleistung_chars` | `row.fachurteil_eigenleistung_chars` | int |
| `Kurzbeantwortung` | `kurzbeantwortung` | `row.kurzbeantwortung` | text |
| `Grenzen_Sachkunde` | `grenzen_sachkunde` | `row.grenzen_sachkunde` | text |
| `Kosten_Netto` | `kosten_geschaetzt_netto` | `row.kosten_geschaetzt_netto` | numeric |
| `Kosten_Brutto` | `kosten_geschaetzt_brutto` | `row.kosten_geschaetzt_brutto` | numeric |
| `Kosten_Summe_Label` | `kosten_summe_card_label` | `row.kosten_summe_card_label` | text |
| `KI_Anzeige_Datum` | `ki_anzeige_datum` | `row.ki_anzeige_datum` | date |
| `KI_Anzeige_Empfaenger` | `ki_anzeige_empfaenger` | `row.ki_anzeige_empfaenger` | text |
| `KI_Tasks` | `ki_tasks` | `row.ki_tasks` | jsonb |
| `Umfang_Seiten` | `umfang_seiten` | `row.umfang_seiten` | int |
| `Umfang_Anlagen` | `umfang_anlagen` | `row.umfang_anlagen` | int |
| `Umfang_Fotos` | `umfang_fotos` | `row.umfang_fotos` | int |
| `Hilfskraefte` | `hilfskraefte` | `row.hilfskraefte` | jsonb |
| `Tags` | `tags` | `row.tags` | text[] |
| `Is_Template` | `is_template` | `row.is_template` | bool |
| `Is_Demo` | `is_demo` | `row.is_demo` | bool |
| `Parent_Auftrag_Id` | `parent_auftrag_id` | `row.parent_auftrag_id` | uuid FK |
| `Vorlage_Id` | `vorlage_id` | `row.vorlage_id` | uuid FK |
| `Created_At` / `Timestamp` | `created_at` | `row.created_at` | timestamptz |
| `Updated_At` | `updated_at` | `row.updated_at` | timestamptz |
| `Abgeschlossen_Am` | `abgeschlossen_am` | `row.abgeschlossen_am` | timestamptz |
| `Archiviert_Am` | `archiviert_am` | `row.archiviert_am` | timestamptz |
| `Created_By` | `created_by_user_id` | `row.created_by_user_id` | uuid FK users |
| `Assigned_To` | `assigned_to_user_id` | `row.assigned_to_user_id` | uuid FK users |
| `Beweisbeschluss_Pdf_Url` | `beweisbeschluss_pdf_url` | `row.beweisbeschluss_pdf_url` | text |
| `Beweisbeschluss_Extrakt` | `beweisbeschluss_extrakt` | `row.beweisbeschluss_extrakt` | jsonb |

### Auftraggeber-Typ ENUM-Mapping (UI-Label → DB-Enum)

| UI-Label (Wizard) | DB-Enum-Value |
|---|---|
| Privatperson | `privat` |
| Bauherr | `privat` |
| Versicherung | `versicherung` |
| Anwaltskanzlei | `gewerbe` |
| Wohnungsbaugesellschaft | `gewerbe` |
| Gericht | `gericht` |
| Behörde / Behoerde | `behoerde` |
| Sonstiges | `andere` |

---

## Tabelle `kontakte`

⚠️ **WICHTIG:** Hier gibt es **wirklich flache Adress-Spalten** (`adresse_strasse`, `adresse_nr`, `plz`, `ort`) — NICHT jsonb! Verwechslung mit auftraege.objekt war Marcels Ausgangs-Bug.

| Airtable | Supabase-Column | JS-Access |
|---|---|---|
| `Vorname` | `vorname` | `row.vorname` |
| `Nachname` | `nachname` | `row.nachname` |
| `Firma` | `firma` | `row.firma` |
| `Name_Anzeige` | `name` (oder generiert) | `row.name` |
| `Email` | `email` | `row.email` |
| `Telefon` | `telefon` | `row.telefon` |
| `Mobil` | `mobil` | `row.mobil` |
| `Strasse` | `adresse_strasse` | `row.adresse_strasse` |
| `Hausnummer` | `adresse_nr` | `row.adresse_nr` |
| `Adresse_Zusatz` | `adresse_zusatz` | `row.adresse_zusatz` |
| `PLZ` | `plz` | `row.plz` |
| `Ort` | `ort` | `row.ort` |
| `Land` | `land` | `row.land` |
| `Typ` | `typ` | enum |
| `Kanzlei` | `kanzlei` | `row.kanzlei` |
| `Versicherungs_Nr` | `versicherungs_nr` | `row.versicherungs_nr` |

---

## Tabelle `termine`

| Airtable | Supabase | Hinweis |
|---|---|---|
| `Datum` | `datum` | date |
| `Uhrzeit_Von` | `uhrzeit_von` | time |
| `Uhrzeit_Bis` | `uhrzeit_bis` | time |
| `Titel` | `titel` | text |
| `Beschreibung` | `beschreibung` | text |
| `Ort_Adresse` | `ort_adresse` | text (flat) |
| `Ort_PLZ` | `ort_plz` | text |
| `Ort_Ort` | `ort_ort` | text |
| `Typ` | `typ` | enum |
| `Status` | `status` | enum |
| `Auftrag_Id` | `auftrag_id` | uuid FK |
| `Kontakt_Id` | `kontakt_id` | uuid FK |

---

## Tabelle `fristen`

| Airtable | Supabase | Hinweis |
|---|---|---|
| `Frist_Typ` | `frist_typ` | enum |
| `Datum_Soll` | `datum_soll` | date |
| `Datum_Ist` | `datum_ist` | date |
| `Status` | `status` | enum |
| `Rechtsgrundlage` | `rechtsgrundlage` | text |
| `Notiz` | `notiz` | text |
| `Auftrag_Id` | `auftrag_id` | uuid FK |
| `Pipeline` | `pipeline` | text |

---

## Tabelle `dokumente` (Rechnungen, Briefe, PDFs, Mahnungen)

| Airtable | Supabase | Hinweis |
|---|---|---|
| `Doc_Nummer` | `doc_nummer` | text (RG-2026-001) |
| `Typ` | `typ` | enum: rechnung/brief/gutachten/mahnung |
| `Betreff` | `betreff` | text |
| `Inhalt` | `inhalt_text` | text |
| `Betrag_Netto` | `betrag_netto` | numeric |
| `Betrag_Brutto` | `betrag_brutto` | numeric |
| `Faelligkeit` | `faelligkeit` | date |
| `Mahn_Stufe` | `mahn_stufe` | int |
| `Auftrag_Id` | `auftrag_id` | uuid FK |
| `Storage_Path` | `storage_path` | text (Supabase Storage path) |

---

## Tabelle `eintraege` (Diktate, Notizen, Foto-Eingaben)

| Airtable | Supabase | Hinweis |
|---|---|---|
| `Typ` | `typ` | enum: diktat/notiz/foto/skizze/mix/text |
| `Inhalt` | `content` | text |
| `Titel` | `titel` | text |
| `Datum` | `datum` | date |
| `Auftrag_Id` | `auftrag_id` | uuid FK |
| `Audio_Ids` | `audio_dateien_ids` | uuid[] |
| `Foto_Ids` | `foto_ids` | uuid[] |
| `Skizze_Data` | `skizze_data` | jsonb |
| `Dauer_Min` | `dauer_min` | int |

---

## Tabelle `ki_protokoll`

| Airtable | Supabase | Hinweis |
|---|---|---|
| `Purpose` | `purpose` | enum |
| `Funktion` | `funktion` | text |
| `Modell` | `modell` | enum |
| `Tokens_In` | `tokens_in` | int |
| `Tokens_Out` | `tokens_out` | int |
| `Token_Total` | `token_total` | int (generated) |
| `Kosten_EUR` | `kosten_eur` | numeric |
| `Status` | `status` | enum |
| `Wirkung` | `wirkung` | text (S1/S2/S3 marker) |
| `Created_At` | `created_at` | timestamptz |
| `User_Id` | `user_id` | uuid |
| `Auftrag_Id` | `auftrag_id` | uuid FK (nullable) |

---

## Verwendungs-Pattern

### Read mit Defensive-Fallback

```js
const { data: auftrag, error } = await sb.from('auftraege')
  .select('id, az, titel, status, phase_aktuell, schadensart_label, schadensstichtag, objekt, details, auftraggeber_typ, auftraggeber_kontakt_id, fachurteil_text, created_at')
  .eq('id', auftragId).maybeSingle();
if (error) { console.error('[auftrag-load]', error); return; }
if (!auftrag) { zeigNotFound(); return; }

// Field-Access mit Schema-Konvention
const az = auftrag.az;
const adresse = auftrag.objekt?.adresse || '—';
const ort = auftrag.objekt?.ort || '—';
const schadenart = auftrag.schadensart_label || '—';
const ag_name = auftrag.details?.auftraggeber?.name || '—';
```

### Write (für Referenz — schon in 1.2.4 gemacht)

```js
await sb.from('auftraege').insert({
  typ: 'schaden',
  az: az,
  titel,
  status: 'aktiv',
  phase_aktuell: 1,
  objekt: { adresse: strasse, plz, ort },
  details: { auftraggeber: { name, typ_label } },
  auftraggeber_typ: 'privat',    // enum
  schadensart_label,
  schadensstichtag
}).select('id, az').single();
```

---

*Field-Mapping done. Migration uses this as source-of-truth.*
