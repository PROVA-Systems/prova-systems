/**
 * PROVA Systems — prova-pdf-download.js  (Client-Side Helper)
 * ══════════════════════════════════════════════════════════════════════
 * Sicherer PDF-Download via pdf-proxy Netlify Function
 * Ersetzt alle direkten window.open(pdf_url) Aufrufe
 *
 * Verwendung:
 *   // Mit Airtable-Record (vollständige Sicherheitsprüfung):
 *   await ProvaPdfDownload.open({ record_id: 'recXXX', doc_type: 'rechnung' });
 *
 *   // Mit direkter URL (Host-Whitelist Check):
 *   await ProvaPdfDownload.open({ pdf_url: result.pdf_url, filename: 'Rechnung.pdf' });
 *
 * ══════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  const PDF_PROXY_ENDPOINT = '/.netlify/functions/pdf-proxy';
  const TOKEN_CACHE        = new Map();   // cache: key → { token, expires_at, download_url }

  /**
   * Holt einen signierten Download-Token vom Server.
   * Cached den Token für seine Laufzeit (15 min) minus 30s Buffer.
   */
  async function getSignedToken(opts) {
    const { record_id, doc_type, pdf_url, filename } = opts;

    // Cache-Key
    const cacheKey = record_id || pdf_url || '';
    const cached   = TOKEN_CACHE.get(cacheKey);
    if (cached && cached.expires_at > Date.now() + 30_000) {
      return cached;
    }

    const body = { action: 'sign' };
    if (record_id) { body.record_id = record_id; body.doc_type = doc_type || 'gutachten'; }
    if (pdf_url)   { body.pdf_url = pdf_url; }
    if (filename)  { body.filename = filename; }

    const res = await fetch(PDF_PROXY_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });

    if (!res.ok) {
      let errObj = {};
      try { errObj = await res.json(); } catch(e) {}
      const msg = errObj.error || `HTTP ${res.status}`;
      const code = errObj.code || 'PDF_TOKEN_ERROR';
      throw Object.assign(new Error(msg), { code, status: res.status });
    }

    const data = await res.json();
    TOKEN_CACHE.set(cacheKey, data);
    return data;
  }

  /**
   * Öffnet den sicheren PDF-Download in neuem Tab.
   *
   * @param {object} opts
   *   record_id   {string}  Airtable Record-ID  (empfohlen)
   *   doc_type    {string}  'gutachten'|'rechnung'|'brief'|'mahnung'|'fotoanlage'
   *   pdf_url     {string}  Fallback: direkte PDFMonkey-URL (nur Host-Check, kein Eigentümer-Check)
   *   filename    {string}  Dateiname für Download (optional)
   *   onProgress  {fn}      Callback (status: 'signing'|'opening'|'done'|'error')
   */
  async function openPdf(opts = {}) {
    if (!opts.record_id && !opts.pdf_url) {
      throw new Error('record_id oder pdf_url erforderlich');
    }

    const onProgress = opts.onProgress || function() {};

    try {
      onProgress('signing');
      const tokenData = await getSignedToken(opts);
      onProgress('opening');

      // Sicher öffnen — URL enthält nur den kurzlebigen Token, nicht die echte PDF-URL
      const win = window.open(tokenData.download_url, '_blank', 'noopener,noreferrer');
      if (!win) {
        // Popup geblockt → direkter Download-Link
        const a = document.createElement('a');
        a.href     = tokenData.download_url;
        a.target   = '_blank';
        a.rel      = 'noopener noreferrer';
        a.download = tokenData.filename || 'dokument.pdf';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      }

      onProgress('done');
      return tokenData;

    } catch(err) {
      onProgress('error', err);
      throw err;
    }
  }

  /**
   * Erstellt einen Download-Button der sicher auf PDF verlinkt.
   * Ersetzt bestehende Buttons die pdf_url direkt verwenden.
   *
   * @param {HTMLElement} buttonEl  - Existierendes Button-Element
   * @param {object}      opts      - Gleiche Optionen wie openPdf()
   */
  function bindButton(buttonEl, opts = {}) {
    if (!buttonEl) return;

    buttonEl.addEventListener('click', async function(e) {
      e.preventDefault();
      const origText = buttonEl.textContent;
      buttonEl.disabled    = true;
      buttonEl.textContent = '⏳ PDF wird geladen…';

      try {
        await openPdf({
          ...opts,
          onProgress: function(status, err) {
            if (status === 'signing') buttonEl.textContent = '🔐 Wird geprüft…';
            if (status === 'opening') buttonEl.textContent = '📄 Öffnet…';
            if (status === 'done')   buttonEl.textContent = '✅ PDF geöffnet';
            if (status === 'error')  buttonEl.textContent = '⚠️ Fehler';
          }
        });
      } catch(err) {
        console.error('[ProvaPdfDownload] Fehler:', err);
        const msg = err.code === 'ACCESS_DENIED'  ? 'Kein Zugriff auf dieses Dokument' :
                    err.code === 'TOKEN_EXPIRED'   ? 'Sitzung abgelaufen — bitte Seite neu laden' :
                    err.code === 'UNAUTHORIZED'     ? 'Bitte erneut anmelden' :
                    err.message || 'PDF-Download fehlgeschlagen';
        if (global.showToast) global.showToast('⚠️ ' + msg, 'err');
        else alert(msg);
      } finally {
        setTimeout(() => {
          buttonEl.disabled    = false;
          buttonEl.textContent = origText;
        }, 2000);
      }
    });
  }

  /**
   * Migriert alle bestehenden PDF-Links auf der Seite zu sicheren Proxy-URLs.
   * Sucht nach: <a href="*pdfmonkey*">, <a href="*cdn.*pdf*">, data-pdf-url Attribute
   *
   * Aufruf: ProvaPdfDownload.migrateLinks();
   */
  function migrateLinks() {
    // Links mit PDFMonkey-URLs
    document.querySelectorAll('a[href*="pdfmonkey.io"], a[href*="cdn.pdfmonkey"]').forEach(link => {
      const originalUrl = link.getAttribute('href');
      link.addEventListener('click', async function(e) {
        e.preventDefault();
        try {
          await openPdf({ pdf_url: originalUrl, filename: link.download || 'dokument.pdf' });
        } catch(err) {
          console.error('[ProvaPdfDownload] Link-Fehler:', err);
          if (global.showToast) global.showToast('⚠️ PDF-Download fehlgeschlagen', 'err');
        }
      });
      link.removeAttribute('href');
      link.setAttribute('role', 'button');
      link.style.cursor = 'pointer';
    });

    // Buttons/Links mit data-pdf-record + data-doc-type
    document.querySelectorAll('[data-pdf-record]').forEach(el => {
      const record_id = el.getAttribute('data-pdf-record');
      const doc_type  = el.getAttribute('data-doc-type') || 'gutachten';
      const filename  = el.getAttribute('data-filename') || null;
      bindButton(el, { record_id, doc_type, filename });
    });
  }

  /**
   * Zeigt einen Inline-PDF-Viewer in einem Modal-Overlay.
   * Lädt PDF via Proxy-Token und bettet es als <iframe> ein.
   *
   * @param {object} opts  - Gleiche Optionen wie openPdf()
   */
  async function viewInline(opts = {}) {
    let overlay = document.getElementById('prova-pdf-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'prova-pdf-overlay';
      overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9999',
        'background:rgba(0,0,0,.75)', 'display:flex',
        'flex-direction:column', 'align-items:center', 'justify-content:center',
        'padding:16px'
      ].join(';');
      overlay.innerHTML = `
        <div style="width:100%;max-width:900px;height:90vh;background:#1a1a1a;border-radius:12px;
                    display:flex;flex-direction:column;overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;
                      padding:12px 16px;background:#111;border-bottom:1px solid #333;">
            <span id="prova-pdf-title" style="color:#e2e8f0;font-size:14px;font-weight:600;">PDF-Vorschau</span>
            <div style="display:flex;gap:8px;">
              <button id="prova-pdf-download-btn"
                style="padding:6px 14px;border-radius:6px;border:1px solid #4f8ef7;
                       background:rgba(79,142,247,.12);color:#4f8ef7;font-size:12px;
                       font-weight:600;cursor:pointer;">⬇ Download</button>
              <button id="prova-pdf-close"
                style="padding:6px 12px;border-radius:6px;border:1px solid #444;
                       background:#222;color:#aaa;font-size:12px;cursor:pointer;">✕ Schließen</button>
            </div>
          </div>
          <div id="prova-pdf-frame-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;">
            <span id="prova-pdf-loading" style="color:#666;font-size:14px;">⏳ PDF wird geladen…</span>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      document.getElementById('prova-pdf-close').addEventListener('click', () => {
        overlay.style.display = 'none';
        const iframe = document.getElementById('prova-pdf-iframe');
        if (iframe) iframe.src = 'about:blank';
      });
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    }

    overlay.style.display = 'flex';
    const wrap    = document.getElementById('prova-pdf-frame-wrap');
    const loading = document.getElementById('prova-pdf-loading');
    const title   = document.getElementById('prova-pdf-title');
    if (loading) { loading.style.display = 'block'; loading.textContent = '⏳ PDF wird geladen…'; }

    try {
      const tokenData = await getSignedToken(opts);
      if (title) title.textContent = tokenData.filename || 'PDF-Vorschau';

      // Download-Button
      const dlBtn = document.getElementById('prova-pdf-download-btn');
      if (dlBtn) {
        dlBtn.onclick = () => window.open(tokenData.download_url, '_blank', 'noopener');
      }

      // Iframe einbetten
      let iframe = document.getElementById('prova-pdf-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id    = 'prova-pdf-iframe';
        iframe.style.cssText = 'width:100%;height:100%;border:none;background:#fff;';
        if (loading) loading.style.display = 'none';
        wrap.appendChild(iframe);
      } else {
        if (loading) loading.style.display = 'none';
      }
      iframe.src = tokenData.download_url;

    } catch(err) {
      if (loading) loading.textContent = '⚠️ PDF konnte nicht geladen werden: ' + err.message;
    }
  }

  // ── Öffentliche API ──────────────────────────────────────────────────
  global.ProvaPdfDownload = {
    open:         openPdf,
    bindButton:   bindButton,
    migrateLinks: migrateLinks,
    viewInline:   viewInline,
    clearCache:   () => TOKEN_CACHE.clear(),
  };

  // Auto-Init nach DOM-Load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', migrateLinks);
  } else {
    migrateLinks();
  }

})(window);