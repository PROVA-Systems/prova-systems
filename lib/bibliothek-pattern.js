/**
 * PROVA — bibliothek-pattern.js (MEGA³⁹ P5)
 *
 * Universal-Toolbar-Komponente für Bibliothek-Pattern auf 7 Editor-Seiten:
 *   freigabe.html, ortstermin-modus.html, briefvorlagen.html,
 *   fachurteil.html, rechnungen.html, schnelle-rechnung.html,
 *   kostenermittlung.html
 *
 * 6 Kategorien:
 *   - normen        (DIN/WTA/VOB/JVEG/ZPO — aus global-search NORMEN_SEED)
 *   - textbausteine (Supabase textbausteine-Tabelle, kategorie='baustein')
 *   - floskeln      (Supabase textbausteine, kategorie='floskel')
 *   - paragraphen   (§-Verweise — aus normen-Subset)
 *   - kontakte      (Supabase kontakte)
 *   - positionen    (Supabase positionen, falls vorhanden)
 *
 * Workflow:
 *   1. Toolbar wird in Container-Element gerendert (init)
 *   2. User klickt Kategorie-Button → Mini-Suchfeld + Auto-Complete
 *   3. 2-3 Buchstaben → Server-Search via /global-search?type=
 *   4. Vorschlag-Auswahl → insertAtCursor in Editor
 *   5. Recent-Items + Favoriten oben
 *
 * Public API (window.PROVA_BIBLIOTHEK):
 *   init(opts) — opts={ container, editor, kategorien? }
 *   insertAtCursor(editor, text)
 *   toggleFavorit(kategorie, item_id, label)
 *   getFavoriten(kategorie)
 *   _setFetcherForTests(fn)  — Test-Hook
 */
'use strict';

(function (root) {
  const DEFAULT_KATEGORIEN = ['normen', 'textbausteine', 'floskeln', 'paragraphen', 'kontakte', 'positionen'];
  const RECENT_KEY_PREFIX = 'prova_bibliothek_recent_';
  const MAX_RECENT = 10;

  const KATEGORIE_META = {
    normen:        { label: '📚 Norm',       icon: '📚', searchType: 'normen' },
    textbausteine: { label: '📝 Baustein',   icon: '📝', searchType: 'textbausteine' },
    floskeln:      { label: '💬 Floskel',    icon: '💬', searchType: 'textbausteine' },  // Filter-by-kategorie clientseitig
    paragraphen:   { label: '⚖️ §-Verweis',  icon: '⚖️', searchType: 'normen' },          // Subset
    kontakte:      { label: '👤 Kontakt',    icon: '👤', searchType: 'kontakte' },
    positionen:    { label: '💶 Position',   icon: '💶', searchType: 'positionen' }
  };

  function PROVA_BIBLIOTHEK_factory() {
    let _fetcher = null;

    function fetcher() {
      if (_fetcher) return _fetcher;
      if (typeof window !== 'undefined') return window.provaFetch || window.fetch.bind(window);
      return null;
    }

    function _setFetcherForTests(fn) { _fetcher = fn; }

    async function search(kategorie, query) {
      const meta = KATEGORIE_META[kategorie];
      if (!meta) return [];
      if (!query || query.length < 2) return [];
      const f = fetcher();
      if (!f) return [];
      try {
        const url = '/.netlify/functions/global-search?q=' + encodeURIComponent(query)
          + '&type=' + encodeURIComponent(meta.searchType) + '&limit=10';
        const resp = await f(url, { method: 'GET' });
        if (!resp.ok) return [];
        const data = await resp.json();
        let results = (data && data.results) || [];
        // Floskel + Paragraph: clientseitiger Sub-Filter
        if (kategorie === 'floskeln') {
          results = results.filter(r => (r.subtitle || '').toLowerCase().includes('floskel'));
        } else if (kategorie === 'paragraphen') {
          results = results.filter(r => /\b§|ZPO|BGB|VOB|UStG/i.test(r.title + ' ' + r.subtitle));
        }
        return results;
      } catch (e) { return []; }
    }

    function getRecent(kategorie) {
      try {
        if (typeof localStorage === 'undefined') return [];
        const raw = localStorage.getItem(RECENT_KEY_PREFIX + kategorie);
        return raw ? JSON.parse(raw) : [];
      } catch (_) { return []; }
    }

    function _addRecent(kategorie, item) {
      try {
        if (typeof localStorage === 'undefined') return;
        const list = getRecent(kategorie).filter(r => r.id !== item.id);
        list.unshift({ id: item.id, title: item.title, subtitle: item.subtitle, ts: Date.now() });
        if (list.length > MAX_RECENT) list.length = MAX_RECENT;
        localStorage.setItem(RECENT_KEY_PREFIX + kategorie, JSON.stringify(list));
      } catch (_) {}
    }

    async function getFavoriten(kategorie) {
      const f = fetcher();
      if (!f) return [];
      try {
        const url = '/.netlify/functions/user-favoriten-list?kategorie=' + encodeURIComponent(kategorie);
        const resp = await f(url, { method: 'GET' });
        if (!resp.ok) return [];
        const data = await resp.json();
        return (data && data.favoriten) || [];
      } catch (e) { return []; }
    }

    async function toggleFavorit(kategorie, item_id, item_label) {
      const f = fetcher();
      if (!f) return { ok: false };
      try {
        const resp = await f('/.netlify/functions/user-favoriten-toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kategorie, item_id, item_label })
        });
        if (!resp.ok) return { ok: false };
        return await resp.json();
      } catch (e) { return { ok: false, error: e.message }; }
    }

    function insertAtCursor(editor, text) {
      if (!editor || !text) return false;
      // Editor kann Function (custom-callback) oder Element sein
      if (typeof editor === 'function') { editor(text); return true; }
      if (typeof editor === 'string') {
        editor = (typeof document !== 'undefined') ? document.querySelector(editor) : null;
      }
      if (!editor) return false;
      const isInput = editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT';
      if (isInput) {
        const start = editor.selectionStart || 0;
        const end = editor.selectionEnd || 0;
        const before = editor.value.substring(0, start);
        const after = editor.value.substring(end);
        editor.value = before + text + after;
        editor.selectionStart = editor.selectionEnd = start + text.length;
        editor.focus();
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      // ContentEditable
      if (editor.contentEditable === 'true') {
        if (typeof document !== 'undefined' && document.execCommand) {
          editor.focus();
          document.execCommand('insertText', false, text);
          return true;
        }
      }
      return false;
    }

    function init(opts) {
      opts = opts || {};
      const container = (typeof opts.container === 'string')
        ? document.querySelector(opts.container)
        : opts.container;
      if (!container) throw new Error('init: container fehlt');
      const editor = opts.editor;
      const kategorien = Array.isArray(opts.kategorien) ? opts.kategorien : DEFAULT_KATEGORIEN;

      // Toolbar bauen
      const toolbar = document.createElement('div');
      toolbar.className = 'pb-toolbar';
      toolbar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;padding:8px;background:rgba(0,0,0,.04);border-radius:8px;margin-bottom:8px;';

      kategorien.forEach(k => {
        const meta = KATEGORIE_META[k];
        if (!meta) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pb-btn';
        btn.textContent = meta.label;
        btn.dataset.kategorie = k;
        btn.style.cssText = 'padding:6px 12px;min-height:36px;border:1px solid rgba(0,0,0,.1);border-radius:6px;background:#fff;cursor:pointer;font-family:inherit;font-size:13px;';
        btn.addEventListener('click', () => _showSearchPanel(toolbar, editor, k));
        toolbar.appendChild(btn);
      });
      container.appendChild(toolbar);
      return { toolbar };
    }

    function _showSearchPanel(toolbar, editor, kategorie) {
      // Bestehendes Panel entfernen
      const existing = toolbar.parentElement.querySelector('.pb-panel');
      if (existing) existing.remove();

      const panel = document.createElement('div');
      panel.className = 'pb-panel';
      panel.style.cssText = 'border:1px solid rgba(0,0,0,.1);background:#fff;border-radius:6px;padding:10px;margin-bottom:8px;';

      const meta = KATEGORIE_META[kategorie];
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Suche ' + meta.label + ' (mind. 2 Zeichen) …';
      input.style.cssText = 'width:100%;padding:6px 10px;border:1px solid rgba(0,0,0,.1);border-radius:4px;font-family:inherit;font-size:13px;';
      panel.appendChild(input);

      const list = document.createElement('div');
      list.className = 'pb-list';
      list.style.cssText = 'margin-top:6px;max-height:240px;overflow-y:auto;';
      panel.appendChild(list);

      // Recent + Favoriten zuerst
      const recent = getRecent(kategorie);
      if (recent.length) {
        const header = document.createElement('div');
        header.style.cssText = 'font-size:11px;font-weight:700;color:#64748b;padding:4px 0;';
        header.textContent = '🕒 Zuletzt verwendet';
        list.appendChild(header);
        recent.slice(0, 5).forEach(r => list.appendChild(_renderItem(r, editor, kategorie, panel)));
      }

      let _searchTimer = null;
      input.addEventListener('input', () => {
        clearTimeout(_searchTimer);
        const q = input.value.trim();
        if (q.length < 2) { _renderRecentOnly(list, kategorie, editor, panel); return; }
        _searchTimer = setTimeout(async () => {
          const results = await search(kategorie, q);
          list.innerHTML = '';
          if (!results.length) {
            list.innerHTML = '<div style="padding:8px;color:#94a3b8;font-size:12px;">— Keine Treffer —</div>';
            return;
          }
          results.forEach(r => list.appendChild(_renderItem(r, editor, kategorie, panel)));
        }, 200);
      });

      toolbar.parentElement.insertBefore(panel, toolbar.nextSibling);
      input.focus();
    }

    function _renderRecentOnly(list, kategorie, editor, panel) {
      list.innerHTML = '';
      const recent = getRecent(kategorie);
      if (recent.length) {
        const header = document.createElement('div');
        header.style.cssText = 'font-size:11px;font-weight:700;color:#64748b;padding:4px 0;';
        header.textContent = '🕒 Zuletzt verwendet';
        list.appendChild(header);
        recent.slice(0, 5).forEach(r => list.appendChild(_renderItem(r, editor, kategorie, panel)));
      }
    }

    function _renderItem(item, editor, kategorie, panel) {
      const row = document.createElement('div');
      row.className = 'pb-item';
      row.style.cssText = 'padding:6px 8px;cursor:pointer;border-radius:4px;font-size:13px;display:flex;justify-content:space-between;align-items:center;';
      row.addEventListener('mouseenter', () => row.style.background = 'rgba(79,142,247,.08)');
      row.addEventListener('mouseleave', () => row.style.background = '');
      const left = document.createElement('div');
      left.style.cssText = 'flex:1;min-width:0;overflow:hidden;';
      left.innerHTML = '<div style="font-weight:600;">' + (item.title || item.id || '?') + '</div>'
        + (item.subtitle ? '<div style="font-size:11px;color:#64748b;">' + item.subtitle + '</div>' : '');
      row.appendChild(left);

      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.textContent = '★';
      favBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:14px;color:#94a3b8;padding:4px 8px;';
      favBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const r = await toggleFavorit(kategorie, item.id, item.title);
        if (r && r.ok) favBtn.style.color = r.is_favorit ? '#f59e0b' : '#94a3b8';
      });
      row.appendChild(favBtn);

      row.addEventListener('click', () => {
        const text = item.title + (item.subtitle ? ' (' + item.subtitle + ')' : '');
        insertAtCursor(editor, text);
        _addRecent(kategorie, item);
        if (panel) panel.remove();
      });
      return row;
    }

    return {
      init: init,
      search: search,
      insertAtCursor: insertAtCursor,
      getRecent: getRecent,
      getFavoriten: getFavoriten,
      toggleFavorit: toggleFavorit,
      _DEFAULT_KATEGORIEN: DEFAULT_KATEGORIEN,
      _KATEGORIE_META: KATEGORIE_META,
      _setFetcherForTests: _setFetcherForTests,
      _addRecent: _addRecent
    };
  }

  const instance = PROVA_BIBLIOTHEK_factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = instance;
    module.exports._factory = PROVA_BIBLIOTHEK_factory;
  }
  if (typeof root !== 'undefined') {
    root.PROVA_BIBLIOTHEK = instance;
  }
})(typeof self !== 'undefined' ? self : this);
