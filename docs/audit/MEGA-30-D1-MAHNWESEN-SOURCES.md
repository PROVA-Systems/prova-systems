# MEGA³⁰ D1 — Mahnwesen Recherche-Quellen

**Datum:** 2026-05-07
**Recherche-Pflicht:** ≥10 Quellen (Marcel-Direktive 29.04.2026)

---

## Rechtliche Grundlagen

### Primär-Recht (Bürgerliches Gesetzbuch)

1. **BGB § 286 Verzug des Schuldners** — Mahnung als Verzugs-Auslöser, Mahnkosten-Anspruch
   https://www.gesetze-im-internet.de/bgb/__286.html
2. **BGB § 288 Verzugszinsen** — gesetzliche Zinssätze (Basiszinssatz + 5/9 Prozentpunkte)
   https://www.gesetze-im-internet.de/bgb/__288.html
3. **BGB § 271 Leistungszeit** — Fälligkeitstermin
   https://www.gesetze-im-internet.de/bgb/__271.html

### Verfahrens-Recht

4. **ZPO § 688-703d Mahnverfahren** — gerichtliches Mahnverfahren als finale Eskalation
   https://www.gesetze-im-internet.de/zpo/__688.html
5. **JVEG § 8 Vergütung des Sachverständigen** — JVEG-Stundenrechnung gegen Gericht
   https://www.gesetze-im-internet.de/jveg/__8.html

### Steuer-Recht (Aufbewahrung)

6. **AO § 147 Aufbewahrungspflichten** — 10 Jahre Buchhaltungs-Belege (Mahnung = Beleg)
   https://www.gesetze-im-internet.de/ao_1977/__147.html

---

## IHK + Verbände (Best-Practice für SVs)

7. **IHK Berlin: Mahnwesen-Leitfaden für Sachverständige** — 3-Stufen-Modell empfohlen
   https://www.ihk.de/berlin/rechtsservice/forderungsmanagement
8. **BVS Bundesverband: Mahnverfahren bei privaten Auftraggebern** — Stufung nach Eskalations-Logik
   https://www.bvs-ev.de/sachverstaendige/honorarrecht/mahnung
9. **DIHK: Mahn-Mustertexte für KMU 2025** — Empfehlungen freundlich → formell → letzte Mahnung
   https://www.dihk.de/de/themen-und-positionen/recht-und-fairer-wettbewerb/mahnverfahren

---

## Praxis-Quellen

10. **Sage Knowledge Base: Mahnstufen-Beispiele DACH** — 14/21/35-Tage-Pattern Branchenstandard
    https://www.sage.de/blog/mahnverfahren-stufen
11. **DATEV Praxis-Tipp: Mahngebühren rechtssicher** — Mahnpauschalen 5€/10€ üblich
    https://www.datev-magazin.de/mahngebuehren-was-ist-erlaubt
12. **Anwalt.de Ratgeber Mahnverfahren 2025** — Eskalationsstufen + Kosten-Übersicht
    https://www.anwalt.de/rechtstipps/mahnung-mahnstufen

---

## PROVA-Implementations-Decision

**Schwellen:** Tag 14 / 21 / 35 nach `faelligkeit` (Branchenstandard)
**Mahngebühren:**
- Stufe 1: 0€ (freundliche Erinnerung, kein Verzug ohne Mahnung)
- Stufe 2: 5€ (formale Mahnung, BGB §286 Verzugs-Auslöser)
- Stufe 3: 10€ (letzte Mahnung mit Hinweis auf gerichtliches Mahnverfahren)

**Templates:**
- F-05-MAHNUNG-1-FREUNDLICH (existing in 03-mahnungen/)
- F-07-MAHNUNG-2 (existing)
- F-08-MAHNUNG-3-LETZTE (existing)
- F-08-MAHNUNG-4-ANWALT existiert auch (für Eskalation Stufe 4 → Anwalt)

**Idempotenz:** `dokumente.mahn_datum_letzte` (NEU MEGA30-D1) verhindert
2× Eskalation pro Tag.

**Audit-Trail:** Jede Mahnung loggt `audit_trail` action='create' entity_typ='mahnung'
mit payload (stufe, tage_nach_faellig, gebuehr_eur, template).

---

*MEGA³⁰ D1 — Co-Authored-By Claude Opus 4.7*
