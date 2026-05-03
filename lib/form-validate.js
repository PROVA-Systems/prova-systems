/**
 * PROVA Systems — Form-Validation Live-Feedback v1.0
 * MEGA⁸ V2 (04.05.2026)
 *
 * Public API:
 *   ProvaForm.validate(formEl, rules) — Live-Feedback pro Field
 *   ProvaForm.attachValidation(formEl, rules) — Auto-attach inputs
 *
 * Pattern: pro Input ein <span class="prova-error" data-field-error="<name>">
 * wird automatisch mit Fehler-Text befuellt + Submit-Button disabled bis valid.
 *
 * Rules-Format:
 *   {
 *     name: 'email',
 *     required: true,
 *     pattern: /^.+@.+\..+$/,
 *     minLength: 5,
 *     maxLength: 254,
 *     custom: (value) => 'Fehler-Text' | null,
 *     errorMsg: { required: 'Pflichtfeld', pattern: 'Email-Format ungueltig' }
 *   }
 */
'use strict';

(function () {
  function _getFieldErrors(value, rule) {
    const v = String(value == null ? '' : value).trim();
    const msgs = rule.errorMsg || {};

    if (rule.required && !v) return msgs.required || 'Pflichtfeld';
    if (!v) return null; // optional + leer = OK

    if (rule.minLength && v.length < rule.minLength) {
      return msgs.minLength || ('Mindestens ' + rule.minLength + ' Zeichen');
    }
    if (rule.maxLength && v.length > rule.maxLength) {
      return msgs.maxLength || ('Max ' + rule.maxLength + ' Zeichen');
    }
    if (rule.pattern && !rule.pattern.test(v)) {
      return msgs.pattern || 'Format ungueltig';
    }
    if (rule.custom && typeof rule.custom === 'function') {
      const customErr = rule.custom(v);
      if (customErr) return customErr;
    }
    return null;
  }

  function _ensureErrorEl(input) {
    const name = input.name || input.id;
    if (!name) return null;
    let errEl = input.parentNode.querySelector('.prova-error[data-field-error="' + name + '"]');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'prova-error';
      errEl.setAttribute('data-field-error', name);
      errEl.style.cssText = 'display:block;color:var(--red,#ef4444);font-size:0.78rem;margin-top:3px;min-height:1em;line-height:1.3';
      input.parentNode.insertBefore(errEl, input.nextSibling);
    }
    return errEl;
  }

  function validateField(input, rule) {
    const err = _getFieldErrors(input.value, rule);
    const errEl = _ensureErrorEl(input);
    if (errEl) {
      errEl.textContent = err || '';
      errEl.style.display = err ? 'block' : 'none';
    }
    if (err) {
      input.setAttribute('aria-invalid', 'true');
      input.style.borderColor = 'var(--red,#ef4444)';
    } else {
      input.removeAttribute('aria-invalid');
      input.style.borderColor = '';
    }
    return !err;
  }

  function validate(formEl, rules) {
    let allValid = true;
    for (const rule of rules) {
      const input = formEl.querySelector('[name="' + rule.name + '"], #' + rule.name);
      if (!input) continue;
      const valid = validateField(input, rule);
      if (!valid) allValid = false;
    }
    return allValid;
  }

  function attachValidation(formEl, rules, opts) {
    opts = opts || {};
    if (!formEl || !rules || !rules.length) return;

    rules.forEach(rule => {
      const input = formEl.querySelector('[name="' + rule.name + '"], #' + rule.name);
      if (!input) return;
      input.addEventListener('blur', () => validateField(input, rule));
      input.addEventListener('input', () => {
        // Live-Validation nur wenn schon mal blur (sonst nervt es beim Tippen)
        if (input.hasAttribute('aria-invalid') || input.dataset.touched) {
          validateField(input, rule);
        }
      });
      input.addEventListener('blur', () => { input.dataset.touched = '1'; });
    });

    if (opts.disableSubmitWhileInvalid !== false) {
      const submitBtn = formEl.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        function checkAll() {
          let valid = true;
          for (const rule of rules) {
            const input = formEl.querySelector('[name="' + rule.name + '"], #' + rule.name);
            if (!input) continue;
            const err = _getFieldErrors(input.value, rule);
            if (err) { valid = false; break; }
          }
          submitBtn.disabled = !valid;
        }
        formEl.querySelectorAll('input, textarea, select').forEach(el => {
          el.addEventListener('input', checkAll);
          el.addEventListener('change', checkAll);
        });
        checkAll();
      }
    }

    // Submit-Hook
    formEl.addEventListener('submit', (e) => {
      const allValid = validate(formEl, rules);
      if (!allValid) {
        e.preventDefault();
        if (window.ProvaUI && ProvaUI.toast) {
          ProvaUI.toast('Bitte Eingaben korrigieren', 'error');
        }
        // Focus first invalid field
        const firstInvalid = formEl.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
      }
    });
  }

  window.ProvaForm = {
    validate: validate,
    attachValidation: attachValidation,
    validateField: validateField
  };
})();
