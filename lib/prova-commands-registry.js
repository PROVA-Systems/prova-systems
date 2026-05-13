/**
 * PROVA Commands-Registry (MEGA⁶⁵ Item 3.3)
 *
 * ~30 Commands für ProvaCommandPalette in 5 Kategorien:
 *   - Navigation (6)
 *   - KI-Aktionen (8)
 *   - Editor (10)
 *   - Export & Versand (4)
 *   - System (3)
 *
 * Build via: ProvaCommandsRegistry.build({ editor, opts })
 *   → Array<Command> bereit für palette.register()
 *
 * Plattform-Shortcuts via ProvaPlatform.fmt()
 */
'use strict';

(function (global) {

  function fmt(key, opts) {
    if (!window.ProvaPlatform) return key;
    return window.ProvaPlatform.fmt(key, opts || {});
  }

  function build({ editor, openCheatSheet, openKiPanel, openNormPicker, openFotoPicker, openVersandModal, onSave, onPdfExport, onDocxExport }) {
    const ed = editor;

    const cmds = [
      // ═══ KATEGORIE A — Navigation ═══
      { id: 'nav.sachverhalt',  category: 'Navigation', title: 'Gehe zu Sachverhalt (§2)',
        subtitle: 'Springt zum §2-Abschnitt', icon: '§', aliases: ['§2','sachverhalt','part2'],
        handler: () => _scrollToHeading(ed, /^§\s*2|sachverhalt/i) },
      { id: 'nav.befund',       category: 'Navigation', title: 'Gehe zu Befund (§5)',
        subtitle: 'Springt zum §5-Abschnitt', icon: '§', aliases: ['§5','befund'],
        handler: () => _scrollToHeading(ed, /^§\s*5|befund/i) },
      { id: 'nav.fachurteil',   category: 'Navigation', title: 'Gehe zu Fachurteil (§6)',
        subtitle: 'Springt zum §6-Abschnitt', icon: '§', aliases: ['§6','fachurteil'],
        handler: () => _scrollToHeading(ed, /^§\s*6|fachurteil/i) },
      { id: 'nav.zusammenfassung', category: 'Navigation', title: 'Gehe zu Zusammenfassung (§7)',
        subtitle: 'Springt zum §7-Abschnitt', icon: '§', aliases: ['§7','zusammenfassung'],
        handler: () => _scrollToHeading(ed, /^§\s*7|zusammenfassung/i) },
      { id: 'nav.anhang',       category: 'Navigation', title: 'Gehe zu Anhängen',
        subtitle: 'Anhang-Sektion', icon: '📎', aliases: ['anhang','attachments'],
        handler: () => _scrollToHeading(ed, /^anh[äa]nge?/i) },
      { id: 'nav.cockpit',      category: 'Navigation', title: 'Zurück zum Cockpit',
        subtitle: 'Dashboard öffnen', icon: '🏠', aliases: ['cockpit','dashboard','home'],
        handler: () => { window.location.href = '/cockpit.html'; } },

      // ═══ KATEGORIE B — KI-Aktionen ═══
      { id: 'ki.konjunktiv',    category: 'KI-Aktionen', title: 'Konjunktiv-Vorschlag holen',
        subtitle: 'Markierter Text → KI prüft Konjunktiv II', icon: '⚖', shortcut: fmt('K',{mod:true,alt:true}),
        aliases: ['konjunktiv','grammatik','umformulieren'],
        sections: ['fachurteil'],
        handler: () => _callKiSuggestion(ed, 'konjunktiv_korrektur') },
      { id: 'ki.norm-verweis',  category: 'KI-Aktionen', title: '§-Verweis-Vorschlag (Beweisbeschluss)',
        subtitle: 'KI sucht passenden Paragraphen', icon: '§', shortcut: fmt('V',{mod:true,alt:true}),
        aliases: ['§','verweis','paragraph','beweisbeschluss'],
        handler: () => _callKiSuggestion(ed, 'norm_vorschlag') },
      { id: 'ki.norm-zitat',    category: 'KI-Aktionen', title: 'Norm-Zitat suchen (DIN/EN/VDI)',
        subtitle: 'Öffnet Norm-Picker', icon: '📐', shortcut: fmt('N',{mod:true,alt:true}),
        aliases: ['din','en','vdi','iso','norm','zitat'],
        handler: () => openNormPicker?.(ed) },
      { id: 'ki.panel',         category: 'KI-Aktionen', title: 'KI-Panel öffnen (Absatz)',
        subtitle: 'KI-Optionen für aktuellen Absatz', icon: '✨', shortcut: fmt('J',{mod:true}),
        aliases: ['ki','panel','helfer'],
        handler: () => openKiPanel?.(ed) },
      { id: 'ki.plausibilitaet', category: 'KI-Aktionen', title: 'Plausibilität prüfen (Selection)',
        subtitle: 'Sucht Widersprüche', icon: '⚖',
        aliases: ['plausibilitaet','widerspruch','konsistenz'],
        handler: () => _callKiSuggestion(ed, 'plausibilitaets_check') },
      { id: 'ki.similarity',    category: 'KI-Aktionen', title: 'Ähnliche Fragmente finden',
        subtitle: 'pgvector-Suche workspace-weit', icon: '🔗',
        aliases: ['aehnlich','similar','rag'],
        handler: () => _callSimilarity(ed) },
      { id: 'ki.fragments-to-befund', category: 'KI-Aktionen', title: 'Befund aus Fragmenten generieren',
        subtitle: 'Markierte Fragmente → Markdown-Entwurf', icon: '📝',
        aliases: ['befund','generieren','fragmente'],
        handler: () => _callFragmentsToBefund(ed) },
      { id: 'ki.discard-all',   category: 'KI-Aktionen', title: 'KI-Suggestion verwerfen (alle)',
        subtitle: 'Entfernt alle prova-ki-suggestion Marks', icon: '🗑',
        aliases: ['verwerfen','reject','all'],
        handler: () => _discardAllKiSuggestions(ed) },

      // ═══ KATEGORIE C — Editor-Commands ═══
      { id: 'edit.bold',        category: 'Editor', title: 'Fett',
        subtitle: 'Aktueller Selection fett', icon: 'B', shortcut: fmt('B',{mod:true}),
        aliases: ['fett','bold'],
        handler: () => ed?.chain().focus().toggleBold().run() },
      { id: 'edit.italic',      category: 'Editor', title: 'Kursiv',
        subtitle: 'Aktueller Selection kursiv', icon: 'I', shortcut: fmt('I',{mod:true}),
        aliases: ['kursiv','italic'],
        handler: () => ed?.chain().focus().toggleItalic().run() },
      { id: 'edit.underline',   category: 'Editor', title: 'Unterstrichen',
        subtitle: '', icon: 'U', shortcut: fmt('U',{mod:true}),
        aliases: ['underline','unterstrichen'],
        handler: () => ed?.chain().focus().toggleUnderline?.().run() },
      { id: 'edit.h1',          category: 'Editor', title: 'Überschrift 1', icon: 'H1', shortcut: fmt('1',{mod:true,alt:true}),
        aliases: ['h1','heading1'],
        handler: () => ed?.chain().focus().setNode('heading', { level: 1 }).run() },
      { id: 'edit.h2',          category: 'Editor', title: 'Überschrift 2', icon: 'H2', shortcut: fmt('2',{mod:true,alt:true}),
        aliases: ['h2','heading2'],
        handler: () => ed?.chain().focus().setNode('heading', { level: 2 }).run() },
      { id: 'edit.h3',          category: 'Editor', title: 'Überschrift 3', icon: 'H3', shortcut: fmt('3',{mod:true,alt:true}),
        aliases: ['h3','heading3'],
        handler: () => ed?.chain().focus().setNode('heading', { level: 3 }).run() },
      { id: 'edit.list',        category: 'Editor', title: 'Aufzählung', icon: '•',
        aliases: ['liste','bullet','aufzaehlung'],
        handler: () => ed?.chain().focus().toggleBulletList().run() },
      { id: 'edit.ordered',     category: 'Editor', title: 'Nummerierung', icon: '1.',
        aliases: ['ordered','nummer','numerisch'],
        handler: () => ed?.chain().focus().toggleOrderedList().run() },
      { id: 'edit.quote',       category: 'Editor', title: 'Zitat-Block', icon: '”',
        aliases: ['quote','zitat','blockquote'],
        handler: () => ed?.chain().focus().toggleBlockquote().run() },
      { id: 'edit.hr',          category: 'Editor', title: 'Trennlinie einfügen', icon: '—',
        aliases: ['hr','trennlinie','divider'],
        handler: () => ed?.chain().focus().setHorizontalRule().run() },
      { id: 'edit.fragment-marker', category: 'Editor', title: 'Fragment-Marker einfügen (manuell)',
        subtitle: 'Markiert Selection als manuell-gesetztes Fragment', icon: '🔗',
        aliases: ['marker','fragment','manuell'],
        handler: () => ed?.commands.setFragmentMarker?.({ fragmentId: crypto.randomUUID(), quelle: 'manuell', timestamp: new Date().toISOString() }) },
      { id: 'edit.norm',        category: 'Editor', title: 'Norm-Zitat einfügen', icon: '📐', shortcut: fmt('N',{mod:true,alt:true}),
        aliases: ['din','norm','zitat'],
        handler: () => openNormPicker?.(ed) },
      { id: 'edit.foto',        category: 'Editor', title: 'Foto einfügen',
        subtitle: 'Aus Auftrag-Galerie', icon: '📷', aliases: ['foto','bild','image'],
        handler: () => openFotoPicker?.(ed) },
      { id: 'edit.table',       category: 'Editor', title: 'Tabelle 3×3 einfügen', icon: '⊞',
        aliases: ['tabelle','table','3x3'],
        handler: () => ed?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { id: 'edit.focus',       category: 'Editor', title: 'Focus-Mode: Nächste Stufe',
        subtitle: 'off → sentence → paragraph → typewriter', icon: '🎯', shortcut: fmt('F',{mod:true,shift:true}),
        aliases: ['focus','konzentration','fokus'],
        handler: () => window.ProvaFocusMode_active?.cycle?.() },

      // ═══ KATEGORIE D — Export & Versand ═══
      { id: 'export.save',      category: 'Export & Versand', title: 'Speichern',
        subtitle: 'Manuelles Save (Auto-Save läuft sowieso)', icon: '💾', shortcut: fmt('S',{mod:true}),
        aliases: ['save','speichern'],
        handler: () => onSave?.(ed) },
      { id: 'export.pdf',       category: 'Export & Versand', title: 'Als PDF exportieren',
        subtitle: 'pdf-generate Edge Function', icon: '📄',
        aliases: ['pdf','export'],
        handler: () => onPdfExport?.(ed) },
      { id: 'export.docx',      category: 'Export & Versand', title: 'Als DOCX exportieren',
        subtitle: 'editor-docx-export', icon: '📝',
        aliases: ['docx','word','export'],
        handler: () => onDocxExport?.(ed) },
      { id: 'export.versand',   category: 'Export & Versand', title: 'Versenden…',
        subtitle: 'Stufe 1 Download · Stufe 2 Link · Stufe 3 SMTP', icon: '✉',
        aliases: ['versand','versenden','send','email'],
        handler: () => openVersandModal?.(ed) },

      // ═══ KATEGORIE E — System ═══
      { id: 'sys.cheatsheet',   category: 'System', title: 'Tastenkürzel anzeigen',
        subtitle: 'Cheat-Sheet öffnet (auch via ?)', icon: '?', shortcut: '?',
        aliases: ['help','hilfe','shortcut','tastenkuerzel'],
        handler: () => openCheatSheet?.() },
      { id: 'sys.autosave',     category: 'System', title: 'Auto-Save jetzt',
        subtitle: 'Erzwingt sofortiges Save', icon: '⏱',
        aliases: ['autosave','sync'],
        handler: () => window.dispatchEvent(new CustomEvent('prova:force-save')) },
      { id: 'sys.stats',        category: 'System', title: 'Editor-Statistik',
        subtitle: 'Zeichen/Eigenleistung/KI-%', icon: '📊',
        aliases: ['stats','statistik','metriken'],
        handler: () => _showStats(ed) },

      // ═══ KATEGORIE F — Seiten-Navigation (MEGA⁶⁸-FINAL E.3) ═══
      { id: 'page.dashboard',  category: 'Seiten', title: 'Dashboard öffnen',
        subtitle: 'Cockpit · Tiles · KI-Stats', icon: '🏠', aliases: ['dashboard','cockpit','home','start'],
        handler: () => { window.location.href = '/dashboard'; } },
      { id: 'page.akte',       category: 'Seiten', title: 'Aktuelle Akte',
        subtitle: 'Auftrag-Detail', icon: '📂', aliases: ['akte','auftrag','fall'],
        handler: () => { window.location.href = '/akte'; } },
      { id: 'page.kontakte',   category: 'Seiten', title: 'Kontakte',
        subtitle: 'Adressbuch', icon: '👥', aliases: ['kontakte','contacts','adressen'],
        handler: () => { window.location.href = '/kontakte'; } },
      { id: 'page.termine',    category: 'Seiten', title: 'Termine',
        subtitle: 'Kalender · Ortstermine', icon: '📅', aliases: ['termine','calendar','kalender'],
        handler: () => { window.location.href = '/termine'; } },
      { id: 'page.fristen',    category: 'Seiten', title: 'Fristen',
        subtitle: 'Gerichts- und Mandantenfristen', icon: '⏰', aliases: ['fristen','deadlines'],
        handler: () => { window.location.href = '/fristen.html'; } },
      { id: 'page.rechnungen', category: 'Seiten', title: 'Rechnungen',
        subtitle: 'JVEG · Pauschal · Stunden', icon: '💶', aliases: ['rechnungen','invoices'],
        handler: () => { window.location.href = '/rechnungen'; } },
      { id: 'page.mahnwesen',  category: 'Seiten', title: 'Mahnwesen',
        subtitle: '3-Stufen-Mahnung', icon: '⚠', aliases: ['mahnwesen','mahnung','dunning'],
        handler: () => { window.location.href = '/mahnwesen.html'; } },
      { id: 'page.briefe',     category: 'Seiten', title: 'Briefe',
        subtitle: '26 Brief-Vorlagen', icon: '✉', aliases: ['briefe','letters'],
        handler: () => { window.location.href = '/briefe'; } },
      { id: 'page.beratung',   category: 'Seiten', title: 'Beratung',
        subtitle: 'Telefonische Beratung-Workflow', icon: '☎', aliases: ['beratung','consultation'],
        handler: () => { window.location.href = '/beratung'; } },
      { id: 'page.baubegleitung', category: 'Seiten', title: 'Baubegleitung',
        subtitle: 'Phasenweiser Begleit-Workflow', icon: '🏗', aliases: ['baubegleitung','site-supervision'],
        handler: () => { window.location.href = '/baubegleitung'; } },
      { id: 'page.stellungnahme', category: 'Seiten', title: 'Stellungnahme/§6 Fachurteil',
        subtitle: 'Editor', icon: '⚖', aliases: ['stellungnahme','fachurteil','§6'],
        handler: () => { window.location.href = '/fachurteil'; } },
      { id: 'page.ortstermin', category: 'Seiten', title: 'Ortstermin starten',
        subtitle: 'Diktat · Foto · Skizze', icon: '🎙', aliases: ['ortstermin','aufnahme','diktat'],
        handler: () => { window.location.href = '/ortstermin'; } },
      { id: 'page.normen',     category: 'Seiten', title: 'Normen-Bibliothek',
        subtitle: 'DIN · EN · VDI · WTA', icon: '📐', aliases: ['normen','din','library'],
        handler: () => { window.location.href = '/normen'; } },
      { id: 'page.textbausteine', category: 'Seiten', title: 'Textbausteine',
        subtitle: 'Floskeln & Vorlagen', icon: '📝', aliases: ['textbausteine','snippets','floskeln'],
        handler: () => { window.location.href = '/textbausteine'; } },
      { id: 'page.bibliothek', category: 'Seiten', title: 'Bibliothek',
        subtitle: 'Normen + Bausteine + Brief-Vorlagen', icon: '📚', aliases: ['bibliothek','library','vorlagen'],
        handler: () => { window.location.href = '/bibliothek'; } },
      { id: 'sys.global-search', category: 'System', title: 'Global Search…',
        subtitle: 'Cross-Entity (Aufträge/Kontakte/…)', icon: '🔍', shortcut: fmt('P', { mod: true }),
        aliases: ['suche','search','find','global'],
        handler: () => window.ProvaGlobalSearch?.open?.() },
      { id: 'sys.mein-protokoll', category: 'System', title: 'Mein Aktivitätsprotokoll',
        subtitle: 'Timeline der letzten Tage', icon: '📋',
        aliases: ['aktivitaeten','protokoll','timeline','meine'],
        handler: () => window.ProvaMeinProtokoll?.open?.({ days: 7 }) },
      { id: 'page.einstellungen', category: 'Seiten', title: 'Einstellungen',
        subtitle: 'Profil · SMTP · 2FA', icon: '⚙', aliases: ['einstellungen','settings','profil'],
        handler: () => { window.location.href = '/einstellungen'; } },

      // ═══ KATEGORIE G — Neue Entität (Quick-Create) ═══
      { id: 'new.auftrag',     category: 'Neu', title: 'Neuer Auftrag',
        subtitle: 'Schadensgutachten / Beratung / ...', icon: '➕', aliases: ['neu','auftrag','new'],
        handler: () => { window.location.href = '/auftrag-neu'; } },
      { id: 'new.brief',       category: 'Neu', title: 'Neuer Brief',
        subtitle: 'Aus Vorlage', icon: '➕✉', aliases: ['brief','letter','schreiben'],
        handler: () => { window.location.href = '/briefe?action=new'; } }
    ];

    return cmds;
  }

  // ═══ Helper-Functions ═══

  function _scrollToHeading(editor, re) {
    if (!editor) return;
    const doc = editor.state.doc;
    let foundPos = -1;
    doc.descendants((node, pos) => {
      if (foundPos >= 0) return false;
      if (node.type.name === 'heading' && re.test(node.textContent || '')) {
        foundPos = pos;
      }
    });
    if (foundPos >= 0) {
      editor.chain().focus().setTextSelection(foundPos).scrollIntoView().run();
    }
  }

  async function _callKiSuggestion(editor, purpose) {
    const { from, to } = editor.state.selection;
    if (from === to) {
      window.alert('Bitte zuerst Text markieren.');
      return;
    }
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    document.dispatchEvent(new CustomEvent('prova:ki-suggestion-request', {
      detail: { purpose, text: selectedText, from, to }
    }));
  }

  async function _callSimilarity(editor) {
    document.dispatchEvent(new CustomEvent('prova:similarity-request', {
      detail: { editor }
    }));
  }

  async function _callFragmentsToBefund(editor) {
    document.dispatchEvent(new CustomEvent('prova:fragments-to-befund-request', {
      detail: { editor }
    }));
  }

  function _discardAllKiSuggestions(editor) {
    if (!editor) return;
    const editorEl = editor.options.element;
    const count = editorEl?.querySelectorAll('.prova-ki-suggestion').length || 0;
    if (count === 0) {
      window.alert('Keine offenen KI-Vorschläge.');
      return;
    }
    if (!window.confirm(`Alle ${count} KI-Vorschläge verwerfen?`)) return;
    editor.chain().focus().unsetMark('provaKiSuggestion').run();
  }

  function _showStats(editor) {
    const text = editor?.getText() || '';
    const editorEl = editor?.options?.element;
    let kiLen = 0;
    if (editorEl) {
      editorEl.querySelectorAll('.prova-fragment-marker, .prova-textbaustein-block .baustein-content, .prova-ki-suggestion').forEach(el => {
        kiLen += (el.textContent || '').length;
      });
    }
    const eigen = Math.max(0, text.length - kiLen);
    const pct = text.length > 0 ? Math.round((kiLen / text.length) * 100) : 0;
    window.alert(`Editor-Statistik:\n\nZeichen total:   ${text.length}\nEigenleistung:    ${eigen}\nKI-Anteil:        ${kiLen} (${pct} %)`);
  }

  global.ProvaCommandsRegistry = { build };
})(typeof window !== 'undefined' ? window : globalThis);
