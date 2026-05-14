/**
 * PROVA Anhang-Lightbox (MEGA⁶⁸ Item 6.4)
 *
 * Modal mit PDF-Embed / Image-View + OCR-Text + Meta-Daten.
 *
 * API:
 *   ProvaAnhangLightbox.open(anhangId)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-anhang-lightbox-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-anhang-lightbox-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-anhang-lightbox.css';
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

  const ProvaAnhangLightbox = {
    async open(anhangId) {
      if (!anhangId) return;
      if (this._active) return;
      _injectStyle();

      const overlay = document.createElement('div');
      overlay.className = 'prova-anhang-overlay';
      overlay.innerHTML = `<div class="prova-anhang-modal"><div class="loading">Lade…</div></div>`;
      document.body.appendChild(overlay);
      this._active = overlay;

      const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this._active = null;
        document.removeEventListener('keydown', onKey, true);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      try {
        const sb = await _getSb();
        const { data: a } = await sb.from('anhaenge')
          .select('id, workspace_id, auftrag_id, typ, herkunft, storage_bucket, storage_path, mime_type, original_filename, beschreibung, tags, ocr_text, ocr_confidence, extracted_data, absender, empfangsdatum, aktenzeichen_extern, vertraulich, uploaded_at')
          .eq('id', anhangId)
          .maybeSingle();
        if (!a) {
          overlay.querySelector('.prova-anhang-modal').innerHTML = `<div class="error">Anhang nicht gefunden</div>`;
          return;
        }
        const signedRes = await sb.storage.from(a.storage_bucket).createSignedUrl(a.storage_path, 600);
        const url = signedRes.data?.signedUrl || '';
        const isImg = (a.mime_type || '').startsWith('image/');
        const isPdf = (a.mime_type || '').includes('pdf');

        const modal = overlay.querySelector('.prova-anhang-modal');
        const tags = Array.isArray(a.tags) ? a.tags : [];
        modal.innerHTML = `
          <header class="anh-head">
            <div>
              <h2>${_esc(a.beschreibung || a.original_filename)}</h2>
              <div class="anh-sub">
                <span class="anh-typ anh-typ--${_esc(a.typ)}">${_esc(a.typ)}</span>
                ${a.vertraulich ? '<span class="anh-conf">🔒 Vertraulich</span>' : ''}
                <span>${_esc(a.original_filename)}</span>
                ${a.aktenzeichen_extern ? `<span>AZ-Extern: <code>${_esc(a.aktenzeichen_extern)}</code></span>` : ''}
              </div>
            </div>
            <button type="button" class="close" aria-label="Schließen">✕</button>
          </header>
          <div class="anh-body">
            <div class="anh-preview">
              ${isPdf ? `<iframe src="${_esc(url)}" class="anh-pdf"></iframe>`
                : isImg ? `<img src="${_esc(url)}" alt="${_esc(a.original_filename)}">`
                : `<div class="anh-noview"><a href="${_esc(url)}" target="_blank" rel="noopener">⇣ Herunterladen</a></div>`}
            </div>
            <div class="anh-side">
              ${a.absender ? `<div class="meta-row"><strong>Absender:</strong> ${_esc(a.absender)}</div>` : ''}
              ${a.empfangsdatum ? `<div class="meta-row"><strong>Empfangen:</strong> ${_esc(a.empfangsdatum)}</div>` : ''}
              <div class="meta-row"><strong>Hochgeladen:</strong> ${_esc(new Date(a.uploaded_at).toLocaleString('de-DE'))}</div>
              ${tags.length > 0 ? `<div class="meta-row"><strong>Tags:</strong><br>${tags.map(t => `<span class="tag">${_esc(t)}</span>`).join(' ')}</div>` : ''}
              ${a.ocr_text ? `
                <div class="meta-row ocr">
                  <strong>OCR-Text${a.ocr_confidence ? ' (' + Math.round(a.ocr_confidence * 100) + '%)' : ''}:</strong>
                  <div class="ocr-text">${_esc(a.ocr_text)}</div>
                </div>` : '<div class="meta-row"><em>OCR läuft oder nicht verfügbar</em></div>'}
              <div class="anh-foot">
                <a href="${_esc(url)}" download="${_esc(a.original_filename)}" class="btn-dl">⇣ Herunterladen</a>
              </div>
            </div>
          </div>
        `;
        modal.querySelector('.close').addEventListener('click', close);
      } catch (e) {
        overlay.querySelector('.prova-anhang-modal').innerHTML = `<div class="error">Fehler: ${_esc(e.message)}</div>`;
      }
    }
  };

  global.ProvaAnhangLightbox = ProvaAnhangLightbox;

  // Listen auf prova:wikilink-clicked mit targetType=anhang
  if (typeof document !== 'undefined') {
    document.addEventListener('prova:wikilink-clicked', (e) => {
      if (e.detail?.targetType === 'anhang' && e.detail?.targetId) {
        const id = e.detail.targetId.startsWith('anhang:') ? e.detail.targetId.slice(7) : e.detail.targetId;
        ProvaAnhangLightbox.open(id);
      }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
