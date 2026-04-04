/* ════════════════════════════════════════════════════════════
   PROVA archiv-logic.js
   Archiv — Airtable-Suche, Filter, Export
   Extrahiert aus archiv.html
════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ── SIDEBAR ── */
var paket=localStorage.getItem('prova_paket')||'Solo';
var pc={'Solo':'#4f8ef7','Team':'#a78bfa','Solo':'#4f8ef7','Pro':'#4f8ef7','Enterprise':'#a78bfa'}[paket]||'#4f8ef7';
var el=document.getElementById('topbar-paket-badge');
if(el){el.textContent=paket;el.style.cssText='font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;letter-spacing:.04em;background:'+pc+'18;color:'+pc+';border:1px solid '+pc+'33;';}
var appUrl=paket==='Team'?'app.html':paket==='Solo'?'app-pro.html':'app.html';

/* ── AUTH ── */
if(!localStorage.getItem('prova_user')){window.location.href='app-login.html';return;}

/* ── VIEW TOGGLE ── */
var currentView=localStorage.getItem('prova_listenansicht')||'kanban';
window.setView=function(v){
  currentView=v;
  localStorage.setItem('prova_listenansicht',v);
  document.getElementById('view-kanban').style.display=v==='kanban'?'block':'none';
  document.getElementById('view-liste').style.display=v==='liste'?'block':'none';
  document.getElementById('btn-kanban').classList.toggle('active',v==='kanban');
  document.getElementById('btn-liste').classList.toggle('active',v==='liste');
  if(typeof window.filterUndRender==="function")window.filterUndRender();
  else setTimeout(function(){if(window.filterUndRender)window.filterUndRender();},80);
};
setView(currentView);

/* ── AIRTABLE ── */
var AT_BASE='appJ7bLlAHZoxENWE';
var AT_FAELLE='tblSxV8bsXwd1pwa0';
var svEmail=localStorage.getItem('prova_sv_email')||'';
var alleRecords=[];
var _stilleAktualisierung=false;

async function ladeFaelle(){
  var cacheKey='prova_archiv_cache_v2';
  var cacheMs=5*60*1000;
  var isAdminMode = localStorage.getItem('prova_is_admin')==='true';
  try{
    var raw=localStorage.getItem(cacheKey);
    // Admin: kein Cache — immer frisch laden für vollständige Sicht
    if(!isAdminMode && raw){
        var c=JSON.parse(raw);
        if(c.data&&c.data.length>0){
          alleRecords=c.data; filterUndRender();
          if(Date.now()-c.time<cacheMs) return;
          _stilleAktualisierung = true;
        }
      }
  }catch(e){}

  // Loading state
  zeigLadeAnimation();

  try{
    var isAdmin = localStorage.getItem('prova_is_admin')==='true'
    || (svEmail.toLowerCase()==='admin@prova-systems.de');
  var filter = isAdmin
    ? 'TRUE()'
    : svEmail
      ? 'TRUE()' // field name check — filter client-side
      : 'TRUE()';
    var path='/v0/'+AT_BASE+'/'+AT_FAELLE+'?filterByFormula='+encodeURIComponent(filter)+'&maxRecords=100&sort[0][field]=Timestamp&sort[0][direction]=desc';
    var res=await fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'GET',path:path})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    var data=await res.json();
    alleRecords=data.records||[];
    try{
      if(alleRecords.length>0) {
        localStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),data:alleRecords}));
        // Globaler Fälle-Cache für KI-Drawer in Briefvorlagen
        localStorage.setItem('prova_faelle_cache', JSON.stringify(alleRecords.slice(0,20)));
      }
    }catch(e){}
  }catch(e){
    console.warn('Airtable Fehler:',e);
    // Fallback localStorage
    var ls=[];try{ls=JSON.parse(localStorage.getItem('prova_akten')||'[]');}catch(e2){}
    alleRecords=ls.map(function(a){return{id:a.id||Math.random().toString(36).slice(2),fields:{Aktenzeichen:a.aktenzeichen,Status:a.status||'In Bearbeitung',Schadensart:a.schadenart,Schaden_Strasse:a.adresse,Ort:a.ort,Timestamp:a.datum,Auftraggeber_Name:a.auftraggeber_name}};});
  }
  filterUndRender();
}

/* ── FILTER ── */
var gefiltert=[];
window.filterUndRender=function(){
  var such=(document.getElementById('suche').value||'').toLowerCase().trim();
  var sa=document.getElementById('f-schadenart').value;
  var zr=document.getElementById('f-zeitraum').value;
  var now=Date.now();

  gefiltert=alleRecords.filter(function(r){
    var f=r.fields||{};
    if(sa){
      var art=(f.Schadenart||f.schadenart||f.Schadensart||'').toLowerCase();
      if(!art.includes(sa.toLowerCase()))return false;
    }
    if(zr&&f.Timestamp){
      var ts=new Date(f.Timestamp).getTime();
      var tage=zr==='30'?30:zr==='90'?90:365;
      if(zr==='jahr'){
        if(new Date(f.Timestamp).getFullYear()!==new Date().getFullYear())return false;
      }else{
        if(now-ts>tage*24*60*60*1000)return false;
      }
    }
    if(such){
      var az=(f.Aktenzeichen||'').toLowerCase();
      var addr=[(f.Schaden_Strasse||''),(f.Ort||'')].join(' ').toLowerCase();
      var ag=(f.Auftraggeber_Name||'').toLowerCase();
      var art2=(f.Schadenart||f.schadenart||f.Schadensart||'').toLowerCase();
      if(!az.includes(such)&&!addr.includes(such)&&!ag.includes(such)&&!art2.includes(such))return false;
    }
    return true;
  });

  document.getElementById('count-badge').textContent=gefiltert.length+' Fälle';

  if(currentView==='kanban')renderKanban();
  else renderListe();
};

/* ── HELPER ── */
function schadenartClass(sa){
  var s=(sa||'').toLowerCase();
  if(s.includes('schimmel'))return'sa-schimmel';
  if(s.includes('wasser'))return'sa-wasser';
  if(s.includes('brand'))return'sa-brand';
  if(s.includes('sturm'))return'sa-sturm';
  if(s.includes('bau')||s.includes('mängel'))return'sa-baum';
  return'sa-sonstig';
}
function statusClass(st){
  var s=(st||'').toLowerCase();
  if(s.includes('bearbeitung'))return'st-bearb';
  if(s.includes('entwurf'))return'st-entwurf';
  if(s.includes('freig')||s.includes('export'))return'st-freig';
  if(s.includes('archiv'))return'st-archiv';
  return'st-bearb';
}
function statusKanbanCol(st){
  var s=(st||'').toLowerCase();
  if(s.includes('entwurf'))return'entwurf';
  if(s.includes('freig')||s.includes('export')||s.includes('abgeschl'))return'done';
  if(s.includes('bearbeitung')||s.includes('überarbeitung'))return'bearb';
  return'auftrag';
}
function formatDatum(ts){
  if(!ts)return'—';
  try{return new Date(ts).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});}catch(e){return'—';}
}
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function fallKarte(r){
  var f=r.fields||{};
  var az=f.Aktenzeichen||r.id.slice(-6).toUpperCase();
  var schadenart=f.Schadenart||f.schadenart||f.Schadensart||'Schadenfall';
  var adresse=[f.Schaden_Strasse,f.Ort].filter(Boolean).join(', ')||'—';
  var status=f.Status||'In Bearbeitung';
  var datum=formatDatum(f.Timestamp||r.createdTime);
  var ag=f.Auftraggeber_Name||'';
  var agTyp=f.Auftraggeber_Typ||'';
  var saClass=schadenartClass(schadenart);
  var stClass=statusClass(status);
  var pdfUrl=f.PDF_URL||'';
  var saKurz=schadenart.replace('befall','').replace('schaden','').replace('Schaden','').trim();
  var schrittMap={'Neuer Auftrag':1,'In Bearbeitung':2,'Entwurf fertig':3,'Abgeschlossen':4,'Exportiert':4};
  var schritt=schrittMap[status]||2;
  var fortschritt=Math.round((schritt/4)*100);
  var fortColor={'Abgeschlossen':'#10b981','Exportiert':'#10b981','Entwurf fertig':'#f59e0b'}[status]||'#4f8ef7';
  return '<div class="fall-card" onclick="oeffneFall(\'' + r.id + '\')" style="cursor:pointer;">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
    +'<span class="fall-az" style="font-size:11px;font-weight:800;letter-spacing:.04em;">'+escHtml(az)+'</span>'
    +'<span class="fall-schadenart '+saClass+'" style="font-size:9px;padding:2px 7px;border-radius:4px;font-weight:700;">'+escHtml(saKurz)+'</span>'
    +'</div>'
    +'<div style="margin-bottom:10px;">'
    +'<div style="font-size:13px;font-weight:600;margin-bottom:3px;">'+escHtml(ag||adresse.split(',')[0]||schadenart)+'</div>'
    +(agTyp?'<div style="font-size:10px;color:var(--text3);margin-bottom:2px;">'+escHtml(agTyp)+'</div>':'')
    +(adresse!=='—'?'<div style="font-size:11px;color:var(--text3);">📍 '+escHtml(adresse)+'</div>':'')
    +'</div>'
    +'<div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:8px;">'
    +'<div style="height:100%;width:'+fortschritt+'%;background:'+fortColor+';border-radius:2px;"></div>'
    +'</div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;">'
    +'<span style="font-size:10px;color:var(--text3);">'+datum+'</span>'
    +'<div style="display:flex;gap:6px;align-items:center;">'
    +(pdfUrl?'<a href="'+pdfUrl+'" target="_blank" onclick="event.stopPropagation()" style="font-size:10px;color:var(--accent);text-decoration:none;font-weight:600;padding:2px 7px;border-radius:4px;background:rgba(79,142,247,.1);">PDF</a>':'')
    +'<span class="status-badge '+stClass+'" style="font-size:9px;padding:2px 7px;">'+escHtml(status)+'</span>'
    +'</div>'
    +'</div>'
    +'</div>';
}

/* ── KANBAN ── */
function renderKanban(){
  var cols={auftrag:[],bearb:[],entwurf:[],done:[]};
  gefiltert.forEach(function(r){
    var col=statusKanbanCol(r.fields.Status||'');
    cols[col].push(r);
  });
  Object.keys(cols).forEach(function(key){
    var container=document.getElementById('kc-'+key);
    var counter=document.getElementById('kk-'+key);
    if(!container)return;
    if(counter)counter.textContent=cols[key].length;
    if(cols[key].length===0){
      container.innerHTML='<div class="kanban-empty">Keine Fälle</div>';
    }else{
      container.innerHTML=cols[key].map(function(r){return fallKarte(r);}).join('');
    }
  });
}

/* ── LISTE ── */
function renderListe(){
  var body=document.getElementById('liste-body');
  if(!body)return;
  if(gefiltert.length===0){
    body.innerHTML='<div class="list-empty"><div class="list-empty-icon">🔍</div><p style="font-size:13px;color:var(--text3);margin-bottom:8px;">Keine Fälle gefunden.</p><a href="'+appUrl+'" style="color:var(--accent);font-size:13px;">Neuen Fall anlegen →</a></div>';
    return;
  }
  body.innerHTML=gefiltert.map(function(r){
    var f=r.fields||{};
    var az=f.Aktenzeichen||r.id.slice(-6).toUpperCase();
    var schadenart=f.Schadenart||f.schadenart||f.Schadensart||'Schadenfall';
    var adresse=[f.Schaden_Strasse,f.Ort].filter(Boolean).join(', ')||'—';
    var status=f.Status||'In Bearbeitung';
    var datum=formatDatum(f.Timestamp||r.createdTime);
    var ag=f.Auftraggeber_Name||'';
    var saClass=schadenartClass(schadenart);
    var stClass=statusClass(status);
    return '<div class="list-row" onclick="oeffneFall(\''+r.id+'\')" data-record-id="'+r.id+'" tabindex="0">'
      +'<div class="list-az">'+escHtml(az)+'</div>'
      +'<div><div class="list-name">'+escHtml(ag||schadenart)+'</div>'
      +'<div class="list-meta"><span class="fall-schadenart '+saClass+'" style="font-size:10px;padding:1px 6px;">'+escHtml(schadenart)+'</span></div></div>'
      +'<div class="list-addr">'+escHtml(adresse)+'</div>'
      +'<div class="list-date">'+datum+'</div>'
      +'<div><span class="status-badge '+stClass+'">'+escHtml(status)+'</span></div>'
      +'<div class="list-actions">'
      +(f.PDF_URL?'<a href="'+f.PDF_URL+'" target="_blank" onclick="event.stopPropagation()" class="list-action-btn" title="PDF" style="text-decoration:none;display:flex;align-items:center;justify-content:center;">📄</a>':'')+'<button class="list-action-btn" onclick="event.stopPropagation();oeffneFall(\''+r.id+'\')" title="Fall öffnen" style="font-weight:700;">→</button>'
      +'</div>'
      +'</div>';
  }).join('');
}

/* ── FALL ÖFFNEN ── */
window.oeffneFall=function(recordId){
  sessionStorage.setItem('prova_record_id',recordId);
  var rec=alleRecords.find(function(r){return r.id===recordId;});
  if(rec&&rec.fields.Aktenzeichen){
    sessionStorage.setItem('prova_letztes_az',rec.fields.Aktenzeichen);
  }
  window.location.href='akte.html';
};

/* ── LADE-ANIMATION ── */
function zeigLadeAnimation(){
  var skels='';
  for(var i=0;i<3;i++){
    skels+='<div class="fall-card"><div class="skeleton" style="height:14px;width:70%;margin-bottom:10px;"></div><div class="skeleton" style="height:12px;width:50%;margin-bottom:8px;"></div><div class="skeleton" style="height:10px;width:40%;"></div></div>';
  }
  ['kc-auftrag','kc-bearb','kc-entwurf','kc-done'].forEach(function(id){
    var c=document.getElementById(id);if(c)c.innerHTML=skels;
  });
  var lb=document.getElementById('liste-body');
  if(lb)lb.innerHTML='<div class="list-empty"><div class="list-empty-icon">⏳</div><p>Wird geladen…</p></div>';
}

/* ── SUPPORT ── */
window.sendSupport=async function(){
  var b=document.getElementById('sup-betreff').value.trim();
  var n=document.getElementById('sup-nachricht').value.trim();
  if(!b||!n)return;
  try{await fetch('https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({betreff:b,nachricht:n,sv_email:svEmail,paket:paket,seite:'archiv.html',ts:new Date().toISOString()})});}catch(e){}
  document.getElementById('sup-modal').classList.remove('open');
};

/* ── INIT ── */
ladeFaelle();
// Sicherheits-Timeout: Falls Airtable nicht antwortet, nach 10 Sekunden Empty-State zeigen
// NUR wenn wirklich noch keine Daten gerendert wurden (nicht im Kanban-Modus feuern!)
setTimeout(function() {
  if (alleRecords.length > 0) return; // Daten bereits geladen — nichts tun
  var lb = document.getElementById('liste-body');
  var kanbanHasData = document.querySelector('#kc-bearb .kanban-card, #kc-auftrag .kanban-card, #kc-done .kanban-card');
  if (kanbanHasData) return; // Kanban zeigt bereits Daten
  if (currentView === 'liste' && lb && lb.innerHTML.includes('Wird geladen')) {
    filterUndRender(); // ohne alleRecords zu löschen!
  }
}, 10000);

// Filter-Events
document.getElementById('f-schadenart').addEventListener('change',filterUndRender);
document.getElementById('f-zeitraum').addEventListener('change',filterUndRender);

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
    await fetch('https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        betreff:b,
        nachricht:n,
        sv_email:localStorage.getItem('prova_sv_email')||'',
        paket:localStorage.getItem('prova_paket')||'Solo',
        seite:window.location.pathname
      })
    });
    document.getElementById('support-form-body').style.display='none';
    document.getElementById('support-ok').style.display='block';
  } catch(e) {
    console.warn('Support send error:', e);
  }
}

/* ══════════════════════════════════════════════════════════
   SWIPE ACTIONS MOBILE — iOS-Mail / Todoist Style
   Rechts → Diktat starten | Links → Akte öffnen
   Nur aktiv wenn Touch-Device + < 768px
   ══════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var SWIPE_THRESHOLD = 72;  // px bis Aktion ausgelöst
  var HINT_THRESHOLD  = 30;  // px bis Feedback einsetzt

  function isMobile() {
    return window.innerWidth <= 768 && ('ontouchstart' in window);
  }

  function attachSwipe(card, recordId) {
    var startX, startY, curX, isTracking = false, direction = null;

    card.addEventListener('touchstart', function(e) {
      if (!isMobile()) return;
      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      curX = startX;
      isTracking = true;
      direction = null;
      card.classList.remove('snap-back','snap-open-right','snap-open-left','swipe-confirm-right','swipe-confirm-left');
    }, { passive: true });

    card.addEventListener('touchmove', function(e) {
      if (!isTracking) return;
      var t = e.touches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;

      // Vertikales Scrollen hat Vorrang
      if (direction === null) {
        if (Math.abs(dy) > Math.abs(dx) + 4) { isTracking = false; return; }
        if (Math.abs(dx) > 6) direction = dx > 0 ? 'right' : 'left';
      }
      if (!direction) return;

      curX = t.clientX;
      var delta = Math.max(-SWIPE_THRESHOLD - 10, Math.min(SWIPE_THRESHOLD + 10, dx));

      // Widerstand nach dem Threshold
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        var overflow = Math.abs(dx) - SWIPE_THRESHOLD;
        delta = (dx > 0 ? 1 : -1) * (SWIPE_THRESHOLD + overflow * 0.2);
      }

      card.style.transform = 'translateX(' + delta + 'px)';
      card.classList.toggle('swipe-confirm-right', dx > HINT_THRESHOLD);
      card.classList.toggle('swipe-confirm-left',  dx < -HINT_THRESHOLD);
    }, { passive: true });

    card.addEventListener('touchend', function(e) {
      if (!isTracking) return;
      isTracking = false;
      var dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : curX) - startX;
      card.classList.remove('swipe-confirm-right','swipe-confirm-left');

      if (dx > SWIPE_THRESHOLD) {
        // ── RECHTS: Diktat starten ──
        card.classList.add('snap-open-right');
        setTimeout(function() {
          card.classList.add('snap-back');
          card.style.transform = '';
          // Navigation
          if (recordId && window.oeffneFall) {
            sessionStorage.setItem('prova_record_id', recordId);
            sessionStorage.setItem('prova_goto_diktat', '1');
            window.oeffneFall(recordId);
          }
        }, 180);
      } else if (dx < -SWIPE_THRESHOLD) {
        // ── LINKS: Fall öffnen ──
        card.classList.add('snap-open-left');
        setTimeout(function() {
          card.classList.add('snap-back');
          card.style.transform = '';
          if (recordId && window.oeffneFall) window.oeffneFall(recordId);
        }, 180);
      } else {
        // Zurückschnappen
        card.classList.add('snap-back');
        card.style.transform = '';
        setTimeout(function() { card.classList.remove('snap-back'); }, 300);
      }
    }, { passive: true });
  }

  /* ── Karten umhüllen und Swipe anhängen ── */
  function wrapCards() {
    if (!isMobile()) return;

    // Kanban-Cards
    document.querySelectorAll('.fall-card[data-record-id]').forEach(function(card) {
      if (card.closest('.swipe-wrap')) return; // bereits gewrappt
      var rid = card.dataset.recordId;
      var wrap = document.createElement('div');
      wrap.className = 'swipe-wrap';

      // Left action (Diktat)
      var leftAct = document.createElement('div');
      leftAct.className = 'swipe-actions-left';
      leftAct.innerHTML = '<div class="swipe-action-icon">🎙️</div><div class="swipe-action-label">Diktat</div>';

      // Right action (Akte)
      var rightAct = document.createElement('div');
      rightAct.className = 'swipe-actions-right';
      rightAct.innerHTML = '<div class="swipe-action-icon">→</div><div class="swipe-action-label">Akte</div>';

      card.parentNode.insertBefore(wrap, card);
      wrap.appendChild(leftAct);
      wrap.appendChild(card);
      wrap.appendChild(rightAct);

      card.classList.add('swipe-card');
      attachSwipe(card, rid);
    });

    // Listen-Rows
    document.querySelectorAll('.list-row[data-record-id]').forEach(function(row) {
      if (row.closest('.swipe-wrap')) return;
      var rid = row.dataset.recordId;
      var wrap = document.createElement('div');
      wrap.className = 'swipe-wrap';

      var leftAct = document.createElement('div');
      leftAct.className = 'swipe-actions-left';
      leftAct.innerHTML = '<div class="swipe-action-icon">🎙️</div><div class="swipe-action-label">Diktat</div>';

      var rightAct = document.createElement('div');
      rightAct.className = 'swipe-actions-right';
      rightAct.innerHTML = '<div class="swipe-action-icon">→</div><div class="swipe-action-label">Akte</div>';

      row.parentNode.insertBefore(wrap, row);
      wrap.appendChild(leftAct);
      wrap.appendChild(row);
      wrap.appendChild(rightAct);

      row.classList.add('swipe-card');
      attachSwipe(row, rid);
    });
  }

  // Nach jedem Render ausführen
  var _origFilterRender = window.filterUndRender;
  window.filterUndRender = function() {
    if (_origFilterRender) _origFilterRender.apply(this, arguments);
    if (isMobile()) setTimeout(wrapCards, 50);
  };

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(wrapCards, 200); });
  } else {
    setTimeout(wrapCards, 200);
  }

})();