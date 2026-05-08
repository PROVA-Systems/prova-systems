# Compound-Live-Tests — 5 Szenarien (M⁴² P12)

**Datum:** 2026-05-08
**Owner:** Marcel Schreiber
**Phase:** 🔴 MARCEL-MANUAL — kann nicht von CC automatisiert werden

---

## 🎯 Was sind Compound-Live-Tests?

Echte End-to-End-Workflows die mehrere Features kombinieren. Marcel führt diese auf eigenem Gerät durch und protokolliert mit Screen-Recording (oder Foto-Sequenz).

---

## 📋 5 Szenarien

### Szenario 1: Daten-Import + Volltext-Suche
**Ziel:** Bestehender SV migriert von Word/Excel zu PROVA.

**Schritte:**
1. Login als Pilot-User
2. `/import-assistent.html` öffnen
3. CSV mit 50 Demo-Kontakten hochladen → Validierung
4. CSV mit 30 alten Akten hochladen → Validierung
5. Cmd+K öffnen → "Müller" suchen
6. Erwartung: Resultate aus beiden importierten Listen

**Erwartete Zeit:** 8 Minuten
**Was getestet wird:** import-validate, import-apply, global-search-engine, audit_trail-Logging

---

### Szenario 2: Mobile Akten-Anlage + Sync
**Ziel:** SV legt Akte unterwegs an, Diktat + Fotos auf Tablet, dann Desktop-Continuation.

**Schritte:**
1. Mobile (iPhone): /neuer-fall.html → Privatgutachten anlegen
2. Mobile: Diktat aufnehmen (60s)
3. Mobile: 5 Fotos hinzufügen (Camera-Direct)
4. Mobile: Skizze zeichnen (Apple Pencil)
5. Auf Desktop wechseln → Akte sollte sichtbar sein
6. Desktop: §6 Fachurteil schreiben (≥500 Zeichen)
7. Desktop: Freigabe → PDF generieren
8. Mobile: PDF im Akte-Tab sichtbar

**Erwartete Zeit:** 25 Minuten
**Was getestet wird:** Mobile-Foto-Upload, Whisper-Diktat, Skizzen-Canvas, Sync-Logik, Editor + KI-Stufen, PDFMonkey, Push (PDF-fertig)

---

### Szenario 3: Hybrid-Workflow (DOCX-Import + Editor)
**Ziel:** SV importiert eigene Word-Vorlage, editiert in PROVA.

**Schritte:**
1. /dokument-neu.html öffnen
2. "Hybrid Mode (weg_c)" wählen
3. DOCX-Datei (eigene Vorlage) hochladen
4. mammoth.js Konvertierung — Inhalte sichtbar im Editor
5. Locked-Sections markieren (Header + Footer)
6. Body editieren mit KI-Stufen (S1/S2/S3)
7. Footnote einfügen
8. Cross-Reference zu §1 setzen
9. Export als PDF + DOCX

**Erwartete Zeit:** 15 Minuten
**Was getestet wird:** mammoth.js-Import, weg_c-Mode, Locked-Sections, editor-extensions, docx-export, KI-Werkzeug-Stufen

---

### Szenario 4: Admin-Cockpit Drilldown
**Ziel:** Marcel checkt Admin-Cockpit und drilldownt in einen User-Workflow.

**Schritte:**
1. Login als Admin (admin.prova-systems.de)
2. Admin-Cockpit → Tab "Tenants"
3. Pilot-User #1 auswählen
4. Drilldown: KI-Kosten / Akten-Zahl / letzter Login
5. Drilldown: §6 Fachurteile (mit Audit-Trail-Anzeige)
6. Audit-Trail: Hash-Chain-Verifikation
7. Impersonate-Modus: 1 Click → User-View
8. Akten als "User" einsehen
9. Zurück zu Admin → Notification "Impersonation X Min"

**Erwartete Zeit:** 12 Minuten
**Was getestet wird:** admin-auth-guard, admin-cockpit, admin-drilldown, audit-source-log mit Hash-Chain, impersonate-Lambda

---

### Szenario 5: Search → 360° → Action
**Ziel:** SV findet Kontakt via Cmd+K, schaut 360°-View, schreibt Brief.

**Schritte:**
1. Cmd+K → "Müller" tippen
2. 1. Resultat: Kontakt → klicken
3. /kontakt-detail.html öffnet sich mit 9 Tabs
4. Tab "Akten": 3 Akten dieses Kontakts sichtbar
5. Tab "Korrespondenz": letzte 5 Briefe
6. Klick "Neuen Brief" → bescheinigung-erstellen.html
7. Brief auswählen (z.B. Termin-Bestätigung)
8. Daten werden vorausgefüllt (Adresse, Akte-Ref)
9. Generate PDF + Send Email

**Erwartete Zeit:** 10 Minuten
**Was getestet wird:** global-search-engine, kontakt-360 (alle 9 Tabs), bescheinigungen, email-send, PDFMonkey, audit_trail

---

## 📝 Marcel-Pflicht-Items

1. Vor jedem Test: Mobile-Device geladen, Desktop bereit
2. Screen-Recording starten (QuickTime / OBS)
3. Test ausführen, Stopwatch laufen lassen
4. Bei Bug: Stop, dokumentieren, weiter
5. Resultat in `docs/sprint-status/MEGA42-PHASE-12-COMPOUND-RESULTS.md` festhalten

---

## 📊 Erwartetes Resultat (Pilot-Ready-Threshold)

| Szenario | Erwartete Zeit | Soll-Resultat |
|----------|---------------|---------------|
| 1. Daten-Import + Suche | 8 min | ✅ alle Schritte ohne Bug |
| 2. Mobile + Sync | 25 min | ✅ Sync funktioniert, PDF kommt an |
| 3. DOCX + Editor | 15 min | ✅ Hybrid-Mode funktioniert |
| 4. Admin-Cockpit | 12 min | ✅ Drilldown grün, Hash-Chain valid |
| 5. Search + 360° | 10 min | ✅ alle 9 Tabs laden |

**Pilot-Ready erreicht wenn:** 5/5 grün ODER 4/5 grün + 1 dokumentierter non-blocker.

---

## 🔴 Pre-Req

- mega41 oder mega42 zu main + Netlify-Deploy
- Migration 40 in Supabase APPLIED (RLS-Fix)
- ENV-Vars gesetzt (PDFMONKEY_API_KEY, VAPID_*, HEALTH_CHECK_CRON_SECRET)
- Pilot-User-Account vorhanden mit `seed-demo-data.js` Demo-Daten

---

*M⁴² P12 — Co-Authored-By Claude Opus 4.7 — 2026-05-08*
