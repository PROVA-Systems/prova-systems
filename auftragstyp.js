/* ============================================================
   PROVA — Auftragstyp-Dialog (auftragstyp.js)
   Einbinden:  <script src="auftragstyp.js"></script>
   
   Erscheint wenn SV "Neuer Fall" klickt.
   Zeigt alle Auftragstypen, leitet in den passenden Workflow.
   Unterstützt PDF-Upload mit KI-Extraktion (Dokument-Intelligence).
   ============================================================ */
(function() {
  'use strict';

  window.PROVA = window.PROVA || {};

  var AUFTRAGSTYPEN = [
    {
      id: 'gerichtsgutachten',
      icon: '⚖️',
      label: 'Gerichtsgutachten',
      desc: 'Beweisbeschluss vom Gericht. §1–§6 Struktur, JVEG-Abrechnung.',
      color: '#4f8ef7',
      pdfUpload: true,
      pdfHint: 'Beweisbeschluss-PDF hochladen für automatische Datenübernahme'
    },
    {
      id: 'versicherungsgutachten',
      icon: '🛡️',
      label: 'Versicherungsgutachten',
      desc: 'Auftrag von Versicherung. Kompaktes Format, freies Honorar.',
      color: '#f59e0b',
      pdfUpload: true,
      pdfHint: 'Auftrags-PDF hochladen (optional)'
    },
    {
      id: 'privatgutachten',
      icon: '👤',
      label: 'Privatgutachten',
      desc: 'Auftrag von Privatperson. Verständliche Sprache, Angebots-Phase.',
      color: '#10b981',
      pdfUpload: false
    },
    {
      id: 'schiedsgutachten',
      icon: '⚔️',
      label: 'Schiedsgutachten',
      desc: 'Beide Parteien einigen sich auf SV. Bindend, neutrales Gutachten.',
      color: '#8b5cf6',
      pdfUpload: true,
      pdfHint: 'Schiedsvereinbarung hochladen (optional)'
    },
    {
      id: 'baubegleitung',
      icon: '🏗️',
      label: 'Baubegleitung',
      desc: 'Projekt mit mehreren Begehungen. Mängel-Tracking über die Bauphase.',
      color: '#ec4899',
      pdfUpload: false
    },
    {
      id: 'bauabnahme',
      icon: '✅',
      label: 'Bauabnahme',
      desc: 'Abnahme des fertigen Gebäudes. Checklisten-basiert, Protokoll.',
      color: '#14b8a6',
      pdfUpload: false
    },
    {
      id: 'beweissicherung',
      icon: '📸',
      label: 'Beweissicherung',
      desc: 'Ist-Zustand dokumentieren. Reine Dokumentation, keine Bewertung.',
      color: '#6366f1',
      pdfUpload: false
    },
    {
      id: 'kaufberatung',
      icon: '🏠',
      label: 'Kaufberatung',
      desc: 'Immobilie prüfen vor Kauf. Zustandsbewertung + Kostenschätzung.',
      color: '#f97316',
      pdfUpload: false
    },
    {
      id: 'sanierungsberatung',
      icon: '🔧',
      label: 'Sanierungsberatung',
      desc: 'Sanierungskonzept erstellen. Maßnahmen, Kosten, Fördermittel.',
      color: '#84cc16',
      pdfUpload: false
    }
  ];

  /* ── CSS ── */
  if (!document.getElementById('prova-at-css')) {
    var s = document.createElement('style');
    s.id = 'prova-at-css';
    s.textContent = ''
      + '.at-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:700;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);align-items:center;justify-content:center;padding:20px;}'
      + '.at-overlay.open{display:flex;}'
      + '.at-dialog{background:var(--bg2,#13161d);border:1px solid var(--border2,rgba(255,255,255,.12));border-radius:16px;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.5);}'
      + '.at-header{padding:20px 24px 16px;border-bottom:1px solid var(--border,rgba(255,255,255,.07));display:flex;align-items:center;justify-content:space-between;}'
      + '.at-title{font-size:18px;font-weight:700;color:var(--text,#eaecf4);}'
      + '.at-close{background:none;border:none;color:var(--text3,#6b7280);font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;}'
      + '.at-close:hover{color:var(--text,#eaecf4);background:rgba(255,255,255,.05);}'
      + '.at-body{padding:16px 20px 20px;}'
      + '.at-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}'
      + '.at-card{padding:14px;border-radius:10px;background:var(--bg3,#181b24);border:1px solid var(--border,rgba(255,255,255,.07));cursor:pointer;transition:all .15s;text-align:center;}'
      + '.at-card:hover{border-color:var(--accent,#4f8ef7);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.3);}'
      + '.at-card.selected{border-color:var(--accent,#4f8ef7);background:rgba(79,142,247,.08);}'
      + '.at-card-icon{font-size:28px;margin-bottom:6px;display:block;}'
      + '.at-card-label{font-size:12px;font-weight:700;color:var(--text,#eaecf4);margin-bottom:3px;}'
      + '.at-card-desc{font-size:10px;color:var(--text3,#6b7280);line-height:1.4;}'
      + '.at-divider{height:1px;background:var(--border,rgba(255,255,255,.07));margin:16px 0;}'
      + '.at-manual{display:block;width:100%;padding:10px;border-radius:8px;background:transparent;border:1px dashed var(--border2,rgba(255,255,255,.12));color:var(--text3,#6b7280);font-size:12px;cursor:pointer;font-family:inherit;transition:all .12s;text-align:center;}'
      + '.at-manual:hover{border-color:var(--text3,#6b7280);color:var(--text2,#9da3b4);}'
      /* PDF Upload Zone */
      + '.at-pdf-zone{display:none;margin-top:12px;padding:20px;border:2px dashed var(--border2,rgba(255,255,255,.12));border-radius:10px;text-align:center;transition:all .2s;}'
      + '.at-pdf-zone.visible{display:block;}'
      + '.at-pdf-zone.dragover{border-color:var(--accent,#4f8ef7);background:rgba(79,142,247,.05);}'
      + '.at-pdf-icon{font-size:32px;margin-bottom:8px;}'
      + '.at-pdf-text{font-size:13px;color:var(--text2,#9da3b4);margin-bottom:4px;}'
      + '.at-pdf-hint{font-size:11px;color:var(--text3,#6b7280);}'
      + '.at-pdf-input{display:none;}'
      + '.at-pdf-status{display:none;margin-top:12px;padding:12px 16px;border-radius:8px;font-size:13px;}'
      + '.at-pdf-status.loading{display:block;background:rgba(79,142,247,.08);color:#4f8ef7;}'
      + '.at-pdf-status.success{display:block;background:rgba(16,185,129,.08);color:#10b981;}'
      + '.at-pdf-status.error{display:block;background:rgba(239,68,68,.08);color:#ef4444;}'
      /* Extracted data preview */
      + '.at-preview{display:none;margin-top:12px;background:var(--bg3,#181b24);border:1px solid rgba(79,142,247,.2);border-radius:10px;padding:16px;}'
      + '.at-preview.visible{display:block;}'
      + '.at-preview-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#4f8ef7;margin-bottom:10px;}'
      + '.at-preview-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;font-size:13px;}'
      + '.at-preview-label{color:var(--text3,#6b7280);min-width:110px;flex-shrink:0;}'
      + '.at-preview-value{color:var(--text,#eaecf4);flex:1;}'
      + '.at-preview-edit{background:none;border:none;color:#4f8ef7;cursor:pointer;font-size:11px;padding:2px 6px;flex-shrink:0;}'
      /* Footer */
      + '.at-footer{padding:16px 20px;border-top:1px solid var(--border,rgba(255,255,255,.07));display:flex;gap:8px;justify-content:flex-end;}'
      + '.at-btn{padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .12s;}'
      + '.at-btn-primary{background:var(--accent,#4f8ef7);color:#fff;}'
      + '.at-btn-primary:hover{background:#3a7be0;}'
      + '.at-btn-primary:disabled{opacity:.4;cursor:not-allowed;}'
      + '.at-btn-ghost{background:transparent;border:1px solid var(--border2,rgba(255,255,255,.12));color:var(--text2,#9da3b4);}'
      + '.at-btn-ghost:hover{border-color:var(--text3,#6b7280);}'
      + '@media(max-width:600px){.at-grid{grid-template-columns:1fr 1fr;}.at-dialog{max-width:100%;border-radius:16px 16px 0 0;align-self:flex-end;}}'
    ;
    document.head.appendChild(s);
  }

  /* ── State ── */
  var selectedType = null;
  var extractedData = null;
  var overlayEl, bodyEl, footerBtn, pdfZone, pdfStatus, previewEl;

  /* ── Dialog erstellen ── */
  function createDialog() {
    if (document.getElementById('at-overlay')) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'at-overlay';
    overlayEl.id = 'at-overlay';
    overlayEl.onclick = function(e) { if (e.target === overlayEl) PROVA.closeAuftragstyp(); };

    var html = ''
      + '<div class="at-dialog">'
      +   '<div class="at-header">'
      +     '<div class="at-title">Neuer Fall</div>'
      +     '<button class="at-close" onclick="PROVA.closeAuftragstyp()">✕</button>'
      +   '</div>'
      +   '<div class="at-body" id="at-body">'
      +     '<div class="at-grid">';

    AUFTRAGSTYPEN.forEach(function(t) {
      html += '<div class="at-card" data-type="' + t.id + '" onclick="PROVA._selectType(\'' + t.id + '\')">'
        + '<span class="at-card-icon">' + t.icon + '</span>'
        + '<div class="at-card-label">' + t.label + '</div>'
        + '<div class="at-card-desc">' + t.desc + '</div>'
        + '</div>';
    });

    html += '</div>'
      + '<div class="at-divider"></div>'
      + '<button class="at-manual" onclick="PROVA._selectType(\'manuell\')">📋 Freier Auftrag (manuell alle Felder ausfüllen)</button>'
      /* PDF Upload Zone */
      + '<div class="at-pdf-zone" id="at-pdf-zone">'
      +   '<div class="at-pdf-icon">📄</div>'
      +   '<div class="at-pdf-text">Beweisbeschluss oder Auftrag als PDF hochladen</div>'
      +   '<div class="at-pdf-hint">Drag & Drop oder klicken — KI extrahiert automatisch alle Daten</div>'
      +   '<input type="file" class="at-pdf-input" id="at-pdf-input" accept=".pdf" onchange="PROVA._handlePdfUpload(this.files)">'
      +   '<button onclick="document.getElementById(\'at-pdf-input\').click()" style="margin-top:10px;padding:8px 16px;border-radius:7px;background:rgba(79,142,247,.12);border:1px solid rgba(79,142,247,.25);color:#4f8ef7;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">PDF auswählen</button>'
      + '</div>'
      + '<div class="at-pdf-status" id="at-pdf-status"></div>'
      /* Preview */
      + '<div class="at-preview" id="at-preview"></div>'
      + '</div>'
      + '<div class="at-footer">'
      +   '<button class="at-btn at-btn-ghost" onclick="PROVA.closeAuftragstyp()">Abbrechen</button>'
      +   '<button class="at-btn at-btn-primary" id="at-start-btn" disabled onclick="PROVA._startWorkflow()">Auftrag starten →</button>'
      + '</div>'
      + '</div>';

    overlayEl.innerHTML = html;
    document.body.appendChild(overlayEl);

    bodyEl = document.getElementById('at-body');
    footerBtn = document.getElementById('at-start-btn');
    pdfZone = document.getElementById('at-pdf-zone');
    pdfStatus = document.getElementById('at-pdf-status');
    previewEl = document.getElementById('at-preview');

    // Drag & Drop auf PDF-Zone
    pdfZone.ondragover = function(e) { e.preventDefault(); pdfZone.classList.add('dragover'); };
    pdfZone.ondragleave = function() { pdfZone.classList.remove('dragover'); };
    pdfZone.ondrop = function(e) {
      e.preventDefault();
      pdfZone.classList.remove('dragover');
      var files = Array.from(e.dataTransfer.files).filter(function(f) { return f.type === 'application/pdf'; });
      if (files.length) PROVA._handlePdfUpload(files);
    };
  }

  /* ── Auftragstyp wählen ── */
  PROVA._selectType = function(typeId) {
    selectedType = typeId;
    extractedData = null;

    // Cards highlighten
    var cards = document.querySelectorAll('.at-card');
    cards.forEach(function(c) {
      c.classList.toggle('selected', c.dataset.type === typeId);
    });

    // PDF-Zone zeigen/verstecken
    var typ = AUFTRAGSTYPEN.find(function(t) { return t.id === typeId; });
    if (typ && typ.pdfUpload) {
      pdfZone.classList.add('visible');
      pdfZone.querySelector('.at-pdf-text').textContent = typ.pdfHint || 'PDF hochladen (optional)';
    } else {
      pdfZone.classList.remove('visible');
    }
    pdfStatus.className = 'at-pdf-status';
    previewEl.classList.remove('visible');

    // Button aktivieren
    footerBtn.disabled = false;
    footerBtn.textContent = (typ ? typ.label : 'Fall') + ' starten →';
  };

  /* ── PDF hochladen + KI-Extraktion ── */
  PROVA._handlePdfUpload = async function(files) {
    if (!files || !files.length) return;
    var file = files[0];
    if (file.type !== 'application/pdf') {
      pdfStatus.className = 'at-pdf-status error';
      pdfStatus.textContent = '❌ Nur PDF-Dateien werden unterstützt.';
      return;
    }

    pdfStatus.className = 'at-pdf-status loading';
    pdfStatus.textContent = '⏳ KI liest das Dokument…';

    try {
      // PDF zu Base64
      var base64 = await fileToBase64(file);

      // An KI-Proxy senden
      var res = await fetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aufgabe: 'pdf_extraktion',
          auftragstyp: selectedType,
          pdf_base64: base64,
          dateiname: file.name
        })
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      if (data.error) throw new Error(data.error);

      extractedData = data;
      pdfStatus.className = 'at-pdf-status success';
      pdfStatus.textContent = '✅ Daten erfolgreich erkannt — bitte prüfen:';
      showPreview(data);

    } catch (e) {
      pdfStatus.className = 'at-pdf-status error';
      pdfStatus.textContent = '❌ Extraktion fehlgeschlagen: ' + e.message + ' — Sie können die Daten manuell eingeben.';
    }
  };

  /* ── Vorschau der extrahierten Daten ── */
  function showPreview(data) {
    var html = '<div class="at-preview-title">📄 Erkannte Daten</div>';
    var fields = [
      ['Aktenzeichen', data.aktenzeichen],
      ['Gericht / Auftraggeber', data.gericht || data.auftraggeber],
      ['Kläger', data.klaeger],
      ['Beklagter', data.beklagter],
      ['Geschädigter', data.geschaedigter],
      ['Frist', data.frist],
      ['Adresse', data.adresse],
    ];

    fields.forEach(function(f) {
      if (f[1]) {
        html += '<div class="at-preview-row">'
          + '<span class="at-preview-label">' + f[0] + '</span>'
          + '<span class="at-preview-value">' + escHtml(f[1]) + '</span>'
          + '</div>';
      }
    });

    // Beweisfragen
    if (data.beweisfragen && data.beweisfragen.length) {
      html += '<div class="at-preview-row" style="flex-direction:column;gap:4px;">'
        + '<span class="at-preview-label">Beweisfragen</span>';
      data.beweisfragen.forEach(function(bw, i) {
        html += '<div class="at-preview-value" style="padding-left:12px;font-size:12px;">' + (i + 1) + '. ' + escHtml(bw) + '</div>';
      });
      html += '</div>';
    }

    previewEl.innerHTML = html;
    previewEl.classList.add('visible');
  }

  /* ── Workflow starten ── */
  PROVA._startWorkflow = function() {
    if (!selectedType) return;

    // Daten in sessionStorage für die Zielseite
    var workflowData = {
      auftragstyp: selectedType,
      extracted: extractedData || null,
      timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('prova_neuer_auftrag', JSON.stringify(workflowData));

    // Zielseite bestimmen
    var zielSeite;
    if (selectedType === 'baubegleitung') {
      zielSeite = 'baubegleitung.html';
    } else {
      zielSeite = 'app.html';
    }

    PROVA.closeAuftragstyp();
    // Wizard starten wenn auf app.html / gutachten.html
    if (zielSeite === 'app.html' || zielSeite === 'app.html' || !zielSeite) {
      if (typeof PROVA_WIZARD !== 'undefined' && PROVA_WIZARD.start) {
        PROVA_WIZARD.start(selectedType || 'privatgutachten');
      } else {
        window.location.href = zielSeite || 'app.html';
      }
    } else {
      window.location.href = zielSeite;
    }
  };

  /* ── Dialog öffnen / schließen ── */
  PROVA.openAuftragstyp = function() {
    createDialog();
    selectedType = null;
    extractedData = null;
    // Reset
    document.querySelectorAll('.at-card').forEach(function(c) { c.classList.remove('selected'); });
    if (pdfZone) pdfZone.classList.remove('visible');
    if (pdfStatus) pdfStatus.className = 'at-pdf-status';
    if (previewEl) previewEl.classList.remove('visible');
    if (footerBtn) { footerBtn.disabled = true; footerBtn.textContent = 'Auftragstyp wählen…'; }
    overlayEl.classList.add('open');
  };

  PROVA.closeAuftragstyp = function() {
    if (overlayEl) overlayEl.classList.remove('open');
  };

  // ESC schließt Dialog
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlayEl && overlayEl.classList.contains('open')) {
      PROVA.closeAuftragstyp();
    }
  });

  /* ── Helfer ── */
  function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result.split(',')[1]); };
      reader.onerror = function() { reject(new Error('Datei konnte nicht gelesen werden')); };
      reader.readAsDataURL(file);
    });
  }

  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── nav.js "Neuer Fall" Button überschreiben ── */
  // Warte bis nav.js geladen hat, dann den Button umleiten
  function hookNewButton() {
    var btn = document.getElementById('sb-new-btn');
    if (btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        PROVA.openAuftragstyp();
      };
    } else {
      setTimeout(hookNewButton, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(hookNewButton, 200); });
  } else {
    setTimeout(hookNewButton, 200);
  }

})();
