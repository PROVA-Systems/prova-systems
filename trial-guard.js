/* ============================================================
   PROVA — Trial-Guard (trial-guard.js)
   Einbinden auf JEDER App-Seite: <script src="trial-guard.js"></script>
   
   Prüft ob der Nutzer:
   - Im Trial ist → zeigt Tage-verbleibend Badge
   - Trial abgelaufen → zeigt Upgrade-Banner, blockiert Kern-Features
   - Bezahlendes Paket hat → alles frei
   - Gründerkreis ist → 90 Tage Trial + 50% Badge
   ============================================================ */
(function() {
  'use strict';

  var paket = localStorage.getItem('prova_paket') || 'Solo';
  var status = localStorage.getItem('prova_status') || 'Trial';
  var trialStart = localStorage.getItem('prova_trial_start');
  var trialDays = parseInt(localStorage.getItem('prova_trial_days') || '14', 10);
  var isGruenderkreis = localStorage.getItem('prova_gruenderkreis') === '1';

  // Gründerkreis bekommt 90 Tage
  if (isGruenderkreis) trialDays = 90;

  // Kein Trial-Start → kein Trial aktiv (wahrscheinlich bezahlender Kunde)
  if (!trialStart || status === 'Aktiv' || status === 'aktiv') return;

  var now = Date.now();
  var start = new Date(trialStart).getTime();
  var end = start + (trialDays * 24 * 60 * 60 * 1000);
  var tageVerbleibend = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  var trialAbgelaufen = tageVerbleibend <= 0;

  /* ── CSS ── */
  if (!document.getElementById('prova-trial-css')) {
    var s = document.createElement('style');
    s.id = 'prova-trial-css';
    s.textContent = ''
      + '.trial-badge{position:fixed;top:10px;right:80px;z-index:600;padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;font-family:inherit;display:flex;align-items:center;gap:6px;cursor:pointer;transition:all .15s;}'
      + '.trial-badge:hover{transform:translateY(-1px);}'
      + '.trial-badge.active{background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.2);color:#4f8ef7;}'
      + '.trial-badge.warning{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);color:#f59e0b;}'
      + '.trial-badge.expired{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#ef4444;}'
      + '.trial-badge.gruender{background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);color:#a78bfa;}'
      + '.trial-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:900;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);}'
      + '.trial-overlay.show{display:flex;}'
      + '.trial-dialog{background:#1c2130;border:1px solid rgba(239,68,68,.2);border-radius:16px;padding:32px;max-width:480px;width:100%;text-align:center;}'
      + '.trial-dialog h2{font-size:20px;color:#e8eaf0;margin-bottom:8px;}'
      + '.trial-dialog p{font-size:13px;color:#9da3b4;line-height:1.6;margin-bottom:20px;}'
      + '.trial-btn{display:inline-block;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;border:none;text-decoration:none;font-family:inherit;transition:all .15s;}'
      + '.trial-btn-primary{background:#4f8ef7;color:#fff;margin-right:8px;}'
      + '.trial-btn-primary:hover{background:#3a7be0;}'
      + '.trial-btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.12);color:#9da3b4;}'
      + '.trial-prices{display:flex;gap:12px;justify-content:center;margin-bottom:20px;}'
      + '.trial-price-card{flex:1;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);}'
      + '.trial-price-card h3{font-size:14px;color:#e8eaf0;margin-bottom:4px;}'
      + '.trial-price-card .price{font-size:22px;font-weight:800;color:#4f8ef7;}'
      + '.trial-price-card .per{font-size:11px;color:#6b7280;}'
    ;
    document.head.appendChild(s);
  }

  /* ── Trial-Badge (oben rechts) ── */
  var badge = document.createElement('div');
  badge.className = 'trial-badge';

  if (isGruenderkreis && !trialAbgelaufen) {
    badge.className += ' gruender';
    badge.innerHTML = '💎 Gründerkreis · ' + tageVerbleibend + ' Tage';
    badge.title = 'PROVA Gründerkreis — 90 Tage kostenlos + dauerhaft 50% Rabatt';
  } else if (trialAbgelaufen) {
    badge.className += ' expired';
    badge.innerHTML = '⚠️ Trial abgelaufen';
    badge.onclick = function() { zeigeUpgradeDialog(); };
  } else if (tageVerbleibend <= 3) {
    badge.className += ' warning';
    badge.innerHTML = '⏰ Noch ' + tageVerbleibend + ' Tag' + (tageVerbleibend === 1 ? '' : 'e');
    badge.onclick = function() { zeigeUpgradeDialog(); };
  } else {
    badge.className += ' active';
    badge.innerHTML = '🧪 Test · ' + tageVerbleibend + ' Tage';
    badge.onclick = function() { zeigeUpgradeDialog(); };
  }

  document.body.appendChild(badge);

  /* ── Trial abgelaufen → Overlay ── */
  if (trialAbgelaufen) {
    // Erlaubte Seiten auch nach Trial-Ablauf
    var page = window.location.pathname.split('/').pop() || '';
    var erlaubt = ['einstellungen.html', 'app-login.html', 'app-register.html', 'index.html', 'admin-login.html', 'admin-dashboard.html'];
    if (erlaubt.indexOf(page) >= 0) return; // Einstellungen bleiben erreichbar (für Upgrade)

    // Overlay nach kurzer Verzögerung zeigen
    setTimeout(function() { zeigeTrialAbgelaufenOverlay(); }, 800);
  }

  /* ── Upgrade-Dialog ── */
  function zeigeUpgradeDialog() {
    window.location.href = 'einstellungen.html';
  }

  /* ── Trial-Ablauf-Overlay ── */
  function zeigeTrialAbgelaufenOverlay() {
    if (document.getElementById('trial-overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'trial-overlay show';
    overlay.id = 'trial-overlay';

    overlay.innerHTML = ''
      + '<div class="trial-dialog">'
      + '<div style="font-size:40px;margin-bottom:12px;">⏰</div>'
      + '<h2>Ihr Testzeitraum ist abgelaufen</h2>'
      + '<p>Vielen Dank für das Testen von PROVA! Um weiterhin KI-Gutachten zu erstellen, wählen Sie jetzt Ihr Paket:</p>'
      + '<div class="trial-prices">'
      +   '<div class="trial-price-card">'
      +     '<h3>Solo</h3>'
      +     '<div class="price">149€</div>'
      +     '<div class="per">pro Monat</div>'
      +   '</div>'
      +   '<div class="trial-price-card">'
      +     '<h3>Team</h3>'
      +     '<div class="price">349€</div>'
      +     '<div class="per">pro Monat + 99€/Nutzer</div>'
      +   '</div>'
      + '</div>'
      + '<div>'
      +   '<a href="einstellungen.html" class="trial-btn trial-btn-primary">Jetzt upgraden →</a>'
      +   '<a href="archiv.html" class="trial-btn trial-btn-ghost">Nur Archiv ansehen</a>'
      + '</div>'
      + '<p style="margin-top:16px;font-size:11px;color:#6b7280;">Ihre Daten bleiben 30 Tage gespeichert. Bei Fragen: kontakt@prova-systems.de</p>'
      + '</div>';

    document.body.appendChild(overlay);
  }

})();
