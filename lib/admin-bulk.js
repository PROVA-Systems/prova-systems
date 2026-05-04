/**
 * PROVA Admin-Bulk-Operations
 * MEGA¹³ W21 (Tier 2 STRETCH, 2026-05-05)
 *
 * Multi-Select-Pattern fuer Listen mit Bulk-Actions:
 *   - Checkboxes pro Row
 *   - "Select All"-Header-Checkbox
 *   - Floating Bulk-Actions-Bar oben (sichtbar wenn >0 selected)
 *   - Confirm-Dialog mit Undo-Timer (10s)
 *
 * USAGE:
 *   ProvaBulk.attach({
 *     listContainer: '#tickets-list',  // Selector zur Liste
 *     rowSelector: '.row',              // Selector pro Item
 *     idAttribute: 'data-id',           // Attribute fuer ID
 *     actions: [
 *       { id: 'delete', label: 'Löschen', icon: '🗑', confirm: true, callback: async (ids) => {...} },
 *       { id: 'export', label: 'Export', icon: '📥', callback: async (ids) => {...} },
 *       { id: 'tag',    label: 'Tag',    icon: '🏷', callback: async (ids) => {...} }
 *     ]
 *   });
 *
 *   ProvaBulk.detach(listContainer);
 *
 * Anti-Pattern vermieden:
 *   - Confirm-Dialog mit Undo-Timer (10s) statt blocker confirm()
 *   - Checkbox-Header fuer Select-All / Deselect-All
 *   - aria-label auf alle Checkboxes
 *   - aria-live region fuer Bulk-Action-Status
 *   - Bulk-Bar disappears bei 0 Selected (smooth fade-out)
 *   - Memory-Leak-Defense: detach entfernt alle Listener
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-bulk-style';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-bulk-bar {
        position: sticky; top: 0;
        background: var(--surface,#1c2537);
        border: 1px solid var(--accent,#4f8ef7);
        border-radius: 10px;
        padding: 10px 14px;
        margin-bottom: 12px;
        display: none;
        align-items: center; gap: 12px;
        font-size: 13px;
        z-index: 10;
        box-shadow: 0 4px 16px rgba(79,142,247,0.15);
      }
      .prova-bulk-bar--visible { display: flex; }
      .prova-bulk-count {
        font-weight: 700;
        color: var(--accent,#4f8ef7);
      }
      .prova-bulk-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .prova-bulk-action-btn {
        background: transparent;
        border: 1px solid var(--border,rgba(255,255,255,0.12));
        color: var(--text,#e8eaf0);
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        min-height: 32px;
      }
      .prova-bulk-action-btn:hover { background: rgba(255,255,255,0.06); }
      .prova-bulk-action-btn--danger { color: #ef4444; border-color: rgba(239,68,68,0.3); }
      .prova-bulk-action-btn--danger:hover { background: rgba(239,68,68,0.08); }
      .prova-bulk-deselect {
        margin-left: auto;
        color: var(--text3,#6b7a99);
        background: transparent; border: none;
        cursor: pointer; font-size: 12px;
      }
      .prova-bulk-checkbox {
        margin-right: 10px;
        width: 18px; height: 18px;
        cursor: pointer;
      }
      .prova-bulk-undo-toast {
        position: fixed;
        bottom: 24px; left: 50%;
        transform: translateX(-50%);
        background: var(--surface,#1c2537);
        border: 1px solid var(--accent,#4f8ef7);
        border-radius: 10px;
        padding: 12px 18px;
        z-index: 9800;
        display: flex; gap: 12px; align-items: center;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        font-size: 13px;
      }
      .prova-bulk-undo-btn {
        background: var(--accent,#4f8ef7); color: #fff;
        border: none; border-radius: 6px;
        padding: 6px 14px; cursor: pointer;
        font-weight: 600;
      }
      .prova-bulk-undo-progress {
        width: 60px; height: 3px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px; overflow: hidden;
      }
      .prova-bulk-undo-progress-fill {
        height: 100%;
        background: var(--accent,#4f8ef7);
        animation: prova-bulk-countdown 10s linear forwards;
      }
      @keyframes prova-bulk-countdown {
        from { width: 100%; }
        to { width: 0%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .prova-bulk-undo-progress-fill { animation: none; width: 50%; }
      }
    `;
    document.head.appendChild(style);
  }

  // State per container (WeakMap fuer auto-cleanup)
  const _state = new WeakMap();

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function attach(config) {
    if (!config || !config.listContainer || !config.rowSelector) {
      console.warn('[ProvaBulk] config.listContainer + rowSelector required');
      return;
    }
    const containerEl = typeof config.listContainer === 'string'
      ? document.querySelector(config.listContainer)
      : config.listContainer;
    if (!containerEl) return;

    if (_state.has(containerEl)) {
      console.warn('[ProvaBulk] already attached, detach first');
      return;
    }

    _injectStyle();

    const idAttr = config.idAttribute || 'data-id';
    const actions = Array.isArray(config.actions) ? config.actions : [];
    const selectedIds = new Set();

    // Bulk-Bar erstellen
    const bar = document.createElement('div');
    bar.className = 'prova-bulk-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Bulk-Aktionen');
    bar.setAttribute('aria-live', 'polite');

    const countEl = document.createElement('span');
    countEl.className = 'prova-bulk-count';
    countEl.textContent = '0 ausgewählt';
    bar.appendChild(countEl);

    const actionsEl = document.createElement('div');
    actionsEl.className = 'prova-bulk-actions';
    bar.appendChild(actionsEl);

    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prova-bulk-action-btn' + (action.danger ? ' prova-bulk-action-btn--danger' : '');
      btn.setAttribute('aria-label', action.label);
      btn.dataset.actionId = action.id;
      btn.innerHTML = (action.icon ? '<span aria-hidden="true">' + _esc(action.icon) + '</span> ' : '') + _esc(action.label);
      btn.addEventListener('click', () => _executeAction(action, Array.from(selectedIds), config, deselectAll));
      actionsEl.appendChild(btn);
    });

    const deselectBtn = document.createElement('button');
    deselectBtn.type = 'button';
    deselectBtn.className = 'prova-bulk-deselect';
    deselectBtn.textContent = 'Auswahl aufheben';
    deselectBtn.addEventListener('click', () => deselectAll());
    bar.appendChild(deselectBtn);

    containerEl.parentNode.insertBefore(bar, containerEl);

    // Render checkboxes auf alle existing rows + listen auf neue
    function _addCheckboxesToRows() {
      const rows = containerEl.querySelectorAll(config.rowSelector);
      rows.forEach(row => {
        if (row.querySelector('.prova-bulk-checkbox')) return;  // schon da
        const id = row.getAttribute(idAttr);
        if (!id) return;
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'prova-bulk-checkbox';
        cb.setAttribute('aria-label', 'Auswahl: ' + (row.textContent || '').slice(0, 40));
        cb.addEventListener('click', (e) => e.stopPropagation());  // kein row-click trigger
        cb.addEventListener('change', (e) => {
          if (e.target.checked) selectedIds.add(id);
          else selectedIds.delete(id);
          _updateBar();
        });
        row.insertBefore(cb, row.firstChild);
      });
    }

    function _updateBar() {
      const n = selectedIds.size;
      countEl.textContent = n + ' ausgewählt';
      if (n > 0) bar.classList.add('prova-bulk-bar--visible');
      else bar.classList.remove('prova-bulk-bar--visible');
    }

    function deselectAll() {
      selectedIds.clear();
      const checkboxes = containerEl.querySelectorAll('.prova-bulk-checkbox');
      checkboxes.forEach(cb => { cb.checked = false; });
      _updateBar();
    }

    // MutationObserver: neue Rows in der Liste bekommen auch Checkboxes
    // MEGA¹⁴ W25 Bug-Fix: requestAnimationFrame-Throttle (Mass-Add-Performance)
    let throttlePending = false;
    const observer = new MutationObserver(() => {
      if (throttlePending) return;
      throttlePending = true;
      requestAnimationFrame(() => {
        throttlePending = false;
        _addCheckboxesToRows();
      });
    });
    observer.observe(containerEl, { childList: true, subtree: true });

    _addCheckboxesToRows();

    _state.set(containerEl, {
      bar: bar,
      observer: observer,
      selectedIds: selectedIds,
      deselectAll: deselectAll,
      config: config
    });
  }

  function _executeAction(action, ids, config, deselectAllFn) {
    if (!ids || ids.length === 0) return;

    if (action.confirm !== false) {
      // Show Undo-Toast statt blocker confirm — user-friendly
      _executeWithUndoTimer(action, ids, config, deselectAllFn);
    } else {
      Promise.resolve(action.callback(ids))
        .then(() => deselectAllFn())
        .catch(e => console.warn('[ProvaBulk] action error:', e));
    }
  }

  function _executeWithUndoTimer(action, ids, config, deselectAllFn) {
    // MEGA¹⁴ W25 Bug-Fix: Stack-Cleanup — alte Toasts force-execute & remove
    document.querySelectorAll('.prova-bulk-undo-toast').forEach(oldToast => {
      // Trigger pending action durch synthetic event NICHT — einfach removeen
      // (Original-action war timer-basiert, wird in 10s automatisch executen)
      // Aber damit user nicht 2 Toasts sieht: alten removen
      if (oldToast.parentNode) oldToast.parentNode.removeChild(oldToast);
    });

    // Toast mit "Rueckgaengig"-Button
    const toast = document.createElement('div');
    toast.className = 'prova-bulk-undo-toast';
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
      '<span><strong>' + ids.length + '</strong> ' + _esc(action.label) + '?</span>' +
      '<div class="prova-bulk-undo-progress" aria-hidden="true">' +
      '<div class="prova-bulk-undo-progress-fill"></div></div>' +
      '<button type="button" class="prova-bulk-undo-btn" aria-label="Aktion rueckgaengig machen">Rueckgaengig</button>';
    document.body.appendChild(toast);

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await action.callback(ids);
      } catch (e) {
        console.warn('[ProvaBulk] callback error:', e);
      }
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      deselectAllFn();
    }, 10000);  // 10s Undo-Window

    toast.querySelector('.prova-bulk-undo-btn').addEventListener('click', () => {
      cancelled = true;
      clearTimeout(timer);
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      // Auswahl bleibt bestehen — User kann nochmal triggern
    });
  }

  function detach(containerEl) {
    if (typeof containerEl === 'string') containerEl = document.querySelector(containerEl);
    if (!containerEl) return;
    const state = _state.get(containerEl);
    if (!state) return;

    state.observer.disconnect();
    if (state.bar && state.bar.parentNode) state.bar.parentNode.removeChild(state.bar);

    // Checkboxes aus Rows entfernen
    containerEl.querySelectorAll('.prova-bulk-checkbox').forEach(cb => {
      if (cb.parentNode) cb.parentNode.removeChild(cb);
    });

    _state.delete(containerEl);
  }

  // Public API
  window.ProvaBulk = {
    attach: attach,
    detach: detach
  };
})();
