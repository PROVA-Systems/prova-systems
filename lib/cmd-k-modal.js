/**
 * PROVA Cmd-K Modal (MEGA⁴¹ P6)
 *
 * Globaler Cmd+K / Ctrl+K Modal-Picker mit Drilldown-Live-Filter.
 *
 * Features:
 *   - Cmd+K (Mac) / Ctrl+K (Win/Linux) Keybinding
 *   - Live-Filter (mit jedem Keystroke wird Liste enger)
 *   - Cross-Type-Suche (alle 8 Bereiche aus /global-search)
 *   - Recent-Searches (max 10 in localStorage)
 *   - Match-Highlighting via <mark>
 *   - ESC schließt, Enter springt zum ersten Treffer
 *   - Pfeil-Up/Down Navigation
 *
 * Public API (window.ProvaCmdK):
 *   init() — registriert Cmd+K Listener (idempotent)
 *   open() — öffnet Modal manuell
 *   close() — schließt Modal
 *   addRecentSearch(query) / getRecentSearches()
 *
 * Auto-init beim Laden — ruft sich selbst nach DOMContentLoaded.
 */
'use strict';

(function () {

  const RECENT_KEY = 'prova_cmdk_recent';
  const MAX_RECENT = 10;
  const DEBOUNCE_MS = 80;       // schnell für Live-Drilldown
  const MIN_QUERY_LEN = 1;      // ab 1 Zeichen tippen → suchen
  const STYLE_ID = 'prova-cmdk-style';

  let _isOpen = false;
  let _initialized = false;
  let _searchTimer = null;
  let _selectedIdx = 0;
  let _lastResults = [];

  function _injectStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.cmdk-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:80px 20px 20px;animation:cmdk-fade-in .12s ease-out;}\n' +
      '@keyframes cmdk-fade-in{from{opacity:0;}to{opacity:1;}}\n' +
      '.cmdk-modal{background:#1c2130;border:1px solid rgba(255,255,255,0.11);border-radius:14px;width:100%;max-width:680px;max-height:75vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.55);font-family:Inter,-apple-system,sans-serif;color:#eaecf4;}\n' +
      '.cmdk-search{width:100%;padding:18px 22px;font-size:16px;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.06);color:#eaecf4;font-family:inherit;outline:none;}\n' +
      '.cmdk-search::placeholder{color:#4d5568;}\n' +
      '.cmdk-results{flex:1;overflow-y:auto;padding:8px 0;}\n' +
      '.cmdk-section{padding:6px 22px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#4d5568;}\n' +
      '.cmdk-item{padding:10px 22px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13.5px;border-left:3px solid transparent;transition:background .1s;}\n' +
      '.cmdk-item:hover,.cmdk-item.selected{background:rgba(79,142,247,0.08);border-left-color:#4f8ef7;}\n' +
      '.cmdk-item-icon{font-size:14px;width:20px;text-align:center;flex-shrink:0;}\n' +
      '.cmdk-item-content{flex:1;min-width:0;}\n' +
      '.cmdk-item-title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n' +
      '.cmdk-item-sub{font-size:11px;color:#94a3b8;margin-top:1px;}\n' +
      '.cmdk-item-type{font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;background:rgba(148,163,184,0.12);flex-shrink:0;}\n' +
      '.cmdk-empty{padding:30px 22px;text-align:center;color:#4d5568;font-style:italic;font-size:13px;}\n' +
      '.cmdk-footer{padding:8px 22px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#4d5568;display:flex;gap:14px;flex-wrap:wrap;}\n' +
      '.cmdk-footer kbd{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.11);border-radius:4px;padding:1px 5px;font-family:JetBrains Mono,monospace;font-size:10px;}\n' +
      '.cmdk-mark{background:rgba(255,235,59,0.3);color:#eaecf4;padding:0 2px;border-radius:2px;}\n' +
      '@media (prefers-reduced-motion: reduce){.cmdk-overlay{animation:none;}}\n';
    document.head.appendChild(s);
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _highlight(text, query) {
    const escText = _esc(text);
    if (!query || query.length < MIN_QUERY_LEN) return escText;
    try {
      const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return escText.replace(re, '<span class="cmdk-mark">$1</span>');
    } catch (_) { return escText; }
  }

  function getRecentSearches() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  function addRecentSearch(query) {
    if (typeof localStorage === 'undefined' || !query || query.length < MIN_QUERY_LEN) return;
    try {
      const cur = getRecentSearches().filter(q => q !== query);
      cur.unshift(query);
      localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
    } catch (_) {}
  }

  function _typeIcon(type) {
    const map = {
      akte: '📁', auftrag: '📁', kontakt: '👤', dokument: '📄',
      termin: '📅', eintrag: '📝', textbaustein: '✂️', template: '📋', norm: '📚'
    };
    return map[type] || '🔍';
  }

  function _itemTitle(r) {
    return r.title || r.name || r.titel || r.id || '–';
  }
  function _itemSub(r) {
    return r.subtitle || r.beschreibung || r.bereich || r.kategorie || '';
  }

  function _renderResults(modal, results, query) {
    const resultsEl = modal.querySelector('.cmdk-results');
    _lastResults = results;
    _selectedIdx = 0;

    if (results.length === 0) {
      const recent = getRecentSearches();
      if (recent.length > 0 && (!query || query.length < MIN_QUERY_LEN)) {
        let html = '<div class="cmdk-section">Zuletzt gesucht</div>';
        recent.forEach((q, i) => {
          html += '<div class="cmdk-item' + (i === 0 ? ' selected' : '') + '" data-action="recent" data-query="' + _esc(q) + '">' +
            '<span class="cmdk-item-icon">⏱</span>' +
            '<div class="cmdk-item-content"><div class="cmdk-item-title">' + _esc(q) + '</div></div>' +
            '</div>';
        });
        resultsEl.innerHTML = html;
        _wireItems(modal);
        return;
      }
      resultsEl.innerHTML = '<div class="cmdk-empty">' + (query.length < MIN_QUERY_LEN ? 'Tippe um zu suchen…' : 'Keine Treffer für „' + _esc(query) + '"') + '</div>';
      return;
    }

    // Group nach Type
    const grouped = {};
    results.forEach(r => {
      const t = r.type || 'sonstiges';
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(r);
    });

    const SECTION_ORDER = ['akte', 'auftrag', 'kontakt', 'dokument', 'termin', 'eintrag', 'textbaustein', 'template', 'norm', 'sonstiges'];
    let html = '';
    let globalIdx = 0;
    SECTION_ORDER.forEach(type => {
      if (!grouped[type]) return;
      html += '<div class="cmdk-section">' + type + 's (' + grouped[type].length + ')</div>';
      grouped[type].forEach(r => {
        const isSelected = globalIdx === 0;
        html += '<div class="cmdk-item' + (isSelected ? ' selected' : '') + '" data-idx="' + globalIdx + '" data-id="' + _esc(r.id || '') + '" data-url="' + _esc(r.url || '') + '">' +
          '<span class="cmdk-item-icon">' + _typeIcon(type) + '</span>' +
          '<div class="cmdk-item-content">' +
            '<div class="cmdk-item-title">' + _highlight(_itemTitle(r), query) + '</div>' +
            (_itemSub(r) ? '<div class="cmdk-item-sub">' + _highlight(_itemSub(r), query) + '</div>' : '') +
          '</div>' +
          '<span class="cmdk-item-type">' + _esc(type) + '</span>' +
          '</div>';
        globalIdx++;
      });
    });
    resultsEl.innerHTML = html;
    _wireItems(modal);
  }

  function _wireItems(modal) {
    const items = modal.querySelectorAll('.cmdk-item');
    items.forEach(item => {
      item.addEventListener('click', () => _activateItem(modal, item));
      item.addEventListener('mouseenter', () => {
        items.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        _selectedIdx = parseInt(item.dataset.idx, 10) || 0;
      });
    });
  }

  function _activateItem(modal, item) {
    const action = item.dataset.action;
    if (action === 'recent') {
      const search = modal.querySelector('.cmdk-search');
      search.value = item.dataset.query;
      search.dispatchEvent(new Event('input'));
      return;
    }
    const url = item.dataset.url;
    const id = item.dataset.id;
    if (url) {
      addRecentSearch(modal.querySelector('.cmdk-search').value.trim());
      window.location.href = url;
    } else if (id) {
      // Fallback: copy ID to clipboard
      try { navigator.clipboard.writeText(id); } catch (_) {}
      close();
    }
  }

  async function _doSearch(modal, query) {
    if (!query || query.length < MIN_QUERY_LEN) {
      _renderResults(modal, [], query);
      return;
    }
    try {
      const res = await fetch('/.netlify/functions/global-search?q=' + encodeURIComponent(query) + '&limit=30');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      _renderResults(modal, data.results || data.entries || [], query);
    } catch (e) {
      const resultsEl = modal.querySelector('.cmdk-results');
      resultsEl.innerHTML = '<div class="cmdk-empty" style="color:#ef4444;">Fehler: ' + _esc(e.message) + '</div>';
    }
  }

  function open() {
    if (_isOpen) return;
    _isOpen = true;
    _injectStyle();

    const overlay = document.createElement('div');
    overlay.className = 'cmdk-overlay';
    overlay.id = 'prova-cmdk-overlay';

    const modal = document.createElement('div');
    modal.className = 'cmdk-modal';
    modal.innerHTML =
      '<input type="search" class="cmdk-search" placeholder="Suche in Aufträgen, Kontakten, Normen…" autocomplete="off" autocorrect="off" spellcheck="false">' +
      '<div class="cmdk-results"></div>' +
      '<div class="cmdk-footer">' +
        '<span><kbd>↑</kbd><kbd>↓</kbd> navigieren</span>' +
        '<span><kbd>↵</kbd> öffnen</span>' +
        '<span><kbd>esc</kbd> schließen</span>' +
      '</div>';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const search = modal.querySelector('.cmdk-search');
    setTimeout(() => search.focus(), 30);

    // Initial-Render: Recent-Searches
    _renderResults(modal, [], '');

    search.addEventListener('input', () => {
      if (_searchTimer) clearTimeout(_searchTimer);
      const q = search.value.trim();
      _searchTimer = setTimeout(() => _doSearch(modal, q), DEBOUNCE_MS);
    });

    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        _moveSelection(modal, 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _moveSelection(modal, -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = modal.querySelector('.cmdk-item.selected');
        if (sel) _activateItem(modal, sel);
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  function _moveSelection(modal, dir) {
    const items = modal.querySelectorAll('.cmdk-item');
    if (items.length === 0) return;
    items.forEach(i => i.classList.remove('selected'));
    _selectedIdx = (_selectedIdx + dir + items.length) % items.length;
    const next = items[_selectedIdx];
    next.classList.add('selected');
    next.scrollIntoView({ block: 'nearest' });
  }

  function close() {
    if (!_isOpen) return;
    _isOpen = false;
    const overlay = document.getElementById('prova-cmdk-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function init() {
    if (_initialized) return;
    _initialized = true;
    if (typeof document === 'undefined') return;
    document.addEventListener('keydown', (e) => {
      // Cmd+K (Mac) oder Ctrl+K (Win/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (_isOpen) close(); else open();
      }
    });
  }

  // Auto-init nach DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // Public API
  const api = {
    open: open,
    close: close,
    init: init,
    addRecentSearch: addRecentSearch,
    getRecentSearches: getRecentSearches,
    DEBOUNCE_MS: DEBOUNCE_MS,
    MAX_RECENT: MAX_RECENT,
    MIN_QUERY_LEN: MIN_QUERY_LEN,
    _highlight: _highlight,
    _typeIcon: _typeIcon
  };

  if (typeof window !== 'undefined') {
    window.ProvaCmdK = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
