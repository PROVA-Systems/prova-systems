/**
 * PROVA Filter-Chips (MEGA⁷⁰ Phase 2.1)
 *
 * Standardisiertes Chip-Filter-Pattern mit Count-Badges.
 * Drop-in für Listen-Pages (archiv, schadensfaelle, kontakte, fristen, rechnungen).
 *
 * API:
 *   ProvaFilterChips.render({
 *     container,           // CSS-Selector oder Element
 *     chips: [{ value, label, count? }],  // Erstes ist Default-aktiv (Alle)
 *     onChange: (value) => void,
 *     activeValue?: 'value'
 *   })
 *   ProvaFilterChips.updateCounts(container, { value1: 5, value2: 3 })
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-filter-chips-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-filter-chips-style';
    style.textContent = `
      .pfc-wrap { display: inline-flex; flex-wrap: wrap; gap: 6px; padding: 4px 0; }
      .pfc-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--surface, #1c2130); border: 1px solid var(--border2, rgba(255,255,255,0.16)); border-radius: 999px; color: var(--text2, #a3abc2); font: 600 12px 'DM Sans', system-ui, sans-serif; cursor: pointer; transition: all .12s; }
      .pfc-chip:hover { color: var(--text, #eaecf4); border-color: var(--accent, #4f8ef7); }
      .pfc-chip.is-active { background: linear-gradient(135deg, var(--accent, #4f8ef7), var(--accent2, #3a7be0)); color: #fff; border-color: transparent; }
      .pfc-count { font-size: 10px; padding: 1px 7px; background: rgba(255,255,255,.12); border-radius: 999px; min-width: 18px; text-align: center; }
      .pfc-chip.is-active .pfc-count { background: rgba(255,255,255,.25); }
    `;
    document.head.appendChild(style);
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  const ProvaFilterChips = {
    render({ container, chips, onChange, activeValue }) {
      _injectStyle();
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el || !Array.isArray(chips)) return;
      const active = activeValue !== undefined ? activeValue : (chips[0] && chips[0].value);
      el.classList.add('pfc-wrap');
      el.innerHTML = chips.map(c => `<button type="button" class="pfc-chip ${c.value === active ? 'is-active' : ''}" data-value="${_esc(c.value)}">
        ${_esc(c.label)}${typeof c.count === 'number' ? `<span class="pfc-count">${c.count}</span>` : ''}
      </button>`).join('');
      el.querySelectorAll('.pfc-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.pfc-chip').forEach(b => b.classList.toggle('is-active', b === btn));
          if (typeof onChange === 'function') onChange(btn.dataset.value);
        });
      });
    },
    updateCounts(container, counts) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el || !counts) return;
      el.querySelectorAll('.pfc-chip').forEach(btn => {
        const v = btn.dataset.value;
        const c = counts[v];
        let badge = btn.querySelector('.pfc-count');
        if (typeof c === 'number') {
          if (!badge) { badge = document.createElement('span'); badge.className = 'pfc-count'; btn.appendChild(badge); }
          badge.textContent = c;
        }
      });
    }
  };

  global.ProvaFilterChips = ProvaFilterChips;
})(typeof window !== 'undefined' ? window : globalThis);
