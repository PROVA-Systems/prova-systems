/**
 * PROVA — Dashboard-Fristen-Widget (MEGA³² W11-I2)
 *
 * Zeigt Top-5 anstehende offene Fristen auf dashboard.html.
 * Color-Code: 🔴 (≤3 Tage), 🟡 (≤7), 🟢 (>7).
 * Auto-Refresh: alle 5 Min.
 *
 * Usage: <div data-dashboard-fristen></div>
 */
'use strict';

(function () {
  const REFRESH_MS = 5 * 60 * 1000;
  const API = '/.netlify/functions/dashboard-fristen-upcoming';

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('de-DE'); } catch (e) { return d; } }

  function diffDays(d) {
    const t = new Date(d + 'T00:00:00').getTime();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((t - today.getTime()) / 86400000);
  }

  function colorCode(td) {
    if (td <= 3) return { cls: 'dfw-critical', icon: '🔴', label: td === 0 ? 'heute' : (td < 0 ? 'überfällig' : 'T-' + td) };
    if (td <= 7) return { cls: 'dfw-warning', icon: '🟡', label: 'T-' + td };
    return { cls: 'dfw-ok', icon: '🟢', label: 'T-' + td };
  }

  function ensureStyles() {
    if (document.getElementById('dfw-styles')) return;
    const s = document.createElement('style');
    s.id = 'dfw-styles';
    s.textContent = `
      .dfw-card{background:var(--surface,#1c2130);border:1px solid var(--border,rgba(255,255,255,.06));border-radius:12px;padding:14px 16px;margin-bottom:14px;}
      .dfw-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
      .dfw-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#4d5568);}
      .dfw-link{font-size:11px;color:var(--accent,#4f8ef7);text-decoration:none;}
      .dfw-link:hover{text-decoration:underline;}
      .dfw-list{display:flex;flex-direction:column;gap:6px;}
      .dfw-item{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:center;padding:8px 10px;background:rgba(255,255,255,.02);border-radius:8px;cursor:pointer;text-decoration:none;color:inherit;transition:background .12s;}
      .dfw-item:hover{background:rgba(255,255,255,.05);}
      .dfw-icon{font-size:14px;text-align:center;}
      .dfw-text{font-size:13px;color:var(--text,#eaecf4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .dfw-text-sub{font-size:10px;color:var(--text3,#4d5568);}
      .dfw-pill{font-size:10px;font-weight:700;padding:3px 9px;border-radius:8px;}
      .dfw-pill.dfw-ok{background:rgba(16,185,129,.12);color:#10b981;}
      .dfw-pill.dfw-warning{background:rgba(245,158,11,.12);color:#f59e0b;}
      .dfw-pill.dfw-critical{background:rgba(239,68,68,.12);color:#ef4444;}
      .dfw-empty{padding:18px 10px;text-align:center;color:var(--text3,#4d5568);font-size:12px;}
      .dfw-loading{padding:14px 10px;color:var(--text3,#4d5568);font-size:11px;font-style:italic;}
    `;
    document.head.appendChild(s);
  }

  async function fetchFristen() {
    const fetcher = window.provaFetch || window.fetch.bind(window);
    const res = await fetcher(API);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  function buildList(fristen) {
    if (!fristen || !fristen.length) {
      return '<div class="dfw-empty">Keine anstehenden Fristen — alles im grünen Bereich! 🎉</div>';
    }
    return '<div class="dfw-list">' + fristen.map(f => {
      const td = diffDays(f.datum_soll);
      const cc = colorCode(td);
      const az = f.auftraege && f.auftraege.az ? f.auftraege.az : '—';
      const schadensart = f.auftraege && f.auftraege.schadensart_label ? f.auftraege.schadensart_label : '';
      const href = '/akte.html?id=' + encodeURIComponent(f.auftrag_id) + '&tab=fristen';
      return `<a class="dfw-item" href="${href}">
        <div class="dfw-icon">${cc.icon}</div>
        <div>
          <div class="dfw-text">${escHtml(az)} · ${escHtml(f.frist_typ)}</div>
          <div class="dfw-text-sub">${fmtDate(f.datum_soll)}${schadensart ? ' · ' + escHtml(schadensart) : ''}</div>
        </div>
        <div><span class="dfw-pill ${cc.cls}">${cc.label}</span></div>
      </a>`;
    }).join('') + '</div>';
  }

  async function render(host) {
    ensureStyles();
    if (!host.__inited) {
      host.classList.add('dfw-card');
      host.innerHTML = '<div class="dfw-head"><div class="dfw-title">⏰ Anstehende Fristen</div><a class="dfw-link" href="/fristen.html">Alle Fristen →</a></div><div class="dfw-loading">Lade…</div>';
      host.__inited = true;
    }
    try {
      const data = await fetchFristen();
      const head = host.querySelector('.dfw-head');
      host.innerHTML = '';
      host.appendChild(head);
      host.insertAdjacentHTML('beforeend', buildList(data.fristen));
    } catch (e) {
      const head = host.querySelector('.dfw-head');
      host.innerHTML = '';
      if (head) host.appendChild(head);
      host.insertAdjacentHTML('beforeend', '<div class="dfw-empty" style="color:#f59e0b;">Fehler: ' + escHtml(e.message) + '</div>');
    }
  }

  function init() {
    document.querySelectorAll('[data-dashboard-fristen]').forEach(host => {
      render(host);
      setInterval(() => render(host), REFRESH_MS);
    });
  }

  window.DashboardFristenWidget = {
    init: init,
    render: render,
    _internals: { diffDays, colorCode, escHtml, buildList, fmtDate }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = window.DashboardFristenWidget;
}());
