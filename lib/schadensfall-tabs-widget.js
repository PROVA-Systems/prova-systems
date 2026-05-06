/**
 * PROVA — Schadensfall-Tabs-Widget (MEGA³² W11-I1)
 *
 * 5 Tabs (Einträge / Skizzen / Fristen / Fotos / Dokumente) für akte.html.
 * Nutzt reconciled APIs aus Welle 12b (auftrag_id, schema-konform).
 *
 * Usage:
 *   <div data-schadensfall-tabs data-schadensfall-id="<UUID>"></div>
 *   <script src="/lib/schadensfall-tabs-widget.js" defer></script>
 *
 * URL-Persistenz: ?tab=eintraege|skizzen|fristen|fotos|dokumente
 * Lazy-Loading: Tab-Content erst bei Klick.
 */
'use strict';

(function () {
  const TABS = [
    { key: 'eintraege', label: '📒 Einträge', api: '/.netlify/functions/eintraege-list' },
    { key: 'skizzen', label: '✏️ Skizzen', api: '/.netlify/functions/skizzen-list' },
    { key: 'fristen', label: '⏰ Fristen', api: '/.netlify/functions/fristen-list' },
    { key: 'fotos', label: '📸 Fotos', api: '/.netlify/functions/fotos-list' },
    { key: 'dokumente', label: '📄 Dokumente', api: '/.netlify/functions/dokumente-list' }
  ];

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('de-DE'); } catch (e) { return d; } }
  function diffDays(d) {
    const t = new Date(d + 'T00:00:00').getTime();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((t - today.getTime()) / 86400000);
  }
  function fmtDauer(min) { if (!min) return '—'; const h = Math.floor(min / 60); const m = min % 60; return h > 0 ? (h + 'h' + (m ? ' ' + m + 'm' : '')) : min + 'm'; }

  function getFallId(host) {
    const fromAttr = host.getAttribute('data-schadensfall-id');
    if (fromAttr) return fromAttr;
    const qs = new URLSearchParams(window.location.search);
    return qs.get('id') || qs.get('fall') || qs.get('auftrag_id') || qs.get('schadensfall_id') || localStorage.getItem('prova_current_fall') || null;
  }

  function getInitialTab() {
    const qs = new URLSearchParams(window.location.search);
    const t = qs.get('tab');
    return TABS.find(x => x.key === t) ? t : 'eintraege';
  }

  function setTabUrl(tab) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  async function fetchJson(url) {
    const fetcher = window.provaFetch || window.fetch.bind(window);
    const res = await fetcher(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  function ensureStyles() {
    if (document.getElementById('sft-styles')) return;
    const s = document.createElement('style');
    s.id = 'sft-styles';
    s.textContent = `
      .sft-card{background:var(--surface,#1c2130);border:1px solid var(--border,rgba(255,255,255,.06));border-radius:12px;overflow:hidden;}
      .sft-tabs{display:flex;background:var(--surface2,#232a3a);border-bottom:1px solid var(--border,rgba(255,255,255,.06));overflow-x:auto;}
      .sft-tab{flex:0 0 auto;padding:11px 16px;background:transparent;border:none;color:var(--text2,#8b93ab);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;}
      .sft-tab.active{color:var(--text,#eaecf4);border-bottom-color:var(--accent,#4f8ef7);}
      .sft-tab:hover{color:var(--text,#eaecf4);}
      .sft-pane{display:none;padding:14px 18px;}
      .sft-pane.active{display:block;}
      .sft-action{display:inline-block;padding:7px 12px;background:var(--accent,#4f8ef7);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;margin-bottom:10px;}
      .sft-action:hover{opacity:.9;}
      .sft-loading{padding:20px;color:var(--text3,#4d5568);font-size:12px;font-style:italic;text-align:center;}
      .sft-empty{padding:24px;text-align:center;color:var(--text3,#4d5568);font-size:13px;}
      .sft-empty a{color:var(--accent,#4f8ef7);text-decoration:none;}
      .sft-row{display:grid;gap:8px;padding:9px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.06));font-size:12px;align-items:center;}
      .sft-row:last-child{border-bottom:none;}
      .sft-row-eintraege{grid-template-columns:90px 80px 1fr 60px;}
      .sft-row-skizzen{grid-template-columns:1fr 90px 90px;}
      .sft-row-fristen{grid-template-columns:90px 100px 1fr 70px 80px;}
      .sft-row-fotos{grid-template-columns:60px 1fr 90px 80px;}
      .sft-row-dokumente{grid-template-columns:90px 90px 1fr 90px;}
      .sft-pill{font-size:10px;padding:2px 7px;border-radius:6px;font-weight:700;width:fit-content;}
      .sft-pill-blue{background:rgba(79,142,247,.12);color:var(--accent,#4f8ef7);}
      .sft-pill-green{background:rgba(16,185,129,.12);color:#10b981;}
      .sft-pill-orange{background:rgba(245,158,11,.12);color:#f59e0b;}
      .sft-pill-red{background:rgba(239,68,68,.12);color:#ef4444;}
      .sft-pill-gray{background:rgba(139,147,171,.12);color:#8b93ab;}
      .sft-thumb{width:44px;height:44px;background:#000;border-radius:4px;display:inline-block;}
      .sft-skz-thumb{background:#fff;border-radius:4px;height:80px;overflow:hidden;display:flex;align-items:center;justify-content:center;}
      .sft-skz-thumb svg{max-width:100%;max-height:100%;}
      .sft-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;}
      .sft-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    `;
    document.head.appendChild(s);
  }

  function statusColor(td) {
    if (td < 0) return 'sft-pill-red';
    if (td <= 3) return 'sft-pill-red';
    if (td <= 7) return 'sft-pill-orange';
    return 'sft-pill-green';
  }

  // ── Render-Funktionen pro Tab ────────────────────────────────────────────

  async function renderEintraege(pane, fallId) {
    pane.innerHTML = '<div class="sft-loading">Lade Einträge…</div>';
    try {
      const data = await fetchJson('/.netlify/functions/eintraege-list?auftrag_id=' + encodeURIComponent(fallId) + '&limit=20');
      const action = '<a href="/eintraege.html?id=' + encodeURIComponent(fallId) + '" class="sft-action">+ Eintrag hinzufügen</a>';
      if (!data.eintraege || !data.eintraege.length) {
        pane.innerHTML = action + '<div class="sft-empty">Noch keine Einträge.</div>';
        return;
      }
      const rows = data.eintraege.map(e => `
        <div class="sft-row sft-row-eintraege">
          <div>${fmtDate(e.datum)}</div>
          <div><span class="sft-pill sft-pill-blue">${escHtml(e.typ)}</span></div>
          <div class="sft-truncate">${escHtml((e.titel || e.content || '').slice(0, 80))}${e.pseudonymisiert ? ' 🔒' : ''}</div>
          <div style="color:var(--text3);">${fmtDauer(e.dauer_min)}</div>
        </div>`).join('');
      pane.innerHTML = action + rows + (data.total > 20 ? '<div class="sft-empty"><a href="/eintraege.html?id=' + encodeURIComponent(fallId) + '">Alle ' + data.total + ' →</a></div>' : '');
    } catch (e) {
      pane.innerHTML = '<div class="sft-empty" style="color:#f59e0b;">Fehler: ' + escHtml(e.message) + '</div>';
    }
  }

  async function renderSkizzen(pane, fallId) {
    pane.innerHTML = '<div class="sft-loading">Lade Skizzen…</div>';
    try {
      const data = await fetchJson('/.netlify/functions/skizzen-list?auftrag_id=' + encodeURIComponent(fallId) + '&with_svg=1');
      const action = '<a href="/skizzen.html?id=' + encodeURIComponent(fallId) + '" class="sft-action">+ Skizze erstellen</a>';
      if (!data.skizzen || !data.skizzen.length) {
        pane.innerHTML = action + '<div class="sft-empty">Noch keine Skizzen.</div>';
        return;
      }
      const grid = data.skizzen.map(s => `
        <div>
          <div class="sft-skz-thumb" data-svg-id="${s.id}"></div>
          <div style="font-size:11px;color:var(--text2);margin-top:4px;text-align:center;" class="sft-truncate">${escHtml(s.titel)}</div>
        </div>`).join('');
      pane.innerHTML = action + '<div class="sft-grid">' + grid + '</div>';
      data.skizzen.forEach(s => {
        const wrap = pane.querySelector(`[data-svg-id="${s.id}"]`);
        if (wrap && s.svg_content) wrap.innerHTML = s.svg_content;
      });
    } catch (e) {
      pane.innerHTML = '<div class="sft-empty" style="color:#f59e0b;">Fehler: ' + escHtml(e.message) + '</div>';
    }
  }

  async function renderFristen(pane, fallId) {
    pane.innerHTML = '<div class="sft-loading">Lade Fristen…</div>';
    try {
      const data = await fetchJson('/.netlify/functions/fristen-list?auftrag_id=' + encodeURIComponent(fallId));
      const action = '<a href="/fristen.html?id=' + encodeURIComponent(fallId) + '" class="sft-action">+ Frist / Pipeline</a>';
      if (!data.fristen || !data.fristen.length) {
        pane.innerHTML = action + '<div class="sft-empty">Noch keine Fristen.</div>';
        return;
      }
      const rows = data.fristen.map(f => {
        const td = diffDays(f.datum_soll);
        const cc = statusColor(td);
        const tdTxt = td < 0 ? 'überfällig' : (td === 0 ? 'heute' : 'T-' + td);
        return `<div class="sft-row sft-row-fristen">
          <div>${fmtDate(f.datum_soll)}</div>
          <div><span class="sft-pill sft-pill-blue">${escHtml(f.frist_typ)}</span></div>
          <div class="sft-truncate">${escHtml((f.notiz || '').slice(0, 60))}</div>
          <div><span class="sft-pill sft-pill-${f.status === 'erfuellt' ? 'green' : (f.status === 'verfallen' ? 'red' : 'blue')}">${escHtml(f.status)}</span></div>
          <div><span class="sft-pill ${cc}">${tdTxt}</span></div>
        </div>`;
      }).join('');
      pane.innerHTML = action + rows;
    } catch (e) {
      pane.innerHTML = '<div class="sft-empty" style="color:#f59e0b;">Fehler: ' + escHtml(e.message) + '</div>';
    }
  }

  async function renderFotos(pane, fallId) {
    pane.innerHTML = '<div class="sft-loading">Lade Fotos…</div>';
    try {
      const data = await fetchJson('/.netlify/functions/fotos-list?auftrag_id=' + encodeURIComponent(fallId) + '&limit=30');
      if (!data.fotos || !data.fotos.length) {
        pane.innerHTML = '<div class="sft-empty">Noch keine Fotos. Beim Ortstermin via App hinzufügen.</div>';
        return;
      }
      const rows = data.fotos.map(f => `
        <div class="sft-row sft-row-fotos">
          <div class="sft-thumb"></div>
          <div class="sft-truncate">${escHtml(f.beschreibung || f.original_filename || '—')}</div>
          <div style="font-size:10px;"><span class="sft-pill sft-pill-blue">${escHtml(f.typ)}</span></div>
          <div style="color:var(--text3);font-size:10px;">${f.exif_stripped ? '🔒 EXIF' : '⚠️'}</div>
        </div>`).join('');
      pane.innerHTML = rows;
    } catch (e) {
      pane.innerHTML = '<div class="sft-empty" style="color:#f59e0b;">Fehler: ' + escHtml(e.message) + '</div>';
    }
  }

  async function renderDokumente(pane, fallId) {
    pane.innerHTML = '<div class="sft-loading">Lade Dokumente…</div>';
    try {
      const data = await fetchJson('/.netlify/functions/dokumente-list?auftrag_id=' + encodeURIComponent(fallId) + '&limit=30');
      if (!data.dokumente || !data.dokumente.length) {
        pane.innerHTML = '<div class="sft-empty">Noch keine Dokumente. Werden via Workflow generiert (Gutachten/Rechnung/Brief).</div>';
        return;
      }
      const rows = data.dokumente.map(d => {
        const statusColor = d.status === 'versendet' || d.status === 'generiert' ? 'sft-pill-green'
          : d.status === 'entwurf' ? 'sft-pill-gray'
          : d.status === 'ueberfaellig' ? 'sft-pill-red' : 'sft-pill-blue';
        return `<div class="sft-row sft-row-dokumente">
          <div style="font-family:monospace;font-size:11px;">${escHtml(d.doc_nummer || '—')}</div>
          <div><span class="sft-pill sft-pill-blue">${escHtml(d.typ)}</span></div>
          <div class="sft-truncate">${escHtml(d.betreff || '—')}</div>
          <div><span class="sft-pill ${statusColor}">${escHtml(d.status)}</span></div>
        </div>`;
      }).join('');
      pane.innerHTML = rows;
    } catch (e) {
      pane.innerHTML = '<div class="sft-empty" style="color:#f59e0b;">Fehler: ' + escHtml(e.message) + '</div>';
    }
  }

  const RENDERERS = {
    eintraege: renderEintraege,
    skizzen: renderSkizzen,
    fristen: renderFristen,
    fotos: renderFotos,
    dokumente: renderDokumente
  };

  async function loadPane(host, tab) {
    const pane = host.querySelector('[data-pane="' + tab + '"]');
    if (!pane) return;
    if (pane.dataset.loaded === '1') return;
    const fallId = host.__fallId;
    const fn = RENDERERS[tab];
    if (fn) await fn(pane, fallId);
    pane.dataset.loaded = '1';
  }

  function buildShell(host, fallId) {
    const initial = getInitialTab();
    const tabsHtml = TABS.map(t =>
      `<button class="sft-tab ${t.key === initial ? 'active' : ''}" data-tab="${t.key}" role="tab">${t.label}</button>`
    ).join('');
    const panesHtml = TABS.map(t =>
      `<div class="sft-pane ${t.key === initial ? 'active' : ''}" data-pane="${t.key}"></div>`
    ).join('');
    host.innerHTML = `<div class="sft-card"><div class="sft-tabs" role="tablist">${tabsHtml}</div>${panesHtml}</div>`;
    host.__fallId = fallId;
  }

  function bindTabs(host) {
    host.querySelectorAll('.sft-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        host.querySelectorAll('.sft-tab').forEach(b => b.classList.toggle('active', b === btn));
        host.querySelectorAll('.sft-pane').forEach(p => p.classList.toggle('active', p.getAttribute('data-pane') === tab));
        setTabUrl(tab);
        loadPane(host, tab);
      });
    });
  }

  function init() {
    document.querySelectorAll('[data-schadensfall-tabs]').forEach(host => {
      const fallId = getFallId(host);
      if (!fallId) {
        host.innerHTML = '<div class="sft-empty" style="padding:18px;background:var(--surface,#1c2130);border-radius:12px;">Kein Schadensfall ausgewählt.</div>';
        return;
      }
      ensureStyles();
      buildShell(host, fallId);
      bindTabs(host);
      loadPane(host, getInitialTab());
    });
  }

  window.SchadensfallTabs = {
    init: init,
    TABS: TABS,
    _internals: { getFallId, getInitialTab, escHtml, diffDays, statusColor }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = window.SchadensfallTabs;
}());
