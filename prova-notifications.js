/**
 * PROVA — In-App Benachrichtigungen (Glocke in der Topbar)
 * - Lokale Daten: Termine (Fristen), Rechnungen (offen), Ergänzungsgutachten-Flag, Systemhinweise
 * - Optional Airtable: Tabelle NOTIFICATIONS — Base/Table-ID unten eintragen; Make.com kann täglich neue Zeilen anlegen
 */
(function () {
  var CACHE_KEY = 'prova_notifications_cache_v1';
  var READ_IDS = 'prova_notifications_read_ids';

  /** Optional: Airtable NOTIFICATIONS (Felder: Titel, Text, Typ, Erstellt, Gelesen) */
  var AIRTABLE_NOTIF_PATH = ''; // z. B. '/v0/appXXXX/tblYYYY?maxRecords=20'

  function getReadSet() {
    try {
      var raw = localStorage.getItem(READ_IDS);
      if (!raw) return {};
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a.reduce(function (o, id) { o[id] = 1; return o; }, {}) : {};
    } catch (e) {
      return {};
    }
  }

  function markRead(id) {
    var s = getReadSet();
    s[id] = 1;
    try {
      localStorage.setItem(READ_IDS, JSON.stringify(Object.keys(s)));
    } catch (e) {}
    renderBadge();
  }

  function daysBetween(a, b) {
    return Math.round((a - b) / 86400000);
  }

  function buildLocalNotifications() {
    var list = [];
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      var termine = JSON.parse(localStorage.getItem('prova_termine_v2') || '[]');
      termine.forEach(function (t) {
        if (!t || t.erledigt || !t.datum) return;
        var d = new Date(t.datum + 'T12:00:00');
        if (isNaN(d)) return;
        var diff = daysBetween(d, today);
        if (t.typ === 'Frist' && diff >= 0 && diff <= 14) {
          list.push({
            id: 't-' + (t.id || t.titel) + t.datum,
            title: 'Frist in ' + diff + ' Tag' + (diff === 1 ? '' : 'en'),
            text: (t.titel || 'Termin') + (t.az ? ' · ' + t.az : ''),
            type: 'frist',
            time: Date.now()
          });
        }
      });
    } catch (e) {}

    try {
      var rechnungen = JSON.parse(localStorage.getItem('prova_rechnungen_local') || '[]');
      rechnungen.forEach(function (r) {
        if (!r || r.status === 'bezahlt') return;
        var tage = Number(r.tage_offen);
        if (!tage && r.faellig) {
          var fd = new Date(r.faellig + 'T12:00:00');
          if (!isNaN(fd)) tage = Math.max(0, daysBetween(today, fd));
        }
        if (tage >= 7 || r.status === 'ueberfaellig') {
          list.push({
            id: 'r-' + (r.rechnungsnummer || r.nr || Math.random()),
            title: 'Rechnung ' + (tage || '?') + ' Tage offen',
            text: (r.rechnungsnummer || '') + ' · ' + (r.empfaenger_name || ''),
            type: 'rechnung',
            time: Date.now()
          });
        }
      });
    } catch (e) {}

    if (localStorage.getItem('prova_ergaenzung_angefordert') === '1') {
      list.push({
        id: 'erg-1',
        title: 'Ergänzungsgutachten angefordert',
        text: 'Bitte Frist und Aktenzeichen in den Terminen prüfen.',
        type: 'ergaenzung',
        time: Date.now()
      });
    }

    list.push({
      id: 'prova-sys-notify-hint',
      title: 'Systemupdates',
      text: 'Benachrichtigungen lassen sich über die Airtable-Tabelle NOTIFICATIONS und einen täglichen Make-Scan erweitern.',
      type: 'system',
      time: Date.now()
    });

    return list;
  }

  function fetchAirtableNotifications(cb) {
    if (!AIRTABLE_NOTIF_PATH) return cb(null);
    provaFetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET', path: AIRTABLE_NOTIF_PATH })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.records) return cb(null);
        var out = data.records.map(function (rec) {
          var f = rec.fields || {};
          return {
            id: 'air-' + rec.id,
            title: f.Titel || f.title || 'Mitteilung',
            text: f.Text || f.text || '',
            type: f.Typ || 'info',
            time: Date.now()
          };
        });
        cb(out);
      })
      .catch(function () { cb(null); });
  }

  function mergeNotifications(local, remote) {
    var map = {};
    local.forEach(function (n) { map[n.id] = n; });
    if (remote) remote.forEach(function (n) { if (!map[n.id]) map[n.id] = n; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function injectBell() {
    var tr = document.querySelector('.topbar-right');
    if (!tr || document.getElementById('prova-notif-bell')) return;

    var wrap = document.createElement('div');
    wrap.id = 'prova-notif-wrap';
    wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'prova-notif-bell';
    btn.setAttribute('aria-label', 'Benachrichtigungen');
    btn.style.cssText =
      'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:var(--text2,#9da3b4);width:40px;height:40px;border-radius:10px;cursor:pointer;font-size:18px;display:inline-flex;align-items:center;justify-content:center;';
    btn.innerHTML = '🔔<span id="prova-notif-badge" style="display:none;position:absolute;top:4px;right:4px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#ef4444;color:#fff;font-size:10px;font-weight:800;line-height:16px;"></span>';

    var panel = document.createElement('div');
    panel.id = 'prova-notif-panel';
    panel.style.cssText =
      'display:none;position:absolute;right:0;top:calc(100% + 8px);width:min(360px,calc(100vw - 24px));max-height:min(70vh,420px);overflow:auto;background:var(--bg2,#13161d);border:1px solid rgba(255,255,255,0.1);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.45);z-index:500;padding:10px 0;';

    wrap.appendChild(btn);
    wrap.appendChild(panel);

    var settings = tr.querySelector('.settings-link');
    if (settings) tr.insertBefore(wrap, settings);
    else tr.insertBefore(wrap, tr.firstChild);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.style.display !== 'block';
      panel.style.display = open ? 'block' : 'none';
      if (open) renderPanel(panel);
    });
    document.addEventListener('click', function () {
      panel.style.display = 'none';
    });
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  function renderBadge() {
    var items = buildLocalNotifications();
    var read = getReadSet();
    var unread = items.filter(function (n) { return !read[n.id]; }).length;
    var b = document.getElementById('prova-notif-badge');
    if (!b) return;
    if (unread > 0) {
      b.style.display = 'inline-block';
      b.textContent = unread > 9 ? '9+' : String(unread);
    } else {
      b.style.display = 'none';
    }
  }

  function renderPanel(panel) {
    var items = buildLocalNotifications();
    fetchAirtableNotifications(function (remote) {
      items = mergeNotifications(items, remote);
      items.sort(function (a, b) { return (b.time || 0) - (a.time || 0); });
      var read = getReadSet();
      panel.innerHTML =
        '<div style="padding:8px 14px 10px;font-weight:800;color:var(--text,#e8eaf0);font-size:13px;">Benachrichtigungen</div>';

      if (!items.length) {
        panel.innerHTML +=
          '<div style="padding:12px 16px;color:var(--text3,#6b7280);font-size:13px;">Keine Einträge.</div>';
        return;
      }

      items.forEach(function (n) {
        var row = document.createElement('button');
        row.type = 'button';
        row.style.cssText =
          'width:100%;text-align:left;padding:10px 14px;border:none;background:' +
          (read[n.id] ? 'transparent' : 'rgba(79,142,247,0.06)') +
          ';cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.06);color:inherit;font:inherit;';
        row.innerHTML =
          '<div style="font-weight:700;font-size:13px;color:var(--text,#e8eaf0);">' +
          escapeHtml(n.title) +
          '</div><div style="font-size:12px;color:var(--text3,#8b93ab);margin-top:4px;line-height:1.45;">' +
          escapeHtml(n.text) +
          '</div>';
        row.addEventListener('click', function () {
          markRead(n.id);
          row.style.background = 'transparent';
        });
        panel.appendChild(row);
      });
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init() {
    injectBell();
    renderBadge();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
