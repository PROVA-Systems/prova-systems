/**
 * PROVA Norm-Citation (MEGA⁶⁵ Item 3.8)
 *
 * Inline-Mark für DIN/EN/VDI-Zitate (NinjaAI Extension 7).
 * DIN-1505-konform: kursiv, Doppelpunkt vor Jahrgang, "Abschnitt" bei Unterkap.
 *
 * Attribute:
 *   - norm (z.B. "DIN 18533-1")
 *   - absatz (z.B. "5.2.3")
 *   - jahr (z.B. "2017-07")
 *   - quellenLink (URL)
 *
 * Picker: ProvaNormPicker.open(editor) sucht in normen_bibliothek-Tabelle.
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-norm-citation-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-norm-citation-style';
    link.rel = 'stylesheet';
    link.href = '/lib/extensions/prova-norm-citation.css';
    document.head.appendChild(link);
  }

  function ProvaNormCitationFactory(modules) {
    _injectStyle();
    if (!modules?.Mark || !modules?.mergeAttributes) return null;
    const { Mark, mergeAttributes } = modules;

    return Mark.create({
      name: 'provaNormCitation',
      inclusive: false,

      addAttributes() {
        return {
          norm:        { default: '',   parseHTML: el => el.getAttribute('data-norm') || el.textContent || '', renderHTML: a => ({ 'data-norm': a.norm }) },
          absatz:      { default: null, parseHTML: el => el.getAttribute('data-absatz'),        renderHTML: a => a.absatz ? { 'data-absatz': a.absatz } : {} },
          jahr:        { default: null, parseHTML: el => el.getAttribute('data-jahr'),          renderHTML: a => a.jahr ? { 'data-jahr': a.jahr } : {} },
          quellenLink: { default: null, parseHTML: el => el.getAttribute('data-quellen-link'),  renderHTML: a => a.quellenLink ? { 'data-quellen-link': a.quellenLink } : {} }
        };
      },

      parseHTML() {
        return [{ tag: 'cite.prova-norm' }];
      },

      renderHTML({ mark, HTMLAttributes }) {
        const title = formatNormTitle(mark.attrs);
        return [
          'cite',
          mergeAttributes(
            { class: 'prova-norm', title },
            HTMLAttributes
          ),
          0
        ];
      },

      addCommands() {
        return {
          setNormCitation: (attrs) => ({ commands, state }) => {
            const { from, to } = state.selection;
            if (from === to) {
              // Insert default text
              const display = formatNormDisplay(attrs);
              return commands.insertContent({
                type: 'text',
                text: display,
                marks: [{ type: 'provaNormCitation', attrs }]
              });
            }
            return commands.setMark('provaNormCitation', attrs);
          },
          unsetNormCitation: () => ({ commands }) => commands.unsetMark('provaNormCitation')
        };
      }
    });
  }

  function formatNormDisplay(attrs) {
    const parts = [attrs.norm];
    if (attrs.jahr) parts.push(`:${attrs.jahr}`);
    let s = parts.join('');
    if (attrs.absatz) s += `, Abschnitt ${attrs.absatz}`;
    return s;
  }

  function formatNormTitle(attrs) {
    return `${attrs.norm}${attrs.jahr ? ' (' + attrs.jahr + ')' : ''}${attrs.absatz ? ' · Abschnitt ' + attrs.absatz : ''}`;
  }

  /**
   * Norm-Picker — durchsucht normen_bibliothek via Supabase-Client.
   */
  class ProvaNormPicker {
    static async open(editor) {
      if (!editor) return;
      if (ProvaNormPicker._activeModal) return;
      _injectStyle();

      const overlay = document.createElement('div');
      overlay.className = 'prova-norm-picker-overlay';
      overlay.innerHTML = `
        <div class="prova-norm-picker-modal">
          <input type="text" class="prova-norm-input" placeholder="Norm suchen (z.B. DIN 18533, EN 1992, VDI 2552)..." autofocus>
          <div class="prova-norm-list"></div>
          <div class="prova-norm-footer">
            <span><kbd>↑↓</kbd> Navigieren</span>
            <span><kbd>↩</kbd> Einfügen</span>
            <span><kbd>esc</kbd> Schließen</span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      ProvaNormPicker._activeModal = overlay;

      const input = overlay.querySelector('.prova-norm-input');
      const list = overlay.querySelector('.prova-norm-list');
      let items = [];
      let selectedIdx = 0;

      function close() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        ProvaNormPicker._activeModal = null;
        document.removeEventListener('keydown', onKey, true);
      }

      function render() {
        list.innerHTML = '';
        if (items.length === 0) {
          list.innerHTML = '<div class="prova-norm-empty">Keine Treffer</div>';
          return;
        }
        items.forEach((n, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'prova-norm-item' + (idx === selectedIdx ? ' is-selected' : '');
          btn.innerHTML = `
            <span class="norm-badge">${_normBadge(n.norm_nr)}</span>
            <span class="norm-body">
              <span class="norm-title">${_esc(n.norm_nr)}${n.version_jahr ? ' (' + n.version_jahr + ')' : ''}</span>
              <span class="norm-sub">${_esc(n.titel || n.untertitel || '')}</span>
            </span>
          `;
          btn.addEventListener('mousedown', (e) => e.preventDefault());
          btn.addEventListener('click', () => activate(idx));
          list.appendChild(btn);
        });
      }

      function activate(idx) {
        const n = items[idx];
        if (!n) return;
        editor.commands.setNormCitation({
          norm: n.norm_nr,
          jahr: n.version_jahr || null,
          quellenLink: null
        });
        close();
      }

      async function search(q) {
        try {
          const sb = await _getSupabase();
          if (!sb) { items = []; render(); return; }
          const queryStr = (q || '').trim();
          let req = sb.from('normen_bibliothek').select('id, norm_nr, titel, untertitel, version_jahr, aktuell_gueltig, bereich').eq('aktiv', true).limit(20);
          if (queryStr.length > 0) {
            req = req.or(`norm_nr.ilike.%${queryStr}%,titel.ilike.%${queryStr}%`);
          } else {
            req = req.order('nutzungs_count', { ascending: false }).order('haeufigkeit', { ascending: false });
          }
          const { data } = await req;
          items = data || [];
          selectedIdx = 0;
          render();
        } catch (e) {
          items = [];
          render();
        }
      }

      input.addEventListener('input', (e) => search(e.target.value));

      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { selectedIdx = (selectedIdx + 1) % items.length; render(); } }
        else if (e.key === 'ArrowUp')   { e.preventDefault(); if (items.length) { selectedIdx = (selectedIdx - 1 + items.length) % items.length; render(); } }
        else if (e.key === 'Enter')     { e.preventDefault(); activate(selectedIdx); }
      }
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      // Initial-Load
      search('');
    }
  }

  async function _getSupabase() {
    try {
      const url = window.PROVA_CONFIG?.SUPABASE_URL;
      const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
      if (!url || !key) return null;
      const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
      return mod.supabase || (mod.getSupabase && mod.getSupabase());
    } catch (e) { return null; }
  }

  function _normBadge(norm) {
    if (/^DIN/i.test(norm)) return 'DIN';
    if (/^EN/i.test(norm)) return 'EN';
    if (/^VDI/i.test(norm)) return 'VDI';
    if (/^ISO/i.test(norm)) return 'ISO';
    if (/^VOB/i.test(norm)) return 'VOB';
    return '·';
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  global.ProvaNormCitationFactory = ProvaNormCitationFactory;
  global.ProvaNormPicker = ProvaNormPicker;
  global.ProvaNormFormat = { display: formatNormDisplay, title: formatNormTitle };
})(typeof window !== 'undefined' ? window : globalThis);
