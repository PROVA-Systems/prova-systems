/* ════════════════════════════════════════════════════════════
   PROVA einstellungen-logic.js
   Einstellungen — SV-Profil, Airtable-Sync, Paket/Stripe
   Extrahiert aus einstellungen.html
════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ── SIDEBAR ── */
var paket = localStorage.getItem('prova_paket')||'Solo';
var pc = {'Solo':'#4f8ef7','Team':'#a78bfa','Solo':'#4f8ef7','Pro':'#4f8ef7','Enterprise':'#a78bfa'}[paket]||'#4f8ef7';
var el = document.getElementById('topbar-paket-badge');
if(el){el.textContent=paket;el.style.cssText='font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;letter-spacing:.04em;background:'+pc+'18;color:'+pc+';border:1px solid '+pc+'33;';}
var appUrl=paket==='Team'?'app-enterprise.html':paket==='Solo'?'app-pro.html':'app-starter.html';

/* ── AUTH ── */
if(!localStorage.getItem('prova_user')){window.location.href='app-login.html';return;}

/* ── LOGOUT ── */
window.logout = function(){
  localStorage.removeItem('prova_user');
  localStorage.removeItem('prova_sv_email');
  window.location.href='app-login.html';
};

/* ── SECTION SWITCHER ── */
window.showSec = function(id, btn){
  document.querySelectorAll('.sec').forEach(function(s){s.classList.remove('active');});
  document.querySelectorAll('.snav-item').forEach(function(b){b.classList.remove('active');});
  var sec=document.getElementById('sec-'+id);
  if(sec)sec.classList.add('active');
  if(btn)btn.classList.add('active');
};

/* ── TOAST ── */
window.zeigToast = function(msg, typ){
  var t=document.getElementById('einst-toast');
  t.textContent=msg;
  t.className='toast-prova'+(typ==='err'?' err':'');
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');},3200);
};

/* ── AIRTABLE SYNC ── */
var AT_BASE='appJ7bLlAHZoxENWE';
var AT_SV_TABLE='tbladqEQT3tmx4DIB';
var _svRecordId=null;

function zeigSyncBadge(elId, status, text){
  var b=document.getElementById(elId);
  if(!b)return;
  b.style.display='inline-flex';
  b.className='sync-badge '+(status==='ok'?'ok':status==='err'?'err':'pending');
  b.textContent=(status==='ok'?'✓ ':'⏳ ')+text;
  if(status==='ok')setTimeout(function(){b.style.display='none';},4000);
}

async function ladeSVRecordId(){
  var email=localStorage.getItem('prova_sv_email')||'';
  if(!email||_svRecordId)return _svRecordId;
  try{
    var path='/v0/'+AT_BASE+'/'+AT_SV_TABLE+'?filterByFormula='+encodeURIComponent('{Email}="'+email+'"')+'&maxRecords=1';
    var res=await ProvaError.safeFetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:path})});
    if(!res.ok)return null;
    var data=await res.json();
    var rec=(data.records||[])[0];
    if(rec){_svRecordId=rec.id;return _svRecordId;}
  }catch(e){console.warn('AT record ID Fehler:',e);}
  return null;
}

async function updateAirtableFelder(felder){
  var recId=await ladeSVRecordId();
  if(!recId){console.warn('Kein AT Record ID — Sync übersprungen');return false;}
  try{
    var path='/v0/'+AT_BASE+'/'+AT_SV_TABLE+'/'+recId;
    var res=await ProvaError.safeFetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'PATCH',path:path,payload:{fields:felder}})});
    return res.ok;
  }catch(e){console.warn('AT PATCH Fehler:',e);return false;}
}

/* ── LADE ALLE WERTE ── */
function ladeProfil(){
  var ls=localStorage;
  // Profil
  setVal('e-vorname',ls.getItem('prova_sv_vorname'));
  setVal('e-nachname',ls.getItem('prova_sv_nachname'));
  setVal('e-email',ls.getItem('prova_sv_email'));
  setVal('e-telefon',ls.getItem('prova_sv_telefon'));
  setVal('e-quali',ls.getItem('prova_sv_quali'));
  // Büro
  setVal('e-firma',ls.getItem('prova_sv_firma'));
  setVal('e-strasse',ls.getItem('prova_sv_strasse'));
  setVal('e-plz',ls.getItem('prova_sv_plz'));
  setVal('e-ort',ls.getItem('prova_sv_ort'));
  setVal('e-iban',ls.getItem('prova_sv_iban'));
  setVal('e-bic',ls.getItem('prova_sv_bic'));
  setVal('e-steuernr',ls.getItem('prova_sv_steuernr'));
  setVal('e-ustid',ls.getItem('prova_sv_ustid'));
  setVal('e-zahlungsziel',ls.getItem('prova_sv_zahlungsziel')||'30');
  setVal('e-mwst',ls.getItem('prova_sv_mwst')||'19');
  // Arbeitsweise
  setVal('e-anrede',ls.getItem('prova_sv_anrede')||'Sie');
  setVal('e-theme',ls.getItem('prova_theme')||'dark');
  setVal('e-startseite',ls.getItem('prova_startseite')||'dashboard.html');
  setVal('e-listenansicht',ls.getItem('prova_listenansicht')||'liste');
  setVal('e-ki-ton',ls.getItem('prova_ki_ton')||'formal');
  var kj2=document.getElementById('e-kj2-auto');
  if(kj2)kj2.checked=ls.getItem('prova_kj2_auto')!=='0';
  // Benachrichtigungen
  setVal('e-az-von',ls.getItem('prova_az_von')||'07:00');
  setVal('e-az-bis',ls.getItem('prova_az_bis')||'19:00');
  // Arbeitstage
  var tage=(ls.getItem('prova_arbeitstage')||'Mo,Di,Mi,Do,Fr').split(',');
  document.querySelectorAll('.day-btn').forEach(function(btn){
    btn.classList.toggle('active',tage.indexOf(btn.dataset.day)>-1);
  });
  // Vorlaufzeiten
  setVal('e-vl-ortstermin',ls.getItem('prova_vl_ortstermin')||'2');
  setVal('e-vl-frist',ls.getItem('prova_vl_frist')||'7');
  setVal('e-vl-mahnung',ls.getItem('prova_vl_mahnung')||'14');
  // Urlaubsmodus
  var urlaubBis=ls.getItem('prova_urlaub_bis')||'';
  var heute=new Date().toISOString().slice(0,10);
  var urlaubAktiv=urlaubBis&&urlaubBis>=heute;
  var toggle=document.getElementById('e-urlaub-toggle');
  if(toggle)toggle.checked=urlaubAktiv;
  if(urlaubAktiv){
    var det=document.getElementById('urlaub-detail');
    var info=document.getElementById('urlaub-aktiv-info');
    if(det)det.style.display='none';
    if(info){info.style.display='block';}
    var datum=document.getElementById('urlaub-datum-anzeige');
    if(datum)datum.textContent=formatDate(urlaubBis);
  }
  setVal('e-urlaub-bis',urlaubBis);
  // Signatur
  var sig=ls.getItem('prova_sv_signatur');
  if(sig){
    var img=document.getElementById('sig-preview');var wrap=document.getElementById('sig-preview-wrap');
    if(img)img.src=sig;if(wrap)wrap.style.display='block';
    document.getElementById('sig-status').style.display='block';
    document.getElementById('btn-sig-loeschen').style.display='inline-flex';
  }
  // Enterprise
  if(paket==='Team'){
    setVal('e-outbound-webhook',ls.getItem('prova_outbound_webhook')||'');
    setVal('e-primary-color',ls.getItem('prova_primary_color')||'#4f8ef7');
    setVal('e-wl-name',ls.getItem('prova_wl_name')||'');
    document.getElementById('snav-enterprise').style.display='flex';
    document.getElementById('sec-enterprise').style.display='none';
    ladeWebhookLog();
  }
  // Paket anzeigen
  renderPaket();
}

function setVal(id,val){var el=document.getElementById(id);if(el&&val!==null&&val!==undefined)el.value=val;}
function getVal(id){var el=document.getElementById(id);return el?el.value:'';}
function formatDate(d){if(!d)return '';try{return new Date(d+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return d;}}

/* ── SPEICHERN PROFIL ── */
window.speichereProfil = function(){
  var ls=localStorage;
  ls.setItem('prova_sv_vorname',getVal('e-vorname'));
  ls.setItem('prova_sv_nachname',getVal('e-nachname'));
  ls.setItem('prova_sv_email',getVal('e-email'));
  ls.setItem('prova_sv_telefon',getVal('e-telefon'));
  ls.setItem('prova_sv_quali',getVal('e-quali'));
  ls.setItem('prova_sv_profil',JSON.stringify({Vorname:getVal('e-vorname'),Nachname:getVal('e-nachname'),Email:getVal('e-email'),Telefon:getVal('e-telefon'),Zertifizierung:getVal('e-quali')}));
  zeigToast('Profil gespeichert ✅');
  zeigSyncBadge('profil-sync-badge','pending','Speichern…');
};

/* ── SPEICHERN ARBEITSWEISE ── */
window.speichereArbeitsweise = function(){
  localStorage.setItem('prova_sv_anrede',getVal('e-anrede'));
  // Theme wird jetzt über setTheme() direkt gesetzt — kein doppeltes Speichern nötig
  localStorage.setItem('prova_startseite',getVal('e-startseite'));
  localStorage.setItem('prova_listenansicht',getVal('e-listenansicht'));
  localStorage.setItem('prova_ki_ton',getVal('e-ki-ton'));
  var kj2=document.getElementById('e-kj2-auto');
  if(kj2)localStorage.setItem('prova_kj2_auto',kj2.checked?'1':'0');
  zeigToast('Einstellungen gespeichert ✅');
};

/* ── ARBEITSTAGE TOGGLE ── */
document.querySelectorAll('.day-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    btn.classList.toggle('active');
  });
});

/* ── SPEICHERN ARBEITSZEITEN + AIRTABLE SYNC ── */
window.speichereArbeitszeiten = async function(){
  var von=getVal('e-az-von')||'07:00';
  var bis=getVal('e-az-bis')||'19:00';
  var aktiveTage=[];
  document.querySelectorAll('.day-btn.active').forEach(function(b){aktiveTage.push(b.dataset.day);});
  var tageStr=aktiveTage.join(',');

  localStorage.setItem('prova_az_von',von);
  localStorage.setItem('prova_az_bis',bis);
  localStorage.setItem('prova_arbeitstage',tageStr);

  zeigSyncBadge('notif-sync-badge','pending','Synchronisiere…');

  var ok=await updateAirtableFelder({
    sv_arbeitszeit_von:von,
    sv_arbeitszeit_bis:bis,
    sv_arbeitstage:tageStr
  });

  if(ok){
    zeigSyncBadge('notif-sync-badge','ok','Mit PROVA synchronisiert');
    zeigToast('Arbeitszeiten gespeichert & synchronisiert ✅');
  }else{
    zeigSyncBadge('notif-sync-badge','err','Sync fehlgeschlagen');
    zeigToast('Lokal gespeichert — Sync bitte erneut versuchen','err');
  }
};

/* ── URLAUBSMODUS ── */
window.toggleUrlaubsmodus = function(){
  var toggle=document.getElementById('e-urlaub-toggle');
  var det=document.getElementById('urlaub-detail');
  var info=document.getElementById('urlaub-aktiv-info');
  if(toggle&&toggle.checked){
    if(det)det.style.display='block';
    if(info)info.style.display='none';
  }else{
    if(det)det.style.display='none';
    deaktiviereUrlaub();
  }
};

window.speichereUrlaubsmodus = async function(){
  var bis=getVal('e-urlaub-bis');
  if(!bis){zeigToast('Bitte Datum eintragen','err');return;}
  localStorage.setItem('prova_urlaub_bis',bis);
  var det=document.getElementById('urlaub-detail');
  var info=document.getElementById('urlaub-aktiv-info');
  if(det)det.style.display='none';
  if(info)info.style.display='block';
  var datum=document.getElementById('urlaub-datum-anzeige');
  if(datum)datum.textContent=formatDate(bis);

  zeigSyncBadge('notif-sync-badge','pending','Synchronisiere…');
  var ok=await updateAirtableFelder({sv_urlaubsmodus_bis:bis});
  if(ok){
    zeigSyncBadge('notif-sync-badge','ok','Mit PROVA synchronisiert');
    zeigToast('Urlaubsmodus aktiv bis '+formatDate(bis)+' ✅');
  }else{
    zeigToast('Lokal gespeichert — Sync bitte erneut versuchen','err');
  }
};

window.deaktiviereUrlaub = async function(){
  localStorage.removeItem('prova_urlaub_bis');
  var info=document.getElementById('urlaub-aktiv-info');
  var toggle=document.getElementById('e-urlaub-toggle');
  if(info)info.style.display='none';
  if(toggle)toggle.checked=false;
  var ok=await updateAirtableFelder({sv_urlaubsmodus_bis:null});
  zeigToast(ok?'Urlaubsmodus beendet ✅':'Lokal beendet — Sync fehlgeschlagen',ok?undefined:'err');
};

/* ── VORLAUFZEITEN SPEICHERN ── */
window.speichereVorlaufzeiten = function(){
  localStorage.setItem('prova_vl_ortstermin',getVal('e-vl-ortstermin'));
  localStorage.setItem('prova_vl_frist',getVal('e-vl-frist'));
  localStorage.setItem('prova_vl_mahnung',getVal('e-vl-mahnung'));
  zeigToast('Vorlaufzeiten gespeichert ✅');
};

/* ── BÜRO ── */
window.speichereKanzlei = function(){
  ['firma','strasse','plz','ort'].forEach(function(k){localStorage.setItem('prova_sv_'+k,getVal('e-'+k));});
  zeigToast('Bürodaten gespeichert ✅');
};

window.speichereAbrechnung = function(){
  ['iban','bic','steuernr','ustid'].forEach(function(k){localStorage.setItem('prova_sv_'+k,getVal('e-'+k));});
  localStorage.setItem('prova_sv_zahlungsziel',getVal('e-zahlungsziel'));
  localStorage.setItem('prova_sv_mwst',getVal('e-mwst'));
  zeigToast('Bankdaten gespeichert ✅');
};

/* ── SIGNATUR ── */
var _sigBase64=null;
window.ladeSigDatei = function(file){
  if(!file)return;
  if(file.size>512000){zeigToast('Datei zu groß — max. 500 KB','err');return;}
  var reader=new FileReader();
  reader.onload=function(e){
    _sigBase64=e.target.result;
    var img=document.getElementById('sig-preview');
    var wrap=document.getElementById('sig-preview-wrap');
    var saveBtn=document.getElementById('btn-sig-save');
    if(img)img.src=_sigBase64;if(wrap)wrap.style.display='block';if(saveBtn)saveBtn.disabled=false;
  };
  reader.readAsDataURL(file);
};
window.handleSigDrop = function(e){
  e.preventDefault();
  var file=e.dataTransfer.files[0];
  if(file&&file.type.match(/^image\//))ladeSigDatei(file);
};
window.speichereSignatur = function(){
  if(!_sigBase64)return;
  localStorage.setItem('prova_sv_signatur',_sigBase64);
  document.getElementById('sig-status').style.display='block';
  document.getElementById('btn-sig-loeschen').style.display='inline-flex';
  var saveBtn=document.getElementById('btn-sig-save');
  if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='✅ Gespeichert';setTimeout(function(){saveBtn.textContent='Speichern';},2000);}
  zeigToast('Unterschrift gespeichert ✅');
};
window.sigLoeschen = function(){
  localStorage.removeItem('prova_sv_signatur');_sigBase64=null;
  var img=document.getElementById('sig-preview');var wrap=document.getElementById('sig-preview-wrap');
  if(img)img.src='';if(wrap)wrap.style.display='none';
  document.getElementById('sig-status').style.display='none';
  document.getElementById('btn-sig-loeschen').style.display='none';
  zeigToast('Unterschrift entfernt');
};

/* ── RUNDSTEMPEL ── */
var _stempelBase64 = localStorage.getItem('prova_sv_stempel') || null;

window.ladeStempelDatei = function(file) {
  if (!file) return;
  if (file.size > 512000) { zeigToast('Datei zu groß (max. 500 KB)', 'err'); return; }
  if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) { zeigToast('Nur PNG oder JPG erlaubt', 'err'); return; }

  var reader = new FileReader();
  reader.onload = function(e) {
    _stempelBase64 = e.target.result;
    var img = document.getElementById('stempel-preview');
    var wrap = document.getElementById('stempel-preview-wrap');
    img.src = _stempelBase64;
    wrap.style.display = 'block';

    // Validierung
    var valEl = document.getElementById('stempel-validierung');
    var checks = [];
    var tempImg = new Image();
    tempImg.onload = function() {
      var w = tempImg.width, h = tempImg.height;
      var ratio = Math.abs(w / h - 1);
      checks.push({ ok: file.type === 'image/png', label: 'PNG-Format', hint: file.type === 'image/png' ? 'Transparent möglich' : 'JPG hat keinen transparenten Hintergrund' });
      checks.push({ ok: w >= 200 && w <= 600, label: 'Größe ' + w + '×' + h + 'px', hint: w >= 200 && w <= 600 ? 'Optimal' : 'Empfohlen: 250-300px' });
      checks.push({ ok: ratio < 0.15, label: ratio < 0.15 ? 'Quadratisch' : 'Nicht quadratisch', hint: ratio < 0.15 ? 'Perfekt für Rundstempel' : 'Stempel sollte rund/quadratisch sein' });
      checks.push({ ok: file.size < 300000, label: (file.size / 1024).toFixed(0) + ' KB', hint: file.size < 300000 ? 'Kompakt' : 'Funktioniert, aber etwas groß' });

      valEl.style.display = 'block';
      valEl.innerHTML = checks.map(function(c) {
        return '<div style="display:flex;align-items:center;gap:6px;font-size:11px;margin-bottom:3px;">'
          + '<span>' + (c.ok ? '✅' : '⚠️') + '</span>'
          + '<span style="color:' + (c.ok ? '#10b981' : '#f59e0b') + ';">' + c.label + '</span>'
          + '<span style="color:var(--text3);">— ' + c.hint + '</span>'
          + '</div>';
      }).join('');
    };
    tempImg.src = _stempelBase64;

    document.getElementById('btn-stempel-save').disabled = false;
  };
  reader.readAsDataURL(file);
};

window.handleStempelDrop = function(e) {
  e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border2)';
  var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file && file.type.match(/^image\//)) ladeStempelDatei(file);
};

window.speichereStempel = function() {
  if (!_stempelBase64) return;
  localStorage.setItem('prova_sv_stempel', _stempelBase64);
  document.getElementById('stempel-status').style.display = 'block';
  document.getElementById('btn-stempel-loeschen').style.display = 'inline-flex';
  zeigToast('Rundstempel gespeichert ✅');
};

window.stempelLoeschen = function() {
  localStorage.removeItem('prova_sv_stempel'); _stempelBase64 = null;
  var img = document.getElementById('stempel-preview'); var wrap = document.getElementById('stempel-preview-wrap');
  if (img) img.src = ''; if (wrap) wrap.style.display = 'none';
  document.getElementById('stempel-status').style.display = 'none';
  document.getElementById('btn-stempel-loeschen').style.display = 'none';
  document.getElementById('stempel-validierung').style.display = 'none';
  document.getElementById('btn-stempel-save').disabled = true;
  zeigToast('Rundstempel entfernt');
};

// Stempel beim Laden anzeigen
(function() {
  var saved = localStorage.getItem('prova_sv_stempel');
  if (saved) {
    var img = document.getElementById('stempel-preview');
    var wrap = document.getElementById('stempel-preview-wrap');
    if (img && wrap) { img.src = saved; wrap.style.display = 'block'; }
    var st = document.getElementById('stempel-status'); if (st) st.style.display = 'block';
    var dl = document.getElementById('btn-stempel-loeschen'); if (dl) dl.style.display = 'inline-flex';
  }
  var ihk = localStorage.getItem('prova_ihk');
  if (ihk) { var sel = document.getElementById('e-ihk'); if (sel) sel.value = ihk; }
})();

/* ── PAKET ANZEIGE ── */
/* ════════════════════════════════════════
   PREMIUM BILLING — JS (Linear/Vercel/Raycast)
   ════════════════════════════════════════ */
var _billingCycle = 'monthly'; // 'monthly' | 'yearly'

var PLAN_DATA = {
  Solo: {
    color: '#4f8ef7',
    colorBg: 'rgba(79,142,247,.1)',
    desc: 'Für den selbstständigen Sachverständigen',
    preisMonatlich: 149,
    preisJaehrlich: 71, // -20%
    limit: 30,
    features: [
      { text: '1 Nutzer', yes: true },
      { text: '30 Gutachten / Monat', yes: true },
      { text: 'KI-Gutachten §1–§6 (GPT-4o)', yes: true },
      { text: '§407a ZPO + EU AI Act Compliance', yes: true },
      { text: 'Persönlicher Audit-Trail', yes: true },
      { text: 'Normen, Textbausteine, JVEG', yes: true },
      { text: 'Briefvorlagen + KI-Brieftext', yes: true },
      { text: 'Foto-Anlage + Auto-Captioning', yes: true },
      { text: 'Mehrere Nutzer', yes: false },
      { text: 'Chef-Freigabe-Workflow', yes: false },
      { text: 'Team-Dashboard', yes: false },
    ]
  },
  Team: {
    color: '#8b5cf6',
    colorBg: 'rgba(139,92,246,.1)',
    desc: 'Für Büros mit mehreren Sachverständigen',
    preisMonatlich: 279,
    preisJaehrlich: 143, // -20%
    limit: null, // unbegrenzt
    features: [
      { text: 'Alles aus Solo', yes: true },
      { text: 'Unbegrenzte Nutzer', yes: true },
      { text: 'Unbegrenzte Gutachten', yes: true },
      { text: '§407a ZPO + EU AI Act Compliance', yes: true },
      { text: 'Chef-Freigabe-Workflow', yes: true },
      { text: 'Team-Dashboard + Auswertungen', yes: true },
      { text: 'Organisations-Audit-Trail', yes: true },
      { text: 'Geteilte Textbausteine & Vorlagen', yes: true },
      { text: 'Jahresbericht', yes: true },
      { text: 'Priority-Support (< 4h)', yes: true },
    ]
  }
};

window.setBillingCycle = function(cycle) {
  _billingCycle = cycle;
  document.getElementById('btn-monthly').classList.toggle('active', cycle === 'monthly');
  document.getElementById('btn-yearly').classList.toggle('active', cycle === 'yearly');
  renderPlanCards();
};

function renderPaket() {
  renderPlanHero();
  renderTrialCountdown();
  renderUsageMeters();
  renderPlanCards();
}

function renderPlanHero() {
  var wrap = document.getElementById('plan-hero-wrap');
  if (!wrap) return;
  var status = localStorage.getItem('prova_status') || 'Trial';
  var plan = PLAN_DATA[paket] || PLAN_DATA.Solo;
  var preis = _billingCycle === 'yearly' ? plan.preisJaehrlich : plan.preisMonatlich;

  var statusBadge = status === 'Trial'
    ? '<span class="plan-hero-badge" style="background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.2);">⏱ Testzeitraum</span>'
    : '<span class="plan-hero-badge" style="background:rgba(16,185,129,.12);color:#10b981;border:1px solid rgba(16,185,129,.2);">✓ Aktiv</span>';

  wrap.innerHTML = '<div class="plan-hero plan-hero-' + paket.toLowerCase() + '" style="--plan-color:' + plan.color + '">'
    + '<div class="plan-hero-left">'
    +   statusBadge
    +   '<div class="plan-hero-name">' + paket + '</div>'
    +   '<div class="plan-hero-sub">' + plan.desc + '</div>'
    + '</div>'
    + '<div class="plan-hero-price">'
    +   '<div class="amount">' + preis + ' €</div>'
    +   '<div class="per">pro Monat</div>'
    + '</div>'
    + '</div>';
}

function renderTrialCountdown() {
  var wrap = document.getElementById('trial-countdown-wrap');
  if (!wrap) return;
  var status = localStorage.getItem('prova_status') || 'Trial';
  var trialStart = localStorage.getItem('prova_trial_start');
  var trialDays = parseInt(localStorage.getItem('prova_trial_days') || '14');

  if (status !== 'Trial' || !trialStart) { wrap.innerHTML = ''; return; }

  var start = new Date(parseInt(trialStart) || trialStart).getTime();
  var end = start + (trialDays * 24 * 60 * 60 * 1000);
  var verbleibend = Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
  var verbraucht = trialDays - verbleibend;
  var pct = Math.min(100, Math.round(verbraucht / trialDays * 100));
  var color = verbleibend <= 3 ? '#ef4444' : '#f59e0b';

  wrap.innerHTML = '<div class="trial-countdown">'
    + '<div class="trial-countdown-left">'
    +   '<div class="trial-countdown-icon">⏳</div>'
    +   '<div>'
    +     '<div class="trial-countdown-text">Testzeitraum: <span class="trial-countdown-days" style="color:' + color + '">' + verbleibend + ' Tag' + (verbleibend !== 1 ? 'e' : '') + ' verbleibend</span></div>'
    +     '<div class="trial-progress"><div class="trial-progress-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>'
    +   '</div>'
    + '</div>'
    + '<button onclick="starteStripeCheckout(\'' + paket + '\')" '
    +   'style="padding:8px 16px;background:linear-gradient(135deg,#4f8ef7,#3a7be0);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;">'
    +   'Jetzt upgraden →'
    + '</button>'
    + '</div>';
}

function renderUsageMeters() {
  var wrap = document.getElementById('usage-grid-wrap');
  if (!wrap) return;
  var plan = PLAN_DATA[paket] || PLAN_DATA.Solo;

  // Gutachten diesen Monat aus Cache
  var gutachtenMonat = 0;
  try {
    var cache = JSON.parse(localStorage.getItem('prova_archiv_cache_v2') || '{}');
    var month = new Date().toISOString().slice(0, 7);
    gutachtenMonat = (cache.data || []).filter(function(r) {
      return (r.fields && (r.fields.Timestamp || r.createdTime || '')).startsWith(month);
    }).length;
  } catch(e) {}

  var limit = plan.limit;
  var pct = limit ? Math.min(100, Math.round(gutachtenMonat / limit * 100)) : 0;
  var barClass = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '';

  var aktivSeit = localStorage.getItem('prova_trial_start');
  var aktivSeitText = '—';
  if (aktivSeit) {
    try {
      var d = new Date(parseInt(aktivSeit) || aktivSeit);
      aktivSeitText = d.toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'});
    } catch(e) {}
  }

  wrap.innerHTML =
    '<div class="usage-card">'
    +   '<div class="usage-label">Gutachten diesen Monat</div>'
    +   '<div class="usage-value">' + gutachtenMonat + (limit ? '<span> / ' + limit + '</span>' : '<span> / ∞</span>') + '</div>'
    +   '<div class="usage-bar"><div class="usage-bar-fill ' + barClass + '" style="width:' + (limit ? pct : 20) + '%;"></div></div>'
    + '</div>'
    + '<div class="usage-card">'
    +   '<div class="usage-label">Aktiv seit</div>'
    +   '<div class="usage-value" style="font-size:16px;letter-spacing:0;">' + aktivSeitText + '</div>'
    +   '<div style="font-size:11px;color:var(--text3);margin-top:4px;">Paket: ' + paket + ' · ' + (localStorage.getItem('prova_status') || 'Trial') + '</div>'
    + '</div>';
}

function renderPlanCards() {
  var wrap = document.getElementById('plan-cards-wrap');
  if (!wrap) return;

  var plans = ['Solo', 'Team'];
  wrap.innerHTML = plans.map(function(name) {
    var p = PLAN_DATA[name];
    var istAktiv = name === paket;
    var preis = _billingCycle === 'yearly' ? p.preisJaehrlich : p.preisMonatlich;
    var preisAlt = _billingCycle === 'yearly' ? p.preisMonatlich : null;

    var ctaHtml;
    if (istAktiv) {
      ctaHtml = '<button class="plan-cta plan-cta-current" disabled>✓ Ihr aktuelles Paket</button>';
    } else if (name === 'Team') {
      ctaHtml = '<button class="plan-cta plan-cta-team" onclick="starteStripeCheckout(\'Team\')">Zu Team upgraden →</button>';
    } else {
      ctaHtml = '<button class="plan-cta plan-cta-upgrade" onclick="starteStripeCheckout(\'Solo\')">Solo wählen →</button>';
    }

    return '<div class="plan-card ' + (istAktiv ? ('plan-active-' + name.toLowerCase()) : '') + '">'
      + (istAktiv ? '<div class="plan-card-badge" style="background:' + p.colorBg + ';color:' + p.color + ';">Ihr Plan</div>' : '')
      + '<div class="plan-card-name">' + name + '</div>'
      + '<div class="plan-card-desc">' + p.desc + '</div>'
      + '<div class="plan-card-price">'
      +   '<div class="big">' + preis + ' €</div>'
      +   '<div class="small">/ Monat' + (_billingCycle === 'yearly' ? ', jährlich' : '') + '</div>'
      +   (preisAlt ? '<div class="strike">' + preisAlt + ' €</div>' : '')
      + '</div>'
      + p.features.map(function(f) {
          return '<div class="plan-feature">'
            + '<div class="plan-feature-check ' + (f.yes ? 'yes' : 'no') + '">' + (f.yes ? '✓' : '×') + '</div>'
            + '<span ' + (!f.yes ? 'style="color:var(--text3);"' : '') + '>' + f.text + '</span>'
            + '</div>';
        }).join('')
      + ctaHtml
      + '</div>';
  }).join('');
}


/* ── ENTERPRISE ── */
window.speichereEnterprise = function(){
  localStorage.setItem('prova_outbound_webhook',getVal('e-outbound-webhook'));
  localStorage.setItem('prova_primary_color',getVal('e-primary-color')||'#4f8ef7');
  localStorage.setItem('prova_wl_name',getVal('e-wl-name'));
  zeigToast('Team-Einstellungen gespeichert ✅');
};
window.testeOutboundWebhook = async function(){
  var url=getVal('e-outbound-webhook');
  if(!url){zeigToast('Bitte zuerst URL eingeben','err');return;}
  var r=document.getElementById('webhook-test-result');
  r.style.display='block';r.style.background='rgba(245,158,11,.08)';r.style.border='1px solid rgba(245,158,11,.25)';r.style.color='var(--warning)';r.textContent='⏳ Teste…';
  try{
    var res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-PROVA-Event':'test'},body:JSON.stringify({prova_event:'test',timestamp:new Date().toISOString(),_test:true})});
    if(res.ok){r.style.background='rgba(16,185,129,.08)';r.style.border='1px solid rgba(16,185,129,.2)';r.style.color='var(--success)';r.textContent='✅ HTTP '+res.status+' — Endpoint erreichbar';}
    else{r.style.background='rgba(239,68,68,.08)';r.style.border='1px solid rgba(239,68,68,.2)';r.style.color='var(--danger)';r.textContent='❌ HTTP '+res.status+' — Endpoint meldet Fehler';}
  }catch(e){r.style.background='rgba(239,68,68,.08)';r.style.border='1px solid rgba(239,68,68,.2)';r.style.color='var(--danger)';r.textContent='❌ Nicht erreichbar: '+e.message;}
};
window.ladeWebhookLog = function(){
  var c=document.getElementById('webhook-log-inhalt');if(!c)return;
  try{
    var logs=JSON.parse(localStorage.getItem('prova_outbound_log')||'[]');
    if(!logs.length){c.innerHTML='<div style="padding:12px;color:var(--text3);">Noch keine Webhook-Deliveries.</div>';return;}
    c.innerHTML=logs.slice(0,20).map(function(l){
      var sc=l.status==='success'?'var(--success)':l.status==='pending'?'var(--warning)':'var(--danger)';
      var si=l.status==='success'?'✅':l.status==='pending'?'⏳':'❌';
      var ts=new Date(l.ts).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      return '<div style="padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:8px;">'
        +'<span style="color:'+sc+';">'+si+'</span>'
        +'<span style="color:var(--text3);min-width:90px;font-size:11px;">'+ts+'</span>'
        +'<span style="color:var(--text2);flex:1;overflow:hidden;text-overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+l.event+'</span>'
        +'</div>';
    }).join('');
  }catch(e){
    c.innerHTML='<div style="padding:12px;color:var(--text3);">Fehler beim Laden.</div>';
  }
};

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', function(){
  // Signatur laden + Vorschau zeigen
  var _savedSig = localStorage.getItem('prova_sv_signatur');
  if(_savedSig){
    var _si=document.getElementById('sig-preview');
    var _sw=document.getElementById('sig-preview-wrap');
    var _ss=document.getElementById('sig-status');
    var _sl=document.getElementById('btn-sig-loeschen');
    if(_si)_si.src=_savedSig;
    if(_sw)_sw.style.display='block';
    if(_ss)_ss.style.display='block';
    if(_sl)_sl.style.display='inline-flex';
  }
  // Profil laden
  var pfn=localStorage.getItem('prova_sv_vorname')||'';
  var pln=localStorage.getItem('prova_sv_nachname')||'';
  var pem=localStorage.getItem('prova_sv_email')||'';
  var ptel=localStorage.getItem('prova_sv_telefon')||'';
  var pqual=localStorage.getItem('prova_sv_qualifikation')||'';
  if(pfn){var el=document.getElementById('profil-vorname');if(el)el.value=pfn;}
  if(pln){var el=document.getElementById('profil-nachname');if(el)el.value=pln;}
  if(pem){var el=document.getElementById('profil-email');if(el)el.value=pem;}
  if(ptel){var el=document.getElementById('profil-telefon');if(el)el.value=ptel;}
  if(pqual){var el=document.getElementById('profil-qualifikation');if(el)el.value=pqual;}
  // Erste Sektion anzeigen
  var firstBtn=document.querySelector('.snav-item');
  if(firstBtn){firstBtn.classList.add('active');}
  var firstSec=document.getElementById('sec-profil');
  if(firstSec){firstSec.classList.add('active');}
  // Webhook-Log laden
  if(typeof window.ladeWebhookLog==='function') window.ladeWebhookLog();
  // Team-Einstellungen laden
  var _whu = localStorage.getItem('prova_outbound_webhook') || '';
  if(_whu) { var _el = document.getElementById('e-outbound-webhook'); if(_el) _el.value = _whu; }
  var _wln = localStorage.getItem('prova_wl_name') || '';
  if(_wln) { var _en = document.getElementById('e-wl-name'); if(_en) _en.value = _wln; }
  var _wlc = localStorage.getItem('prova_primary_color') || '#4f8ef7';
  var _ec = document.getElementById('e-primary-color'); if(_ec) _ec.value = _wlc;
  // Paket-Cards initial rendern (Billing-Toggle: Monatlich als Default)
  if (typeof setBillingCycle === 'function') setBillingCycle('monthly');
});

})();

/* ════════════════════════════════════════
   PREMIUM THEME SWITCHER — JS
   ════════════════════════════════════════ */

/* Accent color CSS variables */
var ACCENT_COLORS = {
  blue:   { accent: '#4f8ef7', accent2: '#3a7be0' },
  violet: { accent: '#8b5cf6', accent2: '#7c3aed' },
  teal:   { accent: '#14b8a6', accent2: '#0d9488' },
  green:  { accent: '#10b981', accent2: '#059669' },
  orange: { accent: '#f59e0b', accent2: '#d97706' },
  red:    { accent: '#ef4444', accent2: '#dc2626' },
};

window.setTheme = function(t) {
  localStorage.setItem('prova_theme', t);

  // Resolve 'system' to actual theme
  var resolved = t;
  if (t === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  if (window.PROVA_THEME) {
    window.PROVA_THEME.set(resolved);
  } else {
    // Fallback: direkt anwenden
    var root = document.documentElement;
    if (resolved === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  // Cards updaten
  document.querySelectorAll('.theme-card').forEach(function(c) {
    c.classList.toggle('tc-active', c.dataset.theme === t);
  });

  // verstecktes select sync (für speichereArbeitsweise)
  var sel = document.getElementById('e-theme');
  if (sel) sel.value = t;

  zeigToast('Farbschema: ' + {dark:'Dunkel',light:'Hell',system:'System'}[t] + ' ✅');
};

window.setAccent = function(name) {
  var colors = ACCENT_COLORS[name];
  if (!colors) return;
  localStorage.setItem('prova_accent', name);

  // CSS-Variablen live setzen
  document.documentElement.style.setProperty('--accent', colors.accent);
  document.documentElement.style.setProperty('--accent2', colors.accent2);

  // Swatch-Buttons updaten
  document.querySelectorAll('.accent-swatch').forEach(function(s) {
    s.classList.toggle('ac-active', s.dataset.accent === name);
  });

  zeigToast('Akzentfarbe geändert ✅');
};

/* ── Init: Theme Cards + Accent beim Laden ── */
(function initAppearance() {
  var savedTheme = localStorage.getItem('prova_theme') || 'dark';
  var savedAccent = localStorage.getItem('prova_accent') || 'blue';

  // Theme Card als aktiv markieren
  document.querySelectorAll('.theme-card').forEach(function(c) {
    c.classList.toggle('tc-active', c.dataset.theme === savedTheme);
  });

  // Accent Swatch markieren + Farbe anwenden
  document.querySelectorAll('.accent-swatch').forEach(function(s) {
    s.classList.toggle('ac-active', s.dataset.accent === savedAccent);
  });
  if (ACCENT_COLORS[savedAccent]) {
    document.documentElement.style.setProperty('--accent', ACCENT_COLORS[savedAccent].accent);
    document.documentElement.style.setProperty('--accent2', ACCENT_COLORS[savedAccent].accent2);
  }
})();