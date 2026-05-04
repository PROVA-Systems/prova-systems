/**
 * PROVA KI-Fallback-Badge
 * MEGA¹² W12 (Tier 5a, 2026-05-05)
 *
 * Zeigt einen 🛡️ "Backup-KI"-Badge wenn KI-Response von Anthropic-Fallback
 * statt OpenAI kam.
 *
 * Aufruf wenn Response von /netlify/functions/ki-proxy zurueckkommt:
 *   if (data._fallback) ProvaKIFallbackBadge.render(container);
 *
 * Public API:
 *   ProvaKIFallbackBadge.render(container)
 *   ProvaKIFallbackBadge.remove(container)
 *   ProvaKIFallbackBadge.applyToResponse(response, container)  — Convenience
 *
 * Anti-Pattern vermieden:
 *   - Kein eigener CSS-File (Style-inject)
 *   - Kein Modal/Toast (zu auffaellig fuer transparente Info)
 *   - Subtle UI: User sieht "ist OK, KI laeuft" — nur informativ
 */
'use strict';

(function () {

  const STYLE_ID = 'prova-ki-fallback-badge-style';
  const BADGE_CLASS = 'prova-ki-fallback-badge';

  function _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${BADGE_CLASS} {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        background: rgba(245, 158, 11, 0.12);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        cursor: help;
        margin-left: 8px;
        vertical-align: middle;
      }
      .${BADGE_CLASS}:focus { outline: 2px solid #f59e0b; outline-offset: 2px; }
    `;
    document.head.appendChild(style);
  }

  function render(container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return null;

    _injectStyle();

    // Re-Render: bestehenden Badge entfernen falls schon da (idempotent)
    remove(container);

    const badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.setAttribute('role', 'note');
    badge.setAttribute('tabindex', '0');
    badge.title = 'OpenAI war nicht erreichbar — Anthropic Claude wurde stattdessen genutzt. Inhaltlich gleichwertig, kann aber leicht abweichen.';
    badge.setAttribute('aria-label', 'Backup-KI aktiv (Anthropic statt OpenAI)');
    badge.innerHTML = '<span aria-hidden="true">🛡️</span><span>Backup-KI</span>';

    container.appendChild(badge);
    return badge;
  }

  function remove(container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    const existing = container.querySelector('.' + BADGE_CLASS);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  /**
   * Convenience: prueft response._fallback und setzt Badge automatisch.
   *
   * @param {object} response  KI-Response vom Backend
   * @param {HTMLElement|string} container
   * @returns {boolean} true wenn Badge gerendert wurde
   */
  function applyToResponse(response, container) {
    if (response && response._fallback === true) {
      render(container);
      return true;
    }
    remove(container);
    return false;
  }

  // Public API
  window.ProvaKIFallbackBadge = {
    render: render,
    remove: remove,
    applyToResponse: applyToResponse
  };

  // Test-Exports
  window.ProvaKIFallbackBadge._test = {
    BADGE_CLASS: BADGE_CLASS,
    STYLE_ID: STYLE_ID
  };
})();
