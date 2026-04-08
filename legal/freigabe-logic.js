/* ════════════════════════════════════════════════════════════
   PROVA freigabe-logic.js
   Freigabe — PDF-Flow, §407a, G3-Webhook, Deploy-Steps
   Extrahiert aus freigabe.html
════════════════════════════════════════════════════════════ */

/* zeigToast → globales showToast */
if (!window.zeigToast && window.showToast) window.zeigToast = window.showToast;
if (!window.showToast && window.zeigToast) window.showToast = window.zeigToast;

'use strict';
if(!localStorage.getItem('prova_user')) location.href='app-login.html';

const AT_BASE='appJ7bLlAHZoxENWE', AT_TABLE='tblSxV8bsXwd1pwa0';
const WH_S3='https://hook.eu1.make.com/44kqx7eo142aw7warqao4c4wqo1nw158';
const WH_S1='https://hook.eu1.make.com/imn2n5xs7j251xicrmdmk17of042pt2t';

let recId=null, recFields=null, svProfil=null, editMode=false;

/* INIT */
window.addEventListener('DOMContentLoaded',()=>{
  pruefeS6();
  ladeGutachten();
});

/* S6 CHECK */
function pruefeS6(){
  const done = localStorage.getItem('prova_stellungnahme_done')==='1';
  const txt  = localStorage.getItem('prova_stellungnahme_text')||'';
  const banner=document.getElementById('s6-banner');
  const status=document.getElementById('s6-status');
  const btn=document.getElementById('btnFreigeben');
  if(!done||txt.length<50){
    banner.style.display='flex';
    if(btn) btn.disabled=true;
  } else {
    banner.className='s6-banner s6-ok';
    banner.style.display='flex';
    if(status) status.textContent='✅ §6 Fachurteil liegt vor — freigabefähig';
    setTimeout(()=>{banner.style.display='none';},3000);
  }
}

/* LADEN */
async function ladeGutachten(){
  const rid=sessionStorage.getItem('prova_record_id');
  // AZ aus mehreren Quellen laden (URL-Parameter, sessionStorage, localStorage)
  const urlParams=new URLSearchParams(location.search);
  const fall=urlParams.get('fall')
    || urlParams.get('az')
    || sessionStorage.getItem('prova_current_az')
    || localStorage.getItem('prova_letztes_az')
    || '';
  let url;
  if(rid&&!fall){
    url=`/v0/${AT_BASE}/${AT_TABLE}/${rid}`;
  } else if(fall){
    url=`/v0/${AT_BASE}/${AT_TABLE}?filterByFormula=${encodeURIComponent(`AND(OR({Aktenzeichen}="${fall}"),{KI_Entwurf}!="")`)}&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=1`;
  } else {
    url=`/v0/${AT_BASE}/${AT_TABLE}?filterByFormula=${encodeURIComponent('{KI_Entwurf}!=""')}&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=1`;
  }
  try {
    const res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:url})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data=await res.json();
    let rec=rid&&!fall ? data : data.records?.[0];
    if(!rec) throw new Error('Kein Gutachten gefunden.');
    recId=rec.id; recFields=rec.fields||{};
    await ladeSVProfil();
    renderDoc();
    document.getElementById('loading-indicator').style.display='none';
    document.getElementById('doc-content-area').style.display='block';
    localStorage.setItem('prova_letztes_az', recFields.Aktenzeichen||'');
  // Breadcrumb + Status befüllen
  var _az = recFields.Aktenzeichen || recFields.Schadensnummer_Versicherung || '—';
  var _sa = recFields.Schadenart || recFields.Schadensart || '—';
  var _str = recFields.Adresse || recFields.Schaden_Strasse || '';
  var _adr = [_str, [recFields.PLZ, recFields.Ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—';
  befuelleBreadcrumb(_az, _sa, _adr);
  setStatusDot('ok');
    localStorage.setItem('prova_entwurf_text', recFields.KI_Entwurf||'');
  } catch(e){
    console.warn('[Freigabe] Airtable:', e.message);
    // ── FALLBACK: localStorage-Daten nutzen wenn Airtable keinen Record hat ──
    const lsEntwurf = localStorage.getItem('prova_entwurf_text') || '';
    const lsStell   = localStorage.getItem('prova_stellungnahme_text') || '';
    const lsAz      = localStorage.getItem('prova_letztes_az') || new URLSearchParams(location.search).get('az') || '—';
    const lsSa      = localStorage.getItem('prova_schadenart') || '—';
    const lsAdr     = localStorage.getItem('prova_adresse') || '—';
    const lsAgName  = localStorage.getItem('prova_auftraggeber_name') || '—';
    const lsAgEmail = localStorage.getItem('prova_auftraggeber_email') || '';

    if (lsEntwurf || lsStell) {
      // Synthetischen Record aus localStorage bauen
      recFields = {
        Aktenzeichen: lsAz,
        Schadenart: lsSa,
        Adresse: lsAdr,
        KI_Entwurf: lsEntwurf,
        Stellungnahme_Text: lsStell,
        Auftraggeber_Name: lsAgName,
        Auftraggeber_Email: lsAgEmail,
        Timestamp: new Date().toISOString(),
        _fallback: true
      };
      await ladeSVProfil();
      renderDoc();
      document.getElementById('loading-indicator').style.display = 'none';
      // Hinweis anzeigen dass Airtable-Sync fehlt
      const banner = document.getElementById('s6-banner');
      if (banner) {
        banner.style.display = 'flex';
        banner.className = 's6-banner s6-warn';
        const st = document.getElementById('s6-status');
        if (st) st.textContent = '⚠️ Offline-Modus — Airtable nicht synchronisiert. Bitte nach Verbindungsaufbau erneut laden.';
      }
    } else {
      document.getElementById('loading-indicator').innerHTML=
        `<div style="color:var(--red,#f87171);padding:20px;text-align:center;">
          <div style="font-size:1.2rem;margin-bottom:8px;">⚠️ Keine Gutachten-Daten gefunden</div>
          <div style="font-size:13px;color:var(--text3,rgba(255,255,255,.4));margin-bottom:16px;">
            Bitte erst den vollständigen Workflow durchlaufen:<br>
            Stammdaten → Diktat → Analyse → §6 Fachurteil → dann hier
          </div>
          <button onclick="history.back()" style="padding:8px 20px;border-radius:8px;background:rgba(79,142,247,.15);border:1px solid rgba(79,142,247,.3);color:#7eb3ff;cursor:pointer;font-family:inherit;font-size:13px;">← Zurück zu §6 Fachurteil</button>
        </div>`;
    }
  }
}

/* SV PROFIL */
async function ladeSVProfil(){
  const email=localStorage.getItem('prova_sv_email')||recFields.SV_Email||'';
  if(!email) return;
  try {
    const url=`/v0/${AT_BASE}/tbladqEQT3tmx4DIB?filterByFormula=${encodeURIComponent(`{SV_Email}="${email}"`)}&maxRecords=1`;
    const res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:url})});
    if(!res.ok) return;
    const d=await res.json();
    if(d?.records?.length){ svProfil=d.records[0].fields; svProfil.email=email; }
  } catch(e){}
}

/* RENDER */
function renderDoc(){
  const f=recFields;
  const az=f.Aktenzeichen||f.Schadensnummer_Versicherung||'—';
  const sa=f.Schadenart||f.Schadensart||'—';
  const str=f.Adresse||f.Schaden_Strasse||'';
  const adr=[str,[f.PLZ,f.Ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const svV=(svProfil&&svProfil.SV_Vorname)||localStorage.getItem('prova_sv_vorname')||'';
  const svN=(svProfil&&svProfil.SV_Nachname)||localStorage.getItem('prova_sv_nachname')||'';
  const svName=(svProfil&&svProfil.Name)||[svV,svN].filter(Boolean).join(' ')||'Sachverständiger';
  const svQ=(svProfil&&svProfil.Qualifikation)||localStorage.getItem('prova_sv_qualifikation')||'Sachverständiger';
  const buero=(svProfil&&svProfil.Firma)||localStorage.getItem('prova_bueronamen')||'';
  const svAdr=[(svProfil&&svProfil.Adresse),(svProfil&&svProfil.PLZ),(svProfil&&svProfil.Ort)].filter(Boolean).join(' · ');
  const ini=svName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'SV';
  const ts=f.Timestamp||''; const dtStr=ts?new Date(ts).toLocaleDateString('de-DE'):'—';

  document.getElementById('headerAz').textContent=az;
  document.getElementById('meta-az').textContent=az;
  document.getElementById('meta-art').textContent=sa;
  document.getElementById('meta-obj').textContent=adr||'—';
  document.getElementById('meta-datum').textContent=dtStr;
  document.getElementById('sv-initials').textContent=ini;
  document.getElementById('sv-name').textContent=buero||svName;
  document.getElementById('sv-quali').textContent=svQ;
  document.getElementById('sv-adresse').innerHTML=svAdr||'—';
  document.getElementById('doc-haupttitel').textContent=sa+' — '+(adr||az);
  document.getElementById('doc-auftragzeile').textContent=`AZ: ${az} · ${f.Auftraggeber_Name||'—'} · ${f.Geschaedigter||'—'}`;

  const entwurf=f.KI_Entwurf||'';
  const el=document.getElementById('gutachten-entwurf-content');
  if(entwurf){
    // Markdown-Preprocessor: GPT-4o Output aufbereiten
    let cleanText = entwurf
      .replace(/---\s*/g, '\n\n')                          // --- Trennlinien zu Absätzen
      .replace(/##(\d+)\s*/g, '\n## §$1 ')                 // ##1 → ## §1
      .replace(/\*\*([^*]+)\*\*/g, '**$1**')               // Bold behalten
      .replace(/\n{3,}/g, '\n\n');                          // Max 2 Leerzeilen
    
    if(typeof marked!=='undefined') {
      marked.setOptions({ breaks: true, gfm: true });
      el.innerHTML=marked.parse(cleanText);
    } else {
      el.innerHTML='<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.8;color:rgba(255,255,255,.8);">'+entwurf.replace(/</g,'&lt;')+'</pre>';
    }
  } else {
    el.innerHTML='<p style="color:#94a3b8;font-style:italic;">Kein Gutachten-Entwurf gefunden.</p>';
  }

  const s6=localStorage.getItem('prova_stellungnahme_text')||'';
  if(s6){
    var s6El=document.getElementById('section6-text');
    if(s6El){
      if(typeof marked!=='undefined'){
        marked.setOptions({breaks:true,gfm:true});
        s6El.innerHTML=marked.parse(s6);
        s6El.style.whiteSpace='normal';
      } else {
        s6El.innerHTML=s6.replace(/\n/g,'<br>');
      }
    }
    var s6Block=document.getElementById('section6-block');
    if(s6Block)s6Block.style.display='block';
  }

  // §7 Offenlegungstext — ab Pro automatisch generieren
  const paket=localStorage.getItem('prova_paket')||'Solo';
  const isPro=paket==='Solo'||paket==='Team';
  const isEnterprise=paket==='Team';
  const svNameOff=(svProfil&&svProfil.Name)||[
    (svProfil&&svProfil.SV_Vorname)||localStorage.getItem('prova_sv_vorname')||'',
    (svProfil&&svProfil.SV_Nachname)||localStorage.getItem('prova_sv_nachname')||''
  ].filter(Boolean).join(' ')||'der Sachverständige';
  const svQOff=(svProfil&&svProfil.Qualifikation)||localStorage.getItem('prova_sv_qualifikation')||'Sachverständiger';
  const datumOff=new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
  const azOff=f.Aktenzeichen||'—';

  let offText='';
  // Offenlegungstext für ALLE Pakete (§407a ZPO + EU AI Act)
  offText=`Gemäß §407a Abs. 2 ZPO erklärt der Sachverständige ${svNameOff}${svQOff ? ' ('+svQOff+')' : ''}, dass er das vorliegende Gutachten persönlich und eigenverantwortlich erstellt hat.

Zur Unterstützung bei der Erstellung wurde das digitale Assistenzsystem PROVA Systems (KI-gestützt) eingesetzt. Der Einsatz beschränkte sich ausschließlich auf folgende vorbereitende Tätigkeiten:
• §1–§3: Formale Strukturierung auf Basis der vom Sachverständigen eingegebenen Stammdaten (Aktenzeichen, Beteiligte, Objektdaten, Termine)
• §4: Sprachliche Formatierung des vom Sachverständigen diktierten Befundtextes in Fachsprache
• §5: Aufbereitung von Kausalitätshypothesen im Konjunktiv II auf Basis des Sachverständigen-Diktats und anerkannter Baunormen

Der Sachverständige hat alle KI-generierten Inhalte in §4 und §5 persönlich fachlich überprüft und bestätigt. §6 (Fachurteil) wurde ausschließlich vom Sachverständigen persönlich verfasst.

Sämtliche fachlichen Feststellungen, Messwerte, Normbewertungen und das gutachterliche Urteil in §6 beruhen ausschließlich auf der persönlichen Sachkenntnis und eigenverantwortlichen Beurteilung des Sachverständigen. Eine inhaltliche Einflussnahme durch das KI-System auf Feststellungen, Ursachenbewertung oder Handlungsempfehlungen hat nicht stattgefunden.

Offenlegung gemäß EU AI Act (Verordnung (EU) 2024/1689) Art. 13 (Transparenzpflicht) und Art. 14 (menschliche Aufsicht).

Aktenzeichen: \${azOff} · Erstellt am: \${datumOff} · §5-Prüfbestätigung: \${localStorage.getItem('prova_5pruef_ts')||'—'}`;

  // Gespeicherten Text bevorzugen (falls manuell überschrieben), sonst auto-generierten verwenden
  const offGespeichert=localStorage.getItem('prova_offenlegungstext')||f.Offenlegungstext||'';
  const offFinal=offGespeichert||offText;

  if(offFinal){
    var s7El=document.getElementById('section7-text');
    if(s7El){
      s7El.innerHTML=offFinal
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\n/g,'<br>');
    }
    var s7Block=document.getElementById('section7-block');
    if(s7Block)s7Block.style.display='block';
    if(!offGespeichert) localStorage.setItem('prova_offenlegungstext', offText);
  }
}

/* KI-QUALITÄTSPRÜFUNG */
async function starteQualitaetspruefung() {
  var btn = document.getElementById('btn-qi-check');
  var resultEl = document.getElementById('qi-result');
  var loadingEl = document.getElementById('qi-loading');
  var itemsEl = document.getElementById('qi-items');
  var summaryEl = document.getElementById('qi-summary');

  // Gutachten-Text sammeln
  var gutachtenText = ((recFields&&recFields.KI_Entwurf) || '') + '\n\n§6 Stellungnahme:\n' + (localStorage.getItem('prova_stellungnahme_text') || '[Noch nicht verfasst]');
  var beweisfragen = [];
  try {
    var cache = JSON.parse(localStorage.getItem('prova_faelle_cache') || '{}');
    var az = (recFields&&recFields.Aktenzeichen) || '';
    if (cache[az] && cache[az].beweisfragen) {
      beweisfragen = cache[az].beweisfragen.split('\n').filter(function(b) { return b.trim(); });
    }
  } catch(e) {}

  if (!gutachtenText || gutachtenText.length < 100) {
    zeigToast('Kein Gutachten-Entwurf vorhanden.', 'err');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ KI prüft…';
  resultEl.style.display = 'block';
  loadingEl.style.display = 'block';
  itemsEl.innerHTML = '';
  summaryEl.style.display = 'none';

  try {
    var res = await fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aufgabe: 'qualitaetspruefung',
        gutachten_text: gutachtenText,
        beweisfragen: beweisfragen,
        auftragstyp: localStorage.getItem('prova_gutachten_typ') || 'gerichtsgutachten'
      })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    loadingEl.style.display = 'none';

    if (data.parse_error) {
      itemsEl.innerHTML = '<div style="font-size:12px;color:var(--text3);">KI-Antwort konnte nicht verarbeitet werden. Bitte manuell prüfen.</div>';
      btn.disabled = false; btn.textContent = '🔍 Erneut prüfen';
      return;
    }

    // Prüfpunkte rendern
    var html = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a78bfa;margin-bottom:8px;">Prüfergebnis</div>';
    if (data.pruefpunkte && data.pruefpunkte.length) {
      data.pruefpunkte.forEach(function(p) {
        var icon = p.status === 'ok' ? '✅' : p.status === 'warnung' ? '⚠️' : '❌';
        var color = p.status === 'ok' ? '#10b981' : p.status === 'warnung' ? '#f59e0b' : '#ef4444';
        html += '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:12px;">'
          + '<span>' + icon + '</span>'
          + '<div><strong style="color:' + color + ';">' + (p.kategorie || '') + '</strong>'
          + (p.hinweis ? '<div style="color:var(--text3);margin-top:2px;">' + p.hinweis + '</div>' : '')
          + '</div></div>';
      });
    }
    itemsEl.innerHTML = html;

    // Zusammenfassung
    if (data.zusammenfassung) {
      var bgColor = data.gesamtergebnis === 'gruen' ? 'rgba(16,185,129,.08)' : data.gesamtergebnis === 'gelb' ? 'rgba(245,158,11,.08)' : 'rgba(239,68,68,.08)';
      var txtColor = data.gesamtergebnis === 'gruen' ? '#10b981' : data.gesamtergebnis === 'gelb' ? '#f59e0b' : '#ef4444';
      summaryEl.style.display = 'block';
      summaryEl.style.background = bgColor;
      summaryEl.style.color = txtColor;
      summaryEl.style.border = '1px solid ' + txtColor + '33';
      summaryEl.textContent = data.zusammenfassung;
    }

    btn.disabled = false;
    btn.textContent = '🔍 Erneut prüfen';
    btn.style.background = data.gesamtergebnis === 'gruen' ? 'rgba(16,185,129,.08)' : 'rgba(167,139,250,.08)';
    btn.style.borderColor = data.gesamtergebnis === 'gruen' ? 'rgba(16,185,129,.2)' : 'rgba(167,139,250,.2)';
    btn.style.color = data.gesamtergebnis === 'gruen' ? '#10b981' : '#a78bfa';

  } catch(e) {
    loadingEl.style.display = 'none';
    itemsEl.innerHTML = '<div style="font-size:12px;color:var(--danger);">Fehler: ' + e.message + '</div>';
    btn.disabled = false; btn.textContent = '🔍 Erneut prüfen';
  }
}

/* ── AUDIT-LOG TIMELINE ── */
window.toggleAuditLog = function() {
  var panel = document.getElementById('audit-log-panel');
  var icon = document.getElementById('audit-toggle-icon');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    icon.style.transform = 'rotate(90deg)';
    renderAuditTimeline();
  } else {
    panel.style.display = 'none';
    icon.style.transform = '';
  }
};

function renderAuditTimeline() {
  var el = document.getElementById('audit-timeline');
  if (!el) return;

  var events = [];
  var now = new Date();
  var f = recFields || {};

  // 1. Fall angelegt
  var erstellt = f.Created || f.Erstellt;
  if (erstellt) {
    events.push({ zeit: erstellt, icon: '📂', titel: 'Fall angelegt', detail: 'Aktenzeichen: ' + (f.Aktenzeichen || '—'), typ: 'system' });
  }

  // 2. Diktat — Start und Ende mit Dauer
  var diktatStartTs = localStorage.getItem('prova_diktat_start_ts');
  var diktatEndeTs  = localStorage.getItem('prova_diktat_ende_ts');
  var diktatTs      = diktatStartTs || localStorage.getItem('prova_diktat_ts');
  var diktatDauer   = localStorage.getItem('prova_diktat_dauer_sek');
  var transkriptLen = (localStorage.getItem('prova_transkript') || '').length;
  if (diktatTs) {
    var diktatDetail = 'Sachverständiger hat Befunddaten diktiert';
    if (diktatDauer) {
      var min = Math.floor(parseInt(diktatDauer) / 60);
      var sek = parseInt(diktatDauer) % 60;
      diktatDetail += ' · Dauer: ' + (min > 0 ? min + ' Min ' : '') + sek + ' Sek';
    }
    if (transkriptLen > 0) diktatDetail += ' · ' + transkriptLen + ' Zeichen';
    events.push({ zeit: diktatTs, icon: '🎤', titel: 'Diktat / Befund-Eingabe', detail: diktatDetail, typ: 'sv' });
  }
  if (diktatEndeTs && diktatEndeTs !== diktatTs) {
    events.push({ zeit: diktatEndeTs, icon: '⏹️', titel: 'Diktat beendet', detail: 'Aufnahme gestoppt · Text wird KI-bereinigt', typ: 'sv' });
  }

  // 3. KI-Entwurf generiert — aus localStorage oder Airtable
  var kiTs = localStorage.getItem('prova_ki_ts') || f.KI_Entwurf_Datum || f.Modified;
  var kiModell = localStorage.getItem('prova_ki_modell') || 'GPT-4o · PROVA-Analyse';
  if (kiTs || (f.KI_Entwurf && f.KI_Entwurf.length > 100)) {
    var kiLen = (f.KI_Entwurf || '').length;
    events.push({
      zeit: kiTs || now.toISOString(),
      icon: '🤖',
      titel: 'KI-Entwurf generiert (§1–§5)',
      detail: (kiLen > 0 ? kiLen + ' Zeichen · ' : '') + kiModell + ' · Struktur, Normen-Vorschläge, Konjunktiv-Prüfung',
      typ: 'ki'
    });
  }

  // 4. SV-Änderungen am Entwurf
  var editCount = parseInt(localStorage.getItem('prova_entwurf_edits') || '0');
  if (editCount > 0) {
    events.push({ zeit: localStorage.getItem('prova_entwurf_edit_ts') || now.toISOString(), icon: '✏️', titel: 'SV hat KI-Entwurf bearbeitet', detail: editCount + ' Änderung(en) am generierten Text · SV-Eigenverantwortung', typ: 'sv' });
  }

  // 5. Stellungnahme §6
  var stText = localStorage.getItem('prova_stellungnahme_text');
  var stWeg  = localStorage.getItem('prova_stellungnahme_weg');
  var stTs   = localStorage.getItem('prova_stellungnahme_ts');
  var kj2Ok  = localStorage.getItem('prova_stellungnahme_kj2_ok');
  if (stText && stText.length > 20) {
    var wegLabel = stWeg === 'B'
      ? 'KI-unterstützt ausformuliert (Weg B) — SV hat Stichpunkte vorgegeben'
      : 'Komplett vom SV selbst verfasst (Weg A)';
    var kj2Label = kj2Ok === '1' ? ' · ✅ Konjunktiv II geprüft' : ' · ⚠️ Konjunktiv-Verstöße erkannt';
    events.push({ zeit: stTs || now.toISOString(), icon: '⚖️', titel: '§6 Stellungnahme verfasst', detail: wegLabel + ' · ' + stText.length + ' Zeichen' + kj2Label, typ: stWeg === 'B' ? 'ki-sv' : 'sv' });
  }

  // 6. KI-Qualitätsprüfung
  var qiDone = localStorage.getItem('prova_qi_done');
  if (qiDone) {
    events.push({ zeit: localStorage.getItem('prova_qi_ts') || now.toISOString(), icon: '🔍', titel: 'KI-Qualitätsprüfung durchgeführt', detail: 'Prüfung auf Vollständigkeit, Normen-Konsistenz, Konjunktiv II', typ: 'ki' });
  }

  // 7. §407a ZPO Bestätigung
  var confirm407a = localStorage.getItem('prova_407a_ts') || f.bestaetigung_407a;
  if (confirm407a) {
    var svName = [localStorage.getItem('prova_sv_vorname'), localStorage.getItem('prova_sv_nachname')].filter(Boolean).join(' ') || 'Sachverständiger';
    events.push({ zeit: confirm407a, icon: '✅', titel: '§407a ZPO — Persönliche Bestätigung', detail: svName + ' hat persönliche Prüfung und fachliche Verantwortung bestätigt · Rechtsverbindlich', typ: 'sv' });
  }

  // 8. Freigabe / PDF-Export
  if (f.Status === 'Freigegeben' || f.Status === 'freigegeben' || f.Status === 'Exportiert') {
    events.push({ zeit: f.Freigabe_Datum || f.PDF_Datum || now.toISOString(), icon: '🎉', titel: 'Gutachten freigegeben & exportiert', detail: 'PDF generiert · §407a dokumentiert · EU AI Act Art. 14 (KI-Label) enthalten', typ: 'system' });
  }

  // Sortieren (älteste zuerst)
  events.sort(function(a, b) { return new Date(a.zeit) - new Date(b.zeit); });

  // Fallback wenn keine Events
  if (events.length === 0) {
    events.push({ zeit: now.toISOString(), icon: '📂', titel: 'Fall geladen', detail: 'Noch keine Aktionen dokumentiert', typ: 'system' });
  }

  // Rendern
  var colors = { 'sv': '#10b981', 'ki': '#a78bfa', 'ki-sv': '#f59e0b', 'system': '#4f8ef7' };
  var labels = { 'sv': 'SV', 'ki': 'KI', 'ki-sv': 'KI+SV', 'system': 'System' };

  el.innerHTML = events.map(function(ev, i) {
    var c = colors[ev.typ] || '#6b7280';
    var d = new Date(ev.zeit);
    var datum = d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    var isLast = i === events.length - 1;

    return '<div style="display:flex;gap:12px;position:relative;padding-bottom:' + (isLast ? '0' : '16') + 'px;">'
      // Vertikale Linie
      + (isLast ? '' : '<div style="position:absolute;left:15px;top:28px;bottom:0;width:2px;background:var(--border);"></div>')
      // Icon-Kreis
      + '<div style="width:32px;height:32px;border-radius:50%;background:' + c + '22;border:2px solid ' + c + ';display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;z-index:1;">' + ev.icon + '</div>'
      // Content
      + '<div style="flex:1;min-width:0;">'
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">'
      + '<span style="font-size:12px;font-weight:700;color:var(--text);">' + ev.titel + '</span>'
      + '<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:' + c + '22;color:' + c + ';">' + labels[ev.typ] + '</span>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--text3);">' + ev.detail + '</div>'
      + '<div style="font-size:10px;color:var(--text3);margin-top:2px;">📅 ' + datum + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

/* ── BUNDESSTEMPEL: SV-Daten laden und SVG befüllen ── */
(function initStempel() {
  var vn = localStorage.getItem('prova_sv_vorname') || '';
  var nn = localStorage.getItem('prova_sv_nachname') || '';
  var quali = localStorage.getItem('prova_sv_quali') || 'Bausachverständiger';
  var ort  = localStorage.getItem('prova_sv_ort') || '';
  var fullName = (vn + ' ' + nn).trim().toUpperCase() || 'IHR NAME';
  // Kürzel: Initialen
  var kuerzel = ((vn[0]||'') + (nn[0]||'')).toUpperCase() || 'SV';

  var elName   = document.getElementById('stempel-name-mitte');
  var elKuerzel= document.getElementById('stempel-kuerzel');
  var elQuali  = document.getElementById('stempel-quali-mitte');
  var elOrt    = document.getElementById('stempel-ort-bot');
  var elTop    = document.getElementById('stempel-name-top');

  if (elName)    elName.textContent    = fullName;
  if (elKuerzel) elKuerzel.textContent = kuerzel;
  if (elQuali)   elQuali.textContent   = quali.toUpperCase().substring(0,28);
  if (elOrt)     elOrt.textContent     = ort ? ('ÖBUV · ' + ort.toUpperCase()) : 'BUNDESREPUBLIK DEUTSCHLAND';
  if (elTop)     elTop.textContent     = 'ÖBUV SACHVERSTÄNDIGER';
})();

window.exportStempelSVG = function() {
  var svg = document.getElementById('sv-stempel-svg');
  if (!svg) return;
  var svgData = new XMLSerializer().serializeToString(svg);
  var blob = new Blob([svgData], {type:'image/svg+xml'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  var nn   = localStorage.getItem('prova_sv_nachname') || 'SV';
  a.href = url; a.download = 'PROVA-Stempel-' + nn + '.svg';
  a.click(); URL.revokeObjectURL(url);
};

/* §407a + §5 BESTÄTIGUNG — beide Checkboxen müssen aktiv sein */
function toggle407a(){
  var cb407  = document.getElementById('cb407a');
  var cb5    = document.getElementById('cb5pruef');
  var btn    = document.getElementById('btnFreigeben');
  var hinweis= document.getElementById('cb-hinweis');

  var beideGecheckt = cb407 && cb5 && cb407.checked && cb5.checked;

  if(btn){
    btn.disabled = !beideGecheckt;
    btn.style.opacity = beideGecheckt ? '1' : '.5';
    btn.style.cursor  = beideGecheckt ? 'pointer' : 'not-allowed';
  }

  // Hinweis ausblenden wenn beide gecheckt
  if(hinweis) hinweis.style.display = beideGecheckt ? 'none' : 'flex';

  // Audit-Timestamps
  var now = new Date().toISOString();
  if(cb407 && cb407.checked) {
    localStorage.setItem('prova_407a_ts', now);
  } else {
    localStorage.removeItem('prova_407a_ts');
  }
  if(cb5 && cb5.checked) {
    localStorage.setItem('prova_5pruef_ts', now);
  } else {
    localStorage.removeItem('prova_5pruef_ts');
  }
}

/* FREIGEBEN */
async function approveGutachten(){
  if(!recId||!recFields){zeigToast('Kein Datensatz geladen.','err');return;}
  const btn=document.getElementById('btnFreigeben');
  btn.disabled=true; btn.textContent='Einen Moment…';
  const f=recFields;
  const payload={
    airtable_id:recId,
    aktenzeichen:(f.Aktenzeichen !== null && f.Aktenzeichen !== undefined && f.Aktenzeichen !== '' ? f.Aktenzeichen : ''),schadensdatum:(f.Schadensdatum !== null && f.Schadensdatum !== undefined && f.Schadensdatum !== '' ? f.Schadensdatum : ''),
    schadensart:f.Schadenart||(f.Schadensart !== null && f.Schadensart !== undefined && f.Schadensart !== '' ? f.Schadensart : ''),
    gebaeudetyp:(f.Gebaeude_Typ !== null && f.Gebaeude_Typ !== undefined && f.Gebaeude_Typ !== '' ? f.Gebaeude_Typ : ''),baujahr:(f.Baujahr !== null && f.Baujahr !== undefined && f.Baujahr !== '' ? f.Baujahr : ''),
    strasse:f.Adresse||(f.Schaden_Strasse !== null && f.Schaden_Strasse !== undefined && f.Schaden_Strasse !== '' ? f.Schaden_Strasse : ''),
    plz:(f.PLZ !== null && f.PLZ !== undefined && f.PLZ !== '' ? f.PLZ : ''),ort:(f.Ort !== null && f.Ort !== undefined && f.Ort !== '' ? f.Ort : ''),
    geschaedigter:(f.Geschaedigter !== null && f.Geschaedigter !== undefined && f.Geschaedigter !== '' ? f.Geschaedigter : ''),
    auftraggeber_name:(f.Auftraggeber_Name !== null && f.Auftraggeber_Name !== undefined && f.Auftraggeber_Name !== '' ? f.Auftraggeber_Name : ''),
    auftraggeber_typ:(f.Auftraggeber_Typ !== null && f.Auftraggeber_Typ !== undefined && f.Auftraggeber_Typ !== '' ? f.Auftraggeber_Typ : ''),
    auftraggeber_email:(f.Auftraggeber_Email !== null && f.Auftraggeber_Email !== undefined && f.Auftraggeber_Email !== '' ? f.Auftraggeber_Email : ''),
    bereich:(f.Bereich !== null && f.Bereich !== undefined && f.Bereich !== '' ? f.Bereich : ''),messwerte:(f.Messwerte !== null && f.Messwerte !== undefined && f.Messwerte !== '' ? f.Messwerte : ''),
    gutachten_entwurf:(f.KI_Entwurf !== null && f.KI_Entwurf !== undefined && f.KI_Entwurf !== '' ? f.KI_Entwurf : ''),
    sv_email:(svProfil&&svProfil.email)||localStorage.getItem('prova_sv_email')||'',
    stellungnahme_text:localStorage.getItem('prova_stellungnahme_text')||'',
    stellungnahme_weg:localStorage.getItem('prova_stellungnahme_weg')||'A',
    stellungnahme_ts:localStorage.getItem('prova_stellungnahme_ts')||new Date().toISOString(),
    gutachten_typ:localStorage.getItem('prova_gutachten_typ')||'gericht',
    offenlegungstext:localStorage.getItem('prova_offenlegungstext')||'',
    bestaetigung_407a:new Date().toISOString(),
    bestaetigung_5pruef:localStorage.getItem('prova_5pruef_ts')||new Date().toISOString(),
    bestaetigung_5pruef_text:'KI-Kausalitätshypothesen §5 persönlich fachlich geprüft und bestätigt gemäß IHK-SVO §3',
    bestaetigung_407a_text:'Persönlich geprüft und fachliche Verantwortung übernommen gemäß §407a ZPO',
    // EU AI Act Label für PDF-Template (TO-DO aus Session 4)
    ki_label:'KI-gestützt erstellt, geprüft und verantwortet durch '
      +([localStorage.getItem('prova_sv_vorname'),localStorage.getItem('prova_sv_nachname')].filter(Boolean).join(' ')||'den Sachverständigen'),
    gutachter_name:[localStorage.getItem('prova_sv_vorname'),localStorage.getItem('prova_sv_nachname')].filter(Boolean).join(' ')||'',
    paket:localStorage.getItem('prova_paket')||'Solo',
  };
  try {
    const res=await fetch(WH_S3,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!res.ok) throw new Error('HTTP '+res.status);
    document.getElementById('approve-content').style.display='none';
    document.getElementById('erfolg').classList.add('show');
    const chip=document.getElementById('doc-status');
    chip.className='status-chip status-approved';
    chip.innerHTML='<div style="width:7px;height:7px;border-radius:50%;background:currentColor;"></div> Freigegeben';
    localStorage.setItem('prova_stellungnahme_done','0');

    // Airtable Status → "Freigegeben" (non-blocking)
    try {
      fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'PATCH',
          path: '/v0/' + AT_BASE + '/' + AT_TABLE + '/' + recId,
          payload: {
            fields: {
              Status: 'Freigegeben',
              Freigabe_Datum: new Date().toISOString().split('T')[0],
              Freigabe_Durch: localStorage.getItem('prova_sv_email') || ''
            }
          }
        })
      }).catch(e => console.warn('Status-Update:', e));
    } catch(e) { console.warn('Freigabe Status:', e); }

    // E-Mail CTA einblenden
    try {
      var agEmail = payload.auftraggeber_email || '';
      var agName  = payload.auftraggeber_name  || 'Auftraggeber';
      var az      = payload.aktenzeichen || '';
      var svName  = payload.gutachter_name || 'Sachverständiger';
      var mailSubject = encodeURIComponent('Gutachten ' + az + ' – Freigabe');
      var mailBody    = encodeURIComponent(
        'Sehr geehrte Damen und Herren,\n\nIhr Gutachten zum Aktenzeichen ' + az +
        ' wurde soeben freigegeben.\nSie erhalten das PDF in Kürze per E-Mail.\n\n' +
        'Mit freundlichen Grüßen\n' + svName
      );
      var ctaDiv = document.getElementById('erfolg-email-cta');
      if (ctaDiv) {
        ctaDiv.innerHTML = (agEmail
          ? '<a href="mailto:' + agEmail + '?subject=' + mailSubject + '&body=' + mailBody + '" '
            + 'style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;'
            + 'background:rgba(79,142,247,.12);border:1px solid rgba(79,142,247,.25);color:#4f8ef7;'
            + 'font-size:12px;font-weight:700;text-decoration:none;">'
            + '📧 E-Mail an ' + agName + '</a>'
          : '')
          + '<button onclick="window.print()" style="padding:8px 16px;border-radius:8px;'
            + 'background:var(--surface2);border:1px solid var(--border2);color:var(--text2);'
            + 'font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">'
            + '🖨 Drucken</button>'
          + '<a href="archiv.html" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;'
            + 'background:var(--surface2);border:1px solid var(--border2);color:var(--text2);'
            + 'font-size:12px;font-weight:600;text-decoration:none;">'
            + '📂 Zum Archiv</a>';
      }
    } catch(e) {}

    // Archiv-Cache invalidieren damit Status sofort korrekt zeigt
    try {
      var cache = JSON.parse(localStorage.getItem('prova_archiv_cache_v2') || '{}');
      if (cache.data) {
        cache.data = cache.data.map(function(r) {
          if (r.id === recId) {
            r.fields = r.fields || {};
            r.fields.Status = 'Freigegeben';
          }
          return r;
        });
        cache.ts = Date.now();
        localStorage.setItem('prova_archiv_cache_v2', JSON.stringify(cache));
      }
    } catch(e) {}
  } catch(e){
    zeigToast('Freigabe fehlgeschlagen: '+e.message,'err');
    btn.disabled=false; btn.textContent='✅ Gutachten freigeben';
  }
}

/* KORREKTUR */
async function rejectGutachten(){
  const txt=document.getElementById('korrekturText').value.trim();
  if(!txt){zeigToast('Bitte Korrekturhinweis eingeben.','warn');return;}
  if(!recId){zeigToast('Kein Datensatz.','err');return;}
  try {
    const res=await fetch(WH_S1,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({airtable_id:recId,aktenzeichen:(recFields&&recFields.Aktenzeichen)||'',korrektur_hinweise:txt,sv_email:localStorage.getItem('prova_sv_email')||''})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    zeigToast('Korrektur angefordert ✅','ok');
    document.getElementById('korrekturSub').classList.remove('open');
  } catch(e){ zeigToast('Fehler: '+e.message,'err'); }
}

/* BEARBEITEN */
function toggleEdit(){
  editMode=!editMode;
  const el=document.getElementById('gutachten-entwurf-content');
  const btnE=document.getElementById('btn-edit');
  const btnS=document.getElementById('btn-save');
  el.contentEditable=editMode?'true':'false';
  btnE.textContent=editMode?'✖ Abbrechen':'✏️ Bearbeiten';
  btnE.className='btn-tool'+(editMode?' edit-active':'');
  btnS.style.display=editMode?'block':'none';
  if(editMode) el.focus();
}
async function speichereAenderungen(){
  const txt=document.getElementById('gutachten-entwurf-content').innerText;
  if(!recId){zeigToast('Kein Datensatz.','err');return;}
  try {
    const url=`/v0/${AT_BASE}/${AT_TABLE}/${recId}`;
    const res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'PATCH',path:url,payload:{fields:{KI_Entwurf:txt}}})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    if(recFields) recFields.KI_Entwurf=txt;
    localStorage.setItem('prova_entwurf_text',txt);
    zeigToast('Gespeichert ✅','ok');
    toggleEdit();
  } catch(e){ zeigToast('Fehler beim Speichern.','err'); }
}

/* PRÜFLISTE */
function toggleCheck(item){
  item.classList.toggle('checked');
  const tot=document.querySelectorAll('#checkList .check-item').length;
  const done=document.querySelectorAll('#checkList .check-item.checked').length;
  document.getElementById('checkCount').textContent=`${done} / ${tot} Punkte geprüft`;
}

/* WEITERE */
function toggleWeitere(){
  const body=document.getElementById('weitereBody');
  const icon=document.getElementById('w-icon');
  const open=body.classList.toggle('open');
  icon.textContent=open?'▲':'▼';
}
function toggleKorrektur(){
  document.getElementById('korrekturSub').classList.toggle('open');
}

/* WORD EXPORT */
function exportiereAlsWord(){
  const az=(recFields&&recFields.Aktenzeichen)||'—';
  const svN=[localStorage.getItem('prova_sv_vorname'),localStorage.getItem('prova_sv_nachname')].filter(Boolean).join(' ');
  const buero=localStorage.getItem('prova_bueronamen')||'';
  const quali=localStorage.getItem('prova_sv_qualifikation')||'';
  const heute=new Date().toLocaleDateString('de-DE');
  const entwurf=(recFields&&recFields.KI_Entwurf)||localStorage.getItem('prova_entwurf_text')||'';
  const s6=localStorage.getItem('prova_stellungnahme_text')||'';
  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"><meta name=ProgId content=Word.Document><style>body{font-family:Arial,sans-serif;font-size:11pt;margin:2cm;line-height:1.5;}h1,h2{font-size:13pt;font-weight:bold;color:#1E3A5F;border-bottom:1px solid #ccc;padding-bottom:4pt;margin-top:16pt;}.kpf{border-bottom:2px solid #1E3A5F;padding-bottom:10pt;margin-bottom:18pt;}.az{background:#f5f5f5;border:1px solid #ccc;padding:8pt;margin:10pt 0;}.foot{border-top:1px solid #ccc;margin-top:28pt;padding-top:8pt;font-size:9pt;color:#666;}
/* ── freigabe.html — Neue UI-Elemente ── */
.freig-tab {
  padding: 10px 18px;
  font-size: 12px;font-weight: 600;
  background: transparent;border: none;
  border-bottom: 2px solid transparent;
  color: var(--text3);cursor: pointer;
  font-family: var(--font-ui);
  transition: all .15s;
}
.freig-tab:hover { color: var(--text2); }
.freig-tab.active { color: var(--accent);border-bottom-color: var(--accent); }

/* Freigabe-Sektion als klarer Abschluss-Moment */
.approve-section-v2 {
  background: rgba(16,185,129,.04);
  border: 1px solid rgba(16,185,129,.15);
  border-radius: var(--r-lg);
  padding: 20px;
  margin-top: 0;
}
.approve-section-v2 .section-title {
  font-size: 13px;font-weight: 700;
  color: var(--text);margin-bottom: 14px;
  display: flex;align-items: center;gap: 8px;
}

/* Status-Chip verbessert */
.status-chip {
  display: inline-flex;align-items: center;gap: 5px;
  font-size: 11px;font-weight: 700;
  padding: 3px 10px;border-radius: 20px;
}
.status-entwurf { background: rgba(245,158,11,.1);color: var(--warn); }
.status-freigegeben { background: rgba(16,185,129,.1);color: var(--green); }

/* Erfolg-State verbessert */
.erfolg-v2 {
  text-align: center;padding: 40px 20px;
  background: rgba(16,185,129,.04);
  border: 1px solid rgba(16,185,129,.2);
  border-radius: var(--r-lg);
  margin-top: 16px;
}
.erfolg-v2 .erfolg-icon-big { font-size: 48px;margin-bottom: 12px; }
.erfolg-v2 .erfolg-title { font-size: 20px;font-weight: 700;color: var(--green);margin-bottom: 6px; }
.erfolg-v2 .erfolg-sub { font-size: 13px;color: var(--text2);margin-bottom: 20px; }
.erfolg-actions { display: flex;gap: 10px;justify-content: center;flex-wrap: wrap; }

/* Progress-Bar für PDF-Generierung */
.pdf-progress {
  display: none;
  height: 3px;background: rgba(255,255,255,.06);
  border-radius: 2px;overflow: hidden;margin: 12px 0;
}
.pdf-progress.active { display: block; }
.pdf-progress-fill {
  height: 100%;width: 0%;
  background: linear-gradient(90deg,#4f8ef7,#10b981);
  border-radius: 2px;
  animation: pdf-load 3s ease-out forwards;
}
@keyframes pdf-load { from{width:0%} to{width:95%} }


/* ══ SaaS Design System — Linear/Stripe/Vercel/Notion ══ */

/* LINEAR: Calm design — keine aggressiven Farben */
.s6-banner {
  border-radius: var(--r-md);
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.s6-missing {
  background: rgba(245,158,11,.07);
  border: 1px solid rgba(245,158,11,.2);
  color: var(--warn);
}
.s6-ok {
  background: rgba(16,185,129,.07);
  border: 1px solid rgba(16,185,129,.2);
  color: var(--green);
}
.s6-link {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  background: rgba(79,142,247,.1);
  border: 1px solid rgba(79,142,247,.2);
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;
  text-decoration: none;
}

/* STRIPE: Checklist-Pattern statt Gate */
.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: rgba(255,255,255,.02);
  border: 1px solid var(--border);
  margin-bottom: 8px;
  transition: all .15s;
  cursor: pointer;
}
.checklist-item:hover {
  background: rgba(255,255,255,.04);
  border-color: rgba(255,255,255,.12);
}
.checklist-item.checked {
  background: rgba(16,185,129,.05);
  border-color: rgba(16,185,129,.2);
}
.checklist-box {
  width: 18px;height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--border2);
  display: flex;align-items: center;justify-content: center;
  flex-shrink: 0;margin-top: 2px;
  transition: all .15s;
  font-size: 11px;
}
.checklist-item.checked .checklist-box {
  background: #10b981;border-color: #10b981;color: #fff;
}
.checklist-label { font-size: 12px;color: var(--text2);line-height: 1.55; }
.checklist-label strong { color: var(--text); }
.checklist-consequence {
  font-size: 10px;color: var(--text3);
  margin-top: 4px;
  display: none;
}
.checklist-item.checked .checklist-consequence { display: block; }

/* STRIPE: Trust signal vor kritischem Button */
.trust-signal {
  display: flex;align-items: center;gap: 6px;
  font-size: 10px;color: var(--text3);
  padding: 8px 0;
  justify-content: center;
}
.trust-signal-icon { font-size: 12px; }

/* LINEAR: Keyboard shortcut hint */
.keyboard-hint {
  font-size: 10px;color: var(--text3);
  text-align: center;
  margin-top: 6px;
}
.kbd {
  display: inline-flex;align-items: center;
  padding: 1px 5px;border-radius: 4px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  font-size: 10px;font-family: var(--font-ui);
  color: var(--text3);
}

/* VERCEL: Deployment-Status — Schritt-für-Schritt */
.deploy-steps {
  display: none;
  margin: 12px 0;
}
.deploy-steps.active { display: block; }
.deploy-step-item {
  display: flex;align-items: center;gap: 8px;
  padding: 6px 0;
  font-size: 12px;color: var(--text3);
  border-bottom: 1px solid var(--border);
}
.deploy-step-item:last-child { border-bottom: none; }
.deploy-step-item.done { color: var(--green); }
.deploy-step-item.active { color: var(--text); }
.deploy-step-item.pending { color: var(--text3);opacity: .5; }
.deploy-dot {
  width: 6px;height: 6px;border-radius: 50%;flex-shrink: 0;
  background: var(--text3);
}
.deploy-step-item.done .deploy-dot { background: var(--green); }
.deploy-step-item.active .deploy-dot {
  background: var(--accent);
  animation: pulse-dot .8s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%,100%{opacity:1;transform:scale(1)}
  50%{opacity:.5;transform:scale(.7)}
}

/* NOTION: Progressive Disclosure — Audit Log */
.disclosure-toggle {
  display: flex;align-items: center;gap: 6px;
  font-size: 11px;color: var(--text3);
  cursor: pointer;padding: 8px 0;
  border-top: 1px solid var(--border);
  margin-top: 12px;
  user-select: none;
}
.disclosure-toggle:hover { color: var(--text2); }
.disclosure-arrow { transition: transform .2s;font-size: 10px; }
.disclosure-arrow.open { transform: rotate(90deg); }
.disclosure-content { display: none;margin-top: 8px; }
.disclosure-content.open { display: block; }

/* RAYCAST: Contextual Actions nach Freigabe */
.next-actions {
  display: none;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
}
.next-actions.visible { display: flex; }
.next-action-btn {
  display: flex;align-items: center;gap: 8px;
  padding: 10px 14px;border-radius: var(--r-md);
  background: rgba(255,255,255,.03);
  border: 1px solid var(--border);
  cursor: pointer;font-family: var(--font-ui);
  text-decoration: none;
  transition: all .15s;
  font-size: 12px;font-weight: 500;color: var(--text2);
}
.next-action-btn:hover {
  background: rgba(255,255,255,.06);
  border-color: var(--border2);
  color: var(--text);
  transform: translateX(2px);
}
.next-action-btn .na-icon {
  width: 28px;height: 28px;border-radius: 7px;
  display: flex;align-items: center;justify-content: center;
  font-size: 13px;flex-shrink: 0;
}
.next-action-btn .na-label { flex: 1; }
.next-action-btn .na-arrow { color: var(--text3);font-size: 12px; }
.na-primary { background: rgba(79,142,247,.08);border-color: rgba(79,142,247,.2);color: #7eb3ff; }
.na-primary:hover { background: rgba(79,142,247,.15); }

/* VERCEL: Auto-save / Status-Dot pulsiert beim Laden */
@keyframes dot-pulse { 0%,100%{opacity:1}50%{opacity:.3} }
.status-dot-loading { animation: dot-pulse .8s ease-in-out infinite; }

</style></head><body><div class="kpf"><strong style="font-size:14pt;color:#1E3A5F;">${buero||svN}</strong><br>${quali}</div><div class="az"><strong>AZ:</strong> ${az} &nbsp;&nbsp; <strong>Datum:</strong> ${heute}</div><h1>Gutachten</h1><div>${entwurf.replace(/\n/g,'<br>')}</div>${s6?`<h2>§6 Gutachterliche Stellungnahme</h2><div>${s6.replace(/\n/g,'<br>')}</div>`:''}<div class="foot">Erstellt mit PROVA Systems · ${svN} · ${heute}</div></div></div><!-- /main-wrap -->
</div><!-- /app-shell -->
</body></html>`;
  const blob=new Blob([html],{type:'application/msword'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`Gutachten_${az.replace(/[^a-zA-Z0-9-]/g,'_')}.doc`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  zeigToast('Word-Download gestartet ✅','ok');
}

function generierePhotodoku(){ zeigToast('Fotodokumentation wird vorbereitet…','ok'); }

/* TOAST */
let _tt;
window.zeigToast = window.zeigToast || window.showToast || function(m){ alert(m); };

/* ─────────────────────────────────────────── */

/* ── JVEG AUTO-RECHNUNG nach Freigabe ── */
function zeigeJvegAutoCta() {
  var cta = document.getElementById('jveg-auto-cta');
  if (!cta) return;

  // Zeiterfassung aus localStorage
  var dauerSek = parseInt(localStorage.getItem('prova_zeit_dauer_sek') || localStorage.getItem('prova_diktat_dauer_sek') || '0');
  var stunden = Math.max(0.5, parseFloat((dauerSek / 3600).toFixed(1)));

  // JVEG Honorargruppe M2 Standard
  var satz = 95;
  var honorar = Math.round(stunden * satz * 100) / 100;
  var km = parseInt(localStorage.getItem('prova_km_gefahren') || '30');
  var fahrt = Math.round(km * 0.42 * 100) / 100;
  var netto = Math.round((honorar + fahrt) * 100) / 100;
  var brutto = Math.round(netto * 1.19 * 100) / 100;

  var fmt = function(n){ return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}); };

  var preview = document.getElementById('jveg-auto-preview');
  if (preview) {
    preview.innerHTML =
      stunden + 'h × ' + fmt(satz) + ' €/h (Gruppe M2) = <strong>' + fmt(honorar) + ' €</strong><br>' +
      km + ' km Fahrt = <strong>' + fmt(fahrt) + ' €</strong><br>' +
      '<strong style="color:#10b981;">Gesamt netto: ' + fmt(netto) + ' € · Brutto: ' + fmt(brutto) + ' €</strong>';
  }

  // Werte speichern für Übergabe
  localStorage.setItem('prova_jveg_auto_netto', String(netto));
  localStorage.setItem('prova_jveg_auto_stunden', String(stunden));
  localStorage.setItem('prova_jveg_auto_km', String(km));

  cta.style.display = 'block';
}

window.jvegAutoRechnung = function() {
  var az = (recFields||{}).Aktenzeichen || localStorage.getItem('prova_letztes_az') || '';
  var stunden = localStorage.getItem('prova_jveg_auto_stunden') || '2';
  var km = localStorage.getItem('prova_jveg_auto_km') || '30';
  // Prefill für JVEG-Rechner
  sessionStorage.setItem('prova_rechnung_prefill', JSON.stringify({
    typ: 'JVEG',
    source: 'auto_nach_freigabe',
    honorargruppe: 'M2',
    stundensatz: 95,
    stunden_gutachten: parseFloat(stunden),
    stunden_akten: 0,
    km: parseInt(km),
    wartezeit: 0,
    schreibseiten: 0,
    fotos: 0,
    netto: parseFloat(localStorage.getItem('prova_jveg_auto_netto') || '0'),
    mwst_betrag: 0,
    brutto: 0,
    mit_mwst: true,
    aktenzeichen: az,
    auftraggeber_name: localStorage.getItem('prova_auftraggeber_name') || '',
    auftraggeber_email: localStorage.getItem('prova_auftraggeber_email') || '',
    rueckweg: az ? 'akte.html?az=' + encodeURIComponent(az) : 'archiv.html'
  }));
  window.location.href = 'rechnungen.html?from=jveg&az=' + encodeURIComponent(az);
};


/* ── Freigabe-Tabs ── */
function setFreigTab(tab) {
  var tabs = ['dokument', 'freigabe', 'audit'];
  tabs.forEach(function(t) {
    var btn = document.getElementById('tab-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  // Zeige/Verstecke Inhalte
  var dokEl = document.getElementById('freig-tab-dokument');
  var frgEl = document.getElementById('approve-content');
  var audEl = document.querySelector('.audit-log-toggle') && document.querySelector('.audit-log-toggle').closest('div');
  
  if (dokEl) dokEl.style.display = tab === 'dokument' ? 'block' : 'none';
  if (frgEl) frgEl.style.display = tab === 'freigabe' ? 'block' : 'none';
  // Audit wird nur bei Tab 3 angezeigt (findet das Element)
  document.querySelectorAll('[id^="audit"]').forEach(function(el) {
    if (el.id !== 'headerAz') el.style.display = tab === 'audit' ? 'block' : 'none';
  });
}

/* ── Breadcrumb befüllen ── */
function befuelleBreadcrumb(az, sa, obj) {
  var bcAz = document.getElementById('bc-az');
  var bcSa = document.getElementById('bc-sa');
  var bcObj = document.getElementById('bc-obj');
  if (bcAz && az) bcAz.textContent = az;
  if (bcSa && sa) bcSa.textContent = sa;
  if (bcObj && obj) bcObj.textContent = obj;
}

/* ── Status-Dot aktualisieren ── */
function setStatusDot(status) {
  var dot = document.getElementById('status-dot');
  var lbl = document.getElementById('status-label');
  var colors = { laden: 'var(--warn)', ok: 'var(--green)', fehler: 'var(--red)', freigegeben: 'var(--green)' };
  var labels = { laden: 'Wird geladen…', ok: 'Bereit zur Freigabe', fehler: 'Daten fehlen', freigegeben: 'Freigegeben ✓' };
  if (dot) dot.style.background = colors[status] || 'var(--text3)';
  if (lbl) lbl.textContent = labels[status] || status;
}

/* ── PDF-Progress-Bar ── */
function zeigePdfProgress() {
  var bar = document.getElementById('pdf-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'pdf-progress-bar';
    bar.className = 'pdf-progress active';
    bar.innerHTML = '<div class="pdf-progress-fill"></div>';
    var btn = document.getElementById('btnFreigeben');
    if (btn) btn.parentNode.insertBefore(bar, btn);
  }
  bar.classList.add('active');
}

/* ── Erfolg verbessert ── */
function zeigeErfolgState(emailText, az) {
  var alt = document.getElementById('erfolg');
  if (alt) {
    alt.innerHTML = '<div class="erfolg-v2">' +
      '<div class="erfolg-icon-big">✅</div>' +
      '<div class="erfolg-title">Gutachten freigegeben</div>' +
      '<div class="erfolg-sub">' + (emailText || 'PDF wird generiert und per E-Mail versendet.') + '</div>' +
      '<div class="erfolg-actions">' +
      '<a href="akte.html?az=' + encodeURIComponent(az||'') + '" style="padding:9px 20px;border-radius:8px;background:rgba(79,142,247,.15);border:1px solid rgba(79,142,247,.3);color:#7eb3ff;font-size:12px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:5px;">📂 Zur Fall-Akte</a>' +
      '<a href="rechnungen.html?az=' + encodeURIComponent(az||'') + '" style="padding:9px 20px;border-radius:8px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);color:#34d399;font-size:12px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:5px;">💶 Rechnung erstellen</a>' +
      '</div></div>';
    alt.style.display = 'block';
  }
  setStatusDot('freigegeben');
}


/* ══ SaaS UX — Linear/Stripe/Raycast ══ */

// STRIPE: Checklist-Toggle
var _checks = { '407a': false, '5pruef': false };
function toggleCheck(id) {
  _checks[id] = !_checks[id];
  var item = document.getElementById('check-' + id);
  var box  = document.getElementById('box-' + id);
  var cb   = document.getElementById('cb' + id);
  if (item) item.classList.toggle('checked', _checks[id]);
  if (box)  box.textContent = _checks[id] ? '✓' : '';
  if (cb)   cb.checked = _checks[id];
  // Original toggle407a aufrufen
  if (typeof toggle407a === 'function') toggle407a();
  // Trust Signal + Keyboard Hint zeigen wenn beide gecheckt
  var bothDone = _checks['407a'] && _checks['5pruef'];
  var ts = document.getElementById('trust-signal');
  var kh = document.getElementById('keyboard-hint');
  if (ts) ts.style.display = bothDone ? 'flex' : 'none';
  if (kh) kh.style.display = bothDone ? 'block' : 'none';
}

// RAYCAST + LINEAR: Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
  // Strg+Enter = Freigeben (wenn Button aktiv)
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    var btn = document.getElementById('btnFreigeben');
    if (btn && !btn.disabled) {
      e.preventDefault();
      approveGutachten();
    }
  }
  // Escape = zurück
  if (e.key === 'Escape') {
    history.back();
  }
});

// VERCEL: Deploy-Steps Animation
function starteDeploySteps() {
  var steps = document.getElementById('deploy-steps');
  if (steps) steps.classList.add('active');
  var items = [
    {id: 'ds-1', label: '§407a-Dokumentation erstellt', delay: 400},
    {id: 'ds-2', label: 'PDF wird generiert…', delay: 1200},
    {id: 'ds-3', label: 'E-Mail wird versendet…', delay: 4000},
    {id: 'ds-4', label: 'Akte wird aktualisiert…', delay: 5000},
  ];
  items.forEach(function(step, i) {
    var el = document.getElementById(step.id);
    if (!el) return;
    el.classList.remove('pending');
    el.classList.add('active');
    setTimeout(function() {
      el.classList.remove('active');
      el.classList.add('done');
      el.querySelector('.deploy-dot').style.background = 'var(--green)';
      el.querySelector('.deploy-dot').style.animation = 'none';
    }, step.delay);
  });
}

// RAYCAST: Contextual Actions nach Freigabe zeigen
function zeigeContextualActions(az, entwurf) {
  var na = document.getElementById('next-actions');
  if (!na) return;
  // Links befüllen
  var naAkte = document.getElementById('na-akte');
  var naRech = document.getElementById('na-rechnung');
  if (naAkte) naAkte.href = 'akte.html?az=' + encodeURIComponent(az || '');
  if (naRech) naRech.href = 'rechnungen.html?az=' + encodeURIComponent(az || '');
  // Mit Animation einblenden
  na.classList.add('visible');
}

// NOTION: Disclosure Toggle für Audit Log
function toggleDisclosure(id) {
  var arrow = document.getElementById('arrow-' + id);
  var body = document.getElementById('disc-' + id);
  if (!arrow || !body) return;
  var open = body.classList.toggle('open');
  arrow.classList.toggle('open', open);
}

// VERCEL: Status-Dot im Breadcrumb
document.addEventListener('DOMContentLoaded', function() {
  var dot = document.getElementById('status-dot');
  if (dot) dot.classList.add('status-dot-loading');
  setTimeout(function() {
    if (dot) dot.classList.remove('status-dot-loading');
  }, 3000);
});
/* ── AUDIT + STATISTIKEN bei Freigabe ── */
window.provaFreigabeAudit = async function(data) {
  var svEmail     = localStorage.getItem('prova_sv_email') || '';
  var paket       = localStorage.getItem('prova_paket') || 'Solo';
  var sv6Text     = data.sv_stellungnahme || '';
  var ki6Text     = data.ki_vorschlag || '';
  var az          = data.aktenzeichen || localStorage.getItem('prova_aktiver_fall') || '';

  // Änderungsquote: wie viel hat der SV geändert vs KI-Vorschlag
  var aenderung = 0;
  if (ki6Text && sv6Text) {
    var gleich = 0, total = Math.max(sv6Text.length, ki6Text.length);
    for (var i = 0; i < Math.min(sv6Text.length, ki6Text.length); i++) {
      if (sv6Text[i] === ki6Text[i]) gleich++;
    }
    aenderung = total > 0 ? Math.round((1 - gleich/total) * 100) : 0;
  }

  // AUDIT_TRAIL
  if (typeof provaAuditLog === 'function') {
    await provaAuditLog({
      aktenzeichen:    az,
      sv_email:        svEmail,
      paket:           paket,
      aktion:          'Gutachten_Freigegeben',
      sv_validiert:    true,
      output_laenge:   sv6Text.length,
      aenderungsquote: aenderung,
      offenlegungstext:'Gemäß §407a Abs. 3 ZPO und EU AI Act Art. 13 wurde KI-Unterstützung eingesetzt. §6 wurde vom Sachverständigen persönlich verfasst.',
      notizen:         'Freigabe: ' + new Date().toLocaleString('de-DE'),
    });
  }

  // STATISTIKEN
  if (typeof provaStatLog === 'function') {
    await provaStatLog({
      aktenzeichen:          az,
      paket:                 paket,
      ereignis:              'Gutachten_Freigegeben',
      schadensart:           data.schadensart || '',
      plz:                   data.plz || '',
      ort:                   data.ort || '',
      auftraggeber_typ:      data.auftraggeber_typ || '',
      foto_anzahl:           data.foto_anzahl || 0,
      erstellungszeit_sekunden: data.erstellungszeit || 0,
      transkript_laenge:     data.transkript_laenge || 0,
    });
  }

  // KI_STATISTIK
  if (typeof provaKILog === 'function') {
    await provaKILog({
      schadenart:         data.schadensart || '',
      ursache_quelle:     'SV-validiert',
      ursache_kategorien: data.schadensart || '',
      eigentext_zeichen:  sv6Text.length,
      weg:                'Freigabe',
      diktat:             !!(data.transkript_laenge > 0),
    });
  }
};
