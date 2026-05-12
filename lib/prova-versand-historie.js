/**
 * PROVA Versand-Historie (MEGA⁶⁷ Item 5.8)
 *
 * Tabelle aller Versand-Aktionen für einen Auftrag (shares + audit_trail kategorie=export_versand).
 * "Widerrufen"-Action setzt shares.revoked_at.
 *
 * API:
 *   new ProvaVersandHistorie(container, { auftragId }).load()
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-versand-historie-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-versand-historie-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-versand-historie.css';
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

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  class ProvaVersandHistorie {
    constructor(container, opts = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      this.auftragId = opts.auftragId;
      _injectStyle();
      if (this.auftragId) this.load();
    }

    async load() {
      if (!this.container) return;
      if (!this.auftragId) {
        this.container.innerHTML = '<div class="vh-empty">Kein Auftrag ausgewählt.</div>';
        return;
      }
      this.container.innerHTML = '<div class="vh-loading">Lade Versand-Historie…</div>';

      try {
        const sb = await _getSb();
        // Load shares + audit_trail (export_versand) in parallel
        const [sharesRes, auditRes, dokRes] = await Promise.all([
          sb.from('shares')
            .select('id, dokument_id, token, empfaenger_email, empfaenger_name, valid_until, max_zugriffe, zugriffe_count, letzter_zugriff_at, erstellt_at, revoked_at')
            .order('erstellt_at', { ascending: false })
            .limit(50),
          sb.from('audit_trail')
            .select('id, action, entity_typ, payload, created_at, user_id')
            .eq('kategorie', 'export_versand')
            .or(`entity_id.eq.${this.auftragId},payload->>auftrag_id.eq.${this.auftragId}`)
            .order('created_at', { ascending: false })
            .limit(50),
          sb.from('dokumente').select('id').eq('auftrag_id', this.auftragId)
        ]);

        // Filter shares: nur die mit dokument_id der zu diesem Auftrag passt
        const auftragsDokIds = new Set((dokRes.data || []).map(d => d.id));
        const shares = (sharesRes.data || []).filter(s => auftragsDokIds.has(s.dokument_id));
        const audit = auditRes.data || [];

        const sharesHtml = shares.length === 0 ? '' : `
          <h3>Aktive Share-Links (${shares.length})</h3>
          <table class="vh-table">
            <thead><tr><th>Erstellt</th><th>Empfänger</th><th>Status</th><th>Zugriffe</th><th>Gültig bis</th><th>Action</th></tr></thead>
            <tbody>
              ${shares.map(s => {
                const status = s.revoked_at ? 'revoked' : (new Date(s.valid_until) < new Date() ? 'expired' : (s.zugriffe_count >= s.max_zugriffe ? 'maxed' : 'active'));
                return `<tr class="vh-row vh-row--${status}">
                  <td>${_esc(new Date(s.erstellt_at).toLocaleString('de-DE'))}</td>
                  <td>${_esc(s.empfaenger_email)}${s.empfaenger_name ? '<br><small>' + _esc(s.empfaenger_name) + '</small>' : ''}</td>
                  <td><span class="vh-badge vh-badge--${status}">${status}</span></td>
                  <td>${s.zugriffe_count}/${s.max_zugriffe}${s.letzter_zugriff_at ? '<br><small>' + _esc(new Date(s.letzter_zugriff_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })) + '</small>' : ''}</td>
                  <td>${_esc(new Date(s.valid_until).toLocaleDateString('de-DE'))}</td>
                  <td>${status === 'active' ? `<button type="button" class="vh-revoke" data-id="${_esc(s.id)}">Widerrufen</button>` : ''}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        `;

        const auditHtml = audit.length === 0 ? '' : `
          <h3>Versand-Aktivität (${audit.length})</h3>
          <table class="vh-table">
            <thead><tr><th>Datum</th><th>Aktion</th><th>Typ</th><th>Details</th></tr></thead>
            <tbody>
              ${audit.map(a => `<tr>
                <td>${_esc(new Date(a.created_at).toLocaleString('de-DE'))}</td>
                <td><code>${_esc(a.action)}</code></td>
                <td>${_esc(a.entity_typ || '')}</td>
                <td><small>${_esc(JSON.stringify(a.payload || {}).slice(0, 160))}</small></td>
              </tr>`).join('')}
            </tbody>
          </table>
        `;

        if (!sharesHtml && !auditHtml) {
          this.container.innerHTML = '<div class="vh-empty">Noch kein Versand. Nutze Cmd+K → "Versenden…" oder den Button im Editor.</div>';
          return;
        }
        this.container.innerHTML = sharesHtml + auditHtml;

        // Revoke-Action
        this.container.querySelectorAll('.vh-revoke').forEach(btn => {
          btn.addEventListener('click', async () => {
            const shareId = btn.dataset.id;
            if (!confirm('Diesen Share-Link wirklich widerrufen?')) return;
            await this._revoke(shareId);
            this.load();
          });
        });
      } catch (e) {
        this.container.innerHTML = `<div class="vh-error">Fehler: ${_esc(e.message)}</div>`;
      }
    }

    async _revoke(shareId) {
      const sb = await _getSb();
      const { data: share } = await sb.from('shares').select('id, workspace_id, dokument_id').eq('id', shareId).maybeSingle();
      if (!share) return;
      await sb.from('shares').update({ revoked_at: new Date().toISOString() }).eq('id', shareId);
      await sb.from('audit_trail').insert({
        workspace_id: share.workspace_id,
        user_id: (await sb.auth.getUser()).data?.user?.id,
        action: 'update',
        entity_typ: 'share',
        entity_id: shareId,
        kategorie: 'export_versand',
        payload: { revoked: true, dokument_id: share.dokument_id }
      });
    }
  }

  global.ProvaVersandHistorie = ProvaVersandHistorie;
})(typeof window !== 'undefined' ? window : globalThis);
