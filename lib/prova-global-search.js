/**
 * PROVA Global Search (MEGA⁶⁸-FINAL-2 Item C.1)
 *
 * Cross-Entity-Search via existing global-search Edge Function.
 * Trigger: Cmd+P (Linear-Pattern, "find anything") oder Cmd+K → Search-Modus.
 * Result-Klick → Navigation zur Entität.
 *
 * API:
 *   ProvaGlobalSearch.open()
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-global-search-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-global-search-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-global-search.css';
    document.head.appendChild(link);
  }

  async function _getSb() {
    if (_getSb._c) return _getSb._c;
    const url = window.PROVA_CONFIG?.SUPABASE_URL;
    const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
    const mod = await import('https://esm.sh/@supabase/supabase-js@2.105.0');
    _getSb._c = mod.createClient(url, key, { auth: { persistSession: true } });
    return _getSb._c;
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  const TYPE_ICONS = {
    auftrag: '📂', kontakt: '👥', termin: '📅', frist: '⏰',
    rechnung: '💶', dokument: '📄', anhang: '📎', fragment: '🎙',
    notiz: '📝', baustein: '📝', norm: '📐'
  };

  const TYPE_PATHS = {
    auftrag: (r) => `/akte?az=${encodeURIComponent(r.az || r.id)}`,
    kontakt: (r) => `/kontakt-detail.html?id=${r.id}`,
    termin: (r) => `/termine?id=${r.id}`,
    frist: (r) => `/fristen.html?id=${r.id}`,
    rechnung: (r) => `/rechnungen?id=${r.id}`,
    dokument: (r) => `/fachurteil.html?doc=${r.id}`,
    anhang: (r) => `/akte?anhang=${r.id}`,
    fragment: (r) => `/fachurteil.html?fragment=${r.id}`,
    notiz: (r) => `/akte?notiz=${r.id}`
  };

  const ProvaGlobalSearch = {
    async open() {
      if (this._active) return;
      _injectStyle();

      const overlay = document.createElement('div');
      overlay.className = 'prova-gsearch-overlay';
      overlay.innerHTML = `
        <div class="prova-gsearch-modal">
          <input type="text" class="gs-input" placeholder="Suche in Aufträgen, Kontakten, Terminen, Fragmenten…" autofocus>
          <div class="gs-results"><div class="gs-empty">Tippe um zu suchen…</div></div>
          <div class="gs-footer"><kbd>↑↓</kbd> Navigieren · <kbd>↩</kbd> Öffnen · <kbd>esc</kbd> Schließen · <kbd>⌘P</kbd> öffnet Suche</div>
        </div>
      `;
      document.body.appendChild(overlay);
      this._active = overlay;

      const input = overlay.querySelector('.gs-input');
      const list = overlay.querySelector('.gs-results');
      let items = [];
      let selectedIdx = 0;
      let timer = null;

      const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this._active = null;
        document.removeEventListener('keydown', onKey, true);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); selectedIdx = (selectedIdx + 1) % items.length; render(); }
        else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); selectedIdx = (selectedIdx - 1 + items.length) % items.length; render(); }
        else if (e.key === 'Enter' && items[selectedIdx]) { e.preventDefault(); navigate(items[selectedIdx]); }
      };
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      function navigate(item) {
        const path = TYPE_PATHS[item.type]?.(item);
        if (path) window.location.href = path;
        close();
      }

      function render() {
        if (items.length === 0) {
          list.innerHTML = '<div class="gs-empty">Keine Treffer</div>';
          return;
        }
        // Group by type
        const grouped = items.reduce((acc, item, idx) => {
          (acc[item.type] = acc[item.type] || []).push({ item, idx });
          return acc;
        }, {});
        let html = '';
        for (const [type, group] of Object.entries(grouped)) {
          html += `<div class="gs-group">${_esc(type)}</div>`;
          for (const { item, idx } of group) {
            const icon = TYPE_ICONS[type] || '·';
            html += `<button type="button" class="gs-item ${idx === selectedIdx ? 'is-selected' : ''}" data-idx="${idx}">
              <span class="gs-icon">${icon}</span>
              <span class="gs-body">
                <span class="gs-title">${_esc(item.title || item.label || item.id)}</span>
                ${item.subtitle ? `<span class="gs-sub">${_esc(item.subtitle)}</span>` : ''}
              </span>
            </button>`;
          }
        }
        list.innerHTML = html;
        list.querySelectorAll('[data-idx]').forEach(b => {
          b.addEventListener('mousedown', (e) => e.preventDefault());
          b.addEventListener('click', () => navigate(items[parseInt(b.dataset.idx, 10)]));
        });
      }

      async function search(query) {
        if (!query || query.length < 2) {
          items = [];
          list.innerHTML = '<div class="gs-empty">Mindestens 2 Zeichen…</div>';
          return;
        }
        try {
          const sb = await _getSb();
          const { data: { session } } = await sb.auth.getSession();
          const tok = session?.access_token;
          if (!tok) { list.innerHTML = '<div class="gs-empty gs-err">Nicht angemeldet</div>'; return; }
          const url = window.PROVA_CONFIG.SUPABASE_URL;
          const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
          const resp = await fetch(`${url}/functions/v1/global-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
            body: JSON.stringify({ query, limit: 30 })
          });
          const json = await resp.json();
          items = json.results || json.items || [];
          selectedIdx = 0;
          render();
        } catch (e) {
          list.innerHTML = `<div class="gs-empty gs-err">Fehler: ${_esc(e.message)}</div>`;
        }
      }

      input.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => search(e.target.value), 200);
      });
    }
  };

  global.ProvaGlobalSearch = ProvaGlobalSearch;

  // Cmd+P Shortcut registrieren (Linear-Pattern für Find Anywhere)
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      const isMod = window.ProvaPlatform ? window.ProvaPlatform.isModPressed(e) : (e.metaKey || e.ctrlKey);
      if (isMod && (e.key === 'p' || e.key === 'P') && !e.shiftKey && !e.altKey) {
        if (document.body?.dataset.provaEditorMega65 === '1') {
          e.preventDefault();
          ProvaGlobalSearch.open();
        }
      }
    }, true);
  }
})(typeof window !== 'undefined' ? window : globalThis);
