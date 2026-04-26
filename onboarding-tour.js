/* ============================================================
   PROVA — Onboarding-Tour (onboarding-tour.js)
   Einbinden auf dashboard.html:  <script src="onboarding-tour.js"></script>
   
   Zeigt beim ersten Login eine geführte Tour durch die App.
   Highlight-Punkte auf Nav-Elemente + Tooltip-Erklärungen.
   Wird nur einmal angezeigt (localStorage-Flag).
   ============================================================ */
(function() {
  'use strict';

  // Bereits gesehen? → Nicht nochmal zeigen
  if (localStorage.getItem('prova_tour_done') === '1') return;

  var STEPS = [
    {
      target: '.sb-new-btn',
      title: 'Neuer Fall',
      text: 'Hier starten Sie ein neues Gutachten. Stammdaten eingeben, diktieren, und PROVA erstellt den KI-Entwurf.',
      position: 'right'
    },
    {
      target: '.sb-item[title="Zentrale"],.sb-item[href="dashboard.html"]',
      title: 'Ihre Zentrale',
      text: 'Hier sehen Sie alle offenen Fälle, Fristen und Ihre heutigen Aufgaben auf einen Blick.',
      position: 'right'
    },
    {
      target: '.sb-item[title="Fälle"],.sb-item[href="archiv.html"]',
      title: 'Fallarchiv',
      text: 'Alle Ihre Gutachten — sortiert, durchsuchbar, mit Status-Tracking von Entwurf bis Export.',
      position: 'right'
    },
    {
      target: '.sb-section-label',
      title: 'Werkzeuge',
      text: 'Normen-Bibliothek, Textbausteine, Positionen, JVEG-Rechner — alles was Sie während der Arbeit brauchen.',
      position: 'right',
      matchText: 'Werkzeuge'
    },
    {
      target: '.sb-settings,.sb-item[title="Einstellungen"]',
      title: 'Einstellungen',
      text: 'Hier hinterlegen Sie Ihr Büroprofil, Briefkopf, Unterschrift und verwalten Ihr Paket.',
      position: 'right'
    }
  ];

  var currentStep = 0;
  var overlayEl, tooltipEl, highlightEl;

  /* ── CSS ── */
  if (!document.getElementById('prova-tour-css')) {
    var s = document.createElement('style');
    s.id = 'prova-tour-css';
    s.textContent = ''
      + '.tour-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;transition:opacity .3s;}'
      + '.tour-highlight{position:fixed;z-index:901;border-radius:10px;box-shadow:0 0 0 4px rgba(79,142,247,.6),0 0 0 9999px rgba(0,0,0,.55);transition:all .35s cubic-bezier(.4,0,.2,1);pointer-events:none;}'
      + '.tour-tooltip{position:fixed;z-index:902;background:#1c2537;border:1px solid rgba(79,142,247,.3);border-radius:12px;padding:18px 20px;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,.5);transition:all .35s cubic-bezier(.4,0,.2,1);}'
      + '.tour-title{font-size:14px;font-weight:700;color:#e8eaf0;margin-bottom:6px;}'
      + '.tour-text{font-size:13px;color:#9da3b4;line-height:1.55;margin-bottom:14px;}'
      + '.tour-footer{display:flex;align-items:center;justify-content:space-between;}'
      + '.tour-dots{display:flex;gap:5px;}'
      + '.tour-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.15);}'
      + '.tour-dot.active{background:#4f8ef7;}'
      + '.tour-btns{display:flex;gap:6px;}'
      + '.tour-btn{padding:7px 16px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .12s;}'
      + '.tour-btn-skip{background:transparent;color:#6b7280;border:1px solid rgba(255,255,255,.1);}'
      + '.tour-btn-skip:hover{color:#9da3b4;border-color:rgba(255,255,255,.2);}'
      + '.tour-btn-next{background:#4f8ef7;color:#fff;}'
      + '.tour-btn-next:hover{background:#3a7be0;}'
      + '.tour-step-num{font-size:10px;color:#6b7280;margin-bottom:4px;}'
    ;
    document.head.appendChild(s);
  }

  function startTour() {
    // Overlay
    overlayEl = document.createElement('div');
    overlayEl.className = 'tour-overlay';
    overlayEl.style.opacity = '0';
    document.body.appendChild(overlayEl);

    // Highlight
    highlightEl = document.createElement('div');
    highlightEl.className = 'tour-highlight';
    document.body.appendChild(highlightEl);

    // Tooltip
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tour-tooltip';
    document.body.appendChild(tooltipEl);

    setTimeout(function() { overlayEl.style.opacity = '1'; }, 50);
    showStep(0);
  }

  function showStep(idx) {
    currentStep = idx;
    var step = STEPS[idx];
    if (!step) { endTour(); return; }

    // Finde Ziel-Element
    var targets = document.querySelectorAll(step.target);
    var el = null;
    if (step.matchText) {
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].textContent.trim().indexOf(step.matchText) >= 0) { el = targets[i]; break; }
      }
    }
    if (!el && targets.length) el = targets[0];
    if (!el) { showStep(idx + 1); return; } // Element nicht gefunden → nächster Schritt

    // Highlight positionieren
    var rect = el.getBoundingClientRect();
    var pad = 6;
    highlightEl.style.top = (rect.top - pad) + 'px';
    highlightEl.style.left = (rect.left - pad) + 'px';
    highlightEl.style.width = (rect.width + pad * 2) + 'px';
    highlightEl.style.height = (rect.height + pad * 2) + 'px';

    // Tooltip Inhalt
    var dots = '';
    for (var d = 0; d < STEPS.length; d++) {
      dots += '<div class="tour-dot' + (d === idx ? ' active' : '') + '"></div>';
    }
    var isLast = idx === STEPS.length - 1;

    tooltipEl.innerHTML = ''
      + '<div class="tour-step-num">Schritt ' + (idx + 1) + ' von ' + STEPS.length + '</div>'
      + '<div class="tour-title">' + step.title + '</div>'
      + '<div class="tour-text">' + step.text + '</div>'
      + '<div class="tour-footer">'
      +   '<div class="tour-dots">' + dots + '</div>'
      +   '<div class="tour-btns">'
      +     '<button class="tour-btn tour-btn-skip" onclick="window._tourEnd()">Überspringen</button>'
      +     '<button class="tour-btn tour-btn-next" onclick="window._tourNext()">' + (isLast ? 'Fertig ✓' : 'Weiter →') + '</button>'
      +   '</div>'
      + '</div>';

    // Tooltip positionieren
    var tooltipTop = rect.top + rect.height / 2 - 60;
    var tooltipLeft = rect.right + 16;
    if (tooltipLeft + 340 > window.innerWidth) {
      tooltipLeft = rect.left - 340;
    }
    if (tooltipTop < 10) tooltipTop = 10;
    if (tooltipTop + 180 > window.innerHeight) tooltipTop = window.innerHeight - 190;

    tooltipEl.style.top = tooltipTop + 'px';
    tooltipEl.style.left = tooltipLeft + 'px';
  }

  window._tourNext = function() {
    if (currentStep >= STEPS.length - 1) {
      endTour();
    } else {
      showStep(currentStep + 1);
    }
  };

  window._tourEnd = function() {
    endTour();
  };

  function endTour() {
    localStorage.setItem('prova_tour_done', '1');
    if (overlayEl) { overlayEl.style.opacity = '0'; setTimeout(function() { overlayEl.remove(); }, 300); }
    if (highlightEl) highlightEl.remove();
    if (tooltipEl) tooltipEl.remove();
    overlayEl = highlightEl = tooltipEl = null;
  }

  /* Session 3 Fix: Defensive Cleanup-API — falls Overlay
     irgendwie verwaist (z.B. doppeltes Init, Hot-Reload), kann
     externes Skript / DevTools-Konsole es entfernen */
  window.provaTourCleanup = function() {
    document.querySelectorAll('.tour-overlay,.tour-highlight,.tour-tooltip').forEach(function(el){
      el.remove();
    });
    overlayEl = highlightEl = tooltipEl = null;
    localStorage.setItem('prova_tour_done', '1');
  };

  // ESC beendet Tour
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlayEl) endTour();
  });

  // Klick auf Overlay (außerhalb Tooltip) beendet Tour — verhindert Hänger
  document.addEventListener('click', function(e) {
    if (!overlayEl) return;
    // Nur reagieren wenn Klick exakt auf Overlay (nicht auf Tooltip-Inhalte)
    if (e.target === overlayEl) endTour();
  });

  // Tour starten nach kurzer Verzögerung (DOM muss bereit sein + nav.js geladen)
  function init() {
    // Doppel-Check: Wenn Flag mittlerweile gesetzt wurde (z.B. durch Cleanup), abbrechen
    if (localStorage.getItem('prova_tour_done') === '1') return;
    // Nur auf Dashboard starten
    var page = window.location.pathname.split('/').pop() || 'dashboard.html';
    if (page !== 'dashboard.html') return;
    // Sidebar muss geladen sein
    if (!document.querySelector('.sb-new-btn')) {
      setTimeout(init, 500);
      return;
    }
    setTimeout(startTour, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 300); });
  } else {
    setTimeout(init, 300);
  }

})();

/* ── Tour-Fortschritt ── */
(function() {
  var _origShowStep = window.PROVA_TOUR && window.PROVA_TOUR.showStep;
  if (!_origShowStep && window.PROVA_TOUR) {
    // Monkey-patch: nach jedem Schritt Fortschritt anzeigen
    // P5.B2: Defensive Null-Checks. Wenn PROVA_TOUR zwischendurch
    // entfernt/ersetzt wurde (z.B. durch endTour oder Hot-Reload),
    // werfen window.PROVA_TOUR.steps / .currentStep TypeError.
    var observer = new MutationObserver(function() {
      var tooltip = document.querySelector('.prova-tour-tooltip, .tour-tooltip, [class*="tour"][class*="tooltip"]');
      if (!tooltip || tooltip.querySelector('.tour-progress')) return;
      var T = window.PROVA_TOUR;
      if (!T) return;
      var total  = (T.steps && T.steps.length) || 0;
      var current = T.currentStep || 0;
      if (!total) return;
      
      var prog = document.createElement('div');
      prog.className = 'tour-progress';
      prog.style.cssText = 'display:flex;gap:4px;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1);';
      
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('span');
        dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:' + 
          (i <= current ? 'var(--accent,#4f8ef7)' : 'rgba(255,255,255,.2)') + ';transition:background .2s;';
        prog.appendChild(dot);
      }
      
      var label = document.createElement('span');
      label.style.cssText = 'font-size:10px;color:rgba(255,255,255,.5);margin-left:6px;';
      label.textContent = (current + 1) + ' / ' + total;
      prog.appendChild(label);
      
      tooltip.appendChild(prog);
    });
    
    observer.observe(document.body, {childList: true, subtree: true});
  }
})();
