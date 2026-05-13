/**
 * PROVA Editor-Kontext-Sidebar (MEGA⁷⁰ Phase 2.5)
 *
 * Right-Sidebar im TipTap-Editor mit 5 Slots:
 *   📌 Verknüpfte Belege (Fragment-Quellen)
 *   📚 Literatur-Vorschläge (Bibliothek)
 *   🔗 Ähnliche Fälle (pgvector similarity-v1)
 *   ⚠ KI-Warnungen (Konsistenz §4 ↔ §6)
 *   📑 Strukturübersicht (Beweisfragen offen)
 *
 * Mount-Pattern:
 *   ProvaEditorContextSidebar.mount({ container, auftragId, getEditorContent: () => Editor.getJSON() })
 *
 * Daten via existing libs:
 *   - prova-fragment-sidebar (Belege)
 *   - Bibliothek-Vorschläge: ki_lernpool similarity
 *   - similarity-v1 Edge Fn (Ähnliche Fälle)
 *   - Compliance-Check API (KI-Warnungen)
 *   - Auftrag.beweisfragen (Struktur)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-editor-context-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-editor-context-style';
    style.textContent = `
      .pecs-sidebar { display: flex; flex-direction: column; gap: 14px; padding: 16px; background: var(--surface, #1c2130); border-left: 1px solid var(--border, rgba(255,255,255,0.10)); font-family: 'DM Sans', system-ui, sans-serif; min-height: 100%; overflow-y: auto; }
      .pecs-slot { background: var(--bg, #0b0d11); border: 1px solid var(--border, rgba(255,255,255,0.10)); border-radius: 10px; overflow: hidden; }
      .pecs-slot-head { padding: 10px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--text2, #a3abc2); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; cursor: pointer; }
      .pecs-slot-head:hover { background: rgba(255,255,255,.03); }
      .pecs-slot-head .pecs-count { background: rgba(79,142,247,.18); color: #93c5fd; padding: 1px 8px; border-radius: 999px; font-size: 10px; }
      .pecs-slot-body { padding: 8px 14px 12px; font-size: 12px; color: var(--text2); max-height: 240px; overflow-y: auto; }
      .pecs-slot-body.collapsed { display: none; }
      .pecs-item { padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: color .12s; }
      .pecs-item:last-child { border-bottom: none; }
      .pecs-item:hover { color: var(--text, #eaecf4); }
      .pecs-item-title { font-weight: 600; color: var(--text); margin-bottom: 2px; }
      .pecs-item-sub { font-size: 11px; color: var(--text3, #8b93ab); }
      .pecs-empty { padding: 14px 0; font-size: 11px; color: var(--text3); text-align: center; font-style: italic; }
      .pecs-warning { background: rgba(245,158,11,.06); border-color: rgba(245,158,11,.25); }
      .pecs-warning .pecs-slot-head { color: #fcd34d; }
    `;
    document.head.appendChild(style);
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function _slotHtml(id, icon, title, body, count, isWarn) {
    return `<div class="pecs-slot ${isWarn ? 'pecs-warning' : ''}" data-slot="${id}">
      <div class="pecs-slot-head" onclick="this.nextElementSibling.classList.toggle('collapsed')">
        <span>${icon} ${_esc(title)}</span>
        ${typeof count === 'number' ? `<span class="pecs-count">${count}</span>` : ''}
      </div>
      <div class="pecs-slot-body">${body}</div>
    </div>`;
  }

  function _itemHtml(title, sub, onClickAttr) {
    return `<div class="pecs-item" ${onClickAttr ? `onclick="${onClickAttr}"` : ''}>
      <div class="pecs-item-title">${_esc(title)}</div>
      ${sub ? `<div class="pecs-item-sub">${_esc(sub)}</div>` : ''}
    </div>`;
  }

  const ProvaEditorContextSidebar = {
    _container: null,
    _auftragId: null,
    _getContent: null,

    async mount({ container, auftragId, getEditorContent }) {
      _injectStyle();
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      this._container = el;
      this._auftragId = auftragId;
      this._getContent = getEditorContent;
      el.classList.add('pecs-sidebar');
      el.innerHTML = `
        ${_slotHtml('belege', '📌', 'Verknüpfte Belege', '<div class="pecs-empty">Lade…</div>')}
        ${_slotHtml('literatur', '📚', 'Literatur-Vorschläge', '<div class="pecs-empty">Lade…</div>')}
        ${_slotHtml('aehnlich', '🔗', 'Ähnliche Fälle', '<div class="pecs-empty">Lade…</div>')}
        ${_slotHtml('warnungen', '⚠', 'KI-Warnungen', '<div class="pecs-empty">Keine Warnungen</div>', 0, true)}
        ${_slotHtml('struktur', '📑', 'Strukturübersicht', '<div class="pecs-empty">Lade…</div>')}
      `;
      await this.refresh();
    },

    async refresh() {
      if (!this._auftragId) return;
      await Promise.all([
        this._loadBelege(),
        this._loadLiteratur(),
        this._loadAehnlich(),
        this._loadWarnungen(),
        this._loadStruktur()
      ]);
    },

    async _getSb() {
      const mod = await import('/lib/supabase-client.js');
      return mod.supabase;
    },

    async _loadBelege() {
      try {
        const sb = await this._getSb();
        const { data, count } = await sb.from('befund_fragmente')
          .select('id, text, quelle_typ, raumbezug', { count: 'exact' })
          .eq('auftrag_id', this._auftragId)
          .eq('status', 'gepruft')
          .is('deleted_at', null)
          .limit(10);
        this._renderSlot('belege', count || 0, (data || []).map(f =>
          _itemHtml(f.text ? f.text.slice(0, 60) + (f.text.length > 60 ? '…' : '') : '—', `${f.quelle_typ || '?'} · ${f.raumbezug || '—'}`)
        ).join('') || '<div class="pecs-empty">Noch keine geprüften Fragmente</div>');
      } catch (e) {
        this._renderSlot('belege', null, `<div class="pecs-empty">Fehler: ${_esc(e.message)}</div>`);
      }
    },

    async _loadLiteratur() {
      try {
        const sb = await this._getSb();
        const { data, count } = await sb.from('normen_bibliothek')
          .select('id, norm_nr, titel, haeufigkeit', { count: 'exact' })
          .is('deleted_at', null)
          .eq('aktiv', true)
          .order('nutzungs_count', { ascending: false, nullsFirst: false })
          .limit(8);
        this._renderSlot('literatur', count || 0, (data || []).map(n =>
          _itemHtml(n.norm_nr, n.titel || '')
        ).join('') || '<div class="pecs-empty">Keine Normen in Bibliothek</div>');
      } catch (e) {
        this._renderSlot('literatur', null, `<div class="pecs-empty">Fehler: ${_esc(e.message)}</div>`);
      }
    },

    async _loadAehnlich() {
      // similarity-v1 Edge Fn benötigt embedding aus aktuellem Content
      // Pragmatic: zeige Hinweis dass Funktion verfügbar (eigenes Triggern)
      this._renderSlot('aehnlich', null, '<div class="pecs-empty">Befund-Entwurf erstellen für Ähnlichkeits-Suche (pgvector)</div>');
    },

    async _loadWarnungen() {
      // KI-Konsistenz §4 ↔ §6 — würde eine API-Roundtrip erfordern.
      // Pragmatic: aktuell Stub, Erweiterung wenn compliance-check API gebunden.
      this._renderSlot('warnungen', 0, '<div class="pecs-empty">Compliance-Check vor Freigabe ausführen</div>');
    },

    async _loadStruktur() {
      try {
        const sb = await this._getSb();
        const { data } = await sb.from('auftraege')
          .select('titel, typ, phase_aktuell, beweisfragen, beweisbeschluss_extrakt')
          .eq('id', this._auftragId)
          .single();
        if (!data) {
          this._renderSlot('struktur', null, '<div class="pecs-empty">Auftrag nicht gefunden</div>');
          return;
        }
        const fragen = (data.beweisbeschluss_extrakt?.fragen || []);
        const html = `
          <div class="pecs-item">
            <div class="pecs-item-title">${_esc(data.titel || '—')}</div>
            <div class="pecs-item-sub">${_esc(data.typ || '')} · Phase ${data.phase_aktuell || 1}</div>
          </div>
          ${fragen.length ? `<div class="pecs-item-title" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">Beweisfragen (${fragen.length})</div>` + fragen.map((f, i) => _itemHtml(`${i+1}. ${typeof f === 'string' ? f : (f.text || f.frage || JSON.stringify(f).slice(0, 80))}`, '')).join('') : ''}
        `;
        this._renderSlot('struktur', fragen.length || null, html);
      } catch (e) {
        this._renderSlot('struktur', null, `<div class="pecs-empty">Fehler: ${_esc(e.message)}</div>`);
      }
    },

    _renderSlot(id, count, bodyHtml) {
      const slot = this._container?.querySelector(`[data-slot="${id}"]`);
      if (!slot) return;
      const head = slot.querySelector('.pecs-slot-head');
      const body = slot.querySelector('.pecs-slot-body');
      const cnt = head?.querySelector('.pecs-count');
      if (cnt && typeof count === 'number') cnt.textContent = count;
      if (body) body.innerHTML = bodyHtml;
    }
  };

  global.ProvaEditorContextSidebar = ProvaEditorContextSidebar;
})(typeof window !== 'undefined' ? window : globalThis);
