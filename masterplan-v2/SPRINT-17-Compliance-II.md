# SPRINT 17 — Compliance II: DSGVO-Betroffenenrechte

**Tag:** 17 | **Aufwand:** 4-5h | **Phase:** D Compliance

---

## Ziel
Ein Pilotkunde kann seine DSGVO-Rechte (Auskunft Art. 15, Löschung Art. 17, Portabilität Art. 20) selbständig ausüben. Getestet und dokumentiert.

---

## Sprint-Start-Ritual
1. **Code-Check:** `ls netlify/functions/dsgvo-*.js` — was existiert bereits?
2. **Datenfluss:** Wenn User "Löschung" klickt — welche Tabellen müssen durch? Welche Abhängigkeiten (Links) brechen?
3. **Scope-Fix:** Nur DSGVO-Rechte + Einwilligungen. Nicht AGB-Versionierung (Sprint 16).

---

## Scope

**In Scope:**
- **Art. 15 Auskunft** End-to-End scharfschalten
- **Art. 17 Löschung** End-to-End scharfschalten
- **Art. 20 Portabilität** als JSON-Export-Option (Teil von Art. 15)
- **Einwilligungs-Management** in Einstellungen-Seite
- **Granulare Einwilligungen** in EINWILLIGUNGEN-Tabelle:
  - Foto-Upload mit EXIF-Hinweis
  - KI-Nutzung (OpenAI als Subunternehmer)
  - Marketing-Emails (separat widerrufbar)
  - Push-Benachrichtigungen
- **Auftragsverarbeitungs-Verzeichnis** (Art. 30) — Excel/CSV-Export

**Out of Scope:**
- EUR-weite Darstellung in mehreren Sprachen (ggf. später)
- Dritthafter (Auftragsverarbeiter-Zusatz zu AVV, kommt in Sprint 16)

---

## Prompt für Claude Code

```
PROVA Sprint 17 — Compliance II DSGVO (Tag 17)

Pflicht-Lektuere: CLAUDE.md, dsgvo-auskunft.js, dsgvo-loeschen.js, EINWILLIGUNGEN-Tabelle,
einstellungen.html, Masterplan-v2 03_SYSTEM-ARCHITEKTUR.md Tabellen-Map

KONTEXT
=======
DSGVO verlangt 4 konkrete Betroffenenrechte:
- Art. 15 Auskunft: User bekommt alle Daten ueber sich in lesbarer Form
- Art. 16 Berichtigung: User kann selbst alle Daten aendern (haben wir via UI)
- Art. 17 Loeschung: Vollstaendige Entfernung aller Daten binnen 30 Tagen
- Art. 20 Datenportabilitaet: User bekommt Daten in maschinenlesbarem Format

dsgvo-auskunft.js und dsgvo-loeschen.js existieren, sind aber nie End-to-End getestet.

SCOPE
=====

Commit 1: dsgvo-auskunft.js End-to-End scharfschalten
- Funktion sammelt aus ALLEN Tabellen (mit sv_email-Filter):
  SACHVERSTAENDIGE, SCHADENSFAELLE, EINTRAEGE, TERMINE, RECHNUNGEN, BRIEFE, KONTAKTE,
  TEXTBAUSTEINE_CUSTOM, AUDIT_TRAIL, KI_STATISTIK, EINWILLIGUNGEN, PUSH_SUBSCRIPTIONS,
  STATISTIKEN, WORKFLOW_ERRORS
- Formatiert als lesbares PDF (PDFMonkey Template neu, oder direkt als JSON-Download)
- Sendet per IONOS-SMTP an SV-Email innerhalb 24h
- Audit-Log in AUDIT_TRAIL: "DSGVO-Auskunft angefordert am ..."

Commit 2: dsgvo-loeschen.js End-to-End
- 2-Stufen-Prozess:
  Stufe 1: User klickt "Alle Daten loeschen" → Email mit Bestaetigungs-Link (72h gueltig)
  Stufe 2: User klickt Link → tatsaechliche Loeschung
- Loeschung kaskadiert durch alle Tabellen
- Audit-Log geschrieben BEVOR geloescht (damit Nachweis bleibt), mit sv_email_hash statt Klar
- Session invalidieren (alle Cookies loeschen)
- Stripe-Abo kuendigen (Stripe API)
- Bestaetigungs-Email "Alle Daten wurden geloescht"

Commit 3: Portabilitaet
- Option in Auskunft-Flow: "Als JSON-Download" statt PDF
- Maschinenlesbares Format mit allen Records
- Separate Download-Link mit HMAC-signierter URL, 1h gueltig

Commit 4: Einwilligungs-Management in einstellungen.html
- Neue Sektion "Meine Einwilligungen"
- 4 Toggle-Switches:
  * Foto-Upload: "Fotos von Ortsterminen werden verarbeitet. EXIF-Daten (GPS) werden gestrippt"
  * KI-Nutzung: "Texte werden pseudonymisiert an OpenAI gesendet (Auftragsverarbeiter)"
  * Marketing-Emails: "Produktneuheiten per Email (optional)"
  * Push-Benachrichtigungen: "Termin-Reminder und kritische Events"
- Jeder Toggle schreibt Einwilligungen-Record (mit Timestamp + IP-Hash)
- Widerruf wirkt sofort, nicht erst bei naechstem Besuch

Commit 5: Verarbeitungs-Verzeichnis (Art. 30)
- Excel-Export aus AVV-Daten (Auftragsverarbeiter, Zweck, Datenkategorien)
- Button in Einstellungen: "Verarbeitungs-Verzeichnis herunterladen"
- Template aus AVV-Dokument + dynamisch generierte Tabelle der Datenkategorien

Commit 6: sw.js + Tag

QUALITAET
=========
- Alle DSGVO-Aktionen sind AUDIT_TRAIL-Log
- Loeschung wirklich kaskadiert (kein Waisen-Record)
- Auskunft innerhalb 24h (via auto-scheduled worker falls noetig)
- Einwilligungs-UI klar ("Ich willige ein" vs "Widerrufen")

TESTS
=====
- Test-SV anlegen, 3 Faelle, Einwilligungen gesetzt
- Auskunft anfordern → JSON + PDF in Email
- Loeschung anfordern → Bestaetigungs-Link
- Nach Klick: alle Daten weg, Login gesperrt, Stripe-Abo gekuendigt
- Marcel prueft: kein Waisen-Record in irgendeiner Tabelle

TAG: v180-compliance-ii-done
```

---

## Acceptance
1. Marcel klickt "DSGVO-Auskunft" → erhält JSON + PDF mit allen Daten in < 24h
2. Marcel klickt "DSGVO-Löschung" → Bestätigungs-Link → Löschung vollständig, Login gesperrt
3. Marketing-Einwilligung granular widerrufbar
4. Verarbeitungs-Verzeichnis als Excel downloadbar

## Rollback
`git reset --hard v180-compliance-i-done`

---

**Hinweis:** Dieser Sprint ist juristisch sensibel. Vor Live-Schaltung: Anwalt-Review der Texte und Flows.
