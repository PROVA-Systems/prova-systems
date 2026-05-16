/* ════════════════════════════════════════════════════════════════════
   PROVA Skizzen-Pins-Lib — MEGA⁸⁴ Block A.2
   ════════════════════════════════════════════════════════════════════
   Foto-Pin-Mode für Skizzen-SVG. User klickt auf SVG → Pin-Marker.
   Modal: Foto auswählen / hochladen / beschriften.
   Persistenz in skizzen.foto_pins jsonb (Migration 58).

   API:
     window.ProvaSkizzePins.attach(svgEl, opts)
     window.ProvaSkizzePins.detach(svgEl)
     window.ProvaSkizzePins.setMode(svgEl, 'pin' | 'view')
     window.ProvaSkizzePins.load(skizzeId)  → liefert pins-Array
     window.ProvaSkizzePins.save(skizzeId, pins)  → persistiert

   Pin-Format: { id, x_pct, y_pct, foto_id, label, kategorie?, ki_caption?, created_at }
═════════════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  function uuid(){ return ('p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8)); }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  async function _getSb(){
    if (_getSb._c) return _getSb._c;
    try {
      var mod = await import('/lib/supabase-client.js');
      _getSb._c = mod.supabase || (mod.getSupabase && mod.getSupabase());
      return _getSb._c;
    } catch(e){ console.warn('[skizze-pins] sb import failed', e); return null; }
  }

  function _injectStyle(){
    if (document.getElementById('prova-skizze-pins-style')) return;
    var css = ''
      + '.sp-pin{cursor:pointer;transition:transform .15s;}'
      + '.sp-pin:hover{transform:scale(1.2);}'
      + '.sp-pin-circle{fill:#4f8ef7;stroke:#fff;stroke-width:2;}'
      + '.sp-pin-num{fill:#fff;font-size:14px;font-weight:800;text-anchor:middle;dominant-baseline:central;font-family:DM Sans,system-ui;pointer-events:none;}'
      + '.sp-pin-mode-active .sp-svg-wrap{cursor:crosshair;}'
      + '.sp-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(3px);z-index:1100;display:none;align-items:center;justify-content:center;padding:20px;}'
      + '.sp-modal-overlay.is-open{display:flex;}'
      + '.sp-modal-card{background:var(--surface,#1c2130);border:1px solid var(--border2,rgba(255,255,255,.11));border-radius:14px;padding:24px;max-width:480px;width:100%;}'
      + '.sp-modal-card h3{font-size:16px;font-weight:700;color:var(--text,#eaecf4);margin:0 0 14px;}'
      + '.sp-modal-row{margin-bottom:12px;}'
      + '.sp-modal-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#4d5568);margin-bottom:4px;}'
      + '.sp-modal-input,.sp-modal-select{width:100%;padding:9px 12px;background:var(--bg3,#161a22);border:1px solid var(--border2,rgba(255,255,255,.11));border-radius:8px;color:var(--text,#eaecf4);font-family:inherit;font-size:13px;}'
      + '.sp-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;}'
      + '.sp-btn{padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border:none;}'
      + '.sp-btn-secondary{background:none;border:1px solid var(--border2,rgba(255,255,255,.11));color:var(--text2,#8b93ab);}'
      + '.sp-btn-primary{background:linear-gradient(135deg,#4f8ef7,#3a7be0);color:#fff;}'
      + '.sp-btn-danger{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#ef4444;}'
      + '.sp-toolbar-toggle{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;background:var(--surface,#1c2130);border:1px solid var(--border2,rgba(255,255,255,.11));border-radius:8px;color:var(--text2,#8b93ab);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;}'
      + '.sp-toolbar-toggle[data-active="true"]{background:rgba(79,142,247,.18);border-color:var(--accent,#4f8ef7);color:var(--accent,#4f8ef7);}';
    var st = document.createElement('style');
    st.id = 'prova-skizze-pins-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function _renderPins(svgEl, pins){
    // Bestehende Pins entfernen
    svgEl.querySelectorAll('.sp-pin').forEach(p => p.remove());
    var viewBox = svgEl.viewBox && svgEl.viewBox.baseVal;
    var vbW = viewBox && viewBox.width ? viewBox.width : (svgEl.clientWidth || 800);
    var vbH = viewBox && viewBox.height ? viewBox.height : (svgEl.clientHeight || 600);
    (pins || []).forEach(function(pin, idx){
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'sp-pin');
      g.setAttribute('data-pin-id', pin.id);
      var cx = (Number(pin.x_pct) / 100) * vbW;
      var cy = (Number(pin.y_pct) / 100) * vbH;
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'sp-pin-circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', '14');
      g.appendChild(circle);
      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'sp-pin-num');
      text.setAttribute('x', cx);
      text.setAttribute('y', cy);
      text.textContent = String(idx + 1);
      g.appendChild(text);
      g.addEventListener('click', function(e){
        e.stopPropagation();
        var state = _state.get(svgEl);
        if (!state) return;
        if (state.mode === 'pin') {
          // Im Pin-Mode: Click auf existierenden Pin → Edit
          _openEditModal(svgEl, pin);
        } else {
          // View-Mode: Lightbox
          _openLightbox(pin);
        }
      });
      svgEl.appendChild(g);
    });
  }

  function _openCreateModal(svgEl, x_pct, y_pct){
    var modal = _ensureModal();
    modal.dataset.mode = 'create';
    modal.querySelector('h3').textContent = 'Pin platzieren';
    modal.querySelector('[data-field="label"]').value = '';
    modal.querySelector('[data-field="kategorie"]').value = '';
    modal.querySelector('[data-field="foto_id"]').value = '';
    modal.querySelector('[data-action="delete"]').style.display = 'none';
    modal._pendingX = x_pct;
    modal._pendingY = y_pct;
    modal._pendingPinId = null;
    modal._svgRef = svgEl;
    modal.classList.add('is-open');
  }

  function _openEditModal(svgEl, pin){
    var modal = _ensureModal();
    modal.dataset.mode = 'edit';
    modal.querySelector('h3').textContent = 'Pin bearbeiten (#' + esc(pin.id.slice(-4)) + ')';
    modal.querySelector('[data-field="label"]').value = pin.label || '';
    modal.querySelector('[data-field="kategorie"]').value = pin.kategorie || '';
    modal.querySelector('[data-field="foto_id"]').value = pin.foto_id || '';
    modal.querySelector('[data-action="delete"]').style.display = '';
    modal._pendingPinId = pin.id;
    modal._svgRef = svgEl;
    modal.classList.add('is-open');
  }

  function _ensureModal(){
    var existing = document.getElementById('sp-pin-modal');
    if (existing) return existing;
    var modal = document.createElement('div');
    modal.id = 'sp-pin-modal';
    modal.className = 'sp-modal-overlay';
    modal.innerHTML = ''
      + '<div class="sp-modal-card">'
      + '  <h3>Pin platzieren</h3>'
      + '  <div class="sp-modal-row">'
      + '    <label class="sp-modal-label">Beschriftung</label>'
      + '    <input class="sp-modal-input" type="text" data-field="label" placeholder="z.B. Schimmelbefall Ecke">'
      + '  </div>'
      + '  <div class="sp-modal-row">'
      + '    <label class="sp-modal-label">Kategorie</label>'
      + '    <select class="sp-modal-select" data-field="kategorie">'
      + '      <option value="">— keine —</option>'
      + '      <option value="befund">Befund</option>'
      + '      <option value="schaden">Schaden</option>'
      + '      <option value="messung">Messung</option>'
      + '      <option value="referenz">Referenz</option>'
      + '    </select>'
      + '  </div>'
      + '  <div class="sp-modal-row">'
      + '    <label class="sp-modal-label">Foto-ID (optional)</label>'
      + '    <input class="sp-modal-input" type="text" data-field="foto_id" placeholder="UUID aus dokumente.id oder fotos.id">'
      + '    <div style="font-size:10px;color:var(--text3,#4d5568);margin-top:3px;">Foto-Auswahl-UI folgt — vorerst manuelle UUID</div>'
      + '  </div>'
      + '  <div class="sp-modal-actions">'
      + '    <button type="button" class="sp-btn sp-btn-danger" data-action="delete" style="display:none;">Löschen</button>'
      + '    <button type="button" class="sp-btn sp-btn-secondary" data-action="cancel">Abbrechen</button>'
      + '    <button type="button" class="sp-btn sp-btn-primary" data-action="save">Speichern</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e){ if (e.target === modal) _closeModal(); });
    modal.querySelector('[data-action="cancel"]').addEventListener('click', _closeModal);
    modal.querySelector('[data-action="save"]').addEventListener('click', _saveModalPin);
    modal.querySelector('[data-action="delete"]').addEventListener('click', _deleteModalPin);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && modal.classList.contains('is-open')) _closeModal(); });
    return modal;
  }

  function _closeModal(){
    var modal = document.getElementById('sp-pin-modal');
    if (modal) modal.classList.remove('is-open');
  }

  function _saveModalPin(){
    var modal = document.getElementById('sp-pin-modal');
    var svgEl = modal._svgRef;
    if (!svgEl) return;
    var state = _state.get(svgEl);
    if (!state) return;
    var label = modal.querySelector('[data-field="label"]').value.trim();
    var kategorie = modal.querySelector('[data-field="kategorie"]').value;
    var foto_id = modal.querySelector('[data-field="foto_id"]').value.trim();
    if (modal.dataset.mode === 'create') {
      var pin = {
        id: uuid(),
        x_pct: modal._pendingX,
        y_pct: modal._pendingY,
        foto_id: foto_id || null,
        label: label,
        kategorie: kategorie || null,
        created_at: new Date().toISOString()
      };
      state.pins.push(pin);
    } else {
      var p = state.pins.find(p => p.id === modal._pendingPinId);
      if (p) {
        p.label = label;
        p.kategorie = kategorie || null;
        p.foto_id = foto_id || null;
      }
    }
    _renderPins(svgEl, state.pins);
    _persistPins(state.skizzeId, state.pins);
    _closeModal();
  }

  function _deleteModalPin(){
    var modal = document.getElementById('sp-pin-modal');
    var svgEl = modal._svgRef;
    if (!svgEl || !modal._pendingPinId) return;
    if (!confirm('Pin löschen?')) return;
    var state = _state.get(svgEl);
    if (!state) return;
    state.pins = state.pins.filter(p => p.id !== modal._pendingPinId);
    _renderPins(svgEl, state.pins);
    _persistPins(state.skizzeId, state.pins);
    _closeModal();
  }

  function _openLightbox(pin){
    var existing = document.getElementById('sp-lightbox');
    if (existing) existing.remove();
    var box = document.createElement('div');
    box.id = 'sp-lightbox';
    box.className = 'sp-modal-overlay is-open';
    box.style.zIndex = 1200;
    var caption = pin.ki_caption ? '<p style="font-style:italic;color:var(--text2,#8b93ab);margin-top:10px;">' + esc(pin.ki_caption) + '</p>' : '';
    var fotoEmbed = pin.foto_id
      ? '<div style="text-align:center;color:var(--text3,#4d5568);padding:24px;font-style:italic;">Foto-Embed kommt mit Foto-Picker-UI</div>'
      : '<div style="text-align:center;color:var(--text3,#4d5568);padding:24px;">Kein Foto verknüpft.</div>';
    box.innerHTML = '<div class="sp-modal-card">'
      + '<h3>' + esc(pin.label || 'Pin') + '</h3>'
      + (pin.kategorie ? '<div style="font-size:11px;color:var(--accent,#4f8ef7);font-weight:600;margin-bottom:10px;">' + esc(pin.kategorie.toUpperCase()) + '</div>' : '')
      + fotoEmbed + caption
      + '<div class="sp-modal-actions"><button class="sp-btn sp-btn-secondary" onclick="document.getElementById(\'sp-lightbox\').remove()">Schließen</button></div>'
      + '</div>';
    box.addEventListener('click', function(e){ if (e.target === box) box.remove(); });
    document.body.appendChild(box);
  }

  async function _persistPins(skizzeId, pins){
    if (!skizzeId) {
      console.warn('[skizze-pins] kein skizzeId → kein Persist');
      return;
    }
    var sb = await _getSb();
    if (!sb) return;
    try {
      var res = await sb.from('skizzen').update({ foto_pins: pins }).eq('id', skizzeId);
      if (res.error) console.warn('[skizze-pins] persist error', res.error.message);
    } catch(e){ console.warn('[skizze-pins] persist exception', e); }
  }

  async function _loadPins(skizzeId){
    if (!skizzeId) return [];
    var sb = await _getSb();
    if (!sb) return [];
    try {
      var res = await sb.from('skizzen').select('foto_pins').eq('id', skizzeId).maybeSingle();
      if (res.error) { console.warn('[skizze-pins] load error', res.error.message); return []; }
      return (res.data && Array.isArray(res.data.foto_pins)) ? res.data.foto_pins : [];
    } catch(e){ console.warn('[skizze-pins] load exception', e); return []; }
  }

  // SVG-State pro Element
  var _state = new WeakMap();

  function _svgClickHandler(e){
    var svgEl = e.currentTarget;
    var state = _state.get(svgEl);
    if (!state || state.mode !== 'pin') return;
    // Click auf SVG-Background → Pin platzieren
    if (e.target.closest && e.target.closest('.sp-pin')) return;  // Click auf Pin → eigener Handler
    var rect = svgEl.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width * 100;
    var y = (e.clientY - rect.top) / rect.height * 100;
    _openCreateModal(svgEl, x, y);
  }

  function attach(svgEl, opts){
    opts = opts || {};
    _injectStyle();
    var state = { mode: 'view', pins: [], skizzeId: opts.skizzeId || null };
    _state.set(svgEl, state);
    svgEl.addEventListener('click', _svgClickHandler);
    // Initial-Load
    if (state.skizzeId) {
      _loadPins(state.skizzeId).then(function(pins){
        state.pins = pins;
        _renderPins(svgEl, state.pins);
      });
    }
    return state;
  }

  function detach(svgEl){
    svgEl.removeEventListener('click', _svgClickHandler);
    svgEl.querySelectorAll('.sp-pin').forEach(p => p.remove());
    _state.delete(svgEl);
  }

  function setMode(svgEl, mode){
    var state = _state.get(svgEl);
    if (!state) return;
    state.mode = mode;
    var wrap = svgEl.closest('.sp-svg-wrap') || svgEl.parentElement;
    if (wrap) wrap.classList.toggle('sp-pin-mode-active', mode === 'pin');
  }

  global.ProvaSkizzePins = {
    attach: attach,
    detach: detach,
    setMode: setMode,
    load: _loadPins,
    save: _persistPins
  };
})(typeof window !== 'undefined' ? window : globalThis);
