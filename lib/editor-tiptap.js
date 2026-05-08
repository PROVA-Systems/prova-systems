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

  const WEG_BADGE_TEXTS = {
    weg_a: 'A · Wizard',
    weg_b: 'B · Eigene Vorlage',
    weg_c: 'C · Hybrid'
  };

  function _buildStatusBar(state) {
    const bar = document.createElement('div');
    bar.className = 'pet-status-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');

    const statusEl = document.createElement('span');
    statusEl.className = 'pet-status pet-status--idle';
    statusEl.textContent = 'Bereit';
    bar.appendChild(statusEl);

    const wegBadge = document.createElement('button');
    wegBadge.type = 'button';
    wegBadge.className = 'pet-weg-badge pet-weg-badge--' + state.weg;
    wegBadge.textContent = WEG_BADGE_TEXTS[state.weg] || state.weg;
    wegBadge.title = 'Modus wechseln';
    wegBadge.setAttribute('aria-label', 'Modus wechseln (' + (WEG_BADGE_TEXTS[state.weg] || state.weg) + ')');
    bar.appendChild(wegBadge);

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

    return { bar, statusEl, wegBadge, titelInput, versionsBtn, saveNowBtn };
  }

  function _setStatus(statusEl, kind, text) {
    statusEl.className = 'pet-status pet-status--' + kind;
    statusEl.textContent = text;
  }

  /**
   * Erweiterte Toolbar: Image-Insert / Footnote / PageBreak / Color / Highlight / Font / ToC.
   * Wird zusätzlich zur ProvaEditor-Toolbar gerendert (zwischen Status-Bar und Editor).
   *
   * @param {Object} editor — ProvaEditor-Instance (mit ._instance = TipTap-Editor)
   * @param {Object} ext — ProvaEditorExtensions API (für ToC + autoNumber + collectHeadings)
   */
  function _buildExtendedToolbar(editor, ext, state) {
    state = state || { weg: 'weg_a', titel: 'PROVA-Dokument' };
    const bar = document.createElement('div');
    bar.className = 'pet-toolbar-ext';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Erweiterte Werkzeuge');

    const tt = editor._instance;
    if (!tt) return bar;

    const groups = [];

    // ── Image-Insert ──
    groups.push([
      { label: '🖼', title: 'Bild einfuegen (URL)', cmd: () => {
          const url = window.prompt('Bild-URL:');
          if (!url) return;
          const alt = window.prompt('Alt-Text (Accessibility-Pflicht):', '') || '';
          tt.chain().focus().setImage({ src: url, alt: alt }).run();
        }
      },
      { label: '📤', title: 'Bild hochladen', cmd: () => _triggerImageUpload(tt) }
    ]);

    // ── Schrift-Farbe / Highlight / Familie ──
    groups.push([
      { label: 'A▾', title: 'Schrift-Farbe', cmd: () => {
          const c = window.prompt('Farbe (z.B. #d23 oder rot):', '#1a3a6b');
          if (c) tt.chain().focus().setColor(c).run();
          else tt.chain().focus().unsetColor().run();
        }
      },
      { label: '🖍', title: 'Highlight', cmd: () => {
          const c = window.prompt('Highlight-Farbe (z.B. yellow oder #fff099):', '#fff099');
          if (c) tt.chain().focus().toggleHighlight({ color: c }).run();
        }
      },
      { label: 'F▾', title: 'Schriftart', cmd: () => {
          const f = window.prompt('Schriftart (z.B. Arial, Times, Inter):', 'Inter');
          if (f) tt.chain().focus().setFontFamily(f).run();
          else tt.chain().focus().unsetFontFamily().run();
        }
      }
    ]);

    // ── Footnote / PageBreak / CrossRef (nur wenn Extensions geladen) ──
    if (ext && tt.commands && tt.commands.setFootnote) {
      groups.push([
        { label: '⁽ⁿ⁾', title: 'Fußnote', cmd: () => {
            const text = window.prompt('Fußnoten-Text:', '');
            if (text) tt.chain().focus().setFootnote({ text: text, number: 0 }).run();
          }
        }
      ]);
    }
    if (ext && tt.commands && tt.commands.insertPageBreak) {
      groups.push([
        { label: '⤓', title: 'Seitenumbruch', cmd: () => tt.chain().focus().insertPageBreak().run() }
      ]);
    }
    if (ext && tt.commands && tt.commands.setCrossRef) {
      groups.push([
        { label: '↔', title: 'Querverweis (Heading-ID)', cmd: () => {
            const headings = ext.collectHeadings(tt.getJSON());
            if (headings.length === 0) { window.alert('Erst Überschriften erstellen.'); return; }
            const list = headings.map((h, i) => (i + 1) + ': ' + h.text + '  (id=' + h.id + ')').join('\n');
            const idx = window.prompt('Welche Überschrift?\n' + list, '1');
            const i = parseInt(idx, 10) - 1;
            if (i >= 0 && i < headings.length) {
              tt.chain().focus().setCrossRef({ targetId: headings[i].id, label: headings[i].text }).run();
              tt.chain().focus().insertContent('§ ' + (i + 1)).run();
            }
          }
        }
      ]);
    }

    // ── ToC-Generate ──
    if (ext && typeof ext.generateToC === 'function') {
      groups.push([
        { label: '☰ ToC', title: 'Inhaltsverzeichnis generieren (Cursor-Position)', cmd: () => {
            const toc = ext.generateToC(tt.getJSON());
            // ToC-Doc.content[0..1] = Heading + List → an Cursor einfügen
            tt.chain().focus().insertContent(toc.content || []).run();
          }
        }
      ]);
    }

    // ── Aus Einträgen aggregieren (M⁴¹ P4) ──
    if (state && state.auftragId) {
      groups.push([
        { label: '📥 Einträge', title: 'Aus Foto/Skizze/Diktat/Notiz aggregieren', cmd: async () => {
            try {
              const res = await fetch('/.netlify/functions/eintraege-pdf-aggregator?auftrag_id=' + encodeURIComponent(state.auftragId));
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
              if (!data.content_json || !data.content_json.content) throw new Error('Kein Content');
              tt.chain().focus().insertContent(data.content_json.content).run();
              window.alert('Aggregiert: ' + data.eintrag_count + ' Einträge (' + data.foto_count + ' Fotos, ' + data.skizze_count + ' Skizzen, ' + data.diktat_count + ' Diktate, ' + data.notiz_count + ' Notizen)');
            } catch (e) {
              window.alert('Aggregation fehlgeschlagen: ' + e.message);
            }
          }
        }
      ]);
    }

    // ── Bibliothek (P8) ──
    if (typeof window.ProvaEditorBibliothek !== 'undefined') {
      groups.push([
        { label: '📚 Bib', title: 'Bibliothek (Normen, Bausteine, §-Verweise, Floskeln, Kontakte, Positionen)', cmd: () => {
            window.ProvaEditorBibliothek.openModal(editor, {});
          }
        }
      ]);
    }

    // ── Als Vorlage speichern (P7) ──
    groups.push([
      { label: '⊞ Vorlage', title: 'Als Vorlage speichern', cmd: async () => {
          const titel = window.prompt('Vorlagen-Titel:', 'Meine Vorlage');
          if (!titel) return;
          const beschreibung = window.prompt('Beschreibung (optional):', '') || '';
          const kategorie = window.prompt('Kategorie (optional, z.B. F-09):', '') || '';
          try {
            const res = await fetch('/.netlify/functions/document-template-create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                titel: titel,
                beschreibung: beschreibung,
                kategorie: kategorie,
                weg: (editor && editor._instance) ? 'weg_a' : 'weg_a',
                content_json: tt.getJSON(),
                source: 'user'
              })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'HTTP ' + res.status);
            window.alert('Vorlage gespeichert: ' + titel);
          } catch (e) {
            window.alert('Speichern fehlgeschlagen: ' + e.message);
          }
        }
      }
    ]);

    // ── Spell + Konjunktiv-II (P6) ──
    if (typeof window.ProvaEditorSpellLayer !== 'undefined') {
      groups.push([
        { label: '✓ABC', title: 'Rechtschreib-Check (KI-Backstop S1, schnell)', cmd: () => {
            window.ProvaEditorSpellLayer.runKiBackstop(editor, {
              onError: (e) => window.alert('Rechtschreib-Check fehlgeschlagen: ' + e.message)
            });
          }
        },
        { label: '⌜II⌝', title: 'Konjunktiv-II-Check (S3 praezise — NUR §6 Fachurteil)', cmd: () => {
            window.ProvaEditorSpellLayer.runKonjunktivCheck(editor, {
              onError: (e) => window.alert('Konjunktiv-II-Check fehlgeschlagen: ' + e.message)
            });
          }
        }
      ]);
    }

    // ── PDF (P9): Browser-Print mit Locked-Sections (weg_c) ──
    if (typeof window.ProvaEditorPdfGenerator !== 'undefined') {
      groups.push([
        { label: '⊟ PDF', title: 'PDF erzeugen (DIN A4, IHK-konform; Locked-Sections bei Hybrid)', cmd: () => {
            window.ProvaEditorPdfGenerator.generate(tt.getJSON(), {
              titel: state.titel || 'PROVA-Gutachten',
              weg: state.weg,
              vars: {
                Aktenzeichen: state.titel || '—',
                Auftraggeber: '—',
                Gutachtenort: '—',
                Datum: new Date().toLocaleDateString('de-DE'),
                SV_Name: '—',
                SV_Bestellungsnr: '—'
              }
            });
          }
        }
      ]);
    }

    // ── Export (P5): HTML / Markdown / DOCX ──
    if (typeof window.ProvaDocxExport !== 'undefined') {
      groups.push([
        { label: '⬇ HTML', title: 'Als HTML herunterladen', cmd: () => {
            window.ProvaDocxExport.downloadHtml(tt.getJSON(), 'dokument.html');
          }
        },
        { label: '⬇ MD', title: 'Als Markdown herunterladen', cmd: () => {
            window.ProvaDocxExport.downloadMarkdown(tt.getJSON(), 'dokument.md');
          }
        },
        { label: '⬇ DOCX', title: 'Als Word-Dokument herunterladen', cmd: async () => {
            try {
              const blob = await window.ProvaDocxExport.exportDocxBlob(tt.getJSON(), { titel: 'PROVA-Dokument' });
              window.ProvaDocxExport.downloadBlob(blob, 'dokument.xml');
            } catch (e) {
              window.alert('DOCX-Export fehlgeschlagen: ' + e.message);
            }
          }
        }
      ]);
    }

    groups.forEach((group, gi) => {
      if (gi > 0) {
        const sep = document.createElement('div');
        sep.className = 'pet-toolbar-ext-sep';
        sep.setAttribute('aria-hidden', 'true');
        bar.appendChild(sep);
      }
      group.forEach(spec => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pet-toolbar-ext-btn';
        btn.title = spec.title;
        btn.setAttribute('aria-label', spec.title);
        btn.textContent = spec.label;
        btn.addEventListener('click', (e) => { e.preventDefault(); spec.cmd(); });
        bar.appendChild(btn);
      });
    });

    return bar;
  }

  function _triggerImageUpload(tt) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/jpeg,image/png,image/svg+xml,image/webp';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      document.body.removeChild(inp);
      if (!f) return;
      try {
        const b64 = await _fileToBase64(f);
        const alt = window.prompt('Alt-Text (Accessibility-Pflicht):', f.name.replace(/\.[^.]+$/, '')) || '';
        const caption = window.prompt('Bildunterschrift (optional):', '') || '';
        const resp = await _post('/.netlify/functions/editor-image-upload', {
          image_base64: b64,
          mime_type: f.type,
          filename: f.name,
          alt: alt,
          caption: caption
        });
        if (resp && resp.url) {
          tt.chain().focus().setImage({ src: resp.url, alt: alt, title: caption || alt }).run();
        }
      } catch (e) {
        window.alert('Bild-Upload fehlgeschlagen: ' + e.message);
      }
    });
    inp.click();
  }

  function _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
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

    // Custom-Extensions vorbereiten (Footnote/PageBreak/CrossRef) — best-effort
    let customExtensions = [];
    let extApi = null;
    if (window.ProvaEditorExtensions && typeof window.ProvaEditor.getModules === 'function') {
      try {
        const mods = await window.ProvaEditor.getModules();
        if (mods && mods._core) {
          const built = window.ProvaEditorExtensions.createFromCore(mods._core);
          if (built) {
            customExtensions = [built.Footnote, built.PageBreak, built.CrossRef].filter(Boolean);
            extApi = window.ProvaEditorExtensions;
          }
        }
      } catch (_) { /* graceful — Extended Toolbar deaktiviert */ }
    }

    // ProvaEditor.create akzeptiert HTML oder JSON; wir bevorzugen JSON
    const editor = await window.ProvaEditor.create({
      el: editorEl,
      content: initialContent,
      placeholder: 'Hier tippen — Auto-Save alle 5 Sekunden…',
      extraExtensions: customExtensions,
      onUpdate: (html, json) => {
        state.pendingChange = true;
        _setStatus(status.statusEl, 'dirty', 'Bearbeitung…');
        debouncedSave();
      }
    });

    // Extended-Toolbar (zwischen Editor-Host und Editor) — falls Editor nicht Fallback
    if (!editor._isFallback) {
      const extToolbar = _buildExtendedToolbar(editor, extApi, state);
      // Insert nach status.bar, vor editorEl
      el.insertBefore(extToolbar, editorEl);
    }

    // Browser-Spellcheck (Layer 1) auto-aktivieren
    if (!editor._isFallback && window.ProvaEditorSpellLayer) {
      try { window.ProvaEditorSpellLayer.enableBrowserSpellcheck(editor); } catch (_) {}
    }

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

    // Weg-Badge → Mode-Switch-Modal (P3)
    status.wegBadge.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.ProvaDocumentModeModal) {
        window.alert('Mode-Switch nicht verfuegbar (lib/document-mode-modal.js fehlt).');
        return;
      }
      const hasContent = state.pendingChange || (state.currentVersion > 0);
      const newWeg = await window.ProvaDocumentModeModal.open({
        currentWeg: state.weg,
        onSelect: async (chosen) => {
          if (chosen === state.weg) return;  // kein Wechsel
          const ok = await window.ProvaDocumentModeModal.confirmModeSwitch({
            currentWeg: state.weg,
            newWeg: chosen,
            hasContent: hasContent
          });
          if (!ok) throw new Error('User cancelled mode-switch');
        }
      });
      if (newWeg && newWeg !== state.weg) {
        state.weg = newWeg;
        // Locked-Sections aktualisieren bei Switch zu/von weg_c
        if (newWeg === 'weg_c' && window.ProvaDocumentModeModal.LOCKED_SECTION_KEYS) {
          state.lockedSections = window.ProvaDocumentModeModal.LOCKED_SECTION_KEYS.slice();
        }
        if (state.weg !== 'weg_c') {
          state.lockedSections = [];
        }
        // Badge-UI updaten
        status.wegBadge.className = 'pet-weg-badge pet-weg-badge--' + state.weg;
        status.wegBadge.textContent = WEG_BADGE_TEXTS[state.weg] || state.weg;
        // Save triggern
        debouncedSave.cancel();
        await save();
      }
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
