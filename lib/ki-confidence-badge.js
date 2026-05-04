/**
 * PROVA KI-Confidence-Badge (Frontend)
 * MEGA¹² W13 (Tier 5c, 2026-05-05)
 *
 * Frontend-Mirror der Backend-Engine netlify/functions/lib/ki-confidence.js (MEGA⁸ V3).
 * Berechnet Confidence-Score lokal (kein extra Backend-Call) und rendert Badge.
 *
 * Public API:
 *   ProvaConfidence.compute(openaiResult, opts)  →  { level, score, reasons }
 *   ProvaConfidence.render(container, confidence)  →  Badge-Element
 *   ProvaConfidence.applyToResponse(response, container, opts)  →  Convenience
 *
 * USAGE in Page-Logic:
 *   const r = await callKI(...);
 *   ProvaConfidence.applyToResponse(r, '#ki-output-container', { requireKonjunktivII: true });
 *
 * Anti-Pattern vermieden:
 *   - Kein Backend-Call (Logic ist klein, redundant okay)
 *   - Kein dauerhafter DOM-Watcher (single-render pro Response)
 *   - Bei niedrig: zusaetzlicher "SV-Review noetig"-Hint (CLAUDE.md Regel 8)
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-confidence-badge-style';

  // Konstanten — Spiegel von netlify/functions/lib/ki-confidence.js
  const KONJUNKTIV_II_MARKERS = [
    'koennte', 'koennten', 'waere', 'waeren', 'duerfte', 'duerften',
    'liesse', 'haette', 'sollte', 'wuerde', 'wuerden',
    'naheliegend', 'wahrscheinlich', 'denkbar',
    // Plus Umlaut-Varianten (Backend nutzt nur ASCII, Frontend pragmatischer)
    'könnte', 'könnten', 'wäre', 'wären', 'dürfte', 'dürften',
    'ließe', 'hätte', 'würde', 'würden'
  ];

  const HALLUZINATION_RED_FLAGS = [
    'mit Sicherheit', 'definitiv', 'zweifellos', 'eindeutig',
    'beweisbar', 'unbestreitbar'
  ];

  // ─── Style-Inject ────────────────────────────────────────────────────
  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-conf-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        cursor: help;
        margin-left: 8px;
        vertical-align: middle;
      }
      .prova-conf-badge--hoch {
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .prova-conf-badge--mittel {
        background: rgba(245, 158, 11, 0.12);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .prova-conf-badge--niedrig {
        background: rgba(239, 68, 68, 0.12);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      .prova-conf-review-hint {
        display: block;
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(239, 68, 68, 0.06);
        border-left: 3px solid #ef4444;
        border-radius: 4px;
        font-size: 12px;
        color: #ef4444;
      }
      .prova-conf-badge:focus { outline: 2px solid currentColor; outline-offset: 2px; }
    `;
    document.head.appendChild(style);
  }

  // ─── Compute (Spiegel von Backend computeConfidence) ─────────────────
  function compute(openaiResult, opts) {
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
      reasons.push('Output abgeschnitten');
    } else if (finish === 'content_filter') {
      score -= 60;
      reasons.push('Content-Filter aktiv');
    } else {
      score -= 15;
      reasons.push('Unbekannter finish_reason');
    }

    // 2. Token-Length (kurz = problematisch wenn Min erwartet)
    const usage = openaiResult.usage || {};
    const tokensOut = usage.completion_tokens || 0;
    if (tokensOut < 30 && opts.expectedMinTokens) {
      score -= 20;
      reasons.push('Output sehr kurz');
    }

    // 3. Konjunktiv-II-Density
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
        reasons.push('Wenige Konjunktiv-II-Marker');
      }
    }

    // 4. Halluzinations-Red-Flags
    // MEGA¹³ W20 Bug-Fix: Whitespace-Normalisierung (Multi-Space, Tab, NBSP)
    const lowerText = text.toLowerCase().replace(/[\s ]+/g, ' ');
    let redFlagCount = 0;
    for (const rf of HALLUZINATION_RED_FLAGS) {
      if (lowerText.includes(rf.toLowerCase().replace(/\s+/g, ' '))) redFlagCount++;
    }
    if (redFlagCount > 0) {
      score -= redFlagCount * 15;
      reasons.push('Apodiktische Aussagen (' + redFlagCount + 'x)');
    }

    // 5. Model-Mapping
    const model = openaiResult.model || '';
    if (model.includes('gpt-4o') && !model.includes('mini')) {
      if (reasons.length === 0) score = Math.min(100, score + 5);
    } else if (model.includes('gpt-4o-mini')) {
      if (opts.requireKonjunktivII) {
        score -= 20;
        reasons.push('gpt-4o-mini bei Konjunktiv II');
      }
    }

    // Final-Bewertung
    let level;
    if (score >= 80) level = 'hoch';
    else if (score >= 50) level = 'mittel';
    else level = 'niedrig';

    return { level, score: Math.max(0, score), reasons };
  }

  // ─── Render ───────────────────────────────────────────────────────────
  function _levelEmoji(level) {
    if (level === 'hoch') return '✓';
    if (level === 'mittel') return '⚠';
    if (level === 'niedrig') return '!';
    return '?';
  }

  function _levelLabel(level) {
    if (level === 'hoch') return 'KI-Confidence: hoch';
    if (level === 'mittel') return 'KI-Confidence: mittel';
    if (level === 'niedrig') return 'KI-Confidence: niedrig — SV-Review noetig';
    return 'KI-Confidence: unbekannt';
  }

  function render(container, confidence) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container || !confidence) return null;

    _injectStyle();

    // Idempotent: bestehende Badge entfernen
    remove(container);

    const badge = document.createElement('span');
    badge.className = 'prova-conf-badge prova-conf-badge--' + confidence.level;
    badge.setAttribute('role', 'note');
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('aria-label', _levelLabel(confidence.level));

    const tooltipParts = ['Confidence: ' + confidence.level + ' (' + confidence.score + '/100)'];
    if (confidence.reasons && confidence.reasons.length > 0) {
      tooltipParts.push('Gründe:');
      tooltipParts.push(...confidence.reasons.map(r => '· ' + r));
    }
    badge.title = tooltipParts.join('\n');

    badge.innerHTML =
      '<span aria-hidden="true">' + _levelEmoji(confidence.level) + '</span>' +
      '<span>' + (confidence.level === 'niedrig' ? 'Confidence niedrig' :
                  confidence.level === 'mittel' ? 'Confidence mittel' :
                  'Confidence hoch') + '</span>';

    container.appendChild(badge);

    // Bei niedrig: SV-Review-Hint anhaengen (CLAUDE.md Regel 8: KI macht nie eigenstaendige Bewertungen)
    if (confidence.level === 'niedrig') {
      const hint = document.createElement('div');
      hint.className = 'prova-conf-review-hint';
      hint.setAttribute('role', 'alert');
      hint.textContent = '⚠ SV-Review noetig: KI-Output sollte vor Verwendung manuell geprueft werden. Gründe: ' +
        (confidence.reasons || []).join(', ');
      container.appendChild(hint);
    }

    return badge;
  }

  function remove(container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    const existingBadges = container.querySelectorAll('.prova-conf-badge');
    existingBadges.forEach(b => b.parentNode && b.parentNode.removeChild(b));
    const existingHints = container.querySelectorAll('.prova-conf-review-hint');
    existingHints.forEach(h => h.parentNode && h.parentNode.removeChild(h));
  }

  /**
   * Convenience: berechnet + rendert.
   *
   * @param {object} response  KI-Response (OpenAI-shape)
   * @param {HTMLElement|string} container
   * @param {object} opts  { requireKonjunktivII, expectedMinTokens }
   * @returns {object} confidence-Objekt
   */
  function applyToResponse(response, container, opts) {
    const conf = compute(response, opts);
    render(container, conf);
    return conf;
  }

  // Public API
  window.ProvaConfidence = {
    compute: compute,
    render: render,
    remove: remove,
    applyToResponse: applyToResponse
  };

  // Test-Exports
  window.ProvaConfidence._test = {
    KONJUNKTIV_II_MARKERS: KONJUNKTIV_II_MARKERS,
    HALLUZINATION_RED_FLAGS: HALLUZINATION_RED_FLAGS,
    levelEmoji: _levelEmoji,
    levelLabel: _levelLabel
  };
})();
