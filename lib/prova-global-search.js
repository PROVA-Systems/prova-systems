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
    const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
    _getSb._c = mod.supabase || (mod.getSupabase && mod.getSupabase());
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

      // MEGA⁷⁸ C.3: Filter-Pillen für 9 Quellen + Cmd+K-Footer.
      const SOURCES_PILLS = [
        { key: null,            label: 'Alle' },
        { key: 'auftraege',     label: 'Aufträge' },
        { key: 'kontakte',      label: 'Kontakte' },
        { key: 'dokumente',     label: 'Dokumente' },
        { key: 'termine',       label: 'Termine' },
        { key: 'fristen',       label: 'Fristen' },
        { key: 'textbausteine', label: 'Textbausteine' },
        { key: 'normen',        label: 'Normen' }
      ];
      let activeFilter = null;

      const overlay = document.createElement('div');
      overlay.className = 'prova-gsearch-overlay';
      overlay.innerHTML = `
        <div class="prova-gsearch-modal">
          <input type="text" class="gs-input" placeholder="Suche in Aufträgen, Kontakten, Dokumenten, Terminen, Fristen, Normen…" autofocus>
          <div class="gs-pills">${SOURCES_PILLS.map((p,i) => `<button type="button" class="gs-pill${i===0?' is-active':''}" data-filter="${p.key||''}">${p.label}</button>`).join('')}</div>
          <div class="gs-results"><div class="gs-empty">Tippe um zu suchen…</div></div>
          <div class="gs-footer"><kbd>↑↓</kbd> Navigieren · <kbd>↩</kbd> Öffnen · <kbd>esc</kbd> Schließen · <kbd>⌘K</kbd> öffnet Suche</div>
        </div>
      `;
      document.body.appendChild(overlay);
      this._active = overlay;

      const input = overlay.querySelector('.gs-input');
      const list = overlay.querySelector('.gs-results');
      const pills = overlay.querySelectorAll('.gs-pill');
      let items = [];
      let selectedIdx = 0;
      let timer = null;

      pills.forEach(p => p.addEventListener('click', () => {
        pills.forEach(x => x.classList.remove('is-active'));
        p.classList.add('is-active');
        activeFilter = p.dataset.filter || null;
        if (input.value && input.value.length >= 2) search(input.value);
      }));

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
        // MEGA⁷⁸ C.2: RPC liefert fertige url-Spalte. Fallback auf TYPE_PATHS
        // für Legacy-Result-Shapes.
        const path = item.url || (TYPE_PATHS[item.type]?.(item));
        if (path && path !== '#') window.location.href = path;
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

      // MEGA⁸⁴/⁸⁵ Pass 2b F.2: search() ruft jetzt RPC global_search_v2 (Migration 59).
      // v2 nutzt workspace_id-Pflicht (RLS via SECURITY DEFINER) + per-source limit.
      // Fallback: MEGA78 global_search wenn v2 noch nicht appliziert.
      async function search(query) {
        if (!query || query.length < 2) {
          items = [];
          list.innerHTML = '<div class="gs-empty">Mindestens 2 Zeichen…</div>';
          return;
        }
        try {
          const sb = await _getSb();
          // Workspace-ID holen (cached in localStorage via supabase-client)
          let wsId = null;
          try {
            const mod = await import('/lib/supabase-client.js');
            wsId = await (mod.getActiveWorkspaceId ? mod.getActiveWorkspaceId() : null);
          } catch(_) {}

          let r;
          if (wsId) {
            r = await sb.rpc('global_search_v2', {
              p_workspace_id: wsId,
              p_query: query,
              p_limit: 25
            });
          }
          // Fallback auf MEGA78 v1 wenn v2 nicht appliziert
          if (!r || r.error) {
            const fallback = await sb.rpc('global_search', {
              q_text: query,
              q_limit: 5,
              q_source_filter: activeFilter
            });
            if (fallback.error) {
              list.innerHTML = `<div class="gs-empty gs-err">Fehler: ${_esc((r && r.error && r.error.message) || fallback.error.message)}</div>`;
              return;
            }
            r = fallback;
          }

          // Map RPC-Result auf items-Struktur die render() erwartet.
          // v2 liefert: source, id, title, subtitle, href, rank
          // v1 liefert: source, id, title, subtitle, url, rank
          const rows = r.data || [];
          // Client-side Source-Filter wenn activeFilter gesetzt (v2 hat keinen Server-Filter)
          const filtered = activeFilter
            ? rows.filter(row => {
                // Mapping zwischen Source-Names: v2 hat singular (auftrag/dokument/kontakt/...),
                // Filter-Pills haben plural (auftraege/dokumente/kontakte/...)
                const pluralMap = { auftrag:'auftraege', dokument:'dokumente', kontakt:'kontakte',
                                    termin:'termine', frist:'fristen', textbaustein:'textbausteine', norm:'normen' };
                const pluralSrc = pluralMap[row.source] || row.source;
                return pluralSrc === activeFilter;
              })
            : rows;
          items = filtered.map(row => ({
            type:     row.source,
            id:       row.id,
            title:    row.title,
            subtitle: row.subtitle,
            url:      row.href || row.url,  // v2 href, v1 url
            rank:     row.rank
          }));
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

  // MEGA⁷⁸ C.3: Cmd+K (Marcel-Direktive) + Cmd+P (Legacy Linear-Pattern).
  // Editor-Restriction (dataset.provaEditorMega65) entfernt — Overlay öffnet
  // jetzt VON JEDER PAGE aus.
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      const isMod = window.ProvaPlatform ? window.ProvaPlatform.isModPressed(e) : (e.metaKey || e.ctrlKey);
      if (!isMod || e.shiftKey || e.altKey) return;
      if (e.key === 'k' || e.key === 'K' || e.key === 'p' || e.key === 'P') {
        // In Input/Textarea-Feldern nicht triggern (außer es ist das eigene Suchfeld)
        const tag = e.target && e.target.tagName;
        if ((tag === 'INPUT' || tag === 'TEXTAREA') && !e.target.classList.contains('gs-input')) return;
        e.preventDefault();
        ProvaGlobalSearch.open();
      }
    }, true);
  }
})(typeof window !== 'undefined' ? window : globalThis);
