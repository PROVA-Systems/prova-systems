/**
 * PROVA Externe Dokumente Upload-UI (MEGA⁶⁸ Item 6.2)
 *
 * Drag-Drop-Zone für externe Dokumente (Klageschrift, Beweisbeschluss, Gegen-Gutachten).
 * Schritte: Upload → Storage → anhaenge-Row → anhang-process Edge Fn.
 *
 * API:
 *   new ProvaExterneDokumente(container, { auftragId }).render()
 *   inst.refresh() → reload list
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-externe-dokumente-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-externe-dokumente-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-externe-dokumente.css';
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

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  const ANHANG_TYPEN = [
    'klageschrift','klageerwiderung','beweisbeschluss','vertrag','rechnung_extern',
    'korrespondenz_email','korrespondenz_brief','bautagebuch','leistungsverzeichnis',
    'fremd_gutachten','foto_extern','plan','norm_dokument','protokoll','sonstiges'
  ];

  class ProvaExterneDokumente {
    constructor(container, opts = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      this.auftragId = opts.auftragId;
      this.workspaceId = opts.workspaceId || null;
      if (!this.container) throw new Error('container required');
      _injectStyle();
      this.render();
      if (this.auftragId) this._loadList();
    }

    render() {
      this.container.innerHTML = `
        <div class="ext-dok">
          <header class="ext-head">
            <h3>Externe Dokumente</h3>
            <p class="hint">Beweisbeschluss, Klageschrift, Gegen-Gutachten, Korrespondenz. KI extrahiert Text + ordnet Beweisfragen zu.</p>
          </header>
          <div class="ext-drop" id="ext-drop">
            <input type="file" id="ext-file" multiple accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none">
            <div class="drop-inner">
              <div class="drop-icon">📎</div>
              <div><strong>Dateien hier ablegen</strong> oder <a href="#" id="ext-browse">durchsuchen</a></div>
              <div class="drop-sub">PDF · JPG · PNG · DOCX</div>
            </div>
          </div>
          <div class="ext-list" id="ext-list"><div class="empty">Lade…</div></div>
        </div>
      `;
      const drop = this.container.querySelector('#ext-drop');
      const file = this.container.querySelector('#ext-file');
      this.container.querySelector('#ext-browse').addEventListener('click', (e) => { e.preventDefault(); file.click(); });
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-drag'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('is-drag');
        this._handleFiles(e.dataTransfer.files);
      });
      file.addEventListener('change', (e) => this._handleFiles(e.target.files));
    }

    async _handleFiles(fileList) {
      if (!this.auftragId) { alert('Auftrag-ID fehlt'); return; }
      for (const f of fileList) {
        await this._uploadOne(f);
      }
      await this._loadList();
    }

    async _uploadOne(file) {
      const list = this.container.querySelector('#ext-list');
      const tmp = document.createElement('div');
      tmp.className = 'ext-item ext-item--uploading';
      tmp.innerHTML = `<span class="name">${_esc(file.name)}</span> <span class="status">Lade hoch…</span>`;
      list.prepend(tmp);

      try {
        const sb = await _getSb();
        // Get workspace_id
        let wid = this.workspaceId;
        if (!wid) {
          const { data: a } = await sb.from('auftraege').select('workspace_id').eq('id', this.auftragId).maybeSingle();
          wid = a?.workspace_id;
          this.workspaceId = wid;
        }
        if (!wid) throw new Error('workspace_id nicht ermittelt');

        // Storage upload
        const ext = file.name.split('.').pop() || 'bin';
        const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
        const path = `${wid}/${this.auftragId}/${Date.now()}_${safe}`;
        const { error: upErr } = await sb.storage.from('sv-files').upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;

        // anhaenge-INSERT
        const guessTyp = _guessTyp(file.name);
        const { data: row, error: insErr } = await sb.from('anhaenge').insert({
          workspace_id: wid,
          auftrag_id: this.auftragId,
          typ: guessTyp,
          herkunft: 'manuell_upload',
          storage_bucket: 'sv-files',
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type,
          bytes: file.size,
          vertraulich: true
        }).select('id').single();
        if (insErr) throw insErr;

        tmp.querySelector('.status').textContent = 'KI analysiert…';

        // anhang-process Edge Function aufrufen (Async)
        try {
          const { data: { session } } = await sb.auth.getSession();
          const tok = session?.access_token;
          await fetch(`${window.PROVA_CONFIG.SUPABASE_URL}/functions/v1/anhang-process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': window.PROVA_CONFIG.SUPABASE_ANON_KEY },
            body: JSON.stringify({ anhang_id: row.id })
          });
        } catch (e) { console.warn('[ext-dok] anhang-process failed:', e); }

        tmp.remove();
      } catch (e) {
        tmp.classList.remove('ext-item--uploading');
        tmp.classList.add('ext-item--error');
        tmp.querySelector('.status').textContent = 'Fehler: ' + (e.message || e);
      }
    }

    async _loadList() {
      const list = this.container.querySelector('#ext-list');
      if (!this.auftragId) { list.innerHTML = '<div class="empty">Kein Auftrag.</div>'; return; }
      list.innerHTML = '<div class="empty">Lade…</div>';
      try {
        const sb = await _getSb();
        const { data, error } = await sb.from('anhaenge')
          .select('id, typ, original_filename, beschreibung, tags, absender, empfangsdatum, ocr_completed_at, vertraulich, uploaded_at')
          .eq('auftrag_id', this.auftragId)
          .is('deleted_at', null)
          .order('uploaded_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!data || data.length === 0) { list.innerHTML = '<div class="empty">Noch keine externen Dokumente.</div>'; return; }
        list.innerHTML = data.map(a => {
          const tags = Array.isArray(a.tags) ? a.tags : [];
          const beweisMatches = tags.filter(t => t.startsWith('beweisfrage:'));
          const otherTags = tags.filter(t => !t.startsWith('beweisfrage:'));
          return `<div class="ext-item" data-id="${_esc(a.id)}">
            <div class="ext-row">
              <span class="ext-typ ext-typ--${_esc(a.typ)}">${_esc(a.typ)}</span>
              <span class="ext-name">${_esc(a.beschreibung || a.original_filename)}</span>
              ${a.vertraulich ? '<span class="ext-conf" title="Vertraulich">🔒</span>' : ''}
              ${a.ocr_completed_at ? '<span class="ext-ocr" title="OCR fertig">✓</span>' : '<span class="ext-ocr ext-ocr--pending" title="OCR läuft">⏳</span>'}
            </div>
            <div class="ext-meta">
              ${a.absender ? `Absender: ${_esc(a.absender)} · ` : ''}
              ${a.empfangsdatum ? `Empfangen: ${_esc(a.empfangsdatum)} · ` : ''}
              ${otherTags.length > 0 ? otherTags.slice(0, 5).map(t => `<span class="tag">${_esc(t)}</span>`).join('') : ''}
              ${beweisMatches.length > 0 ? `<span class="bf-match">→ ${beweisMatches.length} Beweisfrage(n)</span>` : ''}
            </div>
            <div class="ext-actions">
              <button type="button" data-action="open" data-id="${_esc(a.id)}">Öffnen</button>
            </div>
          </div>`;
        }).join('');
        list.querySelectorAll('[data-action="open"]').forEach(btn => {
          btn.addEventListener('click', () => {
            if (window.ProvaAnhangLightbox?.open) {
              window.ProvaAnhangLightbox.open(btn.dataset.id);
            } else {
              alert('Anhang-Lightbox nicht geladen');
            }
          });
        });
      } catch (e) {
        list.innerHTML = `<div class="empty error">Fehler: ${_esc(e.message)}</div>`;
      }
    }

    refresh() { this._loadList(); }
  }

  function _guessTyp(filename) {
    const lc = filename.toLowerCase();
    if (lc.includes('klage')) return lc.includes('erwider') ? 'klageerwiderung' : 'klageschrift';
    if (lc.includes('beweisbeschluss')) return 'beweisbeschluss';
    if (lc.includes('gutachten') || lc.includes('gutacht')) return 'fremd_gutachten';
    if (lc.includes('vertrag')) return 'vertrag';
    if (lc.includes('rechnung')) return 'rechnung_extern';
    if (lc.includes('protokoll')) return 'protokoll';
    if (lc.includes('mail') || lc.includes('email')) return 'korrespondenz_email';
    return 'sonstiges';
  }

  global.ProvaExterneDokumente = ProvaExterneDokumente;
})(typeof window !== 'undefined' ? window : globalThis);
