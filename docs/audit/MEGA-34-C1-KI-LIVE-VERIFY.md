# MEGA³⁴ C1 — KI-Funktions-Garantie Live-Verify

**Datum:** 2026-05-07

## 10 Live-verifizierte KI-Funktionen

| Funktion | Modell | Max-Tokens | Erwartete Latency |
|---|---|---|---|
| rechtschreibung | gpt-5.4-mini | 50 | < 2s |
| grammatik | gpt-5.4-mini | 50 | < 2s |
| fachsprache | gpt-5.4 | 80 | < 4s |
| absatz_struktur | gpt-5.4-mini | 80 | < 2s |
| normen_vorschlag | gpt-5.4-mini | 50 | < 2s |
| paragraph_check | gpt-5.4-mini | 30 | < 1s |
| diktat_strukturierung | gpt-5.4-mini | 80 | < 3s |
| **konjunktiv_pruefung** | **gpt-5.5** | 60 | < 5s |
| halluzinations_check | gpt-5.4 | 60 | < 4s |
| paragraph_407a_check | gpt-5.4-mini | 50 | < 2s |

## Spezial-Verifikations-Tests

1. **Konjunktiv-II-Verify mit GPT-5.5** (NICHT mini!) — Regel 14
   - Input: "Die Wanne ist undicht."
   - Erwartet Output mit Marker: liegt nahe / wäre / könnte / dürfte / würde
2. **Halluzinations-Check erkennt erfundene Norm**
   - Mock-Output mit halluzinierter "DIN 99999-7"
   - Erwartet: "JA" (= halluziniert)

## Skip-Logic (CI-friendly)

- Wenn `OPENAI_API_KEY` ENV nicht gesetzt → Tests werden übersprungen mit Reason "OPENAI_API_KEY fehlt"
- Skip wird in node:test als `{ skip: true }` markiert (kein Failure in CI ohne Key)

## Cost-Cap pro Test

- Standard-Test-Set: 200 input + 100 output Tokens
- Max-Cost: < 0.001 € pro Test (gpt-5.4-mini bei 0.40$/1M input + 1.60$/1M output × 0.92 EUR-Faktor)
- Bei 10 Tests + 2 Spezial = ~0.012 € Total-Cost für vollen Live-Run

## Laufanweisung

```bash
OPENAI_API_KEY=sk-... npm run test:ki-live
```

oder direkt:

```bash
OPENAI_API_KEY=sk-... node --test tests/ki-funktionen-live/
```

## Mock-Tests bleiben aktiv

Die 50 Mock-Tests aus MEGA³¹ B1 (`tests/ki-functions-garantie/`) laufen weiterhin
in jedem `npm test`-Run. Live-Tests sind opt-in für Pre-Pilot-Verifikation.

---

*Co-Authored-By Claude Opus 4.7 (1M context)*
