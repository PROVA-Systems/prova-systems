# Hotfix K-UI/X2 — Kontakte-Schema-Match

**Branch:** `hotfix-k-ui-x2-kontakte-schema`
**Datum:** 2026-04-29
**Bearbeiter:** Claude Code + Marcel

> **🔄 KORREKTUR durch Marcel (29.04.2026 abends):** Stammdaten ≠ Vorgangsdaten.
> Schadennummer / Versicherungs-Nr / Behörden-Az sind **Auftrags-Felder**,
> nicht Kontakt-Felder. Ein Kontakt ("Allianz Versicherung AG") kommt für
> viele Aufträge mit unterschiedlichen Schaden-Nr vor.
>
> **Konsequenz:** Aus den 3 Conditional-Sections (Anwalt/Versicherung/Gericht)
> wurde nur eine smarte Label-Switch-Logik:
> - `data-section="versicherung"` und `="gericht-behoerde"` **entfernt**
> - `data-section="anwalt"` **entfernt** — `firma`-Label switcht dynamisch zu
>   "Kanzlei" bei `typ=anwalt` (Daten gehen in dieselbe DB-Spalte `firma`)
> - Neuer Hinweis-Banner bei typ ∈ {versicherung, gericht, behoerde}:
>   _"Schadennummer ist Auftragsdaten — gibst du beim Anlegen des Auftrags ein"_
>
> **DB-Spalten** `kontakte.kanzlei`, `versicherungs_nr`, `schaden_nr`,
> `behoerden_az` bleiben in der Tabelle — kein DROP. Können in einem späteren
> Sprint umgenutzt oder gedroppt werden.
>
> **Conditional Forms für vorgangsspezifische Felder kommen in Sprint 06b
> im Auftrags-Wizard.** Die Kontakte-Tabelle dient ausschließlich als
> Stammdaten-Adressbuch.
>
> Korrektur-Commits: `5bb186c` (B1+B2), `22df8d7` (B3 select), `790857a` (sw v241).

---

## Zielsetzung

Frontend-Schema-Mismatch in kontakte-supabase.html beheben — Pfad A
(Frontend ans DB-Schema anpassen). Kontakte-CRUD soll wieder
funktionieren, plus Conditional-Felder fuer typ-spezifische
Pflicht-Eingaben (Anwalt/Versicherung/Gericht).

---

## Schema-Mismatch-Diagnose

| Stelle | Vor X2 | Nach X2 |
|---|---|---|
| `kontakte-supabase.html` Adresse | 1 Feld `k-anschrift` | 3 Felder Strasse/Nr/Zusatz |
| Insert payload | `{ anschrift: '...' }` | `{ adresse_strasse, adresse_nr, adresse_zusatz }` |
| typ-ENUM | `'person'` (existiert nicht) | `'privat'` (DB-Default) |
| Conditional-Felder | keine | kanzlei / vers_nr / schaden_nr / behoerden_az |
| `data-store.kontakte.list` select | 14 Spalten | 24 Spalten |
| `briefe-logic` Empfaenger-Autofill | `k.anschrift` (immer leer) | `k.adresse_strasse + adresse_nr + adresse_zusatz` |

DB-Schema unveraendert (Migration 02_schema_kerngeschaeft.sql:102 ff.).

---

## Bilanz pro Block

### ✅ B1 — Modal HTML-Refactor (commit ca3c27c)

**kontakte-supabase.html:**
- typ-Dropdown ENUM-korrekt: `privat` (Default), `firma`, `anwalt`,
  `versicherung`, `gericht`, `behoerde`, `handwerker`, `sv_kollege`,
  `sonstiges` (vorher: `person`/`firma`/`gericht`/`behoerde`/`versicherung`)
- filter-typ Dropdown analog
- Adresse 3 Felder: Strasse (7fr) / Nr (2fr) / Zusatz (1fr) +
  Land-Feld default `DE`
- Conditional Sections per `data-section`-Attribut:
  - `firma` (alle ausser privat): Firma + Abteilung
  - `anwalt`: Kanzlei
  - `versicherung`: versicherungs_nr + schaden_nr
  - `gericht-behoerde`: behoerden_az
- Mehr-Felder-Toggle (▾): email_2, fax, website, ust_id,
  steuernummer, iban, bic, notizen

### ✅ B2 — Logic Schema-Match + Conditional (commit 57eb2c1)

**kontakte-supabase-logic.js:**
- `TYPS_MIT_FIRMA = Set([firma, anwalt, versicherung, gericht,
  behoerde, handwerker, sv_kollege])` — fuer Pflicht-Validation
- `updateConditionalSections()` reagiert auf typ-Wechsel, togglet
  `[data-section]`-Elements
- `toggleMehrFelder()` fuer ausklappbaren Block
- `readModal()` payload: alle 24 Spalten gemappt, name-Compute
  fallback fuer NOT NULL-Spalte (DB-Trigger pflegt es ohnehin),
  Conditional-Felder nur bei matching typ gesendet (sonst null —
  bewusst Reset bei typ-Wechsel von Anwalt zu Privat)
- `validatePayload(p)`:
  - `privat`: vorname || nachname Pflicht
  - sonst: firma Pflicht
  - `anwalt`: kanzlei Pflicht
  - `versicherung`: vers_nr + schaden_nr Pflicht
  - `gericht/behoerde`: behoerden_az Pflicht
  - Fehler-Toast nennt fehlendes Feld konkret
- `openEdit()` liest alle Spalten, auto-oeffnet Mehr-Felder wenn
  welche befuellt sind
- Liste-Display: `buildAdresseLine()` (DIN 5008) +
  `buildSubInfo()` (Vers-Nr / Kanzlei / Az als Sub-Info)

### ✅ B3 — data-store.kontakte.list Select erweitert (commit b5d83da)

`lib/data-store.js`:
- Select um 10 Spalten erweitert: abteilung, adresse_strasse,
  adresse_nr, adresse_zusatz, land, kanzlei, versicherungs_nr,
  schaden_nr, behoerden_az
- create/update/getById/softDelete unveraendert (alle nutzen
  `select('*')` oder `update(data)` ohne Select-Filter)

### ✅ B4 — briefe-logic Empfaenger-Picker (commit 4c147c6)

`briefe-logic.js`:
- `applyKontaktAutofill()`: liest `adresse_strasse + adresse_nr +
  adresse_zusatz` und baut DIN-5008-Strasse-Zeile
- Vorher: `f-empfaenger-strasse` wurde mit `k.anschrift` befuellt
  (Spalte existiert nicht -> immer leer -> Brief ohne
  Empfaenger-Adresse)
- Format-Beispiel: "Hauptstraße 12a, 2. OG"

### ✅ B5 — pdf-generate Edge Function Audit (kein Commit)

**Audit-Ergebnis:** Edge Functions lesen `kontakte`-Tabelle nicht.
- `letterhead-resolver.ts` liest nur `users` (SV-eigene Daten)
- `brief-generate` erhaelt Empfaenger als `body.variables` vom
  Frontend — Backend baut nichts aus kontakte-Row
- **Kein Patch noetig**, kein Commit.

### ✅ B6 — sw.js v239 → v240 (commit 368d1c8)

CACHE_VERSION-Bump nach Frontend-Aenderungen.

### ✅ B7 — Status-File (dieser Commit)

---

## Marcel-Test-Liste (auf Branch-Preview)

### Vor dem Test:
1. `git push -u origin hotfix-k-ui-x2-kontakte-schema`
2. Netlify Branch-Preview-URL aufrufen, Inkognito (sw.js bumpt)

### Test 1: Privatperson anlegen
1. /kontakte-supabase.html → "+ Neuer Kontakt"
2. Typ: Privatperson (Default)
3. Anrede: Frau · Vorname: Anna · Nachname: Test
4. Adresse: Hauptstr. / 12 / (Zusatz leer)
5. PLZ: 50667 · Ort: Köln
6. E-Mail: anna@test.de
7. Speichern → grüner Toast "Kontakt angelegt"
8. Liste muss zeigen: "Anna Test" + "Hauptstr. 12, 50667 Köln"

### Test 2: Versicherung anlegen (Stammdaten)
1. "+ Neuer Kontakt" → Typ: Versicherung
2. **Korrektur:** Hinweis-Banner muss erscheinen ("Schadennummer ist Auftragsdaten")
3. Firma leer lassen → "Speichern" → Fehler "Firma/Institution Pflicht"
4. Firma: Allianz Versicherung AG → Speichern → OK
5. Liste muss "Allianz Versicherung AG" zeigen, **keine** Vers-Nr/Schaden-Nr

### Test 3: Anwalt (Label-Switch)
1. "+ Neuer" → Anwalt
2. **Korrektur:** firma-Label muss zu "Kanzlei *" wechseln (vorher: "Firma / Institution *")
3. Placeholder muss "Müller & Partner Rechtsanwälte" zeigen
4. Firma leer → "Speichern" → Fehler "Bei Typ 'anwalt': Kanzlei ist Pflicht"
5. Kanzlei: Müller & Partner → Speichern → OK

### Test 4: Gericht
1. Typ: Gericht → Hinweis-Banner ("Aktenzeichen ist Auftragsdaten") erscheint
2. Firma: AG Köln → Speichern → OK
3. Liste zeigt "AG Köln", **kein** Behörden-Az

### Test 5: Edit-Roundtrip
1. Privatperson aus Test 1 anklicken → Modal mit allen Werten
2. Adresse-Zusatz "2. OG" ergaenzen → Speichern
3. Liste muss "Hauptstr. 12 (2. OG), 50667 Köln" zeigen

### Test 6: Mehr-Felder
1. Modal oeffnen → "Weitere Felder ▾" klicken → Block faltet auf
2. IBAN: DE89 3704 0044 0532 0130 00 → Speichern
3. Edit erneut oeffnen → Mehr-Felder muss auto-aufgeklappt sein

### Test 7: briefe.html Empfaenger-Picker
1. /briefe.html → "Auftragsbestätigung"
2. Kontakte-Picker → Anna Test waehlen
3. Empfaenger-Strasse-Feld muss "Hauptstr. 12" enthalten (vorher leer)
4. Empfaenger-PLZ + Ort muessen befuellt sein
5. PDF generieren → Brief muss komplette Adresse enthalten

### Test 8: Soft-Delete
1. Privatperson → Bearbeiten → "Löschen" → Confirm
2. Liste muss Eintrag verlieren
3. (DB hat deleted_at gesetzt — RLS-Policy kontakte_select ist auf
   `deleted_at IS NULL` gefiltert in data-store.kontakte.list)

---

## Commits auf Branch

```
368d1c8 K-UI/X2.B6: sw.js CACHE_VERSION v239 -> v240
4c147c6 K-UI/X2.B4: briefe-logic Empfaenger-Picker auf DIN-5008-Adress-Split
b5d83da K-UI/X2.B3: lib/data-store.kontakte.list Select erweitert
57eb2c1 K-UI/X2.B2: kontakte-supabase-logic.js Schema-Match + Conditional
ca3c27c K-UI/X2.B1: Modal-Refactor — Adress-Split + Conditional + Mehr-Felder
```

5 Commits + dieser Status-File-Commit (= 6 total).

---

## Was Marcel jetzt tun muss

### Pflicht (vor Cutover-Sprint K-1.5 weiter):
1. Push: `git push -u origin hotfix-k-ui-x2-kontakte-schema`
2. Branch-Preview-Tests (Liste oben durchklicken)
3. Bei alle gruen: in main mergen + push
4. Zurueck zu cutover-Branch:
   ```
   git checkout sprint-k-1-5-cutover
   git rebase main   # oder merge main
   ```
5. Cutover-Sprint Block 2 (301-Redirect) wieder aufnehmen

### Backlog (kann warten):
- pdf-generate Edge Function: Empfaenger-Daten direkt aus
  kontakte-Row laden statt vom Frontend? (Aktuell gibt Frontend
  Variables mit — funktioniert, aber Frontend-Refactor in K-1.4
  koennte die Logic vereinfachen)
- alte kontakte.html (Airtable) deprecaten — nach Cutover

---

## NICHT-Befunde (gut zu wissen)

- DB-Schema war perfekt vorbereitet — keine Migration noetig
- compute_kontakt_name-Trigger pflegt name-Spalte automatisch,
  Frontend-Fallback ist nur Belt-and-Suspenders
- Frontend ist Single-Source-of-Truth Konsument — keine anderen
  Pages haben anschrift-Reference (akte.html / app.html nutzen
  noch Airtable, sind nicht im X2-Scope)
- search_vector wird per Trigger DB-seitig gepflegt — kein
  Frontend-Eingriff noetig
- typ-spezifische Felder werden bei typ-Wechsel auto auf null
  gesetzt (versicherungs_nr verschwindet wenn user von
  Versicherung zu Privat wechselt). Bewusst gewaehlt — sonst
  haengen veraltete Werte rum.

---

## Bekannte Risiken

1. **DB-Trigger kontakte.compute_kontakt_name muss live sein.**
   Falls Marcels Supabase-Instanz die Migration 02 nicht oder
   nur teilweise hatte, schlaegt Insert mit "name NOT NULL" fehl.
   Frontend sendet computedName als Fallback, also Workaround
   greift selbst dann.
2. **Versicherungs-/Schaden-Nr koennen Sonderzeichen enthalten**
   (z.B. /, -). Aktuell keine Format-Validierung — wenn User
   "abc 123/-" eingibt, wird es 1:1 gespeichert. Akzeptabel.
3. **kontakte-Tabelle hatte vor X2 vermutlich keine Daten**
   (alte Inserts schlugen fehl wegen anschrift-Spalte). Falls doch
   irgendwelche Test-Rows aus Pre-K-UI da sind, koennten sie
   falsche typ-Werte ('person') haben — manuell korrigieren
   moeglich.
