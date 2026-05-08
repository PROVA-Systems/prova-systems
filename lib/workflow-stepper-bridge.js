/**
 * PROVA Workflow-Stepper-Bridge (MEGA⁴² P2)
 *
 * Bridge zwischen ProvaWizardFlowConfigs (Source-of-Truth) und
 * ProvaWizardStepper (UI-Lib aus M⁴¹ P8).
 *
 * Mountet einen konsistenten Stepper-Header für einen der 4 Flows
 * (A/B/C/D) in einer beliebigen Page. Optionaler Bridge-Mode:
 * existing prova-wizard.js übernimmt Form-State, Bridge übernimmt nur UI-Stepper.
 *
 * Public API (window.ProvaWorkflowStepper):
 *   mount(opts)
 *     opts: { el, flowKey, mode?, onSubmit?, draftKey? }
 *     mode: "full" (Stepper UI + Form), "header-only" (nur Stepper-Anzeige)
 *
 *   bindToProvaWizard(flowKey, currentSchritt)
 *     → ohne mount, Aktualisiert nur die Step-Anzeige basierend auf prova-wizard.js Schritt
 *
 *   getProgressForState(flowKey, state)
 *     → { currentIdx, totalSteps, percentage, completedKeys }
 */
'use strict';

(function () {
  function _ensureDeps() {
    if (typeof window === 'undefined') return false;
    if (!window.ProvaWizardFlowConfigs) {
      console.warn('[workflow-stepper-bridge] ProvaWizardFlowConfigs not loaded');
      return false;
    }
    if (!window.ProvaWizardStepper) {
      console.warn('[workflow-stepper-bridge] ProvaWizardStepper not loaded');
      return false;
    }
    return true;
  }

  function mount(opts) {
    if (!_ensureDeps()) return null;
    if (!opts || !opts.el || !opts.flowKey) {
      throw new Error('mount requires el and flowKey');
    }
    const flow = window.ProvaWizardFlowConfigs.getFlow(opts.flowKey);
    if (!flow) {
      throw new Error('Unknown flow: ' + opts.flowKey);
    }
    const mode = opts.mode || 'full';
    if (mode !== 'full' && mode !== 'header-only') {
      throw new Error('mode must be "full" or "header-only"');
    }

    if (mode === 'header-only') {
      return _mountHeaderOnly(opts.el, flow);
    }

    // Full mode: delegate to ProvaWizardStepper
    return window.ProvaWizardStepper.mount({
      el: opts.el,
      steps: flow.steps.map(s => ({
        key: s.key,
        label: s.label,
        renderFn: function (containerEl, state) {
          // Default minimal renderer - real Pages override this
          containerEl.innerHTML =
            '<div class="prova-wstep-content">' +
            '<h3>' + s.label + '</h3>' +
            '<div class="prova-wstep-fields">' +
            s.fields.map(f =>
              '<label class="prova-wstep-field-label">' + f + '</label>' +
              '<input class="prova-wstep-field-input" name="' + f + '" value="' + (state && state[f] ? String(state[f]).replace(/"/g, '&quot;') : '') + '" />'
            ).join('') +
            '</div></div>';
        },
        validateFn: s.validate
      })),
      draftKey: opts.draftKey || ('flow_' + flow.key.toLowerCase()),
      onSubmit: opts.onSubmit
    });
  }

  function _mountHeaderOnly(el, flow) {
    if (typeof el.innerHTML === 'undefined') return null;
    const html = [
      '<div class="prova-wb-stepper" data-flow="' + flow.key + '" role="navigation" aria-label="Workflow-Schritte">',
      '  <div class="prova-wb-flow-label">' + flow.label + '</div>',
      '  <ol class="prova-wb-steps">'
    ];
    for (let i = 0; i < flow.steps.length; i++) {
      const s = flow.steps[i];
      html.push(
        '<li class="prova-wb-step" data-step-idx="' + i + '" data-step-key="' + s.key + '">' +
          '<span class="prova-wb-step-num">' + (i + 1) + '</span>' +
          '<span class="prova-wb-step-label">' + s.label + '</span>' +
        '</li>'
      );
    }
    html.push('  </ol>');
    html.push('</div>');
    el.innerHTML = html.join('\n');

    return {
      flow: flow,
      setActive: function (idx) {
        const items = el.querySelectorAll('.prova-wb-step');
        items.forEach((item, i) => {
          item.classList.toggle('is-active', i === idx);
          item.classList.toggle('is-done', i < idx);
        });
      }
    };
  }

  function bindToProvaWizard(flowKey, currentSchritt) {
    if (typeof window === 'undefined') return null;
    const flow = window.ProvaWizardFlowConfigs && window.ProvaWizardFlowConfigs.getFlow(flowKey);
    if (!flow) return null;
    // currentSchritt: 1-indexed wie in prova-wizard.js (1=Auftragstyp, 2=Wo&Was, …)
    const idx = Math.max(0, Math.min(flow.steps.length - 1, currentSchritt - 1));
    return {
      flow: flow,
      currentIdx: idx,
      currentStep: flow.steps[idx] || null,
      progress_pct: Math.round((idx + 1) / flow.steps.length * 100)
    };
  }

  function getProgressForState(flowKey, state) {
    const flow = (typeof window !== 'undefined' && window.ProvaWizardFlowConfigs)
      ? window.ProvaWizardFlowConfigs.getFlow(flowKey)
      : null;
    if (!flow) return null;
    const completedKeys = [];
    let firstInvalidIdx = flow.steps.length; // = all done
    for (let i = 0; i < flow.steps.length; i++) {
      const r = flow.steps[i].validate(state || {});
      if (r && r.valid) {
        completedKeys.push(flow.steps[i].key);
      } else {
        firstInvalidIdx = Math.min(firstInvalidIdx, i);
        break;
      }
    }
    const currentIdx = Math.min(firstInvalidIdx, flow.steps.length - 1);
    return {
      currentIdx: currentIdx,
      totalSteps: flow.steps.length,
      percentage: Math.round((completedKeys.length / flow.steps.length) * 100),
      completedKeys: completedKeys
    };
  }

  // Pure-fn variant (Node-test friendly, no window deps)
  function _getProgressForStatePure(flowConfig, state) {
    if (!flowConfig || !Array.isArray(flowConfig.steps)) return null;
    const completedKeys = [];
    for (let i = 0; i < flowConfig.steps.length; i++) {
      const r = flowConfig.steps[i].validate(state || {});
      if (r && r.valid) {
        completedKeys.push(flowConfig.steps[i].key);
      } else {
        break;
      }
    }
    return {
      currentIdx: Math.min(completedKeys.length, flowConfig.steps.length - 1),
      totalSteps: flowConfig.steps.length,
      percentage: Math.round((completedKeys.length / flowConfig.steps.length) * 100),
      completedKeys: completedKeys
    };
  }

  const api = {
    mount,
    bindToProvaWizard,
    getProgressForState,
    _getProgressForStatePure
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.ProvaWorkflowStepper = api;
  }
})();
