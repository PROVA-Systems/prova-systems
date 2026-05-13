/**
 * PROVA Mobile-Bottom-Nav (MEGA⁷⁰ Phase 2.6)
 *
 * 4-Tab-Bottom-Nav für Mobile (<768px). Auto-Install bei DOMContentLoaded.
 *
 * Tabs:
 *   🏠 Home (Dashboard)
 *   🔍 Cmd+K (Suche/Aktionen via global-search.js bzw. command-palette.js)
 *   ➕ Neu (Quick-Create: Auftrag / Kontakt / Termin)
 *   ⚙ Menü (Sidebar-Drawer)
 *
 * Anti-Pattern:
 *   - Nicht auf Login/Onboarding/Editor-Fullscreen-Pages anzeigen
 *   - Safe-Area-Inset für iOS-Notch berücksichtigen
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-mobile-nav-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-mobile-nav-style';
    style.textContent = `
      .pmn { display: none; position: fixed; bottom: 0; left: 0; right: 0; height: calc(56px + env(safe-area-inset-bottom, 0)); padding-bottom: env(safe-area-inset-bottom, 0); background: rgba(11,13,17,.96); border-top: 1px solid var(--border2, rgba(255,255,255,0.16)); z-index: 200; backdrop-filter: blur(10px); justify-content: space-around; align-items: stretch; font-family: 'DM Sans', system-ui, sans-serif; }
      @media (max-width: 768px) { .pmn { display: flex; } body.pmn-pad { padding-bottom: calc(56px + env(safe-area-inset-bottom, 0)) !important; } }
      .pmn-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: var(--text3, #8b93ab); text-decoration: none; padding: 6px 4px; font: 600 9.5px inherit; letter-spacing: .04em; text-transform: uppercase; min-height: 44px; transition: color .12s; background: transparent; border: none; cursor: pointer; font-family: inherit; }
      .pmn-item:active { background: rgba(79,142,247,.08); }
      .pmn-item.is-active { color: var(--accent, #4f8ef7); }
      .pmn-item .pmn-icon { font-size: 20px; line-height: 1; }
      .pmn-item.pmn-primary .pmn-icon { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; width: 36px; height: 36px; border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; }

      /* New-Modal */
      .pmn-new-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 250; display: none; align-items: flex-end; }
      .pmn-new-overlay.is-open { display: flex; }
      .pmn-new-sheet { background: var(--surface, #1c2130); width: 100%; border-radius: 16px 16px 0 0; padding: 18px 20px calc(20px + env(safe-area-inset-bottom, 0)); }
      .pmn-new-sheet h3 { font: 700 14px inherit; margin-bottom: 12px; color: var(--text, #eaecf4); }
      .pmn-new-sheet a { display: flex; align-items: center; gap: 12px; padding: 14px 12px; color: var(--text); text-decoration: none; border-radius: 8px; }
      .pmn-new-sheet a:active { background: rgba(79,142,247,.1); }
      .pmn-new-sheet a .ic { font-size: 22px; }
    `;
    document.head.appendChild(style);
  }

  function _isExcludedPage() {
    const p = (location.pathname || '').toLowerCase();
    const excl = ['/login', '/onboarding', '/share', '/auth-supabase'];
    if (excl.some(e => p.startsWith(e))) return true;
    // Stellungnahme-Editor Fullscreen-Mode: nicht ausschließen (Mobile-Editor brauchbar)
    return false;
  }

  function _openNewSheet() {
    let ov = document.getElementById('pmn-new-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'pmn-new-overlay';
      ov.className = 'pmn-new-overlay';
      ov.innerHTML = `<div class="pmn-new-sheet">
        <h3>+ Neu erstellen</h3>
        <a href="/app.html"><span class="ic">➕</span> Neuer Auftrag</a>
        <a href="/kontakt-neu.html"><span class="ic">👤</span> Neuer Kontakt</a>
        <a href="/termine.html?neu=1"><span class="ic">📅</span> Neuer Termin</a>
        <a href="/brief-neu.html"><span class="ic">✉</span> Neuer Brief</a>
      </div>`;
      ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('is-open'); });
      document.body.appendChild(ov);
    }
    ov.classList.add('is-open');
  }

  function _openCmdK() {
    if (window.ProvaCommandPalette && typeof window.ProvaCommandPalette.open === 'function') {
      window.ProvaCommandPalette.open();
    } else if (window.PROVASearch && typeof window.PROVASearch.toggle === 'function') {
      window.PROVASearch.toggle();
    } else if (window.ProvaGlobalSearch && typeof window.ProvaGlobalSearch.open === 'function') {
      window.ProvaGlobalSearch.open();
    } else {
      // Fallback: simulate Cmd+K key
      const evt = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true });
      document.dispatchEvent(evt);
    }
  }

  function _openMenu() {
    if (typeof window.openMobileSidebar === 'function') {
      window.openMobileSidebar();
    } else {
      const sb = document.getElementById('sidebar');
      const ov = document.getElementById('sb-overlay');
      if (sb) sb.classList.add('open');
      if (ov) ov.classList.add('open');
    }
  }

  function _isHomePage() {
    const p = location.pathname;
    return p === '/' || p === '/dashboard' || p === '/dashboard.html';
  }

  const ProvaMobileNav = {
    install() {
      if (_isExcludedPage()) return;
      if (document.querySelector('.pmn')) return; // schon installiert
      _injectStyle();
      const nav = document.createElement('nav');
      nav.className = 'pmn';
      nav.setAttribute('aria-label', 'Mobile Navigation');
      nav.innerHTML = `
        <a class="pmn-item ${_isHomePage() ? 'is-active' : ''}" href="/dashboard.html" aria-label="Home">
          <span class="pmn-icon">🏠</span><span>Home</span>
        </a>
        <button type="button" class="pmn-item" id="pmn-cmd-k" aria-label="Suchen">
          <span class="pmn-icon">🔍</span><span>Suchen</span>
        </button>
        <button type="button" class="pmn-item pmn-primary" id="pmn-new" aria-label="Neu">
          <span class="pmn-icon">+</span><span>Neu</span>
        </button>
        <button type="button" class="pmn-item" id="pmn-menu" aria-label="Menü">
          <span class="pmn-icon">⋯</span><span>Menü</span>
        </button>
      `;
      document.body.appendChild(nav);
      document.body.classList.add('pmn-pad');
      nav.querySelector('#pmn-cmd-k').addEventListener('click', _openCmdK);
      nav.querySelector('#pmn-new').addEventListener('click', _openNewSheet);
      nav.querySelector('#pmn-menu').addEventListener('click', _openMenu);
    }
  };

  global.ProvaMobileNav = ProvaMobileNav;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => ProvaMobileNav.install());
    else ProvaMobileNav.install();
  }
})(typeof window !== 'undefined' ? window : globalThis);
