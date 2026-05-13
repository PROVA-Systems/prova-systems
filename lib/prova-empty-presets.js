/**
 * PROVA Empty-Presets (MEGA⁷⁰ Phase 2.2)
 *
 * Standardisierte Empty-States für 8 Listen-Pages.
 * Nutzt existing ProvaUI.emptyState (lib/empty-states.js).
 *
 * Auto-Apply Pattern:
 *   <div data-empty-preset="rechnungen" data-empty-target="#rg-rows"></div>
 *   → wird automatisch beim Page-Load gerendert wenn Container leer
 *
 * Manuell:
 *   ProvaEmptyPresets.render('#rg-rows', 'rechnungen')
 */
'use strict';

(function (global) {

  const PRESETS = {
    archiv: {
      icon: '📋',
      title: 'Noch keine Aufträge im Archiv',
      text: 'Hier landen alle abgeschlossenen Aufträge. Dein erster Auftrag erscheint nach Freigabe automatisch.',
      primaryBtn: { label: '+ Neuer Auftrag', href: '/app.html' },
      secondaryBtn: { label: 'Zur Zentrale', href: '/dashboard.html' }
    },
    rechnungen: {
      icon: '💶',
      title: 'Noch keine Rechnungen',
      text: 'Rechnungen entstehen automatisch nach Auftrags-Freigabe. Du kannst auch manuell eine Rechnung anlegen.',
      primaryBtn: { label: '+ Manuelle Rechnung', href: '/rechnung-neu.html' },
      secondaryBtn: { label: 'JVEG-Rechner', href: '/jveg.html' }
    },
    briefe: {
      icon: '✉',
      title: 'Noch keine Briefe',
      text: 'Briefe und Schreiben aus Vorlagen — Empfangsbestätigung, Nachforderung, Honorar-Vereinbarung u.a.',
      primaryBtn: { label: '+ Neuer Brief', href: '/brief-neu.html' },
      secondaryBtn: { label: 'Vorlagen ansehen', href: '/briefvorlagen.html' }
    },
    kontakte: {
      icon: '👥',
      title: 'Noch keine Kontakte',
      text: 'Auftraggeber, Geschädigte, Anwälte, Versicherungen — alle deine Beteiligten an einem Ort.',
      primaryBtn: { label: '+ Neuer Kontakt', href: '/kontakt-neu.html' }
    },
    mahnwesen: {
      icon: '✅',
      title: 'Keine offenen Forderungen',
      text: 'Alle Rechnungen sind bezahlt oder noch nicht fällig. Mahnwesen aktiviert sich automatisch ab 14 Tagen Verzug.',
      primaryBtn: { label: 'Zu den Rechnungen', href: '/rechnungen.html' }
    },
    bescheinigungen: {
      icon: '📑',
      title: 'Noch keine Bescheinigungen',
      text: 'Bescheinigungen für Kostenträger, Versicherer oder Privatkunden — schnell aus Vorlage erstellt.',
      primaryBtn: { label: '+ Neue Bescheinigung', href: '/bescheinigung-erstellen.html' }
    },
    fristen: {
      icon: '⏰',
      title: 'Keine Fristen aktiv',
      text: 'Fristen entstehen automatisch beim Anlegen eines Auftrags (Pipeline) oder manuell als Einzel-Frist.',
      primaryBtn: { label: '+ Einzel-Frist', href: '/fristen.html?neu=1' },
      secondaryBtn: { label: 'Pipeline anwenden', href: '/fristen.html?pipeline=1' }
    },
    eintraege: {
      icon: '🎙',
      title: 'Noch keine Einträge',
      text: 'Diktate, Notizen und manuelle Texte zum aktuellen Auftrag — gerichtsfest dokumentiert.',
      primaryBtn: { label: '+ Eintrag erstellen', href: '/eintraege.html?neu=1' }
    }
  };

  function _wait(cond, timeout = 4000) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const i = setInterval(() => {
        if (cond()) { clearInterval(i); resolve(true); }
        else if (Date.now() - t0 > timeout) { clearInterval(i); resolve(false); }
      }, 80);
    });
  }

  const ProvaEmptyPresets = {
    presets: PRESETS,
    render(target, presetKey) {
      const p = PRESETS[presetKey];
      if (!p) { console.warn('[prova-empty-presets] unknown preset:', presetKey); return; }
      if (window.ProvaUI && typeof window.ProvaUI.emptyState === 'function') {
        window.ProvaUI.emptyState(target, p);
      } else {
        // Fallback: minimal inline HTML
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;
        el.innerHTML = `<div style="padding:48px 20px;text-align:center;color:var(--text3);">
          <div style="font-size:48px;margin-bottom:12px;opacity:.5;">${p.icon}</div>
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">${p.title}</div>
          <div style="font-size:13px;margin-bottom:18px;max-width:420px;margin:0 auto 18px;line-height:1.5;">${p.text}</div>
          ${p.primaryBtn ? `<a href="${p.primaryBtn.href}" style="display:inline-block;padding:9px 18px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:700;text-decoration:none;border-radius:8px;font-size:13px;">${p.primaryBtn.label}</a>` : ''}
          ${p.secondaryBtn ? `<a href="${p.secondaryBtn.href}" style="display:inline-block;margin-left:8px;padding:9px 18px;color:var(--text2);text-decoration:underline;font-size:13px;">${p.secondaryBtn.label}</a>` : ''}
        </div>`;
      }
    },
    // Auto-Detect: Container mit data-empty-preset Attribute scannen
    autoApply() {
      document.querySelectorAll('[data-empty-preset]').forEach(el => {
        const preset = el.dataset.emptyPreset;
        const targetSel = el.dataset.emptyTarget;
        const target = targetSel ? document.querySelector(targetSel) : el;
        if (!target) return;
        // Nur rendern wenn Target leer (oder einen Loading-Indicator zeigt)
        const isEmpty = !target.children.length || target.querySelector('.loading, .skel, .bib-loading, .mh-loading, .fr-loading');
        if (isEmpty) ProvaEmptyPresets.render(target, preset);
      });
    }
  };

  global.ProvaEmptyPresets = ProvaEmptyPresets;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(ProvaEmptyPresets.autoApply, 1500));
    else setTimeout(ProvaEmptyPresets.autoApply, 1500);
  }
})(typeof window !== 'undefined' ? window : globalThis);
