/* ════════════════════════════════════════════════════════════════════
   PROVA Diktat-Mode-Guard — MEGA⁸⁶ Block A.3 (Pilot-Blocker Final)
   ════════════════════════════════════════════════════════════════════
   Konsolidiert die 3-fache Defense gegen den Diktat-Mode-Race-Bug
   (Marcel-Symptom: Live-Transkription läuft trotz manueller Eingabe weiter).

   Vorherige Fixes:
     - MEGA⁴⁷ app-logic.js Z.2882-2917: keydown+paste-Listener
     - MEGA⁶⁸-FINAL B.3 ortstermin-modus.html: onfocus-Hook
     - MEGA⁶⁹-INT INT.6 app-logic.js Z.2756-2771: focus+input-Listener auf 2 Areas

   Diese Lib ist additiv und überschreibt nichts. Sie:
     1. Stellt einen globalen `ProvaDiktatGuard.stopAll()` bereit, der ALLE
        bekannten Recorder-State-Objekte aufräumt (window._provaAufnahmeStream,
        mediaRecorder, _recorder, _mediaRecorder, recognition, _currentRecognition).
     2. Bindet zusätzliche Defense-Listener (input + paste + focus) auf
        beliebige Text-Inputs via ProvaDiktatGuard.bind(element).
     3. Schreibt Audit-Trail-Eintrag via audit-log-v1 task=generic bei
        jedem Mode-Switch (mode=manual_typing|recording_stopped).
     4. Liefert sichtbaren Mode-Indicator-Badge in DOM (auto-mount im body).

   API:
     window.ProvaDiktatGuard.stopAll(reason)
     window.ProvaDiktatGuard.bind(element)        // bindet Defense-Listener
     window.ProvaDiktatGuard.indicateMode(mode)   // 'idle'|'recording'|'manual'
═════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var BADGE_ID = 'prova-diktat-mode-badge';
  var _lastMode = 'idle';

  function _stopAllRecorders(){
    // app-logic.js + diktat-mobile.html + ortstermin-modus.html — alle Pattern abdecken
    try {
      if (typeof window.stoppeAufnahme === 'function') window.stoppeAufnahme();
    } catch(_){}
    try {
      if (typeof window.stoppeDiktat === 'function') window.stoppeDiktat();
    } catch(_){}
    // window._provaAufnahmeStream (MEGA80 F.3)
    try {
      if (window._provaAufnahmeStream) {
        window._provaAufnahmeStream.getTracks().forEach(function(t){ try { t.stop(); } catch(_){} });
        window._provaAufnahmeStream = null;
      }
    } catch(_){}
    // MediaRecorder-Global-State (page-specific)
    try { if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') window.mediaRecorder.stop(); } catch(_){}
    try { if (window._mediaRecorder && window._mediaRecorder.state !== 'inactive') window._mediaRecorder.stop(); } catch(_){}
    try { if (window._recorder && window._recorder.state !== 'inactive') window._recorder.stop(); } catch(_){}
    // SpeechRecognition
    try { if (window.recognition && typeof window.recognition.stop === 'function') window.recognition.stop(); } catch(_){}
    try { if (window._currentRecognition) { window._currentRecognition = null; } } catch(_){}
    // Whisper WebSocket
    try {
      if (window._provaWhisperWs && typeof window._provaWhisperWs.close === 'function') {
        window._provaWhisperWs.close();
        window._provaWhisperWs = null;
      }
    } catch(_){}
  }

  async function _auditModeSwitch(reason){
    if (_lastMode === 'manual' && reason === 'manual_input_detected') return; // no-op duplicate
    _lastMode = (reason === 'manual_input_detected') ? 'manual' : 'recorder_stopped';
    try {
      var sb = window.__sb || (window.PROVA_DEBUG && window.PROVA_DEBUG.supabase);
      if (!sb || !sb.functions) return;
      await sb.functions.invoke('audit-log-v1', {
        body: {
          task: 'generic',
          action: 'update',
          entity_typ: 'diktat_mode',
          payload: {
            reason: reason,
            page: location.pathname,
            mode_to: _lastMode,
            ts: new Date().toISOString()
          },
          source: 'diktat-mode-guard',
          kategorie: 'DIKTAT'
        }
      });
    } catch(_) { /* best-effort */ }
  }

  function stopAll(reason){
    _stopAllRecorders();
    indicateMode('idle');
    _auditModeSwitch(reason || 'manual_input_detected');
  }

  function _onUserInput(ev){
    // Nur wenn aktuelle Mode 'recording' ist — sonst no-op (vermeidet false positives)
    if (_lastMode !== 'recording') return;
    // Bei keydown: Modifier-only ignorieren
    if (ev && ev.type === 'keydown') {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var k = ev.key || '';
      if (k.length !== 1 && k !== 'Backspace' && k !== 'Delete' && k !== 'Enter') return;
    }
    stopAll('manual_input_detected');
    try {
      if (typeof window.showToast === 'function') {
        window.showToast('🎙 Diktat pausiert — manuelle Eingabe erkannt. Mikrofon erneut klicken zum Resume.', 'info');
      } else if (typeof window.toast === 'function') {
        window.toast('Diktat pausiert — manuelle Eingabe erkannt.', 'info');
      }
    } catch(_){}
  }

  function bind(el){
    if (!el || el.dataset.provaDiktatGuard === '1') return;
    el.addEventListener('keydown', _onUserInput, { passive: true });
    el.addEventListener('input',   _onUserInput, { passive: true });
    el.addEventListener('paste',   _onUserInput, { passive: true });
    el.addEventListener('focus',   _onUserInput, { passive: true });
    el.dataset.provaDiktatGuard = '1';
  }

  function _ensureBadge(){
    var b = document.getElementById(BADGE_ID);
    if (b) return b;
    b = document.createElement('div');
    b.id = BADGE_ID;
    b.style.cssText = 'position:fixed;top:14px;right:14px;z-index:10000;padding:6px 12px;border-radius:20px;font:600 12px system-ui,-apple-system,sans-serif;letter-spacing:.02em;color:#fff;background:#374151;box-shadow:0 4px 12px rgba(0,0,0,.3);transition:background .25s,opacity .25s;opacity:0;pointer-events:none;';
    b.textContent = '⚪ Diktat: Bereit';
    document.body && document.body.appendChild(b);
    return b;
  }

  function indicateMode(mode){
    _lastMode = mode || 'idle';
    var b = _ensureBadge();
    if (!b) return;
    if (mode === 'recording') {
      b.style.background = '#ef4444';
      b.textContent = '🔴 Diktat: Aufnahme';
      b.style.opacity = '1';
    } else if (mode === 'manual') {
      b.style.background = '#f59e0b';
      b.textContent = '✏ Diktat: Manueller Modus';
      b.style.opacity = '1';
      // Auto-fade nach 3s
      setTimeout(function(){ if (b) b.style.opacity = '0'; }, 3000);
    } else {
      b.style.background = '#374151';
      b.textContent = '⚪ Diktat: Bereit';
      b.style.opacity = '0';
    }
  }

  // Auto-Bind nach DOM-Ready für bekannte Diktat-Text-Inputs
  function _autoBind(){
    ['#transcriptArea', '#transcriptManuell', '#notiz-textarea', '#diktat-text', '#vot-manual-text'].forEach(function(sel){
      var el = document.querySelector(sel);
      if (el) bind(el);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoBind);
  } else {
    _autoBind();
  }

  window.ProvaDiktatGuard = {
    stopAll: stopAll,
    bind: bind,
    indicateMode: indicateMode,
    _state: function(){ return _lastMode; }
  };
})();
