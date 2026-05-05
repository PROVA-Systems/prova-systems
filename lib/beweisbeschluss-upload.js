/**
 * PROVA — beweisbeschluss-upload.js (Mode-A Frontend-Library)
 * MEGA²³ Block 1 (2026-05-08, Nacht-Marathon)
 *
 * Frontend-Library fuer Beweisbeschluss-PDF-Upload + Pattern-Matching-Vorschau.
 *
 * Backend: /.netlify/functions/parse-beweisbeschluss (Marcel-C1: Pattern-only,
 * keine KI in Tranche 1). Schreibt extrakt zu auftraege.beweisbeschluss_extrakt
 * (Migration 11). PDF wird zusaetzlich nach Supabase-Storage 'sv-files'
 * hochgeladen (best-effort).
 *
 * Public API (browser via window.ProvaBeweisbeschlussUpload, node via require):
 *   ProvaBeweisbeschlussUpload.attach(rootEl, opts)  — UI in Container rendern
 *   ProvaBeweisbeschlussUpload.validatePdf(file)     — pure: { ok, error? }
 *   ProvaBeweisbeschlussUpload.fileToBase64(file)    — async (browser-only)
 *   ProvaBeweisbeschlussUpload.renderPreview(extr)   — pure HTML-String
 *   ProvaBeweisbeschlussUpload.collectEdits(rootEl)  — DOM → editedExtrakt
 *
 * Anti-Patterns vermieden:
 *   - KEIN auto-save (User muss explizit "Speichern" klicken)
 *   - Disclaimer prominent vor Edit-UI (Marcel-Direktive)
 *   - File-Validation client-side VOR Base64 (10MB-Limit, MIME)
 *   - Loading-State mit Cancel-Option
 *   - Lambda-Errors nicht silently swallow
 *
 * @example browser
 *   ProvaBeweisbeschlussUpload.attach(document.querySelector('#bb-zone'), {
 *     auftrag_id: '550e8400-e29b-41d4-a716-446655440000',
 *     onSaved: (extrakt) => location.reload(),
 *     onError: (err) => alert('Fehler: ' + err.message)
 *   });
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ProvaBeweisbeschlussUpload = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const PDF_MIME_TYPES = ['application/pdf'];
  const PDF_EXTENSIONS = ['.pdf'];
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const DATE_DE_REGEX = /^\d{1,2}\.\d{1,2}\.\d{4}$/;

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Validate File-Object (or file-like { name, type, size }).
   * Pure-Function, testbar ohne Browser.
   *
   * @param {File|object} file
   * @returns {object} { ok:boolean, error?:string, errorCode?:string }
   */
  function validatePdf(file) {
    if (!file || typeof file !== 'object') {
      return { ok: false, error: 'Keine Datei ausgewaehlt', errorCode: 'NO_FILE' };
    }
    const name = String(file.name || '').toLowerCase();
    const type = String(file.type || '').toLowerCase();
    const size = Number(file.size) || 0;

    const hasPdfExt = PDF_EXTENSIONS.some(ext => name.endsWith(ext));
    const hasPdfMime = PDF_MIME_TYPES.indexOf(type) !== -1;
    if (!hasPdfExt && !hasPdfMime) {
      return { ok: false, error: 'Nur PDF-Dateien erlaubt (.pdf)', errorCode: 'WRONG_TYPE' };
    }
    if (size <= 0) {
      return { ok: false, error: 'Datei ist leer', errorCode: 'EMPTY' };
    }
    if (size > MAX_FILE_SIZE) {
      const mb = (size / 1024 / 1024).toFixed(1);
      return { ok: false, error: 'Datei zu gross (' + mb + ' MB > 10 MB)', errorCode: 'TOO_LARGE' };
    }
    return { ok: true };
  }

  /**
   * Convert File to Base64 (without data:-prefix). Browser-only.
   *
   * @param {File} file
   * @returns {Promise<string>}
   */
  function fileToBase64(file) {
    if (typeof FileReader === 'undefined') {
      return Promise.reject(new Error('FileReader not available (node?)'));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        const idx = String(result).indexOf('base64,');
        resolve(idx >= 0 ? String(result).slice(idx + 7) : String(result));
      };
      reader.onerror = () => reject(new Error('FileReader-Fehler'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate auftrag_id (UUID).
   * @param {string} id
   * @returns {boolean}
   */
  function isValidAuftragId(id) {
    return typeof id === 'string' && UUID_REGEX.test(id);
  }

  /**
   * Convert DE-Date "15.06.2026" → ISO "2026-06-15" for date input.
   * Returns '' if invalid.
   */
  function deDateToIso(s) {
    if (!s || typeof s !== 'string' || !DATE_DE_REGEX.test(s.trim())) return '';
    const parts = s.trim().split('.');
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];
    return yyyy + '-' + mm + '-' + dd;
  }

  /**
   * Convert ISO "2026-06-15" → DE "15.06.2026".
   */
  function isoDateToDe(s) {
    if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(s.trim())) return '';
    const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return m[3] + '.' + m[2] + '.' + m[1];
  }

  /**
   * Render Vorschau-HTML mit editierbaren Inputs.
   * Pure-Function (kein DOM-Mutation), gibt HTML-String zurueck.
   *
   * @param {object} extrakt — { aktenzeichen, frist_datum, hauptfragen[], parteien[] }
   * @returns {string} HTML
   */
  function renderPreview(extrakt) {
    extrakt = extrakt || {};
    const az = escapeHtml(extrakt.aktenzeichen || '');
    const fristIso = deDateToIso(extrakt.frist_datum || '');
    const hauptfragen = Array.isArray(extrakt.hauptfragen) ? extrakt.hauptfragen : [];
    const parteien = Array.isArray(extrakt.parteien) ? extrakt.parteien : [];

    let fragenHtml = '';
    if (hauptfragen.length === 0) {
      fragenHtml = '<div style="font-size:12px;color:#94a3b8;font-style:italic;">Keine Hauptfragen erkannt — bitte manuell ergaenzen</div>';
    } else {
      fragenHtml = hauptfragen.map((f, i) => {
        const text = escapeHtml(f && f.text ? f.text : (typeof f === 'string' ? f : ''));
        const nr = (f && f.nr) || (i + 1);
        return '<div class="bb-frage-item" data-frage-idx="' + i + '" style="background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;gap:8px;align-items:flex-start;">'
          + '<span style="font-weight:700;color:#3b82f6;min-width:24px;">' + escapeHtml(nr) + '.</span>'
          + '<textarea class="bb-frage-text" rows="2" data-idx="' + i + '" style="flex:1;border:1px solid rgba(0,0,0,0.06);border-radius:6px;padding:6px 8px;font-size:13px;font-family:inherit;resize:vertical;background:#fff;color:#0f172a;">' + text + '</textarea>'
          + '<button type="button" class="bb-frage-remove" data-idx="' + i + '" title="Frage entfernen" style="border:none;background:none;color:#94a3b8;cursor:pointer;font-size:16px;padding:4px 6px;line-height:1;">&times;</button>'
          + '</div>';
      }).join('');
    }

    let parteienHtml = '';
    if (parteien.length === 0) {
      parteienHtml = '<div style="font-size:12px;color:#94a3b8;font-style:italic;">Keine Parteien erkannt</div>';
    } else {
      parteienHtml = parteien.map((p, i) => {
        const rolle = escapeHtml(p && p.rolle ? p.rolle : '');
        const name = escapeHtml(p && p.name ? p.name : '');
        return '<div class="bb-partei-item" data-partei-idx="' + i + '" style="display:grid;grid-template-columns:120px 1fr;gap:6px;margin-bottom:6px;">'
          + '<input class="bb-partei-rolle" data-idx="' + i + '" value="' + rolle + '" style="border:1px solid rgba(0,0,0,0.08);border-radius:6px;padding:6px 8px;font-size:12px;background:#fff;color:#0f172a;" />'
          + '<input class="bb-partei-name" data-idx="' + i + '" value="' + name + '" style="border:1px solid rgba(0,0,0,0.08);border-radius:6px;padding:6px 8px;font-size:12px;background:#fff;color:#0f172a;" />'
          + '</div>';
      }).join('');
    }

    return '<div class="bb-preview" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-top:12px;color:#0f172a;">'
      + '<div class="bb-disclaimer" role="note" style="margin-bottom:12px;padding:10px 12px;background:rgba(245,158,11,0.10);border-left:3px solid rgba(245,158,11,0.5);border-radius:6px;font-size:12px;color:#78350f;line-height:1.55;">'
      + '<strong>📌 Hinweis:</strong> Die automatische Erkennung ist eine ERSTE STRUKTURIERUNGS-HILFE. '
      + 'Bitte pruefen Sie die Vollstaendigkeit und Korrektheit anhand des Original-Beweisbeschlusses sorgfaeltig. '
      + 'Sie als bestellter SV bleiben nach §407a ZPO letztverantwortlich.'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">'
      + '<div><label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:4px;">Aktenzeichen</label>'
      + '<input class="bb-aktenzeichen" value="' + az + '" placeholder="z.B. 1 O 234/25" style="width:100%;border:1px solid rgba(0,0,0,0.08);border-radius:6px;padding:8px 10px;font-size:13px;font-family:inherit;background:#fff;color:#0f172a;box-sizing:border-box;" />'
      + '</div>'
      + '<div><label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:4px;">Abgabefrist</label>'
      + '<input class="bb-frist" type="date" value="' + escapeHtml(fristIso) + '" style="width:100%;border:1px solid rgba(0,0,0,0.08);border-radius:6px;padding:8px 10px;font-size:13px;font-family:inherit;background:#fff;color:#0f172a;box-sizing:border-box;" />'
      + '</div>'
      + '</div>'
      + '<div style="margin-bottom:14px;">'
      + '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:6px;">Hauptfragen</label>'
      + '<div class="bb-fragen-list">' + fragenHtml + '</div>'
      + '<button type="button" class="bb-frage-add" style="margin-top:6px;padding:6px 10px;background:transparent;border:1px solid #3b82f6;color:#3b82f6;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;">+ Frage hinzufuegen</button>'
      + '</div>'
      + '<div style="margin-bottom:14px;">'
      + '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:6px;">Parteien</label>'
      + '<div class="bb-parteien-list">' + parteienHtml + '</div>'
      + '</div>'
      + '<div class="bb-actions" style="display:flex;gap:8px;flex-wrap:wrap;">'
      + '<button type="button" class="bb-save" style="padding:9px 18px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">💾 Uebernehmen</button>'
      + '<button type="button" class="bb-discard" style="padding:9px 18px;background:transparent;border:1px solid rgba(0,0,0,0.15);color:#64748b;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;">Verwerfen</button>'
      + '</div>'
      + '</div>';
  }

  /**
   * Liest editierte Werte aus DOM zurueck. Browser-only.
   *
   * @param {Element} rootEl — Container mit .bb-preview
   * @returns {object} editedExtrakt
   */
  function collectEdits(rootEl) {
    if (!rootEl) return { aktenzeichen: '', frist_datum: '', hauptfragen: [], parteien: [] };
    const aktenzeichenEl = rootEl.querySelector('.bb-aktenzeichen');
    const fristEl = rootEl.querySelector('.bb-frist');
    const fragenEls = rootEl.querySelectorAll('.bb-frage-text');
    const parteienItems = rootEl.querySelectorAll('.bb-partei-item');

    const hauptfragen = [];
    fragenEls.forEach((el, i) => {
      const text = (el.value || '').trim();
      if (text) hauptfragen.push({ nr: i + 1, text: text });
    });

    const parteien = [];
    parteienItems.forEach((item) => {
      const rolleEl = item.querySelector('.bb-partei-rolle');
      const nameEl = item.querySelector('.bb-partei-name');
      const rolle = (rolleEl && rolleEl.value || '').trim();
      const name = (nameEl && nameEl.value || '').trim();
      if (rolle || name) parteien.push({ rolle: rolle, name: name });
    });

    const fristIso = fristEl ? (fristEl.value || '').trim() : '';

    return {
      aktenzeichen: aktenzeichenEl ? (aktenzeichenEl.value || '').trim() : '',
      frist_datum: fristIso ? isoDateToDe(fristIso) : '',
      hauptfragen: hauptfragen,
      parteien: parteien
    };
  }

  /**
   * Helper: builds upload-zone HTML (drag-drop + click).
   */
  function buildUploadZoneHtml() {
    return '<div class="bb-zone-inner" style="padding:20px;text-align:center;border:2px dashed rgba(0,0,0,0.12);border-radius:10px;cursor:pointer;background:rgba(0,0,0,0.02);">'
      + '<div style="font-size:28px;margin-bottom:6px;">📄</div>'
      + '<div style="font-size:14px;font-weight:600;color:#475569;">PDF hierher ziehen oder Klicken</div>'
      + '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Beweisbeschluss als PDF · max. 10 MB</div>'
      + '<input type="file" class="bb-file" accept="application/pdf,.pdf" style="display:none;" />'
      + '</div>'
      + '<div class="bb-status" style="display:none;margin-top:10px;padding:10px 14px;border-radius:8px;font-size:13px;"></div>'
      + '<div class="bb-result"></div>';
  }

  function setStatus(rootEl, kind, msg) {
    const el = rootEl.querySelector('.bb-status');
    if (!el) return;
    const colors = {
      info: { bg: 'rgba(59,130,246,0.08)', fg: '#3b82f6', bd: 'rgba(59,130,246,0.20)' },
      ok: { bg: 'rgba(16,185,129,0.10)', fg: '#10b981', bd: 'rgba(16,185,129,0.20)' },
      warn: { bg: 'rgba(245,158,11,0.10)', fg: '#92400e', bd: 'rgba(245,158,11,0.30)' },
      error: { bg: 'rgba(239,68,68,0.10)', fg: '#ef4444', bd: 'rgba(239,68,68,0.20)' },
      loading: { bg: 'rgba(99,102,241,0.08)', fg: '#6366f1', bd: 'rgba(99,102,241,0.20)' }
    };
    const c = colors[kind] || colors.info;
    el.style.background = c.bg;
    el.style.color = c.fg;
    el.style.border = '1px solid ' + c.bd;
    el.style.display = 'block';
    el.textContent = msg;
  }

  function clearStatus(rootEl) {
    const el = rootEl.querySelector('.bb-status');
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  }

  /**
   * Attach Upload-UI to a container element.
   *
   * @param {Element} rootEl
   * @param {object} opts
   * @param {string} [opts.auftrag_id] — UUID. Wenn fehlt: nur Disclaimer + Hint.
   * @param {string} [opts.endpoint] — Override Lambda-Pfad
   * @param {object} [opts.headers] — Extra fetch-Headers (z.B. Authorization)
   * @param {Function} [opts.onParsed] — (extrakt) => void, nach erfolgreichem Parse
   * @param {Function} [opts.onSaved]  — (editedExtrakt) => void, nach Save-Click
   * @param {Function} [opts.onError]  — (err) => void
   * @param {Function} [opts.fetchImpl] — Override fetch (fuer Tests)
   * @returns {object} controller { reset, getExtrakt }
   */
  function attach(rootEl, opts) {
    if (!rootEl || typeof rootEl.querySelector !== 'function') {
      throw new Error('attach(): rootEl muss DOM-Element sein');
    }
    opts = opts || {};
    const endpoint = opts.endpoint || '/.netlify/functions/parse-beweisbeschluss';
    const fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetchImpl) throw new Error('attach(): fetch nicht verfuegbar');

    rootEl.innerHTML = buildUploadZoneHtml();
    const zoneInner = rootEl.querySelector('.bb-zone-inner');
    const fileInput = rootEl.querySelector('.bb-file');
    const resultArea = rootEl.querySelector('.bb-result');
    let lastExtrakt = null;

    if (!opts.auftrag_id || !isValidAuftragId(opts.auftrag_id)) {
      setStatus(rootEl, 'warn',
        'Bitte erst Auftrag-Stammdaten speichern, dann PDF hochladen. (Auftrag-ID fehlt)');
      zoneInner.style.opacity = '0.5';
      zoneInner.style.cursor = 'not-allowed';
      zoneInner.style.pointerEvents = 'none';
    }

    function handleFile(file) {
      const v = validatePdf(file);
      if (!v.ok) {
        setStatus(rootEl, 'error', v.error);
        if (opts.onError) opts.onError(new Error(v.error));
        return;
      }
      setStatus(rootEl, 'loading', '⏳ PDF wird hochgeladen und analysiert…');

      fileToBase64(file).then(base64 => {
        const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
        return fetchImpl(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            auftrag_id: opts.auftrag_id,
            pdf_base64: base64,
            source_filename: file.name
          })
        });
      }).then(res => {
        if (!res.ok) {
          return res.json().catch(() => ({})).then(d => {
            const msg = d.error || ('HTTP ' + res.status);
            throw new Error(msg);
          });
        }
        return res.json();
      }).then(data => {
        lastExtrakt = data && data.extrakt ? data.extrakt : data;
        clearStatus(rootEl);
        setStatus(rootEl, 'ok',
          '✅ PDF analysiert (' + (lastExtrakt.hauptfragen ? lastExtrakt.hauptfragen.length : 0) + ' Fragen, '
          + (lastExtrakt.parteien ? lastExtrakt.parteien.length : 0) + ' Parteien erkannt)');
        resultArea.innerHTML = renderPreview(lastExtrakt);
        wirePreviewActions(rootEl, opts);
        if (opts.onParsed) opts.onParsed(lastExtrakt);
      }).catch(err => {
        setStatus(rootEl, 'error', 'Fehler: ' + err.message);
        if (opts.onError) opts.onError(err);
      });
    }

    if (zoneInner) {
      zoneInner.addEventListener('click', () => { if (fileInput) fileInput.click(); });
      zoneInner.addEventListener('dragover', (e) => {
        e.preventDefault();
        zoneInner.style.background = 'rgba(59,130,246,0.05)';
        zoneInner.style.borderColor = '#3b82f6';
      });
      zoneInner.addEventListener('dragleave', () => {
        zoneInner.style.background = 'rgba(0,0,0,0.02)';
        zoneInner.style.borderColor = 'rgba(0,0,0,0.12)';
      });
      zoneInner.addEventListener('drop', (e) => {
        e.preventDefault();
        zoneInner.style.background = 'rgba(0,0,0,0.02)';
        zoneInner.style.borderColor = 'rgba(0,0,0,0.12)';
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFile(file);
      });
    }
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (file) handleFile(file);
      });
    }

    return {
      reset: () => {
        rootEl.innerHTML = buildUploadZoneHtml();
        lastExtrakt = null;
      },
      getExtrakt: () => lastExtrakt
    };
  }

  function wirePreviewActions(rootEl, opts) {
    opts = opts || {};
    const previewEl = rootEl.querySelector('.bb-preview');
    if (!previewEl) return;

    const saveBtn = previewEl.querySelector('.bb-save');
    const discardBtn = previewEl.querySelector('.bb-discard');
    const addFrageBtn = previewEl.querySelector('.bb-frage-add');
    const fragenList = previewEl.querySelector('.bb-fragen-list');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const edited = collectEdits(rootEl);
        if (opts.onSaved) opts.onSaved(edited);
      });
    }
    if (discardBtn) {
      discardBtn.addEventListener('click', () => {
        rootEl.innerHTML = buildUploadZoneHtml();
      });
    }
    if (addFrageBtn && fragenList) {
      addFrageBtn.addEventListener('click', () => {
        const next = fragenList.querySelectorAll('.bb-frage-item').length + 1;
        const empty = fragenList.querySelector('div[style*="italic"]');
        if (empty) empty.remove();
        const div = document.createElement('div');
        div.className = 'bb-frage-item';
        div.dataset.frageIdx = String(next - 1);
        div.style.cssText = 'background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;gap:8px;align-items:flex-start;';
        div.innerHTML = '<span style="font-weight:700;color:#3b82f6;min-width:24px;">' + next + '.</span>'
          + '<textarea class="bb-frage-text" rows="2" data-idx="' + (next - 1) + '" style="flex:1;border:1px solid rgba(0,0,0,0.06);border-radius:6px;padding:6px 8px;font-size:13px;font-family:inherit;resize:vertical;background:#fff;color:#0f172a;"></textarea>'
          + '<button type="button" class="bb-frage-remove" data-idx="' + (next - 1) + '" style="border:none;background:none;color:#94a3b8;cursor:pointer;font-size:16px;padding:4px 6px;line-height:1;">&times;</button>';
        fragenList.appendChild(div);
      });
    }
    // Remove-Buttons via Event-Delegation
    if (fragenList) {
      fragenList.addEventListener('click', (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains('bb-frage-remove')) {
          const item = target.closest('.bb-frage-item');
          if (item) item.remove();
        }
      });
    }
  }

  return {
    attach: attach,
    validatePdf: validatePdf,
    fileToBase64: fileToBase64,
    isValidAuftragId: isValidAuftragId,
    deDateToIso: deDateToIso,
    isoDateToDe: isoDateToDe,
    renderPreview: renderPreview,
    collectEdits: collectEdits,
    escapeHtml: escapeHtml,
    _const: { MAX_FILE_SIZE, PDF_MIME_TYPES, PDF_EXTENSIONS }
  };
});
