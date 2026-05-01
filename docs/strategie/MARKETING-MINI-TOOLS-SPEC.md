# Marketing Mini-Tools — Spezifikation

**Stand:** 02.05.2026 · S6 Deliverable, Implementation NACH S6
**Eigentümer:** Marcel + Claude Code
**Zweck:** SEO-optimierte Lead-Magnete unter `prova-systems.de/tools/*`

---

## Architektur-Prinzipien

- **Statische Sites** — Vanilla HTML/CSS/JS, kein React, kein Framework
- **Auf prova-systems.de (LANDING)** unter `/tools/<name>` — NICHT auf app.prova-systems.de
- **Keine Auth nötig** — öffentlich zugänglich
- **SEO-optimiert** — Schema.org-Markup, klare H1, meta-description, OG-Tags
- **Lead-Capture** — am Ende jedes Tools optionale Newsletter-Anmeldung
- **DSGVO-konform** — keine Tracking-Cookies, kein Google-Analytics ohne Consent
- **Mobile-First** — viele SVs sind im Auto / unterwegs
- **Branding einheitlich** mit LANDING (DM Sans + Navy)

---

## Tool 1 — JVEG-Rechner

### URL
`prova-systems.de/tools/jveg-rechner`

### SEO-Keywords (Primär)
- „JVEG Stundensatz Sachverständiger"
- „JVEG Honorar berechnen Bauschaden"
- „Honorar Gerichtsgutachten"
- „JVEG Anlage 1 Honorargruppen"

### Funktionalität

Interaktive Berechnung Honorar nach **Justizvergütungs- und -entschädigungsgesetz (JVEG)**:

```
Input:
  - Honorargruppe (1-13 nach Anlage 1 JVEG)
  - Stunden (auf 0.1 genau)
  - Schreibgebühren (Anzahl Anschläge)
  - Reisekosten (km)
  - Übernachtung (Nächte)
  - Sonstige Auslagen (€)

Output:
  - Stundensatz aus Honorargruppe (z.B. Gruppe 7 = 100€/h)
  - Gesamt-Honorar
  - PDF-Quittung als Download (mit PROVA-Branding)
```

### Lead-Magnet-Mechanik

Nach Berechnung Pop-up: „Honorargruppen aktualisieren sich. Newsletter abonnieren für JVEG-Updates und Mustertexte."

### Tech-Details

- Tabelle mit Honorargruppen-Sätzen aus JVEG-Anlage 1 (im JS hardcoded, jährlich aktualisierbar)
- Berechnung client-side (kein Server-Call nötig)
- PDF-Generierung optional via PDFMonkey-Public-Endpoint oder client-side mit jsPDF

### Aufwand

3-4h Implementation

---

## Tool 2 — Ortstermin-Checkliste

### URL
`prova-systems.de/tools/ortstermin-checkliste`

### SEO-Keywords (Primär)
- „Checkliste Ortstermin Sachverständiger"
- „Bauschaden Ortstermin Vorbereitung"
- „Ortstermin Pflicht-Punkte SV"

### Funktionalität

Interaktive Checkliste mit Toggle-Items:

```
Vor dem Termin
☐ Akteneinsicht erfolgt?
☐ Adresse + Anfahrtszeit geprüft?
☐ Beteiligte informiert? (Auftraggeber, Eigentümer, Bauunternehmer)
☐ Werkzeuge eingepackt? (Maßband, Feuchtemessgerät, Kamera, Stift, Block)
☐ Kamera geladen?
☐ Akkupack als Backup?
☐ Visitenkarten?
☐ Pflicht-Hinweis-Texte griffbereit (§407a, Schweigepflicht)?

Beim Termin
☐ Identitäts-Check Bauherr/Eigentümer
☐ Schaden(s) lokalisieren + nummerieren
☐ Foto-Übersicht + Detail (jedes Schadensbild)
☐ Maße aufnehmen
☐ Zeugen-Aussagen protokollieren
☐ Sicht-Befunde dokumentieren
☐ Ggf. zerstörungsfreie Messungen

Nach dem Termin
☐ Notizen finalisieren binnen 2 Stunden
☐ Fotos sortieren + benennen
☐ Folgetermine vereinbaren falls nötig
```

### Lead-Magnet-Mechanik

Am Ende: „Diese Checkliste als PDF herunterladen". E-Mail-Eingabe → PDF-Download + Newsletter-Opt-in (Double-Opt-in).

### Tech-Details

- LocalStorage-Persistierung der Checkbox-States (Stand bleibt beim Reload)
- PDF-Generation mit jsPDF (client-side) oder via Resend-Email-Send
- Print-CSS für Browser-Druck

### Aufwand

2-3h

---

## Tool 3 — Widerrufsfrist-Rechner

### URL
`prova-systems.de/tools/widerrufsfrist`

### SEO-Keywords (Primär)
- „14-Tage-Frist Privatauftrag Sachverständiger"
- „Widerrufsbelehrung Sachverständiger BGB §312g"
- „Bauschaden Privatauftrag Widerruf"

### Funktionalität

Prüfung der **14-Tage-Widerrufsfrist** bei Privat-Auftraggeber nach §312g BGB:

```
Input:
  - Datum Vertragsschluss (Auftrag-Datum)
  - Datum Widerrufsbelehrung-Versand
  - Auftraggeber-Typ (Privat / Gewerbe / Behörde)

Output:
  - Frist läuft bis: [Datum]
  - Tage verbleibend: [N]
  - Status: aktiv / abgelaufen / nicht-anwendbar
  - Hinweis: bei Privat-Auftrag VOR Frist-Ablauf KEIN Honorar verrechnen
```

### Lead-Magnet-Mechanik

„Widerrufsbelehrungs-Mustertext als PDF herunterladen" → E-Mail-Capture

### Tech-Details

- Berechnung in JS mit `Date`-Math
- Mustertext-PDF via PDFMonkey-Public-Template

### Aufwand

2h

---

## Tool 4 — §407a-KI-Hinweis-Generator

### URL
`prova-systems.de/tools/ki-hinweis-407a`

### SEO-Keywords (Primär)
- „§407a ZPO KI-Hinweis Mustertext"
- „KI im Sachverständigengutachten Hinweis"
- „Sachverständigen-Hinweis Künstliche Intelligenz Pflicht"

### Funktionalität

Mini-Tool das einen rechtssicheren KI-Hinweis-Text für Gutachten generiert:

```
Input:
  - Gutachten-Typ (Schadensgutachten / Wertgutachten / Beratung / Baubegleitung)
  - KI-Funktionen genutzt (Multi-Select):
    ☐ Diktat-zu-Text (Whisper)
    ☐ Strukturhilfe / Absatz-Vorschläge
    ☐ Konjunktiv-II-Prüfung
    ☐ Halluzinations-Check
    ☐ Norm-Vorschläge
    ☐ Keine
  - Sachverständiger-Name (für Mustertext)
  - Datum

Output:
  - Rechtssicherer Hinweis-Text als COPY-PASTE-Block
  - Plus: Standard-§407a-Erläuterung als Beilage
  - Plus: PROVA-Branding-CTA „PROVA macht das automatisch"
```

### Mustertext-Beispiel

```
Hinweis nach §407a Abs. 2 ZPO:

Bei der Erstellung dieses Gutachtens wurden folgende KI-gestützte 
Hilfsfunktionen eingesetzt:

- Diktat-zu-Text-Transkription (Whisper, OpenAI)
- Strukturierungs-Vorschläge (GPT-4o, OpenAI)
- Konjunktiv-II-Prüfung bei Kausalaussagen (GPT-4o, OpenAI)
- Halluzinations-Check vor Freigabe (automatischer Abgleich gegen Befunde)

Die fachliche Bewertung, das Fachurteil nach §6 sowie alle 
Schluss­folgerungen wurden ausschließlich vom Sachverständigen 
[Name] persönlich erarbeitet. Die KI-Hilfen sind reine 
Strukturierungs- und Prüfwerkzeuge ohne eigenständige 
fachliche Bewertung.

Vor jeder KI-Verarbeitung erfolgte eine Pseudonymisierung 
personenbezogener Daten. Datenschutz nach DSGVO ist gewährleistet.

[Datum] · [Sachverständiger]
```

### Lead-Magnet-Mechanik

Nach Generierung: „Diesen Mustertext für jedes Gutachten automatisch einfügen — PROVA macht das. Kostenfrei testen."

### Tech-Details

- Templates client-side, kein Server-Call
- Copy-to-Clipboard + Print-Friendly

### Aufwand

2h

---

## Cross-Tool-Funktionen

- **Newsletter-Form** (gemeinsame Komponente) — schreibt in Supabase `team_interest` oder eigene `newsletter`-Tabelle
- **Branding-Header/Footer** (gemeinsam) — Logo, Hauptmenü, Footer
- **OG-Tags + Schema.org** pro Tool für SEO + Social-Sharing
- **Sitemap-Eintrag** unter `prova-systems.de/sitemap.xml`
- **Verlinkung** zwischen Tools („mehr Tools für SVs") + zu Landing-Hauptseite

---

## Bauen-Reihenfolge (Vorschlag)

1. **JVEG-Rechner** zuerst (höchstes SEO-Volumen, längste Verweildauer auf Page)
2. **Ortstermin-Checkliste** (höchste Lead-Capture-Rate erwartet)
3. **§407a-KI-Hinweis** (perfekter Hook zur PROVA-Konversion)
4. **Widerrufsfrist** (kleinster Build, fix dazu)

**Total-Aufwand:** ~10-12h Implementation + 2-3h SEO/Branding-Polish

---

## Akzeptanz-Kriterien

- [ ] Lighthouse Performance ≥ 95 pro Tool
- [ ] Lighthouse SEO ≥ 100 pro Tool
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Lead-Capture-Form schreibt erfolgreich in DB
- [ ] PDF-Download funktioniert auf Mobile + Desktop
- [ ] Tools sind in Sitemap.xml + Navigation eingebunden
- [ ] Newsletter-Confirmation-Mail (Double-Opt-in)

---

*Mini-Tools-Spec 02.05.2026 · Implementation in Sprint nach S6*
