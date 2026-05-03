# IHK-SVO 4-Teile-Templates — Migrations-Plan

**Erstellt:** 03.05.2026 abend (POST-MEGA-MEGA-MEGA Sprint O2)
**Zielgruppe:** Marcel (PDFMonkey-Admin)
**Status:** F-04 Liquid-Goldstandard erstellt · F-09/F-15 Demo-Variante vorhanden · F-19 bereits Liquid-Production

---

## Worum geht's

Die IHK-SVO § 9 Abs. 3 schreibt eine **4-Teile-Struktur** für Bauschadensgutachten vor:

| Teil | Inhalt |
|---|---|
| **Teil 1** | Allgemeine Angaben + Aufgabenstellung (mit Deckblatt 1.1, Auftragsumfang 1.2, KI-Ex-ante-Anzeige 1.3) |
| **Teil 2** | Dokumentation der Daten (Objektbeschreibung 2.1, Anknüpfungstatsachen 2.2) |
| **Teil 3** | Beantwortung der Fragestellung (Befunde 3.1, Hypothesen 3.2, **3.4 Fachurteil — KI-frei**) |
| **Teil 4** | Zusammenfassung + § 407a ZPO + KI-Offenlegung Art. 50 EU AI Act + Unterschrift |
| Teil 5 | Anlagen (optional via `{% if anlagen %}`) |

**Zusätzlich rechtlich Pflicht:**
- EU AI Act Art. 50 KI-Offenlegung (Teil 1.3 ex-ante + Teil 4.3 ex-post)
- § 407a Abs. 2 ZPO Unparteilichkeitserklärung (Teil 4.2)
- § 10 IHK-SVO Höchstpersönlichkeit Fachurteil (Teil 3.4 ohne KI)
- Anti-Substitution: Header + Footer ab Seite 2 (IHK-Köln-Anforderung)

---

## Status pro Slot

### F-04 KURZSTELLUNGNAHME · `C4BB257B`
**Repo-File:** `docs/templates-goldstandard/04-gutachten/F-04-KURZSTELLUNGNAHME.template.html`
**Status:** ✅ **PRODUCTION-READY** (Liquid-templated, IHK-SVO-konform, EU AI Act + § 407a)
**Marcel-Pflicht:** HTML komplett kopieren in PDFMonkey Dashboard → Template `C4BB257B` → Editor → Quellcode ersetzen → "Speichern". Test-Render mit Mock-Payload (siehe `F-04-KURZSTELLUNGNAHME.payload.json`).

### F-09 KURZGUTACHTEN · `BA076019`
**Repo-File:** `docs/templates-goldstandard/04-gutachten/F-09-KURZGUTACHTEN.template.html`
**Status:** ⚠ **DEMO-VARIANTE** mit hardcoded Werten (Frau Kowalski, Parkett Meier). Struktur ist 4-Teile-konform.
**Aktion:** **Marcel-Decision benötigt** (siehe NACHT-PAUSE-File `docs/diagnose/NACHT-PAUSE-MEGA-MEGA-MEGA-F09-LIQUID.md`).
**Empfehlung:** Pre-Pilot Status-Quo OK (Demo-Werte sehen für Pilot-Kunden trotzdem professionell aus). Liquid-Migration in Sprint K-2.

### F-15 GERICHTSGUTACHTEN · `36E140DC`
**Repo-File:** `docs/templates-goldstandard/04-gutachten/F-15-GERICHTSGUTACHTEN.template.html`
**Status:** ⚠ **DEMO-VARIANTE** mit hardcoded Werten (Landgericht Köln, WDVS-Fall). Struktur ist 4-Teile-konform inkl. § 404a ZPO.
**Aktion:** Wie F-09 — Marcel-Decision (gleicher NACHT-PAUSE-File).

### F-19 WERTGUTACHTEN · ggf. `29064D98-FD12-4135-9D44-F49CCF9819C6`
**Repo-File:** `docs/templates-goldstandard/04-gutachten/F-19-WERTGUTACHTEN.template.html`
**Status:** ✅ **PRODUCTION-READY** (Liquid, IHK-SVO 4-Teile, ImmoWertV-2021-Verfahren).
**Marcel-Pflicht:** Falls in PDFMonkey noch alte Struktur — kopieren wie F-04.

---

## Migrations-Steps für PDFMonkey (pro Template)

### Schritt 1: Backup
1. PDFMonkey → Templates → `<Template-ID>` öffnen
2. Editor → "View source" / "Quellcode anzeigen"
3. Kompletten alten HTML-Code in `docs/templates-archiv/<F-XX>-PRE-MIGRATION-<datum>.html` sichern

### Schritt 2: Variablen-Liste prüfen
Im PDFMonkey-Dashboard → Template → "Sample Data" / "Beispieldaten":
- Sicherstellen dass alle Variablen aus `<F-XX>.payload.json` als Sample-Werte hinterlegt sind
- Bei Liste-Variablen (`anknuepfungstatsachen`, `befunde`, `hypothesen`, `anlagen`) Liquid-Iteration `{% for ... %}` testen

### Schritt 3: Template-HTML ersetzen
1. Kompletten Inhalt aus `docs/templates-goldstandard/04-gutachten/<F-XX>.template.html` kopieren
2. PDFMonkey-Editor → Source-Mode → einfügen (alten Inhalt vorher löschen)
3. "Save" / "Speichern"

### Schritt 4: Test-Render
1. PDFMonkey → "Generate test document"
2. Sample-Payload aus `<F-XX>.payload.json` als JSON eingeben
3. PDF generieren
4. Visual-Check:
   - [ ] Deckblatt korrekt (Titel, Objekt, SV-Block, Metadaten)
   - [ ] Header + Footer ab Seite 2 sichtbar (anti-Substitution)
   - [ ] Teil 1, 2, 3, 4 (5 optional) durchnummeriert
   - [ ] § 407a ZPO + § 10 IHK-SVO + Art. 50 EU AI Act referenziert
   - [ ] Teil 3.4 Fachurteil als hervorgehobener Kasten "KI-frei"
   - [ ] Teil 4.3 KI-Eigenleistungs-Dokumentation vollständig
   - [ ] Unterschriftsblock mit SV + Vereidigungs-Stelle

### Schritt 5: PROVA-Integration testen
1. In PROVA-App: neuen Auftrag mit Auftragstyp passend zum Slot anlegen
2. Stamm-Daten + Diktat → Freigabe → PDF generieren
3. PDF-Output mit Test-Render vergleichen
4. Bei Abweichung: Variable-Mapping in `pdf-generate.js` prüfen

---

## Variablen-Referenz (gemeinsam für F-04/F-09/F-15/F-19)

### Pflicht
- `gutachten_nummer` — z.B. "KSN-2026-031"
- `datum` — Gutachtendatum
- `sv_name`, `sv_titel?`, `sv_qualifikation?`, `sv_sachgebiet?`
- `sv_strasse`, `sv_plz`, `sv_ort`, `sv_telefon`, `sv_email`
- `sv_bestellungsstelle?`, `sv_bestellungstenor?`, `sv_eidstatus?`
- `auftraggeber_name`
- `auftragsdatum`
- `objekt.adresse`, `objekt.objektart` (oder `objekt.objektart_label`)
- `fragestellung` (F-04, F-09) ODER `beweisbeschluss_text` + `gericht_name` + `gericht_aktenzeichen` (F-15)

### Optional
- `objekt.baujahr`, `objekt.schadensort`, `objekt.beschreibung`
- `schadensstichtag`, `ortstermin_datum`
- `subtitel`, `umfang_seiten`, `umfang_anlagen`, `umfang_fotos`
- `ki_anzeige_datum`, `ki_anzeige_empfaenger`
- `mitwirkung_dritter`
- `anknuepfungstatsachen[].titel?`, `[].text` (Liste)
- `befunde[].nr?`, `[].text` (Liste)
- `hypothesen[].titel?`, `[].text` (Liste)
- `fachurteil_text` — KI-frei vom SV
- `zusammenfassung`
- `anlagen[].nr?`, `[].titel`, `[].beschreibung?` (Liste)

---

## Acceptance-Kriterien für O2-Sprint

- [x] F-04-KURZSTELLUNGNAHME Liquid-Goldstandard erstellt (~290 LOC, lean, 4-Teile-konform)
- [x] F-04-KURZSTELLUNGNAHME.payload.json mit 30+ Variablen + Liste-Beispielen
- [x] Migrations-Doku mit 5-Schritt-Plan für PDFMonkey
- [x] Variablen-Referenz dokumentiert
- [ ] **PDFMonkey-Migration F-04** (Marcel-Pflicht — externer Service)
- [ ] **F-09 + F-15 Liquid-Migration** (Marcel-Decision via NACHT-PAUSE-File)
- [x] INFRASTRUKTUR-REFERENZ.md korrigiert (F-09 ist Kurzgutachten, nicht Reserve)

---

*Dokumentiert im Sprint MEGA-MEGA-MEGA O2 am 03.05.2026 abend.*
