/* ════════════════════════════════════════════════════════════════════
   PROVA Bibliothek-Drawer — MEGA⁸⁶ Block C
   ════════════════════════════════════════════════════════════════════
   Right-Side-Slide-In-Drawer der bibliothek.html als Iframe einbettet
   mit Context-aware-Param (?embedded=1&aktion=insert&auftrag_id=X).

   Funktion:
     - Toggle-Button (rendered via mount(targetEl))
     - Hotkey Cmd+B / Ctrl+B öffnet Drawer
     - postMessage-Handler empfängt Insert-Payload aus Iframe
     - Parent-Page kann via `addEventListener('prova:bib-insert', ...)`
       darauf reagieren und in eigene Editor einfügen

   API:
     window.ProvaBibliothekDrawer.open(opts)
        opts: { auftragId?, source? }
     window.ProvaBibliothekDrawer.close()
     window.ProvaBibliothekDrawer.mount(triggerEl, opts)
        — fügt Click-Handler an triggerEl + Hotkey-Listener hinzu
═════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var DRAWER_ID = 'prova-bib-drawer';
  var BACKDROP_ID = 'prova-bib-drawer-backdrop';
  var FRAME_ID = 'prova-bib-drawer-frame';
  var _opts = {};

  function _injectStyle(){
    if (document.getElementById('prova-bib-drawer-style')) return;
    var s = document.createElement('style');
    s.id = 'prova-bib-drawer-style';
    s.textContent = [
      '#' + BACKDROP_ID + '{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;opacity:0;pointer-events:none;transition:opacity .2s;backdrop-filter:blur(2px);}',
      '#' + BACKDROP_ID + '.is-open{opacity:1;pointer-events:auto;}',
      '#' + DRAWER_ID + '{position:fixed;top:0;right:0;bottom:0;width:60vw;max-width:920px;background:#0b0d11;border-left:1px solid rgba(255,255,255,.11);z-index:9999;transform:translateX(105%);transition:transform .25s ease;display:flex;flex-direction:column;box-shadow:-12px 0 32px rgba(0,0,0,.4);}',
      '#' + DRAWER_ID + '.is-open{transform:translateX(0);}',
      '#' + DRAWER_ID + ' .pbd-head{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;color:#eaecf4;font:600 14px system-ui,sans-serif;}',
      '#' + DRAWER_ID + ' .pbd-head .pbd-title{flex:1;}',
      '#' + DRAWER_ID + ' .pbd-close{background:transparent;border:1px solid rgba(255,255,255,.15);color:#8b93ab;width:30px;height:30px;border-radius:6px;cursor:pointer;font-size:18px;line-height:1;}',
      '#' + DRAWER_ID + ' .pbd-close:hover{color:#fff;border-color:rgba(255,255,255,.3);}',
      '#' + FRAME_ID + '{flex:1;width:100%;border:0;background:#0b0d11;}',
      '@media (max-width: 768px) {',
      '  #' + DRAWER_ID + '{width:100vw;max-width:100vw;}',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function _ensure(){
    var drawer = document.getElementById(DRAWER_ID);
    if (drawer) return;
    _injectStyle();
    var bd = document.createElement('div');
    bd.id = BACKDROP_ID;
    bd.addEventListener('click', close);
    document.body.appendChild(bd);

    var d = document.createElement('aside');
    d.id = DRAWER_ID;
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Bibliothek');
    d.innerHTML = '<div class="pbd-head"><span class="pbd-title">📚 Bibliothek</span><button class="pbd-close" type="button" aria-label="Schließen">×</button></div>' +
                  '<iframe id="' + FRAME_ID + '" loading="lazy" title="Bibliothek-Embedded"></iframe>';
    document.body.appendChild(d);
    d.querySelector('.pbd-close').addEventListener('click', close);
  }

  function open(opts){
    _opts = opts || {};
    _ensure();
    var url = '/bibliothek.html?embedded=1';
    if (_opts.auftragId) url += '&aktion=insert&auftrag_id=' + encodeURIComponent(_opts.auftragId);
    if (_opts.source) url += '&source=' + encodeURIComponent(_opts.source);
    document.getElementById(FRAME_ID).src = url;
    setTimeout(function(){
      document.getElementById(BACKDROP_ID).classList.add('is-open');
      document.getElementById(DRAWER_ID).classList.add('is-open');
    }, 10);
    document.body.style.overflow = 'hidden';
  }

  function close(){
    var d = document.getElementById(DRAWER_ID);
    var bd = document.getElementById(BACKDROP_ID);
    if (d) d.classList.remove('is-open');
    if (bd) bd.classList.remove('is-open');
    document.body.style.overflow = '';
    // Iframe entladen damit nächstes Open frischen State hat
    setTimeout(function(){
      var f = document.getElementById(FRAME_ID);
      if (f) f.src = 'about:blank';
    }, 260);
  }

  function mount(triggerEl, opts){
    _opts = opts || {};
    if (triggerEl) {
      triggerEl.addEventListener('click', function(e){ e.preventDefault(); open(_opts); });
    }
    // Hotkey: Cmd+B / Ctrl+B
    if (!window.__provaBibDrawerHotkeyBound) {
      document.addEventListener('keydown', function(e){
        var isMod = e.metaKey || e.ctrlKey;
        if (!isMod || e.shiftKey || e.altKey) return;
        if (e.key !== 'b' && e.key !== 'B') return;
        // In Input/Textarea NICHT triggern
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        open(_opts);
      }, true);
      window.__provaBibDrawerHotkeyBound = true;
    }
  }

  // postMessage-Empfänger: bibliothek.html embedded sendet Insert-Payload
  window.addEventListener('message', function(ev){
    if (!ev.data || ev.data.source !== 'prova-bibliothek-embedded') return;
    if (ev.data.type === 'insert') {
      var payload = ev.data.payload || {};
      // Parent-Page-Event triggern (Editor kann darauf reagieren)
      try {
        window.dispatchEvent(new CustomEvent('prova:bib-insert', { detail: payload }));
      } catch(_) {}
      close();
    } else if (ev.data.type === 'close') {
      close();
    }
  });

  window.ProvaBibliothekDrawer = { open: open, close: close, mount: mount };
})();
