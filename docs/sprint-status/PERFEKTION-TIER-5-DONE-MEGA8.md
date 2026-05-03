# Perfektion Tier 5 — KI-Features Polish (MEGA⁸ V3)

**Sprint:** MEGA⁸ V3 (04.05.2026 nacht)
**Status:** ✅ Done

---

## Was geliefert

### 1. KI-Prompts-Templates pro Flow ✅
- `lib/ki-prompts/index.js` (~110 LOC)
- 5 Flow-Kategorien: flow-a / flow-b / flow-c / flow-d / cross
- 9 Prompt-Templates pro Use-Case:
  - **Flow A:** konjunktiv-ii-pruefung, halluzinations-check, paragraph-407a-check, fachurteil-entwurf
  - **Flow B:** wert-zusammenfassung
  - **Flow C:** protokoll-strukturierung
  - **Flow D:** begehungs-protokoll
  - **Cross:** rechtschreibung, absatz-strukturierung
- Public API: `getPrompt(flow, key, vars)` + `listPrompts(flow?)`
- CLAUDE.md-konform:
  - GPT-4o (NICHT mini) für Konjunktiv-II-Pruefung (Regel 14)
  - Keine eigenständigen fachlichen Bewertungen
  - Konjunktiv-II-Pflicht in Prompts
  - "[SV-eigenhaendig zu pruefen]"-Endung

### 2. KI-Confidence-Score-Engine ✅
- `netlify/functions/lib/ki-confidence.js` (~100 LOC)
- Public API: `computeConfidence(openaiResult, opts)` -> `{ level, score, reasons }`
- 5-Faktor-Scoring (0-100, mapped auf hoch/mittel/niedrig):
  1. **finish_reason** (-25 length, -60 content_filter)
  2. **Token-Verhältnis** (-20 wenn tokensOut < 30 + expectedMinTokens)
  3. **Konjunktiv-II-Density** (-30 wenn 0 Marker, -10 wenn < 2)
  4. **Halluzinations-Red-Flags** (-15 pro apodiktische Aussage)
  5. **Model-Mapping** (gpt-4o-mini Penalty bei Konjunktiv-II-Use-Case)
- Detection-Marker:
  - **Konjunktiv-II:** `koennte/koennten/waere/duerfte/liesse/haette/sollte/wuerde/naheliegend/wahrscheinlich/denkbar`
  - **Red-Flags:** `mit Sicherheit/definitiv/zweifellos/eindeutig/beweisbar/unbestreitbar`

### 3. KI-History-Endpoint ✅
- `netlify/functions/ki-history.js` (~85 LOC)
- requireAuth + Workspace-RLS-Filter
- Query-Params: `?auftrag_id=<UUID>` + `?since=24h|7d` + `?limit=50`
- Aggregation: total cost, tokens in/out, per_funktion
- Quelle: `ki_protokoll` Tabelle

---

## Bewusst NICHT geliefert (MEGA⁹-Backlog)

| Item | Begründung |
|---|---|
| **KI-History-Frontend-Page** (`akte/ki-history.html`) | Browser-Test-Pflicht für UX |
| **KI-Edit-Suggestions (autosuggest)** | Browser-Pflicht für UI-Smoothness + Real-time-Test |
| **Anthropic-Fallback-Pattern** | Marcel-Decision: Anthropic-API-Key + AVV nötig (NACHT-PAUSE) |
| **Prompts in ki-proxy.js integriert** | Refactor-Risiko bei Live-Pilot — Marcel-Live-Test pflicht |
| **Confidence-Display im UI** | Frontend-Component-Refactor benötigt |

---

## Marcel-Pflicht-Aktionen

### Sofort
1. `lib/ki-prompts/index.js` review — sind die Prompts §407a-konform?
2. Confidence-Score in admin/voll.html-KI-Costs-Tab anzeigen (Sprint K-2)

### NACHT-PAUSE-File pending
3. Anthropic-Fallback: Marcel-Decision (API-Key + AVV nötig)

### Sprint K-2
4. ki-proxy.js refactoren um lib/ki-prompts/ zu nutzen
5. /akte.html: ki-history-Modal einbauen
6. KI-Edit-Suggestions als opt-in im §6-Editor

---

## Quality-Bar

- 0 Production-Breaking-Changes (neue Files, kein Refactor von ki-proxy.js)
- node --check OK für alle 3 Files
- CLAUDE.md-Konformität (§407a + Konjunktiv II + GPT-4o für Konjunktiv)
- Pattern-Reuse: `getSupabase()` aus storage-router

---

*Tier 5 partial done — Frontend-Integration als MEGA⁹.*
