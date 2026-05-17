/**
 * PROVA Audit-Source-Tracker (MEGA⁴¹ P2)
 *
 * Frontend-Helper für KI-vs-SV-Source-Tracking.
 * Wraps DOM-Inserts mit data-ai-generated-Markup für EU AI Act Art. 50 Compliance.
 *
 * Public API (window.ProvaAuditSourceTracker):
 *   wrapKiContent(text, kiCallId, model) → HTMLString mit data-ai-generated="true"
 *   isAiGenerated(node) → boolean
 *   markSvUebernommen(elem, kiCallId) — bei "KI-Vorschlag übernommen"-Klick
 *   getAiContentSummary(rootEl) → {ai_count, total_count, ai_quote}
 *
 * EU AI Act-konform:
 *   - Maschinenlesbar: data-ai-generated="true" + data-ai-model="..."
 *   - Sichtbar: CSS-Pseudo-Element ::before mit 🤖 (subtil)
 */
'use strict';

(function () {

  const AI_DATA_ATTR = 'data-ai-generated';
  const AI_MODEL_ATTR = 'data-ai-model';
  const AI_CALL_REF_ATTR = 'data-ai-call-ref';
  const STYLE_ID = 'prova-audit-source-tracker-style';

  function _injectStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '[data-ai-generated="true"]{position:relative;background:rgba(167,139,250,0.06);border-bottom:1px dashed rgba(167,139,250,0.3);padding-right:14px;}\n' +
      '[data-ai-generated="true"]::after{content:"🤖";font-size:0.7em;opacity:0.55;margin-left:2px;cursor:help;}\n' +
      '[data-ai-generated="true"][data-sv-uebernommen="true"]{background:rgba(16,185,129,0.06);border-bottom:1px dashed rgba(16,185,129,0.3);}\n' +
      '[data-ai-generated="true"][data-sv-uebernommen="true"]::after{content:"✓";color:#10b981;}\n' +
      '@media print { [data-ai-generated="true"]::after { content:" [KI]"; font-size:0.7em; color:#666; } }';
    document.head.appendChild(s);
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Wrap KI-generated text in span mit Markup.
   *
   * @param {string} text — KI-Output
   * @param {string} kiCallId — UUID des audit_trail-Eintrags (für sv_uebernommen-Reference)
   * @param {string} model — 'gpt-5.5' / 'gpt-5.5-instant'
   * @returns {string} HTML
   */
  function wrapKiContent(text, kiCallId, model) {
    _injectStyle();
    return '<span ' + AI_DATA_ATTR + '="true" ' +
           AI_MODEL_ATTR + '="' + _esc(model || 'gpt-5.5') + '" ' +
           AI_CALL_REF_ATTR + '="' + _esc(kiCallId || '') + '" ' +
           'title="KI-generiert (EU AI Act Art. 50 Disclosure)">' +
           _esc(text) + '</span>';
  }

  function isAiGenerated(node) {
    if (!node || typeof node.getAttribute !== 'function') return false;
    return node.getAttribute(AI_DATA_ATTR) === 'true';
  }

  /**
   * Markiere ein Element als sv_uebernommen (KI-Vorschlag akzeptiert).
   * Triggert backend-Audit-Eintrag mit source='sv_uebernommen'.
   *
   * @param {Element} elem
   * @param {string} kiCallId
   */
  function markSvUebernommen(elem, kiCallId) {
    if (!elem || !kiCallId) return;
    elem.setAttribute('data-sv-uebernommen', 'true');
    elem.setAttribute(AI_CALL_REF_ATTR, kiCallId);
    // Trigger backend log via fetch
    // MEGA86 Block B: Migration audit-source-log → audit-log-v1 (task=generic)
    if (typeof fetch === 'function') {
      try {
        const supabaseUrl = (window.PROVA_CONFIG && window.PROVA_CONFIG.SUPABASE_URL) || 'https://cngteblrbpwsyypexjrv.supabase.co';
        const anonKey    = (window.PROVA_CONFIG && window.PROVA_CONFIG.SUPABASE_ANON_KEY) || '';
        const jwt        = localStorage.getItem('prova_auth_token') || '';
        fetch(supabaseUrl + '/functions/v1/audit-log-v1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': 'Bearer ' + jwt },
          body: JSON.stringify({
            task: 'generic',
            action: 'update',
            entity_typ: elem.dataset.entityTyp || 'fragment',
            entity_id: elem.dataset.entityId || null,
            source: 'audit-source-tracker',
            kategorie: 'KI',
            payload: { sv_uebernommen: true, original_ki_ref: kiCallId }
          })
        }).catch(() => {});
      } catch (_) {}
    }
  }

  /**
   * Berechne KI-Anteil in einem DOM-Subtree.
   *
   * @param {Element} rootEl
   * @returns {{ai_count, total_count, ai_quote}}
   */
  function getAiContentSummary(rootEl) {
    if (!rootEl || typeof rootEl.querySelectorAll !== 'function') {
      return { ai_count: 0, total_count: 0, ai_quote: 0 };
    }
    const aiNodes = rootEl.querySelectorAll('[' + AI_DATA_ATTR + '="true"]');
    let aiChars = 0;
    aiNodes.forEach(n => { aiChars += (n.textContent || '').length; });
    const totalChars = (rootEl.textContent || '').length;
    return {
      ai_count: aiNodes.length,
      total_count: totalChars,
      ai_chars: aiChars,
      ai_quote: totalChars > 0 ? aiChars / totalChars : 0
    };
  }

  // Public API
  const api = {
    wrapKiContent: wrapKiContent,
    isAiGenerated: isAiGenerated,
    markSvUebernommen: markSvUebernommen,
    getAiContentSummary: getAiContentSummary,
    AI_DATA_ATTR: AI_DATA_ATTR,
    AI_MODEL_ATTR: AI_MODEL_ATTR,
    AI_CALL_REF_ATTR: AI_CALL_REF_ATTR,
    _esc: _esc
  };

  if (typeof window !== 'undefined') {
    window.ProvaAuditSourceTracker = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
