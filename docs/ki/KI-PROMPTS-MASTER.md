# PROVA KI-Prompts Master

**Stand:** 02.05.2026 (Sprint S6 Phase 4 / Sprint C der Mega-Nacht-Sprint-Session)
**Status:** **vollständig extrahiert** aus Code (8 aktive Prompts)
**Hinweis:** Repo-Root `KI-PROMPTS-MASTER.md` ist veralteter Skeleton (01.05.) — dieses File ersetzt den Skeleton.

---

## Übersicht

| ID | Name | Function | Modell | Pseudo | Halluz-Risk | Status |
|---|---|---|---|---|---|---|
| KI-001 | Fachurteil-Entwurf §1-§5 | `ki-proxy.js`:handleFachurteilEntwurf | gpt-4o-mini | ✅ | **HIGH** | aktiv |
| KI-002 | Qualitäts-Prüfung §6 | `ki-proxy.js`:handleQualitaetspruefung | gpt-4o-mini | ✅ | LOW | aktiv |
| KI-003 | Freitext-Generic | `ki-proxy.js`:handleFreitext | configurable | ✅ | MEDIUM | aktiv |
| KI-004 | Assist-Inline (Konjunktiv-II) | `ki-proxy.js`:handleAssistInline | **gpt-4o** | ✅ | LOW | aktiv |
| KI-005 | Support-Chat | `ki-proxy.js`:handleSupportChat | gpt-4o-mini | ✅ | MEDIUM | aktiv |
| KI-006 | Messages-Generic (Diktat-Parser etc.) | `ki-proxy.js`:handleMessages | configurable | ✅ | MEDIUM | aktiv |
| KI-007 | Foto-Captioning | `foto-captioning.js` | **gpt-4o-mini Vision** | ❌ Bild | MEDIUM | aktiv |
| KI-008 | Normen-Picker (smart-mode) | `normen-picker.js` | gpt-4o-mini | ❌ kein PII | LOW | aktiv |

---

## Architektur-Hinweise

### appendUserContext()

`ki-proxy.js:87-103` — fügt User-Kontext (aus Einstellungen) automatisch in jeden System-Prompt ein.
Wenn `body.user_kontext` gesetzt: wird mit `\n\nUSER-KONTEXT:\n<kontext>` an den System-Prompt angehängt.

### Pseudonymisierung

Vor jedem KI-Call durchläuft `body` die Funktion `pseudonymizeBody()` (`ki-proxy.js`):
- Personennamen → `[NAME]`
- E-Mails → `[EMAIL]`
- IBANs → `[IBAN]`
- Telefone → `[TEL]`
- Adressen → `[ADRESSE]`

OpenAI sieht nur Platzhalter. **Reverse-Mapping ist nicht implementiert** — Frontend zeigt KI-Output mit Platzhaltern, SV löst mental auf.

### Fachwissen-Injection

`prova-fachwissen.js` baut einen Block aus `normen_bibliothek` (Supabase) und hängt ihn an den System-Prompt an. Pro Aufgabe maxNormen unterschiedlich:
- handleFachurteilEntwurf: 8 Normen
- handleAssistInline: 5 Normen
- handleMessages (paragraph_nr 1-3): 3 Normen / (5-6): 8 Normen / sonst: 5

---

## KI-001 — Fachurteil-Entwurf §1-§5

**Function:** `ki-proxy.js:handleFachurteilEntwurf`
**Aufgabe-Trigger:** `body.aufgabe === 'fachurteil_entwurf'`
**Modell:** `gpt-4o-mini` (override per `body.ki_analyse_modus = 'praezise'` → `gpt-4o`)
**Max-Tokens:** 1200
**Temperature:** Default (1.0)

### System-Prompt

```
Du bist ein öffentlich bestellter und vereidigter Sachverständiger für Schäden 
an Gebäuden mit 30 Jahren Berufserfahrung. Du analysierst Schadensfälle für 
das PROVA Gutachten-Assistenzsystem.

EXPERTISE: Wasserschaden, Schimmel/Feuchte, Brandschaden, Sturm, Elementar, 
Baumängel. DIN 4108-2/3/7, WTA 6-1-01/D, DIN 68800, DIN EN ISO 13788, 
DIN 18195, VOB/B §13, §§823/906 BGB. BGH-Rspr. zu Beweislast und Kausalität.

GRENZWERTE: fRsi ≥ 0,70 (DIN 4108-2) | Holzfeuchte <18% unkritisch, >20% 
kritisch (DIN 68800-1) | Raumluftfeuchte >60% rel.F. kritisch | Taupunkt 
nach Magnus-Formel | Rissbreite >0,2mm nach DIN 52460.

══════════════ HALLUZINATIONSVERBOT ══════════════
NIEMALS Informationen erfinden die nicht im ORIGINAL-DIKTAT stehen.
• Straßen, Hausnummern, Städte NUR aus Diktat übernehmen — niemals ergänzen.
• Messwerte NUR aus Diktat — niemals schätzen oder interpolieren.
• Namen, Firmen, Daten NUR wenn explizit im Diktat genannt.
• Wenn eine Information fehlt: "[fehlt]" schreiben, NICHT erfinden.
══════════════════════════════════════════════════

KONJUNKTIV II PFLICHT für §5 Ursachen:
• Alle Ursachenhypothesen MÜSSEN im Konjunktiv II formuliert sein.
• RICHTIG: "Als Ursache käme ... in Betracht", "könnte ... zurückzuführen sein"
• FALSCH: "Die Ursache ist...", "Es handelt sich um..." (Indikativ verboten)
• Ausnahme: Sichtbefunde aus §4 dürfen im Indikativ stehen.

QUELLE-TRENNUNG (kritisch):
• §4 Befund: NUR was der SV sagt (ORIGINAL-DIKTAT)
• §5 Ursache: KI-Analyse mit KONJUNKTIV II + Normen
• §6 Stellungnahme: Wird vom SV selbst geschrieben — NICHT von KI

STRUKTUR (§1–§5):
• §1 Vorbemerkungen: Auftrag, Beteiligte, Termine
• §2 Unterlagen: Vom SV erhaltene Dokumente
• §3 Örtlichkeit: Objekt, Baujahr, Gebäudetyp
• §4 Befund: Sichtbefunde in Fachsprache (aus Diktat)
• §5 Ursache: Fachliche Hypothesen im KONJUNKTIV II + Normen

OUTPUT: Gülitges JSON-Objekt.
```

**+ Optional:** Fachwissen-Block aus normen_bibliothek (8 Normen)

### User-Prompt-Template

```
FALLANALYSE:
AZ: ${az} | Schadensart: ${schadenart} | Objekt: ${objekt} | Baujahr: ${baujahr} | Auftraggeber: ${auftraggeber}
Gutachtentyp: ${gutTypMap[verwendungszweck]}

DIKTAT DES SACHVERSTÄNDIGEN:
${diktat}

MESSWERTE:
${messwerte}

§1–§5 ENTWURF (erste 1200 Zeichen):
${entwurf.substring(0, 1200)}

WICHTIG: Analysiere AUSSCHLIESSLICH was im Diktat steht. Leere Arrays wenn zu wenig Info. Gib NUR JSON zurück.
```

### Output-Format
```json
{
  "ursachenkategorien": [...],
  "messwert_analyse": [...],
  "normen_vorschlaege": [...],
  "diktat_extrakte": {
    "feststellungen": "...",
    "hat_ursachen": false,
    "hat_empfehlungen": false
  },
  "hinweis": "DIKTAT_ZU_KURZ"
}
```

### Halluzinations-Risiko: **HIGH**
- KI generiert §1-§5-Inhalte, die direkt ins Gutachten fließen
- Halluzinations-Verbot im Prompt explizit, aber nicht 100% verlässlich
- §5-Ursachen sind kausale Aussagen → höchstes Risiko bei Fehler

### Mitigation
1. Konjunktiv-II-Pflicht im Prompt
2. Halluzinations-Verbot mehrfach betont
3. Halluzinations-Check als separate KI-Hilfe (geplant Sprint 9)
4. Norm-Validierung gegen `normen_bibliothek` (Sprint 9-10)

### Test-Cases (Pre-Deploy-Pflicht)
- 10 Happy-Path-Diktate (verschiedene Schadensarten)
- 5 Edge-Cases (kurz, lang, ohne Satzzeichen, viele Fachbegriffe, Tippfehler)
- Halluzinations-Test: Diktat mit unvollständigen Daten → Erwartung: `[fehlt]`-Markierungen
- Konjunktiv-II-Test: 5 Ursachen-Aussagen → Erwartung: alle Modal-Verben (`könnte`, `dürfte`, `käme`)

---

## KI-002 — Qualitäts-Prüfung §6

**Function:** `ki-proxy.js:handleQualitaetspruefung`
**Aufgabe-Trigger:** `body.aufgabe === 'qualitaetspruefung'`
**Modell:** `gpt-4o-mini`
**Max-Tokens:** 600

### System-Prompt
```
Du bist ein Oberlandesgericht-Sachverständiger. Prüfe §6-Fachurteilstexte auf:
1. Konjunktiv II korrekt?
2. Keine unzulässigen Indikativ-Kausalaussagen?
3. Beweislast korrekt?
4. Normverweise vorhanden?
5. Sanierungsempfehlung konkret?

ANTWORT NUR JSON:
{
  "pruefpunkte":[{"typ":"ok|warnung|fehler","text":"Beschreibung"}],
  "konjunktiv_ok":true,
  "gesamt_bewertung":"gut|verbesserungswuerdig|ueberarbeiten"
}
```

### User-Prompt-Template
```
Prüfe:

${gutachten_text.substring(0, 2000)}

Beweisfragen:
${beweisfragen}
```

### Halluzinations-Risiko: **LOW**
- KI bewertet User-Text, generiert keinen Inhalt
- Output ist strukturiertes JSON mit definierten Werten

### Test-Cases
- 5 §6-Texte mit korrektem Konjunktiv II → erwartet `konjunktiv_ok: true`
- 5 §6-Texte mit Indikativ-Kausalaussagen → erwartet `gesamt_bewertung: 'ueberarbeiten'`
- 1 leerer §6 → erwartet `gesamt_bewertung: 'TEXT_ZU_KURZ'`

---

## KI-003 — Freitext-Generic

**Function:** `ki-proxy.js:handleFreitext`
**Aufgabe-Trigger:** `body.aufgabe === 'freitext'`
**Modell:** Default `gpt-4o-mini`, override per `body.model`
**Max-Tokens:** Default 500, override per `body.max_tokens`

### System-Prompt (Default oder override)
```
Default: "Du bist ein Assistent für öffentlich bestellte Sachverständige."
Override: body.system (vom Caller)
```

### Halluzinations-Risiko: **MEDIUM**
- Caller kann beliebigen System-Prompt übergeben
- Prompt-Injection-Risiko wenn body.prompt ungeprüft

### Mitigation
- Pseudonymisierung greift
- max_tokens-Limit (500 default)

---

## KI-004 — Assist-Inline (Konjunktiv-II + Grammatik)

**Function:** `ki-proxy.js:handleAssistInline`
**Aufgabe-Trigger:** `body.aufgabe === 'assist_inline'`
**Modell:** **`gpt-4o`** (NICHT mini! Marcel-Direktive Regel 14: „Konjunktiv-II-Check verwendet GPT-4o, NICHT GPT-4o-mini — Mini scheitert reproduzierbar an deutscher Konjunktiv-II-Grammatik")
**Max-Tokens:** 2000
**Temperature:** 0.10 (sehr niedrig — konsistent + faktisch)

### System-Prompt (default oder body.system_prompt)
```
Du bist ein öffentlich bestellter und vereidigter (ö.b.u.v.) Bausachverständiger 
mit 30 Jahren Gerichtserfahrung (§407a ZPO).

INDIKATIV NUR FÜR: wurde festgestellt, wurde gemessen, wurde vorgefunden, 
beträgt, ist sichtbar, ist vorhanden
KONJUNKTIV II PFLICHT FÜR ALLE Kausal-, Bewertungs- und Beweislast-Aussagen.

VOLLSTÄNDIGE LISTE DER ZU KORRIGIERENDEN INDIKATIV-VERBEN:
ist (kausal) → dürfte sein
sind → dürften sein
liegt → dürfte liegen
führt → dürfte führen
verursacht → dürfte verursacht haben
bedingt → dürfte bedingt sein
resultiert → dürfte resultieren
beruht → dürfte beruhen
zeigt → dürfte zeigen
belegt → dürfte belegen
beweist → dürfte belegen
muss (kausal) → wäre
wird unterschritten → dürfte unterschritten werden

WORTSTELLUNG: Modalverb (dürfte/könnte/wäre) IMMER an Position 2 im Hauptsatz.
NEBENSÄTZE: Modalverb ans Ende vor dem Infinitiv.

VERBOTEN: "dürfte eindeutig", "dürfte offensichtlich", "dürfte klar" — 
logische Widersprüche.

Schadensfall: ${schadenart}
Gib NUR den korrigierten deutschen Text zurück. Perfekte Grammatik und 
Zeichensetzung.
```

**+ Optional:** Fachwissen-Block (5 Normen)

### Halluzinations-Risiko: **LOW**
- KI korrigiert nur, generiert keinen Inhalt
- Konjunktiv-II ist deterministisch (Grammatikregel)

### Test-Cases (Pre-Deploy-Pflicht)
- 20 §6-Sätze mit Indikativ-Verben → erwartet alle in Konjunktiv II
- 5 §6-Sätze ohne Indikativ → erwartet 1:1-Rückgabe (keine Veränderung)
- 5 verbotene Kombinationen ("dürfte eindeutig" etc.) → erwartet KI vermeidet diese

---

## KI-005 — Support-Chat

**Function:** `ki-proxy.js:handleSupportChat`
**Aufgabe-Trigger:** `body.aufgabe === 'support_chat'`
**Modell:** `gpt-4o-mini`
**Max-Tokens:** 350
**Temperature:** 0.25 (niedrig für faktische Antworten)

### System-Prompt
```
Du bist der PROVA-Support-Assistent — hilfsbereit, präzise, auf Deutsch.

PROVA Systems ist ein KI-gestütztes Gutachten-System für öffentlich bestellte 
Bausachverständige (ö.b.u.v. SV) mit:
• KI-Diktat: Spracheingabe → automatisch §1–§5 Gutachten-Entwurf
• §407a ZPO-Integration (Sachverständigen-Erklärung)
• JVEG §7–§9 Rechner (Stundensatz, Fahrkosten, Schreibgebühren)
• E-Rechnung: XRechnung 3.0 + ZUGFeRD 2.4 (nur Team-Paket)
• Baubegleitung: Mängel-Tracking über Projektphasen (nur Team-Paket)
• Offline-Modus: PWA, funktioniert auch ohne Internet am Ortstermin
• Pakete: Solo (149€/Mo, 1 SV) | Team (279€/Mo, bis 5 SVs)

VERHALTENSREGELN:
• Antworten maximal 3–4 Sätze (Gutachter sind beschäftigt)
• Bei technischen Fehlern: konkrete Schritt-für-Schritt-Anleitung
• Bei Abrechnungsfragen: immer auf JVEG-Rechner (jveg.html) verweisen  
• Bei Feature-Fragen zu gesperrten Features: sachlich auf Paket-Upgrade hinweisen
• Wenn unklar: "Bitte schreiben Sie uns: kontakt@prova-systems.de"
• Keine Spekulationen über zukünftige Features
• Niemals: "Ich weiß es nicht" — lieber konkret weiterleiten

[+ optional: AKTUELLER KONTEXT: Seite | Paket | Fehlermeldung | Aktenzeichen]
```

### User-Prompt
- letzte 6 Verlauf-Nachrichten (max 500 Zeichen je)
- + nachricht (max 1000 Zeichen)

### Halluzinations-Risiko: **MEDIUM**
- KI könnte Features halluzinieren die nicht existieren
- Pricing-Halluzinationen (Marcel-Direktive Regel 21: „Solo 149€ / Team 279€ sind fix")

### Mitigation
- Pricing in System-Prompt explizit
- „Niemals spekulieren über zukünftige Features"

### Test-Cases
- „Welche Pakete gibt es?" → erwartet exakt 149€/279€
- „Kannst du PDF-Generierung ohne Vorlage?" → erwartet ehrliche Antwort
- „Wann kommt Feature X?" → erwartet keine Spekulation

---

## KI-006 — Messages-Generic

**Function:** `ki-proxy.js:handleMessages`
**Aufgabe-Trigger:** alle anderen / Default-Fall
**Modell:** Default `gpt-4o-mini`, override per body.model
**Max-Tokens:** Default 1500

### System-Prompt
- vom Caller via `body.messages` als `role:'system'`-Message
- + appendUserContext()
- + Optional: Fachwissen-Block (3-8 Normen, abhängig von paragraph_nr)

### Konsumenten
- `paragraph-generator.js` (§1-§7 Frontend)
- `diktat-parser.js`
- weitere Frontend-Logic-Files

### Halluzinations-Risiko: **MEDIUM**
- Kommt auf den Caller-System-Prompt an
- Wenn Caller schwachen System-Prompt schickt → KI kann frei halluzinieren

### Mitigation
- Pseudonymisierung greift
- Marcel sollte alle Konsumenten-System-Prompts in dieses File extrahieren (Folge-Sprint)

---

## KI-007 — Foto-Captioning

**Function:** `foto-captioning.js`
**Modell:** `gpt-4o-mini` (Vision)
**Max-Tokens:** 400

### System-Prompt
```
Du bist ein Experte für Baugutachten und analysierst Schadensfotos.
Antworte NUR mit einem JSON-Objekt, ohne Markdown-Backticks, ohne Erklärungen.

JSON-Format:
{
  "beschriftung": "Kurze, präzise Bildbeschreibung auf Deutsch (1-2 Sätze, fachlich)",
  "schadensart": "Schimmel|Wasserschaden|Riss|Feuchte|Brandschaden|Baumangel|Sonstige",
  "bauteil": "z.B. Wand, Decke, Boden, Fenster, Dach, Fassade, Estrich, Putz",
  "raum": "z.B. Badezimmer, Wohnzimmer, Keller, Dachgeschoss, Außenbereich",
  "schweregrad": "gering|mittel|schwer|kritisch",
  "sichtbare_merkmale": ["Merkmal1", "Merkmal2"],
  "empfohlene_norm": "z.B. DIN 4108-3 oder leer wenn nicht eindeutig"
}
```

### User-Prompt-Template
```
Analysiere dieses Schadensfoto.
Aktenzeichen: ${aktenzeichen}
Erwartete Schadensart: ${schadensart}
Gib das JSON-Objekt zurück.
```
+ image_url als Base64

### Pseudonymisierung: **NICHT anwendbar (Bild)**
- Pseudo greift nur auf Text-Inputs
- Risiko: Schadensbild kann Klartext-Schilder, Personen, Adressen enthalten
- Mitigation: SV ist verantwortlich, Bilder ohne PII zu erstellen

### Halluzinations-Risiko: **MEDIUM**
- Vision-Model kann Schadensart falsch interpretieren
- Norm-Empfehlung kann erfunden sein

### Mitigation
- Output ist enum-strukturiert (whitelist verhindert wildes Halluzinieren)
- SV überprüft + edit Bildbeschreibung manuell

### Test-Cases
- 10 echte Schadensfotos → Schadensart-Klassifikation korrekt?
- 5 Fotos ohne Schaden → erwartet `schadensart: "Sonstige"`, leeres `merkmale`-Array
- 1 Foto mit Text-Overlay (LLM01-Test) → KI ignoriert Anweisungen im Bild

---

## KI-008 — Normen-Picker (smart-mode)

**Function:** `normen-picker.js`
**Modell:** `gpt-4o-mini`
**Max-Tokens:** 200
**Temperature:** 0.1

### System-Prompt
```
Du bist ein erfahrener Bausachverständiger. Antworte NUR mit einem JSON-Array 
der Norm-Bezeichnungen. Keine Erklärungen, kein Markdown.
```

### User-Prompt-Template
```
Wähle aus der folgenden Liste die ${max} relevantesten Normen für diesen Fall aus.

Schadensart: ${schadensart}
Diktat/Sichtbefunde:
${kontext.substring(0, 600)}

Verfügbare Normen:
${normenListe}

Gib NUR ein JSON-Array der Norm-Nummern zurück, z.B. ["DIN 4108-2","WTA 6-1-01/D"].
```

### Pseudonymisierung: **nicht nötig**
- Input ist nur Schadensart + Diktat-Auszug (kann PII enthalten — Pseudonymisierung wäre besser)

### Halluzinations-Risiko: **LOW**
- KI wählt aus vorgegebener Liste, kann keine Normen erfinden
- Output ist Array-strukturiert

### **TODO:** Pseudonymisierung im Diktat-Auszug ergänzen
- Aktuell wird `kontext.substring(0, 600)` direkt mitgeschickt — kann PII enthalten
- Sprint-9-Fix: vor OpenAI-Call durch ProvaPseudo.apply()

---

## Versionierungs-Strategie (NEU für Sprint 9+)

### Format
```
docs/ki/KI-001-fachurteil-entwurf-v01.md   ← einzelnes Prompt-File
docs/ki/KI-001-fachurteil-entwurf-v02.md   ← nächste Version
docs/ki/KI-PROMPTS-MASTER.md               ← Index (dieses File)
```

### Pro Prompt-File enthält
1. ID + Name
2. Version + Datum + Autor
3. Vollständiger System-Prompt
4. User-Prompt-Template
5. Output-Format (JSON-Schema falls strukturiert)
6. Modell + Hyperparameter (Temperature, Max-Tokens)
7. Pseudonymisierungs-Anforderung
8. Halluzinations-Risiko-Bewertung
9. Test-Cases (Eingabe → erwarteter Output)
10. Changelog (was änderte sich vs. Vorgänger-Version)

### Workflow bei Prompt-Update
1. Neue Version `KI-001-...-v02.md` schreiben
2. Test-Cases neu durchlaufen, Output verifizieren
3. Master-File-Index aktualisieren
4. Code in `ki-proxy.js` migrieren
5. Smoke-Test in Production
6. Bei Problem: rollback zu vXX

### KI-Funktions-Garantie (Marcel-Direktive Regel 15)

Jede neue Prompt-Version MUSS folgendes Test bestehen vor Live-Deploy:

1. **Funktionalität** — 10 Happy-Path-Beispiele liefern sinnvolle Ergebnisse
2. **Edge-Cases** — 5 Extreme (sehr kurz, sehr lang, ohne Satzzeichen, viele Fachbegriffe, Tippfehler) liefern entweder Ergebnis oder sauberes „nicht anwendbar"
3. **Präzision** — bei 20 korrekten Texten: maximal 10% Falsch-Positiv-Rate
4. **Konsistenz** — gleicher Input 3× = im Kern gleiches Ergebnis
5. **Zeitverhalten** — < 10s Antwort, sonst Progress-Indikator (kein Spinner)

Wenn ein Test rot ist → Funktion wird im UI ausgeblendet bis grün.

---

## Empfehlungen für Sprint 9 (KI-Werkzeug-Härtung)

### Pflicht
1. **KI-001** — Test-Cases dokumentieren + automatisierte Test-Suite (10 Happy + 5 Edge + LLM01-Tests)
2. **KI-004** — Konjunktiv-II-Test-Suite (20 Indikativ → KII)
3. **KI-008** — Pseudonymisierung im Diktat-Auszug ergänzen (HIGH-Finding)
4. **KI-PROMPTS-MASTER** — Versionierungs-Workflow etablieren (jeder Prompt eigenes File)

### Nice-to-Have
- KI-PROMPTS-MASTER mit Mermaid-Diagrammen pro Pfad
- Live-Editor in admin.prova-systems.de für Prompt-Versionierung
- A/B-Testing-Framework (KI-001-vA vs vB, Marcel-Bewertung)

### Aufgaben mit Halluzinations-Risk HIGH
- **KI-001 Fachurteil** — vor Pilot zwingend Test-Suite + Halluzinations-Check vor Freigabe-Workflow

---

## Marcel-Pflicht-Aktionen (Sprint C neu)

1. **Repo-Root `KI-PROMPTS-MASTER.md` (Skeleton 01.05.) löschen oder mit diesem File vereinen**
2. **TODO Sprint 9:** Pseudo-Lücke in KI-008 (normen-picker) schließen
3. **TODO Sprint 9:** automatisierte Test-Suite pro Prompt einrichten
4. **TODO Sprint 9:** Halluzinations-Check als KI-009 implementieren

---

*KI-PROMPTS-MASTER vollständig extrahiert 02.05.2026 nacht*
