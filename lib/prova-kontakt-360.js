/**
 * PROVA Kontakt-360 (MEGA⁶⁸-FINAL-2 Item C.2)
 *
 * 360-Grad-View pro Kontakt: Aufträge, Korrespondenz, Termine, Rechnungen.
 * Nutzt existing kontakt-360 Edge Function.
 *
 * API:
 *   ProvaKontakt360.open(kontaktId)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-kontakt-360-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-kontakt-360-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-kontakt-360.css';
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

  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  const ProvaKontakt360 = {
    async open(kontaktId) {
      if (!kontaktId) { alert('kontakt_id erforderlich'); return; }
      if (this._active) return;
      _injectStyle();

      const overlay = document.createElement('div');
      overlay.className = 'prova-k360-overlay';
      overlay.innerHTML = `<div class="prova-k360-modal"><div class="loading">Lade Kontakt…</div></div>`;
      document.body.appendChild(overlay);
      this._active = overlay;

      const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this._active = null;
        document.removeEventListener('keydown', onKey, true);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

      try {
        const sb = await _getSb();
        const { data: { session } } = await sb.auth.getSession();
        const tok = session?.access_token;
        const url = window.PROVA_CONFIG.SUPABASE_URL;
        const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
        const resp = await fetch(`${url}/functions/v1/kontakt-360`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
          body: JSON.stringify({ kontakt_id: kontaktId })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

        const k = data.kontakt || data;
        const auftraege = data.auftraege || [];
        const briefe = data.briefe || data.korrespondenz || [];
        const termine = data.termine || [];
        const rechnungen = data.rechnungen || [];

        overlay.querySelector('.prova-k360-modal').innerHTML = `
          <header class="k360-head">
            <div>
              <h2>${_esc(k.name || k.firmenname || k.id)}</h2>
              <div class="k360-meta">${_esc(k.rolle || '')} ${k.email ? '· ' + _esc(k.email) : ''} ${k.telefon ? '· ' + _esc(k.telefon) : ''}</div>
            </div>
            <button type="button" class="close" aria-label="Schließen">✕</button>
          </header>
          <nav class="k360-tabs">
            <button class="tab is-active" data-tab="auftraege">Aufträge (${auftraege.length})</button>
            <button class="tab" data-tab="briefe">Korrespondenz (${briefe.length})</button>
            <button class="tab" data-tab="termine">Termine (${termine.length})</button>
            <button class="tab" data-tab="rechnungen">Rechnungen (${rechnungen.length})</button>
          </nav>
          <div class="k360-body" data-body></div>
        `;
        overlay.querySelector('.close').addEventListener('click', close);

        const body = overlay.querySelector('[data-body]');
        const render = (tab) => {
          let list = [];
          let renderRow = null;
          if (tab === 'auftraege') {
            list = auftraege;
            renderRow = (a) => `<li><a href="/akte?az=${encodeURIComponent(a.az)}">${_esc(a.az)} — ${_esc(a.titel || a.schadenart || '')}</a><span class="row-meta">${_esc(a.phase_aktuell || '')}</span></li>`;
          } else if (tab === 'briefe') {
            list = briefe;
            renderRow = (b) => `<li><a href="/briefe?id=${b.id}">${_esc(b.titel || b.brief_typ || b.id)}</a><span class="row-meta">${_esc(b.versendet_am || b.erstellt_am || '')}</span></li>`;
          } else if (tab === 'termine') {
            list = termine;
            renderRow = (t) => `<li><a href="/termine?id=${t.id}">${_esc(t.titel || 'Termin')}</a><span class="row-meta">${_esc(t.start_at ? new Date(t.start_at).toLocaleString('de-DE') : '')}</span></li>`;
          } else if (tab === 'rechnungen') {
            list = rechnungen;
            renderRow = (r) => `<li><a href="/rechnungen?id=${r.id}">${_esc(r.rechnungsnr || r.id)}</a><span class="row-meta">${_esc(r.betrag_brutto || '')} ${_esc(r.status || '')}</span></li>`;
          }
          body.innerHTML = list.length === 0
            ? `<div class="k360-empty">Keine Einträge</div>`
            : `<ul class="k360-list">${list.map(renderRow).join('')}</ul>`;
        };
        render('auftraege');
        overlay.querySelectorAll('.tab').forEach(btn => {
          btn.addEventListener('click', () => {
            overlay.querySelectorAll('.tab').forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            render(btn.dataset.tab);
          });
        });
      } catch (e) {
        overlay.querySelector('.prova-k360-modal').innerHTML = `<div class="error">Fehler: ${_esc(e.message)}</div>`;
      }
    }
  };

  global.ProvaKontakt360 = ProvaKontakt360;
})(typeof window !== 'undefined' ? window : globalThis);
