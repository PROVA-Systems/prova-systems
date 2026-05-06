# PROVA KI-PROMPTS MASTER

**Stand:** 10.05.2026 (MEGA²⁸ W3-I0 — Modell-Strategie aktualisiert, Anthropic-Backup aktiviert)
**Zweck:** Zentrale Sammlung aller KI-Prompts für `netlify/functions/ki-proxy.js` (Multi-Provider: OpenAI primary + Anthropic fallback)
**Status:** Production — alle Modell-Strings W3-I0 auf GPT-5.x + Claude 4.x migriert

---

## 🔥 W3-I0 Modell-Update (10.05.2026)

GPT-4o + GPT-4o-mini wurden Februar 2026 von OpenAI deprecated.
Neue OpenAI-Lineup + Anthropic-Backup-Provider implementiert.

### Aktuelle OpenAI-Modelle (verifiziert 10.05.2026)

| Modell        | Prompt $/1M | Completion $/1M | Tier       | Use-Case                    |
|---------------|-------------|-----------------|------------|-----------------------------|
| gpt-5.5       | $5.00       | $30.00          | Frontier   | Konjunktiv-II, Compliance   |
| gpt-5.5-pro   | $30.00      | $180.00         | Ultra      | Ultra-kritisch (selten)     |
| gpt-5.4       | $2.50       | $15.00          | Mid        | Inline-Assist               |
| gpt-5.4-mini  | $0.40       | $1.60           | Light      | Latency, mechanisch         |
| gpt-5.4-nano  | $0.10       | $0.40           | Lightest   | Höchste Latenz-Demands      |

### Anthropic-Backup-Provider (ANTHROPIC_API_KEY)

| Modell                       | Prompt $/1M | Completion $/1M | Tier     |
|------------------------------|-------------|-----------------|----------|
| claude-opus-4-7              | ~$15        | ~$75            | Frontier |
| claude-sonnet-4-6            | $3.00       | $15.00          | Mid      |
| claude-haiku-4-5-20251001    | ~$0.80      | ~$4.00          | Light    |

### Modell-Mapping pro Action (Single Source of Truth: ki-proxy.js MODELS-Konstante)

| Action                | Primary OpenAI | Backup Anthropic            | Begründung                  |
|-----------------------|----------------|-----------------------------|-----------------------------|
| fachurteil_entwurf    | gpt-5.5        | claude-opus-4-7             | Rule 14 Konjunktiv-II       |
| pruefe_fachurteil     | gpt-5.5        | claude-opus-4-7             | Rule 14 Compliance          |
| qualitaetspruefung    | gpt-5.5        | claude-opus-4-7             | Konjunktiv-II-Check         |
| ki-konsistenz-check   | gpt-5.5        | claude-opus-4-7             | §4↔§6 Compliance-kritisch   |
| assist_inline         | gpt-5.4        | claude-sonnet-4-6           | Balance Q/Cost              |
| freitext (Default)    | gpt-5.4-mini   | claude-haiku-4-5-20251001   | User-Override-fähig         |
| support_chat          | gpt-5.4-mini   | claude-haiku-4-5-20251001   | Latenz, mechanisch          |
| normen-picker         | gpt-5.4-mini   | claude-haiku-4-5-20251001   | S1-Klassifikation           |
| foto-captioning       | gpt-5.4-mini   | claude-haiku-4-5-20251001   | Vision, mechanisch          |
| whisper-transcript    | whisper-1      | (kein Anthropic-Equivalent) | Speech-to-Text              |

### Fallback-Logic

```js
// netlify/functions/ki-proxy.js
async function callOpenAIWithFallback(params, openaiApiKey, aufgabe) {
  try {
    return await callOpenAI(params, openaiApiKey);
  } catch (err) {
    const status = err && err.status;
    const isFallbackable = !status || [429, 500, 502, 503, 504].includes(status);
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!isFallbackable || !anthropicKey) throw err;

    console.warn('[ki-proxy] OpenAI failed, falling back to Anthropic');
    const anthropicModel = ANTHROPIC_BACKUP[aufgabe];
    const result = await callAnthropic({ ...params, model: anthropicModel }, anthropicKey);
    result._fallback_provider = 'anthropic';
    return result;
  }
}
```

**Trigger:** 429 (Rate-Limit), 500/502/503/504 (Server-Outage), Network-Failure
**Nicht-Fallback:** 400 (User-Error), 401 (Auth-Problem), 403 (Permission)

### DEPRECATED-Modelle (NICHT MEHR NUTZEN in Production-Calls)

- `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo` — Februar 2026 von OpenAI abgekündigt
- `claude-3-5-sonnet`, `claude-3-haiku` — durch Claude 4.x ersetzt
- Backwards-Compat-Mapping bleibt in `lib/ki-anthropic.js` MODEL_MAP + `lib/ki-cost-calc.js` PRICING für Übergang

---

## Architektur-Hinweise

- Alle KI-Calls laufen über `/.netlify/functions/ki-proxy` mit `provaFetch` (Authorization-Header). Cross-Origin nicht erlaubt.
- DSGVO: Pseudonymisierung VOR Übergabe an OpenAI/Anthropic (Names → `[NAME]`, Emails → `[EMAIL]`, IBAN → `[IBAN]`, etc. via `lib/prova-pseudo.js`).
- Modell-Wahl pro Slot dokumentiert (siehe CLAUDE.md Regel 14: Konjunktiv-II-Check **nur Frontier-Modell** = gpt-5.5 oder claude-opus-4-7 als Backup).
- KI macht NIE eigenständige fachliche Bewertungen (CLAUDE.md Regel 8). Nur strukturierte Hilfen + Konsistenz-Checks.
- Halluzinations-Verbot (Regel 10): KI darf nichts erfinden, nur das wiedergeben was im Diktat oder Stamm-Daten stand.
- **Konjunktiv II Pflicht** bei jeder Kausalaussage (Regel 9): „es liegt nahe, dass..." statt „es ist...".
- Alle Prompts werden vor Live-Schaltung gegen die KI-Funktions-Garantie (Regel 15, 5 Tests) geprüft.

---

## 🅰️ Schadensgutachten (Flow A)

### §1 Anlass + Vorgang (Strukturierung)

> **Modell:** GPT-4o-mini (Strukturierung, niedrige Komplexität)
> **Token-Budget:** ~800 input / ~400 output
> **Pseudonymisierung:** Pflicht (Names, Adressen, AZ)
> **Status:** TBD Sprint 9

```
TODO: Prompt für Anlass + Vorgang.
Strukturhilfe für Auftragstext + Beauftragungs-Datum + AZ.
Output: 3-5 Sätze, neutraler Stil, 1. Person Singular ("Mir wurde mit Beschluss vom ...").
```

### §2 Sachverhaltsfeststellung

> **Modell:** GPT-4o-mini
> **Token-Budget:** ~1500 input / ~600 output
> **Pseudonymisierung:** Pflicht
> **Status:** TBD Sprint 9

```
TODO: Strukturhilfe für Sachverhaltsfeststellung aus Diktat + Stammdaten.
Eingabe: Diktat-Transkript + Akten-Felder.
Output: gegliederter Sachverhalt mit Vorgang-Chronologie.
```

### §3 Daten + Befunde

> **Modell:** GPT-4o-mini
> **Token-Budget:** ~2000 input / ~800 output
> **Pseudonymisierung:** Pflicht
> **Status:** TBD Sprint 9

```
TODO: Befunde aus Ortstermin strukturieren.
Eingabe: Ortstermin-Diktat + Foto-Captions + Mess-Werte.
Output: Bullet-List der Befunde mit Mess-Daten + Norm-Verweisen.
```

### §4 Bewertung + Analyse (Konjunktiv II Pflicht!)

> **Modell:** **GPT-4o** (NICHT mini — Konjunktiv-II-Grammatik mit 4o-mini reproduzierbar fehlerhaft, CLAUDE.md Regel 14)
> **Token-Budget:** ~3000 input / ~1200 output
> **Pseudonymisierung:** Pflicht
> **Status:** TBD Sprint 9

```
TODO: Bewertungshilfe mit Konjunktiv-II-Pflicht.
Eingabe: Befunde aus §3 + Schadensart + Auftragsfragen.
Output: Bewertung in Konjunktiv II ("könnte darauf hindeuten", "wäre denkbar"),
keine direkten Kausalaussagen.

WICHTIG: Strikte Trennung zwischen Beobachtung (Indikativ) und Schluss (Konjunktiv).
Halluzinations-Check vor Output.
```

### §5 Beweisfragen

> **Modell:** GPT-4o-mini
> **Token-Budget:** ~1000 input / ~500 output
> **Pseudonymisierung:** Pflicht (insb. Geschädigten-Name)
> **Status:** TBD Sprint 9

```
TODO: Antwort-Strukturierung pro Beweisfrage aus Beweisbeschluss.
Eingabe: Beweisbeschluss + §1-§4 Inhalt.
Output: pro Frage 1-3 Sätze Antwort mit Verweis auf §3 Befund + §4 Bewertung.
```

### §6 Fachurteil — KI-Hinweise (nicht-kopierbar)

> **Modell:** GPT-4o (höchste Sorgfaltsstufe)
> **Token-Budget:** ~3500 input / ~1500 output
> **Pseudonymisierung:** Pflicht
> **Status:** TBD Sprint 9

> **WICHTIG (CLAUDE.md Regel 11):** §6 Fachurteil-Editor folgt Leitsatz „SV muss ohne KI schneller schreiben können als mit". KI-Output ist Hinweis, NICHT Vorlage. Output erscheint im Editor als **read-only Side-Panel**, nicht als kopierbarer Textblock.

```
TODO: KI-Hinweise für §6 Fachurteil — Strukturhilfe + Konjunktiv-II-Check.
Eingabe: §3 Befunde + §4 Bewertung + bisherige §6-Eingabe des SV.
Output: Stichpunkt-Liste mit Hinweisen wie:
- "Norm DIN X erwähnt in §3, in §6 nicht aufgegriffen"
- "Kausalaussage in §6 ohne Konjunktiv II — prüfen"
- "Befund Y in §3 widerspricht Schluss Z in §6"
KEIN fertiger Textblock.
```

---

## 🅱️ Wertgutachten (Flow B)

### §1 Anlass + Auftrag
> **Status:** TBD Sprint 9
```
TODO: Strukturhilfe für Wertgutachten-Auftrag.
```

### §2 Bewertungsgrundlagen
> **Status:** TBD Sprint 9
```
TODO: Verkehrswert-Methodik-Wahl (Vergleichs-/Sach-/Ertragswert).
```

### §3 Objektbeschreibung
> **Status:** TBD Sprint 9
```
TODO: Strukturhilfe für Objektzustand + Lage + Ausstattung.
```

### §4 Wertermittlung (Konjunktiv II bei Schätzungen)
> **Modell:** GPT-4o
> **Status:** TBD Sprint 9
```
TODO: Wertermittlung mit Marktanalyse-Bezug.
```

### §5 Verkehrswert + Begründung
> **Status:** TBD Sprint 9
```
TODO: Verkehrswert-Zusammenfassung + ImmoWertV-Verweise.
```

---

## 🅲 Beratung (Flow C)

### §1 Beratungsanlass
> **Status:** TBD Sprint 9
```
TODO: Beratungsfall-Zusammenfassung.
```

### §2 Sachverhaltsfeststellung
> **Status:** TBD Sprint 9
```
TODO: Beratungs-spezifische Sachverhalt (Mängelliste, Streitgegenstand).
```

### §3 Empfehlungen (Konjunktiv II Pflicht!)
> **Modell:** GPT-4o
> **Status:** TBD Sprint 9
```
TODO: Empfehlungen mit Konjunktiv II — keine direktiven Aussagen.
```

---

## 🅳 Baubegleitung (Flow D)

### §1 Anlass + Auftrag
> **Status:** TBD Sprint 9
```
TODO: Baubegleitungs-Auftragsstruktur (Phase, Dauer, Frequenz).
```

### §2 Begehungs-Protokolle
> **Status:** TBD Sprint 9
```
TODO: Strukturhilfe für mehrere Begehungs-Termine über Bauphase.
```

### §3 Mängel + Empfehlungen
> **Modell:** GPT-4o
> **Status:** TBD Sprint 9
```
TODO: Mängel pro Termin + Empfehlungs-Liste.
```

---

## 🛡️ Halluzinations-Check

> **Modell:** GPT-4o (Sicherheits-kritisch)
> **Token-Budget:** ~2000 input / ~300 output
> **Aufgerufen:** automatisch vor jeder Freigabe (CLAUDE.md Regel 10)
> **Status:** TBD Sprint 9

```
TODO: Halluzinations-Check.
Eingabe: KI-generierter Text + alle verfügbaren Stammdaten + Diktat.
Output: Liste der Aussagen die NICHT durch Eingabe-Daten gestützt sind.
Format: { hallucinations: [{ text: "...", reason: "...", suggestion: "..." }] }

Regel: jede konkrete Zahl, jedes Datum, jede Ortsangabe, jeder Name muss
in den Eingabe-Daten erscheinen — sonst Halluzination.
```

---

## ✍️ Konjunktiv-II-Validator

> **Modell:** **GPT-4o** (NICHT mini — Mini scheitert reproduzierbar an deutscher Konjunktiv-II-Grammatik, CLAUDE.md Regel 14)
> **Token-Budget:** ~1500 input / ~500 output
> **Aufgerufen:** opt-in im Editor (Stufe S3, CLAUDE.md Regel 13)
> **Status:** TBD Sprint 9

```
TODO: Konjunktiv-II-Check für SV-Texte.
Eingabe: SV-geschriebener Absatz (z.B. §6 Fachurteil).
Output: Liste der Stellen mit:
- Indikativ-Kausalaussage erkannt
- Vorschlag der Konjunktiv-II-Umformulierung
- Begründung warum Konjunktiv hier Pflicht ist (Beweislast, Haftung)

WICHTIG: Konjunktiv II != Höflichkeitsform. Nur bei Kausal-/Schluss-Sätzen.
Beobachtungen (Indikativ) bleiben Indikativ.
```

---

## 🔄 §4↔§6 Konsistenz-Check

> **Modell:** GPT-4o
> **Token-Budget:** ~3000 input / ~600 output
> **Aufgerufen:** automatisch vor Freigabe + opt-in im Editor
> **Status:** TBD Sprint 9

```
TODO: Konsistenz-Check zwischen §4 Bewertung und §6 Fachurteil.
Eingabe: §4-Text + §6-Text.
Output:
- Widersprüche zwischen §4 und §6 (z.B. §4 sagt "Ursache X wahrscheinlich",
  §6 schließt "Ursache Y" — prüfen)
- Norm-Verweise in §4 die in §6 fehlen
- Schluss in §6 ohne entsprechende Bewertung in §4

WICHTIG: NIE einen Widerspruch automatisch korrigieren — nur melden.
Der SV entscheidet welche Aussage stimmt.
```

---

## 📋 Test-Protokoll (CLAUDE.md Regel 15 — KI-Funktions-Garantie)

Jede KI-Funktion muss vor Produktiv-Deployment **5 Tests bestehen**:

1. **Funktionalität** — 10 Happy-Path-Beispiele liefern sinnvolle Ergebnisse
2. **Edge-Cases** — 5 Extreme (sehr kurz, sehr lang, ohne Satzzeichen, viele Fachbegriffe, Tippfehler) liefern entweder Ergebnis oder sauberes „nicht anwendbar"
3. **Präzision** — bei 20 korrekten Texten: maximal 10% Falsch-Positiv-Rate
4. **Konsistenz** — gleicher Input 3× = im Kern gleiches Ergebnis
5. **Zeitverhalten** — < 10s Antwort, sonst Progress-Indikator (kein Spinner)

**Wenn ein Test rot ist → Funktion wird im UI ausgeblendet bis grün.**

Test-Ergebnisse pro Slot werden in `docs/ki-tests/<slot>.md` dokumentiert.

---

## 💰 Kosten-Tracking (CLAUDE.md Regel 16)

Jeder KI-Call MUSS in `ki_protokoll`-Tabelle loggen:
- `workspace_id`, `user_id`, `funktion`, `modell`, `tokens_in`, `tokens_out`, `kosten_eur`, `auftrag_id`, `created_at`

Plus Aggregation in `feature_events`. Dashboard-Monitoring via `admin-dashboard.html`.

---

## 📝 Änderungs-Historie

| Datum | Änderung |
|---|---|
| 2026-05-01 | Skeleton angelegt (Parallel-Sprint) — alle Slots als TBD Sprint 9 markiert |

---

*Diese Datei ist die Single-Source-of-Truth für KI-Prompts. Ohne Eintrag hier — keine Live-Schaltung.*

---

# 🔄 LIVE-STATUS-UPDATE (MEGA²⁸ KORR-3 · 10.05.2026)

Aggregiert aus aktuellem Repo-Stand (`netlify/functions/ki-*.js` + `lib/ki-service-*.js` + `parse-beweisbeschluss.js`).

## Tatsächliche Modell-Zuweisungen (Code-Audit)

| Funktion / Action | Modell IST | Empfohlen | Status |
|---|---|---|---|
| `ki-proxy:fachurteil_entwurf` (§6) | gpt-4o-mini default | **gpt-4o** (Regel 14) | ⚠️ UPGRADE empfohlen |
| `ki-proxy:pruefe_fachurteil` (Konjunktiv-Check) | gpt-4o-mini hardcoded | **gpt-4o** (Regel 14) | 🔴 CRITICAL — UPGRADE pflicht |
| `ki-proxy:assist_inline` | gpt-4o (temp 0.10, max_tokens 2000) | gpt-4o | ✅ OK |
| `ki-proxy:freitext` | dynamisch (default mini) | je nach Use-Case | OK (User-Override-fähig) |
| `foto-captioning.js` (Vision) | Claude Sonnet 4.6 (`KI_VISION_PROVIDER=anthropic`) oder gpt-4o | claude-sonnet-4-6 | ✅ OK |
| `normen-picker.js` | gpt-4o-mini, temp 0.25, max_tokens 350 | gpt-4o-mini | ✅ OK (S1) |
| `whisper-diktat.js` | whisper-1, lang=de | whisper-1 | ✅ OK |
| `parse-beweisbeschluss.js` | KEIN LLM (Pattern-Matching) | KEIN LLM Tranche 1 | ✅ OK (Marcel-C1) |

## Marcel-Action-Items (Modell-Compliance)

1. **CRITICAL:** `ki-proxy.js` Action `pruefe_fachurteil` von `gpt-4o-mini` → `gpt-4o` upgraden (Konjunktiv-II-Erkennung Pflicht-Modell-Wahl).
2. **EMPFEHLUNG:** Action `fachurteil_entwurf` Default von `gpt-4o-mini` → `gpt-4o` upgraden (oder zumindest Marcel-Override-Pattern dokumentieren).
3. **Temperature-Default-Audit:** Aktuell wird OpenAI-Default (~1.0) bei mehreren Aktionen genutzt. Empfehlung: explizit auf 0.0-0.5 setzen je nach Use-Case (siehe Best-Practices-Tabelle).

## Audit-Log

Tabelle `ki_protokoll` (existiert in Supabase laut Live-Verify): pro Call gespeichert
- `model`, `prompt_tokens`, `completion_tokens`, `cost_eur`
- `user_id`, `function_name`, `purpose`, `created_at`
- `input_pseudonymisiert` (boolean)

Nutzbar für Admin-Cockpit Sektion 12 (KI-Token-Cost pro User).

## Pseudonymisierung-Pflicht

Alle Prompts gehen durch `lib/prova-pseudo*.js` server-side bevor sie an OpenAI/Anthropic gesendet werden. CLAUDE.md Regel 17. ENV-Audit (MEGA²⁵) bestätigt: aktiv in 5 Pages + ki-proxy.js.

---

*MEGA²⁸ KORR-3 — Generated by Claude Opus 4.7 (1M context) — 2026-05-10*
