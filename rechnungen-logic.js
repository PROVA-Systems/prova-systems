/* ════════════════════════════════════════════════════════════
   PROVA rechnungen-logic.js
   Rechnungen — JVEG, Stripe, ZUGFeRD
   Extrahiert aus rechnungen.html
════════════════════════════════════════════════════════════ */

/* zeigToast → globales showToast */
if (!window.zeigToast && window.showToast) window.zeigToast = window.showToast;
if (!window.showToast && window.zeigToast) window.showToast = window.zeigToast;

(function(){
'use strict';

var WEBHOOK_S6='https://hook.eu1.make.com/b2tsqcvjgxhk9lrv3yyo9qht46k16kcq';
var AT_BASE='appJ7bLlAHZoxENWE';
var AT_RECHNUNGEN='tblF6MS7uiFAJDjiT';
var AT_FAELLE='tblSxV8bsXwd1pwa0';

/* ─── SIDEBAR ─── */
var paket=localStorage.getItem('prova_paket')||'Solo';
var pc={'Solo':'#4f8ef7','Team':'#a78bfa'}[paket]||'#4f8ef7';
(function(){
  var el=document.getElementById('topbar-paket-badge');
  if(el){el.style.display='none';} // Paket steht in Sidebar unten
  var appUrl='app.html';
})();
if(!localStorage.getItem('prova_user')){window.location.href='app-login.html';return;}

var svEmail=localStorage.getItem('prova_sv_email')||'';
var alleRechnungen=[];
var posCounter=0;

/* ─── JVEG PREFILL ─── */
(function(){
  var params=new URLSearchParams(window.location.search);
  
  // AZ aus URL-Parameter vorausfüllen (kommt von Freigabe oder Akte)
  var urlAz = params.get('az') || params.get('aktenzeichen');
  if(urlAz){
    var azField = document.getElementById('rechnung-az');
    if(azField && !azField.value) azField.value = decodeURIComponent(urlAz);
    // Auch Fall-Kontext setzen
    if(!localStorage.getItem('prova_letztes_az')) 
      localStorage.setItem('prova_letztes_az', decodeURIComponent(urlAz));
  }
  
  if(params.get('from')!=='jveg')return;
  var raw=null;try{raw=JSON.parse(sessionStorage.getItem('prova_rechnung_prefill')||'null');}catch(e){}
  if(!raw||raw.typ!=='JVEG')return;

  // Typ: JVEG existiert nicht mehr im Dropdown → Pauschal nehmen, Titel manuell setzen
  document.getElementById('rechnung-typ').value='Pauschal';
  var titelEl = document.getElementById('form-titel');
  if(titelEl) titelEl.textContent = 'JVEG-Rechnung';

  // AZ setzen
  if(raw.aktenzeichen){
    var azEl=document.getElementById('r-aktenzeichen');
    if(azEl){azEl.value=raw.aktenzeichen;azEl.classList.add('prefilled');}
  }

  // Auftraggeber aus Akte vorausfüllen (neu)
  if(raw.auftraggeber_name){
    var agEl=document.getElementById('r-auftraggeber');
    if(agEl){agEl.value=raw.auftraggeber_name;agEl.classList.add('prefilled');}
  }
  if(raw.auftraggeber_email){
    var emailEl=document.getElementById('r-email');
    if(emailEl){emailEl.value=raw.auftraggeber_email;emailEl.classList.add('prefilled');}
  }

  // Positionen aus JVEG-Daten aufbauen
  if(raw.stunden_gutachten>0)addPosition('§9 Honorar Gutachten (Gruppe '+raw.honorargruppe+')',raw.stunden_gutachten,raw.stundensatz);
  if(raw.stunden_akten>0)addPosition('§9 Aktenstudium',raw.stunden_akten,raw.stundensatz);
  if(raw.km>0)addPosition('§8 Fahrtkosten',raw.km,0.42);
  if(raw.wartezeit>0)addPosition('§7 Wartezeit',raw.wartezeit,raw.stundensatz);
  if(raw.schreibseiten>0)addPosition('§12 Schreibauslagen',raw.schreibseiten,0.90);
  if(raw.fotos>0)addPosition('§12 Fotokosten',raw.fotos,2.00);

  // MwSt
  document.getElementById('ust-toggle').checked=raw.mit_mwst!==false;
  berechneBrutto();

  // Banner
  var info='JVEG '+raw.honorargruppe+' · '+fmt(raw.netto)+' netto · '+fmt(raw.brutto)+' brutto';
  document.getElementById('jveg-banner-info').textContent=info;
  document.getElementById('jveg-banner').classList.add('show');

  // Rückweg-Button zur Akte einblenden (neu)
  if(raw.rueckweg){
    var rueckBtn = document.createElement('a');
    rueckBtn.href = raw.rueckweg;
    rueckBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:12px;font-size:12px;color:var(--accent);text-decoration:none;font-weight:600;';
    rueckBtn.innerHTML = '← Zurück zur Akte';
    var banner = document.getElementById('jveg-banner');
    if(banner) banner.appendChild(rueckBtn);
  }

  // sessionStorage aufräumen
  sessionStorage.removeItem('prova_rechnung_prefill');
  // Prefill-Banner anzeigen
  (function() {
    var banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:99998;background:#0a1f14;border:1.5px solid #10b981;border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.7);max-width:90vw;font-family:var(--font-ui,sans-serif);';
    banner.innerHTML = '<span style="font-size:18px;">💶</span><div style="font-size:13px;font-weight:600;color:#10b981;">JVEG-Rechnung vorausgefüllt aus Zeiterfassung — bitte prüfen und anpassen</div><button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:0;">×</button>';
    document.body.appendChild(banner);
    setTimeout(function() { if (banner.parentNode) banner.remove(); }, 7000);
  })();
})();

window.verwerfeJveg=function(){
  document.getElementById('jveg-banner').classList.remove('show');
  resetForm();
};

/* ─── POSITIONEN ─── */
window.addPosition=function(bez,menge,ep){
  posCounter++;
  var id='pos-'+posCounter;
  var container=document.getElementById('positionen-container');
  var b=bez||'';var m=menge!=null?menge:1;var e=ep!=null?ep:0;
  var gp=(m*e).toFixed(2);
  var div=document.createElement('div');
  div.className='pos-row';div.id=id;
  div.innerHTML='<input class="pos-input" placeholder="Bezeichnung" value="'+esc(String(b))+'" oninput="aktualisierePos()">'
    +'<input class="pos-input" type="number" min="0" step="0.25" value="'+m+'" oninput="aktualisierePos()" style="text-align:center;">'
    +'<input class="pos-input" type="number" min="0" step="0.01" value="'+e+'" oninput="aktualisierePos()" style="text-align:right;">'
    +'<input class="pos-input" type="number" readonly value="'+gp+'" style="text-align:right;color:var(--text3);">'
    +'<button class="pos-del" onclick="document.getElementById(\''+id+'\').remove();aktualisierePos()">×</button>';
  container.appendChild(div);
  aktualisierePos();
};

window.aktualisierePos=function(){
  var rows=document.querySelectorAll('#positionen-container .pos-row');
  var total=0;
  rows.forEach(function(row){
    var inputs=row.querySelectorAll('input');
    var m=parseFloat(inputs[1].value)||0;
    var e=parseFloat(inputs[2].value)||0;
    var gp=m*e;
    inputs[3].value=gp.toFixed(2);
    total+=gp;
  });
  document.getElementById('pos-netto-gesamt').textContent=fmt(total);
  berechneBrutto();
};

function getNetto(){
  var rows=document.querySelectorAll('#positionen-container .pos-row');
  var total=0;
  rows.forEach(function(row){
    var inputs=row.querySelectorAll('input');
    total+=(parseFloat(inputs[1].value)||0)*(parseFloat(inputs[2].value)||0);
  });
  return total;
}

function berechneBrutto(){
  var netto=getNetto();
  var mitMwSt=document.getElementById('ust-toggle').checked;
  var mwstBetrag=mitMwSt?netto*0.19:0;
  var brutto=netto+mwstBetrag;
  document.getElementById('brutto-display').textContent=fmt(brutto);
  document.getElementById('brutto-detail').textContent=fmt(netto)+' netto + '+fmt(mwstBetrag)+' MwSt.';
  document.getElementById('ust-label').textContent=mitMwSt?'19 % MwSt. anwenden':'§4 UStG — 0 % (steuerfrei)';
  document.getElementById('ust-hint').textContent=mitMwSt?'Standard für Sachverständige':'Nur bei nachgewiesener Steuerfreiheit';
  return{netto:netto,mwst:mwstBetrag,brutto:brutto};
}
window.berechneBrutto=berechneBrutto;

/* ─── TYP-CHANGE ─── */
window.onTypChange=function(){
  var typ=document.getElementById('rechnung-typ').value;
  document.getElementById('form-titel').textContent={JVEG:'JVEG-Rechnung',Pauschal:'Pauschalrechnung',Stunde:'Stundenrechnung',Kurz:'Kurzrechnung',Gutschrift:'Gutschrift'}[typ]||'Neue Rechnung';
  // Standardposition je Typ
  if(document.querySelectorAll('#positionen-container .pos-row').length===0){
    if(typ==='JVEG'){addPosition('Gutachterhonorar §9 JVEG',1,0);
    // Tipp einblenden
    var tip=document.getElementById('jveg-position-tipp');
    if(tip)tip.style.display='block';
  }
    else if(typ==='Pauschal')addPosition('Gutachterhonorar (Pauschal)',1,0);
    else if(typ==='Stunde')addPosition('Sachverständigenleistung',1,95);
    else if(typ==='Kurz')addPosition('Kurzgutachten',1,0);
    else addPosition('Position',1,0);
  }
};

/* ─── RECHNUNGSNUMMER ─── */
function genRechnungsnummer(){
  var y=new Date().getFullYear();
  var n=(parseInt(localStorage.getItem('prova_re_counter')||'0')+1);
  localStorage.setItem('prova_re_counter',n);
  return 'RE-'+y+'-'+String(n).padStart(3,'0');
}

/* ─── RECHNUNG ERSTELLEN ─── */
window.erstelleRechnung=async function(){
  var ag=document.getElementById('r-auftraggeber').value.trim();
  var email=document.getElementById('r-email').value.trim();
  var datum=document.getElementById('r-datum').value;
  if(!ag||!email||!datum){zeigToast('Bitte Auftraggeber, E-Mail und Datum ausfüllen','err');return;}

  var btn=document.getElementById('btn-erstellen');
  btn.disabled=true;btn.textContent='⏳ Wird erstellt…';

  var betraege=berechneBrutto();
  var reNr=genRechnungsnummer();
  var payload=bauePayload(reNr,betraege,false);

  try{
    // Webhook (Airtable-Speicherung)
    fetch(WEBHOOK_S6,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});

    // PDF via rechnung-pdf.js generieren
    var pdfRes = await generierePDF(reNr, payload, betraege);
    if(pdfRes && pdfRes.pdf_url){
      zeigToast('✅ Rechnung '+reNr+' — PDF bereit');
      zeigePdfButton(pdfRes.pdf_url, reNr);
    } else {
      zeigToast('✅ Rechnung '+reNr+' erstellt — PDF folgt per E-Mail');
    }
    speichereLokal(reNr,ag,betraege.brutto,'Offen',datum);
    await ladeListe();
    resetForm();
    zeigeAbschlussButton(reNr);
  }catch(e){
    zeigToast('Netzwerkfehler: '+e.message,'err');
  }
  btn.disabled=false;btn.textContent='📄 Rechnung erstellen & PDF';
};

window.sendePerEmail=async function(){
  var email=document.getElementById('r-email').value.trim();
  if(!email){zeigToast('Bitte E-Mail-Adresse eintragen','err');return;}
  var betraege=berechneBrutto();
  var reNr=genRechnungsnummer();
  var payload=bauePayload(reNr,betraege,true);
  try{
    await fetch(WEBHOOK_S6,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    zeigToast('📧 Rechnung '+reNr+' wird per E-Mail versendet');
    speichereLokal(reNr,document.getElementById('r-auftraggeber').value.trim(),betraege.brutto,'Offen',document.getElementById('r-datum').value);
    await ladeListe();
    resetForm();
  }catch(e){zeigToast('Netzwerkfehler','err');}
};

function bauePayload(reNr,betraege,senden){
  var rows=document.querySelectorAll('#positionen-container .pos-row');
  var positionen=[];
  rows.forEach(function(row){
    var inp=row.querySelectorAll('input');
    positionen.push({bezeichnung:inp[0].value,menge:+inp[1].value,ep:+inp[2].value,gp:+inp[3].value});
  });
  return{
    rechnungstyp:document.getElementById('rechnung-typ').value,
    rechnungsnummer:reNr,
    empfaenger_name:document.getElementById('r-auftraggeber').value.trim(),
    empfaenger_email:document.getElementById('r-email').value.trim(),
    empfaenger_strasse:document.getElementById('r-strasse').value.trim(),
    empfaenger_plz:document.getElementById('r-plz').value.trim(),
    empfaenger_ort:document.getElementById('r-ort').value.trim(),
    aktenzeichen:document.getElementById('r-aktenzeichen').value.trim(),
    schadensnummer:document.getElementById('r-schadensnummer').value.trim(),
    rechnungsdatum:document.getElementById('r-datum').value,
    zahlungsziel:document.getElementById('r-zahlungsziel').value,
    leitweg:document.getElementById('r-leitweg').value.trim(),
    netto_betrag_eur:betraege.netto,
    ust_satz:document.getElementById('ust-toggle').checked?19:0,
    brutto_betrag_eur:betraege.brutto,
    positionen:JSON.stringify(positionen),
    positionen_obj:positionen,
    sv_name:(localStorage.getItem('prova_sv_vorname')||'')+' '+(localStorage.getItem('prova_sv_nachname')||''),
    sv_strasse:localStorage.getItem('prova_sv_strasse')||'',
    sv_plz:localStorage.getItem('prova_sv_plz')||'',
    sv_ort:localStorage.getItem('prova_sv_ort')||'',
    sv_email:svEmail,
    sv_iban:localStorage.getItem('prova_sv_iban')||'',
    sv_steuernr:localStorage.getItem('prova_sv_steuernr')||'',
    sv_ustid:localStorage.getItem('prova_sv_ustid')||'',
    senden_per_email:senden,
    ts:new Date().toISOString()
  };
}

/* ─── LISTE LADEN ─── */
function speichereLokal(reNr,ag,brutto,status,datum){
  var ls=[];try{ls=JSON.parse(localStorage.getItem('prova_rechnungen_local')||'[]');}catch(e){}
  ls.unshift({re_nr:reNr,auftraggeber:ag,betrag_brutto:brutto,Status:status,datum:datum,sv_email:svEmail});
  if(ls.length>50)ls=ls.slice(0,50);
  try{localStorage.setItem('prova_rechnungen_local',JSON.stringify(ls));}catch(e){}
}

async function ladeListe(){
  var liste=document.getElementById('rechnung-liste');
  try{
    var filter=svEmail?'AND(NOT({Status}=""),{sv_email}="'+svEmail+'")':'NOT({Status}="")';
    var path='/v0/'+AT_BASE+'/'+AT_RECHNUNGEN+'?filterByFormula='+encodeURIComponent(filter)+'&maxRecords=50&sort[0][field]=Timestamp&sort[0][direction]=desc';
    var res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:path})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    var data=await res.json();
    alleRechnungen=(data.records||[]).map(function(r){
      return{id:r.id,re_nr:r.fields.Rechnungsnummer||r.fields.re_nr||'—',auftraggeber:r.fields.Auftraggeber_Name||r.fields.empfaenger_name||'—',betrag:parseFloat(r.fields.betrag_brutto||r.fields.brutto_betrag_eur||0),status:r.fields.Status||'Offen',datum:r.fields.Rechnungsdatum||r.fields.rechnungsdatum||''};
    });
  }catch(e){
    var ls=[];try{ls=JSON.parse(localStorage.getItem('prova_rechnungen_local')||'[]');}catch(e2){}
    alleRechnungen=ls.map(function(r){return{id:r.re_nr,re_nr:r.re_nr,auftraggeber:r.auftraggeber,betrag:parseFloat(r.betrag_brutto)||0,status:r.Status||'Offen',datum:r.datum};});
  }

  // Stats
  var ueberf=0,offen=0,bezahlt=0;
  var dreissigAgo=Date.now()-30*24*60*60*1000;
  alleRechnungen.forEach(function(r){
    if(r.status==='Überfällig')ueberf+=r.betrag;
    else if(r.status==='Offen'||r.status==='1. Mahnung'||r.status==='2. Mahnung')offen+=r.betrag;
    else if(r.status==='Bezahlt'){
      var d=r.datum?new Date(r.datum).getTime():0;
      if(d>dreissigAgo)bezahlt+=r.betrag;
    }
  });
  setText('stat-ueberfaellig',fmt(ueberf));
  setText('stat-offen',fmt(offen));
  setText('stat-bezahlt',fmt(bezahlt));
  // Jahresumsatz (Bezahlt im aktuellen Kalenderjahr)
  var jahresStart=new Date(new Date().getFullYear(),0,1).getTime();
  var jahresumsatz=0;
  alleRechnungen.forEach(function(r){
    if(r.status==='Bezahlt'){
      var d=r.datum?new Date(r.datum).getTime():0;
      if(d>=jahresStart) jahresumsatz+=r.betrag;
    }
  });
  setText('stat-jahresumsatz',fmt(jahresumsatz));
  setText('liste-count',alleRechnungen.length+' Rechnungen');

  if(alleRechnungen.length===0){
    liste.innerHTML='<div class="liste-empty">Noch keine Rechnungen.<br><br><a href="jveg.html" style="color:var(--accent);font-size:12px;">JVEG-Rechner öffnen →</a></div>';
    return;
  }
  liste.innerHTML=alleRechnungen.map(function(r){
    var stClass=r.status==='Überfällig'?'st-ueberfaellig':r.status==='Bezahlt'?'st-bezahlt':r.status&&r.status.includes('Mahnung')?'st-gemahnt':'st-offen';
    var d=r.datum?new Date(r.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';
    return '<div class="rechnung-item" onclick="waehleSpalte(\''+r.id+'\')">'
      +'<div><div class="re-no">'+esc(r.re_nr)+'</div><div class="re-client">'+esc(r.auftraggeber)+'</div><div class="re-date">'+d+'</div></div>'
      +'<div style="text-align:right;"><div class="re-amount">'+fmt(r.betrag)+'</div><div><span class="status-badge '+stClass+'">'+esc(r.status)+'</span></div></div>'
      +'</div>';
  }).join('');
}

window.waehleSpalte=function(id){
  document.querySelectorAll('.rechnung-item').forEach(function(el){el.classList.remove('selected');});
  var r=alleRechnungen.find(function(x){return x.id===id;});
  if(!r)return;
  event.currentTarget&&event.currentTarget.classList.add('selected');
  zeigeRechnungDetail(r);
};

/* ─── RECHNUNGS-DETAIL + MAHNWESEN ─── */
function zeigeRechnungDetail(r) {
  var existing = document.getElementById('re-detail-panel');
  if (existing) existing.remove();

  var tageOffen = r.datum ? Math.floor((Date.now() - new Date(r.datum).getTime()) / 86400000) : 0;
  var zahlungsziel = 30;
  var tageUeber = tageOffen - zahlungsziel;
  var istOffen = r.status !== 'Bezahlt';

  var mahnStufe = 'keine';
  if (tageUeber > 60) mahnStufe = '3. Mahnung';
  else if (tageUeber > 30) mahnStufe = '2. Mahnung';
  else if (tageUeber > 0) mahnStufe = '1. Mahnung';

  var html = '<div id="re-detail-panel" style="margin-top:12px;padding:16px;background:var(--bg3,#181b24);border:1px solid var(--border2);border-radius:10px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
    + '<div style="font-size:14px;font-weight:700;color:var(--text);">' + esc(r.re_nr) + ' — ' + esc(r.auftraggeber) + '</div>'
    + '<button onclick="document.getElementById(\'re-detail-panel\').remove()" style="background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer;">✕</button>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px;margin-bottom:12px;">'
    + '<div><span style="color:var(--text3);">Betrag</span><br><strong>' + fmt(r.betrag) + '</strong></div>'
    + '<div><span style="color:var(--text3);">Erstellt</span><br>' + (r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '—') + '</div>'
    + '<div><span style="color:var(--text3);">Tage offen</span><br><strong style="color:' + (tageUeber > 0 ? 'var(--danger)' : 'var(--text)') + ';">' + tageOffen + ' Tage' + (tageUeber > 0 ? ' (überfällig!)' : '') + '</strong></div>'
    + '</div>';

  if (istOffen) {
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      + '<button onclick="markiereBezahlt(\'' + r.id + '\')" style="padding:7px 14px;border-radius:7px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);color:#10b981;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">✅ Als bezahlt markieren</button>';

    if (tageUeber > 0) {
      html += '<button onclick="erstelleMahnung(\'' + r.id + '\',1)" style="padding:7px 14px;border-radius:7px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);color:#f59e0b;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">📧 1. Mahnung</button>';
    }
    if (tageUeber > 30) {
      html += '<button onclick="erstelleMahnung(\'' + r.id + '\',2)" style="padding:7px 14px;border-radius:7px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#ef4444;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">📧 2. Mahnung</button>';
    }
    if (tageUeber > 60) {
      html += '<button onclick="erstelleMahnung(\'' + r.id + '\',3)" style="padding:7px 14px;border-radius:7px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#ef4444;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">🚨 Letzte Mahnung</button>';
    }

    html += '</div>';

    if (mahnStufe !== 'keine') {
      html += '<div style="margin-top:8px;font-size:11px;color:var(--text3);">Empfehlung: <strong style="color:#f59e0b;">' + mahnStufe + '</strong> versenden</div>';
    }
  } else {
    html += '<div style="font-size:12px;color:#10b981;">✅ Bezahlt</div>';
  }

  html += '<div id="mahnung-preview" style="display:none;margin-top:12px;"></div>';
  html += '</div>';

  var liste = document.getElementById('rechnungs-liste') || document.querySelector('.liste-body');
  if (liste) liste.insertAdjacentHTML('afterend', html);
}

/* ─── MAHNUNG ERSTELLEN ─── */
window.erstelleMahnung = function(reId, stufe) {
  var r = alleRechnungen.find(function(x) { return x.id === reId; });
  if (!r) return;

  var svName = localStorage.getItem('prova_sv_name') || 'Sachverständigenbüro';
  var tageOffen = r.datum ? Math.floor((Date.now() - new Date(r.datum).getTime()) / 86400000) : 0;
  var reDatum = r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '';

  var texte = {
    1: {
      betreff: 'Zahlungserinnerung — Rechnung ' + r.re_nr,
      text: 'Sehr geehrte Damen und Herren,\n\nsicherlich ist es Ihrer Aufmerksamkeit entgangen, dass unsere Rechnung Nr. ' + r.re_nr + ' vom ' + reDatum + ' über ' + fmt(r.betrag) + ' noch nicht beglichen wurde.\n\nWir bitten Sie, den offenen Betrag innerhalb von 10 Tagen auf unser Konto zu überweisen.\n\nMit freundlichen Grüßen\n' + svName
    },
    2: {
      betreff: '2. Mahnung — Rechnung ' + r.re_nr,
      text: 'Sehr geehrte Damen und Herren,\n\ntrotz unserer Zahlungserinnerung ist die Rechnung Nr. ' + r.re_nr + ' vom ' + reDatum + ' über ' + fmt(r.betrag) + ' weiterhin unbeglichen. Die Rechnung ist seit ' + tageOffen + ' Tagen offen.\n\nWir fordern Sie auf, den Betrag innerhalb von 7 Tagen zu begleichen. Andernfalls behalten wir uns rechtliche Schritte vor.\n\nMit freundlichen Grüßen\n' + svName
    },
    3: {
      betreff: 'Letzte Mahnung vor Inkasso — Rechnung ' + r.re_nr,
      text: 'Sehr geehrte Damen und Herren,\n\ndie Rechnung Nr. ' + r.re_nr + ' vom ' + reDatum + ' über ' + fmt(r.betrag) + ' ist seit ' + tageOffen + ' Tagen unbeglichen — trotz unserer bisherigen Mahnungen.\n\nDies ist unsere letzte Mahnung. Sollte der Betrag nicht innerhalb von 5 Werktagen auf unserem Konto eingehen, werden wir die Forderung ohne weitere Ankündigung an ein Inkassobüro übergeben.\n\nMit freundlichen Grüßen\n' + svName
    }
  };

  var t = texte[stufe] || texte[1];
  var preview = document.getElementById('mahnung-preview');
  if (!preview) return;

  preview.style.display = 'block';
  preview.innerHTML = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#f59e0b;margin-bottom:6px;">Mahnung Vorschau — Stufe ' + stufe + '</div>'
    + '<div style="font-size:11px;color:var(--text3);margin-bottom:4px;"><strong>Betreff:</strong> ' + esc(t.betreff) + '</div>'
    + '<pre style="font-size:11px;color:var(--text2);white-space:pre-wrap;line-height:1.5;background:var(--bg2);padding:10px;border-radius:6px;margin-bottom:8px;">' + esc(t.text) + '</pre>'
    + '<div style="display:flex;gap:6px;">'
    + '<a href="mailto:' + (r.email || '') + '?subject=' + encodeURIComponent(t.betreff) + '&body=' + encodeURIComponent(t.text) + '" style="padding:6px 14px;border-radius:6px;background:#f59e0b;color:#fff;font-size:12px;font-weight:600;text-decoration:none;font-family:inherit;">📧 Per E-Mail senden</a>'
    + '<button onclick="navigator.clipboard.writeText(decodeURIComponent(\'' + encodeURIComponent(t.text) + '\'));zeigToast(\'Text kopiert ✓\')" style="padding:6px 14px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid var(--border2);color:var(--text2);font-size:12px;cursor:pointer;font-family:inherit;">📋 Kopieren</button>'
    + '<button onclick="setzeStatus(\'' + r.id + '\',\'' + stufe + '. Mahnung\')" style="padding:6px 14px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid var(--border2);color:var(--text2);font-size:12px;cursor:pointer;font-family:inherit;">Status → ' + stufe + '. Mahnung</button>'
    + '</div>';
};

/* ─── STATUS SETZEN ─── */
window.markiereBezahlt = function(reId) {
  setzeStatus(reId, 'Bezahlt');
  zeigToast('✅ Rechnung als bezahlt markiert');
};

function setzeStatus(reId, neuerStatus) {
  var r = alleRechnungen.find(function(x) { return x.id === reId; });
  if (r) {
    r.status = neuerStatus;
    localStorage.setItem('prova_rechnungen', JSON.stringify(alleRechnungen));
    ladeListe();
    var panel = document.getElementById('re-detail-panel');
    if (panel) panel.remove();
  }
}

/* ─── RESET ─── */
window.resetForm=function(){
  ['r-auftraggeber','r-email','r-strasse','r-plz','r-ort','r-aktenzeichen','r-schadensnummer','r-leitweg'].forEach(function(id){var el=document.getElementById(id);if(el){el.value='';el.classList.remove('prefilled');}});
  document.getElementById('r-datum').value=new Date().toISOString().slice(0,10);
  document.getElementById('positionen-container').innerHTML='';
  posCounter=0;
  berechneBrutto();
  document.getElementById('jveg-banner').classList.remove('show');
  document.getElementById('form-titel').textContent='Neue Rechnung';
};

/* ─── HELPER ─── */
function fmt(v){return (v||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function setText(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
window.zeigToast=function(msg,typ){
  var t=document.getElementById('toast');
  t.textContent=msg;t.className='toast'+(typ==='err'?' err':'');
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');},3200);
};

/* ─── INIT ─── */
document.getElementById('r-datum').value=new Date().toISOString().slice(0,10);
// Default eine Gutachter-Position
if(document.querySelectorAll('#positionen-container .pos-row').length===0){
  addPosition('Gutachterhonorar §9 JVEG',1,0);
}
// ladeListe() → in DOMContentLoaded

})();

/* ─────────────────────────────────────────── */

function openSupportModal(){
  var m=document.getElementById('support-modal');
  if(!m)return;
  var fb=document.getElementById('support-form-body');
  var ok=document.getElementById('sup-ok');
  if(fb)fb.style.display='block';
  if(ok)ok.style.display='none';
  var b=document.getElementById('sup-betreff');
  var n=document.getElementById('sup-nachricht');
  var btn=document.getElementById('sup-btn');
  if(b)b.value='';if(n)n.value='';
  if(btn){btn.disabled=false;btn.textContent='Nachricht senden';}
  m.classList.add('open');
}
async function supSendModal(){
  var b=(document.getElementById('sup-betreff').value||'').trim();
  var n=(document.getElementById('sup-nachricht').value||'').trim();
  if(!b||!n){document.getElementById('sup-err').style.display='block';return;}
  document.getElementById('sup-err').style.display='none';
  var btn=document.getElementById('sup-btn');
  btn.disabled=true;btn.textContent='⏳ Wird gesendet…';
  try{
    await fetch('https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        betreff:b,
        nachricht:n,
        sv_email:localStorage.getItem('prova_sv_email')||'',
        paket:localStorage.getItem('prova_paket')||'Solo',
        seite:window.location.pathname
      })
    });
    document.getElementById('support-form-body').style.display='none';
    document.getElementById('sup-ok').style.display='block';
  }catch(e){
    btn.disabled=false;
    btn.textContent='Nachricht senden';
    alert('Fehler. Bitte E-Mail an support@prova-systems.de');
  }
}