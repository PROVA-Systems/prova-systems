# PROVA Pilot Email-Templates (MEGA²⁵ Phase 6)

**Stand:** 2026-05-09
**Zielgruppe:** Marcel für Pilot-Outreach + Onboarding-Sequenz

---

## Template 1: Cold-Outreach (an potenzielle Pilot-SVs)

**Subject:** PROVA — KI-Strukturhilfe für SV — Founding-Member-Spot

```
Hallo [VORNAME],

ich bin Marcel Schreiber, ö.b.u.v. Sachverständiger seit 30 Jahren in
[REGION]. In den letzten Monaten habe ich eine Software gebaut, die
genau das Problem löst, das uns SVs alle kennt: das Schreiben.

PROVA ist eine KI-Strukturhilfe für Bausachverständige. Du diktierst
deine Befunde, KI strukturiert sie zu §-Abschnitten, du verfasst das
§6 Fachurteil — wie du es immer gemacht hast — und PROVA generiert
dir das fertige PDF nach IHK-SVO.

Wichtig: KI macht NIE deine fachliche Bewertung. Du bleibst nach
§407a ZPO letztverantwortlich. PROVA hilft dir nur beim
Strukturieren, Konjunktiv-II-Check, Rechtschreibung.

Ich suche 10 Founding-Member, die PROVA in den nächsten 90 Tagen
ausprobieren. Im Gegenzug:
- 125 €/Monat lifetime (statt 179 €)
- Direkter Draht zu mir bei Bug-Reports + Feature-Wünschen
- 90 Tage Trial gratis

Hättest du Lust auf 30 Min Demo-Call? Ich zeige dir das System live.

Beste Grüße,
Marcel Schreiber

PS: Die App läuft seit 6 Monaten in meinem Büro produktiv. Gute
zwei Stunden Zeit-Ersparnis pro Gutachten.

—
ö.b.u.v. Sachverständiger nach §36 GewO
[ANSCHRIFT]
```

---

## Template 2: Welcome-Email (nach Signup)

**Subject:** Willkommen bei PROVA — deine ersten 30 Min

```
Hallo [VORNAME],

danke für deine Anmeldung als Founding-Member. Ich freue mich,
dich an Bord zu haben.

DEINE ERSTEN 30 MINUTEN MIT PROVA:

1. Welcome-Wizard durchklicken (4 Steps)
   → app.prova-systems.de
   → Persona wählen (Solo / Team / SV-Anwalt)
   → Mode wählen (A=Standard, B=Editor, C=Vorlage)
   → Tour starten
   → Demo-Akte ansehen

2. Erste echte Akte erstellen (10 Min)
   → "Neue Akte" → Aktenzeichen + Schadenart
   → Vor-Ort-Diktat starten (Browser-Mikro)
   → KI-Strukturierung läuft im Hintergrund

3. §6 Fachurteil verfassen (15 Min)
   → KI-Hilfe nutzen für Konjunktiv-II + Halluzinations-Check
   → Mindestens 500 Zeichen + 2 Qualitäts-Marker
   → Freigabe → automatisches PDF

WICHTIG:
- Der erste Beweisbeschluss-Upload braucht eine gespeicherte Akte
  (Stammdaten zuerst, dann PDF hochladen)
- Bei Fragen: einfach diese Email beantworten — ich antworte
  persönlich (max 24h, oft <1h)

Viel Erfolg,
Marcel

PS: Ich bin in der Pilot-Phase aktiv erreichbar. WhatsApp:
[NUMMER] für dringende Fragen.
```

---

## Template 3: Day-1 Check-In

**Subject:** PROVA Tag 1 — alles geklappt?

```
Hallo [VORNAME],

24h sind seit deinem Signup vergangen. Drei kurze Fragen:

1. Konntest du den Welcome-Wizard ohne Probleme durchklicken?
   ☐ Ja, war intuitiv
   ☐ Nein, hier hakelte es: [____]

2. Hast du schon eine Akte angelegt?
   ☐ Ja
   ☐ Noch nicht — bin überfordert
   ☐ Habe versucht, ist abgestürzt: [____]

3. Was würdest du dir als nächstes wünschen?
   [____________________________________]

Antworte einfach mit der Nummer + Antwort. Ich schaue mir jeden
Bug-Report persönlich an.

Beste Grüße,
Marcel
```

---

## Template 4: Day-7 Feedback-Email

**Subject:** PROVA — Tag 7 Status

```
Hallo [VORNAME],

eine Woche PROVA — Zeit für ehrliches Feedback.

5-Minuten-Survey: [TALLY-FORMULAR-LINK]

Optional: 30-Min Calls bei mir buchbar:
[CALENDLY-LINK]

Ich lese jede Antwort und priorisiere die Top-3 Wünsche im
nächsten Sprint.

Beste Grüße,
Marcel

PS: Falls du in dieser Woche eine Akte fertig erstellt hast —
gerne ein Screenshot vom PDF? Das hilft mir bei der
Qualitäts-Validierung.
```

---

## Template 5: Day-30 Iteration-Decision

**Subject:** PROVA Monat 1 — was bleibt, was kommt

```
Hallo [VORNAME],

ein Monat PROVA. Aus deinen + den Antworten der anderen 9 Pilot-SVs
wurden folgende Top-3 Verbesserungen priorisiert:

1. [FEATURE-1 — z.B. "Beweisbeschluss-LLM-Extraktion"]
2. [FEATURE-2 — z.B. "Mobile-PDF-Sharing"]
3. [FEATURE-3 — z.B. "Mehrere Vorlagen pro Akte"]

Implementation startet diese Woche, Live in 2 Wochen.

ERFAHRUNGS-WERTE NACH 30 TAGEN PILOT:
- Anzahl Akten erstellt: [N]
- Durchschnittliche Schreibzeit pro Akte: [N] Min (vorher: [N] Min)
- Bug-Rate: [N]/100 (Ziel: <5/100)

DANKE für dein Feedback in dieser ersten Phase. Die nächsten 60
Tage sind kostenlos für dich. Falls du danach bleiben möchtest:
deine Karte wird automatisch belastet (125€/Monat lifetime
Founding-Status).

Solltest du nicht mehr nutzen wollen: einfach diese Email
beantworten, ich kündige sofort + lösche deine Daten.

Beste Grüße,
Marcel
```

---

## Template 6: Critical-Bug-Hotfix-Notification

**Subject:** [PROVA] Hotfix deployed — bitte einmal Page-Reload

```
Hallo,

ein kritischer Bug in [BEREICH — z.B. Diktat-Aufnahme] wurde
soeben gefixt. Alle Pilot-Member sollten kurz die Page neu laden
(Strg+F5 oder Cmd+Shift+R).

Was war kaputt:
[KURZE BESCHREIBUNG]

Was wurde gefixt:
[KURZE BESCHREIBUNG]

Service-Worker-Update:
sw.js v[ALT] → v[NEU]

Falls du in den letzten 2 Stunden eine Akte verloren hast:
schreibe mir, ich schaue im Audit-Trail nach.

Beste Grüße,
Marcel
```

---

## Email-Versand-Konfiguration

### SMTP-Config (Netlify ENV-Vars)
```
SMTP_HOST=smtp.ionos.de        (oder Resend)
SMTP_USER=marcel@prova-systems.de
SMTP_PASS=<server-only>
SMTP_FROM=PROVA <noreply@prova-systems.de>
SMTP_PORT=587
```

### Reply-To-Setup
- Reply-To: `marcel.schreiber891@gmail.com` (für persönliche Antworten)
- Optional: `kontakt@prova-systems.de` (für Support-Ticket-Routing)

### DSGVO-Footer (Pflicht)
```
—
PROVA Systems — Marcel Schreiber, ö.b.u.v. SV
[Anschrift]
USt-ID: DE[NUMBER]

Datenschutz: prova-systems.de/datenschutz.html
Abbestellen: einfach Antwort "Bitte abmelden"
```

---

## Personalisierungs-Variablen

Verwende beim Versenden:
- `[VORNAME]` — aus Signup-Form
- `[NACHNAME]` — aus Signup-Form
- `[REGION]` — aus IHK-Region
- `[SPEZIALISIERUNG]` — z.B. "Schimmel- und Feuchteschäden"
- `[ANZAHL_AKTEN]` — aus admin-cockpit
- `[TALLY-FORMULAR-LINK]` — Pilot-Feedback-Form
- `[CALENDLY-LINK]` — 30-Min-Slot-Buchung

---

## A/B-Test-Vorschläge (post 5 Pilots)

| Variante | Subject A | Subject B |
|---|---|---|
| Cold-Outreach | "PROVA — KI-Strukturhilfe für SV" | "[VORNAME], 2h Zeit-Ersparnis pro Gutachten?" |
| Welcome | "Willkommen bei PROVA" | "[VORNAME], dein 30-Min-Quickstart" |
| Day-7 | "PROVA — Tag 7 Status" | "Wie war deine erste Woche mit PROVA?" |

Tracking via Plausible-Goals (siehe MONITORING-Setup).

---

*MEGA²⁵ Email-Templates — bereit für Pilot-Outreach.*
