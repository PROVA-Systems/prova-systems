/* ════════════════════════════════════════════════════════════
   PROVA schnelle-rechnung-logic.js
   3‑Klick Rechnung ohne Fall
════════════════════════════════════════════════════════════ */

(function(){
  'use strict';

  if(!localStorage.getItem('prova_user')){window.location.href='app-login.html';return;}

  var MAKE_KEY_F1 = 'f1';
  var AT_BASE='appJ7bLlAHZoxENWE';
  var AT_RECHNUNGEN='tblF6MS7uiFAJDjiT';
  var svEmail = localStorage.getItem('prova_sv_email')||'';

  function $(id){return document.getElementById(id);}

  function toast(msg, kind){
    var el = $('qr-toast'); if(!el) return;
    el.textContent = msg;
    el.style.borderColor = kind==='err' ? 'rgba(239,68,68,.35)' : 'rgba(16,185,129,.25)';
    el.style.color = kind==='err' ? '#fecaca' : '#d1fae5';
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ el.classList.remove('show'); }, 2600);
  }

  function fmt(n){
    try{ return (Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
    catch(e){ return (Number(n)||0).toFixed(2)+' €'; }
  }

  function parseMoney(v){
    var s = String(v||'').trim();
    if(!s) return NaN;
    // de-DE friendly: "95,50" → "95.50"
    s = s.replace(/\./g,'').replace(',','.');
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function parseNum(v){
    var s = String(v||'').trim();
    if(!s) return NaN;
    s = s.replace(/\./g,'').replace(',','.');
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function genRechnungsnummer(){
    var y=new Date().getFullYear();
    var n=(parseInt(localStorage.getItem('prova_re_counter')||'0')+1);
    localStorage.setItem('prova_re_counter',n);
    return 'RE-'+y+'-'+String(n).padStart(3,'0');
  }

  async function makeProxy(key, payload){
    return provaFetch('/.netlify/functions/make-proxy', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ key: key, payload: payload || {} })
    });
  }

  async function airtableCreateRechnung(fields){
    return provaFetch('/.netlify/functions/airtable', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        method:'POST',
        path:'/v0/'+AT_BASE+'/'+AT_RECHNUNGEN,
        payload:{ records:[{ fields: fields }] }
      })
    });
  }

  function calc(){
    var menge = parseNum($('qr-menge') && $('qr-menge').value);
    var ep    = parseMoney($('qr-ep') && $('qr-ep').value);
    var ust = parseInt(($('qr-ust') && $('qr-ust').value) || '19', 10);
    var netto = (isFinite(menge)?menge:0) * (isFinite(ep)?ep:0);
    var brutto = (netto>0) ? netto * (1 + (ust>0 ? (ust/100) : 0)) : NaN;
    $('qr-brutto').textContent = isFinite(brutto) ? fmt(brutto) : '—';
  }

  function typDefaults(typ){
    if(typ==='Telefon') return { menge:1, ep:150, label:'Telefonberatung', mengeLabel:'Menge', epLabel:'Pauschale (EUR)', mengeHint:'', epHint:'Netto-Pauschale' };
    if(typ==='Aktenstudium') return { menge:1, ep:95, label:'Aktenstudium', mengeLabel:'Stunden', epLabel:'Stundensatz (EUR)', mengeHint:'z.B. 1,5', epHint:'Netto-Stundensatz' };
    if(typ==='Kurzberatung') return { menge:1, ep:150, label:'Kurzberatung', mengeLabel:'Menge', epLabel:'Pauschale (EUR)', mengeHint:'', epHint:'Netto-Pauschale' };
    if(typ==='Fahrtkosten') return { menge:10, ep:0.42, label:'Fahrtkosten', mengeLabel:'Kilometer', epLabel:'Satz (EUR/km)', mengeHint:'z.B. 35', epHint:'üblich: 0,42 €/km' };
    return { menge:1, ep:0, label:'Sonstiges', mengeLabel:'Menge', epLabel:'Einzelpreis (EUR)', mengeHint:'', epHint:'Netto-Einzelpreis' };
  }

  function applyDefaults(){
    var typ = ($('qr-typ') && $('qr-typ').value) || 'Telefon';
    var d = typDefaults(typ);
    if($('qr-menge-label')) $('qr-menge-label').textContent = d.mengeLabel;
    if($('qr-ep-label')) $('qr-ep-label').textContent = d.epLabel;
    if($('qr-menge-hint')) $('qr-menge-hint').textContent = d.mengeHint || ' ';
    if($('qr-ep-hint')) $('qr-ep-hint').textContent = d.epHint || ' ';
    if($('qr-menge') && (!$('qr-menge').value || $('qr-menge').dataset.auto==='1')) { $('qr-menge').value = String(d.menge).replace('.',','); $('qr-menge').dataset.auto='1'; }
    if($('qr-ep') && (!$('qr-ep').value || $('qr-ep').dataset.auto==='1')) { $('qr-ep').value = String(d.ep).replace('.',','); $('qr-ep').dataset.auto='1'; }
    calc();
  }

  window.schnellRechnungErstellen = async function(){
    var typ = ($('qr-typ') && $('qr-typ').value) || 'Telefon';
    var dfl = typDefaults(typ);
    var ag = ($('qr-ag') && $('qr-ag').value || '').trim();
    var email = ($('qr-email') && $('qr-email').value || '').trim();
    var datum = ($('qr-datum') && $('qr-datum').value) || '';
    var ziel = ($('qr-ziel') && $('qr-ziel').value) || '30';
    var menge = parseNum($('qr-menge') && $('qr-menge').value);
    var ep = parseMoney($('qr-ep') && $('qr-ep').value);
    var ust = parseInt(($('qr-ust') && $('qr-ust').value) || '19', 10);
    if(!ag || !email || !datum || !isFinite(menge) || menge<=0 || !isFinite(ep) || ep<0){
      toast('Bitte Typ, Auftraggeber, E-Mail, Datum sowie Menge/Preis ausfüllen.', 'err');
      return;
    }

    var btn = $('qr-submit');
    if(btn){ btn.disabled=true; btn.textContent='⏳ Wird erstellt…'; }

    var reNr = genRechnungsnummer();
    var hinweis = ($('qr-hinweis') && $('qr-hinweis').value || '').trim();
    var posBez = dfl.label + (hinweis ? (' — ' + hinweis) : '');
    var gp = (+menge) * (+ep);
    var netto = gp;
    var brutto = netto * (1 + (ust>0 ? ust/100 : 0));
    var positionen = [{ bezeichnung: posBez, menge: +menge, ep: +ep, gp: +gp }];

    // 1) Airtable: Datensatz anlegen
    var fields = {
      Rechnungsnummer: reNr,
      Rechnungstyp: typ,
      empfaenger_name: ag,
      empfaenger_email: email,
      empfaenger_strasse: '',
      empfaenger_plz: '',
      empfaenger_ort: '',
      aktenzeichen: '',
      Rechnungsdatum: datum,
      zahlungsziel_tage: parseInt(ziel,10)||30,
      netto_betrag_eur: +netto,
      ust_satz: ust>0 ? ust : 0,
      brutto_betrag_eur: +brutto,
      positionen: JSON.stringify(positionen),
      sv_email: svEmail,
      Status: 'Offen',
      Timestamp: new Date().toISOString(),
    };

    try{
      var cr = await airtableCreateRechnung(fields);
      if(!cr.ok){ toast('Airtable Fehler HTTP '+cr.status, 'err'); if(btn){btn.disabled=false;btn.textContent='⚡ PDF anstoßen';} return; }
      var cd = await cr.json();
      var rechnungId = (cd && cd.records && cd.records[0] && cd.records[0].id) ? cd.records[0].id : '';
      if(!rechnungId){ toast('Airtable: keine Rechnungs-ID', 'err'); if(btn){btn.disabled=false;btn.textContent='⚡ PDF anstoßen';} return; }

      // 2) F1 triggern (Make)
      var svVorname  = localStorage.getItem('prova_sv_vorname')  || '';
      var svNachname = localStorage.getItem('prova_sv_nachname') || '';
      var svFirma    = localStorage.getItem('prova_sv_firma')    || '';
      var svStrasse  = localStorage.getItem('prova_sv_strasse')  || '';
      var svPlz      = localStorage.getItem('prova_sv_plz')      || '';
      var svOrt      = localStorage.getItem('prova_sv_ort')      || '';
      var svTelefon  = localStorage.getItem('prova_sv_telefon')  || '';
      var svIban     = localStorage.getItem('prova_sv_iban')     || '';
      var svBic      = localStorage.getItem('prova_sv_bic')      || '';
      var svSteuernr = localStorage.getItem('prova_sv_steuernr') || '';

      var f1Payload = {
        rechnung_id:       rechnungId,
        rechnung_typ:      typ,
        rechnungsnummer:   reNr,
        aktenzeichen:      '',
        leistungszeitraum: '',
        erstellungsdatum:  new Date().toLocaleDateString('de-DE'),
        empfaenger_name:   ag,
        empfaenger_strasse:'',
        empfaenger_plz:    '',
        empfaenger_ort:    '',
        netto_betrag_eur:  +netto,
        ust_satz:          ust>0 ? ust : 0,
        brutto_betrag_eur: +brutto,
        zahlungsziel:      parseInt(ziel,10)||30,
        positionen:        JSON.stringify(positionen),
        sv_email:          svEmail,
        sv_name:           (svVorname + ' ' + svNachname).trim(),
        sv_firma:          svFirma,
        sv_strasse:        svStrasse,
        sv_plz:            svPlz,
        sv_ort:            svOrt,
        sv_telefon:        svTelefon,
        sv_iban:           svIban,
        sv_bic:            svBic,
        sv_steuernr:       svSteuernr,
      };

      var wh = await makeProxy(MAKE_KEY_F1, f1Payload);
      var result = await wh.json().catch(function(){ return {}; });
      if(result && result.success && result.pdf_url){
        toast('✅ Rechnung '+reNr+' erstellt + PDF generiert', 'ok');
        try{ window.open(result.pdf_url, '_blank', 'noopener'); }catch(e){}
      } else {
        toast('✅ Rechnung '+reNr+' erstellt — PDF wird generiert (Mail folgt)', 'ok');
      }
    }catch(e){
      toast('Fehler: '+(e && e.message ? e.message : 'unbekannt'), 'err');
    }

    if(btn){ btn.disabled=false; btn.textContent='⚡ PDF anstoßen'; }
  };

  // Init
  try{
    var d = new Date();
    var iso = d.toISOString().slice(0,10);
    if($('qr-datum')) $('qr-datum').value = iso;
  }catch(e){}

  ['qr-menge','qr-ep','qr-ust'].forEach(function(id){
    var el = $(id);
    if(el) el.addEventListener('input', calc);
    if(el) el.addEventListener('change', calc);
  });
  if($('qr-typ')) $('qr-typ').addEventListener('change', function(){ $('qr-menge').dataset.auto='1'; $('qr-ep').dataset.auto='1'; applyDefaults(); });
  applyDefaults();
})();

