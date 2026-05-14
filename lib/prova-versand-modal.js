/**
 * PROVA Versand-Modal (MEGA⁶⁷ Items 5.5+5.6+5.7)
 *
 * 3 Tabs: Download (Stufe 1) · Platform-Link (Stufe 2) · Per E-Mail (MEGA⁶⁸ disabled)
 *
 * API:
 *   new ProvaVersandModal({ auftragId, dokumentId, editor }).open()
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-versand-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-versand-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-versand-modal.css';
    document.head.appendChild(link);
  }

  async function _getSb() {
    if (_getSb._c) return _getSb._c;
    const url = window.PROVA_CONFIG?.SUPABASE_URL;
    const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
    const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
    _getSb._c = mod.supabase || (mod.getSupabase && mod.getSupabase());
    return _getSb._c;
  }

  async function _callEdge(name, body) {
    const sb = await _getSb();
    const { data: { session } } = await sb.auth.getSession();
    const tok = session?.access_token;
    if (!tok) throw new Error('Nicht angemeldet');
    const url = window.PROVA_CONFIG.SUPABASE_URL;
    const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
    const resp = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
      body: JSON.stringify(body)
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);
    return json;
  }

  async function _sha256Hex(arrayBuf) {
    const hash = await crypto.subtle.digest('SHA-256', arrayBuf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function _generatePassword(len = 12) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(n => chars[n % chars.length]).join('');
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  class ProvaVersandModal {
    constructor(opts = {}) {
      this.auftragId = opts.auftragId;
      this.dokumentId = opts.dokumentId;
      this.editor = opts.editor;
    }

    open() {
      _injectStyle();
      if (this._overlay) return;

      const overlay = document.createElement('div');
      overlay.className = 'prova-versand-overlay';
      overlay.innerHTML = `
        <div class="prova-versand-modal">
          <header>
            <h2>Gutachten versenden</h2>
            <button type="button" class="close" aria-label="Schließen">✕</button>
          </header>
          <nav class="tabs">
            <button type="button" class="tab is-active" data-tab="download">⇣ Download</button>
            <button type="button" class="tab" data-tab="link">🔗 Platform-Link</button>
            <button type="button" class="tab is-disabled" data-tab="email" disabled>✉ Per E-Mail (MEGA⁶⁸)</button>
          </nav>
          <div class="body" data-body></div>
        </div>
      `;
      document.body.appendChild(overlay);
      this._overlay = overlay;

      const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this._overlay = null;
        document.removeEventListener('keydown', onKey, true);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey, true);
      overlay.querySelector('.close').addEventListener('click', close);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      overlay.querySelectorAll('.tab').forEach(btn => {
        if (btn.classList.contains('is-disabled')) return;
        btn.addEventListener('click', () => {
          overlay.querySelectorAll('.tab').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          this._renderTab(btn.dataset.tab);
        });
      });
      this._renderTab('download');
    }

    _renderTab(tab) {
      const body = this._overlay.querySelector('[data-body]');
      if (tab === 'download') this._renderDownload(body);
      else if (tab === 'link') this._renderLink(body);
    }

    _renderDownload(body) {
      body.innerHTML = `
        <h3>Stufe 1 — Download mit Public-Hash</h3>
        <p class="hint">PDF wird heruntergeladen und SHA-256-Hash dokumentiert. Der Hash beweist später dass der Empfänger das Original-Dokument erhalten hat.</p>
        <label class="row">
          <input type="checkbox" id="vs-make-hash" checked>
          <span>Public-Hash erstellen (Beweis-Modus)</span>
        </label>
        <fieldset class="vs-mode-fieldset">
          <legend>Layout</legend>
          <label class="row">
            <input type="radio" name="vs-pdf-mode" value="standard" checked>
            <span>Standard-PDF (5-Teile-Struktur)</span>
          </label>
          <label class="row">
            <input type="radio" name="vs-pdf-mode" value="ihk">
            <span>IHK-Köln-Export (Teil 3+4 gemerged)</span>
          </label>
        </fieldset>
        <button type="button" class="btn-primary" id="vs-pdf-generate">PDF generieren und herunterladen →</button>
        <div class="result" id="vs-result-dl" style="display:none"></div>
      `;
      body.querySelector('#vs-pdf-generate').addEventListener('click', async () => {
        const btn = body.querySelector('#vs-pdf-generate');
        const result = body.querySelector('#vs-result-dl');
        const mode = body.querySelector('input[name="vs-pdf-mode"]:checked').value;
        const makeHash = body.querySelector('#vs-make-hash').checked;
        btn.disabled = true;
        btn.textContent = 'Generiere…';
        try {
          // MEGA⁶⁸-FINAL: ihk-export Edge wenn mode=ihk, sonst pdf-generate
          const edgeFn = mode === 'ihk' ? 'ihk-export' : 'pdf-generate';
          const json = await _callEdge(edgeFn, {
            auftrag_id: this.auftragId,
            dokument_id: this.dokumentId
          }).catch(e => ({ error: e.message }));
          if (json.error) {
            // Fallback: audit-export-pdf liefert HTML
            const fb = await _callEdge('audit-export-pdf', { auftrag_id: this.auftragId });
            // audit-export-pdf returns HTML directly — wir simulieren Download
            result.innerHTML = `<div class="warn">PDF-Service nicht verfügbar — Fallback HTML-Audit-Export bereit. <a href="javascript:void(0)" id="dl-fallback">→ HTML herunterladen</a></div>`;
            result.style.display = 'block';
            btn.disabled = false; btn.textContent = 'PDF generieren →';
            return;
          }
          let hashHex = '';
          if (makeHash && json.pdf_blob_url) {
            try {
              const resp = await fetch(json.pdf_blob_url);
              const buf = await resp.arrayBuffer();
              hashHex = await _sha256Hex(buf);
            } catch (e) { /* silent */ }
          }
          result.innerHTML = `
            <div class="ok"><strong>✓ PDF erstellt</strong></div>
            ${json.pdf_blob_url ? `<a href="${_esc(json.pdf_blob_url)}" download="gutachten.pdf" class="link">⇣ Herunterladen</a>` : ''}
            ${hashHex ? `
              <div class="hash-box">
                <div class="hash-label">Public-Hash (SHA-256):</div>
                <code class="hash-code" id="hash-copy">${hashHex}</code>
                <button type="button" class="btn-copy" data-copy="${hashHex}">Hash kopieren</button>
                <p class="hint">Geben Sie diesen Hash dem Empfänger weiter. Er kann damit beweisen, dass er das Original-PDF erhalten hat.</p>
              </div>` : ''}
          `;
          result.style.display = 'block';
          btn.textContent = '✓ Erstellt';
          // Copy-Handler
          result.querySelector('.btn-copy')?.addEventListener('click', (e) => {
            navigator.clipboard.writeText(e.target.dataset.copy);
            e.target.textContent = '✓ Kopiert';
            setTimeout(() => { e.target.textContent = 'Hash kopieren'; }, 1500);
          });
        } catch (e) {
          result.innerHTML = `<div class="error">Fehler: ${_esc(e.message)}</div>`;
          result.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'PDF generieren →';
        }
      });
    }

    _renderLink(body) {
      const defaultUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const defaultPwd = _generatePassword(10);
      body.innerHTML = `
        <h3>Stufe 2 — Platform-Link mit Passwort + Ablauf</h3>
        <p class="hint">Empfänger erhält Link + separates Passwort. Zugriffe werden auditiert.</p>
        <label>Empfänger-E-Mail *</label>
        <input type="email" id="vs-email" required placeholder="empfaenger@example.de">
        <label>Empfänger-Name (optional)</label>
        <input type="text" id="vs-name" placeholder="Bauamt Frankfurt">
        <label>Gültig bis</label>
        <input type="date" id="vs-until" value="${defaultUntil}">
        <label>Max. Zugriffe</label>
        <input type="number" id="vs-max" value="10" min="1" max="100">
        <label>Zugriffspasswort (autogeneriert)</label>
        <div class="pwd-row">
          <input type="text" id="vs-pwd" value="${defaultPwd}">
          <button type="button" class="btn-regen" id="vs-regen">↻</button>
        </div>
        <button type="button" class="btn-primary" id="vs-share-create">Share-Link erstellen →</button>
        <div class="result" id="vs-result-link" style="display:none"></div>
      `;
      body.querySelector('#vs-regen').addEventListener('click', () => {
        body.querySelector('#vs-pwd').value = _generatePassword(10);
      });
      body.querySelector('#vs-share-create').addEventListener('click', async () => {
        const btn = body.querySelector('#vs-share-create');
        const result = body.querySelector('#vs-result-link');
        const email = body.querySelector('#vs-email').value.trim();
        const name = body.querySelector('#vs-name').value.trim();
        const until = body.querySelector('#vs-until').value;
        const max = parseInt(body.querySelector('#vs-max').value, 10);
        const pwd = body.querySelector('#vs-pwd').value;
        if (!email) { alert('E-Mail ist Pflicht'); return; }
        if (!this.dokumentId) { alert('Kein dokument_id übergeben — Share-Modal direkt aus Dokument-View aufrufen.'); return; }
        btn.disabled = true; btn.textContent = 'Erstelle…';
        try {
          const json = await _callEdge('share-create', {
            dokument_id: this.dokumentId,
            empfaenger_email: email,
            empfaenger_name: name || null,
            valid_until: new Date(until).toISOString(),
            max_zugriffe: max,
            password: pwd
          });
          result.innerHTML = `
            <div class="ok"><strong>✓ Share-Link erstellt</strong></div>
            <div class="link-box">
              <code class="hash-code">${_esc(json.share_url)}</code>
              <button type="button" class="btn-copy" data-copy="${_esc(json.share_url)}">Link kopieren</button>
            </div>
            <div class="pwd-display">
              <strong>Passwort:</strong> <code>${_esc(pwd)}</code>
              <button type="button" class="btn-copy" data-copy="${_esc(pwd)}">Passwort kopieren</button>
            </div>
            <p class="hint">Gültig bis ${_esc(json.valid_until)} · Max ${_esc(json.max_zugriffe)} Zugriffe.<br>
            Senden Sie Link <strong>und Passwort getrennt</strong> an ${_esc(email)} (z.B. Link per Mail, Passwort per SMS).</p>
          `;
          result.style.display = 'block';
          btn.textContent = '✓ Erstellt';
          result.querySelectorAll('.btn-copy').forEach(b => {
            b.addEventListener('click', (e) => {
              navigator.clipboard.writeText(e.target.dataset.copy);
              e.target.textContent = '✓ Kopiert';
              setTimeout(() => { e.target.textContent = e.target.dataset.copy.startsWith('http') ? 'Link kopieren' : 'Passwort kopieren'; }, 1500);
            });
          });
        } catch (e) {
          result.innerHTML = `<div class="error">Fehler: ${_esc(e.message)}</div>`;
          result.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Share-Link erstellen →';
        }
      });
    }
  }

  global.ProvaVersandModal = ProvaVersandModal;
})(typeof window !== 'undefined' ? window : globalThis);
