/* ════════════════════════════════════════════════════════════════════
   PROVA Workspace-Switcher — MEGA⁸⁷ Block E
   ════════════════════════════════════════════════════════════════════
   Dropdown-Switcher fuer User mit mehreren Workspace-Memberships.
   Auto-Mount via Lib-Script-Tag in nav.js-Sidebar oder Top-Bar.

   API:
     window.ProvaWorkspaceSwitcher.mount(targetEl)
     window.ProvaWorkspaceSwitcher.switchTo(workspaceId)
     window.ProvaWorkspaceSwitcher.refresh()

   Auto-Mount-Selectors (sucht in dieser Reihenfolge):
     #prova-ws-switcher-mount  (explicit)
     .sb-account-footer        (in nav.js Sidebar)
     header.topbar             (oben rechts)
═════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var STORAGE_KEY = 'prova-active-workspace';
  var LEGACY_KEY = 'prova_workspace_id';

  function _injectStyle(){
    if (document.getElementById('prova-ws-switcher-style')) return;
    var s = document.createElement('style');
    s.id = 'prova-ws-switcher-style';
    s.textContent = [
      '.pws-wrap{position:relative;display:inline-block;}',
      '.pws-trigger{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#eaecf4;font:600 12px system-ui,sans-serif;cursor:pointer;max-width:240px;}',
      '.pws-trigger:hover{background:rgba(255,255,255,.08);}',
      '.pws-trigger-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.pws-trigger-arrow{font-size:10px;opacity:.6;}',
      '.pws-menu{position:absolute;top:calc(100% + 6px);right:0;min-width:280px;background:#13161d;border:1px solid rgba(255,255,255,.12);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.45);padding:6px;z-index:600;display:none;}',
      '.pws-menu.open{display:block;}',
      '.pws-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:7px;cursor:pointer;font-size:13px;color:#eaecf4;}',
      '.pws-item:hover{background:rgba(79,142,247,.1);}',
      '.pws-item-name{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.pws-item-meta{font-size:11px;color:#8b93ab;}',
      '.pws-item.active .pws-item-name::after{content:" ✓";color:#10b981;}',
      '.pws-divider{height:1px;background:rgba(255,255,255,.08);margin:6px 4px;}',
      '.pws-create{padding:9px 12px;font-size:12px;color:#4f8ef7;cursor:pointer;border-radius:7px;}',
      '.pws-create:hover{background:rgba(79,142,247,.1);}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var _supabase = null;
  var _memberships = null;
  var _activeId = null;

  async function _getSb(){
    if (_supabase) return _supabase;
    var mod = await import('/lib/supabase-client.js');
    _supabase = mod.supabase || (mod.getSupabase && mod.getSupabase());
    return _supabase;
  }

  async function _loadMemberships(){
    var sb = await _getSb();
    var u = await sb.auth.getUser();
    var uid = u && u.data && u.data.user && u.data.user.id;
    if (!uid) return [];
    var { data, error } = await sb.from('workspace_memberships')
      .select('workspace_id, rolle, can_invite_members, can_manage_billing, workspaces!inner(id, name, paket, abo_status)')
      .eq('user_id', uid)
      .eq('is_active', true);
    if (error) { console.warn('[ws-switcher]', error.message); return []; }
    return (data || []).map(function(r){
      return {
        workspace_id: r.workspace_id,
        rolle: r.rolle,
        can_invite_members: r.can_invite_members,
        can_manage_billing: r.can_manage_billing,
        name: r.workspaces?.name || r.workspace_id.slice(0,8),
        paket: r.workspaces?.paket || '',
        abo_status: r.workspaces?.abo_status || ''
      };
    });
  }

  async function refresh(){
    _memberships = await _loadMemberships();
    _activeId = localStorage.getItem(STORAGE_KEY) || (_memberships[0] && _memberships[0].workspace_id) || null;
    _render();
    return _memberships;
  }

  function _findMount(){
    return document.getElementById('prova-ws-switcher-mount')
        || document.querySelector('.sb-account-footer')
        || document.querySelector('header.topbar');
  }

  function _render(){
    if (!_memberships || _memberships.length < 2) {
      // < 2 Workspaces → kein Switcher
      var existing = document.getElementById('prova-ws-switcher');
      if (existing) existing.style.display = 'none';
      return;
    }
    _injectStyle();
    var mount = _findMount();
    if (!mount) return;
    var existing = document.getElementById('prova-ws-switcher');
    if (existing) existing.remove();
    var wrap = document.createElement('div');
    wrap.id = 'prova-ws-switcher';
    wrap.className = 'pws-wrap';
    var current = _memberships.find(function(m){ return m.workspace_id === _activeId; }) || _memberships[0];
    wrap.innerHTML = '<button class="pws-trigger" type="button">' +
      '<span style="font-size:14px;">🏢</span>' +
      '<span class="pws-trigger-name">' + _esc(current.name) + '</span>' +
      '<span class="pws-trigger-arrow">▾</span>' +
    '</button>' +
    '<div class="pws-menu">' +
      _memberships.map(function(m){
        return '<div class="pws-item' + (m.workspace_id === _activeId ? ' active' : '') + '" data-ws="' + _esc(m.workspace_id) + '">' +
          '<span class="pws-item-name">' + _esc(m.name) + '</span>' +
          '<span class="pws-item-meta">' + _esc(m.rolle) + '</span>' +
        '</div>';
      }).join('') +
      '<div class="pws-divider"></div>' +
      '<div class="pws-create" data-create>+ Neuen Workspace anlegen</div>' +
    '</div>';
    mount.appendChild(wrap);

    var trigger = wrap.querySelector('.pws-trigger');
    var menu = wrap.querySelector('.pws-menu');
    trigger.addEventListener('click', function(e){ e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', function(){ menu.classList.remove('open'); });
    wrap.querySelectorAll('.pws-item').forEach(function(it){
      it.addEventListener('click', function(){
        var wsId = it.dataset.ws;
        if (wsId && wsId !== _activeId) switchTo(wsId);
      });
    });
    wrap.querySelector('[data-create]').addEventListener('click', function(){
      window.location.href = '/onboarding-supabase.html';
    });
  }

  function _esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  async function switchTo(workspaceId){
    if (!workspaceId) return;
    var sb = await _getSb();
    // Audit-Log via audit-log-v1
    try {
      await sb.functions.invoke('audit-log-v1', {
        body: {
          task: 'admin_action',
          action: 'update',
          entity_typ: 'workspace',
          entity_id: workspaceId,
          reason: 'workspace_switch via switcher',
          payload: { from: _activeId, to: workspaceId, source: 'workspace-switcher' },
          kategorie: 'AUTH'
        }
      });
    } catch(_) {}
    // localStorage updaten (sowohl neuer Key als auch Legacy-Key)
    localStorage.setItem(STORAGE_KEY, workspaceId);
    localStorage.setItem(LEGACY_KEY, workspaceId);
    if (window.ProvaLegacyBridge) {
      try { window.ProvaLegacyBridge.set('prova_workspace_id', workspaceId); } catch(_){}
    }
    // Reload mit neuem Context
    window.location.reload();
  }

  function mount(targetEl){
    if (targetEl) {
      var explicit = document.createElement('div');
      explicit.id = 'prova-ws-switcher-mount';
      targetEl.appendChild(explicit);
    }
    refresh();
  }

  // Auto-Mount nach DOMContentLoaded
  function _autoMount(){
    refresh();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoMount);
  } else {
    setTimeout(_autoMount, 100); // kleines delay damit nav.js gerendert ist
  }

  window.ProvaWorkspaceSwitcher = {
    mount: mount,
    switchTo: switchTo,
    refresh: refresh,
    getActive: function(){ return _activeId; },
    getMemberships: function(){ return _memberships || []; }
  };
})();
