/**
 * PROVA Mein-Aktivitätsprotokoll (MEGA⁶⁸-FINAL-2 Item C.3)
 *
 * Eigene Aktivitäten der letzten Tage als Timeline.
 * Nutzt existing mein-aktivitaetsprotokoll Edge Function.
 *
 * API:
 *   ProvaMeinProtokoll.open({ days?, kategorie? })
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-mein-protokoll-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-mein-protokoll-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-mein-protokoll.css';
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

  const ProvaMeinProtokoll = {
    async open(opts = {}) {
      if (this._active) return;
      _injectStyle();

      const days = opts.days || 7;
      const overlay = document.createElement('div');
      overlay.className = 'prova-mprot-overlay';
      overlay.innerHTML = `<div class="prova-mprot-modal"><div class="loading">Lade Aktivitäten…</div></div>`;
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
        const resp = await fetch(`${url}/functions/v1/mein-aktivitaetsprotokoll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
          body: JSON.stringify({ days, kategorie: opts.kategorie || null })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
        const events = data.events || data.aktivitaeten || data.narratives || [];

        // Group by day
        const grouped = events.reduce((acc, ev) => {
          const day = new Date(ev.created_at || ev.timestamp).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
          (acc[day] = acc[day] || []).push(ev);
          return acc;
        }, {});

        overlay.querySelector('.prova-mprot-modal').innerHTML = `
          <header>
            <h2>Mein Aktivitätsprotokoll</h2>
            <div class="filters">
              <select id="days-filter">
                <option value="1">Heute</option>
                <option value="3">3 Tage</option>
                <option value="7" selected>7 Tage</option>
                <option value="30">30 Tage</option>
              </select>
              <button class="close">✕</button>
            </div>
          </header>
          <div class="mprot-body">
            ${events.length === 0 ? '<div class="empty">Keine Aktivitäten in diesem Zeitraum.</div>' : ''}
            ${Object.entries(grouped).map(([day, evs]) => `
              <section class="day-section">
                <h3>${_esc(day)} <span class="day-count">${evs.length}</span></h3>
                <ul class="event-list">
                  ${evs.map(ev => {
                    const time = new Date(ev.created_at || ev.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                    return `<li class="event-row" data-kat="${_esc(ev.kategorie || '')}">
                      <span class="event-time">${time}</span>
                      <span class="event-text">${_esc(ev.narrative || ev.beschreibung || ev.action || '')}</span>
                      ${ev.kategorie ? `<span class="event-kat kat-${_esc(ev.kategorie)}">${_esc(ev.kategorie)}</span>` : ''}
                    </li>`;
                  }).join('')}
                </ul>
              </section>
            `).join('')}
          </div>
          <footer>${events.length} Einträge in den letzten ${days} Tag${days === 1 ? '' : 'en'}</footer>
        `;

        overlay.querySelector('.close').addEventListener('click', close);
        overlay.querySelector('#days-filter').addEventListener('change', (e) => {
          close();
          ProvaMeinProtokoll.open({ days: parseInt(e.target.value, 10), kategorie: opts.kategorie });
        });
      } catch (e) {
        overlay.querySelector('.prova-mprot-modal').innerHTML = `<div class="error">Fehler: ${_esc(e.message)}</div>`;
      }
    }
  };

  global.ProvaMeinProtokoll = ProvaMeinProtokoll;
})(typeof window !== 'undefined' ? window : globalThis);
