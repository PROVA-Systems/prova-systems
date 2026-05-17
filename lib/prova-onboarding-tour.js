/* ════════════════════════════════════════════════════════════════════
   PROVA Onboarding-Tour — MEGA⁸⁶ Block D
   ════════════════════════════════════════════════════════════════════
   5-Step Walkthrough für neue User direkt nach Registrierung.

   Auto-Trigger:
     Beim DOMContentLoaded prüft die Lib:
       1. localStorage.prova_onboarding_pending === '1' (set bei Register)
       OR
       2. user_workflow_settings.onboarding_tour_completed === false
     Wenn keiner zutrifft → no-op.

   API:
     window.ProvaOnboardingTour.start()       // manuell startbar (z.B. via Hilfe-Menü)
     window.ProvaOnboardingTour.markComplete()
     window.ProvaOnboardingTour.skip()
═════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var STORAGE_PENDING = 'prova_onboarding_pending';
  var STORAGE_DONE_LOCAL = 'prova_onboarding_tour_done';
  var OVERLAY_ID = 'prova-ot-overlay';

  var STEPS = [
    {
      title: 'Willkommen bei PROVA',
      icon: '👋',
      body: 'PROVA digitalisiert deinen Sachverständigen-Workflow: Diktat → KI-Strukturierung → §6 Fachurteil → PDF → Rechnung.<br><br>Lass uns dich in 5 Schritten durch die wichtigsten Funktionen führen.',
      cta: 'Los geht\'s →',
      videoLink: null
    },
    {
      title: 'Auftrag anlegen',
      icon: '📋',
      body: 'Ein Auftrag ist die zentrale „Akte" — von Auftragseingang bis Rechnung. Du kannst per Diktat-Wizard, manuell oder über E-Mail-Import starten.',
      cta: 'Auftrag anlegen',
      ctaTarget: '/app.html',
      videoLink: null
    },
    {
      title: 'Akte verstehen',
      icon: '📂',
      body: 'In der Akte siehst du auf einen Blick: Stammdaten, Termine, Fotos, Diktate, Stellungnahmen, Rechnung. 4 Phasen-Stepper zeigt dir den Status.',
      cta: 'Weiter',
      videoLink: null
    },
    {
      title: 'KI-Diktat ausprobieren',
      icon: '🎙️',
      body: 'Diktiere vor Ort — PROVA transkribiert und strukturiert automatisch in §1-§5. <strong>§6 Fachurteil schreibst du selbst</strong> (§407a ZPO Pflicht).<br><br>Du kannst Mic-Zugriff jetzt prüfen.',
      cta: 'Diktat-Demo',
      ctaTarget: '/diktat-mobile.html',
      videoLink: null
    },
    {
      title: 'Founding-Member-Coupon',
      icon: '🎁',
      body: 'Als einer der ersten 10 Solo-SVs bekommst du <strong>FOUNDING-99</strong> — Solo-Tier für 99 €/Monat lifetime statt 179 €. Aktiviere beim Checkout.',
      cta: 'Fertig — zur App',
      ctaTarget: '/dashboard.html',
      coupon: 'FOUNDING-99'
    }
  ];

  var _currentStep = 0;
  var _supabase = null;

  function _injectStyle(){
    if (document.getElementById('prova-ot-style')) return;
    var s = document.createElement('style');
    s.id = 'prova-ot-style';
    s.textContent = [
      '#' + OVERLAY_ID + '{position:fixed;inset:0;background:rgba(8,12,24,.85);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);animation:provaOtFadeIn .3s ease;}',
      '@keyframes provaOtFadeIn{from{opacity:0;}to{opacity:1;}}',
      '.prova-ot-card{background:#0e1225;border:1px solid rgba(255,255,255,.12);border-radius:16px;max-width:560px;width:100%;padding:36px 32px;color:#eaecf4;font:400 15px/1.5 "DM Sans","system-ui",sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.5);}',
      '.prova-ot-icon{font-size:48px;margin-bottom:16px;text-align:center;}',
      '.prova-ot-title{font-size:24px;font-weight:800;letter-spacing:-.02em;margin-bottom:14px;text-align:center;}',
      '.prova-ot-body{color:#c8cee0;margin-bottom:28px;line-height:1.65;}',
      '.prova-ot-progress{display:flex;gap:6px;justify-content:center;margin-bottom:24px;}',
      '.prova-ot-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);}',
      '.prova-ot-dot.active{background:#4f8ef7;width:24px;border-radius:4px;}',
      '.prova-ot-actions{display:flex;flex-direction:column;gap:10px;}',
      '.prova-ot-btn{padding:13px 24px;background:linear-gradient(135deg,#4f8ef7,#3a7be0);border:none;color:#fff;font:700 14px inherit;border-radius:10px;cursor:pointer;text-decoration:none;text-align:center;display:block;}',
      '.prova-ot-btn:hover{opacity:.92;}',
      '.prova-ot-btn-ghost{padding:10px 16px;background:transparent;border:1px solid rgba(255,255,255,.15);color:#8b93ab;border-radius:8px;cursor:pointer;font:600 12px inherit;text-align:center;}',
      '.prova-ot-btn-ghost:hover{color:#fff;border-color:rgba(255,255,255,.3);}',
      '.prova-ot-skip{margin-top:8px;text-align:center;}',
      '.prova-ot-skip a{color:#5a6380;font-size:12px;text-decoration:none;}',
      '.prova-ot-skip a:hover{color:#8b93ab;text-decoration:underline;}',
      '.prova-ot-coupon{display:inline-block;padding:8px 14px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.4);border-radius:8px;font-family:ui-monospace,Consolas,monospace;font-weight:700;color:#fcd34d;margin:8px 0;letter-spacing:.05em;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function _render(){
    var step = STEPS[_currentStep];
    if (!step) return _close();
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      document.body.appendChild(overlay);
    }
    var couponBox = step.coupon ? '<div class="prova-ot-coupon">' + step.coupon + '</div>' : '';
    var progress = STEPS.map(function(_, i){ return '<span class="prova-ot-dot' + (i === _currentStep ? ' active' : '') + '"></span>'; }).join('');
    var ctaBtn = step.ctaTarget
      ? '<a class="prova-ot-btn" href="' + step.ctaTarget + '" onclick="ProvaOnboardingTour._handleCta(this)">' + step.cta + '</a>'
      : '<button class="prova-ot-btn" onclick="ProvaOnboardingTour._next()">' + step.cta + '</button>';
    var prevBtn = _currentStep > 0
      ? '<button class="prova-ot-btn-ghost" onclick="ProvaOnboardingTour._prev()">← Zurück</button>'
      : '';
    overlay.innerHTML = '<div class="prova-ot-card">' +
      '<div class="prova-ot-icon">' + step.icon + '</div>' +
      '<h2 class="prova-ot-title">' + step.title + '</h2>' +
      '<div class="prova-ot-body">' + step.body + couponBox + '</div>' +
      '<div class="prova-ot-progress">' + progress + '</div>' +
      '<div class="prova-ot-actions">' + ctaBtn + prevBtn + '</div>' +
      '<div class="prova-ot-skip"><a href="#" onclick="ProvaOnboardingTour._skip();return false;">Tour überspringen — Don\'t show again</a></div>' +
    '</div>';
  }

  function _close(){
    var o = document.getElementById(OVERLAY_ID);
    if (o) o.remove();
  }

  async function _persistComplete(){
    try { localStorage.removeItem(STORAGE_PENDING); localStorage.setItem(STORAGE_DONE_LOCAL, '1'); } catch(_){}
    try {
      if (!_supabase) {
        var mod = await import('/lib/supabase-client.js');
        _supabase = mod.supabase || mod.getSupabase();
      }
      var u = await _supabase.auth.getUser();
      var uid = u && u.data && u.data.user && u.data.user.id;
      if (!uid) return;
      await _supabase.from('user_workflow_settings').upsert({
        user_id: uid,
        onboarding_tour_completed: true,
        onboarding_tour_completed_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch(_) { /* best-effort */ }
  }

  function start(){
    _injectStyle();
    _currentStep = 0;
    _render();
  }

  function _next(){
    _currentStep++;
    if (_currentStep >= STEPS.length) {
      _persistComplete();
      _close();
      return;
    }
    _render();
  }

  function _prev(){
    if (_currentStep > 0) { _currentStep--; _render(); }
  }

  function _skip(){
    _persistComplete();
    _close();
  }

  function _handleCta(linkEl){
    _persistComplete();
    // Lass den Link normal navigieren
  }

  async function _shouldAutoStart(){
    try {
      if (localStorage.getItem(STORAGE_PENDING) === '1') return true;
      if (localStorage.getItem(STORAGE_DONE_LOCAL) === '1') return false;
      // Fallback: check DB
      if (!_supabase) {
        var mod = await import('/lib/supabase-client.js');
        _supabase = mod.supabase || mod.getSupabase();
      }
      var u = await _supabase.auth.getUser();
      var uid = u && u.data && u.data.user && u.data.user.id;
      if (!uid) return false;
      var row = await _supabase.from('user_workflow_settings')
        .select('onboarding_tour_completed').eq('user_id', uid).maybeSingle();
      return !(row.data && row.data.onboarding_tour_completed === true);
    } catch(_) { return false; }
  }

  function _autoStart(){
    _shouldAutoStart().then(function(go){ if (go) start(); });
  }

  // Auto-Trigger nach DOMContentLoaded — nur auf dashboard.html (Default-Landing nach Login)
  if (typeof window !== 'undefined' && /\/(dashboard|app)\.html?$|\/$/.test(location.pathname)) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _autoStart);
    } else {
      _autoStart();
    }
  }

  window.ProvaOnboardingTour = {
    start: start,
    markComplete: _persistComplete,
    skip: _skip,
    _next: _next,
    _prev: _prev,
    _skip: _skip,
    _handleCta: _handleCta
  };
})();
