/**
 * PROVA Systems — Cancellation-Survey-Modal v1.0
 * MEGA⁷ U4 (04.05.2026)
 *
 * Drop-In-Modal fuer einstellungen.html → vor Stripe-Customer-Portal-Kuendigung.
 *
 * Public API:
 *   ProvaCancellationSurvey.show({ onSubmit?: () => void, onSkip?: () => void })
 */
'use strict';

(function () {
  const REASONS = [
    { value: 'too_expensive',     label: '💸 Zu teuer fuer mein Buero' },
    { value: 'missing_feature',   label: '🧩 Wichtige Features fehlen' },
    { value: 'low_quality',       label: '🐛 Qualitaet/Bugs' },
    { value: 'switched_service',  label: '🔄 Wechsel zu anderem Tool' },
    { value: 'unused',            label: '⏸ Habe es kaum genutzt' },
    { value: 'too_complex',       label: '🤯 Zu komplex/unintuitiv' },
    { value: 'customer_service',  label: '🤝 Support-Erfahrung' },
    { value: 'other',             label: '✏ Anderer Grund' }
  ];

  function buildModal() {
    const overlay = document.createElement('div');
    overlay.id = 'prova-cancel-survey-modal';
    overlay.style.cssText = [
      'position:fixed', 'inset:0',
      'background:rgba(0,0,0,0.7)',
      'z-index:10000',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:20px',
      'opacity:0',
      'transition:opacity 0.25s ease'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:#1c2537', 'color:#e8eaf0',
      'border:1px solid rgba(255,255,255,0.12)',
      'border-radius:16px',
      'padding:24px 28px',
      'max-width:520px', 'width:100%',
      'max-height:90vh', 'overflow-y:auto',
      'box-shadow:0 20px 60px rgba(0,0,0,0.5)',
      'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif'
    ].join(';');

    card.innerHTML = (
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">'
        + '<div>'
          + '<h2 style="font-size:20px;font-weight:700;margin:0 0 4px;color:#e8eaf0;letter-spacing:-0.01em">Kuendigung</h2>'
          + '<p style="font-size:13px;color:#aab4cb;margin:0">Wir werden ehrliches Feedback sehr schaetzen — hilft uns PROVA besser zu machen.</p>'
        + '</div>'
        + '<button id="cs-close" style="background:none;border:none;color:#6b7a99;font-size:22px;cursor:pointer;line-height:1;padding:0">×</button>'
      + '</div>'
      + '<form id="cs-form">'
        + '<div style="margin-bottom:18px">'
          + '<label style="display:block;font-size:12px;font-weight:700;color:#aab4cb;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Wesentlicher Grund:</label>'
          + '<div id="cs-reasons" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px"></div>'
        + '</div>'
        + '<div style="margin-bottom:14px">'
          + '<label style="display:block;font-size:12px;font-weight:700;color:#aab4cb;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Was haetten wir besser machen koennen? <span style="font-weight:400;text-transform:none">(optional, max 2000 Z.)</span></label>'
          + '<textarea id="cs-feedback" maxlength="2000" rows="4" style="width:100%;padding:10px 12px;background:#161f30;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#e8eaf0;font-size:13px;font-family:inherit;resize:vertical" placeholder="ehrliches Feedback ist Gold ❤"></textarea>'
        + '</div>'
        + '<div style="margin-bottom:14px">'
          + '<label style="display:block;font-size:12px;font-weight:700;color:#aab4cb;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Welches Feature haette dich gehalten? <span style="font-weight:400;text-transform:none">(optional)</span></label>'
          + '<input id="cs-feature" maxlength="500" type="text" style="width:100%;padding:10px 12px;background:#161f30;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#e8eaf0;font-size:13px;font-family:inherit" placeholder="z.B. Diktat-Korrektur in Echtzeit">'
        + '</div>'
        + '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#aab4cb;margin-bottom:18px;cursor:pointer">'
          + '<input id="cs-recommend" type="checkbox" style="width:16px;height:16px;cursor:pointer">'
          + 'Wuerde PROVA trotzdem an Kollegen empfehlen'
        + '</label>'
        + '<div id="cs-error" style="display:none;color:#ef4444;font-size:13px;margin-bottom:10px"></div>'
        + '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'
          + '<button type="button" id="cs-skip" style="padding:11px 20px;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#aab4cb;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Ohne Feedback</button>'
          + '<button type="submit" id="cs-submit" style="padding:11px 24px;background:linear-gradient(135deg,#4f8ef7,#3a7be0);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Senden + Kuendigung fortsetzen</button>'
        + '</div>'
      + '</form>'
    );

    overlay.appendChild(card);
    return overlay;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  }

  function renderReasons(target, selected) {
    target.innerHTML = '';
    REASONS.forEach(r => {
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;background:#161f30;border:1px solid rgba(255,255,255,0.08);border-radius:8px;cursor:pointer;font-size:13px;color:#e8eaf0;font-weight:500;transition:border-color 0.15s';
      if (selected === r.value) {
        lbl.style.borderColor = '#4f8ef7';
        lbl.style.background = 'rgba(79,142,247,0.08)';
      }
      lbl.innerHTML = '<input type="radio" name="cs-reason" value="' + escapeHtml(r.value) + '" style="margin:0">' + escapeHtml(r.label);
      lbl.addEventListener('click', () => {
        renderReasons(target, r.value);
      });
      target.appendChild(lbl);
    });
  }

  function show(opts) {
    opts = opts || {};
    const existing = document.getElementById('prova-cancel-survey-modal');
    if (existing) existing.remove();

    const modal = buildModal();
    document.body.appendChild(modal);
    requestAnimationFrame(() => { modal.style.opacity = '1'; });

    const reasonsEl = modal.querySelector('#cs-reasons');
    renderReasons(reasonsEl);

    function close() {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 250);
    }

    modal.querySelector('#cs-close').addEventListener('click', close);
    modal.querySelector('#cs-skip').addEventListener('click', () => {
      close();
      if (opts.onSkip) opts.onSkip();
    });

    modal.querySelector('#cs-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const reason = (modal.querySelector('input[name="cs-reason"]:checked') || {}).value;
      if (!reason) {
        const err = modal.querySelector('#cs-error');
        err.textContent = 'Bitte einen Grund auswaehlen.';
        err.style.display = 'block';
        return;
      }
      const submitBtn = modal.querySelector('#cs-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sende…';

      const payload = {
        cancellation_reason: reason,
        feedback: modal.querySelector('#cs-feedback').value || undefined,
        feature_request: modal.querySelector('#cs-feature').value || undefined,
        recommend_anyway: modal.querySelector('#cs-recommend').checked
      };

      try {
        const token = localStorage.getItem('prova_jwt') || localStorage.getItem('supabase.auth.token') || '';
        const res = await fetch('/.netlify/functions/cancellation-survey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? 'Bearer ' + token : '' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = modal.querySelector('#cs-error');
          err.textContent = j.error || 'Fehler beim Senden.';
          err.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Senden + Kuendigung fortsetzen';
          return;
        }
        close();
        if (opts.onSubmit) opts.onSubmit(j);
      } catch (e) {
        const err = modal.querySelector('#cs-error');
        err.textContent = 'Netzwerk-Fehler: ' + e.message;
        err.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Senden + Kuendigung fortsetzen';
      }
    });
  }

  window.ProvaCancellationSurvey = { show: show };
})();
