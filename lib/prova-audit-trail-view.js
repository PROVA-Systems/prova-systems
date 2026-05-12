/**
 * PROVA Audit-Trail-View (MEGA⁶⁷ Item 5.3)
 *
 * Two-Tab UI: Human-Narrative (Default) + Tech-Log.
 * Human: audit-narrative-v1 Edge Function (existing MEGA⁶²)
 * Tech: direkter Query auf audit_trail + ki_protokoll
 * Hash-Chain-Verifikation: ✓/⚠ pro Tech-Row.
 *
 * API:
 *   ProvaAuditTrailView.open({ auftragId, openExportPdf? })
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-audit-trail-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-audit-trail-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-audit-trail-view.css';
    document.head.appendChild(link);
  }

  async function _getSb() {
    if (_getSb._c) return _getSb._c;
    const url = window.PROVA_CONFIG?.SUPABASE_URL;
    const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
    const mod = await import('https://esm.sh/@supabase/supabase-js@2.105.0');
    _getSb._c = mod.createClient(url, key, { auth: { persistSession: true } });
    return _getSb._c;
  }

  async function _callEdge(name, body) {
    const sb = await _getSb();
    const { data: { session } } = await sb.auth.getSession();
    const tok = session?.access_token;
    const url = window.PROVA_CONFIG.SUPABASE_URL;
    const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
    const resp = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);
    return json;
  }

  async function _sha256Hex(s) {
    const buf = new TextEncoder().encode(s);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const ProvaAuditTrailView = {
    async open({ auftragId, openExportPdf }) {
      if (!auftragId) { alert('auftrag_id Pflicht'); return; }
      if (this._activeModal) return;
      _injectStyle();

      const overlay = document.createElement('div');
      overlay.className = 'prova-audit-trail-overlay';
      overlay.innerHTML = `
        <div class="prova-audit-trail-modal">
          <header>
            <h2>Audit-Protokoll · Auftrag <span class="aid">${this._esc(auftragId)}</span></h2>
            <div class="actions">
              <button type="button" class="tab is-active" data-tab="human">Human-Lesbar</button>
              <button type="button" class="tab" data-tab="tech">Technisch Roh</button>
              <button type="button" class="btn-pdf">⇣ PDF-Export</button>
              <button type="button" class="close" aria-label="Schließen">✕</button>
            </div>
          </header>
          <div class="body" data-body>
            <div class="loading">Lade Audit-Daten…</div>
          </div>
          <footer class="audit-foot">
            <span class="hash-status"></span>
            <span class="counter"></span>
          </footer>
        </div>
      `;
      document.body.appendChild(overlay);
      this._activeModal = overlay;

      const body = overlay.querySelector('[data-body]');
      let currentTab = 'human';
      let techData = null;
      let humanData = null;

      const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this._activeModal = null;
        document.removeEventListener('keydown', onKey, true);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey, true);
      overlay.querySelector('.close').addEventListener('click', close);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      overlay.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
          overlay.querySelectorAll('.tab').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          currentTab = btn.dataset.tab;
          render();
        });
      });
      overlay.querySelector('.btn-pdf').addEventListener('click', () => {
        if (typeof openExportPdf === 'function') openExportPdf(auftragId);
        else this._exportPdfDirect(auftragId);
      });

      async function loadHuman() {
        if (humanData) return;
        try {
          const result = await _callEdge('audit-narrative-v1', { auftrag_id: auftragId, limit: 200 });
          humanData = result;
        } catch (e) {
          humanData = { error: e.message, narratives: [] };
        }
      }

      async function loadTech() {
        if (techData) return;
        try {
          const sb = await _getSb();
          const [auditRes, kiRes] = await Promise.all([
            sb.from('audit_trail')
              .select('id, action, entity_typ, entity_id, payload, source, ki_model, kategorie, integrity_hash, prev_hash, created_at, user_id')
              .or(`entity_id.eq.${auftragId},payload->>auftrag_id.eq.${auftragId}`)
              .order('created_at', { ascending: true })
              .limit(500),
            sb.from('ki_protokoll')
              .select('id, purpose, feature_kontext, modell_version, provider, kosten_eur, dauer_ms, status, wirkung, wirkung_set_at, output_preview, created_at')
              .eq('auftrag_id', auftragId)
              .order('created_at', { ascending: true })
              .limit(500)
          ]);
          techData = {
            audit: auditRes.data || [],
            ki: kiRes.data || [],
            errors: [auditRes.error, kiRes.error].filter(Boolean)
          };
        } catch (e) {
          techData = { error: e.message, audit: [], ki: [] };
        }
      }

      async function render() {
        body.innerHTML = '<div class="loading">Lade…</div>';
        if (currentTab === 'human') {
          await loadHuman();
          renderHuman();
        } else {
          await loadTech();
          await renderTech();
        }
      }

      function renderHuman() {
        if (humanData?.error) {
          body.innerHTML = `<div class="error">Fehler: ${humanData.error}</div>`;
          return;
        }
        const narrs = humanData?.narratives || [];
        if (narrs.length === 0) {
          body.innerHTML = '<div class="empty">Keine Audit-Einträge für diesen Auftrag.</div>';
          return;
        }
        const html = '<ol class="human-list">' + narrs.map(n => {
          const d = new Date(n.created_at);
          const time = d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
          return `<li class="human-row" data-kat="${ProvaAuditTrailView._esc(n.kategorie || '')}">
            <span class="time">${time}</span>
            <span class="narrative">${ProvaAuditTrailView._esc(n.narrative || '')}</span>
            ${n.kategorie ? `<span class="kat kat-${n.kategorie}">${n.kategorie}</span>` : ''}
          </li>`;
        }).join('') + '</ol>';
        body.innerHTML = html;
        overlay.querySelector('.counter').textContent = `${narrs.length} Einträge`;
      }

      async function renderTech() {
        if (techData?.error) {
          body.innerHTML = `<div class="error">Fehler: ${techData.error}</div>`;
          return;
        }
        const audit = techData?.audit || [];
        const ki = techData?.ki || [];
        // Hash-Chain Verify
        const hashCheck = await verifyHashChain(audit);
        const passed = hashCheck.broken.length === 0;
        overlay.querySelector('.hash-status').innerHTML = passed
          ? `<span class="hash-ok">✓ Hash-Chain intakt (${audit.length} Einträge)</span>`
          : `<span class="hash-warn">⚠ Hash-Chain unterbrochen bei ${hashCheck.broken.length} Einträgen</span>`;
        overlay.querySelector('.counter').textContent = `${audit.length} audit_trail · ${ki.length} ki_protokoll`;

        const auditHtml = audit.length === 0 ? '<div class="empty">Keine audit_trail-Einträge.</div>' : `
          <h3>audit_trail (${audit.length})</h3>
          <table class="tech-table">
            <thead>
              <tr><th>Hash</th><th>Datum</th><th>Action</th><th>Entity</th><th>Kategorie</th><th>Source</th><th>Modell</th></tr>
            </thead>
            <tbody>
              ${audit.map(r => `<tr class="${hashCheck.broken.includes(r.id) ? 'is-broken' : 'is-ok'}">
                <td><span class="hash-cell" title="${ProvaAuditTrailView._esc(r.integrity_hash || '')}">${hashCheck.broken.includes(r.id) ? '⚠' : '✓'}</span></td>
                <td>${new Date(r.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' })}</td>
                <td><code>${ProvaAuditTrailView._esc(r.action)}</code></td>
                <td>${ProvaAuditTrailView._esc(r.entity_typ || '')}</td>
                <td>${r.kategorie ? `<span class="kat kat-${r.kategorie}">${r.kategorie}</span>` : ''}</td>
                <td>${ProvaAuditTrailView._esc(r.source || '')}</td>
                <td>${ProvaAuditTrailView._esc(r.ki_model || '')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        `;
        const kiHtml = ki.length === 0 ? '' : `
          <h3>ki_protokoll (${ki.length})</h3>
          <table class="tech-table">
            <thead><tr><th>Datum</th><th>Purpose</th><th>Modell</th><th>Wirkung</th><th>Kosten</th><th>Status</th></tr></thead>
            <tbody>
              ${ki.map(r => `<tr>
                <td>${new Date(r.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' })}</td>
                <td>${ProvaAuditTrailView._esc(r.purpose)}</td>
                <td>${ProvaAuditTrailView._esc(r.modell_version || '')}</td>
                <td><span class="wirkung wirkung-${r.wirkung || 'vorschlag'}">${r.wirkung || 'vorschlag'}</span></td>
                <td>${r.kosten_eur ? (Math.round(r.kosten_eur * 10000) / 100) + ' ct' : '-'}</td>
                <td>${ProvaAuditTrailView._esc(r.status)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        `;
        body.innerHTML = auditHtml + kiHtml;
      }

      async function verifyHashChain(audit) {
        // Verify each row: prev_hash should match previous row's integrity_hash
        const broken = [];
        for (let i = 1; i < audit.length; i++) {
          const prev = audit[i - 1];
          const cur = audit[i];
          if (cur.prev_hash && prev.integrity_hash && cur.prev_hash !== prev.integrity_hash) {
            broken.push(cur.id);
          }
        }
        return { broken };
      }

      render();
    },

    async _exportPdfDirect(auftragId) {
      try {
        const sb = await _getSb();
        const { data: { session } } = await sb.auth.getSession();
        const tok = session?.access_token;
        const url = window.PROVA_CONFIG.SUPABASE_URL;
        const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
        const resp = await fetch(`${url}/functions/v1/audit-export-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
          body: JSON.stringify({ auftrag_id: auftragId })
        });
        if (!resp.ok) {
          const txt = await resp.text();
          alert('PDF-Export fehlgeschlagen: ' + txt.slice(0, 200));
          return;
        }
        // PDF kann als Blob oder URL kommen
        const ct = resp.headers.get('Content-Type') || '';
        if (ct.includes('application/pdf')) {
          const blob = await resp.blob();
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `audit-${auftragId.slice(0, 8)}.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        } else {
          const json = await resp.json();
          if (json.pdf_url) window.open(json.pdf_url, '_blank');
          else alert('PDF nicht verfügbar — Response: ' + JSON.stringify(json).slice(0, 200));
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },

    _esc(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    }
  };

  global.ProvaAuditTrailView = ProvaAuditTrailView;
})(typeof window !== 'undefined' ? window : globalThis);
