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

