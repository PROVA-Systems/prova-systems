/**
 * PROVA — referral-redemption.js (MEGA²⁷)
 *
 * Pricing-Page-Integration: erkennt /r/{CODE}-URL, validiert via Lambda,
 * zeigt Banner mit Werber-Name + Discount.
 *
 * Public API:
 *   ProvaReferralRedemption.detectCodeFromUrl(url) → { code, found:bool }
 *   ProvaReferralRedemption.validate(code) → Promise<{valid, ...}>
 *   ProvaReferralRedemption.renderBanner(opts) → HTML-string
 *   ProvaReferralRedemption.attach(targetEl) → void (auto-detects + renders)
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.ProvaReferralRedemption = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {

  const CODE_REGEX = /^PROVA-FRIEND-[A-Z]{1,4}-[A-Z2-9]{6}$/;

  function _esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Detect Code aus URL-Patterns:
   *   /r/PROVA-FRIEND-XX-Y6
   *   ?ref=PROVA-FRIEND-XX-Y6
   *   #ref=PROVA-FRIEND-XX-Y6
   *
   * @param {string} url — z.B. window.location.href
   * @returns {{found:boolean, code?:string, source?:string}}
   */
  function detectCodeFromUrl(url) {
    if (!url || typeof url !== 'string') return { found: false };
    // Path-Pattern: /r/CODE
    const pathMatch = url.match(/\/r\/([A-Z0-9-]{12,40})(?:[?#/]|$)/i);
    if (pathMatch && CODE_REGEX.test(pathMatch[1].toUpperCase())) {
      return { found: true, code: pathMatch[1].toUpperCase(), source: 'path' };
    }
    // Query-Pattern: ?ref=CODE oder ?code=CODE
    const qMatch = url.match(/[?&](?:ref|code)=([A-Z0-9-]{12,40})/i);
    if (qMatch && CODE_REGEX.test(qMatch[1].toUpperCase())) {
      return { found: true, code: qMatch[1].toUpperCase(), source: 'query' };
    }
    return { found: false };
  }

  /**
   * Validate Code via Lambda.
   */
  function validate(code, fetchImpl) {
    const f = fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!f) return Promise.reject(new Error('fetch not available'));
    if (!code || !CODE_REGEX.test(code)) {
      return Promise.resolve({ valid: false, error: 'Code-Format ungueltig' });
    }
    return f('/.netlify/functions/redeem-referral-code?code=' + encodeURIComponent(code))
      .then(r => r.json());
  }

  /**
   * Render Banner-HTML.
   * @param {object} data — Lambda-Response
   * @returns {string}
   */
  function renderBanner(data) {
    if (!data || !data.valid) {
      const err = (data && data.error) || 'Code nicht gueltig';
      return '<div role="alert" class="prova-referral-banner-invalid" style="padding:12px 18px;background:rgba(245,158,11,0.10);border:1px solid rgba(245,158,11,0.35);border-radius:10px;font-size:13px;color:#92400e;">'
        + '⚠ ' + _esc(err) + '</div>';
    }
    const referrerName = _esc(data.referrer_name || 'Ein PROVA-Member');
    const discount = Number(data.discount_amount || 50);
    const code = _esc(data.code || '');
    const expiresInHours = Number(data.expires_in_hours || 0);
    const expiresStr = expiresInHours >= 24
      ? Math.floor(expiresInHours / 24) + ' Tage'
      : expiresInHours + ' Stunden';

    return '<div role="region" aria-label="Empfehlungs-Code aktiv" class="prova-referral-banner" style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#fff;padding:18px 22px;border-radius:12px;margin-bottom:18px;box-shadow:0 8px 24px rgba(30,58,138,0.25);">'
      + '<div style="font-size:16px;font-weight:700;margin-bottom:6px;">🎉 ' + referrerName + ' hat dich empfohlen!</div>'
      + '<div style="font-size:14px;line-height:1.5;color:rgba(255,255,255,0.92);margin-bottom:10px;">'
      + 'Dein Vorteil: <strong>' + discount + ' € Rabatt</strong> im 1. Monat (gilt für Solo-Plan)'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
      + '<code class="prova-referral-code-display" style="background:rgba(255,255,255,0.18);padding:8px 14px;border-radius:8px;font-family:ui-monospace,monospace;font-size:14px;font-weight:600;letter-spacing:0.05em;">' + code + '</code>'
      + '<button type="button" class="prova-referral-copy-btn" data-code="' + code + '" aria-label="Code kopieren" style="background:rgba(255,255,255,0.95);color:#1e3a8a;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;min-height:36px;">📋 Kopieren</button>'
      + '<span style="font-size:12px;color:rgba(255,255,255,0.78);">⏰ ' + expiresStr + ' gueltig</span>'
      + '</div>'
      + '</div>';
  }

  /**
   * Browser-only: erkennt URL, validiert, rendert in targetEl.
   */
  function attach(targetEl, opts) {
    if (typeof window === 'undefined') return;
    if (!targetEl || typeof targetEl.querySelector !== 'function') return;
    opts = opts || {};
    const url = opts.url || window.location.href;
    const det = detectCodeFromUrl(url);
    if (!det.found) return;

    targetEl.innerHTML = '<div style="padding:12px 18px;font-size:13px;color:#64748b;font-style:italic;">⏳ Empfehlungs-Code wird geprueft…</div>';

    validate(det.code).then(data => {
      targetEl.innerHTML = renderBanner(data);
      // Copy-Button-Wiring
      const copyBtn = targetEl.querySelector('.prova-referral-copy-btn');
      if (copyBtn && typeof navigator !== 'undefined' && navigator.clipboard) {
        copyBtn.addEventListener('click', function () {
          navigator.clipboard.writeText(det.code).then(() => {
            copyBtn.textContent = '✅ Kopiert';
            setTimeout(() => { copyBtn.textContent = '📋 Kopieren'; }, 2000);
          }).catch(() => {});
        });
      }
      // localStorage fuer Stripe-Checkout-Auto-Apply
      if (data && data.valid && data.code) {
        try { localStorage.setItem('prova_referral_code', data.code); } catch (_) {}
        if (typeof opts.onValid === 'function') opts.onValid(data);
      }
    }).catch(err => {
      targetEl.innerHTML = renderBanner({ valid: false, error: err.message || 'Validation fehlgeschlagen' });
    });
  }

  return {
    detectCodeFromUrl,
    validate,
    renderBanner,
    attach,
    _const: { CODE_REGEX }
  };
});
