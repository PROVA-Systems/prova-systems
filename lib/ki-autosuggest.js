/**
 * PROVA KI-Autosuggest (Ghost-Text)
 * MEGA¹³ W18 (Tier 5b, 2026-05-05)
 *
 * Inline-KI-Vorschlaege als Ghost-Text in textarea/input/contenteditable.
 * User druckt Tab → Vorschlag uebernehmen, Esc → ablehnen.
 *
 * USAGE:
 *   ProvaAutosuggest.attach(textareaEl, async (currentText) => {
 *     // Returnt async string oder null (kein Vorschlag)
 *     const r = await fetch('/.netlify/functions/ki-proxy', { ... });
 *     return r.ok ? (await r.json()).vorschlag : null;
 *   }, options?);
 *
 *   ProvaAutosuggest.detach(textareaEl);
 *
 * Options:
 *   debounceMs: 800     // Wartezeit nach letzter Eingabe bevor Trigger
 *   minChars: 20        // Min Text-Laenge bevor Trigger
 *   maxSuggestionLen: 200 // Max Chars im Ghost-Text
 *   userPreferenceKey: 'ki_autosuggest_enabled'  // localStorage-Flag
 *
 * Anti-Pattern vermieden:
 *   - Kein eager-Trigger bei jedem Keystroke (debounce)
 *   - Kein Trigger bei sehr kurzem Text (minChars)
 *   - User-Preference: localStorage-Flag fuer An/Aus
 *   - Cancel pending fetch bei neuer Eingabe (AbortController)
 *   - Idempotent: detach + re-attach safe
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-as-style';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .prova-as-wrapper {
        position: relative;
      }
      .prova-as-ghost {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        padding: inherit;
        font: inherit;
        color: rgba(110, 130, 160, 0.55);
        pointer-events: none;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow: hidden;
        z-index: 1;
        background: transparent;
        border: 1px solid transparent;
        box-sizing: border-box;
      }
      .prova-as-ghost-prefix {
        color: transparent;  /* unsichtbar — entspricht User-Text */
      }
      .prova-as-ghost-suggestion {
        color: rgba(110, 130, 160, 0.55);
      }
      .prova-as-hint {
        position: absolute;
        bottom: 4px; right: 8px;
        font-size: 10px;
        color: rgba(110, 130, 160, 0.7);
        background: var(--bg, #0b1220);
        padding: 2px 6px; border-radius: 4px;
        pointer-events: none;
        z-index: 2;
        font-family: -apple-system, system-ui, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  // State per Element via WeakMap (Memory-Leak-Defense)
  const _state = new WeakMap();

  function _getValue(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value;
    if (el.isContentEditable) return el.innerText;
    return '';
  }

  function _isEnabled(prefKey) {
    if (!prefKey) return true;
    try {
      const v = localStorage.getItem(prefKey);
      // Default: an, ausser explicit '0'
      return v !== '0';
    } catch (_) { return true; }
  }

  function _showGhost(el, currentText, suggestion, state) {
    // Wrapper um Element wenn noch nicht da
    let wrapper = state.wrapper;
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'prova-as-wrapper';
      // Wrapper inherit element's display behavior
      const cs = window.getComputedStyle(el);
      wrapper.style.display = cs.display === 'inline' ? 'inline-block' : cs.display;
      wrapper.style.width = el.offsetWidth + 'px';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
      state.wrapper = wrapper;
    }

    // Ghost-Element
    let ghost = state.ghostEl;
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.className = 'prova-as-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      // Style auf el angleichen (font, padding etc.)
      const cs = window.getComputedStyle(el);
      ghost.style.padding = cs.padding;
      ghost.style.font = cs.font;
      ghost.style.lineHeight = cs.lineHeight;
      wrapper.appendChild(ghost);
      state.ghostEl = ghost;
    }

    // Hint-Element (Tab/Esc-Hinweis)
    let hint = state.hintEl;
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'prova-as-hint';
      hint.textContent = 'Tab annehmen · Esc verwerfen';
      wrapper.appendChild(hint);
      state.hintEl = hint;
    }

    ghost.innerHTML =
      '<span class="prova-as-ghost-prefix">' + _esc(currentText) + '</span>' +
      '<span class="prova-as-ghost-suggestion">' + _esc(suggestion) + '</span>';

    state.activeSuggestion = suggestion;
  }

  function _hideGhost(state) {
    if (state.ghostEl) state.ghostEl.innerHTML = '';
    if (state.hintEl) state.hintEl.style.display = 'none';
    state.activeSuggestion = null;
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function attach(el, suggestionLoader, options) {
    if (!el) return;
    if (typeof suggestionLoader !== 'function') {
      console.warn('[ProvaAutosuggest] suggestionLoader required');
      return;
    }
    if (_state.has(el)) {
      console.warn('[ProvaAutosuggest] already attached, detach first');
      return;
    }

    const opts = Object.assign({
      debounceMs: 800,
      minChars: 20,
      maxSuggestionLen: 200,
      userPreferenceKey: 'ki_autosuggest_enabled'
    }, options || {});

    _injectStyle();

    let debounceTimer = null;
    let abortController = null;
    const state = {
      wrapper: null,
      ghostEl: null,
      hintEl: null,
      activeSuggestion: null,
      handlers: {}
    };
    _state.set(el, state);

    async function _trigger() {
      if (!_isEnabled(opts.userPreferenceKey)) return;
      // MEGA⁸¹ D.3 — Master-Toggle aus user_workflow_settings.inline_ki_suggestions_enabled
      // respektieren. Wenn off → silent skip (kein Spinner, kein Ghost).
      if (typeof window.provaInlineSuggestionsEnabled === 'function'
          && !window.provaInlineSuggestionsEnabled()) return;
      const currentText = _getValue(el);
      if (currentText.length < opts.minChars) {
        _hideGhost(state);
        return;
      }
      if (abortController) abortController.abort();
      abortController = new AbortController();

      try {
        const suggestion = await suggestionLoader(currentText, abortController.signal);
        if (!suggestion || typeof suggestion !== 'string') return;
        const trimmed = suggestion.slice(0, opts.maxSuggestionLen);
        // Ghost-Text nur zeigen wenn User noch im Element ist
        if (document.activeElement !== el) return;
        _showGhost(el, currentText, trimmed, state);
        if (state.hintEl) state.hintEl.style.display = '';
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('[ProvaAutosuggest] suggestionLoader error:', e.message);
        }
      }
    }

    function onInput() {
      _hideGhost(state);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(_trigger, opts.debounceMs);
    }

    function onKeyDown(e) {
      if (!state.activeSuggestion) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        // Annehmen: append to el's value
        const newValue = _getValue(el) + state.activeSuggestion;
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          el.value = newValue;
        } else if (el.isContentEditable) {
          el.innerText = newValue;
        }
        _hideGhost(state);
        // Trigger native input-Event fuer downstream-Listener (z.B. auto-save)
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (e.key === 'Escape') {
        _hideGhost(state);
      }
    }

    function onBlur() {
      _hideGhost(state);
    }

    el.addEventListener('input', onInput);
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('blur', onBlur);

    state.handlers = { onInput, onKeyDown, onBlur };
    state.cleanup = function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (abortController) abortController.abort();
    };
  }

  function detach(el) {
    if (!el) return;
    const state = _state.get(el);
    if (!state) return;

    if (state.cleanup) state.cleanup();

    el.removeEventListener('input', state.handlers.onInput);
    el.removeEventListener('keydown', state.handlers.onKeyDown);
    el.removeEventListener('blur', state.handlers.onBlur);

    // Wrapper-DOM-Cleanup: el zurueck zum parent, wrapper raus
    if (state.wrapper && state.wrapper.parentNode) {
      state.wrapper.parentNode.insertBefore(el, state.wrapper);
      state.wrapper.parentNode.removeChild(state.wrapper);
    }
    _state.delete(el);
  }

  function setEnabled(enabled, prefKey) {
    prefKey = prefKey || 'ki_autosuggest_enabled';
    try {
      localStorage.setItem(prefKey, enabled ? '1' : '0');
    } catch (_) {}
  }

  function isEnabled(prefKey) {
    return _isEnabled(prefKey || 'ki_autosuggest_enabled');
  }

  // Public API
  window.ProvaAutosuggest = {
    attach: attach,
    detach: detach,
    setEnabled: setEnabled,
    isEnabled: isEnabled
  };

  // Test-Exports
  window.ProvaAutosuggest._test = {
    _esc: _esc,
    _isEnabled: _isEnabled,
    _getValue: _getValue
  };
})();
