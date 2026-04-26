# SPRINT 13 — M7a Make-Migration Teil 1 (G1 + Whisper)

**Tag:** 13 · **Aufwand:** 5-6h · **Phase:** C Migration & Operations

---

## Ziel
Der Haupt-Gutachten-Flow läuft über Netlify-Functions statt Make.com. Whisper auch. Make-Szenarien G1 + Whisper-Webhook werden pausiert (nicht gelöscht — Rollback-Option).

---

## Hintergrund

Strategie-Beschluss vom 24.04.2026: Von 10 Make-Szenarien sind 8 reine HTTP-Webhooks → migrierbar. Make behält nur die 4 Cron-Szenarien (L8/L9/L10/T3). Sprint 13 macht die ersten beiden Migrationen, Sprint 14 die restlichen.

**Vorteile der Migration:**
- Schnellere Response-Zeiten (kein Make-Hop)
- Bessere Debugging-Möglichkeit (Netlify-Logs)
- Weniger Abhängigkeit (Make-Service-Outages)
- Pseudonymisierung lückenlos (Sprint 01 wird wirksam)
- Make-Kosten-Ersparnis (wenn Plan-Limit erreicht)

---

## Scope

### G1-Flow-Ersatz: `gutachten-create.js`

**Was Make G1 macht:**
1. Empfängt Webhook von app-logic.js
2. Schreibt SCHADENSFAELLE in Airtable
3. Ruft OpenAI für Entwurf
4. Triggert PDFMonkey-Render
5. Antwortet mit AZ + Record-ID

**Was Netlify-Function macht:** Gleich, aber direkter, schneller, gewrapped mit JWT + Pseudonymisierung.

### Whisper-Ersatz

`whisper-diktat.js` existiert bereits (v98) und ist scharfschalt-bereit. Heute wird in `app-logic.js:1849` noch `WHISPER_WEBHOOK` (Make) aufgerufen → Umstellung auf `/.netlify/functions/whisper-diktat`.

---

## Prompt für Claude Code

```
PROVA Sprint 13 — M7a Make-Migration Teil 1 (Tag 13)

Pflicht-Lektüre vor Start:
- Memory: Make-Scenario-IDs, Webhook-URLs
- 03_SYSTEM-ARCHITEKTUR.md (Datenfluss "Neuer Fall Flow A")
- bestehende whisper-diktat.js
- Make-Szenario G1 in der UI öffnen, Module sichten


SCOPE
=====

Block A — G1-Flow-Ersatz

A1: netlify/functions/gutachten-create.js
- POST mit { fall: {...sammleDaten-Payload}, sv_email }
- requireAuth (JWT-Pflicht)
- ProvaPseudo.apply auf Text-Felder (Sprint 01 schon vorbereitet)
- INSERT SCHADENSFAELLE via Airtable (mit allen Feldern aus Sprint 10)
- bei Auftragsart=gerichtsgutachten + beweisbeschluss_datum:
  INSERT TERMINE für §411-Frist
- Call ki-proxy intern für Entwurf:
  - Modus "analyse_eintraege" (aus Sprint 06)
  - Pseudonymisiert
- UPDATE SCHADENSFAELLE mit ki_entwurf
- Trigger PDFMonkey-Render (Modus "vorschau"):
  - Template-Wahl basierend auf Auftragstyp
  - Daten aus SCHADENSFAELLE
- UPDATE Record mit pdf_vorschau_url
- Response: { az, record_id, pdf_vorschau_url }

A2: app-logic.js Umstellung
- WHEBOOK_G1 nicht mehr benutzen
- Statt Make-Webhook-URL: /.netlify/functions/gutachten-create
- Authorization-Header automatisch via prova-pseudo-send.js (Sprint 03)

A3: Audit-Trail
- INSERT AUDIT_TRAIL: { typ: "gutachten_erstellt", fall_id, sv_email, timestamp, source: "netlify" }

Block B — Whisper scharfschalten

B1: app-logic.js:1849 ändern
- Statt WHISPER_WEBHOOK (hook.eu1.make.com/h019...): /.netlify/functions/whisper-diktat
- Authorization-Header automatisch
- Response-Format prüfen: bleibt 1:1 wie vorher

B2: whisper-diktat.js Final-Härtung
- requireAuth (Sprint 03 schon)
- Rate-Limit 10/min (Sprint 03 schon)
- Pseudonymisierung (Sprint 01 schon)
- Audio-Speicherung in Netlify Blobs (für EINTRAEGE-Verknüpfung in Sprint 6)
- Response: { transkript, blob_key, duration_sec }

B3: eintrag-audio-upload.js (aus Sprint 06) zu whisper-diktat verschmelzen?
- Entscheidung: Lieber 2 Functions (Single Responsibility)
- eintrag-audio-upload nimmt Audio entgegen, ruft intern whisper-diktat auf
- Klare Trennung

Block C — Make-Szenarien deaktivieren (NICHT löschen)

C1: Marcel-Aktion in Make-UI
- G1 (ID 4867125) auf "off" setzen
- Whisper-Webhook (Hook 2569... oder wie ist die ID) auf "off"
- 7 Tage warten — wenn alles läuft, dann archivieren (nicht löschen)

C2: Make-Webhook-URLs in Code suchen
- grep für "imn2n5xs7j251xicrmdmk17of042pt2t" (G1)
- grep für "h019rspppkvc4m146sv1opxs74h9dp3x" (Whisper)
- Sicherstellen dass keine Restelfen existieren

Block D — Tests

D1: Playwright-Test 03-workflows-flow-a.spec.js erweitern
- Vollständiger Durchlauf mit Netlify statt Make
- Erwartung: gleiche Resultate, schneller (< 5 Sek statt < 15 Sek)

D2: Manueller Test
- Marcel: kompletter Fall durchlaufen
- Network-Tab prüfen: keine make.com-Calls mehr

Block E — sw.js v216


QUALITÄTSKRITERIEN
==================
- Response-Zeit besser als vorher
- 100% Funktional-Parität mit alter Make-Lösung
- Audit-Trail lückenlos
- Make-Szenarien als Backup-Option
- Kein Datenverlust bei Crash (atomare Operationen, Rollback-fähig)


TESTS
=====
End-to-End mit Stoppuhr:
1. Neuen Fall anlegen → Gutachten generieren
   - Vorher (Make): ca. 12-18 Sek
   - Nachher (Netlify): ca. 4-8 Sek erwartet
2. Diktat aufnehmen → Transkript
   - Vorher (Make): ca. 8-15 Sek
   - Nachher (Netlify): ca. 3-7 Sek erwartet


ACCEPTANCE
==========
1. gutachten-create + whisper-diktat Functions live
2. app-logic.js komplett umgestellt
3. Make G1 + Whisper deaktiviert
4. Performance besser
5. Functional-Parität


TAG: v180-make-migration-1-done


ROLLBACK
========
Wenn Probleme: Make-Szenarien wieder aktivieren, app-logic.js Code zurück.
Backup-Tag: v180-rechnungen-done (Stand vor Migration)
```

---

## Marcel-Browser-Test (20 Min)

1. Stoppuhr: Neuer Fall vorher vs. nachher
2. Diktat-Stoppuhr
3. PDF erscheint korrekt
4. Network-Tab: keine make.com-URLs mehr
5. Make-UI: G1 + Whisper sind off
6. Notfall-Plan: wenn was nicht klappt, Marcel kann Make wieder aktivieren
