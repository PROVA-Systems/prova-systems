/**
 * PROVA — ki-werkzeug-stufen.js (MEGA³⁹ P6)
 *
 * KI-Verantwortungs-Stufen S1/S2/S3 (CLAUDE.md Regel 13):
 *   S1 Mechanisch    — Rechtschreibung/Komma/Grammatik (live, automatisch)
 *   S2 Strukturell   — Absätze/Überschriften (Opt-In mit Diff-Anzeige)
 *   S3 Inhaltlich    — Konjunktiv II / Halluzin / §407a / Fachsprache
 *                       (Opt-In mit nicht-kopierbarer Begründungs-Box)
 *
 * §407a-Doktrin:
 *   - 500 Char Min Eigenleistung enforced (Submit-Button bleibt disabled)
 *   - Begründungs-Box NICHT-kopierbar (user-select:none + contextmenu-block)
 *   - SV muss SELBST umschreiben — KI ist nur Hinweisgeber
 *
 * Public API (window.PROVA_KI_WERKZEUG):
 *   bindEditor(opts)  — opts={textarea, charCounter?, submitBtn?, minChars=500}
 *   unbindEditor(textarea)
 *
 *   s2_struktur_vorschlag(text)
 *   s3_konjunktiv_ii(text)
 *   s3_halluzinations_check(text, diktatOriginal)
 *   s3_407a_konsistenz(s4Text, s6Text)
 *   s3_fachsprache(text)
 *
 *   showDiff(originalText, vorgeschlagenText, opts?) — Modal mit Word-Diff
 *   showBegruendung(begruendung, vorschlag?, opts?) — Modal mit nicht-kopierbarer Box
 */
'use strict';

(function (root) {
  const DEFAULT_MIN_CHARS = 500;

  const PURPOSE_TO_S = {
    s2_struktur:           { stufe: 'S2', model: 'praezise' },
    s3_konjunktiv_ii:      { stufe: 'S3', model: 'praezise' },
    s3_halluzinations_check:{ stufe: 'S3', model: 'praezise' },
    s3_407a_konsistenz:    { stufe: 'S3', model: 'praezise' },
    s3_fachsprache:        { stufe: 'S3', model: 'praezise' }
  };

  function PROVA_KI_WERKZEUG_factory() {
    let _fetcher = null;
    function _setFetcherForTests(fn) { _fetcher = fn; }
    function fetcher() {
      if (_fetcher) return _fetcher;
      return (typeof window !== 'undefined') ? (window.provaFetch || window.fetch.bind(window)) : null;
    }

    async function _kiCall(purpose, body) {
      const f = fetcher();
      if (!f) return { ok: false, error: 'no fetcher' };
      try {
        const meta = PURPOSE_TO_S[purpose] || { model: 'praezise' };
        const resp = await f('/.netlify/functions/ki-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purpose, model: meta.model, ...body })
        });
        if (!resp.ok) return { ok: false, error: 'HTTP ' + resp.status };
        const data = await resp.json();
        return { ok: true, ...data };
      } catch (e) { return { ok: false, error: e.message }; }
    }

    async function s2_struktur_vorschlag(text) {
      return _kiCall('s2_struktur', { prompt: text });
    }
    async function s3_konjunktiv_ii(text) {
      return _kiCall('s3_konjunktiv_ii', { prompt: text });
    }
    async function s3_halluzinations_check(text, diktatOriginal) {
      return _kiCall('s3_halluzinations_check', { prompt: text, diktat_original: diktatOriginal || '' });
    }
    async function s3_407a_konsistenz(s4Text, s6Text) {
      return _kiCall('s3_407a_konsistenz', { s4_text: s4Text || '', s6_text: s6Text || '' });
    }
    async function s3_fachsprache(text) {
      return _kiCall('s3_fachsprache', { prompt: text });
    }

    // ── §407a 500-Char-Enforcement ────────────────────────────
    function bindEditor(opts) {
      opts = opts || {};
      const ta = (typeof opts.textarea === 'string' && typeof document !== 'undefined')
        ? document.querySelector(opts.textarea) : opts.textarea;
      if (!ta) throw new Error('bindEditor: textarea fehlt');
      const charCounter = (typeof opts.charCounter === 'string' && typeof document !== 'undefined')
        ? document.querySelector(opts.charCounter) : opts.charCounter;
      const submitBtn = (typeof opts.submitBtn === 'string' && typeof document !== 'undefined')
        ? document.querySelector(opts.submitBtn) : opts.submitBtn;
      const minChars = (typeof opts.minChars === 'number') ? opts.minChars : DEFAULT_MIN_CHARS;

      function update() {
        const len = (ta.value || '').length;
        if (charCounter) charCounter.textContent = String(len);
        if (submitBtn) {
          submitBtn.disabled = len < minChars;
          submitBtn.title = (len < minChars)
            ? ('Noch ' + (minChars - len) + ' Zeichen Eigenleistung nötig (§407a ZPO)')
            : '';
        }
      }
      ta.addEventListener('input', update);
      update();
      return { update, unbind: () => ta.removeEventListener('input', update) };
    }

    // ── S3 Begründungs-Box (NICHT-kopierbar) ──────────────────
    function showBegruendung(begruendung, vorschlag, opts) {
      opts = opts || {};
      if (typeof document === 'undefined') return null;
      const overlay = document.createElement('div');
      overlay.className = 'prova-ki-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';

      const modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;max-width:640px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;font-family:Inter,sans-serif;';

      const header = document.createElement('div');
      header.style.cssText = 'font-size:16px;font-weight:700;color:#1a3a6b;margin-bottom:12px;';
      header.textContent = '⚠️ S3 KI-Hinweis (nicht zum Kopieren)';
      modal.appendChild(header);

      // Begründungs-Box: NICHT kopierbar
      const box = document.createElement('div');
      box.className = 'ki-begruendung-box';
      box.style.cssText = 'background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.3);padding:14px;border-radius:8px;font-style:italic;color:#475569;font-size:14px;line-height:1.5;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;';
      box.textContent = begruendung;
      // copy-Block
      box.addEventListener('contextmenu', e => e.preventDefault());
      box.addEventListener('copy', e => e.preventDefault());
      box.addEventListener('cut', e => e.preventDefault());
      modal.appendChild(box);

      if (vorschlag) {
        const note = document.createElement('div');
        note.style.cssText = 'margin-top:14px;font-size:12px;color:#64748b;';
        note.textContent = 'Vorschlag: SV schreibt selbst um. "Übernehmen" als Notausgang.';
        modal.appendChild(note);
      }

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Verstanden';
      closeBtn.style.cssText = 'margin-top:18px;padding:10px 20px;background:#1a3a6b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;';
      closeBtn.addEventListener('click', () => overlay.remove());
      modal.appendChild(closeBtn);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      return overlay;
    }

    // ── S2 Diff-Modal (Word-Level-Diff) ──────────────────────
    function _wordDiff(orig, neu) {
      const a = orig.split(/(\s+)/);
      const b = neu.split(/(\s+)/);
      const out = [];
      let i = 0, j = 0;
      while (i < a.length || j < b.length) {
        if (a[i] === b[j]) { out.push({ op: 'eq', text: a[i] }); i++; j++; }
        else if (b[j] !== undefined && !a.includes(b[j], i)) { out.push({ op: 'add', text: b[j] }); j++; }
        else { out.push({ op: 'del', text: a[i] }); i++; }
      }
      return out;
    }

    function showDiff(originalText, vorgeschlagenText, opts) {
      opts = opts || {};
      if (typeof document === 'undefined') return null;
      const overlay = document.createElement('div');
      overlay.className = 'prova-ki-overlay prova-ki-diff';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';

      const modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;max-width:780px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;font-family:Inter,sans-serif;';

      const header = document.createElement('div');
      header.style.cssText = 'font-size:16px;font-weight:700;color:#1a3a6b;margin-bottom:12px;';
      header.textContent = '📐 S2 Struktur-Vorschlag (Diff)';
      modal.appendChild(header);

      const diffBox = document.createElement('div');
      diffBox.style.cssText = 'background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:8px;font-family:JetBrains Mono,monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;';
      const diff = _wordDiff(originalText || '', vorgeschlagenText || '');
      diff.forEach(d => {
        const span = document.createElement('span');
        if (d.op === 'add') {
          span.style.cssText = 'background:rgba(16,185,129,.18);color:#065f46;text-decoration:none;';
          span.textContent = d.text;
        } else if (d.op === 'del') {
          span.style.cssText = 'background:rgba(239,68,68,.18);color:#991b1b;text-decoration:line-through;';
          span.textContent = d.text;
        } else {
          span.textContent = d.text;
        }
        diffBox.appendChild(span);
      });
      modal.appendChild(diffBox);

      const actions = document.createElement('div');
      actions.style.cssText = 'margin-top:16px;display:flex;gap:10px;justify-content:flex-end;';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Ablehnen';
      cancelBtn.style.cssText = 'padding:10px 20px;background:transparent;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;color:#475569;';
      cancelBtn.addEventListener('click', () => { overlay.remove(); if (opts.onReject) opts.onReject(); });
      actions.appendChild(cancelBtn);
      const acceptBtn = document.createElement('button');
      acceptBtn.type = 'button';
      acceptBtn.textContent = 'Übernehmen';
      acceptBtn.style.cssText = 'padding:10px 20px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;';
      acceptBtn.addEventListener('click', () => { overlay.remove(); if (opts.onAccept) opts.onAccept(vorgeschlagenText); });
      actions.appendChild(acceptBtn);
      modal.appendChild(actions);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      return overlay;
    }

    return {
      bindEditor: bindEditor,
      s2_struktur_vorschlag: s2_struktur_vorschlag,
      s3_konjunktiv_ii: s3_konjunktiv_ii,
      s3_halluzinations_check: s3_halluzinations_check,
      s3_407a_konsistenz: s3_407a_konsistenz,
      s3_fachsprache: s3_fachsprache,
      showBegruendung: showBegruendung,
      showDiff: showDiff,
      _PURPOSE_TO_S: PURPOSE_TO_S,
      _DEFAULT_MIN_CHARS: DEFAULT_MIN_CHARS,
      _setFetcherForTests: _setFetcherForTests,
      _wordDiff: _wordDiff
    };
  }

  const instance = PROVA_KI_WERKZEUG_factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = instance;
    module.exports._factory = PROVA_KI_WERKZEUG_factory;
  }
  if (typeof root !== 'undefined') {
    root.PROVA_KI_WERKZEUG = instance;
  }
})(typeof self !== 'undefined' ? self : this);
