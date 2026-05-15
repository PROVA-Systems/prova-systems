/* ════════════════════════════════════════════════════════════════════
   PROVA — In-App Benachrichtigungen (Glocke) v3 — MEGA⁸¹
   File: prova-notifications.js

   Lebt rechts oben im Header (.prova-notif-slot oder .topbar-right).
   Quelle: Supabase RPCs (siehe supabase-migrations/57_mega81_notification_rpcs.sql)
     - notifications_unread_count()
     - notifications_list(limit, kategorie, only_unread)
     - notifications_mark_read(id)
     - notifications_mark_all_read()

   Kategorien (Live aus notification_kategorie-Enum):
     aufgaben ⚡  termine ⏰  achtung ⚠  system 📰

   Polling: 60s · Cross-Tab-Update via storage-Event auf prova_notif_last_seen
═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var POLL_MS = 60000;
  var LIMIT = 30;

  var _root = null;
  var _btn = null;
  var _dropdown = null;
  var _badge = null;
  var _pollTimer = null;
  var _items = [];
  var _unreadCount = 0;
  var _open = false;

  var KAT_ICON = {
    aufgaben: '⚡',
    termine:  '⏰',
    achtung:  '⚠',
    system:   '📰'
  };
  var KAT_LABEL = {
    aufgaben: 'Aufgaben',
    termine:  'Termine',
    achtung:  'Achtung',
    system:   'System'
  };

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function _relativeTime(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    var s = Math.floor(diff / 1000);
    if (s < 60) return 'gerade eben';
    var m = Math.floor(s / 60); if (m < 60) return 'vor ' + m + ' Min';
    var h = Math.floor(m / 60); if (h < 24) return 'vor ' + h + ' Std';
    var t = Math.floor(h / 24); if (t < 7)  return 'vor ' + t + ' Tag' + (t === 1 ? '' : 'en');
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  async function _getSb() {
    if (_getSb._c) return _getSb._c;
    try {
      var mod = await import('/lib/supabase-client.js');
      _getSb._c = mod.supabase || (mod.getSupabase && mod.getSupabase());
      return _getSb._c;
    } catch (e) {
      console.warn('[notif] supabase-client import failed:', e.message);
      return null;
    }
  }

  function _injectStyle() {
    if (document.getElementById('prova-notif-bell-style')) return;
    var css = ''
      + '.pn-bell-wrap{position:relative;display:inline-flex;}'
      + '.pn-bell-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:none;border:1px solid transparent;border-radius:8px;cursor:pointer;color:var(--text2,#cbd5e1);font-size:18px;transition:background .12s,border-color .12s;}'
      + '.pn-bell-btn:hover{background:rgba(255,255,255,.05);border-color:var(--border2,rgba(255,255,255,.11));color:var(--text,#eaecf4);}'
      + '.pn-bell-btn[aria-expanded="true"]{background:rgba(79,142,247,.12);border-color:rgba(79,142,247,.3);color:var(--accent,#4f8ef7);}'
      + '.pn-bell-badge{position:absolute;top:4px;right:4px;min-width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;line-height:16px;text-align:center;padding:0 5px;display:none;}'
      + '.pn-bell-badge.is-active{display:inline-block;}'
      + '.pn-dropdown{position:absolute;top:46px;right:0;width:min(380px,calc(100vw - 24px));max-height:520px;background:var(--surface,#1c2130);border:1px solid var(--border2,rgba(255,255,255,.11));border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.4);z-index:200;display:none;flex-direction:column;overflow:hidden;}'
      + '.pn-dropdown.is-open{display:flex;}'
      + '.pn-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));}'
      + '.pn-head-title{font-size:13px;font-weight:700;color:var(--text,#eaecf4);}'
      + '.pn-head-action{font-size:11px;color:var(--accent,#4f8ef7);background:none;border:none;cursor:pointer;font-weight:600;padding:4px 6px;border-radius:6px;}'
      + '.pn-head-action:hover{background:rgba(79,142,247,.1);}'
      + '.pn-head-action:disabled{color:var(--text3,#64748b);cursor:default;background:none;}'
      + '.pn-list{flex:1;overflow-y:auto;}'
      + '.pn-empty{padding:32px 16px;text-align:center;color:var(--text3,#64748b);font-size:12px;}'
      + '.pn-row{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));cursor:pointer;transition:background .1s;text-decoration:none;color:inherit;}'
      + '.pn-row:hover{background:rgba(255,255,255,.03);}'
      + '.pn-row.is-unread{background:rgba(79,142,247,.04);}'
      + '.pn-row-icon{font-size:18px;width:24px;text-align:center;flex-shrink:0;line-height:1.2;}'
      + '.pn-row-body{flex:1;min-width:0;}'
      + '.pn-row-titel{font-size:13px;font-weight:600;color:var(--text,#eaecf4);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
      + '.pn-row-sub{font-size:11px;color:var(--text2,#cbd5e1);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}'
      + '.pn-row-meta{font-size:10px;color:var(--text3,#64748b);margin-top:4px;display:flex;gap:8px;align-items:center;}'
      + '.pn-foot{padding:8px 14px;border-top:1px solid var(--border,rgba(255,255,255,.06));text-align:center;}'
      + '.pn-foot a{font-size:11px;color:var(--text2,#cbd5e1);text-decoration:none;}'
      + '.pn-foot a:hover{color:var(--accent,#4f8ef7);}';
    var st = document.createElement('style');
    st.id = 'prova-notif-bell-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function _ensureMounted() {
    if (_root && document.body.contains(_root)) return _root;
    var slot = document.querySelector('.prova-notif-slot[data-prova-notif]')
            || document.querySelector('.topbar-right');
    if (!slot) return null;
    _injectStyle();

    _root = document.createElement('div');
    _root.className = 'pn-bell-wrap';
    _root.innerHTML = ''
      + '<button class="pn-bell-btn" aria-label="Benachrichtigungen" aria-expanded="false" type="button">'
      + '🔔<span class="pn-bell-badge" aria-hidden="true"></span>'
      + '</button>'
      + '<div class="pn-dropdown" role="dialog" aria-label="Benachrichtigungen">'
      + '  <div class="pn-head">'
      + '    <span class="pn-head-title">Benachrichtigungen</span>'
      + '    <button type="button" class="pn-head-action" data-mark-all>Alle als gelesen</button>'
      + '  </div>'
      + '  <div class="pn-list" data-list></div>'
      + '  <div class="pn-foot"><a href="/benachrichtigungen.html">Vollständiges Protokoll →</a></div>'
      + '</div>';

    if (slot.classList.contains('prova-notif-slot')) {
      slot.appendChild(_root);
    } else {
      slot.insertBefore(_root, slot.firstChild);
    }

    _btn = _root.querySelector('.pn-bell-btn');
    _badge = _root.querySelector('.pn-bell-badge');
    _dropdown = _root.querySelector('.pn-dropdown');
    var markAllBtn = _root.querySelector('[data-mark-all]');

    _btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _open ? _close() : _openDropdown();
    });
    markAllBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _markAllRead();
    });
    document.addEventListener('click', function (e) {
      if (_open && _root && !_root.contains(e.target)) _close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _open) _close();
    });
    return _root;
  }

  function _renderBadge() {
    if (!_badge) return;
    if (_unreadCount > 0) {
      _badge.textContent = _unreadCount > 99 ? '99+' : String(_unreadCount);
      _badge.classList.add('is-active');
    } else {
      _badge.classList.remove('is-active');
    }
  }

  function _renderList() {
    if (!_dropdown) return;
    var list = _dropdown.querySelector('[data-list]');
    if (!_items.length) {
      list.innerHTML = '<div class="pn-empty">Keine Benachrichtigungen ✓</div>';
      return;
    }
    list.innerHTML = _items.map(function (n) {
      var unread = !n.read_at;
      var kat = (n.kategorie || 'system');
      var icon = KAT_ICON[kat] || '·';
      var href = n.link_url || '#';
      return ''
        + '<a class="pn-row' + (unread ? ' is-unread' : '') + '" href="' + _esc(href) + '" data-id="' + _esc(n.id) + '">'
        + '  <span class="pn-row-icon">' + icon + '</span>'
        + '  <div class="pn-row-body">'
        + '    <div class="pn-row-titel">' + _esc(n.titel) + '</div>'
        + (n.body ? '    <div class="pn-row-sub">' + _esc(n.body) + '</div>' : '')
        + '    <div class="pn-row-meta">'
        + '      <span>' + _esc(KAT_LABEL[kat] || kat) + '</span>'
        + '      <span>·</span>'
        + '      <span>' + _esc(_relativeTime(n.created_at)) + '</span>'
        + '    </div>'
        + '  </div>'
        + '</a>';
    }).join('');
    list.querySelectorAll('.pn-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        var id = row.getAttribute('data-id');
        _markRead(id);
        // Navigation läuft via href — kein preventDefault
      });
    });
  }

  async function _refresh() {
    var sb = await _getSb();
    if (!sb) return;
    try {
      var [cntRes, listRes] = await Promise.all([
        sb.rpc('notifications_unread_count'),
        sb.rpc('notifications_list', { p_limit: LIMIT, p_kategorie: null, p_only_unread: false })
      ]);
      if (cntRes.error) {
        console.warn('[notif] unread_count error:', cntRes.error.message);
      } else {
        _unreadCount = Number(cntRes.data) || 0;
      }
      if (listRes.error) {
        console.warn('[notif] list error:', listRes.error.message);
      } else {
        _items = listRes.data || [];
      }
      _renderBadge();
      if (_open) _renderList();
    } catch (e) {
      console.warn('[notif] refresh failed:', e.message);
    }
  }

  async function _markRead(id) {
    if (!id) return;
    var item = _items.find(function (i) { return i.id === id; });
    if (item && !item.read_at) {
      item.read_at = new Date().toISOString();
      _unreadCount = Math.max(0, _unreadCount - 1);
      _renderBadge();
      _renderList();
    }
    var sb = await _getSb();
    if (!sb) return;
    try { await sb.rpc('notifications_mark_read', { p_id: id }); } catch(_) {}
  }

  async function _markAllRead() {
    _items.forEach(function (i) { if (!i.read_at) i.read_at = new Date().toISOString(); });
    _unreadCount = 0;
    _renderBadge();
    _renderList();
    var sb = await _getSb();
    if (!sb) return;
    try { await sb.rpc('notifications_mark_all_read'); } catch(_) {}
  }

  function _openDropdown() {
    if (!_dropdown) return;
    _open = true;
    _dropdown.classList.add('is-open');
    _btn.setAttribute('aria-expanded', 'true');
    _renderList();
    _refresh();
  }

  function _close() {
    if (!_dropdown) return;
    _open = false;
    _dropdown.classList.remove('is-open');
    _btn.setAttribute('aria-expanded', 'false');
  }

  function _startPoll() {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(_refresh, POLL_MS);
  }

  async function init() {
    if (!_ensureMounted()) return;
    await _refresh();
    _startPoll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ProvaNotifications = {
    refresh: _refresh,
    open:    _openDropdown,
    close:   _close,
    markAllRead: _markAllRead
  };
})();
