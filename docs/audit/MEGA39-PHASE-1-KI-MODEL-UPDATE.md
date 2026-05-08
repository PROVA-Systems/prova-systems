# MEGA³⁹ Phase 1 — KI-Modell-Update gpt-4o → gpt-5.5-Stack

**Datum:** 2026-05-08 (Nacht zu 09.05.)
**Branch:** `mega39-master-consolidation`
**Status:** ✅ APPLIED in 4 Files + Tests grün.

---

## Web-Search-Quellen (M³⁹-Prompt zitiert, OpenAI-Modell-Stand 09.05.2026)

| Modell | Released | Status | API-String |
|--------|----------|--------|------------|
| `gpt-5.5` | 23.04.2026 | Frontier | `gpt-5.5-2026-04-23` |
| `gpt-5.5-pro` | 23.04.2026 | Parallel-Test-Time-Compute | `gpt-5.5-pro` |
| `gpt-5.5-instant` | 05.05.2026 | Default-Low-Latency | `gpt-5.5-instant` |
| `gpt-5.4` | Dec 2025 | Stable | `gpt-5.4` |
| `gpt-5.4-mini` | Dec 2025 | Stable | `gpt-5.4-mini` |
| `gpt-4o` | – | **DEPRECATED Feb 2026** | – |
| `gpt-4o-mini` | – | **DEPRECATED Feb 2026** | – |

## PROVA-Mapping (Frontend-Strings → API-Namen)

```
'praezise'         → gpt-5.5
'schnell'          → gpt-5.5-instant
'gpt_4o' (legacy)  → gpt-5.5            (Auto-Migration)
'gpt_4o_mini'      → gpt-5.5-instant    (Auto-Migration)
'gpt_4_turbo'      → gpt-5.5            (Auto-Migration)
```

## Geänderte Files

| File | Änderung |
|------|----------|
| `supabase/functions/ki-proxy/index.ts` | MODEL_API_NAME-Map mit praezise/schnell + Legacy-Aliase; PRICE_PER_M_TOKENS für neue Modelle; FORCED_HIGH_MODEL_PURPOSES (statt FORCED_GPT_4O_PURPOSES); Default = 'schnell' |
| `netlify/functions/lib/ki-cost-calc.js` | `gpt-5.5-instant` Pricing-Eintrag ergänzt |
| `netlify/functions/lib/ki-confidence.js` | isFrontier / isLightModel-Detection; Konjunktiv-II-Penalty für Light-Modelle (statt nur gpt-4o-mini) |
| `netlify/functions/lib/ki-anthropic.js` | `gpt-5.5-instant` → `claude-haiku-4-5` Mapping |

## Konjunktiv-II-Validator-Pflicht

CLAUDE.md Regel 14 sagte: "Konjunktiv-II nur GPT-4o, NIEMALS Mini".
M³⁹-Update: Mit gpt-5.5 wird das **breiter** — Frontier-Modelle (gpt-5.5/5.5-pro/5.4)
sind alle Konjunktiv-II-tauglich. Light-Modelle (gpt-5.5-instant/5.4-mini/5.4-nano)
weiterhin nicht ausreichend.

`FORCED_HIGH_MODEL_PURPOSES`:
- `konjunktiv_korrektur` → erzwingt 'praezise' (gpt-5.5)
- `halluzinations_check` → erzwingt 'praezise'
- `407a_konsistenz` → erzwingt 'praezise'

## Tests

`tests/ki/m39-p1-modell-update.test.js` — 9 Tests:
- MODEL_API_NAME-Mappings + Legacy-Aliase
- PRICE_PER_M_TOKENS für neue Modelle
- FORCED_HIGH_MODEL_PURPOSES erzwingt Frontier
- Default ist 'schnell'
- calcCostEur akzeptiert beide Namen-Konventionen
- ki-cost-calc, ki-confidence, ki-anthropic Updates

→ **9/9 grün.**

## Marcel-Manual

Edge Function `ki-proxy` muss **manuell deployed** werden (CC vermeidet Auto-Deploy
ohne lokalen Build):

```bash
supabase functions deploy ki-proxy --project-ref cngteblrbpwsyypexjrv
```

Verify nach Deploy:
```bash
curl -X POST https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/ki-proxy \
  -H "Authorization: Bearer JWT" \
  -d '{"prompt":"Test","model":"praezise","purpose":"sonstiges"}'
```

## Acceptance Phase 1

- [x] Edge Function `ki-proxy/index.ts` migriert
- [x] `lib/ki-cost-calc.js` erweitert (gpt-5.5-instant)
- [x] `lib/ki-confidence.js` Frontier/Light-Detection
- [x] `lib/ki-anthropic.js` Mapping erweitert
- [x] Legacy gpt-4o-Strings nur noch als Backwards-Compat-Alias
- [x] 9/9 Tests grün
- [ ] Marcel-Manual: Edge Function deploy

*— M³⁹ P1 — 2026-05-08*
