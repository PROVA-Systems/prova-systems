/**
 * PROVA Admin-Drilldown
 * MEGA¹² W15 (Tier 2 STRETCH, 2026-05-05)
 *
 * Modal-Component fuer KPI-Card → Detail-View.
 * Pattern: User klickt KPI-Card im admin-dashboard → Modal mit Drill-Down-Daten.
 *
 * Public API:
 *   ProvaDrilldown.open(config)
 *   ProvaDrilldown.close()
 *
 * Config:
 *   {
 *     title: 'KI-Anrufe (7d)',
 *     subtitle: 'Auf welchen Endpoints?',
 *     loader: async () => [{ name, value, hint? }, ...],
 *     timeRanges: ['24h', '7d', '30d'],  // optional
 *     onTimeRangeChange: (range) => loader-arg
 *   }
 *
 * USAGE:
 *   ProvaDrilldown.open({
 *     title: 'KI-Anrufe (7d)',
 *     loader: async (range) => {
 *       const r = await fetch('/.netlify/functions/ki-history?since=' + range);
 *       const j = await r.json();
 *       return j.per_funktion.map(f => ({ name: f.funktion, value: f.calls, hint: f.cost_eur + '€' }));
 *     }
 *   });
 *
 * Anti-Pattern vermieden:
 *   - Kein Library-Dep
 *   - ESC-Key + Backdrop-Click schliessen
 *   - aria-modal + role="dialog"
 *   - Focus-Trap (basic): Modal-Close-Button bekommt initial Focus
 *   - Loading-State + Empty-State + Error-State
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-drilldown-style';
  const MODAL_ID = 'prova-drilldown-modal';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-dd-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(4px);
        z-index: 9600;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .prova-dd-overlay--visible { display: flex; }
      .prova-dd-modal {
        background: var(--surface, #1c2537);
        color: var(--text, #e8eaf0);
        border: 1px solid var(--border2, rgba(255,255,255,0.12));
        border-radius: 14px;
        width: 100%;
        max-width: 640px;
        max-height: 88vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      .prova-dd-header {
        padding: 18px 22px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .prova-dd-title { font-size: 17px; font-weight: 700; }
      .prova-dd-subtitle { font-size: 12px; color: var(--text3, #6b7a99); margin-top: 4px; }
      .prova-dd-close {
        background: transparent;
        border: none;
        color: var(--text3, #6b7a99);
        font-size: 22px;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 6px;
      }
      .prova-dd-close:hover { background: rgba(255, 255, 255, 0.06); }
      .prova-dd-toolbar {
        padding: 12px 22px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 12px;
      }
      .prova-dd-time-btn {
        background: transparent;
        border: 1px solid var(--border, rgba(255,255,255,0.12));
        color: var(--text3, #6b7a99);
        border-radius: 6px;
        padding: 5px 12px;
        font-size: 12px;
        cursor: pointer;
      }
      .prova-dd-time-btn--active {
        background: var(--accent, #4f8ef7);
        color: #fff;
        border-color: var(--accent, #4f8ef7);
      }
      .prova-dd-content {
        overflow-y: auto;
        padding: 18px 22px;
        flex: 1;
      }
      .prova-dd-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.05));
      }
      .prova-dd-row:last-child { border-bottom: none; }
      .prova-dd-row-name { font-size: 13.5px; font-weight: 600; }
      .prova-dd-row-hint { font-size: 11.5px; color: var(--text3, #6b7a99); margin-top: 2px; }
      .prova-dd-row-value { font-size: 15px; font-weight: 700; color: var(--text, #e8eaf0); }
      .prova-dd-empty, .prova-dd-loading, .prova-dd-error {
        text-align: center;
        padding: 32px 16px;
        color: var(--text3, #6b7a99);
        font-size: 13px;
      }
      .prova-dd-empty-icon { font-size: 32px; margin-bottom: 12px; }
    `;
    document.head.appendChild(style);
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let _currentConfig = null;
  let _currentRange = null;
  let _previousFocus = null;

  function _renderRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<div class="prova-dd-empty">' +
        '<div class="prova-dd-empty-icon" aria-hidden="true">📊</div>' +
        '<div>Keine Daten im Zeitraum</div>' +
      '</div>';
    }
    return rows.map(r => {
      const name = _esc(r.name || '—');
      const value = _esc(r.value != null ? r.value : '—');
      const hint = r.hint ? '<div class="prova-dd-row-hint">' + _esc(r.hint) + '</div>' : '';
      return '<div class="prova-dd-row">' +
        '<div><div class="prova-dd-row-name">' + name + '</div>' + hint + '</div>' +
        '<div class="prova-dd-row-value">' + value + '</div>' +
      '</div>';
    }).join('');
  }

  async function _loadAndRender() {
    if (!_currentConfig) return;
    const contentEl = document.querySelector('#' + MODAL_ID + ' .prova-dd-content');
    if (!contentEl) return;

    contentEl.innerHTML = '<div class="prova-dd-loading">⏳ Lade…</div>';

    try {
      const rows = await _currentConfig.loader(_currentRange);
      contentEl.innerHTML = _renderRows(rows);
    } catch (e) {
      contentEl.innerHTML = '<div class="prova-dd-error">' +
        '<div class="prova-dd-empty-icon" aria-hidden="true">⚠️</div>' +
        '<div>Fehler beim Laden: ' + _esc(e.message || 'unbekannt') + '</div>' +
      '</div>';
    }
  }

  function _onTimeRangeClick(e) {
    const btn = e.currentTarget;
    const range = btn.dataset.range;
    if (!range || range === _currentRange) return;
    _currentRange = range;
    // Active-Class + aria-pressed aktualisieren (MEGA¹³ W20 Bug-Fix)
    document.querySelectorAll('.prova-dd-time-btn').forEach(b => {
      const isActive = b.dataset.range === range;
      b.classList.toggle('prova-dd-time-btn--active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (_currentConfig.onTimeRangeChange) _currentConfig.onTimeRangeChange(range);
    _loadAndRender();
  }

  function _buildModal(config) {
    _injectStyle();

    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = MODAL_ID;
      modal.className = 'prova-dd-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'prova-dd-title');
      document.body.appendChild(modal);
    }

    const title = config.title || 'Drilldown';
    const subtitle = config.subtitle ? '<div class="prova-dd-subtitle">' + _esc(config.subtitle) + '</div>' : '';

    let toolbar = '';
    if (Array.isArray(config.timeRanges) && config.timeRanges.length > 0) {
      _currentRange = config.timeRanges[0];
      // MEGA¹³ W20 Bug-Fix: aria-pressed fuer Screen-Reader-Konformitaet
      toolbar = '<div class="prova-dd-toolbar" role="group" aria-label="Zeitraum-Filter">' +
        '<span style="color:var(--text3,#6b7a99);">Zeitraum:</span>' +
        config.timeRanges.map((r, i) =>
          '<button class="prova-dd-time-btn' + (i === 0 ? ' prova-dd-time-btn--active' : '') +
          '" data-range="' + _esc(r) + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + _esc(r) + '</button>'
        ).join('') +
      '</div>';
    }

    modal.innerHTML =
      '<div class="prova-dd-modal" role="document">' +
        '<div class="prova-dd-header">' +
          '<div>' +
            '<div class="prova-dd-title" id="prova-dd-title">' + _esc(title) + '</div>' +
            subtitle +
          '</div>' +
          '<button class="prova-dd-close" aria-label="Modal schliessen" type="button">✕</button>' +
        '</div>' +
        toolbar +
        '<div class="prova-dd-content"></div>' +
      '</div>';

    // Event-Wiring
    modal.querySelector('.prova-dd-close').addEventListener('click', close);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();  // Backdrop-Click
    });
    modal.querySelectorAll('.prova-dd-time-btn').forEach(btn => {
      btn.addEventListener('click', _onTimeRangeClick);
    });

    return modal;
  }

  function _onEscapeKey(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById(MODAL_ID);
      if (modal && modal.classList.contains('prova-dd-overlay--visible')) {
        close();
      }
    }
  }

  // MEGA¹³ W20 Bug-Fix: voller Focus-Trap (Tab-Cycle innerhalb Modal)
  function _onTabKey(e) {
    if (e.key !== 'Tab') return;
    const modal = document.getElementById(MODAL_ID);
    if (!modal || !modal.classList.contains('prova-dd-overlay--visible')) return;

    const focusables = modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: wenn aktuell first → wrap zu last
      if (document.activeElement === first || !modal.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: wenn aktuell last → wrap zu first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function open(config) {
    if (!config || typeof config.loader !== 'function') {
      console.warn('[ProvaDrilldown] config.loader (function) is required');
      return;
    }

    _currentConfig = config;
    _previousFocus = document.activeElement;

    const modal = _buildModal(config);
    modal.classList.add('prova-dd-overlay--visible');

    // Focus auf Close-Button (basic Focus-Trap)
    const closeBtn = modal.querySelector('.prova-dd-close');
    if (closeBtn) closeBtn.focus();

    // ESC-Listener + Focus-Trap (MEGA¹³ W20)
    document.addEventListener('keydown', _onEscapeKey);
    document.addEventListener('keydown', _onTabKey);

    // Initial-Load
    _loadAndRender();
  }

  function close() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.remove('prova-dd-overlay--visible');
    }
    document.removeEventListener('keydown', _onEscapeKey);
    document.removeEventListener('keydown', _onTabKey);  // MEGA¹³ W20

    if (_previousFocus && _previousFocus.focus) {
      _previousFocus.focus();
      _previousFocus = null;
    }
    _currentConfig = null;
    _currentRange = null;
  }

  // Public API
  window.ProvaDrilldown = {
    open: open,
    close: close
  };

  // Test-Exports
  window.ProvaDrilldown._test = {
    MODAL_ID: MODAL_ID,
    STYLE_ID: STYLE_ID,
    _renderRows: _renderRows,
    _esc: _esc
  };
})();
