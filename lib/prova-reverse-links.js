/**
 * PROVA Reverse-Links (MEGA⁷⁰ Phase 3.2)
 *
 * Auto-Injects Auftrag/Kontakt/Rechnung-Cards in Detail-Pages.
 *
 * Pattern: Page rendert `<div data-prova-reverse-links data-auftrag-id="UUID"
 *                              data-kontakt-id="UUID" data-rechnung-id="UUID"></div>`
 * → Lib lädt verknüpfte Entitäten und rendert Card-Liste mit Quick-Action-Buttons.
 *
 * Anwendung: rechnung-detail.html, brief-detail.html, termin-detail.html
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-reverse-links-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-reverse-links-style';
    style.textContent = `
      .prl-wrap { display: flex; flex-direction: column; gap: 10px; font-family: 'DM Sans', system-ui, sans-serif; }
      .prl-card { background: var(--surface, #1c2130); border: 1px solid var(--border, rgba(255,255,255,0.10)); border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; transition: border-color .12s; text-decoration: none; color: var(--text, #eaecf4); }
      .prl-card:hover { border-color: var(--accent, #4f8ef7); }
      .prl-card-icon { font-size: 24px; line-height: 1; flex-shrink: 0; }
      .prl-card-body { flex: 1; min-width: 0; }
      .prl-card-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--text3, #8b93ab); font-weight: 700; }
      .prl-card-title { font-size: 13px; font-weight: 700; color: var(--text); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .prl-card-sub { font-size: 11px; color: var(--text2, #a3abc2); margin-top: 1px; }
      .prl-card-arrow { color: var(--text3); font-size: 16px; }
      .prl-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .prl-action { padding: 5px 11px; background: rgba(79,142,247,.08); border: 1px solid rgba(79,142,247,.25); border-radius: 6px; color: var(--accent, #4f8ef7); font: 600 11px inherit; text-decoration: none; font-family: inherit; }
      .prl-action:hover { background: rgba(79,142,247,.15); }
    `;
    document.head.appendChild(style);
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  async function _getSb() { const m = await import('/lib/supabase-client.js'); return m.supabase; }

  function _cardHtml({ icon, label, title, sub, href }) {
    return `<a class="prl-card" href="${_esc(href)}">
      <span class="prl-card-icon">${icon}</span>
      <span class="prl-card-body">
        <span class="prl-card-label">${_esc(label)}</span>
        <div class="prl-card-title">${_esc(title)}</div>
        ${sub ? `<div class="prl-card-sub">${_esc(sub)}</div>` : ''}
      </span>
      <span class="prl-card-arrow">→</span>
    </a>`;
  }

  const ProvaReverseLinks = {
    async render({ container, auftragId, kontaktId, rechnungId, currentEntity = 'rechnung' }) {
      _injectStyle();
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      el.classList.add('prl-wrap');
      const sb = await _getSb();
      const cards = [];
      const actions = [];

      if (auftragId) {
        try {
          const { data: a } = await sb.from('auftraege').select('id, az, titel, typ, phase_aktuell').eq('id', auftragId).single();
          if (a) {
            cards.push(_cardHtml({
              icon: '📂', label: 'Auftrag',
              title: a.az || a.titel || 'Auftrag',
              sub: [a.typ, a.phase_aktuell ? `Phase ${a.phase_aktuell}` : null].filter(Boolean).join(' · '),
              href: '/akte?id=' + encodeURIComponent(a.id)
            }));
            if (currentEntity !== 'auftrag') {
              actions.push(`<a class="prl-action" href="/termine.html?neu=1&auftrag=${encodeURIComponent(a.id)}">+ Termin</a>`);
              actions.push(`<a class="prl-action" href="/brief-neu.html?auftrag=${encodeURIComponent(a.id)}">+ Brief</a>`);
            }
          }
        } catch (_) {}
      }
      if (kontaktId) {
        try {
          const { data: k } = await sb.from('kontakte').select('id, name, typ, email').eq('id', kontaktId).single();
          if (k) {
            cards.push(_cardHtml({
              icon: '👤', label: 'Kontakt',
              title: k.name || 'Kontakt',
              sub: [k.typ, k.email].filter(Boolean).join(' · '),
              href: '/kontakt-detail.html?id=' + encodeURIComponent(k.id)
            }));
            if (currentEntity !== 'kontakt') {
              actions.push(`<a class="prl-action" href="/app.html?kontakt=${encodeURIComponent(k.id)}">+ Auftrag für diesen Kontakt</a>`);
            }
          }
        } catch (_) {}
      }
      if (rechnungId) {
        try {
          const { data: r } = await sb.from('dokumente').select('id, doc_nummer, betrag_brutto, mahn_stufe, bezahlt_at').eq('id', rechnungId).single();
          if (r) {
            cards.push(_cardHtml({
              icon: '💶', label: 'Rechnung',
              title: r.doc_nummer || 'Rechnung',
              sub: `${(Number(r.betrag_brutto) || 0).toFixed(2)} € · ${r.bezahlt_at ? 'bezahlt' : (r.mahn_stufe ? 'Mahnung ' + r.mahn_stufe : 'offen')}`,
              href: '/rechnungen.html?id=' + encodeURIComponent(r.id)
            }));
          }
        } catch (_) {}
      }

      el.innerHTML = cards.join('') + (actions.length ? `<div class="prl-actions">${actions.join('')}</div>` : '');
    },
    autoApply() {
      document.querySelectorAll('[data-prova-reverse-links]').forEach(el => {
        ProvaReverseLinks.render({
          container: el,
          auftragId: el.dataset.auftragId || null,
          kontaktId: el.dataset.kontaktId || null,
          rechnungId: el.dataset.rechnungId || null,
          currentEntity: el.dataset.currentEntity || 'rechnung'
        });
      });
    }
  };

  global.ProvaReverseLinks = ProvaReverseLinks;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(ProvaReverseLinks.autoApply, 800));
    else setTimeout(ProvaReverseLinks.autoApply, 800);
  }
})(typeof window !== 'undefined' ? window : globalThis);
