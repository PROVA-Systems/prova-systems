/* ════════════════════════════════════════════════════════════
   PROVA einstellungen-logic.js
   Einstellungen — SV-Profil, Airtable-Sync, Paket/Stripe
   Extrahiert aus einstellungen.html
════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ── SIDEBAR ── */
var paket = localStorage.getItem('prova_paket')||'Solo';
var pc = {'Solo':'#4f8ef7','Team':'#a78bfa','Pro':'#4f8ef7','Enterprise':'#a78bfa','Trial':'#64748b'}[paket]||'#4f8ef7'; // BUG #013 FIX: Duplikat-Key entfernt
var el = document.getElementById('topbar-paket-badge');
if(el){el.textContent=paket;el.style.cssText='font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;letter-spacing:.04em;background:'+pc+'18;color:'+pc+';border:1px solid '+pc+'33;';}
var appUrl=paket==='Team'?'app-enterprise.html':paket==='Solo'?'app-pro.html':'app-starter.html';

/* ── AUTH ── */
// BUG #017 FIX: Nutzt jetzt provaAuthGuard() statt direkten localStorage-Check
if(typeof provaAuthGuard==='function'){
  if(!provaAuthGuard({silent:true})){window.location.replace('app-login.html');return;}
}else if(!localStorage.getItem('prova_user')&&!localStorage.getItem('prova_session_v2')){
  window.location.replace('app-login.html');return;
}

/* ── LOGOUT ── */
window.logout = function() {
  if (typeof provaLogout === 'function') { provaLogout('app-login.html'); return; }
  try { Object.keys(localStorage).filter(function(k){ return k.startsWith('prova_'); }).forEach(function(k){ localStorage.removeItem(k); }); sessionStorage.clear(); } catch(e){}
  window.location.replace('app-login.html');
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
    var res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:path})});
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
    var res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'PATCH',path:path,payload:{fields:felder}})});
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
    preisJaehrlich: 119, // -20%
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
    preisJaehrlich: 219, // -20%
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
  var bm = document.getElementById('btn-monthly');
  var by = document.getElementById('btn-yearly');
  if (bm) bm.classList.toggle('active', cycle === 'monthly');
  if (by) by.classList.toggle('active', cycle === 'yearly');
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

/* ══════════════════════════════════════════════════════════════
   EINSTELLUNGEN — ALLE UI-Funktionen (waren fehlend)
══════════════════════════════════════════════════════════════ */

/* ── Theme (Farbschema) ── */
window.aendereTheme = function(t) {
  // Ruft setTheme auf (in theme.js definiert) + PROVA_THEME
  if (window.PROVA_THEME && window.PROVA_THEME.set) {
    window.PROVA_THEME.set(t);
  } else {
    // Direktes Fallback
    var root = document.documentElement;
    localStorage.setItem('prova_theme', t);
    if (t === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (t === 'dark') {
      root.removeAttribute('data-theme');
    } else if (t === 'system') {
      var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', 'light');
    }
  }
  localStorage.setItem('prova_theme', t);
  // Select syncen
  var sel = document.getElementById('es-theme');
  if (sel) sel.value = t;
  if (typeof zeigToast === 'function')
    zeigToast({dark:'🌙 Dunkel',light:'☀️ Hell',system:'🖥️ System'}[t] || t);
};

/* ── Schriftgröße ── */
var FONT_SIZES = {
  'klein':   '13px',
  'normal':  '15px',
  'gross':   '17px',
  'xgross':  '19px',
};

window.aendereFontsize = function(val) {
  var size = FONT_SIZES[val] || '15px';
  // Basis-Schriftgröße am :root setzen (alle rem-Werte skalieren mit)
  document.documentElement.style.fontSize = size;
  // Als CSS-Variable für explizite Nutzung
  document.documentElement.style.setProperty('--font-base', size);
  localStorage.setItem('prova_fontsize', val);

  if (typeof zeigToast === 'function')
    zeigToast('Schriftgröße: ' + {klein:'Klein',normal:'Normal',gross:'Groß',xgross:'Sehr groß'}[val]);
};

/* ── Toggle speichern (Checkboxen) ── */
window.saveToggle = function(key, value) {
  localStorage.setItem('prova_' + key, value ? '1' : '0');
  // Spezifische Effekte
  if (key === 'kompakt') {
    document.body.classList.toggle('kompakt', value);
  }
  if (key === 'animationen') {
    document.documentElement.style.setProperty(
      '--transition-speed', value ? '0.15s' : '0s'
    );
  }
  if (typeof zeigToast === 'function') zeigToast('Einstellung gespeichert ✅');
};

/* ── Select speichern ── */
window.saveSelect = function(key, value) {
  localStorage.setItem('prova_' + key, value);
  // Spezifische Effekte
  if (key === 'startseite') {
    // Startseite wird beim nächsten Login ausgewertet — kein sofortiger Effekt
  }
  if (key === 'diktat_sprache') {
    // Sprache wird bei Whisper-Diktat verwendet
  }
  if (typeof zeigToast === 'function') zeigToast('Einstellung gespeichert ✅');
};

/* ── Beim Laden: Schriftgröße + alle Toggles + Selects wiederherstellen ── */
(function ladeAlleEinstellungen() {
  var ls = localStorage;

  // Schriftgröße
  var fs = ls.getItem('prova_fontsize') || 'normal';
  var size = FONT_SIZES[fs] || '15px';
  document.documentElement.style.fontSize = size;
  document.documentElement.style.setProperty('--font-base', size);
  var fontSel = document.getElementById('es-fontsize');
  if (fontSel) fontSel.value = fs;

  // Theme
  var theme = ls.getItem('prova_theme') || 'dark';
  var thSel = document.getElementById('es-theme');
  if (thSel) thSel.value = theme;

  // Kompakt-Modus
  if (ls.getItem('prova_kompakt') === '1') document.body.classList.add('kompakt');

  // Animationen
  if (ls.getItem('prova_animationen') === '0') {
    document.documentElement.style.setProperty('--transition-speed', '0s');
  }

  // Alle Toggle-Checkboxen setzen
  var TOGGLES = {
    'es-kompakt':          'prova_kompakt',
    'es-animationen':      'prova_animationen',
    'es-auto-quality':     'prova_auto_quality',
    'es-lernmodus':        'prova_lernmodus',
    'es-inline-vorschlaege':'prova_inline_vorschlaege',
    'es-bn-fristen':       'prova_bn_fristen',
    'es-bn-zahlung':       'prova_bn_zahlung',
    'es-bn-stillezeit':    'prova_bn_stillezeit',
  };
  Object.keys(TOGGLES).forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var val = ls.getItem(TOGGLES[id]);
    // null = Standard (checked für die meisten)
    el.checked = val === null ? (el.defaultChecked !== false) : val === '1';
  });

  // Alle Selects setzen
  var SELECTS = {
    'es-startseite':    'prova_startseite',
    'es-diktat-sprache':'prova_diktat_sprache',
    'es-timeout':       'prova_session_timeout',
  };
  Object.keys(SELECTS).forEach(function(id) {
    var el = document.getElementById(id);
    var val = ls.getItem(SELECTS[id]);
    if (el && val) el.value = val;
  });

})();

/* ── Speichern-Button: alle Sektionen speichern ── */
window.speichereAlles = function() {
  if (typeof window.speichereProfil     === 'function') window.speichereProfil();
  if (typeof window.speichereArbeitsweise === 'function') window.speichereArbeitsweise();
  if (typeof window.speichereArbeitszeiten === 'function') window.speichereArbeitszeiten();
  if (typeof window.speichereKanzlei    === 'function') window.speichereKanzlei();
  if (typeof window.speichereAbrechnung === 'function') window.speichereAbrechnung();
  if (typeof zeigToast === 'function') zeigToast('✅ Alle Einstellungen gespeichert');
  var bar = document.getElementById('es-save-bar');
  if (bar) bar.style.opacity = '0';
};

/* ── Änderungen verwerfen ── */
window.verwerfAenderungen = function() {
  location.reload();
};

/* ── Markiere dass etwas geändert wurde (Speichern-Bar zeigen) ── */
window.markiereGeaendert = function() {
  var bar = document.getElementById('es-save-bar');
  if (bar) { bar.style.opacity = '1'; bar.style.pointerEvents = 'auto'; }
};


/* ══════════════════════════════════════════════════════════════
   PROFIL-SYNC: localStorage ↔ Airtable SACHVERSTAENDIGE
   Alle SV-Daten werden auf Airtable geschrieben und von dort
   geladen — geräteübergreifend und browser-unabhängig.
══════════════════════════════════════════════════════════════ */

/* ── Hilfsfunktion: Airtable PATCH für eigenen SV-Record ── */
async function syncZuAirtable(felder) {
  var svEmail = localStorage.getItem('prova_sv_email') || '';
  if (!svEmail) return;

  try {
    // Eigenen Record per Email suchen
    var filter = encodeURIComponent('{Email}="' + svEmail + '"');
    var res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET',
        path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB?filterByFormula=' + filter + '&maxRecords=1'
      })
    });
    var d = await res.json();
    if (!d.records || !d.records[0]) return;
    var recId = d.records[0].id;

    // Felder schreiben
    await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'PATCH',
        path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB/' + recId,
        payload: { fields: felder }
      })
    });
    console.log('[PROVA] Profil → Airtable synced:', Object.keys(felder));
  } catch(e) {
    console.warn('[PROVA] Airtable-Sync fehlgeschlagen:', e.message);
  }
}

/* ── Profil speichern → Airtable ── */
var _origSpeichereProfil = window.speichereProfil;
window.speichereProfil = function() {
  if (_origSpeichereProfil) _origSpeichereProfil();
  // Auch in Airtable schreiben
  syncZuAirtable({
    Vorname:  getVal('e-vorname')  || '',
    Nachname: getVal('e-nachname') || '',
    Telefon:  getVal('e-telefon')  || '',
    Zertifizierung: getVal('e-quali') || '',
    Letzter_Login: new Date().toISOString(),
  });
};

/* ── Bürodaten speichern → Airtable ── */
var _origSpeichereKanzlei = window.speichereKanzlei;
window.speichereKanzlei = function() {
  if (_origSpeichereKanzlei) _origSpeichereKanzlei();
  syncZuAirtable({
    Firma:   getVal('e-firma')   || '',
    Strasse: getVal('e-strasse') || '',
    PLZ:     parseInt(getVal('e-plz')) || 0,
    Ort:     getVal('e-ort')     || '',
  });
};

/* ── Bankdaten speichern → Airtable ── */
var _origSpeichereAbrechnung = window.speichereAbrechnung;
window.speichereAbrechnung = function() {
  if (_origSpeichereAbrechnung) _origSpeichereAbrechnung();
  syncZuAirtable({
    IBAN:      getVal('e-iban')    || '',
    BIC:       getVal('e-bic')     || '',
    Steuer_Nr: getVal('e-steuernr')|| '',
  });
};

/* ── Beim Laden: Profil aus Airtable holen und Felder befüllen ── */
(async function ladeProfilAusAirtable() {
  var svEmail = localStorage.getItem('prova_sv_email') || '';
  if (!svEmail) return;

  try {
    var filter = encodeURIComponent('{Email}="' + svEmail + '"');
    var res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET',
        path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB?filterByFormula=' + filter + '&maxRecords=1'
      })
    });
    var d = await res.json();
    if (!d.records || !d.records[0]) return;
    var f = d.records[0].fields;

    // In localStorage cachen
    if (f.Vorname)   localStorage.setItem('prova_sv_vorname',  f.Vorname);
    if (f.Nachname)  localStorage.setItem('prova_sv_nachname', f.Nachname);
    if (f.Firma)     localStorage.setItem('prova_sv_firma',    f.Firma);
    if (f.Strasse)   localStorage.setItem('prova_sv_strasse',  f.Strasse);
    if (f.PLZ)       localStorage.setItem('prova_sv_plz',      String(f.PLZ));
    if (f.Ort)       localStorage.setItem('prova_sv_ort',      f.Ort);
    if (f.Telefon)   localStorage.setItem('prova_sv_telefon',  f.Telefon);
    if (f.IBAN)      localStorage.setItem('prova_sv_iban',     f.IBAN);
    if (f.BIC)       localStorage.setItem('prova_sv_bic',      f.BIC);
    if (f.Steuer_Nr) localStorage.setItem('prova_sv_steuernr', f.Steuer_Nr);
    if (f.Paket)     localStorage.setItem('prova_paket',       f.Paket);

    // Formularfelder befüllen
    var map = {
      'e-vorname':  f.Vorname,
      'e-nachname': f.Nachname,
      'e-firma':    f.Firma,
      'e-strasse':  f.Strasse,
      'e-plz':      f.PLZ ? String(f.PLZ) : '',
      'e-ort':      f.Ort,
      'e-telefon':  f.Telefon,
      'e-iban':     f.IBAN,
      'e-bic':      f.BIC,
      'e-steuernr': f.Steuer_Nr,
    };
    Object.keys(map).forEach(function(id) {
      var el2 = document.getElementById(id);
      if (el2 && map[id]) el2.value = map[id];
    });
    console.log('[PROVA] Profil aus Airtable geladen');
  } catch(e) {
    console.warn('[PROVA] Profil-Laden aus Airtable fehlgeschlagen:', e.message);
    // Fallback: localStorage-Werte in Felder schreiben
    var lsMap = {
      'e-vorname': 'prova_sv_vorname', 'e-nachname': 'prova_sv_nachname',
      'e-firma': 'prova_sv_firma',     'e-strasse': 'prova_sv_strasse',
      'e-plz': 'prova_sv_plz',         'e-ort': 'prova_sv_ort',
      'e-telefon': 'prova_sv_telefon', 'e-iban': 'prova_sv_iban',
      'e-bic': 'prova_sv_bic',         'e-steuernr': 'prova_sv_steuernr',
    };
    Object.keys(lsMap).forEach(function(id) {
      var el2 = document.getElementById(id);
      var val = localStorage.getItem(lsMap[id]);
      if (el2 && val) el2.value = val;
    });
  }
})();

/* ══════════════════════════════════════════════════════════════
   UNIVERSELLER PROFIL-SYNC — localStorage ↔ Airtable
   Alle 27 SV-Keys werden geräteübergreifend in Airtable gespeichert
   und beim Login aus Airtable wiederhergestellt.
══════════════════════════════════════════════════════════════ */

/* ── Mapping: localStorage-Key → Airtable-Feldname ── */
var PROVA_SYNC_MAP = {
  prova_sv_vorname:     'Vorname',
  prova_sv_nachname:    'Nachname',
  prova_sv_anrede:      'Anrede',
  prova_sv_titel:       'Titel',
  prova_sv_beruf:       'Berufsbezeichnung',
  prova_sv_telefon:     'Telefon',
  prova_sv_website:     'Website',
  prova_sv_firma:       'Firma',
  prova_sv_strasse:     'Strasse',
  prova_sv_plz:         'PLZ',
  prova_sv_ort:         'Ort',
  prova_sv_iban:        'IBAN',
  prova_sv_bic:         'BIC',
  prova_sv_steuernr:    'Steuer_Nr',
  prova_sv_ustid:       'USt_IdNr',
  prova_sv_mwst:        'MwSt_Satz',
  prova_sv_zahlungsziel:'Zahlungsziel_Tage',
  prova_ki_ton:         'ki_ton',
  prova_startseite:     'startseite',
  prova_theme:          'app_theme',
  prova_fontsize:       'app_fontsize',
  prova_az_von:         'sv_arbeitszeit_von',
  prova_az_bis:         'sv_arbeitszeit_bis',
  prova_arbeitstage:    'sv_arbeitstage',
  prova_onboarding_done:'onboarding_done',
};

/* Numerische Felder */
var PROVA_NUMERIC_FIELDS = new Set([
  'prova_sv_plz', 'prova_sv_mwst', 'prova_sv_zahlungsziel'
]);

/* ── Alle geänderten Keys sofort nach Airtable schreiben ── */
window.provaSync = {
  _recId: null,
  _pending: {},
  _timer: null,

  /* Einen Key in Airtable schreiben (debounced 1s) */
  set: function(lsKey, value) {
    var atField = PROVA_SYNC_MAP[lsKey];
    if (!atField) return;

    var val = PROVA_NUMERIC_FIELDS.has(lsKey) ? (parseFloat(value) || 0) : value;
    this._pending[atField] = val;

    clearTimeout(this._timer);
    this._timer = setTimeout(function() {
      window.provaSync._flush();
    }, 800);
  },

  /* Alle gepufferten Änderungen auf einmal schreiben */
  _flush: async function() {
    var felder = Object.assign({}, this._pending);
    this._pending = {};
    if (!Object.keys(felder).length) return;

    var recId = await this._getRecId();
    if (!recId) return;

    try {
      await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'PATCH',
          path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB/' + recId,
          payload: { fields: felder }
        })
      });
    } catch(e) {
      console.warn('[PROVA Sync] Fehler:', e.message);
    }
  },

  /* Record-ID cachen */
  _getRecId: async function() {
    if (this._recId) return this._recId;
    var email = localStorage.getItem('prova_sv_email') || '';
    if (!email) return null;
    try {
      var res = await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'GET',
          path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB?filterByFormula=' +
            encodeURIComponent('{Email}="' + email + '"') + '&maxRecords=1'
        })
      });
      var d = await res.json();
      if (d.records && d.records[0]) this._recId = d.records[0].id;
    } catch(e) {}
    return this._recId;
  },

  /* Alle SV-Daten aus Airtable laden und in localStorage + Formular schreiben */
  load: async function() {
    var email = localStorage.getItem('prova_sv_email') || '';
    if (!email) return;
    try {
      var res = await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'GET',
          path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB?filterByFormula=' +
            encodeURIComponent('{Email}="' + email + '"') + '&maxRecords=1'
        })
      });
      var d = await res.json();
      if (!d.records || !d.records[0]) return;
      var f = d.records[0].fields;
      this._recId = d.records[0].id;

      /* localStorage befüllen */
      Object.keys(PROVA_SYNC_MAP).forEach(function(lsKey) {
        var atField = PROVA_SYNC_MAP[lsKey];
        var val = f[atField];
        if (val !== undefined && val !== null && val !== '') {
          localStorage.setItem(lsKey, String(val));
        }
      });

      /* Formularfelder befüllen */
      var formMap = {
        'e-vorname':    f.Vorname,
        'e-nachname':   f.Nachname,
        'e-anrede':     f.Anrede,
        'e-titel':      f.Titel,
        'e-beruf':      f.Berufsbezeichnung,
        'e-telefon':    f.Telefon,
        'e-website':    f.Website,
        'e-firma':      f.Firma,
        'e-strasse':    f.Strasse,
        'e-plz':        f.PLZ ? String(f.PLZ) : '',
        'e-ort':        f.Ort,
        'e-iban':       f.IBAN,
        'e-bic':        f.BIC,
        'e-steuernr':   f.Steuer_Nr,
        'e-ustid':      f.USt_IdNr,
        'e-mwst':       f.MwSt_Satz ? String(f.MwSt_Satz) : '',
        'e-zahlungsziel': f.Zahlungsziel_Tage ? String(f.Zahlungsziel_Tage) : '',
        'e-ki-ton':     f.ki_ton,
        'e-startseite': f.startseite,
        'e-theme':      f.app_theme,
        'e-fontsize':   f.app_fontsize,
      };
      Object.keys(formMap).forEach(function(id) {
        var el = document.getElementById(id);
        var val = formMap[id];
        if (el && val) el.value = val;
      });

      /* Theme + Font sofort anwenden wenn gesetzt */
      if (f.app_theme && window.aendereTheme) window.aendereTheme(f.app_theme);
      if (f.app_fontsize && window.aendereFontsize) window.aendereFontsize(f.app_fontsize);

      console.log('[PROVA] Profil aus Airtable geladen ✅');
    } catch(e) {
      console.warn('[PROVA] Profil-Laden fehlgeschlagen:', e.message);
    }
  }
};

/* ── Alle speichere*-Funktionen patchen um provaSync.set zu nutzen ── */
var _origSpeichereProfil2 = window.speichereProfil;
window.speichereProfil = function() {
  if (_origSpeichereProfil2) _origSpeichereProfil2();
  var keys = ['prova_sv_vorname','prova_sv_nachname','prova_sv_anrede',
              'prova_sv_titel','prova_sv_beruf','prova_sv_telefon','prova_sv_website'];
  keys.forEach(function(k) { window.provaSync.set(k, localStorage.getItem(k)||''); });
};

var _origSpeichereKanzlei2 = window.speichereKanzlei;
window.speichereKanzlei = function() {
  if (_origSpeichereKanzlei2) _origSpeichereKanzlei2();
  ['prova_sv_firma','prova_sv_strasse','prova_sv_plz','prova_sv_ort'].forEach(function(k) {
    window.provaSync.set(k, localStorage.getItem(k)||'');
  });
};

var _origSpeichereAbrechnung2 = window.speichereAbrechnung;
window.speichereAbrechnung = function() {
  if (_origSpeichereAbrechnung2) _origSpeichereAbrechnung2();
  ['prova_sv_iban','prova_sv_bic','prova_sv_steuernr',
   'prova_sv_ustid','prova_sv_mwst','prova_sv_zahlungsziel'].forEach(function(k) {
    window.provaSync.set(k, localStorage.getItem(k)||'');
  });
};

var _origSpeichereArbeitsweise2 = window.speichereArbeitsweise;
window.speichereArbeitsweise = function() {
  if (_origSpeichereArbeitsweise2) _origSpeichereArbeitsweise2();
  ['prova_ki_ton','prova_startseite','prova_listenansicht'].forEach(function(k) {
    window.provaSync.set(k, localStorage.getItem(k)||'');
  });
};

/* Theme + Fontsize auch nach AT schreiben */
var _origAendereTheme2 = window.aendereTheme;
window.aendereTheme = function(t) {
  if (_origAendereTheme2) _origAendereTheme2(t);
  window.provaSync.set('prova_theme', t);
};

var _origAendereFontsize2 = window.aendereFontsize;
window.aendereFontsize = function(v) {
  if (_origAendereFontsize2) _origAendereFontsize2(v);
  window.provaSync.set('prova_fontsize', v);
};

/* ── Beim Laden der Einstellungen-Seite: aus Airtable laden ── */
document.addEventListener('DOMContentLoaded', function() {
  window.provaSync.load();
});
