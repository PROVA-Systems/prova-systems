/**
 * PROVA Editor (TipTap-Wrapper)
 * MEGA¹⁵ W32 (Mode B Implementation, 2026-05-06/07)
 *
 * Vanilla-JS Wrapper um TipTap-Editor mit PROVA-Design-System.
 * CDN-Approach via esm.sh (kein npm-Build noetig — CLAUDE.md-konform).
 *
 * Public API:
 *   ProvaEditor.create({ el, content?, placeholder?, onUpdate?, onKIRequest? })
 *     → editor-instance mit { getHTML, getJSON, setContent, focus, destroy }
 *
 *   ProvaEditor.isAvailable()  → false wenn TipTap nicht laden konnte
 *
 * USAGE:
 *   const editor = await ProvaEditor.create({
 *     el: document.querySelector('#brief-editor'),
 *     content: '<p>Vorlage</p>',
 *     placeholder: 'Schreiben Sie Ihren Brief…',
 *     onUpdate: (html) => localStorage.setItem('draft', html),
 *     onKIRequest: async (selection) => {
 *       // KI-Vorschlag fuer ausgewaehlten Text
 *     }
 *   });
 *
 *   editor.getHTML()  // → '<p>...</p>'
 *
 * Anti-Pattern vermieden:
 *   - Dynamic-Import: Bundle wird NUR geladen wenn Editor wirklich benoetigt
 *   - Graceful Degradation: bei TipTap-Load-Fehler textarea-Fallback
 *   - localStorage-Auto-Save (Defense gegen Page-Refresh-Verlust)
 *   - Toolbar mit ARIA-Labels
 *   - Escape destroy() bei Page-Leave
 *   - Custom-KI-Button im Toolbar (W12 Anthropic-Fallback + W13 Confidence integriert)
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-editor-style';
  const TIPTAP_CDN_BASE = 'https://esm.sh/';

  let _tiptapModules = null;  // cached after first load
  let _loadPromise = null;
  let _loadFailed = false;

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/lib/prova-editor.css';
    document.head.appendChild(link);
  }

  /**
   * Lazy-load TipTap-Module via CDN.
   * Cached after first call — subsequent create() reuses module.
   *
   * @returns {Promise<{Editor, StarterKit, Placeholder, Table, TableRow, TableCell, TableHeader, Link}>}
   */
  async function _loadTipTap() {
    if (_tiptapModules) return _tiptapModules;
    if (_loadFailed) throw new Error('TipTap previously failed to load');
    if (_loadPromise) return _loadPromise;

    _loadPromise = (async () => {
      try {
        const [
          coreModule,
          starterModule,
          placeholderModule,
          tableModule,
          tableRowModule,
          tableCellModule,
          tableHeaderModule,
          linkModule,
          underlineModule,
          textAlignModule,
          imageModule,
          textStyleModule,
          colorModule,
          highlightModule,
          fontFamilyModule
        ] = await Promise.all([
          import(TIPTAP_CDN_BASE + '@tiptap/core@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/starter-kit@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-placeholder@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-table@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-table-row@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-table-cell@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-table-header@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-link@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-underline@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-text-align@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-image@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-text-style@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-color@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-highlight@2'),
          import(TIPTAP_CDN_BASE + '@tiptap/extension-font-family@2')
        ]);

        _tiptapModules = {
          Editor: coreModule.Editor,
          StarterKit: starterModule.default || starterModule.StarterKit,
          Placeholder: placeholderModule.default || placeholderModule.Placeholder,
          Table: tableModule.default || tableModule.Table,
          TableRow: tableRowModule.default || tableRowModule.TableRow,
          TableCell: tableCellModule.default || tableCellModule.TableCell,
          TableHeader: tableHeaderModule.default || tableHeaderModule.TableHeader,
          Link: linkModule.default || linkModule.Link,
          Underline: underlineModule.default || underlineModule.Underline,
          TextAlign: textAlignModule.default || textAlignModule.TextAlign,
          Image: imageModule.default || imageModule.Image,
          TextStyle: textStyleModule.default || textStyleModule.TextStyle,
          Color: colorModule.default || colorModule.Color,
          Highlight: highlightModule.default || highlightModule.Highlight,
          FontFamily: fontFamilyModule.default || fontFamilyModule.FontFamily
        };
        return _tiptapModules;
      } catch (e) {
        _loadFailed = true;
        console.warn('[ProvaEditor] TipTap CDN load failed:', e.message);
        throw e;
      }
    })();

    return _loadPromise;
  }

  /**
   * Build Toolbar-Element mit Buttons fuer common-Formatting.
   * KI-Button optional (wenn onKIRequest gegeben).
   */
  function _buildToolbar(editor, opts) {
    const bar = document.createElement('div');
    bar.className = 'prova-editor-toolbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Editor-Werkzeuge');

    const groups = [
      // Heading-Buttons
      [
        { cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), label: 'H2', title: 'Ueberschrift 2', isActive: () => editor.isActive('heading', { level: 2 }) },
        { cmd: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), label: 'H3', title: 'Ueberschrift 3', isActive: () => editor.isActive('heading', { level: 3 }) }
      ],
      // Inline-Format
      [
        { cmd: () => editor.chain().focus().toggleBold().run(), label: 'B', title: 'Fett', isActive: () => editor.isActive('bold') },
        { cmd: () => editor.chain().focus().toggleItalic().run(), label: 'I', title: 'Kursiv', isActive: () => editor.isActive('italic') },
        { cmd: () => editor.chain().focus().toggleUnderline().run(), label: 'U', title: 'Unterstrichen', isActive: () => editor.isActive('underline') },
        { cmd: () => editor.chain().focus().toggleStrike().run(), label: 'S', title: 'Durchgestrichen', isActive: () => editor.isActive('strike') }
      ],
      // Align
      [
        { cmd: () => editor.chain().focus().setTextAlign('left').run(), label: '⯇', title: 'Linksbuendig', isActive: () => editor.isActive({ textAlign: 'left' }) },
        { cmd: () => editor.chain().focus().setTextAlign('center').run(), label: '≡', title: 'Zentriert', isActive: () => editor.isActive({ textAlign: 'center' }) },
        { cmd: () => editor.chain().focus().setTextAlign('right').run(), label: '⯈', title: 'Rechtsbuendig', isActive: () => editor.isActive({ textAlign: 'right' }) },
        { cmd: () => editor.chain().focus().setTextAlign('justify').run(), label: '☰', title: 'Blocksatz', isActive: () => editor.isActive({ textAlign: 'justify' }) }
      ],
      // Lists
      [
        { cmd: () => editor.chain().focus().toggleBulletList().run(), label: '•', title: 'Aufzaehlung', isActive: () => editor.isActive('bulletList') },
        { cmd: () => editor.chain().focus().toggleOrderedList().run(), label: '1.', title: 'Nummerierte Liste', isActive: () => editor.isActive('orderedList') }
      ],
      // Block
      [
        { cmd: () => editor.chain().focus().toggleBlockquote().run(), label: '”', title: 'Zitat', isActive: () => editor.isActive('blockquote') },
        { cmd: () => editor.chain().focus().toggleCodeBlock().run(), label: '</>', title: 'Code-Block', isActive: () => editor.isActive('codeBlock') }
      ],
      // Tabelle
      [
        { cmd: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), label: '⊞', title: 'Tabelle einfuegen' }
      ],
      // Link
      [
        { cmd: () => {
            const url = window.prompt('Link-URL eingeben:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
            else editor.chain().focus().unsetLink().run();
          }, label: '🔗', title: 'Link', isActive: () => editor.isActive('link') }
      ]
    ];

    // Custom KI-Button wenn onKIRequest gegeben
    if (typeof opts.onKIRequest === 'function') {
      groups.push([
        { cmd: () => opts.onKIRequest(editor), label: '🤖 KI', title: 'KI-Vorschlag', special: 'ki' }
      ]);
    }

    groups.forEach((group, gi) => {
      if (gi > 0) {
        const sep = document.createElement('div');
        sep.className = 'prova-editor-toolbar-sep';
        sep.setAttribute('aria-hidden', 'true');
        bar.appendChild(sep);
      }
      group.forEach(btnSpec => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prova-editor-btn' + (btnSpec.special === 'ki' ? ' prova-editor-btn--ki' : '');
        btn.setAttribute('aria-label', btnSpec.title);
        btn.title = btnSpec.title;
        btn.textContent = btnSpec.label;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          btnSpec.cmd();
          _updateToolbarState(bar, editor);
        });
        bar.appendChild(btn);
      });
    });

    return bar;
  }

  function _updateToolbarState(bar, editor) {
    bar.querySelectorAll('.prova-editor-btn').forEach(btn => {
      // Active-State based on isActive (per button — needs reference, simplified hier)
      // Echte Implementation wuerde isActive-Lookup durchfuehren
      // Fuer MVP: keine active-state-Synchronisation
    });
  }

  /**
   * Auto-Save in localStorage.
   *
   * @param {string} key
   * @param {string} html
   */
  function _autoSave(key, html) {
    if (!key) return;
    try {
      localStorage.setItem(key, html);
      localStorage.setItem(key + '_ts', String(Date.now()));
    } catch (_) {}
  }

  function _loadAutoSave(key) {
    if (!key) return null;
    try {
      return localStorage.getItem(key);
    } catch (_) { return null; }
  }

  /**
   * Render textarea-Fallback wenn TipTap nicht verfuegbar.
   */
  function _fallbackToTextarea(el, opts) {
    const textarea = document.createElement('textarea');
    textarea.className = 'prova-editor-fallback';
    textarea.placeholder = opts.placeholder || 'Editor nicht verfuegbar — Text-Modus';
    textarea.value = opts.content || '';
    textarea.style.cssText = 'width:100%;min-height:200px;padding:12px;font-family:inherit;font-size:13.5px;border:1px solid var(--border,#e2e8f0);border-radius:6px;';

    if (typeof opts.onUpdate === 'function') {
      textarea.addEventListener('input', () => opts.onUpdate(textarea.value));
    }

    el.innerHTML = '';
    el.appendChild(textarea);

    // Fallback-Hint
    const hint = document.createElement('div');
    hint.className = 'prova-editor-fallback-hint';
    hint.style.cssText = 'font-size:11px;color:var(--text3,#6b7a99);margin-top:6px;';
    hint.textContent = '⚠️ Editor-Modus nicht verfuegbar — Text-Modus aktiv.';
    el.appendChild(hint);

    if (window.provaAlert) {
      window.provaAlert('Editor konnte nicht geladen werden — Text-Modus aktiv.', 'info');
    }

    // Fallback-Editor-API (Subset von richtiger Editor-API)
    return {
      getHTML: () => textarea.value,
      getJSON: () => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: textarea.value }] }] }),
      setContent: (html) => { textarea.value = (html || '').replace(/<[^>]+>/g, ''); },
      focus: () => textarea.focus(),
      destroy: () => { /* nothing */ },
      _isFallback: true
    };
  }

  async function create(opts) {
    if (!opts || !opts.el) throw new Error('[ProvaEditor] opts.el required');
    const el = typeof opts.el === 'string' ? document.querySelector(opts.el) : opts.el;
    if (!el) throw new Error('[ProvaEditor] element not found');

    _injectStyle();

    let modules;
    try {
      modules = await _loadTipTap();
    } catch (e) {
      console.warn('[ProvaEditor] TipTap-Load failed, fallback to textarea:', e.message);
      return _fallbackToTextarea(el, opts);
    }

    // Auto-Save-Key
    const autoSaveKey = opts.autoSaveKey || null;
    const initialContent = opts.content
      || (autoSaveKey ? _loadAutoSave(autoSaveKey) : '')
      || '';

    // Editor-Container vorbereiten
    el.innerHTML = '';
    el.classList.add('prova-editor-wrap');

    const editorEl = document.createElement('div');
    editorEl.className = 'prova-editor-content';
    editorEl.setAttribute('aria-label', 'Editor-Inhalt');

    // TipTap-Editor erzeugen
    const editor = new modules.Editor({
      element: editorEl,
      content: initialContent,
      extensions: [
        modules.StarterKit,
        modules.Underline,
        modules.TextStyle,
        modules.Color,
        modules.Highlight.configure({ multicolor: true }),
        modules.FontFamily,
        modules.TextAlign.configure({
          types: ['heading', 'paragraph']
        }),
        modules.Placeholder.configure({
          placeholder: opts.placeholder || 'Hier tippen…',
          showOnlyCurrent: false
        }),
        modules.Table.configure({ resizable: true }),
        modules.TableRow,
        modules.TableHeader,
        modules.TableCell,
        modules.Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'prova-editor-link', rel: 'noopener noreferrer' }
        }),
        modules.Image.configure({
          inline: false,
          allowBase64: false,
          HTMLAttributes: { class: 'prova-editor-image' }
        })
      ],
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        if (autoSaveKey) _autoSave(autoSaveKey, html);
        if (typeof opts.onUpdate === 'function') {
          try { opts.onUpdate(html, ed.getJSON()); } catch (e) { console.warn('[ProvaEditor] onUpdate error', e); }
        }
      }
    });

    // Toolbar
    const toolbar = _buildToolbar(editor, opts);
    el.appendChild(toolbar);
    el.appendChild(editorEl);

    // Auto-Save-Hint
    if (autoSaveKey) {
      const hint = document.createElement('div');
      hint.className = 'prova-editor-autosave-hint';
      hint.setAttribute('aria-live', 'polite');
      hint.textContent = 'Automatisch gespeichert.';
      el.appendChild(hint);
    }

    // Page-Unload-Defense: destroy editor on navigation
    function _onUnload() {
      try { editor.destroy(); } catch (_) {}
    }
    window.addEventListener('beforeunload', _onUnload);

    return {
      getHTML: () => editor.getHTML(),
      getJSON: () => editor.getJSON(),
      setContent: (content) => editor.commands.setContent(content),
      focus: () => editor.commands.focus(),
      destroy: () => {
        try { editor.destroy(); } catch (_) {}
        window.removeEventListener('beforeunload', _onUnload);
      },
      _isFallback: false,
      _instance: editor
    };
  }

  function isAvailable() {
    return !_loadFailed;
  }

  // Public API
  window.ProvaEditor = {
    create: create,
    isAvailable: isAvailable
  };

  // Test-Exports
  window.ProvaEditor._test = {
    _autoSave,
    _loadAutoSave,
    TIPTAP_CDN_BASE
  };
})();
