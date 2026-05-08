/**
 * PROVA Editor-Spell-Layer (MEGA⁴⁰ P6)
 *
 * 2-Schicht-Rechtschreibung + Konjunktiv-II:
 *   Layer 1: Browser-Native-Spellcheck (de-DE) — IMMER aktiv (lang="de-DE",
 *            spellcheck="true" auf .prova-editor-content via DOM-Attribute)
 *   Layer 2: KI-Backstop S1 (model='schnell' = gpt-5.5-instant) — On-Klick
 *   Layer 3: Konjunktiv-II-Validator S3 (model='praezise' = gpt-5.5)
 *            Begründungs-Box NICHT-kopierbar (user-select:none + contextmenu/copy block)
 *
 * KEIN gpt-4o (deprecated Feb 2026 lt. M⁴⁰ Master-Prompt).
 * Nutzt M³⁹-Lib lib/ki-werkzeug-stufen.js (s3_konjunktiv_ii + showBegruendung).
 *
 * Public API (window.ProvaEditorSpellLayer):
 *   enableBrowserSpellcheck(editor) — setzt lang+spellcheck auf .prova-editor-content
 *   runKiBackstop(editor, opts?) — POST /ki-proxy purpose=s1_rechtschreibung
 *   runKonjunktivCheck(editor, opts?) — POST /ki-proxy purpose=s3_konjunktiv_ii
 *
 *   Beide rendern Begründungs-Box (nicht-kopierbar) bei Treffer.
 */
'use strict';

(function () {

  const SPELL_BACKSTOP_PURPOSE = 's1_rechtschreibung';  // gpt-5.5-instant
  const KONJUNKTIV_PURPOSE = 's3_konjunktiv_ii';        // gpt-5.5

  /**
   * Layer 1: Browser-Native Spellcheck.
   * Setzt lang="de-DE" + spellcheck="true" auf den Editor-Content-Container.
   *
   * @param {Object} editor — ProvaEditor-Instance (mit ._instance.view.dom)
   */
  function enableBrowserSpellcheck(editor) {
    if (!editor || !editor._instance) return false;
    const tt = editor._instance;
    const dom = tt.view && tt.view.dom;
    if (!dom) return false;
    dom.setAttribute('lang', 'de-DE');
    dom.setAttribute('spellcheck', 'true');
    return true;
  }

  /**
   * Auth-Token-Resolver (Netlify-Identity oder Supabase-LocalStorage).
   */
  function _getAuthToken() {
    try {
      if (window.netlifyIdentity && window.netlifyIdentity.currentUser) {
        const u = window.netlifyIdentity.currentUser();
        if (u && u.token && u.token.access_token) return u.token.access_token;
      }
    } catch (_) {}
    try {
      const t = localStorage.getItem('sb-access-token') || localStorage.getItem('supabase.auth.token');
      if (t) return t;
    } catch (_) {}
    return null;
  }

  async function _kiProxyCall(purpose, body) {
    const headers = { 'Content-Type': 'application/json' };
    const tok = _getAuthToken();
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    const res = await fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers,
      body: JSON.stringify(Object.assign({ purpose: purpose }, body))
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = { raw: text }; }
    if (!res.ok) {
      const err = new Error((json && json.error) || ('HTTP ' + res.status));
      err.status = res.status;
      throw err;
    }
    return json;
  }

  /**
   * Layer 2: KI-Backstop S1 — Rechtschreibung/Komma/Grammatik.
   * Model: 'schnell' (gpt-5.5-instant). Live-tauglich (≤2s Antwort erwartet).
   *
   * @param {Object} editor
   * @param {Object} [opts] - { onResult?: (data) => void, onError?: (err) => void }
   */
  async function runKiBackstop(editor, opts) {
    opts = opts || {};
    if (!editor || !editor._instance) {
      if (opts.onError) opts.onError(new Error('Editor nicht initialisiert'));
      return;
    }
    const text = editor._instance.getText ? editor._instance.getText() : (editor.getHTML ? _stripTags(editor.getHTML()) : '');
    if (!text || text.trim().length < 10) {
      if (opts.onResult) opts.onResult({ ok: false, error: 'Text zu kurz' });
      return;
    }

    try {
      const data = await _kiProxyCall(SPELL_BACKSTOP_PURPOSE, { prompt: text, model: 'schnell' });
      if (opts.onResult) opts.onResult(Object.assign({ ok: true }, data));
      if (data && data.suggestions && data.suggestions.length > 0) {
        _renderSpellSuggestions(data.suggestions);
      }
    } catch (e) {
      if (opts.onError) opts.onError(e);
    }
  }

  /**
   * Layer 3: Konjunktiv-II-Validator (NUR §6 Fachurteil).
   * Model: 'praezise' (gpt-5.5). Begründungs-Box nicht-kopierbar.
   *
   * @param {Object} editor
   * @param {Object} [opts] - { onResult?: (data) => void, onError?: (err) => void }
   */
  async function runKonjunktivCheck(editor, opts) {
    opts = opts || {};
    if (!editor || !editor._instance) {
      if (opts.onError) opts.onError(new Error('Editor nicht initialisiert'));
      return;
    }
    const text = editor._instance.getText ? editor._instance.getText() : '';
    if (!text || text.trim().length < 100) {
      if (opts.onResult) opts.onResult({ ok: false, error: 'Text zu kurz für Konjunktiv-II-Check (min 100 Zeichen)' });
      return;
    }

    try {
      const data = await _kiProxyCall(KONJUNKTIV_PURPOSE, { prompt: text, model: 'praezise' });
      if (opts.onResult) opts.onResult(Object.assign({ ok: true }, data));
      if (data && data.begruendung) {
        // Nutze M³⁹-Lib showBegruendung (nicht-kopierbar) wenn verfügbar
        if (window.PROVA_KI_WERKZEUG && typeof window.PROVA_KI_WERKZEUG.showBegruendung === 'function') {
          window.PROVA_KI_WERKZEUG.showBegruendung(data.begruendung, data.vorschlag || '', { titel: 'Konjunktiv-II-Hinweis' });
        } else {
          _renderBegruendungFallback(data.begruendung, data.vorschlag);
        }
      }
    } catch (e) {
      if (opts.onError) opts.onError(e);
    }
  }

  function _stripTags(html) {
    if (!html) return '';
    return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function _renderSpellSuggestions(suggestions) {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return;
    const overlay = document.createElement('div');
    overlay.className = 'pesl-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:#1c2130;color:#eaecf4;border-radius:10px;max-width:520px;width:100%;padding:20px;font-family:Inter,sans-serif;';
    wrap.innerHTML =
      '<h3 style="font-size:15px;margin-bottom:12px;color:#4f8ef7;">📝 Rechtschreib-Vorschläge (' + suggestions.length + ')</h3>' +
      '<ul style="list-style:none;padding:0;margin:0 0 14px;">' +
      suggestions.map(s =>
        '<li style="padding:8px 0;border-bottom:1px dashed rgba(255,255,255,0.08);font-size:13px;">' +
        '<del style="color:#ef4444;">' + _esc(s.original || '') + '</del> → ' +
        '<strong style="color:#10b981;">' + _esc(s.korrektur || '') + '</strong>' +
        (s.regel ? '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">' + _esc(s.regel) + '</div>' : '') +
        '</li>'
      ).join('') +
      '</ul>' +
      '<button type="button" style="padding:8px 16px;background:#4f8ef7;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:600;">Schließen</button>';
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
    const closeBtn = wrap.querySelector('button');
    const close = () => overlay.parentNode && overlay.parentNode.removeChild(overlay);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  function _renderBegruendungFallback(begruendung, vorschlag) {
    if (typeof document === 'undefined') return;
    const overlay = document.createElement('div');
    overlay.className = 'pesl-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:#1c2130;color:#eaecf4;border-radius:10px;max-width:560px;width:100%;padding:22px;font-family:Inter,sans-serif;';

    const h = document.createElement('h3');
    h.style.cssText = 'font-size:15px;margin-bottom:12px;color:#a78bfa;';
    h.textContent = '⚠️ S3 KI-Hinweis — Konjunktiv II (NICHT zum Kopieren)';
    wrap.appendChild(h);

    const box = document.createElement('div');
    box.className = 'pesl-begruendung';
    box.style.cssText = 'background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.3);padding:14px;border-radius:8px;font-style:italic;font-size:13.5px;line-height:1.55;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;';
    box.textContent = begruendung;
    box.addEventListener('contextmenu', e => e.preventDefault());
    box.addEventListener('copy', e => e.preventDefault());
    box.addEventListener('cut', e => e.preventDefault());
    wrap.appendChild(box);

    const note = document.createElement('div');
    note.style.cssText = 'margin-top:12px;font-size:11px;color:#94a3b8;';
    note.textContent = '§ 407a ZPO: SV schreibt SELBST um. KI ist nur Hinweisgeber.';
    wrap.appendChild(note);

    const actions = document.createElement('div');
    actions.style.cssText = 'margin-top:14px;display:flex;justify-content:flex-end;';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Verstanden';
    closeBtn.style.cssText = 'padding:8px 18px;background:#4f8ef7;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:600;';
    actions.appendChild(closeBtn);
    wrap.appendChild(actions);

    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
    const close = () => overlay.parentNode && overlay.parentNode.removeChild(overlay);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Public API
  const api = {
    enableBrowserSpellcheck: enableBrowserSpellcheck,
    runKiBackstop: runKiBackstop,
    runKonjunktivCheck: runKonjunktivCheck,
    SPELL_BACKSTOP_PURPOSE: SPELL_BACKSTOP_PURPOSE,
    KONJUNKTIV_PURPOSE: KONJUNKTIV_PURPOSE,
    _stripTags: _stripTags,
    _esc: _esc
  };

  if (typeof window !== 'undefined') {
    window.ProvaEditorSpellLayer = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
