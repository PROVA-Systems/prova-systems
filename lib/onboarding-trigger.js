/**
 * PROVA Onboarding-Trigger (3 Mode-Cards Wizard)
 * MEGA¹⁷-PERFECTION W61 (2026-05-08)
 *
 * Zeigt bei erstem Login einen Modal-Wizard mit 3 Mode-Karten:
 *   A — PROVA-Standard (Empfohlen fuer junge SVs)
 *   B — Editor-Modus (TipTap, fuer Edit-Liebhaber)
 *   C — Eigene Vorlagen (Migration von Gutachten Manager)
 *
 * Trigger-Logik (in Reihenfolge):
 *   1. localStorage.prova_onboarding_done === '1' → kein Modal
 *   2. URL-Param ?onboarding=force → Modal zeigen
 *   3. user_workflow_settings.default_mode existiert + !=null → kein Modal
 *      (User hat bereits gewaehlt; setze done-Flag)
 *   4. Sonst → Modal zeigen
 *
 * Nach Klick auf Mode-Card:
 *   - PATCH /netlify/functions/user-workflow-settings { default_mode }
 *   - localStorage.prova_onboarding_done = '1'
 *   - Modal schliesst, Toast "Einstellung gespeichert"
 *
 * "Spaeter entscheiden" = setzt done-Flag aber updated kein Mode (bleibt Default 'A').
 *
 * Public API:
 *   ProvaOnboarding.maybeShow()   // automatisch von dashboard.html init
 *   ProvaOnboarding.forceShow()   // erzwingen (Settings-Page Button)
 *   ProvaOnboarding.isDone()      // bool
 */
'use strict';

(function () {
  const STORAGE_KEY = 'prova_onboarding_done';
  let _shown = false;

  function isDone() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function _markDone() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
  }

  async function maybeShow() {
    if (_shown) return;
    if (isDone()) return;

    // Force via URL-Param fuer Re-Onboarding
    const params = new URLSearchParams(window.location.search);
    const force = params.get('onboarding') === 'force';

    if (!force) {
      // Pruefe ob User schon einen Mode gewaehlt hat
      try {
        if (window.ProvaWorkflowMode && window.ProvaWorkflowMode.fetchSettings) {
          const settings = await window.ProvaWorkflowMode.fetchSettings();
          if (settings && !settings._fallback && settings.default_mode) {
            // User hat schon gewaehlt — done markieren
            _markDone();
            return;
          }
        }
      } catch (_) { /* fallthrough — Modal anzeigen */ }
    }

    _renderModal();
  }

  function forceShow() {
    _renderModal();
  }

  function _renderModal() {
    if (_shown) return;
    _shown = true;

    const overlay = document.createElement('div');
    overlay.id = 'prova-onboarding-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'prova-onboarding-title');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif;';

    overlay.innerHTML = `
      <div style="background:#1c2130;border:1px solid rgba(255,255,255,0.1);border-radius:14px;max-width:780px;width:100%;padding:30px;color:#eaecf4;box-shadow:0 20px 60px rgba(0,0,0,0.5);max-height:90vh;overflow-y:auto;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:34px;margin-bottom:8px;">👋</div>
          <h2 id="prova-onboarding-title" style="font-size:22px;font-weight:700;margin:0 0 6px;">Willkommen bei PROVA!</h2>
          <p style="font-size:14px;color:#8b93ab;margin:0;">Wie moechtest Du Deine Gutachten erstellen?</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px;">
          <button class="prova-onb-card" data-mode="A" style="background:#161a22;border:2px solid rgba(79,142,247,0.25);border-radius:10px;padding:18px;color:inherit;cursor:pointer;text-align:left;transition:all 0.2s;font-family:inherit;">
            <div style="font-size:28px;margin-bottom:6px;">🏗️</div>
            <div style="font-size:15px;font-weight:700;color:#eaecf4;margin-bottom:4px;">Mode A — Standard</div>
            <div style="font-size:11px;color:#10b981;font-weight:600;margin-bottom:8px;">EMPFOHLEN</div>
            <div style="font-size:12px;color:#8b93ab;line-height:1.5;">PROVA-Templates, Diktat, KI-Hilfen. Ideal fuer Einsteiger und alle die schnell starten wollen.</div>
          </button>

          <button class="prova-onb-card" data-mode="B" style="background:#161a22;border:2px solid rgba(255,255,255,0.06);border-radius:10px;padding:18px;color:inherit;cursor:pointer;text-align:left;transition:all 0.2s;font-family:inherit;">
            <div style="font-size:28px;margin-bottom:6px;">✍️</div>
            <div style="font-size:15px;font-weight:700;color:#eaecf4;margin-bottom:4px;">Mode B — Editor</div>
            <div style="font-size:11px;color:#8b93ab;font-weight:600;margin-bottom:8px;">FUER PERFEKTIONISTEN</div>
            <div style="font-size:12px;color:#8b93ab;line-height:1.5;">Voller Rich-Text-Editor (TipTap). Fuer Edit-Liebhaber die Layout selbst gestalten wollen.</div>
          </button>

          <button class="prova-onb-card" data-mode="C" style="background:#161a22;border:2px solid rgba(255,255,255,0.06);border-radius:10px;padding:18px;color:inherit;cursor:pointer;text-align:left;transition:all 0.2s;font-family:inherit;">
            <div style="font-size:28px;margin-bottom:6px;">📁</div>
            <div style="font-size:15px;font-weight:700;color:#eaecf4;margin-bottom:4px;">Mode C — Eigene Vorlagen</div>
            <div style="font-size:11px;color:#f59e0b;font-weight:600;margin-bottom:8px;">MIGRATION</div>
            <div style="font-size:12px;color:#8b93ab;line-height:1.5;">Lade Deine Word-Vorlagen hoch (.docx). Fuer SVs die von Gutachten Manager / Word migrieren.</div>
          </button>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:14px;">
          <button id="prova-onb-skip" style="background:transparent;border:none;color:#8b93ab;font-size:12px;cursor:pointer;text-decoration:underline;font-family:inherit;">Spaeter entscheiden</button>
          <div style="font-size:11px;color:#4d5568;">Du kannst den Modus jederzeit in den Einstellungen aendern.</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Hover-Effect
    const cards = overlay.querySelectorAll('.prova-onb-card');
    cards.forEach(c => {
      c.addEventListener('mouseenter', () => { c.style.borderColor = 'rgba(79,142,247,0.5)'; c.style.transform = 'translateY(-2px)'; });
      c.addEventListener('mouseleave', () => {
        const m = c.getAttribute('data-mode');
        c.style.borderColor = (m === 'A') ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.06)';
        c.style.transform = '';
      });
      c.addEventListener('click', () => _onModeSelected(c.getAttribute('data-mode'), overlay));
    });

    overlay.querySelector('#prova-onb-skip').addEventListener('click', () => {
      _markDone();
      overlay.remove();
      if (window.provaAlert) window.provaAlert('Standard-Modus aktiv. Aenderbar in Einstellungen.', 'info');
    });
  }

  async function _onModeSelected(mode, overlay) {
    if (!mode || !['A','B','C'].includes(mode)) return;
    if (mode === 'C' && window.innerWidth && window.innerWidth < 768) {
      if (window.provaAlert) window.provaAlert('Mode C wird am Desktop verwaltet — Standard-Modus aktiv.', 'warning');
      // Trotzdem speichern, Mobile-Fallback greift in akte.html
    }

    overlay.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });

    try {
      if (window.ProvaWorkflowMode && window.ProvaWorkflowMode.updateDefault) {
        const ok = await window.ProvaWorkflowMode.updateDefault(mode);
        if (!ok) throw new Error('Update fehlgeschlagen');
      }
      _markDone();
      overlay.remove();
      const labels = { A: 'Standard-Modus', B: 'Editor-Modus', C: 'Vorlagen-Modus' };
      if (window.provaAlert) window.provaAlert('✓ ' + labels[mode] + ' aktiviert', 'success');
    } catch (e) {
      overlay.querySelectorAll('button').forEach(b => { b.disabled = false; b.style.opacity = ''; });
      if (window.provaAlert) window.provaAlert('Konnte nicht speichern: ' + e.message, 'error');
    }
  }

  window.ProvaOnboarding = {
    maybeShow: maybeShow,
    forceShow: forceShow,
    isDone: isDone,
    _STORAGE_KEY: STORAGE_KEY  // exposed fuer Tests
  };

  // Auto-init bei DOMContentLoaded (sofern auf einer Page eingebunden)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // 1.5s Delay damit Auth + Workflow-Settings geladen sind
      setTimeout(maybeShow, 1500);
    });
  } else {
    setTimeout(maybeShow, 1500);
  }
})();
