/* ═══════════════════════════════════════════════════════════════════
   PROVA DOPPELKLICK-SCHUTZ — prova-click-guard.js (Session 7)
   ═══════════════════════════════════════════════════════════════════
   
   ZWECK
   Verhindert dass ungeduldige User durch Doppelklicks doppelte Records
   in Airtable erzeugen oder doppelte OpenAI-Calls auslösen.
   
   NUTZUNG (3 Varianten)
   ────────────────────
   
   Variante A — Wrapper um async-Funktion:
     async function weiterZuAnalyse() { ... }
     window.weiterZuAnalyse = ProvaClickGuard.wrap('weiterZuAnalyse', weiterZuAnalyse);
   
   Variante B — Inline-Guard mit Button-Lock:
     btn.addEventListener('click', ProvaClickGuard.forButton(btn, async () => {
       await doWork();
     }));
   
   Variante C — Manuelle Kontrolle:
     if (ProvaClickGuard.isBusy('speichern')) return;
     ProvaClickGuard.setBusy('speichern', true);
     try { await doWork(); }
     finally { ProvaClickGuard.setBusy('speichern', false); }
   
   Die Guard-Keys sind frei wählbare Strings (empfohlen: Action-Name).
   ═══════════════════════════════════════════════════════════════════ */

(function(global) {
  'use strict';

  // Interner State — welche Aktionen sind gerade am Laufen?
  const _busy = new Set();
  
  // Default Cooldown (ms) nach Ende einer Aktion — verhindert Rapid-Retry
  const DEFAULT_COOLDOWN = 500;
  const _cooldowns = new Map();  // key → Date.now() wann wieder erlaubt

  function isBusy(key) {
    if (_busy.has(key)) return true;
    const cooldownUntil = _cooldowns.get(key);
    if (cooldownUntil && Date.now() < cooldownUntil) return true;
    return false;
  }

  function setBusy(key, busy, cooldownMs) {
    if (busy) {
      _busy.add(key);
    } else {
      _busy.delete(key);
      _cooldowns.set(key, Date.now() + (cooldownMs || DEFAULT_COOLDOWN));
    }
  }

  /**
   * Variante A: Wrapper um async-Funktion. Ruft die Funktion nur einmal pro
   * Cooldown-Fenster. Zweiter Aufruf gibt Promise mit undefined zurück + loggt.
   */
  function wrap(key, asyncFn, cooldownMs) {
    return async function(...args) {
      if (isBusy(key)) {
        console.log('[ProvaClickGuard] "' + key + '" läuft bereits — Call ignoriert.');
        return undefined;
      }
      setBusy(key, true);
      try {
        return await asyncFn.apply(this, args);
      } finally {
        setBusy(key, false, cooldownMs);
      }
    };
  }

  /**
   * Variante B: Button-zentriert. Setzt Button disabled während der Ausführung,
   * verhindert parallele Calls UND gibt visuelles Feedback.
   */
  function forButton(btn, asyncFn, opts) {
    opts = opts || {};
    const key = opts.key || (btn && btn.id) || 'anon-' + Date.now();
    const cooldownMs = opts.cooldownMs || DEFAULT_COOLDOWN;
    const loadingText = opts.loadingText || null;
    let origText = null;

    return async function(evt) {
      if (isBusy(key)) {
        if (evt && evt.preventDefault) evt.preventDefault();
        return;
      }
      setBusy(key, true);

      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        if (loadingText) {
          origText = btn.textContent;
          btn.textContent = loadingText;
        }
      }

      try {
        return await asyncFn.call(btn, evt);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
          if (origText !== null) btn.textContent = origText;
        }
        setBusy(key, false, cooldownMs);
      }
    };
  }

  /**
   * Mass-Apply: Alle Buttons mit data-click-guard werden automatisch
   * geschützt. Praktisch für bestehende HTML-Files.
   * 
   * <button data-click-guard data-guard-key="speichern" onclick="speichern()">
   */
  function attachToDataButtons() {
    document.querySelectorAll('[data-click-guard]').forEach(btn => {
      if (btn._guardAttached) return;
      btn._guardAttached = true;

      const key = btn.getAttribute('data-guard-key') || btn.id || 'btn-' + Math.random();
      const origOnclick = btn.onclick;
      if (!origOnclick) return;

      btn.onclick = forButton(btn, async function(evt) {
        return await origOnclick.call(btn, evt);
      }, { key });
    });
  }

  global.ProvaClickGuard = {
    wrap: wrap,
    forButton: forButton,
    isBusy: isBusy,
    setBusy: setBusy,
    attachToDataButtons: attachToDataButtons,
    _state: { busy: _busy, cooldowns: _cooldowns }  // für Debug
  };

  // Auto-attach bei DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachToDataButtons);
    } else {
      attachToDataButtons();
    }
  }

})(typeof window !== 'undefined' ? window : this);
