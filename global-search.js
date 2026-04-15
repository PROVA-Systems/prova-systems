/* ════════════════════════════════════════════════════════════════
   PROVA Global Search v2 — Vollständige System-Suche
   Quellen: Fälle · Rechnungen · Kontakte · Textbausteine · Normen · Seiten
   Öffnen: Cmd+K / Ctrl+K oder Suchen-Button in Sidebar
════════════════════════════════════════════════════════════════ */

const AT_BASE_SEARCH    = 'appJ7bLlAHZoxENWE';
const AT_FAELLE_SEARCH  = 'tblSxV8bsXwd1pwa0';
const AT_RECHNUNGEN_S   = 'tblF6MS7uiFAJDjiT';
const AT_KONTAKTE_S     = 'tblMKmPLjRelr6Hal';
const TB_KEY_SEARCH     = 'prova_textbausteine_v2';

const PROVASearch = {

  PAGES: [
    { type:'page', label:'Dashboard / Zentrale',   icon:'⊞', href:'dashboard.html' },
    { type:'page', label:'Archiv / Alle Fälle',    icon:'📂', href:'archiv.html' },
    { type:'page', label:'Neues Gutachten',         icon:'✚', href:'vor-ort.html' },
    { type:'page', label:'Diktat & Fotos',          icon:'🎤', href:'app.html' },
    { type:'page', label:'Stellungnahme',           icon:'✍️', href:'stellungnahme.html' },
    { type:'page', label:'Freigabe & PDF',          icon:'✅', href:'freigabe.html' },
    { type:'page', label:'Rechnungen',              icon:'💶', href:'rechnungen.html' },
    { type:'page', label:'E-Rechnung',              icon:'📄', href:'erechnung.html' },
    { type:'page', label:'JVEG-Abrechnung',         icon:'⚖️', href:'jveg.html' },
    { type:'page', label:'Termine',                 icon:'📅', href:'termine.html' },
    { type:'page', label:'Kontakte',                icon:'👥', href:'kontakte.html' },
    { type:'page', label:'Normen',                  icon:'📐', href:'normen.html' },
    { type:'page', label:'Textbausteine',           icon:'📝', href:'textbausteine.html' },
    { type:'page', label:'Briefvorlagen',           icon:'✉️', href:'briefvorlagen.html' },
    { type:'page', label:'Statistiken',             icon:'📊', href:'statistiken.html' },
    { type:'page', label:'Einstellungen',           icon:'⚙️', href:'einstellungen.html' },
    { type:'page', label:'Ortstermin-Modus',        icon:'📍', href:'ortstermin-modus.html' },
    { type:'page', label:'Jahresbericht',           icon:'📆', href:'jahresbericht.html' },
    { type:'page', label:'KI-Lernpool',             icon:'🧠', href:'textbausteine.html' },
    { type:'page', label:'Datenschutz-Einwilligung',icon:'🔒', href:'datenschutz-mandant.html' },
  ],

  _q: '',
  _words: [],
  _atTimer: null,
  /* Gibt true zurück wenn ALLE Wörter des Suchbegriffs im Text vorkommen */
  _match(text, words) {
    if (!text) return false;
    const t = String(text).toLowerCase();
    return words.every(w => t.includes(w));
  },

  /* Gibt true zurück wenn ALLE Wörter in MINDESTENS EINEM der Felder vorkommen */
  _matchAny(fields, words) {
    const combined = fields.filter(Boolean).join(' ').toLowerCase();
    return words.every(w => combined.includes(w));
  },



  init() {
    if (document.getElementById('prova-search-overlay')) return;
    this._inject();
    this._bindKeys();
  },

  _inject() {
    const style = document.createElement('style');
    style.textContent = `
#prova-search-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9000;display:none;align-items:flex-start;justify-content:center;padding-top:12vh}
#prova-search-overlay.open{display:flex}
#prova-search-box{background:var(--bg2,#1a2035);border:1px solid rgba(255,255,255,.12);border-radius:14px;width:100%;max-width:640px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.7);margin:0 16px}
#ps-input-row{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.07)}
#ps-input-row svg{flex-shrink:0;opacity:.4}
#ps-field{flex:1;background:none;border:none;outline:none;color:var(--text,#e8eaf0);font-size:16px;font-family:inherit}
#ps-field::placeholder{color:var(--text3,#6b7a99)}
#ps-esc{font-size:10px;padding:2px 6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:var(--text3,#6b7a99);font-family:monospace;flex-shrink:0;cursor:pointer}
#ps-results{max-height:460px;overflow-y:auto;padding:6px}
#ps-results::-webkit-scrollbar{width:4px}
#ps-results::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.ps-group{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text3,#6b7a99);padding:10px 14px 4px;user-select:none}
.ps-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;cursor:pointer;color:var(--text2,#c2c8da)}
.ps-item:hover,.ps-item.active{background:rgba(79,142,247,.12);color:var(--text,#e8eaf0)}
.ps-icon{font-size:16px;flex-shrink:0;width:22px;text-align:center}
.ps-label{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps-sub{font-size:11px;color:var(--text3,#6b7a99);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps-type{font-size:10px;padding:2px 7px;background:rgba(255,255,255,.06);border-radius:99px;color:var(--text3,#6b7a99);flex-shrink:0;margin-left:auto}
.ps-empty{padding:24px;text-align:center;color:var(--text3,#6b7a99);font-size:13px}
#ps-footer{padding:8px 18px;border-top:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:14px;font-size:11px;color:var(--text3,#6b7a99)}
#ps-footer kbd{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:10px}
#ps-status{margin-left:auto;font-size:11px;color:var(--text3,#6b7a99);min-width:60px;text-align:right}
mark{background:rgba(79,142,247,.3);color:inherit;border-radius:2px;padding:0 1px}`;
    document.head.appendChild(style);

    const ov = document.createElement('div');
    ov.id = 'prova-search-overlay';
    ov.innerHTML = `
<div id="prova-search-box">
  <div id="ps-input-row">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input id="ps-field" placeholder="Suchen — Fälle, Rechnungen, Kontakte, Normen, Textbausteine…" autocomplete="off" spellcheck="false">
    <span id="ps-esc">ESC</span>
  </div>
  <div id="ps-results"></div>
  <div id="ps-footer">
    <kbd>↑↓</kbd> navigieren &nbsp; <kbd>↵</kbd> öffnen &nbsp; <kbd>ESC</kbd> schließen
    <span id="ps-status"></span>
  </div>
</div>`;
    document.body.appendChild(ov);

    ov.addEventListener('click', e => { if (e.target === ov) this.close(); });
    document.getElementById('ps-esc').addEventListener('click', () => this.close());
    document.getElementById('ps-field').addEventListener('input', e => this._search(e.target.value));
    document.getElementById('ps-field').addEventListener('keydown', e => this._handleArrow(e));
  },

  _bindKeys() {
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); this.open(); return; }
      if (e.key === 'Escape') this.close();
    });
    document.addEventListener('click', e => {
      if (e.target.closest('#sb-search-btn') || e.target.closest('[data-search-trigger]')) {
        e.preventDefault(); this.open();
      }
    });
  },

  open() {
    document.getElementById('prova-search-overlay').classList.add('open');
    const field = document.getElementById('ps-field');
    field.value = '';
    setTimeout(() => field.focus(), 50);
    this._search('');
  },

  close() {
    document.getElementById('prova-search-overlay').classList.remove('open');
    this._q = '';
  },

  /* ─── Haupt-Suche ──────────────────────────────────────────── */
  _search(raw) {
    this._q = raw.trim().toLowerCase();
    this._words = this._q ? this._q.split(/\s+/).filter(Boolean) : [];
    const results = [];

    if (!this._q) {
      results.push({ group: 'Schnellaktionen' });
      results.push({ type:'action', label:'Neues Gutachten starten', icon:'✚', href:'vor-ort.html', sub:'Schritt 1: Auftragstyp wählen' });
      results.push({ type:'action', label:'Normen nachschlagen',     icon:'📐', href:'normen.html',  sub:'163 DIN · WTA · ZPO · JVEG Normen' });
      results.push({ type:'action', label:'Textbausteine öffnen',    icon:'📝', href:'textbausteine.html', sub:'Fertige Formulierungen einfügen' });

      const recent = this._getRecent();
      if (recent.length) { results.push({ group: 'Zuletzt gearbeitet' }); recent.forEach(r => results.push(r)); }
    } else {
      // 1. Normen (lokal — sofort)
      const normen = this._searchNormen(this._q);
      if (normen.length) { results.push({ group: 'Normen & Vorschriften' }); normen.forEach(n => results.push(n)); }

      // 2. Textbausteine (lokal — sofort)
      const tb = this._searchTextbausteine(this._q);
      if (tb.length) { results.push({ group: 'Textbausteine' }); tb.forEach(t => results.push(t)); }

      // 3. Seiten (lokal — sofort)
      const pages = this.PAGES.filter(p => p.label.toLowerCase().includes(this._q));
      if (pages.length) { results.push({ group: 'Seiten & Module' }); pages.forEach(p => results.push(p)); }

      // 4. Lokale Fälle (sofort aus Cache)
      const localFaelle = this._searchFaelleLokal(this._q);
      if (localFaelle.length) { results.push({ group: 'Fälle (lokal)' }); localFaelle.forEach(f => results.push(f)); }

      // 5. Lokale Rechnungen (sofort aus Cache)
      const localRe = this._searchRechnungenLokal(this._q);
      if (localRe.length) { results.push({ group: 'Rechnungen (lokal)' }); localRe.forEach(r => results.push(r)); }

      // 6. Lokale Kontakte
      const localKontakte = this._searchKontakteLokal(this._q);
      if (localKontakte.length) { results.push({ group: 'Kontakte (lokal)' }); localKontakte.forEach(k => results.push(k)); }

      if (!results.length) {
        results.push({ type:'empty', label:'Nichts gefunden — Airtable wird durchsucht…' });
      }

      // 7. Airtable (async — alle drei parallel)
      this._searchAirtableAlles(this._q);
    }

    this._render(results);
  },

  /* ─── Normen-Suche ─────────────────────────────────────────── */
  _searchNormen(q) {
    if (!window.PROVA_NORMEN_DB) return [];
    const w = this._words;
    return window.PROVA_NORMEN_DB.filter(n =>
      this._matchAny([n.num, n.titel, n.bereich, n.gw], w)
    ).slice(0, 6).map(n => ({
      type:'norm', label: n.num, icon:'📐',
      href:'normen.html',
      sub: n.titel + (n.gw ? ' · ' + n.gw.substring(0,50) : '')
    }));
  },

  /* ─── Textbausteine-Suche ──────────────────────────────────── */
  _searchTextbausteine(q) {
    try {
      const bausteine = JSON.parse(localStorage.getItem(TB_KEY_SEARCH) || '[]');
      const w = this._words;
      return bausteine.filter(b =>
        this._matchAny([b.titel, b.text, b.kat, b.tag], w)
      ).slice(0, 5).map(b => ({
        type:'textbaustein', label: b.titel || 'Ohne Titel', icon:'📝',
        href:'textbausteine.html',
        sub: (b.text || '').substring(0, 70).replace(/\n/g,' ') + '…'
      }));
    } catch(e) { return []; }
  },

  /* ─── Fälle lokal ──────────────────────────────────────────── */
  _searchFaelleLokal(q) {
    try {
      const cache = JSON.parse(localStorage.getItem('prova_faelle_cache') || '[]');
      const w = this._words;
      return cache.filter(c =>
        this._matchAny([c.az, c.auftraggeber, c.adresse, c.sa], w)
      ).slice(0, 4).map(c => ({
        type:'case', label: c.az || '—', icon:'📋',
        href:'akte.html?az=' + encodeURIComponent(c.az || ''),
        sub: [c.sa, c.auftraggeber, c.adresse].filter(Boolean).join(' · ')
      }));
    } catch(e) { return []; }
  },

  /* ─── Rechnungen lokal ─────────────────────────────────────── */
  _searchRechnungenLokal(q) {
    try {
      const cache = JSON.parse(localStorage.getItem('prova_rechnungen_local') || '[]');
      const w = this._words;
      return cache.filter(r =>
        this._matchAny([r.re_nr, r.auftraggeber, r.az], w)
      ).slice(0, 3).map(r => ({
        type:'rechnung', label: r.re_nr || '—', icon:'💶',
        href:'rechnungen.html',
        sub: [r.auftraggeber, r.betrag_brutto ? r.betrag_brutto.toFixed(2).replace('.',',') + ' €' : '', r.Status].filter(Boolean).join(' · ')
      }));
    } catch(e) { return []; }
  },

  /* ─── Kontakte lokal ───────────────────────────────────────── */
  _searchKontakteLokal(q) {
    try {
      const cache = JSON.parse(localStorage.getItem('prova_kontakte') || '[]');
      const w = this._words;
      return cache.filter(k =>
        this._matchAny([k.name, k.firma, k.email, k.telefon], w)
      ).slice(0, 3).map(k => ({
        type:'kontakt', label: k.name || k.firma || '—', icon:'👤',
        href:'kontakte.html',
        sub: [k.firma, k.typ, k.email].filter(Boolean).join(' · ')
      }));
    } catch(e) { return []; }
  },

  /* ─── Airtable: Fälle + Rechnungen + Kontakte parallel ──── */
  _searchAirtableAlles(q) {
    clearTimeout(this._atTimer);
    this._atTimer = setTimeout(() => {
      if (q !== this._q) return;
      const svEmail = localStorage.getItem('prova_sv_email') || '';
      if (!svEmail || q.length < 2) return;
      this._setStatus('Suche…');

      const headers = Object.assign({'Content-Type':'application/json'}, window.provaAuthHeaders ? window.provaAuthHeaders() : {});

      // Fälle
      const _fFields = ['{Aktenzeichen}','{Auftraggeber_Name}','{Schaden_Strasse}','{Schadensart}','{Ort}','{Status}'];
      const fFilter = this._words.length
        ? this._words.map(w=>`OR(${_fFields.map(f=>`FIND("${w}",LOWER(${f}))`).join(',')})`).join(',')
        : `OR(${_fFields.map(f=>`FIND("${q}",LOWER(${f}))`).join(',')})`;
      const fFormula = encodeURIComponent(`AND({sv_email}="${svEmail}",${fFilter})`);
      fetch('/.netlify/functions/airtable', { method:'POST', headers, body: JSON.stringify({ method:'GET', path:`/v0/${AT_BASE_SEARCH}/${AT_FAELLE_SEARCH}?filterByFormula=${fFormula}&maxRecords=5&fields[]=Aktenzeichen&fields[]=Auftraggeber_Name&fields[]=Schadensart&fields[]=Schaden_Strasse&fields[]=Ort&fields[]=Status` })})
        .then(r => r.json()).then(d => { if (q !== this._q || !d.records) return; this._appendAirtable(d.records.map(r => ({ type:'case', label: r.fields.Aktenzeichen||'—', icon:'🔍', href:'akte.html?az='+encodeURIComponent(r.fields.Aktenzeichen||''), sub:[r.fields.Schadensart, r.fields.Auftraggeber_Name, [r.fields.Schaden_Strasse, r.fields.Ort].filter(Boolean).join(', ')].filter(Boolean).join(' · ') })), 'Fälle (Airtable)'); }).catch(()=>{});

      // Rechnungen
      const _rFields = ['{Rechnungsnummer}','{Auftraggeber}','{Aktenzeichen}'];
      const rFilter = this._words.length
        ? this._words.map(w=>`OR(${_rFields.map(f=>`FIND("${w}",LOWER(${f}))`).join(',')})`).join(',')
        : `OR(${_rFields.map(f=>`FIND("${q}",LOWER(${f}))`).join(',')})`;
      const rFormula = encodeURIComponent(`AND({sv_email}="${svEmail}",${rFilter})`);
      fetch('/.netlify/functions/airtable', { method:'POST', headers, body: JSON.stringify({ method:'GET', path:`/v0/${AT_BASE_SEARCH}/${AT_RECHNUNGEN_S}?filterByFormula=${rFormula}&maxRecords=4&fields[]=Rechnungsnummer&fields[]=Auftraggeber&fields[]=Betrag_Brutto&fields[]=Status` })})
        .then(r => r.json()).then(d => { if (q !== this._q || !d.records) return; this._appendAirtable(d.records.map(r => ({ type:'rechnung', label: r.fields.Rechnungsnummer||'—', icon:'💶', href:'rechnungen.html', sub:[r.fields.Auftraggeber, r.fields.Betrag_Brutto ? Number(r.fields.Betrag_Brutto).toFixed(2).replace('.',',')+'€' : '', r.fields.Status].filter(Boolean).join(' · ') })), 'Rechnungen (Airtable)'); }).catch(()=>{});

      // Kontakte
      const _kFields = ['{Name}','{Firma}','{Email}','{Telefon}'];
      const kFilter = this._words.length
        ? this._words.map(w=>`OR(${_kFields.map(f=>`FIND("${w}",LOWER(${f}))`).join(',')})`).join(',')
        : `OR(${_kFields.map(f=>`FIND("${q}",LOWER(${f}))`).join(',')})`;
      const kFormula = encodeURIComponent(`AND({sv_email}="${svEmail}",${kFilter})`);
      fetch('/.netlify/functions/airtable', { method:'POST', headers, body: JSON.stringify({ method:'GET', path:`/v0/${AT_BASE_SEARCH}/${AT_KONTAKTE_S}?filterByFormula=${kFormula}&maxRecords=4&fields[]=Name&fields[]=Firma&fields[]=Typ&fields[]=Email&fields[]=Telefon` })})
        .then(r => r.json()).then(d => { if (q !== this._q || !d.records) return; this._appendAirtable(d.records.map(r => ({ type:'kontakt', label: r.fields.Name||r.fields.Firma||'—', icon:'👤', href:'kontakte.html', sub:[r.fields.Firma, r.fields.Typ && r.fields.Typ.name||r.fields.Typ, r.fields.Email].filter(Boolean).join(' · ') })), 'Kontakte (Airtable)'); }).catch(()=>{});

      // Foto-Captions (wenn Feld existiert)
      const fotoCaptionFilter = this._words.length
        ? this._words.map(w => `FIND("${w}",LOWER({Foto_Captions}))`).join(',')
        : `FIND("${q}",LOWER({Foto_Captions}))`;
      const fcFormula = encodeURIComponent(`AND({sv_email}="${svEmail}",AND(${fotoCaptionFilter}))`);
      fetch('/.netlify/functions/airtable', { method:'POST', headers, body: JSON.stringify({ method:'GET', path:`/v0/${AT_BASE_SEARCH}/${AT_FAELLE_SEARCH}?filterByFormula=${fcFormula}&maxRecords=4&fields[]=Aktenzeichen&fields[]=Schadensart&fields[]=Foto_Captions&fields[]=Fotos_Anzahl` })})
        .then(r => r.json()).then(d => {
          if (q !== this._q || !d.records) return;
          this._appendAirtable(d.records.map(r => ({
            type:'foto', label: r.fields.Aktenzeichen||'—', icon:'📷',
            href:'akte.html?az='+encodeURIComponent(r.fields.Aktenzeichen||''),
            sub: (r.fields.Fotos_Anzahl||'?') + ' Fotos · ' + (r.fields.Schadensart||'') + ' · ' + (r.fields.Foto_Captions||'').substring(0,60) + '…'
          })), 'Fotos (Bildbeschreibung)');
        }).catch(()=>{});

            setTimeout(() => { if (q === this._q) this._setStatus(''); }, 2000);
    }, 350);
  },

  _appendAirtable(items, groupLabel) {
    if (!items.length) return;
    const container = document.getElementById('ps-results');
    if (!container) return;
    const existingHrefs = new Set([...container.querySelectorAll('.ps-item[data-href]')].map(e => e.dataset.href));
    const neu = items.filter(r => !existingHrefs.has(r.href));
    if (!neu.length) return;
    const g = document.createElement('div');
    g.className = 'ps-group';
    g.textContent = groupLabel;
    container.appendChild(g);
    neu.forEach(r => {
      const el = document.createElement('div');
      el.className = 'ps-item';
      el.dataset.href = r.href;
      el.tabIndex = -1;
      el.innerHTML = `<div class="ps-icon">${r.icon}</div><div style="flex:1;min-width:0"><div class="ps-label">${this._hl(r.label)}</div>${r.sub?`<div class="ps-sub">${r.sub}</div>`:''}</div><span class="ps-type">${this._typeLabel(r.type)}</span>`;
      el.addEventListener('click', () => { window.location.href = r.href; this.close(); });
      container.appendChild(el);
    });
    const empty = container.querySelector('.ps-empty');
    if (empty) empty.remove();
  },

  _typeLabel(type) {
    return {case:'Fall',norm:'Norm',textbaustein:'Textbaustein',rechnung:'Rechnung',kontakt:'Kontakt',foto:'Foto',page:'Seite',action:'Aktion'}[type] || type;
  },

  _setStatus(text) {
    const el = document.getElementById('ps-status');
    if (el) el.textContent = text;
  },

  _getRecent() {
    try {
      return JSON.parse(localStorage.getItem('prova_recent_cases') || '[]').slice(0, 4).map(c => ({
        type:'case', label: c.az||'—', icon:'📋',
        href:'akte.html?az='+encodeURIComponent(c.az||''),
        sub: [c.sa, c.adr].filter(Boolean).join(' · ')
      }));
    } catch(e) { return []; }
  },

  _activeIdx: -1,

  _render(items) {
    this._activeIdx = -1;
    const container = document.getElementById('ps-results');
    container.innerHTML = items.map(item => {
      if (item.type === 'empty') return `<div class="ps-empty">${item.label}</div>`;
      if (item.group) return `<div class="ps-group">${item.group}</div>`;
      return `<div class="ps-item" data-href="${item.href||''}" tabindex="-1">
        <div class="ps-icon">${item.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="ps-label">${this._hl(item.label)}</div>
          ${item.sub ? `<div class="ps-sub">${item.sub}</div>` : ''}
        </div>
        <span class="ps-type">${this._typeLabel(item.type)}</span>
      </div>`;
    }).join('');
    container.querySelectorAll('.ps-item').forEach(el => {
      el.addEventListener('click', () => { window.location.href = el.dataset.href; this.close(); });
    });
  },

  _hl(text) {
    if (!this._words.length || !text) return text || '';
    let result = String(text);
    this._words.forEach(w => {
      const idx = result.toLowerCase().indexOf(w);
      if (idx < 0) return;
      result = result.slice(0, idx) + '<mark>' + result.slice(idx, idx + w.length) + '</mark>' + result.slice(idx + w.length);
    });
    return result;
  },

  _handleArrow(e) {
    const items = [...document.getElementById('ps-results').querySelectorAll('.ps-item')];
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
