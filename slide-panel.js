/* ============================================================
   PROVA — Slide-in Panel (slide-panel.js)
   Wiederverwendbares Panel für Normen, Textbausteine, Positionen.
   Einbinden:  <script src="slide-panel.js"></script>
   
   API:
     PROVA.openPanel('normen')       — Normen-Bibliothek öffnen
     PROVA.openPanel('textbausteine') — Textbausteine öffnen
     PROVA.openPanel('positionen')   — Positionen öffnen
     PROVA.closePanel()              — Panel schließen
     PROVA.onPanelInsert = fn(text, type) — Callback wenn eingefügt wird
   ============================================================ */
(function() {
  'use strict';

  window.PROVA = window.PROVA || {};

  /* ── CSS ── */
  if (!document.getElementById('prova-slide-panel-css')) {
    var s = document.createElement('style');
    s.id = 'prova-slide-panel-css';
    s.textContent = ''
      + '.sp-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:600;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);opacity:0;transition:opacity .25s;}'
      + '.sp-overlay.open{display:block;opacity:1;}'
      + '.sp-panel{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:92vw;background:var(--bg2,#13161d);border-left:1px solid var(--border2,rgba(255,255,255,.12));z-index:601;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:-8px 0 32px rgba(0,0,0,.4);}'
      + '.sp-panel.open{transform:translateX(0);}'
      + '.sp-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border,rgba(255,255,255,.07));flex-shrink:0;}'
      + '.sp-title{font-size:15px;font-weight:700;color:var(--text,#eaecf4);display:flex;align-items:center;gap:8px;}'
      + '.sp-close{background:none;border:none;color:var(--text3,#6b7280);font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all .12s;}'
      + '.sp-close:hover{color:var(--text,#eaecf4);background:rgba(255,255,255,.05);}'
      + '.sp-search{padding:10px 18px;border-bottom:1px solid var(--border,rgba(255,255,255,.07));flex-shrink:0;}'
      + '.sp-search input{width:100%;background:var(--bg3,#181b24);border:1px solid var(--border2,rgba(255,255,255,.12));border-radius:8px;padding:9px 12px;color:var(--text,#eaecf4);font-size:13px;font-family:inherit;outline:none;transition:border-color .12s;}'
      + '.sp-search input:focus{border-color:var(--accent,#4f8ef7);}'
      + '.sp-search input::placeholder{color:var(--text3,#6b7280);}'
      + '.sp-body{flex:1;overflow-y:auto;padding:12px 14px;}'
      + '.sp-body::-webkit-scrollbar{width:4px;}'
      + '.sp-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px;}'
      + '.sp-item{background:var(--bg3,#181b24);border:1px solid var(--border,rgba(255,255,255,.07));border-radius:9px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:border-color .12s;}'
      + '.sp-item:hover{border-color:var(--accent,#4f8ef7);}'
      + '.sp-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px;}'
      + '.sp-item-title{font-size:13px;font-weight:700;color:var(--text,#eaecf4);}'
      + '.sp-item-badge{font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;white-space:nowrap;flex-shrink:0;}'
      + '.sp-item-desc{font-size:12px;color:var(--text2,#9da3b4);line-height:1.5;margin-bottom:8px;}'
      + '.sp-item-preview{font-size:11px;color:var(--text3,#6b7280);line-height:1.55;border-top:1px solid var(--border,rgba(255,255,255,.07));padding-top:8px;display:none;}'
      + '.sp-item.expanded .sp-item-preview{display:block;}'
      + '.sp-insert-btn{padding:5px 12px;border-radius:6px;background:var(--accent,#4f8ef7);color:#fff;border:none;font-size:11px;font-weight:700;cursor:pointer;transition:all .12s;font-family:inherit;}'
      + '.sp-insert-btn:hover{background:var(--accent2,#3a7be0);}'
      + '.sp-empty{text-align:center;padding:40px 20px;color:var(--text3,#6b7280);}'
      + '.sp-empty-icon{font-size:32px;margin-bottom:8px;}'
      + '.sp-tabs{display:flex;gap:2px;padding:8px 18px;border-bottom:1px solid var(--border,rgba(255,255,255,.07));flex-shrink:0;overflow-x:auto;}'
      + '.sp-tab{padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;color:var(--text3,#6b7280);cursor:pointer;border:none;background:none;font-family:inherit;white-space:nowrap;transition:all .12s;}'
      + '.sp-tab:hover{color:var(--text2,#9da3b4);}'
      + '.sp-tab.active{color:var(--accent,#4f8ef7);background:rgba(79,142,247,.1);}'
      + '.sp-count{font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;background:rgba(255,255,255,.06);color:var(--text3,#6b7280);margin-left:4px;}'
      + '@media(max-width:600px){.sp-panel{width:100%;max-width:100%;}}'
    ;
    document.head.appendChild(s);
  }

  /* ── DOM erstellen (einmalig) ── */
  var overlay, panel, titleEl, searchInput, bodyEl, tabsEl;
  var currentType = '';
  var currentData = [];
  var currentFilter = 'alle';

  function createDOM() {
    if (document.getElementById('sp-overlay')) return;

    overlay = document.createElement('div');
    overlay.className = 'sp-overlay';
    overlay.id = 'sp-overlay';
    overlay.onclick = function() { PROVA.closePanel(); };

    panel = document.createElement('div');
    panel.className = 'sp-panel';
    panel.id = 'sp-panel';
    panel.innerHTML = ''
      + '<div class="sp-header">'
      +   '<div class="sp-title" id="sp-title">📚 Normen</div>'
      +   '<button class="sp-close" onclick="PROVA.closePanel()" title="Schließen (ESC)">✕</button>'
      + '</div>'
      + '<div class="sp-tabs" id="sp-tabs"></div>'
      + '<div class="sp-search"><input type="text" id="sp-search" placeholder="🔍 Suchen…" oninput="PROVA._filterPanel()"></div>'
      + '<div class="sp-body" id="sp-body"></div>'
    ;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    titleEl = document.getElementById('sp-title');
    searchInput = document.getElementById('sp-search');
    bodyEl = document.getElementById('sp-body');
    tabsEl = document.getElementById('sp-tabs');
  }

  /* ── Panel öffnen ── */
  PROVA.openPanel = function(type) {
    createDOM();
    currentType = type;
    currentFilter = 'alle';
    searchInput.value = '';

    var titles = {
      normen: '📚 Normen-Bibliothek',
      textbausteine: '📝 Textbausteine',
      positionen: '🗂️ Positionen'
    };
    titleEl.textContent = titles[type] || type;
    searchInput.placeholder = '🔍 ' + (type === 'normen' ? 'Norm suchen (z.B. DIN 4108)…' : type === 'textbausteine' ? 'Baustein suchen…' : 'Position suchen…');

    // Daten laden
    loadPanelData(type);

    overlay.classList.add('open');
    panel.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function() { searchInput.focus(); }, 300);
  };

  /* ── Panel schließen ── */
  PROVA.closePanel = function() {
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
    document.body.style.overflow = '';
  };

  /* ── ESC zum Schließen ── */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && panel && panel.classList.contains('open')) {
      PROVA.closePanel();
    }
  });

  /* ── Daten laden ── */
  function loadPanelData(type) {
    if (type === 'normen') {
      // Normen aus dem globalen NORMEN_DB laden (definiert in normen.html)
      // Fallback: aus Airtable/localStorage
      if (window.NORMEN_DB) {
        currentData = window.NORMEN_DB.map(function(n) {
          return { id: n.num, title: n.num + ' — ' + n.titel, desc: n.anw, category: n.bereich, badge: n.hf, preview: 'Grenzwerte: ' + (n.gw || '–') + '\nMessverfahren: ' + (n.mess || '–'), insertText: n.num + ': ' + n.titel };
        });
      } else {
        currentData = [];
        // Versuche aus localStorage zu laden
        try {
          var cached = JSON.parse(localStorage.getItem('prova_normen_cache') || '[]');
          currentData = cached.map(function(n) {
            return { id: n.num || n.id, title: (n.num || n.id) + ' — ' + n.titel, desc: n.anw || n.beschreibung || '', category: n.bereich || 'Sonstige', badge: n.hf || '', preview: '', insertText: (n.num || n.id) + ': ' + n.titel };
          });
        } catch(e) {}
      }
      renderTabs(currentData, 'bereich');
    } else if (type === 'textbausteine') {
      currentData = [];
      try {
        var tb = JSON.parse(localStorage.getItem('prova_textbausteine') || '[]');
        currentData = tb.map(function(b) {
          return { id: b.id, title: b.titel || b.name, desc: (b.text || '').substring(0, 120) + '…', category: b.kategorie || 'Allgemein', badge: b.kategorie || '', preview: b.text || '', insertText: b.text || '' };
        });
      } catch(e) {}
      renderTabs(currentData, 'kategorie');
    } else if (type === 'positionen') {
      currentData = [];
      try {
        var pos = JSON.parse(localStorage.getItem('prova_positionen') || '[]');
        currentData = pos.map(function(p) {
          return { id: p.id || p.nr, title: (p.nr || '') + ' ' + (p.titel || p.bezeichnung || ''), desc: p.beschreibung || '', category: p.gewerk || 'Sonstige', badge: p.einheit || '', preview: 'Einheit: ' + (p.einheit || '–') + '\nPreisspanne: ' + (p.preis_min || '–') + ' – ' + (p.preis_max || '–') + ' €', insertText: (p.nr || '') + ' ' + (p.titel || p.bezeichnung || '') };
        });
      } catch(e) {}
      renderTabs(currentData, 'gewerk');
    }

    PROVA._filterPanel();
  }

  /* ── Tabs rendern ── */
  function renderTabs(data, categoryField) {
    var cats = {};
    data.forEach(function(d) {
      var c = d.category || 'Sonstige';
      cats[c] = (cats[c] || 0) + 1;
    });
    var html = '<button class="sp-tab active" onclick="PROVA._setFilter(\'alle\',this)">Alle<span class="sp-count">' + data.length + '</span></button>';
    Object.keys(cats).sort().forEach(function(c) {
      html += '<button class="sp-tab" onclick="PROVA._setFilter(\'' + c.replace(/'/g, "\\'") + '\',this)">' + c + '<span class="sp-count">' + cats[c] + '</span></button>';
    });
    tabsEl.innerHTML = html;
  }

  /* ── Filter setzen ── */
  PROVA._setFilter = function(filter, btnEl) {
    currentFilter = filter;
    tabsEl.querySelectorAll('.sp-tab').forEach(function(t) { t.classList.remove('active'); });
    if (btnEl) btnEl.classList.add('active');
    PROVA._filterPanel();
  };

  /* ── Items filtern und rendern ── */
  PROVA._filterPanel = function() {
    var q = (searchInput ? searchInput.value : '').toLowerCase().trim();
    var filtered = currentData.filter(function(d) {
      var matchCat = currentFilter === 'alle' || d.category === currentFilter;
      var matchQ = !q || (d.title + ' ' + d.desc + ' ' + (d.preview || '')).toLowerCase().indexOf(q) !== -1;
      return matchCat && matchQ;
    });

    if (filtered.length === 0) {
      bodyEl.innerHTML = '<div class="sp-empty"><div class="sp-empty-icon">' + (q ? '🔍' : '📭') + '</div><div>' + (q ? 'Keine Ergebnisse für "' + q + '"' : 'Noch keine Einträge') + '</div></div>';
      return;
    }

    var html = '';
    filtered.forEach(function(d, i) {
      var badgeColor = d.badge === 'hoch' ? 'rgba(239,68,68,.15);color:#ef4444' : d.badge === 'mittel' ? 'rgba(245,158,11,.15);color:#f59e0b' : 'rgba(79,142,247,.1);color:#4f8ef7';
      html += '<div class="sp-item" onclick="this.classList.toggle(\'expanded\')">'
        + '<div class="sp-item-head">'
        +   '<div class="sp-item-title">' + escHtml(d.title) + '</div>'
        +   (d.badge ? '<span class="sp-item-badge" style="background:' + badgeColor + '">' + escHtml(d.badge) + '</span>' : '')
        + '</div>'
        + '<div class="sp-item-desc">' + escHtml(d.desc) + '</div>'
        + (d.preview ? '<div class="sp-item-preview">' + escHtml(d.preview).replace(/\n/g, '<br>') + '</div>' : '')
        + '<button class="sp-insert-btn" onclick="event.stopPropagation();PROVA._insertFromPanel(\'' + i + '\')">↗ Einfügen</button>'
        + '</div>';
    });
    bodyEl.innerHTML = html;

    // Daten für Insert merken
    bodyEl._filtered = filtered;
  };

  /* ── Einfügen ── */
  PROVA._insertFromPanel = function(index) {
    var filtered = bodyEl._filtered || [];
    var item = filtered[parseInt(index)];
    if (!item) return;

    if (typeof PROVA.onPanelInsert === 'function') {
      PROVA.onPanelInsert(item.insertText, currentType, item);
    } else {
      // Fallback: Clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(item.insertText).then(function() {
          showInsertToast('In Zwischenablage kopiert ✓');
        });
      }
    }
  };

  /* ── Toast ── */
  function showInsertToast(msg) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:80px;right:440px;padding:10px 16px;border-radius:8px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#10b981;font-size:13px;font-weight:600;z-index:700;animation:spToastIn .3s ease;font-family:inherit;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 2000);

    if (!document.getElementById('sp-toast-anim')) {
      var anim = document.createElement('style');
      anim.id = 'sp-toast-anim';
      anim.textContent = '@keyframes spToastIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}';
      document.head.appendChild(anim);
    }
  }

  /* ── HTML escaping ── */
  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
