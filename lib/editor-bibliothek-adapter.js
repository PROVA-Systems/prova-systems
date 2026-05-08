/**
 * PROVA Editor-Bibliothek-Adapter (MEGA⁴⁰ P8)
 *
 * Bridge zwischen lib/bibliothek-pattern.js (M³⁹ P5, 7-Page-Universal-Toolbar)
 * und TipTap-Editor.
 *
 * Public API (window.ProvaEditorBibliothek):
 *   openModal(editor, opts?) — öffnet 6-Kategorien-Modal
 *   insertAtCursor(editor, text, meta?) — TipTap-aware Insert mit Auto-Footnote
 *   getRecentItems(kategorie) — letzte 5 Inserts pro Kategorie
 *   addRecentItem(kategorie, item)
 *
 * Auto-Footnote-Trigger: bei Insert von Texten die DIN/WTA/VOB/JVEG/ZPO/§
 * enthalten, wird automatisch eine footnote-Mark gesetzt.
 */
'use strict';

(function () {

  const KATEGORIEN = [
    { key: 'normen', label: '📚 Normen', endpoint: '/.netlify/functions/global-search?type=normen&q=' },
    { key: 'textbausteine', label: '📝 Bausteine', endpoint: '/.netlify/functions/global-search?type=textbausteine&q=' },
    { key: 'floskeln', label: '💬 Floskeln', endpoint: '/.netlify/functions/global-search?type=textbausteine&q=' },
    { key: 'paragraphen', label: '⚖️ §-Verweise', endpoint: '/.netlify/functions/global-search?type=normen&q=' },
    { key: 'kontakte', label: '👤 Kontakte', endpoint: '/.netlify/functions/global-search?type=kontakte&q=' },
    { key: 'positionen', label: '💶 Positionen', endpoint: '/.netlify/functions/global-search?type=positionen&q=' }
  ];

  const FOOTNOTE_PATTERN = /(DIN\s*\d+|WTA\s*\d|VOB|JVEG\s*§|ZPO\s*§|§\s*\d+)/i;
  const RECENT_KEY = 'prova_editor_bibliothek_recent_';
  const MAX_RECENT = 5;

  /**
   * @param {Object} editor — ProvaEditor mit ._instance (TipTap)
   * @param {string} text — einzufügender Text
   * @param {Object} [meta] — { kategorie?: string, source?: string, fullName?: string }
   */
  function insertAtCursor(editor, text, meta) {
    if (!editor || !editor._instance || !text) return false;
    meta = meta || {};
    const tt = editor._instance;

    const isFootnoteable = FOOTNOTE_PATTERN.test(text);
    if (isFootnoteable && tt.commands && tt.commands.setFootnote) {
      // Insert text + footnote-Mark
      tt.chain().focus()
        .insertContent({ type: 'text', text: text + ' ', marks: [{ type: 'footnote', attrs: { number: 0, text: meta.fullName || text } }] })
        .run();
    } else {
      tt.chain().focus().insertContent(text + ' ').run();
    }

    if (meta.kategorie) addRecentItem(meta.kategorie, { text: text, ts: Date.now(), full: meta.fullName });
    return true;
  }

  function getRecentItems(kategorie) {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RECENT_KEY + kategorie);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  function addRecentItem(kategorie, item) {
    if (typeof localStorage === 'undefined') return;
    try {
      const cur = getRecentItems(kategorie);
      // dedup by text
      const filtered = cur.filter(i => i.text !== item.text);
      filtered.unshift(item);
      const trimmed = filtered.slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY + kategorie, JSON.stringify(trimmed));
    } catch (_) {}
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Öffnet 6-Kategorien-Modal über dem Editor.
   *
   * @param {Object} editor
   * @param {Object} [opts]
   */
  function openModal(editor, opts) {
    if (!editor || !editor._instance) return;
    if (typeof document === 'undefined') return;

    const overlay = document.createElement('div');
    overlay.className = 'peb-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1c2130;color:#eaecf4;border-radius:12px;max-width:680px;width:100%;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;';

    const head = document.createElement('div');
    head.style.cssText = 'padding:18px 22px 14px;border-bottom:1px solid rgba(255,255,255,0.06);';
    head.innerHTML = '<h2 style="font-size:17px;font-weight:700;margin:0 0 4px;">📚 Bibliothek</h2>' +
                     '<div style="font-size:12px;color:#94a3b8;">6 Kategorien · Auto-Fußnote bei Normen + §-Verweisen · Cursor-Position erhalten</div>';
    modal.appendChild(head);

    // Kategorie-Tabs
    const tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;gap:4px;padding:10px 16px;background:#161a22;flex-wrap:wrap;border-bottom:1px solid rgba(255,255,255,0.06);';
    let activeKat = KATEGORIEN[0].key;
    const tabBtns = {};
    KATEGORIEN.forEach((k, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.kat = k.key;
      b.textContent = k.label;
      b.style.cssText = 'padding:6px 10px;font-size:11.5px;font-weight:600;background:transparent;border:1px solid rgba(255,255,255,0.11);border-radius:5px;color:#eaecf4;cursor:pointer;font-family:inherit;';
      b.addEventListener('click', () => { selectKat(k.key); });
      tabs.appendChild(b);
      tabBtns[k.key] = b;
    });
    modal.appendChild(tabs);

    // Search
    const searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'padding:10px 16px;';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = '2-3 Buchstaben tippen…';
    search.style.cssText = 'width:100%;padding:8px 12px;font-size:13px;background:transparent;border:1px solid rgba(255,255,255,0.11);border-radius:6px;color:#eaecf4;font-family:inherit;';
    searchWrap.appendChild(search);
    modal.appendChild(searchWrap);

    // Results
    const results = document.createElement('div');
    results.style.cssText = 'flex:1;overflow-y:auto;padding:0 16px 16px;';
    modal.appendChild(results);

    // Footer: Cancel
    const foot = document.createElement('div');
    foot.style.cssText = 'padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);text-align:right;';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Schließen';
    closeBtn.style.cssText = 'padding:8px 18px;background:transparent;border:1px solid rgba(255,255,255,0.11);border-radius:6px;color:#eaecf4;cursor:pointer;font-family:inherit;font-weight:600;';
    foot.appendChild(closeBtn);
    modal.appendChild(foot);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    });

    function selectKat(k) {
      activeKat = k;
      Object.keys(tabBtns).forEach(kk => {
        tabBtns[kk].style.background = (kk === k) ? '#4f8ef7' : 'transparent';
        tabBtns[kk].style.color = (kk === k) ? '#fff' : '#eaecf4';
      });
      renderResults('');
      search.focus();
    }

    let searchTimer = null;
    search.addEventListener('input', () => {
      const q = search.value.trim();
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderResults(q), 250);
    });

    async function renderResults(q) {
      const recent = getRecentItems(activeKat);
      let html = '';
      if (q.length < 2 && recent.length > 0) {
        html += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#4d5568;margin:8px 0 6px;">Zuletzt verwendet</div>';
        recent.forEach(r => {
          html += '<button type="button" class="peb-item" data-text="' + _esc(r.text) + '" style="display:block;width:100%;text-align:left;padding:8px 10px;font-size:12.5px;background:#161a22;border:1px solid rgba(255,255,255,0.06);border-radius:6px;color:#eaecf4;cursor:pointer;margin-bottom:4px;font-family:inherit;">' + _esc(r.text) + '</button>';
        });
      }
      if (q.length < 2) {
        html += '<div style="font-size:11.5px;color:#4d5568;font-style:italic;margin-top:14px;text-align:center;">Tippe 2+ Buchstaben für Suche.</div>';
        results.innerHTML = html;
        wireItems();
        return;
      }
      // Server-Search via existing global-search Lambda
      try {
        const kat = KATEGORIEN.find(k => k.key === activeKat);
        const res = await fetch(kat.endpoint + encodeURIComponent(q));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const items = (data.results || data.items || []).slice(0, 30);
        if (items.length === 0) {
          html += '<div style="font-size:11.5px;color:#4d5568;font-style:italic;margin:14px 0;text-align:center;">Keine Treffer.</div>';
        } else {
          items.forEach(it => {
            const text = it.label || it.titel || it.name || it.text || JSON.stringify(it).slice(0, 50);
            html += '<button type="button" class="peb-item" data-text="' + _esc(text) + '" style="display:block;width:100%;text-align:left;padding:8px 10px;font-size:12.5px;background:#161a22;border:1px solid rgba(255,255,255,0.06);border-radius:6px;color:#eaecf4;cursor:pointer;margin-bottom:4px;font-family:inherit;">' + _esc(text) + '</button>';
          });
        }
        results.innerHTML = html;
        wireItems();
      } catch (e) {
        results.innerHTML = '<div style="color:#ef4444;font-size:12px;padding:14px;text-align:center;">Suche fehlgeschlagen: ' + _esc(e.message) + '</div>';
      }
    }

    function wireItems() {
      results.querySelectorAll('.peb-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.dataset.text;
          insertAtCursor(editor, text, { kategorie: activeKat, fullName: text });
          close();
        });
        btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#4f8ef7'; });
        btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'rgba(255,255,255,0.06)'; });
      });
    }

    selectKat(activeKat);
  }

  // Public API
  const api = {
    openModal: openModal,
    insertAtCursor: insertAtCursor,
    getRecentItems: getRecentItems,
    addRecentItem: addRecentItem,
    KATEGORIEN: KATEGORIEN,
    FOOTNOTE_PATTERN: FOOTNOTE_PATTERN,
    MAX_RECENT: MAX_RECENT,
    _esc: _esc
  };

  if (typeof window !== 'undefined') {
    window.ProvaEditorBibliothek = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
