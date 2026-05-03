/**
 * PROVA KI-Cost-Display
 * MEGA¹¹ W9 (Tier 5 ohne Anthropic, 2026-05-04)
 *
 * Frontend fuer /netlify/functions/ki-history.js (existing seit MEGA⁸ V3).
 * Zeigt User-Cost-Transparency in einstellungen.html → KI-Cost-Modal.
 *
 * Public API:
 *   oeffneKICostModal()    — Modal oeffnen + ladeKICost auto
 *   schliesseKICostModal() — Modal schliessen
 *   ladeKICost()           — Refresh von Backend
 *
 * Charts: pure CSS-Bars (kein Chart-Library-Pflicht — Vanilla-JS-Direktive)
 *
 * Anti-Pattern vermieden:
 *   - Kein Chart-Library (Vanilla-Direktive)
 *   - Kein Polling (manueller Refresh)
 *   - Kein Caching (immer frisch — Cost-Display soll aktuell sein)
 *   - Defensive: bei Endpoint-Fail Empty-State statt error-screen
 */
'use strict';

(function () {

  function fmt(n, decimals) {
    if (n == null || isNaN(n)) return '—';
    decimals = decimals == null ? 2 : decimals;
    return Number(n).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtTokens(n) {
    if (n == null) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return Math.round(n / 1000) + 'k';
    return String(n);
  }

  function fmtEur(n) {
    if (n == null || isNaN(n)) return '0,00 €';
    return fmt(n, 2) + ' €';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _renderError(content, msg) {
    content.innerHTML =
      '<div style="text-align:center;padding:40px 20px;color:var(--text3);">' +
        '<div style="font-size:32px;margin-bottom:12px;">⚠️</div>' +
        '<div style="font-size:14px;font-weight:600;margin-bottom:6px;color:var(--text);">' + escapeHtml(msg) + '</div>' +
        '<div style="font-size:12px;">Bitte spaeter erneut versuchen oder Sentry-Logs pruefen</div>' +
      '</div>';
  }

  function _renderEmpty(content, since) {
    content.innerHTML =
      '<div style="text-align:center;padding:40px 20px;color:var(--text3);">' +
        '<div style="font-size:32px;margin-bottom:12px;">🤖</div>' +
        '<div style="font-size:14px;font-weight:600;margin-bottom:6px;color:var(--text);">Keine KI-Nutzung im Zeitraum</div>' +
        '<div style="font-size:12px;">Letzte ' + escapeHtml(since) + ' — keine KI-Calls protokolliert</div>' +
      '</div>';
  }

  function _renderSummary(s) {
    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;">' +
      _kpiCard('Anrufe gesamt',  fmt(s.calls_total, 0),     'KI-Anfragen')         +
      _kpiCard('Kosten gesamt',  fmtEur(s.cost_total_eur),  'Brutto-Kosten')        +
      _kpiCard('Tokens In',      fmtTokens(s.tokens_in_total), 'Input-Tokens')      +
      _kpiCard('Tokens Out',     fmtTokens(s.tokens_out_total), 'Output-Tokens')    +
    '</div>';
  }

  function _kpiCard(label, value, sub) {
    return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;">' +
      '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;font-weight:600;">' + escapeHtml(label) + '</div>' +
      '<div style="font-size:20px;font-weight:700;margin-top:6px;color:var(--text);">' + value + '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:2px;">' + escapeHtml(sub) + '</div>' +
    '</div>';
  }

  function _renderPerFunktion(perFunktion) {
    if (!perFunktion || perFunktion.length === 0) return '';
    // Find max cost fuer Bar-Skalierung
    const maxCost = Math.max(...perFunktion.map(f => f.cost_eur || 0), 0.01);

    let html = '<div style="margin-bottom:16px;">' +
      '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;">Kosten pro KI-Funktion</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">';

    for (const fn of perFunktion) {
      const pct = Math.max(2, Math.round((fn.cost_eur / maxCost) * 100));
      html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<span style="font-size:13px;font-weight:600;color:var(--text);">' + escapeHtml(fn.funktion) + '</span>' +
          '<span style="font-size:12px;color:var(--text3);">' +
            fmt(fn.calls, 0) + ' Anrufe · <strong style="color:var(--text);">' + fmtEur(fn.cost_eur) + '</strong>' +
          '</span>' +
        '</div>' +
        '<div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;">' +
          '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,var(--accent,#4f8ef7),#6aa8ff);"></div>' +
        '</div>' +
      '</div>';
    }
    html += '</div></div>';
    return html;
  }

  // ─── Public API ───────────────────────────────────────────────────────
  async function ladeKICost() {
    const content = document.getElementById('ki-cost-content');
    if (!content) return;

    content.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:40px 0;">⏳ Lade…</div>';

    const sinceEl = document.getElementById('ki-cost-since');
    const since = (sinceEl && sinceEl.value) || '7d';

    try {
      const fetcher = (window.provaFetch || window.fetch);
      const res = await fetcher('/.netlify/functions/ki-history?since=' + encodeURIComponent(since) + '&limit=200');
      if (!res.ok) {
        _renderError(content, 'KI-Historie konnte nicht geladen werden (HTTP ' + res.status + ')');
        return;
      }
      const data = await res.json();

      if (!data.ok || data.configured === false) {
        _renderEmpty(content, since);
        return;
      }

      const summary = data.summary || {};
      if ((summary.calls_total || 0) === 0) {
        _renderEmpty(content, since);
        return;
      }

      let html = _renderSummary(summary);
      html += _renderPerFunktion(data.per_funktion);
      html += '<div style="margin-top:16px;padding:12px;background:rgba(79,142,247,.06);border:1px solid rgba(79,142,247,.2);border-radius:8px;font-size:11px;color:var(--text3);">' +
        '💡 Quelle: ki_protokoll-Tabelle (CLAUDE.md Regel 16). ' +
        'Kosten sind Brutto je nach OpenAI-Pricing zum Zeitpunkt des Anrufs.' +
      '</div>';

      content.innerHTML = html;
    } catch (e) {
      _renderError(content, 'Fehler: ' + (e.message || 'unbekannt'));
    }
  }

  function oeffneKICostModal() {
    const m = document.getElementById('ki-cost-modal');
    if (!m) return;
    m.style.display = 'flex';
    ladeKICost();
  }

  function schliesseKICostModal() {
    const m = document.getElementById('ki-cost-modal');
    if (m) m.style.display = 'none';
  }

  // ESC-Key schliesst Modal
  if (window.addEventListener) {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const m = document.getElementById('ki-cost-modal');
        if (m && m.style.display === 'flex') schliesseKICostModal();
      }
    });
  }

  // Public Exports
  window.oeffneKICostModal = oeffneKICostModal;
  window.schliesseKICostModal = schliesseKICostModal;
  window.ladeKICost = ladeKICost;

  // Test-Exports
  window.ProvaKICost = {
    _test: { fmt, fmtTokens, fmtEur, escapeHtml }
  };
})();
