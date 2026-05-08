/**
 * PROVA Wizard-Stepper (MEGA⁴¹ P8)
 *
 * Zentrale Pattern-Lib für konsistente Stepper-Logik über 4 Workflows
 * (Schaden A / Wert B / Beratung C / Baubegleitung D).
 *
 * Public API (window.ProvaWizardStepper):
 *   mount(opts) → instance
 *     opts: {
 *       el, steps:[{key,label,renderFn,validateFn?}],
 *       onChange?, onSubmit?, draftKey?, initialStep?
 *     }
 *   instance: {
 *     nextStep(), prevStep(), goToStep(idx),
 *     validateStep(idx), saveDraft(), loadDraft(), clearDraft(),
 *     getCurrentStep(), getState(), destroy()
 *   }
 *
 * Patterns (aus 5-Quellen-Recherche):
 *   - Buttons fix: Zurück links, Weiter rechts (Stripe)
 *   - Progress-% sichtbar bei ≥3 Steps (Stripe)
 *   - Stepper-Klickbar: nur completed Steps zurück (Vercel)
 *   - Mobile-Compact: "Schritt N von M" (Vercel)
 *   - Validation-Feedback inline rot-Border (Stripe)
 *   - Pause/Resume via localStorage-Draft (Vercel)
 *   - Keyboard: Tab/Enter/Esc (Stripe)
 *   - Accessibility: aria-valuenow Progress-Role (WCAG)
 */
'use strict';

(function () {

  const DRAFT_PREFIX = 'wizard_draft_';
  const STYLE_ID = 'prova-wizard-stepper-style';
  const AUTO_SAVE_DEBOUNCE_MS = 1500;

  function _injectStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/lib/wizard-stepper.css';
    document.head.appendChild(link);
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Validate a step. Returns {valid: bool, errors: [{field, msg}]}.
   * Wenn step.validateFn definiert, wird sie aufgerufen mit aktuellen Daten.
   */
  function validateStep(steps, idx, state) {
    if (idx < 0 || idx >= steps.length) return { valid: false, errors: [{ field: '_', msg: 'invalid step idx' }] };
    const step = steps[idx];
    if (typeof step.validateFn === 'function') {
      try {
        const r = step.validateFn(state);
        if (r === true || (r && r.valid === true)) return { valid: true, errors: [] };
        if (r && Array.isArray(r.errors)) return { valid: false, errors: r.errors };
        return { valid: false, errors: [{ field: '_', msg: typeof r === 'string' ? r : 'Validation failed' }] };
      } catch (e) {
        return { valid: false, errors: [{ field: '_', msg: e.message }] };
      }
    }
    return { valid: true, errors: [] };
  }

  function _getDraft(draftKey) {
    if (typeof localStorage === 'undefined' || !draftKey) return null;
    try {
      const raw = localStorage.getItem(DRAFT_PREFIX + draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function _setDraft(draftKey, draft) {
    if (typeof localStorage === 'undefined' || !draftKey) return false;
    try {
      localStorage.setItem(DRAFT_PREFIX + draftKey, JSON.stringify(draft));
      return true;
    } catch (_) { return false; }
  }

  function _clearDraft(draftKey) {
    if (typeof localStorage === 'undefined' || !draftKey) return;
    try { localStorage.removeItem(DRAFT_PREFIX + draftKey); } catch (_) {}
  }

  /**
   * Build Stepper-Header (visuell + klickbar nur für completed Steps).
   */
  function _buildHeader(steps, currentIdx, completedSet) {
    const total = steps.length;
    const progressPct = total > 0 ? Math.round((currentIdx / Math.max(total - 1, 1)) * 100) : 0;
    const showProgress = total >= 3;

    const header = document.createElement('div');
    header.className = 'pws-header';
    header.setAttribute('role', 'progressbar');
    header.setAttribute('aria-valuenow', String(progressPct));
    header.setAttribute('aria-valuemin', '0');
    header.setAttribute('aria-valuemax', '100');

    // Compact-Mobile: "Schritt N von M"
    const compact = document.createElement('div');
    compact.className = 'pws-compact';
    compact.textContent = 'Schritt ' + (currentIdx + 1) + ' von ' + total + ': ' + (steps[currentIdx] ? steps[currentIdx].label : '–');
    header.appendChild(compact);

    // Desktop: Step-Dots mit Linien
    const stepRow = document.createElement('div');
    stepRow.className = 'pws-step-row';
    steps.forEach((s, i) => {
      const isCompleted = completedSet.has(i);
      const isActive = i === currentIdx;
      const isClickable = isCompleted || isActive;
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'pws-step' +
        (isCompleted ? ' pws-step--done' : '') +
        (isActive ? ' pws-step--active' : '') +
        (!isClickable ? ' pws-step--locked' : '');
      dot.dataset.idx = String(i);
      dot.setAttribute('aria-label', 'Schritt ' + (i + 1) + ': ' + s.label + (isCompleted ? ' (abgeschlossen)' : (isActive ? ' (aktiv)' : ' (gesperrt)')));
      if (!isClickable) dot.disabled = true;
      dot.innerHTML = '<span class="pws-step-num">' + (isCompleted ? '✓' : (i + 1)) + '</span>' +
                      '<span class="pws-step-label">' + _esc(s.label) + '</span>';
      stepRow.appendChild(dot);
      if (i < steps.length - 1) {
        const line = document.createElement('div');
        line.className = 'pws-line' + (isCompleted ? ' pws-line--done' : '');
        line.setAttribute('aria-hidden', 'true');
        stepRow.appendChild(line);
      }
    });
    header.appendChild(stepRow);

    if (showProgress) {
      const progress = document.createElement('div');
      progress.className = 'pws-progress';
      progress.innerHTML = '<div class="pws-progress-bar" style="width:' + progressPct + '%;"></div>' +
                           '<span class="pws-progress-pct">' + progressPct + '%</span>';
      header.appendChild(progress);
    }

    return header;
  }

  function _buildFooter(currentIdx, totalSteps, hasDraft) {
    const foot = document.createElement('div');
    foot.className = 'pws-footer';

    const left = document.createElement('div');
    left.className = 'pws-footer-left';
    if (currentIdx > 0) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'pws-btn pws-btn--ghost';
      back.dataset.action = 'prev';
      back.textContent = '← Zurück';
      left.appendChild(back);
    }
    foot.appendChild(left);

    const middle = document.createElement('div');
    middle.className = 'pws-footer-middle';
    if (hasDraft) {
      const saveExit = document.createElement('button');
      saveExit.type = 'button';
      saveExit.className = 'pws-btn pws-btn--text';
      saveExit.dataset.action = 'save-exit';
      saveExit.textContent = '💾 Speichern & Beenden';
      middle.appendChild(saveExit);
    }
    foot.appendChild(middle);

    const right = document.createElement('div');
    right.className = 'pws-footer-right';
    const isLast = currentIdx === totalSteps - 1;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'pws-btn pws-btn--primary';
    next.dataset.action = isLast ? 'submit' : 'next';
    next.textContent = isLast ? 'Abschließen ✓' : 'Weiter →';
    right.appendChild(next);
    foot.appendChild(right);

    return foot;
  }

  function _buildStatusBar(state) {
    const bar = document.createElement('div');
    bar.className = 'pws-status';
    bar.setAttribute('aria-live', 'polite');
    if (state.lastSavedAt) {
      const ms = Date.now() - state.lastSavedAt;
      const sec = Math.round(ms / 1000);
      bar.textContent = 'Auto-gespeichert vor ' + (sec < 60 ? sec + 's' : Math.round(sec / 60) + 'min');
    }
    return bar;
  }

  /**
   * Mount Wizard-Stepper.
   *
   * @param {Object} opts
   * @returns {Object} instance
   */
  function mount(opts) {
    if (!opts || !opts.el) throw new Error('[ProvaWizardStepper] opts.el pflicht');
    if (!Array.isArray(opts.steps) || opts.steps.length === 0) {
      throw new Error('[ProvaWizardStepper] opts.steps[] pflicht');
    }
    const el = typeof opts.el === 'string' ? document.querySelector(opts.el) : opts.el;
    if (!el) throw new Error('[ProvaWizardStepper] element not found');

    _injectStyle();

    const state = {
      currentIdx: opts.initialStep || 0,
      completedSet: new Set(),
      data: {},
      lastSavedAt: null,
      destroyed: false
    };

    // Lade Draft
    if (opts.draftKey) {
      const draft = _getDraft(opts.draftKey);
      if (draft) {
        state.currentIdx = draft.currentIdx || 0;
        state.completedSet = new Set(draft.completed || []);
        state.data = draft.data || {};
        state.lastSavedAt = draft.savedAt || null;
      }
    }

    el.innerHTML = '';
    el.classList.add('pws-wrap');

    function render() {
      el.innerHTML = '';
      const header = _buildHeader(opts.steps, state.currentIdx, state.completedSet);
      el.appendChild(header);
      el.appendChild(_buildStatusBar(state));

      const stepEl = document.createElement('div');
      stepEl.className = 'pws-step-content';
      const step = opts.steps[state.currentIdx];
      if (step && typeof step.renderFn === 'function') {
        try {
          const out = step.renderFn(state.data, stepEl);
          // renderFn kann String oder Element zurückgeben (oder void wenn direkt mutiert hat)
          if (typeof out === 'string') stepEl.innerHTML = out;
          else if (out instanceof Element) { stepEl.innerHTML = ''; stepEl.appendChild(out); }
        } catch (e) {
          stepEl.innerHTML = '<div class="pws-error">Render-Fehler: ' + _esc(e.message) + '</div>';
        }
      }
      el.appendChild(stepEl);

      el.appendChild(_buildFooter(state.currentIdx, opts.steps.length, !!opts.draftKey));

      // Wire-Buttons
      el.querySelectorAll('.pws-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const idx = parseInt(btn.dataset.idx, 10);
          if (!isNaN(idx)) goToStep(idx);
        });
      });
      el.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const action = btn.dataset.action;
          if (action === 'next') nextStep();
          else if (action === 'prev') prevStep();
          else if (action === 'submit') submit();
          else if (action === 'save-exit') saveAndExit();
        });
      });
    }

    function _scheduleAutoSave() {
      if (!opts.draftKey) return;
      if (state._saveTimer) clearTimeout(state._saveTimer);
      state._saveTimer = setTimeout(() => {
        saveDraft();
        if (state.statusEl) {
          state.lastSavedAt = Date.now();
          render();
        }
      }, AUTO_SAVE_DEBOUNCE_MS);
    }

    function nextStep() {
      const v = validateStep(opts.steps, state.currentIdx, state.data);
      if (!v.valid) {
        if (typeof opts.onValidationError === 'function') opts.onValidationError(v.errors);
        else if (typeof window !== 'undefined' && window.alert) {
          window.alert('Bitte korrigiere folgende Felder:\n' + v.errors.map(e => '• ' + e.msg).join('\n'));
        }
        return false;
      }
      state.completedSet.add(state.currentIdx);
      if (state.currentIdx < opts.steps.length - 1) {
        state.currentIdx++;
        if (typeof opts.onChange === 'function') opts.onChange(state.currentIdx, opts.steps[state.currentIdx]);
        render();
        saveDraft();
      }
      return true;
    }

    function prevStep() {
      if (state.currentIdx > 0) {
        state.currentIdx--;
        if (typeof opts.onChange === 'function') opts.onChange(state.currentIdx, opts.steps[state.currentIdx]);
        render();
      }
    }

    function goToStep(idx) {
      if (idx < 0 || idx >= opts.steps.length) return false;
      // Nur completed oder current klickbar
      if (idx > state.currentIdx && !state.completedSet.has(idx)) return false;
      state.currentIdx = idx;
      if (typeof opts.onChange === 'function') opts.onChange(idx, opts.steps[idx]);
      render();
      return true;
    }

    function submit() {
      const v = validateStep(opts.steps, state.currentIdx, state.data);
      if (!v.valid) {
        if (typeof opts.onValidationError === 'function') opts.onValidationError(v.errors);
        return false;
      }
      state.completedSet.add(state.currentIdx);
      if (typeof opts.onSubmit === 'function') opts.onSubmit(state.data);
      return true;
    }

    function saveDraft() {
      if (!opts.draftKey) return false;
      const draft = {
        currentIdx: state.currentIdx,
        completed: Array.from(state.completedSet),
        data: state.data,
        savedAt: Date.now()
      };
      const ok = _setDraft(opts.draftKey, draft);
      if (ok) state.lastSavedAt = Date.now();
      return ok;
    }

    function loadDraft() {
      if (!opts.draftKey) return null;
      return _getDraft(opts.draftKey);
    }

    function clearDraft() { _clearDraft(opts.draftKey); state.lastSavedAt = null; }

    function saveAndExit() {
      saveDraft();
      if (typeof opts.onSaveExit === 'function') opts.onSaveExit(state.data);
    }

    function _onKeydown(e) {
      if (state.destroyed) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target;
        if (target && (target.tagName === 'TEXTAREA')) return;  // Enter in TEXTAREA = Newline
        if (state.currentIdx === opts.steps.length - 1) submit();
        else nextStep();
      } else if (e.key === 'Escape') {
        if (typeof opts.onEsc === 'function') opts.onEsc();
      }
    }
    el.addEventListener('keydown', _onKeydown);

    render();

    return {
      nextStep,
      prevStep,
      goToStep,
      validateStep: (idx) => validateStep(opts.steps, idx, state.data),
      saveDraft,
      loadDraft,
      clearDraft,
      submit,
      saveAndExit,
      getCurrentStep: () => state.currentIdx,
      getState: () => ({ ...state, completedSet: Array.from(state.completedSet) }),
      setData: (newData) => { state.data = { ...state.data, ...newData }; _scheduleAutoSave(); },
      destroy: () => {
        state.destroyed = true;
        if (state._saveTimer) clearTimeout(state._saveTimer);
        el.removeEventListener('keydown', _onKeydown);
        el.innerHTML = '';
      }
    };
  }

  // Public API
  const api = {
    mount: mount,
    validateStep: validateStep,
    DRAFT_PREFIX: DRAFT_PREFIX,
    AUTO_SAVE_DEBOUNCE_MS: AUTO_SAVE_DEBOUNCE_MS,
    _getDraft: _getDraft,
    _setDraft: _setDraft,
    _clearDraft: _clearDraft
  };

  if (typeof window !== 'undefined') {
    window.ProvaWizardStepper = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
