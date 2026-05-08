/**
 * PROVA Editor-TipTap (MEGA⁴⁰ P1.2)
 *
 * High-Level-Wrapper über `lib/prova-editor.js` (TipTap v2 Foundation aus M¹⁵)
 * mit Backend-Sync via document-save / document-load Lambdas.
 *
 * Features:
 *   - Auto-Save 5s debounced gegen /document-save
 *   - Save-Status-Indicator (idle / saving / saved / error)
 *   - Versions-UI (letzte 10 Saves, Click → Load)
 *   - 3-Wege-System weg_a / weg_b / weg_c
 *   - JSONB-Storage (TipTap-JSON, kein HTML)
 *
 * Public API:
 *   ProvaEditorTipTap.mount({
 *     el, documentId?, auftragId?, weg, titel?,
 *     content?, locked_sections?, autoSaveMs?, onSaved?, onError?
 *   })
 *     → instance mit { editor, save(), reload(), loadVersion(n), destroy() }
 *
 *   ProvaEditorTipTap.SAVE_DEBOUNCE_MS = 5000
 *
 * Storage-Format: TipTap-JSON (NICHT HTML) — non-negotiable lt. M⁴⁰ Master-Prompt
 *
 * Endpoints:
 *   POST /.netlify/functions/document-save  → { document_id, version_nr, byte_size, updated_at }
 *   GET  /.netlify/functions/document-load?id=...&version=  → { document, versions[] }
 */
'use strict';

(function () {

  const SAVE_DEBOUNCE_MS = 5000;
  const VALID_WEGE = ['weg_a', 'weg_b', 'weg_c'];
  const SAVE_ENDPOINT = '/.netlify/functions/document-save';
  const LOAD_ENDPOINT = '/.netlify/functions/document-load';
  const STYLE_ID = 'prova-editor-tiptap-style';

  const _hasWindow = typeof window !== 'undefined';
  const _hasDoc = typeof document !== 'undefined';

  function _debounce(fn, ms) {
    let t = null;
    const debounced = function () {
      const args = arguments;
      const ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(() => { t = null; fn.apply(ctx, args); }, ms);
    };
    debounced.cancel = () => { if (t) { clearTimeout(t); t = null; } };
    debounced.flush = function () {
      if (t) { clearTimeout(t); t = null; fn.apply(this, arguments); }
    };
    return debounced;
  }

  // CommonJS-Export (für Node-Tests) — VOR Window-Referenz, sodass require() nicht crasht
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SAVE_DEBOUNCE_MS,
      VALID_WEGE,
      SAVE_ENDPOINT,
      LOAD_ENDPOINT,
      _debounce
    };
  }

  if (!_hasWindow || !_hasDoc) return;  // Node-Test-Stop hier

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/lib/editor-tiptap.css';
    document.head.appendChild(link);
  }

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

  async function _post(url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const tok = _getAuthToken();
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = { raw: text }; }
    if (!res.ok) {
      const err = new Error((json && json.error) || ('HTTP ' + res.status));
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  async function _get(url) {
    const headers = {};
    const tok = _getAuthToken();
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    const res = await fetch(url, { method: 'GET', headers });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = { raw: text }; }
    if (!res.ok) {
      const err = new Error((json && json.error) || ('HTTP ' + res.status));
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  function _buildStatusBar(state) {
    const bar = document.createElement('div');
    bar.className = 'pet-status-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');

    const statusEl = document.createElement('span');
    statusEl.className = 'pet-status pet-status--idle';
    statusEl.textContent = 'Bereit';
    bar.appendChild(statusEl);

    const titelInput = document.createElement('input');
    titelInput.type = 'text';
    titelInput.className = 'pet-titel-input';
    titelInput.placeholder = 'Dokument-Titel…';
    titelInput.value = state.titel || '';
    titelInput.setAttribute('aria-label', 'Dokument-Titel');
    bar.appendChild(titelInput);

    const versionsBtn = document.createElement('button');
    versionsBtn.type = 'button';
    versionsBtn.className = 'pet-versions-btn';
    versionsBtn.textContent = 'Versionen';
    versionsBtn.setAttribute('aria-label', 'Versions-Historie anzeigen');
    bar.appendChild(versionsBtn);

    const saveNowBtn = document.createElement('button');
    saveNowBtn.type = 'button';
    saveNowBtn.className = 'pet-save-now-btn';
    saveNowBtn.textContent = 'Jetzt speichern';
    saveNowBtn.setAttribute('aria-label', 'Jetzt speichern');
    bar.appendChild(saveNowBtn);

    return { bar, statusEl, titelInput, versionsBtn, saveNowBtn };
  }

  function _setStatus(statusEl, kind, text) {
    statusEl.className = 'pet-status pet-status--' + kind;
    statusEl.textContent = text;
  }

  function _buildVersionsPanel() {
    const panel = document.createElement('div');
    panel.className = 'pet-versions-panel';
    panel.setAttribute('aria-label', 'Versions-Historie');
    panel.hidden = true;
    panel.innerHTML = '<div class="pet-versions-title">Letzte Saves</div><ul class="pet-versions-list" role="list"></ul>';
    return panel;
  }

  function _renderVersions(panel, versions, onLoad) {
    const list = panel.querySelector('.pet-versions-list');
    list.innerHTML = '';
    const top10 = (versions || []).slice(0, 10);
    if (top10.length === 0) {
      list.innerHTML = '<li class="pet-versions-empty">Noch keine Versionen.</li>';
      return;
    }
    top10.forEach(v => {
      const li = document.createElement('li');
      li.className = 'pet-versions-item';
      const ts = v.saved_at ? new Date(v.saved_at) : null;
      const tsStr = ts ? ts.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' }) : '—';
      const kb = v.byte_size != null ? Math.round(v.byte_size / 102.4) / 10 + ' KB' : '';
      li.innerHTML = '<span class="pet-versions-nr">v' + v.version_nr + '</span>' +
                     '<span class="pet-versions-ts">' + tsStr + '</span>' +
                     '<span class="pet-versions-size">' + kb + '</span>';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pet-versions-load';
      btn.textContent = 'Laden';
      btn.setAttribute('aria-label', 'Version ' + v.version_nr + ' laden');
      btn.addEventListener('click', (e) => { e.preventDefault(); onLoad(v.version_nr); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  /**
   * Mount Editor + Backend-Sync.
   *
   * @param {Object} opts
   * @param {Element|string} opts.el — Container
   * @param {string?} opts.documentId — bestehendes Doc oder null = neu
   * @param {string?} opts.auftragId — optional verknüpfter Auftrag
   * @param {string} opts.weg — 'weg_a' | 'weg_b' | 'weg_c'
   * @param {string?} opts.titel
   * @param {Object?} opts.content — TipTap-JSON-Doc
   * @param {Array?} opts.locked_sections
   * @param {number?} opts.autoSaveMs — default 5000
   * @param {Function?} opts.onSaved — (resp) => {}
   * @param {Function?} opts.onError — (err) => {}
   */
  async function mount(opts) {
    if (!opts || !opts.el) throw new Error('[ProvaEditorTipTap] opts.el required');
    if (!opts.weg || VALID_WEGE.indexOf(opts.weg) === -1) {
      throw new Error('[ProvaEditorTipTap] opts.weg muss weg_a|weg_b|weg_c sein');
    }
    const el = typeof opts.el === 'string' ? document.querySelector(opts.el) : opts.el;
    if (!el) throw new Error('[ProvaEditorTipTap] element not found');

    if (!window.ProvaEditor || typeof window.ProvaEditor.create !== 'function') {
      throw new Error('[ProvaEditorTipTap] ProvaEditor (lib/prova-editor.js) nicht geladen');
    }

    _injectStyle();

    const state = {
      documentId: opts.documentId || null,
      auftragId: opts.auftragId || null,
      weg: opts.weg,
      titel: opts.titel || '',
      lockedSections: Array.isArray(opts.locked_sections) ? opts.locked_sections : [],
      currentVersion: 0,
      versions: [],
      pendingChange: false,
      destroyed: false
    };

    el.innerHTML = '';
    el.classList.add('pet-wrap');

    const status = _buildStatusBar(state);
    el.appendChild(status.bar);

    const editorEl = document.createElement('div');
    editorEl.className = 'pet-editor-host';
    el.appendChild(editorEl);

    const versionsPanel = _buildVersionsPanel();
    el.appendChild(versionsPanel);

    // Initial-Content: aus opts.content (TipTap-JSON) oder leer
    const initialContent = opts.content && typeof opts.content === 'object'
      ? opts.content
      : { type: 'doc', content: [{ type: 'paragraph' }] };

    // ProvaEditor.create akzeptiert HTML oder JSON; wir bevorzugen JSON
    const editor = await window.ProvaEditor.create({
      el: editorEl,
      content: initialContent,
      placeholder: 'Hier tippen — Auto-Save alle 5 Sekunden…',
      onUpdate: (html, json) => {
        state.pendingChange = true;
        _setStatus(status.statusEl, 'dirty', 'Bearbeitung…');
        debouncedSave();
      }
    });

    async function save() {
      if (state.destroyed) return null;
      if (!editor || editor._isFallback) return null;
      _setStatus(status.statusEl, 'saving', 'Speichere…');
      try {
        const json = editor.getJSON();
        const body = {
          weg: state.weg,
          content_json: json,
          titel: status.titelInput.value || state.titel || 'Unbenanntes Dokument'
        };
        if (state.documentId) body.document_id = state.documentId;
        if (state.auftragId) body.auftrag_id = state.auftragId;
        if (state.lockedSections.length > 0) body.locked_sections = state.lockedSections;

        const resp = await _post(SAVE_ENDPOINT, body);

        state.documentId = resp.document_id;
        state.currentVersion = resp.version_nr || state.currentVersion;
        state.titel = resp.titel || state.titel;
        state.pendingChange = false;
        _setStatus(status.statusEl, 'saved', 'Gespeichert · v' + state.currentVersion);

        // Versions-Liste invalidieren — wird beim nächsten Öffnen neu geladen
        if (!versionsPanel.hidden) await reloadVersions();

        if (typeof opts.onSaved === 'function') {
          try { opts.onSaved(resp); } catch (_) {}
        }
        return resp;
      } catch (e) {
        _setStatus(status.statusEl, 'error', 'Fehler: ' + e.message);
        if (typeof opts.onError === 'function') {
          try { opts.onError(e); } catch (_) {}
        }
        return null;
      }
    }

    const debouncedSave = _debounce(save, opts.autoSaveMs || SAVE_DEBOUNCE_MS);

    async function reloadVersions() {
      if (!state.documentId) return;
      try {
        const resp = await _get(LOAD_ENDPOINT + '?id=' + encodeURIComponent(state.documentId));
        state.versions = resp.versions || [];
        _renderVersions(versionsPanel, state.versions, async (versionNr) => {
          await loadVersion(versionNr);
        });
      } catch (e) {
        if (typeof opts.onError === 'function') opts.onError(e);
      }
    }

    async function loadVersion(versionNr) {
      if (!state.documentId) return;
      _setStatus(status.statusEl, 'saving', 'Lade Version ' + versionNr + '…');
      try {
        const resp = await _get(LOAD_ENDPOINT + '?id=' + encodeURIComponent(state.documentId) + '&version=' + encodeURIComponent(versionNr));
        if (resp && resp.document && resp.document.content_json) {
          editor.setContent(resp.document.content_json);
          _setStatus(status.statusEl, 'saved', 'Version ' + versionNr + ' geladen');
        }
      } catch (e) {
        _setStatus(status.statusEl, 'error', 'Fehler: ' + e.message);
        if (typeof opts.onError === 'function') opts.onError(e);
      }
    }

    async function reload() {
      if (!state.documentId) return;
      try {
        const resp = await _get(LOAD_ENDPOINT + '?id=' + encodeURIComponent(state.documentId));
        if (resp && resp.document) {
          state.titel = resp.document.titel;
          state.weg = resp.document.weg;
          state.lockedSections = resp.document.locked_sections || [];
          state.currentVersion = resp.document.current_version || 0;
          status.titelInput.value = state.titel || '';
          if (resp.document.content_json) editor.setContent(resp.document.content_json);
          state.versions = resp.versions || [];
          if (!versionsPanel.hidden) {
            _renderVersions(versionsPanel, state.versions, async (vnr) => loadVersion(vnr));
          }
          _setStatus(status.statusEl, 'saved', 'Geladen · v' + state.currentVersion);
        }
      } catch (e) {
        _setStatus(status.statusEl, 'error', 'Lade-Fehler: ' + e.message);
      }
    }

    // Wire UI-Buttons
    status.titelInput.addEventListener('input', () => {
      state.pendingChange = true;
      _setStatus(status.statusEl, 'dirty', 'Bearbeitung…');
      debouncedSave();
    });

    status.saveNowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      debouncedSave.cancel();
      save();
    });

    status.versionsBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      versionsPanel.hidden = !versionsPanel.hidden;
      if (!versionsPanel.hidden) await reloadVersions();
    });

    // Initial: wenn documentId gegeben, lade existing Doc
    if (state.documentId) {
      await reload();
    }

    // Page-Unload: pending Save flushen
    function _onUnload() {
      try { debouncedSave.flush(); } catch (_) {}
    }
    window.addEventListener('beforeunload', _onUnload);

    return {
      editor: editor,
      save: save,
      reload: reload,
      loadVersion: loadVersion,
      getDocumentId: () => state.documentId,
      getCurrentVersion: () => state.currentVersion,
      getState: () => ({ ...state }),
      destroy: () => {
        state.destroyed = true;
        try { debouncedSave.cancel(); } catch (_) {}
        try { editor.destroy(); } catch (_) {}
        window.removeEventListener('beforeunload', _onUnload);
      }
    };
  }

  // Public API
  window.ProvaEditorTipTap = {
    mount: mount,
    SAVE_DEBOUNCE_MS: SAVE_DEBOUNCE_MS,
    VALID_WEGE: VALID_WEGE,
    SAVE_ENDPOINT: SAVE_ENDPOINT,
    LOAD_ENDPOINT: LOAD_ENDPOINT
  };

  // Test-Exports (Internals — nur für Tests)
  window.ProvaEditorTipTap._test = {
    _debounce,
    _post,
    _get,
    _setStatus,
    _renderVersions,
    _buildVersionsPanel,
    _buildStatusBar
  };

})();
