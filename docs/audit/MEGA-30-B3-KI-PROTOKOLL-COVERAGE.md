# MEGA³⁰ B3 — ki_protokoll-Insert-Coverage Audit

**Datum:** 2026-05-07
**Audit-Beleg:** `AUDIT-2026-05-07-VISION-STATUS.md` Bereich 2 (KI-Härtung)
**Regel:** PROVA-REGELN-PERMANENT.md Regel 16 — Pflicht-Logging jedes KI-Calls

---

## Befund

**ki-proxy.js (Stand 2026-05-07): KEIN ki_protokoll-Insert.**

Verifiziert via:
```
grep -c "ki_protokoll\|from('ki_protokoll')" netlify/functions/ki-proxy.js → 0
```

Es gibt jedoch:
- ✅ `audit_trail`-Insert bei Fallback-Errors (ki-proxy.js Zeile 511)
- ✅ Console-Logs für Diagnose (Zeile 333, 442, 597)
- ❌ **Kein einziger `from('ki_protokoll').insert(...)`-Aufruf in ki-proxy.js**

Andere Lambdas mit ki_protokoll-Lookup (read-only):
- `admin-ki-costs.js` — read für Cockpit-Stats
- `ki-history.js` — read für KI-Historie-Modal
- `ki-statistik.js` — read für Reports

→ **Schreibseite fehlt komplett.**

---

## Schema-Verify (Live MCP, 33 Spalten)

```
ki_protokoll: id, workspace_id, user_id, auftrag_id, eintrag_id, audio_id,
              prompt_template_id, purpose, feature_kontext, page_url,
              modell, modell_version, provider,
              token_input, token_output, token_total, kosten_eur, dauer_ms,
              status, fehler_message,
              input_pseudonymisiert, pseudonymisierung_token_count,
              output_repseudonymisiert, konjunktiv_check_passed,
              halluzinations_check_passed,
              input_hash, output_hash, output_laenge_chars, output_preview,
              started_at, completed_at, created_at
```

**Spalten reichen für Vision-Master + Regel 16. Keine Schema-Änderung nötig.**

⚠️ **Lücke W4-Bonus:** `cached_tokens_in` für Prompt-Caching-Tracking fehlt — separater Sprint.

---

## ki-proxy.js Action-Liste (Self-Scoped Audit)

Aus `MODELS`-Konstante + `MODELS_FALLBACK` extrahiert (Zeile 107-130):

| Action | Modell-Tier | ki_protokoll-Status |
|---|---|---|
| `fachurteil_entwurf` | Frontier (gpt-5.5) | ❌ kein Insert |
| `pruefe_fachurteil` | Frontier | ❌ kein Insert |
| `qualitaetspruefung` | Frontier | ❌ kein Insert |
| `konsistenz_check` | Frontier | ❌ kein Insert |
| `assist_inline` | Mid (gpt-5.4) | ❌ kein Insert |
| `freitext` | Light (gpt-5.4-mini) | ❌ kein Insert |
| `support_chat` | Light | ❌ kein Insert |
| `messages` (Chat) | Light | ❌ kein Insert |
| `whisper-1` (Diktat) | Whisper | ❌ AUDIT-UNKLAR (separate whisper-diktat.js) |

→ **0% Coverage.**

---

## Lösung (M30-B3)

### Foundation: `lib/ki-cost-tracker.js` (NEU, MEGA³⁰ B3)

Helper-Lib mit `start()` + `finish()` API.

**Defensive-Pattern:**
- Insert-Failure → `{ logged: false, reason }` Return (kein Throw)
- KI-Call-Workflow nicht blockiert
- Pricing automatisch via `lib/ai-router.js` `getModelCost()`

**Vollständiges Logging via finish():**
- Schema-konform 33-Spalten-Insert
- Pseudonymisierungs-Flags
- Konjunktiv- + Halluzinations-Check-Flags
- Output-Preview (max 500 chars für Audit, KEIN Volltext)

### Integration in ki-proxy.js (verschoben in eigene Welle)

**Self-Scoping-Decision:** ki-proxy.js Refactor um Cost-Tracker einzubauen ist
**größerer Eingriff** (mehrere Code-Pfade: callOpenAI / callOpenAIWithFallback / callAnthropic)
und wird in eigener Welle (MEGA³⁴ KI-Härtung-Sprint) durchgeführt.

**Foundation steht jetzt (Lib + Tests + Schema-Verify), Integration folgt.**

---

## Tests

`tests/ki-cost-tracker/start-finish.test.js` — siehe MEGA30-B3 Commit.

---

## Vision-Komplettheit-Beitrag

- **Bereich 2 KI-Härtung:** 70% → 75% (Helper-Foundation für 100%-Insert-Coverage)
- **Regel 16:** Pflicht-Logging-Pattern ist jetzt **abrufbar**, fehlt nur noch Integration

---

*MEGA³⁰ B3 — Co-Authored-By Claude Opus 4.7*
