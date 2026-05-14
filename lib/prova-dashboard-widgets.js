/**
 * PROVA Dashboard-Widgets (MEGA⁶⁸-FINAL-3 Item E.4)
 *
 * Modulare Tiles für dashboard.html. Jedes Widget liefert HTML
 * über existing Edge-Functions oder direkten Supabase-Client.
 *
 * Public API:
 *   ProvaDashboardWidgets.render({ container, widgets: ['aktive', 'fristen', 'mahnwesen', 'ki_stats', 'aktivitaet'] })
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-dashboard-widgets-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-dashboard-widgets-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-dashboard-widgets.css';
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

  function _eur(n) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number(n) || 0);
  }

  // ─── Widget: Aktive Aufträge mit Phase-Stepper ────────────────
  async function widgetAktiveAuftraege() {
    const sb = await _getSb();
    const { data } = await sb.from('auftraege')
      .select('id, az, typ, titel, phase_aktuell, status, updated_at')
      .is('deleted_at', null)
      .neq('status', 'abgeschlossen')
      .order('updated_at', { ascending: false })
      .limit(5);
    if (!data || data.length === 0) {
      return _renderTile({
        title: 'Aktive Aufträge', icon: '📂', cta: '/auftrag-neu', ctaLabel: 'Neuer Auftrag',
        body: '<div class="dw-empty">Keine aktiven Aufträge.</div>'
      });
    }
    const phasenMaxByTyp = window.ProvaWorkflowEngine
      ? (auftrag) => (window.ProvaWorkflowEngine.getPhases(auftrag.typ) || []).length
      : () => 9;
    const body = data.map(a => {
      const totalPhases = phasenMaxByTyp(a);
      const curPhase = Number(a.phase_aktuell) || 1;
      const pct = totalPhases > 0 ? Math.round((curPhase / totalPhases) * 100) : 0;
      return `<a class="dw-row" href="/akte?az=${encodeURIComponent(a.az || a.id)}">
        <span class="dw-row-az">${_esc(a.az || a.id.slice(0,8))}</span>
        <span class="dw-row-text">${_esc(a.titel || a.typ)}</span>
        <span class="dw-phase">Phase ${curPhase}/${totalPhases}</span>
        <span class="dw-progress"><span class="dw-progress-bar" style="width:${pct}%"></span></span>
      </a>`;
    }).join('');
    return _renderTile({
      title: `Aktive Aufträge (${data.length})`, icon: '📂',
      cta: '/auftraege', ctaLabel: 'Alle anzeigen', body
    });
  }

  // ─── Widget: Fällige Fristen ──────────────────────────────────
  // MEGA⁷⁵-D Bug 3: Schema-Drift — Tabelle heißt fristen, aber Columns sind
  // datum_soll/frist_typ/notiz (siehe supabase/migrations/2026_05_11_w12_fristen_system.sql),
  // nicht faellig_am/titel. Frühere Query lieferte PostgREST-400.
  async function widgetFaelligeFristen() {
    const sb = await _getSb();
    const sieben = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);  // DATE column
    const { data } = await sb.from('fristen')
      .select('id, frist_typ, notiz, datum_soll, status, auftrag_id')
      .in('status', ['offen', 'verlaengert'])
      .is('deleted_at', null)
      .lte('datum_soll', sieben)
      .order('datum_soll', { ascending: true })
      .limit(8);
    if (!data || data.length === 0) {
      return _renderTile({
        title: 'Fristen (7 Tage)', icon: '⏰',
        body: '<div class="dw-empty">Keine fälligen Fristen ✓</div>'
      });
    }
    const now = Date.now();
    const body = data.map(f => {
      const due = new Date(f.datum_soll + 'T00:00:00').getTime();
      const days = Math.floor((due - now) / 86400000);
      const cls = days < 0 ? 'is-overdue' : (days <= 1 ? 'is-today' : 'is-soon');
      const label = days < 0 ? `vor ${Math.abs(days)} Tag(en)` : (days === 0 ? 'heute' : `in ${days} Tag(en)`);
      const labelText = f.notiz || f.frist_typ || 'Frist';
      return `<a class="dw-row ${cls}" href="/fristen.html?id=${f.id}">
        <span class="dw-row-text">${_esc(labelText)}</span>
        <span class="dw-row-meta">${_esc(label)}</span>
      </a>`;
    }).join('');
    return _renderTile({
      title: `Fällige Fristen (${data.length})`, icon: '⏰',
      cta: '/fristen.html', ctaLabel: 'Alle Fristen', body
    });
  }

  // ─── Widget: Offene Mahnungen ─────────────────────────────────
  // MEGA⁷⁵-D Bug 2: Es gibt KEINE Tabelle 'rechnungen' — Rechnungen sind
  // dokumente-Rows mit typ IN ('rechnung','rechnung_jveg','rechnung_stunden')
  // (siehe supabase-migrations/03_schema_artefakte_storage.sql Z.163).
  // Mahnstufe heißt mahn_stufe, doc-Nummer doc_nummer, Fälligkeit faelligkeit.
  async function widgetMahnungen() {
    const sb = await _getSb();
    const { data } = await sb.from('dokumente')
      .select('id, doc_nummer, kontakt_id, betrag_brutto, mahn_stufe, faelligkeit, status, typ')
      .in('typ', ['rechnung', 'rechnung_jveg', 'rechnung_stunden'])
      .in('status', ['versendet', 'ueberfaellig'])
      .is('deleted_at', null)
      .order('faelligkeit', { ascending: true, nullsFirst: false })
      .limit(5);
    if (!data || data.length === 0) {
      return _renderTile({
        title: 'Offene Mahnungen', icon: '⚠',
        body: '<div class="dw-empty">Keine offenen Mahnungen ✓</div>'
      });
    }
    const body = data.map(r => {
      const stufe = r.mahn_stufe || 0;
      const stufeLabel = stufe === 0 ? 'offen' : `Mahnung ${stufe}`;
      return `<a class="dw-row" href="/rechnungen?id=${r.id}">
        <span class="dw-row-az">${_esc(r.doc_nummer || r.id.slice(0,8))}</span>
        <span class="dw-row-text">${_eur(r.betrag_brutto)}</span>
        <span class="dw-badge dw-badge--stufe-${stufe}">${_esc(stufeLabel)}</span>
      </a>`;
    }).join('');
    return _renderTile({
      title: `Offene Mahnungen (${data.length})`, icon: '⚠',
      cta: '/mahnwesen.html', ctaLabel: 'Mahnwesen', body
    });
  }

  // ─── Widget: KI-Statistik ─────────────────────────────────────
  async function widgetKiStats() {
    const sb = await _getSb();
    const dreissig = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await sb.from('ki_protokoll')
      .select('purpose, modell_version, kosten_eur, token_input, token_output, wirkung')
      .gte('created_at', dreissig)
      .limit(2000);
    if (!data || data.length === 0) {
      return _renderTile({
        title: 'KI-Statistik (30 Tage)', icon: '✨',
        body: '<div class="dw-empty">Keine KI-Calls in den letzten 30 Tagen.</div>'
      });
    }
    const totalCalls = data.length;
    const totalKosten = data.reduce((s, r) => s + (Number(r.kosten_eur) || 0), 0);
    const totalTokens = data.reduce((s, r) => s + (Number(r.token_input) || 0) + (Number(r.token_output) || 0), 0);
    const uebernommen = data.filter(r => r.wirkung === 'uebernommen').length;
    const verworfen = data.filter(r => r.wirkung === 'verworfen').length;
    const pct = totalCalls > 0 ? Math.round((uebernommen / totalCalls) * 100) : 0;
    const body = `
      <div class="dw-grid">
        <div class="dw-stat"><div class="dw-stat-num">${totalCalls}</div><div class="dw-stat-label">KI-Calls</div></div>
        <div class="dw-stat"><div class="dw-stat-num">${_eur(totalKosten)}</div><div class="dw-stat-label">Kosten</div></div>
        <div class="dw-stat"><div class="dw-stat-num">${pct} %</div><div class="dw-stat-label">übernommen</div></div>
        <div class="dw-stat"><div class="dw-stat-num">${Math.round(totalTokens / 1000)}k</div><div class="dw-stat-label">Tokens</div></div>
      </div>
      <div class="dw-meta">
        <span>✓ übernommen: ${uebernommen}</span>
        <span>✗ verworfen: ${verworfen}</span>
      </div>`;
    return _renderTile({
      title: 'KI-Statistik (30 Tage)', icon: '✨',
      body
    });
  }

  // ─── Widget: Letzte Aktivitäten (kompakt) ─────────────────────
  async function widgetAktivitaet() {
    const sb = await _getSb();
    const { data: { session } } = await sb.auth.getSession();
    const tok = session?.access_token;
    if (!tok) return _renderTile({ title: 'Letzte Aktivitäten', icon: '📋', body: '<div class="dw-empty">Nicht angemeldet</div>' });
    try {
      const url = window.PROVA_CONFIG.SUPABASE_URL;
      const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;
      const resp = await fetch(`${url}/functions/v1/audit-narrative-v1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}`, 'apikey': anon },
        body: JSON.stringify({ limit: 5 })
      });
      const j = await resp.json();
      const narrs = j.narratives || [];
      if (narrs.length === 0) {
        return _renderTile({ title: 'Letzte Aktivitäten', icon: '📋', body: '<div class="dw-empty">Keine Aktivitäten</div>' });
      }
      const body = narrs.map(n => {
        const time = new Date(n.created_at).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        return `<div class="dw-row">
          <span class="dw-row-meta">${_esc(time)}</span>
          <span class="dw-row-text">${_esc((n.narrative || '').slice(0, 100))}</span>
        </div>`;
      }).join('');
      return _renderTile({
        title: 'Letzte Aktivitäten', icon: '📋',
        cta: 'javascript:window.ProvaMeinProtokoll?.open?.({days:7})', ctaLabel: 'Voll-Protokoll',
        body
      });
    } catch (e) {
      return _renderTile({ title: 'Letzte Aktivitäten', icon: '📋', body: `<div class="dw-empty">Fehler: ${_esc(e.message)}</div>` });
    }
  }

  // ─── Tile-Renderer ─────────────────────────────────────────────
  function _renderTile({ title, icon, body, cta, ctaLabel }) {
    return `<div class="dw-tile">
      <header class="dw-head">
        <h3><span class="dw-icon">${icon || '·'}</span> ${_esc(title)}</h3>
        ${cta ? `<a class="dw-cta" href="${_esc(cta)}">${_esc(ctaLabel || 'Mehr')} →</a>` : ''}
      </header>
      <div class="dw-body">${body}</div>
    </div>`;
  }

  // ─── Public-API ────────────────────────────────────────────────
  const ProvaDashboardWidgets = {
    async render({ container, widgets }) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      _injectStyle();
      el.classList.add('prova-dw-grid');
      el.innerHTML = '<div class="dw-loading">Lade Dashboard…</div>';
      const list = widgets || ['aktive', 'fristen', 'mahnwesen', 'ki_stats', 'aktivitaet'];
      const map = {
        aktive: widgetAktiveAuftraege,
        fristen: widgetFaelligeFristen,
        mahnwesen: widgetMahnungen,
        ki_stats: widgetKiStats,
        aktivitaet: widgetAktivitaet
      };
      const results = await Promise.all(list.map(w => map[w]?.() || Promise.resolve('')));
      el.innerHTML = results.filter(Boolean).join('');
    }
  };

  global.ProvaDashboardWidgets = ProvaDashboardWidgets;
})(typeof window !== 'undefined' ? window : globalThis);
