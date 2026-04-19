/* PROVA briefvorlagen-logic.js — Briefvorlagen Router, KI, Vorlagen */


(function(){
'use strict';

var WEBHOOK='https://hook.eu1.make.com/bslfuqmlud1vo8qems5ccn5z5f2eq4dl';
var AT_BASE='appJ7bLlAHZoxENWE';
var AT_FAELLE='tblSxV8bsXwd1pwa0';

if(!localStorage.getItem('prova_user')){window.location.href='app-login.html';return;}

/* ── DATEN ── */
var CATS=[
  {id:'angebote',   name:'Angebote & Aufträge',  col:'#4f8ef7'},
  {id:'ortstermin', name:'Ortstermin',            col:'#f59e0b'},
  {id:'versicherung',name:'Versicherung',         col:'#10b981'},
  {id:'gericht',    name:'Gericht & ZPO',         col:'#ef4444'},
  {id:'intern',     name:'Intern & Dokumente',    col:'#8b5cf6'},
];
var TMPLS=[
  {id:'A-01',name:'Angebot Gutachten',            desc:'Angebot für ein Gutachten an Auftraggeber.',        cat:'angebote',   tier:'Solo',icon:'📄'},
  {id:'A-02',name:'Auftragsbestätigung',          desc:'Auftragsbestätigung an den Auftraggeber.',          cat:'angebote',   tier:'Solo',icon:'✅'},
  {id:'A-03',name:'Honorarvereinbarung',          desc:'Vereinbarung zum Honorar mit dem Auftraggeber.',    cat:'angebote',   tier:'Solo',icon:'💰'},
  {id:'O-01',name:'Einladung Ortstermin',         desc:'Einladung zu einem Ortstermin (Besichtigung).',     cat:'ortstermin', tier:'Solo',icon:'📅'},
  {id:'O-02',name:'Einladung Ortstermin (Gericht)',desc:'Gerichtlicher Ortstermin.',                        cat:'ortstermin', tier:'Solo',icon:'⚖️'},
  {id:'O-03',name:'Ortstermin-Protokoll',         desc:'Protokoll zum durchgeführten Ortstermin.',          cat:'ortstermin', tier:'Solo',icon:'📝'},
  {id:'O-04',name:'Umladebrief Ortstermin',       desc:'Verlegung eines Ortstermins mit neuem Datum.',      cat:'ortstermin', tier:'Solo',icon:'🔄'},
  {id:'V-01',name:'Erstbericht Versicherung',     desc:'Erstbericht an die Versicherung.',                  cat:'versicherung',tier:'Solo',icon:'📋'},
  {id:'V-02',name:'Deckungsanfrage',              desc:'Anfrage zur Deckung an die Versicherung.',          cat:'versicherung',tier:'Solo',icon:'📄'},
  {id:'V-03',name:'Kostenvoranschlag Sanierung',  desc:'Kostenvoranschlag für Sanierungsmaßnahmen.',        cat:'versicherung',tier:'Solo',icon:'📊'},
  {id:'V-04',name:'Nachforderung Unterlagen',     desc:'Nachforderung von Unterlagen.',                     cat:'versicherung',tier:'Solo',icon:'📎'},
  {id:'V-05',name:'Abschlussbericht Versicherung',desc:'Abschlussbericht an die Versicherung.',             cat:'versicherung',tier:'Solo',icon:'📑'},
  {id:'G-07',name:'Beauftragungsbestätigung Gericht',desc:'Pflichtanzeige nach §407a Abs. 1 ZPO.',          cat:'gericht',    tier:'Solo',icon:'⚖️'},
  {id:'G-08',name:'Fristverlängerungsantrag',     desc:'Antrag auf Fristverlängerung §411 Abs. 1 ZPO.',     cat:'gericht',    tier:'Solo',icon:'⏳'},
  {id:'G-09',name:'Ergänzungsfragen-Antwort',     desc:'Beantwortung von Ergänzungsfragen §411 ZPO.',       cat:'gericht',    tier:'Solo',icon:'📝'},
  {id:'G-10',name:'Kostenrahmenerhöhung',         desc:'Hinweis auf Kostenüberschreitung §407a Abs. 3.',    cat:'gericht',    tier:'Solo',icon:'💶'},
  {id:'I-01',name:'Messprotokoll Feuchte',        desc:'Protokoll für Feuchtemessungen.',                   cat:'intern',     tier:'Solo',icon:'📐'},
  {id:'I-02',name:'Checkliste Wasserschaden',     desc:'Checkliste bei Wasserschaden.',                     cat:'intern',     tier:'Solo',icon:'📋'},
  {id:'I-03',name:'Checkliste Sturmschaden',      desc:'Checkliste bei Sturmschaden.',                      cat:'intern',     tier:'Solo',icon:'📋'},
  {id:'I-04',name:'Einverständnis DSGVO',         desc:'Einverständniserklärung zur Datenverarbeitung.',    cat:'intern',     tier:'Solo',icon:'🔒'},
  {id:'I-06',name:'Aktennotiz',                   desc:'Kurznotiz für die Akte.',                           cat:'intern',     tier:'Solo',icon:'📝'},
  {id:'I-07',name:'Ortstermin-Arbeitsblatt',      desc:'Druckbares Formular für Vor-Ort-Aufnahme.',         cat:'intern',     tier:'Solo',icon:'📋'},
  {id:'I-08',name:'Messprotokoll Risse',          desc:'Rissaufnahme nach DIN 52460.',                      cat:'intern',     tier:'Solo',icon:'📐'},
  {id:'I-09',name:'Checkliste Brandschaden',      desc:'Vollständige Brandschadenaufnahme.',                cat:'intern',     tier:'Solo',icon:'🔥'},
  {id:'A-06',name:'Gerichtsgutachten §407a',      desc:'Gerichtsgutachten inkl. §407a ZPO — Team.',         cat:'gericht',    tier:'Team',icon:'⚖️'},
  {id:'B-02',name:'Beweissicherung §407a',        desc:'Beweissicherung mit §407a-Erklärung — Team.',       cat:'intern',     tier:'Team',icon:'📑'},
];

/* ── STATE ── */
var _cat='all', _q='', _tpl=null, _fall=null, _felder={}, _step=1, _ki=false;
var _currentTab='edit';  /* Session 30: aktives Tab in Detail-Drawer */
var _toastTimer;

/* ── RENDER GRID ── */
function render(){
  var c=document.getElementById('bv-container');
  c.innerHTML='';
  var vis=0;
  CATS.forEach(function(cat){
    if(_cat!=='all'&&_cat!==cat.id)return;
    var items=TMPLS.filter(function(t){
      if(t.cat!==cat.id)return false;
      if(_q&&!t.name.toLowerCase().includes(_q)&&!t.desc.toLowerCase().includes(_q))return false;
      return true;
    });
    if(!items.length)return;
    vis+=items.length;
    var sec=document.createElement('div');
    sec.className='bv-cat';
    sec.innerHTML='<div class="bv-cat-head">'
      +'<div class="bv-cat-bar" style="background:'+cat.col+'"></div>'
      +'<div class="bv-cat-name">'+cat.name+'</div>'
      +'<div class="bv-cat-n">'+items.length+'</div>'
      +'</div>'
      +'<div class="bv-grid">'+items.map(function(t){
        return '<div class="tc" id="tc-'+t.id+'">'
          +'<div class="tc-top">'
          +'<div class="tc-icon">'+t.icon+'</div>'
          +'<div class="tc-badges">'
          +'<div class="tc-id">'+t.id+'</div>'
          +'<div class="tc-tier tc-tier-'+(t.tier==='Team'?'team':'solo')+'">'+t.tier+'</div>'
          +'</div></div>'
          +'<div class="tc-name">'+t.name+'</div>'
          +'<div class="tc-desc">'+t.desc+'</div>'
          +'<div class="tc-btns">'
          +'<button class="tc-btn-v" id="btnv-'+t.id+'" onclick="bvVerwenden(\''+t.id+'\',event)" title="Vorlage ausfüllen und versenden">'
          +'<span>Verwenden</span><span style="opacity:.7">→</span>'
          +'</button>'
          +'<button class="tc-btn-ki" id="btnki-'+t.id+'" onclick="bvKI(\''+t.id+'\',event)" title="KI schreibt den Brief automatisch">'
          +'<span>✨</span><span>KI</span>'
          +'</button>'
          +'</div></div>';
      }).join('')+'</div>';
    c.appendChild(sec);
  });
  if(!vis){
    c.innerHTML='<div class="bv-empty">'
      +'<div class="bv-empty-icon">🔍</div>'
      +'<div class="bv-empty-title">Keine Vorlagen gefunden</div>'
      +'<div class="bv-empty-sub">Anderen Suchbegriff oder Filter versuchen</div>'
      +'</div>';
  }
}

// Initial-Render — synchron nach TMPLS-Definition
if (typeof render === 'function') render();

window.bvFilter=function(q){_q=q.toLowerCase().trim();render();};
window.bvSetCat=function(cat,btn){
  _cat=cat;
  document.querySelectorAll('.bv-chip').forEach(function(c){c.classList.remove('act');});
  if(btn)btn.classList.add('act');
  render();
};


/* ── BUTTON KLICK MIT FEEDBACK (Session 30: Tab-UI direkt öffnen) ── */
window.bvVerwenden=function(id,evt){
  if(evt)evt.stopPropagation();
  _ki=false;
  var btn=document.getElementById('btnv-'+id);
  var card=document.getElementById('tc-'+id);
  if(btn){btn.classList.add('pressing');setTimeout(function(){btn.classList.remove('pressing');},150);}
  if(card){card.classList.add('tc-highlight-v');}
  _tpl=TMPLS.find(function(t){return t.id===id;});
  bvUpdateDrawerHeader();
  setTimeout(function(){
    if(card)card.classList.remove('tc-highlight-v');
    bvOpenDrawer();
    // Direkt Felder füllen (ohne Step-Wizard)
    fuelleSV();
    ladeFaelle();
    bvRenderVorschau();
  },180);
};

window.bvKI=function(id,evt){
  if(evt)evt.stopPropagation();
  _ki=true;
  var btn=document.getElementById('btnki-'+id);
  var card=document.getElementById('tc-'+id);
  if(btn){btn.classList.add('pressing');setTimeout(function(){btn.classList.remove('pressing');},150);}
  if(card){card.classList.add('tc-highlight-ki');}
  _tpl=TMPLS.find(function(t){return t.id===id;});
  bvUpdateDrawerHeader();
  setTimeout(function(){
    if(card)card.classList.remove('tc-highlight-ki');
    bvOpenDrawer();
    fuelleSV();
    ladeFaelle();
    bvRenderVorschau();
  },180);
};

function bvUpdateDrawerHeader(){
  if(!_tpl)return;
  var ic = document.getElementById('dr-icon');
  var ti = document.getElementById('dr-title');
  var md = document.getElementById('dr-mode');
  if (ic) ic.textContent = _tpl.icon;
  if (ti) ti.textContent = _tpl.name;
  if (md) md.textContent = _ki ? '✨ KI-unterstützte Erstellung' : 'Standard-Ausfüllung';
  // KI-Box bleibt im Tab-UI immer sichtbar — enthält Hinweis + Generieren-Button
}

/* ── DRAWER (Session 30 Tab-UI) ── */
function bvOpenDrawer(){
  var empty = document.getElementById('bv-empty');
  var detail = document.getElementById('bv-detail');
  if (empty)  empty.style.display  = 'none';
  if (detail) detail.style.display = 'block';
  // sicher bei Tab "Bearbeiten" starten
  _currentTab = 'edit';
  window.switchTab && window.switchTab('edit');
  // Send-Ergebnis zurücksetzen
  var sr = document.getElementById('send-result');
  if (sr) sr.style.display = 'none';
}
window.bvCloseDrawer=function(){
  var empty = document.getElementById('bv-empty');
  var detail = document.getElementById('bv-detail');
  if (empty)  empty.style.display  = '';
  if (detail) detail.style.display = 'none';
  _tpl=null;_fall=null;_ki=false;_step=1;_felder={};
  var kiEdit = document.getElementById('ki-edit');
  if (kiEdit) { kiEdit.value=''; kiEdit.style.display='none'; }
  var kiArea = document.getElementById('ki-area');
  if (kiArea) kiArea.textContent='Wählen Sie einen Empfänger und klicken Sie auf „KI generieren".';
};

/* ── STEPS (Session 30: Legacy, durch Tab-UI ersetzt) ── */
function bvGoStep(n){
  /* no-op — Tab-UI ersetzt den 3-Step-Wizard.
     Behalten als Platzhalter damit Alt-Refs nichts crashen. */
  _step = n || 1;
}
window.bvStepNext=function(){ /* no-op */ };
window.bvStepBack=function(){ /* no-op */ };
window.bvOhneFall=function(){_fall=null;};

/* ── FALL-PICKER ── */
function ladeFaelle(){
  var liste=document.getElementById('fall-liste');
  var cache=[];
  try{cache=(JSON.parse(localStorage.getItem('prova_archiv_cache_v2')||'{}').data||[]).slice(0,12);}catch(e){}
  if(cache.length){bvRenderFaelle(cache,liste);return;}
  liste.innerHTML='<div style="text-align:center;padding:12px;font-size:12px;color:var(--text3);">Lädt…</div>';
  var sv=localStorage.getItem('prova_sv_email')||'';
  fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({method:'GET',path:'/v0/'+AT_BASE+'/'+AT_FAELLE
      +'?pageSize=12&sort[0][field]=Timestamp&sort[0][direction]=desc'
      +(sv?'&filterByFormula='+encodeURIComponent('{sv_email}="'+sv+'"'):'')})
  }).then(function(r){return r.json();}).then(function(d){bvRenderFaelle(d.records||[],liste);})
    .catch(function(){liste.innerHTML='<div style="font-size:12px;color:var(--text3);text-align:center;padding:12px;">Keine Verbindung</div>';});
}
function bvRenderFaelle(records,container){
  if(!records.length){container.innerHTML='<div style="font-size:12px;color:var(--text3);text-align:center;padding:12px;">Keine Fälle vorhanden</div>';return;}
  container.innerHTML=records.map(function(r){
    var f=r.fields||{};
    return '<div class="bv-fall" onclick="bvWaehle(\''+r.id+'\',this)">'
      +'<div>'
      +'<div class="bv-fall-az">'+(f.Aktenzeichen||'—')+'</div>'
      +'<div class="bv-fall-info">'+(f.Schadenart||f.Schadensart||'')+((f.Schaden_Strasse||f.Adresse)?' · '+(f.Schaden_Strasse||f.Adresse):'')+'</div>'
      +'</div>'
      +'<div class="bv-fall-ck" id="fck-'+r.id+'"></div>'
      +'</div>';
  }).join('');
}
window.bvWaehle=function(id,el){
  _fall=id;
  document.querySelectorAll('.bv-fall').forEach(function(i){i.classList.remove('sel');var c=i.querySelector('.bv-fall-ck');if(c)c.innerHTML='';});
  if(el){el.classList.add('sel');var ck=document.getElementById('fck-'+id);if(ck)ck.innerHTML='✓';}
  fuelleFall();
};

/* ── FELDER ── */
function fuelleSV(){
  var l=localStorage;
  _felder.sv_name=(l.getItem('prova_sv_vorname')||'')+' '+(l.getItem('prova_sv_nachname')||'');
  _felder.sv_email=l.getItem('prova_sv_email')||'';
  _felder.sv_tel=l.getItem('prova_sv_telefon')||'';
  _felder.kanzlei=l.getItem('prova_kanzlei_name')||'';
  _felder.datum=new Date().toLocaleDateString('de-DE');
}
function fuelleFall(){
  if(!_fall)return;
  try{
    var cache=(JSON.parse(localStorage.getItem('prova_archiv_cache_v2')||'{}').data||[]);
    var rec=cache.find(function(r){return r.id===_fall;});
    if(rec){var f=rec.fields||{};
      _felder.az=f.Aktenzeichen||'';_felder.schadenart=f.Schadenart||f.Schadensart||'';
      _felder.adresse=f.Schaden_Strasse||f.Adresse||'';
      _felder.ag_name=f.Auftraggeber_Name||'';_felder.ag_email=f.Auftraggeber_Email||'';
    }
  }catch(e){}
}

/* ── TAB SWITCHER ── */
window.bvShowTab=function(tab){
  var pp=document.getElementById('tab-prev-panel');
  var ep=document.getElementById('tab-edit-panel');
  var tb=document.getElementById('tab-prev');
  var te=document.getElementById('tab-edit');
  if(tab==='prev'){
    if(pp)pp.style.display='';
    if(ep)ep.style.display='none';
    if(tb){tb.style.background='#4f8ef7';tb.style.color='#fff';}
    if(te){te.style.background='transparent';te.style.color='var(--text3)';}
  } else {
    if(pp)pp.style.display='none';
    if(ep)ep.style.display='';
    if(tb){tb.style.background='transparent';tb.style.color='var(--text3)';}
    if(te){te.style.background='#4f8ef7';te.style.color='#fff';}
  }
};

/* ── SYNC: Edit → Preview ── */
window.bvSyncEditToPreview=function(){
  var edit=document.getElementById('ki-edit');
  var body=document.getElementById('prev-body');
  if(edit&&body) body.textContent=edit.value;
};

/* ── VORSCHAU (Session 30: reduziert auf prev-body — Tab-UI) ── */
function bvRenderVorschau(){
  if(!_tpl)return;
  var az  = _felder.az      || '';
  var ag  = _felder.ag_name || '';
  var agE = _felder.ag_email|| '';
  var adr = _felder.adresse || '';
  var dat = _felder.datum   || new Date().toLocaleDateString('de-DE');
  var vn  = localStorage.getItem('prova_sv_vorname')  || '';
  var nn  = localStorage.getItem('prova_sv_nachname') || '';
  var nm  = (_felder.sv_name && _felder.sv_name.trim() !== 'null null' && _felder.sv_name.trim() !== '')
              ? _felder.sv_name.trim()
              : (vn+' '+nn).trim();
  var kz  = _felder.kanzlei || localStorage.getItem('prova_kanzlei_name') || 'Sachverständigenbüro';
  var svE = _felder.sv_email|| localStorage.getItem('prova_sv_email') || '';
  var svT = _felder.sv_tel  || localStorage.getItem('prova_sv_telefon') || '';

  // Body-Text (Standard oder bereits generierter KI-Text)
  var edit = document.getElementById('ki-edit');
  var body = document.getElementById('prev-body');
  var txt;
  if (edit && edit.value && edit.value.trim()) {
    txt = edit.value;
  } else {
    txt = bvGetText(_tpl.id, {
      az:  az  || '[Aktenzeichen]',
      ag:  ag  || '[Auftraggeber]',
      adr: adr || '[Objekt-Adresse]',
      dat: dat,
      nm:  nm || '[Sachverständiger]'
    });
  }

  // Signatur-Footer direkt anhängen
  var sig = [kz, nm, svE, svT].filter(function(x){
    return x && String(x).trim() && String(x).trim() !== 'null null';
  }).join('  ·  ');

  // Komplette Darstellung: Betreff, Body, Signatur
  var subj = _tpl.name + (az ? ' — AZ: ' + az : '');
  var headerBlock = ''
    + 'Von:      ' + (nm || 'Sachverständiger') + (svE ? ' <' + svE + '>' : '') + '\n'
    + 'An:       ' + (ag || '—') + (agE ? ' <' + agE + '>' : '') + '\n'
    + 'Datum:    ' + dat + '\n'
    + 'Betreff:  ' + subj + '\n'
    + '─────────────────────────────────────────────\n\n';

  var sigBlock = sig ? '\n\n─────\n' + sig : '';

  if (body) body.textContent = headerBlock + txt + sigBlock;

  // Edit-Textarea synchron halten (nur initial befüllen, nicht überschreiben)
  if (edit && !edit.value) edit.value = txt;
}
function bvGetText(id,d){
  var T={
    'A-01':'Sehr geehrte Damen und Herren,\n\nhiermit unterbreite ich Ihnen mein Angebot zur Erstellung eines Sachverständigengutachtens zum Objekt '+d.adr+'.\n\nAktenzeichen: '+d.az+'\n\nMein Honorar berechnet sich nach dem JVEG.\n\nMit freundlichen Grüßen\n'+d.nm,
    'A-02':'Sehr geehrte Damen und Herren,\n\nhiermit bestätige ich die Auftragserteilung zur Erstellung eines Sachverständigengutachtens.\n\nAktenzeichen: '+d.az+'\nObjekt: '+d.adr+'\n\nMit freundlichen Grüßen\n'+d.nm,
    'G-07':'An das Gericht\n\nSehr geehrte Damen und Herren,\n\nhiermit zeige ich gemäß §407a Abs. 1 ZPO an, dass ich den Gutachtenauftrag zum Aktenzeichen '+d.az+' angenommen habe.\n\nIch bestätige meine Unabhängigkeit und Fachkunde.\n\nMit freundlichen Grüßen\n'+d.nm,
    'G-08':'An das Gericht\n\nSehr geehrte Damen und Herren,\n\nhiermit beantrage ich gemäß §411 Abs. 1 ZPO eine Fristverlängerung zur Erstattung des Gutachtens zum Aktenzeichen '+d.az+'.\n\nBegründung: [Begründung einfügen]\n\nMit freundlichen Grüßen\n'+d.nm,
  };
  return T[id]||'Sehr geehrte Damen und Herren,\n\nbezugnehmend auf obige Angelegenheit (AZ: '+d.az+') übersende ich Ihnen anliegend die gewünschten Unterlagen.\n\nMit freundlichen Grüßen\n'+d.nm;
}

/* ── KI GENERIEREN ── */
/* ── TYP-SPEZIFISCHE SYSTEM-PROMPTS ── */
var KI_PROMPTS = {

  // ANGEBOTE & AUFTRÄGE
  'A-01': {
    sys: 'Du bist ö.b.u.v. Sachverständiger für Bau- und Gebäudeschäden. Schreibe den Rumpftext eines seriösen Angebotsschreibens. NUR der Fließtext — keine Anrede, keinen Briefkopf, keine Grußformel, kein Markdown. Maximal 4 Sätze. Sachlich, professionell, direkt.',
    usr: function(f) {
      return 'Vorlage: Angebot zur Gutachtenerstellung\n'
        + 'Auftraggeber: '+f.ag_name+'\n'
        + 'Objekt: '+f.adresse+'\n'
        + 'Aktenzeichen: '+(f.az||'wird noch mitgeteilt')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n'
        + 'Datum: '+f.datum+'\n\n'
        + 'Schreibe: Ich unterbreite hiermit mein Angebot zur Erstellung eines Sachverständigengutachtens für das Objekt [Adresse]. Honorar nach JVEG bzw. nach Vereinbarung. Keine Platzhalter wie X EUR.';
    }
  },

  'A-02': {
    sys: 'Du bist ö.b.u.v. Sachverständiger. Schreibe den Rumpftext einer Auftragsbestätigung. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 3-4 Sätze.',
    usr: function(f) {
      return 'Vorlage: Auftragsbestätigung\n'
        + 'Auftraggeber: '+f.ag_name+'\n'
        + 'Objekt: '+f.adresse+'\n'
        + 'Aktenzeichen: '+(f.az||'wird noch mitgeteilt')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n'
        + 'Datum: '+f.datum+'\n\n'
        + 'Bestätige den Auftrag zur Gutachtenerstellung konkret mit AZ und Adresse. Erwähne dass der Ortstermin zeitnah vereinbart wird.';
    }
  },

  'A-03': {
    sys: 'Du bist ö.b.u.v. Sachverständiger. Schreibe den Rumpftext einer Honorarvereinbarung. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 4-5 Sätze. Seriös, verbindlich.',
    usr: function(f) {
      return 'Vorlage: Honorarvereinbarung\n'
        + 'Auftraggeber: '+f.ag_name+'\n'
        + 'Objekt: '+f.adresse+'\n'
        + 'Aktenzeichen: '+(f.az||'wird noch mitgeteilt')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Halte fest: Honorar richtet sich nach JVEG oder nach schriftlicher Vereinbarung. Fahrtkosten, Auslagen, Kopierkosten werden gesondert berechnet. Abrechnung nach Abschluss des Gutachtens. Keine konkreten EUR-Beträge nennen.';
    }
  },

  // ORTSTERMIN
  'O-01': {
    sys: 'Du bist ö.b.u.v. Sachverständiger. Schreibe eine Einladung zum Ortstermin (Besichtigung). NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 3-4 Sätze.',
    usr: function(f) {
      return 'Vorlage: Einladung Ortstermin\n'
        + 'Auftraggeber/Eingeladene: '+f.ag_name+'\n'
        + 'Objekt: '+f.adresse+'\n'
        + 'Aktenzeichen: '+(f.az||'wird noch mitgeteilt')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Lade zur Besichtigung des Objekts ein. Bitte um Terminbestätigung. Weise darauf hin dass relevante Unterlagen bereitgehalten werden sollen. Kein konkretes Datum (das wird manuell ergänzt).';
    }
  },

  'O-02': {
    sys: 'Du bist ö.b.u.v. Sachverständiger im gerichtlichen Auftrag. Schreibe eine förmliche Einladung zum gerichtlichen Ortstermin nach §404 ZPO. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 4-5 Sätze. Formell-juristischer Ton.',
    usr: function(f) {
      return 'Vorlage: Einladung gerichtlicher Ortstermin\n'
        + 'Aktenzeichen: '+(f.az||'[Gerichts-AZ]')+'\n'
        + 'Objekt: '+f.adresse+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Förmliche Ladung aller Parteien zum Ortstermin gem. Gerichtsauftrag. Hinweis auf §407a ZPO-Pflichten. Parteien sind zur Mitwirkung verpflichtet. Kein konkretes Datum.';
    }
  },

  'O-03': {
    sys: 'Du bist ö.b.u.v. Sachverständiger. Schreibe den Einleitungstext eines Ortstermin-Protokolls. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 3-4 Sätze. Sachlich-dokumentarisch.',
    usr: function(f) {
      return 'Vorlage: Ortstermin-Protokoll\n'
        + 'Objekt: '+f.adresse+'\n'
        + 'Aktenzeichen: '+(f.az||'wird noch mitgeteilt')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Protokolleinleitung: Am [Datum] fand die Besichtigung des Objekts [Adresse] statt. Anwesende Parteien, Zweck, Begehungsumfang. Kein konkretes Datum eintragen.';
    }
  },

  // GERICHT
  'G-07': {
    sys: 'Du bist ö.b.u.v. Sachverständiger im gerichtlichen Auftrag. Schreibe die Pflichtanzeige nach §407a Abs. 1 ZPO. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 4-5 Sätze. Förmlich-juristisch, präzise.',
    usr: function(f) {
      return 'Vorlage: Beauftragungsbestätigung §407a ZPO\n'
        + 'Gericht / Auftraggeber: '+f.ag_name+'\n'
        + 'Aktenzeichen: '+(f.az||'[Gerichts-AZ]')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Zeige gemäß §407a Abs.1 ZPO an: Gutachtenauftrag angenommen, AZ '+f.az+'. Bestätige persönliche Unabhängigkeit von den Parteien, Fachkunde, keine Ausschlussgründe nach §406 ZPO. Hinweis auf erwartete Bearbeitungszeit ohne konkretes Datum.';
    }
  },

  'G-08': {
    sys: 'Du bist ö.b.u.v. Sachverständiger. Schreibe einen Fristverlängerungsantrag nach §411 Abs.1 ZPO. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 4-5 Sätze. Sachlich begründet, förmlich.',
    usr: function(f) {
      return 'Vorlage: Fristverlängerungsantrag §411 ZPO\n'
        + 'Gericht: '+f.ag_name+'\n'
        + 'Aktenzeichen: '+(f.az||'[Gerichts-AZ]')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Beantrage gemäß §411 Abs.1 ZPO Fristverlängerung für Gutachten AZ '+f.az+'. Begründe mit Komplexität des Schadenbilds / noch ausstehenden Unterlagen / Untersuchungsaufwand. Kein konkretes neues Datum.';
    }
  },

  'G-09': {
    sys: 'Du bist ö.b.u.v. Sachverständiger. Schreibe den Einleitungstext für Ergänzungsfragen-Antwort gem. §411 ZPO. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 3-4 Sätze.',
    usr: function(f) {
      return 'Vorlage: Ergänzungsfragen-Antwort §411 ZPO\n'
        + 'Aktenzeichen: '+(f.az||'[Gerichts-AZ]')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Nehme Stellung zu den Ergänzungsfragen des Gerichts / der Parteien im Verfahren AZ '+f.az+'. Verweise auf das bereits erstattete Gutachten. Beantworte die Fragen auf Basis der dortigen Feststellungen.';
    }
  },

  'G-10': {
    sys: 'Du bist ö.b.u.v. Sachverständiger. Schreibe einen Hinweis auf Kostenüberschreitung nach §407a Abs.3 ZPO. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 4-5 Sätze. Sachlich, förmlich.',
    usr: function(f) {
      return 'Vorlage: Kostenrahmenerhöhung §407a Abs.3 ZPO\n'
        + 'Gericht: '+f.ag_name+'\n'
        + 'Aktenzeichen: '+(f.az||'[Gerichts-AZ]')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Zeige gemäß §407a Abs.3 ZPO an dass der Aufwand den Kostenrahmen voraussichtlich übersteigt. Begründe sachlich (Untersuchungsumfang, Laboranalysen, Aktenlage). Bitte um gerichtliche Entscheidung zur Fortführung. Kein konkreter EUR-Betrag.';
    }
  },

  // VERSICHERUNG
  'V-01': {
    sys: 'Du bist ö.b.u.v. Sachverständiger. Schreibe einen Erstbericht an eine Versicherung nach Schadensmeldung. NUR Fließtext, keine Anrede, kein Briefkopf, keine Grußformel, kein Markdown. 4-5 Sätze. Professionell, faktenorientiert.',
    usr: function(f) {
      return 'Vorlage: Erstbericht an Versicherung\n'
        + 'Versicherung: '+f.ag_name+'\n'
        + 'Objekt: '+f.adresse+'\n'
        + 'Aktenzeichen: '+(f.az||'wird noch mitgeteilt')+'\n'
        + 'Sachverständiger: '+f.sv_name+'\n\n'
        + 'Berichte über die erste Inaugenscheinnahme des Schadensobjekts '+f.adresse+'. Schildere kurz den vorgefundenen Zustand, den Schadensumfang und die nächsten Schritte (Detailuntersuchung, Gutachtenerstellung). Kein abschließendes Urteil im Erstbericht.';
    }
  }
};

/* ── FALLBACK FÜR NICHT SPEZIFIZIERTE VORLAGEN ── */
function kiGetPrompt(tplId, felder) {
  var p = KI_PROMPTS[tplId];
  if (p) {
    return { sys: p.sys, usr: p.usr(felder) };
  }
  // Generischer Fallback
  var cat = _tpl ? _tpl.cat : 'allgemein';
  var catTon = {
    gericht: 'förmlich-juristisch, §407a ZPO beachten',
    versicherung: 'sachlich-technisch, faktenorientiert',
    ortstermin: 'sachlich-dokumentarisch',
    angebote: 'professionell-akquise',
    intern: 'intern-dokumentarisch'
  }[cat] || 'sachlich-professionell';

  return {
    sys: 'Du bist ö.b.u.v. Sachverständiger für Bau- und Gebäudeschäden. Schreibe den Rumpftext des angeforderten Briefes. NUR Fließtext — keine Anrede, keinen Briefkopf, keine Grußformel, kein Markdown. Ton: '+catTon+'. 3-5 Sätze. Konkret mit den gegebenen Falldaten, keine Platzhalter wie X, Y oder [...]..',
    usr: 'Vorlage: '+(_tpl?_tpl.name:'Brief')+'\n'
      +'Auftraggeber: '+(felder.ag_name||'—')+'\n'
      +'Objekt: '+(felder.adresse||'—')+'\n'
      +'Aktenzeichen: '+(felder.az||'—')+'\n'
      +'Sachverständiger: '+(felder.sv_name||'—')+'\n'
      +'Datum: '+(felder.datum||'—')+'\n\n'
      +'Schreibe jetzt den konkreten Brieftext für diese Vorlage.'
  };
}

window.bvGenKI=async function(){
  var kiArea=document.getElementById('ki-area');
  var edit=document.getElementById('ki-edit');
  var btn=document.getElementById('ki-gen-btn');
  var editBtn=document.getElementById('ki-edit-btn');

  // Loading-Zustand direkt in der KI-Area zeigen
  if (kiArea) kiArea.textContent = '⏳ KI schreibt Ihren Brief…';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Wird erstellt…'; }

  // Felder sicherstellen
  fuelleSV();
  if(_fall) fuelleFall();

  // Prompt abrufen
  var prompt = kiGetPrompt(_tpl?_tpl.id:'', _felder);

  try{
    var res=await fetch('/.netlify/functions/ki-proxy',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gpt-4o-mini',
        max_tokens:500,
        messages:[
          {role:'system', content:prompt.sys},
          {role:'user',   content:prompt.usr}
        ]
      })
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data=await res.json();
    var txt=(data.content&&data.content[0]&&data.content[0].text)||'';
    if(!txt) throw new Error('Keine Antwort von KI');

    // KI-Text anzeigen + Edit-Textarea befüllen
    if (kiArea) kiArea.textContent = txt;
    if (edit)   edit.value = txt;

    // Sofort Vorschau aktualisieren
    bvRenderVorschau();

    if(btn)    { btn.disabled = false; btn.textContent = '↻ Neu generieren'; }
    if(editBtn) editBtn.style.display = '';

    bvToast('✅ Brief fertig — in Vorschau übernommen','success');

  }catch(e){
    if (kiArea) kiArea.textContent = 'KI-Fehler: ' + e.message;
    if(btn){btn.disabled=false;btn.textContent='↻ Neu generieren';}
    bvToast('KI-Fehler: '+e.message,'error');
  }
};

/* ── SEND SUMMARY ── */
function bvRenderSendSummary(){
  var s=document.getElementById('send-summary');
  var e=document.getElementById('emp-name');
  if(!_tpl)return;
  if(e)e.textContent=_felder.ag_name||_felder.ag_email||'—';
  if(s)s.innerHTML='<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:6px;"><span style="color:var(--text3)">Vorlage</span><span>'+_tpl.name+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:6px;"><span style="color:var(--text3)">Aktenzeichen</span><span>'+(_felder.az||'—')+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;"><span style="color:var(--text3)">Modus</span><span>'+(_ki?'✨ KI-generiert':'Standard')+'</span></div>';
}

/* ── SENDEN ── */
window.bvSend=async function(typ){
  var result=document.getElementById('send-result');
  var az=_felder.az||'',ag=_felder.ag_name||'',email=_felder.ag_email||'',svEmail=_felder.sv_email||'';
  if(typ==='email'){
    var subj=encodeURIComponent((_tpl?_tpl.name:'Brief')+' — '+az);
    var edit=document.getElementById('ki-edit');
    var body=encodeURIComponent(edit&&edit.value?edit.value:bvGetText(_tpl?_tpl.id:'',{az:az,ag:ag,adr:_felder.adresse||'',dat:_felder.datum||'',nm:_felder.sv_name||''}));
    window.location.href='mailto:'+email+'?subject='+subj+'&body='+body;
    bvToast('E-Mail-Client geöffnet ✅','success');return;
  }
  if(typ==='pdf'){
    var btn=document.getElementById('btn-send-pdf')||{};
    try{
      var pay={vorlage_id:_tpl?_tpl.id:'',vorlage_name:_tpl?_tpl.name:'',aktenzeichen:az,auftraggeber:ag,ag_email:email,sv_email:svEmail,adresse:_felder.adresse||'',datum:_felder.datum||'',sv_name:_felder.sv_name||'',brieftext:(document.getElementById('ki-edit')||{value:''}).value||''};
      var r=await fetch(WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pay)});
      if(r.ok){if(result){result.style.display='block';result.innerHTML='<div style="padding:10px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:8px;font-size:12px;color:#10b981;">✅ PDF wird generiert — per E-Mail an '+svEmail+'</div>';}bvToast('PDF wird erstellt ✅','success');}
      else throw new Error('HTTP '+r.status);
    }catch(e){bvToast('Fehler: '+e.message,'error');}
    return;
  }
  if(typ==='akte'){bvToast('In Akte gespeichert ✅','success');setTimeout(bvCloseDrawer,1600);}
};

/* ── TOAST ── */
function bvToast(msg,type){
  var t=document.getElementById('bv-toast');
  if(!t)return;
  t.textContent=msg;t.className='bv-toast show'+(type?' '+type:'');
  clearTimeout(_toastTimer);_toastTimer=setTimeout(function(){t.classList.remove('show');},3000);
}
window.zeigToast=bvToast;window.showToast=bvToast;

/* ── KEYBOARD ── */
document.addEventListener('keydown',function(e){
  if(e.key==='Escape')bvCloseDrawer();
  if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
    e.preventDefault();var s=document.getElementById('bv-search');if(s){s.focus();s.select();}
  }
});
var bvSrch = document.getElementById('bv-search');
if (bvSrch) {
  bvSrch.addEventListener('focus', function() {
    var k = document.getElementById('bv-search-key');
    if (k) { k.style.display = 'none'; }
  });
  bvSrch.addEventListener('blur', function() {
    var k = document.getElementById('bv-search-key');
    if (k) { k.style.display = 'flex'; }
  });
}

/* ── INITIAL RENDER: Template-Galerie aufbauen beim Seitenladen ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}

/* ══════════════════════════════════════════════════════════════
   SESSION 30 ADAPTER-LAYER — HTML/JS Tab-UI in Einklang bringen
   Die briefvorlagen.html erwartet Funktionen die bisher fehlten.
   ══════════════════════════════════════════════════════════════ */

/* ── TAB-WECHSEL (HTML onclick="switchTab('edit'|'prev')") ── */
window.switchTab = function(tab) {
  _currentTab = tab;
  var ep = document.getElementById('tab-edit-panel');
  var pp = document.getElementById('tab-prev-panel');
  var te = document.getElementById('tab-edit');
  var tp = document.getElementById('tab-prev');

  if (tab === 'prev') {
    if (ep) ep.classList.remove('active');
    if (pp) pp.classList.add('active');
    if (te) te.classList.remove('active');
    if (tp) tp.classList.add('active');
    // Vor dem Zeigen: Vorschau aus aktuellem Edit-Stand aktualisieren
    bvRenderVorschau();
  } else {
    if (ep) ep.classList.add('active');
    if (pp) pp.classList.remove('active');
    if (te) te.classList.add('active');
    if (tp) tp.classList.remove('active');
  }

  // Button-Labels dem Tab anpassen
  var bb = document.getElementById('btn-back');
  var bn = document.getElementById('btn-next');
  var bp = document.getElementById('btn-send-pdf');
  if (tab === 'prev') {
    if (bb) { bb.style.display = ''; bb.textContent = '← Bearbeiten'; }
    if (bn) { bn.style.display = 'none'; }
    if (bp) { bp.style.display = ''; }
  } else {
    if (bb) { bb.style.display = ''; bb.textContent = '✕ Schließen'; }
    if (bn) { bn.style.display = ''; bn.textContent = 'Vorschau →'; }
    if (bp) { bp.style.display = 'none'; }
  }
};

/* ── NAVIGATION (HTML onclick="zurueck()" und "weiter()") ── */
window.zurueck = function() {
  if (_currentTab === 'prev') {
    window.switchTab('edit');
  } else {
    window.bvCloseDrawer();
  }
};

window.weiter = function() {
  if (_currentTab === 'edit') {
    window.switchTab('prev');
  }
  // Auf "prev" ist "Weiter" ausgeblendet — stattdessen PDF-Button sichtbar
};

/* ── PDF-VERSAND (HTML onclick="sendePDF()") ── */
window.sendePDF = function() {
  window.bvSend && window.bvSend('pdf');
};

/* ── KI-AKTIONEN (HTML onclick="starteKIGenerierung()" / "aktiviereKIEdit()") ── */
window.starteKIGenerierung = function() {
  if (!_tpl) {
    bvToast('Bitte erst Vorlage wählen', 'error');
    return;
  }
  if (!_fall && !_felder.ag_name) {
    bvToast('Bitte erst Empfänger oder Fall wählen', 'error');
    return;
  }
  // KI-Mode aktivieren damit bvRenderVorschau den richtigen Kontext nutzt
  _ki = true;
  bvUpdateDrawerHeader();
  window.bvGenKI();
};

window.aktiviereKIEdit = function() {
  var area = document.getElementById('ki-area');
  var edit = document.getElementById('ki-edit');
  var btn  = document.getElementById('ki-edit-btn');
  if (!edit) return;
  if (area && edit.style.display === 'none') {
    // Edit-Modus aktivieren
    edit.value = area.textContent || '';
    edit.style.display = 'block';
    area.style.display = 'none';
    if (btn) btn.textContent = '✓ Fertig';
    edit.focus();
  } else {
    // Edit-Modus schließen
    if (area) {
      area.textContent = edit.value;
      area.style.display = '';
    }
    edit.style.display = 'none';
    if (btn) btn.textContent = '✏️ Bearbeiten';
    bvRenderVorschau();
  }
};

/* ── SEARCH / FILTER (HTML oninput="filterVorlagen()" / "filterFaelle()") ── */
window.filterVorlagen = function() {
  var input = document.getElementById('bv-search');
  _q = (input && input.value || '').toLowerCase().trim();
  render();
};

window.filterFaelle = function() {
  var input = document.getElementById('emp-name');
  var q = (input && input.value || '').toLowerCase().trim();
  var items = document.querySelectorAll('#fall-liste .bv-fall');
  items.forEach(function(el) {
    var txt = (el.textContent || '').toLowerCase();
    el.style.display = (!q || txt.indexOf(q) !== -1) ? '' : 'none';
  });
};

/* ── CAT-CHIPS (HTML-Container <div class="cat-chips" id="cat-chips">) ── */
function renderCatChips() {
  var host = document.getElementById('cat-chips');
  if (!host) return;
  var html = '<div class="cat-chip' + (_cat === 'all' ? ' active' : '')
    + '" style="background:rgba(255,255,255,.06);color:var(--text2);'
    + (_cat === 'all' ? 'border-color:var(--accent);color:var(--accent);' : '')
    + '" onclick="bvSetCategory(\'all\')">Alle</div>';
  CATS.forEach(function(cat) {
    var active = _cat === cat.id;
    html += '<div class="cat-chip' + (active ? ' active' : '') + '"'
      + ' style="background:rgba(255,255,255,.06);color:var(--text2);'
      + (active ? 'background:' + cat.col + '22;border-color:' + cat.col + ';color:' + cat.col + ';' : '')
      + '" onclick="bvSetCategory(\'' + cat.id + '\')">' + cat.name + '</div>';
  });
  host.innerHTML = html;
}

window.bvSetCategory = function(cat) {
  _cat = cat;
  renderCatChips();
  render();
};

/* ── ESC-Key ergänzend um Tab-Zurück vor Close ── */
/* (Original Escape-Handler schließt Drawer komplett; hier nicht überschreiben,
    damit Verhalten vorhersehbar bleibt — User kann ESC drücken zum Komplett-Abbruch) */

/* Cat-Chips initial rendern sobald DOM bereit */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderCatChips);
} else {
  renderCatChips();
}

})();

/* ── BRIEFE.versand_status nach K3-Versand auf "Gesendet" setzen ── */
window.provaBriefGesendet = async function(briefId) {
  if (!briefId) return;
  try {
    await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'PATCH',
        path: '/v0/appJ7bLlAHZoxENWE/tblSzxvnkRE6B0thx/' + briefId,
        payload: { fields: {
          versand_status: 'Gesendet',
          gesendet_am:    new Date().toISOString(),
        }}
      })
    });
    console.log('[PROVA] BRIEFE.versand_status → Gesendet ✅');
  } catch(e) {
    console.warn('[PROVA] Brief-Status-Update fehlgeschlagen:', e.message);
  }
};

/* ── Statistik bei Brief-Versand ── */
window.provaBriefStatLog = async function(data) {
  if (typeof provaStatLog === 'function') {
    await provaStatLog({
      aktenzeichen: data.aktenzeichen || '',
      ereignis:     'Brief_Gesendet',
      schadensart:  data.brief_typ   || '',
    });
  }
};
