# SPRINT 09 — B4 KI-als-Werkzeug für §6 Fachurteil

**Tag:** 9-10 (2 Tage)  |  **Aufwand:** 15-17h  |  **Phase:** B Produkt-Kern

---

## Ziel
Das §6 Fachurteil wird so gebaut, dass der SV es **ohne KI** schneller und besser schreiben kann als **mit** KI — dann entsteht echte Eigenleistung, und die KI wird zum optionalen Nachsteller statt zum Primär-Autor.

**Kernprinzip §407a ZPO:** Der SV sieht zuerst sich selbst, nicht die KI. Alle KI-Hilfen sind opt-in. Alle Änderungen am Text brauchen expliziten SV-Klick.

---

## Sprint-Start-Ritual
1. **Code-Check:** `stellungnahme-logic.js`, `freigabe-logic.js`, `ki-proxy.js` — was existiert?
2. **Pflicht-Input:** `KI-PROMPTS-MASTER.md` muss im Projekt-Root liegen (Marcel bringt das mit). Ohne diese Datei kann Sprint nicht starten.
3. **Datenfluss:** Welche KI-Calls laufen heute, welche kommen neu dazu?
4. **Scope-Fix:** Nur §6-Werkzeuge + KI-Prüfungen + Einstellungen. Nicht Bibliothek-Pattern (Sprint 8).

---

## Die drei KI-Verantwortungs-Stufen

**S1 — Mechanisch (Rechtschreibung, Kommas, Grammatik):** Regel-basiert, unbedenklich, kann live laufen
**S2 — Strukturell (Absätze, Überschriften, Listen):** Auf Klick, zeigt Diff, SV bestätigt pro Änderung
**S3 — Inhaltlich (Konjunktiv II, Halluzinations-Check, Fachsprache):** Nur auf Klick, mit Begründung, SV entscheidet pro Stelle

**§407a-Compliance:** S1 und S2 dürfen automatisch laufen. S3 braucht expliziten SV-Klick. Kein Änderungs-Vorschlag wird ohne Bestätigung übernommen.

---

## Scope

### Sprint 9a (Tag 9) — Kern-Checks (8h)

**1. §6-Editor Grund-Umbau (2-3h)**
- Großes leeres Textfeld dominiert Seite (60% Viewport)
- Fokus automatisch im Feld
- Placeholder "Beginnen Sie mit Ihrer fachlichen Einschätzung..."
- Befunde-Panel rechts (kompakt, aus §1-§5 extrahiert, rein faktisch, keine Formulierungen)
- Live-Qualitäts-Marker unter Textfeld (Regex-basiert, kostenlos):
  - Norm-Referenzen (`DIN \d+`, `WTA \d+`, `UBA`, `VOB`)
  - Konjunktiv II-Formen (`wäre`, `würde`, `dürfte`, `könnte`, `hätte`, `sollte`)
  - §-Verweise (`§ ?\d+`)
- Browser-Spellcheck aktivieren (`spellcheck="true"`, `lang="de-DE"`)
- Gate: 500+ Zeichen UND 2/3 Qualitäts-Marker → Button "Fachurteil übernehmen" wird aktiv
- Override-Link "Trotzdem freigeben →" mit Modal-Bestätigung + Audit-Eintrag

**2. Konjunktiv-II-Check via GPT-4o (1,5h)**
- Neue Function `netlify/functions/ki-konjunktiv.js`
- Prompt aus `KI-PROMPTS-MASTER.md` (32K Zeichen, Marcels bestehender Prompt)
- Response-Format: Array von Befunden mit stelle/problem/vorschlag/dringlichkeit
- Kosten: ~0,048€ pro Check (GPT-4o)

**3. Halluzinations-Check via GPT-4o (1h)**
- Neue Function `netlify/functions/ki-halluzinations-check.js`
- Prompt aus `KI-PROMPTS-MASTER.md`
- Prüft: Enthält §6-Text Behauptungen, die NICHT in §1-§5-Daten belegt sind?
- Läuft **automatisch vor Freigabe** (nicht abschaltbar bei Gerichtsgutachten)
- Bei Findings: Modal vor Freigabe mit Liste der unbelegten Behauptungen

**4. §407a-Check-Logic (45 Min)**
- Läuft automatisch vor Freigabe
- Prüft: Eigenleistung ≥ 500 Zeichen? Konjunktiv-II vorhanden? KI-Offenlegung aktiv?
- Bei Gerichtsgutachten: nicht abschaltbar
- Bei anderen Auftragstypen: abschaltbar in Einstellungen

**5. UI-Komponente "KI-Vorschläge" (2h)**
- Einheitliche Komponente für alle S2/S3-Checks
- Zeigt pro Befund: Stelle, Problem, Vorschlag, Begründung, Dringlichkeit-Symbol
- Pro Befund: [Ersetzen] [Ignorieren]-Buttons
- Sidepanel-Layout, blockiert nicht den Editor

**6. Tests Kern-Funktionen (1h)**
- Siehe "KI-Funktions-Garantie" unten

---

### Sprint 9b (Tag 10) — Zusatz-Checks + Einstellungen (7-9h)

**1. Kommasetzung via GPT-4o-mini (1h)**
- Function `netlify/functions/ki-kommasetzung.js`
- Einfacher Prompt: "Prüfe deutsche Kommasetzung nach Duden-Regeln"
- JSON-Response wie Konjunktiv-Format
- Kosten: ~0,001€ pro Check

**2. Grammatik via GPT-4o-mini (45 Min)**
- Function `netlify/functions/ki-grammatik.js`
- Prüft: Verbform, Artikel, Zeitenkonsistenz

**3. Absätze ordnen via GPT-4o-mini (1,5h)**
- Function `netlify/functions/ki-absaetze.js`
- Erkennt thematische Wechsel
- Fügt Absatzumbrüche ein, **ändert keine Wörter**
- Diff-Anzeige im UI (Was war? Was neu?)
- SV kann pro Absatz zustimmen

**4. Fachsprache-Check via GPT-4o-mini (1h)**
- Prompt aus `KI-PROMPTS-MASTER.md`
- Erkennt: umgangssprachliche Ausdrücke, uneinheitliche Begriffe, nicht eingeführte Abkürzungen

**5. Normen-Konsistenz-Check (45 Min)**
- Function `netlify/functions/ki-normen-check.js`
- Prüft: einheitliche Zitierweise, aktuelle Normen, Widersprüche §4↔§6

**6. Einstellungen-Page-Block (1,5h)**
- Neuer Abschnitt "KI-Assistent" in einstellungen.html
- Toggles: Rechtschreibung live, Qualitäts-Marker live, Halluz-Check, §407a-Check
- Profi-Modus: ein Toggle schaltet alle Live-Funktionen aus
- KI-Nutzungs-Anzeige: Umsatz, KI-Kosten, Quote
- "Details anzeigen"-Link → Aufschlüsselung pro Funktion

**7. KI-Kosten-Tracking (30 Min)**
- Jeder KI-Call loggt in `KI_STATISTIK`:
  - sv_email, funktion, modell, tokens_in, tokens_out, kosten_eur, fall_id
- Aggregation erfolgt per Airtable-Lookup/Formel
- Admin-Cockpit-Widget liest daraus (in Sprint 18)

**8. Hilfsmittel-Toolbar finalisieren (1h)**
- Gestaffelt nach Häufigkeit
- **Häufig sichtbar:** Rechtschreibung, Konjunktiv-II, Absätze
- **Bibliothek:** Norm, Baustein, §-Verweis (aus Sprint 8)
- **"Weitere Prüfungen" Drawer:** Kommas, Grammatik, Präzisierung, Fachsprache, Normen-Konsistenz
- **KI-Strukturvorschlag** unten als optionaler Helfer

**9. Tests Zusatz-Funktionen (30 Min)**

---

## Die "KI-Funktions-Garantie"-Regel

**Jede KI-Funktion muss vor Produktiv-Deployment diese 5 Tests bestehen:**

### Test 1 — Funktionalität (Happy Path, 10 Beispiele)
10 realistische SV-Texte durchlaufen. Jede KI-Funktion muss für alle 10 ein sinnvolles Ergebnis liefern. Kein Absturz, kein leeres JSON, kein Timeout.

### Test 2 — Edge-Cases (5 Extreme)
- Sehr kurzer Text (< 50 Zeichen)
- Sehr langer Text (> 5000 Zeichen)
- Text ohne Satzzeichen
- Text mit vielen Fachbegriffen
- Text mit Tippfehlern

Jede Funktion muss bei allen 5 **entweder** sinnvolles Ergebnis liefern **oder** sauberes "nicht anwendbar"-Feedback zeigen. Kein kryptischer Fehler.

### Test 3 — Präzision (Falsch-Positiv-Rate)
Bei 20 grammatikalisch einwandfreien Texten: maximal 10% Falsch-Positiv-Rate.

### Test 4 — Konsistenz (Reproduzierbarkeit)
Gleicher Text 3× durchlaufen → im Kern gleiches Ergebnis.

### Test 5 — Zeitverhalten
Antwortzeit < 10 Sekunden. Bei längerer Ladezeit: Progress-Indikator mit Text, nicht spinnender Kreis.

**Test-Dokumentation:** Pro Funktion eine Test-Datei `tests/ki-{funktion}.spec.js`. Wenn ein Test rot ist, wird die Funktion **ausgeblendet** im UI, bis sie grün ist.

---

## Prompt für Claude Code

```
PROVA Sprint 09a + 09b — KI-Werkzeug fuer §6 (Tag 9-10)

Pflicht-Lektuere:
- KI-PROMPTS-MASTER.md (Projekt-Root — muss vorhanden sein)
- CLAUDE.md (Regel 10 DSGVO, Regel 14 node --check)
- stellungnahme-logic.js, freigabe-logic.js, ki-proxy.js
- Masterplan-v2: 00_MASTERPLAN.md, 01_UI-PRINZIPIEN.md

KONTEXT
=======
§6 Fachurteil wird umgebaut nach Leitsatz:
"SV muss ohne KI schneller/besser schreiben koennen als mit KI."

Leer-Feld dominiert Seite. Befunde als Rohstoff rechts. KI-Hilfen opt-in.
Konjunktiv-II braucht GPT-4o (nicht mini!). Halluz + §407a automatisch vor Freigabe.

3 Verantwortungs-Stufen:
- S1 Mechanisch (Rechtschreibung, Kommas, Grammatik) — live ok
- S2 Strukturell (Absaetze, UEberschriften) — auf Klick mit Diff
- S3 Inhaltlich (Konjunktiv II, Halluz, Fachsprache) — auf Klick mit Begruendung

SCOPE SPRINT 09a (Tag 9, 8h)
=============================

Commit 1: stellungnahme-logic.js §6-Editor Umbau
- Leeres Textfeld 60% Viewport, Fokus automatisch
- Placeholder "Beginnen Sie mit Ihrer fachlichen Einschaetzung..."
- Befunde-Panel rechts (aus §1-§5 extrahiert, nur Fakten)
- Live-Regex-Marker: Norm, Konjunktiv-II, §-Verweis
- spellcheck="true" lang="de-DE"
- Gate: 500+ Zeichen UND 2/3 Marker → Submit aktiv
- Override-Link mit Modal + AUDIT_TRAIL

Commit 2: ki-konjunktiv.js (Netlify Function)
- Prompt aus KI-PROMPTS-MASTER.md einlesen
- GPT-4o (NICHT mini — Marcels explizite Anforderung)
- Response: {befunde: [{stelle, problem, bewertung, vorschlag, dringlichkeit}]}
- JWT-Pflicht (Sprint 3), Rate-Limit 5/Min/User

Commit 3: ki-halluzinations-check.js
- Prompt aus KI-PROMPTS-MASTER.md
- GPT-4o
- Input: §1-§5-Daten + §6-Text
- Response: {unbelegte_behauptungen: [{stelle, begruendung}]}
- Modal-Trigger vor Freigabe

Commit 4: §407a-Check-Logic
- Client-seitig: Pruefe Eigenleistung + Konjunktiv-II + KI-Offenlegung
- Bei Gerichtsgutachten: nicht abschaltbar
- Bei anderen: abschaltbar in Einstellungen

Commit 5: UI-Komponente prova-ki-vorschlaege.js
- Einheitliche Anzeige fuer alle S2/S3-Checks
- Pro Befund: Dringlichkeits-Icon, Stelle, Problem, Vorschlag, Buttons

Commit 6: Tests fuer Kern-Funktionen
- tests/ki-konjunktiv.spec.js mit 10 Happy-Path + 5 Edge-Case
- tests/ki-halluzinations.spec.js
- Falsch-Positiv-Rate messen

TAG-BEFUND Sprint 09a: v180-ki-kern-done


SCOPE SPRINT 09b (Tag 10, 7-9h)
================================

Commit 7: ki-kommasetzung.js
Commit 8: ki-grammatik.js
Commit 9: ki-absaetze.js (mit Diff-Response)
Commit 10: ki-fachsprache.js
Commit 11: ki-normen-check.js
- Alle mit GPT-4o-mini (ausser explizit anders markiert)
- Einheitliches Response-Format

Commit 12: einstellungen.html erweitern
- Neuer Block "KI-Assistent"
- 4 Toggle: Rechtschreibung live, Marker live, Halluz-Check, §407a-Check
- Profi-Modus-Toggle (schaltet alle Live aus)
- KI-Nutzungs-Anzeige: Umsatz, Kosten, Quote
- "Details anzeigen" → Aufschluesselung

Commit 13: KI-Kosten-Tracking
- In ki-proxy.js: nach jedem Call Airtable-Insert in KI_STATISTIK
- Felder: sv_email, funktion, modell, tokens_in, tokens_out, kosten_eur, fall_id, zeitpunkt
- Kostentabelle als Konstante: GPT-4o 5€/Mio In, 15€/Mio Out; Mini 0,15€/0,60€
- Berechnung pro Call

Commit 14: Hilfsmittel-Toolbar finalisieren
- Haeufig: Rechtschreibung, Konjunktiv-II, Absaetze
- Bibliothek-Buttons (aus Sprint 8)
- "Weitere Pruefungen" Drawer: Kommas, Grammatik, Praezisierung, Fachsprache, Normen-Konsistenz
- KI-Strukturvorschlag unten

Commit 15: Tests Zusatz + sw.js bump

TAG-BEFUND Sprint 09b: v180-ki-full-done


QUALITAETS-KRITERIEN
====================
- Alle KI-Functions mit JWT-Pflicht (Sprint 3)
- Rate-Limit pro User
- KI-Funktions-Garantie (5 Tests pro Funktion)
- DSGVO-Pseudonymisierung aktiv (Sprint 1)
- Kein Auto-Apply von Aenderungen
- Einheitliche Response-Formate

KOSTEN-MONITORING
=================
Nach Deploy: 3 Tage Monitoring welche Funktionen wie oft genutzt werden.
Bei > 5% Umsatz-Quote: Alert an Marcel → Pricing-Anpassung oder Nutzungs-Limit

COMMITS-PATTERN:
"S9a.X: <Kurzbeschreibung>"
"S9b.X: <Kurzbeschreibung>"
```

---

## Acceptance Sprint 9a
1. §6-Editor leeres Feld im Fokus, Befunde-Panel rechts sichtbar
2. Live-Marker erkennen Norm + Konjunktiv + § korrekt in Test-Text
3. Konjunktiv-II-Check liefert für Test-Text sinnvolle Befunde
4. Halluz-Check vor Freigabe-Modal erkennt unbelegte Behauptungen
5. Gate 500 Zeichen + 2/3 Marker funktioniert
6. Override-Link mit Audit-Eintrag
7. Alle Tests grün

## Acceptance Sprint 9b
1. Kommasetzung-Check funktioniert
2. Grammatik-Check funktioniert
3. Absätze-Ordnen zeigt Diff, SV kann pro Absatz zustimmen
4. Fachsprache-Check liefert sinnvolle Vorschläge
5. Einstellungen-Seite: alle Toggle funktionieren
6. Profi-Modus deaktiviert alle Live-Funktionen
7. KI-Kosten-Anzeige stimmt mit Airtable überein
8. Alle Tests grün

---

## Kostenschätzung KI-Nutzung

| Funktion | Modell | Kosten/Call | Typische Nutzung/Fall |
|---|---|---|---|
| Konjunktiv-II | GPT-4o | ~0,048€ | 1-2× |
| Halluz-Check | GPT-4o | ~0,015€ | 1× (automatisch) |
| §407a-Check | GPT-4o-mini | ~0,003€ | 1× (automatisch) |
| Fachsprache | GPT-4o-mini | ~0,005€ | 0-1× |
| Absätze | GPT-4o-mini | ~0,002€ | 0-1× |
| Kommas | GPT-4o-mini | ~0,001€ | 0-1× |
| Grammatik | GPT-4o-mini | ~0,001€ | 0-1× |
| Normen-Check | GPT-4o-mini | ~0,002€ | 0-1× |
| Befunde-Extract | GPT-4o-mini | ~0,005€ | 1× (beim §6-Öffnen) |
| Norm-Vorschläge | GPT-4o-mini | ~0,003€ | 1× (beim §6-Öffnen) |

**Pro Fall typisch:** 0,05-0,15€ KI-Kosten
**Pro Monat bei 5 Fällen (Solo 149€):** 0,25-0,75€ → **0,2-0,5% des Umsatzes**
**Pro Monat bei 15 Fällen:** 0,75-2,25€ → **0,5-1,5% des Umsatzes**

**Alarm-Schwelle im Admin-Cockpit:** 5% des Umsatzes pro User

---

## Rollback
`git reset --hard v180-bibliothek-done` + `git push --force`

---

## Abhängigkeiten
- **Sprint 1 (P3 DSGVO)** muss done sein — Pseudonymisierung aktiv
- **Sprint 3 (P4B JWT)** muss done sein — Functions JWT-geschützt
- **Sprint 8 (B3 Bibliothek)** muss done sein — Norm/Textbaustein-Einfügen via Toolbar
- **KI-PROMPTS-MASTER.md muss vorhanden sein** (Marcel bringt die Prompts mit)

---

**Dieses Dokument ist Kern-Sprint des Masterplans. Ohne funktionierende KI-Werkzeuge ist PROVA nicht pilotreif.**
