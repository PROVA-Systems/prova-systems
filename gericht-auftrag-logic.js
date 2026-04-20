/* PROVA — Gerichtsauftrag Workflow */
(function(){
  'use strict';

  var AT_BASE = 'appJ7bLlAHZoxENWE';
  var AT_TABLE = 'tblSxV8bsXwd1pwa0'; // SCHADENSFAELLE

  function isoDate(d){
    try { return new Date(d).toISOString().slice(0,10); } catch(e) { return ''; }
  }
  function addDays(dateIso, days){
    if(!dateIso) return '';
    var d = new Date(dateIso + 'T00:00:00');
    if(String(d) === 'Invalid Date') return '';
    d.setDate(d.getDate() + days);
    return isoDate(d);
  }

  window.calcFrist411 = function(){
    var b = document.getElementById('ga-bbd');
    var out = document.getElementById('ga-frist');
    if(!b || !out) return;
    out.value = addDays(b.value, 56);
  };

  window.toggleKv = function(){
    var cb = document.getElementById('ga-kv-check');
    var inp = document.getElementById('ga-kv-betrag');
    if(!cb || !inp) return;
    inp.disabled = !cb.checked;
    if(!cb.checked) inp.value = '';
  };

  function svName(){
    var v = localStorage.getItem('prova_sv_vorname') || '';
    var n = localStorage.getItem('prova_sv_nachname') || '';
    return [v,n].filter(Boolean).join(' ').trim();
  }
  function svAddr(){
    var s = localStorage.getItem('prova_sv_strasse') || '';
    var p = localStorage.getItem('prova_sv_plz') || '';
    var o = localStorage.getItem('prova_sv_ort') || '';
    return [s, [p,o].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  }

  window.gen407aText = async function(){
    var name = svName() || 'der Sachverständige';
    var qual = localStorage.getItem('prova_sv_qualifikation') || '';
    var email= localStorage.getItem('prova_sv_email') || '';
    var gericht = (document.getElementById('ga-gericht')||{}).value || '';
    var az = (document.getElementById('ga-az')||{}).value || '';
    var bbd = (document.getElementById('ga-bbd')||{}).value || '';

    var txt =
      'Erklärung nach §407a ZPO\n\n'
      + 'Ich, ' + name + (qual ? (', ' + qual) : '') + ', erkläre:\n'
      + '1) Ich werde das Gutachten persönlich erstatten und die wesentlichen Tatsachen selbst erheben bzw. prüfen.\n'
      + '2) Sofern Hilfspersonen eingesetzt werden, erfolgt dies nur für untergeordnete Tätigkeiten unter meiner Leitung und Verantwortung.\n'
      + '3) Die fachliche Bewertung und die Schlussfolgerungen werden ausschließlich von mir vorgenommen.\n\n'
      + (gericht || az || bbd
        ? ('Bezug: ' + [gericht ? ('Gericht: ' + gericht) : '', az ? ('Az: ' + az) : '', bbd ? ('Beweisbeschluss: ' + bbd) : ''].filter(Boolean).join(' · ') + '\n\n')
        : '')
      + 'Ort/Datum: ____________________________\n'
      + 'Unterschrift: _________________________\n'
      + (email ? ('Kontakt: ' + email + '\n') : '')
      + (svAddr() ? ('Anschrift: ' + svAddr() + '\n') : '');

    var card = document.getElementById('ga-out-card');
    var pre = document.getElementById('ga-out');
    if(card) card.style.display = 'block';
    if(pre) pre.textContent = txt;

    try { await navigator.clipboard.writeText(txt); } catch(e) {}
    try { if(typeof zeigToast==='function') zeigToast('§407a‑Text kopiert'); } catch(e) {}
  };

  async function airtableCreate(fields){
    var res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        path: '/v0/' + AT_BASE + '/' + AT_TABLE,
        payload: { records: [{ fields: fields }] }
      })
    });
    var json = await res.json().catch(function(){ return {}; });
    if(!res.ok) throw new Error((json && json.error) ? String(json.error) : ('HTTP ' + res.status));
    return json;
  }

  window.saveGerichtsauftrag = async function(){
    var btn = document.getElementById('ga-save');
    var prev = btn ? btn.textContent : '';
    function busy(on){
      if(!btn) return;
      btn.disabled = !!on;
      btn.textContent = on ? 'Speichere…' : (prev || 'Gerichtsauftrag speichern →');
    }

    var gericht = (document.getElementById('ga-gericht')||{}).value || '';
    var az = (document.getElementById('ga-az')||{}).value || '';
    var bbd = (document.getElementById('ga-bbd')||{}).value || '';
    var frist = (document.getElementById('ga-frist')||{}).value || '';
    var fragen = (document.getElementById('ga-fragen')||{}).value || '';
    var kv = !!((document.getElementById('ga-kv-check')||{}).checked);
    var kvB = (document.getElementById('ga-kv-betrag')||{}).value || '';

    if(!gericht.trim()) { alert('Bitte Gericht eingeben.'); return; }
    if(!az.trim()) { alert('Bitte Aktenzeichen Gericht eingeben.'); return; }
    if(!bbd) { alert('Bitte Beweisbeschluss Datum wählen.'); return; }
    if(!frist) { window.calcFrist411(); frist = (document.getElementById('ga-frist')||{}).value || ''; }

    // Minimal-schema safe fields (bestehende Felder aus Workflow)
    var fields = {
      Aktenzeichen: az.trim(),
      Auftraggeber_Name: gericht.trim(),
      Auftraggeber_Typ: 'Gericht',
      Bereich: 'Gericht',
      Status: 'In Bearbeitung',
      Fristdatum: frist || ''
    };

    // Extra-Daten sicher in Messwerte ablegen (schema-sicher)
    var meta =
      'Gerichtsauftrag\n'
      + 'Gericht: ' + gericht.trim() + '\n'
      + 'Gericht AZ: ' + az.trim() + '\n'
      + 'Beweisbeschluss: ' + bbd + '\n'
      + '§411 Frist: ' + (frist || '') + '\n'
      + (kv ? ('Kostenvorschuss: angefordert' + (kvB ? (' · ' + kvB + ' EUR') : '') + '\n') : 'Kostenvorschuss: nein\n')
      + (fragen.trim() ? ('\nBeweisfragen:\n' + fragen.trim() + '\n') : '');
    fields.Messwerte = meta;

    busy(true);
    try {
      await airtableCreate(fields);

      // localStorage Kontext setzen damit Workflow "aktiver Fall" funktioniert
      try {
        localStorage.setItem('prova_letztes_az', az.trim());
        localStorage.setItem('prova_aktiver_fall', az.trim());
        localStorage.setItem('prova_auftraggeber_name', gericht.trim());
        localStorage.setItem('prova_auftraggeber_typ', 'Gericht');
        localStorage.setItem('prova_aktuelle_phase', '2');
      } catch(e) {}

      window.location.href = 'app.html?az=' + encodeURIComponent(az.trim());
    } catch(e) {
      alert('Speichern fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'));
    } finally {
      busy(false);
    }
  };

  // initial defaults
  try {
    var b = document.getElementById('ga-bbd');
    if (b && !b.value) b.value = new Date().toISOString().slice(0,10);
    window.calcFrist411();
  } catch(e) {}
})();


/* ════════════════════════════════════════════════════════════════════════
   PROVA Sprint K1 — §407a ZPO Anzeige-Banner
   20.04.2026 · Claude Co-Founder
   
   Rechtsgrundlage:
   - §407a Abs. 3 ZPO (Anzeige von Hilfsmitteln)
   - LG Darmstadt 19 O 527/16 (10.11.2025) — KI-Anzeige zwingend vorab
   - EU AI Act Art. 50 (ab 02.08.2026)
   
   Banner erscheint auf Arbeitsseiten (akte, app, dashboard, archiv)
   solange Gerichtsauftrag + §407a-Anzeige noch nicht versendet.
   ════════════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';
  
  function zeigeBanner() {
    var typ = (localStorage.getItem('prova_gutachten_typ') || '').toLowerCase();
    if (typ !== 'gerichtsgutachten' && typ !== 'ergaenzungsgutachten') return;
    
    var fallId = localStorage.getItem('prova_aktueller_fall') 
              || localStorage.getItem('prova_az') 
              || '';
    if (!fallId) return;
    
    var anzeigeKey = 'prova_zpo407_' + fallId;
    var bereits = localStorage.getItem(anzeigeKey);
    if (bereits === 'gesendet' || bereits === 'fertig') return;
    
    var dismissKey = 'prova_zpo407_banner_dismissed_' + fallId;
    var dismissed = localStorage.getItem(dismissKey);
    if (dismissed && (Date.now() - parseInt(dismissed)) < 3600000) return; // 1h ausblenden
    
    if (document.getElementById('prova-zpo407-banner')) return;
    
    var banner = document.createElement('div');
    banner.id = 'prova-zpo407-banner';
    banner.style.cssText = [
      'position:fixed', 'top:62px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:900', 'background:linear-gradient(135deg,#ef4444,#dc2626)',
      'color:#fff', 'padding:14px 18px', 'border-radius:12px',
      'box-shadow:0 8px 32px rgba(239,68,68,.5), 0 2px 8px rgba(0,0,0,.2)',
      'max-width:640px', 'width:calc(100% - 40px)',
      'font-family:var(--font-ui,"DM Sans",sans-serif)', 'font-size:13.5px',
      'display:flex', 'align-items:center', 'gap:14px',
      'animation:provaZpoSlide 0.3s ease-out'
    ].join(';');
    
    banner.innerHTML = 
      '<style>@keyframes provaZpoSlide{from{opacity:0;transform:translate(-50%,-10px);}to{opacity:1;transform:translate(-50%,0);}}</style>' +
      '<span style="font-size:22px;flex-shrink:0;">⚖️</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:700;margin-bottom:3px;">§407a Abs. 3 ZPO — Anzeige-Pflicht vor Gutachten-Beginn</div>' +
        '<div style="font-size:11.5px;opacity:.92;line-height:1.4;">KI-Nutzung muss dem Gericht vorab schriftlich angezeigt werden (LG Darmstadt 19 O 527/16).</div>' +
      '</div>' +
      '<a href="zpo-anzeige.html" style="background:#fff;color:#dc2626;padding:9px 16px;border-radius:8px;font-weight:700;text-decoration:none;font-size:12px;white-space:nowrap;flex-shrink:0;">Anzeige erstellen →</a>' +
      '<button onclick="this.parentElement.remove();localStorage.setItem(\'' + dismissKey + '\',Date.now());" style="background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;opacity:.7;line-height:1;padding:0 4px;flex-shrink:0;" title="Schließen (1 Stunde ausblenden)">×</button>';
    
    document.body.appendChild(banner);
  }
  
  var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
  var relevantPages = ['akte.html', 'app.html', 'dashboard.html', 'archiv.html'];
  if (relevantPages.indexOf(page) === -1) return;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(zeigeBanner, 800); });
  } else {
    setTimeout(zeigeBanner, 800);
  }
})();
