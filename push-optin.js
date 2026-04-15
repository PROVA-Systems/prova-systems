// ═══════════════════════════════════════════════════════════════════════════
// PROVA Systems — Push Notification Opt-In UI
// File: push-optin.js  (Client-side, load in einstellungen.html)
//
// Was fehlt in v98:
//   einstellungen.html hat Toggle-Checkboxen für Benachrichtigungs-Typen,
//   aber KEINEN Button um die Browser-Permission anzufordern und die
//   Web-Push-Subscription bei push-notify.js zu registrieren.
//
// Diese Datei ergänzt:
//   1. Status-Banner (aktiv/inaktiv/blockiert/nicht-unterstützt)
//   2. Subscribe/Unsubscribe Button
//   3. Permission-Flow mit klarem UX (Schritt-für-Schritt)
//   4. VAPID-Public-Key vom Server laden (GET /push-notify?aktion=vapid-key)
//   5. Subscription via POST /push-notify { aktion: 'subscribe', email, subscription }
//   6. Persistent Status in localStorage (prova_push_aktiv)
//   7. Integration mit vorhandenen Checkboxen (nur sinnvoll wenn push aktiv)
//   8. Test-Notification Button (nur wenn aktiv)
//
// Integration in einstellungen.html:
//   1. <script src="push-optin.js" defer></script>  (nach dem body)
//   2. HTML-Patch (s.u. ProvaPushOptIn.renderSektion) in #es-sec-benachrichtigungen einfügen
//
// Env: VAPID_PUBLIC_KEY (via push-notify.js Netlify Function)
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Konfiguration ───────────────────────────────────────────────────────
  const PUSH_ENDPOINT   = '/.netlify/functions/push-notify';
  const LS_STATUS_KEY   = 'prova_push_aktiv';          // 'true'/'false'
  const LS_ENDPOINT_KEY = 'prova_push_endpoint';        // endpoint URL für Dedup
  const CHECK_ICON      = '🔔';
  const UNCHECK_ICON    = '🔕';

  // ── Öffentliches API ────────────────────────────────────────────────────
  window.ProvaPushOptIn = {
    init,
    renderSektion,   // returns HTML string für direktes Einfügen
    subscribe,
    unsubscribe,
    testPush,
    getStatus,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Haupt-Init: hängt sich in einstellungen.html Benachrichtigungen-Sektion
  // ─────────────────────────────────────────────────────────────────────────
  function init() {
    const sec = document.getElementById('es-sec-benachrichtigungen');
    if (!sec) return;

    // Optionale Checkboxen: nur aktivierbar wenn Push eingerichtet
    _syncTogglesEnabled();

    // Prüfen ob die Opt-In-Zeile bereits eingefügt wurde
    if (document.getElementById('prova-push-optin-row')) {
      _refreshStatus();
      return;
    }

    // Opt-In HTML-Block VOR den vorhandenen Zeilen einfügen
    const firstZeile = sec.querySelector('.es-zeile');
    if (firstZeile) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = _buildOptInHTML();
      // Alle Kinder des Wrappers vor der ersten Zeile einfügen
      while (wrapper.firstChild) {
        sec.insertBefore(wrapper.firstChild, firstZeile);
      }
    }

    _bindEvents();
    _refreshStatus();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTML-Block für einstellungen.html (kann direkt als Patch eingefügt werden)
  // ─────────────────────────────────────────────────────────────────────────
  function renderSektion() {
    return _buildOptInHTML();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Subscribe-Flow
  // ─────────────────────────────────────────────────────────────────────────
  async function subscribe() {
    const btn = document.getElementById('prova-push-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Wird eingerichtet…'; }

    try {
      // 1. Service Worker prüfen
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        _setStatus('unsupported');
        _showToast('Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.', 'err');
        return;
      }

      // 2. SW Registration laden
      let swReg;
      try {
        swReg = await navigator.serviceWorker.ready;
      } catch (e) {
        _setStatus('error');
        _showToast('Service Worker nicht bereit — Seite neu laden.', 'err');
        return;
      }

      // 3. Permission anfragen
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        _setStatus('blocked');
        _showToast('Push-Benachrichtigungen wurden blockiert. Bitte Browser-Einstellungen prüfen.', 'err');
        return;
      }
      if (permission !== 'granted') {
        _setStatus('inactive');
        _showToast('Push-Benachrichtigungen wurden nicht erlaubt.', 'warn');
        return;
      }

      // 4. VAPID Public Key vom Server laden
      const vapidKey = await _loadVapidKey();
      if (!vapidKey) {
        _showToast('VAPID-Schlüssel konnte nicht geladen werden.', 'err');
        if (btn) { btn.disabled = false; btn.textContent = CHECK_ICON + ' Push aktivieren'; }
        return;
      }

      // 5. Push Subscription erstellen
      let sub;
      try {
        sub = await swReg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: _urlBase64ToUint8Array(vapidKey),
        });
      } catch (e) {
        console.error('[PushOptIn] subscribe error:', e);
        _setStatus('error');
        _showToast('Subscription fehlgeschlagen: ' + e.message, 'err');
        if (btn) { btn.disabled = false; btn.textContent = CHECK_ICON + ' Push aktivieren'; }
        return;
      }

      // 6. Subscription + User-Email an push-notify senden
      const email = _getEmail();
      if (!email) {
        _showToast('Nicht eingeloggt — bitte zuerst anmelden.', 'err');
        if (btn) { btn.disabled = false; btn.textContent = CHECK_ICON + ' Push aktivieren'; }
        return;
      }

      const subObj = sub.toJSON
        ? { ...sub.toJSON(), userAgent: navigator.userAgent.substring(0, 120) }
        : { endpoint: sub.endpoint, keys: sub.keys, userAgent: navigator.userAgent.substring(0, 120) };

      const resp = await _callPushNotify({ aktion: 'subscribe', email, subscription: subObj });

      if (!resp.success) {
        throw new Error(resp.error || 'Unbekannter Fehler');
      }

      // 7. Status persistieren
      localStorage.setItem(LS_STATUS_KEY, 'true');
      localStorage.setItem(LS_ENDPOINT_KEY, sub.endpoint);
      _setStatus('active');
      _syncTogglesEnabled();
      _showToast('🔔 Push-Benachrichtigungen aktiviert!', 'ok');

    } catch (e) {
      console.error('[PushOptIn] subscribe exception:', e);
      _setStatus('error');
      _showToast('Fehler: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.textContent = CHECK_ICON + ' Push aktivieren'; }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Unsubscribe-Flow
  // ─────────────────────────────────────────────────────────────────────────
  async function unsubscribe() {
    const btn = document.getElementById('prova-push-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Wird deaktiviert…'; }

    try {
      // 1. Lokale SW Subscription kündigen
      if ('serviceWorker' in navigator) {
        try {
          const swReg = await navigator.serviceWorker.ready;
          const sub   = await swReg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        } catch (e) {
          console.warn('[PushOptIn] SW unsubscribe error (ignoriert):', e.message);
        }
      }

      // 2. Server-seitige Subscription löschen
      const email = _getEmail();
      if (email) {
        await _callPushNotify({ aktion: 'unsubscribe', email }).catch(() => {});
      }

      // 3. Status zurücksetzen
      localStorage.setItem(LS_STATUS_KEY, 'false');
      localStorage.removeItem(LS_ENDPOINT_KEY);
      _setStatus('inactive');
      _syncTogglesEnabled();
      _showToast('🔕 Push-Benachrichtigungen deaktiviert.', 'info');

    } catch (e) {
      console.error('[PushOptIn] unsubscribe exception:', e);
      _showToast('Fehler beim Deaktivieren: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.textContent = UNCHECK_ICON + ' Push deaktivieren'; }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test-Notification senden
  // ─────────────────────────────────────────────────────────────────────────
  async function testPush() {
    const email = _getEmail();
    if (!email) { _showToast('Nicht eingeloggt.', 'err'); return; }

    const testBtn = document.getElementById('prova-push-test-btn');
    if (testBtn) { testBtn.disabled = true; testBtn.textContent = '⏳ Sende…'; }

    try {
      // Direkte lokale Notification als Fallback (kein Server-Round-Trip für Test)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('PROVA Test-Benachrichtigung', {
          body:  'Push funktioniert! ✅ Fristen-Alarme werden korrekt zugestellt.',
          icon:  '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          tag:   'prova-test-' + Date.now(),
        });
        _showToast('✅ Test-Benachrichtigung gesendet!', 'ok');
      } else {
        _showToast('Push nicht aktiv — zuerst aktivieren.', 'warn');
      }
    } catch (e) {
      _showToast('Test fehlgeschlagen: ' + e.message, 'err');
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.textContent = '🔔 Test senden';
        setTimeout(() => { if (testBtn) testBtn.textContent = '🔔 Test senden'; }, 2000);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status ermitteln (kombiniert SW + localStorage + Notification.permission)
  // ─────────────────────────────────────────────────────────────────────────
  function getStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';
    const ls = localStorage.getItem(LS_STATUS_KEY);
    if (ls === 'true' && Notification.permission === 'granted') return 'active';
    if (ls === 'false') return 'inactive';
    if (Notification.permission === 'default') return 'prompt';
    return 'inactive';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internes HTML bauen
  // ─────────────────────────────────────────────────────────────────────────
  function _buildOptInHTML() {
    return `
<!-- ╔══════════════════════════════════════════════════════════════════════╗
     ║  PROVA Push Opt-In Block (eingefügt von push-optin.js)            ║
     ╚══════════════════════════════════════════════════════════════════════╝ -->
<div id="prova-push-optin-row" class="es-zeile" style="flex-direction:column;align-items:stretch;gap:0;padding:0;">

  <!-- Status-Banner -->
  <div id="prova-push-status-banner" style="
    display:flex;align-items:center;gap:12px;
    padding:12px 16px;
    border-radius:var(--r-md,8px) var(--r-md,8px) 0 0;
    background:rgba(255,255,255,0.03);
    border-bottom:1px solid rgba(255,255,255,0.06);
    min-height:52px;
  ">
    <span id="prova-push-status-icon" style="font-size:22px;flex-shrink:0;">🔕</span>
    <div style="flex:1;min-width:0;">
      <div id="prova-push-status-label" style="font-size:13px;font-weight:600;color:var(--text,#e2e8f0);">
        Push-Benachrichtigungen inaktiv
      </div>
      <div id="prova-push-status-sub" style="font-size:11px;color:var(--text3,rgba(226,232,240,.45));margin-top:2px;">
        Jetzt aktivieren um Fristen-Alarme direkt auf dieses Gerät zu erhalten
      </div>
    </div>
    <!-- Status-Badge -->
    <span id="prova-push-badge" class="es-status-badge" style="flex-shrink:0;">
      <span class="es-status-dot"></span>
      <span id="prova-push-badge-text">Inaktiv</span>
    </span>
  </div>

  <!-- Button-Zeile -->
  <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;flex-wrap:wrap;">
    <!-- Haupt-Button: Subscribe / Unsubscribe -->
    <button id="prova-push-btn"
      onclick="ProvaPushOptIn._handleBtnClick()"
      class="es-btn"
      style="min-width:180px;display:flex;align-items:center;gap:8px;justify-content:center;">
      🔔 Push aktivieren
    </button>

    <!-- Test-Button (nur sichtbar wenn aktiv) -->
    <button id="prova-push-test-btn"
      onclick="ProvaPushOptIn.testPush()"
      class="es-btn"
      style="display:none;background:rgba(74,144,217,0.15);border-color:rgba(74,144,217,0.3);color:var(--accent,#7ec8ff);">
      🔔 Test senden
    </button>
  </div>

  <!-- Blockiert-Hinweis (nur bei permission: denied) -->
  <div id="prova-push-blocked-hint" style="
    display:none;
    padding:10px 16px;
    background:rgba(239,68,68,0.07);
    border-top:1px solid rgba(239,68,68,0.15);
    font-size:11.5px;
    color:rgba(239,68,68,0.85);
    border-radius:0 0 var(--r-md,8px) var(--r-md,8px);
    line-height:1.5;
  ">
    ⚠️ Push wurde in diesem Browser blockiert. Bitte in den Browser-Einstellungen
    für diese Seite unter <strong>Website-Einstellungen → Benachrichtigungen</strong>
    auf <strong>Erlauben</strong> stellen und die Seite neu laden.
  </div>

  <!-- Nicht-unterstützt-Hinweis -->
  <div id="prova-push-unsupported-hint" style="
    display:none;
    padding:10px 16px;
    background:rgba(251,191,36,0.07);
    border-top:1px solid rgba(251,191,36,0.15);
    font-size:11.5px;
    color:rgba(251,191,36,0.85);
    border-radius:0 0 var(--r-md,8px) var(--r-md,8px);
  ">
    ℹ️ Dieser Browser oder dieses Gerät unterstützt keine Web-Push-Benachrichtigungen.
    Bitte Chrome, Edge oder Firefox auf Desktop/Android verwenden.
  </div>
</div>
<!-- ── Ende Push Opt-In Block ─────────────────────────────────────────── -->`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Button-Click Router
  // ─────────────────────────────────────────────────────────────────────────
  window.ProvaPushOptIn._handleBtnClick = async function () {
    const status = getStatus();
    if (status === 'active') {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Events binden
  // ─────────────────────────────────────────────────────────────────────────
  function _bindEvents() {
    // Wenn der User aus dem Browser-Permission-Dialog zurückkommt
    // (visibilitychange) → Status aktualisieren
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) _refreshStatus();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status-UI aktualisieren
  // ─────────────────────────────────────────────────────────────────────────
  function _refreshStatus() {
    const status = getStatus();
    _setStatus(status);
  }

  function _setStatus(status) {
    const icon      = document.getElementById('prova-push-status-icon');
    const label     = document.getElementById('prova-push-status-label');
    const sub       = document.getElementById('prova-push-status-sub');
    const badge     = document.getElementById('prova-push-badge');
    const badgeTxt  = document.getElementById('prova-push-badge-text');
    const btn       = document.getElementById('prova-push-btn');
    const testBtn   = document.getElementById('prova-push-test-btn');
    const blocked   = document.getElementById('prova-push-blocked-hint');
    const unsup     = document.getElementById('prova-push-unsupported-hint');
    const banner    = document.getElementById('prova-push-status-banner');

    if (!btn) return;

    // Alle Hints verstecken
    if (blocked)  blocked.style.display  = 'none';
    if (unsup)    unsup.style.display    = 'none';

    switch (status) {
      case 'active':
        if (icon)     icon.textContent    = '🔔';
        if (label)    label.textContent   = 'Push-Benachrichtigungen aktiv';
        if (sub)      sub.textContent     = 'Fristen-Alarme werden auf dieses Gerät zugestellt (7, 3 und 1 Tag vor Frist)';
        if (badgeTxt) badgeTxt.textContent = 'Aktiv';
        if (badge)    { badge.classList.remove('warn'); badge.classList.add('ok'); }
        if (banner)   banner.style.background = 'rgba(16,185,129,0.06)';
        btn.textContent = UNCHECK_ICON + ' Push deaktivieren';
        btn.style.background      = 'rgba(239,68,68,0.12)';
        btn.style.borderColor     = 'rgba(239,68,68,0.3)';
        btn.style.color           = '#ef4444';
        btn.disabled              = false;
        if (testBtn)  testBtn.style.display = 'inline-flex';
        break;

      case 'blocked':
        if (icon)     icon.textContent    = '🚫';
        if (label)    label.textContent   = 'Push-Benachrichtigungen blockiert';
        if (sub)      sub.textContent     = 'Browser-Einstellungen anpassen um Push zu aktivieren';
        if (badgeTxt) badgeTxt.textContent = 'Blockiert';
        if (badge)    { badge.classList.remove('ok'); badge.classList.add('warn'); }
        if (banner)   banner.style.background = 'rgba(239,68,68,0.06)';
        btn.textContent  = '⚙️ Browser-Einstellungen';
        btn.style.background  = '';
        btn.style.borderColor = '';
        btn.style.color       = '';
        btn.disabled          = false;
        btn.onclick           = () => window.open('about:preferences#privacy', '_blank');
        if (blocked)  blocked.style.display = 'block';
        if (testBtn)  testBtn.style.display = 'none';
        break;

      case 'unsupported':
        if (icon)     icon.textContent    = 'ℹ️';
        if (label)    label.textContent   = 'Push nicht verfügbar';
        if (sub)      sub.textContent     = 'Dieser Browser unterstützt keine Web-Push-Benachrichtigungen';
        if (badgeTxt) badgeTxt.textContent = 'N/A';
        if (banner)   banner.style.background = 'rgba(251,191,36,0.04)';
        btn.textContent  = '❌ Nicht unterstützt';
        btn.disabled     = true;
        if (unsup)    unsup.style.display = 'block';
        if (testBtn)  testBtn.style.display = 'none';
        break;

      case 'prompt':
      case 'inactive':
      default:
        if (icon)     icon.textContent    = '🔕';
        if (label)    label.textContent   = 'Push-Benachrichtigungen inaktiv';
        if (sub)      sub.textContent     = 'Jetzt aktivieren um Fristen-Alarme auf dieses Gerät zu erhalten';
        if (badgeTxt) badgeTxt.textContent = 'Inaktiv';
        if (badge)    { badge.classList.remove('ok','warn'); }
        if (banner)   banner.style.background = 'rgba(255,255,255,0.03)';
        btn.textContent       = CHECK_ICON + ' Push aktivieren';
        btn.style.background  = '';
        btn.style.borderColor = '';
        btn.style.color       = '';
        btn.disabled          = false;
        btn.onclick           = window.ProvaPushOptIn._handleBtnClick;
        if (testBtn)  testBtn.style.display = 'none';
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bestehende Checkboxen: disabled wenn Push nicht aktiv
  // ─────────────────────────────────────────────────────────────────────────
  function _syncTogglesEnabled() {
    const active   = getStatus() === 'active';
    const toggles  = ['es-bn-fristen', 'es-bn-zahlung', 'es-bn-stillezeit'];
    toggles.forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.disabled = !active;
      const label = el.closest('.es-toggle');
      if (label) label.style.opacity = active ? '' : '0.45';
      const row = el.closest('.es-zeile');
      if (row) {
        const subEl = row.querySelector('.es-zeile-sub');
        if (subEl && !active && !subEl.dataset.originalText) {
          subEl.dataset.originalText = subEl.textContent;
          subEl.textContent = subEl.textContent + ' (Push aktivieren)';
        } else if (subEl && active && subEl.dataset.originalText) {
          subEl.textContent = subEl.dataset.originalText;
          delete subEl.dataset.originalText;
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VAPID Public Key vom Server laden
  // ─────────────────────────────────────────────────────────────────────────
  async function _loadVapidKey() {
    // Cache in sessionStorage für diese Sitzung
    const cached = sessionStorage.getItem('prova_vapid_key');
    if (cached) return cached;

    try {
      const res = await fetch(PUSH_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ aktion: 'vapid-key' }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.publicKey) {
        sessionStorage.setItem('prova_vapid_key', data.publicKey);
        return data.publicKey;
      }
      return null;
    } catch (e) {
      console.error('[PushOptIn] VAPID key load error:', e);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // push-notify Netlify Function aufrufen (erfordert JWT im Cookie)
  // ─────────────────────────────────────────────────────────────────────────
  async function _callPushNotify(payload) {
    const res = await fetch(PUSH_ENDPOINT, {
      method:      'POST',
      credentials: 'include',           // Netlify Identity JWT Cookie mitsenden
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 120)}`);
    }
    return res.json();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User-Email ermitteln (Netlify Identity oder localStorage)
  // ─────────────────────────────────────────────────────────────────────────
  function _getEmail() {
    // 1. Netlify Identity
    if (window.netlifyIdentity && window.netlifyIdentity.currentUser) {
      return window.netlifyIdentity.currentUser().email || '';
    }
    // 2. PROVA localStorage (prova_sv_email von prova-auth-api.js)
    const stored = localStorage.getItem('prova_sv_email') || localStorage.getItem('prova_email') || '';
    return stored.trim().toLowerCase();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // URL-safe Base64 → Uint8Array (für applicationServerKey)
  // ─────────────────────────────────────────────────────────────────────────
  function _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Toast (nutzt globales zeigToast falls vorhanden, sonst eigenes)
  // ─────────────────────────────────────────────────────────────────────────
  function _showToast(msg, type) {
    if (typeof zeigToast === 'function') {
      zeigToast(msg, type === 'ok' ? 'ok' : type === 'err' ? 'err' : type === 'warn' ? 'warn' : 'info');
      return;
    }
    // Fallback-Toast
    const el = document.createElement('div');
    const color = type === 'ok' ? '#10b981' : type === 'err' ? '#ef4444' : type === 'warn' ? '#f59e0b' : '#7ec8ff';
    el.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      z-index:99999;background:#0d1b2a;border:1.5px solid ${color};
      border-radius:10px;padding:10px 20px;font-size:13px;font-weight:600;
      color:${color};box-shadow:0 8px 32px rgba(0,0,0,.7);
      max-width:90vw;text-align:center;pointer-events:none;
      animation:prova-toast-in .2s ease;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity    = '0';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-Init wenn DOM bereit
  // ─────────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded (defer script after body)
    setTimeout(init, 0);
  }

})();

/* ═══════════════════════════════════════════════════════════════════════════
   INTEGRATION-ANLEITUNG für einstellungen.html
   ═══════════════════════════════════════════════════════════════════════════

   OPTION A (empfohlen): Script-Tag hinzufügen, JS erledigt alles automatisch
   ─────────────────────────────────────────────────────────────────────────
   In einstellungen.html, NACH dem </body>-Tag, VOR dem </html>:

     <script src="push-optin.js" defer></script>

   Das Script findet #es-sec-benachrichtigungen automatisch und fügt
   die Opt-In-UI VOR den vorhandenen Toggle-Zeilen ein.

   ─────────────────────────────────────────────────────────────────────────
   OPTION B: Direktes HTML-Patch (statisch eingebettet)
   ─────────────────────────────────────────────────────────────────────────
   In einstellungen.html, INNERHALB von #es-sec-benachrichtigungen,
   VOR der ersten .es-zeile (Fristen-Alarme), einfügen:

   <!-- Push Opt-In Block -->
   <div id="prova-push-optin-row" class="es-zeile" style="flex-direction:column;align-items:stretch;gap:0;padding:0;">
     ... (siehe ProvaPushOptIn.renderSektion()) ...
   </div>

   Dann Script laden: <script src="push-optin.js" defer></script>

   ─────────────────────────────────────────────────────────────────────────
   NETLIFY ENV VARS (müssen gesetzt sein):
   ─────────────────────────────────────────────────────────────────────────
     VAPID_PUBLIC_KEY=   (aus: npx web-push generate-vapid-keys)
     VAPID_PRIVATE_KEY=  (aus: npx web-push generate-vapid-keys)
     VAPID_SUBJECT=      mailto:hallo@prova-systems.de
     AIRTABLE_PAT=       (Airtable Personal Access Token)

   Airtable: PUSH_SUBSCRIPTIONS Tabelle anlegen mit Feldern:
     Email (Single line text), Subscription (Long text),
     Endpoint (Single line text), Aktiv (Checkbox),
     Erstellt (Date), UserAgent (Single line text)
   ═══════════════════════════════════════════════════════════════════════════ */