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

/* ── FERTIGE DOKUMENTE (HTML-Vorlagen direkt öffnen) ── */
var DOKUMENT_VORLAGEN = [
  {id:'D-01', name:'Auftragsbestätigung',           file:'auftragsbestaetigung.html',             cat:'auftrag',   icon:'📄'},
  {id:'D-02', name:'Beauftragungsbestätigung Gericht', file:'beauftragungsbestaetigung-gericht.html', cat:'gericht',   icon:'⚖️'},
  {id:'D-03', name:'Einladung Ortstermin',           file:'einladung-ortstermin.html',             cat:'termin',    icon:'📅'},
  {id:'D-04', name:'Einladung Ortstermin (Gericht)', file:'einladung-ortstermin-gericht.html',     cat:'gericht',   icon:'⚖️'},
  {id:'D-05', name:'Erstbericht Versicherung',       file:'erstbericht-versicherung.html',         cat:'versicherung', icon:'🏦'},
  {id:'D-06', name:'Abschlussbericht Versicherung',  file:'abschlussbericht-versicherung.html',    cat:'versicherung', icon:'🏦'},
  {id:'D-07', name:'Deckungsanfrage',                file:'deckungsanfrage.html',                  cat:'versicherung', icon:'🏦'},
  {id:'D-08', name:'Nachforderung Unterlagen',       file:'nachforderung-unterlagen.html',         cat:'allgemein', icon:'📋'},
  {id:'D-09', name:'Fristverläng. Antrag',           file:'fristverlaengerungsantrag.html',        cat:'gericht',   icon:'⚖️'},
  {id:'D-10', name:'Kostenvorschuss Gericht',        file:'kostenvorschuss-gericht.html',          cat:'gericht',   icon:'⚖️'},
  {id:'D-11', name:'Angebot Gutachten',              file:'angebot-gutachten.html',                cat:'auftrag',   icon:'📄'},
  {id:'D-12', name:'Honorarvereinbarung',            file:'honorarvereinbarung.html',              cat:'abrechnung', icon:'💶'},
  {id:'D-13', name:'Kostenvoranschlag Sanierung',    file:'kostenvoranschlag-sanierung.html',      cat:'abrechnung', icon:'💶'},
  {id:'D-14', name:'Kostenrahmenerhöhung',           file:'kostenrahmen-erhoehung.html',           cat:'gericht',   icon:'⚖️'},
  {id:'D-15', name:'Ergänzungsfragen Antwort',       file:'ergaenzungsfragen-antwort.html',        cat:'gericht',   icon:'⚖️'},
  {id:'D-16', name:'Aktennotiz',                     file:'aktennotiz.html',                       cat:'allgemein', icon:'📝'},
  {id:'D-17', name:'Datenschutz-Einwilligung',       file:'einverstaendnis-dsgvo.html',            cat:'allgemein', icon:'🔒'},
  {id:'D-18', name:'Datenschutz-Mandant',            file:'datenschutz-mandant.html',              cat:'allgemein', icon:'🔒'},
  {id:'D-19', name:'Messprotokoll Feuchte',          file:'messprotokoll-feuchte.html',            cat:'protokoll', icon:'📊'},
  {id:'D-20', name:'Messprotokoll Risse',            file:'messprotokoll-risse.html',              cat:'protokoll', icon:'📊'},
  {id:'D-21', name:'Ortstermin Arbeitsblatt',        file:'ortstermin-arbeitsblatt.html',          cat:'protokoll', icon:'📊'},
  {id:'D-22', name:'Ortstermin Protokoll',           file:'ortstermin-protokoll.html',             cat:'protokoll', icon:'📊'},
  {id:'D-23', name:'Checkliste Wasserschaden',       file:'checkliste-wasserschaden.html',         cat:'protokoll', icon:'📊'},
  {id:'D-24', name:'Checkliste Brandschaden',        file:'checkliste-brandschaden.html',          cat:'protokoll', icon:'📊'},
  {id:'D-25', name:'Checkliste Sturmschaden',        file:'checkliste-sturmschaden.html',          cat:'protokoll', icon:'📊'},
];

/* ── STATE ── */
var _cat='all', _q='', _tpl=null, _fall=null, _felder={}, _step=1, _ki=false;
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


/* ── BUTTON KLICK MIT FEEDBACK ── */
window.bvVerwenden=function(id,evt){
  if(evt)evt.stopPropagation();
  _ki=false;
  var btn=document.getElementById('btnv-'+id);
  var card=document.getElementById('tc-'+id);
  // Visuelles Klick-Feedback
  if(btn){btn.classList.add('pressing');setTimeout(function(){btn.classList.remove('pressing');},150);}
  if(card){card.classList.add('tc-highlight-v');}
  _tpl=TMPLS.find(function(t){return t.id===id;});
  bvUpdateDrawerHeader();
  setTimeout(function(){
    if(card)card.classList.remove('tc-highlight-v');
    bvOpenDrawer();
    bvGoStep(1);
    ladeFaelle();
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
    bvGoStep(1);
    ladeFaelle();
  },180);
};

function bvUpdateDrawerHeader(){
  if(!_tpl)return;
  document.getElementById('dr-icon').textContent=_tpl.icon;
  document.getElementById('dr-icon').className='bv-dr-icon '+(_ki?'mode-ki':'mode-v');
  document.getElementById('dr-title').textContent=_tpl.name;
  var modeEl=document.getElementById('dr-mode');
  modeEl.textContent=_ki?'✨ KI-unterstützte Erstellung':'Standard-Ausfüllung';
  modeEl.className='bv-dr-mode '+(_ki?'mode-ki':'mode-v');
  document.getElementById('ki-area').style.display=_ki?'block':'none';
}

/* ── DRAWER ── */
function bvOpenDrawer(){
  document.getElementById('bv-dr').classList.add('open');
  document.getElementById('bv-ov').classList.add('show');
}
window.bvCloseDrawer=function(){
  document.getElementById('bv-dr').classList.remove('open');
  document.getElementById('bv-ov').classList.remove('show');
  _tpl=null;_fall=null;_ki=false;_step=1;_felder={};
};

/* ── STEPS ── */
function bvGoStep(n){
  _step=n;
  document.querySelectorAll('.bv-panel').forEach(function(p){p.classList.remove('act');});
  var pnl=document.getElementById('pnl-'+n);
  if(pnl)pnl.classList.add('act');
  for(var i=1;i<=3;i++){
    var si=document.getElementById('si-'+i);
    if(!si)continue;
    si.classList.remove('act','done');
    if(i<n)si.classList.add('done');
    else if(i===n)si.classList.add('act');
  }
  var bb=document.getElementById('btn-back');
  var bn=document.getElementById('btn-next');
  if(bb)bb.style.display=n>1?'':'none';
  if(bn){
    bn.style.display=n===3?'none':'';
    bn.textContent=n===2?'Weiter zum Versand →':'Weiter →';
  }
  if(n===2){fuelleSV();fuelleFall();bvRenderVorschau();if(_ki)bvGenKI();}
  if(n===3)bvRenderSendSummary();
}
window.bvStepNext=function(){bvGoStep(Math.min(_step+1,3));};
window.bvStepBack=function(){bvGoStep(Math.max(_step-1,1));};
window.bvOhneFall=function(){_fall=null;bvGoStep(2);};

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

/* ── VORSCHAU ── */
function bvRenderVorschau(){
  if(!_tpl)return;
  var az  = _felder.az      || '';
  var ag  = _felder.ag_name || '';
  var agE = _felder.ag_email|| '';
  var adr = _felder.adresse || '';
  var dat = _felder.datum   || new Date().toLocaleDateString('de-DE');
  var nm  = _felder.sv_name || localStorage.getItem('prova_sv_vorname')+' '+localStorage.getItem('prova_sv_nachname');
  var kz  = _felder.kanzlei || localStorage.getItem('prova_kanzlei_name') || 'Sachverständigenbüro';
  var svE = _felder.sv_email|| localStorage.getItem('prova_sv_email') || '';
  var svT = _felder.sv_tel  || localStorage.getItem('prova_sv_telefon') || '';

  // Betreff-Logik
  var subj = _tpl.name;
  if(az) subj += ' — AZ: '+az;

  // Body-Text
  var txt = bvGetText(_tpl.id,{az:az||'[Aktenzeichen]',ag:ag||'[Auftraggeber]',adr:adr||'[Objekt-Adresse]',dat:dat,nm:nm.trim()});

  // Avatar-Initiale
  var initiale=(nm.trim()||'S').charAt(0).toUpperCase();

  // Uhrzeit
  var jetzt=new Date();
  var zeit=jetzt.getHours().toString().padStart(2,'0')+':'+jetzt.getMinutes().toString().padStart(2,'0');

  // Signatur-Footer
  var sig=[kz,nm.trim(),svE,svT].filter(function(x){return x&&x.trim()&&x!=='null null';}).join('  ·  ');

  // Felder setzen
  function setEl(id,val){var el=document.getElementById(id);if(el)el.textContent=val;}
  setEl('prev-avatar',    initiale);
  setEl('prev-from-name', nm.trim()&&nm.trim()!=='null null' ? nm.trim() : 'Sachverständiger');
  setEl('prev-from-email',svE||'—');
  setEl('prev-date',      'Heute, '+zeit);
  setEl('prev-to',        ag + (agE?' <'+agE+'>':'') || '—');
  setEl('prev-subject',   subj);
  setEl('prev-body',      txt);
  setEl('prev-sig-footer',sig);

  // Edit-Textarea synchron halten
  var edit=document.getElementById('ki-edit');
  if(edit&&!edit.value) edit.value=txt;
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
  var box=document.getElementById('ki-box');
  var boxTxt=document.getElementById('ki-box-txt');
  var edit=document.getElementById('ki-edit');
  var btn=document.getElementById('ki-gen-btn');

  box.classList.add('show');
  if(boxTxt) boxTxt.textContent='KI schreibt Ihren Brief…';
  if(btn) btn.disabled=true;

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

    box.classList.remove('show');

    // Edit-Textarea befüllen
    if(edit) edit.value=txt;

    // Sofort in Email-Vorschau übernehmen
    var body=document.getElementById('prev-body');
    if(body) body.textContent=txt;

    if(btn){btn.disabled=false;btn.textContent='↻ Neu generieren';}

    // KI-Hinweisbox einblenden
    var kiArea=document.getElementById('ki-area');
    if(kiArea) kiArea.style.display='block';

    bvToast('✅ Brief fertig — in Vorschau übernommen','success');

  }catch(e){
    box.classList.remove('show');
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

})();


/* ── Fertige Dokumente Sektion rendern ── */
function renderDokumentenSektion() {
  var container = document.getElementById('dokumente-sektion');
  if (!container || typeof DOKUMENT_VORLAGEN === 'undefined') return;

  var az  = (new URLSearchParams(window.location.search)).get('az') || localStorage.getItem('prova_letztes_az') || '';
  var q   = (document.getElementById('bv-search') || {}).value || '';
  var filtered = DOKUMENT_VORLAGEN;
  if (q) {
    var ql = q.toLowerCase();
    filtered = filtered.filter(function(d){ return d.name.toLowerCase().includes(ql); });
  }
  if (!filtered.length) { container.innerHTML = ''; return; }

  var html = '<div style="margin:20px 0 10px;border-top:1px solid var(--border,#1e3a5f);padding-top:16px;">'
    + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3,#64748b);margin-bottom:12px;">Fertige Dokumente &amp; Formulare</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">';

  filtered.forEach(function(d) {
    var url = d.file + (az ? '?az=' + encodeURIComponent(az) : '');
    html += '<a href="' + url + '" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface,#111827);border:1px solid var(--border,#1e3a5f);border-radius:9px;text-decoration:none;transition:border-color .15s;" '
      + 'class="dok-card">'
      + '<span style="font-size:16px;">' + d.icon + '</span>'
      + '<span style="font-size:12px;font-weight:600;color:var(--text,#e8eaf0);">' + d.name + '</span>'
      + '</a>';
  });

  html += '</div></div>';
  container.innerHTML = html;
}



/* ── BRIEF ALS PDF VERSENDEN ── */
window.bvSendBriefAlsPDF = async function() {
  var btn = document.getElementById('bv-pdf-send-btn');
  var result = document.getElementById('bv-send-result');
  var betreff = (document.getElementById('bv-betreff') || {}).value || '';
  var inhalt  = (document.getElementById('bv-inhalt')  || {}).value || (document.getElementById('bv-text') || {}).value || '';
  var email   = (document.getElementById('bv-email')   || {}).value || '';
  var ag      = (document.getElementById('bv-ag')      || {}).value || '';
  var az      = localStorage.getItem('prova_letztes_az') || '';
  var svEmail = localStorage.getItem('prova_sv_email') || '';

  if (!email || !betreff || !inhalt) {
    if (result) { result.style.display='block'; result.innerHTML='<div style="padding:10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;font-size:12px;color:#ef4444;">Bitte E-Mail, Betreff und Text ausfüllen.</div>'; }
    return;
  }

  // SMTP + SV-Profil aus localStorage
  var smtpCfg = {};
  try { smtpCfg = JSON.parse(localStorage.getItem('prova_smtp') || '{}'); } catch(e) {}

  if (!smtpCfg.user || !smtpCfg.pass) {
    if (result) { result.style.display='block'; result.innerHTML='<div style="padding:12px 14px;background:rgba(79,142,247,.06);border:1px solid rgba(79,142,247,.2);border-radius:10px;font-size:12px;line-height:1.7;"><strong>SMTP nicht eingerichtet</strong><br><a href="einstellungen.html#email" style="color:var(--accent,#4f8ef7);font-weight:600;">→ E-Mail-Versand einrichten</a></div>'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ PDF wird erstellt…'; }
  if (result) { result.style.display='block'; result.innerHTML='<div style="padding:10px;background:rgba(79,142,247,.06);border:1px solid rgba(79,142,247,.2);border-radius:8px;font-size:12px;color:var(--accent,#4f8ef7);">PDF wird generiert (ca. 5–10 Sek.)…</div>'; }

  try {
    var r = await fetch('/.netlify/functions/brief-pdf-senden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email, betreff: betreff, inhalt: inhalt,
        empfaenger_name: ag,
        aktenzeichen: az, brief_typ: 'Allgemein',
        // SV-Profil
        sv_name:      (localStorage.getItem('prova_sv_vorname') || '') + ' ' + (localStorage.getItem('prova_sv_nachname') || ''),
        sv_firma:     localStorage.getItem('prova_sv_firma') || '',
        sv_strasse:   localStorage.getItem('prova_sv_strasse') || '',
        sv_plz:       localStorage.getItem('prova_sv_plz') || '',
        sv_ort:       localStorage.getItem('prova_sv_ort') || '',
        sv_telefon:   localStorage.getItem('prova_sv_telefon') || '',
        sv_email:     svEmail,
        sv_steuer_nr: localStorage.getItem('prova_sv_steuer_nr') || '',
        sv_ort_fuer_sig: localStorage.getItem('prova_sv_ort') || '',
        // SMTP
        smtp_host: smtpCfg.host || '', smtp_port: smtpCfg.port || 587,
        smtp_user: smtpCfg.user || '', smtp_pass: smtpCfg.pass || '',
        smtp_from_name: smtpCfg.from_name || '',
        // EU AI Act
        eu_ai_act_label: 'Dieses Schreiben wurde unter Einsatz von KI-gestützten Assistenzfunktionen erstellt und vom Sachverständigen persönlich geprüft (EU AI Act Art. 13+14).',
        ki_modell_label: 'PROVA KI-Assistent'
      })
    });
    var data = await r.json();

    if (r.ok && data.success) {
      if (result) result.innerHTML = '<div style="padding:12px 14px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);border-radius:8px;font-size:12px;color:#10b981;line-height:1.6;">✅ <strong>PDF erstellt und versendet</strong><br>An: ' + email + '<br><small style="opacity:.7;">Mit PDF-Anhang · von: ' + smtpCfg.user + '</small></div>';
      if (typeof bvToast === 'function') bvToast('Brief als PDF versendet ✅', 'success');
      setTimeout(function(){ if(typeof bvCloseDrawer==='function') bvCloseDrawer(); }, 2500);
    } else if (data.code === 'SMTP_NOT_CONFIGURED') {
      if (result) result.innerHTML = '<div style="padding:12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;font-size:12px;color:#b45309;">⚙️ <a href="einstellungen.html#email" style="color:#f59e0b;font-weight:600;">E-Mail-Versand einrichten</a></div>';
    } else {
      if (result) result.innerHTML = '<div style="padding:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;font-size:12px;color:#ef4444;">❌ ' + (data.error || 'Fehler beim PDF-Versand') + '</div>';
    }
  } catch(e) {
    if (result) result.innerHTML = '<div style="padding:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;font-size:12px;color:#ef4444;">Netzwerkfehler: ' + e.message + '</div>';
  }

  if (btn) { btn.disabled = false; btn.textContent = '📎 Als PDF senden'; }
};

