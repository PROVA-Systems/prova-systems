/* ════════════════════════════════════════════════════════════════════
   PROVA — In-App Benachrichtigungen (Glocke)
   S-SICHER P5b.E (Sprint 04b, 26.04.2026)

   Lebt rechts oben im Header / direkt rechts vom Sidebar-Toggle.
   Vier Kategorien:
     ⚡ Aufgaben — SCHADENSFAELLE phase_aktuell = 4 + BRIEFE wartet
     ⏰ Termine  — TERMINE termin_datum innerhalb 4h / 24h
     ⚠ Achtung  — RECHNUNGEN ueberfaellig + WORKFLOW_ERRORS letzte 24h
     📰 System   — AUDIT_TRAIL info/success letzte 24h

   Schema-Query first verifiziert (Regel 28):
     SCHADENSFAELLE: phase_aktuell (number), Aktenzeichen, Auftraggeber_Name,
                     phase_4_completed_at (dateTime), sv_email
     TERMINE:        termin_datum (dateTime), termin_typ, objekt_adresse,
                     aktenzeichen, sv_email
     RECHNUNGEN:     status (lowercase), faellig_am (date), aktenzeichen,
                     empfaenger_name, brutto_betrag_eur, sv_email
     WORKFLOW_ERRORS: timestamp, workflow, sv_email, error_message
     AUDIT_TRAIL:    typ, sv_email, timestamp, aktion

   Polling: 60s.
   Read-State: localStorage 'prova_notif_read_ids_v2' (Set).
═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var READ_KEY = 'prova_notif_read_ids_v2';
  var POLL_MS = 60000;
  var BASE = 'appJ7bLlAHZoxENWE';
  var TBL_FAELLE = 'tblSxV8bsXwd1pwa0';
  var TBL_TERMINE = 'tblyMTTdtfGQjjmc2';
  var TBL_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';
  var TBL_AUDIT = 'tblqQmMwJKxltXXXl';
  var TBL_ERRORS = 'tblgECx0eyrpQTN8e';

  var _items = [];
  var _pollTimer = null;

  function getReadSet() {
    try {
      var raw = localStorage.getItem(READ_KEY);
      if (!raw) return {};
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.reduce(function (o, id) { o[id] = 1; return o; }, {}) : {};
    } catch (e) { return {}; }
  }
  function markRead(ids) {
    var s = getReadSet();
    (Array.isArray(ids) ? ids : [ids]).forEach(function (id) { s[id] = 1; });
    try { localStorage.setItem(READ_KEY, JSON.stringify(Object.keys(s))); } catch (e) {}
  }
  function markAllRead() {
    markRead(_items.map(function (n) { return n.id; }));
    renderBadge();
    var panel = document.getElementById('prova-notif-panel');
    if (panel && panel.style.display === 'block') renderPanel(panel);
  }
  window.provaNotifMarkAllRead = markAllRead;

  function escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtRelative(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d)) return '';
    var diffMs = Date.now() - d.getTime();
    var mins = Math.floor(diffMs / 60000);
    if (mins < 1)  return 'gerade eben';
    if (mins < 60) return 'vor ' + mins + ' Min';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return 'vor ' + hours + ' Std';
    var days = Math.floor(hours / 24);
    return 'vor ' + days + ' Tag' + (days === 1 ? '' : 'en');
  }

  function fmtDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  }

  async function atQuery(path) {
    if (typeof window.provaFetch !== 'function') return [];
    try {
      var res = await window.provaFetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'GET', path: path })
      });
      if (!res.ok) return [];
      var data = await res.json();
      return data.records || [];
    } catch (e) { return []; }
  }

  function buildPath(table, formula, fields, sort, max) {
    var params = new URLSearchParams();
    if (formula) params.set('filterByFormula', formula);
    (fields || []).forEach(function (f) { params.append('fields[]', f); });
    if (sort) {
      params.append('sort[0][field]', sort.field);
      params.append('sort[0][direction]', sort.direction || 'desc');
    }
    if (max) params.set('maxRecords', String(max));
    params.set('pageSize', '50');
    return '/v0/' + BASE + '/' + table + '?' + params.toString();
  }

  async function loadAll() {
    var svEmail = (localStorage.getItem('prova_sv_email') || '').toLowerCase();
    if (!svEmail) { _items = []; return; }

    var todayIso = new Date().toISOString();
    var grenz14 = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    var grenz24h = new Date(Date.now() - 24 * 3600000).toISOString();

    var [faelle, termine, rechnungen, errors, audits] = await Promise.all([
      // 1. Aufgaben: phase_aktuell = 4 (Freigabe wartet)
      atQuery(buildPath(TBL_FAELLE,
        "AND({sv_email}='" + svEmail + "', {phase_aktuell}=4)",
        ['Aktenzeichen', 'Auftraggeber_Name', 'phase_4_completed_at', 'Schadensart'],
        { field: 'phase_4_completed_at', direction: 'asc' },
        20
      )),
      // 2. Termine: naechste 24h
      atQuery(buildPath(TBL_TERMINE,
        "AND({sv_email}='" + svEmail + "', IS_AFTER({termin_datum},NOW()), DATETIME_DIFF({termin_datum},NOW(),'hours')<24)",
        ['termin_datum', 'termin_typ', 'objekt_adresse', 'aktenzeichen'],
        { field: 'termin_datum', direction: 'asc' },
        10
      )),
      // 3. Achtung — Rechnungen ueberfaellig
      atQuery(buildPath(TBL_RECHNUNGEN,
        "AND({sv_email}='" + svEmail + "', LOWER({status})='offen', IS_BEFORE({faellig_am},'" + grenz14 + "'))",
        ['Rechnungsnummer', 'aktenzeichen', 'empfaenger_name', 'brutto_betrag_eur', 'faellig_am'],
        { field: 'faellig_am', direction: 'asc' },
        10
      )),
      // 4. Achtung — Workflow-Errors letzte 24h
      atQuery(buildPath(TBL_ERRORS,
        "AND({sv_email}='" + svEmail + "', IS_AFTER({timestamp},'" + grenz24h + "'), NOT({resolved}))",
        ['workflow', 'error_message', 'fall_az', 'timestamp'],
        { field: 'timestamp', direction: 'desc' },
        5
      )),
      // 5. System — Audit-Trail letzte 24h
      atQuery(buildPath(TBL_AUDIT,
        "AND({sv_email}='" + svEmail + "', IS_AFTER({timestamp},'" + grenz24h + "'))",
        ['typ', 'aktion', 'timestamp', 'aktenzeichen'],
        { field: 'timestamp', direction: 'desc' },
        10
      ))
    ]);

    var items = [];

    faelle.forEach(function (r) {
      var f = r.fields || {};
      items.push({
        id: 'auf-' + r.id, kategorie: 'aufgaben',
        title: 'Entwurf wartet auf Freigabe',
        sub: (f.Aktenzeichen || '—') + (f.Auftraggeber_Name ? ' · ' + f.Auftraggeber_Name : ''),
        meta: f.phase_4_completed_at ? fmtRelative(f.phase_4_completed_at).replace('vor ', 'Seit ') + ' wartend' : '',
        cta: 'Prüfen',
        url: 'freigabe.html?az=' + encodeURIComponent(f.Aktenzeichen || ''),
        ts: f.phase_4_completed_at || ''
      });
    });

    termine.forEach(function (r) {
      var f = r.fields || {};
      var diffMs = new Date(f.termin_datum).getTime() - Date.now();
      var diffHours = Math.round(diffMs / 3600000);
      items.push({
        id: 'trm-' + r.id, kategorie: 'termine',
        title: (f.termin_typ || 'Termin') + (diffHours <= 4 ? ' in ' + diffHours + ' Stunden' : ' morgen'),
        sub: (f.aktenzeichen || '—') + (f.objekt_adresse ? ' · ' + f.objekt_adresse : ''),
        meta: fmtDateTime(f.termin_datum),
        cta: 'Termin ansehen',
        url: 'termine.html',
        ts: f.termin_datum || ''
      });
    });

    rechnungen.forEach(function (r) {
      var f = r.fields || {};
      var tageOffen = f.faellig_am
        ? Math.floor((Date.now() - new Date(f.faellig_am).getTime()) / 86400000)
        : 0;
      var betragStr = (typeof f.brutto_betrag_eur === 'number')
        ? f.brutto_betrag_eur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
        : '';
      items.push({
        id: 'rech-' + r.id, kategorie: 'achtung',
        title: 'Rechnung überfällig',
        sub: (f.Rechnungsnummer || '—') + ' · ' + tageOffen + ' Tage über Frist',
        meta: (f.empfaenger_name || '') + (betragStr ? ' · ' + betragStr : ''),
        cta: 'Prüfen',
        url: 'rechnungen.html?id=' + encodeURIComponent(r.id),
        ts: f.faellig_am || ''
      });
    });

    errors.forEach(function (r) {
      var f = r.fields || {};
      items.push({
        id: 'err-' + r.id, kategorie: 'achtung',
        title: 'Workflow-Fehler: ' + (f.workflow || 'unbekannt'),
        sub: (f.fall_az || '—'),
        meta: (f.error_message || '').slice(0, 60),
        cta: 'Details',
        url: 'einstellungen.html#workflow',
        ts: f.timestamp || ''
      });
    });

    audits.forEach(function (r) {
      var f = r.fields || {};
      var typ = String(f.typ || '').toLowerCase();
      // Filter: nur info/success-Events; Rate-Limit-Hit/Auth-Required uebersprungen
      if (typ === 'auth-required' || typ === 'auth-mismatch' || typ === 'rate-limit-hit' || typ === 'origin-block') return;
      items.push({
        id: 'aud-' + r.id, kategorie: 'system',
        title: f.typ || 'System-Ereignis',
        sub: f.aktion || '',
        meta: fmtRelative(f.timestamp),
        cta: '',
        url: '',
        ts: f.timestamp || ''
      });
    });

    _items = items;
  }

  function getUnreadCount() {
    var read = getReadSet();
    return _items.filter(function (n) { return !read[n.id]; }).length;
  }

  function renderBadge() {
    var b = document.getElementById('prova-notif-badge');
    if (!b) return;
    var n = getUnreadCount();
    if (n > 0) {
      b.style.display = 'inline-flex';
      b.textContent = n > 99 ? '99+' : String(n);
    } else {
      b.style.display = 'none';
    }
  }

  function groupByKategorie() {
    var groups = { aufgaben: [], termine: [], achtung: [], system: [] };
    _items.forEach(function (n) {
      if (groups[n.kategorie]) groups[n.kategorie].push(n);
    });
    return groups;
  }

  var KATEGORIE_META = {
    aufgaben: { icon: '⚡', label: 'Aufgaben', color: '#fcd34d' },
    termine:  { icon: '⏰', label: 'Termine',  color: '#93c5fd' },
    achtung:  { icon: '⚠',  label: 'Achtung',  color: '#f87171' },
    system:   { icon: '📰', label: 'System',   color: '#a78bfa' }
  };

  function renderPanel(panel) {
    var read = getReadSet();
    var unread = getUnreadCount();
    var total = _items.length;
    var groups = groupByKategorie();

    var html = ''
      + '<div class="prova-notif-head">'
      +   '<div class="prova-notif-title">Benachrichtigungen' + (total ? ' (' + total + ')' : '') + '</div>';
    if (unread > 0) {
      html += '<button type="button" class="prova-notif-mark-all" onclick="provaNotifMarkAllRead()">Alle ✓</button>';
    }
    html += '</div>';

    if (total === 0) {
      html += '<div class="prova-notif-empty">'
        +   '<div class="prova-notif-empty-icon">✓</div>'
        +   '<div class="prova-notif-empty-title">Keine neuen Benachrichtigungen</div>'
        +   '<div class="prova-notif-empty-sub">Alles erledigt!</div>'
        + '</div>';
    } else {
      Object.keys(KATEGORIE_META).forEach(function (k) {
        var arr = groups[k];
        if (!arr || !arr.length) return;
        var meta = KATEGORIE_META[k];
        html += '<div class="prova-notif-group">'
          +   '<div class="prova-notif-group-head" style="color:' + meta.color + ';">'
          +     meta.icon + ' ' + meta.label + ' (' + arr.length + ')'
          +   '</div>';
        arr.forEach(function (n) {
          var isRead = !!read[n.id];
          html += '<div class="prova-notif-item' + (isRead ? ' read' : '') + '" data-id="' + escHtml(n.id) + '"'
            +    (n.url ? ' data-url="' + escHtml(n.url) + '"' : '') + '>'
            +    '<div class="prova-notif-item-title">' + escHtml(n.title) + '</div>'
            +    (n.sub ? '<div class="prova-notif-item-sub">' + escHtml(n.sub) + '</div>' : '')
            +    (n.meta ? '<div class="prova-notif-item-meta">' + escHtml(n.meta) + '</div>' : '')
            +    (n.cta && n.url ? '<a class="prova-notif-item-cta" href="' + escHtml(n.url) + '">' + escHtml(n.cta) + ' →</a>' : '')
            +  '</div>';
        });
        html += '</div>';
      });
    }
    html += '<div class="prova-notif-foot">'
      +   '<a href="benachrichtigungen.html">Alle Benachrichtigungen →</a>'
      + '</div>';

    panel.innerHTML = html;

    // Click-Handler fuer Items
    panel.querySelectorAll('.prova-notif-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var id = el.getAttribute('data-id');
        var url = el.getAttribute('data-url');
        markRead(id);
        el.classList.add('read');
        renderBadge();
        if (url && !e.target.closest('.prova-notif-item-cta')) {
          window.location.href = url;
        }
      });
    });
  }

  function injectCss() {
    if (document.getElementById('prova-notif-css')) return;
    var css = ''
      + '#prova-notif-wrap{position:fixed;top:14px;right:18px;z-index:550;}'
      + '@media(max-width:768px){#prova-notif-wrap{top:10px;right:14px;}}'
      + '#prova-notif-bell{'
      +   'position:relative;width:38px;height:38px;border-radius:10px;'
      +   'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);'
      +   'color:var(--text2,#aab4cb);font-size:17px;cursor:pointer;'
      +   'display:flex;align-items:center;justify-content:center;'
      +   'transition:all .15s;font-family:inherit;'
      + '}'
      + '#prova-notif-bell:hover{background:rgba(255,255,255,.1);color:var(--text);}'
      + '#prova-notif-badge{'
      +   'position:absolute;top:3px;right:3px;min-width:16px;height:16px;'
      +   'padding:0 4px;border-radius:999px;background:#ef4444;color:#fff;'
      +   'font-size:9.5px;font-weight:800;line-height:16px;'
      +   'display:none;align-items:center;justify-content:center;'
      +   'box-shadow:0 0 0 2px var(--bg,#0b0d11);'
      + '}'
      + '#prova-notif-panel{'
      +   'display:none;position:absolute;top:calc(100% + 8px);right:0;'
      +   'width:min(380px,calc(100vw - 24px));max-height:min(75vh,540px);'
      +   'overflow:auto;background:var(--bg2,#13161d);'
      +   'border:1px solid var(--border2,rgba(255,255,255,.12));'
      +   'border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.55);'
      +   'font-family:inherit;'
      + '}'
      + '.prova-notif-head{'
      +   'display:flex;align-items:center;justify-content:space-between;'
      +   'padding:12px 14px;border-bottom:1px solid var(--border,rgba(255,255,255,.05));'
      +   'position:sticky;top:0;background:var(--bg2);z-index:1;'
      + '}'
      + '.prova-notif-title{font-size:13px;font-weight:800;color:var(--text);}'
      + '.prova-notif-mark-all{'
      +   'background:rgba(79,142,247,.1);border:none;color:var(--accent);'
      +   'font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;'
      +   'cursor:pointer;font-family:inherit;'
      + '}'
      + '.prova-notif-mark-all:hover{background:rgba(79,142,247,.18);}'
      + '.prova-notif-group{padding:6px 0;}'
      + '.prova-notif-group:not(:last-child){border-bottom:1px solid var(--border,rgba(255,255,255,.04));}'
      + '.prova-notif-group-head{'
      +   'padding:8px 14px 4px;font-size:10px;font-weight:800;'
      +   'text-transform:uppercase;letter-spacing:.08em;'
      + '}'
      + '.prova-notif-item{'
      +   'padding:8px 14px 10px;cursor:pointer;'
      +   'border-left:2px solid var(--accent,#4f8ef7);margin:2px 0;'
      +   'background:rgba(79,142,247,.04);transition:background .15s;'
      + '}'
      + '.prova-notif-item.read{border-left-color:transparent;background:transparent;opacity:.65;}'
      + '.prova-notif-item:hover{background:rgba(79,142,247,.1);}'
      + '.prova-notif-item-title{font-size:12.5px;font-weight:700;color:var(--text);margin-bottom:2px;}'
      + '.prova-notif-item-sub{font-size:11.5px;color:var(--text2,#aab4cb);margin-bottom:2px;}'
      + '.prova-notif-item-meta{font-size:10.5px;color:var(--text3,#6b7280);}'
      + '.prova-notif-item-cta{'
      +   'display:inline-block;margin-top:6px;font-size:11px;font-weight:700;'
      +   'color:var(--accent);text-decoration:none;'
      + '}'
      + '.prova-notif-item-cta:hover{text-decoration:underline;}'
      + '.prova-notif-empty{padding:30px 18px;text-align:center;}'
      + '.prova-notif-empty-icon{font-size:32px;color:var(--success,#10b981);margin-bottom:8px;}'
      + '.prova-notif-empty-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px;}'
      + '.prova-notif-empty-sub{font-size:11.5px;color:var(--text3);}'
      + '.prova-notif-foot{'
      +   'padding:10px 14px;border-top:1px solid var(--border,rgba(255,255,255,.05));'
      +   'text-align:center;'
      + '}'
      + '.prova-notif-foot a{font-size:11.5px;color:var(--accent);text-decoration:none;font-weight:600;}'
      + '.prova-notif-foot a:hover{text-decoration:underline;}'
      + '.prova-notif-pulse{animation:provaNotifPulse 2s ease-in-out infinite;}'
      + '@keyframes provaNotifPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}'
    ;
    var style = document.createElement('style');
    style.id = 'prova-notif-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectBell() {
    if (document.getElementById('prova-notif-wrap')) return;
    injectCss();
    var wrap = document.createElement('div');
    wrap.id = 'prova-notif-wrap';
    wrap.innerHTML = ''
      + '<button type="button" id="prova-notif-bell" aria-label="Benachrichtigungen">'
      +   '🔔<span id="prova-notif-badge"></span>'
      + '</button>'
      + '<div id="prova-notif-panel" role="dialog" aria-label="Benachrichtigungen"></div>';
    document.body.appendChild(wrap);

    var btn = document.getElementById('prova-notif-bell');
    var panel = document.getElementById('prova-notif-panel');

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.style.display !== 'block';
      panel.style.display = open ? 'block' : 'none';
      if (open) renderPanel(panel);
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) panel.style.display = 'none';
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  async function refresh() {
    await loadAll();
    renderBadge();
    var panel = document.getElementById('prova-notif-panel');
    if (panel && panel.style.display === 'block') renderPanel(panel);
  }

  function init() {
    if (!localStorage.getItem('prova_sv_email')) return; // nicht eingeloggt
    injectBell();
    // Erste Last verzoegert (sidebar-counts haben Prio in den ersten 800ms)
    setTimeout(refresh, 1500);
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(refresh, POLL_MS);
  }

  window.provaNotifRefresh = refresh;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
