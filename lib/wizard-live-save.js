/**
 * PROVA — Wizard-Live-Save + Skip-Logic (MEGA³² A1)
 *
 * Live-Save Helper für Auftrag-Wizard:
 * - jeder Step → SOFORT Supabase-UPDATE (nicht nur localStorage)
 * - Defensive: bei DB-Outage → localStorage-Draft + Banner
 *
 * Skip-Logic für Spezial-Flows (auftrag_typ ENUM):
 * - 'beweis' (Beweissicherung) → skip §5+§6 (kein Fachurteil)
 * - 'gegen' (Gegengutachten) → skip §1 (Auftrag aus anderem Gutachten referenziert)
 * - 'ergaenzung' → skip §1-§3 (referenziert Original)
 *
 * Public API:
 *   ProvaWizardSave.saveStep(auftrag_id, step_data) — async
 *   ProvaWizardSave.isSkippedFor(auftrag_typ, paragraph_nr) → boolean
 *   ProvaWizardSave.getSkippedSteps(auftrag_typ) → array of int
 *   ProvaWizardSave.restoreDraft(auftrag_id) → object|null   (MEGA³⁶ W3.1)
 *   ProvaWizardSave.findActiveDraft() → {auftrag_id, data}|null
 *   ProvaWizardSave.discardDraft(auftrag_id) → boolean
 *   ProvaWizardSave.showRestoreBanner(opts) → DOM-Element|null
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProvaWizardSave = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  // Skip-Map: auftrag_typ → Liste übersprungener Paragraphen
  const SKIP_MAP = {
    beweis: [5, 6],         // Beweissicherung: kein §5 Beweisfragen, kein §6 Fachurteil
    gegen: [1],             // Gegengutachten: §1 referenziert Original-Gutachten
    ergaenzung: [1, 2, 3],  // Ergänzungsgutachten: §1-§3 aus Original-Akte
    schaden: [],            // Standard-Flow (kein Skip)
    kurzstellungnahme: [],
    wertgutachten: [],      // Multi-Verfahren in MEGA³² A2
    beratung: [4, 5, 6],    // Beratung: NUR Phase 1+2+3 als Bericht
    baubegleitung: [],      // Multi-Termin
    schied: [],
    gericht: []
  };

  function isSkippedFor(auftrag_typ, paragraph_nr) {
    const skipList = SKIP_MAP[auftrag_typ] || [];
    return skipList.includes(parseInt(paragraph_nr, 10));
  }

  function getSkippedSteps(auftrag_typ) {
    return (SKIP_MAP[auftrag_typ] || []).slice();
  }

  // Save-Step: Live-Update zu Supabase, defensive Fallback localStorage
  async function saveStep(auftrag_id, step_data) {
    if (!auftrag_id) return { saved: false, reason: 'no-auftrag-id' };
    const fetcher = (typeof window !== 'undefined' ? (window.provaFetch || window.fetch.bind(window)) : null);
    if (!fetcher) return { saved: false, reason: 'no-fetch' };
    try {
      const res = await fetcher('/.netlify/functions/auftraege-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auftrag_id: auftrag_id, patch: step_data })
      });
      if (!res.ok) {
        // Defensive: localStorage-Draft als Backup
        try { localStorage.setItem('prova_wizard_draft_' + auftrag_id, JSON.stringify(step_data)); } catch (e) {}
        showOfflineBanner();
        return { saved: false, reason: 'http-' + res.status };
      }
      hideOfflineBanner();
      return { saved: true };
    } catch (e) {
      // Defensive: localStorage + Banner
      try { localStorage.setItem('prova_wizard_draft_' + auftrag_id, JSON.stringify(step_data)); } catch (e2) {}
      showOfflineBanner();
      return { saved: false, reason: e.message };
    }
  }

  function showOfflineBanner() {
    if (typeof document === 'undefined') return;
    let b = document.getElementById('wizard-offline-banner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'wizard-offline-banner';
      b.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(245,158,11,.95);color:#fff;padding:12px 18px;border-radius:8px;font-size:13px;font-family:inherit;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3);';
      b.textContent = '⚠️ Offline-Modus — Draft in localStorage gespeichert';
      document.body.appendChild(b);
    }
    b.style.display = 'block';
  }

  function hideOfflineBanner() {
    if (typeof document === 'undefined') return;
    const b = document.getElementById('wizard-offline-banner');
    if (b) b.style.display = 'none';
  }

  // ── MEGA³⁶ W3.1: Draft-Restore-Logik ──
  // Liest einen ggf. vorhandenen localStorage-Draft für eine Auftrags-ID zurück.
  function restoreDraft(auftrag_id) {
    if (!auftrag_id) return null;
    try {
      const raw = localStorage.getItem('prova_wizard_draft_' + auftrag_id);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  // Sucht den jüngsten Draft (alle prova_wizard_draft_*-Keys) und liefert {auftrag_id, data}.
  function findActiveDraft() {
    if (typeof localStorage === 'undefined') return null;
    let newest = null;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf('prova_wizard_draft_') !== 0) continue;
      const auftrag_id = k.substring('prova_wizard_draft_'.length);
      let data = null;
      try { data = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {}
      if (!data) continue;
      // Heuristik: jüngster Draft = letzter Key in Iteration (nicht streng, reicht für UX-Banner)
      newest = { auftrag_id: auftrag_id, data: data };
    }
    return newest;
  }

  function discardDraft(auftrag_id) {
    if (!auftrag_id) return false;
    try { localStorage.removeItem('prova_wizard_draft_' + auftrag_id); return true; }
    catch (e) { return false; }
  }

  // UI-Banner: zeigt "Entwurf wiederherstellen?" mit zwei Buttons
  function showRestoreBanner(opts) {
    if (typeof document === 'undefined') return null;
    const draft = (opts && opts.draft) || findActiveDraft();
    if (!draft) return null;
    let b = document.getElementById('wizard-restore-banner');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'wizard-restore-banner';
    b.setAttribute('role', 'status');
    b.setAttribute('aria-live', 'polite');
    b.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(79,142,247,.95);color:#fff;padding:14px 22px;border-radius:10px;font-size:13px;font-family:inherit;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.35);display:flex;gap:14px;align-items:center;flex-wrap:wrap;max-width:92vw;';
    const msg = document.createElement('span');
    msg.textContent = '📝 Entwurf gefunden — wiederherstellen?';
    const btnRestore = document.createElement('button');
    btnRestore.type = 'button';
    btnRestore.textContent = 'Wiederherstellen';
    btnRestore.style.cssText = 'background:#fff;color:#3a7be0;border:none;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;';
    btnRestore.addEventListener('click', function () {
      if (opts && typeof opts.onRestore === 'function') opts.onRestore(draft);
      b.remove();
    });
    const btnDiscard = document.createElement('button');
    btnDiscard.type = 'button';
    btnDiscard.textContent = 'Verwerfen';
    btnDiscard.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6);padding:6px 14px;border-radius:6px;font-weight:600;cursor:pointer;font-family:inherit;font-size:12px;';
    btnDiscard.addEventListener('click', function () {
      discardDraft(draft.auftrag_id);
      if (opts && typeof opts.onDiscard === 'function') opts.onDiscard(draft);
      b.remove();
    });
    b.appendChild(msg);
    b.appendChild(btnRestore);
    b.appendChild(btnDiscard);
    document.body.appendChild(b);
    return b;
  }

  // Phase-Indicator: zeigt "übersprungen"-Marker für skipped Phases
  function applyPhaseIndicator(auftrag_typ) {
    if (typeof document === 'undefined') return;
    const skipped = getSkippedSteps(auftrag_typ);
    skipped.forEach(nr => {
      const el = document.querySelector('[data-phase-nr="' + nr + '"]');
      if (el) {
        el.classList.add('phase-skipped');
        el.setAttribute('data-skip-reason', 'übersprungen für ' + auftrag_typ);
      }
    });
  }

  return {
    SKIP_MAP: SKIP_MAP,
    isSkippedFor: isSkippedFor,
    getSkippedSteps: getSkippedSteps,
    saveStep: saveStep,
    restoreDraft: restoreDraft,
    findActiveDraft: findActiveDraft,
    discardDraft: discardDraft,
    showRestoreBanner: showRestoreBanner,
    applyPhaseIndicator: applyPhaseIndicator,
    _internals: { showOfflineBanner, hideOfflineBanner }
  };
}));
