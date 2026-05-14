/**
 * PROVA Audit-Search (MEGA⁶⁸ Item 6.9)
 *
 * Cmd+Shift+A öffnet Modal mit Search-Input.
 * Fuzzy-Match via command-score gegen Narratives (audit-narrative-v1).
 * Result-Click öffnet ProvaAuditTrailView an entsprechendem Zeitpunkt.
 *
 * Cache: 60s pro auftragId.
 *
 * API:
 *   ProvaAuditSearch.open({ auftragId })
 *   ProvaAuditSearch.invalidate(auftragId?)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-audit-search-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-audit-search-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-audit-search.css';
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

  const CACHE_TTL = 60 * 1000;
  const _cache = new Map();   // auftragId → { ts, narratives }

  async function _loadNarratives(auftragId) {
    const cached = _cache.get(auftragId);
    if (cached && (Date.now() - cached.ts < CACHE_TTL)) return cached.narratives;
    try {
      const sb = await _getSb();
      const { data: { session } } = await sb.auth.getSession();
      const tok = session?.access_token;
      const url = window.PROVA_CONFIG.SUPABASE_URL;
      const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
      const resp = await fetch(`${url}/functions/v1/audit-narrative-v1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
        body: JSON.stringify({ auftrag_id: auftragId, limit: 500 })
      });
      const json = await resp.json();
      const narratives = json.narratives || [];
      _cache.set(auftragId, { ts: Date.now(), narratives });
      return narratives;
    } catch (e) {
      console.warn('[audit-search] load failed:', e);
      return [];
    }
  }

  const ProvaAuditSearch = {
    invalidate(auftragId) {
      if (auftragId) _cache.delete(auftragId);
      else _cache.clear();
    },

    async open({ auftragId }) {
      if (!auftragId) { alert('auftrag_id fehlt'); return; }
      if (this._active) return;
      _injectStyle();

      const overlay = document.createElement('div');
      overlay.className = 'prova-audit-search-overlay';
      overlay.innerHTML = `
        <div class="prova-audit-search-modal">
          <input type="text" class="as-input" placeholder="Audit-Trail + Wissenspool durchsuchen… (z.B. 'konjunktiv', 'feuchtigkeit', 'versand')" autofocus>
          <div class="as-results">Lade Index…</div>
          <div class="as-footer">
            <span><kbd>↑↓</kbd> Navigieren · <kbd>↩</kbd> Öffnen · <kbd>esc</kbd> Schließen</span>
            <span class="as-pool-count" id="as-pool-count" style="margin-left:auto;color:var(--text3,#4d5568);">Wissenspool: lädt…</span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      this._active = overlay;

      const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this._active = null;
        document.removeEventListener('keydown', onKey, true);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { close(); return; }
        if (!filtered.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = (selectedIdx + 1) % filtered.length; render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = (selectedIdx - 1 + filtered.length) % filtered.length; render(); }
        else if (e.key === 'Enter') { e.preventDefault(); activate(selectedIdx); }
      };
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      const input = overlay.querySelector('.as-input');
      const list = overlay.querySelector('.as-results');
      let narratives = [];
      let filtered = [];
      let selectedIdx = 0;

      function activate(idx) {
        const n = filtered[idx];
        if (!n) return;
        close();
        if (window.ProvaAuditTrailView?.open) {
          window.ProvaAuditTrailView.open({ auftragId, scrollTo: n.id });
        }
      }

      function render() {
        if (!filtered.length) {
          list.innerHTML = '<div class="as-empty">Keine Treffer</div>';
          return;
        }
        list.innerHTML = filtered.slice(0, 50).map((n, idx) => {
          const time = new Date(n.created_at || n.datum || Date.now()).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: n.created_at ? 'short' : undefined });
          const source = n._source === 'wissenspool' ? '<span class="as-kat" style="background:rgba(139,92,246,0.18);color:#c4b5fd;">Wissenspool</span>' : '';
          return `<button type="button" class="as-item ${idx === selectedIdx ? 'is-selected' : ''}" data-idx="${idx}">
            <span class="as-time">${_esc(time)}</span>
            <span class="as-text">${_esc(n.narrative || '')}</span>
            ${source}
            ${n.kategorie ? `<span class="as-kat">${_esc(n.kategorie)}</span>` : ''}
          </button>`;
        }).join('');
        list.querySelectorAll('[data-idx]').forEach(b => {
          b.addEventListener('mousedown', (e) => e.preventDefault());
          b.addEventListener('click', () => activate(parseInt(b.dataset.idx, 10)));
        });
      }

      function search(q) {
        const cs = window.TipTapBundle?.commandScore;
        const combined = [...narratives, ...wissenspool];
        if (!q || q.length < 1) {
          filtered = combined.slice(0, 50);
        } else {
          const lower = q.toLowerCase();
          const scored = combined.map(n => {
            const txt = (n.narrative || '').toLowerCase();
            let score;
            if (cs) score = cs(txt, lower);
            else score = txt.includes(lower) ? 0.5 : 0;
            return { n, score };
          }).filter(x => x.score > 0);
          scored.sort((a, b) => b.score - a.score);
          filtered = scored.map(x => x.n);
        }
        selectedIdx = 0;
        render();
      }

      input.addEventListener('input', (e) => search(e.target.value));

      let wissenspool = [];
      narratives = await _loadNarratives(auftragId);
      // MEGA⁶⁹-FINAL-3 8.4 — ki_lernpool als zusätzliche Quelle (Wissenspool, NICHT "KI lernt dazu")
      try {
        const sb = await _getSb();
        const { data: lp, count } = await sb.from('ki_lernpool')
          .select('id, schadenart, sv_ursache_pseudonym, foto_beschreibung_pseudonym, foto_tags, bauteil, datum, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(200);
        if (Array.isArray(lp)) {
          wissenspool = lp.map(r => ({
            id: r.id,
            _source: 'wissenspool',
            narrative: [r.schadenart, r.bauteil, r.sv_ursache_pseudonym, r.foto_beschreibung_pseudonym, (r.foto_tags || []).join(', ')].filter(Boolean).join(' · '),
            kategorie: r.bauteil || null,
            created_at: r.created_at || r.datum
          }));
        }
        const poolLbl = document.getElementById('as-pool-count');
        if (poolLbl) poolLbl.textContent = `Wissenspool: ${count != null ? count : wissenspool.length} Einträge`;
      } catch (e) {
        const poolLbl = document.getElementById('as-pool-count');
        if (poolLbl) poolLbl.textContent = 'Wissenspool: nicht verfügbar';
      }
      filtered = [...narratives, ...wissenspool].slice(0, 50);
      render();
    }
  };

  global.ProvaAuditSearch = ProvaAuditSearch;

  // Cmd+Shift+A Shortcut registrieren
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      const isMod = window.ProvaPlatform ? window.ProvaPlatform.isModPressed(e) : (e.metaKey || e.ctrlKey);
      if (isMod && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        // Bedingung: editor-Context (body-marker) + auftragId aus PROVA_EDITOR_CONTEXT
        const aid = window.PROVA_EDITOR_CONTEXT?.auftrag_id;
        if (document.body?.dataset.provaEditorMega65 === '1' && aid) {
          e.preventDefault();
          ProvaAuditSearch.open({ auftragId: aid });
        }
      }
    }, true);
  }
})(typeof window !== 'undefined' ? window : globalThis);
