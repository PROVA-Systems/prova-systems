/**
 * PROVA Inline-Edit (MEGA⁷⁰ Phase 2.1)
 *
 * Click-to-Edit-Pattern für Felder mit Auto-Save.
 * Drop-in: profil, kontakte, positionen, fristen.
 *
 * API (data-attribute Pattern):
 *   <span data-prova-inline-edit
 *         data-pie-id="row-uuid"
 *         data-pie-field="email"
 *         data-pie-type="text|email|tel|textarea"
 *         data-pie-table="kontakte">
 *     existing-value
 *   </span>
 *
 *   ProvaInlineEdit.install({ selector?: '[data-prova-inline-edit]' })
 *   ProvaInlineEdit.onSave(async ({ table, id, field, value }) => { ... })
 *
 * Default-Save: nutzt /lib/supabase-client.js Singleton → table.update({[field]: value}).eq('id', id)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-inline-edit-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-inline-edit-style';
    style.textContent = `
      [data-prova-inline-edit] { cursor: text; padding: 2px 4px; border-radius: 4px; border: 1px solid transparent; transition: all .12s; }
      [data-prova-inline-edit]:hover { border-color: var(--border2, rgba(255,255,255,0.16)); background: rgba(255,255,255,.04); }
      [data-prova-inline-edit].pie-editing { background: var(--bg, #0b0d11); border-color: var(--accent, #4f8ef7); padding: 0; }
      [data-prova-inline-edit] input, [data-prova-inline-edit] textarea { width: 100%; padding: 4px 8px; background: transparent; border: none; color: var(--text, #eaecf4); font: inherit; font-family: inherit; outline: none; }
      [data-prova-inline-edit] textarea { min-height: 60px; resize: vertical; }
      .pie-status { display: inline-block; margin-left: 6px; font-size: 10px; padding: 1px 6px; border-radius: 4px; }
      .pie-status.is-saving { background: rgba(245,158,11,.18); color: #fcd34d; }
      .pie-status.is-saved { background: rgba(16,185,129,.18); color: #6ee7b7; }
      .pie-status.is-error { background: rgba(239,68,68,.18); color: #fca5a5; }
    `;
    document.head.appendChild(style);
  }

  let _customSaveFn = null;

  async function _defaultSave({ table, id, field, value }) {
    const mod = await import('/lib/supabase-client.js');
    const { error } = await mod.supabase.from(table).update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  function _toggleEdit(el) {
    if (el.classList.contains('pie-editing')) return;
    const type = el.dataset.pieType || 'text';
    const orig = el.textContent.trim();
    el.classList.add('pie-editing');
    const tag = type === 'textarea' ? 'textarea' : 'input';
    el.innerHTML = `<${tag} ${tag === 'input' ? `type="${type}"` : ''}>${tag === 'textarea' ? orig : ''}</${tag}>`;
    const inp = el.querySelector(tag);
    if (tag === 'input') inp.value = orig;
    inp.focus();
    if (typeof inp.select === 'function') inp.select();
    const finish = async (save) => {
      const newVal = inp.value.trim();
      el.classList.remove('pie-editing');
      if (!save || newVal === orig) {
        el.textContent = orig;
        return;
      }
      el.textContent = newVal;
      // Status-Indicator
      const status = document.createElement('span');
      status.className = 'pie-status is-saving';
      status.textContent = '⏳';
      el.appendChild(status);
      try {
        const payload = { table: el.dataset.pieTable, id: el.dataset.pieId, field: el.dataset.pieField, value: newVal };
        if (!payload.table || !payload.id || !payload.field) throw new Error('Missing data-pie-{table,id,field}');
        await (_customSaveFn || _defaultSave)(payload);
        status.className = 'pie-status is-saved';
        status.textContent = '✓';
        setTimeout(() => status.remove(), 1400);
      } catch (e) {
        status.className = 'pie-status is-error';
        status.textContent = '✗ ' + e.message;
        setTimeout(() => status.remove(), 4000);
        el.textContent = orig;
        el.appendChild(status);
      }
    };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (tag === 'input' || e.metaKey || e.ctrlKey)) { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    inp.addEventListener('blur', () => finish(true));
  }

  const ProvaInlineEdit = {
    install({ selector = '[data-prova-inline-edit]' } = {}) {
      _injectStyle();
      // Event-Delegation für dynamische Listen
      document.addEventListener('click', (e) => {
        const el = e.target.closest(selector);
        if (el) _toggleEdit(el);
      });
    },
    onSave(fn) { _customSaveFn = typeof fn === 'function' ? fn : null; }
  };

  global.ProvaInlineEdit = ProvaInlineEdit;
  // Auto-Install on script load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => ProvaInlineEdit.install());
    else ProvaInlineEdit.install();
  }
})(typeof window !== 'undefined' ? window : globalThis);
