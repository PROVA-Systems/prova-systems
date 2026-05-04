/**
 * PROVA KI-History-Frontend
 * MEGA¹³ W18 (Tier 5b, 2026-05-05)
 *
 * Frontend-Modal fuer chronologische KI-Interaktions-Liste pro Akte.
 * Backend: /netlify/functions/ki-history.js (existing seit MEGA⁸ V3).
 *
 * Public API:
 *   ProvaKIHistory.openForAuftrag(auftragId, options?)
 *   ProvaKIHistory.openGlobal()  → ohne auftragId-Filter
 *   ProvaKIHistory.close()
 *
 * USAGE:
 *   <button onclick="ProvaKIHistory.openForAuftrag('uuid-123')">🤖 KI-Historie</button>
 *
 * Anti-Pattern vermieden:
 *   - Kein eigenes Backend-Endpoint (re-uses ki-history.js)
 *   - Kein Polling (manueller Refresh)
 *   - XSS-Defense via escapeHtml
 *   - Empty-State + Error-State sauber
 *   - Confidence-Badge-Reuse aus W13
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-kih-style';
  const MODAL_ID = 'prova-kih-modal';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-kih-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
        z-index: 9700; display: none;
        align-items: center; justify-content: center; padding: 20px;
      }
      .prova-kih-overlay--visible { display: flex; }
      .prova-kih-modal {
        background: var(--surface,#1c2537); color: var(--text,#e8eaf0);
        border: 1px solid var(--border2, rgba(255,255,255,0.12));
        border-radius: 14px; width: 100%; max-width: 720px; max-height: 88vh;
        overflow: hidden; display: flex; flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      }
      .prova-kih-header {
        padding: 18px 22px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
        display: flex; justify-content: space-between; align-items: center;
      }
      .prova-kih-title { font-size: 17px; font-weight: 700; }
      .prova-kih-subtitle { font-size: 12px; color: var(--text3,#6b7a99); margin-top: 4px; }
      .prova-kih-close {
        background: transparent; border: none; color: var(--text3,#6b7a99);
        font-size: 22px; cursor: pointer; padding: 4px 10px; border-radius: 6px;
      }
      .prova-kih-toolbar {
        padding: 10px 22px;
        border-bottom: 1px solid var(--border,rgba(255,255,255,0.08));
        display: flex; gap: 10px; align-items: center; font-size: 12px;
        flex-wrap: wrap;
      }
      .prova-kih-filter {
        background: transparent; color: var(--text,#e8eaf0);
        border: 1px solid var(--border,rgba(255,255,255,0.12));
        border-radius: 6px; padding: 4px 8px; font-size: 12px;
      }
      .prova-kih-content {
        overflow-y: auto; padding: 14px 22px; flex: 1;
      }
      .prova-kih-row {
        padding: 12px 0;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.05));
      }
      .prova-kih-row:last-child { border-bottom: none; }
      .prova-kih-row-head {
        display: flex; justify-content: space-between; align-items: baseline;
        gap: 8px; flex-wrap: wrap;
      }
      .prova-kih-funktion { font-size: 13px; font-weight: 700; color: var(--text,#e8eaf0); }
      .prova-kih-meta { font-size: 11px; color: var(--text3,#6b7a99); font-family: var(--mono); }
      .prova-kih-badges { display: inline-flex; gap: 6px; flex-wrap: wrap; }
      .prova-kih-pill {
        font-size: 10px; padding: 2px 7px; border-radius: 999px;
        background: rgba(79,142,247,.12); color: var(--accent,#4f8ef7);
        border: 1px solid rgba(79,142,247,.3);
      }
      .prova-kih-pill--fallback {
        background: rgba(245,158,11,.12); color: #f59e0b;
        border-color: rgba(245,158,11,.3);
      }
      .prova-kih-cost {
        font-size: 11.5px; color: var(--text3,#6b7a99); margin-top: 4px;
      }
      .prova-kih-empty, .prova-kih-loading, .prova-kih-error {
        text-align: center; padding: 32px 16px; color: var(--text3,#6b7a99);
        font-size: 13px;
      }
      .prova-kih-empty-icon { font-size: 32px; margin-bottom: 12px; }
    `;
    document.head.appendChild(style);
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtTokens(n) {
    // MEGA¹² Bug-Fix Pattern: NaN-handling
    if (n == null || isNaN(n)) return '—';
    if (n >= 1000) return Math.round(n/1000) + 'k';
    return String(n);
  }

  function _fmtEur(n) {
    if (n == null || isNaN(n)) return '0,00€';
    return Number(n).toFixed(2).replace('.',',') + '€';
  }

  function _fmtRelativeTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const sec = Math.floor(diff / 1000);
      if (sec < 60) return 'gerade eben';
      if (sec < 3600) return Math.floor(sec/60) + 'min';
      if (sec < 86400) return Math.floor(sec/3600) + 'h';
      if (sec < 7*86400) return Math.floor(sec/86400) + 'd';
      return d.toLocaleDateString('de-DE');
    } catch (_) { return '—'; }
  }

  let _currentAuftragId = null;
  let _currentFunktion = '';  // filter
  let _previousFocus = null;
  let _allRecords = [];

  function _renderRows(records, filter) {
    const filtered = filter ? records.filter(r => r.funktion === filter) : records;
    if (!Array.isArray(filtered) || filtered.length === 0) {
      return '<div class="prova-kih-empty">' +
        '<div class="prova-kih-empty-icon" aria-hidden="true">🤖</div>' +
        '<div>Keine KI-Aufrufe gefunden</div>' +
      '</div>';
    }

    return filtered.map(r => {
      const fn = _esc(r.funktion || 'unknown');
      const time = _fmtRelativeTime(r.created_at);
      const tokIn = _fmtTokens(r.tokens_in);
      const tokOut = _fmtTokens(r.tokens_out);
      const cost = _fmtEur(r.kosten_eur);
      const model = _esc(r.modell || '?');

      // Provider-Badge (W12-Erweiterung: Anthropic-Fallback erkennen via metadata)
      let providerBadge = '';
      if (r.metadata && r.metadata._provider === 'anthropic') {
        providerBadge = '<span class="prova-kih-pill prova-kih-pill--fallback" title="Anthropic-Fallback (OpenAI war nicht erreichbar)">🛡️ Backup-KI</span>';
      }

      return '<div class="prova-kih-row">' +
        '<div class="prova-kih-row-head">' +
          '<span class="prova-kih-funktion">' + fn + '</span>' +
          '<span class="prova-kih-badges">' +
            providerBadge +
            '<span class="prova-kih-pill">' + model + '</span>' +
          '</span>' +
        '</div>' +
        '<div class="prova-kih-meta">' + _esc(time) + ' · in ' + tokIn + ' / out ' + tokOut + ' Tokens</div>' +
        '<div class="prova-kih-cost">' + cost + '</div>' +
      '</div>';
    }).join('');
  }

  async function _loadAndRender() {
    const contentEl = document.querySelector('#' + MODAL_ID + ' .prova-kih-content');
    if (!contentEl) return;

    contentEl.innerHTML = '<div class="prova-kih-loading">⏳ Lade KI-Historie…</div>';

    try {
      const fetcher = window.provaFetch || window.fetch;
      let url = '/.netlify/functions/ki-history?since=30d&limit=200';
      if (_currentAuftragId) url += '&auftrag_id=' + encodeURIComponent(_currentAuftragId);

      const res = await fetcher(url);
      if (!res.ok) {
        contentEl.innerHTML = '<div class="prova-kih-error">' +
          '<div class="prova-kih-empty-icon">⚠️</div>' +
          '<div>HTTP ' + res.status + ': KI-Historie konnte nicht geladen werden</div>' +
        '</div>';
        return;
      }

      const data = await res.json();
      if (!data.ok || data.configured === false) {
        contentEl.innerHTML = '<div class="prova-kih-empty">' +
          '<div class="prova-kih-empty-icon">🤖</div>' +
          '<div>KI-Historie noch nicht aktiv</div>' +
        '</div>';
        return;
      }

      _allRecords = Array.isArray(data.records) ? data.records : [];

      // Filter-Dropdown auffuellen mit unique-Funktionen
      const uniqueFns = Array.from(new Set(_allRecords.map(r => r.funktion).filter(Boolean))).sort();
      const filterSel = document.querySelector('#prova-kih-filter');
      if (filterSel) {
        const currentVal = filterSel.value || '';
        filterSel.innerHTML = '<option value="">Alle Funktionen</option>' +
          uniqueFns.map(fn => '<option value="' + _esc(fn) + '">' + _esc(fn) + '</option>').join('');
        filterSel.value = currentVal;
      }

      contentEl.innerHTML = _renderRows(_allRecords, _currentFunktion);
    } catch (e) {
      contentEl.innerHTML = '<div class="prova-kih-error">' +
        '<div class="prova-kih-empty-icon">⚠️</div>' +
        '<div>' + _esc(e.message || 'Unbekannter Fehler') + '</div>' +
      '</div>';
    }
  }

  function _onFilterChange(e) {
    _currentFunktion = e.target.value || '';
    const contentEl = document.querySelector('#' + MODAL_ID + ' .prova-kih-content');
    if (contentEl) contentEl.innerHTML = _renderRows(_allRecords, _currentFunktion);
  }

  function _buildModal(isAuftragSpecific) {
    _injectStyle();

    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = MODAL_ID;
      modal.className = 'prova-kih-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'prova-kih-title');
      document.body.appendChild(modal);
    }

    const title = isAuftragSpecific ? '🤖 KI-Historie (dieser Fall)' : '🤖 KI-Historie (alle)';
    const subtitle = isAuftragSpecific
      ? 'Chronologische Liste aller KI-Aufrufe zu diesem Fall (letzte 30 Tage)'
      : 'Alle KI-Aufrufe in deinem Workspace (letzte 30 Tage, max 200)';

    modal.innerHTML =
      '<div class="prova-kih-modal" role="document">' +
        '<div class="prova-kih-header">' +
          '<div>' +
            '<div class="prova-kih-title" id="prova-kih-title">' + _esc(title) + '</div>' +
            '<div class="prova-kih-subtitle">' + _esc(subtitle) + '</div>' +
          '</div>' +
          '<button class="prova-kih-close" aria-label="Modal schliessen" type="button">✕</button>' +
        '</div>' +
        '<div class="prova-kih-toolbar">' +
          '<label for="prova-kih-filter" style="color:var(--text3,#6b7a99);">Filter:</label>' +
          '<select id="prova-kih-filter" class="prova-kih-filter">' +
            '<option value="">Alle Funktionen</option>' +
          '</select>' +
        '</div>' +
        '<div class="prova-kih-content"></div>' +
      '</div>';

    modal.querySelector('.prova-kih-close').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    const filter = modal.querySelector('#prova-kih-filter');
    if (filter) filter.addEventListener('change', _onFilterChange);

    return modal;
  }

  function _onEscape(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById(MODAL_ID);
      if (modal && modal.classList.contains('prova-kih-overlay--visible')) close();
    }
  }

  function openForAuftrag(auftragId, options) {
    _currentAuftragId = auftragId || null;
    _currentFunktion = '';
    _previousFocus = document.activeElement;

    const modal = _buildModal(!!auftragId);
    modal.classList.add('prova-kih-overlay--visible');

    const closeBtn = modal.querySelector('.prova-kih-close');
    if (closeBtn) closeBtn.focus();

    document.addEventListener('keydown', _onEscape);
    _loadAndRender();
  }

  function openGlobal(options) {
    return openForAuftrag(null, options);
  }

  function close() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove('prova-kih-overlay--visible');
    document.removeEventListener('keydown', _onEscape);
    if (_previousFocus && _previousFocus.focus) {
      _previousFocus.focus();
      _previousFocus = null;
    }
    _currentAuftragId = null;
    _currentFunktion = '';
    _allRecords = [];
  }

  // Public API
  window.ProvaKIHistory = {
    openForAuftrag: openForAuftrag,
    openGlobal: openGlobal,
    close: close
  };

  // Test-Exports
  window.ProvaKIHistory._test = {
    _esc: _esc,
    _fmtTokens: _fmtTokens,
    _fmtEur: _fmtEur,
    _fmtRelativeTime: _fmtRelativeTime,
    _renderRows: _renderRows,
    MODAL_ID: MODAL_ID
  };
})();
