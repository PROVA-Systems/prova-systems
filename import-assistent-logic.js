/* ════════════════════════════════════════════════════════════
   PROVA import-assistent-logic.js
   Import-Assistent — Daten-Import, Mapping
   Extrahiert aus import-assistent.html
════════════════════════════════════════════════════════════ */

// ============================================================
// SOFTWARE-DEFINITIONEN
// ============================================================
var SOFTWARE = [
  {
    id:'gm', name:'Gutachten Manager', icon:'🗂', sub:'Version 12+', badge:'Häufigster Wechsel',
    badgeColor:'rgba(16,185,129,.15)', badgeText:'#6ee7b7',
    anleitungen:{
      kontakte:'<strong>Gutachten Manager → Auftraggeber → Liste</strong> → Alle markieren → <code>Exportieren</code> → <code>CSV-Datei</code> → Speichern. Semikolon-getrennt, Windows-1252.',
      faelle:'<strong>GM → Aufträge → Liste</strong> → Alle markieren → <code>Exportieren</code> → <code>CSV-Datei</code>. Enthält Aktenzeichen, Schadensart, Datum, Status.',
      rechnungen:'<strong>GM → Rechnungen → Liste</strong> → Alle markieren → <code>Exportieren</code> → <code>CSV</code>. Enthält Rechnungsnummer, Betrag, Datum, Status.',
      textbausteine:'<strong>GM → Extras → Textbausteine</strong> → <code>Exportieren</code> → <code>TXT-Datei</code>. Je nach GM-Version auch als Word-Dokument exportierbar.',
    }
  },
  {
    id:'bauexpert', name:'Bauexpert 2022', icon:'🏗', sub:'Sirados-basiert', badge:'',
    anleitungen:{
      kontakte:'<strong>Bauexpert → Stammdaten → Auftraggeber</strong> → <code>Datei → Exportieren</code> → CSV. Spalten: Name, Adresse, Telefon, Email, Typ.',
      faelle:'<strong>Bauexpert → Aufträge</strong> → <code>Extras → Export</code> → CSV mit Grunddaten. Gutachtentexte sind nur als PDF verfügbar.',
      rechnungen:'<strong>Bauexpert → Rechnungen</strong> → <code>Datei → Export</code> → CSV oder Excel (.xlsx).',
      textbausteine:'<strong>Bauexpert → Extras → Textbausteine</strong> → Als TXT exportieren (eine Zeile = ein Baustein).',
    }
  },
  {
    id:'outlook', name:'Outlook / Exchange', icon:'📧', sub:'Kontakte als vCard', badge:'',
    anleitungen:{
      kontakte:'<strong>Outlook → Kontakte</strong> → Alle markieren (Strg+A) → <code>Datei → Exportieren → vCard</code>. Alternativ: <code>Datei → Öffnen → Importieren/Exportieren → In CSV exportieren</code>.',
      faelle:'Nicht verfügbar — Aufträge in Outlook haben kein Standardformat für den Export.',
      rechnungen:'Falls Rechnungen in Excel gepflegt: <code>Speichern unter → CSV (Semikolon-getrennt)</code>.',
      textbausteine:'Textblöcke aus Word: Jede Vorlage als eigene .txt-Datei speichern, dann zusammen in eine CSV-Datei kopieren.',
    }
  },
  {
    id:'excel', name:'Excel / Tabelle', icon:'📊', sub:'Eigene Listen', badge:'',
    anleitungen:{
      kontakte:'In Excel: <code>Datei → Speichern unter → CSV (Trennzeichen-getrennt)</code>. Pflichtfeld: Spalte "Name". Weitere Spalten werden automatisch erkannt.',
      faelle:'Fälle-Tabelle: <code>Datei → Speichern unter → CSV</code>. Pflichtfeld: "Aktenzeichen" oder "Auftragsnummer".',
      rechnungen:'Rechnungs-Tabelle als CSV exportieren. Pflichtfelder: Rechnungsnummer, Betrag, Datum.',
      textbausteine:'Eine Zeile pro Textbaustein, in Spalte A der Titel, in Spalte B der Text. Als CSV speichern.',
    }
  },
  {
    id:'google', name:'Google Contacts', icon:'📇', sub:'iPhone / Android', badge:'',
    anleitungen:{
      kontakte:'<strong>contacts.google.com</strong> → Alle auswählen → <code>Exportieren</code> → <code>Google CSV</code> oder <code>vCard</code>. Beide Formate werden unterstützt.',
      faelle:'Google Contacts enthält keine Auftrags-/Falldaten.',
      rechnungen:'Falls in Google Sheets: <code>Datei → Herunterladen → CSV</code>.',
      textbausteine:'Nicht verfügbar über Google Contacts.',
    }
  },
  {
    id:'gutachtenagent', name:'GutachtenAgent', icon:'⚖️', sub:'Win-Version', badge:'',
    anleitungen:{
      kontakte:'<strong>GutachtenAgent → Stammdaten → Auftraggeber</strong> → <code>Datei → Exportieren → CSV</code>.',
      faelle:'<strong>GutachtenAgent → Aufträge → Alle Aufträge</strong> → <code>Exportieren</code> → CSV-Format wählen.',
      rechnungen:'<strong>GutachtenAgent → Abrechnung</strong> → Rechnungsübersicht → <code>Export</code>.',
      textbausteine:'<strong>Extras → Textbausteine</strong> → Als TXT-Datei exportieren.',
    }
  },
  {
    id:'sonstiges', name:'Sonstige Software', icon:'🔧', sub:'CSV wird erkannt', badge:'',
    anleitungen:{
      kontakte:'Exportieren Sie Ihre Kontakte als CSV-Datei. Pflichtfeld: Spalte mit dem Namen ("Name", "Firma", "Nachname" o.ä.). Weitere Spalten (Adresse, Email, Telefon) werden automatisch erkannt.',
      faelle:'Exportieren Sie Ihre Fälle/Aufträge als CSV. Pflichtfeld: Aktenzeichen oder Auftragsnummer.',
      rechnungen:'Rechnungen als CSV. Pflichtfelder: Rechnungsnummer und Betrag.',
      textbausteine:'Eine Textbaustein-Zeile pro Zeile in einer TXT-Datei, oder Titel;Text in CSV.',
    }
  },
];

// ============================================================
// STATE
// ============================================================
var _selectedSw = null;
var _files = { kontakte: null, faelle: null, rechnungen: null, textbausteine: null };
var _skipped = { kontakte: false, faelle: false, rechnungen: false, textbausteine: false };
var _parsed = { kontakte: [], faelle: [], rechnungen: [], textbausteine: [] };
var _result = { kontakte: 0, faelle: 0, rechnungen: 0, textbausteine: 0, fehler: [] };

// ============================================================
// SCHRITT 1 — SOFTWARE
// ============================================================
function renderSoftwareGrid() {
  var grid = document.getElementById('sw-grid');
  grid.innerHTML = SOFTWARE.map(function(sw) {
    return '<div class="sw-card" id="sw-'+sw.id+'" onclick="selectSw(\''+sw.id+'\')">'+
      '<div class="sw-icon">'+sw.icon+'</div>'+
      '<div class="sw-name">'+sw.name+'</div>'+
      '<div class="sw-sub">'+sw.sub+'</div>'+
      (sw.badge?'<div class="sw-badge" style="background:'+sw.badgeColor+';color:'+sw.badgeText+';">'+sw.badge+'</div>':'')+
    '</div>';
  }).join('');
}

function selectSw(id) {
  _selectedSw = SOFTWARE.find(function(s){return s.id===id;});
  document.querySelectorAll('.sw-card').forEach(function(c){c.classList.remove('selected');});
  document.getElementById('sw-'+id).classList.add('selected');
  document.getElementById('btn-s1-weiter').disabled = false;
}

// ============================================================
// SCHRITT 2 — UPLOAD
// ============================================================
function aktualisiereAnleitungen() {
  if (!_selectedSw) return;
  document.getElementById('s2-swname').textContent = _selectedSw.name;
  var anl = _selectedSw.anleitungen;
  ['kontakte','faelle','rechnungen','textbausteine'].forEach(function(k) {
    var el = document.getElementById('anl-'+k);
    if (el) el.innerHTML = anl[k] || '';
  });
}

function handleDrop(e, kategorie) {
  e.preventDefault();
  document.getElementById('dz-'+kategorie).classList.remove('drag');
  var f = e.dataTransfer.files[0];
  if (f) handleFile(f, kategorie);
}

function handleFile(file, kategorie) {
  if (!file) return;
  _files[kategorie] = file;
  _skipped[kategorie] = false;
  var dz = document.getElementById('dz-'+kategorie);
  dz.classList.add('done');
  dz.innerHTML = '<div class="dz-icon">✅</div><div class="dz-done">'+escH(file.name)+'</div><div class="dz-badge">'+formatBytes(file.size)+' · bereit</div>';
  updateStep2Btn();
}

function skipSection(kategorie) {
  _skipped[kategorie] = true;
  _files[kategorie] = null;
  var dz = document.getElementById('dz-'+kategorie);
  dz.className = 'drop-zone';
  dz.innerHTML = '<div class="dz-icon">⏭</div><div class="dz-title" style="color:var(--text3);">Übersprungen</div><div class="dz-sub"><span onclick="unskipSection(\''+kategorie+'\')" style="cursor:pointer;color:var(--accent);">Rückgängig</span></div>';
  updateStep2Btn();
}

function unskipSection(kategorie) {
  _skipped[kategorie] = false;
  var dz = document.getElementById('dz-'+kategorie);
  dz.className = 'drop-zone';
  dz.onclick = function(){document.getElementById('f-'+kategorie).click();};
  dz.innerHTML = '<input type="file" id="f-'+kategorie+'" accept=".csv,.vcf,.txt,.xlsx" onchange="handleFile(this.files[0],\''+kategorie+'\')"><div class="dz-icon">📊</div><div class="dz-title">Datei hochladen</div><div class="dz-sub">.csv · Drag & Drop möglich</div>';
  updateStep2Btn();
}

function updateStep2Btn() {
  var hasAny = Object.keys(_files).some(function(k){return _files[k]!==null;}) ||
               Object.keys(_skipped).some(function(k){return _skipped[k];});
  document.getElementById('btn-s2-weiter').disabled = !hasAny;
}

// ============================================================
// SCHRITT 3 — PARSEN + VORSCHAU
// ============================================================
function parseAlles() {
  var promises = [];
  ['kontakte','faelle','rechnungen','textbausteine'].forEach(function(k) {
    if (_files[k]) promises.push(leseFile(_files[k], k));
  });
}

function leseFile(file, kategorie) {
  return new Promise(function(resolve) {
    // PDF und Word: als Archiv-Eintrag importieren (Metadaten, kein Volltext)
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf') ||
      file.type.includes('wordprocessingml') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
    if (kat === 'faelle') {
      var archivEintrag = {
        aktenzeichen: file.name.replace(/\.(pdf|docx?|txt)$/i, '').replace(/[_\s]+/g,' ').trim(),
        schadenart: '',
        status: 'Archiviert (Import)',
        auftraggeber: '',
        schadensdatum: new Date().toISOString().split('T')[0],
        import_dateiname: file.name,
        import_typ: file.type.includes('pdf') ? 'PDF' : 'Word',
        import_datum: new Date().toISOString(),
        _sel: true
      };
      if (!_parsed.faelle) _parsed.faelle = [];
      _parsed.faelle.push(archivEintrag);
      renderVorschau();
      return;
    }
  }
  var reader = new FileReader();
    reader.onload = function(e) {
      var text = e.target.result;
      if (kategorie === 'kontakte' && file.name.toLowerCase().endsWith('.vcf')) {
        _parsed.kontakte = parseVcf(text);
      } else if (kategorie === 'textbausteine' && file.name.toLowerCase().endsWith('.txt')) {
        _parsed.textbausteine = parseTxt(text);
      } else {
        var rows = parseCsv(text);
        if (kategorie === 'kontakte') _parsed.kontakte = mapKontakte(rows);
        else if (kategorie === 'faelle') _parsed.faelle = mapFaelle(rows);
        else if (kategorie === 'rechnungen') _parsed.rechnungen = mapRechnungen(rows);
        else if (kategorie === 'textbausteine') _parsed.textbausteine = mapTextbausteine(rows);
      }
      resolve();
    };
    reader.readAsText(file, 'utf-8');
  });
}

// ── CSV Parser (universal) ──
function parseCsv(text) {
  var delim = text.split('\n')[0].includes(';') ? ';' : ',';
  var lines = text.split('\n').map(function(l){return l.trim();}).filter(Boolean);
  if (lines.length < 2) return [];
  var headers = splitLine(lines[0], delim).map(function(h){return h.replace(/^["']|["']$/g,'').trim().toLowerCase();});
  return lines.slice(1).map(function(line){
    var cols = splitLine(line, delim);
    var obj = {}; headers.forEach(function(h,i){ obj[h] = (cols[i]||'').replace(/^["']|["']$/g,'').trim(); });
    return obj;
  }).filter(function(r){ return Object.values(r).some(function(v){return v;}); });
}

function splitLine(line, delim) {
  var result=[],cur='',inQ=false;
  for(var i=0;i<line.length;i++){var c=line[i];if(c==='"'){inQ=!inQ;}else if(c===delim&&!inQ){result.push(cur);cur='';}else cur+=c;}
  result.push(cur); return result;
}

// ── Fuzzy-Mapping Kontakte ──
function mapKontakte(rows) {
  var ALT = {
    name:['name','nachname','firma','firmenname','company','organization','organisation','bezeichnung'],
    vorname:['vorname','firstname','givenname','first name'],
    firma:['firma','unternehmen','company','kanzlei','organization'],
    strasse:['straße','strasse','adresse','address','street','str.'],
    plz:['plz','postleitzahl','zip','postal','postcode'],
    ort:['ort','stadt','city','place'],
    telefon:['telefon','tel','phone','fon','festnetz','telefonnummer'],
    email:['email','e-mail','mail','e_mail'],
    typ:['typ','kategorie','type','category','auftraggeber_typ'],
  };
  return rows.map(function(r) {
    var get=function(f){return (r[ALT[f].find(function(a){return r.hasOwnProperty(a);})||'']||'').trim();};
    var name=get('name'); if(!name)return null;
    return {_sel:true,name:name,vorname:get('vorname'),firma:get('firma'),
      strasse:get('strasse'),plz:get('plz'),ort:get('ort'),
      telefon:get('telefon'),email:get('email'),typ:mapTyp(get('typ')),import_quelle:'CSV-Import'};
  }).filter(Boolean);
}

// ── Fuzzy-Mapping Fälle ──
function mapFaelle(rows) {
  var ALT = {
    aktenzeichen:['aktenzeichen','auftragsnummer','auftrag_nr','auftrags_nr','nr','id','fallnummer'],
    schadenart:['schadensart','schadenart','schadentyp','art','damage_type','schaden'],
    schadensdatum:['schadensdatum','schadens_datum','datum','damage_date','date','unfalldatum'],
    adresse:['adresse','strasse','schaden_strasse','straße','adress','address','objekt'],
    auftraggeber:['auftraggeber','auftraggeber_name','versicherung','client','customer','auftraggeber name'],
    status:['status','state','zustand'],
  };
  return rows.map(function(r) {
    var get=function(f){return (r[ALT[f].find(function(a){return r.hasOwnProperty(a);})||'']||'').trim();};
    var az=get('aktenzeichen'); if(!az)return null;
    return {_sel:true,aktenzeichen:az,schadenart:get('schadenart'),
      schadensdatum:get('schadensdatum'),adresse:get('adresse'),
      auftraggeber:get('auftraggeber'),status:get('status')||'Archiviert'};
  }).filter(Boolean);
}

// ── Fuzzy-Mapping Rechnungen ──
function mapRechnungen(rows) {
  var ALT = {
    rechnungsnummer:['rechnungsnummer','rechnung_nr','rechnungs_nr','invoice','nr','id'],
    betrag:['betrag','netto','nettobetrag','amount','summe','gesamt','brutto'],
    datum:['datum','rechnungsdatum','date','invoice_date'],
    empfaenger:['empfaenger','empfänger','auftraggeber','kunde','client','name'],
    status:['status','zahlungsstatus','bezahlt','paid'],
  };
  return rows.map(function(r) {
    var get=function(f){return (r[ALT[f].find(function(a){return r.hasOwnProperty(a);})||'']||'').trim();};
    var nr=get('rechnungsnummer'); if(!nr)return null;
    var betrag=parseFloat((get('betrag')||'0').replace(',','.').replace(/[^0-9.]/g,''))||0;
    return {_sel:true,rechnungsnummer:nr,betrag:betrag,datum:get('datum'),
      empfaenger:get('empfaenger'),status:get('status')||'Offen'};
  }).filter(Boolean);
}

// ── vCard Parser ──
function parseVcf(text) {
  return text.split(/BEGIN:VCARD/i).filter(function(v){return v.trim();}).map(function(vc){
    var get=function(key){var m=vc.match(new RegExp('^'+key+'[^:]*:(.*)','im'));return m?m[1].replace(/\\n/g,'\n').trim():'';};
    var fn=get('FN')||get('N').split(';').reverse().filter(Boolean).join(' ');
    if(!fn)return null;
    var parts=fn.split(' '); var vor=parts.length>1?parts[0]:''; var name=parts.length>1?parts.slice(1).join(' '):fn;
    var adr=get('ADR').split(';');
    return {_sel:true,name:name,vorname:vor,firma:get('ORG').split(';')[0],
      strasse:adr[2]||'',plz:adr[5]||'',ort:adr[3]||'',
      telefon:get('TEL'),email:get('EMAIL'),typ:'Sonstiges',import_quelle:'vCard-Import'};
  }).filter(Boolean);
}

// ── TXT Parser (Textbausteine) ──
function parseTxt(text) {
  return text.split('\n').map(function(l){return l.trim();}).filter(Boolean).map(function(line,i){
    var parts=line.split(';');
    return {_sel:true,titel:parts[0]||('Baustein '+(i+1)),text:parts[1]||line,kat:'befund'};
  });
}

// ── Textbausteine aus CSV ──
function mapTextbausteine(rows) {
  return rows.map(function(r,i){
    var titel=r['titel']||r['name']||r['bezeichnung']||('Baustein '+(i+1));
    var text=r['text']||r['inhalt']||r['baustein']||r['content']||Object.values(r)[1]||'';
    if(!text)return null;
    return {_sel:true,titel:titel,text:text,kat:r['kategorie']||r['kat']||'befund'};
  }).filter(Boolean);
}

function mapTyp(raw) {
  var r=(raw||'').toLowerCase();
  if(r.includes('versicher'))return 'Versicherung';
  if(r.includes('anwalt')||r.includes('rechts')||r.includes('kanzlei'))return 'Anwalt';
  if(r.includes('gericht'))return 'Gericht';
  if(r.includes('hausverwalt'))return 'Hausverwaltung';
  if(r.includes('bauherr')||r.includes('eigentümer'))return 'Bauherr';
  if(r.includes('privat')||r.includes('person'))return 'Privatperson';
  return 'Sonstiges';
}

// ── Vorschau rendern ──
function renderVorschau() {
  var tabs=document.getElementById('preview-tabs');
  var panes=document.getElementById('preview-panes');
  tabs.innerHTML=''; panes.innerHTML='';
  var kategorien=[
    {id:'kontakte',label:'👥 Kontakte',cols:['name','typ','email','ort']},
    {id:'faelle',label:'📂 Fälle',cols:['aktenzeichen','schadenart','auftraggeber','status']},
    {id:'rechnungen',label:'🧾 Rechnungen',cols:['rechnungsnummer','empfaenger','betrag','datum']},
    {id:'textbausteine',label:'📝 Bausteine',cols:['titel','text']},
  ];
  var first=true;
  kategorien.forEach(function(kat) {
    var rows=_parsed[kat.id];
    if(!rows||!rows.length) return;
    var isFirst=first; first=false;
    // Tab
    var btn=document.createElement('button');
    btn.className='ptab'+(isFirst?' active':'');
    btn.textContent=kat.label+' ('+rows.length+')';
    btn.onclick=function(){
      document.querySelectorAll('.ptab').forEach(function(b){b.classList.remove('active');});
      document.querySelectorAll('.ptab-pane').forEach(function(p){p.classList.remove('active');});
      btn.classList.add('active');
      document.getElementById('pp-'+kat.id).classList.add('active');
    };
    tabs.appendChild(btn);
    // Pane
    var pane=document.createElement('div');
    pane.className='ptab-pane'+(isFirst?' active':'');
    pane.id='pp-'+kat.id;
    var gridCols='28px '+kat.cols.map(function(){return '1fr';}).join(' ');
    var head='<div class="preview-head" style="grid-template-columns:'+gridCols+'"><div></div>'+
      kat.cols.map(function(c){return '<div>'+c+'</div>';}).join('')+'</div>';
    var bodyRows=rows.slice(0,200).map(function(r,i){
      var cells=kat.cols.map(function(c){
        var v=r[c];
        if(c==='betrag')v=(v||0).toLocaleString('de-DE',{minimumFractionDigits:2})+'€';
        return '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2);">'+escH(String(v||'—'))+'</div>';
      }).join('');
      return '<div class="preview-row" style="grid-template-columns:'+gridCols+'">'+
        '<input type="checkbox" class="preview-cb" '+(r._sel?'checked':'')+' onchange="_parsed.'+kat.id+'['+i+']._sel=this.checked;updateSelCount(\''+kat.id+'\')">'+
        cells+'</div>';
    }).join('');
    if(rows.length>200)bodyRows+='<div style="padding:10px 14px;font-size:11px;color:var(--text3);">… und '+(rows.length-200)+' weitere</div>';
    var sel=rows.filter(function(r){return r._sel;}).length;
    pane.innerHTML='<div class="preview-table-wrap">'+head+'<div class="preview-scroll">'+bodyRows+'</div>'+
      '<div class="sel-bar"><label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);cursor:pointer;">'+
      '<input type="checkbox" checked onchange="toggleAlle(\''+kat.id+'\',this.checked)" style="accent-color:var(--accent);">Alle</label>'+
      '<span class="sel-count" id="sc-'+kat.id+'">'+sel+' / '+rows.length+' ausgewählt</span></div></div>';
    panes.appendChild(pane);
  });
  if(first){
    panes.innerHTML='<div class="no-data">Keine Daten erkannt — bitte Dateien erneut hochladen</div>';
  }
}

function toggleAlle(kat, val) {
  _parsed[kat].forEach(function(r){r._sel=val;});
  updateSelCount(kat);
  var pane=document.getElementById('pp-'+kat);
  if(pane){pane.querySelectorAll('.preview-cb').forEach(function(cb){cb.checked=val;});}
}
function updateSelCount(kat){
  var el=document.getElementById('sc-'+kat);
  if(el){var s=_parsed[kat].filter(function(r){return r._sel;}).length;el.textContent=s+' / '+_parsed[kat].length+' ausgewählt';}
}

// ============================================================
// SCHRITT 4 — IMPORT
// ============================================================
function importAlles() {
  // KONTAKTE — localStorage + Airtable
  var svEmail = localStorage.getItem('prova_sv_email') || '';
  var kontakteImport=_parsed.kontakte.filter(function(r){return r._sel;});
  var vorhandene=JSON.parse(localStorage.getItem('prova_kontakte')||'[]');
  var neuK=0,dupK=0;
  var AT_BASE_K = 'appJ7bLlAHZoxENWE';
  var AT_KONTAKTE = 'tblMKmPLjRelr6Hal';
  kontakteImport.forEach(function(r){
    var dup=vorhandene.find(function(k){return k.name.toLowerCase()===r.name.toLowerCase()&&(!r.email||k.email===r.email);});
    if(dup){dupK++;return;}
    var newK = Object.assign({id:genId(),erstellt:new Date().toISOString(),faelle_anzahl:0},r);
    vorhandene.unshift(newK);
    neuK++;
    // Airtable-Sync
    if (svEmail) {
      fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          method: 'POST',
          path: '/v0/' + AT_BASE_K + '/' + AT_KONTAKTE,
          payload: { records: [{ fields: {
            Name:           r.name || '',
            Vorname:        r.vorname || '',
            Typ:            r.typ || 'Sonstiges',
            Firma:          r.firma || '',
            Strasse:        r.strasse || '',
            PLZ:            String(r.plz || ''),
            Ort:            r.ort || '',
            Telefon:        r.telefon || '',
            Email:          r.email || '',
            Notizen:        r.notizen || '',
            Import_Quelle:  _selectedSw ? _selectedSw.id : 'Import',
            sv_email:       svEmail
          }}]}
        })
      }).catch(function(e){ console.warn('[Import] Kontakt Airtable sync:', e); });
    }
  });
  localStorage.setItem('prova_kontakte',JSON.stringify(vorhandene));
  _result.kontakte=neuK;

  // FÄLLE (localStorage prova_archiv_import)
  var faelleImport=_parsed.faelle.filter(function(r){return r._sel;});
  var vorhandenF=JSON.parse(localStorage.getItem('prova_archiv_import')||'[]');
  var neuF=0;
  faelleImport.forEach(function(r){
    var dup=vorhandenF.find(function(f){return f.aktenzeichen===r.aktenzeichen;});
    if(!dup){vorhandenF.unshift(Object.assign({id:genId(),importiert:new Date().toISOString()},r));neuF++;}
  });
  localStorage.setItem('prova_archiv_import',JSON.stringify(vorhandenF));
  _result.faelle=neuF;

  // RECHNUNGEN (localStorage prova_rechnungen_import)
  var rechnImport=_parsed.rechnungen.filter(function(r){return r._sel;});
  var vorhandenR=JSON.parse(localStorage.getItem('prova_rechnungen_import')||'[]');
  var neuR=0;
  rechnImport.forEach(function(r){
    var dup=vorhandenR.find(function(x){return x.rechnungsnummer===r.rechnungsnummer;});
    if(!dup){vorhandenR.unshift(Object.assign({id:genId(),importiert:new Date().toISOString()},r));neuR++;}
  });
  localStorage.setItem('prova_rechnungen_import',JSON.stringify(vorhandenR));
  _result.rechnungen=neuR;

  // TEXTBAUSTEINE
  var tbImport=_parsed.textbausteine.filter(function(r){return r._sel;});
  var vorhandenTB=JSON.parse(localStorage.getItem('prova_textbausteine')||'[]');
  var neuTB=0;
  tbImport.forEach(function(r){
    vorhandenTB.unshift(Object.assign({id:genId(),erstellt:new Date().toISOString(),verwendungen:0},r));
    neuTB++;
  });
  localStorage.setItem('prova_textbausteine',JSON.stringify(vorhandenTB));
  _result.textbausteine=neuTB;

  // Migrations-Flag setzen
  localStorage.setItem('prova_migration_done',new Date().toISOString());
  localStorage.setItem('prova_migration_sw',_selectedSw?_selectedSw.id:'');

  // Airtable-Sync: Importierte Fälle nach Airtable schreiben
  var svEmail = localStorage.getItem('prova_sv_email') || '';
  var AT_BASE = 'appJ7bLlAHZoxENWE';
  var AT_FAELLE = 'tblSxV8bsXwd1pwa0';
  var faelleZuSync = _parsed.faelle.filter(function(r){return r._sel;}); // kein Limit mehr
  if (svEmail && faelleZuSync.length) {
    faelleZuSync.forEach(function(f) {
      try {
        // Duplikat-Check: Aktenzeichen bereits vorhanden?
      var checkFilter = encodeURIComponent('AND({Aktenzeichen}="' + (f.aktenzeichen||'') + '",{sv_email}="' + svEmail + '")');
      fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({method:'GET', path:'/v0/'+AT_BASE+'/'+AT_FAELLE+'?filterByFormula='+checkFilter+'&maxRecords=1'})
      }).then(function(r){return r.json();}).then(function(d){
        if (d.records && d.records.length > 0) { console.log('[Import] Duplikat übersprungen:', f.aktenzeichen); return; }
        // Kein Duplikat → schreiben
        fetch('/.netlify/functions/airtable', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            method: 'POST',
            path: '/v0/' + AT_BASE + '/' + AT_FAELLE,
            payload: { records: [{fields: {
              Aktenzeichen: f.aktenzeichen || '',
              Schadensart:  f.schadenart || '',
              Status:       f.status || 'Archiviert',
              Auftraggeber_Name: f.auftraggeber || '',
              sv_email:     svEmail,
              Timestamp:    f.schadensdatum || new Date().toISOString(),
              Import_Quelle: _selectedSw ? _selectedSw.id : 'Import'
            }}]}
          })
        }).catch(function(e){ console.warn('Airtable sync:', e); }); }).catch(function(){});
      } catch(e){}
    });
    _result.faelle_synced = faelleZuSync.length;
  }

  goStep(4);
  renderErgebnis();
}

function renderErgebnis() {
  var grid=document.getElementById('result-grid');
  var items=[
    {icon:'👥',val:_result.kontakte,label:'Kontakte',sub:'in prova_kontakte'},
    {icon:'📂',val:_result.faelle,label:'Fälle',sub:_result.faelle_synced?'inkl. '+_result.faelle_synced+' in Airtable':'in localStorage'},
    {icon:'🧾',val:_result.rechnungen,label:'Rechnungen',sub:'in rechnungen.html'},
    {icon:'📝',val:_result.textbausteine,label:'Textbausteine',sub:'in textbausteine.html'},
  ];
  grid.innerHTML=items.map(function(it){
    return '<div class="result-card"><div class="result-icon">'+it.icon+'</div>'+
      '<div class="result-val">'+it.val+'</div>'+
      '<div class="result-label">'+it.label+'</div>'+
      '</div>';
  }).join('');
}

function nochmalImportieren() {
  _files={kontakte:null,faelle:null,rechnungen:null,textbausteine:null};
  _skipped={kontakte:false,faelle:false,rechnungen:false,textbausteine:false};
  _parsed={kontakte:[],faelle:[],rechnungen:[],textbausteine:[]};
  goStep(2);
}

// ============================================================
// NAVIGATION
// ============================================================
var _currentStep=1;
function goStep(n) {
  document.querySelectorAll('.step-panel').forEach(function(p){p.classList.remove('active');});
  document.getElementById('step-'+n).classList.add('active');
  _currentStep=n;
  updateProgress(n);
  if(n===2) aktualisiereAnleitungen();
  if(n===3) {
    // Dateien async parsen dann rendern
    var ps=[];
    ['kontakte','faelle','rechnungen','textbausteine'].forEach(function(k){
      if(_files[k]) ps.push(leseFile(_files[k],k));
    });
    Promise.all(ps).then(function(){ renderVorschau(); });
  }
  window.scrollTo(0,0);
}

function updateProgress(n) {
  for(var i=1;i<=4;i++){
    var dot=document.getElementById('dot-'+i);
    var lbl=document.getElementById('lbl-'+i);
    dot.className='step-dot '+(i<n?'done':i===n?'active':'pending');
    dot.textContent=i<n?'✓':i;
    if(lbl){lbl.className='step-label '+(i<n?'done':i===n?'active':'');}
    if(i<4){var line=document.getElementById('line-'+i);if(line)line.className='step-line '+(i<n?'done':'');}
  }
}

// ============================================================
// HELPERS
// ============================================================
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
function escH(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function formatBytes(b){if(b<1024)return b+' B';if(b<1024*1024)return (b/1024).toFixed(0)+' KB';return (b/(1024*1024)).toFixed(1)+' MB';}

window.showToast = window.showToast || window.zeigToast || function(m){ alert(m); };

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded',function(){
  renderSoftwareGrid();
  document.getElementById('btn-s2-weiter').disabled=true;

  // Falls bereits migriert: Hinweis
  var done=localStorage.getItem('prova_migration_done');
  var sw=localStorage.getItem('prova_migration_sw');
  if(done&&sw){
    var swObj=SOFTWARE.find(function(s){return s.id===sw;});
    var banner=document.createElement('div');
    banner.style.cssText='background:var(--green-bg);border:1px solid var(--green-border);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--green);';
    banner.innerHTML='✅ Zuletzt migriert: <strong>'+(swObj?swObj.name:sw)+'</strong> am '+new Date(done).toLocaleDateString('de-DE')+
      ' — <span onclick="this.closest(\'div\').remove()" style="cursor:pointer;opacity:.7;">✕</span>';
    document.querySelector('.main').insertBefore(banner,document.getElementById('step-1'));
  }
});