/**
 * PROVA KI-Suggestion-Mark (MEGA⁶⁵ Item 3.4)
 *
 * Inline-Mark für KI-Vorschläge mit Accept/Reject-Bubble.
 *
 * Attribute (NinjaAI Custom-Nodes-Spec Extension 6):
 *   - suggestionId (uuid)
 *   - type ('insert'|'delete'|'replace')
 *   - original (string)
 *   - newText (string)
 *   - providerHash (sha256-Hash des KI-Providers, KEIN Klarname!)
 *   - confidence (0-1)
 *   - kiProtokollId (uuid) — Link zu Audit
 *   - createdAt (ISO)
 *
 * Klick: zeigt Accept/Reject-Bubble via Floating-UI.
 * Accept: ersetzt Text durch newText, setzt ki_protokoll.wirkung='uebernommen'
 * Reject: entfernt Mark (Original bleibt), setzt wirkung='verworfen'
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-ki-suggestion-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-ki-suggestion-style';
    link.rel = 'stylesheet';
    link.href = '/lib/extensions/prova-ki-suggestion.css';
    document.head.appendChild(link);
  }

  function ProvaKiSuggestionFactory(modules, opts = {}) {
    _injectStyle();
    if (!modules?.Mark || !modules?.mergeAttributes) {
      console.warn('[prova-ki-suggestion] modules.Mark missing');
      return null;
    }
    const { Mark, mergeAttributes } = modules;

    return Mark.create({
      name: 'provaKiSuggestion',
      inclusive: false,
      excludes: 'provaKiSuggestion',

      addAttributes() {
        return {
          suggestionId:    { default: null, parseHTML: el => el.getAttribute('data-suggestion-id'), renderHTML: a => ({ 'data-suggestion-id': a.suggestionId || '' }) },
          type:            { default: 'replace', parseHTML: el => el.getAttribute('data-type') || 'replace', renderHTML: a => ({ 'data-type': a.type }) },
          original:        { default: '', parseHTML: el => el.getAttribute('data-original') || '', renderHTML: a => ({ 'data-original': a.original }) },
          newText:         { default: '', parseHTML: el => el.getAttribute('data-new-text') || '', renderHTML: a => ({ 'data-new-text': a.newText }) },
          providerHash:    { default: '', parseHTML: el => el.getAttribute('data-provider-hash') || '', renderHTML: a => ({ 'data-provider-hash': a.providerHash }) },
          confidence:      { default: null, parseHTML: el => parseFloat(el.getAttribute('data-confidence') || ''), renderHTML: a => a.confidence != null ? { 'data-confidence': String(a.confidence) } : {} },
          kiProtokollId:   { default: null, parseHTML: el => el.getAttribute('data-ki-protokoll-id'), renderHTML: a => a.kiProtokollId ? { 'data-ki-protokoll-id': a.kiProtokollId } : {} },
          createdAt:       { default: null, parseHTML: el => el.getAttribute('data-created-at'), renderHTML: a => a.createdAt ? { 'data-created-at': a.createdAt } : {} }
        };
      },

      parseHTML() {
        return [{ tag: 'span.prova-ki-suggestion' }];
      },

      renderHTML({ mark, HTMLAttributes }) {
        const t = mark.attrs.type || 'replace';
        return [
          'span',
          mergeAttributes(
            {
              class: `prova-ki-suggestion prova-ki-suggestion--${t}`,
              title: `KI-Vorschlag (${t})${mark.attrs.confidence != null ? ` · ${Math.round(mark.attrs.confidence * 100)} %` : ''}`,
              role: 'note'
            },
            HTMLAttributes
          ),
          0
        ];
      },

      addCommands() {
        return {
          setKiSuggestion: (attrs) => ({ commands }) =>
            commands.setMark('provaKiSuggestion', attrs),
          unsetKiSuggestion: () => ({ commands }) =>
            commands.unsetMark('provaKiSuggestion'),
          acceptKiSuggestionAt: (pos) => ({ tr, state, dispatch }) => {
            const $pos = state.doc.resolve(pos);
            const mark = $pos.marks().find(m => m.type.name === 'provaKiSuggestion');
            if (!mark) return false;
            // Finde Range der Mark
            let from = pos;
            while (from > 0 && state.doc.resolve(from - 1).marks().some(m => m.type.name === 'provaKiSuggestion' && m.attrs.suggestionId === mark.attrs.suggestionId)) {
              from--;
            }
            let to = pos;
            const docSize = state.doc.content.size;
            while (to < docSize && state.doc.resolve(to).marks().some(m => m.type.name === 'provaKiSuggestion' && m.attrs.suggestionId === mark.attrs.suggestionId)) {
              to++;
            }
            const newText = mark.attrs.newText || '';
            if (dispatch) {
              tr.replaceWith(from, to, state.schema.text(newText)).removeMark(from, from + newText.length, mark.type);
              dispatch(tr);
              _setWirkungAsync(mark.attrs.kiProtokollId, 'uebernommen');
            }
            return true;
          },
          rejectKiSuggestionAt: (pos) => ({ tr, state, dispatch }) => {
            const $pos = state.doc.resolve(pos);
            const mark = $pos.marks().find(m => m.type.name === 'provaKiSuggestion');
            if (!mark) return false;
            let from = pos;
            while (from > 0 && state.doc.resolve(from - 1).marks().some(m => m.type.name === 'provaKiSuggestion' && m.attrs.suggestionId === mark.attrs.suggestionId)) {
              from--;
            }
            let to = pos;
            const docSize = state.doc.content.size;
            while (to < docSize && state.doc.resolve(to).marks().some(m => m.type.name === 'provaKiSuggestion' && m.attrs.suggestionId === mark.attrs.suggestionId)) {
              to++;
            }
            if (dispatch) {
              tr.removeMark(from, to, mark.type);
              dispatch(tr);
              _setWirkungAsync(mark.attrs.kiProtokollId, 'verworfen');
            }
            return true;
          }
        };
      },

      onCreate() {
        const editorEl = this.editor.options.element;
        if (editorEl._provaKiSuggestionRegistered) return;
        editorEl._provaKiSuggestionRegistered = true;

        // Click-Handler: zeigt Accept/Reject-Bubble
        editorEl.addEventListener('click', (e) => {
          const target = e.target.closest('.prova-ki-suggestion');
          if (!target) return;
          _showBubble(this.editor, target);
        });
      }
    });
  }

  // ═══ Accept/Reject-Bubble ═══

  let _activeBubble = null;
  function _hideBubble() {
    if (_activeBubble && _activeBubble.parentNode) {
      _activeBubble.parentNode.removeChild(_activeBubble);
    }
    _activeBubble = null;
  }

  function _showBubble(editor, markEl) {
    _hideBubble();
    const original = markEl.dataset.original || '';
    const newText = markEl.dataset.newText || '';
    const type = markEl.dataset.type || 'replace';
    const confidence = markEl.dataset.confidence ? Math.round(parseFloat(markEl.dataset.confidence) * 100) : null;
    const providerHash = markEl.dataset.providerHash || '';
    const suggestionId = markEl.dataset.suggestionId || '';

    const bubble = document.createElement('div');
    bubble.className = 'prova-ki-suggestion-bubble';
    bubble.setAttribute('role', 'dialog');
    bubble.innerHTML = `
      <div class="bubble-head">
        <strong>KI-Vorschlag</strong>
        ${confidence != null ? `<span class="bubble-conf">${confidence} %</span>` : ''}
      </div>
      ${type === 'replace' ? `
        <div class="bubble-diff">
          <div class="bubble-original"><span class="label">Original:</span> ${_esc(original)}</div>
          <div class="bubble-new"><span class="label">Vorschlag:</span> ${_esc(newText)}</div>
        </div>` : ''}
      ${type === 'insert' ? `<div class="bubble-diff"><span class="label">Einfügen:</span> ${_esc(newText)}</div>` : ''}
      ${type === 'delete' ? `<div class="bubble-diff"><span class="label">Löschen:</span> ${_esc(original)}</div>` : ''}
      <div class="bubble-actions">
        <button type="button" class="btn-accept" data-suggestion-id="${suggestionId}">✓ Übernehmen <kbd>↩</kbd></button>
        <button type="button" class="btn-reject" data-suggestion-id="${suggestionId}">✗ Ablehnen <kbd>esc</kbd></button>
      </div>
      ${providerHash ? `<div class="bubble-meta">KI-Modell: <code>${_esc(providerHash.slice(0, 16))}…</code></div>` : ''}
    `;
    document.body.appendChild(bubble);
    _activeBubble = bubble;

    const rect = markEl.getBoundingClientRect();
    const FU = window.TipTapBundle;
    if (FU?.computePosition) {
      FU.computePosition({ getBoundingClientRect: () => rect }, bubble, {
        placement: 'top',
        middleware: [FU.offset(8), FU.flip(), FU.shift({ padding: 8 })]
      }).then(({ x, y }) => {
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y + window.scrollY}px`;
      });
    } else {
      bubble.style.left = `${rect.left + window.scrollX}px`;
      bubble.style.top = `${rect.top + window.scrollY - bubble.offsetHeight - 8}px`;
    }

    // Action handler
    const view = editor.view;
    const posInDoc = view.posAtDOM(markEl, 0);

    bubble.querySelector('.btn-accept').addEventListener('click', () => {
      editor.commands.acceptKiSuggestionAt(posInDoc);
      _hideBubble();
    });
    bubble.querySelector('.btn-reject').addEventListener('click', () => {
      editor.commands.rejectKiSuggestionAt(posInDoc);
      _hideBubble();
    });

    // Keyboard
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        editor.commands.acceptKiSuggestionAt(posInDoc);
        _hideBubble();
        document.removeEventListener('keydown', onKey, true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        editor.commands.rejectKiSuggestionAt(posInDoc);
        _hideBubble();
        document.removeEventListener('keydown', onKey, true);
      }
    };
    document.addEventListener('keydown', onKey, true);

    // Outside-click
    setTimeout(() => {
      const onOutside = (e) => {
        if (!bubble.contains(e.target) && !markEl.contains(e.target)) {
          _hideBubble();
          document.removeEventListener('mousedown', onOutside, true);
          document.removeEventListener('keydown', onKey, true);
        }
      };
      document.addEventListener('mousedown', onOutside, true);
    }, 50);
  }

  async function _setWirkungAsync(kiProtokollId, wirkung) {
    if (!kiProtokollId) return;
    try {
      const url = window.PROVA_CONFIG?.SUPABASE_URL;
      if (!url) return;
      const session = await (await import('https://esm.sh/@supabase/supabase-js@2.105.0'))
        .createClient(url, window.PROVA_CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true } })
        .auth.getSession();
      const tok = session.data?.session?.access_token;
      if (!tok) return;
      await fetch(`${url}/functions/v1/set-ki-wirkung`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': window.PROVA_CONFIG.SUPABASE_ANON_KEY },
        body: JSON.stringify({ ki_protokoll_id: kiProtokollId, wirkung })
      });
    } catch (e) {
      console.warn('[prova-ki-suggestion] set-ki-wirkung failed', e);
    }
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  global.ProvaKiSuggestionFactory = ProvaKiSuggestionFactory;
})(typeof window !== 'undefined' ? window : globalThis);
