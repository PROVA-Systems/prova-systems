/**
 * PROVA Welcome-Wizard (4-Step Multi-Modal)
 * MEGA²⁰ W87 (2026-05-08)
 *
 * Marcel-Decision-konform:
 *   B1: ALTER TABLE public.users (persona_size/types/volume + welcome_wizard_completed)
 *   D2: Pseudo-Akte mit is_demo=TRUE Flag
 *   Pricing-Direktive: NUR Solo-Tier (Starter+Team Coming Soon)
 *
 * 4 Steps:
 *   1. PERSONA   — Buero-Groesse + Auftragsarten + Volume
 *   2. MODE      — Triple-Mode-Selection (Mode A/B/C)
 *   3. TOUR      — Optional: existing onboarding-tour.js triggern
 *   4. DEMO-AKTE — Optional: Test-Akte mit is_demo-Flag erstellen
 *
 * DB-Trigger:
 *   - Nicht zeigen wenn users.welcome_wizard_completed = TRUE
 *   - Nicht zeigen wenn _fallback (API-Outage → defensive skip)
 *   - Force-Show via URL-Param ?welcome=force
 *
 * A11y (analog onboarding-trigger.js):
 *   - role=dialog + aria-modal + aria-labelledby
 *   - Esc-Key + Click-outside + Focus-Trap + Backdrop-Blur
 *   - Mobile-responsive @media 540px
 *   - Step-Navigation mit Zurueck/Weiter
 *
 * Public API:
 *   ProvaWelcomeWizard.maybeShow()  // auto-init
 *   ProvaWelcomeWizard.forceShow()  // re-trigger
 *   ProvaWelcomeWizard.isDone()
 */
'use strict';

(function () {
  const STORAGE_KEY = 'prova_welcome_wizard_done';
  const STEPS = ['persona', 'mode', 'tour', 'demo'];
  let _shown = false;
  let _state = {
    currentStep: 0,
    persona_size: null,
    persona_types: [],
    persona_volume: 10,
    selected_mode: null
  };

  function isDone() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
  }
  function _markDone() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
  }

  async function maybeShow() {
    if (_shown) return;
    if (isDone()) return;

    const params = new URLSearchParams(window.location.search);
    const force = params.get('welcome') === 'force';

    if (!force) {
      // DB-driven Trigger via existing /netlify/functions/workflow-settings
      // (returnt User-Settings oder _fallback bei API-Outage)
      try {
        if (window.ProvaWorkflowMode && window.ProvaWorkflowMode.fetchSettings) {
          const settings = await window.ProvaWorkflowMode.fetchSettings();
          if (settings && settings._fallback) {
            return;  // defensive skip bei API-Outage
          }
          // Wenn Wizard schon completed → done markieren + skip
          if (settings && settings.welcome_wizard_completed === true) {
            _markDone();
            return;
          }
        }
      } catch (_) {
        return;  // defensive skip bei Network-Fehler
      }
    }

    _renderModal();
  }

  function forceShow() {
    _renderModal();
  }

  function _injectStyles() {
    if (document.getElementById('prova-ww-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'prova-ww-styles';
    styleEl.textContent = [
      '@keyframes provaWwFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes provaWwScaleIn{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}',
      '#prova-ww-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:max(20px,env(safe-area-inset-top,0px));font-family:system-ui,-apple-system,sans-serif;animation:provaWwFadeIn 0.25s ease-out}',
      '#prova-ww-overlay > .ww-card{background:#1c2130;border:1px solid rgba(255,255,255,0.1);border-radius:14px;max-width:780px;width:100%;color:#eaecf4;box-shadow:0 20px 60px rgba(0,0,0,0.5);max-height:90vh;display:flex;flex-direction:column;animation:provaWwScaleIn 0.3s ease-out}',
      '.ww-stepbar{padding:14px 22px 10px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center}',
      '.ww-stepbar .ww-step-indicator{font-size:11px;color:#8b93ab;letter-spacing:0.05em;text-transform:uppercase;font-weight:600}',
      '.ww-stepbar .ww-step-dots{display:flex;gap:4px}',
      '.ww-step-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.12)}',
      '.ww-step-dot.active{background:#4f8ef7;width:18px;border-radius:3px}',
      '.ww-step-dot.done{background:#10b981}',
      '.ww-body{padding:24px 26px;overflow-y:auto;flex:1}',
      '.ww-title{font-size:22px;font-weight:700;margin:0 0 6px;color:#eaecf4}',
      '.ww-subtitle{font-size:13px;color:#8b93ab;margin:0 0 18px}',
      '.ww-footer{padding:14px 22px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;gap:8px}',
      '.ww-btn{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border:none;transition:all 0.15s}',
      '.ww-btn-primary{background:#4f8ef7;color:#fff}',
      '.ww-btn-primary:hover:not(:disabled){background:#3a7be0}',
      '.ww-btn-primary:disabled{opacity:0.4;cursor:not-allowed}',
      '.ww-btn-ghost{background:transparent;color:#8b93ab;border:1px solid rgba(255,255,255,0.1)}',
      '.ww-btn-ghost:hover{color:#eaecf4;border-color:rgba(255,255,255,0.2)}',
      '.ww-btn-skip{background:transparent;border:none;color:#6b7280;text-decoration:underline;font-size:11px;cursor:pointer;font-family:inherit}',
      '.ww-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px}',
      '.ww-card-opt{background:#161a22;border:2px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;cursor:pointer;text-align:left;transition:all 0.15s;font-family:inherit;color:inherit}',
      '.ww-card-opt:hover{border-color:rgba(79,142,247,0.4);transform:translateY(-1px)}',
      '.ww-card-opt.selected{border-color:#4f8ef7;background:rgba(79,142,247,0.08)}',
      '.ww-card-opt .icon{font-size:24px;margin-bottom:6px}',
      '.ww-card-opt .name{font-size:14px;font-weight:700;margin-bottom:3px}',
      '.ww-card-opt .desc{font-size:11px;color:#8b93ab;line-height:1.45}',
      '.ww-types{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}',
      '.ww-type-cb{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#161a22;border:1px solid rgba(255,255,255,0.06);border-radius:8px;cursor:pointer;font-size:13px;transition:border-color 0.15s}',
      '.ww-type-cb:hover{border-color:rgba(79,142,247,0.3)}',
      '.ww-type-cb.checked{border-color:#4f8ef7;background:rgba(79,142,247,0.06)}',
      '.ww-type-cb input{accent-color:#4f8ef7;cursor:pointer}',
      '.ww-slider-wrap{margin:14px 0;padding:14px;background:#161a22;border:1px solid rgba(255,255,255,0.06);border-radius:10px}',
      '.ww-slider-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px}',
      '.ww-slider{width:100%;accent-color:#4f8ef7}',
      '.ww-slider-val{font-family:ui-monospace,monospace;font-weight:700;color:#4f8ef7;font-size:18px}',
      '.ww-banner{padding:10px 14px;background:rgba(79,142,247,0.08);border:1px solid rgba(79,142,247,0.25);border-radius:6px;font-size:12px;color:#93bbf9;margin-top:10px}',
      '.ww-banner.success{background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25);color:#6ee7b7}',
      '.ww-banner.warning{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.25);color:#fcd34d}',
      '@media (max-width:540px){',
      '  #prova-ww-overlay > .ww-card{padding:0}',
      '  .ww-body{padding:20px 16px}',
      '  .ww-title{font-size:19px}',
      '  .ww-cards{grid-template-columns:1fr}',
      '  .ww-types{grid-template-columns:1fr}',
      '  .ww-footer{padding:12px 16px}',
      '}'
    ].join('\n');
    document.head.appendChild(styleEl);
  }

  function _renderModal() {
    if (_shown) return;
    _shown = true;
    _injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'prova-ww-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'prova-ww-title');

    overlay.innerHTML = '<div class="ww-card">'
      + '<div class="ww-stepbar">'
      +   '<div class="ww-step-indicator" id="ww-step-label">Schritt 1 von 4</div>'
      +   '<div class="ww-step-dots" id="ww-step-dots">'
      +     '<div class="ww-step-dot active" data-step="0"></div>'
      +     '<div class="ww-step-dot" data-step="1"></div>'
      +     '<div class="ww-step-dot" data-step="2"></div>'
      +     '<div class="ww-step-dot" data-step="3"></div>'
      +   '</div>'
      + '</div>'
      + '<div class="ww-body" id="ww-body"></div>'
      + '<div class="ww-footer">'
      +   '<button class="ww-btn-skip" id="ww-skip">Spaeter entscheiden</button>'
      +   '<div style="display:flex;gap:8px">'
      +     '<button class="ww-btn ww-btn-ghost" id="ww-back" style="display:none">← Zurueck</button>'
      +     '<button class="ww-btn ww-btn-primary" id="ww-next">Weiter →</button>'
      +   '</div>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    _renderStep();

    // A11y — Esc-Key
    function escHandler(ev) {
      if (ev.key === 'Escape' || ev.key === 'Esc') {
        ev.preventDefault();
        _markDone();
        _closeOverlay(overlay);
        document.removeEventListener('keydown', escHandler);
      }
    }
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;

    // A11y — Click-outside
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) {
        _markDone();
        _closeOverlay(overlay);
      }
    });

    // Footer-Buttons
    overlay.querySelector('#ww-skip').addEventListener('click', () => {
      _markDone();
      _closeOverlay(overlay);
      _persistCompletion(true).catch(() => {});  // best-effort
      if (window.provaAlert) window.provaAlert('Onboarding spaeter abrufbar via Einstellungen.', 'info');
    });
    overlay.querySelector('#ww-back').addEventListener('click', () => {
      if (_state.currentStep > 0) { _state.currentStep--; _renderStep(); }
    });
    overlay.querySelector('#ww-next').addEventListener('click', _onNext.bind(null, overlay));
  }

  function _closeOverlay(overlay) {
    if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease-out';
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 200);
  }

  function _renderStep() {
    const body = document.getElementById('ww-body');
    const stepLabel = document.getElementById('ww-step-label');
    const dots = document.querySelectorAll('#ww-step-dots .ww-step-dot');
    const backBtn = document.getElementById('ww-back');
    const nextBtn = document.getElementById('ww-next');
    if (!body) return;

    const step = STEPS[_state.currentStep];
    stepLabel.textContent = 'Schritt ' + (_state.currentStep + 1) + ' von 4';
    dots.forEach((d, i) => {
      d.classList.remove('active', 'done');
      if (i < _state.currentStep) d.classList.add('done');
      else if (i === _state.currentStep) d.classList.add('active');
    });
    backBtn.style.display = _state.currentStep > 0 ? 'inline-block' : 'none';
    nextBtn.textContent = _state.currentStep < 3 ? 'Weiter →' : 'Fertig ✓';

    if (step === 'persona') body.innerHTML = _renderPersona();
    else if (step === 'mode') body.innerHTML = _renderMode();
    else if (step === 'tour') body.innerHTML = _renderTour();
    else if (step === 'demo') body.innerHTML = _renderDemo();

    _attachStepHandlers(step);
    _validateNext();
  }

  function _renderPersona() {
    return '<h2 id="prova-ww-title" class="ww-title">Willkommen bei PROVA! 👋</h2>'
      + '<p class="ww-subtitle">In 2 Minuten ist Dein Workspace eingerichtet.</p>'
      + '<div style="font-size:13px;font-weight:600;margin:16px 0 8px">Wie gross ist Dein Buero?</div>'
      + '<div class="ww-cards">'
      +   '<button type="button" class="ww-card-opt" data-size="solo"' + (_state.persona_size === 'solo' ? ' aria-pressed="true"' : '') + '>'
      +     '<div class="icon">👤</div><div class="name">Solo-SV</div>'
      +     '<div class="desc">Du bist allein — keine Mitarbeiter, eigener Workflow.</div></button>'
      +   '<button type="button" class="ww-card-opt" data-size="small"' + (_state.persona_size === 'small' ? ' aria-pressed="true"' : '') + '>'
      +     '<div class="icon">👥</div><div class="name">Klein (2-5)</div>'
      +     '<div class="desc">Kleines Team mit Gutachter + Assistenz.</div></button>'
      +   '<button type="button" class="ww-card-opt" data-size="large"' + (_state.persona_size === 'large' ? ' aria-pressed="true"' : '') + '>'
      +     '<div class="icon">🏢</div><div class="name">Gross (6+)</div>'
      +     '<div class="desc">Mehrere Gutachter, geteilte Arbeit.</div></button>'
      + '</div>'
      + '<div style="font-size:13px;font-weight:600;margin:16px 0 8px">Welche Auftragsarten?</div>'
      + '<div class="ww-types">'
      +   _renderTypeCb('schadensgutachten', 'Schadensgutachten')
      +   _renderTypeCb('wertgutachten', 'Wertgutachten')
      +   _renderTypeCb('beratung', 'Beratung')
      +   _renderTypeCb('baubegleitung', 'Baubegleitung')
      + '</div>'
      + '<div class="ww-slider-wrap">'
      +   '<div class="ww-slider-row"><span>Geschaetzte Gutachten / Monat</span><span class="ww-slider-val" id="ww-vol-val">' + _state.persona_volume + '</span></div>'
      +   '<input type="range" min="1" max="50" value="' + _state.persona_volume + '" class="ww-slider" id="ww-volume" aria-label="Gutachten pro Monat">'
      + '</div>';
  }

  function _renderTypeCb(value, label) {
    const checked = _state.persona_types.indexOf(value) !== -1;
    return '<label class="ww-type-cb' + (checked ? ' checked' : '') + '" data-type="' + value + '">'
      +   '<input type="checkbox" value="' + value + '"' + (checked ? ' checked' : '') + '>'
      +   '<span>' + label + '</span></label>';
  }

  function _renderMode() {
    return '<h2 id="prova-ww-title" class="ww-title">Wie moechtest Du arbeiten?</h2>'
      + '<p class="ww-subtitle">Du kannst diese Wahl jederzeit aendern.</p>'
      + '<div class="ww-cards">'
      +   '<button type="button" class="ww-card-opt" data-mode="A"' + (_state.selected_mode === 'A' ? ' aria-pressed="true"' : '') + '>'
      +     '<div class="icon">🚀</div><div class="name">Mode A — Standard</div>'
      +     '<div class="desc" style="color:#10b981">EMPFOHLEN</div>'
      +     '<div class="desc" style="margin-top:6px">PROVA-Templates, Diktat, KI-Hilfen. Schnell starten.</div></button>'
      +   '<button type="button" class="ww-card-opt" data-mode="B"' + (_state.selected_mode === 'B' ? ' aria-pressed="true"' : '') + '>'
      +     '<div class="icon">✏️</div><div class="name">Mode B — Editor</div>'
      +     '<div class="desc">Voller Rich-Text-Editor. Layout selbst gestalten.</div></button>'
      +   '<button type="button" class="ww-card-opt" data-mode="C"' + (_state.selected_mode === 'C' ? ' aria-pressed="true"' : '') + '>'
      +     '<div class="icon">📁</div><div class="name">Mode C — Vorlagen</div>'
      +     '<div class="desc" style="color:#f59e0b">MIGRATION</div>'
      +     '<div class="desc" style="margin-top:6px">Eigene Word-Vorlagen hochladen.</div></button>'
      + '</div>';
  }

  function _renderTour() {
    return '<h2 id="prova-ww-title" class="ww-title">Tour starten?</h2>'
      + '<p class="ww-subtitle">~3 Minuten — wir zeigen Dir die wichtigsten Funktionen.</p>'
      + '<div class="ww-banner">'
      +   '<strong>In der Tour:</strong>'
      +   '<ul style="margin:6px 0 0 18px;line-height:1.7">'
      +     '<li>Sidebar-Navigation</li>'
      +     '<li>Akte-Erstellung</li>'
      +     '<li>Diktat-Funktion</li>'
      +     '<li>KI-Hilfen</li>'
      +     '<li>Briefe + Rechnungen</li>'
      +   '</ul>'
      + '</div>'
      + '<p style="font-size:12px;color:#8b93ab;margin-top:12px">Du kannst die Tour jederzeit ueberspringen oder spaeter wieder aufrufen.</p>';
  }

  function _renderDemo() {
    return '<h2 id="prova-ww-title" class="ww-title">Demo-Akte erstellen?</h2>'
      + '<p class="ww-subtitle">Probier den vollen Workflow ohne echte Daten.</p>'
      + '<div class="ww-banner">'
      +   '<strong>🎭 Demo-Akte enthaelt:</strong>'
      +   '<ul style="margin:6px 0 0 18px;line-height:1.7">'
      +     '<li>Beispiel-Aktenzeichen + Auftraggeber</li>'
      +     '<li>Demo-Schadensbild (Feuchteschaden)</li>'
      +     '<li>Beispiel-Diktat zum KI-Test</li>'
      +     '<li>Markiert mit "Demo" — kann jederzeit geloescht werden</li>'
      +   '</ul>'
      + '</div>'
      + '<p style="font-size:12px;color:#8b93ab;margin-top:12px">Du kannst auch direkt mit Deiner ersten echten Akte starten.</p>';
  }

  function _attachStepHandlers(step) {
    const body = document.getElementById('ww-body');

    if (step === 'persona') {
      // Buero-Groesse-Cards
      body.querySelectorAll('.ww-card-opt[data-size]').forEach(card => {
        card.addEventListener('click', () => {
          _state.persona_size = card.getAttribute('data-size');
          body.querySelectorAll('.ww-card-opt[data-size]').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          _validateNext();
        });
        if (card.getAttribute('data-size') === _state.persona_size) card.classList.add('selected');
      });

      // Auftragsarten-Checkboxes
      body.querySelectorAll('.ww-type-cb').forEach(cb => {
        cb.addEventListener('click', (ev) => {
          ev.preventDefault();
          const val = cb.getAttribute('data-type');
          const idx = _state.persona_types.indexOf(val);
          if (idx === -1) _state.persona_types.push(val);
          else _state.persona_types.splice(idx, 1);
          cb.classList.toggle('checked');
          const input = cb.querySelector('input');
          if (input) input.checked = !input.checked;
          _validateNext();
        });
      });

      // Volume-Slider
      const slider = body.querySelector('#ww-volume');
      const val = body.querySelector('#ww-vol-val');
      if (slider && val) {
        slider.addEventListener('input', () => {
          _state.persona_volume = parseInt(slider.value, 10) || 10;
          val.textContent = _state.persona_volume;
        });
      }
    }

    if (step === 'mode') {
      body.querySelectorAll('.ww-card-opt[data-mode]').forEach(card => {
        card.addEventListener('click', () => {
          _state.selected_mode = card.getAttribute('data-mode');
          body.querySelectorAll('.ww-card-opt[data-mode]').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          _validateNext();
        });
        if (card.getAttribute('data-mode') === _state.selected_mode) card.classList.add('selected');
      });
    }
  }

  function _validateNext() {
    const nextBtn = document.getElementById('ww-next');
    if (!nextBtn) return;
    const step = STEPS[_state.currentStep];
    let valid = true;
    if (step === 'persona') {
      valid = !!_state.persona_size && _state.persona_types.length > 0;
    } else if (step === 'mode') {
      valid = !!_state.selected_mode;
    }
    // Tour + Demo sind immer "weiter erlaubt" (User kann Skip)
    nextBtn.disabled = !valid;
  }

  async function _onNext(overlay) {
    const step = STEPS[_state.currentStep];

    if (step === 'persona') {
      // Save Persona via patch /netlify/functions/workflow-settings
      // (oder neuer Endpoint update-persona — wir nutzen existing-Pattern via PATCH)
      try {
        const fetcher = window.provaFetch || window.fetch;
        await fetcher('/.netlify/functions/workflow-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona_size: _state.persona_size,
            persona_types: _state.persona_types,
            persona_volume: _state.persona_volume
          })
        });
      } catch (e) {
        console.warn('[welcome-wizard] persona save failed:', e.message);
      }
      _state.currentStep++;
      _renderStep();
      return;
    }

    if (step === 'mode') {
      try {
        if (window.ProvaWorkflowMode && window.ProvaWorkflowMode.updateDefault) {
          await window.ProvaWorkflowMode.updateDefault(_state.selected_mode);
        }
      } catch (e) {
        console.warn('[welcome-wizard] mode save failed:', e.message);
      }
      _state.currentStep++;
      _renderStep();
      return;
    }

    if (step === 'tour') {
      // Tour starten — existing onboarding-tour.js
      _markDone();
      _persistCompletion(true).catch(() => {});
      _closeOverlay(overlay);
      // Trigger existing tour (laedt sich selbst, falls onboarding-tour.js eingebunden)
      // onboarding-tour.js prueft localStorage prova_tour_done — wenn nicht gesetzt,
      // startet es. Wir setzen das Flag ggf. zurueck damit Tour startet.
      try { localStorage.removeItem('prova_tour_done'); } catch (_) {}
      // Falls Tour-Lib explizit geladen werden muss:
      const script = document.querySelector('script[src*="onboarding-tour.js"]');
      if (!script) {
        const newScript = document.createElement('script');
        newScript.src = '/onboarding-tour.js';
        newScript.defer = true;
        document.body.appendChild(newScript);
      }
      return;
    }

    if (step === 'demo') {
      // Demo-Akte erstellen (Marcel-Decision D2)
      try {
        const fetcher = window.provaFetch || window.fetch;
        await fetcher('/.netlify/functions/create-demo-akte', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (window.provaAlert) window.provaAlert('🎭 Demo-Akte erstellt — Du findest sie im Archiv', 'success');
      } catch (e) {
        console.warn('[welcome-wizard] demo-akte failed:', e.message);
      }
      _markDone();
      _persistCompletion(true).catch(() => {});
      _closeOverlay(overlay);
      return;
    }
  }

  /**
   * Persistiert welcome_wizard_completed=TRUE auf users-Tabelle.
   * Best-Effort — bei Fail bleibt localStorage-Flag.
   */
  async function _persistCompletion(completed) {
    try {
      const fetcher = window.provaFetch || window.fetch;
      await fetcher('/.netlify/functions/workflow-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ welcome_wizard_completed: !!completed })
      });
    } catch (e) {
      console.warn('[welcome-wizard] completion-save failed:', e.message);
    }
  }

  window.ProvaWelcomeWizard = {
    maybeShow: maybeShow,
    forceShow: forceShow,
    isDone: isDone,
    _state: _state,
    _STORAGE_KEY: STORAGE_KEY,
    _STEPS: STEPS
  };

  // Auto-Init bei DOMContentLoaded mit 1.8s Delay (Auth + Settings ready)
  function _init() { setTimeout(maybeShow, 1800); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
