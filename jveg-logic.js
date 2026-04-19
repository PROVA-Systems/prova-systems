/* ════════════════════════════════════════════════════════════
   PROVA jveg-logic.js
   JVEG-Rechner — Honorar, Fahrtkosten, Auslagen
   Extrahiert aus jveg.html
════════════════════════════════════════════════════════════ */

/* zeigToast → globales showToast */
if (!window.zeigToast && window.showToast) window.zeigToast = window.showToast;
if (!window.showToast && window.zeigToast) window.showToast = window.zeigToast;

(function(){
'use strict';

/* ─── SIDEBAR ─── */
var paket=localStorage.getItem('prova_paket')||'Solo';
var pc={'Solo':'#4f8ef7','Team':'#a78bfa'}[paket]||'#4f8ef7';
(function(){
  var el=document.getElementById('topbar-paket-badge');
  if(el){el.style.display='none';} // Paket steht in Sidebar unten
  var appUrl='app.html'; // Session 30 Legacy-Cleanup
})();
if(!localStorage.getItem('prova_user')){window.location.href='app-login.html';return;}

/* ─── BERECHNUNG ─── */
var KM_SATZ=0.42;
var SCHREIB_SATZ=0.90;
var FOTO_SATZ=2.00;

function num(id){return Math.max(0,parseFloat(document.getElementById(id).value)||0);}
function satz(){return parseFloat(document.getElementById('sachgebiet').value)||85;}
function hasMwSt(){return document.getElementById('mwst-toggle').checked;}
function fmt(v){return v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}

window.step=function(id,delta){
  var el=document.getElementById(id);
  var v=Math.max(0,+(parseFloat(el.value)||0)+delta);
  el.value=v%1===0?v:v.toFixed(2);
  update();
};

window.update=function(){
  var hGut=num('stundenGutachten');
  var hAkten=num('stundenAkten');
  var km=num('km');
  var warte=num('wartezeit');
  var schreib=num('schreibseiten');
  var fotos=num('fotos');
  var s=satz();
  var mwst=hasMwSt();

  // §3 Zeitzuschläge
  var zzNacht = document.getElementById('zz-nacht') && document.getElementById('zz-nacht').checked;
  var zzSonntag = document.getElementById('zz-sonntag') && document.getElementById('zz-sonntag').checked;
  var zzNachtFeiertag = document.getElementById('zz-nacht-feiertag') && document.getElementById('zz-nacht-feiertag').checked;
  var zzBesond = document.getElementById('zz-besond') && document.getElementById('zz-besond').checked;
  var zzFaktor = 1 + (zzNacht ? 0.25 : 0) + (zzSonntag ? 0.25 : 0) + (zzNachtFeiertag ? 0.40 : 0) + (zzBesond ? 0.10 : 0);
  // Zuschlag nur auf Zeitstunden (nicht KM/Schreib/Fotos)
  var sEffektiv = s * zzFaktor;

  var s1=hGut*sEffektiv,s2=hAkten*sEffektiv,s3=km*KM_SATZ,s4=warte*sEffektiv,s5=schreib*SCHREIB_SATZ,s6=fotos*FOTO_SATZ;
  var netto=s1+s2+s3+s4+s5+s6;

  // Zeitzuschlag-Info anzeigen
  var zzInfo = document.getElementById('zz-info');
  if (zzInfo) {
    if (zzFaktor > 1) {
      var aufschlag = Math.round((zzFaktor - 1) * 100);
      zzInfo.style.display = 'block';
      zzInfo.textContent = 'Zeitzuschlag §3 JVEG: ' + aufschlag + '% → ' + fmt(s) + '/h → ' + fmt(sEffektiv) + '/h';
    } else {
      zzInfo.style.display = 'none';
    }
  }
  var mwstBetrag=mwst?netto*0.19:0;
  var brutto=netto+mwstBetrag;

  // Zeilen ein-/ausblenden
  toggleRow('row-gutachten',s1>0,num('stundenGutachten')+'h',fmt(s)+'/h','sum1',s1);
  toggleRow('row-akten',s2>0,num('stundenAkten')+'h',fmt(s)+'/h','sum2',s2);
  toggleRow('row-km',s3>0,num('km')+' km','','sum3',s3);
  toggleRow('row-warte',s4>0,num('wartezeit')+'h','','sum4',s4);
  toggleRow('row-schreib',s5>0,num('schreibseiten')+' S','','sum5',s5);
  toggleRow('row-foto',s6>0,num('fotos')+' Stk','','sum6',s6);

  setText('qty1',hGut+' h');setText('ep1',s+' €/h');
  setText('qty2',hAkten+' h');setText('ep2',s+' €/h');
  setText('qty3',km+' km');setText('qty4',warte+' h');setText('ep4',s+' €/h');
  setText('qty5',schreib+' Seiten');setText('qty6',fotos+' Stk');

  setText('netto-td',fmt(netto));
  setText('mwst-td',fmt(mwstBetrag));
  setText('brutto-td',fmt(brutto));
  setText('brutto-big',fmt(brutto));
  setText('netto-hint',fmt(netto)+' netto + '+fmt(mwstBetrag)+' MwSt.');
  setText('mwst-label-td',mwst?'19 % MwSt.':'0 % MwSt. (§4 UStG)');
  document.getElementById('mwst-toggle-label').textContent=mwst?'19 % MwSt. inklusive':'§4 UStG befreit (0 %)';

  // Flow-Button aktivieren wenn Betrag > 0
  var btn=document.getElementById('btn-rechnung');
  if(btn)btn.disabled=brutto<=0;

  // Aktuellen Stand im sessionStorage cachen für Rechnungs-Übergabe
  try{
    sessionStorage.setItem('prova_jveg_data',JSON.stringify({
      honorargruppe:document.getElementById('sachgebiet').options[document.getElementById('sachgebiet').selectedIndex].dataset.gruppe||'M2',
      stundensatz:s,
      stunden_gutachten:hGut,stunden_akten:hAkten,km:km,wartezeit:warte,schreibseiten:schreib,fotos:fotos,
      netto:netto,mwst_betrag:mwstBetrag,brutto:brutto,
      mit_mwst:mwst,aktenzeichen:document.getElementById('aktenzeichen').value.trim(),
      ts:new Date().toISOString()
    }));
  }catch(e){}
};

function toggleRow(rowId,show,qty,ep,sumId,val){
  var row=document.getElementById(rowId);
  if(!row)return;
  row.classList.toggle('active',show);
  if(show&&sumId)document.getElementById(sumId).textContent=fmt(val);
}
function setText(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}

/* ─── JVEG → RECHNUNG FLOW ─── */
window.alsRechnungUebernehmen=function(){
  var jveg=null;
  try{jveg=JSON.parse(sessionStorage.getItem('prova_jveg_data')||'null');}catch(e){}
  if(!jveg||jveg.brutto<=0){zeigToast('Bitte zuerst Werte eingeben','err');return;}

  var banner=document.getElementById('transfer-banner');
  var btn=document.getElementById('btn-rechnung');
  banner.classList.add('show');
  btn.disabled=true;
  btn.textContent='⏳ Wird übertragen…';

  // Übergabe-Daten in sessionStorage schreiben
  sessionStorage.setItem('prova_rechnung_prefill',JSON.stringify({
    typ:'JVEG',
    source:'jveg_rechner',
    honorargruppe:jveg.honorargruppe,
    stundensatz:jveg.stundensatz,
    stunden_gesamt:+(jveg.stunden_gutachten+jveg.stunden_akten).toFixed(2),
    stunden_gutachten:jveg.stunden_gutachten,
    stunden_akten:jveg.stunden_akten,
    km:jveg.km,wartezeit:jveg.wartezeit,schreibseiten:jveg.schreibseiten,fotos:jveg.fotos,
    netto:jveg.netto,mwst_betrag:jveg.mwst_betrag,brutto:jveg.brutto,
    mit_mwst:jveg.mit_mwst,aktenzeichen:jveg.aktenzeichen,
    // Kontext aus Akte mitgeben
    auftraggeber_name: localStorage.getItem('prova_auftraggeber_name') || '',
    auftraggeber_email: localStorage.getItem('prova_auftraggeber_email') || '',
    rueckweg: jveg.aktenzeichen ? ('akte.html?az=' + encodeURIComponent(jveg.aktenzeichen)) : 'archiv.html'
  }));

  setTimeout(function(){window.location.href='rechnungen.html?from=jveg';},1200);
};

/* ─── KOPIEREN ─── */
window.kopiereErgebnis=function(){
  var jveg=null;
  try{jveg=JSON.parse(sessionStorage.getItem('prova_jveg_data')||'null');}catch(e){}
  if(!jveg){zeigToast('Nichts zu kopieren','err');return;}
  var az=jveg.aktenzeichen?'AZ: '+jveg.aktenzeichen+'\n':'';
  var text=az
    +'JVEG-Berechnung\n'
    +(jveg.stunden_gutachten>0?'Honorar Gutachten: '+jveg.stunden_gutachten+' h × '+jveg.stundensatz+' €/h = '+fmt(jveg.stunden_gutachten*jveg.stundensatz)+'\n':'')
    +(jveg.stunden_akten>0?'Honorar Aktenstudium: '+jveg.stunden_akten+' h × '+jveg.stundensatz+' €/h = '+fmt(jveg.stunden_akten*jveg.stundensatz)+'\n':'')
    +(jveg.km>0?'Fahrtkosten: '+jveg.km+' km × 0,42 €/km = '+fmt(jveg.km*KM_SATZ)+'\n':'')
    +(jveg.wartezeit>0?'Wartezeit: '+jveg.wartezeit+' h × '+jveg.stundensatz+' €/h = '+fmt(jveg.wartezeit*jveg.stundensatz)+'\n':'')
    +(jveg.schreibseiten>0?'Schreibauslagen: '+jveg.schreibseiten+' S × 0,90 €/S = '+fmt(jveg.schreibseiten*SCHREIB_SATZ)+'\n':'')
    +(jveg.fotos>0?'Fotos: '+jveg.fotos+' Stk × 2,00 €/Stk = '+fmt(jveg.fotos*FOTO_SATZ)+'\n':'')
    +'─────────────────\n'
    +'Netto: '+fmt(jveg.netto)+'\n'
    +(jveg.mit_mwst?'MwSt. 19 %: '+fmt(jveg.mwst_betrag)+'\n':'')
    +'Brutto: '+fmt(jveg.brutto);
  function fmt(v){return v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
  navigator.clipboard&&navigator.clipboard.writeText(text).then(function(){zeigToast('Ergebnis kopiert ✓');}).catch(function(){zeigToast('Kopieren nicht unterstützt','err');});
};

/* ─── HELPER ─── */
window.zeigToast=function(msg,typ){
  var t=document.getElementById('toast');
  t.textContent=msg;t.className='toast'+(typ==='err'?' err':'');
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');},3000);
};

// Init
update();

// ── Kontext aus URL-Parameter oder localStorage laden ──
(function ladeKontext() {
  var params = new URLSearchParams(window.location.search);
  // AZ: erst URL-Parameter, dann localStorage
  var az = params.get('az') || localStorage.getItem('prova_letztes_az') || '';
  if (az) {
    var azEl = document.getElementById('aktenzeichen');
    if (azEl && !azEl.value) {
      azEl.value = az;
      azEl.classList.add('prefilled');
    }
  }
  // Schadenart → Sachgebiet vorschlagen
  // Zeiterfassung aus Akte → Stunden vorausfüllen
  var zeitSek = parseInt(localStorage.getItem('prova_zeit_dauer_sek') || '0');
  if (zeitSek > 0) {
    var stunden = Math.max(0.5, Math.round(zeitSek / 3600 * 4) / 4); // Runden auf 0.25h
    var stdEl = document.getElementById('stundenGutachten');
    if (stdEl && stdEl.value === '0') {
      stdEl.value = stunden;
      stdEl.classList.add('prefilled');
    }
  }
  // JVEG-Prefill aus freigabe.html (sessionStorage)
  try {
    var prefill = JSON.parse(sessionStorage.getItem('prova_rechnung_prefill') || '{}');
    if (prefill.stunden_gutachten) {
      var stdEl2 = document.getElementById('stundenGutachten');
      if (stdEl2) { stdEl2.value = prefill.stunden_gutachten; stdEl2.classList.add('prefilled'); }
    }
    if (prefill.km) {
      var kmEl = document.getElementById('km');
      if (kmEl) { kmEl.value = prefill.km; kmEl.classList.add('prefilled'); }
    }
  } catch(e) {}
  // Nach Befüllen Berechnung updaten
  setTimeout(function(){ if(typeof update==='function') update(); }, 100);

  var sa = params.get('sa') || localStorage.getItem('prova_schadenart') || '';
  if (sa) {
    var sgEl = document.getElementById('sachgebiet');
    if (sgEl) {
      // Wasserschaden/Schimmel/Feuchte → M2 (Bau)
      // Brand/Sturm/Elementar → M2
      // Default M2 ist bereits gesetzt, nur bei Sonderfällen anpassen
      var saL = sa.toLowerCase();
      if (saL.includes('wasser') || saL.includes('schimmel') || saL.includes('feuchte') ||
          saL.includes('brand') || saL.includes('sturm') || saL.includes('bau')) {
        // M2 = 95€/h — Bauschäden: korrekt, kein Änderung nötig
        // Aber Hinweis-Toast anzeigen
        setTimeout(function() {
          zeigToast('Honorargruppe für ' + sa + ' vorausgefüllt — bitte prüfen', 'info');
        }, 800);
      }
    }
  }
})();

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
    await fetch('/.netlify/functions/make-proxy?key=sup',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        betreff:b,nachricht:n,
        sv_email:localStorage.getItem('prova_sv_email')||'',
        paket:localStorage.getItem('prova_paket')||'Solo',
        seite:window.location.pathname,
        ts:new Date().toISOString()
      })
    });
  }catch(e){}
  document.getElementById('support-form-body').style.display='none';
  document.getElementById('sup-ok').style.display='block';
}

/* ══════════════════════════════════════════════════════════
   SMART DEFAULTS — Memory System (Raycast-Prinzip)
   Merkt sich die letzten Eingaben und füllt beim nächsten
   Öffnen automatisch vor. Der SV ändert nur was anders ist.
   ══════════════════════════════════════════════════════════ */
(function() {
  var DEFAULTS_KEY = 'prova_jveg_defaults';

  /* ── Defaults laden und Felder vorausfüllen ── */
  function ladeDefaults() {
    var d;
    try { d = JSON.parse(localStorage.getItem(DEFAULTS_KEY) || 'null'); } catch(e) {}
    if (!d) return; // Erster Start — keine Defaults

    // Sachgebiet (Honorargruppe) wiederherstellen
    var sg = document.getElementById('sachgebiet');
    if (sg && d.sachgebiet) {
      sg.value = d.sachgebiet;
    }

    // KM-Satz wiederherstellen (falls angepasst)
    // Stunden NICHT vorausfüllen — die sind fallspezifisch

    // MwSt-Toggle wiederherstellen
    var mwst = document.getElementById('mwst-toggle');
    if (mwst && d.mit_mwst !== undefined) {
      mwst.checked = d.mit_mwst;
    }

    // AZ aus letztem Fall
    var azEl = document.getElementById('jveg-az');
    if (azEl && !azEl.value) {
      var letzterAz = localStorage.getItem('prova_letztes_az') || '';
      if (letzterAz) { azEl.value = letzterAz; azEl.classList.add('prefilled'); }
    }

    // Visual hint: zeige dass Werte aus Memory kommen
    if (d.sachgebiet) {
      var hint = document.getElementById('smart-default-hint');
      if (hint) {
        hint.style.display = 'flex';
        // Auto-hide nach 4s
        setTimeout(function() { hint.style.display = 'none'; }, 4000);
      }
    }

    update();
  }

  /* ── Defaults speichern (bei jeder Änderung) ── */
  function speichereDefaults() {
    var sg = document.getElementById('sachgebiet');
    var mwst = document.getElementById('mwst-toggle');
    try {
      localStorage.setItem(DEFAULTS_KEY, JSON.stringify({
        sachgebiet: sg ? sg.value : null,
        mit_mwst:   mwst ? mwst.checked : true,
        ts: Date.now()
      }));
    } catch(e) {}
  }

  /* ── Hooks auf Inputs ── */
  function hookInputs() {
    var sg = document.getElementById('sachgebiet');
    if (sg) sg.addEventListener('change', speichereDefaults);
    var mwst = document.getElementById('mwst-toggle');
    if (mwst) mwst.addEventListener('change', speichereDefaults);
  }

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      ladeDefaults();
      hookInputs();
    });
  } else {
    ladeDefaults();
    hookInputs();
  }

})();

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
    seite: 'app.html#step2',
    icon: '🎙️',
    farbe: '#4f8ef7'
  },
  {
    schritt: 3,
    name: 'KI-Analyse',
    seite: 'app.html#step3',
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
        + '" onmouseover="this.style.background=\'" + naechster.farbe + "33\'"'
        + ' onmouseout="this.style.background=\'" + naechster.farbe + "22\'">'
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
  if (insertAfter) {
    insertAfter.insertAdjacentHTML('afterend', bannerHtml);
  }
}
})();
/* ── JVEG-Rechnung als PDF via PDFMonkey ── */
window.erstelleJVEGRechnungPDF = async function() {
  // Rechnung-Daten sammeln
  var daten = {
    template_id: 'S32BEA1F-9D1D-40CE-8A84-542C50B98437',  // JVEG-Gerichtsrechnung Template
    sv_name:     [localStorage.getItem('prova_sv_vorname'), localStorage.getItem('prova_sv_nachname')].filter(Boolean).join(' '),
    sv_email:    localStorage.getItem('prova_sv_email') || '',
    sv_firma:    localStorage.getItem('prova_sv_firma') || '',
    sv_strasse:  localStorage.getItem('prova_sv_strasse') || '',
    sv_plz:      localStorage.getItem('prova_sv_plz') || '',
    sv_ort:      localStorage.getItem('prova_sv_ort') || '',
    sv_iban:     localStorage.getItem('prova_sv_iban') || '',
    stundensatz: (document.getElementById('sachgebiet') || {}).value || '85',
    gesamtbetrag: (document.getElementById('total-brutto') || {}).textContent || '',
    datum:       new Date().toLocaleDateString('de-DE'),
    az:          localStorage.getItem('prova_letztes_az') || ''
  };
  
  if(typeof zeigToast==='function') zeigToast('Rechnung wird als PDF erstellt…');
  
  try {
    // Über Make G3-Webhook oder direkt PDFMonkey
    var res = await fetch('/.netlify/functions/make-proxy?key=g3', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ aktion: 'jveg_pdf', ...daten })
    });
    if(typeof zeigToast==='function') zeigToast('JVEG-Rechnung PDF erstellt ✅');
  } catch(e) {
    if(typeof zeigToast==='function') zeigToast('PDF-Fehler: ' + e.message, 'error');
  }
};

window.jvegZurRechnung = function() {
  var az = localStorage.getItem('prova_letztes_az') || '';
  // JVEG-Daten für Rechnung vorbereiten
  try {
    var netto = 0;
    document.querySelectorAll('.jveg-row-total').forEach(function(el) {
      netto += parseFloat(el.dataset.netto || '0') || 0;
    });
    // Fallback: Gesamtsumme aus UI lesen
    if (!netto) {
      var totalEl = document.getElementById('total-netto') || document.querySelector('[id*="netto"]');
      if (totalEl) netto = parseFloat(totalEl.textContent.replace(/[^0-9,.]/g, '').replace(',', '.')) || 0;
    }
    var prefill = {
      az: az,
      herkunft: 'jveg',
      netto: netto,
      betreff: 'JVEG-Vergütung Gutachten ' + az,
      timestamp: Date.now()
    };
    sessionStorage.setItem('prova_rechnung_prefill', JSON.stringify(prefill));
    console.log('[JVEG] Prefill gesetzt:', prefill);
  } catch(e) {
    console.warn('[JVEG] Prefill-Fehler:', e.message);
  }
  var ziel = 'rechnungen.html?from=jveg' + (az ? '&az=' + encodeURIComponent(az) : '');
  window.location.href = ziel;
};
