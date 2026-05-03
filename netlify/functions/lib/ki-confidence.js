/**
 * PROVA — KI-Confidence-Score Helper
 * MEGA⁸ V3 (04.05.2026)
 *
 * Berechnet Confidence-Score fuer KI-Output basierend auf:
 *  - finish_reason ('stop' = ok, 'length' = abgeschnitten, 'content_filter' = blocked)
 *  - Token-Verhaeltnis Output/Input
 *  - Model-Confidence-Mapping
 *  - Pseudo-Heuristik fuer Konjunktiv-II-Marker
 *
 * Returns: 'hoch' | 'mittel' | 'niedrig' + Reason-String
 *
 * Public API:
 *   computeConfidence(openaiResult, opts) -> { level, score, reasons }
 */
'use strict';

const KONJUNKTIV_II_MARKERS = [
  'koennte', 'koennten', 'waere', 'waeren', 'duerfte', 'duerften',
  'liesse', 'haette', 'sollte', 'wuerde', 'wuerden',
  'naheliegend', 'wahrscheinlich', 'denkbar'
];

const HALLUZINATION_RED_FLAGS = [
  'mit Sicherheit', 'definitiv', 'zweifellos', 'eindeutig',
  'beweisbar', 'unbestreitbar'
];

function computeConfidence(openaiResult, opts) {
  opts = opts || {};
  const reasons = [];
  let score = 100;

  if (!openaiResult || !openaiResult.choices || !openaiResult.choices[0]) {
    return { level: 'niedrig', score: 0, reasons: ['Kein Output'] };
  }

  const choice = openaiResult.choices[0];
  const text = (choice.message && choice.message.content) || '';
  const finish = choice.finish_reason || 'unknown';

  // 1. Finish-Reason
  if (finish === 'stop') {
    // OK
  } else if (finish === 'length') {
    score -= 25;
    reasons.push('Output abgeschnitten (length-limit)');
  } else if (finish === 'content_filter') {
    score -= 60;
    reasons.push('Content-Filter aktiv');
  } else {
    score -= 15;
    reasons.push('Unbekannter finish_reason: ' + finish);
  }

  // 2. Token-Verhaeltnis (Output zu kurz = vermutlich problematisch)
  const usage = openaiResult.usage || {};
  const tokensOut = usage.completion_tokens || 0;
  if (tokensOut < 30 && opts.expectedMinTokens) {
    score -= 20;
    reasons.push('Output sehr kurz (' + tokensOut + ' Tokens)');
  }

  // 3. Konjunktiv-II-Density (bei Kausalaussagen wichtig)
  if (opts.requireKonjunktivII) {
    const lowerText = text.toLowerCase();
    let kvCount = 0;
    for (const m of KONJUNKTIV_II_MARKERS) {
      if (lowerText.includes(m)) kvCount++;
    }
    if (kvCount === 0) {
      score -= 30;
      reasons.push('Keine Konjunktiv-II-Marker (§407a-Risiko)');
    } else if (kvCount < 2) {
      score -= 10;
      reasons.push('Wenige Konjunktiv-II-Marker (' + kvCount + ')');
    }
  }

  // 4. Halluzinations-Red-Flags (apodiktische Aussagen)
  const lowerText = text.toLowerCase();
  let redFlagCount = 0;
  for (const rf of HALLUZINATION_RED_FLAGS) {
    if (lowerText.includes(rf)) redFlagCount++;
  }
  if (redFlagCount > 0) {
    score -= redFlagCount * 15;
    reasons.push('Apodiktische Aussagen gefunden (' + redFlagCount + 'x)');
  }

  // 5. Model-Mapping
  const model = openaiResult.model || '';
  if (model.includes('gpt-4o') && !model.includes('mini')) {
    // GPT-4o = staerker, +5 Bonus wenn nichts negatives
    if (reasons.length === 0) score = Math.min(100, score + 5);
  } else if (model.includes('gpt-4o-mini')) {
    // gpt-4o-mini fuer Konjunktiv II = Penalty (CLAUDE.md Regel 14)
    if (opts.requireKonjunktivII) {
      score -= 20;
      reasons.push('gpt-4o-mini ist nicht zuverlaessig fuer Konjunktiv II');
    }
  }

  // Final-Bewertung
  let level;
  if (score >= 80) level = 'hoch';
  else if (score >= 50) level = 'mittel';
  else level = 'niedrig';

  return { level, score: Math.max(0, score), reasons };
}

module.exports = { computeConfidence, KONJUNKTIV_II_MARKERS, HALLUZINATION_RED_FLAGS };
