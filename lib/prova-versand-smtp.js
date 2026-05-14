/**
 * PROVA SMTP-Versand-Tab (MEGA⁶⁸ Item 6.8) — erweitert ProvaVersandModal
 *
 * Wird zum existing prova-versand-modal.js hinzu-geladen.
 * Aktiviert den "Per E-Mail"-Tab (war in MEGA⁶⁷ disabled).
 *
 * Pattern: erweitert die ProvaVersandModal-Prototype.
 */
'use strict';

(function (global) {

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
    if (!resp.ok) throw new Error(json?.error || json?.message || `HTTP ${resp.status}`);
    return json;
  }

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  // Monkey-patch ProvaVersandModal wenn vorhanden
  function _enableSmtpTab() {
    if (!global.ProvaVersandModal) {
      // Versuch in 500ms erneut (script-loading-order resilient)
      setTimeout(_enableSmtpTab, 500);
      return;
    }
    const proto = global.ProvaVersandModal.prototype;
    if (proto._smtpEnabled) return;
    proto._smtpEnabled = true;

    const origRenderTab = proto._renderTab;
    proto._renderTab = function (tab) {
      if (tab === 'email') {
        this._renderEmail(this._overlay.querySelector('[data-body]'));
        return;
      }
      origRenderTab.call(this, tab);
    };

    proto._renderEmail = function (body) {
      body.innerHTML = `
        <h3>Stufe 3 — Per E-Mail versenden</h3>
        <p class="hint">Nutzt deine SMTP-Credentials. PDF-Attach oder Share-Link in Body.</p>
        <label>Empfänger-E-Mail *</label>
        <input type="email" id="vs-to" required placeholder="bauamt@example.de">
        <label>CC (optional, Komma-getrennt)</label>
        <input type="text" id="vs-cc">
        <label>Betreff</label>
        <input type="text" id="vs-subj" value="Gutachten — Aktenzeichen">
        <label>Body</label>
        <textarea id="vs-body" rows="6" style="width:100%;padding:8px 10px;border:1px solid #d4dde0;border-radius:6px;font:13px system-ui;resize:vertical">Sehr geehrte Damen und Herren,

anbei das Gutachten zum o.g. Vorgang.

Mit freundlichen Grüßen</textarea>
        <label class="row">
          <input type="radio" name="vs-mode" id="vs-mode-attach" value="attach" checked>
          <span>PDF anhängen (max 25 MB)</span>
        </label>
        <label class="row">
          <input type="radio" name="vs-mode" value="link">
          <span>Nur Share-Link in Body (Empfänger braucht Passwort separat)</span>
        </label>
        <button type="button" class="btn-primary" id="vs-smtp-send">Email versenden →</button>
        <div class="result" id="vs-result-email" style="display:none"></div>
      `;
      body.querySelector('#vs-smtp-send').addEventListener('click', async () => {
        const btn = body.querySelector('#vs-smtp-send');
        const result = body.querySelector('#vs-result-email');
        const to = body.querySelector('#vs-to').value.trim();
        const cc = body.querySelector('#vs-cc').value.trim();
        const subj = body.querySelector('#vs-subj').value.trim();
        const text = body.querySelector('#vs-body').value;
        const mode = body.querySelector('input[name="vs-mode"]:checked').value;

        if (!to) { alert('Empfänger Pflicht'); return; }
        if (!this.dokumentId) { alert('dokument_id fehlt'); return; }

        btn.disabled = true;
        btn.textContent = 'Sende…';
        try {
          // Modus 'link': erst share-create, dann Link in Body
          let bodyText = text;
          if (mode === 'link') {
            // Generate password
            const pwd = Array.from(crypto.getRandomValues(new Uint32Array(3))).map(n => n.toString(36)).join('').slice(0, 10);
            const shareJson = await _callEdge('share-create', {
              dokument_id: this.dokumentId,
              empfaenger_email: to,
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              max_zugriffe: 10,
              password: pwd
            });
            bodyText = `${text}\n\nLink: ${shareJson.share_url}\nPasswort: ${pwd}\n\n(Link gültig bis ${new Date(shareJson.valid_until).toLocaleDateString('de-DE')})`;
          }

          const payload = {
            to,
            cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : [],
            subject: subj,
            text: bodyText,
            auftrag_id: this.auftragId,
            dokument_id: this.dokumentId,
            attach_pdf: mode === 'attach'
          };

          const json = await _callEdge('smtp-senden', payload);
          if (!json.success && !json.message_id) throw new Error(json?.error || 'SMTP-Versand fehlgeschlagen');

          result.innerHTML = `
            <div class="ok"><strong>✓ E-Mail versendet</strong></div>
            <div class="hint">An: ${_esc(to)}${cc ? ' · CC: ' + _esc(cc) : ''}<br>
            ${json.message_id ? 'Message-ID: <code>' + _esc(json.message_id) + '</code>' : ''}</div>
          `;
          result.style.display = 'block';
          btn.textContent = '✓ Versendet';
        } catch (e) {
          const msg = e?.message || String(e);
          const isCredErr = /credential|smtp.*not.*config|missing.*smtp/i.test(msg);
          result.innerHTML = `
            <div class="error">Fehler: ${_esc(msg)}</div>
            ${isCredErr ? '<p class="hint">→ <strong>SMTP-Setup erforderlich:</strong> in Einstellungen → SMTP-Credentials hinterlegen, dann erneut versenden.</p>' : ''}
          `;
          result.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Email versenden →';
        }
      });
    };

    // Tab "email" aktivieren (war disabled)
    const origOpen = proto.open;
    proto.open = function () {
      origOpen.call(this);
      if (this._overlay) {
        const emailTab = this._overlay.querySelector('[data-tab="email"]');
        if (emailTab) {
          emailTab.classList.remove('is-disabled');
          emailTab.disabled = false;
          emailTab.innerHTML = '✉ Per E-Mail';
          emailTab.addEventListener('click', () => {
            this._overlay.querySelectorAll('.tab').forEach(b => b.classList.remove('is-active'));
            emailTab.classList.add('is-active');
            this._renderTab('email');
          });
        }
      }
    };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _enableSmtpTab);
    else _enableSmtpTab();
  }
})(typeof window !== 'undefined' ? window : globalThis);
