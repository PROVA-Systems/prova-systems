/* ════════════════════════════════════════════════════════════════════
   PROVA Session-Heartbeat — MEGA⁸⁹ Block C.3
   ════════════════════════════════════════════════════════════════════
   Updated user_sessions.last_activity_at + users.last_active_at alle
   5 Minuten auf authenticated Pages. Sichtbar im admin-kpis Live-Sessions
   (MEGA87 Block H) der Sessions mit last_activity_at > NOW()-15min listet.

   Pflicht-Pattern: nach prova-legacy-bridge.js + supabase-client.js mounten:
     <script type="module" src="/lib/prova-session-heartbeat.js"></script>

   Skipped wenn:
     - kein User authenticated (kein supabase.auth.session)
     - Tab im Hintergrund (visibilitychange='hidden')
═════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  if (typeof window === 'undefined') return;

  var HEARTBEAT_MS = 5 * 60 * 1000;  // 5 Minuten
  var _intervalId = null;
  var _supabase = null;

  async function _getSb(){
    if (_supabase) return _supabase;
    try {
      var mod = await import('/lib/supabase-client.js');
      _supabase = mod.supabase || (mod.getSupabase && mod.getSupabase());
      return _supabase;
    } catch(_) { return null; }
  }

  async function _tick(){
    if (document.visibilityState === 'hidden') return;
    var sb = await _getSb();
    if (!sb) return;
    try {
      var u = await sb.auth.getUser();
      var uid = u && u.data && u.data.user && u.data.user.id;
      if (!uid) return;

      // Update users.last_active_at (read-policy bleibt unverändert, user darf eigene row updaten)
      await sb.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', uid);

      // Optional: latest user_session-Row updaten (best-effort)
      // Wir updaten die zuletzt-gestartete Session des Users innerhalb der letzten Stunde
      var since = new Date(Date.now() - 60*60*1000).toISOString();
      await sb.from('user_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('user_id', uid)
        .gt('started_at', since)
        .is('revoked_at', null)
        .order('started_at', { ascending: false })
        .limit(1);
    } catch(_) { /* best-effort */ }
  }

  function start(){
    if (_intervalId) return;
    // Ersten Tick nach 30s (nicht sofort — Login-Flow soll erst durchlaufen)
    setTimeout(_tick, 30000);
    _intervalId = setInterval(_tick, HEARTBEAT_MS);
  }

  function stop(){
    if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
  }

  // Tab-Focus → sofort einen Tick (Reset last_activity_at)
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') _tick();
  });

  // Auto-Start nach DOM-Ready, wenn User eingeloggt
  function _autoStart(){
    var hasToken = false;
    try { hasToken = !!localStorage.getItem('prova_auth_token'); } catch(_){}
    if (hasToken) start();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoStart);
  } else {
    _autoStart();
  }

  window.ProvaSessionHeartbeat = { start: start, stop: stop, _tick: _tick };
})();
