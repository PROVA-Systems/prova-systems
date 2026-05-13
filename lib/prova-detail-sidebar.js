/**
 * PROVA Detail-Sidebar (MEGA⁷⁰ Phase 2.1)
 *
 * Slide-Off-Sidebar von rechts mit Form-Felder + Save-Action.
 * Drop-in für: rechnungen, kontakte, fristen, termine, bescheinigungen.
 *
 * API:
 *   ProvaDetailSidebar.open({
 *     title,
 *     subtitle?,
 *     fields: [{ id, label, type, value, options?, required?, placeholder? }],
 *     actions?: [{ label, onClick, variant? }],
 *     onSave: (values) => Promise<void>
 *   })
 *   ProvaDetailSidebar.close()
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-detail-sidebar-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-detail-sidebar-style';
    style.textContent = `
      .pds-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 800; display: none; }
      .pds-overlay.is-open { display: block; }
      .pds-panel { position: fixed; top: 0; right: -480px; bottom: 0; width: 480px; max-width: 100vw; background: var(--surface, #1c2130); border-left: 1px solid var(--border2, rgba(255,255,255,0.16)); z-index: 810; display: flex; flex-direction: column; transition: right .25s ease; font-family: 'DM Sans', system-ui, sans-serif; color: var(--text, #eaecf4); }
      .pds-panel.is-open { right: 0; }
      .pds-head { padding: 18px 22px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.10)); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .pds-head h2 { font-size: 16px; font-weight: 700; }
      .pds-head .pds-sub { font-size: 12px; color: var(--text2, #a3abc2); margin-top: 2px; }
      .pds-close { background: transparent; border: none; color: var(--text2); font-size: 22px; cursor: pointer; padding: 4px 8px; }
      .pds-body { padding: 18px 22px; overflow-y: auto; flex: 1; }
      .pds-foot { padding: 14px 22px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
      .pds-field { margin-bottom: 14px; }
      .pds-field-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--text3, #8b93ab); font-weight: 700; margin-bottom: 5px; }
      .pds-field-label.required::after { content: ' *'; color: var(--danger, #ef4444); }
      .pds-input, .pds-textarea, .pds-select { width: 100%; padding: 9px 12px; background: var(--bg, #0b0d11); border: 1px solid var(--border2); border-radius: 7px; color: var(--text); font: 13px inherit; font-family: inherit; }
      .pds-textarea { min-height: 90px; resize: vertical; }
      .pds-btn { padding: 9px 18px; border-radius: 7px; font: 700 13px inherit; cursor: pointer; border: 1px solid var(--border2); background: transparent; color: var(--text2); font-family: inherit; }
      .pds-btn:hover { color: var(--text); border-color: var(--accent, #4f8ef7); }
      .pds-btn-primary { background: linear-gradient(135deg, var(--accent, #4f8ef7), var(--accent2, #3a7be0)); color: #fff; border: none; }
      .pds-btn-danger { color: var(--danger, #ef4444); border-color: rgba(239,68,68,.4); }
    `;
    document.head.appendChild(style);
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function _renderField(f) {
    const labelCls = f.required ? 'pds-field-label required' : 'pds-field-label';
    if (f.type === 'textarea') {
      return `<div class="pds-field"><div class="${labelCls}">${_esc(f.label)}</div><textarea class="pds-textarea" id="pds-${_esc(f.id)}" placeholder="${_esc(f.placeholder || '')}">${_esc(f.value || '')}</textarea></div>`;
    }
    if (f.type === 'select') {
      const opts = (f.options || []).map(o => `<option value="${_esc(o.value)}" ${o.value === f.value ? 'selected' : ''}>${_esc(o.label || o.value)}</option>`).join('');
      return `<div class="pds-field"><div class="${labelCls}">${_esc(f.label)}</div><select class="pds-select" id="pds-${_esc(f.id)}"><option value="">— wählen —</option>${opts}</select></div>`;
    }
    return `<div class="pds-field"><div class="${labelCls}">${_esc(f.label)}</div><input type="${_esc(f.type || 'text')}" class="pds-input" id="pds-${_esc(f.id)}" value="${_esc(f.value || '')}" placeholder="${_esc(f.placeholder || '')}"></div>`;
  }

  const ProvaDetailSidebar = {
    _overlay: null,
    _panel: null,

    open({ title, subtitle, fields, actions, onSave }) {
      _injectStyle();
      this.close();
      const overlay = document.createElement('div');
      overlay.className = 'pds-overlay';
      const panel = document.createElement('aside');
      panel.className = 'pds-panel';
      panel.innerHTML = `
        <div class="pds-head">
          <div>
            <h2>${_esc(title || 'Details')}</h2>
            ${subtitle ? `<div class="pds-sub">${_esc(subtitle)}</div>` : ''}
          </div>
          <button class="pds-close" onclick="window.ProvaDetailSidebar.close()" aria-label="Schließen">×</button>
        </div>
        <div class="pds-body">
          ${(fields || []).map(_renderField).join('')}
        </div>
        <div class="pds-foot">
          ${(actions || []).map((a, i) => `<button class="pds-btn ${a.variant === 'danger' ? 'pds-btn-danger' : ''}" data-action="${i}">${_esc(a.label)}</button>`).join('')}
          <button class="pds-btn" onclick="window.ProvaDetailSidebar.close()">Abbrechen</button>
          ${onSave ? '<button class="pds-btn pds-btn-primary" id="pds-save">Speichern</button>' : ''}
        </div>
      `;
      document.body.appendChild(overlay);
      document.body.appendChild(panel);
      this._overlay = overlay; this._panel = panel;
      requestAnimationFrame(() => { overlay.classList.add('is-open'); panel.classList.add('is-open'); });
      overlay.addEventListener('click', () => this.close());
      if (actions) panel.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => {
        const a = actions[+b.dataset.action];
        if (a && typeof a.onClick === 'function') a.onClick();
      }));
      if (onSave) {
        panel.querySelector('#pds-save').addEventListener('click', async () => {
          const vals = {};
          (fields || []).forEach(f => { const el = document.getElementById('pds-' + f.id); if (el) vals[f.id] = el.value; });
          try { await onSave(vals); this.close(); } catch (e) { alert('Fehler: ' + e.message); }
        });
      }
      this._keyHandler = (e) => { if (e.key === 'Escape') this.close(); };
      document.addEventListener('keydown', this._keyHandler);
    },

    close() {
      if (this._overlay) { this._overlay.remove(); this._overlay = null; }
      if (this._panel) { this._panel.remove(); this._panel = null; }
      if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    }
  };

  global.ProvaDetailSidebar = ProvaDetailSidebar;
})(typeof window !== 'undefined' ? window : globalThis);
