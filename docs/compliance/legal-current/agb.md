# Allgemeine Geschäftsbedingungen — PROVA Systems

**Stand:** 04.05.2026 (Draft fuer Anwalt-Review)
**Anbieter:** Marcel Schreiber, PROVA Systems, Hohenzollernring 12, 50672 Köln

---

## § 1 Geltungsbereich

(1) Diese AGB gelten für alle Verträge zwischen Marcel Schreiber, PROVA Systems ("Anbieter") und seinen Kunden ("Nutzer") über die Nutzung der SaaS-Plattform "PROVA" (prova-systems.de, app.prova-systems.de).

(2) Zielgruppe: öffentlich bestellte und vereidigte Bausachverständige (ö.b.u.v. SV) sowie deren Bürobetriebe. Solo-SVs gelten als Unternehmer i.S.d. § 14 BGB. Verbraucher i.S.d. § 13 BGB sind ausgeschlossen.

## § 2 Vertragsschluss

(1) Der Nutzer registriert sich auf app.prova-systems.de mit Email + Passwort. Mit Anlage des Workspaces kommt ein Vertrag mit dem Anbieter zustande.

(2) Pakete:
- **Solo:** 149 €/Monat (oder 99 €/Monat für Founding-Pilots, lifetime)
- **Team:** 279 €/Monat
- **Trial:** 90 Tage kostenlos für Founding-Pilots

## § 3 Leistungsumfang

(1) PROVA stellt eine Plattform zur Verfügung, mit der SVs:
- Aufträge anlegen und verwalten
- Diktate transkribieren lassen (Whisper)
- Strukturhilfen für Gutachten erhalten (GPT-4o)
- Fachurteile höchstpersönlich verfassen (§ 10 IHK-SVO, § 407a Abs. 1 ZPO)
- PDFs generieren (PDFMonkey)
- Rechnungen erstellen + versenden (Stripe + Email)

(2) **Wichtige Klarstellung KI:** Die KI-Funktionen sind **Strukturhilfen**. Sie machen **keine eigenständigen fachlichen Bewertungen**. Das Fachurteil verbleibt zwingend beim Sachverständigen (§ 10 IHK-SVO + § 407a Abs. 1 ZPO).

(3) Der Anbieter dokumentiert KI-Einsatz EU AI Act Art. 50-konform automatisch in jedem PDF-Output (Teil 1.3 + Teil 4.3).

## § 4 Pflichten des Nutzers

(1) Der Nutzer ist verantwortlich für:
- die fachliche Korrektheit des Fachurteils (§ 6 IHK-SVO + § 407a ZPO)
- die DSGVO-konforme Verarbeitung der Auftraggeber-Daten (siehe AVV)
- die Anzeigepflichten nach § 407a ZPO an Auftraggeber/Gericht
- den Schutz seiner Login-Daten

(2) Der Nutzer darf KI-Strukturhilfen nicht ungeprueft uebernehmen. Halluzinations-Check + § 407a-Check werden automatisch durchgefuehrt — Verantwortung verbleibt beim SV.

## § 5 Pflichten des Anbieters

(1) Der Anbieter stellt die Plattform mit 99,5% monatlicher Verfuegbarkeit bereit (gemessen nach Netlify+Supabase-SLAs).

(2) Pseudonymisierung von Personendaten VOR Drittland-Transfer (USA, OpenAI etc.) ist Pflicht und implementiert.

(3) Der Anbieter haftet NICHT für inhaltliche Fehler in vom SV erstellten Gutachten. Die KI-Strukturhilfen sind Hilfsmittel, keine Bewertungs-Empfehlungen.

## § 6 Haftung

(1) Der Anbieter haftet nach gesetzlichen Vorschriften für Vorsatz und grobe Fahrlässigkeit.

(2) Bei einfacher Fahrlässigkeit ist die Haftung beschränkt auf:
- den vertragstypisch vorhersehbaren Schaden
- maximal die Jahresgebühr des Pakets

(3) **Ausgeschlossen ist insbesondere die Haftung für:**
- Inhaltliche Mängel von Fachurteilen, die der SV höchstpersönlich verfasst hat
- Folgen falscher Halluzinations-Check-Ergebnisse (KI bestätigt zu Unrecht "halluzinations-frei")
- DSGVO-Verstöße bei Auftraggeber-Daten, die der SV vertragswidrig nicht pseudonymisiert hat

(4) Die Haftung für Datenverlust ist beschränkt auf den Wiederherstellungs-Aufwand bei ordnungsgemäßer Backup-Pflege durch den SV.

## § 7 Vergütung + Kündigung

(1) Die monatliche Gebühr ist im Voraus fällig (Stripe-Subscription).

(2) Founding-Pilots erhalten 90T Trial + danach 99€/Monat lifetime (Coupon FOUNDING-99).

(3) Kündigung jederzeit zum Monatsende ueber:
- Customer-Portal (Stripe)
- Email an kontakt@prova-systems.de

(4) **§ 312k BGB Kündigungsbutton:** PROVA stellt einen direkten Kündigungs-Link in den Account-Settings bereit, um auch B2B-Kunden eine bequeme Kündigung zu ermöglichen.

## § 8 Datenschutz

Es gilt die separate Datenschutzerklärung (datenschutz.html) und die AVV (avv.html). Bei Widerspruch geht die AVV vor.

## § 9 Schlussbestimmungen

(1) Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.

(2) Gerichtsstand für Kaufleute: Köln.

(3) Sollte eine Klausel unwirksam sein, bleibt der Vertrag im Übrigen wirksam.

---

**Fragen für Anwalt-Review:**
- § 6 Abs. 3: Reicht die Haftungs-Beschränkung für KI-Output? Schutz vor SV-Haftungs-Durchgriff?
- § 7 Abs. 4: § 312k BGB-Pflicht trifft auch B2B?
- § 9 Abs. 2: Gerichtsstands-Klausel gegen B2B-Kleinunternehmer wirksam?

---

*Draft 04.05.2026 — Pflicht-Review durch Anwalt vor Public-Use.*
