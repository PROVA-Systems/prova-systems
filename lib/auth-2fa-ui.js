/**
 * PROVA — Auth-2FA-UI (MEGA³² W11-I3)
 *
 * Setup + Verify + Recovery-Code-Flow für einstellungen.html.
 * Login-Step wird via auth-2fa-login-step.js bereitgestellt.
 *
 * Usage:
 *   <div data-auth-2fa-settings></div>
 *   <script src="/lib/auth-2fa-ui.js" defer></script>
 *
 * Backend: auth-2fa-setup.js, auth-2fa-verify.js, auth-2fa-disable.js
 */
'use strict';

(function () {
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function ensureStyles() {
    if (document.getElementById('a2fa-styles')) return;
    const s = document.createElement('style');
    s.id = 'a2fa-styles';
    s.textContent = `
      .a2fa-card{background:var(--surface,#1c2130);border:1px solid var(--border,rgba(255,255,255,.06));border-radius:12px;padding:18px 20px;margin-bottom:14px;}
      .a2fa-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
      .a2fa-title{font-size:14px;font-weight:700;}
      .a2fa-status{font-size:11px;font-weight:700;padding:3px 9px;border-radius:8px;}
      .a2fa-status.on{background:rgba(16,185,129,.16);color:#10b981;}
      .a2fa-status.off{background:rgba(239,68,68,.16);color:#ef4444;}
      .a2fa-desc{font-size:12px;color:var(--text2,#8b93ab);margin-bottom:14px;}
      .a2fa-btn{padding:9px 16px;background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}
      .a2fa-btn:hover{opacity:.9;}
      .a2fa-btn-ghost{padding:9px 16px;background:transparent;border:1px solid var(--border2,rgba(255,255,255,.11));color:var(--text2,#8b93ab);border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;}
      .a2fa-btn-danger{padding:9px 16px;background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.24);border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
      .a2fa-input{padding:10px 12px;background:var(--bg,#0b0d11);border:1px solid var(--border2,rgba(255,255,255,.11));border-radius:8px;color:var(--text,#eaecf4);font-size:14px;font-family:ui-monospace,Consolas,monospace;letter-spacing:0.2em;text-align:center;width:200px;}
      .a2fa-qr{display:block;margin:16px auto;padding:12px;background:#fff;border-radius:10px;width:200px;height:200px;text-align:center;}
      .a2fa-qr img{max-width:100%;max-height:100%;}
      .a2fa-secret-code{font-family:ui-monospace,Consolas,monospace;background:var(--bg,#0b0d11);padding:6px 10px;border-radius:6px;font-size:12px;letter-spacing:0.1em;color:var(--accent,#4f8ef7);user-select:all;cursor:pointer;}
      .a2fa-recovery-list{background:var(--bg,#0b0d11);padding:12px;border-radius:8px;margin:12px 0;font-family:ui-monospace,Consolas,monospace;font-size:13px;letter-spacing:0.1em;line-height:1.8;color:var(--accent,#4f8ef7);}
      .a2fa-warning{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.24);color:#f59e0b;padding:10px 12px;border-radius:8px;font-size:12px;margin:10px 0;}
      .a2fa-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.24);color:#ef4444;padding:8px 12px;border-radius:8px;font-size:12px;margin:8px 0;}
      .a2fa-success{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.24);color:#10b981;padding:10px 12px;border-radius:8px;font-size:12px;margin:8px 0;}
    `;
    document.head.appendChild(s);
  }

  // Renders a QR code from otpauth URL using Google Charts (kein NPM-Dep)
  // CLAUDE.md Regel: Vanilla-JS, keine Frameworks.
  function qrImg(otpauthUrl) {
    const url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(otpauthUrl);
    return '<img src="' + url + '" alt="QR-Code für Authenticator-App">';
  }

  function extractSecret(otpauthUrl) {
    try {
      const m = otpauthUrl.match(/[?&]secret=([A-Z0-9]+)/i);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  async function fetchJson(url, opts) {
    const fetcher = window.provaFetch || window.fetch.bind(window);
    return fetcher(url, opts);
  }

  // Check current 2FA-Status via users-API (oder localStorage cached)
  async function getCurrentStatus() {
    // Schnellster Weg: aus localStorage lesen falls vorhanden
    try {
      const cached = localStorage.getItem('prova_totp_enabled');
      if (cached !== null) return cached === 'true';
    } catch (e) {}
    return false; // Default: not enabled (Setup-Flow zeigt sich)
  }

  function setCachedStatus(enabled) {
    try { localStorage.setItem('prova_totp_enabled', enabled ? 'true' : 'false'); } catch (e) {}
  }

  async function startSetup(host) {
    host.querySelector('.a2fa-content').innerHTML = '<div class="a2fa-desc">Generiere TOTP-Geheimnis…</div>';
    try {
      const res = await fetchJson('/.netlify/functions/auth-2fa-setup', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'HTTP ' + res.status);
      }
      const data = await res.json();
      const secret = extractSecret(data.qr_url) || '—';
      const codes = data.recovery_codes || [];
      host.querySelector('.a2fa-content').innerHTML = `
        <div class="a2fa-desc">Schritt 1: QR-Code mit Authenticator-App scannen (Google Authenticator, Authy, 1Password).</div>
        <div class="a2fa-qr">${qrImg(data.qr_url)}</div>
        <div class="a2fa-desc">Manuell-Code (falls QR nicht scannbar):<br>
          <span class="a2fa-secret-code" onclick="navigator.clipboard&&navigator.clipboard.writeText('${escHtml(secret)}')">${escHtml(secret)}</span>
        </div>
        <div class="a2fa-warning"><strong>Recovery-Codes</strong> JETZT speichern — werden NICHT erneut angezeigt!
          <div class="a2fa-recovery-list">${codes.map(escHtml).join('<br>')}</div>
          <button class="a2fa-btn-ghost" type="button" onclick="window.ProvaAuth2FA._copyRecovery(${JSON.stringify(codes).replace(/"/g, '&quot;')})">📋 Codes kopieren</button>
          <button class="a2fa-btn-ghost" type="button" onclick="window.ProvaAuth2FA._downloadRecovery(${JSON.stringify(codes).replace(/"/g, '&quot;')})">⬇️ Als .txt</button>
        </div>
        <div class="a2fa-desc" style="margin-top:14px;">Schritt 2: 6-stelligen Code aus Authenticator eingeben:</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" class="a2fa-input" id="a2fa-verify-code" maxlength="6" placeholder="000000" inputmode="numeric" autocomplete="one-time-code">
          <button class="a2fa-btn" type="button" onclick="window.ProvaAuth2FA._verify()">Aktivieren</button>
        </div>
        <div id="a2fa-msg"></div>
      `;
    } catch (e) {
      host.querySelector('.a2fa-content').innerHTML = '<div class="a2fa-error">Setup-Fehler: ' + escHtml(e.message) + '</div>';
    }
  }

  async function verifyCode() {
    const inp = document.getElementById('a2fa-verify-code');
    const msg = document.getElementById('a2fa-msg');
    const code = (inp && inp.value || '').replace(/\D/g, '');
    if (code.length !== 6) { msg.innerHTML = '<div class="a2fa-error">6 Ziffern erforderlich.</div>'; return; }
    msg.innerHTML = '<div class="a2fa-desc">Verifiziere…</div>';
    try {
      const res = await fetchJson('/.netlify/functions/auth-2fa-verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) { msg.innerHTML = '<div class="a2fa-error">' + escHtml(data.error || 'Fehler') + '</div>'; return; }
      msg.innerHTML = '<div class="a2fa-success">2FA aktiviert ✅ Bei nächstem Login wird Code angefordert.</div>';
      setCachedStatus(true);
      setTimeout(() => render(document.querySelector('[data-auth-2fa-settings]')), 1500);
    } catch (e) {
      msg.innerHTML = '<div class="a2fa-error">Fehler: ' + escHtml(e.message) + '</div>';
    }
  }

  async function disable2FA(host) {
    if (!confirm('2FA wirklich deaktivieren? Damit verlierst du den zusätzlichen Schutz deines Accounts.')) return;
    try {
      const res = await fetchJson('/.netlify/functions/auth-2fa-disable', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert('Fehler: ' + (err.error || res.status));
        return;
      }
      setCachedStatus(false);
      render(host);
    } catch (e) { alert('Fehler: ' + e.message); }
  }

  function copyRecovery(codes) {
    const txt = codes.join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(txt);
    alert('Recovery-Codes in Zwischenablage kopiert.');
  }

  function downloadRecovery(codes) {
    const txt = 'PROVA Systems — Recovery-Codes (Stand ' + new Date().toISOString().slice(0, 10) + ')\n\n'
      + 'WICHTIG: Diese Codes ersetzen den TOTP-Code falls dein Smartphone verloren geht.\n'
      + 'Jeder Code ist einmalig nutzbar.\n\n'
      + codes.join('\n') + '\n';
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prova-recovery-codes-' + Date.now() + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function render(host) {
    if (!host) return;
    ensureStyles();
    host.classList.add('a2fa-card');
    const enabled = await getCurrentStatus();
    if (enabled) {
      host.innerHTML = `
        <div class="a2fa-head">
          <div class="a2fa-title">🔐 Zwei-Faktor-Authentifizierung</div>
          <div class="a2fa-status on">AKTIV</div>
        </div>
        <div class="a2fa-content">
          <div class="a2fa-desc">2FA ist aktiv. Bei jedem Login wirst du nach einem 6-stelligen Code aus deiner Authenticator-App gefragt.</div>
          <button class="a2fa-btn-danger" type="button" onclick="window.ProvaAuth2FA._disable()">2FA deaktivieren</button>
        </div>`;
    } else {
      host.innerHTML = `
        <div class="a2fa-head">
          <div class="a2fa-title">🔐 Zwei-Faktor-Authentifizierung</div>
          <div class="a2fa-status off">INAKTIV</div>
        </div>
        <div class="a2fa-content">
          <div class="a2fa-desc">Erhöhe die Sicherheit deines Accounts mit einem 6-stelligen Code aus einer Authenticator-App. Empfohlen für ö.b.u.v. Sachverständige (Mandantengeheimnis).</div>
          <button class="a2fa-btn" type="button" onclick="window.ProvaAuth2FA._startSetup()">2FA aktivieren</button>
        </div>`;
    }
    host.__currentHost = host;
  }

  function init() {
    document.querySelectorAll('[data-auth-2fa-settings]').forEach(host => render(host));
  }

  window.ProvaAuth2FA = {
    init: init,
    render: render,
    _startSetup: () => {
      const host = document.querySelector('[data-auth-2fa-settings]');
      if (host) startSetup(host);
    },
    _verify: verifyCode,
    _disable: () => {
      const host = document.querySelector('[data-auth-2fa-settings]');
      if (host) disable2FA(host);
    },
    _copyRecovery: copyRecovery,
    _downloadRecovery: downloadRecovery,
    _internals: { extractSecret, qrImg, escHtml }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = window.ProvaAuth2FA;
}());
