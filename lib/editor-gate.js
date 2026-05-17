/**
 * PROVA — Editor-Gate (MEGA³¹ A2)
 *
 * 500-Zeichen-Eigenleistung-Gate + Override-Modal mit audit_trail-Insert.
 * Vision-Master Regel 11.
 *
 * Public API:
 *   ProvaEditorGate.checkOrOverride(opts) → Promise<bool> (true = darf weiter)
 *   ProvaEditorGate.updateCounter(text)   → live Counter-Update
 *
 * Schwellen:
 *   - 500 Zeichen Eigenleistung (hart, Spec)
 *   - 2/3 Quality-Marker (lib/quality-markers.js)
 *
 * Bei Bedingung-Fail: Modal mit Begründungs-Pflicht + audit_trail-Insert.
 */
'use strict';

(function () {
  const MIN_ZEICHEN = 500;
  const MIN_BEGRUENDUNG = 50;

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function ensureStyles() {
    if (document.getElementById('eg-styles')) return;
    const s = document.createElement('style');
    s.id = 'eg-styles';
    s.textContent = `
      .eg-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);}
      .eg-overlay.open{display:flex;}
      .eg-modal{background:#1c2130;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:28px;max-width:560px;width:100%;color:#eaecf4;font-family:'DM Sans',system-ui,sans-serif;}
      .eg-modal h2{font-size:18px;font-weight:800;margin-bottom:6px;color:#f59e0b;}
      .eg-modal .law{font-size:11px;color:#4f8ef7;font-family:ui-monospace,monospace;margin-bottom:14px;}
      .eg-modal p{font-size:13px;color:#8b93ab;line-height:1.6;margin-bottom:10px;}
      .eg-modal .stats{background:#0b0d11;padding:10px 14px;border-radius:8px;font-size:12px;font-family:ui-monospace,monospace;margin:10px 0;}
      .eg-modal textarea{width:100%;min-height:100px;padding:12px;background:#0b0d11;border:1px solid rgba(255,255,255,.11);border-radius:8px;color:#eaecf4;font-family:inherit;font-size:13px;resize:vertical;margin-bottom:10px;}
      .eg-actions{display:flex;gap:10px;justify-content:flex-end;}
      .eg-btn{padding:10px 18px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;}
      .eg-btn:disabled{opacity:.5;cursor:not-allowed;}
      .eg-btn-cancel{padding:10px 18px;background:transparent;border:1px solid rgba(255,255,255,.15);color:#8b93ab;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;}
    `;
    document.head.appendChild(s);
  }

  function checkMarkers(text) {
    if (typeof window.ProvaQualityMarkers !== 'undefined' && window.ProvaQualityMarkers.checkMarkers) {
      return window.ProvaQualityMarkers.checkMarkers(text);
    }
    // Fallback wenn Lib nicht geladen
    return { count: 0, ok: false, missing: ['Lib quality-markers nicht geladen'] };
  }

  function updateCounter(text) {
    const counter = document.getElementById('zeichenCounter');
    if (!counter) return;
    const len = (text || '').length;
    counter.textContent = len + ' / ' + MIN_ZEICHEN + ' Zeichen';
    counter.style.color = len >= MIN_ZEICHEN ? '#10b981' : '#ef4444';

    const banner = document.getElementById('zeichenWarnBanner');
    if (banner) banner.style.display = len < MIN_ZEICHEN ? 'block' : 'none';
  }

  async function logOverrideToAudit(meta) {
    try {
      // MEGA86 Block B: Migration audit-trail-write → audit-log-v1 (task=generic)
      const fetcher = window.provaFetch || window.fetch.bind(window);
      const supabaseUrl = (window.PROVA_CONFIG && window.PROVA_CONFIG.SUPABASE_URL) || 'https://cngteblrbpwsyypexjrv.supabase.co';
      const anonKey    = (window.PROVA_CONFIG && window.PROVA_CONFIG.SUPABASE_ANON_KEY) || '';
      const jwt        = localStorage.getItem('prova_auth_token') || '';
      await fetcher(supabaseUrl + '/functions/v1/audit-log-v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': 'Bearer ' + jwt },
        body: JSON.stringify({
          task: 'generic',
          action: 'create',
          entity_typ: 'editor_override',
          entity_id: meta.auftrag_id || null,
          source: 'editor-gate',
          kategorie: 'COMPLIANCE',
          payload: Object.assign({ source: 'MEGA31-A2-editor-gate' }, meta)
        })
      });
    } catch (e) {
      console.warn('[editor-gate] audit_trail Insert fehlgeschlagen', e);
      // defensive: Override-Path nicht blockieren
    }
  }

  function showOverrideModal(opts) {
    return new Promise(resolve => {
      ensureStyles();
      let overlay = document.getElementById('eg-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'eg-overlay';
        overlay.className = 'eg-overlay';
        document.body.appendChild(overlay);
      }
      const m = opts.markers || { count: 0, missing: [] };
      const len = opts.zeichenCount;
      overlay.innerHTML = `
        <div class="eg-modal" role="dialog" aria-label="Override Editor-Gate">
          <h2>⚠️ Eigenleistungs-Gate nicht erfüllt</h2>
          <div class="law">Vision-Master Regel 11 + § 407a Abs. 3 ZPO</div>
          <p>Du hast die Mindest-Anforderungen für deine Eigenleistung nicht erfüllt:</p>
          <div class="stats">
            • Zeichen: ${len} / ${MIN_ZEICHEN} (${len >= MIN_ZEICHEN ? '✓' : '✗'})<br>
            • Quality-Marker: ${m.count}/3 (${m.count >= 2 ? '✓' : '✗'})
            ${m.missing.length ? '<br>Fehlend: ' + m.missing.map(escHtml).join(', ') : ''}
          </div>
          <p>Bitte begründe (mindestens ${MIN_BEGRUENDUNG} Zeichen), warum du trotzdem zur Freigabe willst.
          Der Vorgang wird im audit_trail festgehalten.</p>
          <textarea id="eg-gruende" placeholder="Begründung (z.B. einfache Aktenlage, Standardfall, ...)"></textarea>
          <div class="eg-actions">
            <button class="eg-btn-cancel" type="button" id="eg-cancel">Zurück zum Editor</button>
            <button class="eg-btn" type="button" id="eg-submit" disabled>Override + Weiter</button>
          </div>
        </div>
      `;
      overlay.classList.add('open');

      const ta = overlay.querySelector('#eg-gruende');
      const submitBtn = overlay.querySelector('#eg-submit');
      const cancelBtn = overlay.querySelector('#eg-cancel');

      ta.addEventListener('input', () => {
        submitBtn.disabled = ta.value.trim().length < MIN_BEGRUENDUNG;
      });
      ta.focus();

      submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        await logOverrideToAudit({
          auftrag_id: opts.auftrag_id || null,
          gruende: ta.value.trim(),
          zeichen_count: len,
          marker_count: m.count
        });
        overlay.classList.remove('open');
        resolve(true);
      });

      cancelBtn.addEventListener('click', () => {
        overlay.classList.remove('open');
        resolve(false);
      });
    });
  }

  async function checkOrOverride(opts) {
    opts = opts || {};
    const text = opts.text || '';
    const len = text.length;
    const markers = checkMarkers(text);
    const gateOk = len >= MIN_ZEICHEN && markers.ok;
    if (gateOk) return true;
    return await showOverrideModal({
      auftrag_id: opts.auftrag_id,
      zeichenCount: len,
      markers: markers
    });
  }

  window.ProvaEditorGate = {
    checkOrOverride: checkOrOverride,
    updateCounter: updateCounter,
    MIN_ZEICHEN: MIN_ZEICHEN,
    MIN_BEGRUENDUNG: MIN_BEGRUENDUNG,
    _internals: { checkMarkers, escHtml, logOverrideToAudit, showOverrideModal }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = window.ProvaEditorGate;
}());
