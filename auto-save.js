/* ════════════════════════════════════════════════════════════
   PROVA auto-save.js
   Auto-Save für Formulare — verhindert Datenverlust
   Speichert alle 30s in localStorage, Restore-Prompt nach Reload
════════════════════════════════════════════════════════════ */

const AutoSave = {
  enabled: true,
  interval: 30000,
  lastSave: null,
  timer: null,

  init(options = {}) {
    if (options.enabled !== undefined) this.enabled = options.enabled;
    if (options.interval) this.interval = options.interval;
    if (!this.enabled) return;

    this._addIndicator();
    this._startTimer();
    this._restoreData();
    window.addEventListener('beforeunload', () => this.save());
  },

  _addIndicator() {
    const el = document.createElement('div');
    el.id = 'prova-autosave';
    el.style.cssText = [
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%)',
      'background:var(--bg2,#111827);border:1px solid var(--border2,rgba(255,255,255,.12))',
      'color:var(--text2,#aab4cb);padding:6px 14px;border-radius:8px',
      'font-size:11px;font-weight:600;z-index:9000;opacity:0',
      'transition:opacity .3s;pointer-events:none;font-family:var(--font-ui,system-ui)'
    ].join(';');
    document.body.appendChild(el);
  },

  _startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.save(), this.interval);
  },

  _key() {
    const az = (document.querySelector('[id*="schadensnummer"],[id*="aktenzeichen"],[name*="aktenzeichen"]') || {}).value || '';
    return 'prova_autosave_' + location.pathname + (az ? '_' + az : '');
  },

  save() {
    if (!this.enabled) return;
    try {
      const data = { _ts: Date.now(), _url: location.href };
      document.querySelectorAll('input:not([type=password]):not([type=file]),textarea,select').forEach(el => {
        if (!el.name && !el.id) return;
        const k = el.name || el.id;
        data[k] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
      });
      localStorage.setItem(this._key(), JSON.stringify(data));
    localStorage.setItem(this._key() + '_meta', JSON.stringify({ts: Date.now()}));
      this.lastSave = Date.now();
      this._flash('✓ Automatisch gespeichert');
    } catch(e) { this._cleanup(); }
  },

  saveNow() { this.save(); },

  _flash(msg) {
    const el = document.getElementById('prova-autosave');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 2500);
  },

  _restoreData() {
    try {
      const raw = localStorage.getItem(this._key());
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data._ts || Date.now() - data._ts > 7200000) return; // >2h: verwerfen
      // Auf app.html: nur Restore zeigen wenn AZ bereits vorhanden (= Wiederaufnahme)
      if (location.pathname.indexOf('app.html') >= 0 || location.pathname.endsWith('/app')) {
        var az = localStorage.getItem('prova_aktiver_fall') || '';
        if (!az) return; // Neues Gutachten → kein Restore
      }
      // Auf reinen Kalender/Abrechnungs-Seiten: kein Banner (nur Formulare die echte Eingaben haben)
      const noRestorePages = ['termine.html','erechnung.html','rechnungen.html'];
      if (noRestorePages.some(function(p){ return location.pathname.indexOf(p) >= 0; })) return;
      this._showRestoreBar(data);
    } catch(e) {}
  },

  _showRestoreBar(data) {
    const ago = this._ago(new Date(data._ts));
    const bar = document.createElement('div');
    bar.id = 'prova-restore-bar';
    bar.style.cssText = [
      'position:fixed;top:0;left:0;right:0;z-index:10000',
      'background:var(--accent,#4f8ef7);color:#fff',
      'display:flex;align-items:center;justify-content:space-between',
      'padding:10px 20px;font-size:13px;font-family:var(--font-ui,system-ui)'
    ].join(';');
    bar.innerHTML = '<span>' + (location.pathname.indexOf('app.html') >= 0 ? 'Wiederaufnahme — gespeichert ' : 'Ungespeicherte Eingaben gefunden — gespeichert ') + ago + '</span>'
      + '<span style="display:flex;gap:8px">'
      + '<button id="prova-restore-no" style="background:rgba(0,0,0,.2);border:none;color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;font-family:inherit">Verwerfen</button>'
      + '<button id="prova-restore-yes" style="background:#fff;border:none;color:var(--accent,#4f8ef7);padding:4px 12px;border-radius:6px;cursor:pointer;font-weight:700;font-family:inherit">Wiederherstellen</button>'
      + '</span>';
    document.body.insertBefore(bar, document.body.firstChild);
    document.getElementById('prova-restore-yes').onclick = () => this._doRestore(data);
    document.getElementById('prova-restore-no').onclick = () => { localStorage.removeItem(this._key()); bar.remove(); };
  },

  _doRestore(data) {
    Object.keys(data).filter(k => !k.startsWith('_')).forEach(k => {
      const el = document.querySelector('[name="'+k+'"],[id="'+k+'"]');
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = data[k];
      else el.value = data[k];
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    (function(){var _el=document.getElementById('prova-restore-bar');if(_el)_el.remove();})();
    this._flash('✓ Eingaben wiederhergestellt');
  },

  _ago(date) {
    const s = Math.floor((Date.now() - date) / 1000);
    if (s < 60) return 'vor wenigen Sekunden';
    if (s < 3600) return 'vor ' + Math.floor(s/60) + ' Min.';
    return 'vor ' + Math.floor(s/3600) + ' Std.';
  },

  _cleanup() {
    const cut = Date.now() - 7 * 86400000;
    Object.keys(localStorage).filter(k => k.startsWith('prova_autosave_')).forEach(k => {
      try { if (JSON.parse(localStorage.getItem(k))._ts < cut) localStorage.removeItem(k); } catch(e) { localStorage.removeItem(k); }
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    var _pg = (window.location.pathname.split('/').pop() || '');
    var _skip = ['baubegleitung.html','briefvorlagen.html','archiv.html','dashboard.html',
      'statistiken.html','normen.html','textbausteine.html','termine.html',
      'kontakte.html','rechnungen.html','einstellungen.html','hilfe.html',
      'positionen.html','kostenermittlung.html','jveg.html','jahresbericht.html',
      'benachrichtigungen.html','erechnung.html'];
    if (!_skip.includes(_pg)) AutoSave.init();
  });
  } else {
    var _pg2 = (window.location.pathname.split('/').pop() || '');
    if (!['baubegleitung.html','briefvorlagen.html','archiv.html','dashboard.html'].includes(_pg2)) AutoSave.init();
  }
