/* ════════════════════════════════════════════════════════════
   PROVA termine-logic.js
   Termine — Kalender, Fristen, Erinnerungen
   Extrahiert aus termine.html
════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ─── SIDEBAR ─── */
var paket=localStorage.getItem('prova_paket')||'Solo';
var pc={'Solo':'#4f8ef7','Team':'#a78bfa'}[paket]||'#4f8ef7';
(function(){
  var el=document.getElementById('topbar-paket-badge');
  if(el){el.style.display='none';} // Paket steht in Sidebar unten
  var appUrl=paket==='Team'?'app.html':paket==='Solo'?'app-pro.html':'app.html';
})();
if(!localStorage.getItem('prova_user')){window.location.href='app-login.html';return;}

/* ─── DATEN ─── */
var svEmail=localStorage.getItem('prova_sv_email')||'';
var alleTermine=[];
var kalDatum=new Date();
var WEBHOOK_S8='https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v';
var AT_BASE='appJ7bLlAHZoxENWE';
var AT_TERMINE='tblyMTTdtfGQjjmc2';

function ladeAusLS(){
  try{return JSON.parse(localStorage.getItem('prova_termine')||'[]');}catch(e){return[];}
}
function speichereInLS(arr){
  try{localStorage.setItem('prova_termine',JSON.stringify(arr));}catch(e){}
}

async function ladeTermine(){
  try{
    var filter=svEmail?'{sv_email}="'+svEmail+'"':'NOT({termin_datum}="")';
    var path='/v0/'+AT_BASE+'/'+AT_TERMINE+'?filterByFormula='+encodeURIComponent(filter)+'&maxRecords=200&sort[0][field]=termin_datum&sort[0][direction]=asc';
    var res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:path})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    var data=await res.json();
    var atTermine=(data.records||[]).map(function(r){
      return{id:r.id,titel:r.fields.titel||r.fields.termin_titel||'Termin',typ:r.fields.termin_typ||'Sonstiges',datum:r.fields.termin_datum,uhrzeit:r.fields.uhrzeit||'',az:r.fields.aktenzeichen||'',notiz:r.fields.notiz||'',src:'at'};
    });
    alleTermine=atTermine;
  }catch(e){
    alleTermine=ladeAusLS();
  }
  updateStats();
  renderKalender();
  renderListe();
}

/* ─── STATS ─── */
function updateStats(){
  var heute=new Date();heute.setHours(0,0,0,0);
  var wocheEnd=new Date(heute);wocheEnd.setDate(heute.getDate()+7);
  var ov=0,h=0,w=0,g=0;
  alleTermine.forEach(function(t){
    if(!t.datum)return;
    var d=new Date(t.datum);d.setHours(0,0,0,0);
    if(d<heute)ov++;
    else if(d.getTime()===heute.getTime())h++;
    else if(d<wocheEnd)w++;
    g++;
  });
  setText('stat-overdue',ov);setText('stat-heute',h);setText('stat-woche',w);setText('stat-gesamt',g);
  if(ov>0)document.getElementById('stat-overdue').parentElement.classList.add('red');
}

/* ─── KALENDER ─── */
function renderKalender(){
  var y=kalDatum.getFullYear(),m=kalDatum.getMonth();
  var label=kalDatum.toLocaleString('de-DE',{month:'long',year:'numeric'});
  document.getElementById('kal-month').textContent=label.charAt(0).toUpperCase()+label.slice(1);
  var firstDay=new Date(y,m,1).getDay();
  var firstMo=firstDay===0?6:firstDay-1;
  var dim=new Date(y,m+1,0).getDate();
  var dimPrev=new Date(y,m,0).getDate();
  var today=new Date();today.setHours(0,0,0,0);

  // Termine-Map für diesen Monat
  var tMap={};
  alleTermine.forEach(function(t){
    if(!t.datum)return;
    var d=new Date(t.datum);
    if(d.getFullYear()===y&&d.getMonth()===m){
      var k=d.getDate();
      if(!tMap[k])tMap[k]=[];
      tMap[k].push(t);
    }
  });

  var html='';
  for(var i=0;i<42;i++){
    var day,cls='',isOther=false;
    if(i<firstMo){day=dimPrev-firstMo+i+1;cls='other-month';isOther=true;}
    else if(i>=firstMo+dim){day=i-firstMo-dim+1;cls='other-month';isOther=true;}
    else{
      day=i-firstMo+1;
      var cellDate=new Date(y,m,day);cellDate.setHours(0,0,0,0);
      if(cellDate.getTime()===today.getTime())cls='today';
    }
    var evHtml='';
    if(!isOther&&tMap[day]){
      var evs=tMap[day];
      var maxShow=3;
      evs.slice(0,maxShow).forEach(function(t){
        var lbl=(t.uhrzeit?t.uhrzeit+' ':'')+(t.titel||t.typ);
        evHtml+='<div class="kal-event '+esc(t.typ)+'" onclick="event.stopPropagation();bearbeiteTermin(\''+t.id+'\')" title="'+esc(t.titel||t.typ)+'">'+esc(lbl.slice(0,22))+'</div>';
      });
      if(evs.length>maxShow)evHtml+='<div class="kal-more">+'.concat(evs.length-maxShow,' weitere</div>');
    }
    var hasEvents=!isOther&&tMap[day]&&tMap[day].length>0?'has-events':'';
    html+='<div class="kal-cell '+cls+' '+hasEvents+'" onclick="'+(isOther?'':'neuerTerminAm('+y+','+(m+1)+','+day+')')+'"><div class="kal-num">'+day+'</div>'+evHtml+'</div>';
  }
  document.getElementById('kal-days').innerHTML=html;
}

window.kalNav=function(dir){kalDatum.setMonth(kalDatum.getMonth()+dir);renderKalender();};
window.kalHeute=function(){kalDatum=new Date();renderKalender();};
window.neuerTerminAm=function(y,m,d){
  var ds=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  document.getElementById('t-datum').value=ds;
  oeffneModal();
};

/* ─── LISTE ─── */
window.filterStatus='';
function renderListe(){
  var body=document.getElementById('liste-body');
  var heute=new Date();heute.setHours(0,0,0,0);
  var sorted=alleTermine.slice().sort(function(a,b){
    return new Date(a.datum||0)-new Date(b.datum||0);
  });

  if(sorted.length===0){
    body.innerHTML='<div class="empty-state"><div class="empty-icon">📅</div><p>Noch keine Termine eingetragen.</p><br><button class="btn-new" onclick="oeffneModal()" style="margin:0 auto;">＋ Ersten Termin anlegen</button></div>';
    return;
  }

  var groups={overdue:[],heute:[],diese_woche:[],spaeter:[],vergangen:[]};
  var wocheEnd=new Date(heute);wocheEnd.setDate(heute.getDate()+7);

  sorted.forEach(function(t){
    if(!t.datum){groups.spaeter.push(t);return;}
    var d=new Date(t.datum);d.setHours(0,0,0,0);
    if(d<heute)groups.vergangen.unshift(t);
    else if(d.getTime()===heute.getTime())groups.heute.push(t);
    else if(d<wocheEnd)groups.diese_woche.push(t);
    else groups.spaeter.push(t);
  });

  // Überfällige = vergangene Fristen/Abgaben/Gerichtstermine
  groups.overdue=groups.vergangen.filter(function(t){return t.typ==='Frist'||t.typ==='Abgabe'||t.typ==='Gerichtstermin';});
  groups.vergangen=groups.vergangen.filter(function(t){return t.typ!=='Frist'&&t.typ!=='Abgabe'&&t.typ!=='Gerichtstermin';});

  var html='';
  function renderSection(label,items,cls){
    if(items.length===0)return;
    html+='<div class="section-label">'+label+' <span style="color:var(--text3);font-weight:500;font-size:10px;">('+items.length+')</span></div>';
    items.forEach(function(t){html+=terminCard(t,cls);});
  }

  renderSection('⚠️ Überfällig',groups.overdue,'overdue');
  renderSection('📅 Heute',groups.heute,'today');
  renderSection('📆 Diese Woche',groups.diese_woche,'');
  renderSection('🗓️ Später',groups.spaeter,'');
  if(groups.vergangen.length>0)renderSection('✓ Vergangen',groups.vergangen,'vergangen');

  body.innerHTML=html||'<div class="empty-state"><div class="empty-icon">✨</div><p>Keine offenen Termine.</p></div>';
}

function terminCard(t,statusCls){
  var d=t.datum?new Date(t.datum):null;
  var day=d?d.getDate():'—';
  var mon=d?d.toLocaleString('de-DE',{month:'short'}).replace('.',''):'';
  var typClass='typ-'+(t.typ||'Sonstiges');
  return '<div class="termin-card '+(statusCls||'')+'" onclick="bearbeiteTermin(\''+t.id+'\')">'
    +'<div class="date-box"><div class="date-day">'+day+'</div><div class="date-mon">'+mon+'</div></div>'
    +'<div class="termin-info">'
    +'<div class="termin-title">'+esc(t.titel||t.typ||'Termin')+'</div>'
    +'<div class="termin-meta">'
    +'<span class="termin-typ '+typClass+'">'+esc(t.typ||'Sonstiges')+'</span>'
    +(t.az?'<span>AZ: '+esc(t.az)+'</span>':'')
    +(t.notiz?'<span style="color:var(--text3)">'+esc(t.notiz.slice(0,40))+'</span>':'')
    +'</div>'
    +'</div>'
    +'<div class="termin-right">'
    +'<div class="termin-uhrzeit">'+(t.uhrzeit||'—')+'</div>'
    +'<button class="termin-del" onclick="event.stopPropagation();loescheTermin(\''+t.id+'\')" title="Löschen">✕</button>'
    +'</div>'
    +'</div>';
}

/* ─── MODAL ─── */
window.oeffneModal=function(){
  document.getElementById('modal-titel').textContent='Neuer Termin';
  document.getElementById('edit-id').value='';
  document.getElementById('t-titel').value='';
  document.getElementById('t-typ').value='Ortstermin';
  document.getElementById('t-datum').value=new Date().toISOString().slice(0,10);
  document.getElementById('t-uhrzeit').value='';
  document.getElementById('t-az').value='';
  document.getElementById('t-notiz').value='';
  document.getElementById('termin-modal').classList.add('open');
};
window.schliesseModal=function(){document.getElementById('termin-modal').classList.remove('open');};

window.bearbeiteTermin=function(id){
  var t=alleTermine.find(function(x){return x.id===id;});
  if(!t)return;
  document.getElementById('modal-titel').textContent='Termin bearbeiten';
  document.getElementById('edit-id').value=id;
  document.getElementById('t-titel').value=t.titel||'';
  document.getElementById('t-typ').value=t.typ||'Sonstiges';
  document.getElementById('t-datum').value=t.datum||'';
  document.getElementById('t-uhrzeit').value=t.uhrzeit||'';
  document.getElementById('t-az').value=t.az||'';
  document.getElementById('t-notiz').value=t.notiz||'';
  document.getElementById('termin-modal').classList.add('open');
};

window.speichereTermin=async function(){
  var titel=document.getElementById('t-titel').value.trim();
  var typ=document.getElementById('t-typ').value;
  var datum=document.getElementById('t-datum').value;
  var uhrzeit=document.getElementById('t-uhrzeit').value;
  var az=document.getElementById('t-az').value.trim();
  var notiz=document.getElementById('t-notiz').value.trim();
  if(!titel||!datum){zeigToast('Bitte Titel und Datum ausfüllen','err');return;}

  var editId=document.getElementById('edit-id').value;
  var termin={id:editId||('local_'+Date.now()),titel:titel,typ:typ,datum:datum,uhrzeit:uhrzeit,az:az,notiz:notiz,sv_email:svEmail,src:'local'};

  if(editId){
    var idx=alleTermine.findIndex(function(t){return t.id===editId;});
    if(idx>=0)alleTermine[idx]=termin;
  }else{
    alleTermine.push(termin);
  }
  speichereInLS(alleTermine);
  // Dashboard-Cache updaten damit Fristen-Widget sofort aktuell ist
  try {
    var cacheTermine = alleTermine.map(function(t) {
      return { fields: { termin_datum: t.datum, termin_typ: t.typ, aktenzeichen: t.az || '', notiz: t.titel || '' } };
    });
    localStorage.setItem('prova_termine_cache', JSON.stringify(cacheTermine));
  } catch(e) {}
  schliesseModal();
  updateStats();renderKalender();renderListe();
  zeigToast(editId?'Termin aktualisiert ✓':'Termin gespeichert ✓');

  // Async: In Airtable speichern
  try{
    var fields={termin_typ:typ,termin_datum:datum,aktenzeichen:az||titel||"",notizen:notiz,sv_email:svEmail};
    var method=editId&&editId.startsWith('rec')?'PATCH':'POST';
    var path=editId&&editId.startsWith('rec')?'/v0/'+AT_BASE+'/'+AT_TERMINE+'/'+editId:'/v0/'+AT_BASE+'/'+AT_TERMINE;
    await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:method,path:path,payload:{fields:fields}})});
  }catch(e){}
};

window.loescheTermin=function(id){
  if(!confirm('Termin löschen?'))return;
  alleTermine=alleTermine.filter(function(t){return t.id!==id;});
  speichereInLS(alleTermine);
  updateStats();renderKalender();renderListe();
  zeigToast('Termin gelöscht');
};

/* ─── VIEW TOGGLE ─── */
window.setView=function(v){
  document.getElementById('kal-wrap').classList.toggle('active',v==='kal');
  document.getElementById('liste-wrap').classList.toggle('active',v==='list');
  document.getElementById('tab-kal').classList.toggle('active',v==='kal');
  document.getElementById('tab-list').classList.toggle('active',v==='list');
};

/* ─── HELPER ─── */
function setText(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
window.zeigToast=function(msg,typ){
  var t=document.getElementById('toast');
  t.textContent=msg;t.className='toast'+(typ==='err'?' err':'');
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');},3000);
};

// Heute-Datum als Default im Modal
document.getElementById('t-datum').value=new Date().toISOString().slice(0,10);


/* ─── FRIST-IMPORT AUS AIRTABLE-FÄLLEN ─── */
window.importFristenAusFaellen = async function() {
  var btn = document.querySelector('[onclick="importFristenAusFaellen()"]');
  if(btn){btn.disabled=true;btn.textContent='⏳ Lädt…';}
  try{
    var AT_BASE='appJ7bLlAHZoxENWE';
    var AT_FAELLE='tblSxV8bsXwd1pwa0';
    var svEmail=localStorage.getItem('prova_sv_email')||'';
    if(!svEmail){console.warn('[PROVA] Keine sv_email — keine Termine geladen');return;}
    var filter='{sv_email}="'+svEmail+'"';
    var path='/v0/'+AT_BASE+'/'+AT_FAELLE+'?filterByFormula='+encodeURIComponent(filter)
      +'&fields[]=Aktenzeichen&fields[]=Fristdatum&fields[]=Termin_Gericht&fields[]=Termin_Ortstermin&fields[]=Schadensart&fields[]=Auftraggeber_Name&maxRecords=50';
    var res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:path})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    var data=await res.json();
    var records=data.records||[];
    var neu=0;
    var jetzt=new Date().toISOString().slice(0,10);
    var vorhandeneIds=new Set(alleTermine.map(function(t){return t.id;}));
    records.forEach(function(r){
      var f=r.fields||{};
      var az=f.Aktenzeichen||'';
      var sa=f.Schadensart||'';
      var ag=f.Auftraggeber_Name||'';
      if(f.Fristdatum&&f.Fristdatum>=jetzt){
        var tid='frist_'+r.id;
        if(!vorhandeneIds.has(tid)){
          alleTermine.push({id:tid,src:'import',titel:'Frist: '+az+(ag?' · '+ag:''),typ:'Abgabefrist',datum:f.Fristdatum,uhrzeit:'',az:az,notiz:'Aus Fall importiert'+(sa?' · '+sa:'')});
          neu++;
        }
      }
      if(f.Termin_Gericht&&f.Termin_Gericht>=jetzt){
        var tid2='gericht_'+r.id;
        if(!vorhandeneIds.has(tid2)){
          alleTermine.push({id:tid2,src:'import',titel:'Gerichtstermin: '+az,typ:'Gerichtstermin',datum:f.Termin_Gericht,uhrzeit:'',az:az,notiz:ag?'Auftraggeber: '+ag:''});
          neu++;
        }
      }
      if(f.Termin_Ortstermin&&f.Termin_Ortstermin>=jetzt){
        var tid3='ort_'+r.id;
        if(!vorhandeneIds.has(tid3)){
          alleTermine.push({id:tid3,src:'import',titel:'Ortstermin: '+az,typ:'Ortstermin',datum:f.Termin_Ortstermin,uhrzeit:'',az:az,notiz:ag?'Auftraggeber: '+ag:''});
          neu++;
        }
      }
    });
    updateStats();renderKalender();renderListe();
    zeigToast(neu>0?neu+' Frist'+(neu>1?'en':'')+' aus Fällen importiert ✅':'Keine neuen Fristen gefunden.', neu>0?'ok':'info');
  }catch(e){
    zeigToast('Import fehlgeschlagen: '+e.message,'err');
  }
  if(btn){btn.disabled=false;btn.textContent='📥 Fristen aus Fällen';}
};
// Init
// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
  setView('kal');
  ladeTermine();
});

})();