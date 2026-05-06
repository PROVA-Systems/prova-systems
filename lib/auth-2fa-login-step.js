/**
 * PROVA — Auth-2FA-Login-Step (MEGA³² W11-I3)
 *
 * Modal-Widget: zeigt 2FA-Code-Input nach erfolgreichem Email/Password-Login.
 * Activated wenn user.totp_enabled=true.
 *
 * Public API:
 *   ProvaAuth2FALoginStep.show({ onSuccess: fn, onCancel: fn })
 *   ProvaAuth2FALoginStep.isRequired() // boolean — checkt localStorage prova_totp_required
 */
'use strict';

(function () {
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function ensureStyles() {
    if (document.getElementById('a2fa-login-styles')) return;
    const s = document.createElement('style');
    s.id = 'a2fa-login-styles';
    s.textContent = `
      .a2fa-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);}
      .a2fa-modal{background:#1c2130;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:28px;max-width:400px;width:100%;color:#eaecf4;font-family:'DM Sans',system-ui,sans-serif;}
      .a2fa-modal h2{font-size:18px;font-weight:700;margin-bottom:8px;}
      .a2fa-modal p{font-size:13px;color:#8b93ab;margin-bottom:20px;line-height:1.5;}
      .a2fa-input-big{width:100%;padding:14px 16px;background:#0b0d11;border:1px solid rgba(255,255,255,.11);border-radius:8px;color:#eaecf4;font-size:18px;font-family:ui-monospace,Consolas,monospace;letter-spacing:0.4em;text-align:center;margin-bottom:14px;}
      .a2fa-input-big:focus{outline:none;border-color:#4f8ef7;}
      .a2fa-modal-btn{width:100%;padding:12px;background:linear-gradient(135deg,#4f8ef7,#3a7be0);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}
      .a2fa-modal-btn:hover{opacity:.9;}
      .a2fa-modal-btn:disabled{opacity:.5;cursor:not-allowed;}
      .a2fa-link{display:block;margin-top:14px;text-align:center;font-size:12px;color:#4f8ef7;text-decoration:none;cursor:pointer;}
      .a2fa-link:hover{text-decoration:underline;}
      .a2fa-msg{font-size:12px;text-align:center;margin-top:10px;min-height:18px;}
      .a2fa-msg.error{color:#ef4444;}
      .a2fa-msg.success{color:#10b981;}
    `;
    document.head.appendChild(s);
  }

  let recoveryMode = false;
  let onSuccessCb = null;
  let onCancelCb = null;
  let modalEl = null;

  function buildModal() {
    const div = document.createElement('div');
    div.className = 'a2fa-overlay';
    div.id = 'a2fa-login-overlay';
    div.innerHTML = `
      <div class="a2fa-modal" role="dialog" aria-label="Zwei-Faktor-Authentifizierung">
        <h2 id="a2fa-h2">🔐 Zwei-Faktor-Code</h2>
        <p id="a2fa-p">Gib den 6-stelligen Code aus deiner Authenticator-App ein.</p>
        <input type="text" class="a2fa-input-big" id="a2fa-login-code" maxlength="6" placeholder="000000" inputmode="numeric" autocomplete="one-time-code" autofocus>
        <button class="a2fa-modal-btn" type="button" id="a2fa-submit">Bestätigen</button>
        <a class="a2fa-link" id="a2fa-toggle">Recovery-Code verwenden →</a>
        <div class="a2fa-msg" id="a2fa-login-msg"></div>
      </div>
    `;
    return div;
  }

  function toggleMode() {
    recoveryMode = !recoveryMode;
    const inp = document.getElementById('a2fa-login-code');
    const h2 = document.getElementById('a2fa-h2');
    const p = document.getElementById('a2fa-p');
    const toggle = document.getElementById('a2fa-toggle');
    if (recoveryMode) {
      h2.textContent = '🔑 Recovery-Code';
      p.textContent = 'Gib einen deiner Recovery-Codes ein (Format: XXXX-XXXX). Jeder Code ist einmalig nutzbar.';
      inp.maxLength = 9;
      inp.placeholder = 'XXXX-XXXX';
      inp.style.letterSpacing = '0.2em';
      toggle.textContent = '← Zurück zum 6-stelligen Code';
    } else {
      h2.textContent = '🔐 Zwei-Faktor-Code';
      p.textContent = 'Gib den 6-stelligen Code aus deiner Authenticator-App ein.';
      inp.maxLength = 6;
      inp.placeholder = '000000';
      inp.style.letterSpacing = '0.4em';
      toggle.textContent = 'Recovery-Code verwenden →';
    }
    inp.value = '';
    inp.focus();
  }

  async function submit() {
    const inp = document.getElementById('a2fa-login-code');
    const msg = document.getElementById('a2fa-login-msg');
    const btn = document.getElementById('a2fa-submit');
    const raw = (inp.value || '').trim().toUpperCase();
    if (recoveryMode) {
      // Format XXXX-XXXX
      if (!/^[A-F0-9]{4}-?[A-F0-9]{4}$/i.test(raw)) {
        msg.className = 'a2fa-msg error'; msg.textContent = 'Format: XXXX-XXXX (8 Hex-Zeichen)';
        return;
      }
    } else {
      if (!/^\d{6}$/.test(raw)) {
        msg.className = 'a2fa-msg error'; msg.textContent = '6 Ziffern erforderlich.';
        return;
      }
    }
    btn.disabled = true;
    msg.className = 'a2fa-msg'; msg.textContent = 'Verifiziere…';
    try {
      const fetcher = window.provaFetch || window.fetch.bind(window);
      const body = recoveryMode ? { recovery_code: raw.includes('-') ? raw : (raw.slice(0,4) + '-' + raw.slice(4)) } : { code: raw };
      const res = await fetcher('/.netlify/functions/auth-2fa-verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        msg.className = 'a2fa-msg error'; msg.textContent = data.error || 'Code ungültig.';
        btn.disabled = false; return;
      }
      msg.className = 'a2fa-msg success'; msg.textContent = '✅ Verifiziert.';
      try { localStorage.setItem('prova_totp_required', 'false'); } catch (e) {}
      if (data.warning) {
        // Recovery-Codes-Warnung anzeigen via Alert (Setup-Tab schicken)
        setTimeout(() => alert(data.warning), 100);
      }
      setTimeout(() => {
        hide();
        if (onSuccessCb) onSuccessCb(data);
      }, 800);
    } catch (e) {
      msg.className = 'a2fa-msg error'; msg.textContent = 'Fehler: ' + e.message;
      btn.disabled = false;
    }
  }

  function show(opts) {
    opts = opts || {};
    onSuccessCb = opts.onSuccess || null;
    onCancelCb = opts.onCancel || null;
    ensureStyles();
    if (!modalEl) {
      modalEl = buildModal();
      document.body.appendChild(modalEl);
      const inp = document.getElementById('a2fa-login-code');
      const btn = document.getElementById('a2fa-submit');
      btn.addEventListener('click', submit);
      document.getElementById('a2fa-toggle').addEventListener('click', toggleMode);
      // Auto-Submit bei 6 Ziffern
      inp.addEventListener('input', () => {
        const v = inp.value;
        if (!recoveryMode && /^\d{6}$/.test(v)) submit();
      });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    } else {
      modalEl.style.display = 'flex';
    }
    setTimeout(() => {
      const inp = document.getElementById('a2fa-login-code');
      if (inp) inp.focus();
    }, 50);
  }

  function hide() {
    if (modalEl) modalEl.style.display = 'none';
  }

  function isRequired() {
    try { return localStorage.getItem('prova_totp_required') === 'true'; } catch (e) { return false; }
  }

  window.ProvaAuth2FALoginStep = { show, hide, isRequired, _internals: { escHtml } };

  if (typeof module !== 'undefined' && module.exports) module.exports = window.ProvaAuth2FALoginStep;
}());
