/**
 * PROVA — referral-ui.js (MEGA²⁷)
 *
 * Frontend-UI-Komponenten fuer Referral-System:
 *   - Dashboard-Karte "Kollegen einladen"
 *   - Modal #1: Empfehlung erstellen
 *   - Modal #2: Empfehlungs-History
 *
 * UMD-Pattern. Nutzt lib/referral-system.js fuer pure-functions.
 *
 * Public API:
 *   ProvaReferralUI.renderCard(opts) → HTML-String
 *   ProvaReferralUI.openCreateModal() → void (mountet Modal in body)
 *   ProvaReferralUI.openHistoryModal() → void
 *   ProvaReferralUI.attach(rootEl, opts) → controller (mount + auto-load stats)
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.ProvaReferralUI = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {

  function _esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Render Dashboard-Karte HTML.
   * @param {object} opts { stats, isFoundingMember, eligible }
   * @returns {string}
   */
  function renderCard(opts) {
    opts = opts || {};
    const stats = opts.stats || {};
    const isFounding = !!opts.isFoundingMember;
    const totalRewarded = stats.total_rewarded || 0;
    const totalSent = (stats.total_pending || 0) + (stats.total_active || 0)
      + (stats.total_hold || 0) + totalRewarded;
    const max = 12;
    const remaining = Math.max(0, max - totalSent);
    const progressPct = Math.min(100, Math.round((totalSent / max) * 100));

    const disabledAttr = isFounding ? '' : ' disabled aria-disabled="true"';
    const disabledStyle = isFounding ? '' : 'opacity:0.55;cursor:not-allowed;';
    const badgeText = isFounding
      ? totalSent + ' / ' + max + ' Empfehlungen · ' + totalRewarded + ' Monate verdient'
      : 'Empfehlungs-Programm exklusiv für Founding-Members';

    return '<div class="prova-referral-card" style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);border-radius:14px;padding:22px;color:#fff;box-shadow:0 8px 24px rgba(30,58,138,0.25);' + disabledStyle + '">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
      + '<span style="font-size:24px;line-height:1;">🎁</span>'
      + '<h3 style="margin:0;font-size:18px;font-weight:700;">Empfehlen lohnt sich!</h3>'
      + '</div>'
      + '<p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:rgba(255,255,255,0.85);">'
      + 'Du bekommst <strong>1 Monat gratis</strong>, dein Kollege <strong>50 € Rabatt</strong>'
      + (isFounding ? '' : ' (Founding-Members only)')
      + '</p>'
      + '<div style="font-size:11px;color:rgba(255,255,255,0.78);margin-bottom:8px;">' + _esc(badgeText) + '</div>'
      + '<div role="progressbar" aria-valuenow="' + progressPct + '" aria-valuemin="0" aria-valuemax="100" style="background:rgba(255,255,255,0.18);height:8px;border-radius:4px;overflow:hidden;margin-bottom:14px;">'
      + '<div style="background:#fbbf24;height:8px;width:' + progressPct + '%;transition:width 0.3s ease;"></div>'
      + '</div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
      + '<button class="prova-referral-create-btn"' + disabledAttr + ' style="background:#fff;color:#1e3a8a;border:none;border-radius:10px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;min-height:44px;' + (isFounding ? '' : 'cursor:not-allowed;') + '">Kollegen einladen</button>'
      + '<button class="prova-referral-history-btn" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.35);border-radius:10px;padding:10px 18px;font-size:13px;cursor:pointer;font-family:inherit;min-height:44px;">Bisherige ansehen</button>'
      + '</div>'
      + '</div>';
  }

  function _modalShellHtml(titleEsc, bodyHtml, footerHtml) {
    return '<div class="prova-referral-overlay" role="dialog" aria-modal="true" aria-labelledby="prova-referral-title" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9500;padding:20px;">'
      + '<div class="prova-referral-modal" style="background:#fff;color:#0f172a;max-width:520px;width:100%;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,0.35);max-height:90vh;overflow-y:auto;">'
      + '<div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;">'
      + '<h3 id="prova-referral-title" style="margin:0;font-size:18px;font-weight:700;">' + titleEsc + '</h3>'
      + '</div>'
      + '<div class="prova-referral-body" style="padding:20px 22px;">' + bodyHtml + '</div>'
      + '<div class="prova-referral-footer" style="padding:14px 22px 20px;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;border-top:1px solid #e2e8f0;">' + footerHtml + '</div>'
      + '</div></div>';
  }

  /**
   * Build Create-Modal-HTML (string-only, kein DOM-Mount).
   */
  function buildCreateModalHtml(opts) {
    opts = opts || {};
    const stats = opts.stats || {};
    const totalSent = (stats.total_pending || 0) + (stats.total_active || 0)
      + (stats.total_hold || 0) + (stats.total_rewarded || 0);
    const remaining = Math.max(0, 12 - totalSent);

    const body = '<form class="prova-referral-form" novalidate>'
      + '<label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">Email-Adresse des Kollegen *</label>'
      + '<input type="email" name="email" required class="prova-referral-email" placeholder="lisa@kanzlei-xyz.de" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;margin-bottom:14px;" />'
      + '<label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">Persoenliche Nachricht (optional)</label>'
      + '<textarea name="message" maxlength="500" rows="3" class="prova-referral-message" placeholder="Hi Lisa, schau dir PROVA an..." style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;box-sizing:border-box;margin-bottom:6px;"></textarea>'
      + '<div class="prova-referral-charcount" style="font-size:11px;color:#64748b;text-align:right;margin-bottom:14px;">0 / 500</div>'
      + '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;font-size:12px;line-height:1.7;color:#0f172a;margin-bottom:8px;">'
      + '✨ <strong>Du bekommst:</strong> 1 Monat gratis<br>'
      + '💎 <strong>Dein Kollege:</strong> 50 € Rabatt<br>'
      + '⏰ Code 7 Tage gültig<br>'
      + '🛡️ Reward nach 30 Tagen aktiver Sub<br>'
      + '📊 Empfehlungen: ' + totalSent + ' / 12 (' + remaining + ' verbleibend)'
      + '</div>'
      + '<div class="prova-referral-status" role="status" style="display:none;margin-top:8px;font-size:13px;"></div>'
      + '</form>';

    const footer = '<button type="button" class="prova-referral-cancel" style="background:transparent;border:1px solid #cbd5e1;color:#475569;border-radius:8px;padding:10px 18px;font-size:13px;cursor:pointer;min-height:44px;font-family:inherit;">Abbrechen</button>'
      + '<button type="button" class="prova-referral-submit" style="background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;min-height:44px;font-family:inherit;">Einladung senden</button>';

    return _modalShellHtml('👥 Kollegen einladen', body, footer);
  }

  /**
   * Build History-Modal-HTML.
   * @param {object} opts { items, stats }
   */
  function buildHistoryModalHtml(opts) {
    opts = opts || {};
    const items = Array.isArray(opts.items) ? opts.items : [];
    const stats = opts.stats || {};
    const totalSent = (stats.total_pending || 0) + (stats.total_active || 0)
      + (stats.total_hold || 0) + (stats.total_rewarded || 0);
    const totalRewarded = stats.total_rewarded || 0;

    let rows = '';
    if (items.length === 0) {
      rows = '<tr><td colspan="3" style="padding:20px;text-align:center;font-style:italic;color:#94a3b8;">Noch keine Empfehlungen versendet</td></tr>';
    } else {
      const Lib = (typeof window !== 'undefined' && window.ProvaReferral)
        || (typeof require === 'function' ? require('./referral-system.js') : null);
      rows = items.map(it => {
        const dateStr = it.created_at ? new Date(it.created_at).toLocaleDateString('de-DE') : '—';
        const label = Lib && Lib.statusLabel ? Lib.statusLabel(it.status) : it.status;
        return '<tr style="border-top:1px solid #e2e8f0;">'
          + '<td style="padding:8px 6px;font-size:12px;font-family:ui-monospace,monospace;">' + _esc((it.referred_email || '').slice(0, 28)) + '</td>'
          + '<td style="padding:8px 6px;font-size:12px;color:#64748b;">' + _esc(dateStr) + '</td>'
          + '<td style="padding:8px 6px;font-size:12px;font-weight:600;">' + _esc(label) + '</td>'
          + '</tr>';
      }).join('');
    }

    const body = '<div style="font-size:13px;color:#475569;margin-bottom:12px;">'
      + 'Insgesamt: <strong>' + totalSent + '</strong> versendet · <strong>' + totalRewarded + '</strong> belohnt'
      + (totalRewarded > 0 ? ' (= ' + (totalRewarded * 99) + ' € Wert)' : '')
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse;">'
      + '<thead><tr style="text-align:left;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:0.06em;background:#f8fafc;">'
      + '<th style="padding:8px 6px;">Email</th><th style="padding:8px 6px;">Datum</th><th style="padding:8px 6px;">Status</th>'
      + '</tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table>';

    const footer = '<button type="button" class="prova-referral-close" style="background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:13px;cursor:pointer;min-height:44px;font-family:inherit;">Schließen</button>';

    return _modalShellHtml('📊 Deine Empfehlungen', body, footer);
  }

  function attach(rootEl, opts) {
    if (!rootEl) throw new Error('attach: rootEl required');
    opts = opts || {};
    rootEl.innerHTML = renderCard({ stats: opts.stats || {}, isFoundingMember: !!opts.isFoundingMember });

    const createBtn = rootEl.querySelector('.prova-referral-create-btn');
    const historyBtn = rootEl.querySelector('.prova-referral-history-btn');

    if (createBtn) {
      createBtn.addEventListener('click', function () {
        if (createBtn.disabled) return;
        if (typeof opts.onOpenCreate === 'function') opts.onOpenCreate();
      });
    }
    if (historyBtn) {
      historyBtn.addEventListener('click', function () {
        if (typeof opts.onOpenHistory === 'function') opts.onOpenHistory();
      });
    }
    return {
      refresh: (newStats) => {
        rootEl.innerHTML = renderCard({ stats: newStats, isFoundingMember: !!opts.isFoundingMember });
      }
    };
  }

  return {
    renderCard,
    buildCreateModalHtml,
    buildHistoryModalHtml,
    attach,
    escapeHtml: _esc
  };
});
