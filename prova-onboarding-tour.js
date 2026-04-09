/**
 * PROVA — Shepherd.js Onboarding-Tour (6 Schritte)
 * Start: localStorage prova_show_tour=1 und prova_tour_v1_done ≠ 1
 * Ende: prova_tour_v1_done=1, prova_show_tour entfernt
 */
(function () {
  var DONE = 'prova_tour_v1_done';
  var SHOW = 'prova_show_tour';

  function shouldRunTour() {
    if (localStorage.getItem(DONE) === '1') return false;
    if (localStorage.getItem(SHOW) !== '1') return false;
    return true;
  }

  function finishTour() {
    try {
      localStorage.setItem(DONE, '1');
      localStorage.removeItem(SHOW);
    } catch (e) {}
    try {
      sessionStorage.removeItem('prova_tour_resume');
    } catch (e2) {}
    if (window.history && window.history.replaceState) {
      var u = new URL(window.location.href);
      u.searchParams.delete('provaTour');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    }
  }

  function loadShepherd(cb) {
    if (window.Shepherd) return cb();
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/css/shepherd.css';
    document.head.appendChild(link);
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/js/shepherd.min.js';
    s.onload = cb;
    s.onerror = function () { console.warn('Shepherd.js konnte nicht geladen werden.'); };
    document.head.appendChild(s);
  }

  function defaultStepOpts() {
    return {
      classes: 'prova-shepherd-step',
      scrollTo: { behavior: 'smooth', block: 'center' },
      cancelIcon: { enabled: true },
      canClickTarget: true
    };
  }

  function startDashboard() {
    if (!shouldRunTour()) return;
    loadShepherd(function () {
      var Tour = window.Shepherd.Tour;
      var tour = new Tour({
        useModalOverlay: true,
        defaultStepOptions: defaultStepOpts()
      });

      tour.addStep({
        id: 't1',
        title: 'Ihr Profil',
        text: 'Hier passen Sie Ihr Profil und die Einstellungen an — z. B. Kontodaten für Rechnungen.',
        attachTo: { element: '#prova-tour-settings', on: 'bottom' },
        buttons: [
          { text: 'Überspringen', action: function () { finishTour(); return tour.cancel(); } },
          { text: 'Weiter', action: function () { return tour.next(); } }
        ]
      });

      tour.addStep({
        id: 't2',
        title: 'Erster Fall',
        text: 'Über „Neues Gutachten“ legen Sie einen neuen Fall an und starten den Workflow.',
        attachTo: { element: '#navNeuesGutachtenTop', on: 'bottom' },
        buttons: [
          { text: 'Zurück', action: function () { return tour.back(); } },
          { text: 'Weiter', action: function () {
            try { sessionStorage.setItem('prova_tour_resume', 'app'); } catch (e) {}
            var p = localStorage.getItem('prova_paket') || 'Starter';
            var app = p === 'Pro' ? 'app-pro.html' : (p === 'Enterprise' ? 'app-enterprise.html' : 'app-starter.html');
            window.location.href = app + '?provaTour=3';
            return tour.hide();
          } }
        ]
      });

      tour.start();
    });
  }

  function startApp() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('provaTour') !== '3') return;
    if (!shouldRunTour()) return;
    loadShepherd(function () {
      var Tour = window.Shepherd.Tour;
      var tour = new Tour({
        useModalOverlay: true,
        defaultStepOptions: defaultStepOpts()
      });

      tour.addStep({
        id: 't3',
        title: 'Diktat aufnehmen',
        text: 'Starten Sie die Aufnahme — Ihr Befund wird transkribiert und fließt in den Entwurf ein.',
        attachTo: { element: '.prova-tour-mic', on: 'top' },
        beforeShowPromise: function () {
          var el = document.querySelector('.prova-tour-mic');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return Promise.resolve();
        },
        buttons: [
          { text: 'Überspringen', action: function () { finishTour(); return tour.cancel(); } },
          { text: 'Weiter', action: function () { return tour.next(); } }
        ]
      });

      tour.addStep({
        id: 't4',
        title: 'Gutachten prüfen',
        text: 'Hier sehen Sie den Entwurf bzw. das Transkript — prüfen und bearbeiten Sie vor der Analyse.',
        attachTo: { element: '.prova-tour-entwurf', on: 'top' },
        buttons: [
          { text: 'Zurück', action: function () { return tour.back(); } },
          { text: 'Weiter', action: function () {
            window.location.href = 'jveg.html?provaTour=5';
            return tour.hide();
          } }
        ]
      });

      tour.start();
    });
  }

  function startJveg() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('provaTour') !== '5') return;
    if (!shouldRunTour()) return;
    loadShepherd(function () {
      var Tour = window.Shepherd.Tour;
      var tour = new Tour({
        useModalOverlay: true,
        defaultStepOptions: defaultStepOpts()
      });

      tour.addStep({
        id: 't5',
        title: 'Rechnung stellen',
        text: 'Mit dem JVEG-Rechner ermitteln Sie Honorar und Positionen — Grundlage für Ihre Rechnung.',
        attachTo: { element: '#prova-tour-jveg', on: 'bottom' },
        buttons: [
          { text: 'Überspringen', action: function () { finishTour(); return tour.cancel(); } },
          { text: 'Weiter', action: function () { return tour.next(); } }
        ]
      });

      tour.addStep({
        id: 't6',
        title: 'Fertig!',
        text: 'Sie haben die wichtigsten Schritte kennengelernt. Nutzer berichten von bis zu <strong>40&nbsp;% weniger Bearbeitungszeit</strong> mit PROVA.',
        buttons: [
          { text: 'Zurück', action: function () { return tour.back(); } },
          { text: 'Schließen', action: function () { finishTour(); return tour.complete(); } }
        ]
      });

      tour.start();
    });
  }

  function detect() {
    var path = (window.location.pathname || '').split('/').pop() || '';
    if (path === 'dashboard.html') return startDashboard();
    if (path === 'app-starter.html' || path === 'app-pro.html' || path === 'app-enterprise.html') return startApp();
    if (path === 'jveg.html') return startJveg();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detect);
  } else {
    detect();
  }
})();
