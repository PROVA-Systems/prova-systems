/**
 * PROVA — Re-Consent-Modal (MEGA³⁰ B5)
 *
 * Forced Re-Consent bei Doku-Update (Regel 20).
 * Triggert bei App-Use wenn pending. Lockt App bis Consent.
 *
 * Public API:
 *   ProvaReConsent.checkAndShow()  — async, fetched pending → shows Modal falls nötig
 *   ProvaReConsent.isPending()     — boolean cache
 *
 * Backend: View public.v_user_pending_einwilligungen (existing, MEGA³⁰ B5 verifiziert)
 * Lambda für Read: /.netlify/functions/re-consent-pending
 * Lambda für Submit: /.netlify/functions/re-consent-submit
 */
'use strict';

(function () {
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function ensureStyles() {
    if (document.getElementById('rc-styles')) return;
    const s = document.createElement('style');
    s.id = 'rc-styles';
    s.textContent = `
      .rc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);}
      .rc-modal{background:#1c2130;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:32px;max-width:600px;width:100%;color:#eaecf4;font-family:'DM Sans',system-ui,sans-serif;max-height:90vh;overflow-y:auto;}
      .rc-modal h2{font-size:20px;font-weight:800;margin-bottom:6px;}
      .rc-modal .law{font-size:11px;color:#4f8ef7;font-family:ui-monospace,monospace;margin-bottom:14px;}
      .rc-modal p{font-size:13px;color:#8b93ab;line-height:1.6;margin-bottom:14px;}
      .rc-doku-card{padding:14px 16px;background:#0b0d11;border:1px solid rgba(255,255,255,.08);border-radius:8px;margin:14px 0;}
      .rc-doku-card .titel{font-size:14px;font-weight:700;}
      .rc-doku-card .version{font-size:11px;color:#4f8ef7;font-family:ui-monospace,monospace;}
      .rc-doku-card .hinweis{font-size:12px;color:#8b93ab;margin-top:6px;}
      .rc-modal label{display:flex;gap:10px;align-items:flex-start;font-size:13px;cursor:pointer;margin:10px 0;}
      .rc-modal input[type=checkbox]{margin-top:2px;}
      .rc-btn{padding:12px 22px;background:linear-gradient(135deg,#4f8ef7,#3a7be0);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;width:100%;margin-top:14px;}
      .rc-btn:disabled{opacity:.5;cursor:not-allowed;}
      .rc-link{color:#4f8ef7;text-decoration:underline;}
    `;
    document.head.appendChild(s);
  }

  let _pendingCache = null;
  let _modalShown = false;

  async function fetchPending() {
    const fetcher = window.provaFetch || window.fetch.bind(window);
    try {
      const res = await fetcher('/.netlify/functions/re-consent-pending');
      if (!res.ok) return [];
      const data = await res.json();
      return data.pending || [];
    } catch (e) { return []; }
  }

  async function submitConsent(rechtsdokument_ids) {
    const fetcher = window.provaFetch || window.fetch.bind(window);
    const res = await fetcher('/.netlify/functions/re-consent-submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsdokument_ids })
    });
    return res.ok;
  }

  function buildModal(pending) {
    ensureStyles();
    const overlay = document.createElement('div');
    overlay.className = 'rc-overlay';
    overlay.id = 'rc-overlay';

    const dokuCards = pending.map(p => `
      <div class="rc-doku-card">
        <div class="titel">${escHtml(p.pflicht_typ || 'Rechtsdokument')}</div>
        <div class="version">v${escHtml(p.aktuelle_version || '?')}</div>
        ${p.aenderungs_hinweis ? `<div class="hinweis">${escHtml(p.aenderungs_hinweis)}</div>` : ''}
      </div>`).join('');

    const checkboxes = pending.map((p, i) => `
      <label>
        <input type="checkbox" class="rc-cb" data-id="${p.aktuelle_rechtsdokument_id}">
        Ich habe <strong>${escHtml(p.pflicht_typ || 'Rechtsdokument')} v${escHtml(p.aktuelle_version)}</strong> gelesen und stimme zu.
      </label>`).join('');

    overlay.innerHTML = `
      <div class="rc-modal" role="dialog" aria-label="Aktualisierte Rechtsdokumente">
        <h2>📄 Aktualisierte Rechtsdokumente</h2>
        <div class="law">DSGVO Art. 7 + IHK-SVO §3</div>
        <p>Wir haben unsere Rechtsdokumente aktualisiert. Bevor du PROVA weiter nutzen kannst, bestätige bitte die aktuellen Versionen.</p>
        ${dokuCards}
        <p>Vor der Bestätigung lies bitte die Dokumente:</p>
        ${checkboxes}
        <button class="rc-btn" type="button" id="rc-submit" disabled>Bestätigen und fortfahren</button>
      </div>
    `;
    return overlay;
  }

  async function checkAndShow() {
    if (_modalShown) return;
    const pending = await fetchPending();
    _pendingCache = pending;
    if (!pending.length) return;

    const overlay = buildModal(pending);
    document.body.appendChild(overlay);
    _modalShown = true;

    const btn = overlay.querySelector('#rc-submit');
    const cbs = overlay.querySelectorAll('.rc-cb');
    cbs.forEach(cb => cb.addEventListener('change', () => {
      const allChecked = Array.from(cbs).every(c => c.checked);
      btn.disabled = !allChecked;
    }));

    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Speichere…';
      const ids = Array.from(cbs).map(cb => cb.getAttribute('data-id'));
      const ok = await submitConsent(ids);
      if (ok) {
        overlay.remove();
        _modalShown = false;
      } else {
        btn.disabled = false; btn.textContent = 'Bestätigen und fortfahren';
        alert('Fehler beim Speichern. Bitte erneut versuchen.');
      }
    });
  }

  function isPending() {
    return Array.isArray(_pendingCache) && _pendingCache.length > 0;
  }

  window.ProvaReConsent = { checkAndShow, isPending, _internals: { escHtml, fetchPending } };

  // Auto-Init bei DOMContentLoaded auf authenticated Pages
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      // Nur auf App-Pages, nicht auf Login/Public
      const path = window.location.pathname;
      const skipPaths = ['/login.html', '/login', '/index.html', '/', '/pricing.html', '/datenschutz.html', '/impressum.html', '/agb.html', '/avv.html'];
      if (skipPaths.indexOf(path) >= 0) return;
      // Nur wenn eingeloggt
      try {
        if (!localStorage.getItem('prova_auth_token')) return;
      } catch (e) { return; }
      setTimeout(checkAndShow, 1500); // 1.5s Delay, App läuft erstmal
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = window.ProvaReConsent;
}());
