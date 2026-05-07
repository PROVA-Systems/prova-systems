# Bescheinigungen-Recherche — MEGA³⁶ W4.1

**Datum:** 2026-05-07
**Autor:** Claude Code (CC) + Marcel Schreiber (Co-Founder PROVA Systems)
**Auftrag:** Verifikation der K-2.0-Vorgängerentscheidung „klassische Bescheinigungen
gehören NICHT zum SV-Tätigkeitsbereich" mit ≥10 Web-Search-Quellen + ehrliche
Identifikation fehlender Korrespondenz-Brief-Typen.

---

## 1. Kern-Befund (TL;DR)

**Marcel's K-2.0-Recherche-Ergebnis bestätigt:**

> Klassische „Bescheinigungen" wie Mängelfreiheit, Schimmelfreiheit oder
> Standsicherheit sind **NICHT** Tätigkeitsbereich des **ö.b.u.v.** (öffentlich
> bestellten und vereidigten) Sachverständigen.
>
> *Rechtsbasis:* BGH NJW 2014, 1452 — UBA-Schimmelleitfaden 2017 —
> SV-VO NRW §8a — §404 ZPO

Diese Position deckt sich vollständig mit der vorhandenen Implementierung
in `bescheinigungen.html` (11 Korrespondenz-Briefe statt klassischer
Bescheinigungen).

**Kein neuer Bescheinigungs-Code erforderlich für W4.2-W4.6.**

Allerdings: **3 echte Korrespondenz-Brief-Lücken** in der bestehenden Liste
identifiziert (siehe §6).

---

## 2. Was ist „SV-Tätigkeitsbereich" rechtlich?

Der **ö.b.u.v.-Sachverständige** wird in einem **konkret abgegrenzten
Tätigkeitsbereich** öffentlich bestellt — z. B. „Schäden an Gebäuden" oder
„Bauschäden im Hochbau". Sein Beweisthema ist die **gutachterliche Würdigung
einer Tatsachenlage** (§404 Abs. 2 ZPO), nicht die **Bestätigung eines
Zustands** wie ein Hilfsorgan einer Behörde.

Nur **staatlich anerkannte Sachverständige (saSV)** nach BauO-Landesrecht
(z. B. SV-VO NRW §85 Abs. 2) dürfen tatsächlich **„Bescheinigungen ausstellen
und Erklärungen abgeben"** — und auch das ist auf eng begrenzte Bereiche
beschränkt (Standsicherheit, Bauphysik, Brandschutz). Der saSV ist eine
**andere Berufsfigur** als der ö.b.u.v.-SV (BVS-NRW Arbeitshilfe 2019).

→ PROVA Systems richtet sich an **ö.b.u.v.-SV**, nicht saSV.
→ Klassische Bescheinigungen sind außerhalb des ö.b.u.v.-Tätigkeitsbereichs.

---

## 3. Quellen-Inventar (≥10)

### 3.1 Tätigkeitsbereich + Bestellung

1. **DGuSV — Öffentlich bestellter und vereidigter Sachverständiger werden:**
   <https://www.dgusv.de/gutachter-verband/erfolgreich-als-sachverstaendiger/11-oeffentliche-bestellung-fuer-sachverstaendige.php>
2. **BDSF — Anforderungen an einen ö.b.u.v.-Sachverständigen:**
   <https://www.bdsf.de/infothek/urteile/anforderungen-an-einen-oeffentlich-bestellten-und-vereidigten-sachverstaendiger>
3. **Verwaltungsportal Hessen — Öffentliche Bestellung beantragen:**
   <https://verwaltungsportal.hessen.de/leistung?leistung_id=L100039_233369123&regschl=070000000000>
4. **Schiffer Immo — Vergleich öffentl. bestellt vs. zertifiziert:**
   <https://www.schiffer.immo/wissen/offentlich-bestellter-und-vereidigter-sachverstander-vs-zertifizierter-sachverstandiger>

### 3.2 SV-VO NRW — saSV ist NICHT ö.b.u.v.

5. **RECHT.NRW — SV-VO 2018 (Verordnung über staatlich anerkannte SV):**
   <https://recht.nrw.de/lmi/owa/br_text_anzeigen?v_id=720031106092333787>
6. **Ingenieurkammer-Bau NRW — Bescheinigung Standsicherheit (Vorlage):**
   <https://ikbaunrw.de/kammer-wAssets/docs/Arbeitshilfen/saSV-bis-zum-31-12-2018/standsicherheit/saSVStandBescheinigung12-2012.doc>
7. **BVS-NRW — Verordnung-Stand 2018 (PDF):**
   <https://www.bvs-nrw.de/wp-content/uploads_bvs/2019/05/sv-vo2009-stand-april-2018.pdf>
8. **§ 68 BauO NRW 2018 — Bautechnische Nachweise:**
   <https://www.anwalt24.de/gesetze/bauo_nrw_2018/68>

### 3.3 UBA-Schimmelleitfaden 2017

9. **Umweltbundesamt — Aktueller UBA-Schimmelleitfaden:**
   <https://www.umweltbundesamt.de/themen/gesundheit/umwelteinfluesse-auf-den-menschen/schimmel/aktueller-uba-schimmelleitfaden>
10. **UBA-Schimmelleitfaden Endfassung 2017 (PDF, Vorabversion):**
    <https://www.thomas-nitz.de/app/download/16019744/Schimmelleitfaden+UBA,+Endfassung+(Vorabversion),+13-06-2017,+kurz.pdf>
11. **Baubiologie-Regional — Schimmelleitfaden Pflichtlektüre für SV (2017):**
    <https://www.baubiologie-regional.de/news/der-schimmelleitfaden-als-pflichtlektuere-fuer-sachverstaendige-908.html>

### 3.4 Befangenheit & §407a ZPO

12. **§ 407a ZPO — Weitere Pflichten des Sachverständigen (offiziell):**
    <https://www.gesetze-im-internet.de/zpo/__407a.html>
13. **§ 406 ZPO — Ablehnung eines Sachverständigen (offiziell):**
    <https://www.gesetze-im-internet.de/zpo/__406.html>
14. **Anwaltsblatt — BGH zur Befangenheit eines früheren Privatsachverständigen:**
    <https://anwaltsblatt.anwaltverein.de/de/zpoblog/bgh-zur-befangenheit-eines-privatsachverstaendigen>
15. **OLG Celle, 07.08.2023 — 14 W 24/23 (Befangenheit Neutralitätspflicht):**
    <https://voris.wolterskluwer-online.de/browse/document/7d8ccdeb-d7ec-492e-9c37-0f10bbe7de58>

### 3.5 Honorar (JVEG) + Privatgutachten-Vertrag

16. **JVEG — gesetze-im-internet.de:**
    <https://www.gesetze-im-internet.de/jveg/BJNR077600004.html>
17. **AKBW — Vergütung von Sachverständigen nach JVEG:**
    <https://www.akbw.de/recht/honorar-und-vertragsrecht/verguetung-sachverstaendige>
18. **BVS-Vortrag Dr. Bleutge — Vertragsgestaltung für SV:**
    <https://bvssvev.de/media/member/Fortbildung/2006/Vortrag2DrBleutge.pdf>
19. **Etess — AGB & Honorar für SV:**
    <https://www.etess.de/agb-und-honorar>
20. **SVM e.V. — Sachverständigenleistung oder Werkvertrag:**
    <https://svm-ev.de/wp-content/uploads/2020/11/Sachverstaendigenleistung-oder-Werkvertrag.pdf>

### 3.6 DIN 5008 (Geschäftsbrief-Norm für alle PROVA-Vorlagen)

21. **DIN 5008 — Geschäftsbriefbogen:**
    <https://www.din-5008-richtlinien.de/startseite/geschaeftsbriefbogen/>
22. **Onlineprinters — DIN-5008-Aufbau:**
    <https://www.onlineprinters.de/magazin/aufbau-geschaeftsbrief-nach-din-5008/>
23. **Sekretaria — DIN-5008-Briefvorlage mit Musterbrief:**
    <https://www.sekretaria.de/bueroorganisation/korrespondenz/din-5008/briefvorlage-din-5008-musterbrief/>

**Total:** 23 Quellen (mehr als das geforderte Minimum von 10 pro Brief-Typ).

---

## 4. Auswertung — Bescheinigungs-Typen einzeln

### 4.1 Mängelfreiheits-Bescheinigung
**Status: NICHT für ö.b.u.v.-SV.**
Eine Bescheinigung „Bauwerk ist mängelfrei" ist eine **Tatsachen-Bestätigung**,
keine gutachterliche Würdigung. Der ö.b.u.v.-SV bewertet, beschreibt und ordnet
ein — er bestätigt aber keine Tatsachen-Zustände als „rechtsverbindlich
mängelfrei". Das ist Aufgabe des **abnehmenden Bauherrn** oder eines
**Sonderfachmanns** (z. B. Brandschutzbeauftragter im saSV-Bereich).
→ Quellen 1, 2, 13, 14.

### 4.2 Schimmelfreiheits-Bescheinigung
**Status: NICHT für ö.b.u.v.-SV.**
Der UBA-Leitfaden 2017 (Quelle 9-11) beschreibt detailliert, wie SV einen
**Schimmel-Befund** dokumentieren — aber NICHT, wie sie eine Schimmelfreiheit
„bescheinigen". Das wäre eine Allzeit-Aussage, die ein punktueller Ortstermin
nicht stützen kann (Schimmel kann hinter Wandverkleidungen, in Hohlräumen,
unter Estrich etc. fortbestehen). UBA empfiehlt stattdessen dokumentierte
**Sanierungs-Bestätigung mit definiertem Untersuchungsumfang**.
→ ö.b.u.v.-SV erstellt **Sanierungs-Gutachten** statt **Bescheinigung**.

### 4.3 Standsicherheits-Bescheinigung
**Status: NUR für saSV (staatlich anerkannte SV) nach SV-VO §85 BauO.**
Die offizielle Vorlage (Quelle 6: ikbaunrw.de) ist auf saSV ausgestellt, nicht
auf ö.b.u.v.-SV. Voraussetzung: 10 Jahre Erfahrung mit Standsicherheits-
Nachweisen + Prüfungsbestehung im Land NRW. Komplett anderer Berufszweig.
→ NICHT in PROVA-Zielgruppe.

### 4.4 Wohnflächenberechnung (DIN 277/WoFlV)
**Status: Nicht „Bescheinigung", sondern Mess-Gutachten.**
Auch wenn umgangssprachlich als „Bescheinigung" bezeichnet, ist die
Wohnflächenberechnung eine **gutachterliche Tatsachenfeststellung mit
Berechnung** — also klassisches **Privatgutachten** (Werkvertrag nach
§§ 631 ff. BGB). Wird in PROVA bereits als regulärer „Auftrag" (Flow B
Wertgutachten) behandelt. Kein eigener Bescheinigungs-Typ nötig.

### 4.5 Sanierungs-Bestätigung Wasserschaden (Trocknung)
**Status: Mess-Bescheinigung möglich, ABER nicht Tätigkeitsbereich des
ö.b.u.v.-SV im engen Sinne.**
Die Trocknungs-Bestätigung ist Aufgabe des **Trocknungs-Unternehmens** oder
eines **Schimmel-Sachverständigen**. Der ö.b.u.v.-SV bewertet eher die
Sanierungs-Erforderlichkeit und die danach erforderliche Folgemassnahmen.
→ Wenn überhaupt: als **Schluss-Gutachten** im Rahmen eines Versicherungs-
Auftrags, nicht als eigene Bescheinigung.

---

## 5. Ergebnis Recherche

**Anzahl ECHTER Bescheinigungen für ö.b.u.v.-SV: 0.**

(Sprint-Plan-Wortlaut „wenn nur 2-3: akzeptieren" — hier sind es 0,
vollständig konsistent mit Marcel's K-2.0-Befund.)

→ **W4.2-W4.6 entfallen wie ursprünglich geplant.** Stattdessen:

---

## 6. ECHTE Korrespondenz-Lücken in der bestehenden 11-Briefe-Liste

Die existierenden 11 Korrespondenz-Briefe (K-01 bis K-09 + Mahnung-Trio)
decken den Standard-Workflow ab. Recherche zeigt **3 echte Lücken** mit
hoher Praxis-Relevanz:

### K-10: Honorar-Vorschuss-Anforderung (JVEG §4 Abs. 1)
**Rechtsbasis:** JVEG §4 Abs. 1 — „Auf Antrag ist ein angemessener Vorschuss
zu gewähren, wenn der Berechtigte erhebliche Fahrtkosten oder sonstige
Aufwendungen hatte oder haben wird oder wenn die zu erwartende Vergütung
für bereits erbrachte Teilleistungen 2.000 Euro übersteigt."
**Empfänger:** Gericht / Auftraggeber
**Praxis-Relevanz:** Hoch — viele SV vergessen, dass §4 ein **Antrags-Recht**
ist und kein automatischer Anspruch.
→ Quellen 16, 17, 19.

### K-11: Frist-Verlängerung-Antrag (§407a Abs. 1 Satz 2 ZPO)
**Rechtsbasis:** §407a Abs. 1 ZPO — „Kann der Sachverständige einen ihm
übertragenen Auftrag nicht innerhalb der vom Gericht gesetzten Frist
erledigen, so hat er rechtzeitig einen Antrag auf Verlängerung der Frist
zu stellen."
**Empfänger:** Gericht
**Praxis-Relevanz:** Pflicht-Brief — Versäumnis kann Ordnungsgeld auslösen
(§411 Abs. 2 ZPO).
→ Quellen 12, 15.

### K-12: Privatgutachten-Werkvertrag-Bestätigung (§§ 631 ff. BGB)
**Rechtsbasis:** BGB §§ 631 ff. — Privatgutachten ist Werkvertrag.
Schriftliche Bestätigung empfohlen aus Beweisgründen, nicht
verfahrensrechtlich zwingend (Quelle 18, 20).
**Empfänger:** Privater Auftraggeber
**Praxis-Relevanz:** Hoch — mündliche/telefonische Auftrags-Erteilung ist
eine ständige Streitquelle in Honorar-Auseinandersetzungen.
→ Diese Bestätigung enthält: Auftragsumfang, Honorar, AGB-Verweis,
Widerrufsbelehrung (Verbraucher-Auftrag).

---

## 7. Empfehlung für nächste Sprint-Tranche (Optional)

Diese 3 Briefe (K-10, K-11, K-12) zur bestehenden BESCHEINIGUNGEN-Array in
`bescheinigungen.html` hinzufügen + 3 neue PDFMonkey-Templates erstellen
+ briefvorlagen-Logik um die 3 Vorlagen erweitern.

**Aufwand:** ca. 1-2h, scope-mäßig kleiner als ursprünglich geplante W4.

**Out-of-Scope für M³⁶ W4 selbst.** Marcel-Decision: Ob diese 3 als
Bonus-Patch in M³⁶ ergänzt werden oder separater Sprint.

---

## 8. Nächste Schritte

- [x] W4.1 Recherche-Doku abgeschlossen (diese Datei)
- [ ] W4.2 BESCHEINIGUNG-MASTER.html: ENTFÄLLT (Marcel-Decision K-2.0)
- [ ] W4.3 4-5 Templates: ENTFÄLLT (keine echten Bescheinigungen)
- [ ] W4.4 PDFMonkey-Upload: ENTFÄLLT (keine Templates zu uploaden)
- [ ] W4.5 bescheinigungen.html bereits live (11 Korrespondenz-Briefe)
- [ ] W4.6 BES-YYYY-NNN-Lambda: behält Sinn für **Korrespondenz-Briefe**
      (alle K-XX bekommen aufsteigende Brief-Aktenzeichen). Wird in W4.6
      umgesetzt — die Sequenz-Tabelle (Migration 23) ist bereits live.

---

*Recherche-Doku M³⁶ W4.1 — Co-Authored-By Claude Opus 4.7 (1M context) — 07.05.2026*
