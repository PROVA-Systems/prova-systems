/**
 * PROVA Fragment-Sidebar (MEGA⁶⁴ Item 2.10 + 2.11)
 *
 * Rechts neben Editor (30%). Liefert kuratierte Fragmente aus befund_fragmente
 * fuer den aktuellen Auftrag. Click-Sync via CustomEvent 'prova:fragment-clicked'.
 *
 * Public API:
 *   new FragmentSidebar(container, editor, { auftragId })
 *     → instance mit load(), filter(opts), scrollToFragment(id), destroy()
 *
 * Dependencies: window.supabase (createClient existing pattern) ODER ProvaConfig.
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-fragment-sidebar-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-fragment-sidebar-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-fragment-sidebar.css';
    document.head.appendChild(link);
  }

  const QUELLE_ICONS = {
    diktat: '🎙',
    foto: '📷',
    skizze: '✏',
    notiz: '📝',
    manuell: '✎'
  };

  class FragmentSidebar {
    constructor(container, editor, opts = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      this.editor = editor;
      this.opts = opts;
      this.auftragId = opts.auftragId;
      this.fragments = [];
      this.cardsById = {};
      this._filter = { status: null, gutachten_teil: null, quelle: null };
      this.selectedIds = new Set();   // MEGA⁶⁷ Item 5.1

      if (!this.container) throw new Error('[FragmentSidebar] container required');

      _injectStyle();
      this._render();
      this._registerClickSync();
      if (this.auftragId) this.load();
    }

    async load() {
      if (!this.auftragId) return;
      this._renderLoading();
      try {
        const sb = await this._getSupabase();
        let q = sb.from('befund_fragmente')
          .select('id, text, quelle_typ, quelle_asset_id, quelle_startzeit_ms, status, tags, raumbezug, gutachten_teil, created_at')
          .eq('auftrag_id', this.auftragId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(200);
        if (this._filter.status) q = q.eq('status', this._filter.status);
        if (this._filter.gutachten_teil) q = q.eq('gutachten_teil', this._filter.gutachten_teil);
        if (this._filter.quelle) q = q.eq('quelle_typ', this._filter.quelle);
        const { data, error } = await q;
        if (error) { this._renderError(error.message); return; }
        this.fragments = data || [];
        this._renderCards();
      } catch (e) {
        this._renderError(e?.message || String(e));
      }
    }

    filter(opts) {
      Object.assign(this._filter, opts);
      this.load();
    }

    // MEGA⁶⁷ Item 5.1 — Selection-API
    getSelectedIds() {
      return Array.from(this.selectedIds);
    }
    clearSelection() {
      this.selectedIds.clear();
      this._updateSelectionUI();
    }
    selectAll() {
      this.fragments.forEach(f => this.selectedIds.add(f.id));
      this._updateSelectionUI();
    }
    deselectAll() { this.clearSelection(); }

    _updateSelectionUI() {
      const count = this.selectedIds.size;
      if (this._footer) {
        this._footer.style.display = count > 0 ? 'flex' : 'none';
        const btn = this._footer.querySelector('.sb-selection-btn');
        if (btn) btn.textContent = `Auswahl in Befund (${count})`;
      }
      Object.entries(this.cardsById).forEach(([id, card]) => {
        const cb = card.querySelector('.card-checkbox');
        const isSel = this.selectedIds.has(id);
        if (cb) cb.checked = isSel;
        card.classList.toggle('is-selected', isSel);
      });
    }

    scrollToFragment(fragmentId) {
      const card = this.cardsById[fragmentId];
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('is-flash');
      setTimeout(() => card.classList.remove('is-flash'), 800);
    }

    insertFragment(fragment) {
      if (!fragment) return;
      // Insert als Plain-Text mit Fragment-Marker (markiert die KI-Quelle)
      const ed = this.editor;
      const chain = ed.chain().focus().insertContent({
        type: 'text',
        text: fragment.text,
        marks: [{
          type: 'provaFragmentMarker',
          attrs: {
            fragmentId: fragment.id,
            quelle: fragment.quelle_typ,
            timestamp: fragment.created_at
          }
        }]
      });
      chain.run();
    }

    async setStatus(fragmentId, newStatus) {
      try {
        const sb = await this._getSupabase();
        const { error } = await sb.from('befund_fragmente')
          .update({ status: newStatus })
          .eq('id', fragmentId);
        if (error) throw error;
        const f = this.fragments.find(x => x.id === fragmentId);
        if (f) f.status = newStatus;
        this._renderCards();
      } catch (e) {
        console.warn('[FragmentSidebar] setStatus failed', e);
      }
    }

    async _getSupabase() {
      if (this._sb) return this._sb;
      // ESM-import on-demand (DSGVO-konform via lokales node_modules — heutiges Pattern)
      const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
      this._sb = mod.supabase || (mod.getSupabase && mod.getSupabase());
      return this._sb;
    }

    _render() {
      this.container.innerHTML = `
        <div class="prova-sidebar-head">
          <h3>Befund-Fragmente</h3>
          <div class="prova-sidebar-filters">
            <button type="button" data-filter="status" data-value="" class="is-active">Alle</button>
            <button type="button" data-filter="status" data-value="roh">Roh</button>
            <button type="button" data-filter="status" data-value="gepruft">Geprüft</button>
          </div>
        </div>
        <div class="prova-sidebar-body" data-list></div>
        <div class="prova-sidebar-footer" data-footer style="display:none">
          <button type="button" class="sb-selection-btn">Auswahl in Befund (0)</button>
          <button type="button" class="sb-clear-btn" title="Auswahl löschen">✕</button>
        </div>
      `;
      this.body = this.container.querySelector('[data-list]');
      this._footer = this.container.querySelector('[data-footer]');
      // MEGA⁶⁷ Item 5.1 — Selection-Footer-Wiring
      this._footer.querySelector('.sb-selection-btn').addEventListener('click', () => {
        if (window.ProvaBefundGenerator?.open) {
          window.ProvaBefundGenerator.open(this.editor, this.auftragId, this);
        }
      });
      this._footer.querySelector('.sb-clear-btn').addEventListener('click', () => this.clearSelection());
      this.container.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.container.querySelectorAll('[data-filter="status"]').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          this.filter({ status: btn.dataset.value || null });
        });
      });
    }

    _renderLoading() {
      this.body.innerHTML = '<div class="prova-sidebar-empty">Lade Fragmente…</div>';
    }

    _renderError(msg) {
      this.body.innerHTML = `<div class="prova-sidebar-empty prova-sidebar-error">Fehler: ${msg}</div>`;
    }

    _renderCards() {
      this.cardsById = {};
      if (this.fragments.length === 0) {
        this.body.innerHTML = `
          <div class="prova-sidebar-empty">
            <div style="font-size:24px;margin-bottom:8px">📋</div>
            <div><strong>Noch keine Fragmente.</strong></div>
            <div style="margin-top:8px;font-size:12px;color:#6b7c80">
              Beim Diktat, Foto- oder Notiz-Upload werden Fragmente automatisch extrahiert.
            </div>
          </div>
        `;
        return;
      }
      this.body.innerHTML = '';
      this.fragments.forEach(f => {
        const card = this._buildCard(f);
        this.body.appendChild(card);
        this.cardsById[f.id] = card;
      });
    }

    _buildCard(f) {
      const card = document.createElement('div');
      card.className = 'prova-fragment-card';
      card.dataset.fragmentId = f.id;
      card.dataset.status = f.status;
      const datum = f.created_at ? new Date(f.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      const icon = QUELLE_ICONS[f.quelle_typ] || '•';
      const tags = Array.isArray(f.tags) && f.tags.length > 0
        ? f.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join(' ')
        : '';
      const preview = (f.text || '').length > 220 ? f.text.slice(0, 220) + '…' : (f.text || '');
      card.innerHTML = `
        <div class="card-head">
          <input type="checkbox" class="card-checkbox" aria-label="Fragment auswählen" ${this.selectedIds.has(f.id) ? 'checked' : ''}>
          <span class="card-icon" data-quelle="${f.quelle_typ}" aria-hidden="true">${icon}</span>
          <span class="card-quelle">${f.quelle_typ}</span>
          <span class="card-datum">${datum}</span>
          <span class="card-status card-status--${f.status}">${f.status}</span>
        </div>
        <div class="card-text">${this._escape(preview)}</div>
        ${f.raumbezug ? `<div class="card-raum">${this._escape(f.raumbezug)}</div>` : ''}
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <div class="card-actions">
          <button type="button" data-action="insert">↪ Einfügen</button>
          ${f.status !== 'gepruft' ? '<button type="button" data-action="pruefen">✓ Geprüft</button>' : ''}
        </div>
      `;
      card.addEventListener('click', (e) => {
        const insertBtn = e.target.closest('[data-action="insert"]');
        const prueftBtn = e.target.closest('[data-action="pruefen"]');
        const cb = e.target.closest('.card-checkbox');
        if (insertBtn) { this.insertFragment(f); return; }
        if (prueftBtn) { this.setStatus(f.id, 'gepruft'); return; }
        if (cb) {
          // MEGA⁶⁷ Item 5.1
          if (cb.checked) this.selectedIds.add(f.id);
          else this.selectedIds.delete(f.id);
          this._updateSelectionUI();
          return;
        }
        // Else: Card-Click → sync to editor
        document.dispatchEvent(new CustomEvent('prova:fragment-clicked', {
          detail: { fragmentId: f.id, source: 'sidebar' }
        }));
      });
      return card;
    }

    _escape(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    }

    _registerClickSync() {
      // Vom Editor: Klick auf Marker → Sidebar flash
      this._onClickEvent = (e) => {
        const { fragmentId, source } = e.detail || {};
        if (!fragmentId) return;
        if (source === 'editor') {
          // Editor → Sidebar
          this.scrollToFragment(fragmentId);
        } else if (source === 'sidebar') {
          // Sidebar → Editor: scroll zu Marker
          this._scrollEditorToMarker(fragmentId);
        }
      };
      document.addEventListener('prova:fragment-clicked', this._onClickEvent);
    }

    _scrollEditorToMarker(fragmentId) {
      const ed = this.editor;
      const editorEl = ed?.options?.element;
      if (!editorEl) return;
      const marker = editorEl.querySelector(`[data-fragment-id="${CSS.escape(fragmentId)}"]`);
      if (marker) {
        marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
        marker.classList.add('is-flash');
        setTimeout(() => marker.classList.remove('is-flash'), 800);
      }
    }

    destroy() {
      document.removeEventListener('prova:fragment-clicked', this._onClickEvent);
      this.container.innerHTML = '';
    }
  }

  global.FragmentSidebar = FragmentSidebar;
})(typeof window !== 'undefined' ? window : globalThis);
