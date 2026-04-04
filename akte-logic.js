/* ════════════════════════════════════════════════════════════
   PROVA akte-logic.js
   Akte — Airtable-Record, Timeline, Dokumente
   Extrahiert aus akte.html
════════════════════════════════════════════════════════════ */

(function(){
'use strict';

var AT_BASE='appJ7bLlAHZoxENWE';
var AT_FAELLE='tblSxV8bsXwd1pwa0';
var AT_TERMINE='tblyMTTdtfGQjjmc2';

/* ─── SETUP ─── */
var paket=localStorage.getItem('prova_paket')||'Solo';
var pc={'Solo':'#4f8ef7','Team':'#a78bfa'}[paket]||'#4f8ef7';
(function(){
  var el=document.getElementById('topbar-paket-badge');
  if(el){el.style.display='none';} // Paket steht in Sidebar unten
})();
provaAuthGuard();

/* ─── RECORD LADEN ─── */
var recordId=sessionStorage.getItem('prova_record_id')||new URLSearchParams(window.location.search).get('id')||'';
var aktenzeichen=new URLSearchParams(window.location.search).get('az')||'';
var currentRecord=null;
var currentFields={};

async function ladeRecord(){
  // Wenn nur az= übergeben (kein Record-ID) → per Aktenzeichen suchen
  if(!recordId && aktenzeichen){
    try{
      var searchPath='/v0/'+AT_BASE+'/'+AT_FAELLE+'?filterByFormula='+encodeURIComponent('{Aktenzeichen}="'+aktenzeichen+'"')+'&maxRecords=1';
      var searchRes=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:searchPath})});
      if(searchRes.ok){
        var searchData=await searchRes.json();
        if(searchData&&searchData.records&&searchData.records.length>0){
          recordId=searchData.records[0].id;
          sessionStorage.setItem('prova_record_id',recordId);
        }
      }
    }catch(e){console.warn('AZ-Lookup Fehler:',e);}
  }
  if(!recordId){zeigNotFound();return;}
  try{
    var path='/v0/'+AT_BASE+'/'+AT_FAELLE+'/'+recordId;
    var res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:path})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    var data=await res.json();
    if(!data||!data.id){zeigNotFound();return;}
    currentRecord=data;
    currentFields=data.fields||{};
    renderAkte();
    // Termine laden
    ladeTermine();
  }catch(e){
    console.warn('Akte laden Fehler:',e);
    // Fallback: aus localStorage-Cache
    var cache=[];try{cache=JSON.parse(localStorage.getItem('prova_archiv_cache_v2')||'{"data":[]}').data||[];}catch(e2){}
    var local=cache.find(function(r){return r.id===recordId;});
    if(local){currentRecord=local;currentFields=local.fields||{};renderAkte();}
    else{zeigNotFound();}
  }
}

/* ─── AKTE RENDERN ─── */
function renderAkte(){
  var f=currentFields;
  var az=f.Aktenzeichen||recordId.slice(-6).toUpperCase();
  var schadenart=f.Schadenart||f.schadenart||f.Schadensart||'Schadenfall';
  var adresse=f.Adresse||[f.Schaden_Strasse,f.Ort].filter(Boolean).join(', ')||'—';
  var status=f.Status||'In Bearbeitung';

  // Breadcrumb + Header
  setText('bc-az',az);
  setText('h-az',az);
  setText('h-title',schadenart+(f.Auftraggeber_Name?' — '+f.Auftraggeber_Name:''));
  setText('h-sub',adresse+(f.Schadensdatum?' · Schaden: '+formatDatum(f.Schadensdatum):''));
  document.title=az+' · PROVA';

  // Status Select
  var sel=document.getElementById('status-select');
  if(sel)sel.value=status;

  // Status Display
  var stClass=statusClass(status);
  document.getElementById('status-display').innerHTML='<span class="status-badge '+stClass+'">'+esc(status)+'</span>';
  document.getElementById('status-hint').textContent=statusHint(status);

  // Stammdaten
  var metaItems=[
    {label:'Aktenzeichen',value:az,mono:true},
    {label:'Schadenart',value:schadenart},
    {label:'Schadensdatum',value:f.Schadensdatum?formatDatum(f.Schadensdatum):'—'},
    {label:'Objekt-Adresse',value:adresse},
    {label:'PLZ / Ort',value:[f.PLZ,f.Ort].filter(Boolean).join(' ')||'—'},
    {label:'Angelegt am',value:f.Timestamp?formatDatum(f.Timestamp):'—'},
    {label:'Gutachten-Vorlage',value:f.gutachten_vorlage_id||'Standard'},
    {label:'Bearbeitungszeit',value:f.Bearbeitungszeit_Min?Math.round(f.Bearbeitungszeit_Min)+' Min.':'—'}
  ];
  document.getElementById('meta-grid').innerHTML=metaItems.map(function(m){
    return '<div class="meta-item">'
      +'<div class="meta-label">'+esc(m.label)+'</div>'
      +'<div class="meta-value'+(m.mono?' mono':'')+(m.value==='—'?' empty':'')+'">'+esc(m.value)+'</div>'
      +'</div>';
  }).join('');

  // Auftraggeber
  setText('ag-name',f.Auftraggeber_Name||'Nicht angegeben');
  var agDetails='';
  if(f.Auftraggeber_Typ)agDetails+='<span>'+esc(f.Auftraggeber_Typ)+'</span><br>';
  if(f.Auftraggeber_Email)agDetails+='<a href="mailto:'+esc(f.Auftraggeber_Email)+'" style="color:var(--accent);">'+esc(f.Auftraggeber_Email)+'</a><br>';
  if(f.Ansprechpartner)agDetails+='z.Hd. '+esc(f.Ansprechpartner)+'<br>';
  document.getElementById('ag-details').innerHTML=agDetails||'<span style="color:var(--text3);">Keine Kontaktdaten</span>';

  var agActions='';
  if(f.Auftraggeber_Email){
    agActions+='<a href="mailto:'+esc(f.Auftraggeber_Email)+'" class="dok-btn" style="font-size:11px;">✉️ E-Mail</a>';
  }
  agActions+='<button class="dok-btn" onclick="window.location.href=\'briefvorlagen.html\'">📝 Brief</button>';
  document.getElementById('ag-actions').innerHTML=agActions;

  // Timeline
  renderTimeline(status,f);
  // Progressive Disclosure: nur phasenrelevante Sections offen
  applyPhaseVisibility(status);

  // Dokumente
  renderDokumente(f);

  // KI-Entwurf
  if(f.KI_Entwurf&&f.KI_Entwurf.trim()){
    document.getElementById('sec-entwurf').style.display='block';
    document.getElementById('entwurf-preview').textContent=f.KI_Entwurf.slice(0,1500)+(f.KI_Entwurf.length>1500?'\n\n[…Vorschau gekürzt. Volltext in Freigabe-Ansicht.]':'');
  }

  // Notizen aus localStorage
  var notizKey='prova_notiz_'+recordId;
  var notiz=localStorage.getItem(notizKey)||f.Notiz||'';
  document.getElementById('notiz-input').value=notiz;

  // Schnellaktionen
  renderSchnellaktionen(status,f,az);

  // Anzeigen
  document.getElementById('loading-state').style.display='none';
  document.getElementById('akte-content').style.display='block';
}

/* ─── TIMELINE ─── */
function renderTimeline(status,f){
  var schritte=[
    {key:'erfassung',label:'Fallerfassung',meta:'Stammdaten + Fotos',done:true},
    {key:'ki',label:'KI-Analyse',meta:f.KI_Entwurf?'Entwurf vorhanden':'Noch nicht gestartet',done:!!f.KI_Entwurf},
    {key:'stellungnahme',label:'§6 Stellungnahme',meta:localStorage.getItem('prova_stellungnahme_done')==='true'?'Fertiggestellt':'Ausstehend',done:localStorage.getItem('prova_stellungnahme_done')==='true'},
    {key:'freigabe',label:'Freigabe',meta:status==='Freigegeben'||status==='Exportiert'?'Freigegeben':'Ausstehend',done:status==='Freigegeben'||status==='Exportiert'},
    {key:'pdf',label:'PDF & Versand',meta:status==='Exportiert'?'PDF erstellt und versendet':'Ausstehend',done:status==='Exportiert'}
  ];
  var aktivIndex=schritte.findIndex(function(s){return !s.done;});
  document.getElementById('timeline-body').innerHTML=schritte.map(function(s,i){
    var cls=s.done?'done':(i===aktivIndex?'active':'pending');
    var icon=s.done?'✓':(i===aktivIndex?'→':'○');
    return '<div class="tl-item">'
      +'<div class="tl-dot '+cls+'">'+icon+'</div>'
      +'<div class="tl-content">'
      +'<div class="tl-title">'+s.label+'</div>'
      +'<div class="tl-meta">'+s.meta+'</div>'
      +'</div>'
      +'</div>';
  }).join('');
}

/* ─── DOKUMENTE ─── */
function renderDokumente(f){
  var list=[];
  if(f.PDF_URL||f.pdf_url){
    list.push({icon:'📄',name:'Gutachten PDF',meta:'Erstellt nach Freigabe',url:f.PDF_URL||f.pdf_url,typ:'pdf'});
  }
  if(f.Foto_Anzahl&&f.Foto_Anzahl>0){
    list.push({icon:'📷',name:f.Foto_Anzahl+' Fotos',meta:'Bilddokumentation',url:null,typ:'foto'});
  }
  if(f.Messwerte){
    list.push({icon:'📐',name:'Messwerte',meta:'Vor-Ort-Messungen',url:null,typ:'mess'});
  }
  // Lokale Uploads laden
  var az = f.Aktenzeichen || f.AZ || '';
  var uploads = JSON.parse(localStorage.getItem('prova_akte_docs_' + az) || '[]');
  uploads.forEach(function(u) {
    list.push({icon:u.icon||'📎',name:u.name,meta:u.typ_label + (u.datum ? ' · ' + u.datum : ''),url:u.dataUrl||null,typ:'upload'});
  });

  var el=document.getElementById('dok-list');
  if(list.length===0){
    el.innerHTML='<div class="dok-empty">📂 Noch keine Dokumente.<br>Laden Sie Beweisbeschlüsse, Stellungnahmen oder andere PDFs hoch.</div>';
    return;
  }
  el.innerHTML=list.map(function(d){
    var actions=d.url?'<button class="dok-btn" onclick="window.open(\''+d.url+'\',\'_blank\')">⬇ Download</button>':'';
    var caption=d.beschriftung?'<div style="font-size:10px;color:var(--text3);margin-top:2px;font-style:italic;">'+esc(d.beschriftung)+'</div>':'';
    return '<div class="dok-item"><div class="dok-icon">'+d.icon+'</div><div style="flex:1;"><div class="dok-name">'+esc(d.name)+'</div><div class="dok-meta">'+esc(d.meta)+'</div>'+caption+'</div><div class="dok-actions">'+actions+'</div></div>';
  }).join('');
}

/* ─── DOKUMENT-UPLOAD + KI-KLASSIFIZIERUNG ─── */
var _erkFrist = null;
async function handleDokUpload(files) {
  if (!files || !files.length) return;
  var statusEl = document.getElementById('dok-upload-status');
  var az = document.getElementById('akte-az')?.textContent || localStorage.getItem('prova_letztes_az') || '';
  var uploads = JSON.parse(localStorage.getItem('prova_akte_docs_' + az) || '[]');

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    statusEl.style.display = 'block';
    statusEl.textContent = '⏳ KI analysiert: ' + file.name + '…';

    var typLabel = 'Dokument';
    var icon = '📎';
    var frist = null;
    var zusammenfassung = '';

    // KI-Klassifizierung versuchen (nur für PDFs)
    if (file.type === 'application/pdf') {
      try {
        var b64 = await new Promise(function(res, rej) {
          var r = new FileReader();
          r.onload = function() { res(r.result.split(',')[1]); };
          r.onerror = rej;
          r.readAsDataURL(file);
        });

        var kiRes = await fetch('/.netlify/functions/ki-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aufgabe: 'pdf_extraktion', pdf_base64: b64, dateiname: file.name })
        });

        if (kiRes.ok) {
          var kiData = await kiRes.json();
          // Typ erkennen aus dem Inhalt
          if (kiData.beweisfragen && kiData.beweisfragen.length > 0) { typLabel = 'Beweisbeschluss'; icon = '⚖️'; }
          else if (file.name.toLowerCase().indexOf('stellungnahme') >= 0) { typLabel = 'Stellungnahme'; icon = '💬'; }
          else if (file.name.toLowerCase().indexOf('rechnung') >= 0) { typLabel = 'Rechnung'; icon = '🧾'; }
          else if (kiData.frist) { typLabel = 'Gerichtsverfügung'; icon = '📋'; }
          else { typLabel = 'Schriftstück'; icon = '📄'; }

          if (kiData.frist) {
            frist = kiData.frist;
            _erkFrist = frist;
          }
        }
      } catch (e) {
        console.log('KI-Klassifizierung fehlgeschlagen:', e);
      }
    } else if (file.type.startsWith('image/')) {
      // ── Foto-Captioning via KI ──
      icon = '📷';
      typLabel = 'Schadensfoto';
      statusEl.textContent = '📷 KI beschriftet Foto: ' + file.name + '…';
      try {
        var imgB64 = await new Promise(function(res, rej) {
          var r = new FileReader();
          r.onload = function() { res(r.result.split(',')[1]); };
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        var capRes = await fetch('/.netlify/functions/foto-captioning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imgB64,
            mediaType: file.type,
            aktenzeichen: az,
            schadensart: sessionStorage.getItem('prova_current_schadenart') || localStorage.getItem('prova_schadenart') || ''
          })
        });
        if (capRes.ok) {
          var capData = await capRes.json();
          if (capData.success && capData.metadata) {
            var m = capData.metadata;
            zusammenfassung = m.beschriftung || '';
            if (m.bauteil) zusammenfassung += (zusammenfassung ? ' · ' : '') + m.bauteil;
            if (m.raum)    zusammenfassung += ' · ' + m.raum;
            var sgMap = { gering: '🟡', mittel: '🟠', schwer: '🔴', kritisch: '🆘' };
            if (m.schweregrad && sgMap[m.schweregrad]) icon = sgMap[m.schweregrad] + ' 📷';
            typLabel = 'Schadensfoto' + (m.schweregrad ? ' (' + m.schweregrad + ')' : '');
          }
        }
      } catch (e) {
        console.log('Foto-Captioning fehlgeschlagen:', e);
      }
    } else {
      icon = '📎';
      typLabel = 'Dokument';
    }

    uploads.push({
      name: file.name,
      typ_label: typLabel,
      icon: icon,
      datum: new Date().toLocaleDateString('de-DE'),
      size: Math.round(file.size / 1024) + ' KB',
      frist: frist,
      beschriftung: zusammenfassung || undefined
    });

    localStorage.setItem('prova_akte_docs_' + az, JSON.stringify(uploads));

    // Frist-Banner zeigen
    if (frist) {
      document.getElementById('dok-frist-banner').style.display = 'block';
      document.getElementById('dok-frist-text').textContent = frist + ' — Aus: ' + file.name;
    }
  }

  statusEl.style.display = 'none';
  // Re-render mit aktuellem Fall
  if (window._currentFall) renderDokumente(window._currentFall);
  else location.reload();
}

function uebernimmFrist() {
  if (!_erkFrist) return;
  // In localStorage speichern (Fristenverwaltung liest das)
  var az = document.getElementById('akte-az')?.textContent || '';
  var cache = JSON.parse(localStorage.getItem('prova_faelle_cache') || '{}');
  if (cache[az]) {
    cache[az].fristdatum = _erkFrist;
    localStorage.setItem('prova_faelle_cache', JSON.stringify(cache));
  }
  document.getElementById('dok-frist-banner').style.display = 'none';
  if (typeof showToast === 'function') showToast('Frist ' + _erkFrist + ' im Kalender eingetragen ✓', 'success');
  else alert('Frist ' + _erkFrist + ' eingetragen.');
}

/* ─── SCHNELLAKTIONEN ─── */
function renderSchnellaktionen(status,f,az){
  var actions=[];
  if(status==='In Bearbeitung'||status==='Auftrag erhalten'){
    actions.push({icon:'📝',bg:'rgba(79,142,247,.1)',label:'Gutachten bearbeiten',sub:'App-Starter öffnen',action:"oeffneGutachten()"});
  }
  if(f.KI_Entwurf&&(status==='Entwurf'||status==='In Bearbeitung')){
    actions.push({icon:'📋',bg:'rgba(139,92,246,.1)',label:'§6 Stellungnahme',sub:'Persönliches Fachurteil verfassen',action:"oeffneStellung()"});
  }
  if(f.KI_Entwurf&&(status==='Entwurf'||status==='In Bearbeitung')){
    actions.push({icon:'✅',bg:'rgba(16,185,129,.1)',label:'Zur Freigabe',sub:'Gutachten prüfen und freigeben',action:"oeffneFreigabe()"});
  }
  actions.push({icon:'💶',bg:'rgba(245,158,11,.1)',label:'Rechnung erstellen',sub:'JVEG oder Pauschal',action:"window.location.href='rechnungen.html'"});
  actions.push({icon:'✉️',bg:'rgba(139,92,246,.1)',label:'Brief schreiben',sub:'Aus Vorlage mit Fall-Daten',action:"window.location.href='briefvorlagen.html'"});
  actions.push({icon:'📅',bg:'rgba(79,142,247,.08)',label:'Termin anlegen',sub:'Ortstermin, Frist etc.',action:"window.location.href='termine.html'"});

  document.getElementById('quick-actions').innerHTML=actions.map(function(a){
    return '<div class="qa-btn" onclick="'+a.action+'">'
      +'<div class="qa-icon" style="background:'+a.bg+'">'+a.icon+'</div>'
      +'<div><div class="qa-label">'+a.label+'</div><div class="qa-sub">'+a.sub+'</div></div>'
      +'<div class="qa-arrow">›</div>'
      +'</div>';
  }).join('');
}

/* ─── TERMINE ─── */
async function ladeTermine(){
  if(!currentFields.Aktenzeichen)return;
  try{
    var az=currentFields.Aktenzeichen;
    var filter='{aktenzeichen}="'+az.replace(/"/g,'\\"')+'"';
    var path='/v0/'+AT_BASE+'/'+AT_TERMINE+'?filterByFormula='+encodeURIComponent(filter)+'&maxRecords=10';
    var res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:path})});
    var data=await res.json();
    var termine=(data.records||[]).map(function(r){return r.fields;});
    renderFristen(termine);
  }catch(e){}
}

function renderFristen(termine){
  var el=document.getElementById('fristen-list');
  if(!termine||termine.length===0){el.textContent='Keine Termine verknüpft.';return;}
  el.innerHTML=termine.slice(0,4).map(function(t){
    var d=t.termin_datum?new Date(t.termin_datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'';
    var typ=t.termin_typ||'Termin';
    var typColor=typ==='Frist'?'var(--danger)':typ==='Gerichtstermin'?'var(--purple)':'var(--accent)';
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">'
      +'<div style="width:6px;height:6px;border-radius:50%;background:'+typColor+';flex-shrink:0;"></div>'
      +'<div style="flex:1;font-size:11px;color:var(--text2);">'+esc(t.titel||typ)+'</div>'
      +'<div style="font-size:10px;color:var(--text3);">'+d+'</div>'
      +'</div>';
  }).join('');
}

/* ─── STATUS AKTUALISIEREN ─── */
window.aktualisiereStatus=async function(){
  var newStatus=document.getElementById('status-select').value;
  var stClass=statusClass(newStatus);
  document.getElementById('status-display').innerHTML='<span class="status-badge '+stClass+'">'+esc(newStatus)+'</span>';
  document.getElementById('status-hint').textContent=statusHint(newStatus);
  if(!recordId||!recordId.startsWith('rec'))return;
  try{
    await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'PATCH',path:'/v0/'+AT_BASE+'/'+AT_FAELLE+'/'+recordId,payload:{fields:{Status:newStatus}}})});
    zeigToast('Status aktualisiert: '+newStatus);
    // Cache invalidieren
    localStorage.removeItem('prova_archiv_cache_v2');
  }catch(e){zeigToast('Status konnte nicht gespeichert werden','err');}
};

/* ─── NAVIGATIONEN ─── */
window.oeffneGutachten=function(){
  var appUrl=paket==='Team'?'app.html':paket==='Solo'?'app.html':'app.html';
  window.location.href=appUrl;
};
window.oeffneFreigabe=function(){
  if(recordId)sessionStorage.setItem('prova_record_id',recordId);
  window.location.href='freigabe.html';
};

/* ─── SECTION TOGGLE ─── */
window.toggleSection=function(id){
  var el=document.getElementById(id);
  if(el){
    el.classList.toggle('collapsed');
    // User-Präferenz merken
    var isOpen = !el.classList.contains('collapsed');
    sessionStorage.setItem('prova_sec_' + id, isOpen ? '1' : '0');
  }
};

/* ─── NOTIZ SPEICHERN ─── */
window.speichereNotiz=function(){
  var text=document.getElementById('notiz-input').value.trim();
  localStorage.setItem('prova_notiz_'+recordId,text);
  zeigToast('Notiz gespeichert ✓');
};

/* ─── KI-ENTWURF KOPIEREN ─── */
window.kopiereEntwurf=function(){
  var text=currentFields.KI_Entwurf||'';
  navigator.clipboard&&navigator.clipboard.writeText(text).then(function(){zeigToast('Entwurf kopiert ✓');});
};

/* ─── NOT FOUND ─── */
function zeigNotFound(){
  document.getElementById('loading-state').style.display='none';
  document.getElementById('not-found').style.display='block';
}

/* ─── HELPER ─── */
function statusClass(st){
  var s=(st||'').toLowerCase();
  if(s.includes('bearbeitung'))return'st-bearb';
  if(s.includes('entwurf'))return'st-entwurf';
  if(s.includes('freig'))return'st-freig';
  if(s.includes('export'))return'st-export';
  return'st-archiv';
}
function statusHint(st){
  var hints={'In Bearbeitung':'Gutachten wird bearbeitet — KI-Analyse ausstehend oder laufend.','Entwurf':'KI-Entwurf fertig — jetzt prüfen und §6 Stellungnahme verfassen.','Freigegeben':'Gutachten freigegeben — PDF wird erstellt und versendet.','Exportiert':'PDF erstellt und an Auftraggeber versendet.','Archiviert':'Fall archiviert — kein weiterer Handlungsbedarf.'};
  return hints[st]||'';
}
function formatDatum(d){try{return new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return d||'—';}}
function setText(id,v){var el=document.getElementById(id);if(el)el.textContent=v||'—';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
window.zeigToast=function(msg,typ){
  var t=document.getElementById('toast');
  t.textContent=msg;t.className='toast'+(typ==='err'?' err':'');
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');},3000);
};

/* ─── INIT ─── */
ladeRecord();

})();

window.oeffneStellung = function() {
  // Fall-Daten für gate.html in sessionStorage schreiben
  var f = currentFields;
  var az = f.Aktenzeichen || '';
  var sa = f.Schadenart || f.schadenart || '';
  var obj = (f.Strasse||f.strasse||'') + (f.PLZ||f.plz ? ', '+(f.PLZ||f.plz)+' '+(f.Ort||f.ort||'') : (f.Ort||f.ort ? ', '+(f.Ort||f.ort) : ''));
  if(az) sessionStorage.setItem('prova_current_az', az);
  if(sa) sessionStorage.setItem('prova_current_schadenart', sa);
  if(obj.trim()) sessionStorage.setItem('prova_current_objekt', obj.trim());
  if(baujahr) sessionStorage.setItem('prova_current_baujahr', baujahr);
  // record_id bleibt aus sessionStorage (bereits gesetzt)
  // az als URL-Parameter damit stellungnahme.html es auch ohne sessionStorage hat
  window.location.href = az ? 'stellungnahme.html?az=' + encodeURIComponent(az) : 'stellungnahme.html';
};

/* ─────────────────────────────────────────── */

/* ================================================================
   PROVA Fall-Kontext-System v1.0
   Zeigt auf jeder Workflow/Werkzeug-Seite den aktiven Fall-Kontext
   und führt den SV zum nächsten Schritt.
   
   Aktiviert sich automatisch wenn ein aktiver Fall vorhanden ist.
   Kein Eingriff in bestehende Seiten-Logik.
================================================================ */

(function() {
'use strict';

// ── WORKFLOW-KONFIGURATION ──────────────────────────────────────────────
var WORKFLOW = [
  {
    schritt: 1,
    name: 'Fall anlegen',
    seite: 'app.html',
    icon: '📋',
    farbe: '#4f8ef7'
  },
  {
    schritt: 2,
    name: 'Diktat & Fotos',
    seite: 'app.html',
    icon: '🎙️',
    farbe: '#4f8ef7'
  },
  {
    schritt: 3,
    name: 'KI-Analyse',
    seite: 'app.html',
    icon: '🤖',
    farbe: '#6366f1'
  },
  {
    schritt: 4,
    name: '§6 Fachurteil',
    seite: 'stellungnahme.html',
    icon: '⚖️',
    farbe: '#f59e0b'
  },
  {
    schritt: 5,
    name: 'Freigabe',
    seite: 'freigabe.html',
    icon: '✅',
    farbe: '#10b981'
  },
  {
    schritt: 6,
    name: 'Rechnung',
    seite: 'rechnungen.html',
    icon: '💶',
    farbe: '#10b981'
  },
  {
    schritt: 7,
    name: 'Abschluss',
    seite: 'archiv.html',
    icon: '📁',
    farbe: '#6b7280'
  }
];

// ── WERKZEUGE (kontextuell, kein fester Workflow-Schritt) ───────────────
var WERKZEUGE = {
  'normen.html':         { name: 'Normendatenbank',    icon: '📚', zurück: true },
  'positionen.html':     { name: 'Positionsdatenbank', icon: '📦', zurück: true },
  'textbausteine.html':  { name: 'Textbausteine',      icon: '✏️',  zurück: true },
  'jveg.html':           { name: 'JVEG-Rechner',       icon: '⚖️',  zurück: false },
  'kostenermittlung.html':{ name: 'Kosten & Aufmaß',   icon: '📐', zurück: true },
  'briefvorlagen.html':  { name: 'Briefvorlagen',      icon: '✉️',  zurück: false }
};

// ── SEITE BESTIMMEN ─────────────────────────────────────────────────────
var currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
if (currentPage === '') currentPage = 'dashboard.html';

// ── AKTUELLEN SCHRITT BESTIMMEN ─────────────────────────────────────────
function getCurrentSchritt() {
  var basePage = currentPage.split('#')[0];
  for (var i = 0; i < WORKFLOW.length; i++) {
    if (WORKFLOW[i].seite.split('#')[0] === basePage) {
      return WORKFLOW[i].schritt;
    }
  }
  return null;
}

// ── FALL-KONTEXT LADEN ──────────────────────────────────────────────────
function ladeFallKontext() {
  // Versuche aus URL-Parameter zu laden
  var params = new URLSearchParams(window.location.search);
  var urlAz   = params.get('az') || params.get('fall') || params.get('aktenzeichen');
  
  // Dann aus sessionStorage/localStorage
  var az         = urlAz
                 || sessionStorage.getItem('prova_current_az')
                 || localStorage.getItem('prova_letztes_az')
                 || '';
  
  var schadenart = sessionStorage.getItem('prova_current_schadenart')
                 || localStorage.getItem('prova_schadenart')
                 || '';
  
  var adresse    = sessionStorage.getItem('prova_current_objekt')
                 || localStorage.getItem('prova_adresse')
                 || '';
  
  var recordId   = sessionStorage.getItem('prova_record_id')
                 || sessionStorage.getItem('prova_current_record_id')
                 || '';
  
  if (!az) return null;
  
  return { az: az, schadenart: schadenart, adresse: adresse, recordId: recordId };
}

// ── NÄCHSTER SCHRITT ─────────────────────────────────────────────────────
function naechsterSchritt(aktuellerSchritt) {
  if (!aktuellerSchritt) return null;
  for (var i = 0; i < WORKFLOW.length; i++) {
    if (WORKFLOW[i].schritt === aktuellerSchritt + 1) {
      return WORKFLOW[i];
    }
  }
  return null;
}

// ── BANNER HTML BAUEN ───────────────────────────────────────────────────
function baueBanner(kontext, aktuellerSchritt, istWerkzeug) {
  var az        = kontext.az;
  var sa        = kontext.schadenart;
  var adr       = kontext.adresse;
  var recordId  = kontext.recordId;
  
  // Schadensart Farbe
  var saFarben = {
    'Schimmelbefall': '#10b981',
    'Wasserschaden':  '#3b82f6',
    'Brandschaden':   '#ef4444',
    'Sturmschaden':   '#8b5cf6',
    'Baumängel':      '#f59e0b',
    'Sonstiger Schaden': '#6b7280'
  };
  var saFarbe = saFarben[sa] || '#4f8ef7';
  
  // Akte-Link bauen
  var akteLink = recordId
    ? 'akte.html?id=' + recordId
    : az
      ? 'akte.html?az=' + encodeURIComponent(az)
      : 'archiv.html';
  
  // Nächster-Schritt Button
  var naechsterBtn = '';
  if (!istWerkzeug && aktuellerSchritt) {
    var naechster = naechsterSchritt(aktuellerSchritt);
    if (naechster) {
      var naechsterUrl = naechster.seite;
      // AZ mitgeben wenn relevant
      if (naechster.seite.indexOf('stellungnahme') >= 0 && az) {
        naechsterUrl = naechster.seite + '?az=' + encodeURIComponent(az);
      } else if (naechster.seite.indexOf('freigabe') >= 0 && recordId) {
        naechsterUrl = naechster.seite + '?id=' + recordId;
      } else if (naechster.seite.indexOf('rechnungen') >= 0 && az) {
        naechsterUrl = naechster.seite + '?az=' + encodeURIComponent(az);
      } else if (naechster.seite.indexOf('archiv') >= 0) {
        naechsterUrl = naechster.seite;
      }
      
      naechsterBtn = '<a href="' + naechsterUrl + '" style="'
        + 'display:inline-flex;align-items:center;gap:5px;padding:4px 12px;'
        + 'background:' + naechster.farbe + '22;border:1px solid ' + naechster.farbe + '44;'
        + 'border-radius:999px;font-size:11px;font-weight:700;color:' + naechster.farbe + ';'
        + 'text-decoration:none;white-space:nowrap;transition:all .15s;'
        + '" data-bg="' + naechster.farbe + '22" data-bgh="' + naechster.farbe + '33"'
        + ' onmouseenter="this.style.background=this.dataset.bgh" onmouseleave="this.style.background=this.dataset.bg">'
        + naechster.icon + ' ' + naechster.name + ' →'
        + '</a>';
    }
  }
  
  // Zurück-zu-Fall Button (für Werkzeuge)
  var zurueckBtn = '';
  if (istWerkzeug && WERKZEUGE[currentPage] && WERKZEUGE[currentPage].zurück) {
    zurueckBtn = '<a href="' + akteLink + '" style="'
      + 'display:inline-flex;align-items:center;gap:5px;padding:4px 10px;'
      + 'background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.25);'
      + 'border-radius:999px;font-size:11px;font-weight:600;color:#4f8ef7;'
      + 'text-decoration:none;white-space:nowrap;'
      + '">← Zurück zu ' + az + '</a>';
  }
  
  // Akte-Link in AZ
  var azHtml = '<a href="' + akteLink + '" style="'
    + 'font-weight:800;font-size:13px;color:var(--text, #e2e8f0);'
    + 'text-decoration:none;letter-spacing:.02em;'
    + 'border-bottom:1px solid rgba(255,255,255,.2);'
    + '" title="Akte öffnen">' + az + '</a>';
  
  // Schrittanzeige
  var schrittHtml = '';
  if (aktuellerSchritt && !istWerkzeug) {
    schrittHtml = '<span style="font-size:10px;color:rgba(255,255,255,.4);white-space:nowrap;">'
      + 'Schritt ' + aktuellerSchritt + ' von 7'
      + '</span>';
    
    // Mini-Progress (7 Punkte)
    var dots = '';
    for (var s = 1; s <= 7; s++) {
      var dotColor = s < aktuellerSchritt
        ? '#10b981'
        : s === aktuellerSchritt
          ? '#4f8ef7'
          : 'rgba(255,255,255,.15)';
      dots += '<span style="width:6px;height:6px;border-radius:50%;background:' + dotColor
            + ';display:inline-block;' + (s < 7 ? 'margin-right:3px;' : '') + '"></span>';
    }
    schrittHtml += '<span style="display:inline-flex;align-items:center;margin-left:6px;">' + dots + '</span>';
  }
  
  // Banner HTML
  var html = '<div id="prova-fall-kontext-banner" style="'
    + 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;'
    + 'padding:7px 16px 7px 20px;'
    + 'background:linear-gradient(90deg,rgba(79,142,247,.12) 0%,rgba(10,15,28,.0) 100%);'
    + 'border-bottom:1px solid rgba(79,142,247,.15);'
    + 'font-family:inherit;position:relative;z-index:10;'
    + 'min-height:36px;'
    + '">'
    
    // AZ + Schadenart
    + '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">'
    + '<span style="width:8px;height:8px;border-radius:50%;background:' + saFarbe + ';flex-shrink:0;"></span>'
    + azHtml;
    
  if (sa) {
    html += '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:' + saFarbe + '18;color:' + saFarbe + ';font-weight:600;white-space:nowrap;">' + sa + '</span>';
  }
  
  if (adr && adr.length > 2 && adr !== '—') {
    html += '<span style="font-size:11px;color:rgba(255,255,255,.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;" title="' + adr + '">'
          + adr.split(',')[0] // nur Straße, kürzer
          + '</span>';
  }
  
  html += '</div>'; // end flex-1
  
  // Mitte: Schritt-Anzeige
  if (schrittHtml) {
    html += '<div style="display:flex;align-items:center;gap:4px;">' + schrittHtml + '</div>';
  }
  
  // Rechts: Werkzeug-Zurück oder Nächster-Schritt
  if (zurueckBtn) {
    html += '<div>' + zurueckBtn + '</div>';
  }
  if (naechsterBtn) {
    html += '<div>' + naechsterBtn + '</div>';
  }
  
  html += '</div>'; // end banner
  
  return html;
}

// ── BANNER EINFÜGEN ─────────────────────────────────────────────────────
function einfuegenBanner() {
  // Nicht auf Dashboard, Zentrale, Login, Onboarding
  var ausnahmen = ['dashboard.html', 'archiv.html', 'app-login.html', 
                   'onboarding.html', 'onboarding-schnellstart.html',
                   'index.html', 'impressum.html', 'datenschutz.html',
                   'agb.html', 'avv.html', 'termine.html', 'kontakte.html',
                   'einstellungen.html'];
  
  if (ausnahmen.indexOf(currentPage) >= 0) return;
  
  var kontext = ladeFallKontext();
  if (!kontext) return; // Kein aktiver Fall — kein Banner
  
  var aktuellerSchritt = getCurrentSchritt();
  var istWerkzeug = !!WERKZEUGE[currentPage];
  
  var bannerHtml = baueBanner(kontext, aktuellerSchritt, istWerkzeug);
  
  // Einfüge-Strategie: nach <header class="topbar"> oder nach <div class="topbar">
  // Suche den richtigen Einfügepunkt
  var insertAfter = null;
  
  // Strategie 1: Nach topbar Header
  var topbar = document.querySelector('header.topbar, div.topbar, .topbar');
  if (topbar) {
    insertAfter = topbar;
  }
  
  // Strategie 2: Als erstes Child von main oder page-content
  if (!insertAfter) {
    insertAfter = document.querySelector('main, .page-content, .main, .page');
    if (insertAfter) {
      insertAfter.insertAdjacentHTML('afterbegin', bannerHtml);
      return;
    }
  }
  
  if (insertAfter) {
    insertAfter.insertAdjacentHTML('afterend', bannerHtml);
  }
}

// ── INIT ────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', einfuegenBanner);
} else {
  einfuegenBanner();
}

// ── PUBLIC API ──────────────────────────────────────────────────────────
window.PROVA_KONTEXT = {
  // Erlaubt anderen Scripts den Fall-Kontext zu setzen
  setFall: function(az, schadenart, adresse, recordId) {
    if (az) localStorage.setItem('prova_letztes_az', az);
    if (schadenart) localStorage.setItem('prova_schadenart', schadenart);
    if (adresse) localStorage.setItem('prova_adresse', adresse);
    if (recordId) sessionStorage.setItem('prova_record_id', recordId);
    // Banner aktualisieren
    var existing = document.getElementById('prova-fall-kontext-banner');
    if (existing) existing.remove();
    einfuegenBanner();
  },
  // Fall-Kontext löschen (nach Archivierung)
  clearFall: function() {
    localStorage.removeItem('prova_letztes_az');
    localStorage.removeItem('prova_schadenart');
    localStorage.removeItem('prova_adresse');
    sessionStorage.removeItem('prova_record_id');
    sessionStorage.removeItem('prova_current_az');
    sessionStorage.removeItem('prova_current_schadenart');
    var existing = document.getElementById('prova-fall-kontext-banner');
    if (existing) existing.remove();
  }
};

})();