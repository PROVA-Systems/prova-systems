/**
 * PROVA Beweisfragen-Panel (MEGA⁶⁸ Item 6.5)
 *
 * Quelle: auftraege.beweisbeschluss_extrakt JSONB (struktur via parse-beweisbeschluss).
 * Zeigt pro Beweisfrage:
 *   - Zugeordnete Anhänge (tags 'beweisfrage:N')
 *   - Zugeordnete Befund-Fragmente (tags 'beantwortet:N' oder beweisfrage_bezug enthält N)
 *   - Status-Ampel: ungelöst (grau) / teilweise (gelb) / vollständig (grün)
 *
 * API:
 *   new ProvaBeweisfragenPanel(container, { auftragId }).load()
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-beweisfragen-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-beweisfragen-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-beweisfragen-panel.css';
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

  class ProvaBeweisfragenPanel {
    constructor(container, opts = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      this.auftragId = opts.auftragId;
      if (!this.container) throw new Error('container required');
      _injectStyle();
      if (this.auftragId) this.load();
    }

    async load() {
      this.container.innerHTML = '<div class="bf-loading">Lade Beweisfragen…</div>';
      try {
        const sb = await _getSb();
        const [auftragRes, anhaengeRes, fragmenteRes] = await Promise.all([
          sb.from('auftraege').select('beweisbeschluss_extrakt').eq('id', this.auftragId).maybeSingle(),
          sb.from('anhaenge').select('id, original_filename, beschreibung, typ, tags').eq('auftrag_id', this.auftragId).is('deleted_at', null),
          sb.from('befund_fragmente').select('id, text, quelle_typ, status, tags, beweisfrage_bezug').eq('auftrag_id', this.auftragId).is('deleted_at', null)
        ]);

        const fragen = (auftragRes.data?.beweisbeschluss_extrakt?.fragen) || [];
        if (!fragen || fragen.length === 0) {
          this.container.innerHTML = `
            <div class="bf-empty">
              <strong>Kein Beweisbeschluss erkannt.</strong><br>
              <small>Beweisbeschluss-PDF in Externe Dokumente hochladen — parse-beweisbeschluss extrahiert die Fragen automatisch.</small>
            </div>
          `;
          return;
        }

        const anhaenge = anhaengeRes.data || [];
        const fragmente = fragmenteRes.data || [];

        this.container.innerHTML = `
          <div class="bf-panel">
            <h3>Beweisfragen (${fragen.length})</h3>
            <ul class="bf-list">${fragen.map((f, idx) => this._renderFrage(f, idx, anhaenge, fragmente)).join('')}</ul>
          </div>
        `;

        this.container.querySelectorAll('.bf-frage-head').forEach(h => {
          h.addEventListener('click', () => h.closest('.bf-frage').classList.toggle('is-open'));
        });
        this.container.querySelectorAll('[data-anhang]').forEach(b => {
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.ProvaAnhangLightbox?.open) window.ProvaAnhangLightbox.open(b.dataset.anhang);
          });
        });
        this.container.querySelectorAll('[data-fragment]').forEach(b => {
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('prova:fragment-clicked', {
              detail: { fragmentId: b.dataset.fragment, source: 'beweisfragen-panel' }
            }));
          });
        });
      } catch (e) {
        this.container.innerHTML = `<div class="bf-empty error">Fehler: ${_esc(e.message)}</div>`;
      }
    }

    _renderFrage(frage, idx, anhaenge, fragmente) {
      const nr = idx + 1;
      const tagKey = `beweisfrage:${nr}`;
      const matchedAnhaenge = anhaenge.filter(a => Array.isArray(a.tags) && a.tags.includes(tagKey));
      const matchedFragmente = fragmente.filter(f =>
        (Array.isArray(f.beweisfrage_bezug) && f.beweisfrage_bezug.includes(nr)) ||
        (Array.isArray(f.tags) && f.tags.includes(`beantwortet:${nr}`))
      );
      const total = matchedAnhaenge.length + matchedFragmente.length;
      const gepruftFragmente = matchedFragmente.filter(f => f.status === 'gepruft').length;
      let status = 'open';
      let statusLabel = 'ungelöst';
      if (total > 0 && gepruftFragmente > 0) {
        status = gepruftFragmente >= matchedFragmente.length && matchedAnhaenge.length > 0 ? 'done' : 'partial';
        statusLabel = status === 'done' ? 'vollständig' : 'teilweise';
      } else if (total > 0) {
        status = 'partial'; statusLabel = 'teilweise';
      }
      const text = (typeof frage === 'string') ? frage : (frage?.text || frage?.frage || `Frage ${nr}`);

      return `<li class="bf-frage bf-frage--${status}">
        <div class="bf-frage-head">
          <span class="bf-ampel" data-status="${status}" aria-label="${statusLabel}"></span>
          <span class="bf-nr">${nr}.</span>
          <span class="bf-text">${_esc(text)}</span>
          <span class="bf-count">${total}</span>
        </div>
        <div class="bf-frage-body">
          ${matchedAnhaenge.length > 0 ? `
            <div class="bf-section">
              <strong>Anhänge:</strong>
              <ul>${matchedAnhaenge.map(a => `<li><button type="button" class="bf-link" data-anhang="${_esc(a.id)}">📎 ${_esc(a.beschreibung || a.original_filename)}</button></li>`).join('')}</ul>
            </div>` : ''}
          ${matchedFragmente.length > 0 ? `
            <div class="bf-section">
              <strong>Fragmente:</strong>
              <ul>${matchedFragmente.slice(0, 8).map(f => `<li><button type="button" class="bf-link" data-fragment="${_esc(f.id)}">${_esc(f.quelle_typ)}: ${_esc((f.text || '').slice(0, 80))}…</button></li>`).join('')}</ul>
            </div>` : ''}
          ${total === 0 ? '<div class="bf-empty-mini">Noch keine Zuordnung. Anhang hochladen oder Fragment markieren.</div>' : ''}
        </div>
      </li>`;
    }
  }

  global.ProvaBeweisfragenPanel = ProvaBeweisfragenPanel;
})(typeof window !== 'undefined' ? window : globalThis);
