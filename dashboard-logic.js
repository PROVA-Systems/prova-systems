/* ════════════════════════════════════════════════════════════
   PROVA dashboard-logic.js
   Zentrale — Dashboard, KPIs, Kalender, Aufgaben
   Extrahiert aus dashboard.html
════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ════════════════════════════════════════════════════
   PROVA ZENTRALE — Block 2: Live-Daten + Onboarding
   Datenquellen: Airtable (primär) + localStorage (fallback)
════════════════════════════════════════════════════ */

var AT_BASE = 'appJ7bLlAHZoxENWE';
var AT_FAELLE = 'tblSxV8bsXwd1pwa0';
var AT_TERMINE = 'tblyMTTdtfGQjjmc2';
var AT_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';

var paket = localStorage.getItem('prova_paket') || 'Solo';
var vorname = localStorage.getItem('prova_sv_vorname') || '';
var paketColors = {Solo:'#4f8ef7',Team:'#a78bfa',Starter:'#4f8ef7',Pro:'#4f8ef7',Enterprise:'#a78bfa'};
var pc = paketColors[paket] || paketColors.Solo;
var maxKontingent = paket==='Solo' ? 25 : paket==='Team' ? 75 : 5;
window.maxKontingent = maxKontingent;

/* ── Paket Badge ── */
(function(){
  var el=document.getElementById('topbar-paket-badge');
  if(el){el.style.display='none';} // Paket steht in Sidebar unten
})();

/* ── Begrüssung ── */
(function(){
  var h=new Date().getHours();
  var anrede=localStorage.getItem('prova_sv_anrede')||'Sie';
  var rnd=Math.random();
  var gr, emoji;
  /* ~12% Chance: "Willkommen zurück" — jederzeit */
  if(rnd < 0.12){
    gr='Willkommen zurück'; emoji='👋';
  /* Uhrzeit-basiert: 05-11 Morgen, 12-17 Tag, 18-21 Abend, 22-04 Nacht */
  } else if(h>=5 && h<12){
    gr='Guten Morgen'; emoji='☀️';
  } else if(h>=12 && h<18){
    gr='Guten Tag'; emoji='👋';
  } else if(h>=18 && h<22){
    gr='Guten Abend'; emoji='🌙';
  } else {
    gr='Gute Nacht'; emoji='🌛';
  }
  var name=vorname?', '+vorname:'';
  var t=document.getElementById('greeting-title');
  if(t)t.textContent=gr+name+' '+emoji;
  var sub=document.getElementById('greeting-sub');
  if(sub)sub.textContent=anrede==='Du'?'Hier ist dein Überblick für heute.':'Hier ist Ihr Überblick für heute.';
})();

/* ══════════════════════════════════════════════════
   AIRTABLE FETCH via Netlify Proxy
══════════════════════════════════════════════════ */
async function atFetch(table, formula, maxRecords, sortField){
  try{
    // Session 28 Fix #6: Sort-Feld pro Tabelle waehlbar.
    // RECHNUNGEN hat kein 'Timestamp'-Feld → musste 422 werfen.
    // Jetzt gibt der Aufrufer das richtige Sortierfeld an (oder keines).
    var sort = sortField === null ? '' : '&sort[0][field]=' + encodeURIComponent(sortField || 'Timestamp') + '&sort[0][direction]=desc';
    var path='/v0/'+AT_BASE+'/'+table
      +'?filterByFormula='+encodeURIComponent(formula)
      +'&maxRecords='+(maxRecords||50)
      +sort;
    var res=await fetch('/.netlify/functions/airtable',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({method:'GET',path:path})
    });

    if(!res.ok)return[];
    var data=await res.json();
    return data.records||[];
  }catch(e){return[];}
}

/* ══════════════════════════════════════════════════
   SKELETON LOADING — zeigt während Daten laden
══════════════════════════════════════════════════ */
function zeigSkeleton(){
  ['kpi-aktiv','kpi-heute','kpi-rechnungen','kpi-kontingent'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){el.innerHTML='<span class="skeleton" style="display:inline-block;width:40px;height:24px;border-radius:6px;"></span>';}
  });
}

/* ══════════════════════════════════════════════════
   ONBOARDING EMPTY STATE — für neuen SV
══════════════════════════════════════════════════ */
function zeigOnboarding(){
  /* ── Progressives Onboarding ──────────────────────────────
     Box zeigt nur was noch fehlt. Verschwindet komplett wenn:
     ✓ Profil ausgefüllt  ✓ Kontakte vorhanden  ✓ Erster Fall
  ─────────────────────────────────────────────────────────── */
  var profilOk  = !!(localStorage.getItem('prova_sv_vorname') && localStorage.getItem('prova_sv_nachname'));
  var kontakteOk= localStorage.getItem('prova_kontakte_importiert') === '1';
  var ersterFall= localStorage.getItem('prova_erster_fall_erstellt') === '1';

  // Nur beim ERSTEN Besuch "Erstes Gutachten" zeigen
  var erstesMalGesehen = localStorage.getItem('prova_welcome_seen') === '1';
  if(!erstesMalGesehen) localStorage.setItem('prova_welcome_seen','1');

  // Alle erledigt → Box komplett ausblenden
  if(profilOk && kontakteOk) {
    // Onboarding-Flag in Airtable setzen (cross-device Persistenz)
    if(!localStorage.getItem('prova_onboarding_done')) {
      localStorage.setItem('prova_onboarding_done','true');
      var atRecId = localStorage.getItem('prova_at_sv_record_id');
      if(atRecId) {
        fetch('/.netlify/functions/airtable',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            method:'PATCH',
            path:'/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB/'+atRecId,
            payload:{fields:{onboarding_done:true}}
          })
        }).catch(function(e){console.warn('Onboarding-Flag Airtable-Patch fehlgeschlagen:',e);});
      }
    }
    var feedCard = document.querySelector('.feed-card');
    if(feedCard) {
      feedCard.style.display = 'none';
      // Mehr Platz für den Kalender
      var grid = document.querySelector('.zentrale-grid');
      if(grid) grid.style.gridTemplateColumns = '1fr';
    }
    var bt=document.getElementById('briefing-text');
    var btags=document.getElementById('briefing-tags');
    if(bt)bt.innerHTML='<strong>Alles eingerichtet.</strong> Hier ist Ihr Überblick für heute.';
    if(btags)btags.innerHTML='<span class="briefing-tag ok">✓ Bereit</span>';
    return;
  }

  // Todo-Liste: nur was noch fehlt
  var todos = [];
  if(!profilOk)   todos.push({icon:'⚙️',label:'SV-Profil vervollständigen',sub:'Name, Qualifikation, Bürodaten',href:'einstellungen.html'});
  if(!kontakteOk) todos.push({icon:'👥',label:'Ersten Kontakt anlegen',sub:'Auftraggeber, Versicherung oder Anwalt',href:'kontakte.html'});
  if(!ersterFall && !erstesMalGesehen) todos.push({icon:'📄',label:'Erstes Gutachten anlegen',sub:'Diktat aufnehmen → KI erstellt §1–§5',href:'app.html',primary:true});

  var feed=document.getElementById('aufgaben-feed');
  if(feed && todos.length > 0){
    var doneCount = 3 - todos.length;
    var pct = Math.round(doneCount / 3 * 100);
    feed.innerHTML=
      '<div style="padding:16px 20px;">'+
      '<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Einrichtung · '+doneCount+' von 3 erledigt</div>'+
      '<div style="height:4px;border-radius:4px;background:var(--border);margin-bottom:14px;overflow:hidden;">'+
        '<div style="height:100%;border-radius:4px;background:linear-gradient(90deg,var(--accent),var(--accent2));width:'+pct+'%;"></div>'+
      '</div>'+
      todos.map(function(t,i){
        var isNext = i===0;
        return '<a href="'+t.href+'" style="display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:7px;'+
          (isNext
            ? 'background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;'
            : 'background:var(--surface2);border:1px solid var(--border2);color:var(--text2);opacity:.55;pointer-events:none;')+
          'border-radius:var(--r-md);text-decoration:none;font-size:13px;transition:opacity .15s;">'+
          '<span style="font-size:20px;flex-shrink:0;">'+t.icon+'</span>'+
          '<div style="flex:1;"><div style="font-weight:600;">'+t.label+'</div>'+
          '<div style="font-size:11px;opacity:.75;margin-top:1px;">'+t.sub+'</div></div>'+
          (isNext ? '<span style="font-size:15px;opacity:.9;">→</span>' : '')+
          '</a>';
      }).join('')+
      '</div>';
  } else if(feed) {
    // Prüfe offene Fälle im Cache
    var archivCache=[];
    try{archivCache=JSON.parse(localStorage.getItem('prova_archiv_cache_v2')||'{}').data||[];}catch(e){}
    var offene=archivCache.filter(function(r){var s=(r.fields&&r.fields.Status)||'';return s!=='Archiviert'&&s!=='Freigegeben'&&s!=='Exportiert';});
    if(offene.length>0){
      feed.innerHTML='<div style="padding:16px 20px;">'
        +'<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Was steht heute an?</div>'
        +offene.slice(0,3).map(function(r){
          var f=r.fields||{};var az=f.Aktenzeichen||'—';var sa=f.Schadensart||'Schadenfall';
          var naechst=!f.KI_Entwurf?{icon:'🎤',label:'Diktat aufnehmen',col:'#4f8ef7',href:'app.html'}:!f.Stellungnahme_Text?{icon:'⚖️',label:'§6 Fachurteil schreiben',col:'#f59e0b',href:'stellungnahme.html?az='+encodeURIComponent(az)}:{icon:'✅',label:'Freigeben & PDF erstellen',col:'#10b981',href:'freigabe.html?az='+encodeURIComponent(az)};
          return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:10px;cursor:pointer;" data-href="akte.html?id='+r.id+'" onclick="window.location.href=this.dataset.href">'
            +'<span style="font-size:16px;">'+naechst.icon+'</span>'
            +'<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+az+' · '+sa+'</div>'
            +'<div style="font-size:11px;color:'+naechst.col+';margin-top:1px;">'+naechst.label+'</div></div>'
            +'<span style="color:var(--text3);">→</span></div>';
        }).join('')+'</div>';
    }else{
      feed.innerHTML='<div class="feed-empty"><div class="feed-empty-icon">✨</div><p>Alles erledigt — keine offenen Aktionen.</p></div>';
    }
  }

if(bt)bt.innerHTML='<strong>Willkommen bei PROVA.</strong> Legen Sie Ihren ersten Fall an oder vervollständigen Sie Ihr SV-Profil in den Einstellungen.';
  if(btags)btags.innerHTML='<span class="briefing-tag info">🚀 Bereit zum Start</span>';
}


/* ═══════════════════════════════════════════════════════════
   AUFGABEN-WIDGET — Zeigt dem SV was heute zu tun ist
   ═══════════════════════════════════════════════════════════ */
function renderAufgaben(faelle, termine) {
  var heute = new Date();
  var aufgaben = [];

  faelle.forEach(function(r) {
    var f = r.fields || r;
    var az = f.Aktenzeichen || f.Aktenzeichen || '';
    var status = f.Status || 'In Bearbeitung';
    var frist = f.Fristdatum ? new Date(f.Fristdatum) : null;
    var tage = frist ? Math.ceil((frist - heute) / 86400000) : null;
    var prioritaet = 0;
    var aktion = null;

    if (status === 'Exportiert' || status === 'Archiviert') return;

    // Phase bestimmen
    var hatEntwurf = !!f.KI_Entwurf;
    var hatSt6 = f.Status === 'Freigegeben' || f.Status === 'Exportiert';

    if (!hatEntwurf) {
      aktion = {icon:'🎤', label:'Diktat aufnehmen', url:'app.html', cls:'neu'};
      prioritaet = tage !== null && tage <= 5 ? 3 : 1;
    } else if (!hatSt6) {
      aktion = {icon:'⚖️', label:'§6 Fachurteil schreiben', url:'stellungnahme.html?az='+encodeURIComponent(az), cls:'aktiv'};
      prioritaet = tage !== null && tage <= 3 ? 4 : 2;
    } else if (status !== 'Exportiert') {
      aktion = {icon:'✅', label:'Freigeben & PDF senden', url:'freigabe.html', cls:'freigabe'};
      prioritaet = 3;
    }

    if (!aktion) return;
    aufgaben.push({
      az: az,
      schadenart: f.Schadensart || f.schadensart || '—',
      tage: tage,
      prioritaet: prioritaet,
      aktion: aktion,
      frist: frist
    });
  });

  // Sortieren: Priorität → Frist
  aufgaben.sort(function(a, b) {
    if (b.prioritaet !== a.prioritaet) return b.prioritaet - a.prioritaet;
    if (a.tage !== null && b.tage !== null) return a.tage - b.tage;
    return 0;
  });

  var feed = document.getElementById('aufgaben-feed');
  if (!feed) return;

  if (aufgaben.length === 0) {
    feed.innerHTML = '<div class="feed-empty"><div class="feed-empty-icon">✨</div><p>Alle Fälle up-to-date — keine offenen Aufgaben.</p></div>';
    return;
  }

  var fristGruppe = aufgaben.filter(function(a) { return a.tage !== null && a.tage <= 2; });
  var aktivGruppe = aufgaben.filter(function(a) { return !fristGruppe.includes(a); }).slice(0, 4);

  var html = '<div style="padding:0 4px;">';

  if (fristGruppe.length) {
    html += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#ef4444;margin-bottom:8px;margin-top:8px;">🔴 Heute / morgen fällig</div>';
    fristGruppe.forEach(function(a) {
      html += renderAufgabeKarte(a, true);
    });
  }

  if (aktivGruppe.length) {
    html += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px;margin-top:' + (fristGruppe.length ? '14' : '8') + 'px;">📋 Offen</div>';
    aktivGruppe.forEach(function(a) {
      html += renderAufgabeKarte(a, false);
    });
  }

  html += '</div>';
  feed.innerHTML = html;
}

function renderAufgabeKarte(a, dringend) {
  var fristLabel = '';
  if (a.tage !== null) {
    if (a.tage < 0) fristLabel = '<span style="color:#ef4444;font-weight:700;">'+Math.abs(a.tage)+'T überfällig</span>';
    else if (a.tage === 0) fristLabel = '<span style="color:#ef4444;font-weight:700;">Heute fällig</span>';
    else if (a.tage === 1) fristLabel = '<span style="color:#f59e0b;font-weight:700;">Morgen fällig</span>';
    else fristLabel = '<span style="color:var(--text3);">Frist: '+a.tage+'T</span>';
  }
  var bg = dringend ? 'rgba(239,68,68,.04)' : 'var(--surface2)';
  var border = dringend ? '1px solid rgba(239,68,68,.15)' : '1px solid var(--border)';
  return '<a href="'+a.aktion.url+'" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;background:'+bg+';border:'+border+';border-radius:10px;text-decoration:none;transition:all .15s;" data-ol="1px solid var(--accent)" data-oloff="" onmouseenter="this.style.outline=this.dataset.ol" onmouseleave="this.style.outline=this.dataset.oloff">'+
    '<span style="font-size:18px;flex-shrink:0;">'+a.aktion.icon+'</span>'+
    '<div style="flex:1;min-width:0;">'+
      '<div style="font-size:12px;font-weight:700;color:var(--text);">'+a.az+'</div>'+
      '<div style="font-size:11px;color:var(--text3);">'+a.schadenart+' · '+a.aktion.label+'</div>'+
    '</div>'+
    '<div style="text-align:right;flex-shrink:0;font-size:10px;">'+fristLabel+'<div style="color:var(--accent);font-size:13px;margin-top:2px;">→</div></div>'+
  '</a>';
}


/* ══════════════════════════════════════════════════
   KPI + FEED RENDERN
══════════════════════════════════════════════════ */
function renderKPIs(faelle, termine, rechnungen){
  var heute=new Date().toDateString();
  var thisMonth=new Date().toISOString().slice(0,7);

  /* Aktive Fälle */
  var aktiv=faelle.filter(function(r){
    var s=r.fields.Status||'';
    return s==='In Bearbeitung'||s==='Entwurf'||s==='Korrektur_angefordert';
  }).length;
  var kpiA=document.getElementById('kpi-aktiv');
  if(kpiA){
    kpiA.textContent=String(aktiv||0);
    if(aktiv>=5)kpiA.classList.add('warn');
    if(aktiv>0){var bd=document.getElementById('sb-badge-faelle');if(bd){bd.style.display='inline-block';bd.textContent=aktiv;}}
  }
  var kpiASub=document.getElementById('kpi-aktiv-sub');
  if(kpiASub)kpiASub.textContent=aktiv===1?'1 Fall in Bearbeitung':aktiv+' Fälle in Bearbeitung';

  /* Heute fällig */
  var heuteAnz=termine.filter(function(r){
    var d=r.fields.termin_datum;if(!d)return false;
    try{return new Date(d).toDateString()===heute;}catch(e){return false;}
  }).length;
  var kpiH=document.getElementById('kpi-heute');
  if(kpiH){
    kpiH.textContent=String(heuteAnz||0);
    if(heuteAnz>0){kpiH.classList.add('warn');var bd2=document.getElementById('sb-badge-termine');if(bd2){bd2.style.display='inline-block';bd2.textContent=heuteAnz;}}
  }

  /* Offene Rechnungen */
  var offene=rechnungen.filter(function(r){
    var s=r.fields.Status||r.fields.status||'';
    return s==='Offen'||s==='Überfällig';
  });
  var offenBetrag=offene.reduce(function(s,r){return s+(parseFloat(r.fields.betrag_brutto||r.fields.Betrag||0)||0);},0);
  var hatUeber=offene.some(function(r){return (r.fields.Status||r.fields.status||'')==='Überfällig';});
  var kpiR=document.getElementById('kpi-rechnungen');
  if(kpiR){
    if(offenBetrag>0){
      kpiR.textContent=offenBetrag.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
      if(hatUeber)kpiR.classList.add('danger');
      var bd3=document.getElementById('sb-badge-rechnungen');if(bd3){bd3.style.display='inline-block';bd3.textContent=offene.length;}
    }else{kpiR.textContent='0 €';}
  }
  var kpiRSub=document.getElementById('kpi-rechnungen-sub');
  if(kpiRSub)kpiRSub.textContent=offene.length>0?offene.length+' Rechnung'+(offene.length!==1?'en':'')+' offen':'Alles beglichen';

  /* Kontingent */
  var diesesMonat=faelle.filter(function(r){
    var ts=r.fields.Timestamp||r.createdTime||'';
    return ts.startsWith(thisMonth);
  }).length;
  var kpiK=document.getElementById('kpi-kontingent');
  if(kpiK)kpiK.textContent=paket==='Team'?'∞':diesesMonat+' / '+maxKontingent;
  var prog=document.getElementById('kpi-progress');
  if(prog&&paket!=='Team'){
    var pct=maxKontingent>0?Math.min(100,Math.round(diesesMonat/maxKontingent*100)):0;
    setTimeout(function(){prog.style.width=pct+'%';},100);
    // Farbe ändern wenn nah am Limit
    if(pct>=90)prog.style.background='var(--danger)';
    else if(pct>=70)prog.style.background='var(--warning)';
    var kpiKSub=kpiK.nextElementSibling;
    if(kpiKSub)kpiKSub.textContent=pct+'% des Monatskontingents genutzt';
  }

  // Dynamischer Kontext-Satz im Greeting (Stripe-Style: Zahlen statt Prosa)
  var greetSub = document.getElementById('greeting-sub');
  if (greetSub) {
    var parts = [];
    if (aktiv > 0) parts.push(aktiv + ' Fall' + (aktiv !== 1 ? 'fälle' : '') + ' aktiv');
    if (heuteAnz > 0) parts.push(heuteAnz + ' Termin' + (heuteAnz !== 1 ? 'e' : '') + ' heute');
    if (offene.length > 0) parts.push(offene.length + ' Rechnung' + (offene.length !== 1 ? 'en' : '') + ' offen');
    greetSub.textContent = parts.length > 0 ? parts.join(' · ') : 'Alles im grünen Bereich ✓';
  }

  // Stripe-Style: KPI-Trends (Vergleich mit Vorwoche)
  try {
    var today = new Date().toISOString().split('T')[0];
    var histKey = 'prova_kpi_history';
    var hist = JSON.parse(localStorage.getItem(histKey)||'{}');
    // Heute speichern
    hist[today] = {aktiv: aktiv, diesesMonat: diesesMonat};
    // Nur 30 Tage behalten
    var keys = Object.keys(hist).sort();
    if (keys.length > 30) { delete hist[keys[0]]; }
    localStorage.setItem(histKey, JSON.stringify(hist));

    // Vorwoche vergleichen
    var vorwoche = new Date(); vorwoche.setDate(vorwoche.getDate() - 7);
    var vwKey = vorwoche.toISOString().split('T')[0];
    var vwData = hist[vwKey];
    if (vwData) {
      var deltaAktiv = aktiv - (vwData.aktiv || 0);
      var kpiASub2 = document.getElementById('kpi-aktiv-sub');
      if (kpiASub2 && deltaAktiv !== 0) {
        var arrow = deltaAktiv > 0 ? '↑' : '↓';
        var col   = deltaAktiv > 0 ? '#f59e0b' : '#10b981'; // mehr=warnung, weniger=gut
        kpiASub2.innerHTML = kpiASub2.textContent
          + ' <span style="color:' + col + ';font-size:10px;">'
          + arrow + ' ' + Math.abs(deltaAktiv) + ' vs. Vorwoche</span>';
      }
    }
  } catch(e) {}

  return {aktiv:aktiv,heuteAnz:heuteAnz,offene:offene,hatUeber:hatUeber,diesesMonat:diesesMonat};
}

function renderFeed(faelle, termine, rechnungen, stats){
  var feed=document.getElementById('aufgaben-feed');
  if(!feed)return;
  var actions=[];

  /* 1. Kritische Fristen heute */
  termine.forEach(function(r){
    var f=r.fields;
    var d=f.termin_datum;if(!d)return;
    var typ=f.termin_typ||'Termin';
    var istKritisch=typ==='Frist'||typ==='Gerichtstermin'||typ==='Abgabe';
    try{
      var dt=new Date(d);
      var diff=Math.floor((dt-new Date())/(1000*60*60*24));
      if(diff<=1&&diff>=-1){
        actions.push({
          prio:'red',
          title:(istKritisch?'⚠️ ':'')+typ+': '+(f.titel||f.aktenzeichen||'Termin'),
          meta:dt.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+(f.objekt_adresse?' · '+f.objekt_adresse:''),
          badge:'frist',badge_text:diff<0?'Überfällig':diff===0?'Heute':'Morgen',
          href:'termine.html',sort:0
        });
      }
    }catch(e){}
  });

  /* 2. Fälle die Freigabe warten */
  faelle.filter(function(r){return r.fields.Status==='Entwurf';}).slice(0,3).forEach(function(r){
    var f=r.fields;
    actions.push({
      prio:'warn',
      title:(f.Aktenzeichen||'Fall')+' — '+(f.Schadensart||f.schadenart||f.Schadensart||'Schadenfall'),
      meta:(f.Schaden_Strasse?f.Schaden_Strasse+', ':'')+( f.Ort||'')+(f.Timestamp?' · '+new Date(f.Timestamp).toLocaleDateString('de-DE'):''),
      badge:'offen',badge_text:'Freigabe ausstehend',
      href:'freigabe.html',sort:1
    });
  });

  /* 3. Fälle in Bearbeitung (ohne Aktivität >3 Tage) */
  var dreiTageAgo=Date.now()-3*24*60*60*1000;
  faelle.filter(function(r){
    if(r.fields.Status!=='In Bearbeitung')return false;
    var ts=new Date(r.fields.Timestamp||r.createdTime||0).getTime();
    return ts<dreiTageAgo;
  }).slice(0,2).forEach(function(r){
    var f=r.fields;
    actions.push({
      prio:'grey',
      title:(f.Aktenzeichen||'Fall')+' — '+(f.Schadensart||f.schadenart||f.Schadensart||'Schadenfall'),
      meta:(f.Schaden_Strasse||f.Schaden_Strasse||(f.Ort?f.Ort:''))+' · In Bearbeitung',
      badge:'offen',badge_text:'In Bearbeitung',
      href:'archiv.html',sort:2
    });
  });

  /* 4. Überfällige Rechnungen */
  rechnungen.filter(function(r){
    return (r.fields.Status||r.fields.status||'')==='Überfällig';
  }).slice(0,2).forEach(function(r){
    var f=r.fields;
    actions.push({
      prio:'red',
      title:(f.Rechnungsnummer||f.re_nr||'Rechnung')+' — '+(f.Auftraggeber_Name||f.auftraggeber||'Auftraggeber'),
      meta:'Betrag: '+((parseFloat(f.betrag_brutto||f.Betrag||0)||0).toLocaleString('de-DE',{minimumFractionDigits:2}))+' € · Überfällig',
      badge:'frist',badge_text:'Überfällig',
      href:'rechnungen.html',sort:0
    });
  });

  actions.sort(function(a,b){return(a.sort||9)-(b.sort||9);});

  if(actions.length===0){
    // Prüfe offene Fälle im Cache
    var archivCache=[];
    try{archivCache=JSON.parse(localStorage.getItem('prova_archiv_cache_v2')||'{}').data||[];}catch(e){}
    var offeneF=archivCache.filter(function(r){var s=(r.fields&&r.fields.Status)||'';return s!=='Archiviert'&&s!=='Freigegeben'&&s!=='Exportiert';});
    if(offeneF.length>0){
      feed.innerHTML='<div style="padding:0;">'
        +offeneF.slice(0,4).map(function(r){
          var f=r.fields||{};
          var az=f.Aktenzeichen||'—';var sa=f.Schadensart||'Schadenfall';
          var ns=!f.KI_Entwurf
            ?{icon:'🎤',label:'Diktat aufnehmen',col:'#4f8ef7',href:'app.html',prio:'blue'}
            :!(f.Stellungnahme_Text&&f.Stellungnahme_Text.length>30)
            ?{icon:'⚖️',label:'§6 Fachurteil schreiben',col:'#f59e0b',href:'stellungnahme.html?az='+encodeURIComponent(az),prio:'warn'}
            :f.Status!=='Freigegeben'
            ?{icon:'✅',label:'Freigeben & PDF erstellen',col:'#10b981',href:'freigabe.html?az='+encodeURIComponent(az),prio:'green'}
            :{icon:'💶',label:'Rechnung erstellen',col:'#8b5cf6',href:'rechnungen.html?az='+encodeURIComponent(az),prio:'purple'};
          var bcol={'blue':'rgba(79,142,247,.12)','warn':'rgba(245,158,11,.1)','green':'rgba(16,185,129,.1)','purple':'rgba(139,92,246,.1)'}[ns.prio]||'rgba(255,255,255,.04)';
          var bord={'blue':'rgba(79,142,247,.25)','warn':'rgba(245,158,11,.2)','green':'rgba(16,185,129,.2)','purple':'rgba(139,92,246,.2)'}[ns.prio]||'rgba(255,255,255,.08)';
          return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;margin:6px 12px;background:'+bcol+';border:1px solid '+bord+';border-radius:10px;cursor:pointer;" data-href="akte.html?id='+r.id+'" onclick="window.location.href=this.dataset.href">'
            +'<span style="font-size:18px;">'+ns.icon+'</span>'
            +'<div style="flex:1;min-width:0;">'
            +'<div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escHtml(az)+' · '+escHtml(sa)+'</div>'
            +'<div style="font-size:11px;color:'+ns.col+';margin-top:2px;font-weight:600;">'+ns.label+'</div>'
            +'</div>'
            +'<a href="'+ns.href+'" onclick="event.stopPropagation()" style="padding:6px 14px;border-radius:8px;border:none;background:'+ns.col+';color:#fff;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;">→ Jetzt</a>'
            +'</div>';
        }).join('')+'</div>';
    } else {
      feed.innerHTML='<div class="feed-empty"><div class="feed-empty-icon">✨</div><p>Alle Fälle auf dem neuesten Stand — gute Arbeit!</p></div>';
    }
  }else{
    feed.innerHTML=actions.map(function(a){
      var bcol=a.prio==='red'?'rgba(239,68,68,.08)':a.prio==='warn'?'rgba(245,158,11,.08)':'rgba(255,255,255,.03)';
      var bord=a.prio==='red'?'rgba(239,68,68,.2)':a.prio==='warn'?'rgba(245,158,11,.15)':'var(--border)';
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;margin:6px 12px;background:'+bcol+';border:1px solid '+bord+';border-radius:10px;cursor:pointer;" data-href="'+(a.href||'archiv.html')+'" onclick="window.location.href=this.dataset.href">'
        +'<div class="action-prio '+a.prio+'" style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:'+(a.prio==='red'?'#ef4444':a.prio==='warn'?'#f59e0b':'#6b7280')+';"></div>'
        +'<div class="action-body" style="flex:1;min-width:0;">'
        +'<div class="action-title" style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escHtml(a.title)+'</div>'
        +'<div class="action-meta" style="font-size:11px;color:var(--text3);margin-top:2px;">'+escHtml(a.meta)+'</div>'
        +'</div>'
        +'<span class="action-badge '+a.badge+'" style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px;white-space:nowrap;background:'+(a.prio==='red'?'rgba(239,68,68,.15)':a.prio==='warn'?'rgba(245,158,11,.12)':'rgba(255,255,255,.08)')+';color:'+(a.prio==='red'?'#ef4444':a.prio==='warn'?'#f59e0b':'var(--text2)')+';border:1px solid '+(a.prio==='red'?'rgba(239,68,68,.25)':'var(--border)')+';margin-left:4px;">'+a.badge_text+'</span>'
        +'</div>';
    }).join('');
  }

  /* Briefing Banner */
  var bt=document.getElementById('briefing-text');
  var btags=document.getElementById('briefing-tags');
  var summary=[];var tagHtml='';
  if(stats.aktiv>0){summary.push('<strong>'+stats.aktiv+' aktive Fälle</strong>');tagHtml+='<span class="briefing-tag info">📁 '+stats.aktiv+' aktiv</span>';}
  if(stats.heuteAnz>0){summary.push('<strong>'+stats.heuteAnz+' Termin'+(stats.heuteAnz!==1?'e':'')+' heute</strong>');tagHtml+='<span class="briefing-tag warn">📅 '+stats.heuteAnz+' heute</span>';}
  if(stats.hatUeber){tagHtml+='<span class="briefing-tag red">⚠ Überfällig</span>';}
  else if(stats.offene.length>0){tagHtml+='<span class="briefing-tag warn">💶 '+stats.offene.length+' offen</span>';}
  if(!tagHtml)tagHtml='<span class="briefing-tag ok">✓ Alles im Griff</span>';
  var anrede=localStorage.getItem('prova_sv_anrede')||'Sie';
  if(bt){
    if(summary.length>0)bt.innerHTML='<strong>Überblick:</strong> '+summary.join(' · ')+'.';
    else bt.innerHTML='<strong>Heute keine dringenden Aktionen.</strong> '+(anrede==='Du'?'Nutze die Zeit für neue Fälle.':'Nutzen Sie die Zeit für neue Fälle.');
  }
  if(btags)btags.innerHTML=tagHtml;
}

function renderRecent(faelle){
  var list=document.getElementById('recent-list');
  if(!list)return;
  var recent=faelle.slice(0,5);
  if(recent.length===0){
    list.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">Noch keine Fälle angelegt.<br><a href="app.html" style="color:var(--accent);margin-top:6px;display:inline-block;">Ersten Fall erstellen →</a></div>';
    return;
  }
  list.innerHTML=recent.map(function(r){
    var f=r.fields;
    var status=f.Status||'In Bearbeitung';
    var statusClass=status==='Freigegeben'||status==='Exportiert'?'status-done':status==='Entwurf'?'status-frei':'status-bearb';
    var az=(f.Aktenzeichen||r.id.slice(-6).toUpperCase()).slice(0,8);
    var addr=f.Schaden_Strasse||[f.Schaden_Strasse,f.Ort].filter(Boolean).join(', ')||'—';
    var datum=f.Timestamp?new Date(f.Timestamp).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'';
    return '<div class="recent-item" onclick="window.location.href=\'archiv.html\'">'
      +'<div class="recent-az">'+az+'</div>'
      +'<div class="recent-info">'
      +'<div class="recent-name">'+(f.Schadensart||f.schadenart||f.Schadensart||'Schadenfall')+(datum?' <span style="color:var(--text3);font-weight:400;">'+datum+'</span>':'')+'</div>'
      +'<div class="recent-meta">'+addr+'</div>'
      +'</div>'
      +'<span class="recent-status '+statusClass+'">'+status+'</span>'
      +'</div>';
  }).join('');
}

function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ══════════════════════════════════════════════════
   KALENDER (unverändert aus v1)
══════════════════════════════════════════════════ */
var calDate=new Date();
var calSelectedDay=calDate.getDate();

function renderCal(termineRecords){
  var y=calDate.getFullYear(),m=calDate.getMonth();
  var label=calDate.toLocaleString('de-DE',{month:'long',year:'numeric'});
  document.getElementById('cal-month-label').textContent=label.charAt(0).toUpperCase()+label.slice(1);
  var firstDay=new Date(y,m,1).getDay();
  var firstMo=firstDay===0?6:firstDay-1;
  var daysInMonth=new Date(y,m+1,0).getDate();
  var daysInPrev=new Date(y,m,0).getDate();
  var today=new Date();
  // Termin-Map aus Airtable-Daten
  var termineMap={};
  (termineRecords||[]).forEach(function(r){
    var d=r.fields.termin_datum;if(!d)return;
    try{
      var dt=new Date(d);
      if(dt.getFullYear()===y&&dt.getMonth()===m){
        var k=dt.getDate();
        if(!termineMap[k])termineMap[k]=[];
        termineMap[k].push(r.fields);
      }
    }catch(e){}
  });
  // Auch aus localStorage
  try{
    JSON.parse(localStorage.getItem('prova_termine')||'[]').forEach(function(t){
      if(!t.datum)return;
      try{
        var dt=new Date(t.datum);
        if(dt.getFullYear()===y&&dt.getMonth()===m){
          var k=dt.getDate();if(!termineMap[k])termineMap[k]=[];
          termineMap[k].push(t);
        }
      }catch(e){}
    });
  }catch(e){}

  var html='';
  for(var i=0;i<42;i++){
    var day,cls='',other=false;
    if(i<firstMo){day=daysInPrev-firstMo+i+1;cls='other-month';other=true;}
    else if(i>=firstMo+daysInMonth){day=i-firstMo-daysInMonth+1;cls='other-month';other=true;}
    else{
      day=i-firstMo+1;
      if(today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===day)cls='today';
    }
    var dots='';
    if(!other&&termineMap[day]){
      termineMap[day].forEach(function(t){
        var dc=(t.termin_typ||t.typ)==='Frist'?'frist':(t.termin_typ||t.typ)==='Gerichtstermin'?'gericht':'termin';
        dots+='<div class="day-dot '+dc+'"></div>';
      });
    }
    html+='<div class="cal-day '+cls+'" onclick="calSelectDay('+day+','+(other?1:0)+',termineMap)">'
      +'<div class="day-num">'+day+'</div>'
      +(dots?'<div class="day-dots">'+dots+'</div>':'')
      +'</div>';
  }
  document.getElementById('cal-days').innerHTML=html;
  // Store termineMap globally for click handler
  window._calTermineMap=termineMap;
  calShowDay(calSelectedDay,termineMap);
}

window.calSelectDay=function(day,isOther){
  if(isOther)return;
  calSelectedDay=day;
  calShowDay(day,window._calTermineMap||{});
};

function calShowDay(day,map){
  var label=document.getElementById('cal-detail-label');
  var evList=document.getElementById('cal-events-list');
  if(!label||!evList)return;
  var today=new Date();
  var isToday=today.getFullYear()===calDate.getFullYear()&&today.getMonth()===calDate.getMonth()&&today.getDate()===day;
  label.textContent=isToday?'Heute, '+day+'.':day+'. '+calDate.toLocaleString('de-DE',{month:'long'});
  if(map&&map[day]&&map[day].length>0){
    evList.innerHTML=map[day].map(function(t){
      var typ=t.termin_typ||t.typ||'Termin';
      var dc=typ==='Frist'?'var(--danger)':typ==='Gerichtstermin'?'var(--purple)':'var(--accent)';
      return '<div class="cal-event">'
        +'<div class="cal-event-dot" style="background:'+dc+';"></div>'
        +'<span class="cal-event-time">'+(t.uhrzeit||'—')+'</span>'
        +'<span class="cal-event-name">'+(t.titel||typ)+'</span>'
        +'</div>';
    }).join('');
  }else{
    evList.innerHTML='<div style="font-size:12px;color:var(--text3);padding:6px 0;">Keine Termine an diesem Tag.</div>';
  }
}

window.calNav=function(dir){
  calDate.setMonth(calDate.getMonth()+dir);
  calSelectedDay=1;
  renderCal(window._lastTermine||[]);
};

/* ══════════════════════════════════════════════════
   HAUPT-INIT: Daten laden
══════════════════════════════════════════════════ */
zeigSkeleton();

// Auth check
if(!localStorage.getItem('prova_user')){
  // Kein Redirect — Zentrale zeigt Onboarding auch ohne Login
}

var svEmail=localStorage.getItem('prova_sv_email')||'';

async function ladeAlleDaten(){
  try{
    // Parallel laden
    var svAtId = localStorage.getItem('prova_at_sv_record_id') || '';
    // Filter: sv_email wenn gesetzt, sonst alle Records mit Aktenzeichen (Testphase)
    var filterFaelle = svEmail
      ? 'AND(NOT({Status}=""),OR({sv_email}="'+svEmail+'",{Aktenzeichen}!=""))'
      : 'AND(NOT({Status}=""),{Aktenzeichen}!="")';
    var filterTermine = svEmail ? '{sv_email}="'+svEmail+'"' : 'NOT({termin_datum}="")';
    var filterRechnungen = svEmail
      ? 'AND(OR({Status}="Offen",{Status}="Überfällig"),{sv_email}="'+svEmail+'")'
      : 'OR({Status}="Offen",{Status}="Überfällig")';

    var results=await Promise.all([
      atFetch(AT_FAELLE,filterFaelle,100),
      atFetch(AT_TERMINE,filterTermine,50,'termin_datum'),
      atFetch(AT_RECHNUNGEN,filterRechnungen,50,'rechnungsdatum')
    ]);

    var faelle=results[0]||[];
    var termine=results[1]||[];
    var rechnungen=results[2]||[];

    window._lastTermine=termine;

    // Falls Airtable nichts zurückgibt → localStorage als Fallback
    if(faelle.length===0){
      var ls=[];
      try{ls=JSON.parse(localStorage.getItem('prova_akten')||'[]');}catch(e){}
      if(ls.length===0){
        zeigOnboarding();
        renderKPIs([],[],[]);  // KPIs auf 0 setzen statt Loading-State
        renderCal([]);
        return;
      }
      // localStorage-Daten in Airtable-Format konvertieren
      faelle=ls.map(function(a){return{fields:{Aktenzeichen:a.aktenzeichen,Status:a.status||'In Bearbeitung',Schadensart:a.schadenart,Schaden_Strasse:a.adresse,Ort:a.ort,Timestamp:a.datum}};});
    }

    var stats=renderKPIs(faelle,termine,rechnungen);
    renderRecent(faelle);
    // Cache für renderAufgabenSofort aktualisieren
    try {
      var cacheData = { data: faelle, ts: Date.now() };
      localStorage.setItem('prova_archiv_cache_v2', JSON.stringify(cacheData));
      // Dashboard-Feed neu rendern mit echten Daten
      renderAufgabenSofort();
    } catch(e) {}
    // Fristen-Widget mit echten Terminen updaten
    try {
      localStorage.setItem('prova_termine_cache', JSON.stringify(termine));
      renderFristenMini();
    } catch(e) {}
    renderCal(termine);

  }catch(err){
    console.warn('Zentrale Ladefehler:',err);
    // S-SICHER UI-FIX1.2: IMMER KPIs mit 0 als Baseline rendern —
    // wenn unten echte LS-Daten kommen, überschreiben sie die 0.
    // Vorher blieb bei Error der transparente .kpi-loading-Shimmer stehen.
    renderKPIs([],[],[]);
    // Graceful degradation — zeige was in localStorage ist
    var ls=[];try{ls=JSON.parse(localStorage.getItem('prova_akten')||'[]');}catch(e){}
    if(ls.length===0){
      zeigOnboarding();
    }
    else{
      var faelleLS=ls.map(function(a){return{fields:{Aktenzeichen:a.aktenzeichen,Status:a.status||'In Bearbeitung',Schadensart:a.schadenart,Timestamp:a.datum}};});
      renderKPIs(faelleLS,[],[]);
      renderRecent(faelleLS);
    }
    renderCal([]);
  }
}

// ladeAlleDaten() wird in DOMContentLoaded aufgerufen

/* ══════════════════════════════════════════════════
   SUPPORT
══════════════════════════════════════════════════ */
var _supT;
var _SFAQ=[
  {q:['pdf','download'],a:'PDFs werden nach der Freigabe automatisch erstellt und per E-Mail versendet.'},
  {q:['rechnung','jveg'],a:'Im JVEG-Rechner Stunden erfassen → "Als Rechnung übernehmen" klicken.'},
  {q:['frist','termin'],a:'Unter Kalender können Sie alle Fristen und Termine einsehen und neu anlegen.'},
  {q:['passwort','login'],a:'Das Passwort kann nur durch einen Administrator zurückgesetzt werden. E-Mail an support@prova-systems.de.'}
];
window.supportAnalyse=function(){
  clearTimeout(_supT);_supT=setTimeout(function(){
    var txt=(document.getElementById('sup-betreff').value+' '+document.getElementById('sup-nachricht').value).toLowerCase();
    var f=_SFAQ.find(function(x){return x.q.some(function(w){return txt.includes(w);});});
    var box=document.getElementById('support-faq-box');
    if(f){document.getElementById('support-faq-text').textContent=f.a;box.style.display='block';}
    else box.style.display='none';
  },600);
};
window.supportFaqOk=function(){
  document.getElementById('support-form-body').style.display='none';
  document.getElementById('support-faq-box').style.display='none';
  document.getElementById('support-ok').style.display='block';
};
window.closeSupport=function(){
  document.getElementById('support-modal').classList.remove('open');
  document.getElementById('support-ok').style.display='none';
  document.getElementById('support-form-body').style.display='block';
  document.getElementById('sup-betreff').value='';
  document.getElementById('sup-nachricht').value='';
};
window.sendSupport=async function(){
  var b=document.getElementById('sup-betreff').value.trim();
  var n=document.getElementById('sup-nachricht').value.trim();
  if(!b||!n){document.getElementById('support-err').style.display='block';return;}
  document.getElementById('support-err').style.display='none';
  var btn=document.getElementById('sup-btn');btn.disabled=true;btn.textContent='⏳ Wird gesendet...';
  try{await fetch('https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({betreff:b,nachricht:n,sv_email:svEmail,paket:paket,seite:'dashboard.html',ts:new Date().toISOString()})});}catch(e){}
  document.getElementById('support-form-body').style.display='none';
  document.getElementById('support-ok').style.display='block';
};

  // Export in globalen Scope
  window.escHtml = escHtml;
})();

function openSupportModal(){
  var m=document.getElementById('support-modal');
  if(!m)return;
  var fb=document.getElementById('support-form-body');
  var ok=document.getElementById('support-ok');
  var fq=document.getElementById('support-faq-box');
  if(fb)fb.style.display='block';
  if(ok)ok.style.display='none';
  if(fq)fq.style.display='none';
  var b=document.getElementById('sup-betreff');
  var n=document.getElementById('sup-nachricht');
  var btn=document.getElementById('sup-btn');
  if(b)b.value='';
  if(n)n.value='';
  if(btn){btn.disabled=false;btn.textContent='Nachricht senden';}
  m.classList.add('open');
}


/* ─────────────────────────────────────────── */

/* ── NAV ACTIVE STATE FIX ── */
(function(){
  var path = window.location.pathname.replace(/\/$/, '').split('/').pop() || 'dashboard';
  var navMap = {
    'dashboard':      'nav-zentrale',
    'archiv':         'nav-faelle',
    'termine':        'nav-kalender',
    'rechnungen':     'nav-rechnungen',
    'briefvorlagen':  'nav-briefe',
    'jveg':           'nav-jveg',
    'kostenermittlung':'nav-kosten',
    'positionen':     'nav-positionen',
    'textbausteine':  'nav-textbausteine',
    'normen':         'nav-normen',
    'kontakte':       'nav-kontakte',
    'einstellungen':  'nav-einstellungen',
  };
  document.addEventListener('DOMContentLoaded', function(){
    // Alle aktiven Klassen entfernen
    document.querySelectorAll('.sidebar-link, .nav-link, [data-nav]').forEach(function(el){
      el.classList.remove('active');
    });
    // Korrekte Seite markieren
    var activeId = navMap[path];
    if(activeId){
      var el = document.getElementById(activeId);
      if(el) el.classList.add('active');
    }
    // Fallback: per href matchen
    document.querySelectorAll('a[href]').forEach(function(a){
      var href = a.getAttribute('href');
      if(href && href.indexOf(path) !== -1 && path.length > 2){
        a.classList.add('active');
      }
    });
  });
})();


/* ─────────────────────────────────────────── */

/* ── AUFGABEN: sofort aus Cache, dann Airtable ── */

/* ── PROFIL-VOLLSTÄNDIGKEIT ── */
function checkProfil() {
  var vorname = localStorage.getItem('prova_sv_vorname') || '';
  var firma   = localStorage.getItem('prova_sv_firma')   || '';
  var email   = localStorage.getItem('prova_sv_email')   || '';
  
  if (!vorname || !firma) {
    var feed = document.getElementById('aufgaben-feed');
    if (!feed) return;
    
    // Profil-Banner einmalig anzeigen (max 3x gesehen)
    var seen = parseInt(localStorage.getItem('prova_profil_banner_seen') || '0');
    if (seen >= 3) return;
    localStorage.setItem('prova_profil_banner_seen', String(seen + 1));
    
    var banner = document.createElement('div');
    banner.style.cssText = 'background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;';
    banner.innerHTML = '<span style="font-size:20px;">👤</span>'
      + '<div style="flex:1;">'
      + '<div style="font-size:13px;font-weight:700;color:var(--warning,#f59e0b);">SV-Profil unvollständig</div>'
      + '<div style="font-size:11px;color:var(--text3);margin-top:2px;">Name und Büroangaben werden auf dem Gutachten-PDF angezeigt</div>'
      + '</div>'
      + '<a href="onboarding-schnellstart.html" style="padding:7px 14px;border-radius:8px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);color:#f59e0b;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;">Jetzt ausfüllen</a>'
      + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0;">×</button>';
    
    feed.insertBefore(banner, feed.firstChild);
  }
}

function renderAufgabenSofort() {
  var paket = localStorage.getItem('prova_paket') || 'Solo';
  var maxKontingent = window.maxKontingent || (paket==='Solo' ? 25 : paket==='Team' ? 75 : 5);
  var feed = document.getElementById('aufgaben-feed');
  var skel = document.getElementById('aufgaben-skeleton');
  if (!feed) return;

  // Sofort aus localStorage-Cache
  var cache = [];
  try { cache = JSON.parse(localStorage.getItem('prova_archiv_cache_v2') || '{}').data || []; } catch(e) {}

  if (cache.length === 0) {
    // Kein Cache → Onboarding-State
    if (skel) skel.remove();
    feed.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px 20px;text-align:center;">'
      + '<div style="font-size:32px;margin-bottom:12px;">🏗️</div>'
      + '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:8px;">Noch kein Fall angelegt</div>'
      + '<div style="font-size:13px;color:var(--text3);margin-bottom:20px;">Erstellen Sie Ihren ersten Fall — PROVA führt Sie durch den gesamten Workflow.</div>'
      + '<button onclick="window.location.href=\'app.html\'" style="padding:10px 22px;border-radius:8px;background:var(--accent,#4f8ef7);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-ui,sans-serif);">+ Ersten Fall anlegen</button>'
      + '</div>';
    return;
  }

  // Offene Fälle filtern
  var offen = cache.filter(function(r) {
    var s = (r.fields && r.fields.Status) || '';
    return s !== 'Archiviert' && s !== 'Freigegeben' && s !== 'Exportiert';
  });
  
  // KPIs aus Cache
  var kpiAktiv = document.getElementById('kpi-aktiv');
  if (kpiAktiv) kpiAktiv.textContent = offen.length;
  var kpiKontingent = document.getElementById('kpi-kontingent');
  if (kpiKontingent) kpiKontingent.textContent = cache.length + '/' + maxKontingent;

  // Letzter Fall im Schnellzugriff anzeigen
  var letzterFallEl = document.getElementById('letzter-fall-link');
  if (letzterFallEl && cache.length > 0) {
    var letzter = cache.sort(function(a,b) {
      return new Date(b.fields.Timestamp||0) - new Date(a.fields.Timestamp||0);
    })[0];
    var lf = letzter.fields || {};
    var lfAz = lf.Aktenzeichen || '—';
    var lfSa = lf.Schadensart || '';
    letzterFallEl.href = 'akte.html?id=' + letzter.id;
    letzterFallEl.innerHTML = '<span style="font-size:14px;">📂</span> '
      + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
      + lfAz + (lfSa ? ' · ' + lfSa.replace('schaden','').replace('befall','').trim() : '')
      + '</span>'
      + '<span style="font-size:10px;color:var(--accent);font-weight:700;flex-shrink:0;">→</span>';
    letzterFallEl.style.display = 'flex';
  }

  if (skel) skel.remove();

  if (offen.length === 0) {
    feed.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px 20px;text-align:center;">'
      + '<div style="font-size:28px;margin-bottom:10px;">✨</div>'
      + '<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">Alle Fälle abgeschlossen</div>'
      + '<div style="font-size:12px;color:var(--text3);">Gute Arbeit! Neuen Fall anlegen?</div>'
      + '</div>';
    return;
  }

  // Kontextuell: was ist der nächste Schritt für jeden Fall?
  feed.innerHTML = offen.slice(0, 5).map(function(r) {
    var f = r.fields || {};
    var az = f.Aktenzeichen || r.id.slice(-6).toUpperCase() || '—';
    var sa = f.Schadensart || f.schadenart || 'Schadenfall';
    var ag = f.Auftraggeber_Name || f.auftraggeber_name || '';
    var adr = f.Schaden_Strasse || f.Schaden_Strasse || '';
    var ort = f.Ort || '';
    var loc = [adr, ort].filter(Boolean).join(', ');

    // Phase bestimmen
    var hat_diktat = !!(f.KI_Entwurf && f.KI_Entwurf.length > 50);
    var hat_stell  = !!(f.Stellungnahme_Text && f.Stellungnahme_Text.length > 30);
    var hat_freig  = f.Status === 'Freigegeben' || f.Status === 'Exportiert';
    // Phase-Feld direkt nutzen wenn vorhanden
    var explPhase  = parseInt(f.Phase || 0);
    if (explPhase >= 4) hat_stell = true;
    if (explPhase >= 3 || explPhase >= 2) hat_diktat = hat_diktat || explPhase >= 2;

    var ns;
    if (!hat_diktat) {
      ns = { icon: '🎤', label: 'Diktat aufnehmen', col: '#4f8ef7', bg: 'rgba(79,142,247,.08)', bc: 'rgba(79,142,247,.2)', href: 'app.html', phase: 2 };
    } else if (!hat_stell) {
      ns = { icon: '⚖️', label: '§6 Fachurteil schreiben', col: '#f59e0b', bg: 'rgba(245,158,11,.08)', bc: 'rgba(245,158,11,.2)', href: 'stellungnahme.html?az=' + encodeURIComponent(az), phase: 3 };
    } else {
      ns = { icon: '✅', label: 'Freigeben & PDF erstellen', col: '#10b981', bg: 'rgba(16,185,129,.08)', bc: 'rgba(16,185,129,.2)', href: 'freigabe.html?az=' + encodeURIComponent(az), phase: 4 };
    }

    return '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:' + ns.bg + ';border:1px solid ' + ns.bc + ';border-radius:12px;cursor:pointer;transition:all .15s;" onclick="window._goFall(this)" data-rid="' + r.id + '" onmouseover="this.style.opacity=.85" onmouseout="this.style.opacity=1">'
      + '<span style="font-size:22px;">' + ns.icon + '</span>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;">'
      + '<span style="font-family:var(--font-mono);font-size:11px;color:var(--accent);">' + escHtml(az) + '</span>'
      + '<span style="color:var(--text3);">·</span>'
      + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(sa) + '</span>'
      + (ag ? '<span style="font-size:10px;font-weight:500;color:var(--text3);padding:1px 6px;background:rgba(255,255,255,.05);border-radius:4px;flex-shrink:0;">' + escHtml(ag) + '</span>' : '')
      + '</div>'
      + (loc ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;">📍 ' + escHtml(loc) + '</div>' : '')
      + '<div style="font-size:11px;font-weight:700;color:' + ns.col + ';margin-top:3px;">' + ns.label + '</div>'
      + '</div>'
      + '<a href="' + ns.href + '" onclick="event.stopPropagation()" style="padding:7px 14px;border-radius:8px;border:none;background:' + ns.col + ';color:#fff;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;">→ Jetzt</a>'
      + '</div>';
  }).join('');
}

/* ── FRISTEN MINI ── */
function renderFristenMini() {
  var container = document.getElementById('fristen-mini');
  if (!container) return;

  // 1. Aus Termine-Cache (explizite Termine)
  var termine = [];
  try { termine = JSON.parse(localStorage.getItem('prova_termine_cache') || '[]'); } catch(e) {}

  // 2. Auch Fristdaten aus Archiv-Cache (Gutachten-Fristen)
  try {
    var cache = JSON.parse(localStorage.getItem('prova_archiv_cache_v2') || '{}');
    (cache.data || []).forEach(function(r) {
      var f = r.fields || {};
      if (f.Fristdatum) {
        termine.push({
          id: r.id + '_frist',
          fields: {
            termin_typ: 'Frist',
            termin_datum: f.Fristdatum,
            aktenzeichen: f.Aktenzeichen || '',
            notiz: 'Gutachten-Frist: ' + (f.Aktenzeichen || '—'),
            src: 'fall'
          }
        });
      }
    });
  } catch(e) {}
  
  var heute = new Date();
  var bald = termine.filter(function(r) {
    var f = r.fields || {};
    if (!f.termin_datum) return false;
    var d = new Date(f.termin_datum);
    var diff = Math.floor((d - heute) / (1000*60*60*24));
    return diff >= -1 && diff <= 14;
  }).sort(function(a,b) {
    return new Date(a.fields.termin_datum) - new Date(b.fields.termin_datum);
  }).slice(0, 5);

  if (!bald.length) {
    container.innerHTML = '<div style="font-size:11px;color:var(--text3);text-align:center;padding:8px 0;">Keine Fristen in den nächsten 14 Tagen</div>';
    return;
  }

  container.innerHTML = bald.map(function(r) {
    var f = r.fields || {};
    var d = new Date(f.termin_datum);
    var diff = Math.floor((d - heute) / (1000*60*60*24));
    var col = diff < 0 ? '#ef4444' : diff <= 3 ? '#f59e0b' : '#10b981';
    var label = diff < 0 ? 'Überfällig' : diff === 0 ? 'Heute' : 'in ' + diff + 'T';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">'
      + '<div style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">' + escHtml(f.titel || f.termin_typ || 'Termin') + '</div>'
      + '<div style="font-size:10px;font-weight:700;color:' + col + ';flex-shrink:0;margin-left:8px;">' + label + '</div>'
      + '</div>';
  }).join('');
  
  // KPI updaten
  var fristenKPI = document.getElementById('kpi-heute');
  if (fristenKPI) fristenKPI.textContent = bald.filter(function(r) {
    return Math.floor((new Date(r.fields.termin_datum)-heute)/(1000*60*60*24)) <= 7;
  }).length;
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', function() {

  /* ── 1. GREETING SOFORT ── */
  (function() {
    var h = new Date().getHours();
    var greet = h < 5  ? 'Guten Abend'  :
                h < 12 ? 'Guten Morgen' :
                h < 18 ? 'Guten Tag'    : 'Guten Abend';
    var svVorname = localStorage.getItem('prova_sv_vorname') || '';
    var svName = svVorname ? ', ' + svVorname : '';
    var gt = document.getElementById('greeting-title');
    if (gt) gt.textContent = greet + svName + ' 👋';
    var gs = document.getElementById('greeting-sub');
    if (gs) {
      var tagesInfo = h < 12 ? 'Starten Sie gut in den Tag.' :
                     h < 18 ? 'Hier Ihr aktueller Überblick.' :
                               'Hier Ihr Abend-Überblick.';
      gs.textContent = tagesInfo;
    }
  })();

  /* ── 2. PROFIL-CHECK ── */
  checkProfil();

  /* ── 3. SOFORT AUS CACHE RENDERN (0ms) ── */
  renderAufgabenSofort();
  renderFristenMini();

  /* ── 4. AIRTABLE NACHLADEN (async, ~1-2s) ── */
  if (typeof ladeAlleDaten === 'function') {
    ladeAlleDaten().catch(function(e) {
      console.warn('Dashboard Airtable-Fehler:', e);
    });
  }
});

