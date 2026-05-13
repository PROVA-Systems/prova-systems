# KI-Funktions-Garantie · Test-Suite (MEGA⁷⁰ Phase 3.1)

**Marcel-Regel 15:** Jede KI-Funktion muss vor Live-Deploy 5 Tests bestehen:
1. **Funktionalität** — 10 Happy-Path-Beispiele liefern sinnvolle Ergebnisse
2. **Edge-Cases** — 5 Extreme (sehr kurz, sehr lang, ohne Satzzeichen, viele Fachbegriffe, Tippfehler)
3. **Präzision** — bei 20 korrekten Texten: max. 10% Falsch-Positiv-Rate
4. **Konsistenz** — gleicher Input 3× = im Kern gleiches Ergebnis
5. **Zeitverhalten** — < 10s Antwort, sonst Progress-Indikator (kein Spinner)

**Wenn ein Test rot ist** → Funktion wird im UI ausgeblendet (Class `.ki-disabled`).

## Run

```bash
npm run test:ki:all
# oder
npx jest tests/ki-functions-garantie/
```

## Test-Files

| # | Datei | Funktion | Edge Fn | Status |
|---|---|---|---|---|
| 1 | konjunktiv-ii.test.js | Konjunktiv-II-Check | `ki-proxy` (purpose: konjunktiv-pruefung) | 🟡 Skeleton |
| 2 | halluzination.test.js | Halluzinations-Check | `ki-proxy` (purpose: halluzinations-check) | 🟡 Skeleton |
| 3 | norm-suggest.test.js | Norm-Vorschläge | `ki-proxy` (purpose: norm-suggest) | ⏳ TODO |
| 4 | plausibilitaet.test.js | Plausibilitäts-Check | `ki-proxy` (purpose: plausibilitaet) | ⏳ TODO |
| 5 | diktat-strukturierung.test.js | Diktat-Struktur | `ki-diktat-strukturierung` | ⏳ TODO |
| 6 | foto-caption.test.js | Foto-Caption | `foto-captioning` | ⏳ TODO |
| 7 | fragment-extraktion.test.js | Asset → Fragment | `asset-to-fragments-v1` | ⏳ TODO |

## Acceptance-Kriterien pro Test

```js
describe('KI-Funktion X', () => {
  test('Funktionalität: 10 Happy-Paths', async () => { ... expect(passing).toBeGreaterThanOrEqual(9); });
  test('Edge-Cases: 5 Extreme', async () => { ... });
  test('Präzision: max 10% Falsch-Positiv', async () => { ... });
  test('Konsistenz: 3× gleicher Input ≈ gleiche Ausgabe', async () => { ... });
  test('Zeitverhalten: P95 < 10s', async () => { ... });
});
```

## Auto-Disable bei rotem Test

`lib/prova-ki-guard.js` liest Test-Status aus localStorage (`prova_ki_test_results`) und setzt `.ki-disabled`-Klasse auf UI-Elemente mit `data-ki-feature="konjunktiv-ii"` etc.

```html
<button class="ki-action" data-ki-feature="konjunktiv-ii">Konjunktiv prüfen</button>
```

Wenn Test rot → Button wird `[aria-disabled="true"]` + grauer Tooltip "Funktion in Wartung (Test fehlgeschlagen)".

## Status MEGA⁷⁰ Phase 3.1

- ✅ Test-Folder + Konzept-Doku
- ✅ konjunktiv-ii.test.js Skeleton
- ✅ halluzination.test.js Skeleton
- ⏳ 5 weitere Tests: in Folge-Sprint nach Pilot-Start mit echten KI-Calls (kosten-bewusst)
- ⏳ `lib/prova-ki-guard.js` Auto-Disable-Pattern: post-Pilot

**Begründung Defer 5 Tests:** Pro Test-Suite werden ~150 KI-Calls verbraucht (10+5+20+3*N+1) × 7 Funktionen = ~1.000 Calls bei jedem `npm run test:ki:all`. Kosten: ~5-15 EUR pro Lauf. Vor Pilot-Start nicht sinnvoll — Marcel triggert manuell wenn Hot-Fix kommt.
