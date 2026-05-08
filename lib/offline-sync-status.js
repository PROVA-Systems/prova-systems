/**
 * PROVA Offline-Sync-Status (MEGA⁴¹ P10)
 *
 * Visual Sync-Icon für Top-Bar mit Status-Wechsel:
 *   - online + sync_idle: ✓ grün
 *   - online + syncing: ↻ blau (animiert)
 *   - offline + queue_empty: 🔌 grau
 *   - offline + queue_pending: 📥 orange (mit Count)
 *   - error: ✗ rot
 *
 * Public API (window.ProvaOfflineSyncStatus):
 *   mount(el) — rendert Status-Icon in el
 *   setState(state, count?) — manuell setzen
 *   getStatus() → {online, queueCount, state}
 *   destroy()
 *
 * Auto-Update via online/offline Events + storage-Events (cross-Tab).
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-offline-sync-status-style';
  const STATES = ['idle', 'syncing', 'offline_empty', 'offline_pending', 'error'];

  function _injectStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.poss-icon{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:99px;font-size:11px;font-weight:700;cursor:default;font-family:Inter,sans-serif;transition:background .15s ease,color .15s ease;}\n' +
      '.poss-icon--idle{background:rgba(16,185,129,0.12);color:#10b981;}\n' +
      '.poss-icon--syncing{background:rgba(79,142,247,0.16);color:#4f8ef7;}\n' +
      '.poss-icon--offline_empty{background:rgba(148,163,184,0.12);color:#94a3b8;}\n' +
      '.poss-icon--offline_pending{background:rgba(245,158,11,0.16);color:#f59e0b;}\n' +
      '.poss-icon--error{background:rgba(239,68,68,0.16);color:#ef4444;}\n' +
      '.poss-spin{display:inline-block;animation:poss-spin 1s linear infinite;}\n' +
      '@keyframes poss-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}\n' +
      '@media (prefers-reduced-motion: reduce){.poss-spin{animation:none;}}';
    document.head.appendChild(s);
  }

  function _renderIcon(state, count) {
    let icon, label;
    switch (state) {
      case 'idle':
        icon = '✓'; label = 'Synchronisiert'; break;
      case 'syncing':
        icon = '<span class="poss-spin">↻</span>'; label = 'Synchronisiere…'; break;
      case 'offline_empty':
        icon = '🔌'; label = 'Offline'; break;
      case 'offline_pending':
        icon = '📥'; label = 'Offline (' + (count || 0) + ' wartend)'; break;
      case 'error':
        icon = '✗'; label = 'Sync-Fehler'; break;
      default:
        icon = '?'; label = state;
    }
    return '<span aria-live="polite">' + icon + '</span><span>' + label + '</span>';
  }

  /**
   * Count Pending-Items in IndexedDB (best-effort).
   */
  async function _countPending() {
    if (typeof window === 'undefined' || !window.indexedDB) return 0;
    try {
      return new Promise((resolve) => {
        const req = indexedDB.open('prova_offline_v1', 1);
        req.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('queue')) { db.close(); resolve(0); return; }
          const tx = db.transaction(['queue'], 'readonly');
          const store = tx.objectStore('queue');
          const countReq = store.count();
          countReq.onsuccess = () => { db.close(); resolve(countReq.result || 0); };
          countReq.onerror = () => { db.close(); resolve(0); };
        };
        req.onerror = () => resolve(0);
      });
    } catch (_) { return 0; }
  }

  function mount(el) {
    if (typeof document === 'undefined') return null;
    if (!el) return null;
    _injectStyle();

    const span = document.createElement('span');
    span.className = 'poss-icon poss-icon--idle';
    span.setAttribute('role', 'status');
    span.setAttribute('aria-label', 'Sync-Status');
    el.appendChild(span);

    const state = { current: 'idle', count: 0, destroyed: false };

    function update(newState, count) {
      if (state.destroyed) return;
      if (STATES.indexOf(newState) < 0) return;
      state.current = newState;
      if (typeof count === 'number') state.count = count;
      span.className = 'poss-icon poss-icon--' + newState;
      span.innerHTML = _renderIcon(newState, state.count);
    }

    async function refresh() {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const count = await _countPending();
      if (!isOnline) {
        update(count > 0 ? 'offline_pending' : 'offline_empty', count);
      } else {
        update(count > 0 ? 'syncing' : 'idle', count);
      }
    }

    function _onOnline() { refresh(); }
    function _onOffline() { refresh(); }
    function _onStorage(e) {
      if (e && e.key && e.key.indexOf('prova_offline') === 0) refresh();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', _onOnline);
      window.addEventListener('offline', _onOffline);
      window.addEventListener('storage', _onStorage);
    }

    refresh();

    return {
      setState: update,
      getStatus: () => ({ online: typeof navigator !== 'undefined' ? navigator.onLine : true, queueCount: state.count, state: state.current }),
      refresh: refresh,
      destroy: () => {
        state.destroyed = true;
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', _onOnline);
          window.removeEventListener('offline', _onOffline);
          window.removeEventListener('storage', _onStorage);
        }
        if (span.parentNode) span.parentNode.removeChild(span);
      }
    };
  }

  // Public API
  const api = {
    mount: mount,
    STATES: STATES,
    _renderIcon: _renderIcon,
    _countPending: _countPending
  };

  if (typeof window !== 'undefined') {
    window.ProvaOfflineSyncStatus = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
