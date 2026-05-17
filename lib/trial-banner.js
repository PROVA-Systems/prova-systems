/* ════════════════════════════════════════════════════════════════════
   PROVA Trial-Banner — MEGA⁸⁴/⁸⁵ Pass 2b Block E
   ════════════════════════════════════════════════════════════════════
   Persistentes Banner oben in App-Pages für Trial-User:
   - < 14 Tage: gelb, dismissable (sessionStorage)
   - < 3 Tage: rot, NICHT dismissable
   - abgelaufen: Blocking-Modal "Trial endet — Stripe einrichten?"

   Komplementiert trial-guard.js (das macht den eigentlichen Block der App).

   Auto-Mount via Script-Tag in App-Pages.
═════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // Pre-Check: nur für Trial-Status
  function _isTrial(){
    var sub = (localStorage.getItem('prova_subscription_status') || '').toLowerCase();
    var status = (localStorage.getItem('prova_status') || '').toLowerCase();
    return sub === 'trialing' || sub === 'trial' || status === 'trial';
  }
  if (!_isTrial()) return;

  // Bypass für Marcel-Founder + Testpilot
  if (localStorage.getItem('prova_founder_bypass') === '1') return;
  if (localStorage.getItem('prova_testpilot') === '1') return;

  function _daysRemaining(){
    var end = localStorage.getItem('prova_trial_end');
    var start = localStorage.getItem('prova_trial_start');
    var trialDays = parseInt(localStorage.getItem('prova_trial_days') || '14', 10);
    var endTs;
    if (end) {
      endTs = new Date(end + 'T23:59:59').getTime();
    } else if (start) {
      endTs = parseInt(start, 10) + (trialDays * 86400 * 1000);
    } else {
      return null;
    }
    if (isNaN(endTs)) return null;
    return Math.ceil((endTs - Date.now()) / 86400000);
  }

  function _injectCss(){
    if (document.getElementById('prova-trial-banner-css')) return;
    var css = ''
      + '.tb-banner{position:fixed;top:0;left:0;right:0;z-index:9000;padding:9px 16px;'
      +   'display:flex;align-items:center;justify-content:center;gap:14px;font-size:13px;'
      +   'font-weight:600;font-family:DM Sans,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2);}'
      + '.tb-banner.warn{background:linear-gradient(90deg,#f59e0b,#d97706);color:#fff;}'
      + '.tb-banner.urgent{background:linear-gradient(90deg,#dc2626,#991b1b);color:#fff;'
      +   'animation:tb-pulse 2.5s ease-in-out infinite;}'
      + '@keyframes tb-pulse{0%,100%{box-shadow:0 2px 8px rgba(220,38,38,.4);}'
      +   '50%{box-shadow:0 4px 16px rgba(220,38,38,.7);}}'
      + '.tb-cta{padding:6px 14px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);'
      +   'border-radius:6px;color:#fff;text-decoration:none;font-weight:700;cursor:pointer;font-family:inherit;'
      +   'font-size:12px;}'
      + '.tb-cta:hover{background:rgba(255,255,255,.28);}'
      + '.tb-dismiss{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;opacity:.7;'
      +   'padding:0 6px;line-height:1;font-family:inherit;}'
      + '.tb-dismiss:hover{opacity:1;}'
      + 'body.has-trial-banner{padding-top:42px;}'
      + '.tb-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);'
      +   'z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;}'
      + '.tb-modal-card{background:#1c2130;border:1px solid #ef4444;border-radius:14px;'
      +   'padding:24px;max-width:480px;width:100%;color:#eaecf4;font-family:DM Sans,system-ui,sans-serif;}'
      + '.tb-modal-card h3{font-size:18px;font-weight:800;margin-bottom:10px;color:#fff;}'
      + '.tb-modal-card p{font-size:14px;line-height:1.55;margin-bottom:12px;color:#aab4cb;}'
      + '.tb-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;}';
    var st = document.createElement('style');
    st.id = 'prova-trial-banner-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function _renderBanner(){
    var days = _daysRemaining();
    if (days === null) return;
    _injectCss();
    // Trial abgelaufen → Blocking-Modal
    if (days < 0) {
      _showExpiredModal();
      return;
    }
    var urgent = days < 3;
    var dismissed = sessionStorage.getItem('prova_trial_banner_dismissed_today') === '1';
    if (!urgent && dismissed) return;

    var existing = document.getElementById('prova-trial-banner');
    if (existing) existing.remove();

    var banner = document.createElement('div');
    banner.id = 'prova-trial-banner';
    banner.className = 'tb-banner ' + (urgent ? 'urgent' : 'warn');
    var msg = days === 0 ? 'Trial endet HEUTE'
      : (days === 1 ? 'Trial endet MORGEN'
      : 'Trial endet in ' + days + ' Tagen');
    var icon = urgent ? '🚨' : '⏳';
    var html = '<span>' + icon + ' <strong>' + msg + '</strong> — sichere deinen PROVA-Zugang</span>'
      + '<a href="pricing.html?from=trial-banner" class="tb-cta">Jetzt upgraden →</a>';
    if (!urgent) {
      html += '<button type="button" class="tb-dismiss" aria-label="Banner ausblenden" '
        + 'onclick="sessionStorage.setItem(\'prova_trial_banner_dismissed_today\',\'1\');'
        + 'document.getElementById(\'prova-trial-banner\').remove();'
        + 'document.body.classList.remove(\'has-trial-banner\');">✕</button>';
    }
    banner.innerHTML = html;
    if (document.body) {
      document.body.appendChild(banner);
      document.body.classList.add('has-trial-banner');
    }
  }

  function _showExpiredModal(){
    if (document.getElementById('prova-trial-expired-modal')) return;
    _injectCss();
    var modal = document.createElement('div');
    modal.id = 'prova-trial-expired-modal';
    modal.className = 'tb-modal-overlay';
    modal.innerHTML = ''
      + '<div class="tb-modal-card">'
      + '  <h3>🚨 Dein Trial ist abgelaufen</h3>'
      + '  <p>Du hast PROVA 14 Tage getestet — danke fürs Ausprobieren! '
      +    'Um deine Akten und Daten weiter zu nutzen, brauchen wir eine '
      +    'aktive Subscription.</p>'
      + '  <p style="color:#fcd34d;">'
      +    '<strong>Solo:</strong> 179 €/Monat (bis 30 Aufträge)<br>'
      +    '<strong>Team:</strong> 379 €/Monat (unbegrenzt, bis 5 User)</p>'
      + '  <p style="font-size:12px;color:#8b93ab;">Deine Daten sind sicher — '
      +    'du kannst sie jederzeit als DSGVO-Export herunterladen.</p>'
      + '  <div class="tb-modal-actions">'
      + '    <a href="dsgvo-mein-konto.html" class="tb-cta" style="background:rgba(255,255,255,.08);'
      +      'border:1px solid rgba(255,255,255,.15);color:#aab4cb;">DSGVO-Export</a>'
      + '    <a href="pricing.html?from=trial-expired" class="tb-cta" '
      +      'style="background:linear-gradient(135deg,#4f8ef7,#3a7be0);">'
      +      'Jetzt upgraden →</a>'
      + '  </div>'
      + '</div>';
    if (document.body) document.body.appendChild(modal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _renderBanner);
  } else {
    _renderBanner();
  }
})();
