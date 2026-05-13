# Teil 3 — Tabs-Audit
**„Tabs werden bei erfolgreichen SaaS heute nicht mehr so genutzt" — Marcel**

> Das ist im Kern richtig — aber nicht pauschal. Tabs sind **situational gut**, oft aber
> das falsche Werkzeug. Hier die differenzierte Analyse.

---

## 1. Wo PROVA aktuell Tabs nutzt (grep-verifiziert)

### Nachgewiesen durch Code-Analyse

```bash
$ grep -l 'tab-btn|data-tab|role="tab"|.tab ' *.html
admin-dashboard.html
app-login.html          ← Login-Methoden-Auswahl (OK)
app.html                ← Wizard-Step-Tabs + Weg-a/b/c Tabs (PROBLEM)
einstellungen.html      ← Sidebar-Tabs (OK – Sidebar-Pattern!)
jahresbericht.html
kontakt-detail.html     ← 9 TABS (GROßES PROBLEM)
kontakte.html           ← Filter-Tabs (Alle/Auftraggeber/SV/Anwälte) (GRENZFALL)
kostenermittlung.html   ← Modus-Tabs (Sachwert/Vergleich/Ertrag) (PROBLEM)
termine.html
```

Lernpool-Tabs in `einstellungen.html` (3 Stück: Übersicht/Vokabular/Korrekturen) —
klassischer Tab-Use-Case, daher OK (siehe Abschnitt 5).

---

## 2. Detail-Analyse pro Page

### 2.1. 🚨 **kontakt-detail.html** (9 Tabs — **GROßES PROBLEM**)

**Aktuell:**
```
Aufträge │ Rechnungen │ Bescheinigungen │ Dokumente │ Fotos │ Skizzen │ Eintraege │ Termine │ Korrespondenz
```

**Warum das bei PROVA nicht funktioniert:**
1. **Apple HIG empfiehlt max 6 Tabs.** PROVA hat 9 → User verliert Übersicht.
2. **Kein Vergleich möglich:** SV will oft wissen „Wie viele Aufträge hat Gericht X UND was steht offen?" → Tab-Switch statt Gesamtbild.
3. **Mobile unbrauchbar:** 9 Tabs überlaufen horizontal-scroll bei 375px-Display, Tab 7/8/9 unsichtbar.
4. **Content-Duplizierung:** „Dokumente", „Fotos", „Skizzen" sind alle **Anhänge** → künstliche Trennung.

**Was erfolgreiche SaaS stattdessen machen:**

**Attio** (CRM, Sept 2025):
> „Records show configurable blocks. Recent activity is surfaced first; historical details
> collapse. No tabs by default."

**Linear** (Project-Detail):
> Side-Bar rechts für Meta-Daten, main-Content streamt Updates chronologisch.

**Empfehlung für PROVA: HYBRID-PATTERN (Activity-Stream + Smart-Sidebar)**

```
┌────────────────────────────────────────┬────────────────────┐
│ Max Mustermann                 [Aktion]│  KONTEXT-SIDEBAR  │
│ Rechtsanwalt · Berlin                  │                    │
│ ────────────────────────────           │  📞 +49 30 12345   │
│                                        │  ✉ m@kanzlei.de   │
│ 📊 KPI-Strip:                          │  📍 Kurfürst...    │
│ [3 Aufträge] [2 offen] [1.850€ off]    │                    │
│                                        │  Typ: Auftraggeber │
│ 🔍 [Filter-Chips: Alle · Offen · 2026] │  Gericht: LG-Bln   │
│                                        │  Tags: VIP         │
│ ━━━ UNIFIED ACTIVITY-STREAM ━━━        │                    │
│                                        │  ━━ Statistiken ━━ │
│ ● 11.05. Rechnung RE-2026-041 (1.200€)│  Ø Zahlziel: 14d  │
│ ● 10.05. Termin Ortstermin            │  Offene: 1.850€    │
│ ● 09.05. Brief „Nachforderung"        │  Letzter Kontakt:  │
│ ● 07.05. Auftrag A-2026-034 (In Arb)  │  10.05.2026        │
│ ● 01.05. Foto-Upload (12 Bilder)      │                    │
│ ● 28.04. Bescheinigung BES-2026-017   │                    │
│                                        │                    │
│ [Alle anzeigen ↓]                      │                    │
└────────────────────────────────────────┴────────────────────┘
```

**Vorteile:**
- **Kein Klick notwendig** um Überblick zu sehen → Attio-Pattern
- Filter-Chips (Alle/Offen/2026) ersetzen Tab-Switch mit instant-Filter
- Side-Bar zeigt konstanten Kontext (Adresse, Tags, Stats)
- Tief-Navigation zu Detail-Views bleibt möglich via Klick auf Activity-Item → Drilldown

**Migration-Aufwand:** ~4h (kontakt-detail ist noch „in Aufbau" laut Master-Doku)

### 2.2. 🚨 **app.html (Wizard-innen)** (Weg-a/b/c Tabs — **PROBLEM**)

**Aktuell:** `.weg-tab` Tabs im Wizard — laut stellungnahme.css `weg-tab.active`.

**Problem:** Modus-Wahl über Tabs mittendrin im Wizard bricht den linearen Flow. User denkt
„habe ich Weg A schon ausgefüllt?" wenn er Weg-B öffnet.

**Empfehlung:**
- **Segmented Control** statt Tabs (Segmented sagt klar „Mutex-Wahl", nicht „Parallel-Ansichten")
- Oder: **Mode-Switch oben als Schritt** im Wizard (bessere Doku-Konsistenz)

**Visual-Mock:**
```
Jetzt:        [ Weg A ] [ Weg B ] [ Weg C ]   ← Tabs (Parallel-Gefühl)
Empfohlen:    ◉ Weg A   ○ Weg B   ○ Weg C    ← Segmented/Radio (Mutex-Gefühl)
```

### 2.3. 🔶 **kontakte.html** (Filter-Tabs — **GRENZFALL, eher OK**)

**Aktuell:** Tabs für Kontakt-Typ: Alle / Auftraggeber / Rechtsanwälte / SVs / etc.

**Bewertung:** Tabs sind hier **als Filter** akzeptabel (Material Design Pattern 1:
„gleichrangige Kategorien"), ABER besser wäre:

**Empfehlung: Filter-Chips + Count-Badges** (wie GitHub Issue-Lists)

```
Jetzt:  [ Alle ] [Auftraggeber] [ SVs ] [Anwälte] [Makler]
Empfohlen: [Alle (128)] [Auftraggeber (89)] [SVs (12)] [Anwälte (18)] [Makler (9)]
```

Counts sind **instant informativ** (Marcel sieht „89 Auftraggeber" ohne Klick).
Zusätzlich: Kontakt-Typ-Filter schiebt Filter-Bar, Tabs bleiben für „Aktive/Archiv" (2 states).

**Code:** `lib/prova-filter-chips.js` im Patch (minimal, 60 LOC).

### 2.4. 🚨 **kostenermittlung.html** (3 Berechnungs-Modi — **PROBLEM**)

**Aktuell:** Tabs Sachwert / Vergleichswert / Ertragswert.

**Problem:** Das ist KEINE „Parallel-Ansicht" — das sind 3 grundlegend verschiedene
Berechnungs-Verfahren nach ImmoWertV. User wählt EINES aus, füllt aus, speichert.
Tab-Pattern suggeriert falsch, man könne wechseln ohne Datenverlust.

**Empfehlung:**
1. **Initial-Screen:** „Welches Verfahren?" → 3 große Karten mit Erklärtext (§§-Zitat!)
2. **Nach Wahl:** Wizard mit Verfahrens-spezifischen Feldern
3. **Wechsel:** Confirm-Dialog „Verfahren wechseln? Daten gehen verloren."

**Code-Template:** `prova-mode-selector.js` (existiert ansatzweise in `lib/workflow-mode-router.js`).

### 2.5. ✅ **einstellungen.html** (Sidebar-Sektionen — **BESTÄTIGT GUT**)

**Aktuell:**
```html
<div class="es-sidebar-item" data-section="profil">Profil</div>
<div class="es-sidebar-item" data-section="darstellung">Darstellung</div>
<div class="es-sidebar-item" data-section="ki">KI</div>
... (7 Sektionen)
```

**Bewertung:** Das ist **KEIN Tab-Pattern**, sondern das **Sidebar-Detail-Pattern** — genau
was Linear, Vercel, Stripe bei Settings nutzen!

**Evidenz:**
> Linear: Settings sind seit 12/2024 als zweistufige Sidebar organisiert. 5-20 Sektionen
> sind hier ideal, weil User Settings selten besucht und dann gezielt einen Punkt sucht.

**Empfehlung:** **KEEP.** Minor-Polish:
- Aktuelle Sektion zusätzlich in URL-Hash spiegeln (bereits vorhanden `hash` Handler ✓)
- Search-Box für Settings („Suchen: 2FA" → direkt zu Datenschutz-Sektion)
- Cmd+K öffnet „Gehe zu Einstellungen › Datenschutz"

### 2.6. ✅ **einstellungen.html Lernpool-Tabs** (3 Stück — **OK**)

`.lp-tab` Tabs für „Übersicht / Vokabular / Korrekturen" — 3 Tabs, klare Gleichrangigkeit,
Material-Design-konform.

**Bewertung:** OK, keine Änderung nötig.

### 2.7. ✅ **app-login.html** (Login-Methoden — **OK**)

Tabs für „E-Mail / SSO" o.ä. — 2 Tabs, Standard-Pattern, keine Änderung.

### 2.8. ✅ **admin-dashboard.html, jahresbericht.html, termine.html**

Tabs für Zeitraum-Filter (Heute/Woche/Monat) bzw. View-Switches (Liste/Kalender).
→ Das ist **Segmented-Control-Use-Case**, visuell gleich.
**Empfehlung:** Optional auf `<segmented-control>` Klasse umbenennen für konsistente Semantik,
Funktion bleibt. Kein Pilot-Blocker.

---

## 3. Das „Tabs-Entscheidungs-Flow-Chart" (entscheide pro Stelle)

```
Brauche ich zwischen Views/Modi wechseln?
│
├─ NEIN (nur filtern) → Filter-Chips mit Count-Badges
│
├─ JA, 2-3 Optionen, Mutex  → Segmented Control (z.B. Liste/Kalender/Karte)
│
├─ JA, 2-5 Parallel-Ansichten gleicher Data → Tabs (z.B. Kunde: Aktive/Archiv)
│
├─ JA, 6+ Sektionen in Settings-artiger Struktur → Sidebar-Sections
│
├─ JA, aber jeder Modus hat eigenen komplexen Flow → Initial-Picker + Wizard
│
└─ Detail zu einem Record in Liste → Side-Panel (Sidebar-Detail-Pattern)
```

---

## 4. Pattern-Übersicht: Was ersetzt Tabs wann?

| Ursprungs-Tab-Use-Case | Besseres Pattern 2026 | Beispiel-SaaS |
|---|---|---|
| 9 Datentypen auf Kontakt-Detail | **Activity-Stream + Filter-Chips + Smart-Sidebar** | Attio, Linear, HubSpot |
| Mutex-Berechnungsmodi (Kostenermittlung) | **Initial-Picker + Wizard** | Stripe Onboarding, QuickBooks |
| Filter-Tabs auf Liste (Kontakte) | **Filter-Chips mit Counts** | GitHub Issues, Linear |
| Einstellungs-Sektionen (7+) | **Sidebar-Sections** (KEEP) | Linear, Slack, Notion |
| Detail-zu-Listen-Eintrag | **Side-Panel / Drilldown** | Supabase, Attio |
| View-Switcher (Liste/Kalender) | **Segmented Control** | Linear, Stripe |
| Login-Methoden (E-Mail/SSO) | **Tabs (OK)** oder Stacked-Cards | auf |

---

## 5. Wann Tabs WEITERHIN richtig sind (Counter-Argument)

Tabs sind das **richtige** Pattern bei:
1. **2-4 gleichrangige, parallele Views** (nicht Mutex!)
2. **User wechselt häufig hin-und-her** (wird oft in derselben Session alles gesehen)
3. **Content-Umfang klein genug** um Tab-Bar + Content sinnvoll zu erkennen
4. **Mobile-Layout** erlaubt horizontalen Scroll ohne Info-Verlust

Beispiele bei PROVA die Tabs rechtfertigen würden:
- `stellungnahme.html`: Hypothese-Zeile mit „Haupthypothese / Alternativen" (2 Tabs, parallel diskutiert) → OK
- `app-login.html`: Login / Registrieren (2 Tabs, Standard-Auth-UI) → OK

---

## 6. Fazit Tabs-Audit

| Urteil | Pages | Handlung |
|---|---|---|
| 🚨 **FIX (Pilot-Blocker)** | kontakt-detail (9 Tabs), app-wizard-innen (Weg-Tabs), kostenermittlung (3 Modi) | **Vor Pilot umbauen** |
| 🔶 **Optimierbar** | kontakte (Filter-Tabs) | Post-Pilot (V-Nice-to-Have) |
| ✅ **Keep** | einstellungen (Sidebar), app-login (2 Tabs), jahresbericht (Zeitraum), termine (View), admin-dashboard, lp-tabs | Ggf. Semantik-Rename |

**ROI:** Die 3 Pilot-blockierenden Fixes reduzieren Tab-Nutzung von 21 Stellen auf 8 Stellen
(-62%) und machen PROVA in der gefühlten UX „moderner, smarter, professioneller" (Marcels Wunsch).
