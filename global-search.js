/* ════════════════════════════════════════════════════════════
   PROVA global-search.js
   Globale Suche — Cmd+K / Ctrl+K
   Sucht: Fälle (localStorage), Normen (PROVA_NORMEN_DB), Seiten
════════════════════════════════════════════════════════════ */

const PROVASearch = {
  isOpen: false,
  _q: '',

  // Statische Seiten-Einträge
  PAGES: [
    { type: 'page', label: 'Zentrale / Dashboard', icon: '⊞', href: 'dashboard.html' },
    { type: 'page', label: 'Neues Gutachten', icon: '✚', href: 'app.html' },
    { type: 'page', label: 'Fälle / Archiv', icon: '📂', href: 'archiv.html' },
    { type: 'page', label: 'Normen-Datenbank', icon: '📚', href: 'normen.html' },
    { type: 'page', label: 'Textbausteine', icon: '📝', href: 'textbausteine.html' },
    { type: 'page', label: 'Positionen & Kosten', icon: '🗂️', href: 'positionen.html' },
    { type: 'page', label: 'Rechnungen', icon: '💶', href: 'rechnungen.html' },
    { type: 'page', label: 'JVEG-Rechner', icon: '⚖️', href: 'jveg.html' },
    { type: 'page', label: 'E-Rechnung', icon: '📄', href: 'erechnung.html' },
    { type: 'page', label: 'Statistiken', icon: '📈', href: 'statistiken.html' },
    { type: 'page', label: 'Briefe & Vorlagen', icon: '✉️', href: 'briefvorlagen.html' },
    { type: 'page', label: 'Kontakte', icon: '👥', href: 'kontakte.html' },
    { type: 'page', label: 'Kalender / Termine', icon: '📅', href: 'termine.html' },
    { type: 'page', label: 'Baubegleitung', icon: '🏗️', href: 'baubegleitung.html' },
    { type: 'page', label: 'Hilfe-Center', icon: '❓', href: 'hilfe.html' },
    { type: 'page', label: 'Einstellungen', icon: '⚙️', href: 'einstellungen.html' },
  ],

  init() {
    this._buildUI();
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); this.toggle(); }
      if (e.key === 'Escape' && this.isOpen) this.close();
      if (this.isOpen) this._handleArrow(e);
    });
    // Auch den Suchen-Button in der Sidebar verdrahten
    document.addEventListener('click', e => {
      if (e.target.closest('#sb-search-btn')) { e.preventDefault(); this.open(); }
    });
  },

  _buildUI() {
    const css = `
#prova-search-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:5000;display:none;align-items:flex-start;justify-content:center;padding-top:15vh}
#prova-search-overlay.open{display:flex}
#prova-search-box{background:var(--surface);border:1px solid var(--border2);border-radius:14px;width:100%;max-width:600px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)}
#prova-search-input-wrap{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border,rgba(255,255,255,.07))}
#prova-search-input-wrap svg{flex-shrink:0;opacity:.5}
#prova-search-field{flex:1;background:none;border:none;outline:none;color:var(--text);font-size:16px;font-family:var(--font-ui)}
#prova-search-field::placeholder{color:var(--text3)}
#prova-search-esc{font-size:10px;padding:2px 6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:5px;color:var(--text3);font-family:monospace;flex-shrink:0}
#prova-search-results{max-height:420px;overflow-y:auto;padding:6px}
#prova-search-results::-webkit-scrollbar{width:4px}
#prova-search-results::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.ps-item{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:8px;cursor:pointer;transition:background .1s}
.ps-item:hover,.ps-item.active{background:rgba(79,142,247,.12)}
.ps-icon{width:28px;height:28px;border-radius:7px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.ps-label{flex:1;font-size:13px;color:var(--text);font-weight:500}
.ps-sub{font-size:11px;color:var(--text3)}
.ps-type{font-size:10px;color:var(--text3);padding:1px 6px;border-radius:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);flex-shrink:0}
.ps-group{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);padding:10px 12px 4px}
#prova-search-footer{padding:8px 18px;border-top:1px solid var(--border,rgba(255,255,255,.07));display:flex;align-items:center;gap:12px;font-size:11px;color:var(--text3)}
#prova-search-footer kbd{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:10px}
`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'prova-search-overlay';
    overlay.innerHTML = `
<div id="prova-search-box">
  <div id="prova-search-input-wrap">
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input id="prova-search-field" placeholder="Suchen… Fälle, Normen, Seiten" autocomplete="off" spellcheck="false">
    <span id="prova-search-esc">ESC</span>
  </div>
  <div id="prova-search-results"></div>
  <div id="prova-search-footer">
    <span><kbd>↑↓</kbd> Navigieren</span>
    <span><kbd>↵</kbd> Öffnen</span>
    <span><kbd>ESC</kbd> Schließen</span>
  </div>
</div>`;
    overlay.onclick = e => { if (e.target === overlay) this.close(); };
    document.body.appendChild(overlay);

    this._input = document.getElementById('prova-search-field');
    this._results = document.getElementById('prova-search-results');
    this._input.addEventListener('input', () => this._search(this._input.value));
  },

  toggle() { this.isOpen ? this.close() : this.open(); },

  open() {
    this.isOpen = true;
    document.getElementById('prova-search-overlay').classList.add('open');
    this._input.value = '';
    this._search('');
    setTimeout(() => this._input.focus(), 50);
  },

  close() {
    this.isOpen = false;
    document.getElementById('prova-search-overlay').classList.remove('open');
  },

  _search(q) {
    this._q = q.trim().toLowerCase();
    const results = [];

    if (!this._q) {
      // Leer: Schnellaktionen zeigen
      results.push({ group: 'Schnellaktionen' });
      results.push({ type: 'action', label: 'Neues Gutachten starten', icon: '✚', href: 'app.html', sub: 'Schritt 1: Stammdaten' });
      results.push({ type: 'action', label: 'Neuer Fall / Auftraggeber', icon: '📂', href: 'archiv.html', sub: 'Fallliste öffnen' });
      results.push({ type: 'action', label: 'Normen nachschlagen', icon: '📚', href: 'normen.html', sub: '163 DIN/WTA/ZPO Normen' });

      // Letzte Fälle
      const recent = this._getRecentCases();
      if (recent.length) {
        results.push({ group: 'Zuletzt gearbeitet' });
        recent.forEach(r => results.push(r));
      }
    } else {
      // Seiten durchsuchen
      const pages = this.PAGES.filter(p => p.label.toLowerCase().includes(this._q));
      if (pages.length) {
        results.push({ group: 'Seiten' });
        pages.forEach(p => results.push(p));
      }

      // Normen durchsuchen — NUR Norm-Nummer und Titel, mit Relevanz-Ranking
      if (window.PROVA_NORMEN_DB) {
        const _q = this._q;
        // Zahlenfolge erkannt? Dann NUR in Norm-Nummer suchen
        const isNumericQuery = /[0-9]/.test(_q);
        const _qNorm = _q.replace(/ /g, '');
        const scored = window.PROVA_NORMEN_DB
          .map(n => {
            const num = (n.num || '').toLowerCase();
            const numNorm = num.replace(/ /g, '');
            const titel = (n.titel || '').toLowerCase();
            let score = 0;
            if (num.startsWith(_q)) score = 100;
            else if (numNorm.startsWith(_qNorm)) score = 95;
            else if (num.includes(_q)) score = 80;
            else if (numNorm.includes(_qNorm)) score = 75;
            else if (!isNumericQuery && titel.includes(_q)) score = 60;
            return { n, score };
          })
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map(x => x.n);
        const normen = scored;
        if (normen.length) {
          results.push({ group: 'Normen & Vorschriften' });
          normen.forEach(n => results.push({ type: 'norm', label: n.num, icon: '📐', href: 'normen.html', sub: n.titel }));
        }
      }

      // Lokale Fälle durchsuchen
      const cases = this._searchCases(this._q);
      if (cases.length) {
        results.push({ group: 'Fälle' });
        cases.forEach(c => results.push(c));
      }
    }

    this._render(results);
  },

  _getRecentCases() {
    try {
      const recent = JSON.parse(localStorage.getItem('prova_recent_cases') || '[]');
      return recent.slice(0, 3).map(c => ({
        type: 'case', label: c.az || 'Unbekannt', icon: '📋',
        href: 'akte.html?az=' + encodeURIComponent(c.az || ''),
        sub: [c.sa, c.adr].filter(Boolean).join(' · ')
      }));
    } catch(e) { return []; }
  },

  _searchCases(q) {
    try {
      // 1. Lokaler Cache (sofort)
      const cases = JSON.parse(localStorage.getItem('prova_faelle_cache') || '[]');
      const local = cases.filter(c =>
        (c.az && c.az.toLowerCase().includes(q)) ||
        (c.auftraggeber && c.auftraggeber.toLowerCase().includes(q)) ||
        (c.adresse && c.adresse.toLowerCase().includes(q))
      ).slice(0, 5).map(c => ({
        type: 'case', label: c.az, icon: '📋',
        href: 'akte.html?az=' + encodeURIComponent(c.az || ''),
        sub: [c.auftraggeber, c.adresse].filter(Boolean).join(' · ')
      }));
      // 2. Airtable-Suche im Hintergrund (mit Debounce)
      this._searchAirtable(q);
      return local;
    } catch(e) { return []; }
  },

  _atSearchTimer: null,
  _atSearchQ: '',

  _searchAirtable(q) {
    // Debounce: 400ms warten, dann suchen
    clearTimeout(this._atSearchTimer);
    this._atSearchQ = q;
    this._atSearchTimer = setTimeout(() => {
      if (q.length < 2 || q !== this._atSearchQ) return;
      const svEmail = localStorage.getItem('prova_sv_email') || '';
      if (!svEmail) return;
      const formula = encodeURIComponent(
        `AND(OR(FIND("${q}",LOWER({Aktenzeichen})),FIND("${q}",LOWER({Auftraggeber})),FIND("${q}",LOWER({Schaden_Strasse}))),{sv_email}="${svEmail}")`
      );
      fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'GET',
          path: `/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0?filterByFormula=${formula}&maxRecords=5&fields[]=Aktenzeichen&fields[]=Auftraggeber&fields[]=Adresse&fields[]=Schadenart`
        })
      }).then(r => r.json()).then(data => {
        if (!data.records || !data.records.length) return;
        // Nur anzeigen wenn Suche noch aktiv
        if (q !== this._q) return;
        const atResults = data.records.map(r => ({
          type: 'case', label: r.fields.Aktenzeichen || '—', icon: '🔍',
          href: 'akte.html?az=' + encodeURIComponent(r.fields.Aktenzeichen || ''),
          sub: [r.fields.Auftraggeber, r.fields.Schadensart].filter(Boolean).join(' · ') + ' (Airtable)'
        }));
        // Ergebnisse ergänzen (doppelte entfernen)
        const existing = document.querySelectorAll('.ps-item[data-href]');
        const existingHrefs = [...existing].map(e => e.dataset.href);
        const neu = atResults.filter(r => !existingHrefs.includes(r.href));
        if (!neu.length) return;
        const container = document.getElementById('prova-search-results');
        if (!container) return;
        // Trennlinie + neue Ergebnisse
        const div = document.createElement('div');
        div.className = 'ps-group';
        div.textContent = 'Aus Airtable';
        container.appendChild(div);
        neu.forEach(r => {
          const item = document.createElement('div');
          item.className = 'ps-item';
          item.dataset.href = r.href;
          item.tabIndex = -1;
          item.innerHTML = `<div class="ps-icon">${r.icon}</div><div style="flex:1;min-width:0"><div class="ps-label">${r.label}</div>${r.sub ? `<div class="ps-sub">${r.sub}</div>` : ''}</div><span class="ps-type">Fall</span>`;
          item.addEventListener('click', () => { window.location.href = r.href; });
          container.appendChild(item);
        });
      }).catch(() => {});
    }, 400);
  },

  _activeIdx: -1,

  _render(items) {
    this._activeIdx = -1;
    this._results.innerHTML = items.map((item, i) => {
      if (item.group) return '<div class="ps-group">' + item.group + '</div>';
      return '<div class="ps-item" data-href="' + (item.href||'') + '" tabindex="-1">'
        + '<div class="ps-icon">' + item.icon + '</div>'
        + '<div style="flex:1;min-width:0">'
        + '<div class="ps-label">' + this._hl(item.label) + '</div>'
        + (item.sub ? '<div class="ps-sub">' + item.sub + '</div>' : '')
        + '</div>'
        + '<span class="ps-type">' + (item.type === 'case' ? 'Fall' : item.type === 'norm' ? 'Norm' : 'Seite') + '</span>'
        + '</div>';
    }).join('');

    this._results.querySelectorAll('.ps-item').forEach(el => {
      el.onclick = () => { window.location.href = el.dataset.href; this.close(); };
    });
  },

  _hl(text) {
    if (!this._q) return text;
    const idx = text.toLowerCase().indexOf(this._q);
    if (idx < 0) return text;
    return text.slice(0, idx)
      + '<mark style="background:rgba(79,142,247,.3);color:inherit;border-radius:2px">' + text.slice(idx, idx + this._q.length) + '</mark>'
      + text.slice(idx + this._q.length);
  },

  _handleArrow(e) {
    const items = [...this._results.querySelectorAll('.ps-item')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this._activeIdx = Math.min(this._activeIdx + 1, items.length - 1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); this._activeIdx = Math.max(this._activeIdx - 1, 0); }
    if (e.key === 'Enter' && this._activeIdx >= 0) { items[this._activeIdx].click(); return; }
    items.forEach((el, i) => el.classList.toggle('active', i === this._activeIdx));
    if (this._activeIdx >= 0) items[this._activeIdx].scrollIntoView({ block: 'nearest' });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PROVASearch.init());
} else {
  PROVASearch.init();
}
