/**
 * PROVA Akte-Tabs (MEGA⁶⁹-FINAL-1 Item D.5)
 *
 * 12-Tab-Action-Bar für akte.html. Marcel-Direktive Q4:
 *   "VOLLE MIGRATION ... existing libs UN-anfassbar, nur Tab-Container + Mount-Logic"
 *
 * 4 Modal-Mounts (via existing libs):
 *   Audit → ProvaAuditTrailView
 *   Versand-Historie → ProvaVersandHistorie
 *   Versionen → ProvaVersionHistory
 *   Fotos → ProvaFotoPicker (Lightbox-Modus) — fallback /fotos?auftrag
 *
 * 8 Page-Navigation (Context via Query-Param):
 *   Übersicht (scroll-to-top), Stellungnahme, Diktate, Skizzen, Anhänge, Fristen, Briefe, Rechnungen
 *
 * API:
 *   ProvaAkteTabs.render({ container, auftragId, az, activeTab?: 'uebersicht' })
 */
'use strict';

(function (global) {

  const TABS = [
    { id: 'uebersicht',    label: 'Übersicht',        icon: '📋', action: 'scroll'  },
    { id: 'stellungnahme', label: 'Stellungnahme',    icon: '⚖',  action: 'nav', url: '/fachurteil?az={AZ}&editor=mega69' },
    { id: 'diktate',       label: 'Diktate',          icon: '🎙', action: 'nav', url: '/eintraege?auftrag={ID}&typ=diktat' },
    { id: 'fotos',         label: 'Fotos',            icon: '📷', action: 'nav', url: '/fotos?auftrag={ID}' },
    { id: 'skizzen',       label: 'Skizzen',          icon: '✏',  action: 'nav', url: '/skizzen?auftrag={ID}' },
    { id: 'anhaenge',      label: 'Anhänge',          icon: '📎', action: 'modal', handler: 'mountAnhaenge' },
    { id: 'fristen',       label: 'Fristen',          icon: '⏰', action: 'nav', url: '/fristen?auftrag={ID}' },
    { id: 'briefe',        label: 'Briefe',           icon: '✉',  action: 'nav', url: '/briefe?auftrag={ID}' },
    { id: 'rechnungen',    label: 'Rechnungen',       icon: '💶', action: 'nav', url: '/rechnungen?auftrag={ID}' },
    { id: 'audit',         label: 'Audit-Trail',      icon: '🔍', action: 'modal', handler: 'mountAudit' },
    { id: 'versand',       label: 'Versand-Historie', icon: '📤', action: 'modal', handler: 'mountVersand' },
    { id: 'versionen',     label: 'Versionen',        icon: '🕒', action: 'modal', handler: 'mountVersionen' }
  ];

  function _injectStyle() {
    if (document.getElementById('prova-akte-tabs-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-akte-tabs-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-akte-tabs.css';
    document.head.appendChild(link);
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function _resolveUrl(template, auftragId, az) {
    return template.replace('{ID}', encodeURIComponent(auftragId || '')).replace('{AZ}', encodeURIComponent(az || auftragId || ''));
  }

  function _onTabClick(tab, auftragId, az) {
    if (tab.action === 'scroll') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      _setUrlTab(null);
      return;
    }
    if (tab.action === 'nav') {
      window.location.href = _resolveUrl(tab.url, auftragId, az);
      return;
    }
    if (tab.action === 'modal' && tab.handler) {
      _setUrlTab(tab.id);  // History-API Deep-Link für MEGA⁶⁹-FINAL-3 8.10
      const handler = ProvaAkteTabs[tab.handler];
      if (typeof handler === 'function') {
        handler.call(ProvaAkteTabs, { auftragId, az });
      } else {
        alert(`Modal "${tab.label}" — Handler "${tab.handler}" nicht verfügbar.`);
      }
    }
  }

  // ─── MEGA⁶⁹-FINAL-3 8.10 — History-API Tab-Deep-Link ───
  function _setUrlTab(tabId) {
    try {
      const u = new URL(window.location.href);
      if (tabId) u.searchParams.set('tab', tabId);
      else u.searchParams.delete('tab');
      window.history.replaceState({}, '', u.toString());
    } catch (_) { /* defensive */ }
  }

  function _autoOpenFromUrl(auftragId, az) {
    try {
      const tabId = new URL(window.location.href).searchParams.get('tab');
      if (!tabId) return;
      const tab = TABS.find(t => t.id === tabId);
      if (!tab || tab.action !== 'modal') return;
      // Deferred: wait 600ms for libs to load
      setTimeout(() => _onTabClick(tab, auftragId, az), 600);
    } catch (_) { /* defensive */ }
  }

  const ProvaAkteTabs = {

    render({ container, auftragId, az, activeTab }) {
      _injectStyle();
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      const urlTab = new URL(window.location.href).searchParams.get('tab');
      const active = activeTab || urlTab || 'uebersicht';
      el.classList.add('prova-akte-tabs');
      el.innerHTML = TABS.map(t => `
        <button type="button" class="pat-tab ${t.id === active ? 'is-active' : ''}" data-tab="${t.id}"
                title="${_esc(t.label)}">
          <span class="pat-icon">${t.icon}</span>
          <span class="pat-label">${_esc(t.label)}</span>
        </button>
      `).join('');
      el.querySelectorAll('.pat-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.pat-tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === btn.dataset.tab));
          const tab = TABS.find(t => t.id === btn.dataset.tab);
          if (tab) _onTabClick(tab, auftragId, az);
        });
      });
      // MEGA⁶⁹-FINAL-3 8.10 — Deep-Link Auto-Open
      _autoOpenFromUrl(auftragId, az);
    },

    // ─── Modal-Mounts ─────────────────────────────────────────────────
    mountAudit({ auftragId }) {
      if (!window.ProvaAuditTrailView) { alert('Audit-Trail-Lib nicht geladen.'); return; }
      window.ProvaAuditTrailView.open({ auftrag_id: auftragId });
    },

    mountVersand({ auftragId }) {
      if (!window.ProvaVersandHistorie) { alert('Versand-Historie-Lib nicht geladen.'); return; }
      window.ProvaVersandHistorie.open({ auftrag_id: auftragId });
    },

    mountVersionen({ auftragId }) {
      if (!window.ProvaVersionHistory) { alert('Version-History-Lib nicht geladen.'); return; }
      window.ProvaVersionHistory.open({ auftrag_id: auftragId });
    },

    mountAnhaenge({ auftragId }) {
      if (window.ProvaExterneDokumente && typeof window.ProvaExterneDokumente.open === 'function') {
        window.ProvaExterneDokumente.open({ auftrag_id: auftragId });
      } else if (window.ProvaAnhangLightbox && typeof window.ProvaAnhangLightbox.open === 'function') {
        window.ProvaAnhangLightbox.open({ auftrag_id: auftragId });
      } else {
        window.location.href = '/anhaenge?auftrag=' + encodeURIComponent(auftragId || '');
      }
    }
  };

  global.ProvaAkteTabs = ProvaAkteTabs;
})(typeof window !== 'undefined' ? window : globalThis);
