/**
 * PROVA Foto-Picker (MEGA⁶⁶ Item 4.7)
 *
 * Modal mit Thumbnail-Grid fuer Auftrag-Fotos.
 * Filter: alle / sachverhalt / befund / anhang.
 * Auswahl → insertFoto-Command (prova-foto-embed Extension MEGA⁶⁴).
 *
 * API:
 *   ProvaFotoPicker.open(editor, auftragId)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-foto-picker-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-foto-picker-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-foto-picker.css';
    document.head.appendChild(link);
  }

  async function _getSb() {
    if (_getSb._c) return _getSb._c;
    const url = window.PROVA_CONFIG?.SUPABASE_URL;
    const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
    const mod = await import('https://esm.sh/@supabase/supabase-js@2.105.0');
    _getSb._c = mod.createClient(url, key, { auth: { persistSession: true } });
    return _getSb._c;
  }

  async function _signedUrl(sb, bucket, path) {
    try {
      const { data } = await sb.storage.from(bucket).createSignedUrl(path, 3600);
      return data?.signedUrl || '';
    } catch (e) { return ''; }
  }

  const ProvaFotoPicker = {
    async open(editor, auftragId) {
      if (!editor || !auftragId) {
        alert('Editor + Auftrag-ID erforderlich');
        return;
      }
      if (ProvaFotoPicker._active) return;
      _injectStyle();

      const overlay = document.createElement('div');
      overlay.className = 'prova-foto-picker-overlay';
      overlay.innerHTML = `
        <div class="prova-foto-picker-modal">
          <header class="fp-head">
            <h2>Foto einfügen</h2>
            <div class="fp-filters">
              <button type="button" data-filter="" class="is-active">Alle</button>
              <button type="button" data-filter="sachverhalt">Sachverhalt</button>
              <button type="button" data-filter="befund">Befund</button>
              <button type="button" data-filter="anhang">Anhang</button>
            </div>
            <button type="button" class="fp-close" aria-label="Schließen">✕</button>
          </header>
          <div class="fp-grid">Lade…</div>
          <footer class="fp-foot"><span>Klick auf Foto → in Editor einfügen</span></footer>
        </div>
      `;
      document.body.appendChild(overlay);
      ProvaFotoPicker._active = overlay;

      const grid = overlay.querySelector('.fp-grid');
      let typFilter = '';

      function close() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        ProvaFotoPicker._active = null;
        document.removeEventListener('keydown', onKey, true);
      }
      function onKey(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('.fp-close').addEventListener('click', close);

      overlay.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          overlay.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          typFilter = btn.dataset.filter;
          load();
        });
      });

      async function load() {
        grid.innerHTML = '<div class="fp-empty">Lade…</div>';
        try {
          const sb = await _getSb();
          let q = sb.from('fotos')
            .select('id, storage_bucket, storage_path, thumbnail_path, original_filename, beschreibung, typ, beweisfrage_ref, captured_at')
            .eq('auftrag_id', auftragId)
            .is('deleted_at', null)
            .order('uploaded_at', { ascending: false })
            .limit(60);
          if (typFilter) q = q.eq('typ', typFilter);
          const { data, error } = await q;
          if (error) { grid.innerHTML = `<div class="fp-empty fp-err">Fehler: ${error.message}</div>`; return; }
          if (!data || data.length === 0) {
            grid.innerHTML = '<div class="fp-empty">Keine Fotos in diesem Auftrag.</div>';
            return;
          }
          grid.innerHTML = '';
          for (const f of data) {
            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'fp-tile';
            tile.innerHTML = `
              <div class="fp-thumb"><div class="fp-thumb-placeholder">📷</div></div>
              <div class="fp-meta">
                <div class="fp-name">${_esc(f.beschreibung || f.original_filename || 'Foto')}</div>
                <div class="fp-sub">${_esc(f.typ || '')} ${f.beweisfrage_ref ? '· ' + _esc(f.beweisfrage_ref) : ''}</div>
              </div>
            `;
            tile.addEventListener('click', async () => {
              const url = await _signedUrl(sb, f.storage_bucket, f.storage_path);
              editor.commands.insertFoto?.({
                fotoId: f.id,
                src: url,
                caption: f.beschreibung || f.original_filename || '',
                aufnahme: f.captured_at || null,
                bausteinOrt: f.beweisfrage_ref || null
              });
              close();
            });
            grid.appendChild(tile);
            // Async load Thumbnail
            (async () => {
              const u = await _signedUrl(sb, f.storage_bucket, f.thumbnail_path || f.storage_path);
              if (u) tile.querySelector('.fp-thumb').innerHTML = `<img src="${u}" alt="${_esc(f.beschreibung || '')}" loading="lazy">`;
            })();
          }
        } catch (e) {
          grid.innerHTML = `<div class="fp-empty fp-err">${e?.message || String(e)}</div>`;
        }
      }
      load();
    }
  };

  function _esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

  global.ProvaFotoPicker = ProvaFotoPicker;
})(typeof window !== 'undefined' ? window : globalThis);
