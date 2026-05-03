/**
 * PROVA Systems — Empty-State + Toast Helper
 * MEGA⁷ U3 (04.05.2026)
 *
 * Public API:
 *   ProvaUI.emptyState(target, { icon, title, text, primaryBtn?, secondaryBtn? })
 *   ProvaUI.skeleton(target, type) // 'list' | 'cards' | 'rows'
 *   ProvaUI.toast(message, type?)  // 'success' | 'error' | 'info'
 */
'use strict';

(function () {
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    if (children) {
      if (typeof children === 'string') e.textContent = children;
      else if (Array.isArray(children)) children.forEach(c => c && e.appendChild(c));
      else e.appendChild(children);
    }
    return e;
  }

  function emptyState(targetSelector, opts) {
    const target = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
    if (!target) return;
    target.innerHTML = '';

    const wrap = el('div', { class: 'prova-empty-state' });
    if (opts.icon)  wrap.appendChild(el('div', { class: 'prova-empty-state__icon', 'aria-hidden': 'true' }, opts.icon));
    if (opts.title) wrap.appendChild(el('h3', { class: 'prova-empty-state__title' }, opts.title));
    if (opts.text)  wrap.appendChild(el('p',  { class: 'prova-empty-state__text' }, opts.text));

    const actions = el('div', { class: 'prova-empty-state__actions' });

    if (opts.primaryBtn) {
      const btn = el(opts.primaryBtn.href ? 'a' : 'button',
        { class: 'prova-empty-state__btn',
          ...(opts.primaryBtn.href ? { href: opts.primaryBtn.href } : { type: 'button' }),
          ...(opts.primaryBtn.onClick ? { onclick: opts.primaryBtn.onClick } : {})
        },
        opts.primaryBtn.label);
      actions.appendChild(btn);
    }
    if (opts.secondaryBtn) {
      const btn = el(opts.secondaryBtn.href ? 'a' : 'button',
        { class: 'prova-empty-state__btn prova-empty-state__btn--secondary',
          ...(opts.secondaryBtn.href ? { href: opts.secondaryBtn.href } : { type: 'button' }),
          ...(opts.secondaryBtn.onClick ? { onclick: opts.secondaryBtn.onClick } : {})
        },
        opts.secondaryBtn.label);
      actions.appendChild(btn);
    }
    wrap.appendChild(actions);
    target.appendChild(wrap);
  }

  function skeleton(targetSelector, type, count) {
    const target = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
    if (!target) return;
    target.innerHTML = '';
    const c = count || 5;

    if (type === 'cards') {
      for (let i = 0; i < c; i++) {
        target.appendChild(el('div', { class: 'prova-skeleton prova-skeleton--card' }));
      }
      return;
    }

    if (type === 'rows' || type === 'list') {
      const list = el('div', { class: 'prova-skeleton-list' });
      for (let i = 0; i < c; i++) {
        const row = el('div', { class: 'row' });
        row.appendChild(el('span', { class: 'prova-skeleton prova-skeleton--avatar' }));
        const colGrow = el('div', { class: 'col-grow' });
        colGrow.appendChild(el('span', { class: 'prova-skeleton prova-skeleton--text-medium' }));
        colGrow.appendChild(el('span', { class: 'prova-skeleton prova-skeleton--text-short' }));
        row.appendChild(colGrow);
        row.appendChild(el('span', { class: 'prova-skeleton prova-skeleton--button' }));
        list.appendChild(row);
      }
      target.appendChild(list);
      return;
    }

    // Default: 3 generic blocks
    for (let i = 0; i < c; i++) {
      target.appendChild(el('div', { class: 'prova-skeleton prova-skeleton--block', style: 'margin-bottom:12px;display:block' }));
    }
  }

  let _toastTimer = null;
  function toast(message, type) {
    type = type || 'info';
    let t = document.getElementById('prova-toast');
    if (!t) {
      t = el('div', { id: 'prova-toast', class: 'prova-toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(t);
    }
    t.className = 'prova-toast prova-toast--' + type;
    t.textContent = message;
    requestAnimationFrame(() => t.classList.add('show'));
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), type === 'error' ? 5000 : 3000);
  }

  window.ProvaUI = window.ProvaUI || {};
  window.ProvaUI.emptyState = emptyState;
  window.ProvaUI.skeleton   = skeleton;
  window.ProvaUI.toast      = toast;
})();
