/* ════════════════════════════════════════════════════════════
   PROVA akte-logic.js
   Akte — Airtable-Record, Timeline, Dokumente
   Extrahiert aus akte.html
════════════════════════════════════════════════════════════ */

(function(){
'use strict';

var AT_BASE=(window.PROVA_CONFIG && window.PROVA_CONFIG.AIRTABLE_BASE) || 'appJ7bLlAHZoxENWE';
var AT_FAELLE='tblSxV8bsXwd1pwa0';
var AT_TERMINE='tblyMTTdtfGQjjmc2';

/* ─── SETUP ─── */
var paket=localStorage.getItem('prova_paket')||'Solo';
var pc={'Solo':'#4f8ef7','Team':'#a78bfa'}[paket]||'#4f8ef7';
(function(){
  var el=document.getElementById('topbar-paket-badge');
  if(el){el.style.display='none';} // Paket steht in Sidebar unten
})();
// Cutover-Block-3 (01.05.2026): provaAuthGuard ist nach Migration nicht mehr global verfuegbar.
// lib/auth-guard.js runAuthGuard wird ueber den Module-Tag in akte.html aufgerufen.
if (typeof provaAuthGuard === 'function') { provaAuthGuard(); }

/* ─── RECORD LADEN ─── */
var recordId=sessionStorage.getItem('prova_record_id')||new URLSearchParams(window.location.search).get('id')||'';
var aktenzeichen=new URLSearchParams(window.location.search).get('az')||'';
var currentRecord=null;
var currentFields={};

// MEGA⁷²-Phase-B-mini: Adapter-Lib (DRY — extrahiert aus Phase-A-Inline-Duplikat).
// Siehe lib/prova-supabase-adapters.js + docs/CLEANUP-FIELD-MAPPING.md.
var _ad = null;
async function _ensureAdapters(){
  if (_ad) return _ad;
  try { _ad = await import('/lib/prova-supabase-adapters.js'); }
  catch(e){ console.warn('[akte-logic] adapters-lib import failed', e); }
  return _ad;
}
async function _getSupabase(){ var a = await _ensureAdapters(); return a ? await a.getSupabase() : null; }
function _supabaseRowToFields(row){ return _ad ? _ad.auftragRowToFields(row) : {}; }

async function ladeRecord(){
  var sb = await _getSupabase();
  if (!sb) { zeigNotFound(); return; }

  // Wenn nur az= übergeben (kein Record-ID) → per Aktenzeichen lookup
  if(!recordId && aktenzeichen){
    try{
      var lookup = await sb.from('auftraege')
        .select('id').eq('az', aktenzeichen).is('deleted_at', null).maybeSingle();
      if(lookup.data && lookup.data.id){
        recordId = lookup.data.id;
        sessionStorage.setItem('prova_record_id', recordId);
      }
    }catch(e){console.warn('AZ-Lookup Fehler:',e);}
  }
  if(!recordId){zeigNotFound();return;}
  try{
    // Vollständiger Auftrag-Load (alle Spalten die renderAkte/renderTimeline brauchen)
    var res = await sb.from('auftraege')
      .select('id, az, titel, status, phase_aktuell, phase_max, typ, zweck, fragestellung, schadensart_label, schadensart_kategorie, schadensstichtag, auftragsdatum, gutachtendatum, objekt, details, auftraggeber_typ, auftraggeber_kontakt_id, fachurteil_text, fachurteil_eigenleistung_chars, kurzbeantwortung, grenzen_sachkunde, kosten_geschaetzt_netto, kosten_geschaetzt_brutto, ki_anzeige_datum, ki_anzeige_empfaenger, umfang_seiten, umfang_anlagen, umfang_fotos, tags, is_demo, parent_auftrag_id, created_by_user_id, assigned_to_user_id, created_at, updated_at, abgeschlossen_am, archiviert_am')
      .eq('id', recordId).is('deleted_at', null).maybeSingle();
    if(res.error) throw new Error(res.error.message);
    if(!res.data){zeigNotFound();return;}
    currentRecord = res.data;
    currentFields = _supabaseRowToFields(res.data);
    renderAkte();
    // Termine laden (Supabase)
    ladeTermine();
  }catch(e){
    console.warn('Akte laden Fehler (Supabase):', e.message || e);
    // Defensive Fallback: aus localStorage-Cache
    var cache=[];try{cache=JSON.parse(localStorage.getItem('prova_archiv_cache_v2')||'{"data":[]}').data||[];}catch(e2){}
    var local=cache.find(function(r){return r.id===recordId;});
    if(local){
      currentRecord=local;
      // Cache könnte Airtable-Style ODER Supabase-Style sein — versuche beide
      currentFields = local.fields ? local.fields : _supabaseRowToFields(local);
      renderAkte();
    } else { zeigNotFound(); }
  }
}

/* ─── AKTE RENDERN ─── */
function renderAkte(){
  var f=currentFields;
  var az=f.Aktenzeichen||recordId.slice(-6).toUpperCase();
  var schadenart=f.Schadensart||f.schadenart||f.Schadensart||'Schadenfall';
  var adresse=f.Schaden_Strasse||[f.Schaden_Strasse,f.Ort].filter(Boolean).join(', ')||'—';
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
    {label:'Schadensart',value:schadenart},
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

  // Session 30: Globale Refs für Phase-Handler in der Timeline
  window._currentAkteId = recordId;
  window._currentAkteFields = f;

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

  // MEGA⁸² E.1: Kontextueller Gutachten-CTA-Text
  try { window.updateGutachtenCTAButton && window.updateGutachtenCTAButton(f); } catch(_) {}
  // MEGA⁸² B.7: Status-Badge auto-render
  try { window.renderAkteStatusBadge && window.renderAkteStatusBadge(f); } catch(_) {}
  // MEGA⁸² B.5: Sticky-Footer rendern
  try { window.renderAkteStickyFooter && window.renderAkteStickyFooter(f); } catch(_) {}
  // MEGA⁸³ A.2: Phase-Stepper visuell rendern
  try { window.renderAktePhaseStepper && window.renderAktePhaseStepper(f); } catch(_) {}
  // MEGA⁸³ A.3: Stammdaten-Bar rendern
  try { window.renderStammdatenBar && window.renderStammdatenBar(f); } catch(_) {}
  // MEGA⁸³ A.6: Phase-Checklist mit Smart-Detection
  try { window.renderPhaseChecklist && window.renderPhaseChecklist(f); } catch(_) {}
  // MEGA⁸³ A.5: Activity-Sidebar (5 Sub-Blocks parallel)
  try { window.renderActivitySidebar && window.renderActivitySidebar(f); } catch(_) {}

  // Anzeigen
  document.getElementById('loading-state').style.display='none';
  document.getElementById('akte-content').style.display='block';
}

/* ═══════════════════════════════════════════════════════════════════
   MEGA⁸² B.1 + C.1 — 4-Phasen-Stepper (neue Struktur, parallel zur alten)
   ═══════════════════════════════════════════════════════════════════
   Marcel-Direktive 16.05.: Akte zeigt 4 (Flow A/B) bzw. 3 (Flow C/D)
   Phasen. Phasen-Namen sind FINAL, keine Variation.
   Diese Struktur ersetzt SCHRITTWEISE die alte 9-Phasen-Liste unten.
   Die alte Struktur bleibt als Fallback bis akte.html-Layout (B.9) live.
═════════════════════════════════════════════════════════════════════ */

// Flow-Mapping aus DB-`auftrag_typ`-Enum auf 4 Flows (C.1)
window.getFlow = function getFlow(auftragTyp) {
  if (!auftragTyp) return 'A';
  var t = String(auftragTyp).toLowerCase();
  if (['schaden','beweis','ergaenzung','gegen','kurzstellungnahme','gericht'].indexOf(t) >= 0) return 'A';
  if (t === 'wertgutachten') return 'B';
  if (t === 'beratung') return 'C';
  if (t === 'baubegleitung') return 'D';
  if (t === 'schied') return 'A'; // Sonderfall: nutzt Flow-A-Pattern
  return 'A';
};

// 4-Phasen-Struktur pro Flow (B.1 + C.2/C.3/C.4)
window.AKTE_PHASEN_V2 = {
  A: [
    { n: 1, key: 'auftrag',   label: '1 Auftrag',   checklist: ['Stammdaten', 'Auftraggeber', 'opt. Auftragsbestätigung', 'opt. Honorar-Vereinbarung'] },
    { n: 2, key: 'termin',    label: '2 Termin',    checklist: ['Termin anlegen', 'Diktat', 'Fotos', 'Skizze', 'Messwerte'] },
    { n: 3, key: 'analyse',   label: '3 Analyse',   checklist: ['Recherche Normen/Bausteine', 'KI-Vorentwurf §§ 1–5', '§ 6 Fachurteil eigenhändig', '§ 7 Kosten', '§407a-Check'] },
    { n: 4, key: 'abschluss', label: '4 Abschluss', checklist: ['Freigabe', 'PDF erstellen', 'Versand', 'Rechnung (JVEG/Pauschal)'] }
  ],
  B: [
    { n: 1, key: 'auftrag',   label: '1 Auftrag',   checklist: ['Bewertungsanlass', 'Grundbuch-Daten', 'Verfahren-Vorauswahl', 'AG-Daten'] },
    { n: 2, key: 'objekt',    label: '2 Objekt',    checklist: ['Ortstermin', 'Objektdaten', 'Zustand', 'Fotos', 'Baulastenauskunft'] },
    { n: 3, key: 'bewertung', label: '3 Bewertung', checklist: ['Berechnung gewähltes Verfahren', 'Anpassungen', 'Plausibilitätscheck'] },
    { n: 4, key: 'abschluss', label: '4 Abschluss', checklist: ['Freigabe', 'PDF', 'Versand', 'Honorar'] }
  ],
  C: [
    { n: 1, key: 'auftrag',   label: '1 Auftrag',   checklist: ['Beratungsthema', 'AG-Daten', 'Honorar-Vereinbarung'] },
    { n: 2, key: 'beratung',  label: '2 Beratung',  checklist: ['Termin (Telefon/Vor-Ort/Video)', 'Diktat/Protokoll', 'Handlungsempfehlungen'], optional: true, skipHint: 'Bei reiner Telefonberatung überspringbar' },
    { n: 3, key: 'abschluss', label: '3 Abschluss', checklist: ['Kurzstellungnahme/Brief', 'PDF', 'Stundenabrechnung'] }
  ],
  D: [
    { n: 1, key: 'auftrag',   label: '1 Auftrag',   checklist: ['Baubeschreibung', 'Bauphasen-Plan', 'Begehungsintervall'] },
    { n: 2, key: 'begehung',  label: '2+n Begehung', checklist: ['Diktat', 'Fotos', 'Mängelerfassung'], repeatable: true },
    { n: 3, key: 'abschluss', label: '3 Abschluss', checklist: ['Schluss-Bericht', 'Restmängel', 'Abnahme-PDF', 'JVEG/Pauschal'] }
  ]
};

// Phasen-Liste für gegebenen Auftrag (B.1)
window.getAktePhasenForAuftrag = function getAktePhasenForAuftrag(auftrag) {
  auftrag = auftrag || {};
  var typ = auftrag.typ || auftrag.auftrag_typ || auftrag.Auftragstyp || '';
  var flow = window.getFlow(typ);
  return (window.AKTE_PHASEN_V2[flow] || window.AKTE_PHASEN_V2.A).slice();
};

// MEGA⁸² B.7 — Status-Badge in Akte-Header rendern (Auto-Derive)
window.renderAkteStatusBadge = function renderAkteStatusBadge(f){
  try {
    var info = window.getAkteStatusAuto(f);
    var badge = document.getElementById('akte-status-badge');
    var text = document.getElementById('akte-status-text');
    if (!badge || !text) return;
    text.textContent = info.label;
    badge.setAttribute('data-color', info.color);
    // Color-Tokens je Status
    var colorMap = {
      gray:   { bg: 'rgba(255,255,255,.06)', border: 'var(--border2)',         color: 'var(--text2)' },
      blue:   { bg: 'rgba(79,142,247,.12)',  border: 'rgba(79,142,247,.35)',   color: '#93c5fd'      },
      orange: { bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.35)',   color: '#fcd34d'      },
      green:  { bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.35)',   color: '#6ee7b7'      },
      muted:  { bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)',  color: 'var(--text3)' }
    };
    var c = colorMap[info.color] || colorMap.gray;
    badge.style.background = c.bg;
    badge.style.borderColor = c.border;
    badge.style.color = c.color;
  } catch(e) { /* defensiv */ }
};

// MEGA⁸² B.7 — Status auto-derived (Status-Dropdown WEG, Badge auto)
window.getAkteStatusAuto = function getAkteStatusAuto(auftrag) {
  auftrag = auftrag || {};
  var dbStatus = String(auftrag.status || auftrag.Status || '').toLowerCase();
  if (dbStatus === 'archiv' || dbStatus === 'archiviert') {
    return { db: 'archiv', label: 'Archiviert', color: 'muted' };
  }
  if (dbStatus === 'storniert') {
    return { db: 'storniert', label: 'Storniert', color: 'muted' };
  }
  var phase = parseInt(auftrag.phase_aktuell || auftrag.Phase || 1, 10);
  var freigegeben = !!(auftrag.gutachtendatum || auftrag.freigegeben_at || dbStatus === 'abgeschlossen');
  if (phase === 1)                          return { db: 'entwurf', label: 'Neu',             color: 'gray' };
  if (phase === 2)                          return { db: 'aktiv',   label: 'Ortstermin',      color: 'blue' };
  if (phase === 3)                          return { db: 'aktiv',   label: 'In Bearbeitung',  color: 'blue' };
  if (phase === 4 && !freigegeben)          return { db: 'aktiv',   label: 'Zur Freigabe',    color: 'orange' };
  if (phase >= 4 && freigegeben)            return { db: 'abgeschlossen', label: 'Abgeschlossen', color: 'green' };
  return { db: dbStatus || 'entwurf', label: 'Neu', color: 'gray' };
};

/* ─── TIMELINE — 9 Phasen (Flow A), Session 30 — LEGACY ───
   MEGA⁸²-Hinweis: Diese Struktur ist DEFER zu MEGA83. Erst wenn akte.html
   Layout (B.9) das neue 4-Phasen-Stepper-Markup hat, wird renderTimeline()
   auf AKTE_PHASEN_V2 + getAktePhasenForAuftrag() umgestellt. Bis dahin
   bleibt die alte 9-Phasen-Render als Fallback. */
var AKTE_PHASEN = [
  {n:1, key:'auftragsannahme', label:'Auftragsannahme',     ki:'PDF-OCR, §407a-Plausibilität, Honorar-Auto',        skip:false, mussFlow:['A','B','C','D']},
  {n:2, key:'ortstermin',      label:'Ortstermin',           ki:'Diktat→Struktur, Foto-Caption, WTA-Grenzwerte',    skip:true,  skipHint:'Aktengutachten §411a',       mussFlow:['A','B','D']},
  {n:3, key:'messung',         label:'Messung & Dokumentation', ki:'Messwert-Plausibilität',                        skip:true,  skipHint:'Reine §411-Ergänzung',        mussFlow:['A']},
  {n:4, key:'recherche',       label:'Recherche',            ki:'Norm-Vorschläge, Textbaustein-Match',              skip:true,  skipHint:'Erfahrungs-SV',               mussFlow:['A','B']},
  {n:5, key:'schreiben',       label:'Schreiben §§1–§7',     ki:'Vorentwurf §1–5, §7 · §6 nur SV',                  skip:false, mussFlow:['A','B','C','D']},
  {n:6, key:'qualitaet',       label:'Qualitätsprüfung',     ki:'Konsistenz-Check §4↔§6, §407a-Check',              skip:true,  skipHint:'Eigener Review ausreichend',  mussFlow:['A','B']},
  {n:7, key:'freigabe',        label:'Freigabe + PDF',       ki:'PDFMonkey-Template, Anhänge',                      skip:false, mussFlow:['A','B','C','D']},
  {n:8, key:'versand',         label:'Versand',              ki:'E-Mail/Post/ERV, Fristen-Alarm',                   skip:false, mussFlow:['A','B','C','D']},
  {n:9, key:'rechnung',        label:'Rechnung',             ki:'JVEG-Rechner oder Pauschal, XRechnung',            skip:false, mussFlow:['A','B','C','D']}
];

// Aktuelle Phase aus Record ableiten (gleiche Logic wie archiv-logic.js)
function getAktePhase(f){
  if(f.Phase){
    var p=parseInt(f.Phase,10);
    if(!isNaN(p)&&p>=1&&p<=9)return p;
  }
  var st=(f.Status||'').toLowerCase();
  var map={'neuer auftrag':1,'auftrag erhalten':1,'in bearbeitung':5,'ortstermin':2,'messung':3,
    'recherche':4,'schreiben':5,'entwurf fertig':6,'qualitätsprüfung':6,'zur freigabe':7,
    'freigegeben':7,'pdf erstellt':7,'versendet':8,'abgeschlossen':9,'exportiert':9};
  for(var k in map){if(st.indexOf(k)!==-1)return map[k];}
  return 1; // Default: erste Phase
}

function getAkteFlow(f){
  if(f.Flow)return String(f.Flow).toUpperCase().charAt(0);
  var art=(f.Auftragstyp||'').toLowerCase();
  var m={'gerichtsgutachten':'A','versicherungsgutachten':'A','privatgutachten':'A',
    'schiedsgutachten':'A','beweissicherung':'A','ergaenzungsgutachten':'A','gegengutachten':'A',
    'kaufberatung':'C','sanierungsberatung':'C','baubegleitung':'D','bauabnahme':'D'};
  return m[art]||'A';
}

// Skip-Begründungen pro Fall-Record aus localStorage
function ladeSkipBegruendungen(recordId){
  try { return JSON.parse(localStorage.getItem('prova_phase_skips_'+recordId)||'{}'); }
  catch(e){ return {}; }
}
function speichereSkipBegruendung(recordId, phaseN, begruendung){
  var data=ladeSkipBegruendungen(recordId);
  if(begruendung){ data[phaseN]=begruendung; } else { delete data[phaseN]; }
  localStorage.setItem('prova_phase_skips_'+recordId, JSON.stringify(data));
}

/* MEGA⁷⁷ B.1: applyPhaseVisibility — Progressive-Disclosure-Helper.
   Steuert .sec-*-Sections per data-phase-Attribut basierend auf aktuellem
   Auftrag-Status. War aus Vor-Refactoring-Phase verschwunden und wurde von
   Z.149 aufgerufen → ReferenceError beim Akte-Load. Definition wiederhergestellt
   als sichere Pass-Through-Implementierung: alle Sections bleiben sichtbar,
   abgeschlossen-Auftraege bekommen optional ein readonly-Marker. */
function applyPhaseVisibility(status){
  try {
    var sections = document.querySelectorAll('[data-phase]');
    var isAbgeschlossen = String(status || '').toLowerCase() === 'abgeschlossen';
    sections.forEach(function(el){
      el.style.display = '';  // alle sichtbar lassen
      if (isAbgeschlossen) el.classList.add('akte-readonly');
      else el.classList.remove('akte-readonly');
    });
  } catch(e) {
    // Defensiv — Akte-Load nie wegen DOM-Issues crashen lassen
    console.warn('[applyPhaseVisibility] non-fatal:', e && e.message);
  }
}

function renderTimeline(status,f){
  var recordId = (f && f._recordId) || window._currentAkteId || '';
  var aktuellePhase = getAktePhase(f);
  var flow = getAkteFlow(f);
  var skips = recordId ? ladeSkipBegruendungen(recordId) : {};

  // Nur Phasen anzeigen die zu diesem Flow gehören
  var phasen = AKTE_PHASEN.filter(function(p){ return p.mussFlow.indexOf(flow)!==-1; });

  document.getElementById('timeline-body').innerHTML = phasen.map(function(ph){
    var istSkipped = !!skips[ph.n];
    var istDone   = ph.n < aktuellePhase && !istSkipped;
    var istAktiv  = ph.n === aktuellePhase && !istSkipped;
    var istPending= ph.n > aktuellePhase && !istSkipped;

    var cls, icon, meta;
    if(istSkipped){
      cls='skipped'; icon='⏭';
      meta='Übersprungen' + (skips[ph.n] ? ' · '+escHtmlLocal(skips[ph.n]) : '');
    } else if(istDone){
      cls='done'; icon='✓';
      meta=ph.ki;
    } else if(istAktiv){
      cls='active'; icon='→';
      meta=ph.ki;
    } else {
      cls='pending'; icon='○';
      meta=ph.ki;
    }

    // Action-Buttons bei aktiver Phase
    var actions='';
    if(istAktiv){
      actions += '<button class="phase-btn phase-btn-primary" onclick="phaseAbschliessen('+ph.n+')" '
        + 'style="margin-left:auto;padding:5px 11px;border:none;border-radius:6px;background:var(--accent,#4f8ef7);'
        + 'color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Abschließen →</button>';
      if(ph.skip){
        actions += '<button class="phase-btn phase-btn-ghost" onclick="phaseSkippen('+ph.n+',\''+escAttr(ph.label)+'\',\''+escAttr(ph.skipHint||'')+'\')" '
          + 'style="margin-left:6px;padding:5px 11px;border:1px solid var(--border2,rgba(255,255,255,.12));'
          + 'border-radius:6px;background:transparent;color:var(--text3,#6b7280);font-size:11px;font-weight:600;'
          + 'cursor:pointer;font-family:inherit;" title="Phase überspringen ('+escAttr(ph.skipHint||'')+')">⏭ Skip</button>';
      }
    }
    if(istSkipped){
      actions += '<button class="phase-btn" onclick="phaseSkipRueckgaengig('+ph.n+')" '
        + 'style="margin-left:auto;padding:4px 9px;border:1px dashed var(--border2,rgba(255,255,255,.12));'
        + 'border-radius:6px;background:transparent;color:var(--text3,#6b7280);font-size:10px;cursor:pointer;'
        + 'font-family:inherit;">↩ Rückgängig</button>';
    }

    var pflichtTag = ph.skip
      ? ''
      : '<span title="Pflicht-Phase" style="font-size:8px;font-weight:800;padding:1px 5px;border-radius:3px;background:rgba(239,68,68,.1);color:#ef4444;margin-left:6px;letter-spacing:.04em;">PFLICHT</span>';

    return '<div class="tl-item" data-phase="'+ph.n+'" data-state="'+cls+'" style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.05));">'
      + '<div class="tl-dot '+cls+'" style="flex-shrink:0;">'+icon+'</div>'
      + '<div class="tl-content" style="flex:1;min-width:0;">'
      +   '<div class="tl-title" style="display:flex;align-items:center;flex-wrap:wrap;">'
      +     '<span style="font-size:9px;opacity:.6;font-weight:700;margin-right:6px;">PH '+ph.n+'</span>'
      +     '<span>'+escHtmlLocal(ph.label)+'</span>'
      +     pflichtTag
      +   '</div>'
      +   '<div class="tl-meta">'+escHtmlLocal(meta)+'</div>'
      + '</div>'
      + actions
      + '</div>';
  }).join('');
}

/* Kleine lokale Helper — Kollisionen mit anderen esc()-Varianten vermeiden */
function escHtmlLocal(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escAttr(s){return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}

/* ── Phase-Aktionen (global für onclick) ── */
window.phaseAbschliessen = async function(phaseN){
  var recordId = window._currentAkteId;
  if(!recordId){
    if (window.ProvaUI && ProvaUI.toast) ProvaUI.toast('Kein aktiver Fall gefunden.', 'error');
    else alert('Kein aktiver Fall gefunden.');
    return;
  }
  var naechstePhase = phaseN + 1;
  if(naechstePhase > 9){
    if (window.ProvaUI && ProvaUI.toast) ProvaUI.toast('Alle Phasen abgeschlossen. Fall kann archiviert werden.', 'info');
    else alert('Alle Phasen abgeschlossen. Fall kann archiviert werden.');
    return;
  }
  // MEGA⁷²-Phase-A: Supabase-Update der Phase
  try {
    var sb = await _getSupabase();
    if (!sb) throw new Error('Supabase nicht verfügbar');
    var upd = await sb.from('auftraege').update({ phase_aktuell: naechstePhase })
      .eq('id', recordId).select('id, phase_aktuell').single();
    if(upd.error) throw new Error(upd.error.message);
    // Lokal re-render
    if(window._currentAkteFields){ window._currentAkteFields.Phase = naechstePhase; }
    // Cache invalidieren damit archiv.html den neuen Stand lädt
    try { localStorage.removeItem('prova_archiv_cache_v2'); } catch(e){}
    if(window._currentAkteFields) renderTimeline(null, window._currentAkteFields);
    if(typeof provaToast==='function') provaToast('✅ Phase '+phaseN+' abgeschlossen','success');
  } catch(e) {
    if (window.ProvaUI && ProvaUI.toast) ProvaUI.toast('Phase konnte nicht gespeichert werden: '+e.message, 'error');
    else alert('Phase konnte nicht gespeichert werden: '+e.message);
  }
};

window.phaseSkippen = function(phaseN, phaseLabel, hint){
  var recordId = window._currentAkteId;
  if(!recordId) return;
  var begruendung = prompt(
    'Phase „'+phaseLabel+'" überspringen.\n'
    + (hint ? 'Typischer Grund: '+hint+'\n' : '')
    + '\nBegründung (Pflicht für Audit-Trail):',
    hint || ''
  );
  if(!begruendung || !begruendung.trim()) return;
  speichereSkipBegruendung(recordId, phaseN, begruendung.trim());
  // Dieser Phase überspringen = aktuelle Phase auf phaseN+1 rücken, aber nur wenn sie die aktive war
  var aktuellePhase = getAktePhase(window._currentAkteFields||{});
  if(aktuellePhase === phaseN){
    window.phaseAbschliessen(phaseN); // rückt auf phaseN+1
  } else {
    if(window._currentAkteFields) renderTimeline(null, window._currentAkteFields);
  }
};

window.phaseSkipRueckgaengig = function(phaseN){
  var recordId = window._currentAkteId;
  if(!recordId) return;
  speichereSkipBegruendung(recordId, phaseN, null);
  if(window._currentAkteFields) renderTimeline(null, window._currentAkteFields);
};

/* ─── DOKUMENTE ─── */
function renderDokumente(f){
  var list=[];
  if(f.PDF_URL||f.pdf_url){
    list.push({icon:'📄',name:'Gutachten PDF',meta:'Erstellt nach Freigabe',url:f.PDF_URL||f.pdf_url,typ:'pdf'});
  }
  if(f.Fotos_Anzahl&&f.Fotos_Anzahl>0){
    list.push({icon:'📷',name:f.Fotos_Anzahl+' Fotos',meta:'Bilddokumentation',url:null,typ:'foto'});
  }
  if(f.Messwerte){
    list.push({icon:'📐',name:'Messwerte',meta:'Vor-Ort-Messungen',url:null,typ:'mess'});
  }
  // Lokale Uploads laden
  var az = f.Aktenzeichen || f.Aktenzeichen || '';
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
  var az = (function(){var _e=document.getElementById('akte-az');return _e?_e.textContent:undefined;})()  || localStorage.getItem('prova_letztes_az') || '';
  var uploads = JSON.parse(localStorage.getItem('prova_akte_docs_' + az) || '[]');

  // MEGA⁹ W1: ProvaUploadHelpers Pre-Processing-Pipeline
  // - Magic-Bytes-Validation (anti-MIME-Spoofing)
  // - EXIF-Strip fuer JPEGs (DSGVO-Pflicht: GPS/Geraete-Info raus vor KI-Send)
  // - Image-Optimize (Resize 2048max + WebP wo moeglich)
  var helpers = window.ProvaUploadHelpers || null;
  var allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    statusEl.style.display = 'block';
    statusEl.textContent = '⏳ KI analysiert: ' + file.name + '…';

    // Magic-Bytes-Check (Security-Layer vor KI-Send)
    if (helpers && helpers.validateFileType) {
      try {
        var validation = await helpers.validateFileType(file, allowedMimes);
        if (!validation.ok) {
          // MEGA¹⁰ W4: User-sichtbare Toast statt nur Status-Text
          var rejectMsg = '⚠️ Datei abgelehnt: ' + (validation.reason || 'Typ ungueltig') + ' (' + file.name + ')';
          statusEl.textContent = rejectMsg;
          if (window.ProvaUI && window.ProvaUI.toast) {
            window.ProvaUI.toast(rejectMsg, 'error');
          }
          continue;
        }
        // MIME-Spoofing-Detection: extension/MIME stimmt nicht ueberein mit Magic-Bytes
        if (validation.mimeMatches === false) {
          console.warn('[upload] MIME-Spoofing detected:', file.name, file.type, '->', validation.detected);
          if (window.ProvaUI && window.ProvaUI.toast) {
            window.ProvaUI.toast('Datei-Typ ('  + (file.type||'leer') + ') stimmt nicht mit Inhalt (' + validation.detected + ') ueberein', 'info');
          }
        }
      } catch (e) { console.warn('[upload] magic-bytes-check failed', e); }
    }

    // EXIF-Strip + Image-Optimize fuer Bilder (vor KI-Send)
    // MEGA¹⁰ W4: Orientation VOR stripExif lesen (sonst Hochformat-Bug)
    var processedFile = file;
    if (helpers && file.type && file.type.indexOf('image/') === 0) {
      try {
        var blob = file;
        var orientation = 1;
        if (file.type === 'image/jpeg' && helpers.readExifOrientation) {
          try { orientation = await helpers.readExifOrientation(blob); } catch (_) {}
        }
        var sizeBefore = blob.size;
        if (file.type === 'image/jpeg' && helpers.stripExif) {
          blob = await helpers.stripExif(blob);  // GPS/Camera/IPTC raus
        }
        if (helpers.optimizeImage) {
          blob = await helpers.optimizeImage(blob, {
            maxWidth: 2048, maxHeight: 2048, quality: 0.85, prefer: 'webp',
            orientation: orientation
          });
        }
        // User-sichtbares Audit (Console — Frontend hat kein audit_trail)
        var saved = sizeBefore - blob.size;
        if (saved > 1024) {
          console.log('[upload] ' + file.name + ': EXIF-stripped + optimized, saved ' +
            Math.round(saved/1024) + 'KB (orientation=' + orientation + ')');
        }
        processedFile = new File([blob], file.name, { type: blob.type || file.type });
      } catch (e) {
        console.warn('[upload] image-preprocessing failed, fallback to original', e);
        if (window.ProvaUI && window.ProvaUI.toast) {
          window.ProvaUI.toast('Bild-Vorverarbeitung fehlgeschlagen — Original wird verwendet', 'info');
        }
        processedFile = file;
      }
    }
    // HEIC-Hint: Browser kann HEIC nicht decoden, KI-Captioning kann scheitern
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      if (window.ProvaUI && window.ProvaUI.toast) {
        window.ProvaUI.toast('HEIC-Bild — Vorschau evtl. eingeschraenkt, KI-Beschriftung versucht', 'info');
      }
    }
    file = processedFile;

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

        // S-SICHER P3.2: Pseudo-Send-Wrapper.
        var kiRes = await (window.PROVA_PSEUDO_SEND ? window.PROVA_PSEUDO_SEND.fetch : fetch)('/.netlify/functions/ki-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aufgabe: 'pdf_extraktion', pdf_base64: b64, dateiname: file.name })
        });

        if (kiRes.ok) {
          var kiData = await kiRes.json();
          // Typ erkennen aus dem Inhalt
          if (kiData.beweisfragen && kiData.beweisfragen.length > 0) { typLabel = 'Beweisbeschluss'; icon = '⚖️'; }
          else if (file.name.toLowerCase().indexOf('stellungnahme') >= 0 || file.name.toLowerCase().indexOf('fachurteil') >= 0) { typLabel = 'Stellungnahme'; icon = '💬'; }
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
        // S-SICHER P3.2: Pseudo-Send-Wrapper.
        var capRes = await (window.PROVA_PSEUDO_SEND ? window.PROVA_PSEUDO_SEND.fetch : fetch)('/.netlify/functions/foto-captioning', {
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
  var az = (function(){var _e=document.getElementById('akte-az');return _e?_e.textContent:undefined;})()  || '';
  var cache = JSON.parse(localStorage.getItem('prova_faelle_cache') || '{}');
  if (cache[az]) {
    cache[az].fristdatum = _erkFrist;
    localStorage.setItem('prova_faelle_cache', JSON.stringify(cache));
  }
  document.getElementById('dok-frist-banner').style.display = 'none';
  if (typeof showToast === 'function') showToast('Frist ' + _erkFrist + ' im Kalender eingetragen ✓', 'success');
  else if (window.ProvaUI && ProvaUI.toast) ProvaUI.toast('Frist ' + _erkFrist + ' eingetragen.', 'success');
  else alert('Frist ' + _erkFrist + ' eingetragen.');
}

/* ─── SCHNELLAKTIONEN ─── MEGA⁸² B.6: Phasen-kontextuelle Aktionen ─── */
function renderSchnellaktionen(status,f,az){
  // Phase aus Auftrag (DB-style oder Airtable-Fallback)
  var phase = parseInt(f.phase_aktuell || f.Phase || 1, 10);
  var flow = window.getFlow ? window.getFlow(f.typ || f.auftrag_typ || f.Auftragstyp) : 'A';
  var hasGutachten = !!(f.KI_Entwurf || f.fachurteil_text || f.kurzbeantwortung);
  var actions = [];

  // ── Phasen-spezifische Primary-Aktionen ──
  if (phase === 1) {
    // Auftrag-Phase: Stammdaten finalisieren
    actions.push({ icon:'✓', bg:'rgba(79,142,247,.1)', label:'Auftrag bestätigen', sub:'Auftragsbestätigung erstellen', action:"window.location.href='auftragsbestaetigung.html'" });
    actions.push({ icon:'💰', bg:'rgba(16,185,129,.1)', label:'Honorar vereinbaren', sub:'Vereinbarung anhängen', action:"window.location.href='honorar-rechner.html'" });
  } else if (phase === 2) {
    // Termin/Objekt-Phase
    actions.push({ icon:'📅', bg:'rgba(79,142,247,.1)', label:'Termin anlegen', sub:'Ortstermin/Beweisaufnahme', action:"window.location.href='termine.html'" });
    if (flow === 'A' || flow === 'B') {
      actions.push({ icon:'📸', bg:'rgba(139,92,246,.1)', label:'Foto hochladen', sub:'Aus Kamera oder Drag&Drop', action:"document.getElementById('dok-file-input') && document.getElementById('dok-file-input').click()" });
      actions.push({ icon:'🎙️', bg:'rgba(245,158,11,.1)', label:'Diktat starten', sub:'Audio → Whisper → Text', action:"window.location.href='vor-ort.html?az=' + encodeURIComponent('"+(f.az||az||'')+"')" });
      actions.push({ icon:'✏️', bg:'rgba(16,185,129,.1)', label:'Skizze erstellen', sub:'SVG-Editor', action:"window.location.href='skizzen.html'" });
    }
  } else if (phase === 3) {
    // Analyse/Bewertung
    actions.push({ icon:'📚', bg:'rgba(79,142,247,.1)', label:'Normen recherchieren', sub:'DIN/VOB/BGB-Bibliothek', action:"window.location.href='normen.html'" });
    actions.push({ icon:'📋', bg:'rgba(139,92,246,.1)', label:'Textbausteine', sub:'Wiederverwendbare Vorlagen', action:"window.location.href='textbausteine.html'" });
    actions.push({ icon:'⚖️', bg:'rgba(245,158,11,.1)', label:'§ 6 Fachurteil schreiben', sub:'Eigenleistung-Editor', action:"oeffneGutachten()" });
    if (hasGutachten) {
      actions.push({ icon:'✅', bg:'rgba(16,185,129,.1)', label:'Zur Freigabe', sub:'Gutachten prüfen', action:"oeffneFreigabe()" });
    }
  } else if (phase >= 4) {
    // Abschluss-Phase
    actions.push({ icon:'✅', bg:'rgba(16,185,129,.1)', label:'Freigabe-Wizard', sub:'§ 407a-Check + PDF-Erstellung', action:"oeffneFreigabe()" });
    actions.push({ icon:'📄', bg:'rgba(79,142,247,.1)', label:'PDF erstellen', sub:'Gerichtsfestes Gutachten', action:"oeffneGutachten()" });
    actions.push({ icon:'💶', bg:'rgba(245,158,11,.1)', label:'Rechnung erstellen', sub:'JVEG oder Pauschal', action:"window.location.href='rechnungen.html'" });
    actions.push({ icon:'✉️', bg:'rgba(139,92,246,.08)', label:'Versenden', sub:'E-Mail / Post / beA', action:"window.location.href='briefvorlagen.html'" });
  }

  // ── „Mehr ▼" Sekundär-Aktionen (immer verfügbar) ──
  actions.push({ icon:'✉️', bg:'rgba(255,255,255,.04)', label:'Brief schreiben', sub:'Aus Vorlage mit Fall-Daten', action:"window.location.href='briefvorlagen.html'", secondary:true });
  actions.push({ icon:'📅', bg:'rgba(255,255,255,.04)', label:'Termin verschieben', sub:'Datum/Uhrzeit ändern', action:"window.location.href='termine.html'", secondary:true });
  actions.push({ icon:'📤', bg:'rgba(255,255,255,.04)', label:'Akte exportieren', sub:'ZIP mit allen Dateien', action:"exportWordAkte && exportWordAkte()", secondary:true });

  var primary = actions.filter(function(a){ return !a.secondary; });
  var secondary = actions.filter(function(a){ return a.secondary; });

  var html = primary.map(function(a){
    return '<div class="qa-btn" onclick="'+a.action+'">'
      +'<div class="qa-icon" style="background:'+a.bg+'">'+a.icon+'</div>'
      +'<div><div class="qa-label">'+a.label+'</div><div class="qa-sub">'+a.sub+'</div></div>'
      +'<div class="qa-arrow">›</div>'
      +'</div>';
  }).join('');

  // Sekundär-Aktionen einklappbar
  if (secondary.length) {
    html += '<details style="margin-top:8px;">'
      + '<summary style="cursor:pointer;font-size:11px;font-weight:600;color:var(--text3);padding:6px 0;list-style:none;">Mehr ▼</summary>'
      + secondary.map(function(a){
          return '<div class="qa-btn" style="margin-top:6px;opacity:.85;" onclick="'+a.action+'">'
            +'<div class="qa-icon" style="background:'+a.bg+'">'+a.icon+'</div>'
            +'<div><div class="qa-label">'+a.label+'</div><div class="qa-sub">'+a.sub+'</div></div>'
            +'<div class="qa-arrow">›</div>'
            +'</div>';
        }).join('')
      + '</details>';
  }

  var el = document.getElementById('quick-actions');
  if (el) el.innerHTML = html;
}

// MEGA⁸² B.5 — Sticky-Action-Footer
window.renderAkteStickyFooter = function renderAkteStickyFooter(f){
  try {
    var phase = parseInt(f.phase_aktuell || f.Phase || 1, 10);
    var phasen = window.getAktePhasenForAuftrag ? window.getAktePhasenForAuftrag(f) : [];
    var phasenMax = phasen.length || 4;
    var currentPhase = phasen.find(function(p){ return p.n === phase; });
    var checklistCount = (currentPhase && currentPhase.checklist && currentPhase.checklist.length) || 0;
    var info = window.getAkteStatusAuto ? window.getAkteStatusAuto(f) : { label: '—' };

    var existing = document.getElementById('akte-sticky-footer');
    if (existing) existing.remove();

    var footer = document.createElement('div');
    footer.id = 'akte-sticky-footer';
    footer.style.cssText = 'position:sticky;bottom:0;left:0;right:0;z-index:50;background:linear-gradient(180deg,rgba(11,13,17,.65),var(--bg,#0b0d11));border-top:1px solid var(--border2,rgba(255,255,255,.11));padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:24px;backdrop-filter:blur(8px);';

    var prevBtn = phase > 1
      ? '<button type="button" onclick="window.aktePrevPhase && window.aktePrevPhase()" style="background:none;border:1px solid var(--border2);color:var(--text2);padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;min-height:44px;font-family:inherit;">← Vorherige Phase</button>'
      : '<span></span>';

    var nextLabel = phase < phasenMax ? 'Phase abschließen →' : '✅ Akte abschließen';
    var nextAction = phase < phasenMax ? 'window.akteNextPhase && window.akteNextPhase()' : 'oeffneFreigabe()';

    var nextBtn = '<button type="button" onclick="'+nextAction+'" class="action-btn btn-primary" style="padding:10px 18px;font-size:13px;font-weight:700;min-height:44px;">'+nextLabel+'</button>';

    footer.innerHTML = prevBtn
      + '<div style="font-size:12px;color:var(--text2);text-align:center;flex:1;min-width:160px;">Phase <strong style="color:var(--text);">'+phase+'</strong> von '+phasenMax+(checklistCount?' · '+checklistCount+' Aufgaben':'')+' · '+_escHtml(info.label)+'</div>'
      + nextBtn;

    var main = document.getElementById('akte-content');
    if (main) main.appendChild(footer);
  } catch(e) { /* defensiv */ }
};

function _escHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

// MEGA⁸² B.5: Phase-Wechsel-Helpers (mit Confirmation für Rückwärts)
window.aktePrevPhase = function aktePrevPhase(){
  var f = window.currentFields || currentFields || {};
  var phase = parseInt(f.phase_aktuell || f.Phase || 1, 10);
  if (phase <= 1) return;
  if (!confirm('Phase ' + (phase-1) + ' nochmals öffnen?\n\nBisherige Daten bleiben erhalten — nur der Phase-Pointer ändert sich.')) return;
  window._akteUpdatePhase && window._akteUpdatePhase(phase - 1);
};
window.akteNextPhase = function akteNextPhase(){
  var f = window.currentFields || currentFields || {};
  var phase = parseInt(f.phase_aktuell || f.Phase || 1, 10);
  var phasen = window.getAktePhasenForAuftrag ? window.getAktePhasenForAuftrag(f) : [];
  if (phase >= (phasen.length || 4)) return;
  window._akteUpdatePhase && window._akteUpdatePhase(phase + 1);
};

// _akteUpdatePhase: persistiert phase_aktuell in DB + reloaded UI
window._akteUpdatePhase = async function _akteUpdatePhase(newPhase){
  try {
    var f = window.currentFields || currentFields || {};
    var id = f.id || f._recordId;
    if (!id || !window._getSupabase) return;
    var sb = await window._getSupabase();
    if (!sb) return;
    var res = await sb.from('auftraege').update({ phase_aktuell: newPhase }).eq('id', id);
    if (res.error) { console.warn('[_akteUpdatePhase]', res.error.message); return; }
    f.phase_aktuell = newPhase;
    // Re-Render abhängige Komponenten
    if (window.renderAkteStatusBadge) window.renderAkteStatusBadge(f);
    if (window.renderAkteStickyFooter) window.renderAkteStickyFooter(f);
    if (window.updateGutachtenCTAButton) window.updateGutachtenCTAButton(f);
    if (typeof renderSchnellaktionen === 'function') {
      var status = String(f.status || f.Status || '');
      renderSchnellaktionen(status, f, f.az || '');
    }
    // Audit-Trail-Eintrag (defensive: nur wenn Adapter verfügbar)
    if (window.ad && window.ad.auditTrailInsert) {
      try {
        await window.ad.auditTrailInsert({
          action: 'update', entity_typ: 'auftrag', entity_id: id,
          payload: { phase_changed_to: newPhase, source: 'akte-sticky-footer' }
        });
      } catch(_) {}
    }
  } catch(e) { console.warn('[_akteUpdatePhase]', e); }
};

/* ─── TERMINE ─── MEGA⁷²-Phase-A: Supabase-Migration */
async function ladeTermine(){
  if(!currentRecord || !currentRecord.id) return;
  try{
    var sb = await _getSupabase();
    if (!sb) return;
    var res = await sb.from('termine')
      .select('id, datum, uhrzeit_von, titel, beschreibung, typ, status')
      .eq('auftrag_id', currentRecord.id).is('deleted_at', null)
      .order('datum', { ascending: true }).limit(10);
    if (res.error) { console.warn('[ladeTermine]', res.error.message); return; }
    // Adapter: snake_case → Airtable-Style (renderFristen erwartet titel/termin_typ/termin_datum)
    var termine = (res.data || []).map(function(t){
      return {
        titel: t.titel,
        termin_typ: t.typ,
        termin_datum: t.datum,
        beschreibung: t.beschreibung,
        status: t.status
      };
    });
    renderFristen(termine);
  }catch(e){ console.warn('[ladeTermine]', e); }
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

/* ─── STATUS AKTUALISIEREN ─── MEGA⁷²-Phase-B-mini: UI_STATUS_TO_DB jetzt aus Adapter-Lib */
window.aktualisiereStatus=async function(){
  var newStatus=document.getElementById('status-select').value;
  var stClass=statusClass(newStatus);
  document.getElementById('status-display').innerHTML='<span class="status-badge '+stClass+'">'+esc(newStatus)+'</span>';
  document.getElementById('status-hint').textContent=statusHint(newStatus);
  if(!recordId) return;
  try{
    var sb = await _getSupabase();
    if (!sb) throw new Error('Supabase nicht verfügbar');
    var dbStatus = (_ad && _ad.UI_STATUS_TO_DB[newStatus]) || (newStatus || '').toLowerCase();
    var upd = await sb.from('auftraege').update({ status: dbStatus })
      .eq('id', recordId).select('id, status').single();
    if(upd.error) throw new Error(upd.error.message);
    zeigToast('Status aktualisiert: '+newStatus);
    // Cache invalidieren damit archiv/dashboard den neuen Stand laden
    localStorage.removeItem('prova_archiv_cache_v2');
  }catch(e){
    console.warn('[aktualisiereStatus]', e.message || e);
    zeigToast('Status konnte nicht gespeichert werden','err');
  }
};

/* ─── NAVIGATIONEN ─── */

/* MEGA⁸² E.1: Kontextueller CTA-Button für Gutachten.
   Status- und Phase-abhängig navigiert auf den richtigen Editor.
   Behebt Loop-Bug: vorher sprang oeffneGutachten() IMMER auf app.html
   (Schadensgutachten-Wizard) — auch bei bereits aktiver Akte. */
window.renderGutachtenCTA = function renderGutachtenCTA(f){
  f = f || {};
  var status = String(f.Status || f.status || '').toLowerCase();
  var phase = parseInt(f.Phase || f.phase_aktuell || 0, 10);
  var hasGutachten = !!(f.KI_Entwurf || f.fachurteil_text || f.kurzbeantwortung);
  var freigegeben = status === 'abgeschlossen' || status === 'freigegeben' || status === 'versendet';
  var az = encodeURIComponent(f.az || f.Aktenzeichen || '');
  var id = encodeURIComponent(f._recordId || f.id || '');
  var qs = az ? ('az=' + az) : (id ? ('id=' + id) : '');

  if (freigegeben) {
    return { text: 'Gutachten ansehen', target: 'fachurteil.html?' + qs + '&mode=view' };
  }
  if (phase >= 3 && hasGutachten) {
    return { text: 'Gutachten bearbeiten →', target: 'fachurteil.html?' + qs };
  }
  if (phase >= 3 || hasGutachten) {
    return { text: 'Gutachten bearbeiten →', target: 'fachurteil.html?' + qs };
  }
  // Phase 1/2: Auftrag noch in Stammdaten-/Termin-Phase — neue Akte wurde noch nicht "geschrieben"
  return { text: 'Gutachten erstellen →', target: 'fachurteil.html?' + qs + '&new=1' };
};

window.oeffneGutachten=function(){
  var f = window.currentFields || currentFields || {};
  var cta = window.renderGutachtenCTA(f);
  window.location.href = cta.target;
};

/* MEGA⁸² E.1: Akte-Header-CTA-Button-Text dynamisch setzen.
   Wird von ladeAkte() nach Render aufgerufen. */
window.updateGutachtenCTAButton = function updateGutachtenCTAButton(f){
  try {
    var cta = window.renderGutachtenCTA(f);
    document.querySelectorAll('[data-gutachten-cta], #akte-gutachten-cta').forEach(function(btn){
      btn.textContent = '📄 ' + cta.text;
    });
  } catch(e) { /* defensiv — Header-Render darf nie crashen */ }
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
  var sa = f.Schadensart || f.schadenart || '';
  var obj = (f.Strasse||f.strasse||'') + (f.PLZ||f.plz ? ', '+(f.PLZ||f.plz)+' '+(f.Ort||f.ort||'') : (f.Ort||f.ort ? ', '+(f.Ort||f.ort) : ''));
  if(az) sessionStorage.setItem('prova_current_az', az);
  if(sa) sessionStorage.setItem('prova_current_schadenart', sa);
  if(obj.trim()) sessionStorage.setItem('prova_current_objekt', obj.trim());
  if(baujahr) sessionStorage.setItem('prova_current_baujahr', baujahr);
  // record_id bleibt aus sessionStorage (bereits gesetzt)
  // az als URL-Parameter damit fachurteil.html es auch ohne sessionStorage hat
  window.location.href = az ? 'fachurteil.html?az=' + encodeURIComponent(az) : 'fachurteil.html';
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
    seite: 'fachurteil.html',
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

  // MEGA⁷⁰ Phase 1.2.2 — Akte-Open setzt aktiven Fall für Sidebar-Anker.
  // Fall-Wechsel-Bug-Fix: wenn neuer Fall ≠ vorheriger → Phase resetten,
  // damit Sidebar nicht alte Phase aus anderem Fall zeigt (Web-Claude-Review 1.2).
  try {
    var prev = localStorage.getItem('prova_aktiver_fall') || '';
    if (prev && prev !== az) {
      localStorage.removeItem('prova_aktuelle_phase');
    }
    localStorage.setItem('prova_aktiver_fall', az);
    if (schadenart) localStorage.setItem('prova_schadenart', schadenart);
    if (adresse)    localStorage.setItem('prova_adresse', adresse);
    // Default-Phase=2 (Ortstermin) wenn noch nie gesetzt (oder gerade resettet)
    if (!localStorage.getItem('prova_aktuelle_phase')) localStorage.setItem('prova_aktuelle_phase', '2');
  } catch(e){}

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
      if (naechster.seite.indexOf('fachurteil') >= 0 && az) {
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
  setFall: function(az, schadenart, adresse, recordId, phase) {
    if (az) localStorage.setItem('prova_letztes_az', az);
    if (schadenart) localStorage.setItem('prova_schadenart', schadenart);
    if (adresse) localStorage.setItem('prova_adresse', adresse);
    if (recordId) sessionStorage.setItem('prova_record_id', recordId);
    // MEGA⁷⁰ Phase 1.2 — Phase-Tracking für aktiverFallBlock() Phase-spezifische CTA
    if (typeof phase === 'number' || (phase && !isNaN(parseInt(phase)))) {
      localStorage.setItem('prova_aktuelle_phase', String(phase));
    }
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
window.exportWordAkte = async function() {
  var az = new URLSearchParams(window.location.search).get('az') || 
           localStorage.getItem('prova_letztes_az') || '';
  var svEmail = localStorage.getItem('prova_sv_email') || '';
  var svName  = [localStorage.getItem('prova_sv_vorname')||'', 
                 localStorage.getItem('prova_sv_nachname')||''].join(' ').trim();

  if (!az) { if(typeof showToast==='function') showToast('Kein Aktenzeichen gefunden', 'error'); return; }
  if(typeof showToast==='function') showToast('Akte wird exportiert…');

  try {
    // MEGA⁷⁵-F-Batch2 B2: Fall + Briefe direkt aus Supabase. RLS filtert
    // workspace-scoped automatisch — sv_email-Match obsolet.
    var ad = await import('/lib/prova-supabase-adapters.js');
    var sb = await ad.getSupabase();
    if (!sb) throw new Error('no-supabase');

    var [fallQ, briefeQ] = await Promise.all([
      sb.from('auftraege').select('*').eq('az', az).is('deleted_at', null).maybeSingle(),
      sb.from('dokumente').select('id, doc_nummer, betreff, sent_at, status, inhalt_strukturiert')
        .eq('typ', 'brief')
        .is('deleted_at', null)
        .order('sent_at', { ascending: false, nullsFirst: false })
        .limit(20)
    ]);

    var fallFields = fallQ.data ? ad.auftragRowToFields(fallQ.data) : {};
    var briefeRecords = (briefeQ.data || []).map(function(d){
      var sv = (d.inhalt_strukturiert && d.inhalt_strukturiert.brief_typ) || '';
      return {
        id: d.id,
        fields: {
          brief_typ: sv,
          gesendet_am: d.sent_at,
          versand_status: d.status
        }
      };
    });

    var res = await provaFetch('/.netlify/functions/akte-export', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        az, sv_email: svEmail, sv_name: svName,
        fall:    fallFields,
        briefe:  briefeRecords
      })
    });

    var data = await res.json();
    if (!data.success) throw new Error(data.error || 'Export fehlgeschlagen');

    // Download triggern
    var bytes = Uint8Array.from(atob(data.content_base64), function(c){return c.charCodeAt(0);});
    var blob  = new Blob([bytes], {type: data.content_type});
    var url   = URL.createObjectURL(blob);
    var a     = document.createElement('a');
    a.href    = url;
    a.download = data.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if(typeof showToast==='function') showToast('✅ Akte exportiert — Datei im Download-Ordner');
  } catch(e) {
    if(typeof showToast==='function') showToast('Fehler: ' + e.message, 'error');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   MEGA⁸³ A — Akte-Mission-Control Renderer (Stepper + Stammdaten +
   Phase-Checklist + Activity-Sidebar + Phase-Confirm-Modal)
═════════════════════════════════════════════════════════════════════ */

function _ak_esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function _ak_relTime(iso){
  if(!iso)return '';
  var d=new Date(iso);if(isNaN(d.getTime()))return '';
  var diffMs=Date.now()-d.getTime();
  var s=Math.floor(diffMs/1000);if(s<60)return 'vor wenigen Sek';
  var m=Math.floor(s/60);if(m<60)return 'vor '+m+' Min';
  var h=Math.floor(m/60);if(h<24)return 'vor '+h+' Std';
  var today=new Date();today.setHours(0,0,0,0);
  var yest=new Date(today);yest.setDate(yest.getDate()-1);
  if(d>=yest && d<today)return 'gestern';
  return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
}
function _ak_bytes(n){
  if(!n||n<1024)return (n||0)+' B';
  if(n<1024*1024)return Math.round(n/1024)+' KB';
  return (n/1024/1024).toFixed(1)+' MB';
}

// ─── A.2: Phase-Stepper visuell ────────────────────────────────────
window.renderAktePhaseStepper = function(f){
  try {
    var wrap = document.getElementById('ak-stepper-wrap');
    if (!wrap) return;
    var phasen = window.getAktePhasenForAuftrag ? window.getAktePhasenForAuftrag(f) : [];
    if (!phasen.length) return;
    var current = parseInt(f.phase_aktuell || f.Phase || 1, 10);
    var phasenLabels = {
      A: { auftrag:'1 Auftrag', termin:'2 Termin', analyse:'3 Analyse', abschluss:'4 Abschluss' },
      B: { auftrag:'1 Auftrag', objekt:'2 Objekt', bewertung:'3 Bewertung', abschluss:'4 Abschluss' },
      C: { auftrag:'1 Auftrag', beratung:'2 Beratung', abschluss:'3 Abschluss' },
      D: { auftrag:'1 Auftrag', begehung:'2+n Begehung', abschluss:'3 Abschluss' }
    };
    var flow = window.getFlow ? window.getFlow(f.typ || f.auftrag_typ || f.Auftragstyp) : 'A';
    var labelMap = phasenLabels[flow] || phasenLabels.A;
    var html = '';
    phasen.forEach(function(p, idx){
      var cls = p.n < current ? 'done' : (p.n === current ? 'active' : 'pending');
      var label = (p.label) || labelMap[p.key] || ('Phase ' + p.n);
      var circle = p.n < current ? '✓' : String(p.n);
      var aria = cls === 'pending' ? 'aria-disabled="true"' : '';
      html += '<button type="button" class="ak-step ' + cls + '" data-phase="' + p.n + '" '
            + aria + ' onclick="window.akteStepperClick && window.akteStepperClick(' + p.n + ')">'
            + '<span class="ak-step-circle">' + circle + '</span>'
            + '<span class="ak-step-label">' + _ak_esc(label) + '</span>'
            + '</button>';
      if (idx < phasen.length - 1) {
        var connDone = p.n < current ? ' done' : '';
        html += '<div class="ak-step-connector' + connDone + '"></div>';
      }
    });
    wrap.innerHTML = html;
  } catch(e) { console.warn('[renderAktePhaseStepper]', e.message); }
};

// Stepper-Click-Handler: aktive Phase ignorieren, pending blockieren, done → Modal
window.akteStepperClick = function(targetPhase){
  var f = window.currentFields || currentFields || {};
  var current = parseInt(f.phase_aktuell || f.Phase || 1, 10);
  if (targetPhase === current) return;  // active = no-op
  if (targetPhase > current) {
    if (typeof showToast === 'function') {
      showToast('Vorherige Phase muss erst abgeschlossen werden', 'warning');
    }
    return;
  }
  // targetPhase < current → done-Step, Modal öffnen
  window.openAkPhaseModal(targetPhase);
};

// ─── A.3: Stammdaten-Bar (kompakt + collapsible) ─────────────────────
window.toggleStammdatenBar = function(){
  var bar = document.getElementById('ak-stamm-bar');
  if (!bar) return;
  var open = bar.getAttribute('data-expanded') === 'true';
  bar.setAttribute('data-expanded', open ? 'false' : 'true');
  try { localStorage.setItem('prova_akte_stamm_open', open ? '0' : '1'); } catch(_){}
};

window.renderStammdatenBar = function(f){
  try {
    var compact = document.getElementById('ak-stamm-compact');
    var grid = document.getElementById('ak-stamm-grid');
    if (!compact || !grid) return;
    var az = f.az || f.Aktenzeichen || '—';
    var schadensart = f.schadensart_label || f.Schadensart || '';
    var ag = (f.details && f.details.auftraggeber && f.details.auftraggeber.name)
          || f.Auftraggeber_Name || '';
    var ort = (f.objekt && f.objekt.ort) || f.Ort || '';
    var compactParts = [_ak_esc(schadensart), _ak_esc(ag), _ak_esc(ort)].filter(Boolean);
    compact.innerHTML = '<strong>' + _ak_esc(az) + '</strong>' + (compactParts.length ? ' · ' + compactParts.join(' · ') : '');

    var schadensdatum = f.schadensstichtag || f.Schadensdatum || '';
    var fragestellung = f.fragestellung || f.Fragestellung || '';
    var strasse = (f.objekt && f.objekt.adresse) || f.Strasse || '';
    var plz = (f.objekt && f.objekt.plz) || f.PLZ || '';
    var typLabel = (f.details && f.details.auftraggeber && f.details.auftraggeber.typ_label) || '';
    var gerichtsAz = (f.details && f.details.gerichts_az) || '';
    var rows = [
      ['Aktenzeichen', az, 'readonly'],
      ['Schadensart', schadensart || '—', 'editable', 'schadensart_label'],
      ['Schadensdatum', schadensdatum || '—', 'editable', 'schadensstichtag'],
      ['Auftraggeber', ag + (typLabel ? ' (' + typLabel + ')' : ''), 'readonly'],
      ['Objekt-Adresse', [strasse, plz, ort].filter(Boolean).join(', ') || '—', 'readonly'],
      ['Fragestellung', fragestellung || '—', 'editable', 'fragestellung'],
      ['Gerichts-Az', gerichtsAz || '—', 'editable', 'details.gerichts_az']
    ];
    grid.innerHTML = rows.map(function(r){
      var editable = r[2] === 'editable';
      var attr = editable
        ? ' contenteditable="true" data-field="' + r[3] + '" onblur="window.saveStammdatenField && window.saveStammdatenField(this)"'
        : '';
      var cls = 'ak-stamm-field-value' + (editable ? '' : ' readonly');
      return '<div class="ak-stamm-field">'
           + '<span class="ak-stamm-field-label">' + _ak_esc(r[0]) + '</span>'
           + '<span class="' + cls + '"' + attr + '>' + _ak_esc(r[1]) + '</span>'
           + '</div>';
    }).join('');

    // localStorage Default-State
    var bar = document.getElementById('ak-stamm-bar');
    try {
      var stored = localStorage.getItem('prova_akte_stamm_open');
      if (stored === '1' && bar) bar.setAttribute('data-expanded', 'true');
    } catch(_){}
  } catch(e) { console.warn('[renderStammdatenBar]', e.message); }
};

window.saveStammdatenField = async function(el){
  if (!el || !el.dataset || !el.dataset.field) return;
  var field = el.dataset.field;
  var value = (el.textContent || '').trim();
  if (value === '—') value = '';
  var f = window.currentFields || currentFields || {};
  var id = f.id || f._recordId;
  if (!id) return;
  try {
    var sb = await window._getSupabase();
    if (!sb) return;
    var update = {};
    if (field.indexOf('.') > 0) {
      // jsonb-Path z.B. details.gerichts_az
      var parts = field.split('.');
      var col = parts[0];
      var sub = parts[1];
      var current = f[col] || {};
      current[sub] = value;
      update[col] = current;
    } else {
      update[field] = value || null;
    }
    var res = await sb.from('auftraege').update(update).eq('id', id);
    if (res.error) {
      console.warn('[saveStammdatenField]', res.error.message);
      if (typeof showToast === 'function') showToast('Fehler: ' + res.error.message, 'error');
      return;
    }
    if (typeof showToast === 'function') showToast('Gespeichert ✓', 'success', 1500);
    // Update in-memory + Compact-Display
    if (field.indexOf('.') > 0) {
      var parts2 = field.split('.');
      f[parts2[0]] = f[parts2[0]] || {};
      f[parts2[0]][parts2[1]] = value;
    } else { f[field] = value; }
    window.renderStammdatenBar(f);
  } catch(e) { console.warn('[saveStammdatenField]', e); }
};

// ─── A.4: Phase-Confirm-Modal ────────────────────────────────────────
window._akPendingPhaseTarget = null;
window.openAkPhaseModal = function(targetPhase){
  var modal = document.getElementById('ak-phase-modal');
  if (!modal) return;
  var f = window.currentFields || currentFields || {};
  var current = parseInt(f.phase_aktuell || f.Phase || 1, 10);
  var icon = document.getElementById('ak-modal-icon');
  var title = document.getElementById('ak-modal-title');
  var text = document.getElementById('ak-modal-text');
  var btn = document.getElementById('ak-modal-confirm-btn');
  if (targetPhase < current) {
    if (icon) icon.textContent = '↩️';
    if (title) title.textContent = 'Phase ' + targetPhase + ' nochmals öffnen?';
    if (text) text.textContent = 'Bisherige Daten bleiben erhalten — nur der Phase-Pointer ändert sich. Du kannst jederzeit wieder nach vorne springen.';
    if (btn) btn.textContent = 'Phase ' + targetPhase + ' öffnen';
  } else {
    if (icon) icon.textContent = '→';
    if (title) title.textContent = 'Phase abschließen?';
    if (text) text.textContent = 'Du wechselst von Phase ' + current + ' zu Phase ' + targetPhase + '.';
    if (btn) btn.textContent = 'Phase wechseln';
  }
  window._akPendingPhaseTarget = targetPhase;
  modal.classList.add('is-open');
  // Esc + Click-outside
  modal.addEventListener('click', function _e(e){ if (e.target === modal) { window.closeAkPhaseModal(); modal.removeEventListener('click', _e); } });
  setTimeout(function(){ btn && btn.focus(); }, 50);
};
window.closeAkPhaseModal = function(){
  var modal = document.getElementById('ak-phase-modal');
  if (modal) modal.classList.remove('is-open');
  window._akPendingPhaseTarget = null;
};
window.confirmAkPhaseModal = function(){
  var target = window._akPendingPhaseTarget;
  window.closeAkPhaseModal();
  if (typeof target === 'number' && window._akteUpdatePhase) window._akteUpdatePhase(target);
};
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') window.closeAkPhaseModal && window.closeAkPhaseModal();
});

// Ersetzt MEGA82 confirm()-basierte aktePrevPhase
window.aktePrevPhase = function(){
  var f = window.currentFields || currentFields || {};
  var phase = parseInt(f.phase_aktuell || f.Phase || 1, 10);
  if (phase <= 1) return;
  window.openAkPhaseModal(phase - 1);
};
window.akteNextPhase = function(){
  var f = window.currentFields || currentFields || {};
  var phase = parseInt(f.phase_aktuell || f.Phase || 1, 10);
  var phasen = window.getAktePhasenForAuftrag ? window.getAktePhasenForAuftrag(f) : [];
  if (phase >= (phasen.length || 4)) return;
  window.openAkPhaseModal(phase + 1);
};

// ─── A.6: Phase-Checklist mit Smart-Detection ──────────────────────
// Pro Flow + Phase eine Liste mit { label, key (für Smart-Detection),
// action (URL/Funktion), required (bool für Phase-Abschluss-Gate) }
var AK_CHECKLISTS = {
  A: {
    1: [
      { key:'stammdaten',   label:'Stammdaten erfasst',        required:true },
      { key:'auftraggeber', label:'Auftraggeber zugewiesen',   required:true },
      { key:'bestaetigung', label:'Auftragsbestätigung erstellt (optional)', action:'auftragsbestaetigung.html' },
      { key:'honorar',      label:'Honorar-Vereinbarung (optional)', action:'honorar-rechner.html' }
    ],
    2: [
      { key:'termin',  label:'Termin angelegt',     required:true, action:'termine.html' },
      { key:'diktat',  label:'Diktat aufgenommen',  action:'vor-ort.html' },
      { key:'foto',    label:'Fotos hochgeladen',   action:'#upload' },
      { key:'skizze',  label:'Skizze erstellt',     action:'skizzen.html' },
      { key:'messung', label:'Messwerte erfasst',   manual:true }
    ],
    3: [
      { key:'normen',     label:'Recherche Normen/Bausteine', action:'normen.html' },
      { key:'ki_entwurf', label:'§§ 1–5 KI-Vorentwurf' },
      { key:'fachurteil', label:'§ 6 Fachurteil eigenhändig', required:true, action:'fachurteil.html' },
      { key:'kosten',     label:'§ 7 Kostenermittlung' },
      { key:'qualitaet',  label:'Qualitäts-/§407a-Check',     manual:true }
    ],
    4: [
      { key:'freigabe', label:'Freigabe-Wizard durchgeführt', required:true, action:'freigabe.html' },
      { key:'pdf',      label:'PDF erstellt' },
      { key:'versand',  label:'Versendet' },
      { key:'rechnung', label:'Rechnung erstellt',           action:'rechnungen.html' }
    ]
  },
  B: {
    1: [{ key:'stammdaten', label:'Bewertungsanlass + Grundbuch', required:true },
        { key:'verfahren', label:'Verfahren-Vorauswahl' },
        { key:'ag', label:'AG-Daten' }],
    2: [{ key:'termin', label:'Ortstermin durchgeführt', required:true },
        { key:'objektdaten', label:'Objektdaten erfasst' },
        { key:'foto', label:'Fotos hochgeladen' },
        { key:'baulasten', label:'Baulastenauskunft', manual:true }],
    3: [{ key:'berechnung', label:'Berechnung gewähltes Verfahren', required:true },
        { key:'anpassungen', label:'Anpassungen dokumentiert' },
        { key:'plausibilitaet', label:'Plausibilitätscheck', manual:true }],
    4: [{ key:'freigabe', label:'Freigabe-Wizard', required:true, action:'freigabe.html' },
        { key:'pdf', label:'PDF erstellt' },
        { key:'versand', label:'Versendet' },
        { key:'honorar', label:'Rechnung erstellt', action:'rechnungen.html' }]
  },
  C: {
    1: [{ key:'thema', label:'Beratungsthema dokumentiert', required:true },
        { key:'ag', label:'AG-Daten' },
        { key:'honorar', label:'Honorar-Vereinbarung' }],
    2: [{ key:'termin', label:'Termin (Telefon/Vor-Ort/Video)' },
        { key:'diktat', label:'Diktat/Protokoll', action:'vor-ort.html' },
        { key:'empfehlungen', label:'Handlungsempfehlungen', manual:true }],
    3: [{ key:'kurzstellungnahme', label:'Kurzstellungnahme/Brief erstellt', required:true },
        { key:'pdf', label:'PDF erstellt' },
        { key:'stundenabrechnung', label:'Stundenabrechnung', action:'rechnungen.html' }]
  },
  D: {
    1: [{ key:'baubeschreibung', label:'Baubeschreibung erfasst', required:true },
        { key:'phasenplan', label:'Bauphasen-Plan' },
        { key:'intervall', label:'Begehungsintervall' }],
    2: [{ key:'begehung', label:'Begehung durchgeführt', action:'vor-ort.html' },
        { key:'foto', label:'Fotos pro Begehung' },
        { key:'maengel', label:'Mängelerfassung', manual:true }],
    3: [{ key:'schlussbericht', label:'Schluss-Bericht erstellt', required:true },
        { key:'restmaengel', label:'Restmängel dokumentiert' },
        { key:'pdf', label:'Abnahme-PDF erstellt' },
        { key:'honorar', label:'Rechnung (JVEG/Pauschal)' }]
  }
};

// Smart-Detection: Liefert Set der "done"-Keys basierend auf realen Daten
async function _ak_smartDoneSet(auftragId){
  var done = {};
  try {
    var sb = await window._getSupabase();
    if (!sb || !auftragId) return done;
    var [tRes, eRes, dRes, fRes, sRes] = await Promise.all([
      sb.from('termine').select('id').eq('auftrag_id', auftragId).is('deleted_at', null).limit(1),
      sb.from('eintraege').select('id, typ, kategorie').eq('auftrag_id', auftragId).is('deleted_at', null).limit(50),
      sb.from('dokumente').select('id, typ, status').eq('auftrag_id', auftragId).is('deleted_at', null).limit(50),
      sb.from('fristen').select('id').eq('auftrag_id', auftragId).is('deleted_at', null).limit(50),
      sb.from('skizzen').select('id').eq('auftrag_id', auftragId).limit(1)
    ]);
    if ((tRes.data || []).length > 0) done.termin = true;
    var eintraege = eRes.data || [];
    eintraege.forEach(function(e){
      var typ = String(e.typ || '').toLowerCase();
      var kat = String(e.kategorie || '').toLowerCase();
      if (typ === 'diktat' || kat.indexOf('diktat') >= 0) done.diktat = true;
      if (typ === 'foto' || kat.indexOf('foto') >= 0) done.foto = true;
      if (typ === 'mix') { done.diktat = done.diktat || true; }
      if (kat.indexOf('messung') >= 0 || kat.indexOf('messwert') >= 0) done.messung = true;
      if (kat.indexOf('befund') >= 0 || kat.indexOf('begehung') >= 0) done.begehung = true;
    });
    (dRes.data || []).forEach(function(d){
      var typ = String(d.typ || '').toLowerCase();
      if (typ.indexOf('rechnung') >= 0) done.rechnung = done.honorar = done.stundenabrechnung = true;
      if (typ === 'auftragsbestaetigung') done.bestaetigung = true;
      if (typ === 'brief') done.kurzstellungnahme = true;
      if (typ.indexOf('mahnung') >= 0) done.mahnung = true;
      if (d.status === 'versendet' || d.status === 'gelesen') done.versand = true;
      if (d.status === 'generiert' || d.status === 'versendet') done.pdf = true;
    });
    if ((sRes.data || []).length > 0) done.skizze = true;
  } catch(e) { console.warn('[_ak_smartDoneSet]', e.message); }
  return done;
}

window.renderPhaseChecklist = async function(f){
  try {
    var phaseTitleEl = document.getElementById('ak-phase-title');
    var phaseSubEl = document.getElementById('ak-phase-sub');
    var listEl = document.getElementById('ak-checklist');
    if (!listEl) return;
    var phase = parseInt(f.phase_aktuell || f.Phase || 1, 10);
    var flow = window.getFlow ? window.getFlow(f.typ || f.auftrag_typ || f.Auftragstyp) : 'A';
    var checklist = (AK_CHECKLISTS[flow] && AK_CHECKLISTS[flow][phase]) || [];
    if (!checklist.length) {
      listEl.innerHTML = '<div class="ak-side-empty">Keine spezifischen Aufgaben.</div>';
      return;
    }
    // Phase-Title + Sub
    var phaseNames = { A:{1:'Auftrag',2:'Termin',3:'Analyse',4:'Abschluss'},
                       B:{1:'Auftrag',2:'Objekt',3:'Bewertung',4:'Abschluss'},
                       C:{1:'Auftrag',2:'Beratung',3:'Abschluss'},
                       D:{1:'Auftrag',2:'+n Begehung',3:'Abschluss'} };
    var pname = (phaseNames[flow] || phaseNames.A)[phase] || ('Phase ' + phase);
    if (phaseTitleEl) phaseTitleEl.textContent = 'Phase ' + phase + ' — ' + pname;
    if (phaseSubEl) phaseSubEl.textContent = checklist.length + ' Aufgabe' + (checklist.length === 1 ? '' : 'n') + ' für diese Phase';

    // Smart-Detection: parallel zu Phase-Checks
    var auftragId = f.id || f._recordId;
    var done = await _ak_smartDoneSet(auftragId);
    // Manuelle Checks aus auftraege.details->>'phase_checks'
    var manualChecks = (f.details && f.details.phase_checks) || {};

    listEl.innerHTML = checklist.map(function(item){
      var isDone = !!done[item.key] || !!manualChecks[item.key];
      var actionLink = '';
      if (item.action) {
        if (item.action === '#upload') {
          actionLink = '<a class="ak-check-action" href="javascript:document.getElementById(\'dok-file-input\').click()">Hochladen →</a>';
        } else {
          actionLink = '<a class="ak-check-action" href="' + _ak_esc(item.action) + '">Öffnen →</a>';
        }
      }
      var click = item.manual
        ? ' onclick="window.togglePhaseCheck && window.togglePhaseCheck(\'' + _ak_esc(item.key) + '\')"'
        : '';
      return '<div class="ak-checklist-row' + (isDone ? ' done' : '') + '"' + click + '>'
           + '<span class="ak-check-icon">' + (isDone ? '✓' : '') + '</span>'
           + '<span class="ak-check-label">' + _ak_esc(item.label) + (item.required && !isDone ? ' <em style="color:var(--warning);font-style:normal;font-size:10px;">*</em>' : '') + '</span>'
           + actionLink
           + '</div>';
    }).join('');
  } catch(e) { console.warn('[renderPhaseChecklist]', e.message); }
};

// Manueller Toggle für Checklist-Items
window.togglePhaseCheck = async function(key){
  var f = window.currentFields || currentFields || {};
  var id = f.id || f._recordId;
  if (!id) return;
  var details = f.details || {};
  details.phase_checks = details.phase_checks || {};
  details.phase_checks[key] = !details.phase_checks[key];
  try {
    var sb = await window._getSupabase();
    if (!sb) return;
    await sb.from('auftraege').update({ details: details }).eq('id', id);
    f.details = details;
    window.renderPhaseChecklist(f);
  } catch(e) { console.warn('[togglePhaseCheck]', e); }
};

// ─── A.5: Activity-Sidebar — 5 Sub-Blocks parallel ────────────────
window.renderActivitySidebar = async function(f){
  try {
    var auftragId = f.id || f._recordId;
    if (!auftragId) return;
    var sb = await window._getSupabase();
    if (!sb) return;

    var [actRes, dokRes, fristRes, terminRes] = await Promise.all([
      // Multi-Entity-Audit-Trail: entity_typ=auftrag direkt OR payload.auftrag_id
      sb.from('audit_trail')
        .select('id, action, entity_typ, entity_id, payload, created_at')
        .or('and(entity_typ.eq.auftrag,entity_id.eq.' + auftragId + '),payload->>auftrag_id.eq.' + auftragId)
        .order('created_at', { ascending: false }).limit(5),
      sb.from('dokumente')
        .select('id, typ, doc_nummer, betreff, bytes, pdf_url, storage_path, created_at')
        .eq('auftrag_id', auftragId).is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(5),
      sb.from('fristen')
        .select('id, frist_typ, notiz, datum_soll, status')
        .eq('auftrag_id', auftragId).is('deleted_at', null).eq('status', 'offen')
        .order('datum_soll', { ascending: true }).limit(3),
      sb.from('termine')
        .select('id, titel, typ, datum, uhrzeit_von, ort_name, status')
        .eq('auftrag_id', auftragId).is('deleted_at', null)
        .not('status', 'in', '(durchgefuehrt,abgesagt,kein_zustandekommen)')
        .order('datum', { ascending: true }).limit(2)
    ]);

    // ── Aktivität ──
    var actEl = document.getElementById('ak-side-activity');
    if (actEl) {
      var actRows = actRes.data || [];
      if (!actRows.length) {
        actEl.innerHTML = '<div class="ak-side-empty">Noch keine Aktivität.</div>';
      } else {
        var verbMap = { create:'angelegt', update:'aktualisiert', read:'geöffnet',
          delete:'gelöscht', ki_request:'KI gefragt', ki_response:'KI-Antwort',
          pdf_generate:'PDF erstellt', pdf_send:'PDF versendet', freigabe:'freigegeben' };
        actEl.innerHTML = actRows.map(function(r){
          var verb = verbMap[r.action] || r.action;
          var entity = r.entity_typ || 'Item';
          var label = entity.charAt(0).toUpperCase() + entity.slice(1);
          return '<div class="ak-side-row">'
               + '<span class="ak-side-row-icon">·</span>'
               + '<div class="ak-side-row-body">' + _ak_esc(label) + ' ' + _ak_esc(verb)
               + '<div class="ak-side-row-meta">' + _ak_esc(_ak_relTime(r.created_at)) + '</div>'
               + '</div></div>';
        }).join('');
      }
    }
    var aTrailLink = document.getElementById('ak-side-activity-all');
    if (aTrailLink) aTrailLink.href = 'audit-trail.html?auftrag=' + encodeURIComponent(f.az || auftragId);

    // ── Dokumente ──
    var dokEl = document.getElementById('ak-side-dokumente');
    if (dokEl) {
      var dokRows = dokRes.data || [];
      if (!dokRows.length) {
        dokEl.innerHTML = '<div class="ak-side-empty">Keine Dokumente.</div>';
      } else {
        var typIcons = { rechnung:'💶', rechnung_jveg:'💶', rechnung_stunden:'💶',
          mahnung_1:'⚠️', mahnung_2:'⚠️', mahnung_3:'⚠️', brief:'✉️',
          bescheinigung:'📑', gutachten:'📄' };
        dokEl.innerHTML = dokRows.map(function(d){
          var icon = typIcons[d.typ] || '📎';
          var name = d.doc_nummer || d.betreff || (d.typ || 'Dokument');
          var href = d.pdf_url || (d.storage_path ? '#' : '#');
          return '<a class="ak-side-row" href="' + _ak_esc(href) + '" target="_blank" style="text-decoration:none;color:inherit;">'
               + '<span class="ak-side-row-icon">' + icon + '</span>'
               + '<div class="ak-side-row-body">' + _ak_esc(name)
               + '<div class="ak-side-row-meta">' + _ak_bytes(d.bytes) + '</div>'
               + '</div></a>';
        }).join('');
      }
    }

    // ── Fristen ──
    var fristEl = document.getElementById('ak-side-fristen');
    if (fristEl) {
      var fristRows = fristRes.data || [];
      if (!fristRows.length) {
        fristEl.innerHTML = '<div class="ak-side-empty">Keine offenen Fristen.</div>';
      } else {
        var today = new Date();today.setHours(0,0,0,0);
        fristEl.innerHTML = fristRows.map(function(fr){
          var due = fr.datum_soll ? new Date(fr.datum_soll + 'T00:00:00') : null;
          var days = due ? Math.floor((due - today) / 86400000) : null;
          var color = days !== null && days < 3 ? 'var(--danger)' : (days !== null && days < 7 ? 'var(--warning)' : 'var(--text2)');
          var label = days === null ? '—' : (days < 0 ? 'überfällig' : days === 0 ? 'heute' : 'in ' + days + ' Tag' + (days === 1 ? '' : 'en'));
          var datStr = due ? due.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}) : '';
          return '<div class="ak-side-row" style="color:' + color + ';">'
               + '<span class="ak-side-row-icon">⏰</span>'
               + '<div class="ak-side-row-body">' + _ak_esc(fr.frist_typ || 'Frist') + ' · ' + datStr
               + '<div class="ak-side-row-meta">' + _ak_esc(label) + '</div>'
               + '</div></div>';
        }).join('');
      }
    }
    var fristAdd = document.getElementById('ak-side-frist-add');
    if (fristAdd) fristAdd.href = 'fristen.html?auftrag=' + encodeURIComponent(f.az || auftragId);

    // ── Termine ──
    var terminEl = document.getElementById('ak-side-termine');
    if (terminEl) {
      var terminRows = terminRes.data || [];
      if (!terminRows.length) {
        terminEl.innerHTML = '<div class="ak-side-empty">Keine offenen Termine.</div>';
      } else {
        terminEl.innerHTML = terminRows.map(function(t){
          var d = t.datum ? new Date(t.datum + 'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}) : '';
          var time = t.uhrzeit_von ? String(t.uhrzeit_von).slice(0,5) : '';
          var label = t.titel || t.typ || 'Termin';
          var ort = t.ort_name || '';
          return '<a class="ak-side-row" href="termine.html?id=' + encodeURIComponent(t.id) + '" style="text-decoration:none;color:inherit;">'
               + '<span class="ak-side-row-icon">📅</span>'
               + '<div class="ak-side-row-body">' + _ak_esc(d) + ' ' + _ak_esc(time) + ' · ' + _ak_esc(label)
               + (ort ? '<div class="ak-side-row-meta">' + _ak_esc(ort) + '</div>' : '')
               + '</div></a>';
        }).join('');
      }
    }
    var terminAdd = document.getElementById('ak-side-termin-add');
    if (terminAdd) terminAdd.href = 'termine.html?auftrag=' + encodeURIComponent(f.az || auftragId);

  } catch(e) { console.warn('[renderActivitySidebar]', e.message); }
};
